/**
 * Which tokens a claim moves (security review round 3, R3-X-4). A give-by-link account is a public implicit account:
 * anyone can mint or transfer a Satchel into it after the link is shared. So the claim moves only the gifted ids the
 * link names; anything else found there is shown as "also here, not part of this gift" and left alone.
 *
 * Older links carry no ids. For those (`gift === null`) the claim keeps its old behaviour (everything found), and the
 * UI labels it as such so the claimer checks each row.
 */

export interface ClaimPlan {
  /** Tokens this claim will move. */
  claim: string[];
  /** Tokens in the account that are not part of the gift (never claimed by default). Empty for a legacy link. */
  others: string[];
  /** Gifted ids not found in the account (already claimed, or never arrived). */
  missing: string[];
  /** True for an older link with no gift list: everything found is claimed. */
  legacy: boolean;
}

export function planClaim(found: readonly string[], gift: readonly string[] | null): ClaimPlan {
  if (gift === null) return { claim: [...found], others: [], missing: [], legacy: true };
  const have = new Set(found);
  const wanted = new Set(gift);
  return {
    claim: gift.filter((id) => have.has(id)),
    others: found.filter((id) => !wanted.has(id)),
    missing: gift.filter((id) => !have.has(id)),
    legacy: false,
  };
}

export interface ClaimOutcome {
  moved: string[];
  failed: string[];
  nearSentYocto: bigint;
}

/**
 * Run the claim: transfer each token on its own, collecting failures instead of throwing, then ALWAYS attempt the NEAR
 * sweep (one failed transfer, or an exception in the loop, must not skip it).
 */
export async function runClaim(
  tokenIds: readonly string[],
  transfer: (tokenId: string) => Promise<void>,
  sweep: () => Promise<bigint>,
): Promise<ClaimOutcome> {
  const moved: string[] = [];
  const failed: string[] = [];
  for (const id of tokenIds) {
    try {
      await transfer(id);
      moved.push(id);
    } catch {
      failed.push(id);
    }
  }
  let nearSentYocto = 0n;
  try {
    nearSentYocto = await sweep();
  } catch {
    nearSentYocto = 0n;
  }
  return { moved, failed, nearSentYocto };
}
