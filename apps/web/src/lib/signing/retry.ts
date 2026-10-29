import type { Chain } from "@/lib/near/types";
import type { PendingIntent, SigningStage } from "@/lib/signing/types";

/**
 * Retry and replacement rules (kb/90 §8.7): at most one spendable signature per intent.
 */

const SEPOLIA_ID = 11155111;

/** Stages after which a signature may exist (or does) and no chain tx has consumed its nonce/inputs yet. */
const SPENDABLE_UNSENT: ReadonlySet<SigningStage> = new Set([
  "awaiting_wallet",
  "signing",
  "signed",
  "broadcasting",
  "signed_not_sent",
  "timed_out",
  "unknown",
]);
// Not "expired": that stage exists only for SOL and means the blockhash is past lastValidBlockHeight, so the signature
// can never land (kb/90 §8.6). It doesn't block a fresh send.

/**
 * An earlier intent of the same token and chain that blocks a fresh, independent send. EVM nonces are per chain id
 * (C3): pass `evmChainId` and only an intent on that chain blocks (an intent without one is Sepolia). Message intents
 * (C7) never block: a message uses no nonce and no coin.
 */
export function blockingIntent(intents: readonly PendingIntent[], tokenId: string, chain: Chain, evmChainId?: number): PendingIntent | null {
  const superseded = new Set(intents.map((i) => i.replaces).filter(Boolean) as string[]);
  for (const i of intents) {
    if (i.tokenId !== tokenId || i.chain !== chain || superseded.has(i.id) || i.message) continue;
    if (chain === "evm" && evmChainId !== undefined && (i.evmChainId ?? SEPOLIA_ID) !== evmChainId) continue;
    if (SPENDABLE_UNSENT.has(i.stage)) return i;
    // A verify failure after signatures came back still leaves a public signature.
    if (i.stage === "failed" && i.signatures?.some(Boolean)) return i;
  }
  return null;
}

export interface RetryPlan {
  chain: Chain;
  /** EVM: the nonce the replacement must reuse. */
  evmNonce?: number;
  /** BTC: the exact input set (txid:vout) the replacement must reuse; outputs and fee may change. */
  btcInputs?: string[];
  /** SOL: rebuild only once the old blockhash is invalid. */
  solWaitForExpiry?: boolean;
  /** SOL: the old lastValidBlockHeight; the replacement is built only when the chain is past it. */
  solNotBefore?: number;
  /** EVM: bump both fee caps ≥ 10 % when the first may be in the mempool (geth PriceBump 10). */
  bumpFees: boolean;
}

export function retryPlan(prev: PendingIntent): RetryPlan {
  const mayBeInMempool = prev.stage === "signed_not_sent" || prev.stage === "unknown" || prev.stage === "timed_out";
  switch (prev.chain) {
    case "evm":
      if (prev.evmNonce == null) throw new Error("EVM retry needs the earlier nonce");
      return { chain: "evm", evmNonce: prev.evmNonce, bumpFees: mayBeInMempool };
    case "btc":
      if (!prev.unsigned.btc?.inputs.length) throw new Error("BTC retry needs the earlier input set");
      return { chain: "btc", btcInputs: [...prev.unsigned.btc.inputs], bumpFees: false };
    case "sol":
      return { chain: "sol", solWaitForExpiry: prev.stage !== "expired", solNotBefore: prev.unsigned.sol?.lastValidBlockHeight, bumpFees: false };
  }
}

/** Fee caps for an EVM replacement: ceil(x × 1.10), never lower than the original. */
export function bumpEvmFee(wei: bigint): bigint {
  return (wei * 110n + 99n) / 100n;
}

/** A BTC replacement candidate must spend exactly the earlier inputs (order-insensitive). */
export function sameInputSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}
