import {
  Check,
  Clock3,
  Copy,
  ExternalLink,
  FilePlus2,
  Link2,
  MoreHorizontal,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { useToast } from '../context/ToastContext'
import { useZenith } from '../context/ZenithContext'
import { formatDate, shortenParty } from '../lib/format'
import { buildPaymentUrl, isRequestExpired } from '../lib/requestCodec'
import { AssetIcon } from '../components/AssetIcon'

export function RequestsPage({ onCreateRequest }: { onCreateRequest: () => void }) {
  const { requests, removeRequest } = useAppData()
  const { assets } = useZenith()
  const { notify } = useToast()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpenMenu(null)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [])

  const copyRequest = async (id: string) => {
    const request = requests.find((item) => item.id === id)
    if (!request) return
    await navigator.clipboard.writeText(buildPaymentUrl(request))
    setCopied(id)
    notify('Payment link copied.', 'success')
    window.setTimeout(() => setCopied(null), 1_500)
  }

  return (
    <div className="page page--requests">
      <header className="page-heading page-heading--compact">
        <div>
          <span className="eyebrow">Canton payment links</span>
          <h1>Requests</h1>
          <p>Create shareable settlement instructions without deploying a contract or running a server.</p>
        </div>
        <button className="button button--primary" onClick={onCreateRequest}><FilePlus2 size={17} /> Create request</button>
      </header>

      <div className="requests-summary">
        <div><span className="requests-summary__icon"><Link2 size={18} /></span><span>Created on this device</span><strong>{requests.length}</strong></div>
        <div><span className="requests-summary__icon requests-summary__icon--green"><ShieldCheck size={18} /></span><span>Stored by Unison servers</span><strong>0</strong></div>
        <p><ShieldCheck size={15} /> Request data stays in the URL and your browser storage.</p>
      </div>

      {requests.length === 0 ? (
        <section className="empty-state">
          <div className="empty-state__visual">
            <span><Link2 size={28} /></span>
            <i /><i /><i />
          </div>
          <span className="eyebrow">Nothing to chase</span>
          <h2>Create your first payment request</h2>
          <p>Set the Canton recipient, asset and amount. Share one link with any EVM wallet.</p>
          <button className="button button--primary" onClick={onCreateRequest}>Create payment link <FilePlus2 size={16} /></button>
        </section>
      ) : (
        <section className="request-list">
          <div className="request-list__header">
            <span>Request</span><span>Recipient</span><span>Expiry</span><span>Status</span><span />
          </div>
          {requests.map((request) => {
            const asset = assets.find((item) => item.id.toLowerCase() === request.assetId.toLowerCase()) ?? assets[0]
            const expired = isRequestExpired(request)
            const url = buildPaymentUrl(request)
            return (
              <article className="request-row" key={request.id}>
                <div className="request-row__amount">
                  <AssetIcon asset={asset} />
                  <span><strong>{request.amount} {asset.symbol}</strong><small>{request.memo || 'Settlement request'}</small></span>
                </div>
                <div className="request-row__recipient"><strong>{shortenParty(request.party)}</strong><small>Canton party</small></div>
                <div className="request-row__expiry"><strong>{request.expiresAt ? formatDate(request.expiresAt, false) : 'Never'}</strong><small>Created {formatDate(request.createdAt, false)}</small></div>
                <div><span className={`status-chip ${expired ? 'status-chip--failed' : 'status-chip--finalized'}`}><Clock3 size={13} />{expired ? 'Expired' : 'Active'}</span></div>
                <div className="request-row__actions" ref={openMenu === request.id ? menuRef : undefined}>
                  <button onClick={() => void copyRequest(request.id)} title="Copy payment link">
                    {copied === request.id ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                  <a href={url} target="_blank" rel="noreferrer" title="Open payment link"><ExternalLink size={16} /></a>
                  <button onClick={() => setOpenMenu(openMenu === request.id ? null : request.id)} title="More actions"><MoreHorizontal size={17} /></button>
                  {openMenu === request.id && (
                    <div className="row-menu">
                      <button onClick={() => { removeRequest(request.id); setOpenMenu(null) }}><Trash2 size={15} /> Delete request</button>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}
