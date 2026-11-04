import { KeyPair, KeyPairEd25519, keyToImplicitAddress, type KeyPairString } from "near-api-js";
import { APP_URL } from "@/lib/config";

/**
 * Give by link (A2, kb/80's R4 note; plan/feature-ideas.md A2): a fresh ed25519 keypair is the claim. Its NEAR implicit
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

/** A parsed claim link: the key, plus the gifted token id(s) when the link carries them (R3-X-4). */
export interface ClaimLink {
  key: ClaimKey;
  /** The token ids the giver put in the link, or null for an older link that has none (legacy: claims everything). */
  giftTokenIds: string[] | null;
}

const GIFT_PARAM = "gift";
const TOKEN_ID_RE = /^\d{1,20}$/;

/**
 * `location.hash` (with or without its leading "#") → the claim link, or null for an invalid / empty one.
 * Format: `<secret>` (older links) or `<secret>&gift=<id>,<id>`. A `gift` param that is present but malformed makes
 * the whole link invalid rather than silently falling back to "claim everything".
 */
export function parseClaimLink(hash: string): ClaimLink | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  const amp = raw.indexOf("&");
  const secretPart = amp === -1 ? raw : raw.slice(0, amp);
  const rest = amp === -1 ? "" : raw.slice(amp + 1);
  let decoded: string;
  try {
    decoded = decodeURIComponent(secretPart);
  } catch {
    return null;
  }
  const key = parseClaimSecret(decoded);
  if (!key) return null;
  let giftTokenIds: string[] | null = null;
  for (const pair of rest.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    if (pair.slice(0, eq === -1 ? undefined : eq) !== GIFT_PARAM) continue; // unknown params are ignored
    let value: string;
    try {
      value = decodeURIComponent(eq === -1 ? "" : pair.slice(eq + 1));
    } catch {
      return null;
    }
    const ids = value.split(",");
    if (!ids.length || !ids.every((id) => TOKEN_ID_RE.test(id))) return null;
    giftTokenIds = [...new Set(ids)];
  }
  return { key, giftTokenIds };
}

/** `location.hash` → a claim key only (ignores the gift list). */
export function parseClaimFragment(hash: string): ClaimKey | null {
  return parseClaimLink(hash)?.key ?? null;
}

/**
 * The claim link: `https://usesatchel.xyz/claim#<secret>&gift=<ids>`. The secret and the gifted ids are only ever in
 * the fragment (never sent to a server). Without ids it is an older-style link that claims everything in the account.
 */
export function buildClaimUrl(secretKey: string, giftTokenIds?: readonly string[]): string {
  const gift = giftTokenIds?.length ? `&${GIFT_PARAM}=${giftTokenIds.join(",")}` : "";
  return `${APP_URL}/claim#${secretKey}${gift}`;
}

/** 0.02 NEAR in yocto, enough gas for the claimer to move the Satchel out and sweep any leftover NEAR (kb/80 A2). */
export const CLAIM_FUNDING_YOCTO = "20000000000000000000000";
