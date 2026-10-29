/** Shared helpers for the vector generator. */
import { classifySignRequest, type AnyClassifyResult, type PolicyError } from '@satchel/core/policy'
import { toHex } from '@satchel/core/bytes'
import type { SignRequest } from '@satchel/core/near'

export type Kind = 'evm' | 'btc' | 'sol'

export interface Vector {
  name: string
  kind: Kind
  hex: string | null
  request: SignRequest
  expect: {
    ok: boolean
    error?: PolicyError
    hash?: string
    hashes?: string[]
    mpc?: { path_chain: Kind; domain_id: 0 | 1; payload_v2: { Ecdsa: string } | { Eddsa: string } }[]
    fields?: Record<string, unknown>
  }
  /**
   * Token state `sign_for` checks after the stateless classifier (spec §5.9 nonce-gap rule, D-43). `evm_max_nonce` is
   * the highest EVM nonce the token has signed (decimal string), or null; an absent `state` means null (no EVM record).
   */
  state?: { evm_max_nonce: string | null }
  note?: string
}

export interface VectorFile {
  schema: 'satchel-vectors/1'
  set: Kind
  generator: 'tools/vectors/gen.ts'
  vectors: Vector[]
}

const str = (v: bigint | number) => v.toString()

function fieldsOf(r: AnyClassifyResult): Record<string, unknown> {
  if (!r.ok) return {}
  if (r.chain === 'evm') {
    const f = r.fields
    return {
      chain_id: str(f.chainId),
      nonce: str(f.nonce),
      max_priority_fee_per_gas: str(f.maxPriorityFeePerGas),
      max_fee_per_gas: str(f.maxFeePerGas),
      gas_limit: str(f.gasLimit),
      to: f.to.toLowerCase(),
      value: str(f.value),
      unsigned_tx: toHex(f.unsignedTx),
    }
  }
  if (r.chain === 'btc') {
    const f = r.fields
    return {
      inputs: f.inputs.map((i) => ({ txid: i.txid, vout: i.vout, amount_sats: str(i.amountSats), sequence: str(i.sequence) })),
      pkh: toHex(f.pkh),
      hash_prevouts: toHex(f.hashPrevouts),
      hash_sequence: toHex(f.hashSequence),
      hash_outputs: toHex(f.hashOutputs),
      outputs: f.outputs.map((o) => ({ value: str(o.value), script: toHex(o.script) })),
      txid: f.txid,
    }
  }
  const f = r.fields
  return { recent_blockhash: toHex(f.recentBlockhash), lamports: str(f.lamports), from: toHex(f.from), to: toHex(f.to), num_keys: f.numKeys }
}

/**
 * Build a vector and cross-check it: `want` is the outcome the spec rule demands (decided by the author of each
 * vector, independently); the TS reference classifier must agree or generation fails.
 */
export function vec(name: string, kind: Kind, request: SignRequest, want: 'ok' | PolicyError, note?: string, state?: Vector['state']): Vector {
  const max = state?.evm_max_nonce
  const r = classifySignRequest(request, { evmMaxSignedNonce: max === undefined || max === null ? null : BigInt(max) })
  const got = r.ok ? 'ok' : r.error
  if (got !== want) throw new Error(`vector ${name}: spec says ${want}, reference classifier says ${got}`)
  const hex = 'evm' in request ? request.evm.unsigned_tx : 'sol' in request ? request.sol.message : null
  const v: Vector = { name, kind, hex, request, expect: { ok: r.ok } }
  if (state) v.state = state
  if (!r.ok) v.expect.error = r.error
  else {
    const hashes = r.recordPayloads.map(toHex)
    v.expect.hash = hashes[0]!
    v.expect.hashes = hashes
    v.expect.mpc = r.mpcPayloads.map((p) => ({ path_chain: kind, domain_id: kind === 'sol' ? 1 : 0, payload_v2: p }))
    v.expect.fields = fieldsOf(r)
  }
  if (note) v.note = note
  return v
}

export function checkUnique(vs: Vector[]): void {
  const seen = new Set<string>()
  for (const v of vs) {
    if (seen.has(v.name)) throw new Error(`duplicate vector name ${v.name}`)
    seen.add(v.name)
  }
}

export function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`assertion failed: ${msg}`)
}
