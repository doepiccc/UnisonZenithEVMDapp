import { ArrowLeft, Check, Link2, Network, ShieldCheck, TriangleAlert } from 'lucide-react'
import { SettlementFlow } from '../components/SettlementFlow'
import { useZenith } from '../context/ZenithContext'
import { isRequestExpired } from '../lib/requestCodec'
import type { SettlementRequest } from '../types'

interface PayRequestPageProps {
  request: SettlementRequest | null
  error: string | null
  onBack: () => void
}

export function PayRequestPage({ request, error, onBack }: PayRequestPageProps) {
  const { network } = useZenith()
  const expired = request ? isRequestExpired(request) : false

  if (!request || error || expired) {
    return (
      <div className="invalid-request">
        <span className="invalid-request__icon"><TriangleAlert size={26} /></span>
        <span className="eyebrow">Payment link unavailable</span>
        <h1>{expired ? 'This request has expired' : 'This link cannot be opened'}</h1>
        <p>{expired ? 'Ask the recipient to create a fresh Unison payment request.' : error || 'The request data is missing or invalid.'}</p>
        <button className="button button--primary" onClick={onBack}><ArrowLeft size={16} /> Return to overview</button>
      </div>
    )
  }

  const hint = request.party.split('::')[0]
  return (
    <div className="page page--pay">
      <button className="pay-back" onClick={onBack}><ArrowLeft size={15} /> Back to Unison</button>
      <header className="pay-heading">
        <span className="pay-heading__icon"><Link2 size={18} /></span>
        <div>
          <span className="eyebrow">Settlement request</span>
          <h1>{hint} is requesting a payment</h1>
          <p>Review the exact destination and approve it with your EVM wallet.</p>
        </div>
      </header>
      <div className="pay-layout">
        <section className="pay-panel">
          <SettlementFlow request={request} onCancel={onBack} />
        </section>
        <aside className="pay-assurance">
          <div className="pay-assurance__network">
            <span className={`status-orb status-orb--${network.status}`} />
            <span>Zenith EVM Testnet</span>
            <strong>{network.status === 'ready' ? 'Ready' : 'Checking'}</strong>
          </div>
          <h2>What happens next</h2>
          <ol>
            <li><span><Network size={16} /></span><div><strong>Resolve</strong><p>The party ID maps to a deterministic Gateway inbox.</p></div></li>
            <li><span><ShieldCheck size={16} /></span><div><strong>Finalize</strong><p>Your EVM transaction settles through Canton consensus.</p></div></li>
            <li><span><Check size={16} /></span><div><strong>Verify</strong><p>The explorer links the EVM transaction to its Canton update.</p></div></li>
          </ol>
          <div className="pay-assurance__note"><ShieldCheck size={16} /><span>Unison never sees or stores your wallet keys.</span></div>
        </aside>
      </div>
    </div>
  )
}
