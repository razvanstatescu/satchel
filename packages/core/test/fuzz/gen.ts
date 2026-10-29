/**
 * Fuzz-corpus generator for the §5.9 classifiers (docs/security/fuzzing.md).
 *
 * Produces `SignRequest`s per chain from four families: mutated shared vectors (vectors/*.json), structured random
 * builders that perturb one rule at a time, valid builders, and raw random bytes; plus a hex-string layer
 * (prefixes, case, odd length, bad characters). `verdictOf` records the TS reference classifier's answer, which the
 * Rust differential test (contracts/satchel/src/parse/fuzz_tests.rs) compares against the contract.
 *
 * Deterministic for a given seed. Shared by `test/fuzz/policy-fuzz.test.ts` and `tools/fuzz/gen-corpus.ts`.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bigIntToBytesBE, concatBytes, hexToBytesStrict, toHex, u32le, u64le, utf8 } from '../../src/bytes'
import type { SignRequest } from '../../src/near/sign-request'
import { classifySignRequest, encodeCompactU16, encodeRlp, EVM_TOKEN_ALLOWLIST, sha256d, type RlpInput } from '../../src/policy'

/** `msg` = the C7 request kinds (`evm_message`, `sol_message`), one corpus file. */
export type Chain = 'evm' | 'btc' | 'sol' | 'msg'

/** One corpus line: request, TS verdict ('ok' | ERR_… | THROW:…), and on ok the record hashes + key fields. */
export interface Case {
  r: SignRequest
  v: string
  h?: string[]
  f?: Record<string, unknown>
}

// ───────────────────────────────────────── PRNG (sfc32) ─────────────────────────────────────────

export class Rng {
  private a: number
  private b: number
  private c: number
  private d: number
  constructor(seed: number) {
    this.a = seed >>> 0
    this.b = 0x9e3779b9
    this.c = 0x243f6a88
    this.d = (0xb7e15162 ^ seed) >>> 0
    for (let i = 0; i < 16; i++) this.u32()
  }
  u32(): number {
    const t = (((this.a + this.b) | 0) + this.d) | 0
    this.d = (this.d + 1) | 0
    this.a = this.b ^ (this.b >>> 9)
    this.b = (this.c + (this.c << 3)) | 0
    this.c = (this.c << 21) | (this.c >>> 11)
    this.c = (this.c + t) | 0
    return t >>> 0
  }
  /** [0, n) */
  int(n: number): number {
    return n <= 0 ? 0 : this.u32() % n
  }
  /** [lo, hi] */
  range(lo: number, hi: number): number {
    return lo + this.int(hi - lo + 1)
  }
  bool(p = 0.5): boolean {
    return this.u32() / 0x1_0000_0000 < p
  }
  pick<T>(xs: readonly T[]): T {
    return xs[this.int(xs.length)]!
  }
  bytes(n: number): Uint8Array {
    const out = new Uint8Array(n)
    for (let i = 0; i < n; i++) out[i] = this.u32() & 0xff
    return out
  }
  /** Random non-negative integer of exactly `w` bytes (top byte non-zero), 0 when w = 0. */
  bigOfWidth(w: number): bigint {
    if (w === 0) return 0n
    const b = this.bytes(w)
    b[0] = b[0]! | 1
    let v = 0n
    for (const x of b) v = (v << 8n) | BigInt(x)
    return v
  }
}

// ───────────────────────────────────────── seeds ─────────────────────────────────────────

const VECTORS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'vectors')

interface VectorFile {
  vectors: { request: SignRequest }[]
}

function tryHex(s: string): Uint8Array | null {
  try {
    return hexToBytesStrict(s)
  } catch {
    return null
  }
}

export interface Seeds {
  evm: Uint8Array[]
  btc: { pre: Uint8Array[]; outs: Uint8Array }[]
  sol: Uint8Array[]
  msg: { evm: boolean; m: Uint8Array }[]
}

export function loadSeeds(): Seeds {
  const read = (c: Chain) => {
    try {
      return (JSON.parse(readFileSync(join(VECTORS, `${c}.json`), 'utf8')) as VectorFile).vectors.map((v) => v.request)
    } catch {
      return [] // vectors/msg.json may not exist yet while the vectors are being regenerated
    }
  }
  const evm = read('evm')
    .map((r) => ('evm' in r ? tryHex(r.evm.unsigned_tx) : null))
    .filter((x): x is Uint8Array => x !== null)
  const sol = read('sol')
    .map((r) => ('sol' in r ? tryHex(r.sol.message) : null))
    .filter((x): x is Uint8Array => x !== null)
  const btc: Seeds['btc'] = []
  for (const r of read('btc')) {
    if (!('btc' in r)) continue
    const pre = r.btc.preimages.map(tryHex)
    const outs = tryHex(r.btc.outputs)
    if (outs && pre.every((p) => p !== null)) btc.push({ pre: pre as Uint8Array[], outs })
  }
  const msg: Seeds['msg'] = []
  for (const r of read('msg')) {
    const m = 'evm_message' in r ? tryHex(r.evm_message.message) : 'sol_message' in r ? tryHex(r.sol_message.message) : null
    if (m) msg.push({ evm: 'evm_message' in r, m })
  }
  for (const evm of [true, false]) for (const t of ['Sign in to satchel.example', 'Grüße ✓ 🎒', 'x'.repeat(1024), 'line\nbreak']) msg.push({ evm, m: utf8(t) })
  return { evm, btc, sol, msg }
}

