/**
 * SigningStep — one row of client/SigningProgress.tsx (the 4-step tracker that becomes the receipt).
 *
 * API (pure; sizes = product px × k, default k = 2.25):
 *   <SigningStep state="future|active|done|failed" label? step="wallet|mpc|broadcast|confirm" network? k? pulse? />
 *       Icon (CircleDashed future · pulsing frozen dot active · Check success done · CircleX danger failed) + label.
 *       With `step`, the label defaults to the product copy for that step and state, e.g. mpc:
 *       "Sign with NEAR's signer network" → "Signing with NEAR's signer network" → "Signed by NEAR's signer network".
 *       `pulse` 0..1 = the active dot's opacity (drive with a 1.2 s sine for the product's pulse keyframe).
 */
import type { CSSProperties, ReactNode } from "react";
import { Check, CircleDashed, CircleX } from "lucide-react";
import { C } from "../../brand/tokens";
import { K, STROKE, txt } from "./base";

export type StepState = "future" | "active" | "done" | "failed";
export type StepKind = "wallet" | "mpc" | "broadcast" | "confirm";

export const SIGN_COPY = {
  wallet: { future: "Approved in your wallet", active: "Approve in your wallet…", done: "Approved in your wallet" },
  mpc: { future: "Sign with NEAR's signer network", active: "Signing with NEAR's signer network", done: "Signed by NEAR's signer network" },
  broadcast: { future: (n: string) => `Broadcast to ${n}`, active: (n: string) => `Broadcasting to ${n}`, done: (n: string) => `Broadcast to ${n}` },
  confirm: { future: "Confirmation", active: "Waiting for 1 confirmation", done: "Confirmed" },
  credit: "Signatures by NEAR Chain Signatures",
} as const;

function stepLabel(step: StepKind, state: StepState, network: string) {
  const s = state === "failed" ? "active" : state;
  const v = SIGN_COPY[step][s];
  return typeof v === "function" ? v(network) : v;
}

export function SigningStep({
  state,
  label,
  step = "mpc",
  network = "Ethereum",
  k = K,
  pulse = 1,
  style,
}: {
  state: StepState;
  label?: ReactNode;
  step?: StepKind;
  network?: string;
  k?: number;
  pulse?: number;
  style?: CSSProperties;
}) {
  const icon =
    state === "done" ? (
      <Check size={20 * k} strokeWidth={STROKE} color={C.success} />
    ) : state === "failed" ? (
      <CircleX size={20 * k} strokeWidth={STROKE} color={C.danger} />
    ) : state === "active" ? (
      <span style={{ width: 10 * k, height: 10 * k, borderRadius: 99, background: C.frozen, opacity: pulse }} />
    ) : (
      <CircleDashed size={20 * k} strokeWidth={STROKE} color={C.inkMuted} />
    );
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 * k, ...style }}>
      <span style={{ display: "inline-grid", placeItems: "center", width: 20 * k, height: 20 * k, marginTop: 1 * k, flexShrink: 0 }}>{icon}</span>
      <p style={{ ...txt("body", k), margin: 0, fontWeight: state === "active" ? 600 : 400, color: state === "future" ? C.inkMuted : C.ink }}>{label ?? stepLabel(step, state, network)}</p>
    </div>
  );
}
