import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleDollarSign,
  ExternalLink,
  FilePlus2,
  Gauge,
  Layers3,
  Link2,
  Network,
  Radio,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'
import { useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { useToast } from '../context/ToastContext'
import { useWallet } from '../context/WalletContext'
import { useZenith } from '../context/ZenithContext'
import { ZENITH_NETWORK } from '../lib/constants'
import { formatBalance, formatCompactNumber, friendlyError } from '../lib/format'
import { ActivityList } from '../components/ActivityList'

interface OverviewPageProps {
  onSend: () => void
  onCreateRequest: () => void
  onViewActivity: () => void
}

export function OverviewPage({ onSend, onCreateRequest, onViewActivity }: OverviewPageProps) {
  const wallet = useWallet()
  const { network } = useZenith()
  const { activity, requests } = useAppData()
  const { notify } = useToast()
  const [renderedAt] = useState(() => Date.now())

  const connect = async () => {
    try {
      await wallet.connect()
    } catch (error) {
      notify(friendlyError(error), 'error')
    }
  }

  const activeRequests = requests.filter((request) => !request.expiresAt || request.expiresAt > renderedAt).length

  return (
    <div className="page page--overview">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Settlement overview</span>
          <h1>Every leg. <em>One final state.</em></h1>
          <p>Move value between EVM wallets and Canton parties with no bridge and no confirmation guesswork.</p>
        </div>
        <div className="page-heading__actions">
          <button className="button button--secondary" onClick={onCreateRequest}><FilePlus2 size={17} /> Request</button>
          <button className="button button--primary" onClick={onSend}>New settlement <ArrowUpRight size={17} /></button>
        </div>
      </header>

      <section className="overview-hero">
        <div className="overview-hero__copy">
          <span className="hero-kicker"><span /> Native Canton settlement</span>
          <h2>From wallet to Canton.<br />One link is all it takes.</h2>
          <p>Create a payment request or settle directly to a Canton party through Zenith Gateway.</p>
          <div className="overview-hero__actions">
            <button onClick={onCreateRequest}>Create a payment link <ArrowRight size={16} /></button>
            <button onClick={onSend}>Send directly</button>
          </div>
          <div className="overview-hero__proofs">
            <span><Check size={13} /> No backend</span>
            <span><Check size={13} /> No Gateway fee</span>
            <span><Check size={13} /> One-receipt finality</span>
          </div>
        </div>
        <div className="hero-route" aria-hidden="true">
          <div className="hero-route__glow" />
          <div className="hero-route__node hero-route__node--wallet">
            <WalletCards size={21} />
            <span>EVM wallet</span>
          </div>
          <div className="hero-route__line hero-route__line--first"><i /></div>
          <div className="hero-route__gateway">
            <span><Layers3 size={22} /></span>
            <strong>ZENITH</strong>
            <small>Gateway</small>
          </div>
          <div className="hero-route__line hero-route__line--second"><i /></div>
          <div className="hero-route__node hero-route__node--canton">
            <Network size={21} />
            <span>Canton party</span>
          </div>
          <div className="hero-route__final"><ShieldCheck size={15} /> Final</div>
        </div>
      </section>

      <section className="metrics-grid">
        <article className="metric-card metric-card--balance">
          <div className="metric-card__top">
            <span className="metric-icon"><CircleDollarSign size={18} /></span>
            <span>Treasury balance</span>
            <small>ZTH</small>
          </div>
          {wallet.account ? (
            <>
              <strong className="metric-card__value">{formatBalance(wallet.balance, 5)}</strong>
              <div className="metric-card__bottom">
                <span>Zenith EVM Testnet</span>
                <a href={ZENITH_NETWORK.faucetUrl} target="_blank" rel="noreferrer">Get test ZTH <ExternalLink size={13} /></a>
              </div>
            </>
          ) : (
            <>
              <strong className="metric-card__value metric-card__value--muted">—</strong>
              <button className="metric-card__connect" onClick={() => void connect()}>Connect wallet to view <ArrowRight size={14} /></button>
            </>
          )}
        </article>

        <article className="metric-card">
          <div className="metric-card__top">
            <span className="metric-icon metric-icon--blue"><Radio size={18} /></span>
            <span>Network pulse</span>
            <small className={`live-label ${network.status === 'ready' ? 'is-live' : ''}`}>{network.status === 'ready' ? 'Live' : 'Checking'}</small>
          </div>
          <strong className="metric-card__value">{network.blockNumber ? formatCompactNumber(network.blockNumber) : '—'}</strong>
          <div className="metric-card__bottom"><span>Latest EVM block</span><b>{network.latencyMs ? `${network.latencyMs} ms RPC` : 'On demand'}</b></div>
        </article>

        <article className="metric-card">
          <div className="metric-card__top">
            <span className="metric-icon metric-icon--peach"><Link2 size={18} /></span>
            <span>Payment links</span>
            <small>Local</small>
          </div>
          <strong className="metric-card__value">{activeRequests}</strong>
          <div className="metric-card__bottom"><span>Active requests</span><button onClick={onCreateRequest}>Create one <ArrowRight size={13} /></button></div>
        </article>

        <article className="metric-card">
          <div className="metric-card__top">
            <span className="metric-icon metric-icon--violet"><Gauge size={18} /></span>
            <span>Finality model</span>
            <small>Canton</small>
          </div>
          <strong className="metric-card__value metric-card__value--text">1 receipt</strong>
          <div className="metric-card__bottom"><span>Deterministic finality</span><b>No reorg waiting</b></div>
        </article>
      </section>

      <section className="content-card recent-card">
        <header className="section-heading">
          <div><span className="eyebrow">Local ledger</span><h2>Recent settlements</h2></div>
          <button className="text-link" onClick={onViewActivity}>View all <ArrowRight size={15} /></button>
        </header>
        <ActivityList records={activity.slice(0, 4)} compact />
      </section>

      <section className="how-strip">
        <div className="how-strip__intro">
          <span className="eyebrow">Built for Zenith</span>
          <h2>Simple on the surface.<br />Institutional underneath.</h2>
        </div>
        <div className="how-strip__steps">
          <div><span>01</span><strong>Resolve</strong><p>Turn a full Canton party ID into its deterministic Gateway inbox.</p></div>
          <div><span>02</span><strong>Settle</strong><p>Send ZTH or a registered asset with the wallet you already use.</p></div>
          <div><span>03</span><strong>Prove</strong><p>Open the linked transaction and trace its EVM → Canton lifecycle.</p></div>
        </div>
      </section>
    </div>
  )
}
