/**
 * SOL e2e (spec §12.4, P2): a devnet System transfer from Satchel #N. The contract signs the legacy message bytes
 * (Eddsa, domain 1). Devnet blockhashes live ≈ 36 s, so in send mode the script confirms once, then fetches a fresh
 * blockhash and signs immediately (the printed message differs only in `recent_blockhash`).
 *
 *   pnpm --filter @satchel/tools e2e:sol                         # dry run: #1 → #2, 0.001 SOL
 *   pnpm --filter @satchel/tools e2e:sol --to final#3 --lamports 2000000 --send
 */
import { attachSolSignature, buildSolTransfer, broadcastSol, createSolConnection, isBlockhashFresh, prepareSolSend, solTxUrl, type BuiltSolTransfer } from '@satchel/core/chains/sol'
import { solSignRequest } from '@satchel/core/near'
import { toHex } from '@satchel/core/bytes'
import { createHash } from 'node:crypto'
import { confirmSend } from '../lib/confirm'
import { banner, bool, executePlan, expect, isMain, makeCtx, parseCli, runMain, str, type Ctx } from '../lib/run'
import { formatPlan } from '../lib/tx'
import { addressesOf, describeSignRequest, HELP_COMMON, ownerOr, parseTargets, signaturesFrom, signForPlan } from './common'

const OPTIONS = {
  token: { type: 'string', default: '1' },
  owner: { type: 'string' },
  to: { type: 'string' },
  lamports: { type: 'string', default: '1000000' },
  blockhash: { type: 'string', default: '11111111111111111111111111111111' },
  'sign-only': { type: 'boolean', default: false },
} as const

const HELP = `tools/e2e/sol.ts: Solana devnet transfer from a Satchel via sign_for (Eddsa).
  --token <id>        source Satchel (default 1)        --owner <acct>  signer (default: on-chain owner, else alice)
  --to <addr|set#id>  recipient (default: the next token's SOL address; a self-transfer is not a valid message)
  --lamports <n>      default 1000000 (0.001 SOL)       --blockhash <b58>  placeholder used with --offline
  --sign-only         sign_for + ed25519-verify, print the signed tx (base64), do not broadcast (works unfunded)
${HELP_COMMON}`

export function describeSol(b: BuiltSolTransfer): string[] {
  return [
    `    blockhash ${b.recentBlockhash} (last valid height ${b.lastValidBlockHeight})`,
    `    message   ${toHex(b.message)} (${b.message.length} bytes)`,
    `    sha256    ${createHash('sha256').update(b.message).digest('hex')} (the record payload)`,
  ]
}

async function main(): Promise<void> {
  const v = parseCli(process.argv.slice(2), OPTIONS)
  if (bool(v, 'help')) return void console.log(HELP)
  const ctx = makeCtx(v)
  banner(ctx, 'e2e/sol')
  const token = str(v, 'token')!
  const from = addressesOf(ctx.cfg, token).sol
  const to = str(v, 'to') ? parseTargets(ctx.cfg, str(v, 'to')!, 'sol')[0]! : { address: addressesOf(ctx.cfg, String(Number(token) + 1)).sol, label: `#${Number(token) + 1}` }
  if (to.address === from) throw new Error('a self-transfer is not a valid single-signer message; pick another recipient')
  const lamports = BigInt(str(v, 'lamports')!)
  const owner = str(v, 'owner') ?? (await ownerOr(ctx, token, ctx.cfg.personas.alice))
  ctx.log(`    from      #${token} ${from}; to ${to.label} ${to.address}; ${lamports} lamports; signer ${owner}`)

  const conn = ctx.offline ? null : createSolConnection(ctx.cfg.solRpcs[0])
  const build = async (): Promise<BuiltSolTransfer & { fetchedAt: number }> => {
    if (!conn) return { ...buildSolTransfer({ from, to: to.address, lamports, recentBlockhash: str(v, 'blockhash')!, lastValidBlockHeight: 0 }), fetchedAt: Date.now() }
    try {
      const p = await prepareSolSend(conn, { from, to: to.address, lamports })
      ctx.log(`    devnet    balance ${p.balance} lamports; recipient ${p.recipientExists ? 'exists' : 'new'}; rent min ${p.rentMin}`)
      return p
    } catch (e) {
      if (ctx.send && !bool(v, 'sign-only')) throw e
      ctx.log(`    devnet    cannot prepare a real send (${(e as Error).message}); showing the message with a fresh blockhash anyway`)
      const bh = await conn.getLatestBlockhash('confirmed')
      return { ...buildSolTransfer({ from, to: to.address, lamports, recentBlockhash: bh.blockhash, lastValidBlockHeight: bh.lastValidBlockHeight }), fetchedAt: Date.now() }
    }
  }

  let built = await build()
  describeSol(built).forEach((l) => ctx.log(l))
  const plan = () => signForPlan(ctx.cfg, owner, token, solSignRequest(built.message), `sign_for #${token} SOL → ${to.label}`)
  describeSignRequest(token, solSignRequest(built.message)).forEach((l) => ctx.log(l))
  if (!ctx.send) {
    await executePlan(ctx, plan())
    return
  }
  ctx.log(formatPlan(plan()))
  const c = await confirmSend({ send: true, yes: ctx.yes, ...(ctx.ask ? { ask: ctx.ask } : {}), prompt: 'Send this SOL transfer (the blockhash is refreshed right before signing)? Type "yes": ' })
  if (c !== 'confirmed') throw new Error('not confirmed: nothing was signed')
  if (!isBlockhashFresh(built.fetchedAt, Date.now())) {
    built = await build()
    ctx.log('    refreshed the blockhash:')
    describeSol(built).forEach((l) => ctx.log(l))
  }
  const sent = await executePlan({ ...ctx, yes: true } as Ctx, plan())
  if (!sent) return
  const signed = attachSolSignature(built, signaturesFrom(sent, 1)[0]!, from) // ed25519-verified
  expect(ctx, true, `ed25519 signature verifies against the Satchel address ${from}`)
  if (bool(v, 'sign-only')) return void ctx.log(`    signed    ${Buffer.from(signed.raw).toString('base64')}\n    note      --sign-only: not broadcast`)
  const sig = await broadcastSol(conn!, signed, built.lastValidBlockHeight)
  expect(ctx, sig === signed.signature, `devnet accepted ${sig}`)
  ctx.log(`    broadcast ${solTxUrl(sig)}`)
}

if (isMain(import.meta.url)) runMain(main)
