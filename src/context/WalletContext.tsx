import {
  BrowserProvider,
  formatEther,
  type Eip1193Provider,
  type JsonRpcSigner,
} from 'ethers'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ZENITH_NETWORK } from '../lib/constants'
import { publicProvider } from '../lib/zenith'

interface WalletContextValue {
  available: boolean
  account: string | null
  chainId: number | null
  balance: string | null
  connecting: boolean
  correctNetwork: boolean
  connect: () => Promise<void>
  disconnect: () => void
  switchToZenith: () => Promise<void>
  getSigner: () => Promise<JsonRpcSigner>
  refreshBalance: () => Promise<void>
}

const WalletContext = createContext<WalletContextValue | null>(null)

type EventfulProvider = Eip1193Provider & {
  on?: (event: string, listener: (...args: unknown[]) => void) => void
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void
}

function injectedProvider(): EventfulProvider | null {
  return (window.ethereum as EventfulProvider | undefined) ?? null
}

function parseChainId(value: unknown): number | null {
  return typeof value === 'string' ? Number.parseInt(value, 16) : null
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [balance, setBalance] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const available = typeof window !== 'undefined' && Boolean(window.ethereum)

  const refreshBalance = useCallback(async () => {
    if (!account) {
      setBalance(null)
      return
    }
    try {
      setBalance(formatEther(await publicProvider.getBalance(account)))
    } catch {
      setBalance(null)
    }
  }, [account])

  const switchToZenith = useCallback(async () => {
    const ethereum = injectedProvider()
    if (!ethereum) throw new Error('No browser wallet was found.')
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ZENITH_NETWORK.chainIdHex }],
      })
    } catch (error) {
      const code = (error as { code?: number }).code
      if (code !== 4902) throw error
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: ZENITH_NETWORK.chainIdHex,
            chainName: ZENITH_NETWORK.name,
            nativeCurrency: ZENITH_NETWORK.currency,
            rpcUrls: [ZENITH_NETWORK.rpcUrl],
            blockExplorerUrls: [ZENITH_NETWORK.explorerUrl],
          },
        ],
      })
    }
    setChainId(ZENITH_NETWORK.chainId)
  }, [])

  const connect = useCallback(async () => {
    const ethereum = injectedProvider()
    if (!ethereum) throw new Error('Install an EVM browser wallet to continue.')
    setConnecting(true)
    try {
      const accounts = (await ethereum.request({ method: 'eth_requestAccounts' })) as string[]
      if (!accounts[0]) throw new Error('No wallet account is available.')
      setAccount(accounts[0])
      const currentChain = parseChainId(await ethereum.request({ method: 'eth_chainId' }))
      setChainId(currentChain)
      if (currentChain !== ZENITH_NETWORK.chainId) await switchToZenith()
    } finally {
      setConnecting(false)
    }
  }, [switchToZenith])

  const disconnect = useCallback(() => {
    setAccount(null)
    setBalance(null)
  }, [])

  const getSigner = useCallback(async (): Promise<JsonRpcSigner> => {
    const ethereum = injectedProvider()
    if (!ethereum) throw new Error('No browser wallet was found.')
    if (!account) await connect()
    const currentChain = parseChainId(await ethereum.request({ method: 'eth_chainId' }))
    if (currentChain !== ZENITH_NETWORK.chainId) await switchToZenith()
    const provider = new BrowserProvider(ethereum)
    return provider.getSigner()
  }, [account, connect, switchToZenith])

  useEffect(() => {
    const ethereum = injectedProvider()
    if (!ethereum) return

    void Promise.all([
      ethereum.request({ method: 'eth_accounts' }),
      ethereum.request({ method: 'eth_chainId' }),
    ]).then(([accountsValue, chainValue]) => {
      const accounts = accountsValue as string[]
      setAccount(accounts[0] ?? null)
      setChainId(parseChainId(chainValue))
    })

    const onAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[]
      setAccount(accounts[0] ?? null)
    }
    const onChainChanged = (...args: unknown[]) => setChainId(parseChainId(args[0]))
    ethereum.on?.('accountsChanged', onAccountsChanged)
    ethereum.on?.('chainChanged', onChainChanged)
    return () => {
      ethereum.removeListener?.('accountsChanged', onAccountsChanged)
      ethereum.removeListener?.('chainChanged', onChainChanged)
    }
  }, [])

  useEffect(() => {
    if (!account) return
    let active = true
    void publicProvider
      .getBalance(account)
      .then((value) => {
        if (active) setBalance(formatEther(value))
      })
      .catch(() => {
        if (active) setBalance(null)
      })
    return () => {
      active = false
    }
  }, [account])

  const value = useMemo<WalletContextValue>(
    () => ({
      available,
      account,
      chainId,
      balance,
      connecting,
      correctNetwork: chainId === ZENITH_NETWORK.chainId,
      connect,
      disconnect,
      switchToZenith,
      getSigner,
      refreshBalance,
    }),
    [
      available,
      account,
      chainId,
      balance,
      connecting,
      connect,
      disconnect,
      switchToZenith,
      getSigner,
      refreshBalance,
    ],
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext)
  if (!context) throw new Error('useWallet must be used inside WalletProvider')
  return context
}
