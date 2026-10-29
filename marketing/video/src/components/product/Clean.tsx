/**
 * Clean history — video ports of apps/web/src/components/Clean.tsx (copy from apps/web/src/lib/copy.ts).
 *
 * API (pure; sizes = product px × k, default k = 2.25):
 *   <CleanHistoryPanel width? k? eyebrow?>…</CleanHistoryPanel>
 *       The report shell: surface panel, radius md, "Clean history" eyebrow. Put a CleanVerdict and rows inside.
 *   <CleanVerdict status="checking|clean|empty|settling|blocked|unknown|unsafe" title? sub? meta? trust? k?
 *                 spin? iconPop? metaIn? trustIn? />
 *       Shield icon + verdict sentence (display face) + optional sub line, then the meta line
 *       ("Checked in your browser 8 s ago · 3 signatures") and the trust line with MonitorCheck
 *       ("Runs in your browser. Satchel's server isn't trusted for this."). `minLines` reserves verdict lines. Defaults to the product sentences
 *       (VERDICT_COPY). `metaIn` / `trustIn` (0..1) fade+rise those lines in; `iconPop` scales the shield (1 = rest).
 *   <GroupTitle>Needs attention (1)</GroupTitle>
 *   <CleanHistoryRow title wouldPay? evidence? status resolve? chain? write? spin? k? width? divider? />
 *       One signature record: label title ("Ethereum · nonce 3"), muted "Would send 0.0100 ETH to 0x53f9…1C2A",
 *       evidence line in ink, ItemPill at the right.
 *       `resolve` 0..1: 0 = Checking… (evidence hidden), 1 = `status` (pill rolls over, evidence rises in, a soft tint
 *       in the status colour flashes over the row while it resolves).
 *       `write` 0..1 (optional): the row writes itself — title, then wouldPay, typed character by character with a
 *       caret (use for "recorded" ledger moments). Omit for a fully written row.
 *       `chain` adds a chain dot before the title (video augmentation; the product row has none).
 *       `pill` overrides the right-hand pill (a node, or null for none); `pad` = vertical padding in product px (12).
 *   <GateLine status="checking|clean|blocked|settling|unknown|unsafe" text? k? spin? />
 *       Buy-block gate line: verdict icon + "Clean history · checked 8 s ago" / "Blocked: 1 unused signature".
 */
import type { CSSProperties, ReactNode } from "react";
import { CircleCheck, Hourglass, LoaderCircle, MonitorCheck, ShieldAlert, ShieldCheck, ShieldX, TriangleAlert, type LucideIcon } from "lucide-react";
import { C, CHAIN, F, display, type Chain } from "../../brand/tokens";
import { ITEM, ItemPill, type ItemStatus } from "./Pills";
import { K, RADIUS, STROKE, clamp01, txt } from "./base";

export type Aggregate = "checking" | "empty" | "clean" | "settling" | "blocked" | "unknown" | "unsafe";

