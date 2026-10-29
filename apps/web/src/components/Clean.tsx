import Link from "next/link";
import type { ReactNode } from "react";
import {
  Check,
  ChevronDown,
  CircleCheck,
  CircleDashed,
  CircleQuestionMark,
  CircleX,
  History,
  Hourglass,
  Info,
  LoaderCircle,
  Monitor,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { ChainCharm } from "@/components/brand/ChainCharm";
import { ExternalLink, Icon, ItemPill, cx } from "@/components/ui";
import { CHAIN_NAME, copy } from "@/lib/copy";
import { buyEnabled, counts } from "@/lib/data/clean";
import type { Aggregate, CleanItem, CleanReport, ItemStatus } from "@/lib/data/types";
import { relativeTime } from "@/lib/format";

/**
 * The clean-history report (Satchel 2.0; app-screens §5.1, motion-spec §9). Server-safe: no hooks, no handlers, so the
 * market page renders its hint lines on the server and unit tests render the verdict to static HTML. The client side
 * (SaleTab) runs the BROWSER check, reveals its rows in order and animates the marks.
 *
 * Honesty (risky claim 2; inventory 5.1.6):
 * - only the buyer's browser check enables Buy; the server's result is always labelled "Server check …";
 * - "Checked in your browser" appears only for a browser result, never for the server hint;
 * - the badge's exact promise (`proof.cleanTip`) shows only when the browser found it clean; otherwise the disclosure
 *   explains the method without promising the result;
 * - the contract never runs this check, and the copy never says it does (`clean.disclosure`, word for word).
 */

/* ── Pure view models (unit-tested in test/unit/clean-view.test.ts) ─────────────────────────────────────────────── */

export type Tone = "success" | "frozen" | "danger" | "muted";
export const TONE_TEXT: Record<Tone, string> = { success: "text-success", frozen: "text-frozen", danger: "text-danger", muted: "text-ink-muted" };

/**
 * Where a report comes from, as the page shows it:
 * - `hint`: the server's check (server HTML, and the client until hydration): labelled as the server's, Buy disabled;
 * - `checking`: the buyer's browser is checking (or revealing its rows);
 * - `browser`: the browser's result, the only one that can enable Buy.
 */
export type ReportMode = "hint" | "checking" | "browser";

export type MarkStatus = ItemStatus | "checking";

/** One past signature's marker (the strip and the record share the words with `ItemPill`). */
export const MARK: Record<MarkStatus, { icon: LucideIcon; tone: Tone; spin?: boolean; problem?: boolean }> = {
  spent: { icon: Check, tone: "success" },
  expired: { icon: Check, tone: "success" },
  unfunded: { icon: Check, tone: "muted" },
  foreign: { icon: Check, tone: "muted" },
  settling: { icon: Hourglass, tone: "frozen" },
  unused: { icon: TriangleAlert, tone: "danger", problem: true },
  unknown: { icon: CircleQuestionMark, tone: "muted" },
  checking: { icon: LoaderCircle, tone: "frozen", spin: true },
};

const ITEM_WORD: Record<MarkStatus, string> = {
  spent: copy.clean.item.settled,
  expired: copy.clean.item.expired,
  unfunded: copy.clean.item.unfunded,
  foreign: copy.clean.item.foreign,
  settling: copy.clean.item.settling,
  unused: copy.clean.item.unused,
  unknown: copy.clean.item.unknown,
  checking: copy.clean.item.checking,
};

/** Statuses that can never move coins (kb/90 §7.2–7.3): they never block Buy. */
export const isDead = (s: MarkStatus) => s === "spent" || s === "expired" || s === "unfunded" || s === "foreign";
/** Statuses that block Buy (or haven't been checked yet). */
export const needsAttention = (s: MarkStatus) => s === "unused" || s === "settling" || s === "unknown";

/** "just now" under 5 s, then "8 s ago", "4 min ago"… (the gate line's freshness). */
export function checkedAgo(at: number, now: number): string {
  return now - at < 5000 ? copy.clean.justNow : relativeTime(at, now);
}

/** A listing's age from block heights (no clock needed, so the server and the first client render agree). */
export function listedAgo(height: number | null, listedAt: number, blockMs: number): string | null {
  if (height == null || !Number.isFinite(height) || height < listedAt) return null;
  return relativeTime(0, (height - listedAt) * blockMs);
}

/** The strip (motion-spec §9): one marker per signature, 12 at most, then "+n". */
export const STRIP_MAX = 12;

export interface StripModel {
  markers: { seq: number; status: MarkStatus }[];
  more: number;
  label: string;
}

export function stripModel(statuses: readonly { seq: number; status: MarkStatus }[], aggregate: Aggregate, revealed = statuses.length): StripModel | null {
  const total = statuses.length;
  if (total === 0 || aggregate === "unsafe") return null;
  const c = counts([...statuses]);
  const dead = statuses.filter((s) => isDead(s.status)).length;
  let label: string;
  switch (aggregate) {
    case "checking":
      label = copy.clean.strip.checking(Math.min(revealed + 1, total), total);
      break;
    case "blocked":
      label = copy.clean.strip.unused(c.unused, total);
      break;
    case "settling":
      label = copy.clean.strip.settling(c.settling);
      break;
    case "unknown":
      label = copy.clean.strip.unknown(Math.max(1, c.unknown));
      break;
    default:
      label = copy.clean.stripLabel(dead, total);
  }
  return { markers: statuses.slice(0, STRIP_MAX).map((s) => ({ seq: s.seq, status: s.status })), more: Math.max(0, total - STRIP_MAX), label };
}

function unsafeWord(r: string | null) {
  if (r === "keys") return "the contract has access keys";
  if (r === "code") return "the contract code doesn't match the published build";
  if (r === "sol") return "the Solana account isn't a plain wallet";
  return "this Ethereum address has delegated code";
}

/** The gate line's words for a BROWSER result (kept for S's owner panel: "Buyers see: …"). */
export function gateText(agg: Aggregate, report: Pick<CleanReport, "items" | "unsafe_reason">, t: string, waiting = false): string {
  const c = counts(report.items);
  switch (agg) {
    case "clean":
    case "empty":
      return copy.buy.gate.clean(t);
    case "checking":
      return waiting ? copy.buy.gate.waiting : copy.buy.gate.checking;
    case "settling":
      return copy.buy.gate.settling(Math.max(1, c.settling));
    case "blocked":
      return copy.buy.gate.blocked(Math.max(1, c.unused));
    case "unknown":
      return copy.buy.gate.unknown(Math.max(1, c.unknown));
    case "unsafe":
      return copy.buy.gate.unsafe(unsafeWord(report.unsafe_reason));
  }
}

const AGG_LOOK: Record<Aggregate, { tone: Tone; icon: LucideIcon; spin?: boolean }> = {
  checking: { tone: "frozen", icon: LoaderCircle, spin: true },
  empty: { tone: "success", icon: ShieldCheck },
  clean: { tone: "success", icon: ShieldCheck },
  settling: { tone: "frozen", icon: Hourglass },
  blocked: { tone: "danger", icon: ShieldAlert },
  unknown: { tone: "muted", icon: CircleQuestionMark },
  unsafe: { tone: "danger", icon: ShieldX },
};

export interface GateModel {
  /** `data-gate` (tests and judges): the aggregate, or "checking" until the browser has a result. */
  gate: Aggregate;
  tone: Tone;
  icon: LucideIcon;
  spin: boolean;
  text: string;
}

/** The gate line above Buy (`aria-describedby` of the button). */
export function gateModel(mode: ReportMode, report: Pick<CleanReport, "aggregate" | "items" | "unsafe_reason"> | null, t: string): GateModel {
  if (mode === "hint") return { gate: "checking", tone: "muted", icon: CircleDashed, spin: false, text: copy.buy.gate.waiting };
  if (mode === "checking" || !report || report.aggregate === "checking") return { gate: "checking", tone: "frozen", icon: LoaderCircle, spin: true, text: copy.buy.gate.checking };
  const look = AGG_LOOK[report.aggregate];
  return { gate: report.aggregate, tone: look.tone, icon: look.icon, spin: false, text: gateText(report.aggregate, report, t) };
}

/** The server hint as one line ("Server check 2 min ago: clean"): the market cards and the offer's hint row. */
export function hintModel(agg: Aggregate, t: string): GateModel & { word: string } {
  const look = AGG_LOOK[agg];
  const word = copy.clean.hintWord[agg];
  return { gate: agg, tone: look.tone, icon: look.icon, spin: false, text: copy.clean.hint(t, word), word };
}

export interface VerdictModel {
  mode: ReportMode;
  aggregate: Aggregate | null;
  tone: Tone;
  icon: LucideIcon;
  spin: boolean;
  title: string;
  sub: string | null;
  /** "Checked in your browser 8 s ago": a browser result only. */
  checked: string | null;
  again: boolean;
  strip: StripModel | null;
  action: "see-signature" | "check-again" | null;
  /** The first item that needs attention (the "See the signature" target). */
  target: number | null;
  oneOfTwo: boolean;
}

type ReportLike = Pick<CleanReport, "aggregate" | "items" | "unsafe_reason" | "sig_count" | "one_of_two">;

/**
 * The evidence without the key it repeats (QA-POLISH #3): under "Ethereum · nonce 0", "Nonce 0 used by 0x2a55…84e1"
 * reads "Used by 0x2a55…84e1"; under "Bitcoin · coin ee4d…d5:1", "ee4d93ab…1d5:1 unspent" reads "Unspent"; under
 * "Solana · blockhash ab…", "Blockhash still valid" reads "Still valid". `null` when nothing repeats (keep the evidence).
 */
function evidenceRest(key: string, evidence: string): string | null {
  const ev = evidence.trim().replace(/\.$/, "");
  const tail = (key.split(" · ").pop() ?? "").toLowerCase();
  if (!tail || !ev) return null;
  // the key's tail, whole ("nonce 1" never matches "Nonce 10 …")
  if (ev.toLowerCase().startsWith(tail) && (ev.length === tail.length || /\s/.test(ev[tail.length]))) return ev.slice(tail.length).trim() || null;
  if (tail.startsWith("blockhash") && /^blockhash\s/i.test(ev)) return ev.replace(/^blockhash\s+/i, "");
  if (tail.startsWith("coin ") && /\sunspent$/i.test(ev)) return "unspent";
  return null;
}

/** A record row's evidence line: the evidence, minus the key its title already shows ("Used by 0x2a55…84e1 · 3 confirmations"). */
export function rowEvidence(key: string, evidence: string): string {
  const rest = evidenceRest(key, evidence);
  return rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : evidence;
}

/**
 * One item as one phrase for the verdict, its key said once: "Ethereum · nonce 1 isn't used yet", "Bitcoin · coin
 * ee4d…d5:1 is unspent", "Solana · blockhash ab… is still valid". Anything else stays "key: evidence".
 */
export function itemPhrase(key: string, evidence: string): string {
  const rest = evidenceRest(key, evidence);
  if (!rest) return evidence.trim() ? `${key}: ${evidence.trim().replace(/\.$/, "")}` : key;
  if (/^not used yet$/i.test(rest)) return `${key} isn't used yet`;
  if (/^(unspent|still valid)$/i.test(rest)) return `${key} is ${rest.toLowerCase()}`;
  return `${key} ${rest}`;
}

/**
 * The verdict block. `hint`: the server's report, labelled as the server's ("Waiting for your browser's check").
 * `checking`: the browser's report while its rows are revealed (`revealed` of them so far), or no report yet
 * (`sigCount` markers, all checking). `browser`: the browser's result.
 */
export function verdictModel(args: { mode: ReportMode; report: ReportLike | null; sigCount: number; revealed?: number; t: string }): VerdictModel {
  const { mode, report, t } = args;
  const base = { checked: null, again: false, strip: null, action: null, target: null, oneOfTwo: false } as const;
  if (mode === "hint") {
    return {
      ...base,
      mode,
      aggregate: report?.aggregate ?? null,
      tone: "muted",
      icon: CircleDashed,
      spin: false,
      title: copy.clean.hintWaiting,
      sub: report ? copy.clean.hintBody[report.aggregate](t) : copy.clean.waitingBody,
    };
  }
  if (mode === "checking" || !report || report.aggregate === "checking") {
    const n = report ? report.items.length : args.sigCount;
    const revealed = report ? Math.min(args.revealed ?? 0, report.items.length) : 0;
    const markers = report ? report.items.map((it, i) => ({ seq: it.seq, status: (i < revealed ? it.status : "checking") as MarkStatus })) : Array.from({ length: n }, (_, i) => ({ seq: i, status: "checking" as MarkStatus }));
    const [title, sub] = copy.clean.verdict.checking(report ? report.sig_count : args.sigCount);
    return { ...base, mode: "checking", aggregate: "checking", tone: "frozen", icon: LoaderCircle, spin: true, title, sub, strip: stripModel(markers, "checking", revealed) };
  }
  const agg = report.aggregate;
  const look = AGG_LOOK[agg];
  const c = counts(report.items);
  const first = report.items.find((i) => i.status === "unused") ?? report.items.find((i) => i.status === "settling") ?? report.items.find((i) => i.status === "unknown");
  const strip = stripModel(report.items, agg);
  const common = { ...base, mode, aggregate: agg, tone: look.tone, icon: look.icon, spin: false, checked: copy.clean.checked(t), strip, oneOfTwo: report.one_of_two };
  switch (agg) {
    case "empty": {
      const [title, sub] = copy.clean.verdict.empty;
      return { ...common, title, sub };
    }
    case "clean":
      return { ...common, title: copy.clean.verdict.clean("")[0], sub: null };
    case "settling":
      return { ...common, title: copy.clean.verdict.settling(Math.max(1, c.settling), "")[0], sub: first?.evidence ? copy.clean.verdict.settlingSub(first.evidence) : null, again: true, target: first?.seq ?? null };
    case "blocked": {
      const [title, sub] = copy.clean.verdict.blocked(Math.max(1, c.unused), first ? itemPhrase(first.key, first.evidence) : "");
      return { ...common, title, sub, action: first ? "see-signature" : null, target: first?.seq ?? null };
    }
    case "unknown": {
      const [title, sub] = copy.clean.verdict.unknown(Math.max(1, c.unknown || report.sig_count - report.items.length), first?.evidence || "No provider answered");
      return { ...common, title, sub, action: "check-again", target: first?.seq ?? null };
    }
    case "unsafe": {
      const u = copy.clean.verdict.unsafe;
      const title = report.unsafe_reason === "keys" ? u.keys : report.unsafe_reason === "code" ? u.code : report.unsafe_reason === "sol" ? u.sol : u.delegated;
      return { ...common, title, sub: null, strip: null };
    }
  }
}

/** The staged reveal (motion-spec §9): rows in list order 220 ms apart, the verdict 320 ms after the last, Buy +160. */
export const REVEAL = { step: 220, verdict: 320, rise: 160 } as const;

export function revealSchedule(n: number): { items: number[]; verdict: number; rise: number } {
  const items = Array.from({ length: n }, (_, i) => i * REVEAL.step);
  const verdict = (n > 0 ? (n - 1) * REVEAL.step : 0) + REVEAL.verdict;
  return { items, verdict, rise: verdict + REVEAL.rise };
}

export type BuyPhase = "idle" | "recheck" | "wallet" | "buying" | "changed" | "done" | "refunded";

/**
 * Buy's label and state. Only a revealed BROWSER result can make it buyable (`buyable`); signed out, it reads Connect
 * NEAR wallet, and only when the verdict allows buying (inventory 5.1.6d); otherwise it stays "Buy for …", disabled.
 */
export function buyButtonModel(args: { phase: BuyPhase; buyable: boolean; ready: boolean; signedIn: boolean; price: string; connecting?: boolean }): {
  label: string;
  enabled: boolean;
  busy: boolean;
  connect: boolean;
} {
  const { phase, buyable, ready, signedIn, price, connecting = false } = args;
  if (phase === "recheck") return { label: copy.buy.recheck, enabled: false, busy: true, connect: false };
  if (phase === "wallet") return { label: copy.sign.wallet, enabled: false, busy: true, connect: false };
  if (phase === "buying") return { label: copy.buy.buying, enabled: false, busy: true, connect: false };
  if (!buyable) return { label: copy.buy.cta(price), enabled: false, busy: false, connect: false };
  if (ready && !signedIn) return connecting ? { label: copy.nav.connecting, enabled: false, busy: true, connect: true } : { label: copy.buy.connect, enabled: true, busy: false, connect: true };
  return { label: copy.buy.cta(price), enabled: true, busy: false, connect: false };
}

/** True when a browser result allows buying (clean or empty). The server hint never does. */
export const verdictAllowsBuy = (mode: ReportMode, report: Pick<CleanReport, "aggregate"> | null) => mode === "browser" && !!report && buyEnabled(report.aggregate);

/** Market order (app-screens §9): buyable first, then confirming and unknown, blocked and unsafe last; newest first within. */
export function marketRank(agg: Aggregate | null | undefined): number {
  if (agg === "clean" || agg === "empty") return 0;
  if (agg === "settling" || agg === "checking") return 1;
  if (agg === "blocked" || agg === "unsafe") return 3;
  return 2;
}

export function marketOrder<T extends { hint: { aggregate: Aggregate } | null; listing: { listed_at: number } }>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => marketRank(a.hint?.aggregate) - marketRank(b.hint?.aggregate) || b.listing.listed_at - a.listing.listed_at);
}

