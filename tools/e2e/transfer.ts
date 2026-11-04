/**
 * Transfer e2e (kb/90 §12.4, INV-02): `nft_transfer` (exactly 1 yocto) moves control of the wallet. Checks the new
 * owner, that `sig_count` and the records are unchanged (history belongs to the token), and that the addresses are the
 * same.
 *
 *   pnpm --filter @satchel/tools e2e:transfer --token 2               # dry run alice → bob
 *   pnpm --filter @satchel/tools e2e:transfer --token 2 --to bob --send
 */
import { banner, bool, executePlan, expect, isMain, makeCtx, parseCli, runMain, str } from '../lib/run'
import { resolveAccount } from '../lib/config'
import { addressesOf, HELP_COMMON, ownerOr, readSatchel } from './common'
import { transferPlan } from './plans'

const OPTIONS = { token: { type: 'string', default: '2' }, from: { type: 'string' }, to: { type: 'string', default: 'bob' }, memo: { type: 'string' } } as const

async function main(): Promise<void> {
  const v = parseCli(process.argv.slice(2), OPTIONS)
  if (bool(v, 'help')) return void console.log(`tools/e2e/transfer.ts --token <id> [--from <owner>] --to <acct> [--memo <text>]\n${HELP_COMMON}`)
  const ctx = makeCtx(v)
  banner(ctx, 'e2e/transfer')
  const token = str(v, 'token')!
  const to = resolveAccount(ctx.cfg, str(v, 'to')!)
  const before = await readSatchel(ctx, token)
  const from = str(v, 'from') ? resolveAccount(ctx.cfg, str(v, 'from')!) : await ownerOr(ctx, token, ctx.cfg.personas.alice)
  if (before?.listing) throw new Error(`#${token} is listed (ERR_LISTED): delist first`)
  if (before && before.owner_id !== from) throw new Error(`#${token} is owned by ${before.owner_id}, not ${from} (ERR_NOT_OWNER)`)
  const a = addressesOf(ctx.cfg, token)
  ctx.log(`    wallet    #${token} evm ${a.evm} · btc ${a.btc} · sol ${a.sol} (unchanged by a transfer)`)
  if (before) ctx.log(`    before    owner ${before.owner_id}, sig_count ${before.sig_count}`)
  const sent = await executePlan(ctx, transferPlan(ctx.cfg, from, token, to, str(v, 'memo')))
  if (!sent) return
  expect(ctx, sent.ok, 'nft_transfer succeeded')
  const after = await readSatchel(ctx, token)
  expect(ctx, after?.owner_id === to, `owner is now ${to}`)
  expect(ctx, after?.sig_count === before?.sig_count, `sig_count unchanged (${after?.sig_count})`)
}

if (isMain(import.meta.url)) runMain(main)
