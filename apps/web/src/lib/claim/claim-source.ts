import { Account, actions, type KeyPairString } from "near-api-js";
import { IS_FIXTURE, SATCHEL_CONTRACT } from "@/lib/config";
import { ATTACH } from "@/lib/near/constants";
import { contractViews } from "@/lib/near/contract";
import { nearProvider, nearView, nearViewAccount } from "@/lib/near/rpc";
import { simClaim, simImplicitExists, simNearBalance } from "@/lib/data/sim";
import type { ClaimKey } from "@/lib/claim/link";
import { runClaim } from "@/lib/claim/plan";
import { listOwnerTokens } from "@/lib/near/owner-tokens";

/**
 * The claim page's reads and the claim itself (A2 Give by link). Fixture mode never touches a real RPC or key: it
 * reads/writes the same in-browser sim the mock wallet uses. Live mode reads the implicit account directly from
 * NEAR testnet and signs with the key from the link's fragment, locally in this tab — never sent anywhere.
 */

export interface ClaimAccountState {
  /** Does the implicit account exist on chain (fixture: has it ever been funded)? */
  exists: boolean;
  nearYocto: bigint;
  /** Every Satchel the account holds right now (all pages), the gift and anything an outsider added. */
  tokenIds: string[];
  /** The owner-list page cap was hit: more tokens exist than `tokenIds` lists. */
  truncated: boolean;
}

export async function readClaimAccount(implicitAccountId: string): Promise<ClaimAccountState> {
  if (IS_FIXTURE) {
    const exists = simImplicitExists(implicitAccountId);
    const nearYocto = BigInt(simNearBalance(implicitAccountId));
    if (!exists) return { exists, nearYocto, tokenIds: [], truncated: false };
    const { dataSource } = await import("@/lib/data/source");
    const owned = await listOwnerTokens(contractViews(dataSource().view), implicitAccountId);
    return { exists, nearYocto, tokenIds: owned.tokens.map((t) => t.token_id), truncated: owned.truncated };
  }
  let exists = false;
  let nearYocto = 0n;
  try {
    const acc = await nearViewAccount(implicitAccountId);
    exists = true;
    nearYocto = BigInt(acc.amount);
  } catch {
    exists = false;
  }
  const views = contractViews(async <T,>(c: string, m: string, a: Record<string, unknown>) => nearView<T>(c, m, a), SATCHEL_CONTRACT);
  // a failed token read is an error for the page (retry), not "no tokens": it must never look like "already claimed"
  const owned = exists ? await listOwnerTokens(views, implicitAccountId) : { tokens: [], truncated: false };
  return { exists, nearYocto, tokenIds: owned.tokens.map((t) => t.token_id), truncated: owned.truncated };
}

/** 0.01 NEAR kept back for the claim's own gas (never swept to the claimer; near-api-js estimates the rest). */
const CLAIM_GAS_RESERVE_YOCTO = 10_000_000_000_000_000_000_000n;

export interface ClaimResult {
  /** Tokens that moved to the claimer. */
  tokenIds: string[];
  /** Tokens that were meant to move but whose transfer failed (retry the claim). */
  failedIds: string[];
  nearSentYocto: bigint;
}

/**
 * Claim `tokenIds` (the gifted ids; R3-X-4) plus the account's leftover NEAR to `claimerAccountId`. Only ids the
 * account really holds are transferred. Each transfer is isolated so one failure cannot skip the rest or the NEAR sweep.
 */
export async function claimToWallet(key: ClaimKey, claimerAccountId: string, tokenIds: readonly string[]): Promise<ClaimResult> {
  if (IS_FIXTURE) {
    const r = simClaim(key.implicitAccountId, claimerAccountId, tokenIds);
    return { tokenIds: r.tokenIds, failedIds: [], nearSentYocto: BigInt(r.nearSent) };
  }
  const state = await readClaimAccount(key.implicitAccountId);
  if (!state.exists) return { tokenIds: [], failedIds: [], nearSentYocto: 0n };
  const held = new Set(state.tokenIds);
  const toMove = tokenIds.filter((id) => held.has(id));
  if (toMove.length === 0) return { tokenIds: [], failedIds: [], nearSentYocto: 0n };
  const provider = nearProvider();
  const account = new Account(key.implicitAccountId, provider, key.secretKey as KeyPairString);
  const out = await runClaim(
    toMove,
    async (tokenId) => {
      await account.signAndSendTransaction({
        receiverId: SATCHEL_CONTRACT,
        actions: [actions.functionCall("nft_transfer", { receiver_id: claimerAccountId, token_id: tokenId }, BigInt(ATTACH.transfer.gas), 1n)],
      });
    },
    async () => {
      const after = await nearViewAccount(key.implicitAccountId).catch(() => null);
      const balance = after ? BigInt(after.amount) : 0n;
      const toSend = balance > CLAIM_GAS_RESERVE_YOCTO ? balance - CLAIM_GAS_RESERVE_YOCTO : 0n;
      if (toSend > 0n) await account.signAndSendTransaction({ receiverId: claimerAccountId, actions: [actions.transfer(toSend)] });
      return toSend;
    },
  );
  return { tokenIds: out.moved, failedIds: out.failed, nearSentYocto: out.nearSentYocto };
}
