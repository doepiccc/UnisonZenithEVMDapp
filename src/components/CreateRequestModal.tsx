import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Link2,
  LockKeyhole,
  Network,
  Share2,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useMemo, useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { useToast } from '../context/ToastContext'
import { useZenith } from '../context/ZenithContext'
import { copyText, shortenParty } from '../lib/format'
import { buildPaymentUrl, validateAmount, validatePartyId } from '../lib/requestCodec'
import { createId } from '../lib/storage'
import type { SettlementRequest } from '../types'
import { AssetIcon } from './AssetIcon'
import { Modal } from './Modal'

interface CreateRequestModalProps {
  open: boolean
  onClose: () => void
}

const EXPIRIES = [
  { value: '86400000', label: '24 hours' },
  { value: '604800000', label: '7 days' },
  { value: '2592000000', label: '30 days' },
  { value: '0', label: 'No expiry' },
]

export function CreateRequestModal({ open, onClose }: CreateRequestModalProps) {
  const { assets } = useZenith()
  const { addRequest } = useAppData()
  const { notify } = useToast()
  const [party, setParty] = useState('')
  const [assetId, setAssetId] = useState('native')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [expiry, setExpiry] = useState('604800000')
  const [acceptance, setAcceptance] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<SettlementRequest | null>(null)
  const [copied, setCopied] = useState(false)

  const asset = useMemo(
    () => assets.find((item) => item.id.toLowerCase() === assetId.toLowerCase()) ?? assets[0],
    [assets, assetId],
  )
  const paymentUrl = created ? buildPaymentUrl(created) : ''

  useEffect(() => {
    if (!open) {
      window.setTimeout(() => {
        setCreated(null)
        setCopied(false)
      }, 250)
    }
  }, [open])

  const createRequest = () => {
    const partyError = validatePartyId(party)
    const amountError = validateAmount(amount, asset.decimals, asset.kind === 'native')
    if (partyError || amountError) {
      setError(partyError ?? amountError)
      return
    }
    if (asset.requiresAcceptance && !acceptance) {
      setError(`Confirm that this party has a standing acceptance for ${asset.symbol}.`)
      return
    }
    const now = Date.now()
    const expiryMs = Number(expiry)
    const request: SettlementRequest = {
      version: 1,
      id: createId(),
      party: party.trim(),
      assetId: asset.id.toLowerCase(),
      amount: amount.trim(),
      memo: memo.trim(),
      expiresAt: expiryMs === 0 ? null : now + expiryMs,
      createdAt: now,
    }
    addRequest(request)
    setCreated(request)
    setError(null)
  }

  const copyLink = async () => {
    await copyText(paymentUrl)
    setCopied(true)
    notify('Payment link copied.', 'success')
    window.setTimeout(() => setCopied(false), 1_500)
  }

  const shareLink = async () => {
    if (!navigator.share) {
      await copyLink()
      return
    }
    try {
      await navigator.share({
        title: created?.memo || 'Unison settlement request',
        text: `Settle ${created?.amount} ${asset.symbol} on Zenith`,
        url: paymentUrl,
      })
    } catch {
      // Closing the native share sheet is not an error that needs a toast.
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={created ? 'Request ready' : 'Create payment request'}
      eyebrow={created ? 'Share securely' : 'Canton payment link'}
      size="large"
    >
      {!created ? (
        <div className="request-form">
          <div className="request-form__lead">
            <span><Link2 size={20} /></span>
            <div>
              <h3>Let any EVM wallet pay a Canton party</h3>
              <p>The link carries settlement details only. No private data or keys leave this device.</p>
            </div>
          </div>

          <div className="request-form__grid">
            <label className="field field--wide">
              <span>Canton recipient</span>
              <div className="input-with-icon input-with-icon--textarea">
                <Network size={17} />
                <textarea
                  rows={2}
                  value={party}
                  onChange={(event) => {
                    setParty(event.target.value)
                    setError(null)
                  }}
                  placeholder={`treasury::1220${'•'.repeat(16)}`}
                  spellCheck={false}
                />
              </div>
              <small>Paste the full party ID. It will be visible to anyone with the link.</small>
            </label>

            <div className="field field--wide">
              <span>Requested asset</span>
              <div className="request-assets">
                {assets.map((item) => (
                  <button
                    key={item.id}
                    className={item.id === assetId ? 'is-selected' : ''}
                    onClick={() => {
                      setAssetId(item.id)
                      setAcceptance(false)
                      setError(null)
                    }}
                  >
                    <AssetIcon asset={item} size="small" />
                    <span>{item.symbol}</span>
                    {item.id === assetId && <Check size={13} />}
                  </button>
                ))}
              </div>
            </div>

            <label className="field">
              <span>Amount</span>
              <div className="amount-input amount-input--compact">
                <input
                  value={amount}
                  inputMode="decimal"
                  onChange={(event) => {
                    setAmount(event.target.value.replace(/,/g, '.'))
                    setError(null)
                  }}
                  placeholder="0.00"
                />
                <strong>{asset.symbol}</strong>
              </div>
            </label>

            <label className="field">
              <span>Valid for</span>
              <div className="select-with-icon">
                <CalendarDays size={17} />
                <select value={expiry} onChange={(event) => setExpiry(event.target.value)}>
                  {EXPIRIES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                </select>
              </div>
            </label>

            <label className="field field--wide">
              <span>Memo <em>optional</em></span>
              <div className="input-with-icon">
                <FileText size={17} />
                <input
                  value={memo}
                  onChange={(event) => setMemo(event.target.value.slice(0, 120))}
                  placeholder="Invoice 2048 · November settlement"
                />
              </div>
            </label>
          </div>

          {asset.requiresAcceptance && (
            <label className="confirmation-check confirmation-check--soft">
              <input type="checkbox" checked={acceptance} onChange={(event) => setAcceptance(event.target.checked)} />
              <span className="confirmation-check__box"><Check size={13} /></span>
              <LockKeyhole size={17} />
              <span>I confirm this party has a standing acceptance for <strong>{asset.symbol}</strong>.</span>
            </label>
          )}
          {error && <div className="inline-error">{error}</div>}

          <div className="flow-footer">
            <button className="button button--ghost" onClick={onClose}>Cancel</button>
            <button className="button button--primary" onClick={createRequest}>
              Create secure link <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="request-created">
          <div className="request-created__layout">
            <div className="request-created__qr">
              <div className="qr-frame">
                <QRCodeSVG
                  value={paymentUrl}
                  size={186}
                  bgColor="#ffffff"
                  fgColor="#151814"
                  level="M"
                  marginSize={2}
                />
                <span><Link2 size={16} /></span>
              </div>
              <small>Scan to open the request</small>
            </div>
            <div className="request-created__details">
              <div className="created-amount">
                <AssetIcon asset={asset} size="large" />
                <div><span>Requested amount</span><strong>{created.amount} {asset.symbol}</strong></div>
              </div>
              <div className="created-detail"><span>Recipient</span><strong>{shortenParty(created.party)}</strong></div>
              <div className="created-detail"><span>Reference</span><strong>{created.memo || 'No memo'}</strong></div>
              <div className="created-detail">
                <span>Expires</span>
                <strong>{created.expiresAt ? new Date(created.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'}</strong>
              </div>
              <div className="link-box">
                <span>{paymentUrl}</span>
                <button onClick={() => void copyLink()} aria-label="Copy link">{copied ? <Check size={17} /> : <Copy size={17} />}</button>
              </div>
              <div className="request-created__actions">
                <button className="button button--primary" onClick={() => void copyLink()}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied' : 'Copy link'}
                </button>
                <button className="button button--secondary" onClick={() => void shareLink()}>
                  <Share2 size={16} /> Share
                </button>
                <a className="icon-button" href={paymentUrl} target="_blank" rel="noreferrer" aria-label="Open request">
                  <ExternalLink size={18} />
                </a>
              </div>
            </div>
          </div>
          <div className="privacy-note">
            <Check size={15} /> This request is encoded in the URL. Unison stores no customer data on a server.
          </div>
          <button
            className="request-created__back"
            onClick={() => {
              setCreated(null)
              setAmount('')
              setMemo('')
            }}
          >
            <ArrowLeft size={15} /> Create another request
          </button>
        </div>
      )}
    </Modal>
  )
}
