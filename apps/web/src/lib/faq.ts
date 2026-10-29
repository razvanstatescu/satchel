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
  id: FaqId;
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
