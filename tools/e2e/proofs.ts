/**
 * The live proof set (docs/evidence/): performs every Satchel action once on a contract and writes
 * docs/evidence/proofs.json, which `tools/proofs.sh` then verifies read-only. Dry run by default, like every script
 * here: without `--send` it prints each step's transaction and stops. Testnet only.
 *
 *   pnpm --filter @satchel/tools e2e:proofs                                   # dry run on the dev contract
 *   pnpm --filter @satchel/tools e2e:proofs --contract <id> --send --yes      # make the whole set, write proofs.json
 *   pnpm --filter @satchel/tools e2e:proofs --use btc-send=<hash> --send      # adopt an earlier tx for one proof
 *   pnpm --filter @satchel/tools e2e:proofs --only buy-usdc --merge --send    # add one proof to an existing file
 *
 * Fresh Satchels are minted for everything that changes hands or gets listed (the gift/sale Satchel, the USDC and
 * inside Satchel, the BTC multi-input Satchel), so demo Satchels are never sold or drained. Chain sends come from
 * `--chain-token` (default 1), which must be funded on Sepolia, testnet4 and devnet; they go into the gift/sale
 * Satchel, which is left listed (for sale, clean history) at the end. Every entry is built from the transaction as
 * the FastNEAR tx API serves it, the same source the verifier reads.
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { keccak256, parseTransaction, serializeTransaction, type Hex } from 'viem'
import { base58 } from '@scure/base'
import { deriveSatchelAddresses } from '@satchel/core/derive'
import { btcTxFromPreimages, buildBtcSend, type Utxo } from '@satchel/core/chains/btc'
import {
  acceptOfferCall,
  cancelOfferCall,
  depositNearCall,
  evmMessageSignRequest,
  ftDepositCall,
  makeOfferCall,
  prepayStorageCall,
  revokeAllowanceCall,
  setAllowanceCall,
  solMessageSignRequest,
  withdrawFtCall,
  withdrawNearCall,
  WNEAR_TESTNET,
  type MarketCall,
  type SignRequest,
} from '@satchel/core/near'
import { roleOfContract } from '../lib/config'
import { banner, bool, executePlan, isMain, makeCtx, parseCli, runMain, str, type Ctx, type Sent } from '../lib/run'
import { functionCall, type TxPlan } from '../lib/tx'
import { TGAS, parseNear } from '../lib/units'
import { HELP_COMMON, readSatchel, signaturesFrom, signForPlan, waitForHeight } from './common'
import { buyNearPlan, buyUsdcPlan, delistPlan, directFtOnTransferPlan, listPlan, mintPlan, transferPlan } from './plans'

const HERE = dirname(fileURLToPath(import.meta.url))
const DEFAULT_OUT = resolve(HERE, '..', '..', 'docs', 'evidence', 'proofs.json')

const OPTIONS = {
  out: { type: 'string' },
  only: { type: 'string' },
  skip: { type: 'string' },
  use: { type: 'string', multiple: true },
  merge: { type: 'boolean', default: false },
  'chain-token': { type: 'string', default: '1' },
  'sale-price': { type: 'string', default: '0.05' },
  'usdc-price': { type: 'string', default: '10000' },
  note: { type: 'string' },
  render: { type: 'boolean', default: false },
  tokens: { type: 'string' },
} as const

const HELP = `tools/e2e/proofs.ts: make the live proof set on a contract and write docs/evidence/proofs.json.
  --out <file>          default docs/evidence/proofs.json
  --only <ids>          comma list of proof ids to make (the others are left out, or kept with --merge)
  --skip <ids>          comma list of proof ids to leave out
  --use <id>=<hash>     adopt an existing NEAR tx as that proof instead of sending a new one (repeatable, or comma list)
  --merge               keep the entries already in --out for proofs not made in this run
  --chain-token <id>    the funded Satchel the chain sends come from (default 1; owner signs)
  --sale-price <NEAR>   NEAR listing price (default 0.05)    --usdc-price <base units> (default 10000 = 0.01 USDC)
  --note <text>         a note stored in proofs.json
  --tokens <role=id,…>  reuse Satchels minted by an earlier run (roles: sale, inside, btc), e.g. sale=5,inside=6
  --render              only rewrite the table in docs/evidence/README.md from --out (no network, signs nothing)
Proof ids: ${'${ids}'}
${HELP_COMMON}`

// ---------------------------------------------------------------------------------------------------- the entries

export type Chain = 'sepolia' | 'bitcoin-testnet4' | 'solana-devnet'
export type SigKind = 'evm_tx' | 'evm_message' | 'btc_tx' | 'sol_tx' | 'sol_message'
export interface EventSpec {
  event: string
  data?: Record<string, unknown>
}
export interface ProofEntry {
  id: string
  group: string
  action: string
  shows: string
  token_id?: string
  tx: string
  signer: string
  receiver: string
  method: string
  args?: Record<string, unknown>
  block_height?: number
  date?: string
  expect: { outcome: 'success' } | { outcome: 'failure'; error: string }
  events?: EventSpec[]
  absent_events?: string[]
  signature?: { chain: 'evm' | 'btc' | 'sol'; kind: SigKind; path: string; address: string; message_text?: string; chain_id?: number }
  external?: { chain: Chain; tx: string; explorer: string; from: string; nonce?: number; status: 'confirmed' | 'broadcast'; spends?: string[] }
  explorer: string
  note?: string
}
export interface ProofsDoc {
  schema: 'satchel-proofs/1'
  network: 'testnet'
  contract: string
  contract_role: string
  note: string
  generated_at: string
  app_clean_history?: string[]
  satchels: Record<string, { evm: string; btc: string; sol: string }>
  proofs: ProofEntry[]
}

/** A NEAR tx as the FastNEAR tx API serves it, reduced to what the entries need (same reading as tools/lib/proofs.py). */
export interface NearTxView {
  hash: string
  signer: string
  receiver: string
  method: string | null
  args: Record<string, unknown> | null
  height: number
  timestampNs: string | null
  final: unknown
  failures: string[]
  events: { standard: string; event: string; data: unknown }[]
  successValues: { executor: string; value: unknown }[]
}

interface FastnearTx {
  transaction: { hash: string; signer_id: string; receiver_id: string; actions: unknown[] }
  execution_outcome: { block_height: number; block_timestamp?: number | string; outcome: { status: unknown } }
  receipts: { receipt: { receipt_id: string }; execution_outcome: { id?: string; outcome: { executor_id: string; status: unknown; logs: string[] } } }[]
}

export function readFastnearTx(t: FastnearTx): NearTxView {
  const receipts = t.receipts.map((r) => ({ id: r.execution_outcome.id ?? r.receipt.receipt_id, executor: r.execution_outcome.outcome.executor_id, status: r.execution_outcome.outcome.status, logs: r.execution_outcome.outcome.logs }))
  const byId = new Map(receipts.map((r) => [r.id, r]))
  let status: unknown = t.execution_outcome.outcome.status
  const seen = new Set<string>()
  for (;;) {
    const next = status && typeof status === 'object' && 'SuccessReceiptId' in status ? (status as { SuccessReceiptId: string }).SuccessReceiptId : null
    if (!next || seen.has(next) || !byId.has(next)) break
    seen.add(next)
    status = byId.get(next)!.status
  }
  const fc = t.transaction.actions.map((a) => (a && typeof a === 'object' && 'FunctionCall' in a ? (a as { FunctionCall: { method_name: string; args: string } }).FunctionCall : null)).find(Boolean) ?? null
  let args: Record<string, unknown> | null = null
  try {
    args = fc ? (JSON.parse(Buffer.from(fc.args, 'base64').toString('utf8')) as Record<string, unknown>) : null
  } catch {
    args = null
  }
  const events: NearTxView['events'] = []
  const successValues: NearTxView['successValues'] = []
  const failures: string[] = []
  for (const r of receipts) {
    for (const l of r.logs) {
      if (!l.startsWith('EVENT_JSON:')) continue
      try {
        events.push(JSON.parse(l.slice('EVENT_JSON:'.length)))
      } catch {
        /* not an event */
      }
    }
    const s = r.status as Record<string, unknown>
    if (s && typeof s === 'object' && 'Failure' in s) failures.push(JSON.stringify(s.Failure))
    if (s && typeof s === 'object' && typeof s.SuccessValue === 'string' && s.SuccessValue) {
      try {
        successValues.push({ executor: r.executor, value: JSON.parse(Buffer.from(s.SuccessValue, 'base64').toString('utf8')) })
      } catch {
        /* not JSON */
      }
    }
  }
  const first = t.execution_outcome.outcome.status as Record<string, unknown>
  if (first && typeof first === 'object' && 'Failure' in first) failures.push(JSON.stringify(first.Failure))
  return {
    hash: t.transaction.hash,
    signer: t.transaction.signer_id,
    receiver: t.transaction.receiver_id,
    method: fc?.method_name ?? null,
    args,
    height: t.execution_outcome.block_height,
    timestampNs: t.execution_outcome.block_timestamp !== undefined ? String(t.execution_outcome.block_timestamp) : null,
    final: status,
    failures,
    events,
    successValues,
  }
}