/* ── Presentational pieces (server-safe) ───────────────────────────────────────────────────────────────────────── */

/** The gate line (proto `.gate`): 600 14/20 in the tone colour, a 16 px icon. `data-gate` carries the aggregate. */
export function GateLine({ model, id, className, focusable = false }: { model: GateModel; id?: string; className?: string; focusable?: boolean }) {
  return (
    <p id={id} tabIndex={focusable ? -1 : undefined} data-gate={model.gate} className={cx("flex items-start gap-2 font-sans text-[0.875rem] leading-5 font-semibold outline-none", TONE_TEXT[model.tone], className)}>
      <Icon icon={model.icon} size={16} spin={model.spin} className="mt-0.5" />
      <span data-gate-text>{model.text}</span>
    </p>
  );
}

/** The signature strip: one 32 px marker per past signature (a 2 px danger ring for an unused one), then its label. */
export function SigStrip({ model }: { model: StripModel }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-sigstrip>
      <ol aria-label={copy.clean.strip.label} className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {model.markers.map((m) => {
          const look = MARK[m.status];
          return (
            <li
              key={m.seq}
              data-sig={m.seq}
              data-sig-status={m.status}
              className={cx("grid size-8 place-items-center rounded-full bg-surface-sunken", TONE_TEXT[look.tone], m.status === "unused" && "inset-ring-2 inset-ring-danger")}
            >
              <span data-mark className="grid place-items-center">
                <Icon icon={look.icon} size={18} spin={look.spin} />
              </span>
              <span className="sr-only">{ITEM_WORD[m.status]}</span>
            </li>
          );
        })}
        {model.more ? (
          <li className="grid h-8 min-w-8 place-items-center rounded-full bg-surface-sunken px-2 font-sans text-caption font-semibold text-ink-muted">
            <span aria-hidden="true">{copy.clean.strip.more(model.more)}</span>
            <span className="sr-only">{copy.clean.strip.moreLabel(model.more)}</span>
          </li>
        ) : null}
      </ol>
      <span data-strip-label className="ml-1 font-sans text-[0.875rem] leading-5 font-semibold text-ink">
        {model.label}
      </span>
    </div>
  );
}

