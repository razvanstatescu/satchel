import { decodeMessageText, MAX_MESSAGE_BYTES } from "@satchel/core/policy/message-text";
import { hexToBytesStrict, toHex, utf8 } from "@satchel/core/bytes";

/**
 * C7 message signing helpers (docs/specs/C1-C2-C3-C7.md §3.3): the contract's rule is 1–1024 bytes of valid UTF-8, and
 * it builds the EIP-191 / Solana off-chain v0 bytes itself. Pure; unit-tested in test/unit/message.test.ts.
 */

export { MAX_MESSAGE_BYTES };

export type MessageValidation = { ok: true; bytes: Uint8Array; length: number } | { ok: false; error: "empty" | "too_long" | "encoding"; length: number };

/** True when `text` holds a lone UTF-16 surrogate (TextEncoder would silently sign U+FFFD instead of what was shown). */
export function hasLoneSurrogate(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const d = text.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) {
        i++;
        continue;
      }
      return true;
    }
    if (c >= 0xdc00 && c <= 0xdfff) return true;
  }
  return false;
}

/** The text as the exact UTF-8 bytes the contract will check: 1..=1024 bytes, well-formed. */
export function validateMessage(text: string): MessageValidation {
  if (hasLoneSurrogate(text)) return { ok: false, error: "encoding", length: 0 };
  const bytes = utf8(text);
  if (bytes.length === 0) return { ok: false, error: "empty", length: 0 };
  if (bytes.length > MAX_MESSAGE_BYTES) return { ok: false, error: "too_long", length: bytes.length };
  return { ok: true, bytes, length: bytes.length };
}

/**
 * Code points that can make a message read differently from what it says (SR-04): C0/C1 controls (except newline and
 * tab, which keep their meaning in a pre-wrapped block), the Arabic letter mark, zero-width characters and bidi marks,
 * the line/paragraph separators, bidi embeddings, overrides and isolates, word joiners and the BOM. Ranges inclusive.
 */
const HIDDEN_RANGES: readonly [number, number][] = [
  [0x00, 0x08],
  [0x0b, 0x1f],
  [0x7f, 0x9f],
  [0x061c, 0x061c],
  [0x200b, 0x200f],
  [0x2028, 0x202e],
  [0x2060, 0x2069],
  [0xfeff, 0xfeff],
];

export function isHiddenCodePoint(cp: number): boolean {
  return HIDDEN_RANGES.some(([a, b]) => cp >= a && cp <= b);
}

export interface SafeMessage {
  /** the text with every hidden or direction-changing character replaced by a visible `[U+XXXX]` token */
  text: string;
  /** true when anything was replaced (the UI then says so) */
  escaped: boolean;
  /** lowercase hex of the exact UTF-8 bytes (the fallback, and what the record stores) */
  hex: string;
}

export function safeMessage(text: string): SafeMessage {
  let escaped = false;
  let out = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (isHiddenCodePoint(cp)) {
      escaped = true;
      out += `[U+${cp.toString(16).toUpperCase().padStart(4, "0")}]`;
    } else out += ch;
  }
  return { text: out, escaped, hex: toHex(utf8(text)) };
}

/** A record's message body (hex): its safe text, or null text when it isn't valid UTF-8 (show the hex then). */
export function messageFromHex(hex: string): { text: string | null; safe: SafeMessage | null; hex: string } {
  let bytes: Uint8Array;
  try {
    bytes = hexToBytesStrict(hex);
  } catch {
    return { text: null, safe: null, hex };
  }
  const text = decodeMessageText(bytes);
  return text === null ? { text: null, safe: null, hex: toHex(bytes) } : { text, safe: safeMessage(text), hex: toHex(bytes) };
}

/**
 * L-02: a body that looks like a 32-byte digest (exactly 32 bytes, or 64 hex digits with or without 0x). Signing a
 * hash you can't read is signing something you can't check, so the UI flags it (the contract still accepts it: it is
 * prefixed, so it can never be a transaction signature).
 */
export function looksLikeDigest(text: string): boolean {
  return utf8(text).length === 32 || /^\s*(0x)?[0-9a-fA-F]{64}\s*$/.test(text);
}

/** EIP-191 signature as wallets and viem's verifyMessage take it: 0x ‖ r ‖ s ‖ v, v = 27 + recovery_id. */
export function evmSignatureHex(sig: { r: string; s: string; recoveryId: number }): `0x${string}` {
  const p = (h: string) => h.replace(/^0x/, "").toLowerCase().padStart(64, "0");
  return `0x${p(sig.r)}${p(sig.s)}${(27 + sig.recoveryId).toString(16)}`;
}

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
/** Base58 (Solana's encoding for signatures and keys). */
export function base58(bytes: Uint8Array): string {
  let n = 0n;
  for (const b of bytes) n = n * 256n + BigInt(b);
  let out = "";
  while (n > 0n) {
    out = B58[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = "1" + out;
  }
  return out;
}

/** A Solana ed25519 signature (64-byte hex) in base58, as Solana tools print it. */
export function solSignatureBase58(hex: string): string {
  return base58(hexToBytesStrict(hex));
}
