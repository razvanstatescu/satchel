import { IS_FIXTURE } from "@/lib/config";
import type { CleanReport } from "@/lib/data/types";

/**
 * FIXTURE MODE ONLY: two localStorage switches for QA, screenshots and e2e, which put the demo world into states it
 * doesn't have. Every read and write checks `IS_FIXTURE` first, so in live mode both keys are never even read: a clean
 * verdict and a USDC registration can only come from the chains (test/unit/fixture-switches.test.ts).
 *
 * - `satchel:sim:clean` turns the browser's fixture report into `settling` (the first signature still confirming),
 *   `unknown` (a provider didn't answer), `blocked` (the first signature unused), `unsafe` (the code hash doesn't match)
 *   or `one-of-two` (H-25). The server hint is untouched, as it would be.
 * - `satchel:sim:usdc` = `unregistered` makes every account unregistered for USDC until a Register succeeds (the
 *   simulation has no USDC contract, so fixture mode otherwise registers everyone).
 */
export const SIM_CLEAN_KEY = "satchel:sim:clean";
export const SIM_USDC_KEY = "satchel:sim:usdc";

function readSwitch(key: string): string | null {
  if (!IS_FIXTURE) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** The browser's clean-history report, bent by `satchel:sim:clean` in fixture mode; in live mode, the report as is. */
export function simCleanState(r: CleanReport): CleanReport {
  const k = readSwitch(SIM_CLEAN_KEY);
  if (!k) return r;
  if (k === "one-of-two") return { ...r, one_of_two: true };
  if (k === "unsafe") return { ...r, aggregate: "unsafe", unsafe_reason: "code", checks: r.checks.map((c) => (/^Code/.test(c.name) ? { name: "Code: doesn't match the published build", ok: false } : c)) };
  const first = r.items[0];
  if (!first || (k !== "settling" && k !== "unknown" && k !== "blocked")) return r;
  const status = k === "blocked" ? "unused" : k;
  const evidence = k === "unknown" ? "No provider answered" : k === "blocked" ? `${first.key.split(" · ")[1] ?? "It"} isn't used yet` : first.evidence;
  const items = [{ ...first, status, evidence, evidenceUrl: k === "settling" ? first.evidenceUrl : null } as CleanReport["items"][number], ...r.items.slice(1)];
  return { ...r, items, aggregate: k === "blocked" ? "blocked" : k };
}

/**
 * Whether the account can receive USDC, from the USDC contract's `storage_balance_of` answer (null = not registered).
 * Fixture mode ignores the answer (the simulation has no USDC contract) and reads `satchel:sim:usdc` instead.
 */
export function usdcRegistered(storageBalance: unknown): boolean {
  if (!IS_FIXTURE) return Boolean(storageBalance);
  return readSwitch(SIM_USDC_KEY) !== "unregistered";
}

/** After a successful Register in fixture mode, the switch says so; in live mode it writes nothing. */
export function markSimUsdcRegistered(): void {
  if (!IS_FIXTURE) return;
  try {
    window.localStorage.setItem(SIM_USDC_KEY, "registered");
  } catch {
    /* storage blocked: the next read registers everyone again */
  }
}
