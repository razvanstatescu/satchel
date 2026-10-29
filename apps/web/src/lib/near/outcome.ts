import { MPC_CONTRACT } from "@/lib/config";
import type { TxOutcome } from "@/lib/near/track-tx";

/**
 * Decoding tx outcomes (kb/90 §8.2 `lib/near/outcome.ts`, §5.8).
 * - `sign_for`'s SuccessValue is on_signed's return: a JSON array with one raw MPC response (or null) per request.
 * - Fallback when on_signed failed or the value is missing: scan receipts_outcome of the MPC account and assign each
 *   signature to the payload it verifies against (the verifier comes from @satchel/core; default = receipt order).
 * - Failures map to the stable `ERR_*` prefix (kb/90 §5.15) or a known MPC string (E7/E9/E10).
 */

export function base64ToBytes(b64: string): Uint8Array {
  const bin = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function decodeSuccessValue(b64: string | undefined | null): unknown {
  if (!b64) return null;
  const text = new TextDecoder().decode(base64ToBytes(b64));
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export type MpcSecpResponse = { scheme: "Secp256k1"; big_r: { affine_point: string }; s: { scalar: string }; recovery_id: number };
export type MpcEdResponse = { scheme: "Ed25519"; signature: number[] };
export type MpcResponse = MpcSecpResponse | MpcEdResponse;

export function isMpcResponse(v: unknown): v is MpcResponse {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (o.scheme === "Secp256k1") {
    const br = o.big_r as { affine_point?: unknown } | undefined;
    const s = o.s as { scalar?: unknown } | undefined;
    return typeof br?.affine_point === "string" && typeof s?.scalar === "string" && typeof o.recovery_id === "number";
  }
  if (o.scheme === "Ed25519") return Array.isArray(o.signature) && (o.signature as unknown[]).length === 64;
  return false;
}

/** EVM yParity = recovery_id, never the big_r prefix (kb/90 §5.8). r = affine_point without its 02/03 prefix. */
export function secpParts(sig: MpcSecpResponse): { r: string; s: string; yParity: number } {
  const ap = sig.big_r.affine_point.toLowerCase();
  if (ap.length !== 66) throw new Error("big_r must be a 33-byte compressed point");
  return { r: ap.slice(2), s: sig.s.scalar.toLowerCase(), yParity: sig.recovery_id };
}

/** sign_for's return value: Vec<Option<Value>> in input order. */
export function signaturesFromSuccess(value: unknown, n: number): (MpcResponse | null)[] {
  const arr = Array.isArray(value) ? value : [value];
  const out: (MpcResponse | null)[] = [];
  for (let i = 0; i < n; i++) out.push(isMpcResponse(arr[i]) ? (arr[i] as MpcResponse) : null);
  return out;
}

/** Fallback: MPC receipts' SuccessValues (kb/90 §5.8 last bullet). */
export function signaturesFromReceipts(
  outcome: TxOutcome,
  payloads: string[],
  verifies?: (sig: MpcResponse, payloadHex: string) => boolean,
  mpcAccount: string = MPC_CONTRACT,
): (MpcResponse | null)[] {
  const found: MpcResponse[] = [];
  for (const r of outcome.receipts_outcome ?? []) {
    if (r.outcome.executor_id !== mpcAccount) continue;
    const st = r.outcome.status as Record<string, unknown> | undefined;
    if (!st || typeof st !== "object" || !("SuccessValue" in st)) continue;
    const v = decodeSuccessValue(st.SuccessValue as string);
    if (isMpcResponse(v)) found.push(v);
  }
  const out: (MpcResponse | null)[] = payloads.map(() => null);
  if (verifies) {
    const used = new Set<number>();
    payloads.forEach((p, i) => {
      const j = found.findIndex((s, k) => !used.has(k) && verifies(s, p));
      if (j >= 0) {
        used.add(j);
        out[i] = found[j];
      }
    });
    return out;
  }
  found.slice(0, payloads.length).forEach((s, i) => (out[i] = s));
  return out;
}

export interface MappedFailure {
  code: string; // ERR_* | MPC_TIMEOUT | MPC_GAS | MPC_QUEUE | MPC_REJECTED | UNKNOWN
  message: string;
}

const MPC_STRINGS: [RegExp, string][] = [
  [/Request has timed out\./, "MPC_TIMEOUT"],
  [/Provided gas is lower than required/, "MPC_GAS"],
  [/Pending-request queue is full/, "MPC_QUEUE"],
  [/InsufficientDeposit|MalformedPayload|DomainNotFound/, "MPC_REJECTED"],
];

/** Find the first panic text anywhere in a Failure object or the receipts, then map its stable prefix. */
export function mapFailure(failure: unknown, outcome?: TxOutcome): MappedFailure {
  const texts: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") texts.push(v);
    else if (v && typeof v === "object") for (const x of Object.values(v)) walk(x);
  };
  walk(failure);
  for (const r of outcome?.receipts_outcome ?? []) {
    const st = r.outcome.status as Record<string, unknown> | undefined;
    if (st && "Failure" in st) walk(st.Failure);
  }
  for (const t of texts) {
    const m = t.match(/\b(ERR_[A-Z0-9_]+)\b/);
    if (m) return { code: m[1], message: t };
  }
  for (const t of texts) for (const [re, code] of MPC_STRINGS) if (re.test(t)) return { code, message: t };
  if (texts.some((t) => /NotEnoughBalance|LackBalanceForState/.test(t))) return { code: "NOT_ENOUGH_BALANCE", message: texts.join(" ") };
  return { code: "UNKNOWN", message: texts[0] ?? "Unknown failure" };
}

/** NEP-297 events emitted by `contractId` in a tx outcome. */
export function eventsFromOutcome(outcome: TxOutcome, contractId: string) {
  const out: { standard: string; event: string; data: unknown }[] = [];
  for (const r of outcome.receipts_outcome ?? []) {
    if (r.outcome.executor_id !== contractId) continue;
    for (const log of r.outcome.logs ?? []) {
      if (!log.startsWith("EVENT_JSON:")) continue;
      try {
        out.push(JSON.parse(log.slice("EVENT_JSON:".length)));
      } catch {
        /* ignore malformed logs */
      }
    }
  }
  return out;
}

/** USDC `ft_transfer_call` returns the *used* amount: "0" means refunded (kb/90 §5.12). */
export function usdcBuyUsedAmount(value: unknown): string | null {
  if (typeof value === "string" && /^\d+$/.test(value)) return value;
  return null;
}
