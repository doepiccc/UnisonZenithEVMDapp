import * as cantonSdk from '@canton-network/dapp-sdk'
import type { Wallet as CantonWalletAccount } from '@canton-network/dapp-sdk'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileKey2,
  HardDriveUpload,
  KeyRound,
  Link2,
  LoaderCircle,
  Network,
  PlugZap,
  RefreshCw,
  Server,
  ShieldCheck,
  Trash2,
  UserRoundPlus,
  WalletCards,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCantonRecipients } from '../context/CantonRecipientsContext'
import { useToast } from '../context/ToastContext'
import { useZenith } from '../context/ZenithContext'
import {
  buildStandingAcceptanceParams,
  createStandingAcceptance,
  defaultCantonLedgerUrl,
  getDevAcceptanceRules,
  hasZenithSynchronizer,
  inspectCantonNode,
  normalizeCantonApiUrl,
  normalizeCantonWalletGatewayUrl,
  provisionCantonParty,
  uploadZenithDar,
  validateLedgerUserId,
  validatePartyHint,
  type CantonApiConfig,
  type CantonNodeSnapshot,
} from '../lib/canton'
import {
  STORAGE_KEYS,
  ZENITH_CANTON_NETWORK,
  ZENITH_REQUIRED_DARS,
} from '../lib/constants'
import { copyText, friendlyError, shortenAddress, shortenParty } from '../lib/format'
import { resolveInbox } from '../lib/zenith'
import { createTimestamp, readStorage, writeStorage } from '../lib/storage'
import { validatePartyId } from '../lib/requestCodec'
import type { CantonRecipient } from '../types'

type SetupMode = 'wallet' | 'participant'

type CantonWalletOptions = NonNullable<Parameters<typeof cantonSdk.init>[0]>

const CANTON_WALLET_OPTIONS: CantonWalletOptions = {
  defaultAdapters: [],
  enableSuggestedWallets: false,
}

interface WalletState {
  connected: boolean
  networkId: string | null
  verified: boolean | null
  accounts: CantonWalletAccount[]
}

const EMPTY_WALLET: WalletState = {
  connected: false,
  networkId: null,
  verified: null,
  accounts: [],
}

function StatusMark({ ready, label }: { ready: boolean; label: string }) {
  return (
    <span className={`canton-status ${ready ? 'is-ready' : ''}`}>
      {ready ? <Check size={12} /> : <span />}
      {label}
    </span>
  )
}

function CopyAction({ value, label }: { value: string; label: string }) {
  const { notify } = useToast()
  return (
    <button
      type="button"
      className="canton-copy"
      title={`Copy ${label}`}
      onClick={() => void copyText(value).then(() => notify(`${label} copied.`, 'success'))}
    >
      <Copy size={13} />
    </button>
  )
}

