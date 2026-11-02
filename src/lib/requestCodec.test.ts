import { describe, expect, it } from 'vitest'
import type { SettlementRequest } from '../types'
import { decodeRequest, encodeRequest, validateAmount, validatePartyId } from './requestCodec'

const party = `alice::1220${'a'.repeat(64)}`

describe('payment request codec', () => {
  it('round-trips unicode request data', () => {
    const request: SettlementRequest = {
      version: 1,
      id: 'request-1',
      party,
      assetId: 'native',
      amount: '12.5',
      memo: 'Invoice № 42 · тест',
      expiresAt: null,
      createdAt: 1_700_000_000_000,
    }
    expect(decodeRequest(encodeRequest(request))).toEqual(request)
  })

  it('rejects protocol parties and incomplete IDs', () => {
    expect(validatePartyId(`r-vault::1220${'b'.repeat(64)}`)).toBeTruthy()
    expect(validatePartyId('alice')).toBeTruthy()
    expect(validatePartyId(party)).toBeNull()
  })

  it('enforces the native Gateway quantum', () => {
    expect(validateAmount('0.1234567890', 18, true)).toBeNull()
    expect(validateAmount('0.12345678901', 18, true)).toBeTruthy()
  })
})
