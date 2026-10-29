import type { PendingIntent, SigningEvent, SigningStage } from "@/lib/signing/types";

/**
 * The SigningProgress state machine (kb/90 §8.6). Pure: (intent, event) → intent.
 * Driven by chain state (contract watcher + tx tracker), never by the wallet promise.
 */

export const REJECT_RE = /reject|cancel|denied|closed/i;
export const CANCEL_GRACE_MS = 10_000; // a rejection counts only if no record appears within 10 s
export const UNKNOWN_AFTER_BLOCKS = 250; // h0 + 250 with no terminal state → unknown (never "failed")
export const WALLET_SLOW_MS = 60_000;

/** Intear's post-broadcast timeout is NOT a rejection (kb/40 §Client flow 5). */
export function isRejection(message: string): boolean {
  if (/Failed to send transaction \d+: Timeout/i.test(message)) return false;
  return REJECT_RE.test(message);
}

const IN_FLIGHT: ReadonlySet<SigningStage> = new Set(["awaiting_wallet", "signing", "unknown"]);

export function transition(intent: PendingIntent, ev: SigningEvent): PendingIntent {
  const s = intent.stage;
  const to = (stage: SigningStage, patch: Partial<PendingIntent> = {}): PendingIntent => ({ ...intent, ...patch, stage });

  switch (ev.type) {
    case "SEND":
      return s === "idle" ? to("preparing") : intent;

    case "PERSISTED":
      return s === "preparing" ? to("awaiting_wallet", { walletAt: ev.now }) : intent;

    case "PREPARE_ERROR":
      return s === "preparing" ? to("failed", { error: ev.error }) : intent;

    case "TX_HASH":
      if (s === "awaiting_wallet" || s === "cancelled") return to("signing", { nearTxHash: ev.hash, signingAt: intent.signingAt ?? ev.now, rejectedAt: undefined });
      return intent.nearTxHash === ev.hash ? intent : { ...intent, nearTxHash: ev.hash };

    case "RECORD_SEEN":
      // A late record after a "cancel" means the wallet did send it: keep tracking (nothing is ever lost).
      if (s === "awaiting_wallet" || s === "cancelled") return to("signing", { seqs: ev.seqs, signingAt: intent.signingAt ?? ev.now, rejectedAt: undefined });
      if (s === "signing" || s === "unknown") return { ...intent, seqs: ev.seqs };
      return intent;

    case "WALLET_REJECTED":
      if (s !== "awaiting_wallet") return intent;
      if (!isRejection(ev.message)) return { ...intent, error: ev.message }; // keep watching
      return { ...intent, rejectedAt: intent.rejectedAt ?? ev.now };

    case "TICK": {
      if (s === "awaiting_wallet" && intent.rejectedAt != null && !intent.seqs?.length && !intent.nearTxHash) {
        if (ev.now - intent.rejectedAt >= CANCEL_GRACE_MS) return to("cancelled");
      }
      if ((s === "signing" || (s === "awaiting_wallet" && intent.nearTxHash)) && ev.height != null) {
        if (ev.height >= intent.heightBefore + UNKNOWN_AFTER_BLOCKS) return to("unknown");
      }
      return intent;
    }

    case "RECORDS": {
      if (s !== "signing" && s !== "unknown") return intent;
      if (ev.statuses.some((x) => x === "failed")) return to("timed_out", { signatures: ev.signatures });
      const n = intent.payloadHashes.length;
      if (ev.statuses.length >= n && ev.statuses.slice(0, n).every((x) => x === "signed") && ev.signatures.slice(0, n).every(Boolean)) {
        return to("signed", { signatures: ev.signatures.slice(0, n) });
      }
      return intent;
    }

    case "TX_SUCCESS": {
      if (!IN_FLIGHT.has(s)) return intent;
      const n = intent.payloadHashes.length;
      const sigs = ev.signatures.slice(0, n);
      if (sigs.length === n && sigs.every(Boolean)) return to("signed", { signatures: sigs });
      return to("timed_out", { signatures: sigs });
    }

    case "TX_FAILURE":
      // sign_for panics before writing a record (ERR_*). If records exist, on_signed itself failed: the
      // signature is still public in the MPC receipts, so stay in signing and let the runner scan them.
      if (!IN_FLIGHT.has(s)) return intent;
      if (intent.seqs?.length) return intent;
      return to("failed", { error: ev.code });

    case "VERIFIED":
      return s === "signed" ? to("broadcasting") : intent;

    case "VERIFY_FAILED":
      return s === "signed" ? to("failed", { error: "E22" }) : intent;

    case "BROADCAST_OK":
      return s === "broadcasting" || s === "signed_not_sent" ? to("sent", { chainTxId: ev.chainTxId, sentAt: ev.now, notSentReason: undefined }) : intent;

    case "BROADCAST_ERROR":
      return s === "broadcasting" ? to("signed_not_sent", { notSentReason: ev.reason }) : intent;

    case "SOL_EXPIRED":
      return s === "broadcasting" || s === "signed" ? to("expired") : intent;

    case "CONFIRMED":
      return s === "sent" ? to("confirmed", { confirmedAt: ev.now }) : intent;

    case "BROADCAST_AGAIN":
      return s === "signed_not_sent" ? to("broadcasting") : intent;

    case "CHECK_AGAIN":
      return s === "unknown" ? to("signing", { signingAt: ev.now }) : intent;

    case "RETRY":
      if (s === "cancelled" || s === "timed_out" || s === "expired" || s === "failed") {
        // Same nonce / same inputs (kb/90 §8.7): `evmNonce` and `unsigned.btc.inputs` are kept; the runner re-prepares.
        return to("preparing", {
          nearTxHash: undefined,
          seqs: undefined,
          signatures: undefined,
          rejectedAt: undefined,
          walletAt: undefined,
          signingAt: undefined,
          error: undefined,
          chainTxId: undefined,
          createdAt: ev.now,
        });
      }
      return intent;
  }
}

/** ETA copy thresholds while signing (kb/90 §8.6; copy keys sign.mpc.0/.20/.60/.150). */
export function etaKey(elapsedMs: number): 0 | 20 | 60 | 150 {
  const s = elapsedMs / 1000;
  if (s >= 150) return 150;
  if (s >= 60) return 60;
  if (s >= 20) return 20;
  return 0;
}

/** Which of the 4 tracker rows is active / done for a stage (send flow). */
export type RowState = "future" | "active" | "done" | "failed";
export function trackerRows(stage: SigningStage): [RowState, RowState, RowState, RowState] {
  switch (stage) {
    case "idle":
    case "preparing":
    case "awaiting_wallet":
      return ["active", "future", "future", "future"];
    case "signing":
    case "unknown":
      return ["done", "active", "future", "future"];
    case "timed_out":
      return ["done", "failed", "future", "future"];
    case "signed":
    case "broadcasting":
      return ["done", "done", "active", "future"];
    case "signed_not_sent":
    case "expired":
      return ["done", "done", "failed", "future"];
    case "sent":
      return ["done", "done", "done", "active"];
    case "confirmed":
      return ["done", "done", "done", "done"];
    case "cancelled":
      return ["failed", "future", "future", "future"];
    case "failed":
      return ["done", "failed", "future", "future"];
  }
}

/** The owner-visible "Needs attention" condition for the pill (kb/81 R3). */
export function needsAttention(intent: PendingIntent): boolean {
  return intent.stage === "signed_not_sent";
}

export function isInFlight(intent: PendingIntent): boolean {
  return intent.stage === "preparing" || intent.stage === "awaiting_wallet" || intent.stage === "signing" || intent.stage === "signed" || intent.stage === "broadcasting";
}
