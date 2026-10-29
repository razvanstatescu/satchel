/** Test helpers: fixture-backed fetchers and record builders. No network. */
import esplora from './fixtures/testnet4-esplora.json' with { type: 'json' }
import sepolia from './fixtures/sepolia-rpc.json' with { type: 'json' }
import solana from './fixtures/solana-devnet.json' with { type: 'json' }
import { keccak256 } from 'viem'
import type { FetchLike } from '../src/chains/btc/mempool'
import type { BtcOutspend, BtcSource, EvmSource, NearSnapshot, SigRecordView, SolSource } from '../src/clean-history'
import { EsploraClient } from '../src/chains/btc/mempool'
import { classifyEvm } from '../src/policy'
import { strip0x } from '../src/bytes'

export const TX = esplora.txids

/** A fetch that serves recorded Esplora responses for one provider; anything unrecorded is a 500. Logs calls. */
export function esploraFixtureFetch(provider: 'mempool.space' | 'mempool.emzy.de', calls: string[] = []): FetchLike {
  const recorded = esplora.providers[provider] as Record<string, { status: number; body: string }>
  return async (url) => {
    const path = url.replace(/^https:\/\/[^/]+\/testnet4\/api/, '')
    calls.push(path)
    const r = recorded[path]
    return r ? new Response(r.body, { status: r.status }) : new Response('not recorded', { status: 500 })
  }
}

export function recordedBtcSources(calls: string[] = []): BtcSource[] {
  return [
    new EsploraClient('https://mempool.space/testnet4/api', { fetch: esploraFixtureFetch('mempool.space', calls) }),
    new EsploraClient('https://mempool.emzy.de/testnet4/api', { fetch: esploraFixtureFetch('mempool.emzy.de', calls) }),
  ]
}

/** EvmSource replaying the recorded Sepolia answers (the tag queried must be the recorded one). */
export function recordedEvmSource(name: 'publicnode' | 'drpc'): EvmSource {
  const p = sepolia.providers[name]
  const acct = (a: string) => {
    const k = Object.keys(p.accounts).find((x) => x.toLowerCase() === a.toLowerCase())
    if (!k) throw new Error(`unrecorded address ${a}`)
    return p.accounts[k as keyof typeof p.accounts] as { count_at_tag: string; count_latest: string; code: string }
  }
  return {
    name,
    chainId: async () => Number(p.eth_chainId),
    // heads are reported so that min(head) − 3 == the recorded tag
    blockNumber: async () => BigInt(p.tag) + 3n,
    getTransactionCount: async (a, block) => {
      if (block !== 'latest' && block !== BigInt(p.tag)) throw new Error(`unrecorded tag ${block}`)
      return BigInt(block === 'latest' ? acct(a).count_latest : acct(a).count_at_tag)
    },
    getCode: async (a) => acct(a).code,
  }
}

export function recordedSolSource(): SolSource {
  return {
    name: 'api.devnet.solana.com',
    isBlockhashValid: async (h) => {
      const r = (solana.isBlockhashValid as Record<string, { value: boolean }>)[h]
      if (!r) throw new Error(`unrecorded blockhash ${h}`)
      return r.value
    },
    getAccountInfo: async (a) => {
      const r = (solana.getAccountInfo as unknown as Record<string, { value: null | { owner: string; data: [string, string] } }>)[a]
      if (!r) throw new Error(`unrecorded account ${a}`)
      return r.value ? { owner: r.value.owner, dataLength: atob(r.value.data[0]).length } : null
    },
  }
}

/** Programmable sources for rule tests. */
export function fakeEvm(name: string, o: { chainId?: number; head?: bigint; safe?: bigint; latest?: bigint; code?: string; fail?: boolean }): EvmSource {
  const fail = () => {
    if (o.fail) throw new Error(`${name} down`)
  }
  return {
    name,
    chainId: async () => (fail(), o.chainId ?? 11155111),
    blockNumber: async () => (fail(), o.head ?? 1000n),
    getTransactionCount: async (_a, b) => (fail(), b === 'latest' ? (o.latest ?? o.safe ?? 0n) : (o.safe ?? 0n)),
    getCode: async () => (fail(), o.code ?? '0x'),
  }
}

