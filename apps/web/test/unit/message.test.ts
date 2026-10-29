import { describe, expect, it } from "vitest";
import { base58, evmSignatureHex, hasLoneSurrogate, looksLikeDigest, messageFromHex, safeMessage, validateMessage } from "@/lib/message";

/** C7 message rules (docs/specs/C1-C2-C3-C7.md §3.3: 1–1024 bytes of UTF-8) and the safe display (SR-04, L-02). */

const RLO = String.fromCodePoint(0x202e);
const ZWSP = String.fromCodePoint(0x200b);
const BEL = String.fromCodePoint(0x07);
const LONE = String.fromCharCode(0xd800);

describe("validateMessage: length in UTF-8 bytes, well-formed", () => {
  it("refuses an empty message", () => {
    expect(validateMessage("")).toEqual({ ok: false, error: "empty", length: 0 });
  });
  it("accepts 1 and 1024 bytes, refuses 1025", () => {
    expect(validateMessage("a")).toMatchObject({ ok: true, length: 1 });
    expect(validateMessage("a".repeat(1024))).toMatchObject({ ok: true, length: 1024 });
    expect(validateMessage("a".repeat(1025))).toMatchObject({ ok: false, error: "too_long", length: 1025 });
  });
  it("counts bytes, not characters", () => {
    expect(validateMessage("é".repeat(512))).toMatchObject({ ok: true, length: 1024 }); // 2 bytes each
    expect(validateMessage("é".repeat(513))).toMatchObject({ ok: false, error: "too_long", length: 1026 });
    expect(validateMessage("🎒")).toMatchObject({ ok: true, length: 4 });
  });
  it("refuses a lone surrogate (it can't be the UTF-8 that was shown)", () => {
    expect(hasLoneSurrogate(`a${LONE}b`)).toBe(true);
    expect(hasLoneSurrogate("🎒")).toBe(false);
    expect(validateMessage(`a${LONE}`)).toMatchObject({ ok: false, error: "encoding" });
  });
});

describe("safeMessage: hidden and direction-changing characters become visible codes", () => {
  it("escapes bidi overrides, zero-width characters and C0/C1 controls, keeps newlines and tabs", () => {
    const s = safeMessage(`pay ${RLO}evil${ZWSP}x${BEL}\nnext\tline`);
    expect(s.text).toBe("pay [U+202E]evil[U+200B]x[U+0007]\nnext\tline");
    expect(s.escaped).toBe(true);
  });
  it("leaves plain text untouched and gives the exact bytes in hex", () => {
    expect(safeMessage("Sign in")).toEqual({ text: "Sign in", escaped: false, hex: "5369676e20696e" });
  });
  it("decodes a record's hex body, or falls back to hex when it isn't UTF-8", () => {
    expect(messageFromHex("5369676e").text).toBe("Sign");
    expect(messageFromHex("ff")).toMatchObject({ text: null, hex: "ff" });
  });
  it("flags a body that looks like a 32-byte digest (L-02)", () => {
    expect(looksLikeDigest("0x" + "ab".repeat(32))).toBe(true);
    expect(looksLikeDigest("ab".repeat(32))).toBe(true);
    expect(looksLikeDigest("x".repeat(32))).toBe(true);
    expect(looksLikeDigest("Sign in to example.xyz")).toBe(false);
  });
});

describe("signature encodings", () => {
  it("EIP-191: 0x ‖ r ‖ s ‖ v with v = 27 + recovery_id", () => {
    const sig = evmSignatureHex({ r: "1".padStart(64, "0"), s: "2".padStart(64, "0"), recoveryId: 1 });
    expect(sig).toBe(`0x${"1".padStart(64, "0")}${"2".padStart(64, "0")}1c`);
    expect(sig.length).toBe(132);
  });
  it("base58 keeps leading zero bytes as 1s", () => {
    expect(base58(Uint8Array.of(0, 0, 1))).toBe("112");
    expect(base58(Uint8Array.of(0xff))).toBe("5Q");
  });
});
