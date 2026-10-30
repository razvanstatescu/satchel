/**
 * C5 e2e (docs/specs/C5.md): `set_allowance` a cap on a delegate, let the delegate sign a request within the cap
 * (`--sign-only`, so it works whatever the funding), check a request over the cap is refused *before* signing
 * (`checkDelegatedSign`, mirrors the contract), and `revoke_allowance`.
 *
 *   pnpm --filter @satchel/tools e2e:allowance --action set --token 1 --delegate bob --asset btc --limit 50000
 *   pnpm --filter @satchel/tools e2e:allowance --action sign --token 1 --delegate bob --asset btc --amount 10000 --sign-only --send
 *   pnpm --filter @satchel/tools e2e:allowance --action sign --token 1 --delegate bob --asset btc --amount 999999999 --send   # must refuse
 *   pnpm --filter @satchel/tools e2e:allowance --action revoke --token 1 --delegate bob --send
 */
import { allowanceArgs, allowancesOfArgs, revokeAllowanceCall, setAllowanceCall, solSignRequest } from '@satchel/core/near'
import { checkDelegatedSign, type Asset, type AllowanceView } from '@satchel/core/policy'
import { buildBtcSend, type Utxo } from '@satchel/core/chains/btc'
import { buildSolTransfer } from '@satchel/core/chains/sol'
import { banner, bool, executePlan, expect, isMain, makeCtx, parseCli, runMain, str, type Ctx } from '../lib/run'
import { resolveAccount } from '../lib/config'
import { functionCall, type TxPlan } from '../lib/tx'
import { addressesOf, describeSignRequest, HELP_COMMON, ownerOr, signaturesFrom, signForPlan } from './common'

const OPTIONS = {
  action: { type: 'string', default: 'view' },
  token: { type: 'string', default: '1' },
  owner: { type: 'string' },
  delegate: { type: 'string', default: 'bob' },
  asset: { type: 'string', default: 'btc' },
  limit: { type: 'string', default: '50000' },
  amount: { type: 'string', default: '10000' },
  'expires-in-ms': { type: 'string', default: String(24 * 3600 * 1000) },
  'sign-only': { type: 'boolean', default: false },
} as const

const HELP = `tools/e2e/allowance.ts: C5 delegated spending allowance.
  --action set|revoke|sign|view (default view)
  --token <id> (default 1)   --owner <acct> (default: on-chain owner, else alice)   --delegate <acct> (default bob)
  --asset btc|sol (default btc)   --limit <units> (set; default 50000 sats)   --amount <units> (sign; default 10000 sats)
  --expires-in-ms <n> (set; default 24h)   --sign-only  (sign action) do not broadcast
${HELP_COMMON}`

export function toPlan(title: string, signerId: string, receiverId: string, methodName: string, args: Record<string, unknown>, gas: bigint, deposit: bigint): TxPlan {
  return { title, signerId, receiverId, actions: [functionCall(methodName, args, gas, deposit)] }
}