export const errorCodesOf = (t: NearTxView): string[] => [...new Set(t.failures.flatMap((f) => f.match(/ERR_[A-Z0-9_]+/g) ?? []))]
export const succeeded = (t: NearTxView): boolean => !!t.final && typeof t.final === 'object' && 'SuccessValue' in (t.final as object) && errorCodesOf(t).length === 0

export function findEvent(t: NearTxView, name: string): { data: Record<string, unknown> } | null {
  const [standard, event] = name.split(':')
  const e = t.events.find((x) => x.standard === standard && x.event === event)
  if (!e) return null
  const d = standard === 'nep171' && Array.isArray(e.data) ? e.data[0] : e.data
  return { data: (d ?? {}) as Record<string, unknown> }
}

/** The signatures on_signed returned (the contract's last JSON-array SuccessValue). */
export function mpcSignatures(t: NearTxView, contract: string): (Record<string, unknown> | null)[] | null {
  const v = [...t.successValues].reverse().find((s) => s.executor === contract && Array.isArray(s.value))
  return (v?.value as (Record<string, unknown> | null)[]) ?? null
}

/** The chain tx a signed record becomes: EVM hash, BTC txid, or the Solana tx id (its first signature). */
export function externalTxOf(kind: SigKind, ev: Record<string, unknown>, sigs: Record<string, unknown>[]): { tx: string; nonce?: number } | null {
  const pre = (ev.preimages as string[])[0]!
  if (kind === 'evm_tx') {
    const tx = parseTransaction(`0x${pre}` as Hex)
    const s = sigs[0] as { big_r: { affine_point: string }; s: { scalar: string }; recovery_id: number }
    const signed = serializeTransaction(tx, { r: `0x${s.big_r.affine_point.slice(2)}` as Hex, s: `0x${s.s.scalar}` as Hex, yParity: s.recovery_id })
    return { tx: keccak256(signed), nonce: Number(tx.nonce ?? 0) }
  }
  if (kind === 'btc_tx') return { tx: btcTxFromPreimages(ev.preimages as string[], ev.btc_outputs as string).txid }
  if (kind === 'sol_tx') return { tx: base58.encode(Uint8Array.from((sigs[0] as { signature: number[] }).signature)) }
  return null
}

const EXPLORER: Record<Chain, (tx: string) => string> = {
  sepolia: (h) => `https://sepolia.etherscan.io/tx/${h}`,
  'bitcoin-testnet4': (h) => `https://mempool.space/testnet4/tx/${h}`,
  'solana-devnet': (h) => `https://explorer.solana.com/tx/${h}?cluster=devnet`,
}
export const nearExplorer = (h: string) => `https://testnet.nearblocks.io/txns/${h}`

// ---------------------------------------------------------------------------------------------------- the steps

interface StepSpec {
  id: string
  group: string
  action: string
  /** plain English: what the proof shows */
  shows: string
  method: string
  /** 'contract' (default), 'usdc' or 'wnear' */
  receiver?: 'contract' | 'usdc' | 'wnear'
  expect?: { outcome: 'success' } | { outcome: 'failure'; error: string }
  /** events that must appear, with the data keys copied from the actual event into the entry */
  events?: [string, string[]][]
  absent?: string[]
  sig?: SigKind
  external?: Chain
  /** the args keys recorded (and checked by the verifier) */
  argKeys?: string[]
  note?: string
  /** performs the step in send mode and returns the proof tx hash; null = skipped (reason logged) */
  run: (r: Runner) => Promise<string | null>
}

const SIGN_EVENTS: [string, string[]][] = [
  ['satchel:sign_requested', ['token_id', 'owner_id', 'chain', 'path', 'first_seq', 'count']],
  ['satchel:sign_resolved', ['token_id', 'first_seq', 'statuses']],
]
const NO_SIGN = ['satchel:sign_requested']

type TokenRole = 'sale' | 'inside' | 'btc'

class Runner {
  tokens: Partial<Record<TokenRole, string>> = {}
  timeouts: string[] = []
  nextId: number | null = null
  constructor(
    readonly ctx: Ctx,
    readonly opts: { chainToken: string; salePrice: bigint; usdcPrice: bigint },
  ) {}

  get cfg() {
    return this.ctx.cfg
  }
  get c() {
    return this.ctx.cfg.contract
  }
  get alice() {
    return this.cfg.personas.alice
  }
  get bob() {
    return this.cfg.personas.bob
  }
  get carol() {
    return this.cfg.personas.carol
  }
  addr(token: string) {
    return deriveSatchelAddresses(this.cfg.network, this.c, token)
  }

  /** Send one plan; returns the tx (failed txs too: a refusal proof is a failed tx). Throws in a dry run (handled). */
  async send(plan: TxPlan): Promise<Sent> {
    const sent = await executePlan(this.ctx, plan)
    if (!sent) throw new DryRun()
    return sent
  }

  async sendCall(title: string, signer: string, mc: MarketCall): Promise<Sent> {
    return this.send({ title, signerId: signer, receiverId: mc.receiverId, actions: [functionCall(mc.params.methodName, mc.params.args, BigInt(mc.params.gas), BigInt(mc.params.deposit))] })
  }

  async mustSucceed(plan: TxPlan): Promise<Sent> {
    const s = await this.send(plan)
    if (!s.ok) throw new Error(`${plan.title} failed: ${s.errors.join(', ') || 'see the tx'}`)
    return s
  }

  /** sign_for with patience: the testnet MPC times out about one request in four, so retry up to 4 times. */
  async sign(owner: string, token: string, request: SignRequest, title: string): Promise<string> {
    for (let attempt = 1; attempt <= 4; attempt++) {
      const s = await this.send(signForPlan(this.cfg, owner, token, request, title))
      if (!s.ok) throw new Error(`${title} failed: ${s.errors.join(', ')}`)
      try {
        signaturesFrom(s, 1)
        return s.hash
      } catch (e) {
        this.timeouts.push(s.hash)
        this.ctx.log(`    retry     attempt ${attempt}: ${(e as Error).message} (tx ${s.hash} stays recorded)`)
      }
    }
    throw new Error(`${title}: the MPC did not sign after 4 attempts`)
  }

  async view<T>(method: string, args: Record<string, unknown> = {}, contract = this.c): Promise<T> {
    return this.ctx.rpc.view<T>(contract, method, args)
  }

  /** A fresh Satchel for one role, minted on first use (alice pays and receives). */
  async token(role: TokenRole): Promise<string> {
    if (this.tokens[role]) return this.tokens[role]!
    if (!this.ctx.send) {
      // dry run: predict the ids the mints would get, without printing a mint for every step
      if (this.nextId === null) this.nextId = this.ctx.offline ? 1 : ((await this.view<{ next_token_id: number }>('config').catch(() => null))?.next_token_id ?? 1)
      this.tokens[role] = String(this.nextId++)
      this.ctx.log(`    token     ${role} Satchel = #${this.tokens[role]} (predicted; a dry run mints nothing)`)
      return this.tokens[role]!
    }
    const s = await this.mustSucceed(mintPlan(this.cfg, this.alice, this.alice))
    const id = mintedId(s)
    this.tokens[role] = id
    this.ctx.log(`    token     ${role} Satchel = #${id}`)
    return id
  }

