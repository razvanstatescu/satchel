import type { PublicEnv } from "@/lib/config";
import { copy } from "@/lib/copy";

/**
 * The landing's trust band head (landing v4 §2.6, D-42) as data, so its honesty rules are unit-tested. The landing makes
 * no live reads, so "No admin key" is a build-time claim keyed to the contract role (spec risk 5): it holds only when
 * `rc`/`final` is set for a contract born without keys (H-15). `/contract` keeps the live proof (keys, birth
 * transaction, code hash), and the band links to it.
 * - `dev`: the dev twin ("Development contract" and its body), because the dev contract still has keys;
 * - `rc`: the same band as `final` (the role strip's release-candidate line is gone site-wide, D-52: rc reads like final).
 * - `final`: the main H2 and body.
 * No variant names an account, a Satchel or a time.
 */

export type ContractRole = PublicEnv["NEXT_PUBLIC_CONTRACT_ROLE"];

export interface LockView {
  /** `locked` claims no admin key (and shows the empty hooks); `dev` never does. */
  variant: "locked" | "dev";
  h2: string;
  body: string;
}

export function lockView(role: ContractRole): LockView {
  const L = copy.landing.lock;
  if (role === "dev") return { variant: "dev", h2: L.dev.h2, body: L.dev.body };
  return { variant: "locked", h2: L.h2, body: L.body };
}
