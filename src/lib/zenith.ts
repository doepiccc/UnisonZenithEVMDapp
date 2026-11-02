import { Contract, JsonRpcProvider, formatUnits } from 'ethers'
import type {
  GatewayChainInfo,
  InboxResolution,
  NetworkSnapshot,
  ZenithAsset,
} from '../types'
import {
  ERC20_ABI,
  FALLBACK_ASSETS,
  FALLBACK_CHAIN_INFO,
  FALLBACK_GATEWAY_ADDRESS,
  GATEWAY_ABI,
  ZENITH_NETWORK,
} from './constants'

export const publicProvider = new JsonRpcProvider(
  ZENITH_NETWORK.rpcUrl,
  { chainId: ZENITH_NETWORK.chainId, name: 'zenith-testnet' },
  { staticNetwork: true },
)

export async function fetchChainInfo(): Promise<GatewayChainInfo> {
  // Gateway's REST API does not currently expose browser CORS headers.
  // The address below is published in Zenith's testnet documentation.
  return FALLBACK_CHAIN_INFO
}

export async function fetchNetworkSnapshot(): Promise<NetworkSnapshot> {
  const started = performance.now()
  try {
    const rpcResponse = await fetch(ZENITH_NETWORK.rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([
        { jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] },
        { jsonrpc: '2.0', id: 2, method: 'eth_gasPrice', params: [] },
        { jsonrpc: '2.0', id: 3, method: 'web3_clientVersion', params: [] },
        { jsonrpc: '2.0', id: 4, method: 'eth_chainId', params: [] },
        { jsonrpc: '2.0', id: 5, method: 'eth_getCode', params: [FALLBACK_GATEWAY_ADDRESS, 'latest'] },
      ]),
    }).then(async (response) => {
      if (!response.ok) throw new Error('RPC unavailable')
      return response.json() as Promise<Array<{ id: number; result?: string }>>
    })

    const byId = new Map(rpcResponse.map((item) => [item.id, item.result]))
    const blockHex = byId.get(1)
    const gasHex = byId.get(2)
    const reportedChainId = byId.get(4) ? Number.parseInt(byId.get(4)!, 16) : null
    const gatewayCode = byId.get(5)
    const gatewayReady = reportedChainId === ZENITH_NETWORK.chainId && Boolean(gatewayCode && gatewayCode !== '0x')

    return {
      status: gatewayReady ? 'ready' : 'degraded',
      blockNumber: blockHex ? Number.parseInt(blockHex, 16) : null,
      gasPriceGwei: gasHex ? Number(formatUnits(BigInt(gasHex), 'gwei')).toFixed(3) : null,
      clientVersion: byId.get(3) ?? null,
      latencyMs: Math.round(performance.now() - started),
      gatewayReady,
      synchronizer: gatewayReady ? 'connected' : 'unknown',
      producer: blockHex ? 'up' : 'unknown',
      updatedAt: Date.now(),
    }
  } catch {
    return {
      status: 'offline',
      blockNumber: null,
      gasPriceGwei: null,
      clientVersion: null,
      latencyMs: null,
      gatewayReady: false,
      synchronizer: 'unknown',
      producer: 'unknown',
      updatedAt: Date.now(),
    }
  }
}

export async function fetchSupportedAssets(): Promise<ZenithAsset[]> {
  // Registry snapshot from the current public testnet deployment. Contract
  // calls and balances are still read live from RPC; no centralized proxy is used.
  return FALLBACK_ASSETS
}

export async function resolveInbox(party: string, gatewayAddress: string): Promise<InboxResolution> {
  const gateway = new Contract(gatewayAddress, GATEWAY_ABI, publicProvider)
  const address = (await gateway.inboxOf(party)) as string
  const code = await publicProvider.getCode(address)
  return { address, deployed: code !== '0x' }
}

export async function getAssetBalance(asset: ZenithAsset, account: string): Promise<string> {
  if (asset.kind === 'native') {
    return formatUnits(await publicProvider.getBalance(account), asset.decimals)
  }
  if (!asset.address) return '0'
  const token = new Contract(asset.address, ERC20_ABI, publicProvider)
  return formatUnits((await token.balanceOf(account)) as bigint, asset.decimals)
}

export async function fetchPendingState(hash: string): Promise<string | null> {
  void hash
  return null
}