  async satchel(token: string) {
    for (let i = 0; i < (this.ctx.send ? 5 : 1); i++) {
      const s = await readSatchel(this.ctx, token)
      if (s) return s
      await sleep(2000)
    }
    throw new Error(`satchel(${token}) unreadable`)
  }

  async waitListable(token: string): Promise<void> {
    if (!this.ctx.send) return
    const s = await this.satchel(token)
    if (s.listable_at > 0) await waitForHeight(this.ctx, s.listable_at + 2)
  }

  /** Run another e2e script in send mode and return the NEAR tx hashes it printed. */
  async script(name: string, args: string[]): Promise<string[]> {
    // --send (and the --yes standing approval) are passed on only when this run itself is in send mode
    if (this.ctx.send && !this.ctx.yes) throw new Error(`e2e/${name}.ts runs as a child process and cannot prompt: pass --yes (standing testnet approval H-20 b) or adopt the step with --use`)
    const common = ['--contract', this.c, '--team', this.cfg.team, ...scriptModeFlags(this.ctx)]
    const out = await runScript(join(HERE, `${name}.ts`), [...args, ...common], this.ctx.log)
    if (!this.ctx.send) throw new DryRun()
    if (out.code !== 0) throw new Error(`e2e/${name}.ts exited ${out.code}`)
    return out.hashes
  }
}

/** The mode flags a child script gets: the parent's own (dry run stays a dry run). */
export function scriptModeFlags(ctx: Pick<Ctx, 'send' | 'yes' | 'offline'>): string[] {
  if (!ctx.send) return ctx.offline ? ['--offline'] : []
  return ctx.yes ? ['--send', '--yes'] : ['--send']
}

class DryRun extends Error {
  constructor() {
    super('dry run')
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function mintedId(s: Sent): string {
  for (const r of s.outcome.receipts_outcome ?? []) {
    for (const l of r.outcome.logs) {
      if (!l.startsWith('EVENT_JSON:')) continue
      const e = JSON.parse(l.slice(11)) as { event: string; data: { token_ids: string[] }[] }
      if (e.event === 'nft_mint') return e.data[0]!.token_ids[0]!
    }
  }
  throw new Error('no nft_mint event')
}

/** Spawn `tsx <file> …`, tee its output, collect the `tx hash` lines (lib/run.ts prints one per signed tx). */
export function runScript(file: string, args: string[], log: (s: string) => void): Promise<{ code: number; hashes: string[] }> {
  const tsx = join(HERE, '..', 'node_modules', '.bin', 'tsx')
  return new Promise((res) => {
    const p = spawn(existsSync(tsx) ? tsx : 'tsx', [file, ...args], { stdio: ['ignore', 'pipe', 'pipe'] })
    const hashes: string[] = []
    let buf = ''
    const onData = (d: Buffer) => {
      buf += d.toString()
      let i
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i)
        buf = buf.slice(i + 1)
        log(`      | ${line}`)
        const m = /^\s+tx hash\s+(\S+)/.exec(line)
        if (m) hashes.push(m[1]!)
      }
    }
    p.stdout.on('data', onData)
    p.stderr.on('data', onData)
    p.on('close', (code) => res({ code: code ?? 1, hashes }))
  })
}

async function evmPendingNonce(rpcs: readonly string[], address: string): Promise<number> {
  for (const url of rpcs) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getTransactionCount', params: [address, 'pending'] }) })
      const j = (await r.json()) as { result?: string }
      if (j.result) return Number(BigInt(j.result))
    } catch {
      /* next */
    }
  }
  throw new Error(`no Sepolia RPC answered the nonce of ${address}`)
}

/** An EVM send through e2e/evm.ts, retried with the same nonce when the MPC times out (§8.7). */
async function evmSend(r: Runner, extra: string[]): Promise<string> {
  const from = r.addr(r.opts.chainToken).evm
  const nonce = r.ctx.offline ? 0 : await evmPendingNonce(r.cfg.sepoliaRpcs, from)
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const hashes = await r.script('evm', ['--token', r.opts.chainToken, '--nonce', String(nonce), ...extra])
      return hashes[hashes.length - 1]!
    } catch (e) {
      if (e instanceof DryRun) throw e
      r.ctx.log(`    retry     EVM attempt ${attempt} failed (${(e as Error).message}); same nonce ${nonce}`)
    }
  }
  throw new Error('EVM send failed 4 times')
}

async function retryScript(r: Runner, name: string, args: string[], tries = 4): Promise<string[]> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await r.script(name, args)
    } catch (e) {
      if (e instanceof DryRun || attempt >= tries) throw e
      r.ctx.log(`    retry     ${name} attempt ${attempt} failed (${(e as Error).message})`)
    }
  }
}

const msgText = (r: Runner, token: string, what: string) => `Satchel proof on ${r.c}: #${token} ${what}`

