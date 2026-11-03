import type { Eip1193Provider } from 'ethers'
import { ZENITH_NETWORK, ZENITH_WALLET_CHAIN } from './constants'

const NESTED_ERROR_KEYS = ['cause', 'data', 'error', 'info', 'originalError'] as const

interface WalletErrorDetails {
  codes: number[]
  messages: string[]
}

function collectErrorDetails(
  value: unknown,
  details: WalletErrorDetails,
  seen: Set<unknown>,
  depth = 0,
): void {
  if (!value || typeof value !== 'object' || seen.has(value) || depth > 5) return
  seen.add(value)

  const candidate = value as Record<string, unknown>
  const numericCode = typeof candidate.code === 'string' ? Number(candidate.code) : candidate.code
  if (typeof numericCode === 'number' && Number.isInteger(numericCode)) details.codes.push(numericCode)
  if (typeof candidate.message === 'string') details.messages.push(candidate.message)

  for (const key of NESTED_ERROR_KEYS) {
    collectErrorDetails(candidate[key], details, seen, depth + 1)
  }
}

function walletErrorDetails(error: unknown): WalletErrorDetails {
  const details: WalletErrorDetails = { codes: [], messages: [] }
  collectErrorDetails(error, details, new Set())
  return details
}

function isUnknownChainError(error: unknown): boolean {
  const details = walletErrorDetails(error)
  if (details.codes.includes(4902)) return true
  return details.messages.some((message) =>
    /unknown (?:chain|network)|unrecognized (?:chain|network)|chain (?:has not been added|is not added|does not exist)/i.test(message),
  )
}

export function parseWalletChainId(value: unknown): number | null {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? value : null
  if (typeof value !== 'string' || !value.trim()) return null

  const normalized = value.trim()
  const radix = /^0x/i.test(normalized) ? 16 : 10
  const parsed = Number.parseInt(normalized, radix)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

export async function getWalletChainId(provider: Eip1193Provider): Promise<number> {
  const chainId = parseWalletChainId(await provider.request({ method: 'eth_chainId' }))
  if (chainId === null) throw new Error('The wallet returned an invalid network chain ID.')
  return chainId
}

async function switchWalletChain(provider: Eip1193Provider): Promise<void> {
  await provider.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: ZENITH_NETWORK.chainIdHex }],
  })
}

/** Adds Zenith when necessary, switches to it, and verifies the active wallet network. */
export async function ensureZenithNetwork(provider: Eip1193Provider): Promise<number> {
  if ((await getWalletChainId(provider)) === ZENITH_NETWORK.chainId) return ZENITH_NETWORK.chainId

  try {
    await switchWalletChain(provider)
  } catch (error) {
    if (!isUnknownChainError(error)) throw error
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [ZENITH_WALLET_CHAIN],
    })
  }

  let activeChainId = await getWalletChainId(provider)
  // EIP-3085 only adds a chain; it does not require the wallet to select it.
  if (activeChainId !== ZENITH_NETWORK.chainId) {
    await switchWalletChain(provider)
    activeChainId = await getWalletChainId(provider)
  }

  if (activeChainId !== ZENITH_NETWORK.chainId) {
    throw new Error(`Switch your wallet to ${ZENITH_NETWORK.name} (chain ID ${ZENITH_NETWORK.chainId}) to continue.`)
  }
  return activeChainId
}
