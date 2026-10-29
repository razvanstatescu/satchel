import { describe, expect, it } from 'vitest'
import { publicKeyToAddress } from 'viem/accounts'
import * as bitcoin from 'bitcoinjs-lib'
import {
  btcCompressedPubkeyHex,
  btcP2wpkhAddress,
  buildAddressIndex,
  deriveSatchelAddresses,
  deriveSecp256k1,
  derivationTweak,
  evmAddress,
  lookupAddress,
  nearKeyString,
  solAddress,
  tokenPath,
} from '../src/derive'
import { to0x, toHex } from '../src/bytes'

// kb/11 §Derivation cross-check (8/8 agreed across chainsig.js, the live view and @noble) and kb/10 §Key derivation table.
const KB11 = [
  ['satchel-spk-chain-e9ea1a.testnet', 'satchel/1/evm', '0x532b9aAEA7803aDCaC5FB8Fe53166147CEE4832d'],
  ['satchel-spk-chain-e9ea1a.testnet', 'satchel/1/btc', 'tb1q00qngh4vre45nwpaa9eljwuxy0zpljeg7jefsc'],
  ['satchel-spk-chain-e9ea1a.testnet', 'satchel/1/sol', '6P6GgkFNQKcvCtsMncRF1VtFA6Q79LkcFyvaQz5NXPiA'],
  ['satchel-spk-chain-e9ea1a.testnet', 'satchel/42/evm', '0x61739f33AdbB7F76c1b5B222E4119085257528BE'],
  ['satchel.example.testnet', 'satchel/1/evm', '0x53f9e93e9cb431122872c3Ee96848e97BFf51C2A'],
  ['satchel.example.testnet', 'satchel/1/btc', 'tb1qaanveslhw9mdcke8a3l0aqv5t9glfapwjfy8sd'],
  ['satchel.example.testnet', 'satchel/1/sol', 'DvZuiQhGH32dTN5v8zRZRJJ4e5H4okwq6NjpfvoYbqGB'],
  ['satchel.example.testnet', 'satchel/42/evm', '0x3C443ac72C2Ebe80b48AA6101ccF3c1E8b0aB6d1'],
  // kb/32 §Addresses, kb/30 §2 live vectors, kb/30 §Contract fan-out key
  ['satchel-spk-chain-e9ea1a.testnet', 'satchel/2/sol', '8C3CxUxgsZL6AU44dEmtJXLKvKf8rroNGvcP8H9wJN1r'],
  ['satchel-spk-btc-e9ea1a.testnet', 'satchel/1/btc', 'tb1qzplwrxu3p9xy95twx3tm2fveql80fvcjgc0ze7'],
  ['satchel-spk-btc-e9ea1a.testnet', 'satchel/2/btc', 'tb1qakdsc8u04sr8ujluyjfczud9mvx8ulx06ddkl7'],
  ['fanout.satchel-spk-btc-e9ea1a.testnet', 'satchel/1/btc', 'tb1qd6c87hqfmfltxhra55k3w8ngcdr2dsk89ptr9a'],
  ['spike.satchel-spk-mpc-e9ea1a.testnet', 'satchel/1/evm', '0x6FaFd4339aB28EB793b01C52A0f4d69123586E00'],
] as const

function derive(pred: string, path: string): string {
  if (path.endsWith('/evm')) return evmAddress('testnet', pred, path)
  if (path.endsWith('/btc')) return btcP2wpkhAddress('testnet', pred, path)
  return solAddress('testnet', pred, path)
}

