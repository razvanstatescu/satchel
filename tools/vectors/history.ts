/**
 * C1 history-digest vectors (docs/specs/C1-C2-C3-C7.md §5.1): `sig_records` rows (exactly as the view prints them)
 * → `{sig_count, digest_hex}`, plus the header and per-entry bytes for debugging. Rust (`feature_tests`) and TS
 * (packages/core/test/features-c1-c7.test.ts) both reproduce every digest; the sandbox suite checks the live view
 * against a third encoder.
 * Records are built from accepted shared vectors, so payloads and details are the real classifier outputs.
 */
import { encodeFunctionData, erc20Abi, serializeTransaction } from 'viem'
import { classifySignRequest, type AnyClassifyResult } from '@satchel/core/policy'
import { historyDigest, historyEntry, historyHeader, type SigRecordView } from '@satchel/core/clean-history'
import { toHex, utf8 } from '@satchel/core/bytes'
import { evmMessageSignRequest, solMessageSignRequest, type SignRequest } from '@satchel/core/near'
import { btcVectors } from './btc'
import { solVectors } from './sol'
import { assert } from './lib'

export interface HistoryVector {
  name: string
  contract_id: string
  token_id: string
  records: SigRecordView[]
  expect: { sig_count: number; digest_hex: string; header_hex: string; entries_hex: string[] }
  note?: string
}

export interface HistoryFile {
  schema: 'satchel-vectors/1'
  set: 'history'
  generator: 'tools/vectors/gen.ts'
  vectors: HistoryVector[]
}

const CONTRACT = 'satchel.satchelhq.testnet'
const OWNER = 'alice.satchelhq.testnet'
const KB31 = '02ee83aa36a78083030d4883030d5c8252089461739f33adbb7f76c1b5b222e4119085257528be865af3107a400080c0'
/** a Base Sepolia USDC transfer(0x2222…, 1.5 USDC), nonce 0, built by viem (same shape as `erc20_usdc_transfer_base_sepolia`) */
const BASE_USDC = serializeTransaction({
  type: 'eip1559',
  chainId: 84532,
  nonce: 0,
  to: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  value: 0n,
  gas: 65_000n,
  maxFeePerGas: 200_028n,
  maxPriorityFeePerGas: 200_008n,
  data: encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: ['0x2222222222222222222222222222222222222222', 1_500_000n] }),
}).slice(2)

function ok(req: SignRequest): Extract<AnyClassifyResult, { ok: true }> {
  const r = classifySignRequest(req)
  assert(r.ok, `history vector input refused: ${JSON.stringify(req)}`)
  return r as Extract<AnyClassifyResult, { ok: true }>
}

/** Rows for `reqs`, in order, as `sig_records` prints them (all pending, no signature). */
function rows(reqs: SignRequest[], startHeight = 274_600_000): SigRecordView[] {
  const out: SigRecordView[] = []
  reqs.forEach((req, k) => {
    const c = ok(req)
    const requestId = out.length
    const height = startHeight + 7 * k
    c.recordPayloads.forEach((p, i) => {
      const base = { seq: out.length, request_id: requestId, input_index: i, height, timestamp_ms: 1_793_000_000_000 + 4_000 * k, requester: OWNER, payload: toHex(p), status: 'pending' as const, signature: null }
      if (c.chain === 'evm') {
        const f = c.fields
        const evm: { chain_id: number; nonce: number; unsigned_tx: string; erc20?: { token: string; to: string; amount: string } } = {
          chain_id: Number(f.chainId),
          nonce: Number(f.nonce),
          unsigned_tx: toHex(f.unsignedTx),
        }
        if (f.erc20) evm.erc20 = { token: f.erc20.token.slice(2), to: f.erc20.to.slice(2), amount: f.erc20.amount.toString() }
        out.push({ ...base, chain: 'evm', detail: { evm } })
      } else if (c.chain === 'btc') {
        const inp = c.fields.inputs[i]!
        out.push({ ...base, chain: 'btc', detail: { btc: { txid: inp.txid, vout: inp.vout, amount_sats: inp.amountSats.toString() } } })
      } else if (c.chain === 'sol') {
        out.push({ ...base, chain: 'sol', detail: { sol: { recent_blockhash: toHex(c.fields.recentBlockhash), lamports: c.fields.lamports.toString() } } })
      } else if (c.chain === 'evm_message') {
        out.push({ ...base, chain: 'evm', detail: { evm_message: { message: toHex(c.fields.message) } } })
      } else {
        out.push({ ...base, chain: 'sol', detail: { sol_message: { message: toHex(c.fields.message) } } })
      }
    })
  })
  return out
}

function hv(name: string, contract: string, token: string, records: SigRecordView[], note?: string): HistoryVector {
  const v: HistoryVector = {
    name,
    contract_id: contract,
    token_id: token,
    records,
    expect: {
      sig_count: records.length,
      digest_hex: historyDigest(contract, token, records),
      header_hex: toHex(historyHeader(contract, token, records.length)),
      entries_hex: records.map((r) => toHex(historyEntry(r))),
    },
  }
  if (note) v.note = note
  return v
}

export function historyVectors(): HistoryFile {
  const btc = btcVectors().find((x) => x.expect.ok && 'btc' in x.request && x.request.btc.preimages.length >= 2)
  const sol = solVectors().find((x) => x.expect.ok)
  assert(btc && sol, 'need an accepted 2-input BTC vector and an accepted SOL vector')
  const every = rows([
    { evm: { unsigned_tx: KB31 } },
    btc.request,
    sol.request,
    { evm: { unsigned_tx: BASE_USDC } },
    evmMessageSignRequest('hello'),
    solMessageSignRequest(utf8('Grüße ✓')),
  ])
  assert(every.some((r) => 'evm' in r.detail && r.detail.evm.erc20), 'the Base record is a USDC transfer')
  const resolved: SigRecordView[] = every.map((r, i) =>
    i % 2 === 0
      ? { ...r, status: 'signed', signature: r.chain === 'sol' ? { signature: 'ab'.repeat(64) } : { r: '11'.repeat(32), s: '22'.repeat(32), recovery_id: 1 } }
      : { ...r, status: 'failed' },
  )
  const v = [
    hv('empty_history', CONTRACT, '1', [], 'sig_count 0: SHA-256(H) only'),
    hv('one_evm_record', CONTRACT, '1', rows([{ evm: { unsigned_tx: KB31 } }]), 'the kb/31 Sepolia transfer'),
    hv('every_kind', CONTRACT, '3', every, 'EVM, BTC ×2 inputs, SOL, USDC on Base, EIP-191 message, Solana off-chain message'),
    hv('every_kind_resolved', CONTRACT, '3', resolved, 'same records, statuses and signatures changed: the digest must not change'),
    hv('every_kind_other_token', CONTRACT, '4', every, 'same records under another token id: a different digest'),
    hv('every_kind_rc_contract', 'rc.satchelhq.testnet', '3', every, 'same records on another contract: a different digest'),
  ]
  const d = (n: string) => v.find((x) => x.name === n)!.expect.digest_hex
  assert(d('every_kind') === d('every_kind_resolved'), 'status/signature must not affect the digest')
  assert(new Set([d('every_kind'), d('every_kind_other_token'), d('every_kind_rc_contract')]).size === 3, 'header binds token and contract')
  return { schema: 'satchel-vectors/1', set: 'history', generator: 'tools/vectors/gen.ts', vectors: v }
}
