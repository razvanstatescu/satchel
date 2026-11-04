/**
 * The one path every tool uses to sign: print the plan → (dry run stops here) → fetch nonce + block hash → print the
 * tx hash → typed "yes" → sign → `send_tx` INCLUDED → long-poll `tx` (kb/90 §12.4).
 */
import { realpathSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs, type ParseArgsConfig } from 'node:util'
import { base58 } from '@scure/base'
import { loadConfig, type ToolConfig } from './config'
import { confirmSend, DRY_RUN_NOTE, type Ask } from './confirm'
import { loadKey, MissingCredentialsError, peekPublicKey } from './credentials'
import { NearRpc, RpcError, trackTx, type ExecutionOutcome, type FetchLike, type TxWait } from './near-rpc'
import { errorCodes, isTxSuccess } from './outcome'
import { assertSafeActions, buildTransaction, formatPlan, transactionHash, type TxPlan } from './tx'

export interface Ctx {
  cfg: ToolConfig
  rpc: NearRpc
  send: boolean
  yes: boolean
  offline: boolean
  log: (s: string) => void
  ask?: Ask
}

export const COMMON_OPTIONS = {
  send: { type: 'boolean', default: false },
  yes: { type: 'boolean', default: false },
  offline: { type: 'boolean', default: false },
  help: { type: 'boolean', short: 'h', default: false },
  team: { type: 'string' },
  role: { type: 'string' },
  contract: { type: 'string' },
  alice: { type: 'string' },
  bob: { type: 'string' },
  carol: { type: 'string' },
} as const satisfies ParseArgsConfig['options']

export type Values = Record<string, string | boolean | string[] | undefined>

export function parseCli<O extends NonNullable<ParseArgsConfig['options']>>(argv: string[], options: O): Values {
  const { values } = parseArgs({ args: argv, options: { ...COMMON_OPTIONS, ...options }, strict: true, allowPositionals: false })
  return values as Values
}

export const str = (v: Values, k: string): string | undefined => (typeof v[k] === 'string' ? (v[k] as string) : undefined)
export const bool = (v: Values, k: string): boolean => v[k] === true

export function makeCtx(v: Values, opts: { fetch?: FetchLike; log?: (s: string) => void; ask?: Ask; env?: Record<string, string | undefined> } = {}): Ctx {
  const flags: Record<string, string> = {}
  for (const k of ['team', 'role', 'contract', 'alice', 'bob', 'carol']) {
    const s = str(v, k)
    if (s !== undefined) flags[k] = s
  }
  const cfg = loadConfig(flags, opts.env ?? process.env)
  const rpc = new NearRpc(cfg.nearRpcs, { apiKey: cfg.fastnearApiKey, ...(opts.fetch ? { fetch: opts.fetch } : {}) })
  if (bool(v, 'send') && bool(v, 'offline')) throw new Error('--send and --offline are mutually exclusive')
  return {
    cfg,
    rpc,
    send: bool(v, 'send'),
    yes: bool(v, 'yes'),
    offline: bool(v, 'offline'),
    log: opts.log ?? ((s) => console.log(s)),
    ...(opts.ask ? { ask: opts.ask } : {}),
  }
}

export function banner(ctx: Ctx, name: string): void {
  ctx.log(`== ${name} · ${ctx.send ? 'SEND MODE' : ctx.offline ? 'DRY RUN (offline)' : 'DRY RUN (read-only RPC)'} · contract ${ctx.cfg.contract} (role ${ctx.cfg.role})`)
}

export interface Sent {
  hash: string
  outcome: ExecutionOutcome
  ok: boolean
  errors: string[]
}

export const nearblocksTx = (h: string) => `https://testnet.nearblocks.io/txns/${h}`
export const fastnearProof = (api: string, h: string) =>
  `curl -s -X POST ${api}/v0/transactions -H 'content-type: application/json' -d '{"tx_hashes":["${h}"]}'`

/**
 * Print the plan; in dry-run return null. In send mode sign and send it, then return the tracked outcome.
 * A failed tx is returned with `ok: false` (never thrown), so a script can send a tx that must fail (e.g. the direct
 * ft_on_transfer attack) and check its error codes.
 */
