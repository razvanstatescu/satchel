import { describe, expect, it } from "vitest";
import { KeyPair } from "near-api-js";
import { buildClaimUrl, generateClaimKey, parseClaimFragment, parseClaimSecret } from "@/lib/claim/link";

/**
 * Give by link (A2, plan/feature-ideas.md A2): the keypair → implicit-account derivation and the link's fragment
 * parsing. The secret never touches a server; these are the pure, offline-checkable pieces.
 */

describe("generateClaimKey", () => {
  it("derives a 64-hex implicit account from a fresh ed25519 key, matching near-api-js directly", () => {
    const k = generateClaimKey();
    expect(k.implicitAccountId).toMatch(/^[0-9a-f]{64}$/);
    const kp = KeyPair.fromString(k.secretKey);
    expect(kp.getPublicKey().toString()).toBe(k.publicKey);
  });

  it("never repeats across calls", () => {
    const a = generateClaimKey();
    const b = generateClaimKey();
    expect(a.implicitAccountId).not.toBe(b.implicitAccountId);
    expect(a.secretKey).not.toBe(b.secretKey);
  });
});

describe("parseClaimSecret / parseClaimFragment", () => {
  it("round-trips a generated key", () => {
    const k = generateClaimKey();
    const parsed = parseClaimSecret(k.secretKey);
    expect(parsed).toEqual(k);
  });

  it("accepts the fragment with or without its leading #, and URL-encoded", () => {
    const k = generateClaimKey();
    expect(parseClaimFragment(`#${k.secretKey}`)?.implicitAccountId).toBe(k.implicitAccountId);
    expect(parseClaimFragment(k.secretKey)?.implicitAccountId).toBe(k.implicitAccountId);
    expect(parseClaimFragment(`#${encodeURIComponent(k.secretKey)}`)?.implicitAccountId).toBe(k.implicitAccountId);
  });

  it("rejects garbage, an empty fragment, and a wrong-length key", () => {
    expect(parseClaimFragment("")).toBeNull();
    expect(parseClaimFragment("#")).toBeNull();
    expect(parseClaimSecret("not-a-key")).toBeNull();
    expect(parseClaimSecret("ed25519:111111111111111111111111111111")).toBeNull();
    expect(parseClaimSecret("secp256k1:3cqr4ACA9Nif6t5Mfn1eqXcVx3uWH9WmWrJJw75kDmVpY7v8sixvkqEvcmCHQkdByn4xQYGySVVVyaXCf6mHs9jJ")).toBeNull();
  });
});

describe("buildClaimUrl", () => {
  it("puts the secret only in the fragment, never a query param", () => {
    const k = generateClaimKey();
    const url = buildClaimUrl(k.secretKey);
    expect(url).toContain(`/claim#${k.secretKey}`);
    expect(url).not.toContain("?");
    expect(new URL(url).search).toBe("");
  });
});