export const STEPS: StepSpec[] = [
  // ── a fresh Satchel, given away ──
  {
    id: 'mint', group: 'Own', action: 'Mint a Satchel', method: 'nft_mint',
    shows: 'A new Satchel is minted to its first owner. Its three addresses exist from this moment.',
    events: [['nep171:nft_mint', ['owner_id', 'token_ids']]], argKeys: ['receiver_id'],
    run: async (r) => {
      if (!r.ctx.send) {
        await r.token('sale')
        await executePlan(r.ctx, mintPlan(r.cfg, r.alice, r.alice))
        throw new DryRun()
      }
      const s = await r.mustSucceed(mintPlan(r.cfg, r.alice, r.alice))
      r.tokens.sale = mintedId(s)
      return s.hash
    },
  },
  {
    id: 'gift', group: 'Own', action: 'Give a Satchel (nft_transfer)', method: 'nft_transfer',
    shows: 'The owner gives the Satchel away. Control of every coin inside moves with the NFT in one NEAR transaction.',
    events: [['nep171:nft_transfer', ['old_owner_id', 'new_owner_id', 'token_ids']]], argKeys: ['token_id', 'receiver_id'],
    run: async (r) => (await r.mustSucceed(transferPlan(r.cfg, r.alice, await r.token('sale'), r.bob))).hash,
  },
  {
    id: 'sign-not-owner', group: 'Refusals', action: 'A stranger asks the Satchel to sign', method: 'sign_for',
    shows: 'Someone who does not own the Satchel calls sign_for. The contract refuses before anything is recorded or sent to the MPC.',
    expect: { outcome: 'failure', error: 'ERR_NOT_OWNER' }, absent: NO_SIGN, argKeys: ['token_id'],
    run: async (r) => {
      const t = await r.token('sale')
      return (await r.send(signForPlan(r.cfg, r.carol, t, evmMessageSignRequest(msgText(r, t, 'stranger')), `sign_for #${t} by a stranger`))).hash
    },
  },
  {
    id: 'evm-message', group: 'Sign', action: 'Sign an EIP-191 message', method: 'sign_for', sig: 'evm_message',
    shows: 'The owner signs a plain-text message with the Satchel\'s EVM key. The signature recovers to the Satchel\'s EVM address.',
    events: SIGN_EVENTS, argKeys: ['token_id'],
    run: async (r) => {
      const t = await r.token('sale')
      return r.sign(r.bob, t, evmMessageSignRequest(msgText(r, t, 'EIP-191 message')), `sign_for #${t} evm_message`)
    },
  },
  {
    id: 'sol-message', group: 'Sign', action: 'Sign a Solana off-chain message', method: 'sign_for', sig: 'sol_message',
    shows: 'The owner signs a Solana off-chain message. The ed25519 signature verifies against the Satchel\'s SOL address.',
    events: SIGN_EVENTS, argKeys: ['token_id'],
    run: async (r) => {
      const t = await r.token('sale')
      return r.sign(r.bob, t, solMessageSignRequest(msgText(r, t, 'Solana message')), `sign_for #${t} sol_message`)
    },
  },
  {
    id: 'list-quiet', group: 'Refusals', action: 'List right after signing (quiet period)', method: 'list',
    shows: 'A Satchel cannot be listed until 250 blocks after its last signature, so nothing can still be in flight when it goes on sale.',
    expect: { outcome: 'failure', error: 'ERR_QUIET_PERIOD' }, absent: ['satchel:listed'], argKeys: ['token_id'],
    run: async (r) => (await r.send(listPlan(r.cfg, r.bob, await r.token('sale'), r.opts.salePrice, 'near'))).hash,
  },
  // ── coins move on other chains ──
  {
    id: 'evm-send', group: 'Send', action: 'Send ETH on Sepolia', method: 'sign_for', sig: 'evm_tx', external: 'sepolia',
    shows: 'The contract parses the unsigned Sepolia transaction, hashes it itself, records it, and the MPC signs it. The same signature is the one on Sepolia.',
    events: SIGN_EVENTS, argKeys: ['token_id'],
    run: async (r) => evmSend(r, ['--to', r.addr(await r.token('sale')).evm, '--value', '0.001']),
  },
  {
    id: 'usdc-send', group: 'Send', action: 'Send USDC on Sepolia', method: 'sign_for', sig: 'evm_tx', external: 'sepolia',
    shows: 'An ERC-20 USDC transfer, signed the same way. The record shows the token, the recipient and the amount.',
    events: SIGN_EVENTS, argKeys: ['token_id'],
    run: async (r) => evmSend(r, ['--usdc', '--to', r.addr(await r.token('sale')).evm, '--amount', '1']),
  },
  {
    id: 'btc-send', group: 'Send', action: 'Send BTC on testnet4', method: 'sign_for', sig: 'btc_tx', external: 'bitcoin-testnet4',
    shows: 'One sign_for carries the BIP 143 preimage. The contract hashes it, and the MPC signature is the one in the Bitcoin transaction\'s witness.',
    events: SIGN_EVENTS, argKeys: ['token_id'],
    run: async (r) => {
      const h = await retryScript(r, 'btc', ['--token', r.opts.chainToken, '--inputs', '1', '--to', r.addr(await r.token('sale')).btc, '--amount', '10000'])
      return h[h.length - 1]!
    },
  },
  {
    id: 'sol-send', group: 'Send', action: 'Send SOL on devnet', method: 'sign_for', sig: 'sol_tx', external: 'solana-devnet',
    shows: 'A Solana System transfer. The ed25519 signature the MPC returns is the Solana transaction id.',
    events: SIGN_EVENTS, argKeys: ['token_id'],
    run: async (r) => {
      const h = await retryScript(r, 'sol', ['--token', r.opts.chainToken, '--to', r.addr(await r.token('sale')).sol, '--lamports', '1000000'])
      return h[h.length - 1]!
    },
  },
  {
    id: 'evm-l2-sign', group: 'Send', action: 'Sign an Arbitrum Sepolia transaction', method: 'sign_for', sig: 'evm_tx',
    shows: 'The same EVM key signs for another testnet (chain id 421614). Signed only, not broadcast.',
    events: SIGN_EVENTS, argKeys: ['token_id'], note: 'signed only (the address holds no Arbitrum Sepolia ETH); the record stays unused until that nonce is spent',
    run: async (r) => {
      const h = await retryScript(r, 'evm', ['--token', r.opts.chainToken, '--chain-id', '421614', '--sign-only', '--to', r.addr(await r.token('sale')).evm, '--value', '0.0001', '--gas', '21000'])
      return h[h.length - 1]!
    },
  },
  // ── money inside, and a USDC listing ──
  {
    id: 'inside-deposit', group: 'Inside', action: 'Put NEAR inside a Satchel', method: 'deposit_near',
    shows: 'NEAR is held inside the Satchel by the contract. Whoever owns the Satchel owns it.',
    events: [['satchel:inside_deposit', ['token_id', 'sender_id', 'amount']]], argKeys: ['token_id'],
    run: async (r) => (await r.sendCall('deposit_near', r.alice, depositNearCall(r.c, await r.token('inside'), parseNear('0.02')))).hash,
  },
  {
    id: 'withdraw-bad-receiver', group: 'Refusals', action: 'Withdraw inside NEAR to the MPC account', method: 'withdraw_near',
    shows: 'A withdrawal to an account that would strand the money (the contract, the MPC, USDC) is refused.',
    expect: { outcome: 'failure', error: 'ERR_BAD_RECEIVER' }, absent: ['satchel:inside_withdraw'], argKeys: ['token_id', 'receiver_id'],
    run: async (r) => (await r.sendCall('withdraw_near to the MPC', r.alice, withdrawNearCall(r.c, await r.token('inside'), parseNear('0.005'), r.cfg.mpc))).hash,
  },
  {
    id: 'inside-withdraw', group: 'Inside', action: 'Take NEAR out of a Satchel', method: 'withdraw_near',
    shows: 'The owner takes NEAR out. The inside epoch goes up, so any offer priced on the old contents goes stale.',
    events: [['satchel:inside_withdraw', ['token_id', 'owner_id', 'receiver_id', 'amount']], ['satchel:inside_withdraw_resolved', ['token_id', 'ok']]], argKeys: ['token_id', 'amount'],
    run: async (r) => (await r.sendCall('withdraw_near', r.alice, withdrawNearCall(r.c, await r.token('inside'), parseNear('0.01')))).hash,
  },
  {
    id: 'wnear-deposit', group: 'Inside', action: 'Put wNEAR inside a Satchel', method: 'ft_transfer_call', receiver: 'wnear',
    shows: 'A NEP-141 token (wNEAR) is sent into the Satchel with ft_transfer_call and the message {"deposit": id}.',
    events: [['satchel:inside_deposit', ['token_id', 'sender_id', 'ft', 'amount']]], argKeys: ['receiver_id', 'amount', 'msg'],
    run: async (r) => {
      const t = await r.token('inside')
      const amount = parseNear('0.01')
      const reg = await r.view<unknown>('storage_balance_of', { account_id: r.alice }, WNEAR_TESTNET).catch(() => null)
      if (!reg) await r.mustSucceed({ title: 'wrap.storage_deposit', signerId: r.alice, receiverId: WNEAR_TESTNET, actions: [functionCall('storage_deposit', { account_id: r.alice, registration_only: true }, 30n * TGAS, 1_250_000_000_000_000_000_000n)] })
      await r.mustSucceed({ title: 'wrap.near_deposit', signerId: r.alice, receiverId: WNEAR_TESTNET, actions: [functionCall('near_deposit', {}, 30n * TGAS, amount)] })
      const credit = prepayStorageCall(r.c)
      await r.mustSucceed({ title: 'prepay_storage', signerId: r.alice, receiverId: credit.receiverId, actions: [functionCall(credit.params.methodName, credit.params.args, BigInt(credit.params.gas), BigInt(credit.params.deposit))] })
      return (await r.sendCall('wNEAR ft_transfer_call deposit', r.alice, ftDepositCall(WNEAR_TESTNET, r.c, t, amount))).hash
    },
  },
  {
    id: 'wnear-withdraw', group: 'Inside', action: 'Take wNEAR out of a Satchel', method: 'withdraw_ft',
    shows: 'The owner takes the wNEAR out again.',
    events: [['satchel:inside_withdraw', ['token_id', 'owner_id', 'ft', 'amount']], ['satchel:inside_withdraw_resolved', ['token_id', 'ok']]], argKeys: ['token_id', 'ft', 'amount'],
    run: async (r) => (await r.sendCall('withdraw_ft wNEAR', r.alice, withdrawFtCall(r.c, await r.token('inside'), WNEAR_TESTNET, parseNear('0.01')))).hash,
  },
  {
    id: 'list-usdc', group: 'Sell', action: 'List a Satchel for USDC', method: 'list',
    shows: 'The owner lists the Satchel priced in USDC. The listing records the signature count it was listed at.',
    events: [['satchel:listed', ['token_id', 'listing_id', 'seller_id', 'price', 'currency', 'sig_count']]], argKeys: ['token_id', 'price', 'currency'],
    run: async (r) => (await r.mustSucceed(listPlan(r.cfg, r.alice, await r.token('inside'), r.opts.usdcPrice, 'usdc'))).hash,
  },
  {
    id: 'usdc-fake-payment', group: 'Refusals', action: 'Fake a USDC payment (call ft_on_transfer directly)', method: 'ft_on_transfer',
    shows: 'Only the USDC contract can pay for a USDC listing. Calling ft_on_transfer yourself, with no USDC behind it, is refused.',
    expect: { outcome: 'failure', error: 'ERR_WRONG_TOKEN' }, absent: ['satchel:sold', 'nep171:nft_transfer'], argKeys: ['sender_id', 'amount'],
    run: async (r) => {
      const t = await r.token('inside')
      const s = await r.satchel(t)
      if (!s.listing) throw new Error(`#${t} is not listed`)
      return (await r.send(directFtOnTransferPlan(r.cfg, r.bob, { tokenId: t, listingId: s.listing.id, expectedSigCount: s.sig_count }, r.opts.usdcPrice))).hash
    },
  },
  {
    id: 'buy-usdc', group: 'Sell', action: 'Buy a Satchel with USDC (ft_transfer_call)', method: 'ft_transfer_call', receiver: 'usdc',
    shows: 'The buyer pays with USDC through ft_transfer_call, bound to the listing id and the signature count. The NFT and the payout move in one receipt.',
    events: [['nep171:nft_transfer', ['old_owner_id', 'new_owner_id', 'token_ids']], ['satchel:sold', ['token_id', 'listing_id', 'seller_id', 'buyer_id', 'price', 'currency']]], argKeys: ['receiver_id', 'amount', 'msg'],
    run: async (r) => {
      const t = await r.token('inside')
      const bal = BigInt(await r.view<string>('ft_balance_of', { account_id: r.carol }, r.cfg.usdc).catch(() => '0'))
      if (bal < r.opts.usdcPrice) {
        r.ctx.log(`    skip      buy-usdc: ${r.carol} holds ${bal} USDC base units on NEAR testnet, needs ${r.opts.usdcPrice} (faucet.circle.com → Near Testnet, human only). #${t} stays listed for USDC; rerun with --only buy-usdc --merge`)
        return null
      }
      const s = await r.satchel(t)
      if (!s.listing) throw new Error(`#${t} is not listed`)
      return (await r.send(buyUsdcPlan(r.cfg, r.carol, { tokenId: t, listingId: s.listing.id, expectedSigCount: s.sig_count }, r.opts.usdcPrice))).hash
    },
  },
  // ── offers and a delegate's allowance ──
  {
    id: 'offer-make', group: 'Sell', action: 'Make an offer on a Satchel', method: 'make_offer',
    shows: 'A buyer escrows NEAR against a Satchel that is not listed. The offer is bound to its signature count and inside epoch.',
    events: [['satchel:offer_made', ['offer_id', 'token_id', 'offerer_id', 'amount', 'currency', 'expected_sig_count', 'expected_inside_epoch']]], argKeys: ['token_id', 'expected_sig_count'],
    run: async (r) => {
      const t = await r.token('btc')
      const s = await r.satchel(t)
      const inside = await r.view<{ inside_epoch: number } | null>('inside_of', { token_id: t })
      return (await r.sendCall('make_offer', r.carol, makeOfferCall(r.c, parseNear('0.02'), { tokenId: t, expectedSigCount: s.sig_count, expectedInsideEpoch: inside?.inside_epoch ?? 0, expiresAtMs: Date.now() + 3 * 24 * 3600 * 1000 }))).hash
    },
  },
  {
    id: 'offer-accept', group: 'Sell', action: 'Accept an offer', method: 'accept_offer',
    shows: 'The owner accepts. The Satchel goes to the buyer and the escrowed NEAR goes to the seller in the same receipt.',
    events: [['nep171:nft_transfer', ['old_owner_id', 'new_owner_id', 'token_ids']], ['satchel:offer_accepted', ['offer_id', 'token_id', 'seller_id', 'buyer_id', 'amount']], ['satchel:payout', ['account_id', 'currency', 'amount', 'ok']]], argKeys: ['offer_id'],
    run: async (r) => {
      const t = await r.token('btc')
      const offers = await r.view<{ id: number; offerer_id: string }[]>('offers_for', { token_id: t, from_index: 0, limit: 50 })
      const o = offers.find((x) => x.offerer_id === r.carol)
      if (!o) throw new Error(`no offer by ${r.carol} on #${t}`)
      return (await r.sendCall('accept_offer', r.alice, acceptOfferCall(r.c, o.id))).hash
    },
  },
  {
    id: 'offer-cancel', group: 'Sell', action: 'Cancel an offer', method: 'cancel_offer',
    shows: 'An offerer takes an open offer back and the escrow is paid back.',
    events: [['satchel:offer_cancelled', ['offer_id', 'token_id', 'offerer_id', 'amount']], ['satchel:payout', ['account_id', 'currency', 'amount', 'ok']]], argKeys: ['offer_id'],
    run: async (r) => {
      const t = await r.token('btc')
      const s = await r.satchel(t)
      const inside = await r.view<{ inside_epoch: number } | null>('inside_of', { token_id: t })
      const made = await r.sendCall('make_offer (to cancel)', r.bob, makeOfferCall(r.c, parseNear('0.01'), { tokenId: t, expectedSigCount: s.sig_count, expectedInsideEpoch: inside?.inside_epoch ?? 0, expiresAtMs: Date.now() + 24 * 3600 * 1000 }))
      const ev = (made.outcome.receipts_outcome ?? []).flatMap((x) => x.outcome.logs).find((l) => l.includes('"offer_made"'))
      const id = ev ? (JSON.parse(ev.slice(11)) as { data: { offer_id: number } }).data.offer_id : null
      if (id === null) throw new Error('no offer_made event')
      return (await r.sendCall('cancel_offer', r.bob, cancelOfferCall(r.c, id))).hash
    },
  },
  {
    id: 'allowance-set', group: 'Delegate', action: 'Give a delegate a capped allowance', method: 'set_allowance',
    shows: 'The owner lets another account sign spends up to a cap (here 20,000 sats of BTC), until an expiry.',
    events: [['satchel:allowance_set', ['token_id', 'owner_id', 'delegate_id', 'caps']]], argKeys: ['token_id', 'delegate', 'caps'],
    run: async (r) => {
      const t = await r.token('btc')
      const owner = (await r.satchel(t)).owner_id
      const c = setAllowanceCall(t, r.bob, [{ asset: 'btc', limit: 20_000n }], Date.now() + 24 * 3600 * 1000)
      return (await r.send({ title: 'set_allowance', signerId: owner, receiverId: r.c, actions: [functionCall(c.methodName, c.args, BigInt(c.gas), BigInt(c.deposit))] })).hash
    },
  },
  {
    id: 'allowance-sign', group: 'Delegate', action: 'The delegate signs within the cap', method: 'sign_for', sig: 'btc_tx',
    shows: 'The delegate (not the owner) gets a BTC spend signed. The contract debits the cap by the amount that leaves the Satchel.',
    events: [...SIGN_EVENTS, ['satchel:allowance_spent', ['token_id', 'delegate_id', 'debits']]], argKeys: ['token_id'],
    note: 'signed only: the input is synthetic, so this signature can never move coins (it shows the cap accounting)',
    run: async (r) => r.sign(r.bob, await r.token('btc'), delegateBtcRequest(r, await r.token('btc'), 10_000n), 'sign_for by the delegate'),
  },
  {
    id: 'allowance-over-cap', group: 'Refusals', action: 'The delegate asks for more than the cap', method: 'sign_for',
    shows: 'A delegate request above what is left of the cap is refused before anything is recorded.',
    expect: { outcome: 'failure', error: 'ERR_ALLOWANCE_EXCEEDED' }, absent: NO_SIGN, argKeys: ['token_id'],
    run: async (r) => {
      const t = await r.token('btc')
      return (await r.send(signForPlan(r.cfg, r.bob, t, delegateBtcRequest(r, t, 15_000n), 'sign_for by the delegate, over the cap'))).hash
    },
  },
  {
    id: 'allowance-revoke', group: 'Delegate', action: 'Revoke the allowance', method: 'revoke_allowance',
    shows: 'The owner removes the delegate.',
    events: [['satchel:allowance_revoked', ['token_id', 'owner_id', 'delegate_id']]], argKeys: ['token_id', 'delegate'],
    run: async (r) => {
      const t = await r.token('btc')
      const owner = (await r.satchel(t)).owner_id
      const c = revokeAllowanceCall(t, r.bob)
      return (await r.send({ title: 'revoke_allowance', signerId: owner, receiverId: r.c, actions: [functionCall(c.methodName, c.args, BigInt(c.gas), BigInt(c.deposit))] })).hash
    },
  },
  {
    id: 'btc-multi-input', group: 'Send', action: 'Send BTC from two coins in one sign_for', method: 'sign_for', sig: 'btc_tx', external: 'bitcoin-testnet4',
    shows: 'One sign_for carries two BIP 143 preimages. The contract fans out one MPC call per input, and both signatures are in the Bitcoin transaction.',
    events: [['satchel:sign_requested', ['token_id', 'chain', 'path', 'first_seq', 'count']], ['satchel:sign_resolved', ['token_id', 'first_seq', 'count', 'statuses']]], argKeys: ['token_id'],
    run: async (r) => {
      const t = await r.token('btc')
      const to = r.addr(t).btc
      // Two coins for the Satchel: two sends from the funded chain token (unconfirmed is fine, the chain links them).
      await retryScript(r, 'btc', ['--token', r.opts.chainToken, '--fanout', '--targets', `${to} ${to}`, '--amount-each', '20000'], 1)
      const owner = (await r.satchel(t)).owner_id
      const h = await retryScript(r, 'btc', ['--token', t, '--owner', owner, '--fanout', '--targets', r.addr(r.opts.chainToken).btc, '--amount-each', '30000'])
      return h[h.length - 1]!
    },
  },
  // ── the headline sale ──
  {
    id: 'list', group: 'Sell', action: 'List a Satchel for NEAR', method: 'list',
    shows: 'The owner lists the Satchel. The listing records its signature count; from now on the Satchel cannot sign.',
    events: [['satchel:listed', ['token_id', 'listing_id', 'seller_id', 'price', 'currency', 'sig_count']]], argKeys: ['token_id', 'price', 'currency'],
    run: async (r) => {
      const t = await r.token('sale')
      await r.waitListable(t)
      return (await r.mustSucceed(listPlan(r.cfg, r.bob, t, r.opts.salePrice, 'near'))).hash
    },
  },
  {
    id: 'sign-while-listed', group: 'Refusals', action: 'Sign while listed', method: 'sign_for',
    shows: 'A listed Satchel is frozen: even its owner cannot sign, so its history cannot change under a buyer.',
    expect: { outcome: 'failure', error: 'ERR_FROZEN' }, absent: NO_SIGN, argKeys: ['token_id'],
    run: async (r) => {
      const t = await r.token('sale')
      return (await r.send(signForPlan(r.cfg, r.bob, t, evmMessageSignRequest(msgText(r, t, 'while listed')), `sign_for #${t} while listed`))).hash
    },
  },
  {
    id: 'delist', group: 'Sell', action: 'Stop selling (delist)', method: 'delist',
    shows: 'The owner takes the Satchel off the market.',
    events: [['satchel:delisted', ['token_id', 'listing_id', 'seller_id']]], argKeys: ['token_id'],
    run: async (r) => {
      const t = await r.token('sale')
      const h = (await r.mustSucceed(delistPlan(r.cfg, r.bob, t))).hash
      await r.mustSucceed(listPlan(r.cfg, r.bob, t, r.opts.salePrice, 'near')) // relist for the buy below (not a proof)
      return h
    },
  },
  {
    id: 'buy-stale', group: 'Refusals', action: 'Buy with a stale signature count', method: 'buy',
    shows: 'The buyer\'s view says one signature fewer than the Satchel has. The buy is refused and the NEAR goes back.',
    expect: { outcome: 'failure', error: 'ERR_LISTING_CHANGED' }, absent: ['satchel:sold', 'nep171:nft_transfer'], argKeys: ['token_id', 'listing_id', 'expected_sig_count'],
    run: async (r) => {
      const t = await r.token('sale')
      const s = await r.satchel(t)
      if (!s.listing) throw new Error(`#${t} is not listed`)
      const stale = s.sig_count > 0 ? s.sig_count - 1 : s.sig_count + 1
      return (await r.send(buyNearPlan(r.cfg, r.carol, { tokenId: t, listingId: s.listing.id, expectedSigCount: stale }, BigInt(s.listing.price)))).hash
    },
  },
  {
    id: 'buy-near', group: 'Sell', action: 'Buy a Satchel with NEAR', method: 'buy',
    shows: 'The buyer pays the price, bound to the listing id and the signature count they checked. The NFT moves and the seller is paid in the same receipt.',
    events: [['nep171:nft_transfer', ['old_owner_id', 'new_owner_id', 'token_ids']], ['satchel:sold', ['token_id', 'listing_id', 'seller_id', 'buyer_id', 'price', 'currency']], ['satchel:payout', ['account_id', 'currency', 'amount', 'ok']]],
    argKeys: ['token_id', 'listing_id', 'expected_sig_count'],
    run: async (r) => {
      const t = await r.token('sale')
      const s = await r.satchel(t)
      if (!s.listing) throw new Error(`#${t} is not listed`)
      return (await r.mustSucceed(buyNearPlan(r.cfg, r.carol, { tokenId: t, listingId: s.listing.id, expectedSigCount: s.sig_count }, BigInt(s.listing.price)))).hash
    },
  },
  {
    id: 'sign-old-owner', group: 'Refusals', action: 'The old owner tries to sign after the sale', method: 'sign_for',
    shows: 'The seller lost every key with the NFT. Their sign_for is refused.',
    expect: { outcome: 'failure', error: 'ERR_NOT_OWNER' }, absent: NO_SIGN, argKeys: ['token_id'],
    run: async (r) => {
      const t = await r.token('sale')
      return (await r.send(signForPlan(r.cfg, r.bob, t, evmMessageSignRequest(msgText(r, t, 'old owner')), `sign_for #${t} by the old owner`))).hash
    },
  },
  {
    id: 'sign-new-owner', group: 'Sign', action: 'The new owner signs', method: 'sign_for', sig: 'evm_message',
    shows: 'The buyer now controls the same addresses: their sign_for succeeds and recovers to the same EVM address.',
    events: SIGN_EVENTS, argKeys: ['token_id'],
    run: async (r) => {
      const t = await r.token('sale')
      return r.sign(r.carol, t, evmMessageSignRequest(msgText(r, t, 'new owner')), `sign_for #${t} by the new owner`)
    },
  },
  {
    id: 'for-sale-now', group: 'Sell', action: 'Listed now, with a clean history', method: 'list',
    shows: 'The new owner lists the Satchel again after the quiet period. It is still for sale: open its live clean-history verdict in the app.',
    events: [['satchel:listed', ['token_id', 'listing_id', 'seller_id', 'price', 'currency', 'sig_count']]], argKeys: ['token_id', 'price', 'currency'],
    run: async (r) => {
      const t = await r.token('sale')
      await r.waitListable(t)
      return (await r.mustSucceed(listPlan(r.cfg, r.carol, t, r.opts.salePrice, 'near'))).hash
    },
  },
]