async function main(): Promise<void> {
  const v = parseCli(process.argv.slice(2), OPTIONS)
  if (bool(v, 'help')) return void console.log(HELP)
  const ctx = makeCtx(v)
  banner(ctx, 'e2e/allowance')
  const action = str(v, 'action')!
  const token = str(v, 'token')!
  const assetName = str(v, 'asset')!
  if (assetName !== 'btc' && assetName !== 'sol') throw new Error('--asset must be btc or sol (this script signs simple transfers only)')
  const asset: Asset = assetName
  const delegate = resolveAccount(ctx.cfg, str(v, 'delegate')!)
  const contract = ctx.cfg.contract

  if (ctx.offline && (action === 'view' || action === 'sign')) {
    ctx.log(`    note      --offline: --action ${action} reads the live allowance view first; nothing to show without a network. Call checkDelegatedSign directly in a unit test instead.`)
    return
  }

  if (action === 'view') {
    const view = await ctx.rpc.view<AllowanceView[]>(contract, 'allowances_of', allowancesOfArgs(token))
    ctx.log(`    allowances_of #${token}: ${JSON.stringify(view, null, 2)}`)
    return
  }

  if (action === 'set') {
    const owner = str(v, 'owner') ? resolveAccount(ctx.cfg, str(v, 'owner')!) : await ownerOr(ctx, token, ctx.cfg.personas.alice)
    const limit = BigInt(str(v, 'limit')!)
    const expiresAtMs = Date.now() + Number(str(v, 'expires-in-ms'))
    const call = setAllowanceCall(token, delegate, [{ asset, limit }], expiresAtMs)
    const plan = toPlan(`set_allowance #${token} ${delegate} ${assetName}≤${limit}`, owner, contract, call.methodName, call.args, BigInt(call.gas), BigInt(call.deposit))
    const sent = await executePlan(ctx, plan)
    if (!sent) return
    expect(ctx, sent.ok, 'set_allowance succeeded')
    const view = await ctx.rpc.view<AllowanceView | null>(contract, 'allowance', allowanceArgs(token, delegate))
    ctx.log(`    allowance ${JSON.stringify(view)}`)
    expect(ctx, view?.status === 'active', 'the allowance is active')
    return
  }

  if (action === 'revoke') {
    const owner = str(v, 'owner') ? resolveAccount(ctx.cfg, str(v, 'owner')!) : await ownerOr(ctx, token, ctx.cfg.personas.alice)
    const call = revokeAllowanceCall(token, delegate)
    const plan = toPlan(`revoke_allowance #${token} ${delegate}`, owner, contract, call.methodName, call.args, BigInt(call.gas), BigInt(call.deposit))
    const sent = await executePlan(ctx, plan)
    if (!sent) return
    expect(ctx, sent.ok, 'revoke_allowance succeeded')
    const view = await ctx.rpc.view<AllowanceView | null>(contract, 'allowance', allowanceArgs(token, delegate))
    expect(ctx, view === null, 'the allowance is gone')
    return
  }

  if (action === 'sign') {
    const view = await ctx.rpc.view<AllowanceView | null>(contract, 'allowance', allowanceArgs(token, delegate))
    if (!view) throw new Error(`no allowance for ${delegate} on #${token}; run --action set first`)
    const request = await buildAssetRequest(ctx, token, assetName, BigInt(str(v, 'amount')!))
    const pre = checkDelegatedSign(view, request, { nowMs: Date.now() })
    ctx.log(`    precheck  ${JSON.stringify(pre)}`)
    describeSignRequest(token, request).forEach((l) => ctx.log(l))
    if (!pre.ok) {
      ctx.log(`    EXPECTED  the local mirror refuses: ${pre.error}${'detail' in pre ? ` (${pre.detail})` : ''}`)
      if (ctx.send) {
        const sent = await executePlan(ctx, signForPlan(ctx.cfg, delegate, token, request, `sign_for #${token} (delegate ${delegate}, over cap)`))
        if (sent) expect(ctx, !sent.ok, 'the contract also refused the over-cap delegated sign')
      }
      return
    }
    const sent = await executePlan(ctx, signForPlan(ctx.cfg, delegate, token, request, `sign_for #${token} (delegate ${delegate})`))
    if (!sent) return
    expect(ctx, sent.ok, 'the delegate\'s sign_for succeeded')
    signaturesFrom(sent, 'btc' in request ? request.btc.preimages.length : 1)
    const after = await ctx.rpc.view<AllowanceView | null>(contract, 'allowance', allowanceArgs(token, delegate))
    ctx.log(`    after     ${JSON.stringify(after)}`)
    return
  }

  throw new Error(`unknown --action ${action}`)
}

/** A plain transfer request a delegate may sign: BTC sweep-to-self, or a SOL transfer to the next token. */
async function buildAssetRequest(ctx: Ctx, token: string, asset: 'btc' | 'sol', amount: bigint) {
  const a = addressesOf(ctx.cfg, token)
  if (asset === 'sol') {
    const built = buildSolTransfer({ from: a.sol, to: addressesOf(ctx.cfg, String(Number(token) + 1)).sol, lamports: amount, recentBlockhash: '11111111111111111111111111111111', lastValidBlockHeight: 0 })
    return solSignRequest(built.message)
  }
  // BTC: a single synthetic input big enough to cover `amount` + fee, swept to the Satchel's own address (offline-safe).
  const utxos: Utxo[] = [{ txid: 'a'.repeat(64), vout: 0, value: amount + 10_000n, confirmed: true }]
  const built = buildBtcSend({ from: { address: a.btc, pubkey: a.btcPubkey }, to: a.btc, amount, utxos, feeRate: 2 })
  return built.signRequest
}

if (isMain(import.meta.url)) runMain(main)
