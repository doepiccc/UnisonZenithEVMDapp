export type AssetKind = 'native' | 'erc20'

export interface ZenithAsset {
  id: string
  kind: AssetKind
  symbol: string
  name: string
  decimals: number
  address?: string
  origin: 'evm' | 'canton'
  color: string
  requiresAcceptance?: boolean
  description: string
}

export interface GatewayChainInfo {
  deploymentId: string
  evmChainId: number
  gatewayAddress: string
  genesisHash: string
  native: {
    mode: string
    instrument: { admin: string; id: string }
  }
}

export interface NetworkSnapshot {
  status: 'loading' | 'ready' | 'degraded' | 'offline'
  blockNumber: number | null
  gasPriceGwei: string | null
  clientVersion: string | null
  latencyMs: number | null
  gatewayReady: boolean
  synchronizer: string
  producer: string
  updatedAt: number
}

export interface SettlementRequest {
  version: 1
  id: string
  party: string
  assetId: string
  amount: string
  memo: string
  expiresAt: number | null
  createdAt: number
}

export type SettlementStatus = 'submitted' | 'finalized' | 'failed'

export interface SettlementRecord {
  id: string
  hash: string
  party: string
  inbox: string
  assetId: string
  assetSymbol: string
  amount: string
  memo: string
  status: SettlementStatus
  createdAt: number
  blockNumber?: number
  gatewayState?: string
}

export interface InboxResolution {
  address: string
  deployed: boolean
}

export type AppRoute = 'overview' | 'requests' | 'activity' | 'pay'