export const VERDICT: Record<Aggregate, { Icon: LucideIcon; color: string }> = {
  checking: { Icon: LoaderCircle, color: C.inkMuted },
  empty: { Icon: ShieldCheck, color: C.success },
  clean: { Icon: ShieldCheck, color: C.success },
  settling: { Icon: Hourglass, color: C.frozen },
  blocked: { Icon: ShieldAlert, color: C.danger },
  unknown: { Icon: TriangleAlert, color: C.inkMuted },
  unsafe: { Icon: ShieldX, color: C.danger },
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Product copy (copy.clean / copy.buy.gate). */
export const CLEAN_COPY = {
  eyebrow: "Clean history",
  trust: "Runs in your browser. Satchel's server isn't trusted for this.",
  meta: (t: string, count: number) => `Checked in your browser ${t} · ${plural(count, "signature", "signatures")}`,
  verdict: {
    checking: (count: number) => `Checking ${count} past signatures…`,
    clean: "Clean. No past signature can move these coins.",
    empty: "This Satchel has never signed anything.",
    blocked: (count: number) => `${plural(count, "past signature", "past signatures")} could still move coins.`,
  },
  gate: {
    clean: (t: string) => `Clean history · checked ${t}`,
    checking: "Checking history…",
    blocked: (count: number) => `Blocked: ${plural(count, "unused signature", "unused signatures")}`,
    settling: (count: number) => `Settling: ${plural(count, "signature", "signatures")}`,
  },
  group: { attention: (n: number) => `Needs attention (${n})`, dead: (n: number) => `Can't move coins (${n})` },
  wouldPay: (amount: string, addr: string) => `Would send ${amount} to ${addr}`,
} as const;

export function CleanHistoryPanel({ children, width, k = K, eyebrow = CLEAN_COPY.eyebrow, style }: { children?: ReactNode; width?: number; k?: number; eyebrow?: string | null; style?: CSSProperties }) {
  return (
    <section style={{ width, boxSizing: "border-box", borderRadius: RADIUS.md * k, background: C.surface, padding: 16 * k, color: C.ink, ...style }}>
      {eyebrow ? <p style={{ ...txt("label", k), color: C.inkMuted, margin: 0 }}>{eyebrow}</p> : null}
      {children}
    </section>
  );
}

const rise = (p: number): CSSProperties => ({ opacity: clamp01(p), transform: `translateY(${(1 - clamp01(p)) * 18}px)` });

export function CleanVerdict({
  status,
  title,
  sub,
  meta,
  trust = true,
  k = K,
  spin = 0,
  iconPop = 1,
  metaIn = 1,
  trustIn = 1,
  count = 3,
  minLines = 1,
  style,
}: {
  status: Aggregate;
  title?: ReactNode;
  sub?: ReactNode;
  meta?: string | null;
  trust?: boolean;
  k?: number;
  spin?: number;
  iconPop?: number;
  metaIn?: number;
  trustIn?: number;
  /** signature count used by the default sentences */
  count?: number;
  /** reserve this many verdict lines so a longer sentence doesn't push the rows down */
  minLines?: number;
  style?: CSSProperties;
}) {
  const v = VERDICT[status];
  const sentence =
    title ??
    (status === "checking"
      ? CLEAN_COPY.verdict.checking(count)
      : status === "clean"
        ? CLEAN_COPY.verdict.clean
        : status === "empty"
          ? CLEAN_COPY.verdict.empty
          : status === "blocked"
            ? CLEAN_COPY.verdict.blocked(count)
            : "");
  return (
    <div style={style}>
      <div style={{ marginTop: 8 * k, display: "flex", alignItems: "flex-start", gap: 8 * k, color: v.color }}>        <span style={{ display: "inline-flex", marginTop: 2 * k, flexShrink: 0, transform: `scale(${iconPop}) rotate(${status === "checking" ? spin : 0}deg)` }}>
          <v.Icon size={24 * k} strokeWidth={STROKE} />
        </span>
        <div>
          <h2 style={{ ...display(650, 48), fontSize: 24 * k, lineHeight: `${28 * k}px`, minHeight: 28 * k * minLines, letterSpacing: "-0.01em", margin: 0 }}>{sentence}</h2>
          {sub ? <p style={{ ...txt("body", k), color: C.ink, margin: `${4 * k}px 0 0` }}>{sub}</p> : null}
        </div>
      </div>
      {meta ? <p style={{ ...txt("bodySm", k), color: C.inkMuted, margin: `${8 * k}px 0 0`, ...rise(metaIn) }}>{meta}</p> : null}
      {trust ? (
        <p style={{ ...txt("bodySm", k), color: C.inkMuted, margin: `${4 * k}px 0 0`, display: "flex", alignItems: "center", gap: 8 * k, ...rise(trustIn) }}>
          <MonitorCheck size={16 * k} strokeWidth={STROKE} />
          {CLEAN_COPY.trust}
        </p>
      ) : null}
    </div>
  );
}

export function GroupTitle({ children, k = K, style }: { children: ReactNode; k?: number; style?: CSSProperties }) {
  return <h3 style={{ ...txt("label", k), color: C.inkMuted, margin: 0, ...style }}>{children}</h3>;
}

/** Characters of `s` visible when `chars` characters of the whole row have been typed. */
const typed = (s: string, chars: number) => s.slice(0, Math.max(0, Math.min(s.length, Math.floor(chars))));

export function CleanHistoryRow({
  title,
  wouldPay,
  evidence,
  status,
  resolve = 1,
  chain,
  write,
  spin = 0,
  k = K,
  width,
  divider = "both",
  caret = 1,
  pill,
  pad = 12,
  style,
}: {
  title: string;
  wouldPay?: string;
  evidence?: ReactNode;
  status: ItemStatus;
  resolve?: number;
  chain?: Chain;
  write?: number;
  spin?: number;
  k?: number;
  width?: number;
  divider?: "top" | "bottom" | "both" | "none";
  /** caret opacity while writing (blink it from the scene) */
  caret?: number;
  /** override the right-hand pill: a node, or null for none (default: the animated ItemPill) */
  pill?: ReactNode | null;
  /** vertical padding in product px (product: 12) */
  pad?: number;
  style?: CSSProperties;
}) {
  const r = clamp01(resolve);
  const tone = ITEM[status].color;
  const flash = r > 0 && r < 1 ? Math.sin(Math.PI * r) : 0;
  // writing: title then wouldPay, char by char
  const total = title.length + (wouldPay?.length ?? 0);
  const chars = write === undefined ? total : clamp01(write) * total;
  const tShown = typed(title, chars);
  const pShown = wouldPay ? typed(wouldPay, chars - title.length) : "";
  const writing = write !== undefined && write < 1;
  const caretEl = (
    <span style={{ display: "inline-block", width: 2.5 * k / 1.5, height: "1em", marginLeft: 3, verticalAlign: "-0.12em", background: C.brandBright, opacity: caret }} />
  );
  const border = `${Math.max(1, k / 1.5)}px solid ${C.line}`;
  return (
    <div
      style={{
        position: "relative",
        width,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "flex-start",
        gap: 12 * k,
        padding: `${pad * k}px 0`,
        borderTop: divider === "top" || divider === "both" ? border : undefined,
        borderBottom: divider === "bottom" || divider === "both" ? border : undefined,
        ...style,
      }}
    >
      {flash > 0 ? <span style={{ position: "absolute", inset: `0 ${-8 * k}px`, borderRadius: RADIUS.sm * k, background: tone, opacity: 0.1 * flash, pointerEvents: "none" }} /> : null}
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ ...txt("label", k), color: C.ink, margin: 0, display: "flex", alignItems: "center", gap: 8 * k, minHeight: 18 * k }}>
          {chain ? <span style={{ width: 8 * k, height: 8 * k, borderRadius: 99, background: CHAIN[chain].color, flexShrink: 0 }} /> : null}
          <span>
            {tShown}
            {writing && pShown.length === 0 ? caretEl : null}
          </span>
        </p>
        {wouldPay ? (
          <p style={{ ...txt("bodySm", k), color: C.inkMuted, margin: 0, minHeight: 18 * k, fontVariantNumeric: "tabular-nums" }}>
            {pShown}
            {writing && pShown.length > 0 ? caretEl : null}
          </p>
        ) : null}
        {evidence !== undefined ? (
          <div style={{ position: "relative", minHeight: 18 * k }}>
            <p style={{ ...txt("bodySm", k), color: C.ink, margin: 0, opacity: r, transform: `translateY(${(1 - r) * 10 * k}px)` }}>{evidence}</p>
            {r < 1 ? (
              <span style={{ position: "absolute", left: 0, top: 4 * k, height: 10 * k, width: 180 * k, borderRadius: RADIUS.sm * k, background: C.surfaceRaised, opacity: 1 - r }} />
            ) : null}
          </div>
        ) : null}
      </div>
      {pill === undefined ? (
        <ItemPill status={r > 0 ? status : "checking"} from={r > 0 && r < 1 ? "checking" : undefined} progress={r} spin={spin} k={k} />
      ) : (
        pill
      )}
    </div>
  );
}