// ───────────────────────────────────────── byte mutation ─────────────────────────────────────────

const INTERESTING = [
  0x00, 0x01, 0x02, 0x03, 0x04, 0x0c, 0x14, 0x7f, 0x80, 0x81, 0x82, 0xb7, 0xb8, 0xb9, 0xbf, 0xc0, 0xc1, 0xf7, 0xf8, 0xf9, 0xfc, 0xfd, 0xfe,
  0xff,
] as const

/** 1–8 edits; `hot` = positions of length fields / tags (RLP headers, compact-u16, varints, preimage offsets). */
export function mutateBytes(r: Rng, src: Uint8Array, hot: number[] = [], inPlaceOnly = false): Uint8Array {
  const a = Array.from(src)
  const nOps = r.pick([1, 1, 1, 2, 2, 3, r.range(1, 8)])
  for (let k = 0; k < nOps; k++) {
    const len = a.length
    const pos = hot.length > 0 && r.bool(0.5) ? hot[r.int(hot.length)]! : r.int(Math.max(len, 1))
    const op = inPlaceOnly && !r.bool(0.1) ? r.pick([0, 1, 2, 7]) : r.int(11)
    const p = Math.min(pos, Math.max(len - 1, 0))
    switch (op) {
      case 0:
        if (len) a[p] = a[p]! ^ (1 << r.int(8))
        break
      case 1:
        if (len) a[p] = r.pick(INTERESTING)
        break
      case 2:
        if (len) a[p] = r.int(256)
        break
      case 3:
        a.splice(Math.min(pos, len), 0, r.bool() ? r.pick(INTERESTING) : r.int(256))
        break
      case 4:
        if (len) a.splice(p, 1)
        break
      case 5:
        if (r.bool(0.3)) a.length = Math.min(pos, len)
        break
      case 6:
        for (let i = r.range(1, 4); i > 0; i--) a.push(r.int(256))
        break
      case 7:
      case 8:
        if (len) a[p] = (a[p]! + r.pick([1, 2, 3, 255, 254, 253, 0x80, 0x38])) & 0xff // length-field tweak
        break
      case 9:
        if (len) {
          const chunk = a.slice(p, p + r.range(1, 40))
          a.splice(r.int(len + 1), 0, ...chunk)
        }
        break
      default:
        // non-canonical: redundant continuation / zero length prefix
        if (len && pos < len && a[pos]! < 0x80 && r.bool()) {
          a[pos] = a[pos]! | 0x80
          a.splice(pos + 1, 0, 0)
        } else a.splice(Math.min(pos, len), 0, 0)
    }
  }
  return Uint8Array.from(a)
}

/** Hex-string layer: mostly plain lowercase; sometimes prefix / case / odd length / invalid characters. */
export function hexLayer(r: Rng, b: Uint8Array, p = 0.1): string {
  const h = toHex(b)
  if (!r.bool(p)) return h
  const i = r.int(h.length + 1)
  switch (r.int(10)) {
    case 0:
      return `0x${h}`
    case 1:
      return `0X${h.toUpperCase()}`
    case 2:
      return [...h].map((c, k) => (k % 3 === 0 ? c.toUpperCase() : c)).join('')
    case 3:
      return h.slice(0, -1)
    case 4:
      return `${h.slice(0, i)}${r.pick(['g', 'x', 'X', ' ', '\n', 'é', '-', '0x'])}${h.slice(i)}`
    case 5:
      return `0x0x${h}`
    case 6:
      return ` ${h}`
    case 7:
      return `x${h}`
    case 8:
      return `${h}0`
    default:
      return h.toUpperCase()
  }
}

// ───────────────────────────────────────── EVM ─────────────────────────────────────────

