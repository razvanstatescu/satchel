/**
 * C1 (history digest), C2 (USDC transfers), C3 (four EVM testnets) and C7 (message signing): the TS side of
 * docs/specs/C1-C2-C3-C7.md. The shared vectors (vectors/{evm,msg}.json) also run in policy.test.ts.
 */
import { describe, expect, it } from 'vitest'
import { keccak_256 } from '@noble/hashes/sha3.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { ed25519 } from '@noble/curves/ed25519.js'
import { base58 } from '@scure/base'
import { encodeFunctionData, erc20Abi, hashMessage, parseTransaction, recoverTransactionAddress, serializeTransaction, type Hex, type PublicClient } from 'viem'
import { privateKeyToAddress } from 'viem/accounts'
import history from '../../../vectors/history.json' with { type: 'json' }
import { concatBytes, hexToBytesStrict, toHex, utf8 } from '../src/bytes'
import {
  attachEvmSignature,
  buildErc20TransferTx,
  buildUnsignedEvmTx,
  erc20BalanceOf,
  erc20TransferData,
  estimateTransferGas,
  EVM_CHAIN_ID_LIST,
  EVM_NETWORKS,
  evmNetwork,
  parseUnsignedEvmTx,
  prepareErc20Send,
  prepareEvmSend,
  serializeUnsignedEvmTx,
  verifyEvmMessageSignature,
} from '../src/chains/evm'
import { verifySolOffchainSignature } from '../src/chains/sol'
import { checkCleanHistory, historyDigest, historyEntry, historyHeader, type CheckDeps, type CheckInput, type SigRecordView } from '../src/clean-history'
import {
  ERC20_TOKENS,
  EVM_CHAIN_IDS,
  evmMessageSignRequest,
  messageSignAttachDeposit,
  signAttachDepositFor,
  signForCall,
  signRequestChain,
  solMessageSignRequest,
  type SignRequest,
} from '../src/near'
import {
  classifyEvm,
  classifySignRequest,
  contextMaxNonce,
  eip191Bytes,
  EVM_SUPPORTED_CHAIN_IDS,
  EVM_TOKEN_ALLOWLIST,
  maxSignedEvmNonce,
  parseErc20TransferData,
  signContextFromRecords,
  solOffchainMessageBytes,
} from '../src/policy'
import { evmRecord, fakeEvm, fakeSol, snapshot } from './helpers'

const BASE = 84532
const ARB = 421614
const OP = 11155420
const RCPT = '0x2222222222222222222222222222222222222222' as const
const usdc = (c: number) => EVM_NETWORKS[c as 84532].usdc.address

const native = (chainId: number, nonce: number) =>
  serializeTransaction({ type: 'eip1559', chainId, nonce, to: RCPT, value: 1n, gas: 21_000n, maxFeePerGas: 2n, maxPriorityFeePerGas: 1n }).slice(2)
const usdcTx = (chainId: number, nonce: number, amount = 1_500_000n) =>
  serializeTransaction({
    type: 'eip1559',
    chainId,
    nonce,
    to: usdc(chainId),
    value: 0n,
    gas: 65_000n,
    maxFeePerGas: 2n,
    maxPriorityFeePerGas: 1n,
    data: encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [RCPT, amount] }),
  }).slice(2)

// ── C1 ────────────────────────────────────────────────────────────────────────────────────────

