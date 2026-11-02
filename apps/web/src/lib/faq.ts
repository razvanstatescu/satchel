import { SOL_SEND_ENABLED, SOL_UI_ENABLED } from "@/lib/config";
import { copy, type SolVariant } from "@/lib/copy";

/**
 * The landing's Questions (landing v4 §2.8) and its one Solana story, as plain data so the rules are unit-tested.
 * Seven closed questions, one answer paragraph each; Under the hood's six rules read the same `SolVariant`, so rule 1
 * and the chains answer always agree. `q-proves` carries the landing's one disclosure (D-42): the buyer's browser, not
 * the contract, runs the check.
 */

export type { SolVariant };

/** Which Solana story the landing tells, by flag: the SOL UI wins, then SOL send alone, else off. `none` (the contract
 * doesn't sign for Solana, DP5) has no flag: pass it explicitly. */
export function solVariant(ui: boolean, send: boolean): SolVariant {
  return ui ? "ui" : send ? "send" : "off";
}

/**
 * The landing's one variant. D-45 (Razvan, 2026-10-27): the website always says Satchel holds Bitcoin, Ethereum and
 * Solana, whatever the app's SOL flags (each Satchel has a Solana devnet address and the contract signs plain SOL
 * transfers). `hood.rules` and the chains answer both take it; `LANDING_NAMES_SOL` is the same choice for the strings
 * that take a boolean. `solVariant` still maps the app's flags for the app's own copy.
 */
export const LANDING_SOL: SolVariant = "ui";
export const LANDING_NAMES_SOL = true;
/** What the app's build flags alone would say (kept for the app and its tests). */
export const APP_SOL: SolVariant = solVariant(SOL_UI_ENABLED, SOL_SEND_ENABLED);

/** Each question's anchor (the `<details>` id), in page order (v4 §2.8). */
export const FAQ_IDS = ["q-send", "q-keys", "q-proves", "q-after", "q-chains", "q-cost", "q-testnet"] as const;
export type FaqId = (typeof FAQ_IDS)[number];

export interface FaqItem {
  id: AnyFaqId;
  q: string;
  /** One paragraph; its first sentence is the bold lead (`splitLead`). */
  a: string;
}

/** The seven questions with their variants applied: the chains answer by `sol`, the custody answer's dev line by role. */
export function faqItems(opts: { role: "dev" | "rc" | "final"; sol: SolVariant }): FaqItem[] {
  const Q = copy.landing.questions;
  return FAQ_IDS.map((id): FaqItem => {
    if (id === "q-chains") return { id, q: Q[id].q, a: Q[id].a(opts.sol) };
    const a = id === "q-keys" && opts.role === "dev" ? `${Q[id].a} ${Q.keysDev}` : Q[id].a;
    return { id, q: Q[id].q, a };
  });
}

/**
 * Answer first: the paragraph's first sentence (the bold lead) and the rest. It splits at the first full stop, question
 * or exclamation mark that ends a sentence, i.e. one followed by a space and a capital, digit or opening quote, so
 * "No." is a lead on its own while "0.02 NEAR" or "e.g. the" never split. A paragraph of one sentence is all lead.
 */
export function splitLead(p: string): { lead: string; rest: string } {
  const m = /[.!?](?=\s+["'“‘(]?[A-Z0-9])/.exec(p);
  if (!m) return { lead: p.trim(), rest: "" };
  const end = m.index + 1;
  return { lead: p.slice(0, end).trim(), rest: p.slice(end).trim() };
}

/**
 * /questions (less-labels): the long version of the landing's Questions, one source of truth for both pages. Every
 * new answer lives in `copy/questions.ts` (`copy.questions`, keyed by id); the seven landing ids stay sourced from
 * `copy.landing.questions` through `faqItems`, so their text is never duplicated. Group order here is the page's
 * group and jump-list order.
 */
export type ExtraFaqId = (typeof EXTRA_FAQ_IDS)[number];
export type AnyFaqId = FaqId | ExtraFaqId;

export const EXTRA_FAQ_IDS = [
  "q-what-is",
  "q-undo",
  "q-dust",
  "q-where-arrive",
  "q-address-book",
  "q-why-blocked",
  "q-clean-sources",
  "q-list",
  "q-paused",
  "q-offers",
  "q-usdc-payouts",
  "q-withdrawals",
  "q-give",
  "q-give-link",
  "q-allow-what",
  "q-allow-caps",
  "q-allow-btc",
  "q-allow-history",
  "q-allow-revoke",
  "q-inside",
  "q-storage-credit",
  "q-withdraw-inside",
  "q-fees-near",
  "q-fees-chain",
  "q-txs-vs-activity",
  "q-wallets",
  "q-safety-message",
] as const;

export interface FaqGroup {
  id: string;
  title: string;
  ids: readonly AnyFaqId[];
}

/** Group order = page order = jump-list order. Every id in `FAQ_IDS` and `EXTRA_FAQ_IDS` appears exactly once
 * (unit-tested). */
export const FAQ_GROUPS: readonly FaqGroup[] = [
  { id: "basics", title: "Basics", ids: ["q-what-is", "q-send", "q-keys", "q-chains"] },
  { id: "sending", title: "Sending and receiving", ids: ["q-undo", "q-dust", "q-where-arrive", "q-address-book"] },
  { id: "clean-history", title: "Clean history", ids: ["q-proves", "q-after", "q-why-blocked", "q-clean-sources"] },
  { id: "buying-selling", title: "Buying, selling and offers", ids: ["q-list", "q-paused", "q-offers", "q-usdc-payouts", "q-withdrawals"] },
  { id: "giving", title: "Giving", ids: ["q-give", "q-give-link"] },
  { id: "allowances", title: "Allowances", ids: ["q-allow-what", "q-allow-caps", "q-allow-btc", "q-allow-history", "q-allow-revoke"] },
  { id: "inside", title: "Inside balances", ids: ["q-inside", "q-storage-credit", "q-withdraw-inside"] },
  { id: "fees", title: "Fees and costs", ids: ["q-cost", "q-fees-near", "q-fees-chain"] },
  { id: "txs-vs-activity", title: "Transactions vs Activity", ids: ["q-txs-vs-activity"] },
  { id: "testnet", title: "Testnet and safety", ids: ["q-testnet", "q-wallets", "q-safety-message"] },
];

/** Every question on /questions, grouped, with the landing's variants applied to the seven it shares with the
 * homepage. One `FaqItem[]` per group, in `FAQ_GROUPS` order. */
export function allFaqGroups(opts: { role: "dev" | "rc" | "final"; sol: SolVariant }): { group: FaqGroup; items: FaqItem[] }[] {
  const landingItems = new Map(faqItems(opts).map((it) => [it.id, it] as const));
  const Q = copy.questions;
  return FAQ_GROUPS.map((group) => ({
    group,
    items: group.ids.map((id): FaqItem => {
      const fromLanding = landingItems.get(id);
      if (fromLanding) return fromLanding;
      const extra = Q[id as ExtraFaqId];
      return { id, q: extra.q, a: extra.a };
    }),
  }));
}