const SEPOLIA = 11155111n
/** C3 chains with their C2 token (from the spec table, not from the classifier's constants) */
const CHAINS: readonly [bigint, string][] = [
  [11155111n, '1c7d4b196cb0c7b01d743fbc6116a902379c7238'],
  [84532n, '036cbd53842c5426634e7929541ec2318f3dcf7e'],
  [421614n, '75faf114eafb1bdbe2f0316df893fd58ce46aa4d'],
  [11155420n, '5fd84259d66cd46123540766be93dfe6d43130d7'],
]
const intBytes = (v: bigint) => bigIntToBytesBE(v)

/** `transfer(to, amount)`: selector ‖ word(to) ‖ word(amount) (amount < 2^128 for a valid one). */
export function transferData(to: Uint8Array, amount: bigint): Uint8Array {
  const w = (b: Uint8Array) => concatBytes(new Uint8Array(32 - b.length), b)
  return concatBytes(hexToBytesStrict('a9059cbb'), w(to), w(bigIntToBytesBE(amount)))
}

/** Header with a chosen form: canonical, long form for a short payload, or a leading-zero length. */
function header(base: 0x80 | 0xc0, len: number, form: 'c' | 'long' | 'zero'): Uint8Array {
  if (form === 'c') return Uint8Array.from(canonHead(base, len))
  const lb = len > 255 ? [len >> 8, len & 0xff] : [len]
  if (form === 'zero') lb.unshift(0)
  return Uint8Array.of(base + 55 + lb.length, ...lb)
}

function canonHead(base: number, len: number): number[] {
  if (len <= 55) return [base + len]
  const lb = len > 255 ? [len >> 8, len & 0xff] : [len]
  return [base + 55 + lb.length, ...lb]
}

const strEnc = (b: Uint8Array, form: 'c' | 'long' | 'zero' | 'wrap' = 'c'): Uint8Array => {
  if (form === 'wrap') return Uint8Array.of(0x81, b[0] ?? 0)
  if (form === 'c') return encodeRlp(b)
  return concatBytes(header(0x80, b.length, form), b)
}
const listEnc = (items: Uint8Array[], form: 'c' | 'long' | 'zero' = 'c'): Uint8Array => {
  const payload = concatBytes(...items)
  return concatBytes(form === 'c' ? Uint8Array.from(canonHead(0xc0, payload.length)) : header(0xc0, payload.length, form), payload)
}

function nested(depth: number): RlpInput {
  let x: RlpInput = []
  for (let i = 0; i < depth; i++) x = [x]
  return x
}

function randIntField(r: Rng, maxW: number): Uint8Array {
  return strEnc(intBytes(r.bigOfWidth(r.pick([0, 1, 1, 2, 4, 8, r.range(0, maxW)]))))
}

/** A valid request: a native transfer on any of the four chains, or (C2) a USDC transfer on its own chain. */
export function evmValid(r: Rng): Uint8Array {
  const nonce = r.bool(0.1) ? 0xfffffffffffffffen : r.bigOfWidth(r.range(0, 8)) % 0xffffffffffffffffn
  const [chain, token] = r.bool(0.5) ? CHAINS[0]! : r.pick(CHAINS)
  const erc20 = r.bool(0.35)
  return concatBytes(
    Uint8Array.of(2),
    encodeRlp([
      intBytes(chain),
      intBytes(nonce),
      intBytes(r.bigOfWidth(r.range(0, 16))),
      intBytes(r.bigOfWidth(r.range(0, 16))),
      intBytes(r.bigOfWidth(r.range(0, 8))),
      erc20 ? hexToBytesStrict(token) : r.bytes(20),
      erc20 ? new Uint8Array(0) : intBytes(r.bigOfWidth(r.range(0, 16))),
      erc20 ? transferData(r.bytes(20), r.bigOfWidth(r.range(0, 16))) : new Uint8Array(0),
      [],
    ]),
  )
}

