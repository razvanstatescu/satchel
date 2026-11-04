/**
 * Mint e2e (kb/90 §12.4): `nft_mint` with 0.02 NEAR (measured storage kept, the rest refunded), then check the new
 * token's owner and that its three addresses derive.
 *
 *   pnpm --filter @satchel/tools e2e:mint                       # dry run, payer alice, receiver alice
 *   pnpm --filter @satchel/tools e2e:mint --receiver bob --send
 */
import { banner, bool, executePlan, expect, isMain, makeCtx, parseCli, runMain, str } from '../lib/run'
import { resolveAccount } from '../lib/config'
import { events } from '../lib/outcome'
import { addressesOf, HELP_COMMON } from './common'
import { mintPlan } from './plans'

const OPTIONS = { payer: { type: 'string', default: 'alice' }, receiver: { type: 'string', default: 'alice' } } as const

async function main(): Promise<void> {
  const v = parseCli(process.argv.slice(2), OPTIONS)
  if (bool(v, 'help')) return void console.log(`tools/e2e/mint.ts --payer <acct> --receiver <acct>\n${HELP_COMMON}`)
  const ctx = makeCtx(v)
  banner(ctx, 'e2e/mint')
  const payer = resolveAccount(ctx.cfg, str(v, 'payer')!)
  const receiver = resolveAccount(ctx.cfg, str(v, 'receiver')!)
  if (!ctx.offline) {
    const c = await ctx.rpc.view<{ next_token_id: number }>(ctx.cfg.contract, 'config').catch(() => null)
    if (c) ctx.log(`    next id   ${c.next_token_id} → addresses ${JSON.stringify(addressesOf(ctx.cfg, String(c.next_token_id)), ['evm', 'btc', 'sol'])}`)
  }
  const sent = await executePlan(ctx, mintPlan(ctx.cfg, payer, receiver))
  if (!sent) return
  const mint = events(sent.outcome, 'nep171', 'nft_mint')[0]
  const ids = (mint?.data as { token_ids: string[] }[] | undefined)?.[0]?.token_ids ?? []
  expect(ctx, sent.ok && ids.length === 1, `minted one token (${ids.join(',')})`)
  const t = await ctx.rpc.view<{ owner_id: string }>(ctx.cfg.contract, 'nft_token', { token_id: ids[0] })
  expect(ctx, t?.owner_id === receiver, `nft_token(${ids[0]}).owner_id == ${receiver}`)
}

if (isMain(import.meta.url)) runMain(main)