describe('C1: historyDigest reproduces vectors/history.json', () => {
  type HV = { name: string; contract_id: string; token_id: string; records: SigRecordView[]; expect: { sig_count: number; digest_hex: string; header_hex: string; entries_hex: string[] } }
  it.each((history.vectors as unknown as HV[]).map((v) => [v.name, v] as const))('%s', (_n, v) => {
    expect(toHex(historyHeader(v.contract_id, v.token_id, v.records.length))).toBe(v.expect.header_hex)
    expect(v.records.map((r) => toHex(historyEntry(r)))).toEqual(v.expect.entries_hex)
    expect(historyDigest(v.contract_id, v.token_id, v.records)).toBe(v.expect.digest_hex)
    expect(v.records.length).toBe(v.expect.sig_count)
  })

  it('the digest ignores status/signature, binds token and contract, and needs every record from seq 0', () => {
    const vs = history.vectors as unknown as HV[]
    const d = (n: string) => vs.find((v) => v.name === n)!.expect.digest_hex
    expect(d('every_kind')).toBe(d('every_kind_resolved'))
    expect(new Set([d('every_kind'), d('every_kind_other_token'), d('every_kind_rc_contract')]).size).toBe(3)
    const every = vs.find((v) => v.name === 'every_kind')!
    // order of the input doesn't matter (sorted by seq); gaps and duplicates throw
    expect(historyDigest(every.contract_id, every.token_id, [...every.records].reverse())).toBe(d('every_kind'))
    expect(() => historyDigest(every.contract_id, every.token_id, every.records.slice(1))).toThrow(/contiguous/)
    expect(() => historyDigest(every.contract_id, every.token_id, [...every.records, every.records[0]!])).toThrow(/contiguous/)
    // empty history = SHA-256(H)
    expect(historyDigest('c.testnet', '1', [])).toBe(toHex(sha256(historyHeader('c.testnet', '1', 0))))
  })
})

// ── C2 / C3: policy ───────────────────────────────────────────────────────────────────────────

describe('C2/C3 policy: chains, tokens, per-chain nonce context', () => {
  it('one token per chain, and the three tables agree (policy, network registry, config constants)', () => {
    expect(EVM_SUPPORTED_CHAIN_IDS.map(Number)).toEqual([...EVM_CHAIN_IDS])
    expect([...EVM_CHAIN_ID_LIST]).toEqual([...EVM_CHAIN_IDS])
    for (const t of ERC20_TOKENS) {
      expect(EVM_TOKEN_ALLOWLIST[String(t.chain_id)]).toBe(`0x${t.token}`)
      expect(EVM_NETWORKS[t.chain_id].usdc.address.toLowerCase()).toBe(`0x${t.token}`)
      expect(EVM_NETWORKS[t.chain_id].usdc.decimals).toBe(6)
    }
  })

  it('parseErc20TransferData accepts only the canonical 68-byte transfer', () => {
    const d = hexToBytesStrict(erc20TransferData(RCPT, 7n))
    expect(parseErc20TransferData(d)).toEqual({ to: RCPT, amount: 7n })
    const dirty = Uint8Array.from(d)
    dirty[5] = 1
    expect(parseErc20TransferData(dirty)).toBeNull()
    const wide = Uint8Array.from(d)
    wide[40] = 1
    expect(parseErc20TransferData(wide)).toBeNull()
    expect(parseErc20TransferData(d.subarray(0, 67))).toBeNull()
    expect(parseErc20TransferData(hexToBytesStrict(encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [RCPT, 1n] })))).toBeNull()
  })

  it('USDC transfers classify with token, recipient and amount; the wrong token, value or calldata is refused', () => {
    for (const c of EVM_CHAIN_IDS) {
      const r = classifyEvm(usdcTx(c, 0))
      expect(r.ok && r.fields.erc20).toEqual({ token: usdc(c).toLowerCase(), to: RCPT, amount: 1_500_000n })
    }
    const wrongToken = serializeTransaction({ type: 'eip1559', chainId: BASE, nonce: 0, to: usdc(11155111), value: 0n, gas: 1n, maxFeePerGas: 1n, maxPriorityFeePerGas: 1n, data: erc20TransferData(RCPT, 1n) })
    expect(classifyEvm(wrongToken)).toMatchObject({ ok: false, error: 'ERR_EVM_TOKEN' })
    const withValue = serializeTransaction({ type: 'eip1559', chainId: BASE, nonce: 0, to: usdc(BASE), value: 1n, gas: 1n, maxFeePerGas: 1n, maxPriorityFeePerGas: 1n, data: erc20TransferData(RCPT, 1n) })
    expect(classifyEvm(withValue)).toMatchObject({ ok: false, error: 'ERR_EVM_VALUE' })
    expect(classifyEvm(native(8453, 0))).toMatchObject({ ok: false, error: 'ERR_EVM_CHAIN_ID' })
  })

  it('the nonce-gap context is per chain (signContextFromRecords), and the legacy single max still works', () => {
    const recs = [evmRecord(0, native(11155111, 5)), evmRecord(1, usdcTx(BASE, 1)), evmRecord(2, native(ARB, 0))]
    expect(maxSignedEvmNonce(recs)).toBe(5n) // default Sepolia
    expect(maxSignedEvmNonce(recs, BASE)).toBe(1n)
    expect(maxSignedEvmNonce(recs, OP)).toBeNull()
    const ctx = signContextFromRecords(recs)
    expect(ctx.evmMaxSignedNonceByChain).toEqual({ '11155111': 5n, '84532': 1n, '421614': 0n, '11155420': null })
    const req = (tx: string): SignRequest => ({ evm: { unsigned_tx: tx } })
    expect(classifySignRequest(req(native(BASE, 2)), ctx).ok).toBe(true)
    expect(classifySignRequest(req(native(BASE, 3)), ctx)).toMatchObject({ ok: false, error: 'ERR_EVM_NONCE_GAP' })
    expect(classifySignRequest(req(native(OP, 2)), ctx)).toMatchObject({ ok: false, error: 'ERR_EVM_NONCE_GAP' })
    expect(classifySignRequest(req(native(11155111, 6)), ctx).ok).toBe(true)
    // without byChain, evmMaxSignedNonce applies to the request's chain (the vectors' `state` convention)
    expect(contextMaxNonce({ evmMaxSignedNonce: 4n }, BigInt(BASE))).toBe(4n)
    expect(contextMaxNonce({ evmMaxSignedNonce: 4n, evmMaxSignedNonceByChain: {} }, BigInt(BASE))).toBeNull()
    // messages never count as EVM nonces
    const msgRec = { detail: { evm_message: { message: '68' } } }
    expect(maxSignedEvmNonce([msgRec])).toBeNull()
  })
})

