import {
  Activity,
  ArrowUpRight,
  FilePlus2,
  HelpCircle,
  LayoutDashboard,
  Menu,
  Send,
  X,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useZenith } from '../context/ZenithContext'
import { ZENITH_NETWORK } from '../lib/constants'
import type { AppRoute } from '../types'
import { Logo } from './Logo'
import { NetworkPill } from './NetworkPill'
import { WalletButton } from './WalletButton'

interface AppShellProps {
  route: AppRoute
  children: ReactNode
  navigate: (route: Exclude<AppRoute, 'pay'>) => void
  onSend: () => void
  onCreateRequest: () => void
}

const navigation = [
  { route: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
  { route: 'requests' as const, label: 'Requests', icon: FilePlus2 },
  { route: 'activity' as const, label: 'Activity', icon: Activity },
]

export function AppShell({ route, children, navigate, onSend, onCreateRequest }: AppShellProps) {
  const [mobileMenu, setMobileMenu] = useState(false)
  const { network } = useZenith()

  const go = (next: Exclude<AppRoute, 'pay'>) => {
    navigate(next)
    setMobileMenu(false)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? 'sidebar--open' : ''}`}>
        <div className="sidebar__top">
          <button className="logo-button" onClick={() => go('overview')}>
            <Logo />
          </button>
          <button className="sidebar__close" onClick={() => setMobileMenu(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <button className="sidebar__primary" onClick={onSend}>
          <Send size={17} />
          New settlement
        </button>

        <nav className="sidebar__nav" aria-label="Main navigation">
          <span className="sidebar__label">Workspace</span>
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <button
                className={route === item.route ? 'is-active' : ''}
                onClick={() => go(item.route)}
                key={item.route}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.route === 'requests' && <small>Links</small>}
              </button>
            )
          })}
          <span className="sidebar__label sidebar__label--resources">Resources</span>
          <a href={ZENITH_NETWORK.docsUrl} target="_blank" rel="noreferrer">
            <HelpCircle size={18} />
            <span>Zenith docs</span>
            <ArrowUpRight size={14} className="nav-external" />
          </a>
        </nav>

        <div className="sidebar__footer">
          <div className="network-card">
            <div className="network-card__top">
              <span className={`status-orb status-orb--${network.status}`} />
              <span>Zenith EVM</span>
              <small>Testnet</small>
            </div>
            <div className="network-card__metric">
              <span>Latest block</span>
              <strong>{network.blockNumber ? `#${network.blockNumber.toLocaleString()}` : '—'}</strong>
            </div>
            <div className="network-card__metric">
              <span>Settlement</span>
              <strong>{network.gatewayReady ? 'Ready' : 'Checking'}</strong>
            </div>
          </div>
          <p>Testnet assets have no real-world value.</p>
        </div>
      </aside>

      {mobileMenu && <button className="mobile-scrim" onClick={() => setMobileMenu(false)} aria-label="Close menu" />}

      <div className="app-main">
        <header className="topbar">
          <div className="topbar__mobile-brand">
            <button className="icon-button" onClick={() => setMobileMenu(true)} aria-label="Open menu">
              <Menu size={20} />
            </button>
            <button className="topbar__mark" onClick={() => go('overview')}>
              <Logo compact />
            </button>
          </div>
          <div className="topbar__context">
            <NetworkPill />
          </div>
          <div className="topbar__actions">
            <button className="text-button topbar__request" onClick={onCreateRequest}>
              <FilePlus2 size={16} /> Create request
            </button>
            <WalletButton />
          </div>
        </header>

        <main className="page-content">{children}</main>

        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.route}
                className={route === item.route ? 'is-active' : ''}
                onClick={() => go(item.route)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            )
          })}
          <button onClick={onSend} className="mobile-nav__send">
            <Send size={19} />
            <span>Settle</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