export function fakeBtc(
  name: string,
  o: { tip?: number; outs?: Record<string, BtcOutspend[] | null>; fail?: boolean; genesisOk?: boolean; txs?: Record<string, unknown | null> },
  calls: string[] = [],
): BtcSource {
  const src: BtcSource = {
    name,
    assertTestnet4: async () => {
      if (o.fail) throw new Error(`${name} down`)
      if (o.genesisOk === false) throw new Error('not testnet4')
    },
    tipHeight: async () => o.tip ?? 1000,
    outspends: async (t) => {
      calls.push(t)
      if (!(t in (o.outs ?? {}))) throw new Error(`unrecorded ${t}`)
      return o.outs![t]!
    },
  }
  // `GET /tx/:txid` only when the test provides answers (a source without it never reports `foreign`)
  if (o.txs)
    src.tx = async (t) => {
      calls.push(`tx:${t}`)
      if (!(t in o.txs!)) throw new Error(`unrecorded tx ${t}`)
      return o.txs![t]!
    }
  return src
}

export function fakeSol(name: string, o: { valid?: Record<string, boolean>; account?: { owner: string; dataLength: number } | null; fail?: boolean }): SolSource {
  return {
    name,
    isBlockhashValid: async (h) => {
      if (o.fail) throw new Error(`${name} down`)
      if (!o.valid || !(h in o.valid)) throw new Error(`unrecorded ${h}`)
      return o.valid[h]!
    },
    getAccountInfo: async () => {
      if (o.fail) throw new Error(`${name} down`)
      return o.account ?? null
    },
  }
}

// ── records ──────────────────────────────────────────────────────────────────────────────────

let defaults = { height: 274_600_000, timestamp_ms: 1_793_000_000_000, requester: 'alice.satchelhq.testnet' }
export const setRecordDefaults = (d: Partial<typeof defaults>) => (defaults = { ...defaults, ...d })

export function evmRecord(seq: number, unsignedTx: string, o: Partial<SigRecordView> = {}): SigRecordView {
  const c = classifyEvm(unsignedTx)
  if (!c.ok) throw new Error(`bad tx ${c.error}`)
  return {
    seq,
    request_id: seq,
    input_index: 0,
    chain: 'evm',
    ...defaults,
    payload: strip0x(keccak256(`0x${strip0x(unsignedTx)}`)),
    status: 'signed',
    signature: null,
    detail: { evm: { chain_id: 11155111, nonce: Number(c.fields.nonce), unsigned_tx: strip0x(unsignedTx).toLowerCase() } },
    ...o,
  }
}

export function btcRecord(seq: number, requestId: number, inputIndex: number, txid: string, vout: number, o: Partial<SigRecordView> = {}): SigRecordView {
  return {
    seq,
    request_id: requestId,
    input_index: inputIndex,
    chain: 'btc',
    ...defaults,
    payload: `${seq.toString(16).padStart(2, '0')}`.repeat(32),
    status: 'signed',
    signature: null,
    detail: { btc: { txid, vout, amount_sats: '50000' } },
    ...o,
  }
}

export function solRecord(seq: number, blockhashHex: string, timestampMs: number, o: Partial<SigRecordView> = {}): SigRecordView {
  return {
    seq,
    request_id: seq,
    input_index: 0,
    chain: 'sol',
    ...defaults,
    timestamp_ms: timestampMs,
    payload: 'ab'.repeat(32),
    status: 'signed',
    signature: null,
    detail: { sol: { recent_blockhash: blockhashHex, lamports: '1000000' } },
    ...o,
  }
}

export function snapshot(source: string, records: SigRecordView[], o: Partial<NearSnapshot> = {}): NearSnapshot {
  return {
    source,
    sigCount: records.length,
    records,
    contract: { exists: true, accessKeyCount: 0, codeHash: 'ab'.repeat(32) },
    ...o,
  }
}
