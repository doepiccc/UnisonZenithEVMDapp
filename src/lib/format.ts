export function shortenAddress(value: string, start = 6, end = 4): string {
  if (!value || value.length <= start + end + 3) return value
  return `${value.slice(0, start)}…${value.slice(-end)}`
}

export function shortenParty(value: string): string {
  const [hint, namespace] = value.split('::')
  if (!namespace) return shortenAddress(value, 12, 8)
  return `${hint}::${namespace.slice(0, 7)}…${namespace.slice(-5)}`
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: value >= 100_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatDate(timestamp: number, includeTime = true): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(new Date(timestamp))
}

export function formatBalance(value: string | null, maximumFractionDigits = 4): string {
  if (value === null) return '—'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return value
  if (numeric > 0 && numeric < 0.0001) return '<0.0001'
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(numeric)
}

export function copyText(value: string): Promise<void> {
  return navigator.clipboard.writeText(value)
}

export function friendlyError(error: unknown): string {
  const candidate = error as {
    shortMessage?: string
    reason?: string
    message?: string
    info?: { error?: { message?: string } }
  }
  const raw =
    candidate?.shortMessage ||
    candidate?.reason ||
    candidate?.info?.error?.message ||
    candidate?.message ||
    'Something went wrong'

  if (/user rejected|user denied|ACTION_REJECTED/i.test(raw)) return 'The wallet request was cancelled.'
  if (/method (?:not found|not supported)|unsupported method/i.test(raw)) {
    return 'This wallet cannot add Zenith automatically. Add Zenith EVM Testnet from the wallet network settings.'
  }
  if (/insufficient funds/i.test(raw)) return 'Not enough ZTH to cover the amount and network fee.'
  if (/no standing acceptance/i.test(raw)) return 'This Canton party has not preapproved this asset.'
  if (/network changed/i.test(raw)) return 'The wallet network changed. Please try again.'
  return raw.length > 180 ? `${raw.slice(0, 177)}…` : raw
}
