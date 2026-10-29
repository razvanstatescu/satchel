import { KeyPair, KeyPairEd25519, keyToImplicitAddress, type KeyPairString } from "near-api-js";
import { APP_URL } from "@/lib/config";

/**
 * Give by link (A2, kb/80 §Give; plan/feature-ideas.md A2): a fresh ed25519 keypair is the claim. Its NEAR implicit
 * account id (the lowercase hex of the public key) is where the Satchel and a little NEAR go; the secret key is the
 * link's bearer token.
 *
 * The secret NEVER goes to a server and is never logged: it lives only in `location.hash` (a URL fragment, which
 * browsers don't send on navigation) and in memory while the flow is open. Treat it like cash in an envelope —
 * whoever holds it can take the Satchel, including the giver after handing it over.
 */

export interface ClaimKey {
  /** near-api-js `KeyPairString` ("ed25519:<base58>") — accepted directly by `Account`/`KeyPair.fromString`. */
  secretKey: KeyPairString;
  publicKey: string;
  /** The 64-hex NEAR implicit account id derived from the public key. */
  implicitAccountId: string;
}

function keyFromPair(kp: KeyPair): ClaimKey {
  const pub = kp.getPublicKey();
  return { secretKey: kp.toString() as KeyPairString, publicKey: pub.toString(), implicitAccountId: keyToImplicitAddress(pub) };
}

/** A fresh claim key (the giver's browser; kb/80 §Give by link step 1). */
export function generateClaimKey(): ClaimKey {
  return keyFromPair(KeyPairEd25519.fromRandom());
}

/** Parse a secret key string (as carried in the link's fragment) back to its keypair and implicit account. */
export function parseClaimSecret(secret: string): ClaimKey | null {
  const s = secret.trim();
  if (!s) return null;
  try {
    return keyFromPair(KeyPair.fromString(s as KeyPairString));
  } catch {
    return null;
  }
}

/** `location.hash` (with or without its leading "#") → a claim key, or null for an invalid / empty link. */
export function parseClaimFragment(hash: string): ClaimKey | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return parseClaimSecret(decoded);
}

/** The claim link: `https://usesatchel.xyz/claim#<secret>`. The secret is only ever in the fragment. */
export function buildClaimUrl(secretKey: string): string {
  return `${APP_URL}/claim#${secretKey}`;
}

/** 0.02 NEAR in yocto, enough gas for the claimer to move the Satchel out and sweep any leftover NEAR (kb/80 A2). */
export const CLAIM_FUNDING_YOCTO = "20000000000000000000000";