/** A delegate's BTC spend: one synthetic input, sent to the next Satchel (an external output debits the cap). */
function delegateBtcRequest(r: Runner, token: string, amount: bigint): SignRequest {
  const a = r.addr(token)
  const to = r.addr(String(Number(token) + 1)).btc
  const utxos: Utxo[] = [{ txid: 'a'.repeat(64), vout: 0, value: amount + 10_000n, confirmed: true }]
  return buildBtcSend({ from: { address: a.btc, pubkey: a.btcPubkey }, to, amount, utxos, feeRate: 2 }).signRequest
}

export const STEP_IDS = STEPS.map((s) => s.id)

// ------------------------------------------------------------------------------------------------ building entries

export async function fetchNearTx(api: string, hash: string, timeoutMs = 120_000): Promise<NearTxView> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      const res = await fetch(`${api}/v0/transactions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tx_hashes: [hash] }) })
      const j = (await res.json()) as { transactions?: (FastnearTx | null)[] }
      const t = j.transactions?.[0]
      // the indexer can serve the tx before its last receipts: wait until the final status is reached
      if (t) {
        const v = readFastnearTx(t)
        if (v.final && typeof v.final === 'object' && ('SuccessValue' in v.final || 'Failure' in v.final)) return v
      }
    } catch {
      /* retry */
    }
    if (Date.now() > deadline) throw new Error(`tx ${hash} not in the FastNEAR tx API after ${timeoutMs / 1000} s`)
    await sleep(4000)
  }
}

async function externalStatus(chain: Chain, tx: string, cfg: Ctx['cfg']): Promise<'confirmed' | 'broadcast' | null> {
  const post = async (url: string, body: unknown) => (await (await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json()) as { result?: unknown }
  for (let i = 0; i < 20; i++) {
    try {
      if (chain === 'sepolia') {
        for (const u of ['https://rpc.sepolia.ethpandaops.io', ...cfg.sepoliaRpcs]) {
          const r = await post(u, { jsonrpc: '2.0', id: 1, method: 'eth_getTransactionReceipt', params: [tx] }).catch(() => ({}) as { result?: unknown })
          const rc = r.result as { status?: string } | null | undefined
          if (rc?.status === '0x1') return 'confirmed'
          if (rc?.status === '0x0') throw new Error(`Sepolia tx ${tx} reverted`)
        }
      } else if (chain === 'bitcoin-testnet4') {
        for (const u of cfg.btcApis) {
          const r = await fetch(`${u}/tx/${tx}`).catch(() => null)
          if (r?.ok) return ((await r.json()) as { status: { confirmed: boolean } }).status.confirmed ? 'confirmed' : 'broadcast'
        }
      } else {
        const r = await post(cfg.solRpcs[0]!, { jsonrpc: '2.0', id: 1, method: 'getSignatureStatuses', params: [[tx], { searchTransactionHistory: true }] })
        const st = (r.result as { value: ({ err: unknown; confirmationStatus: string } | null)[] }).value[0]
        if (st && st.err === null && (st.confirmationStatus === 'confirmed' || st.confirmationStatus === 'finalized')) return 'confirmed'
      }
    } catch (e) {
      if ((e as Error).message.includes('reverted')) throw e
    }
    await sleep(6000)
  }
  return null
}

export function pick(o: Record<string, unknown> | null | undefined, keys: string[] | undefined): Record<string, unknown> | undefined {
  if (!o || !keys) return undefined
  const out: Record<string, unknown> = {}
  for (const k of keys) if (k in o) out[k] = o[k]
  return Object.keys(out).length ? out : undefined
}

/** Check one tx against its step and turn it into a proofs.json entry. Throws if the tx does not prove the step. */
export async function buildEntry(ctx: Ctx, step: StepSpec, hash: string, t?: NearTxView): Promise<ProofEntry> {
  const cfg = ctx.cfg
  let tx = t ?? (await fetchNearTx(cfg.nearTxApi, hash))
  // The indexer can serve a tx before its detached receipts (a payout, a refund): re-read while an event is missing.
  for (let i = 0; !t && i < 15 && (step.events ?? []).some(([name]) => !findEvent(tx, name)); i++) {
    await sleep(5000)
    tx = await fetchNearTx(cfg.nearTxApi, hash)
  }
  const receiver = step.receiver === 'usdc' ? cfg.usdc : step.receiver === 'wnear' ? WNEAR_TESTNET : cfg.contract
  const expect = step.expect ?? { outcome: 'success' as const }
  const fail = (why: string) => new Error(`[${step.id}] tx ${hash} does not prove "${step.action}": ${why}`)
  if (tx.receiver !== receiver) throw fail(`receiver ${tx.receiver}, want ${receiver}`)
  if (tx.method !== step.method) throw fail(`method ${tx.method}, want ${step.method}`)
  const codes = errorCodesOf(tx)
  if (expect.outcome === 'success' && !succeeded(tx)) throw fail(`it did not succeed (${codes.join(', ') || JSON.stringify(tx.final).slice(0, 120)})`)
  if (expect.outcome === 'failure' && !codes.includes(expect.error)) throw fail(`no ${expect.error} (saw ${codes.join(', ') || 'none'})`)
  const events: EventSpec[] = []
  for (const [name, keys] of step.events ?? []) {
    const e = findEvent(tx, name)
    if (!e) throw fail(`no ${name} event`)
    const data = pick(e.data, keys)
    events.push(data ? { event: name, data } : { event: name })
  }
  for (const name of step.absent ?? []) if (findEvent(tx, name)) throw fail(`unexpected ${name} event`)
  const argsObj = tx.args ?? {}
  const sr = findEvent(tx, 'satchel:sign_requested')?.data
  const token = (argsObj.token_id as string | undefined) ?? (findEvent(tx, 'satchel:sold')?.data.token_id as string | undefined) ?? (findEvent(tx, 'satchel:offer_accepted')?.data.token_id as string | undefined) ??
    (findEvent(tx, 'satchel:offer_cancelled')?.data.token_id as string | undefined) ?? (findEvent(tx, 'satchel:inside_deposit')?.data.token_id as string | undefined) ??
    ((findEvent(tx, 'nep171:nft_mint')?.data.token_ids as string[] | undefined)?.[0]) ?? (sr?.token_id as string | undefined)
  const entry: ProofEntry = {
    id: step.id,
    group: step.group,
    action: step.action,
    shows: step.shows,
    ...(token ? { token_id: token } : {}),
    tx: hash,
    signer: tx.signer,
    receiver,
    method: step.method,
    ...(pick(argsObj, step.argKeys) ? { args: pick(argsObj, step.argKeys)! } : {}),
    block_height: tx.height,
    ...(tx.timestampNs ? { date: new Date(Number(BigInt(tx.timestampNs) / 1_000_000n)).toISOString().slice(0, 10) } : {}),
    expect,
    ...(events.length ? { events } : {}),
    ...(step.absent ? { absent_events: step.absent } : {}),
    explorer: nearExplorer(hash),
    ...(step.note ? { note: step.note } : {}),
  }
  if (step.sig) {
    if (!sr || !token) throw fail('no sign_requested event')
    const sigs = mpcSignatures(tx, cfg.contract)
    if (!sigs || sigs.length === 0 || sigs.some((s) => !s)) throw fail('the MPC returned no signature (timed out?)')
    const chain = sr.chain as 'evm' | 'btc' | 'sol'
    const a = deriveSatchelAddresses(cfg.network, cfg.contract, token)
    const preimage = Buffer.from((sr.preimages as string[])[0]!, 'hex')
    let message_text: string | undefined
    if (step.sig === 'evm_message') message_text = preimage.subarray(preimage.indexOf(0x0a) + 1).toString('utf8').replace(/^\d+/, '')
    if (step.sig === 'sol_message') message_text = preimage.subarray(20).toString('utf8')
    let chain_id: number | undefined
    if (step.sig === 'evm_tx') chain_id = Number(parseTransaction(`0x${preimage.toString('hex')}` as Hex).chainId)
    entry.signature = { chain, kind: step.sig, path: sr.path as string, address: a[chain], ...(message_text !== undefined ? { message_text } : {}), ...(chain_id !== undefined ? { chain_id } : {}) }
    if (step.external) {
      const x = externalTxOf(step.sig, sr, sigs as Record<string, unknown>[])
      if (!x) throw fail('no external tx for this kind')
      const status = await externalStatus(step.external, x.tx, cfg)
      if (!status) throw fail(`${step.external} tx ${x.tx} not found (never broadcast?)`)
      entry.external = {
        chain: step.external,
        tx: x.tx,
        explorer: EXPLORER[step.external](x.tx),
        from: a[chain],
        ...(x.nonce !== undefined ? { nonce: x.nonce } : {}),
        status,
      }
      if (status === 'broadcast') entry.note = [entry.note, 'broadcast; testnet4 blocks can be hours apart, so it was recorded before its first confirmation'].filter(Boolean).join('; ')
    }
  }
  return entry
}

// ------------------------------------------------------------------------------------------------- README table

const short = (h: string) => (h.length > 14 ? `${h.slice(0, 8)}…` : h)
const CHAIN_NAME: Record<Chain, string> = { sepolia: 'Sepolia', 'bitcoin-testnet4': 'Bitcoin testnet4', 'solana-devnet': 'Solana devnet' }

/** The docs/evidence/README.md table: one row per proof, from proofs.json (so it is regenerated with it). */
export function renderTable(doc: Pick<ProofsDoc, 'proofs'>): string {
  const rows = ['| Action | Transaction | What to look for |', '|---|---|---|']
  for (const p of doc.proofs) {
    const tx = [`NEAR [${short(p.tx)}](${p.explorer})`]
    if (p.external) tx.push(`${CHAIN_NAME[p.external.chain]} [${short(p.external.tx)}](${p.external.explorer})${p.external.status === 'broadcast' ? ' (broadcast)' : ''}`)
    const look: string[] = []
    if (p.expect.outcome === 'failure') look.push(`Refused with \`${p.expect.error}\`; no ${(p.absent_events ?? []).map((e) => `\`${e.split(':')[1]}\``).join(' or ') || 'change'}.`)
    else if (p.events?.length) look.push(`Events ${p.events.map((e) => `\`${e.event.split(':')[1]}\``).join(', ')}.`)
    if (p.signature) look.push(`Signature verifies against ${p.signature.chain.toUpperCase()} \`${p.signature.address}\`.`)
    if (p.args && 'expected_sig_count' in p.args) look.push(`Args bind \`expected_sig_count: ${String(p.args.expected_sig_count)}\`.`)
    const who = p.token_id ? ` (Satchel #${p.token_id})` : ''
    rows.push(`| **${p.action}**${who}<br>${p.shows.replace(/\|/g, '\\|')} | ${tx.join('<br>')} | ${look.join(' ')}${p.note ? ` Note: ${p.note}.` : ''} |`)
  }
  return rows.join('\n')
}

