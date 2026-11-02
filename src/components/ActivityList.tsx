import { ArrowUpRight, CheckCircle2, Clock3, ExternalLink, XCircle } from 'lucide-react'
import { useZenith } from '../context/ZenithContext'
import { ZENITH_NETWORK } from '../lib/constants'
import { formatDate, shortenAddress, shortenParty } from '../lib/format'
import type { SettlementRecord, ZenithAsset } from '../types'
import { AssetIcon } from './AssetIcon'

function fallbackAsset(record: SettlementRecord): ZenithAsset {
  return {
    id: record.assetId,
    kind: record.assetId === 'native' ? 'native' : 'erc20',
    symbol: record.assetSymbol,
    name: record.assetSymbol,
    decimals: 18,
    origin: 'evm',
    color: '#d9ff63',
    description: '',
  }
}

export function ActivityList({ records, compact = false }: { records: SettlementRecord[]; compact?: boolean }) {
  const { assets } = useZenith()

  if (records.length === 0) {
    return (
      <div className="empty-inline">
        <span><ArrowUpRight size={19} /></span>
        <div><strong>No settlements yet</strong><p>Your finalized transfers will appear here.</p></div>
      </div>
    )
  }

  return (
    <div className={`activity-list ${compact ? 'activity-list--compact' : ''}`}>
      <div className="activity-list__header">
        <span>Settlement</span>
        <span>Recipient</span>
        <span>Status</span>
        <span>Time</span>
        <span />
      </div>
      {records.map((record) => {
        const asset = assets.find((item) => item.id.toLowerCase() === record.assetId.toLowerCase()) ?? fallbackAsset(record)
        const StatusIcon = record.status === 'finalized' ? CheckCircle2 : record.status === 'failed' ? XCircle : Clock3
        return (
          <a
            className="activity-row"
            href={`${ZENITH_NETWORK.explorerUrl}/tx/${record.hash}`}
            target="_blank"
            rel="noreferrer"
            key={record.id}
          >
            <div className="activity-row__amount">
              <AssetIcon asset={asset} size="small" />
              <span><strong>{record.amount} {record.assetSymbol}</strong><small>{record.memo || shortenAddress(record.hash, 8, 5)}</small></span>
            </div>
            <div className="activity-row__recipient">
              <span className="mini-canton">C</span>
              <span><strong>{shortenParty(record.party)}</strong><small>{shortenAddress(record.inbox, 7, 5)}</small></span>
            </div>
            <div className={`status-chip status-chip--${record.status}`}>
              <StatusIcon size={14} />
              <span>{record.status === 'finalized' ? 'Final' : record.status === 'failed' ? 'Failed' : 'Settling'}</span>
            </div>
            <time>{formatDate(record.createdAt)}</time>
            <ExternalLink size={15} className="activity-row__external" />
          </a>
        )
      })}
    </div>
  )
}
