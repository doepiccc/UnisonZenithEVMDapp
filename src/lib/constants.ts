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

export const ZENITH_CANTON_NETWORK = {
  name: 'Zenith Canton Testnet',
  cantonVersion: '3.6.1',
  damlSdkVersion: '3.6.0',
  synchronizerUrl: 'https://synchronizer.testnet.zenith.network:443',
  synchronizerId: 'devnet::1220f065e594bd15767f61b6ba49da0c1310ba000821b0f0fbb67c1cfe80dbf9acf2',
  physicalSynchronizerId: 'devnet::1220f065e594bd15767f61b6ba49da0c1310ba000821b0f0fbb67c1cfe80dbf9acf2::36-0',
  bundleEmail: 'partners@zenith.network',
  onboardingDocsUrl: 'https://docs.zenith.network/zenith-testnet#interacting-with-zenith-evm-from-canton',
  walletGatewayDocsUrl: 'https://github.com/canton-network/wallet/blob/main/docs/wallet-gateway/quickstart.mdx',
} as const

export const ZENITH_REQUIRED_DARS = [
  {
    id: 'gateway',
    fileName: 'zenith-gateway-parties-0.1.0.dar',
    packageName: 'zenith-gateway-parties',
    packageId: '6401e22e4e341c644a4594698b95b39785a9ca5729a8b03018283c4bddd0e62e',
    sha256: 'fec5820b54fb387552c31c83eddd83dc25ed993e2acbbbf4832b426f6d68196a',
    description: 'wZTH and Gateway-issued Canton token packages',
  },
  {
    id: 'dev',
    fileName: 'zenith-dev-cc-0.1.1.dar',
    packageName: 'zenith-dev-cc',
    packageId: '646a945887d8584d4c28991b14c92cdd63292b1c2041541e35f1bbe0304c31e8',
    sha256: '69755ab1f1274a0ed967536948a5f0c9df8aee80c7e642265b2ef42c795d1712',
    description: 'DevUSD, DevCC and standing-acceptance packages',
  },
] as const

export const FALLBACK_DEV_ACCEPTANCE_RULES = {
  contractId: '00f7905567b52cd41061c980899bd2b0ff6864e633f591fd127b4c85828abacb4cca121220d45ef99eafafd99db532c31e88eecc0f6c60129dee595c3c3325310f59fbcf25',
  createdEventBlob: 'CgMyLjESoAMKRQD3kFVntSzUEGHJgImb0rD/aGTmM/WR/RJ7TIWCirrLTMoSEiDUXvmer6/ZnbUywx6I7swPbGASne5ZXDwzJTEPWfvPJRINemVuaXRoLWRldi1jYxplCkA2NDZhOTQ1ODg3ZDg1ODRkNGMyODk5MWIxNGM5MmNkZDYzMjkyYjFjMjA0MTU0MWUzNWYxYmJlMDMwNGMzMWU4EgZaZW5pdGgSBURldkNjGhJEZXZBY2NlcHRhbmNlUnVsZXMiWWpXClUKUzpRZGV2Y2MtYWRtaW46OjEyMjBiNjRhZWVhOGFiZTIwNzI4YTZmNjBkNjZkNmE1NzIxMmNhOWJhMmY4ZDNiN2E0NWJmOGRkNGRlNjkzMmVlZmYyKlFkZXZjYy1hZG1pbjo6MTIyMGI2NGFlZWE4YWJlMjA3MjhhNmY2MGQ2NmQ2YTU3MjEyY2E5YmEyZjhkM2I3YTQ1YmY4ZGQ0ZGU2OTMyZWVmZjI5pq63lzFfBgBCKgomCiQIARIglykL86s84UUq/MVN8GW3t1ZeIMQVKG+utmIVNMkyc14QHg==',
  synchronizerId: ZENITH_CANTON_NETWORK.synchronizerId,
  templateId: '646a945887d8584d4c28991b14c92cdd63292b1c2041541e35f1bbe0304c31e8:Zenith.DevCc:DevAcceptanceRules',
} as const

export const ZENITH_WALLET_CHAIN = {
  chainId: ZENITH_NETWORK.chainIdHex,
  chainName: ZENITH_NETWORK.name,
  nativeCurrency: ZENITH_NETWORK.currency,
  rpcUrls: [ZENITH_NETWORK.rpcUrl],
  blockExplorerUrls: [ZENITH_NETWORK.explorerUrl],
} as const

export const FALLBACK_GATEWAY_ADDRESS = '0x00000000000000000000000000000000000a7e00'

export const FALLBACK_CHAIN_INFO: GatewayChainInfo = {
  deploymentId: '0x64c9a5594fdc9ca81066357699ac446bee6936b5a7f52c88238ddfbb82ac0979',
  evmChainId: ZENITH_NETWORK.chainId,
  gatewayAddress: FALLBACK_GATEWAY_ADDRESS,
  genesisHash: '',
  native: {
    mode: 'zth',
    instrument: {
      admin: 'r-635d45b53c561ec7a462ab7a0511468ae5df3443eb2add2b161255bb95b612ad::12204a88976da02f8d43c894dbbbf1d606d82c06d7f73504ec2aa030e88530667974',
      id: 'erc20:50d0eea5a51b1d262b295f9978ed2e2e02a5a5a3',
    },
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
  cantonRecipients: 'unison.canton-recipients.v1',
  activeCantonRecipient: 'unison.canton-active.v1',
  cantonLedgerUrl: 'unison.canton-ledger-url.v1',
  cantonWalletGatewayUrl: 'unison.canton-wallet-gateway-url.v1',
} as const
