import { describe, expect, it } from 'vitest'
import * as bitcoin from 'bitcoinjs-lib'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import {
  ATTACH,
  btcSignRequest,
  decodeOnSignedResult,
  diffConfig,
  encodeSignForArgs,
  evmSignRequest,
  listableAt,
  matchSignaturesToPayloads,
  minSignPrepaidGas,
  mpcSignArgs,
  onSignedGas,
  parseMpcSignature,
  recoverSecp256k1,
  signatureFromRecordView,
  signAttachDeposit,
  signAttachGas,
  signForArgs,
  signForCall,
  solSignRequest,
  TGAS,
  toBtcDerSignature,
  toEd25519Signature,
  toEvmSignature,
  toSecpCompact64,
  verifySecp256k1,
  type MpcSignature,
} from '../src/near'
import { bytesToBase64, hexToBytesStrict, toHex, utf8 } from '../src/bytes'
import { deriveSecp256k1 } from '../src/derive'

// spec §5.8 / kb/31: the real MPC response for the 48-byte Sepolia tx, payload bc65…c377, signer 0x532b…832d
const KB31_RESP = {
  scheme: 'Secp256k1',
  big_r: { affine_point: '02f6efe9455463c738e2bd553f14f638fcfbf8465a54eae1ffac915111aebb0f0c' },
  s: { scalar: '549e7285bfe162a32441fef9305b83cc2961071bf7a4bec83d2e99ae3cac87e1' },
  recovery_id: 1,
} as const
const KB31_PAYLOAD = hexToBytesStrict('bc657845d9165bf3555d8b8a9a5b830272d83b762c60ceab048355a87deac377')
const KB31_KEY = deriveSecp256k1('testnet', 'satchel-spk-chain-e9ea1a.testnet', 'satchel/1/evm')

describe('near: SignRequest JSON (spec §5.3)', () => {
  it('encodes the three variants exactly (externally tagged, snake_case, lowercase hex, no 0x)', () => {
    expect(evmSignRequest('0x02EE83AA')).toEqual({ evm: { unsigned_tx: '02ee83aa' } })
    expect(btcSignRequest([Uint8Array.of(1, 2)], '0x0A')).toEqual({ btc: { preimages: ['0102'], outputs: '0a' } })
    expect(solSignRequest(Uint8Array.of(0xab))).toEqual({ sol: { message: 'ab' } })
    expect(encodeSignForArgs(signForArgs('1', evmSignRequest('02ee')))).toBe('{"token_id":"1","request":{"evm":{"unsigned_tx":"02ee"}}}')
    expect(encodeSignForArgs(signForArgs('3', solSignRequest('ab'), 5n))).toBe('{"token_id":"3","request":{"sol":{"message":"ab"}},"mpc_deposit":"5"}')
    expect(() => signForArgs('01', evmSignRequest('02'))).toThrow(/non-canonical/)
  })

  it('the MPC request matches spec §5.8 exactly', () => {
    expect(JSON.stringify(mpcSignArgs('1', 'evm', { Ecdsa: toHex(KB31_PAYLOAD) }))).toBe(
      '{"request":{"path":"satchel/1/evm","payload_v2":{"Ecdsa":"bc657845d9165bf3555d8b8a9a5b830272d83b762c60ceab048355a87deac377"},"domain_id":0}}',
    )
    expect(mpcSignArgs('1', 'sol', { Eddsa: 'ab' }).request.domain_id).toBe(1)
    expect(mpcSignArgs('7', 'btc', { Ecdsa: '00' }).request.path).toBe('satchel/7/btc')
  })

  it('signForCall carries gas and deposit as decimal strings (n = number of BTC preimages)', () => {
    const c = signForCall('2', btcSignRequest(['aa', 'bb'], 'cc'))
    expect(c).toEqual({
      methodName: 'sign_for',
      args: { token_id: '2', request: { btc: { preimages: ['aa', 'bb'], outputs: 'cc' } } },
      gas: '100000000000000',
      deposit: '10000000000000000000000',
    })
  })
})

