import { describe, expect, it } from 'vitest'
import { ZENITH_CANTON_NETWORK } from './constants'
import {
  hasZenithSynchronizer,
  normalizeCantonWalletGatewayUrl,
  validateLedgerUserId,
  validatePartyHint,
} from './canton'

describe('Canton setup helpers', () => {
  it('normalizes a Wallet Gateway root URL to its CIP-103 dApp endpoint', () => {
    expect(normalizeCantonWalletGatewayUrl('http://localhost:3030/')).toBe(
      'http://localhost:3030/api/v0/dapp',
    )
    expect(normalizeCantonWalletGatewayUrl('https://wallet.example/api/v0/dapp/')).toBe(
      'https://wallet.example/api/v0/dapp',
    )
    expect(normalizeCantonWalletGatewayUrl('/api/canton-wallet/')).toBe('/api/canton-wallet')
  })

  it('rejects unsafe Wallet Gateway protocols', () => {
    expect(() => normalizeCantonWalletGatewayUrl('file:///wallet')).toThrow(/http or https/i)
  })

  it('only accepts the published Zenith synchronizer', () => {
    expect(hasZenithSynchronizer({
      connectedSynchronizers: [{ synchronizerAlias: 'zenith', synchronizerId: ZENITH_CANTON_NETWORK.synchronizerId }],
    })).toBe(true)
    expect(hasZenithSynchronizer({
      connectedSynchronizers: [{ synchronizerAlias: 'other', synchronizerId: 'global-domain::1220other' }],
    })).toBe(false)
  })

  it('validates party hints and Ledger API users before wallet creation', () => {
    expect(validatePartyHint('treasury-1')).toBeNull()
    expect(validatePartyHint('bad party')).toBeTruthy()
    expect(validateLedgerUserId('unison-app')).toBeNull()
  })
})