export function CantonSetupPage({ onCreateRequest }: { onCreateRequest: () => void }) {
  const { chainInfo } = useZenith()
  const { notify } = useToast()
  const {
    recipients,
    activeRecipient,
    saveRecipient,
    removeRecipient,
    setActiveRecipient,
  } = useCantonRecipients()
  const [mode, setMode] = useState<SetupMode>('participant')

  const [walletState, setWalletState] = useState<WalletState>(EMPTY_WALLET)
  const [walletBusy, setWalletBusy] = useState<'init' | 'connect' | 'refresh' | 'save' | 'accept' | null>('init')
  const [walletError, setWalletError] = useState<string | null>(null)
  const [walletGatewayUrl, setWalletGatewayUrl] = useState(() =>
    readStorage<string>(STORAGE_KEYS.cantonWalletGatewayUrl, import.meta.env.DEV ? '/api/canton-wallet' : ''),
  )

  const [ledgerUrl, setLedgerUrl] = useState(() =>
    readStorage(STORAGE_KEYS.cantonLedgerUrl, defaultCantonLedgerUrl()),
  )
  const [ledgerToken, setLedgerToken] = useState('')
  const [node, setNode] = useState<CantonNodeSnapshot | null>(null)
  const [participantBusy, setParticipantBusy] = useState<string | null>(null)
  const [participantError, setParticipantError] = useState<string | null>(null)
  const [partyHint, setPartyHint] = useState('treasury')
  const [ledgerUserId, setLedgerUserId] = useState('unison-app')
  const [lastCreated, setLastCreated] = useState<CantonRecipient | null>(null)

  const apiConfig = useMemo<CantonApiConfig>(
    () => ({ baseUrl: ledgerUrl, token: ledgerToken || undefined }),
    [ledgerUrl, ledgerToken],
  )

  const refreshWallet = useCallback(async () => {
    setWalletBusy('refresh')
    setWalletError(null)
    try {
      const [status, accounts] = await Promise.all([cantonSdk.status(), cantonSdk.listAccounts()])
      let verified: boolean | null = null
      try {
        const synchronizers = await cantonSdk.ledgerApi({
          requestMethod: 'get',
          resource: '/v2/state/connected-synchronizers',
        })
        verified = hasZenithSynchronizer(synchronizers)
      } catch {
        verified = null
      }
      setWalletState({
        connected: status.connection.isConnected && status.connection.isNetworkConnected,
        networkId: status.network?.networkId ?? null,
        verified,
        accounts,
      })
    } catch (error) {
      setWalletState(EMPTY_WALLET)
      setWalletError(friendlyError(error))
    } finally {
      setWalletBusy(null)
    }
  }, [])

  useEffect(() => {
    let active = true
    void cantonSdk.init(CANTON_WALLET_OPTIONS)
      .then(async () => {
        const connection = await cantonSdk.isConnected()
        if (!active) return
        if (connection.isConnected) await refreshWallet()
        else setWalletBusy(null)
      })
      .catch((error) => {
        if (!active) return
        setWalletBusy(null)
        setWalletError(friendlyError(error))
      })
    return () => {
      active = false
    }
  }, [refreshWallet])

  const connectWallet = async (gatewayUrl?: string) => {
    setWalletBusy('connect')
    setWalletError(null)
    try {
      let options = CANTON_WALLET_OPTIONS
      if (gatewayUrl !== undefined) {
        const normalized = normalizeCantonWalletGatewayUrl(gatewayUrl)
        setWalletGatewayUrl(normalized)
        writeStorage(STORAGE_KEYS.cantonWalletGatewayUrl, normalized)
        options = {
          ...CANTON_WALLET_OPTIONS,
          additionalAdapters: [
            new cantonSdk.RemoteAdapter({
              name: 'Custom Canton Wallet Gateway',
              rpcUrl: normalized,
              description: 'CIP-103 gateway connected to Zenith Canton Testnet',
            }),
          ],
        }
      }
      const connection = await cantonSdk.connect(options)
      if (!connection.isConnected || !connection.isNetworkConnected) {
        throw new Error(connection.reason || connection.networkReason || 'The Canton wallet did not connect.')
      }
      await refreshWallet()
    } catch (error) {
      setWalletBusy(null)
      setWalletError(friendlyError(error))
    }
  }

  const saveWalletParty = async (account: CantonWalletAccount) => {
    const partyError = validatePartyId(account.partyId)
    if (partyError) {
      setWalletError(partyError)
      return
    }
    if (walletState.verified !== true) {
      setWalletError('This wallet could not be verified on the Zenith Canton synchronizer. Switch its network before saving the party.')
      return
    }
    setWalletBusy('save')
    setWalletError(null)
    try {
      const inbox = await resolveInbox(account.partyId, chainInfo.gatewayAddress)
      const existing = recipients.find((item) => item.partyId === account.partyId)
      const now = createTimestamp()
      const recipient: CantonRecipient = {
        id: existing?.id ?? account.partyId,
        name: account.hint || account.partyId.split('::')[0],
        partyId: account.partyId,
        inboxAddress: inbox.address,
        inboxDeployed: inbox.deployed,
        source: 'wallet',
        networkVerified: true,
        standingAcceptance: existing?.standingAcceptance ?? false,
        synchronizerId: ZENITH_CANTON_NETWORK.synchronizerId,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      saveRecipient(recipient)
      notify('Canton recipient saved and selected.', 'success')
    } catch (error) {
      setWalletError(friendlyError(error))
    } finally {
      setWalletBusy(null)
    }
  }

  const inspectParticipant = async () => {
    setParticipantBusy('inspect')
    setParticipantError(null)
    try {
      const normalized = normalizeCantonApiUrl(ledgerUrl)
      const snapshot = await inspectCantonNode({ baseUrl: normalized, token: ledgerToken || undefined })
      setLedgerUrl(normalized)
      writeStorage(STORAGE_KEYS.cantonLedgerUrl, normalized)
      setNode(snapshot)
      if (!snapshot.zenithConnected) {
        setParticipantError('The participant is reachable, but it is not connected to the published Zenith testnet synchronizer.')
      } else if (!snapshot.compatibleVersion) {
        setParticipantError(`Zenith currently requires Canton ${ZENITH_CANTON_NETWORK.cantonVersion}; this endpoint reports ${snapshot.ledgerVersion}.`)
      } else {
        notify('Canton participant verified.', 'success')
      }
    } catch (error) {
      setNode(null)
      setParticipantError(friendlyError(error))
    } finally {
      setParticipantBusy(null)
    }
  }

  const uploadDar = async (definition: (typeof ZENITH_REQUIRED_DARS)[number], file: File | undefined) => {
    if (!file || !node?.zenithConnected) return
    setParticipantBusy(`dar:${definition.id}`)
    setParticipantError(null)
    try {
      await uploadZenithDar(apiConfig, file, definition)
      setNode(await inspectCantonNode(apiConfig))
      notify(`${definition.fileName} verified, uploaded and vetted.`, 'success')
    } catch (error) {
      setParticipantError(friendlyError(error))
    } finally {
      setParticipantBusy(null)
    }
  }

  const packagesReady = Boolean(
    node && ZENITH_REQUIRED_DARS.every((item) => node.vettedPackages[item.packageId]),
  )

  const createParticipantRecipient = async () => {
    const inputError = validatePartyHint(partyHint) ?? validateLedgerUserId(ledgerUserId)
    if (inputError) {
      setParticipantError(inputError)
      return
    }
    if (!node?.zenithConnected || !node.compatibleVersion || !packagesReady) return
    setParticipantBusy('create')
    setParticipantError(null)
    try {
      const provisioned = await provisionCantonParty(apiConfig, partyHint, ledgerUserId)
      const inbox = await resolveInbox(provisioned.partyId, chainInfo.gatewayAddress)
      const now = createTimestamp()
      const recipient: CantonRecipient = {
        id: provisioned.partyId,
        name: partyHint.trim(),
        partyId: provisioned.partyId,
        inboxAddress: inbox.address,
        inboxDeployed: inbox.deployed,
        source: 'participant',
        networkVerified: true,
        standingAcceptance: false,
        participantId: node.participantId,
        synchronizerId: ZENITH_CANTON_NETWORK.synchronizerId,
        ledgerUserId: provisioned.ledgerUserId,
        createdAt: now,
        updatedAt: now,
      }
      saveRecipient(recipient)
      setLastCreated(recipient)
      if (provisioned.userReady) {
        notify('Party, Ledger API user and recipient inbox are ready.', 'success')
      } else {
        setParticipantError(`Party ${shortenParty(provisioned.partyId)} was created, but the Ledger API user needs attention: ${provisioned.userError}`)
      }
    } catch (error) {
      setParticipantError(friendlyError(error))
    } finally {
      setParticipantBusy(null)
    }
  }

  const enableStandingAcceptance = async (recipient: CantonRecipient) => {
    setWalletBusy('accept')
    setParticipantBusy('accept')
    setWalletError(null)
    setParticipantError(null)
    try {
      const walletOwnsParty = walletState.verified === true && walletState.accounts.some(
        (account) => account.partyId === recipient.partyId,
      )
      if (walletOwnsParty) {
        const rules = await getDevAcceptanceRules()
        const params = buildStandingAcceptanceParams(recipient.partyId, rules)
        await cantonSdk.prepareExecuteAndWait(
          params as Parameters<typeof cantonSdk.prepareExecuteAndWait>[0],
        )
      } else if (recipient.ledgerUserId && node?.zenithConnected) {
        await createStandingAcceptance(apiConfig, recipient.partyId, recipient.ledgerUserId)
      } else {
        throw new Error('Connect the Canton wallet that owns this party, or reconnect its participant endpoint.')
      }
      saveRecipient({ ...recipient, standingAcceptance: true, updatedAt: createTimestamp() }, false)
      notify('Standing acceptance enabled for DUSD and wCC.', 'success')
    } catch (error) {
      const message = friendlyError(error)
      if (mode === 'wallet') setWalletError(message)
      else setParticipantError(message)
    } finally {
      setWalletBusy(null)
      setParticipantBusy(null)
    }
  }

  return (
    <div className="page page--canton">
      <header className="page-heading page-heading--compact">
        <div>
          <span className="eyebrow">Canton identity & receiving</span>
          <h1>Canton setup</h1>
          <p>Create or connect a real Party ID on Zenith’s Canton test network, derive its Gateway inbox, and make it reusable across Unison.</p>
        </div>
        {activeRecipient && (
          <button className="button button--primary" onClick={onCreateRequest}>
            Create request <ArrowRight size={16} />
          </button>
        )}
      </header>

      <section className="canton-explainer">
        <div className="canton-explainer__icon"><Network size={23} /></div>
        <div>
          <span className="eyebrow">What Unison creates</span>
          <h2>A recipient is a Party ID plus its deterministic inbox</h2>
          <p>The Party lives on Canton. The inbox lives on Zenith EVM and deploys on first use. Unison stores only public identifiers on this device—never signing keys or bearer tokens.</p>
        </div>
        <div className="canton-explainer__steps">
          <span><b>1</b> Party</span><i /><span><b>2</b> Rights</span><i /><span><b>3</b> Inbox</span><i /><span><b>4</b> Accept</span>
        </div>
      </section>

      <div className="canton-mode-switch" role="tablist" aria-label="Canton setup method">
        <button className={mode === 'participant' ? 'is-active' : ''} onClick={() => setMode('participant')} role="tab">
          <UserRoundPlus size={18} /><span><strong>Create Canton wallet</strong><small>Real Party ID on your participant</small></span><em>Recommended</em>
        </button>
        <button className={mode === 'wallet' ? 'is-active' : ''} onClick={() => setMode('wallet')} role="tab">
          <WalletCards size={18} /><span><strong>Connect existing</strong><small>CIP-103 extension or gateway</small></span>
        </button>
      </div>

      {mode === 'wallet' ? (
        <section className="canton-panel">
          <header className="canton-panel__heading">
            <span className="canton-panel__number">01</span>
            <div><h2>Connect a Canton wallet</h2><p>The wallet keeps custody and allocates parties. Unison only reads the party you approve.</p></div>
            {walletState.connected && <StatusMark ready={walletState.verified === true} label={walletState.verified === true ? 'Zenith verified' : 'Verify network'} />}
          </header>

          {!walletState.connected ? (
            <div className="wallet-onboarding">
              <div className="wallet-onboarding__icon"><WalletCards size={27} /></div>
              <h3>Connect a Zenith-compatible wallet</h3>
              <p>A Canton wallet must use a participant connected to Zenith’s separate synchronizer. The generic Send Connect profile is hidden because it does not provide a verified Zenith network connection.</p>
              <div className="wallet-connect-options">
                <button className="button button--secondary" onClick={() => void connectWallet()} disabled={walletBusy !== null}>
                  {walletBusy === 'connect' ? <LoaderCircle className="spin" size={16} /> : <PlugZap size={16} />}
                  Find installed CIP-103 wallet
                </button>
                <span className="wallet-connect-divider">or connect your gateway</span>
                <div className="wallet-gateway-form">
                  <label className="field">
                    <span>Wallet Gateway dApp URL</span>
                    <div className="input-with-icon">
                      <Link2 size={16} />
                      <input
                        value={walletGatewayUrl}
                        onChange={(event) => setWalletGatewayUrl(event.target.value)}
                        placeholder="http://localhost:3030/api/v0/dapp"
                        spellCheck={false}
                      />
                    </div>
                    <small>Dev proxy: /api/canton-wallet · direct default: http://localhost:3030/api/v0/dapp</small>
                  </label>
                  <button
                    className="button button--primary"
                    onClick={() => void connectWallet(walletGatewayUrl)}
                    disabled={walletBusy !== null || !walletGatewayUrl.trim()}
                  >
                    {walletBusy === 'connect' ? <LoaderCircle className="spin" size={16} /> : <Server size={16} />}
                    Connect gateway
                  </button>
                </div>
                <div className="wallet-gateway-help">
                  <span>No compatible wallet? Run the official Wallet Gateway against your Zenith participant.</span>
                  <a href={ZENITH_CANTON_NETWORK.walletGatewayDocsUrl} target="_blank" rel="noreferrer">Gateway guide <ExternalLink size={12} /></a>
                  <button type="button" onClick={() => setMode('participant')}>Create directly with participant <ArrowRight size={12} /></button>
                </div>
              </div>
              <small>Canton and EVM wallets are separate connections. Unison never turns an EVM key into a Canton Party ID.</small>
            </div>
          ) : (
            <div className="canton-wallet-connected">
              <div className="canton-connection-line">
                <div><span>Wallet network</span><strong>{walletState.networkId || 'Network ID unavailable'}</strong></div>
                <button className="button button--secondary" onClick={() => void refreshWallet()} disabled={walletBusy !== null}><RefreshCw size={14} /> Refresh</button>
                <button className="button button--ghost" onClick={() => void cantonSdk.open()}>Open wallet <ExternalLink size={14} /></button>
              </div>
              {walletState.verified === false && (
                <div className="notice notice--amber"><ShieldCheck size={17} /><span>This wallet is connected to a different Canton synchronizer. Switch to Zenith Canton Testnet in the wallet.</span></div>
              )}
              {walletState.verified === null && (
                <div className="notice notice--amber"><ShieldCheck size={17} /><span>The wallet did not allow synchronizer verification. Open it and confirm its Ledger API points to Zenith before retrying.</span></div>
              )}
              <div className="wallet-party-list">
                {walletState.accounts.length === 0 ? (
                  <div className="wallet-party-empty">
                    <UserRoundPlus size={22} /><div><strong>No allocated party yet</strong><span>Open the wallet manager, create a wallet/party, then refresh this list.</span></div>
                    <button className="button button--secondary" onClick={() => void cantonSdk.open()}>Create in wallet <ExternalLink size={14} /></button>
                  </div>
                ) : walletState.accounts.map((account) => (
                  <article className="wallet-party" key={account.partyId}>
                    <span className="wallet-party__avatar">{(account.hint || 'C').slice(0, 1).toUpperCase()}</span>
                    <div><strong>{account.hint || account.partyId.split('::')[0]}</strong><code>{shortenParty(account.partyId)}</code></div>
                    <span className={`wallet-party__state ${account.status === 'allocated' ? 'is-ready' : ''}`}>{account.status}</span>
                    <button
                      className="button button--primary"
                      disabled={walletState.verified !== true || account.status !== 'allocated' || walletBusy !== null}
                      onClick={() => void saveWalletParty(account)}
                    >
                      {walletBusy === 'save' ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />} Use party
                    </button>
                  </article>
                ))}
              </div>
            </div>
          )}
          {walletError && <div className="inline-error canton-panel__error">{walletError}</div>}
        </section>
      ) : (
        <section className="canton-panel canton-panel--participant">
          <header className="canton-panel__heading">
            <span className="canton-panel__number">01</span>
            <div><h2>Create a participant-backed Canton wallet</h2><p>Unison creates a real Party ID, Ledger API user and Gateway inbox. Custody and signing remain on your participant.</p></div>
            <a href={ZENITH_CANTON_NETWORK.onboardingDocsUrl} target="_blank" rel="noreferrer" className="text-link">Official guide <ExternalLink size={13} /></a>
          </header>

          <div className="notice notice--amber">
            <ShieldCheck size={17} />
            <span>Canton has no standalone seed-phrase wallet like EVM. A real Party ID must be hosted by a live participant; Unison automates creation after verifying that participant below.</span>
          </div>

          <div className="participant-prereqs">
            <div><Server size={18} /><span><strong>Canton {ZENITH_CANTON_NETWORK.cantonVersion}</strong><small>Persistent participant storage</small></span></div>
            <div><Network size={18} /><span><strong>Zenith synchronizer</strong><small>Open connection on port 443</small></span></div>
            <div><FileKey2 size={18} /><span><strong>Official Zenith bundle</strong><small>Two private DAR files</small></span></div>
            <a href={`mailto:${ZENITH_CANTON_NETWORK.bundleEmail}?subject=Zenith%20testnet%20bundle%20access`}>Request bundle <ExternalLink size={13} /></a>
          </div>

          <div className="participant-connection-form">
            <label className="field">
              <span>JSON Ledger API URL</span>
              <div className="input-with-icon"><Server size={17} /><input value={ledgerUrl} onChange={(event) => { setLedgerUrl(event.target.value); setNode(null) }} spellCheck={false} /></div>
              <small>Vite dev proxy: /api/canton · direct node default: http://127.0.0.1:7575</small>
            </label>
            <label className="field">
              <span>Bearer token <em>optional</em></span>
              <div className="input-with-icon"><KeyRound size={17} /><input type="password" value={ledgerToken} onChange={(event) => setLedgerToken(event.target.value)} placeholder="Kept in memory only" autoComplete="off" /></div>
              <small>Never written to localStorage.</small>
            </label>
            <button className="button button--primary" onClick={() => void inspectParticipant()} disabled={participantBusy !== null}>
              {participantBusy === 'inspect' ? <LoaderCircle className="spin" size={16} /> : <PlugZap size={16} />} Connect & verify
            </button>
          </div>

          {node && (
            <>
              <div className="participant-health">
                <div><span>Participant</span><strong>{shortenAddress(node.participantId, 18, 10)}</strong></div>
                <div><span>Canton build</span><strong>{node.ledgerVersion}</strong><StatusMark ready={node.compatibleVersion} label={node.compatibleVersion ? 'Compatible' : 'Mismatch'} /></div>
                <div><span>Synchronizer</span><strong>{node.zenithConnected ? 'zenith-testnet' : 'Not connected'}</strong><StatusMark ready={node.zenithConnected} label={node.zenithConnected ? 'Connected' : 'Required'} /></div>
              </div>

              <div className="canton-subsection-heading"><span>02</span><div><h3>Verify and vet the Zenith packages</h3><p>Files are SHA-256 checked in your browser before upload.</p></div></div>
              <div className="dar-list">
                {ZENITH_REQUIRED_DARS.map((definition) => {
                  const ready = node.vettedPackages[definition.packageId]
                  const busy = participantBusy === `dar:${definition.id}`
                  return (
                    <article className={ready ? 'is-ready' : ''} key={definition.id}>
                      <span className="dar-list__icon">{ready ? <CheckCircle2 size={19} /> : <HardDriveUpload size={19} />}</span>
                      <div><strong>{definition.fileName}</strong><small>{definition.description}</small><code>SHA-256 {definition.sha256.slice(0, 12)}…</code></div>
                      {ready ? (
                        <StatusMark ready label="Vetted" />
                      ) : (
                        <label className={`button button--secondary ${!node.zenithConnected ? 'is-disabled' : ''}`}>
                          {busy ? <LoaderCircle className="spin" size={15} /> : <HardDriveUpload size={15} />} Select DAR
                          <input type="file" accept=".dar" disabled={!node.zenithConnected || participantBusy !== null} onChange={(event) => void uploadDar(definition, event.target.files?.[0])} />
                        </label>
                      )}
                    </article>
                  )
                })}
              </div>

              <div className="canton-subsection-heading"><span>03</span><div><h3>Create the Canton wallet</h3><p>Allocates a Party ID, creates one Ledger API user, and grants actAs + readAs rights.</p></div></div>
              <div className="party-create-form">
                <label className="field"><span>Party hint</span><input value={partyHint} onChange={(event) => setPartyHint(event.target.value)} placeholder="treasury" /><small>Becomes the readable part before ::namespace.</small></label>
                <label className="field"><span>Application user</span><input value={ledgerUserId} onChange={(event) => setLedgerUserId(event.target.value)} placeholder="unison-app" /><small>Local to this participant.</small></label>
                <button className="button button--primary" onClick={() => void createParticipantRecipient()} disabled={!node.zenithConnected || !node.compatibleVersion || !packagesReady || participantBusy !== null}>
                  {participantBusy === 'create' ? <LoaderCircle className="spin" size={16} /> : <UserRoundPlus size={16} />} Create Canton wallet
                </button>
              </div>
              {!packagesReady && <p className="participant-gate"><ShieldCheck size={14} /> Upload and vet both official DARs before creating a party.</p>}
            </>
          )}
          {lastCreated && (
            <div className="created-party-note"><CheckCircle2 size={18} /><div><strong>Canton wallet created</strong><span>{lastCreated.partyId}</span></div></div>
          )}
          {participantError && <div className="inline-error canton-panel__error">{participantError}</div>}
        </section>
      )}

      <section className="canton-recipients-card">
        <header className="section-heading">
          <div><span className="eyebrow">Saved on this device</span><h2>Your Canton recipients</h2></div>
          <span>{recipients.length} saved</span>
        </header>
        {recipients.length === 0 ? (
          <div className="canton-recipients-empty"><Link2 size={22} /><strong>No recipient is ready yet</strong><span>Complete either setup path above. A saved recipient will automatically appear in payment requests and direct settlements.</span></div>
        ) : (
          <div className="canton-recipient-list">
            {recipients.map((recipient) => {
              const active = activeRecipient?.id === recipient.id
              const canAccept = (
                walletState.verified === true && walletState.accounts.some((account) => account.partyId === recipient.partyId)
              ) || Boolean(recipient.ledgerUserId && node?.zenithConnected)
              return (
                <article className={active ? 'is-active' : ''} key={recipient.id}>
                  <div className="canton-recipient__avatar">{recipient.name.slice(0, 1).toUpperCase()}</div>
                  <div className="canton-recipient__identity">
                    <span><strong>{recipient.name}</strong>{active && <em>Default</em>}<small>{recipient.source}</small></span>
                    <div><code title={recipient.partyId}>{shortenParty(recipient.partyId)}</code><CopyAction value={recipient.partyId} label="Party ID" /></div>
                  </div>
                  <div className="canton-recipient__inbox">
                    <span>Gateway inbox</span>
                    <div><code>{shortenAddress(recipient.inboxAddress, 10, 8)}</code><CopyAction value={recipient.inboxAddress} label="Inbox" /></div>
                    <small>{recipient.inboxDeployed ? 'Deployed' : 'Deploys on first transfer'}</small>
                  </div>
                  <div className="canton-recipient__acceptance">
                    <span>DUSD / wCC</span>
                    {recipient.standingAcceptance ? (
                      <StatusMark ready label="Accepted" />
                    ) : (
                      <button disabled={!canAccept || walletBusy === 'accept' || participantBusy === 'accept'} onClick={() => void enableStandingAcceptance(recipient)}>
                        {walletBusy === 'accept' || participantBusy === 'accept' ? <LoaderCircle className="spin" size={13} /> : <ShieldCheck size={13} />} Enable
                      </button>
                    )}
                  </div>
                  <div className="canton-recipient__actions">
                    {!active && <button onClick={() => setActiveRecipient(recipient.id)}>Use as default</button>}
                    <button className="is-danger" onClick={() => removeRecipient(recipient.id)} title="Remove recipient"><Trash2 size={15} /></button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
        <p className="canton-recipients-note"><ShieldCheck size={14} /> A standing acceptance is needed only when DUSD or wCC returns from EVM. ZTH and DORIG need no recipient preapproval.</p>
      </section>
    </div>
  )
}