export async function executePlan(
  ctx: Ctx,
  plan: TxPlan,
  opts: { waitUntil?: TxWait; allow?: { deploy?: boolean; createAccount?: boolean }; requireTty?: boolean; noYesFlag?: boolean; prompt?: (hash: string) => string } = {},
): Promise<Sent | null> {
  assertSafeActions(plan, opts.allow)
  ctx.log(formatPlan(plan))
  if (!ctx.send) {
    const pk = peekPublicKey(ctx.cfg.credentialsDir, ctx.cfg.network, plan.signerId)
    ctx.log(`    key       ${pk ? `${pk} (from ${ctx.cfg.credentialsDir})` : `none found for ${plan.signerId} in ${ctx.cfg.credentialsDir}: needed for --send`}`)
    if (pk && !ctx.offline) {
      try {
        const ak = await ctx.rpc.viewAccessKey(plan.signerId, pk)
        ctx.log(`    nonce     would be ${BigInt(ak.nonce) + 1n} (read-only view_access_key)`)
      } catch (e) {
        ctx.log(`    nonce     unavailable: ${(e as Error).message.slice(0, 120)}`)
      }
    }
    ctx.log(`    ${DRY_RUN_NOTE}\n`)
    return null
  }
  let key
  try {
    key = loadKey(ctx.cfg.credentialsDir, ctx.cfg.network, plan.signerId)
  } catch (e) {
    if (e instanceof MissingCredentialsError) throw new Error(`${e.message}. Import the key with the near CLI (legacy keychain) first.`)
    throw e
  }
  const ak = await ctx.rpc.viewAccessKey(plan.signerId, key.publicKey)
  const block = await ctx.rpc.finalBlock()
  const nonce = BigInt(ak.nonce) + 1n
  const tx = buildTransaction(plan, key.publicKey, nonce, block.hash)
  const hash = transactionHash(tx)
  ctx.log(`    key       ${key.publicKey}\n    nonce     ${nonce}\n    block     ${block.hash} (#${block.height})\n    tx hash   ${hash}`)
  const c = await confirmSend({
    send: true,
    yes: opts.noYesFlag ? false : ctx.yes,
    requireTty: opts.requireTty ?? false,
    ...(ctx.ask ? { ask: ctx.ask } : {}),
    prompt: opts.prompt ? opts.prompt(hash) : `Sign and send "${plan.title}" (${plan.signerId} → ${plan.receiverId}, tx ${hash})? Type "yes": `,
  })
  if (c !== 'confirmed') throw new Error('not confirmed: nothing was signed')
  const { txHash: signedHash, signedTransaction: signed } = await key.signer.signTransaction(tx)
  const h2 = base58.encode(signedHash)
  if (h2 !== hash) throw new Error(`internal: signed hash ${h2} differs from the printed hash ${hash}`)
  const b64 = Buffer.from(signed.encode()).toString('base64')
  try {
    await ctx.rpc.sendTx(b64, 'INCLUDED')
  } catch (e) {
    // A transient error after submission is fine: the tracker decides. A definite rejection is not.
    if (!(e instanceof RpcError) || !e.retryable) throw e
    ctx.log(`    send_tx: ${e.kind}; tracking by hash anyway`)
  }
  ctx.log(`    sent      ${nearblocksTx(hash)}`)
  const outcome = await trackTx(ctx.rpc, hash, plan.signerId, {
    waitUntil: opts.waitUntil ?? 'EXECUTED_OPTIMISTIC',
    onPoll: (n, note) => ctx.log(`    poll #${n}: ${note}`),
  })
  const ok = isTxSuccess(outcome)
  const errors = errorCodes(outcome)
  if ((opts.waitUntil ?? 'EXECUTED_OPTIMISTIC') !== 'FINAL') await waitForFinalViews(ctx)
  ctx.log(`    result    ${ok ? 'SUCCESS' : 'FAILURE'}${errors.length ? ` ${errors.join(', ')}` : ''}`)
  ctx.log(`    proof     ${fastnearProof(ctx.cfg.nearTxApi, hash)}\n`)
  return { hash, outcome, ok, errors }
}

/**
 * After an EXECUTED_OPTIMISTIC outcome the effects are not yet visible to `final` views (they trail by 1–3 blocks):
 * the 2026-10-27 testnet smoke read nft_token right after nft_mint and failed. Wait until the final head passes the
 * optimistic head seen now, so every later view sees this tx. Best effort: a slow RPC only logs a note.
 */
export async function waitForFinalViews(ctx: Ctx, timeoutMs = 20_000, pollMs = 600): Promise<void> {
  try {
    const target = await ctx.rpc.optimisticHeight()
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if ((await ctx.rpc.finalBlock()).height >= target) return
      await new Promise((r) => setTimeout(r, pollMs))
    }
    ctx.log(`    note      final head still below #${target} after ${timeoutMs / 1000} s; later views may be stale`)
  } catch (e) {
    ctx.log(`    note      could not wait for finality (${(e as Error).message.slice(0, 100)}); later views may be stale`)
  }
}

/** Fail loudly in send mode when an on-chain expectation does not hold. */
export function expect(ctx: Ctx, cond: boolean, what: string): void {
  ctx.log(`    check     ${cond ? 'PASS' : 'FAIL'}  ${what}`)
  if (!cond) throw new Error(`expectation failed: ${what}`)
}

/** Run a script's main, printing a short error (no stack, no secrets) and setting the exit code. */
export function runMain(main: () => Promise<void>): void {
  // Exit explicitly: viem's fallback ranking keeps a timer alive after main() is done.
  main().then(
    () => process.exit(process.exitCode ?? 0),
    (e) => {
      console.error(`error: ${e instanceof Error ? e.message : String(e)}`)
      process.exit(1)
    },
  )
}

/** True when the module is the script being run (so tests can import a script's pure helpers). */
export function isMain(metaUrl: string): boolean {
  const arg = process.argv[1]
  if (!arg) return false
  try {
    return realpathSync(fileURLToPath(metaUrl)) === realpathSync(resolve(arg))
  } catch {
    return false
  }
}
