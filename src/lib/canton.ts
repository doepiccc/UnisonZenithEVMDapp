import {
  FALLBACK_DEV_ACCEPTANCE_RULES,
  ZENITH_CANTON_NETWORK,
  ZENITH_NETWORK,
  ZENITH_REQUIRED_DARS,
} from './constants'

export interface CantonApiConfig {
  baseUrl: string
  token?: string
}

export interface ConnectedSynchronizer {
  synchronizerAlias: string
  synchronizerId: string
  permission?: string
}

export interface CantonNodeSnapshot {
  participantId: string
  ledgerVersion: string
  connectedSynchronizers: ConnectedSynchronizer[]
  zenithConnected: boolean
  compatibleVersion: boolean
  vettedPackages: Record<string, boolean>
}

export interface ProvisionedCantonParty {
  partyId: string
  ledgerUserId: string
  userReady: boolean
  userError?: string
}

export interface AcceptanceRules {
  contractId: string
  createdEventBlob: string
  synchronizerId: string
  templateId: string
}

interface CantonErrorPayload {
  code?: string
  cause?: string
  message?: string
}

export class CantonApiError extends Error {
  status: number | null
  code?: string

  constructor(message: string, status: number | null = null, code?: string) {
    super(message)
    this.name = 'CantonApiError'
    this.status = status
    this.code = code
  }
}

export function defaultCantonLedgerUrl(): string {
  return import.meta.env.DEV ? '/api/canton' : 'http://127.0.0.1:7575'
}

export function normalizeCantonApiUrl(value: string): string {
  const clean = value.trim().replace(/\/+$/, '')
  if (!clean) throw new CantonApiError('Enter the Canton JSON Ledger API URL.')
  if (clean.startsWith('/')) return clean
  let parsed: URL
  try {
    parsed = new URL(clean)
  } catch {
    throw new CantonApiError('Use a complete Ledger API URL, for example http://127.0.0.1:7575.')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new CantonApiError('The Ledger API URL must use http or https.')
  }
  return parsed.toString().replace(/\/+$/, '')
}

export function normalizeCantonWalletGatewayUrl(value: string): string {
  const clean = value.trim().replace(/\/+$/, '')
  if (!clean) throw new CantonApiError('Enter a CIP-103 Wallet Gateway URL.')
  if (clean.startsWith('/')) return clean

  let parsed: URL
  try {
    parsed = new URL(clean)
  } catch {
    throw new CantonApiError('Use a complete Wallet Gateway URL, for example http://localhost:3030/api/v0/dapp.')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new CantonApiError('The Wallet Gateway URL must use http or https.')
  }
  if (parsed.pathname === '/' || !parsed.pathname) parsed.pathname = '/api/v0/dapp'
  return parsed.toString().replace(/\/+$/, '')
}

function requestUrl(config: CantonApiConfig, path: string): string {
  return `${normalizeCantonApiUrl(config.baseUrl)}${path.startsWith('/') ? path : `/${path}`}`
}

async function readError(response: Response): Promise<CantonApiError> {
  const text = await response.text()
  let payload: CantonErrorPayload
  try {
    payload = JSON.parse(text) as CantonErrorPayload
  } catch {
    payload = { message: text }
  }
  const detail = payload.cause || payload.message || payload.code || response.statusText
  return new CantonApiError(`Canton API ${response.status}: ${detail || 'request failed'}`, response.status, payload.code)
}

export async function cantonRequest<T>(
  config: CantonApiConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  if (config.token?.trim()) headers.set('authorization', `Bearer ${config.token.trim()}`)
  try {
    const response = await fetch(requestUrl(config, path), { ...init, headers })
    if (!response.ok) throw await readError(response)
    if (response.status === 204) return {} as T
    const text = await response.text()
    return (text ? JSON.parse(text) : {}) as T
  } catch (error) {
    if (error instanceof CantonApiError) throw error
    throw new CantonApiError(
      `Cannot reach the Canton Ledger API. Check the URL, node status and browser CORS/reverse-proxy settings. ${error instanceof Error ? error.message : ''}`.trim(),
    )
  }
}