/** Each field is perturbed with a small probability, one rule at a time where possible. */
export function evmStructured(r: Rng): Uint8Array {
  const bad = () => r.bool(0.12)
  const intField = (maxW: number): Uint8Array => {
    if (!bad()) return randIntField(r, maxW)
    switch (r.int(6)) {
      case 0:
        return strEnc(concatBytes(Uint8Array.of(0), r.bytes(r.range(0, 3)))) // leading zero
      case 1:
        return strEnc(intBytes(r.bigOfWidth(maxW + r.range(1, 2)))) // over-wide
      case 2:
        return strEnc(Uint8Array.of(r.int(0x80)), 'wrap') // wrapped single byte
      case 3:
        return listEnc([]) // a list where an int belongs
      case 4:
        return strEnc(intBytes(r.bigOfWidth(r.range(1, maxW))), r.pick(['long', 'zero'] as const))
      default:
        return strEnc(Uint8Array.of(0)) // 0x00 for zero
    }
  }
  const chain = bad()
    ? r.pick([
        strEnc(intBytes(1n)),
        strEnc(intBytes(0n)),
        strEnc(intBytes(8453n)),
        strEnc(intBytes(84531n)),
        strEnc(intBytes(SEPOLIA + 1n)),
        strEnc(Uint8Array.of(1, 0, 0, 0, 0, 0, 0xaa, 0x36, 0xa7)),
        strEnc(Uint8Array.of(0, 0xaa, 0x36, 0xa7)),
        listEnc([]),
      ])
    : strEnc(intBytes(r.pick(CHAINS)[0]))
  const nonce = bad() && r.bool(0.4) ? strEnc(intBytes(0xffffffffffffffffn)) : intField(8)
  // C2: a third of the cases are token transfers: token (sometimes another chain's), then calldata variants
  const erc20 = r.bool(0.33)
  const token = hexToBytesStrict(r.pick(CHAINS)[1])
  const toOk = erc20 ? strEnc(token) : strEnc(r.bytes(20))
  const to = bad() ? r.pick([strEnc(new Uint8Array(0)), strEnc(r.bytes(19)), strEnc(r.bytes(21)), strEnc(r.bytes(32)), listEnc([]), strEnc(r.bytes(20))]) : toOk
  const goodData = transferData(r.bytes(20), r.bigOfWidth(r.range(0, 16)))
  const badData = (): Uint8Array => {
    const d = Uint8Array.from(goodData)
    switch (r.int(7)) {
      case 0: {
        const i = r.int(4)
        d[i] = d[i]! ^ (1 << r.int(8)) // selector
        return d
      }
      case 1:
        d[4 + r.int(12)] = r.range(1, 255) // dirty address padding
        return d
      case 2:
        d[36 + r.int(16)] = r.range(1, 255) // amount ≥ 2^128
        return d
      case 3:
        return d.subarray(0, r.range(0, 67))
      case 4:
        return concatBytes(d, r.bytes(r.range(1, 32)))
      case 5:
        return hexToBytesStrict('095ea7b3') // approve selector
      default:
        return r.bytes(r.range(1, 6))
    }
  }
  const data = erc20
    ? bad()
      ? r.pick([strEnc(badData()), strEnc(badData()), listEnc([])])
      : strEnc(goodData)
    : bad()
      ? r.pick([strEnc(r.bytes(r.range(1, 6))), strEnc(Uint8Array.of(0)), listEnc([]), strEnc(Uint8Array.of(0x09, 0x5e, 0xa7, 0xb3)), strEnc(goodData)])
      : strEnc(new Uint8Array(0))
  const valueField = erc20 && !bad() ? strEnc(new Uint8Array(0)) : intField(16)
  const al = bad()
    ? r.pick([
        encodeRlp([[r.bytes(20), []]]),
        encodeRlp(nested(r.range(1, 20))),
        strEnc(new Uint8Array(0)),
        encodeRlp([[]]),
        listEnc([], r.pick(['long', 'zero'] as const)),
      ])
    : listEnc([])
  const fields = [chain, nonce, intField(16), intField(16), intField(8), to, valueField, data, al]
  if (r.bool(0.04)) fields.pop()
  if (r.bool(0.04)) fields.push(strEnc(r.bytes(r.range(0, 3))))
  const body = listEnc(fields, r.bool(0.04) ? r.pick(['long', 'zero'] as const) : 'c')
  const type = r.bool(0.97) ? 2 : r.pick([0, 1, 3, 4, 5, 0x19, 0xc0, 0xf8, 0x7f])
  let tx = concatBytes(Uint8Array.of(type), body)
  if (r.bool(0.03)) tx = concatBytes(tx, Uint8Array.of(r.int(256)))
  return tx
}

/** RLP header positions (incl. long-form length bytes), best effort. */
export function rlpHot(b: Uint8Array, start = 0, end = b.length, out: number[] = [], depth = 0): number[] {
  let o = start
  while (o < end && depth < 24 && out.length < 64) {
    out.push(o)
    const h = b[o]!
    if (h < 0x80) {
      o++
      continue
    }
    let off = 1
    let len: number
    const list = h >= 0xc0
    if (h <= 0xb7 || (h >= 0xc0 && h <= 0xf7)) len = h - (list ? 0xc0 : 0x80)
    else {
      const ll = h - (list ? 0xf7 : 0xb7)
      len = 0
      for (let i = 1; i <= ll; i++) {
        out.push(o + i)
        len = len * 256 + (b[o + i] ?? 0)
      }
      off = 1 + ll
    }
    if (list) rlpHot(b, o + off, Math.min(o + off + len, end), out, depth + 1)
    o += off + len
  }
  return out
}

