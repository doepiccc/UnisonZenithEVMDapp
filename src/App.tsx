import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppShell } from './components/AppShell'
import { CreateRequestModal } from './components/CreateRequestModal'
import { SettlementModal } from './components/SettlementFlow'
import { decodeRequest } from './lib/requestCodec'
import { ActivityPage } from './pages/ActivityPage'
import { OverviewPage } from './pages/OverviewPage'
import { PayRequestPage } from './pages/PayRequestPage'
import { RequestsPage } from './pages/RequestsPage'
import type { AppRoute } from './types'

interface RouteState {
  route: AppRoute
  payload: string | null
}

function readRoute(): RouteState {
  const hash = window.location.hash.replace(/^#\/?/, '')
  if (hash.startsWith('pay/')) return { route: 'pay', payload: hash.slice(4) }
  if (hash === 'requests' || hash === 'activity' || hash === 'overview') return { route: hash, payload: null }
  return { route: 'overview', payload: null }
}

export default function App() {
  const [routeState, setRouteState] = useState<RouteState>(readRoute)
  const [settlementOpen, setSettlementOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)

  useEffect(() => {
    if (!window.location.hash) window.history.replaceState(null, '', `${window.location.pathname}#/overview`)
    const onHashChange = () => setRouteState(readRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback((route: 'overview' | 'requests' | 'activity') => {
    window.location.hash = `/${route}`
    setRouteState({ route, payload: null })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const sharedRequest = useMemo(() => {
    if (routeState.route !== 'pay' || !routeState.payload) return { request: null, error: null }
    try {
      return { request: decodeRequest(routeState.payload), error: null }
    } catch (error) {
      return { request: null, error: error instanceof Error ? error.message : 'Invalid payment link.' }
    }
  }, [routeState])

  return (
    <>
      <AppShell
        route={routeState.route}
        navigate={navigate}
        onSend={() => setSettlementOpen(true)}
        onCreateRequest={() => setRequestOpen(true)}
      >
        {routeState.route === 'overview' && (
          <OverviewPage
            onSend={() => setSettlementOpen(true)}
            onCreateRequest={() => setRequestOpen(true)}
            onViewActivity={() => navigate('activity')}
          />
        )}
        {routeState.route === 'requests' && <RequestsPage onCreateRequest={() => setRequestOpen(true)} />}
        {routeState.route === 'activity' && <ActivityPage />}
        {routeState.route === 'pay' && (
          <PayRequestPage
            request={sharedRequest.request}
            error={sharedRequest.error}
            onBack={() => navigate('overview')}
          />
        )}
      </AppShell>

      <SettlementModal open={settlementOpen} onClose={() => setSettlementOpen(false)} />
      <CreateRequestModal open={requestOpen} onClose={() => setRequestOpen(false)} />
    </>
  )
}
