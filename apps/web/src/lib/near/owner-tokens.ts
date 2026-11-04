import type { ContractViews } from "@/lib/near/contract";

/**
 * Every Satchel an account owns, not just page 0 (security review round 3, R3-X-3). `nft_mint` is open to any receiver
 * and `nft_tokens_for_owner` is insertion-ordered with swap-remove, so a handful of spam mints can push a newly
 * received Satchel off the first page. This pages until `nft_supply_for_owner` is reached, with a hard page cap so a
 * hostile account can't make a reader loop forever.
 *
 * Swap-remove can shift entries between pages while we read, so rows are de-duplicated by token id. The result is
 * sorted by numeric id. `truncated` is true when the cap stopped us before the supply was reached ("showing the
 * first N"); `total` is the on-chain supply when known.
 */

export const OWNER_PAGE_SIZE = 50;
export const OWNER_MAX_PAGES = 20;

export interface OwnerTokens {
  tokens: { token_id: string; owner_id: string }[];
  /** `nft_supply_for_owner`, or the number found when the supply read failed. */
  total: number;
  /** True when the page cap was hit before the supply was reached: the list is the first `tokens.length` only. */
  truncated: boolean;
}

export type OwnerTokenViews = Pick<ContractViews, "nftTokensForOwner" | "nftSupplyForOwner">;

export function compareTokenIds(a: string, b: string): number {
  const x = BigInt(/^\d+$/.test(a) ? a : "0");
  const y = BigInt(/^\d+$/.test(b) ? b : "0");
  return x < y ? -1 : x > y ? 1 : a < b ? -1 : a > b ? 1 : 0;
}

export async function listOwnerTokens(
  views: OwnerTokenViews,
  accountId: string,
  opts: { pageSize?: number; maxPages?: number } = {},
): Promise<OwnerTokens> {
  const pageSize = opts.pageSize ?? OWNER_PAGE_SIZE;
  const maxPages = opts.maxPages ?? OWNER_MAX_PAGES;
  // the supply is a bound, not a requirement: if the read fails we stop on the first short page instead
  const supply = await views.nftSupplyForOwner(accountId).catch(() => null);
  const byId = new Map<string, { token_id: string; owner_id: string }>();
  let from = 0;
  let pages = 0;
  let exhausted = false;
  while (pages < maxPages) {
    const page = await views.nftTokensForOwner(accountId, String(from), pageSize);
    pages += 1;
    for (const t of page) if (!byId.has(t.token_id)) byId.set(t.token_id, t);
    from += page.length;
    if (page.length < pageSize || (supply !== null && from >= supply)) {
      exhausted = true;
      break;
    }
  }
  const tokens = [...byId.values()].sort((a, b) => compareTokenIds(a.token_id, b.token_id));
  return { tokens, total: supply ?? tokens.length, truncated: !exhausted };
}