// ── C2 / C3: chains/evm ───────────────────────────────────────────────────────────────────────

/** A minimal viem client stub: only the calls the builders make. */
function stubClient(o: { nonce?: number; balance?: bigint; usdc?: bigint; estimate?: bigint | 'fail'; l1?: bigint; calls?: string[] }): PublicClient {
  const calls = o.calls ?? []
  return {
    chain: undefined,
    getTransactionCount: async () => o.nonce ?? 0,
    estimateFeesPerGas: async () => ({ maxFeePerGas: 10n, maxPriorityFeePerGas: 1n }),
    getBalance: async () => o.balance ?? 10n ** 18n,
    estimateGas: async () => {
      if (o.estimate === 'fail') throw new Error('execution reverted')
      return o.estimate ?? 50_000n
    },
    getCode: async () => '0x',
    call: async ({ to, data }: { to: string; data: Hex }) => {
      calls.push(`${to.toLowerCase()}:${data.slice(0, 10)}`)
      if (data.startsWith('0x70a08231')) return { data: `0x${(o.usdc ?? 0n).toString(16).padStart(64, '0')}` }
      if (data.startsWith('0x49948e0e')) return { data: `0x${(o.l1 ?? 0n).toString(16).padStart(64, '0')}` }
      throw new Error(`unexpected call ${data.slice(0, 10)}`)
    },
  } as unknown as PublicClient
}

