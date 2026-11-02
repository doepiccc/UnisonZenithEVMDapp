import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { FALLBACK_ASSETS, FALLBACK_CHAIN_INFO } from '../lib/constants'
import { fetchChainInfo, fetchNetworkSnapshot, fetchSupportedAssets } from '../lib/zenith'
import type { GatewayChainInfo, NetworkSnapshot, ZenithAsset } from '../types'

interface ZenithContextValue {
  network: NetworkSnapshot
  chainInfo: GatewayChainInfo
  assets: ZenithAsset[]
  refresh: () => Promise<void>
}

const INITIAL_NETWORK: NetworkSnapshot = {
  status: 'loading',
  blockNumber: null,
  gasPriceGwei: null,
  clientVersion: null,
  latencyMs: null,
  gatewayReady: false,
  synchronizer: 'checking',
  producer: 'checking',
  updatedAt: 0,
}

const ZenithContext = createContext<ZenithContextValue | null>(null)

export function ZenithProvider({ children }: { children: ReactNode }) {
  const [network, setNetwork] = useState<NetworkSnapshot>(INITIAL_NETWORK)
  const [chainInfo, setChainInfo] = useState<GatewayChainInfo>(FALLBACK_CHAIN_INFO)
  const [assets, setAssets] = useState<ZenithAsset[]>(FALLBACK_ASSETS)

  const refresh = useCallback(async () => {
    setNetwork(await fetchNetworkSnapshot())
  }, [])

  useEffect(() => {
    let active = true
    void Promise.all([fetchChainInfo(), fetchSupportedAssets(), fetchNetworkSnapshot()]).then(
      ([nextChain, nextAssets, nextNetwork]) => {
        if (!active) return
        setChainInfo(nextChain)
        setAssets(nextAssets)
        setNetwork(nextNetwork)
      },
    )
    const interval = window.setInterval(() => void refresh(), 15_000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [refresh])

  const value = useMemo(
    () => ({ network, chainInfo, assets, refresh }),
    [network, chainInfo, assets, refresh],
  )

  return <ZenithContext.Provider value={value}>{children}</ZenithContext.Provider>
}

export function useZenith(): ZenithContextValue {
  const context = useContext(ZenithContext)
  if (!context) throw new Error('useZenith must be used inside ZenithProvider')
  return context
}
