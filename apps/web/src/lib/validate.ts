import { toChecksumAddress } from "@satchel/core/derive";
import { copy } from "@/lib/copy";

/**
 * Recipient validation (kb/80 R3 §Recipient validation). Tiers: error (blocks Review), warning (needs "I checked this
 * address"), info. BTC is validated with the same call that builds the output script (lazy-loaded with the Send flow).
 */

export type Validation = { tier: "ok"; normalized: string } | { tier: "error"; message: string } | { tier: "warning"; message: string; normalized: string };

export function validateEvm(input: string, self: string): Validation {
  const a = input.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(a)) return { tier: "error", message: copy.send.val.evmFormat };
  if (/^0x0{40}$/i.test(a)) return { tier: "error", message: copy.send.val.evmZero };
  if (a.toLowerCase() === self.toLowerCase()) return { tier: "error", message: copy.send.val.self };
  const lower = a.slice(2) === a.slice(2).toLowerCase();
  const upper = a.slice(2) === a.slice(2).toUpperCase();
  if (!lower && !upper && toChecksumAddress(a) !== a) return { tier: "error", message: copy.send.val.evmTypo };
  if (lower || upper) return { tier: "warning", message: "This address has no checksum. Check it carefully.", normalized: toChecksumAddress(a) };
  return { tier: "ok", normalized: a };
}

export async function validateBtc(input: string, self: string): Promise<Validation> {
  const a = input.trim();
  if (/^(bc1|[13])/i.test(a)) return { tier: "error", message: copy.send.val.btcMainnet };
  if (a.toLowerCase() === self.toLowerCase()) return { tier: "error", message: copy.send.val.self };
  try {
    const { addressToScript } = await import("@satchel/core/chains/btc");
    addressToScript(a, "testnet");
    return { tier: "ok", normalized: /^tb1/i.test(a) ? a.toLowerCase() : a };
  } catch {
    return { tier: "error", message: copy.send.val.btcTypo };
  }
}

/** Solana devnet (P2; kb/80 R3): base58 → 32 bytes (`val.sol.format`), not self, and a PDA is a warning (`val.sol.pda`). */
export async function validateSol(input: string, self: string): Promise<Validation> {
  const { parseSolAddress } = await import("@satchel/core/chains/sol");
  const p = parseSolAddress(input);
  if (!p.ok) return { tier: "error", message: copy.send.val.solFormat };
  if (p.address === self) return { tier: "error", message: copy.send.val.self };
  if (!p.onCurve) return { tier: "warning", message: copy.send.val.solPda, normalized: p.address };
  return { tier: "ok", normalized: p.address };
}

const ACCOUNT_RE = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

export function validateNearAccount(input: string, ctx: { self: string | null; contract: string; mpc: string }): Validation {
  const a = input.trim().toLowerCase();
  if (a.length < 2 || a.length > 64 || !ACCOUNT_RE.test(a)) return { tier: "error", message: copy.xfer.err.format };
  if (ctx.self && a === ctx.self) return { tier: "error", message: copy.xfer.err.self };
  if (a === ctx.contract) return { tier: "error", message: copy.xfer.err.contract };
  if (a === ctx.mpc) return { tier: "error", message: copy.xfer.err.mpc };
  if (/^[0-9a-f]{64}$/.test(a)) return { tier: "warning", message: copy.xfer.implicit, normalized: a };
  return { tier: "ok", normalized: a };
}