describe('C2/C3 chains/evm: registry, builders, gas, signatures', () => {
  it('every chain has ≥ 2 keyless https RPCs (never sepolia.drpc.org), an explorer and the matching viem chain', () => {
    for (const id of EVM_CHAIN_ID_LIST) {
      const n = evmNetwork(id)
      expect(n.rpcs.length, n.name).toBeGreaterThanOrEqual(2)
      expect(new Set(n.rpcs.map((u) => new URL(u).host.split('.').slice(-2).join('.'))).size, `${n.name}: two operators`).toBeGreaterThanOrEqual(2)
      for (const u of n.rpcs) {
        expect(u.startsWith('https://')).toBe(true)
        expect(u).not.toContain('sepolia.drpc.org')
        expect(u).not.toMatch(/key=|apikey|\/v3\/[0-9a-f]{20,}/i)
      }
      expect(n.viemChain.id).toBe(id)
    }
    expect(() => evmNetwork(1)).toThrow(/unsupported/)
    expect(EVM_NETWORKS[BASE].opStack && EVM_NETWORKS[OP].opStack && !EVM_NETWORKS[ARB].opStack).toBe(true)
  })

  it('erc20TransferData equals viem encodeFunctionData; amounts ≥ 2^128 are refused before signing', () => {
    for (const a of [0n, 1n, 1_500_000n, 2n ** 128n - 1n])
      expect(erc20TransferData(RCPT, a)).toBe(encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [RCPT, a] }))
    expect(() => erc20TransferData(RCPT, 2n ** 128n)).toThrow(RangeError)
    expect(() => erc20TransferData('0x12' as `0x${string}`, 1n)).toThrow(/address/)
  })

  it('buildErc20TransferTx → serializeUnsignedEvmTx is what the contract accepts; bad shapes are refused locally', () => {
    for (const chainId of EVM_CHAIN_IDS) {
      const tx = buildErc20TransferTx({ chainId, nonce: 3, recipient: RCPT, amount: 9n, gas: 70_000n, maxFeePerGas: 5n, maxPriorityFeePerGas: 1n })
      const unsigned = serializeUnsignedEvmTx(tx)
      const c = classifyEvm(unsigned)
      expect(c.ok && [c.fields.chainId, c.fields.erc20?.amount, c.fields.value]).toEqual([BigInt(chainId), 9n, 0n])
      expect(parseUnsignedEvmTx(unsigned).data).toBe(tx.data)
      expect(classifyEvm(serializeUnsignedEvmTx(buildUnsignedEvmTx({ chainId, nonce: 0, to: RCPT, value: 1n, maxFeePerGas: 2n, maxPriorityFeePerGas: 1n }))).ok).toBe(true)
    }
    const base = buildErc20TransferTx({ chainId: BASE, nonce: 0, recipient: RCPT, amount: 1n, gas: 1n, maxFeePerGas: 1n, maxPriorityFeePerGas: 1n })
    expect(() => serializeUnsignedEvmTx({ ...base, to: usdc(11155111) })).toThrow(/USDC/)
    expect(() => serializeUnsignedEvmTx({ ...base, value: 1n })).toThrow(/value 0/)
    expect(() => serializeUnsignedEvmTx({ ...base, data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [RCPT, 1n] }) })).toThrow(/transfer/)
    expect(() => serializeUnsignedEvmTx({ ...base, chainId: 1 })).toThrow(/unsupported/)
    expect(() => buildUnsignedEvmTx({ chainId: 8453, nonce: 0, to: RCPT, value: 1n, maxFeePerGas: 1n, maxPriorityFeePerGas: 1n })).toThrow(/unsupported/)
  })

  it('attachEvmSignature keeps the USDC calldata, and the signed tx recovers to the signer', async () => {
    const sk = secp256k1.utils.randomSecretKey()
    const from = privateKeyToAddress(`0x${toHex(sk)}`)
    const tx = buildErc20TransferTx({ chainId: OP, nonce: 0, recipient: RCPT, amount: 42n, gas: 70_000n, maxFeePerGas: 5n, maxPriorityFeePerGas: 1n })
    const h = keccak_256(hexToBytesStrict(serializeUnsignedEvmTx(tx)))
    const sig = secp256k1.Signature.fromBytes(secp256k1.sign(h, sk, { prehash: false, format: 'recovered' }), 'recovered')
    const mpc = {
      scheme: 'Secp256k1' as const,
      big_r: { affine_point: `02${sig.r.toString(16).padStart(64, '0')}` },
      s: { scalar: sig.s.toString(16).padStart(64, '0') },
      recovery_id: sig.recovery!,
    }
    const signed = attachEvmSignature(tx, mpc)
    expect(parseTransaction(signed).data).toBe(tx.data)
    expect((await recoverTransactionAddress({ serializedTransaction: signed as `0x02${string}` })).toLowerCase()).toBe(from.toLowerCase())
  })

  it('estimateTransferGas prices a USDC transfer from eth_estimateGas + 20 %, or 300,000 when it fails', async () => {
    const data = erc20TransferData(RCPT, 1n)
    expect(await estimateTransferGas(stubClient({ estimate: 50_000n }), { from: RCPT, to: usdc(BASE), data })).toBe(60_000n)
    expect(await estimateTransferGas(stubClient({ estimate: 'fail' }), { from: RCPT, to: usdc(BASE), data })).toBe(300_000n)
    expect(await estimateTransferGas(stubClient({ estimate: 30_000n }), { from: RCPT, to: RCPT })).toBe(30_000n) // native path unchanged
  })

  it('prepareErc20Send reads balanceOf, estimates gas and reserves the OP-stack L1 fee', async () => {
    const calls: string[] = []
    const p = await prepareErc20Send(stubClient({ nonce: 4, usdc: 5_000_000n, l1: 1_000n, calls }), { chainId: BASE, from: RCPT, to: RCPT, amount: 'max' })
    expect(p.amount).toBe(5_000_000n)
    expect(p.tx).toMatchObject({ chainId: BASE, nonce: 4, to: usdc(BASE), value: 0n })
    expect(p.feeMax).toBe(60_000n * 10n + 1_500n) // gas × maxFee + 1.5 × L1 fee
    expect(calls).toContain(`${usdc(BASE).toLowerCase()}:0x70a08231`)
    expect(calls).toContain('0x420000000000000000000000000000000000000f:0x49948e0e')
    expect(classifyEvm(p.unsigned).ok).toBe(true)
    await expect(prepareErc20Send(stubClient({ usdc: 1n }), { chainId: BASE, from: RCPT, to: RCPT, amount: 2n })).rejects.toThrow(/insufficient USDC/)
    // Arbitrum: no L1 fee call
    const c2: string[] = []
    const n = await prepareEvmSend(stubClient({ calls: c2 }), { chainId: ARB, from: RCPT, to: RCPT, value: 1n })
    expect(n.tx.chainId).toBe(ARB)
    expect(c2.some((c) => c.includes('0x49948e0e'))).toBe(false)
    expect(await erc20BalanceOf(stubClient({ usdc: 77n }), usdc(OP), RCPT)).toBe(77n)
  })
})