/**
 * The verdict block (proto `.verdict`, `#clean-history`): a 52 px state tile, the eyebrow "Clean history", the verdict
 * and its line, the strip, then "Checked in your browser {t}" (browser results only) and the trust line. `action` is the
 * client's button or link (See the signature, Check again). Not a live region: SaleTab announces verdict changes once
 * through the one status region (the freshness line ticks every second).
 */
export function Verdict({
  model,
  action,
  className,
  headingLevel = 2,
  titleId = "clean-title",
}: {
  model: VerdictModel;
  action?: ReactNode;
  className?: string;
  headingLevel?: 2 | 3;
  /** Unique per Satchel on the sale page: Next keeps a previous route's DOM (hidden) after a client navigation. */
  titleId?: string;
}) {
  const H = headingLevel === 3 ? "h3" : "h2";
  return (
    <section
      id="clean-history"
      aria-labelledby={titleId}
      data-aggregate={model.aggregate ?? undefined}
      data-mode={model.mode}
      className={cx("flex flex-col gap-3.5 rounded-card border border-line bg-surface p-5", className)}
    >
      <div className="flex items-start gap-3.5">
        <span data-verdict-mark className={cx("grid size-13 flex-none place-items-center rounded-[16px] bg-surface-sunken", TONE_TEXT[model.tone])}>
          <span data-mark className="grid place-items-center">
            <Icon icon={model.icon} size={28} spin={model.spin} />
          </span>
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-sans text-[0.875rem] leading-5 font-semibold text-ink-muted">{copy.clean.eyebrow}</p>
          <H id={titleId} data-verdict-title data-verdict-text className="font-display text-heading text-ink md:text-[1.5rem] md:leading-7.5">
            {model.title}
          </H>
          {model.sub ? (
            <p data-verdict-text className="font-sans text-[0.9375rem] leading-5.5 text-ink">
              {model.sub}
            </p>
          ) : null}
        </div>
      </div>
      {model.strip ? <SigStrip model={model.strip} /> : null}
      <div className="flex flex-col gap-1 font-sans text-body-sm text-ink-muted">
        {model.checked ? (
          <span className="flex items-start gap-2" data-checked>
            <Icon icon={History} size={16} className="mt-0.5" />
            <span>
              {model.checked}
              {model.again ? `. ${copy.clean.checksAgain}` : null}
            </span>
          </span>
        ) : null}
        <span className="flex items-start gap-2">
          <Icon icon={Monitor} size={16} className="mt-0.5" />
          <span>{copy.clean.trust}</span>
        </span>
      </div>
      {model.oneOfTwo ? (
        <span className="inline-flex w-fit items-center gap-1.5 rounded-pill bg-surface-sunken px-2.5 py-1 font-sans text-caption text-ink-muted" data-one-of-two>
          <Icon icon={Info} size={14} />
          {copy.clean.oneOfTwo}
        </span>
      ) : null}
      {action}
    </section>
  );
}