describe('near: gas and deposit formulas (spec §5.5)', () => {
  it('SIGN_ATTACH_GAS = min(300, 60 + 20n) Tgas: 1→80, 2→100, 4→140, 10→260', () => {
    expect([1, 2, 4, 10].map((n) => signAttachGas(n) / TGAS)).toEqual([80n, 100n, 140n, 260n])
  })
  it('MIN_SIGN_PREPAID = 30 + 18n: 1→48, 4→102, 10→210; and every attachment clears it', () => {
    expect([1, 4, 10].map((n) => minSignPrepaidGas(n) / TGAS)).toEqual([48n, 102n, 210n])
    for (let n = 1; n <= 10; n++) expect(signAttachGas(n) >= minSignPrepaidGas(n)).toBe(true)
  })
  it('ON_SIGNED_GAS = 10 + 2n; SIGN_ATTACH_DEPOSIT = 0.005 NEAR × n (+ n × a raised mpc_deposit)', () => {
    expect(onSignedGas(4) / TGAS).toBe(18n)
    expect(signAttachDeposit(1)).toBe(5n * 10n ** 21n)
    expect(signAttachDeposit(3)).toBe(15n * 10n ** 21n)
    expect(signAttachDeposit(2, 10n ** 22n)).toBe(10n * 10n ** 21n + 2n * 10n ** 22n)
    expect(() => signAttachDeposit(1, 10n ** 22n + 1n)).toThrow(/mpc_deposit/)
    expect(() => signAttachGas(11)).toThrow()
    expect(() => signAttachGas(0)).toThrow()
  })
  it('fixed attachments and the quiet period', () => {
    expect(ATTACH.mint).toEqual({ gas: 30n * TGAS, deposit: 2n * 10n ** 22n })
    expect(ATTACH.transfer.deposit).toBe(1n)
    expect(ATTACH.buyUsdc.gas).toBe(150n * TGAS)
    expect(listableAt(274_600_123)).toBe(274_600_373)
    expect(listableAt(0)).toBe(0)
  })
  it('diffConfig: the spec §5.14 config() example is consistent; any drift is reported', () => {
    const cfg = {
      version: '1.0.0',
      mpc_contract_id: 'v1.signer-prod.testnet',
      usdc_contract_id: '3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af',
      cooldown_blocks: 250,
      evm_chain_ids: [11155111, 84532, 421614, 11155420],
      erc20_tokens: [
        { chain_id: 11155111, token: '1c7d4b196cb0c7b01d743fbc6116a902379c7238' },
        { chain_id: 84532, token: '036cbd53842c5426634e7929541ec2318f3dcf7e' },
        { chain_id: 421614, token: '75faf114eafb1bdbe2f0316df893fd58ce46aa4d' },
        { chain_id: 11155420, token: '5fd84259d66cd46123540766be93dfe6d43130d7' },
      ],
      max_message_bytes: 1024,
      max_btc_inputs: 10,
      mpc_sign_gas_tgas: 15,
      on_signed_gas_tgas: { base: 10, per_request: 2 },
      min_sign_prepaid_tgas: { base: 30, per_request: 18 },
      max_mpc_deposit: '10000000000000000000000',
      storage_byte_cost: '10000000000000000000',
      base_uri: 'https://x/api/card/',
      next_token_id: 7,
      next_listing_id: 3,
    }
    expect(diffConfig(cfg)).toEqual([])
    expect(diffConfig({ ...cfg, cooldown_blocks: 210 })).toEqual(['cooldown_blocks: contract 210 ≠ client 250'])
    // a pre-C2/C3/C7 contract (dev1) is reported, field by field
    const { erc20_tokens: _t, max_message_bytes: _m, ...old } = { ...cfg, evm_chain_ids: [11155111] }
    expect(diffConfig(old).map((d) => d.split(':')[0])).toEqual(['evm_chain_ids', 'erc20_tokens', 'max_message_bytes'])
  })
})