// ── C7 ────────────────────────────────────────────────────────────────────────────────────────

describe('C7: message requests, bytes and verification', () => {
  it('eip191Bytes hashes like viem hashMessage; the Solana off-chain v0 layout', () => {
    for (const m of ['hello', 'Grüße ✓ 🎒', 'x'.repeat(1024), '\n'])
      expect(`0x${toHex(keccak_256(eip191Bytes(utf8(m))))}`).toBe(hashMessage(m))
    expect(toHex(solOffchainMessageBytes(utf8('Hi')))).toBe('ff736f6c616e61206f6666636861696e000002004869')
    expect(solOffchainMessageBytes(utf8('a\nb'))[17]).toBe(1)
  })

  it('request builders, chain slugs and deposits', () => {
    const e = evmMessageSignRequest('hello')
    expect(e).toEqual({ evm_message: { message: '68656c6c6f' } })
    expect(solMessageSignRequest(utf8('hi'))).toEqual({ sol_message: { message: '6869' } })
    expect(signRequestChain(e)).toBe('evm')
    expect(signRequestChain(solMessageSignRequest('x'))).toBe('sol')
    expect(messageSignAttachDeposit(5)).toBe(5n * 10n ** 21n + 5n * 10n ** 19n)
    expect(messageSignAttachDeposit(1024)).toBe(5n * 10n ** 21n + 1024n * 10n ** 19n)
    expect(() => messageSignAttachDeposit(0)).toThrow(RangeError)
    expect(() => messageSignAttachDeposit(1025)).toThrow(RangeError)
    expect(signAttachDepositFor(e)).toBe(messageSignAttachDeposit(5))
    expect(signForCall('1', e)).toMatchObject({ methodName: 'sign_for', deposit: messageSignAttachDeposit(5).toString(), gas: (80n * 10n ** 12n).toString() })
    expect(classifySignRequest(e)).toMatchObject({ chain: 'evm_message', ok: true })
    expect(classifySignRequest({ evm_message: { message: 'ff' } })).toMatchObject({ ok: false, error: 'ERR_MSG_ENCODING' })
  })

  it('verifyEvmMessageSignature: an MPC-shaped {r, s, recovery_id} over the EIP-191 hash verifies like personal_sign', async () => {
    const sk = secp256k1.utils.randomSecretKey()
    const addr = privateKeyToAddress(`0x${toHex(sk)}`)
    const m = 'Sign in to satchel.example\nNonce: 42'
    const sig = secp256k1.Signature.fromBytes(secp256k1.sign(keccak_256(eip191Bytes(utf8(m))), sk, { prehash: false, format: 'recovered' }), 'recovered')
    const view = { r: sig.r.toString(16).padStart(64, '0'), s: sig.s.toString(16).padStart(64, '0'), recovery_id: sig.recovery! }
    expect(await verifyEvmMessageSignature(m, view, addr)).toBe(true)
    expect(await verifyEvmMessageSignature(utf8(m), view, addr)).toBe(true)
    expect(await verifyEvmMessageSignature(`${m}!`, view, addr)).toBe(false)
    expect(await verifyEvmMessageSignature(m, view, RCPT)).toBe(false)
  })

  it('verifySolOffchainSignature: valid over the off-chain bytes, never over the raw body', () => {
    const sk = ed25519.utils.randomSecretKey()
    const pk = base58.encode(ed25519.getPublicKey(sk))
    const m = utf8('Prove you control this Satchel')
    const sig = toHex(ed25519.sign(solOffchainMessageBytes(m), sk))
    expect(verifySolOffchainSignature(m, sig, pk)).toBe(true)
    expect(verifySolOffchainSignature('Prove you control this Satchel', sig, pk)).toBe(true)
    expect(verifySolOffchainSignature(utf8('other'), sig, pk)).toBe(false)
    expect(verifySolOffchainSignature(m, toHex(ed25519.sign(m, sk)), pk)).toBe(false) // a raw signMessage signature
    expect(verifySolOffchainSignature(m, 'zz', pk)).toBe(false)
  })
})

