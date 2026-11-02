import { Radio } from 'lucide-react'
import { useZenith } from '../context/ZenithContext'

export function NetworkPill({ compact = false }: { compact?: boolean }) {
  const { network } = useZenith()
  const online = network.status === 'ready'
  const label = network.status === 'loading' ? 'Checking network' : online ? 'Zenith Testnet' : 'Network degraded'
  return (
    <div className={`network-pill ${online ? 'network-pill--online' : ''}`} title={label}>
      <span className="network-pill__signal">
        <Radio size={13} />
      </span>
      {!compact && <span>{label}</span>}
      {!compact && network.latencyMs !== null && <small>{network.latencyMs}ms</small>}
    </div>
  )
}
