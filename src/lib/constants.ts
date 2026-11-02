import type { GatewayChainInfo, ZenithAsset } from '../types'

export const ZENITH_NETWORK = {
  name: 'Zenith EVM Testnet',
  shortName: 'Zenith Testnet',
  chainId: 936485,
  chainIdHex: '0xe4a25',
  currency: { name: 'Zenith token', symbol: 'ZTH', decimals: 18 },
  rpcUrl: 'https://rpc.testnet.zenith.network/',
  explorerUrl: 'https://explorer.testnet.zenith.network',
  faucetUrl: 'https://explorer.testnet.zenith.network/faucet',
  docsUrl: 'https://docs.zenith.network/zenith-testnet',
  gatewayApiUrl: 'https://gateway.testnet.zenith.network',
} as const

export const FALLBACK_GATEWAY_ADDRESS = '0x00000000000000000000000000000000000a7e00'

export const FALLBACK_CHAIN_INFO: GatewayChainInfo = {
  deploymentId: '',
  evmChainId: ZENITH_NETWORK.chainId,
  gatewayAddress: FALLBACK_GATEWAY_ADDRESS,
  genesisHash: '',
  native: {
    mode: 'zth',
    instrument: { admin: '', id: '' },
  },
}

export const NATIVE_ASSET: ZenithAsset = {
  id: 'native',
  kind: 'native',
  symbol: 'ZTH',
  name: 'Zenith token',
  decimals: 18,
  origin: 'evm',
  color: '#d9ff63',
  description: 'Native gas token · arrives on Canton as wZTH',
}

export const FALLBACK_ASSETS: ZenithAsset[] = [
  NATIVE_ASSET,
  {
    id: '0xd238579f5a5c184fe423d68dcf245c2e86ca60e9',
    kind: 'erc20',
    symbol: 'DORIG',
    name: 'Dev Original',
    decimals: 18,
    address: '0xd238579f5a5c184fe423d68dcf245c2e86ca60e9',
    origin: 'evm',
    color: '#b9d9ff',
    description: 'Registered EVM test token · no recipient preapproval',
  },
  {
    id: '0x4feb549aa9608fa13c2e9366df7dd38b267e0d46',
    kind: 'erc20',
    symbol: 'DUSD',
    name: 'Dev USD',
    decimals: 10,
    address: '0x4feb549aa9608fa13c2e9366df7dd38b267e0d46',
    origin: 'canton',
    color: '#ffc9ab',
    requiresAcceptance: true,
    description: 'Canton-origin asset · recipient preapproval required',
  },
  {
    id: '0x285fb55cf094a2a9e80c26c0d726f1c9b86b86f2',
    kind: 'erc20',
    symbol: 'wCC',
    name: 'Wrapped CC',
    decimals: 10,
    address: '0x285fb55cf094a2a9e80c26c0d726f1c9b86b86f2',
    origin: 'canton',
    color: '#d7c6ff',
    requiresAcceptance: true,
    description: 'Canton-origin asset · recipient preapproval required',
  },
]

export const GATEWAY_ABI = ['function inboxOf(string party) view returns (address)'] as const

export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
] as const

export const STORAGE_KEYS = {
  requests: 'unison.requests.v1',
  activity: 'unison.activity.v1',
} as const
