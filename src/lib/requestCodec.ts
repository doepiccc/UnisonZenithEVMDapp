import type { SettlementRequest } from '../types'

const PARTY_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}::1220[a-fA-F0-9]{64}$/
const AMOUNT_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/

export function validatePartyId(party: string): string | null {
  const clean = party.trim()
  if (!clean) return 'Enter the recipient’s full Canton party ID.'
  if (!PARTY_ID_PATTERN.test(clean)) return 'Use the full party ID: name::1220…'
  const hint = clean.split('::')[0].toLowerCase()
  if (hint === 'zeo' || hint.startsWith('m-') || hint.startsWith('r-') || hint.startsWith('b-')) {
    return 'Zenith protocol parties cannot receive inbox transfers.'
  }
  return null
}

export function validateAmount(amount: string, decimals: number, native = false): string | null {
  const clean = amount.trim()
  if (!clean) return 'Enter an amount.'
  if (!AMOUNT_PATTERN.test(clean) || Number(clean) <= 0) return 'Enter an amount greater than zero.'
  const fraction = clean.split('.')[1]?.length ?? 0
  const limit = native ? 10 : decimals
  if (fraction > limit) {
    return native
      ? 'ZTH transfers to Canton support up to 10 decimal places.'
      : `${limit} decimal places maximum for this asset.`
  }
  return null
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

export function encodeRequest(request: SettlementRequest): string {
  const payload = {
    v: request.version,
    i: request.id,
    p: request.party,
    a: request.assetId,
    n: request.amount,
    m: request.memo,
    e: request.expiresAt,
    c: request.createdAt,
  }
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
}

export function decodeRequest(encoded: string): SettlementRequest {
  if (!encoded || encoded.length > 4096) throw new Error('This payment link is not valid.')
  const parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encoded))) as Record<string, unknown>
  if (parsed.v !== 1 || typeof parsed.i !== 'string' || typeof parsed.p !== 'string') {
    throw new Error('This payment link uses an unsupported format.')
  }
  if (validatePartyId(parsed.p)) throw new Error('The payment link contains an invalid Canton party ID.')
  if (typeof parsed.a !== 'string' || typeof parsed.n !== 'string' || !AMOUNT_PATTERN.test(parsed.n)) {
    throw new Error('The payment link contains an invalid asset or amount.')
  }
  if (typeof parsed.m !== 'string' || parsed.m.length > 120) throw new Error('The payment memo is not valid.')
  if (parsed.e !== null && typeof parsed.e !== 'number') throw new Error('The payment expiry is not valid.')
  if (typeof parsed.c !== 'number') throw new Error('The payment date is not valid.')

  return {
    version: 1,
    id: parsed.i,
    party: parsed.p,
    assetId: parsed.a.toLowerCase(),
    amount: parsed.n,
    memo: parsed.m,
    expiresAt: parsed.e as number | null,
    createdAt: parsed.c,
  }
}

export function buildPaymentUrl(request: SettlementRequest): string {
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#/pay/${encodeRequest(request)}`
}

export function isRequestExpired(request: SettlementRequest): boolean {
  return request.expiresAt !== null && request.expiresAt < Date.now()
}