export function genEvm(r: Rng, seeds: Seeds): SignRequest {
  let tx: Uint8Array
  const k = r.int(100)
  if (k < 30) {
    const s = r.pick(seeds.evm)
    tx = mutateBytes(r, s, rlpHot(s, 1))
  } else if (k < 55) tx = evmStructured(r)
  else if (k < 75) {
    const s = evmValid(r)
    tx = mutateBytes(r, s, rlpHot(s, 1))
  } else if (k < 85) tx = evmValid(r)
  else {
    tx = r.bytes(r.pick([0, 1, 2, r.range(0, 140), r.range(150, 175)]))
    if (tx.length && r.bool(0.7)) tx[0] = 2
  }
  return { evm: { unsigned_tx: hexLayer(r, tx) } }
}

// ───────────────────────────────────────── BTC ─────────────────────────────────────────

interface BtcIn {
  txidLe: Uint8Array
  vout: number
  amount: bigint
  seq: number
}

function varint(n: number, form: 'c' | 'fd' | 'fe' = 'c'): Uint8Array {
  if (form === 'fd' && n <= 0xffff) return Uint8Array.of(0xfd, n & 0xff, n >> 8)
  if (form === 'fe') return concatBytes(Uint8Array.of(0xfe), u32le(n))
  if (n < 0xfd) return Uint8Array.of(n)
  return Uint8Array.of(0xfd, n & 0xff, n >> 8)
}

export function btcOutputs(r: Rng, perturb: boolean): Uint8Array {
  const count = perturb && r.bool(0.2) ? r.pick([0, 17, 18]) : r.pick([1, 1, 2, 2, 3, r.range(1, 16)])
  const parts: Uint8Array[] = []
  let total = 0
  for (let i = 0; i < count; i++) {
    let len = r.pick([0, 1, 22, 22, 34, 34, 25, r.range(0, 80), 252, 253, r.range(254, 520)])
    if (perturb && r.bool(0.05)) len = r.pick([521, 600])
    if (!perturb && total + 11 + len > 1024) len = Math.max(0, Math.min(len, 1024 - total - 11))
    if (!perturb && total + 9 > 1024) break
    const form = perturb && r.bool(0.08) ? r.pick(['fd', 'fe'] as const) : 'c'
    const value = r.bool(0.1) ? 0xffffffffffffffffn : r.bigOfWidth(r.range(0, 8))
    const o = concatBytes(u64le(value), varint(len, form), r.bytes(len))
    parts.push(o)
    total += o.length
  }
  let outs = concatBytes(...parts)
  if (perturb && r.bool(0.05)) outs = concatBytes(outs, r.bytes(r.range(1, 3)))
  if (perturb && r.bool(0.05)) outs = outs.slice(0, Math.max(0, outs.length - r.range(1, 5)))
  return outs
}

function btcPreimages(ins: BtcIn[], outs: Uint8Array, o: { version: number; locktime: number; sighash: number; pkh: Uint8Array }): Uint8Array[] {
  const hp = sha256d(concatBytes(...ins.map((i) => concatBytes(i.txidLe, u32le(i.vout)))))
  const hs = sha256d(concatBytes(...ins.map((i) => u32le(i.seq))))
  const ho = sha256d(outs)
  return ins.map((i) =>
    concatBytes(
      u32le(o.version),
      hp,
      hs,
      i.txidLe,
      u32le(i.vout),
      Uint8Array.of(0x19, 0x76, 0xa9, 0x14),
      o.pkh,
      Uint8Array.of(0x88, 0xac),
      u64le(i.amount),
      u32le(i.seq),
      ho,
      u32le(o.locktime),
      u32le(o.sighash),
    ),
  )
}

/** A complete tx; with `perturb`, one header field / sequence / output rule is broken now and then. */
export function btcTx(r: Rng, perturb: boolean): { pre: Uint8Array[]; outs: Uint8Array } {
  const bad = () => perturb && r.bool(0.08)
  const n = bad() ? r.pick([11, 12]) : r.pick([1, 1, 2, 2, 3, r.range(1, 10)])
  const ins: BtcIn[] = []
  for (let i = 0; i < n; i++) {
    ins.push({
      txidLe: r.bytes(32),
      vout: r.pick([0, 1, r.int(16), r.u32()]),
      amount: r.bigOfWidth(r.range(0, 8)),
      seq: bad() ? r.pick([0, 0xfffffffc, 0xfffffffb, r.u32()]) : r.pick([0xfffffffd, 0xfffffffe, 0xffffffff]),
    })
  }
  const outs = btcOutputs(r, perturb)
  const pre = btcPreimages(ins, outs, {
    version: bad() ? r.pick([1, 3, 0, 0x02000000]) : 2,
    locktime: bad() ? r.pick([1, 0x1000000, r.u32()]) : 0,
    sighash: bad() ? r.pick([0, 2, 3, 0x41, 0x81, 0x82, 0x83, 0x101]) : 1,
    pkh: r.bytes(20),
  })
  return { pre, outs }
}