describe('derive: KB vectors', () => {
  it.each(KB11)('%s %s → %s', (pred, path, want) => {
    const got = derive(pred, path)
    if (path.endsWith('/evm')) expect(got.toLowerCase()).toBe(want.toLowerCase())
    else expect(got).toBe(want)
  })

  it('EVM addresses are EIP-55 checksummed exactly like viem', () => {
    expect(evmAddress('testnet', 'satchel.example.testnet', 'satchel/1/evm')).toBe('0x53f9e93e9cb431122872c3Ee96848e97BFf51C2A')
    const k = deriveSecp256k1('testnet', 'satchel.example.testnet', 'satchel/42/evm')
    expect(evmAddress('testnet', 'satchel.example.testnet', 'satchel/42/evm')).toBe(publicKeyToAddress(to0x(k.uncompressed)))
  })

  it('compressed keys match kb/10 and kb/30', () => {
    expect(btcCompressedPubkeyHex('testnet', 'satchel.example.testnet', 'satchel/1/evm')).toBe(
      '021d206d588827f6e9e2950336ff5c33c0b81141083a43b9e403e1dccd53c2ead5',
    )
    expect(btcCompressedPubkeyHex('testnet', 'satchel.example.testnet', 'satchel/1/btc')).toBe(
      '037ab0d767a8b45ab43b55ca0cf5a4c09b47a9ecc8b4c581b60b0ab56b83e66076',
    )
    expect(btcCompressedPubkeyHex('testnet', 'satchel-spk-btc-e9ea1a.testnet', 'satchel/1/btc')).toBe(
      '021e857e1164787e91347a2f7e91b88b16d00a064963a50988798d7185e8bace2d',
    )
    expect(btcCompressedPubkeyHex('testnet', 'fanout.satchel-spk-btc-e9ea1a.testnet', 'satchel/1/btc')).toBe(
      '023e36ee8dbf9314fd73cfb4f204dc1f38249ef20d5ff72395eff009586e441df6',
    )
  })

  it('tweak prefixes match kb/10', () => {
    expect(toHex(derivationTweak('satchel.example.testnet', 'satchel/1/evm')).slice(0, 8)).toBe('fe2f7150')
    expect(toHex(derivationTweak('satchel.example.testnet', 'satchel/1/btc')).slice(-8)).toBe('392ab695')
    expect(toHex(derivationTweak('satchel.example.testnet', 'satchel/1/sol')).slice(0, 8)).toBe('766b6cb6')
  })

  it('NEAR key string matches the live derived_public_key answer recorded in kb/10', () => {
    const k = deriveSecp256k1('testnet', 'satchel.example.testnet', 'satchel/1/evm')
    expect(nearKeyString('secp256k1', k.uncompressed)).toBe(
      'secp256k1:amydARHfgNa4viJzVnexf4dkK39zV6Zb58Lwpy4RvLCkYCo2Bat4fVGWeiNmPdtm51CpjS9KjP7ixenSztKGDoZ',
    )
    expect(nearKeyString('secp256k1', k.compressed)).toBe(nearKeyString('secp256k1', k.uncompressed))
  })

  it('BTC address equals bitcoinjs-lib p2wpkh(testnet)', () => {
    const a = deriveSatchelAddresses('testnet', 'satchel.example.testnet', '1')
    const pay = bitcoin.payments.p2wpkh({ pubkey: Uint8Array.from(Buffer.from(a.btcPubkey, 'hex')), network: bitcoin.networks.testnet })
    expect(pay.address).toBe(a.btc)
  })

  it('mainnet roots give different addresses (bc1 hrp)', () => {
    const t = deriveSatchelAddresses('testnet', 'satchel.example.testnet', '1')
    const m = deriveSatchelAddresses('mainnet', 'satchel.example.testnet', '1')
    expect(m.btc.startsWith('bc1q')).toBe(true)
    expect(m.evm).not.toBe(t.evm)
    expect(m.sol).not.toBe(t.sol)
  })
})

describe('derive: paths and index', () => {
  it('builds canonical paths only', () => {
    expect(tokenPath('7', 'evm')).toBe('satchel/7/evm')
    expect(() => tokenPath('07', 'evm')).toThrow(/non-canonical/)
    expect(() => tokenPath('0', 'btc')).toThrow(/non-canonical/)
    expect(() => tokenPath('1 ', 'sol')).toThrow(/non-canonical/)
  })

  it('deriveSatchelAddresses bundles the three KB addresses', () => {
    const a = deriveSatchelAddresses('testnet', 'satchel.example.testnet', '1')
    expect(a.evm).toBe('0x53f9e93e9cb431122872c3Ee96848e97BFf51C2A')
    expect(a.btc).toBe('tb1qaanveslhw9mdcke8a3l0aqv5t9glfapwjfy8sd')
    expect(a.sol).toBe('DvZuiQhGH32dTN5v8zRZRJJ4e5H4okwq6NjpfvoYbqGB')
    expect(a.paths).toEqual({ btc: 'satchel/1/btc', evm: 'satchel/1/evm', sol: 'satchel/1/sol' })
  })

  it('address → token index finds every chain, case-insensitively for EVM/bech32', () => {
    const idx = buildAddressIndex('testnet', 'satchel.example.testnet', 42)
    expect(idx.size).toBe(42 * 3)
    expect(lookupAddress(idx, '0x3c443ac72c2ebe80b48aa6101ccf3c1e8b0ab6d1')).toEqual({ tokenId: '42', chain: 'evm' })
    expect(lookupAddress(idx, 'TB1QAANVESLHW9MDCKE8A3L0AQV5T9GLFAPWJFY8SD')).toEqual({ tokenId: '1', chain: 'btc' })
    expect(lookupAddress(idx, 'DvZuiQhGH32dTN5v8zRZRJJ4e5H4okwq6NjpfvoYbqGB')).toEqual({ tokenId: '1', chain: 'sol' })
    expect(lookupAddress(idx, 'dvzuiqhgh32dtn5v8zrzrjj4e5h4okwq6njpfvoybqgb')).toBeUndefined()
    expect(lookupAddress(idx, 'tb1q00qngh4vre45nwpaa9eljwuxy0zpljeg7jefsc')).toBeUndefined()
  })
})
