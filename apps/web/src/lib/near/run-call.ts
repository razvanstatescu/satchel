"use client";

import { IS_FIXTURE, NEAR_RPCS } from "@/lib/config";
import type { WalletTx } from "@/lib/near/contract";
import { decodeSuccessValue, mapFailure, type MappedFailure } from "@/lib/near/outcome";
import { isRejection } from "@/lib/signing/machine";
import type { WalletAdapter } from "@/lib/near/wallet";

/**
 * The 3-step subset (mint, transfer, list, delist, buy): call the wallet synchronously, then trust only chain state:
 * a hash → long-poll the tx; the wallet's resolved value is used only to learn the hash (kb/90 §8.5, §8.6).
 */

export type CallResult = { ok: true; hash: string | null; value: unknown } | { ok: false; cancelled: true } | { ok: false; failure: MappedFailure; hash: string | null };

export function runCall(wallet: WalletAdapter, tx: WalletTx, signerId: string, onStage?: (s: "wallet" | "processing") => void): Promise<CallResult> {
  onStage?.("wallet");
  const p = wallet.signAndSendTransaction({ ...tx, signerId });
  return p.then(
    async (outcome) => {
      onStage?.("processing");
      const o = outcome as { transaction?: { hash?: string }; status?: Record<string, unknown>; final_execution_status?: string } | null;
      const hash = o?.transaction?.hash ?? null;
      if (IS_FIXTURE || !hash) {
        const st = o?.status;
        if (st && "Failure" in st) return { ok: false as const, failure: mapFailure(st.Failure), hash };
        return { ok: true as const, hash, value: st && "SuccessValue" in st ? decodeSuccessValue(st.SuccessValue as string) : null };
      }
      // the tracker (and the RPC client behind it) loads here, after the wallet call: nothing waits on it before the popup
      const { trackTx } = await import("@/lib/near/track-tx");
      const r = await trackTx({ txHash: hash, senderId: signerId, rpcUrls: NEAR_RPCS });
      if (r.ok) return { ok: true as const, hash, value: r.value };
      if ("failure" in r) return { ok: false as const, failure: mapFailure(r.failure, r.outcome), hash };
      return { ok: false as const, failure: { code: "UNKNOWN", message: "NEAR hasn't confirmed this transaction yet." }, hash };
    },
    (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      if (isRejection(msg)) return { ok: false as const, cancelled: true as const };
      return { ok: false as const, failure: { code: "UNKNOWN", message: msg }, hash: null };
    },
  );
}