const PRE_HOT = [0, 1, 3, 4, 35, 36, 67, 68, 99, 100, 103, 104, 105, 106, 107, 108, 127, 128, 129, 130, 137, 138, 139, 141, 142, 173, 174, 177, 178, 179, 181]

function outputsHot(o: Uint8Array): number[] {
  const hot: number[] = []
  let p = 0
  while (p + 8 < o.length && hot.length < 40) {
    hot.push(p + 8, p + 7)
    const f = o[p + 8]!
    const [len, q] = f < 0xfd ? [f, p + 9] : f === 0xfd ? [(o[p + 9] ?? 0) | ((o[p + 10] ?? 0) << 8), p + 11] : [0, p + 9]
    p = q + len
  }
  return hot
}

/** Recompute the three commitments from the current preimages + outputs (when every preimage is 182 B). */
function btcFixup(pre: Uint8Array[], outs: Uint8Array, alignPkh: boolean): void {
  if (pre.length === 0 || pre.some((p) => p.length !== 182)) return
  const hp = sha256d(concatBytes(...pre.map((p) => p.subarray(68, 104))))
  const hs = sha256d(concatBytes(...pre.map((p) => p.subarray(138, 142))))
  const ho = sha256d(outs)
  const pkh = pre[0]!.slice(108, 128)
  for (const p of pre) {
    p.set(hp, 4)
    p.set(hs, 36)
    p.set(ho, 142)
    if (alignPkh) p.set(pkh, 108)
  }
}

export function btcMutate(r: Rng, src: { pre: Uint8Array[]; outs: Uint8Array }, seeds: Seeds): { pre: Uint8Array[]; outs: Uint8Array } {
  let pre: Uint8Array[] = src.pre.map((p) => Uint8Array.from(p))
  let outs: Uint8Array = Uint8Array.from(src.outs)
  for (let k = r.pick([0, 0, 1, 1, 2]); k > 0; k--) {
    const n = pre.length
    const i = r.int(n)
    const j = r.int(n)
    switch (r.int(7)) {
      case 0:
        if (n > 1) [pre[i], pre[j]] = [pre[j]!, pre[i]!]
        break
      case 1:
        if (n) pre.push(Uint8Array.from(pre[i]!))
        break
      case 2:
        if (n) pre.splice(i, 1)
        break
      case 3:
        pre = pre.slice(0, 1)
        break
      case 4:
        while (n && pre.length < r.pick([10, 11])) {
          const c = Uint8Array.from(pre[pre.length - 1]!)
          if (c.length > 100) c[100] = (c[100]! + 1) & 0xff
          pre.push(c)
        }
        break
      case 5:
        if (n) pre[i] = r.bool() ? concatBytes(pre[i]!, Uint8Array.of(r.int(256))) : pre[i]!.slice(0, -1)
        break
      default: {
        const other = r.pick(seeds.btc).pre
        if (n && other.length) pre[i] = Uint8Array.from(r.pick(other))
      }
    }
  }
  for (let k = r.pick([0, 1, 1, 2, 3]); k > 0; k--) {
    if (pre.length === 0 || r.bool(0.33)) outs = mutateBytes(r, outs, outputsHot(outs))
    else {
      const i = r.int(pre.length)
      pre[i] = mutateBytes(r, pre[i]!, PRE_HOT, true)
    }
  }
  if (r.bool()) btcFixup(pre, outs, r.bool())
  return { pre, outs }
}

export function genBtc(r: Rng, seeds: Seeds): SignRequest {
  let c: { pre: Uint8Array[]; outs: Uint8Array }
  const k = r.int(100)
  if (k < 30) c = btcMutate(r, r.pick(seeds.btc), seeds)
  else if (k < 55) c = btcTx(r, true)
  else if (k < 80) c = btcMutate(r, btcTx(r, false), seeds)
  else if (k < 92) c = btcTx(r, false)
  else c = { pre: Array.from({ length: r.range(0, 3) }, () => r.bytes(r.pick([182, 182, 181, 183, 32]))), outs: r.bytes(r.range(0, 60)) }
  const p = r.bool(0.1) ? 0.3 : 0
  return { btc: { preimages: c.pre.map((x) => hexLayer(r, x, p)), outputs: hexLayer(r, c.outs, p) } }
}

// ───────────────────────────────────────── SOL ─────────────────────────────────────────

interface SolIx {
  prog: number
  accounts: number[]
  data: Uint8Array
}

const SYSTEM = new Uint8Array(32)