export function GateLine({ status, text, k = K, spin = 0, count = 1, t = "8 s ago", style }: { status: Aggregate; text?: ReactNode; k?: number; spin?: number; count?: number; t?: string; style?: CSSProperties }) {
  const v = VERDICT[status];
  const words =
    text ??
    (status === "clean" || status === "empty"
      ? CLEAN_COPY.gate.clean(t)
      : status === "blocked"
        ? CLEAN_COPY.gate.blocked(count)
        : status === "settling"
          ? CLEAN_COPY.gate.settling(count)
          : CLEAN_COPY.gate.checking);
  return (
    <p style={{ ...txt("bodySm", k), color: v.color, margin: 0, display: "inline-flex", alignItems: "center", gap: 8 * k, ...style }}>
      <span style={{ display: "inline-flex", transform: status === "checking" ? `rotate(${spin}deg)` : undefined }}>
        <v.Icon size={16 * k} strokeWidth={STROKE} />
      </span>
      {words}
    </p>
  );
}

/** A check line from the report's "Checks" list (CircleCheck + text). */
export function CheckLine({ children, ok = true, k = K, style }: { children: ReactNode; ok?: boolean; k?: number; style?: CSSProperties }) {
  return (
    <p style={{ ...txt("body", k), color: C.ink, margin: 0, display: "flex", alignItems: "center", gap: 8 * k, fontFamily: F.sans, ...style }}>
      <CircleCheck size={16 * k} strokeWidth={STROKE} color={ok ? C.success : C.danger} />
      {children}
    </p>
  );
}
