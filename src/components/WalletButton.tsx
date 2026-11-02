import { Check, ChevronDown, Copy, ExternalLink, LogOut, WalletCards } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '../context/ToastContext'
import { useWallet } from '../context/WalletContext'
import { ZENITH_NETWORK } from '../lib/constants'
import { copyText, formatBalance, friendlyError, shortenAddress } from '../lib/format'

export function WalletButton() {
  const wallet = useWallet()
  const { notify } = useToast()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const hue = useMemo(() => {
    if (!wallet.account) return 90
    return Number.parseInt(wallet.account.slice(2, 8), 16) % 360
  }, [wallet.account])

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [open])

  const connect = async () => {
    try {
      await wallet.connect()
      notify('Wallet connected to Zenith.', 'success')
    } catch (error) {
      notify(friendlyError(error), 'error')
    }
  }

  if (!wallet.account) {
    return (
      <button className="wallet-connect" onClick={() => void connect()} disabled={wallet.connecting}>
        <WalletCards size={17} />
        <span>{wallet.connecting ? 'Connecting…' : 'Connect wallet'}</span>
      </button>
    )
  }

  if (!wallet.correctNetwork) {
    return (
      <button
        className="wallet-connect wallet-connect--warning"
        onClick={() => void wallet.switchToZenith().catch((error) => notify(friendlyError(error), 'error'))}
      >
        Switch network
      </button>
    )
  }

  const copyAddress = async () => {
    await copyText(wallet.account ?? '')
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1_500)
  }

  return (
    <div className="wallet-menu" ref={menuRef}>
      <button className="wallet-account" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span
          className="wallet-account__avatar"
          style={{ '--wallet-hue': hue } as React.CSSProperties}
          aria-hidden="true"
        />
        <span className="wallet-account__details">
          <strong>{shortenAddress(wallet.account)}</strong>
          <small>{formatBalance(wallet.balance, 3)} ZTH</small>
        </span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="wallet-dropdown">
          <div className="wallet-dropdown__heading">
            <span>Connected wallet</span>
            <strong>{shortenAddress(wallet.account, 9, 7)}</strong>
          </div>
          <button onClick={() => void copyAddress()}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Copy address'}
          </button>
          <a
            href={`${ZENITH_NETWORK.explorerUrl}/address/${wallet.account}`}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={16} /> View in explorer
          </a>
          <button
            className="wallet-dropdown__disconnect"
            onClick={() => {
              wallet.disconnect()
              setOpen(false)
            }}
          >
            <LogOut size={16} /> Disconnect app
          </button>
        </div>
      )}
    </div>
  )
}