/** The item a record row shows: its real status once revealed, "checking" before. */
export type RecordRow = Pick<CleanItem, "seq" | "chain" | "key" | "wouldPay" | "evidence" | "evidenceUrl"> & { status: MarkStatus };

function RecordItem({ item, tokenId, clearHref }: { item: RecordRow; tokenId: string; clearHref?: string }) {
  const body =
    item.status === "checking" ? null : item.status === "unfunded" ? copy.clean.item.unfundedBody : item.status === "foreign" ? copy.clean.item.foreignBody : rowEvidence(item.key, item.evidence);
  return (
    <li
      id={`sig-${tokenId}-${item.seq}`}
      data-sig={item.seq}
      data-clean-item={item.seq}
      data-item={item.status}
      className="relative grid scroll-mt-24 grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-0.5 px-4 py-3.5 [li+&]:before:absolute [li+&]:before:inset-x-4 [li+&]:before:top-0 [li+&]:before:h-px [li+&]:before:bg-line"
    >
      {item.status === "unused" ? <span data-danger-bar aria-hidden="true" className="absolute inset-y-3 left-0 w-0.75 origin-top rounded-r-pill bg-danger" /> : null}
      <ChainCharm chain={item.chain} size={28} className="row-span-3" />
      <span className="min-w-0 font-sans text-[0.9375rem] leading-5.5 font-semibold text-ink">{item.key}</span>
      <span data-mark className="col-start-3 row-start-1 grid">
        <ItemPill status={item.status} />
      </span>
      {item.wouldPay ? <span className="col-start-2 font-sans text-body-sm text-ink-muted t-num">{item.wouldPay}</span> : null}
      {body ? (
        <span className="col-start-2 font-sans text-body-sm text-ink-muted">
          {item.evidenceUrl && item.status !== "unfunded" && item.status !== "foreign" ? <ExternalLink href={item.evidenceUrl}>{body}</ExternalLink> : body}
        </span>
      ) : null}
      {clearHref && item.status === "unused" ? (
        <Link href={clearHref} className="col-start-2 w-fit font-sans text-body-sm font-semibold text-link underline decoration-1 underline-offset-3 hover:decoration-2">
          {copy.sell.history.howToSettle}
        </Link>
      ) : null}
    </li>
  );
}

