import { deriveSatchelAddresses, tokenPath } from "@satchel/core/derive";
import { NETWORK, SATCHEL_CONTRACT } from "@/lib/config";
import type { Chain } from "@/lib/near/types";

/**
 * Address derivation through @satchel/core (own derivation, no chainsig.js; D-03). Addresses depend only on
 * (contract account id, path), so they render with no network call and survive transfers (kb/90 §1.1).
 */

const cache = new Map<string, ReturnType<typeof deriveSatchelAddresses>>();

export function satchelAddresses(tokenId: string, contractId: string = SATCHEL_CONTRACT) {
  const key = `${contractId}|${tokenId}`;
  let v = cache.get(key);
  if (!v) {
    v = deriveSatchelAddresses(NETWORK, contractId, tokenId);
    cache.set(key, v);
  }
  return v;
}

export const pathFor = (tokenId: string, chain: Chain) => tokenPath(tokenId, chain);
