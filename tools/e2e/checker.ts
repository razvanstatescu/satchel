/**
 * Run `@satchel/core/clean-history` from Node exactly as the buyer's browser does (spec §7.5 place 3): two NEAR
 * sources (FastNEAR, dRPC), two Sepolia providers, mempool.space + emzy, devnet. Read-only.
 */
import {
  checkCleanHistory,
  collectNearSnapshot,
  esploraBtcSource,
  jsonRpcEvmSource,
  memoryVerdictCache,
  solRpcSource,
  type CleanHistoryReport,
  type NearViews,
} from '@satchel/core/clean-history'
import type { ToolConfig } from '../lib/config'
import { NearRpc, RpcError } from '../lib/near-rpc'

export function nearViewsFor(rpc: NearRpc): NearViews {
  return {
    viewFunction: (c, m, a) => rpc.view(c, m, a),
    viewAccount: async (id) => {
      try {
        const a = await rpc.call<{ code_hash: string }>('query', { request_type: 'view_account', finality: 'final', account_id: id })
        return { code_hash: a.code_hash }
      } catch (e) {
        if (e instanceof RpcError && e.kind === 'UNKNOWN_ACCOUNT') return null
        throw e
      }
    },
    viewAccessKeyList: (id) => rpc.viewAccessKeyList(id),
  }
}

export async function runCleanHistory(cfg: ToolConfig, tokenId: string, contract = cfg.contract): Promise<CleanHistoryReport> {
  const near = await Promise.all(
    cfg.nearRpcs.slice(0, 2).map((url) =>
      collectNearSnapshot(new URL(url).host, nearViewsFor(new NearRpc([url], { apiKey: cfg.fastnearApiKey, rounds: 2 })), contract, tokenId, { mpcContract: cfg.mpc }),
    ),
  )
  return checkCleanHistory(
    {
      network: 'testnet',
      contractId: contract,
      tokenId,
      role: cfg.role,
      ...(cfg.expectedCodeHash ? { expectedCodeHash: cfg.expectedCodeHash } : {}),
      near,
      now: Date.now(),
    },
    {
      evm: cfg.sepoliaRpcs.slice(0, 2).map((u) => jsonRpcEvmSource(u)),
      btc: cfg.btcApis.slice(0, 2).map((u) => esploraBtcSource(u)),
      sol: cfg.solRpcs.slice(0, 1).map((u) => solRpcSource(u)),
      cache: memoryVerdictCache(),
    },
  )
}

export function summarizeReport(r: CleanHistoryReport): string[] {
  return [
    `    clean     aggregate ${r.aggregate}${r.sources_note ? ` (${r.sources_note})` : ''}; buy ${r.buy_enabled ? 'enabled' : 'DISABLED'}; sig_count ${r.sig_count}; expected_sig_count ${r.expected_sig_count}`,
    ...(r.reasons.length ? [`    reasons   ${r.reasons.join('; ')}`] : []),
    ...(r.warnings.length ? [`    warnings  ${r.warnings.join('; ')}`] : []),
    ...r.items.map((i) => `    item      seq ${i.seq} ${i.chain} ${i.status} (${i.reason})${i.outpoint ? ` ${i.outpoint}` : ''}${i.nonce ? ` nonce ${i.nonce}` : ''}`),
  ]
}
