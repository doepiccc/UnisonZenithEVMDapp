import type { Eip1193Provider } from 'ethers'
import { describe, expect, it } from 'vitest'
import { ZENITH_NETWORK } from './constants'
import { ensureZenithNetwork, parseWalletChainId } from './walletNetwork'

describe('wallet network setup', () => {
  it('parses hexadecimal and decimal chain IDs', () => {
    expect(parseWalletChainId(ZENITH_NETWORK.chainIdHex)).toBe(ZENITH_NETWORK.chainId)
    expect(parseWalletChainId(String(ZENITH_NETWORK.chainId))).toBe(ZENITH_NETWORK.chainId)
    expect(parseWalletChainId('not-a-chain')).toBeNull()
  })

  it('does nothing when Zenith is already selected', async () => {
    const calls: string[] = []
    const provider: Eip1193Provider = {
      request: async ({ method }) => {
        calls.push(method)
        return ZENITH_NETWORK.chainIdHex
      },
    }

    await expect(ensureZenithNetwork(provider)).resolves.toBe(ZENITH_NETWORK.chainId)
    expect(calls).toEqual(['eth_chainId'])
  })

  it('switches to an already registered Zenith network', async () => {
    let chainId = '0x1'
    const calls: string[] = []
    const provider: Eip1193Provider = {
      request: async ({ method }) => {
        calls.push(method)
        if (method === 'wallet_switchEthereumChain') chainId = ZENITH_NETWORK.chainIdHex
        return method === 'eth_chainId' ? chainId : null
      },
    }

    await ensureZenithNetwork(provider)
    expect(calls).toEqual(['eth_chainId', 'wallet_switchEthereumChain', 'eth_chainId'])
  })

  it('adds an unknown network and then explicitly switches when needed', async () => {
    let chainId = '0x1'
    let registered = false
    const calls: string[] = []
    const provider: Eip1193Provider = {
      request: async ({ method }) => {
        calls.push(method)
        if (method === 'eth_chainId') return chainId
        if (method === 'wallet_addEthereumChain') {
          registered = true
          return null
        }
        if (method === 'wallet_switchEthereumChain') {
          if (!registered) throw { code: -32603, data: { originalError: { code: 4902 } } }
          chainId = ZENITH_NETWORK.chainIdHex
        }
        return null
      },
    }

    await ensureZenithNetwork(provider)
    expect(calls).toEqual([
      'eth_chainId',
      'wallet_switchEthereumChain',
      'wallet_addEthereumChain',
      'eth_chainId',
      'wallet_switchEthereumChain',
      'eth_chainId',
    ])
  })

  it('does not turn a rejected switch into a second wallet prompt', async () => {
    const rejection = { code: 4001, message: 'User rejected the request.' }
    const calls: string[] = []
    const provider: Eip1193Provider = {
      request: async ({ method }) => {
        calls.push(method)
        if (method === 'eth_chainId') return '0x1'
        throw rejection
      },
    }

    await expect(ensureZenithNetwork(provider)).rejects.toBe(rejection)
    expect(calls).toEqual(['eth_chainId', 'wallet_switchEthereumChain'])
  })
})