function jsonRequest(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export function hasZenithSynchronizer(value: unknown): boolean {
  const synchronizers = (value as { connectedSynchronizers?: ConnectedSynchronizer[] } | null)?.connectedSynchronizers
  return Boolean(synchronizers?.some((item) => item.synchronizerId === ZENITH_CANTON_NETWORK.synchronizerId))
}

export async function inspectCantonNode(config: CantonApiConfig): Promise<CantonNodeSnapshot> {
  const [versionResponse, participantResponse, synchronizerResponse] = await Promise.all([
    cantonRequest<{ version?: string }>(config, '/v2/version'),
    cantonRequest<{ participantId: string }>(config, '/v2/parties/participant-id'),
    cantonRequest<{ connectedSynchronizers?: ConnectedSynchronizer[] }>(config, '/v2/state/connected-synchronizers'),
  ])
  const connectedSynchronizers = synchronizerResponse.connectedSynchronizers ?? []
  const zenithConnected = hasZenithSynchronizer(synchronizerResponse)
  const packageIds = ZENITH_REQUIRED_DARS.map((item) => item.packageId)
  let vettedPackages: Record<string, boolean> = Object.fromEntries(packageIds.map((id) => [id, false]))

  if (zenithConnected) {
    const vetting = await cantonRequest<{
      vettedPackages?: Array<{ packages?: Array<{ packageId: string }> }>
    }>(config, '/v2/package-vetting/list', jsonRequest({
      packageMetadataFilter: { packageIds },
      topologyStateFilter: {
        participantIds: [participantResponse.participantId],
        synchronizerIds: [ZENITH_CANTON_NETWORK.synchronizerId],
      },
      pageSize: 10,
    }))
    const vettedIds = new Set(vetting.vettedPackages?.flatMap((group) => group.packages ?? []).map((item) => item.packageId))
    vettedPackages = Object.fromEntries(packageIds.map((id) => [id, vettedIds.has(id)]))
  }

  const ledgerVersion = versionResponse.version ?? 'unknown'
  return {
    participantId: participantResponse.participantId,
    ledgerVersion,
    connectedSynchronizers,
    zenithConnected,
    compatibleVersion: ledgerVersion.includes(ZENITH_CANTON_NETWORK.cantonVersion),
    vettedPackages,
  }
}

export async function sha256File(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function uploadZenithDar(
  config: CantonApiConfig,
  file: File,
  definition: (typeof ZENITH_REQUIRED_DARS)[number],
): Promise<void> {
  const hash = await sha256File(file)
  if (hash !== definition.sha256) {
    throw new CantonApiError(
      `${definition.fileName} failed SHA-256 verification. Expected ${definition.sha256}, received ${hash}.`,
    )
  }
  await cantonRequest<Record<string, unknown>>(
    config,
    `/v2/dars?vetAllPackages=true&synchronizerId=${encodeURIComponent(ZENITH_CANTON_NETWORK.synchronizerId)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: file,
    },
  )
}

const PARTY_HINT_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
const USER_ID_PATTERN = /^[A-Za-z0-9@^$.!`\-#+'~_|:()]{1,128}$/

export function validatePartyHint(value: string): string | null {
  const clean = value.trim()
  if (!clean) return 'Enter a short party name.'
  if (!PARTY_HINT_PATTERN.test(clean)) return 'Use 1–64 letters, numbers, underscores or hyphens.'
  return null
}

export function validateLedgerUserId(value: string): string | null {
  const clean = value.trim()
  if (!clean) return 'Enter a Ledger API user ID.'
  if (!USER_ID_PATTERN.test(clean)) return 'The Ledger API user ID contains unsupported characters.'
  return null
}

function partyRights(partyId: string) {
  return [
    { kind: { CanActAs: { value: { party: partyId } } } },
    { kind: { CanReadAs: { value: { party: partyId } } } },
  ]
}

export async function provisionCantonParty(
  config: CantonApiConfig,
  partyHint: string,
  ledgerUserId: string,
): Promise<ProvisionedCantonParty> {
  const hintError = validatePartyHint(partyHint)
  const userError = validateLedgerUserId(ledgerUserId)
  if (hintError || userError) throw new CantonApiError(hintError ?? userError ?? 'Invalid provisioning details.')

  const allocated = await cantonRequest<{ partyDetails?: { party?: string } }>(
    config,
    '/v2/parties',
    jsonRequest({
      partyIdHint: partyHint.trim(),
      identityProviderId: '',
      synchronizerId: ZENITH_CANTON_NETWORK.synchronizerId,
    }),
  )
  const partyId = allocated.partyDetails?.party
  if (!partyId) throw new CantonApiError('The participant allocated a party but returned no Party ID.')

  try {
    await cantonRequest<Record<string, unknown>>(config, '/v2/users', jsonRequest({
      user: {
        id: ledgerUserId.trim(),
        primaryParty: partyId,
        isDeactivated: false,
        identityProviderId: '',
      },
      rights: partyRights(partyId),
    }))
    return { partyId, ledgerUserId: ledgerUserId.trim(), userReady: true }
  } catch (error) {
    return {
      partyId,
      ledgerUserId: ledgerUserId.trim(),
      userReady: false,
      userError: error instanceof Error ? error.message : 'The Ledger API user could not be created.',
    }
  }
}

export async function grantPartyRights(
  config: CantonApiConfig,
  ledgerUserId: string,
  partyId: string,
): Promise<void> {
  await cantonRequest<Record<string, unknown>>(
    config,
    `/v2/users/${encodeURIComponent(ledgerUserId)}/rights`,
    jsonRequest({ userId: ledgerUserId, identityProviderId: '', rights: partyRights(partyId) }),
  )
}

export async function getDevAcceptanceRules(): Promise<AcceptanceRules> {
  const configuredBase = (import.meta.env.VITE_ZENITH_GATEWAY_API as string | undefined)?.replace(/\/+$/, '')
  const liveUrl = configuredBase
    ? `${configuredBase}/v1/registries`
    : import.meta.env.DEV
      ? '/api/zenith-gateway/v1/registries'
      : null

  if (liveUrl) {
    try {
      const response = await fetch(liveUrl)
      if (response.ok) {
        const payload = await response.json() as {
          registries?: Array<{ kind?: string; acceptanceRules?: AcceptanceRules }>
        }
        const rules = payload.registries?.find((item) => item.kind === 'dev')?.acceptanceRules
        if (rules?.synchronizerId === ZENITH_CANTON_NETWORK.synchronizerId) return rules
      }
    } catch {
      // GitHub Pages has no server-side proxy. The deployment-pinned snapshot below
      // is the same fallback strategy used for the Gateway address and asset registry.
    }
  }
  return FALLBACK_DEV_ACCEPTANCE_RULES
}

export function buildStandingAcceptanceParams(partyId: string, rules: AcceptanceRules) {
  if (rules.synchronizerId !== ZENITH_CANTON_NETWORK.synchronizerId) {
    throw new CantonApiError('The standing-acceptance contract belongs to a different Canton synchronizer.')
  }
  return {
    commands: [
      {
        ExerciseCommand: {
          templateId: rules.templateId,
          contractId: rules.contractId,
          choice: 'DevAcceptanceRules_Accept',
          choiceArgument: { receiver: partyId },
        },
      },
    ],
    actAs: [partyId],
    readAs: [] as string[],
    disclosedContracts: [
      {
        templateId: rules.templateId,
        contractId: rules.contractId,
        createdEventBlob: rules.createdEventBlob,
        synchronizerId: rules.synchronizerId,
      },
    ],
    synchronizerId: rules.synchronizerId,
  }
}

export async function createStandingAcceptance(
  config: CantonApiConfig,
  partyId: string,
  ledgerUserId: string,
): Promise<string> {
  const rules = await getDevAcceptanceRules()
  const params = buildStandingAcceptanceParams(partyId, rules)
  const commandId = `unison-accept-${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`
  const response = await cantonRequest<{ transaction?: { updateId?: string } }>(
    config,
    '/v2/commands/submit-and-wait-for-transaction',
    jsonRequest({
      commands: {
        commands: params.commands,
        commandId,
        userId: ledgerUserId,
        actAs: params.actAs,
        readAs: params.readAs,
        disclosedContracts: params.disclosedContracts,
      },
      transactionFormat: {
        eventFormat: {
          filtersByParty: {
            [partyId]: {
              cumulative: [
                { identifierFilter: { WildcardFilter: { value: { includeCreatedEventBlob: false } } } },
              ],
            },
          },
          verbose: true,
        },
        transactionShape: 'TRANSACTION_SHAPE_LEDGER_EFFECTS',
      },
    }),
  )
  return response.transaction?.updateId ?? commandId
}

export function zenithGatewayRegistriesUrl(): string {
  return `${ZENITH_NETWORK.gatewayApiUrl}/v1/registries`
}
