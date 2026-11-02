import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  LoaderCircle,
  LockKeyhole,
  Network,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react'
import { Contract, parseUnits } from 'ethers'
import { useEffect, useMemo, useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { useToast } from '../context/ToastContext'
import { useWallet } from '../context/WalletContext'
import { useZenith } from '../context/ZenithContext'
import { ERC20_ABI, ZENITH_NETWORK } from '../lib/constants'
import { copyText, formatBalance, friendlyError, shortenAddress, shortenParty } from '../lib/format'
import { createId } from '../lib/storage'
import { validateAmount, validatePartyId } from '../lib/requestCodec'
import { fetchPendingState, getAssetBalance, resolveInbox } from '../lib/zenith'
import type { InboxResolution, SettlementRequest, ZenithAsset } from '../types'
import { AssetIcon } from './AssetIcon'
import { Modal } from './Modal'

type FlowStep = 1 | 2 | 3
type TransactionStage = 'idle' | 'signing' | 'submitted' | 'finalized' | 'failed'

interface SettlementFlowProps {
  request?: SettlementRequest
  onComplete?: () => void
  onCancel?: () => void
}

function StepRail({ step }: { step: FlowStep }) {
  const steps = ['Recipient', 'Asset', 'Review']
  return (
    <div className="step-rail" aria-label={`Step ${step} of 3`}>
      {steps.map((label, index) => {
        const number = (index + 1) as FlowStep
        return (
          <div className={`step-rail__item ${number <= step ? 'is-active' : ''}`} key={label}>
            <span>{number < step ? <Check size={13} /> : number}</span>
            <small>{label}</small>
          </div>
        )
      })}
    </div>
  )
}

function BalanceLine({ asset, balance }: { asset: ZenithAsset; balance: string | null }) {
  return (
    <span className="balance-line">
      Wallet balance: <strong>{formatBalance(balance, 6)} {asset.symbol}</strong>
    </span>
  )
}

export function SettlementFlow({ request, onComplete, onCancel }: SettlementFlowProps) {
  const { assets, chainInfo } = useZenith()
  const wallet = useWallet()
  const { notify } = useToast()
  const { addActivity, updateActivity } = useAppData()
  const [step, setStep] = useState<FlowStep>(request ? 3 : 1)
  const [party, setParty] = useState(request?.party ?? '')
  const [memo, setMemo] = useState(request?.memo ?? '')
  const [assetId, setAssetId] = useState(request?.assetId ?? 'native')
  const [amount, setAmount] = useState(request?.amount ?? '')
  const [inbox, setInbox] = useState<InboxResolution | null>(null)
  const [resolving, setResolving] = useState(Boolean(request))
  const [flowError, setFlowError] = useState<string | null>(null)
  const [balanceResult, setBalanceResult] = useState<{ key: string; value: string | null } | null>(null)
  const [confirmedParty, setConfirmedParty] = useState(false)
  const [confirmedAcceptance, setConfirmedAcceptance] = useState(false)
  const [stage, setStage] = useState<TransactionStage>('idle')
  const [transactionHash, setTransactionHash] = useState<string | null>(null)
  const [finalBlock, setFinalBlock] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const asset = useMemo(
    () => assets.find((item) => item.id.toLowerCase() === assetId.toLowerCase()) ?? null,
    [assets, assetId],
  )
  const balanceKey = asset && wallet.account ? `${asset.id}:${wallet.account}` : ''
  const balance = balanceResult?.key === balanceKey ? balanceResult.value : null

  const amountError = asset ? validateAmount(amount, asset.decimals, asset.kind === 'native') : 'Unsupported asset.'
  const partyError = validatePartyId(party)

  useEffect(() => {
    if (!request) return
    let active = true
    void resolveInbox(request.party, chainInfo.gatewayAddress)
      .then((result) => {
        if (active) setInbox(result)
      })
      .catch((error) => {
        if (active) setFlowError(friendlyError(error))
      })
      .finally(() => {
        if (active) setResolving(false)
      })
    return () => {
      active = false
    }
  }, [request, chainInfo.gatewayAddress])

  useEffect(() => {
    if (!asset || !wallet.account) return
    let active = true
    const key = `${asset.id}:${wallet.account}`
    void getAssetBalance(asset, wallet.account)
      .then((value) => {
        if (active) setBalanceResult({ key, value })
      })
      .catch(() => {
        if (active) setBalanceResult({ key, value: null })
      })
    return () => {
      active = false
    }
  }, [asset, wallet.account])

  const resolveRecipient = async () => {
    if (partyError) {
      setFlowError(partyError)
      return
    }
    setFlowError(null)
    setResolving(true)
    try {
      const result = await resolveInbox(party.trim(), chainInfo.gatewayAddress)
      setParty(party.trim())
      setInbox(result)
      setStep(2)
    } catch (error) {
      setFlowError(friendlyError(error))
    } finally {
      setResolving(false)
    }
  }

  const moveToReview = () => {
    if (amountError) {
      setFlowError(amountError)
      return
    }
    if (balance !== null && asset) {
      try {
        if (parseUnits(amount, asset.decimals) > parseUnits(balance, asset.decimals)) {
          setFlowError(`Your ${asset.symbol} balance is too low for this settlement.`)
          return
        }
      } catch {
        setFlowError('The amount could not be read.')
        return
      }
    }
    setFlowError(null)
    setStep(3)
  }

  const connectWallet = async () => {
    try {
      await wallet.connect()
    } catch (error) {
      notify(friendlyError(error), 'error')
    }
  }

  const sendSettlement = async () => {
    if (!asset || !inbox || amountError || !confirmedParty) return
    if (asset.requiresAcceptance && !confirmedAcceptance) return
    setFlowError(null)
    setStage('signing')
    let recordId: string | null = null
    try {
      const signer = await wallet.getSigner()
      const units = parseUnits(amount, asset.decimals)
      let transaction
      if (asset.kind === 'native') {
        transaction = await signer.sendTransaction({ to: inbox.address, value: units })
      } else {
        if (!asset.address) throw new Error('The token contract address is unavailable.')
        const token = new Contract(asset.address, ERC20_ABI, signer)
        transaction = await token.transfer(inbox.address, units)
      }

      const currentRecordId: string = transaction.hash || createId()
      recordId = currentRecordId
      setTransactionHash(transaction.hash)
      setStage('submitted')
      addActivity({
        id: currentRecordId,
        hash: transaction.hash,
        party,
        inbox: inbox.address,
        assetId: asset.id,
        assetSymbol: asset.symbol,
        amount,
        memo,
        status: 'submitted',
        createdAt: Date.now(),
      })

      const receipt = await transaction.wait()
      if (!receipt || receipt.status !== 1) throw new Error('The transaction did not complete successfully.')
      const gatewayState = await fetchPendingState(transaction.hash)
      setFinalBlock(receipt.blockNumber)
      setStage('finalized')
      updateActivity(currentRecordId, {
        status: 'finalized',
        blockNumber: receipt.blockNumber,
        gatewayState: gatewayState ?? undefined,
      })
      await wallet.refreshBalance()
      notify('Settlement reached deterministic finality.', 'success')
      onComplete?.()
    } catch (error) {
      const message = friendlyError(error)
      setFlowError(message)
      setStage('failed')
      if (recordId) updateActivity(recordId, { status: 'failed' })
    }
  }

  if (stage === 'submitted' || stage === 'signing') {
    return (
      <div className="transaction-progress">
        <div className="transaction-progress__visual" aria-hidden="true">
          <span className="pulse-ring pulse-ring--one" />
          <span className="pulse-ring pulse-ring--two" />
          <LoaderCircle className="spin" size={28} />
        </div>
        <span className="eyebrow">{stage === 'signing' ? 'Wallet confirmation' : 'Canton settlement'}</span>
        <h2>{stage === 'signing' ? 'Confirm in your wallet' : 'Reaching one final state'}</h2>
        <p>
          {stage === 'signing'
            ? 'Review the destination and amount in your wallet. Nothing moves until you approve.'
            : 'Zenith is executing the EVM transaction and finalizing it through Canton consensus.'}
        </p>
        <div className="finality-track">
          <div className="finality-track__node is-complete">
            <WalletCards size={16} />
            <span>Signed</span>
          </div>
          <span className={stage === 'submitted' ? 'is-active' : ''} />
          <div className={`finality-track__node ${stage === 'submitted' ? 'is-active' : ''}`}>
            <Network size={16} />
            <span>Zenith EVM</span>
          </div>
          <span />
          <div className="finality-track__node">
            <ShieldCheck size={16} />
            <span>Canton finality</span>
          </div>
        </div>
        {transactionHash && (
          <a
            className="transaction-progress__hash"
            href={`${ZENITH_NETWORK.explorerUrl}/tx/${transactionHash}`}
            target="_blank"
            rel="noreferrer"
          >
            {shortenAddress(transactionHash, 12, 10)} <ExternalLink size={14} />
          </a>
        )}
      </div>
    )
  }

  if (stage === 'finalized') {
    const awaitingFreshInbox = asset?.kind === 'native' && !inbox?.deployed
    return (
      <div className="transaction-success">
        <div className="transaction-success__icon">
          <CheckCircle2 size={32} />
          <Sparkles size={17} />
        </div>
        <span className="eyebrow">{awaitingFreshInbox ? 'EVM transaction final' : 'Settlement complete'}</span>
        <h2>{amount} {asset?.symbol} {awaitingFreshInbox ? 'is en route' : 'is final'}</h2>
        <p>
          {awaitingFreshInbox
            ? 'This is a new inbox. The transfer is final; Gateway will deploy the inbox and credit wZTH on Canton. Do not resend while it waits.'
            : 'One receipt is enough on Zenith. The EVM block has been finalized through Canton.'}
        </p>
        <div className="success-receipt">
          <div>
            <span>Recipient</span>
            <strong>{shortenParty(party)}</strong>
          </div>
          <div>
            <span>Finalized in block</span>
            <strong>#{finalBlock?.toLocaleString()}</strong>
          </div>
          <div>
            <span>Network</span>
            <strong>Zenith EVM Testnet</strong>
          </div>
        </div>
        <div className="transaction-success__actions">
          {transactionHash && (
            <a
              className="button button--primary"
              href={`${ZENITH_NETWORK.explorerUrl}/tx/${transactionHash}`}
              target="_blank"
              rel="noreferrer"
            >
              View settlement proof <ExternalLink size={16} />
            </a>
          )}
          {transactionHash && awaitingFreshInbox && (
            <a
              className="button button--secondary"
              href={`${ZENITH_NETWORK.gatewayApiUrl}/v1/pending/evm/${transactionHash}`}
              target="_blank"
              rel="noreferrer"
            >
              Gateway status <ExternalLink size={16} />
            </a>
          )}
          <button className="button button--secondary" onClick={onCancel}>Done</button>
        </div>
      </div>
    )
  }

  if (request && resolving) {
    return (
      <div className="flow-loading">
        <LoaderCircle className="spin" size={24} />
        <strong>Resolving Canton recipient</strong>
        <span>Reading the current Zenith Gateway deployment…</span>
      </div>
    )
  }

  if (request && !asset) {
    return (
      <div className="flow-error-state">
        <ShieldCheck size={28} />
        <h2>Asset not supported</h2>
        <p>This request references an asset that is not in the current Gateway registry.</p>
        <button className="button button--secondary" onClick={onCancel}>Return home</button>
      </div>
    )
  }

  return (
    <div className="settlement-flow">
      {!request && <StepRail step={step} />}

      {step === 1 && (
        <div className="flow-step">
          <div className="flow-step__intro">
            <span className="flow-step__icon"><Network size={19} /></span>
            <div>
              <h3>Who receives on Canton?</h3>
              <p>Paste the exact, full party ID supplied by the recipient.</p>
            </div>
          </div>
          <label className="field">
            <span>Canton party ID</span>
            <textarea
              value={party}
              onChange={(event) => {
                setParty(event.target.value)
                setFlowError(null)
              }}
              rows={3}
              placeholder={`alice::1220${'•'.repeat(16)}`}
              spellCheck={false}
              autoFocus
            />
            <small>Always copy the complete ID, including its namespace after ::</small>
          </label>
          <label className="field">
            <span>Memo <em>optional</em></span>
            <div className="input-with-icon">
              <FileText size={17} />
              <input
                value={memo}
                onChange={(event) => setMemo(event.target.value.slice(0, 120))}
                placeholder="Invoice, desk or settlement reference"
              />
            </div>
          </label>
          {flowError && <div className="inline-error">{flowError}</div>}
          <div className="flow-footer">
            <button className="button button--ghost" onClick={onCancel}>Cancel</button>
            <button className="button button--primary" onClick={() => void resolveRecipient()} disabled={resolving}>
              {resolving ? <LoaderCircle className="spin" size={17} /> : null}
              Resolve recipient <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && asset && (
        <div className="flow-step">
          <div className="resolved-recipient">
            <span className="resolved-recipient__icon"><Check size={15} /></span>
            <div>
              <span>Inbox resolved</span>
              <strong>{shortenAddress(inbox?.address ?? '', 10, 8)}</strong>
            </div>
            <small>{inbox?.deployed ? 'Active inbox' : 'Deploys on first transfer'}</small>
          </div>
          <div className="field">
            <span>Choose asset</span>
            <div className="asset-options">
              {assets.map((item) => (
                <button
                  key={item.id}
                  className={item.id === assetId ? 'is-selected' : ''}
                  onClick={() => {
                    setAssetId(item.id)
                    setFlowError(null)
                    setConfirmedAcceptance(false)
                  }}
                >
                  <AssetIcon asset={item} />
                  <span>
                    <strong>{item.symbol}</strong>
                    <small>{item.origin === 'evm' ? 'EVM-native' : 'Canton-origin'}</small>
                  </span>
                  {item.requiresAcceptance && <em>Preapproval</em>}
                  <span className="asset-options__check"><Check size={13} /></span>
                </button>
              ))}
            </div>
          </div>
          <label className="field amount-field">
            <span>Amount</span>
            <div className="amount-input">
              <input
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value.replace(/,/g, '.'))
                  setFlowError(null)
                }}
                placeholder="0.00"
                autoFocus
              />
              <div><AssetIcon asset={asset} size="small" /><strong>{asset.symbol}</strong></div>
            </div>
            <BalanceLine asset={asset} balance={balance} />
          </label>
          {asset.requiresAcceptance && (
            <div className="notice notice--amber">
              <LockKeyhole size={17} />
              <span>The recipient needs a standing acceptance for {asset.symbol}. The RPC will reject the transaction if it is missing.</span>
            </div>
          )}
          {flowError && <div className="inline-error">{flowError}</div>}
          <div className="flow-footer">
            <button className="button button--ghost" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button>
            <button className="button button--primary" onClick={moveToReview}>Review settlement <ArrowRight size={16} /></button>
          </div>
        </div>
      )}

      {step === 3 && asset && (
        <div className="flow-step flow-step--review">
          {request && (
            <div className="request-banner">
              <span className="request-banner__icon"><FileText size={18} /></span>
              <div>
                <span>Payment request</span>
                <strong>{memo || 'Canton settlement'}</strong>
              </div>
              <span className="request-banner__verified"><ShieldCheck size={14} /> Link data verified</span>
            </div>
          )}
          <div className="review-amount">
            <AssetIcon asset={asset} size="large" />
            <span>You are settling</span>
            <strong>{amount} <small>{asset.symbol}</small></strong>
            {wallet.account && <BalanceLine asset={asset} balance={balance} />}
          </div>

          <div className="route-card">
            <div className="route-card__node">
              <span className="route-card__icon"><WalletCards size={18} /></span>
              <div><small>From</small><strong>{wallet.account ? shortenAddress(wallet.account, 9, 6) : 'Your EVM wallet'}</strong></div>
              <em>EVM</em>
            </div>
            <div className="route-card__rail"><span /><b>Zenith Gateway</b><span /></div>
            <div className="route-card__node">
              <span className="route-card__icon route-card__icon--canton"><Network size={18} /></span>
              <div><small>To</small><strong>{shortenParty(party)}</strong></div>
              <em>Canton</em>
            </div>
          </div>

          <div className="review-details">
            <div><span>Destination inbox</span><strong>{shortenAddress(inbox?.address ?? '', 10, 8)}</strong></div>
            <div><span>Settlement finality</span><strong>1 receipt · no extra confirmations</strong></div>
            <div><span>Gateway fee</span><strong>None · network gas only</strong></div>
          </div>

          <label className="confirmation-check">
            <input type="checkbox" checked={confirmedParty} onChange={(event) => setConfirmedParty(event.target.checked)} />
            <span className="confirmation-check__box"><Check size={13} /></span>
            <span>I compared the <strong>full Canton party ID</strong> with the recipient. I understand a typo cannot be reversed.</span>
          </label>
          {asset.requiresAcceptance && (
            <label className="confirmation-check">
              <input type="checkbox" checked={confirmedAcceptance} onChange={(event) => setConfirmedAcceptance(event.target.checked)} />
              <span className="confirmation-check__box"><Check size={13} /></span>
              <span>The recipient confirmed a standing acceptance for <strong>{asset.symbol}</strong>.</span>
            </label>
          )}

          {flowError && <div className="inline-error">{flowError}</div>}
          <div className="flow-footer flow-footer--review">
            {!request && <button className="button button--ghost" onClick={() => setStep(2)}><ArrowLeft size={16} /> Back</button>}
            {!wallet.account ? (
              <button className="button button--primary button--wide" onClick={() => void connectWallet()}>
                <WalletCards size={17} /> Connect wallet to settle
              </button>
            ) : (
              <button
                className="button button--primary button--wide"
                disabled={!inbox || !confirmedParty || (asset.requiresAcceptance && !confirmedAcceptance)}
                onClick={() => void sendSettlement()}
              >
                Confirm settlement <ArrowRight size={16} />
              </button>
            )}
          </div>
          <p className="testnet-note">Zenith EVM Testnet · assets have no real-world value</p>
        </div>
      )}

      {stage === 'failed' && flowError && <div className="inline-error inline-error--footer">{flowError}</div>}
      {inbox && step === 3 && (
        <button
          className="copy-inbox"
          onClick={() => {
            void copyText(inbox.address)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1_500)
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Inbox copied' : 'Copy resolved inbox'}
        </button>
      )}
    </div>
  )
}

export function SettlementModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="New settlement" eyebrow="EVM → Canton" size="large">
      <SettlementFlow onCancel={onClose} />
    </Modal>
  )
}