describe('near: MPC response decoding (spec §5.8 signature byte rules)', () => {
  it('parses both schemes and rejects malformed responses', () => {
    expect(parseMpcSignature(KB31_RESP).scheme).toBe('Secp256k1')
    expect(parseMpcSignature({ scheme: 'Ed25519', signature: Array(64).fill(7) }).scheme).toBe('Ed25519')
    expect(() => parseMpcSignature({ ...KB31_RESP, recovery_id: 2 })).toThrow(/recovery_id/)
    expect(() => parseMpcSignature({ ...KB31_RESP, big_r: { affine_point: '04' + '00'.repeat(32) } })).toThrow(/affine_point/)
    expect(() => parseMpcSignature({ scheme: 'Ed25519', signature: Array(63).fill(0) })).toThrow(/64/)
    expect(() => parseMpcSignature({ scheme: 'Schnorr' })).toThrow(/scheme/)
    expect(() => parseMpcSignature(null)).toThrow()
  })

  it('EVM yParity = recovery_id, NOT the big_r prefix (the kb/31 sample: prefix 02 but recovery_id 1)', () => {
    const sig = toEvmSignature(KB31_RESP)
    expect(sig).toEqual({ r: '0xf6efe9455463c738e2bd553f14f638fcfbf8465a54eae1ffac915111aebb0f0c', s: '0x549e7285bfe162a32441fef9305b83cc2961071bf7a4bec83d2e99ae3cac87e1', yParity: 1 })
    // recovery with the real recovery_id gives the derived key; the big_r-prefix parity (0) would not
    expect(toHex(recoverSecp256k1(KB31_RESP, KB31_PAYLOAD))).toBe(toHex(KB31_KEY.compressed))
    expect(toHex(recoverSecp256k1({ ...KB31_RESP, recovery_id: 0 }, KB31_PAYLOAD))).not.toBe(toHex(KB31_KEY.compressed))
    expect(verifySecp256k1(KB31_RESP, KB31_PAYLOAD, KB31_KEY.compressed)).toBe(true)
  })

  it('low-S is asserted, never silently fixed', () => {
    const n = secp256k1.Point.Fn.ORDER
    const high = (n - BigInt(`0x${KB31_RESP.s.scalar}`)).toString(16).padStart(64, '0')
    expect(() => toSecpCompact64({ ...KB31_RESP, s: { scalar: high } })).toThrow(/high-S/)
  })

  it('BTC: strict DER ‖ SIGHASH_ALL, byte-identical to bitcoinjs script.signature.encode', () => {
    const der = toBtcDerSignature(KB31_RESP)
    const ref = bitcoin.script.signature.encode(toSecpCompact64(KB31_RESP), bitcoin.Transaction.SIGHASH_ALL)
    expect(toHex(der)).toBe(toHex(Uint8Array.from(ref)))
    expect(der[der.length - 1]).toBe(1)
  })

  it('Ed25519: the 64 bytes as-is', () => {
    const sig = Array.from({ length: 64 }, (_, i) => i)
    expect(Array.from(toEd25519Signature({ scheme: 'Ed25519', signature: sig }))).toEqual(sig)
    expect(() => toEd25519Signature(KB31_RESP)).toThrow()
  })

  it('on_signed SuccessValue: base64 JSON array, null where a request failed, unparsable entries flagged', () => {
    const value = bytesToBase64(utf8(JSON.stringify([KB31_RESP, null, { garbage: true }])))
    const { signatures, invalid } = decodeOnSignedResult(value)
    expect(signatures[0]).toMatchObject({ scheme: 'Secp256k1', recovery_id: 1 })
    expect(signatures[1]).toBeNull()
    expect(signatures[2]).toBeNull()
    expect(invalid).toEqual([2])
    expect(() => decodeOnSignedResult(bytesToBase64(utf8('{"a":1}')))).toThrow(/array/)
  })

  it('view signatures ({r, s, recovery_id} / {signature}) map back to the same helpers', () => {
    const v = signatureFromRecordView({ r: KB31_RESP.big_r.affine_point.slice(2), s: KB31_RESP.s.scalar, recovery_id: 1 })
    expect(toEvmSignature(v)).toEqual(toEvmSignature(KB31_RESP))
    const e = signatureFromRecordView({ signature: 'ab'.repeat(64) })
    expect(toEd25519Signature(e).length).toBe(64)
  })

  it('receipts-scan fallback assigns each signature to the payload it verifies', () => {
    const other: MpcSignature = { ...KB31_RESP, s: { scalar: '1'.padStart(64, '0') } }
    const p2 = new Uint8Array(32).fill(9)
    expect(matchSignaturesToPayloads([other, KB31_RESP], [p2, KB31_PAYLOAD], KB31_KEY.compressed)).toEqual([null, KB31_RESP])
  })
})