function shortvec(n: number, nonCanonical: boolean): Uint8Array {
  const c = encodeCompactU16(n)
  if (!nonCanonical) return c
  // redundant trailing zero group: e.g. 0x05 → 0x85 0x00
  if (c.length < 3) return concatBytes(c.subarray(0, -1), Uint8Array.of(c[c.length - 1]! | 0x80, 0))
  return c
}

export function solSerialize(
  h: [number, number, number],
  keys: Uint8Array[],
  blockhash: Uint8Array,
  ixs: SolIx[],
  nc: () => boolean = () => false,
): Uint8Array {
  const parts: Uint8Array[] = [Uint8Array.from(h), shortvec(keys.length, nc()), ...keys, blockhash, shortvec(ixs.length, nc())]
  for (const ix of ixs) parts.push(Uint8Array.of(ix.prog & 0xff), shortvec(ix.accounts.length, nc()), Uint8Array.from(ix.accounts), shortvec(ix.data.length, nc()), ix.data)
  return concatBytes(...parts)
}

/** A legacy message; with `perturb`, one header / key / instruction rule is broken now and then. */
export function solMessage(r: Rng, perturb: boolean): Uint8Array {
  const bad = () => perturb && r.bool(0.07)
  const nk = bad() ? r.pick([0, 1, 17, 18]) : r.range(2, 16)
  const sys = nk > 1 ? r.range(1, nk - 1) : 0
  const keys = Array.from({ length: nk }, (_, i) => (i === sys && !bad() ? SYSTEM : r.bytes(32)))
  const h: [number, number, number] = [bad() ? r.pick([0, 2, 3]) : 1, bad() ? r.pick([1, 2]) : 0, bad() ? r.pick([nk, nk + 1, 255]) : r.int(Math.max(nk, 1))]
  const transfer = (): SolIx => ({
    prog: bad() ? r.pick([0, (sys + 1) % Math.max(nk, 1), nk, 255]) : sys,
    accounts: bad() ? r.pick([[1, 0], [0], [0, 1, 2], [0, nk], []]) : [0, r.int(Math.max(nk, 1))],
    data: bad() ? r.pick([concatBytes(Uint8Array.of(2, 0, 0, 0), r.bytes(r.pick([7, 9, 0]))), concatBytes(Uint8Array.of(3, 0, 0, 0), r.bytes(8)), r.bytes(r.range(0, 20))]) : concatBytes(Uint8Array.of(2, 0, 0, 0), u64le(r.bigOfWidth(r.range(0, 8)))),
  })
  const extra = (): SolIx =>
    r.pick([
      { prog: sys, accounts: [r.int(Math.max(nk, 1)), r.int(Math.max(nk, 1)), 0], data: concatBytes(Uint8Array.of(4, 0, 0, 0), r.bytes(r.range(0, 4))) }, // AdvanceNonceAccount
      { prog: (sys + 1) % Math.max(nk, 1), accounts: [], data: concatBytes(Uint8Array.of(2), r.bytes(4)) }, // e.g. ComputeBudget
      transfer(),
      { prog: r.int(Math.max(nk, 1)), accounts: [0], data: r.bytes(r.range(0, 40)) },
    ])
  let ixs: SolIx[] = [transfer()]
  if (perturb && r.bool(0.15)) {
    ixs = r.bool(0.2) ? [] : [transfer()]
    for (let i = r.range(1, 3); i > 0; i--) ixs.splice(r.int(ixs.length + 1), 0, extra())
  }
  if (perturb && r.bool(0.03)) ixs[0] = { ...ixs[0]!, data: r.bytes(r.range(600, 1100)) } // size boundary
  let m = solSerialize(h, keys, r.bytes(32), ixs, () => perturb && r.bool(0.01))
  if (perturb && r.bool(0.03)) m = concatBytes(m, r.bytes(r.range(1, 3)))
  if (perturb && r.bool(0.03)) m = concatBytes(Uint8Array.of(0x80), m, Uint8Array.of(0)) // v0
  if (perturb && r.bool(0.02)) m = m.slice(0, r.int(m.length))
  return m
}

function solHot(m: Uint8Array): number[] {
  const hot = [0, 1, 2, 3]
  let p = 3
  const sv = (): number => {
    let v = 0
    for (let i = 0; i < 3 && p < m.length; i++) {
      const x = m[p++]!
      v |= (x & 0x7f) << (7 * i)
      if (!(x & 0x80)) break
    }
    return v
  }
  const nk = sv()
  p += 32 * Math.min(nk, 40) + 32
  hot.push(p)
  const nix = sv()
  for (let i = 0; i < Math.min(nix, 8) && p < m.length; i++) {
    hot.push(p++, p)
    p += sv()
    hot.push(p)
    const nd = sv()
    hot.push(p)
    p += nd
  }
  return hot.filter((x) => x < m.length)
}

