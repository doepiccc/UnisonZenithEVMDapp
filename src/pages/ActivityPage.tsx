import { RefreshCw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ActivityList } from '../components/ActivityList'
import { useAppData } from '../context/AppDataContext'
import { useToast } from '../context/ToastContext'
import { fetchPendingState, publicProvider } from '../lib/zenith'

export function ActivityPage() {
  const { activity, updateActivity, clearActivity } = useAppData()
  const { notify } = useToast()
  const [refreshing, setRefreshing] = useState(false)

  const refresh = async () => {
    setRefreshing(true)
    try {
      for (const record of activity.filter((item) => item.status === 'submitted')) {
        const receipt = await publicProvider.getTransactionReceipt(record.hash)
        if (!receipt) continue
        const gatewayState = await fetchPendingState(record.hash)
        updateActivity(record.id, {
          status: receipt.status === 1 ? 'finalized' : 'failed',
          blockNumber: receipt.blockNumber,
          gatewayState: gatewayState ?? undefined,
        })
      }
      notify('Settlement statuses refreshed.', 'success')
    } catch {
      notify('Could not refresh every settlement.', 'error')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="page page--activity">
      <header className="page-heading page-heading--compact">
        <div>
          <span className="eyebrow">Verifiable history</span>
          <h1>Activity</h1>
          <p>A device-local journal of transactions submitted through Unison.</p>
        </div>
        <div className="page-heading__actions">
          {activity.length > 0 && <button className="button button--ghost" onClick={clearActivity}><Trash2 size={16} /> Clear</button>}
          <button className="button button--secondary" onClick={() => void refresh()} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} /> Refresh status
          </button>
        </div>
      </header>

      <section className="activity-notice">
        <span>One receipt = final</span>
        <p>Once included in a Zenith EVM block, the transaction has already been finalized through Canton. No extra block confirmations are required.</p>
      </section>

      <section className="content-card activity-card">
        <ActivityList records={activity} />
      </section>
    </div>
  )
}