// ── checker: per-chain EVM (C3) and message items (C7) ────────────────────────────────────────

const CONTRACT = 'satchel-spk-chain-e9ea1a.testnet'
const NOW = Date.parse('2026-11-05T12:00:00Z')

function input(records: SigRecordView[]): CheckInput {
  return { network: 'testnet', contractId: CONTRACT, tokenId: '1', role: 'dev', near: [snapshot('a', records), snapshot('b', records)], now: NOW }
}

function msgRecord(seq: number, kind: 'evm_message' | 'sol_message', text: string, o: Partial<SigRecordView> = {}): SigRecordView {
  const m = utf8(text)
  const payload = kind === 'evm_message' ? keccak_256(eip191Bytes(m)) : sha256(solOffchainMessageBytes(m))
  return {
    seq,
    request_id: seq,
    input_index: 0,
    chain: kind === 'evm_message' ? 'evm' : 'sol',
    height: 1,
    timestamp_ms: NOW - 1000,
    requester: 'alice.testnet',
    payload: toHex(payload),
    status: 'signed',
    signature: null,
    detail: kind === 'evm_message' ? { evm_message: { message: toHex(m) } } : { sol_message: { message: toHex(m) } },
    ...o,
  }
}

const deps = (o: Partial<CheckDeps> = {}): CheckDeps => ({
  evm: [fakeEvm('sep-a', { safe: 0n }), fakeEvm('sep-b', { safe: 0n })],
  btc: [],
  sol: [fakeSol('s', {})],
  ...o,
})

