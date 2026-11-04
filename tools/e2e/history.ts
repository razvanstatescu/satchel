/**
 * History-digest e2e (C1, docs/specs/C1-C2-C3-C7.md §5.1), read-only: page every `sig_records` row of a token,
 * recompute `historyDigest(contract, token_id, records)` with `@satchel/core/clean-history` and compare it to the
 * on-chain `history_digest(token_id)` view. Equal digests mean equal histories (C1 spec §5.1).
 *
 *   pnpm --filter @satchel/tools e2e:history --token 1
 *   pnpm --filter @satchel/tools e2e:history --token 1 --contract rc.satchelhq.testnet
 */
import { historyDigest } from '@satchel/core/clean-history'
import type { SigRecordView } from '@satchel/core/clean-history'
import { banner, bool, expect, isMain, makeCtx, parseCli, runMain, str, type Ctx } from '../lib/run'
import { HELP_COMMON, readAllRecords, readSatchel } from './common'

const OPTIONS = { token: { type: 'string', default: '1' } } as const

const HELP = `tools/e2e/history.ts: recompute history_digest(token_id) from sig_records and compare (read-only; C1).
  --token <id> (default 1)
${HELP_COMMON}`

export interface HistoryDigestView {
  sig_count: number
  digest_hex: string
}

export async function checkHistoryDigest(ctx: Ctx, tokenId: string, contract = ctx.cfg.contract): Promise<{ onchain: HistoryDigestView | null; recomputed: string; records: SigRecordView[]; match: boolean }> {
  const s = await readSatchel(ctx, tokenId, contract)
  if (!s) throw new Error(`#${tokenId} on ${contract} does not exist (or is unreadable)`)
  const records = await readAllRecords(ctx, tokenId, s.sig_count, contract)
  if (records.length !== s.sig_count) throw new Error(`read ${records.length} records, but sig_count is ${s.sig_count} (paging gap)`)
  const recomputed = historyDigest(contract, tokenId, records)
  const onchain = ctx.offline ? null : await ctx.rpc.view<HistoryDigestView | null>(contract, 'history_digest', { token_id: tokenId })
  return { onchain, recomputed, records, match: onchain !== null && onchain.digest_hex === recomputed }
}

async function main(): Promise<void> {
  const v = parseCli(process.argv.slice(2), OPTIONS)
  if (bool(v, 'help')) return void console.log(HELP)
  const ctx = makeCtx(v)
  banner(ctx, 'e2e/history')
  const token = str(v, 'token')!
  if (ctx.offline) return void ctx.log('    note      --offline: history_digest is read-only and needs a network; nothing to show')
  const r = await checkHistoryDigest(ctx, token)
  ctx.log(`    records   ${r.records.length} rows (seq 0..${r.records.length - 1})`)
  ctx.log(`    recomputed ${r.recomputed}`)
  ctx.log(`    on-chain   ${r.onchain ? `${r.onchain.digest_hex} (sig_count ${r.onchain.sig_count})` : 'unavailable (offline, or null = token does not exist)'}`)
  if (r.onchain) {
    expect(ctx, r.onchain.sig_count === r.records.length, `on-chain sig_count ${r.onchain.sig_count} == records read ${r.records.length}`)
    expect(ctx, r.match, 'recomputed digest == history_digest view (independent implementations agree, C1)')
  } else ctx.log('    note      no on-chain digest to compare against; recomputed value only')
}

if (isMain(import.meta.url)) runMain(main)