function ItemGroup({ title, items, tokenId, clearHref }: { title: string; items: RecordRow[]; tokenId: string; clearHref?: string }) {
  return (
    <div>
      <h3 className="mb-2 font-sans text-[0.875rem] leading-5 font-semibold text-ink-muted">{title}</h3>
      <ul className="m-0 list-none rounded-md border border-line bg-surface p-0">
        {items.map((i) => (
          <RecordItem key={i.seq} item={i} tokenId={tokenId} clearHref={clearHref} />
        ))}
      </ul>
    </div>
  );
}

function sourcesLine(sources: CleanReport["sources"]): string | null {
  const parts = (["btc", "evm", "sol"] as const)
    .map((ch) => {
      const s = sources.filter((x) => x.chain === ch);
      if (!s.length) return null;
      const names = s.map((x) => (x.ok ? x.provider : copy.clean.noAnswer(x.provider)));
      const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
      return copy.clean.sourceChain(CHAIN_NAME[ch], list);
    })
    .filter(Boolean);
  return parts.length ? copy.clean.sources(parts.join("; ")) : null;
}

/**
 * The record (proto `.record`): the checks, every past signature grouped by whether it can still move coins (one
 * "Checking" group while the browser's rows are being revealed), the sources and "How Satchel checks this".
 * `hintLine` replaces the sources while the rows are the server's ("Server check 2 min ago: clean").
 */