describe('C3/C7 checker: per-chain nonce rule, message items', () => {
  it('a Base record is judged on Base providers only; account checks run per chain', async () => {
    const recs = [evmRecord(0, native(11155111, 0)), evmRecord(1, usdcTx(BASE, 0))]
    const r = await checkCleanHistory(
      input(recs),
      deps({
        evm: [fakeEvm('sep-a', { safe: 1n }), fakeEvm('sep-b', { safe: 1n })],
        evmByChain: { [BASE]: [fakeEvm('base-a', { chainId: BASE, safe: 1n }), fakeEvm('base-b', { chainId: BASE, safe: 1n })] },
      }),
    )
    expect(r.items.map((i) => [i.chain_id, i.status])).toEqual([[11155111, 'spent'], [BASE, 'spent']])
    expect(r.items[1]!.erc20).toEqual({ token: usdc(BASE).slice(2).toLowerCase(), to: RCPT.slice(2), amount: '1500000' })
    expect(r.items[1]!.evidence_url).toContain('basescan')
    expect(r.accounts.map((a) => [a.chain, a.chain_id ?? null, a.status])).toEqual([['evm', 11155111, 'ok'], ['sol', null, 'ok'], ['evm', BASE, 'ok']])
    expect(r).toMatchObject({ aggregate: 'clean', buy_enabled: true })
  })

  it('nonces are per chain: Sepolia spent at 1 says nothing about Base nonce 0', async () => {
    const recs = [evmRecord(0, native(11155111, 0)), evmRecord(1, native(BASE, 0))]
    const r = await checkCleanHistory(
      input(recs),
      deps({
        evm: [fakeEvm('sep-a', { safe: 1n }), fakeEvm('sep-b', { safe: 1n })],
        evmByChain: { [BASE]: [fakeEvm('base-a', { chainId: BASE, safe: 0n }), fakeEvm('base-b', { chainId: BASE, safe: 0n })] },
      }),
    )
    expect(r.items.map((i) => i.status)).toEqual(['spent', 'unused'])
    expect(r.aggregate).toBe('blocked')
  })

  it('fails closed: no providers for a chain with records, a provider on the wrong chain, providers that disagree, code on L2', async () => {
    const recs = [evmRecord(0, native(OP, 0))]
    const none = await checkCleanHistory(input(recs), deps())
    expect([none.items[0]!.status, none.items[0]!.reason, none.aggregate]).toEqual(['unknown', 'providers_down', 'unknown'])
    const wrong = await checkCleanHistory(input(recs), deps({ evmByChain: { [OP]: [fakeEvm('op-a', { chainId: 11155111, safe: 1n }), fakeEvm('op-b', { chainId: 11155111, safe: 1n })] } }))
    expect(wrong.items[0]!.status).toBe('unknown')
    const split = await checkCleanHistory(input(recs), deps({ evmByChain: { [OP]: [fakeEvm('op-a', { chainId: OP, safe: 1n }), fakeEvm('op-b', { chainId: OP, safe: 0n })] } }))
    expect([split.items[0]!.status, split.items[0]!.reason]).toEqual(['unknown', 'providers_disagree'])
    const code = await checkCleanHistory(
      input(recs),
      deps({ evmByChain: { [OP]: [fakeEvm('op-a', { chainId: OP, safe: 1n, code: '0xef0100aa' }), fakeEvm('op-b', { chainId: OP, safe: 1n, code: '0xef0100aa' })] } }),
    )
    expect(code.accounts.find((a) => a.chain_id === OP)?.status).toBe('unsafe')
    expect(code.aggregate).toBe('unsafe')
  })

  it('message records are listed with their text and never block Buy; an inconsistent one is unknown', async () => {
    const recs = [msgRecord(0, 'evm_message', 'Sign in ✓'), msgRecord(1, 'sol_message', 'Hi')]
    const r = await checkCleanHistory(input(recs), deps())
    expect(r.items.map((i) => [i.status, i.message_kind, i.message_text])).toEqual([
      ['message', 'evm_message', 'Sign in ✓'],
      ['message', 'sol_message', 'Hi'],
    ])
    expect(r).toMatchObject({ aggregate: 'clean', buy_enabled: true, expected_sig_count: 2 })
    // a message next to an unused EVM tx: blocked by the tx, not by the message
    const mixed = await checkCleanHistory(input([...recs, evmRecord(2, native(11155111, 0))]), deps())
    expect(mixed.aggregate).toBe('blocked')
    const bad = await checkCleanHistory(input([msgRecord(0, 'evm_message', 'a', { payload: '00'.repeat(32) })]), deps())
    expect([bad.items[0]!.status, bad.items[0]!.reason, bad.aggregate]).toEqual(['unknown', 'record_inconsistent', 'unknown'])
    const wrongKey = await checkCleanHistory(input([msgRecord(0, 'sol_message', 'a', { chain: 'evm' })]), deps())
    expect(wrongKey.items[0]!.status).toBe('unknown')
    const notUtf8 = await checkCleanHistory(input([{ ...msgRecord(0, 'evm_message', 'a'), detail: { evm_message: { message: 'ff' } } }]), deps())
    expect(notUtf8.items[0]!.reason).toBe('record_unparseable')
  })
})

// keep the import list honest (concatBytes is used by helpers in other files; referenced here so a refactor notices)
void concatBytes