export function genSol(r: Rng, seeds: Seeds): SignRequest {
  let m: Uint8Array
  const k = r.int(100)
  if (k < 30) {
    const s = r.pick(seeds.sol)
    m = mutateBytes(r, s, solHot(s))
  } else if (k < 55) m = solMessage(r, true)
  else if (k < 78) {
    const s = solMessage(r, false)
    m = mutateBytes(r, s, solHot(s))
  } else if (k < 90) m = solMessage(r, false)
  else {
    m = r.bytes(r.pick([0, 1, 2, 3, r.range(0, 300), r.range(1225, 1240)]))
    if (m.length > 3 && r.bool(0.7)) {
      m[0] = 1
      m[1] = 0
      m[2] = r.int(4)
      m[3] = r.int(18)
    }
  }
  return { sol: { message: hexLayer(r, m) } }
}

// ───────────────────────────────────────── messages (C7) ─────────────────────────────────────────

const SCRIPTS = ['Sign in to example.org', 'Nonce: 8f2c41', 'Grüße', '✓', '🎒', '日本語', 'مرحبا', '\n', '\t', ' ', '~', '\u0000', 'é']

/** A message body: seeds mutated, random UTF-8 text, raw bytes (often invalid UTF-8), and the length boundaries. */
export function msgBody(r: Rng, seeds: Seeds): Uint8Array {
  const k = r.int(100)
  if (k < 30 && seeds.msg.length) {
    const s = r.pick(seeds.msg).m
    return mutateBytes(r, s, [0, s.length >> 1, Math.max(s.length - 1, 0)])
  }
  if (k < 60) {
    let t = ''
    const n = r.range(1, 40)
    for (let i = 0; i < n; i++) t += r.pick(SCRIPTS)
    return utf8(t)
  }
  if (k < 75) return r.bytes(r.pick([0, 1, 2, 3, r.range(0, 64)]))
  const len = r.pick([0, 1, 1023, 1024, 1025, r.range(1000, 1100)])
  const fill = r.pick([0x61, 0x7e, 0x20, 0x0a, 0xff])
  const b = new Uint8Array(len).fill(fill)
  if (r.bool(0.2) && len) b[r.int(len)] = 0xc3 // a dangling UTF-8 lead byte
  return b
}

export function genMsg(r: Rng, seeds: Seeds): SignRequest {
  const m = msgBody(r, seeds)
  const message = hexLayer(r, m, 0.05)
  return r.bool() ? { evm_message: { message } } : { sol_message: { message } }
}

// ───────────────────────────────────────── verdicts ─────────────────────────────────────────

export function verdictOf(req: SignRequest): Case {
  try {
    const res = classifySignRequest(req)
    if (!res.ok) return { r: req, v: res.error }
    const h = res.recordPayloads.map(toHex)
    if (res.chain === 'evm') {
      const e = res.fields.erc20
      const f: Record<string, unknown> = { chain_id: res.fields.chainId.toString(), nonce: res.fields.nonce.toString() }
      if (e) f.erc20 = { token: e.token.slice(2), to: e.to.slice(2), amount: e.amount.toString() }
      return { r: req, v: 'ok', h, f }
    }
    if (res.chain === 'evm_message' || res.chain === 'sol_message') return { r: req, v: 'ok', h, f: { message: toHex(res.fields.message) } }
    if (res.chain === 'btc')
      return {
        r: req,
        v: 'ok',
        h,
        f: { inputs: res.fields.inputs.map((i) => ({ txid: i.txid, vout: i.vout, amount_sats: i.amountSats.toString() })) },
      }
    return { r: req, v: 'ok', h, f: { recent_blockhash: toHex(res.fields.recentBlockhash), lamports: res.fields.lamports.toString() } }
  } catch (e) {
    return { r: req, v: `THROW:${(e as Error)?.message ?? String(e)}` }
  }
}

export const GENERATORS: Record<Chain, (r: Rng, s: Seeds) => SignRequest> = { evm: genEvm, btc: genBtc, sol: genSol, msg: genMsg }

/** Deterministic corpus: `n` cases for `chain` from `seed`. */
export function* corpus(chain: Chain, n: number, seed: number, seeds: Seeds = loadSeeds()): Generator<Case> {
  const r = new Rng(seed ^ { evm: 0x1000, btc: 0x2000, sol: 0x3000, msg: 0x4000 }[chain])
  for (let i = 0; i < n; i++) yield verdictOf(GENERATORS[chain](r, seeds))
}

// the generator's own table must equal the classifier's allowlist (else "valid" builds would be refused)
for (const [c, t] of CHAINS) if (EVM_TOKEN_ALLOWLIST[c.toString()] !== `0x${t}`) throw new Error(`fuzz CHAINS table out of date for ${c}`)