export function Record({
  report,
  rows,
  tokenId,
  promise,
  hintLine,
  clearHref,
  headingId = "record-title",
}: {
  report: Pick<CleanReport, "checks" | "sources">;
  rows: RecordRow[];
  tokenId: string;
  /** The browser found it clean or empty: the disclosure states the badge's exact promise. */
  promise: boolean;
  hintLine?: string | null;
  /** The owner's view: unused items link to how to clear them. */
  clearHref?: string;
  headingId?: string;
}) {
  const checking = rows.some((r) => r.status === "checking");
  const attention = rows.filter((r) => needsAttention(r.status));
  const dead = rows.filter((r) => isDead(r.status));
  const sources = hintLine ?? sourcesLine(report.sources);
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4" data-record>
      {/* proto .section-h: the heading sits in a 44 px row (as Inside and Facts on the Wallet tab), the lead 8 px under it */}
      <div>
        <div className="flex min-h-11 items-center">
          <h2 id={headingId} className="font-display text-heading text-ink">
            {copy.clean.recordTitle}
          </h2>
        </div>
        <p className="mt-2 font-sans text-body text-ink-muted">{copy.clean.recordLead}</p>
      </div>
      {report.checks.length ? (
        <ul aria-label="Checks" className="m-0 flex list-none flex-col gap-2.5 p-0">
          {report.checks.map((c) => (
            <li key={c.name} className="flex items-start gap-2.5 font-sans text-[0.9375rem] leading-5.5 text-ink" data-check-ok={c.ok}>
              <Icon icon={c.warn ? Info : c.ok ? CircleCheck : CircleX} size={20} className={cx("mt-px", c.warn ? "text-ink-muted" : c.ok ? "text-success" : "text-danger")} />
              {c.name}
            </li>
          ))}
        </ul>
      ) : null}
      {rows.length ? (
        checking ? (
          <ItemGroup title={copy.clean.group.checking(rows.length)} items={rows} tokenId={tokenId} clearHref={clearHref} />
        ) : (
          <>
            {attention.length ? <ItemGroup title={copy.clean.group.attention(attention.length)} items={attention} tokenId={tokenId} clearHref={clearHref} /> : null}
            {dead.length ? <ItemGroup title={copy.clean.group.dead(dead.length)} items={dead} tokenId={tokenId} clearHref={clearHref} /> : null}
          </>
        )
      ) : null}
      {sources ? <p className="font-sans text-body-sm text-ink-muted">{sources}</p> : null}
      <details className="group rounded-md border border-line bg-surface">
        <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-3 rounded-md px-4 font-sans text-label text-ink [&::-webkit-details-marker]:hidden">
          {copy.clean.how}
          <Icon icon={ChevronDown} size={20} className="text-ink-muted transition-transform duration-150 group-open:rotate-180" />
        </summary>
        <div className="flex flex-col gap-2.5 px-4 pb-4 font-sans text-body-sm text-ink">
          <p>{promise ? copy.proof.cleanTip : copy.clean.howBody}</p>
          <p className="font-semibold">{copy.clean.notCovered}</p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-ink-muted">
            {copy.clean.notCoveredList.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className="text-ink-muted">{copy.clean.disclosure}</p>
        </div>
      </details>
    </section>
  );
}

/** Record rows from a report: `revealed` rows show their status, the rest "checking" (the reveal in list order). */
export function recordRows(items: readonly CleanItem[], revealed = items.length): RecordRow[] {
  return items.map((it, i) => ({ seq: it.seq, chain: it.chain, key: it.key, wouldPay: it.wouldPay, evidence: it.evidence, evidenceUrl: it.evidenceUrl, status: i < revealed ? it.status : "checking" }));
}