export const TABLE_START = '<!-- proofs:table:start (generated by tools/e2e/proofs.ts from proofs.json) -->'
export const TABLE_END = '<!-- proofs:table:end -->'

export function replaceTable(readme: string, table: string): string {
  const a = readme.indexOf(TABLE_START)
  const b = readme.indexOf(TABLE_END)
  if (a < 0 || b < a) return readme
  return `${readme.slice(0, a + TABLE_START.length)}\n${table}\n${readme.slice(b)}`
}

// ------------------------------------------------------------------------------------------------------- main

export function parseUse(values: string[] | undefined): Map<string, string> {
  const m = new Map<string, string>()
  for (const v of values ?? []) {
    for (const part of v.split(',').filter(Boolean)) {
      const [id, hash] = part.split('=')
      if (!id || !hash || !STEP_IDS.includes(id)) throw new Error(`--use ${part}: want <id>=<hash> with id one of ${STEP_IDS.join(', ')}`)
      m.set(id, hash)
    }
  }
  return m
}

function writeDoc(path: string, ctx: Ctx, entries: Map<string, ProofEntry>, note: string, tokens: Set<string>, clean: string[]): void {
  const proofs = STEP_IDS.filter((id) => entries.has(id)).map((id) => entries.get(id)!)
  for (const p of entries.values()) if (!STEP_IDS.includes(p.id)) proofs.push(p)
  const satchels: ProofsDoc['satchels'] = {}
  for (const t of [...tokens, ...proofs.map((p) => p.token_id).filter((x): x is string => !!x)].sort((a, b) => Number(a) - Number(b))) {
    const a = deriveSatchelAddresses(ctx.cfg.network, ctx.cfg.contract, t)
    satchels[t] = { evm: a.evm, btc: a.btc, sol: a.sol }
  }
  const doc: ProofsDoc = {
    schema: 'satchel-proofs/1',
    network: 'testnet',
    contract: ctx.cfg.contract,
    contract_role: roleOfContract(ctx.cfg.contract, ctx.cfg.team) ?? ctx.cfg.role,
    note,
    generated_at: new Date().toISOString().slice(0, 10),
    ...(clean.length ? { app_clean_history: clean } : {}),
    satchels,
    proofs,
  }
  writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`)
  const readme = join(dirname(path), 'README.md')
  if (existsSync(readme)) writeFileSync(readme, replaceTable(readFileSync(readme, 'utf8'), renderTable(doc)))
}

async function main(): Promise<void> {
  const v = parseCli(process.argv.slice(2), OPTIONS)
  if (bool(v, 'help')) return void console.log(HELP.replace('${ids}', STEP_IDS.join(', ')))
  if (bool(v, 'render')) {
    const path = str(v, 'out') ?? DEFAULT_OUT
    const doc = JSON.parse(readFileSync(path, 'utf8')) as ProofsDoc
    const readme = join(dirname(path), 'README.md')
    writeFileSync(readme, replaceTable(readFileSync(readme, 'utf8'), renderTable(doc)))
    return void console.log(`rewrote the table in ${readme} (${doc.proofs.length} proofs)`)
  }
  const ctx = makeCtx(v)
  banner(ctx, 'e2e/proofs')
  if (ctx.cfg.role === 'final' && !ctx.send) ctx.log('    note      final contract: run this only after the keyless birth (H-15)')
  const out = str(v, 'out') ?? DEFAULT_OUT
  const use = parseUse(v.use as string[] | undefined)
  const only = str(v, 'only')?.split(',').filter(Boolean)
  const skip = new Set(str(v, 'skip')?.split(',').filter(Boolean) ?? [])
  for (const id of [...(only ?? []), ...skip]) if (!STEP_IDS.includes(id)) throw new Error(`unknown proof id ${id}`)
  const runner = new Runner(ctx, { chainToken: str(v, 'chain-token')!, salePrice: parseNear(str(v, 'sale-price')!), usdcPrice: BigInt(str(v, 'usdc-price')!) })
  for (const part of str(v, 'tokens')?.split(',').filter(Boolean) ?? []) {
    const [role, id] = part.split('=')
    if ((role !== 'sale' && role !== 'inside' && role !== 'btc') || !id || !/^[1-9]\d*$/.test(id)) throw new Error(`--tokens ${part}: want sale|inside|btc=<id>`)
    runner.tokens[role] = id
  }
  const entries = new Map<string, ProofEntry>()
  const keptClean: string[] = []
  let note = str(v, 'note') ?? `Made on ${ctx.cfg.contract} with tools/e2e/proofs.ts.`
  if (bool(v, 'merge') && existsSync(out)) {
    const old = JSON.parse(readFileSync(out, 'utf8')) as ProofsDoc
    if (old.contract !== ctx.cfg.contract) throw new Error(`--merge: ${out} is for ${old.contract}, not ${ctx.cfg.contract}`)
    for (const p of old.proofs) entries.set(p.id, p)
    note = str(v, 'note') ?? old.note
    keptClean.push(...(old.app_clean_history ?? []))
  }
  const steps = STEPS.filter((s) => (!only || only.includes(s.id)) && !skip.has(s.id))
  const skipped: string[] = []
  const tokens = new Set<string>()
  const clean: string[] = [...keptClean]
  for (const step of steps) {
    ctx.log(`\n## [${step.id}] ${step.action}`)
    let hash: string | null
    if (use.has(step.id)) {
      hash = use.get(step.id)!
      ctx.log(`    adopt     ${hash} (an earlier transaction)`)
    } else if (!ctx.send) {
      try {
        await step.run(runner)
      } catch (e) {
        if (!(e instanceof DryRun)) ctx.log(`    dry run   ${(e as Error).message}`)
      }
      continue
    } else {
      hash = await step.run(runner)
    }
    if (!hash) {
      skipped.push(step.id)
      continue
    }
    const entry = await buildEntry(ctx, step, hash)
    entries.set(step.id, entry)
    if ((step.id === 'for-sale-now' || (step.id === 'list-usdc' && !entries.has('buy-usdc'))) && entry.token_id) {
      const url = `https://usesatchel.xyz/api/clean-history/${entry.token_id}`
      if (!clean.includes(url)) clean.push(url)
    }
    ctx.log(`    proof     ${step.id} → ${hash}${entry.external ? ` · ${entry.external.chain} ${entry.external.tx}` : ''}`)
    if (ctx.send || use.size) writeDoc(out, ctx, entries, note, tokens, clean)
  }
  for (const h of runner.timeouts) ctx.log(`    timeout   MPC request ${h} timed out and stays recorded (status failed); see sig_records`)
  Object.values(runner.tokens).forEach((t) => t && tokens.add(t))
  if (ctx.send || use.size) {
    writeDoc(out, ctx, entries, note, tokens, clean)
    ctx.log(`\nwrote ${out}: ${entries.size} proofs${skipped.length ? `; skipped ${skipped.join(', ')}` : ''}. Verify: tools/proofs.sh`)
  } else ctx.log('\nDRY RUN: nothing was signed and proofs.json was not written. Add --send to make the proofs.')
}

if (isMain(import.meta.url)) runMain(main)
