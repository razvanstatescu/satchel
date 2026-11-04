import type { CSSProperties, ReactNode } from "react";
import { Check, Gift, Handshake, LoaderCircle, Snowflake, TriangleAlert } from "lucide-react";
import { CharmShape, charmFill } from "../brand/Charm";
import { StickerS } from "../brand/Logo";
import { C, type Chain, CHAIN, display, DROP, mono, NIGHT, OUTLINE, R, sans } from "../brand/tokens";

/**
 * Satchel 2.0 sticker UI kit for video. Everything is authored at UI scale and multiplied by `k` (video usually
 * k ≈ 2–2.6 so text stays legible on phones). Stickers: 3px ink outline + hard ink drop, no blur.
 *   lift  0..1+ : the sticker rises off the page, its drop grows (4 → 4 + 8·lift) and it moves up by the same amount
 *   press 0..1  : a button sinks into its shadow (translateY 4, drop → 0)
 */

export function Sticker({
  k = 2,
  radius = R.card,
  bg = C.surface,
  lift = 0,
  press = 0,
  children,
  style,
  outline = true,
}: {
  k?: number;
  radius?: number;
  bg?: string;
  lift?: number;
  press?: number;
  children?: ReactNode;
  style?: CSSProperties;
  outline?: boolean;
}) {
  const drop = DROP * k * (1 - press) + 8 * k * lift;
  const dy = DROP * k * press - 8 * k * lift;
  return (
    <div
      style={{
        background: bg,
        borderRadius: radius * k,
        border: outline ? `${OUTLINE * k}px solid ${C.ink}` : undefined,
        boxShadow: `0 ${drop}px 0 ${C.ink}`,
        transform: `translateY(${dy}px)`,
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Button({ label, k = 2, kind = "primary", press = 0, width, style }: { label: ReactNode; k?: number; kind?: "primary" | "secondary"; press?: number; width?: number; style?: CSSProperties }) {
  const primary = kind === "primary";
  return (
    <div
      style={{
        ...sans(700),
        fontSize: 15 * k,
        lineHeight: `${20 * k}px`,
        padding: `${13 * k}px ${22 * k}px`,
        borderRadius: R.md * k,
        background: primary ? C.brand : C.surface,
        color: C.ink,
        border: primary ? `${2 * k}px solid ${C.ink}` : `${2 * k}px solid ${C.lineStrong}`,
        boxShadow: primary ? `0 ${DROP * k * (1 - press)}px 0 ${C.ink}` : undefined,
        transform: `translateY(${primary ? DROP * k * press : 0}px)`,
        textAlign: "center",
        width,
        boxSizing: "border-box",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {label}
    </div>
  );
}

// App 2.0 states (D-44): Active, Signing, Paused for sale, Sold, Needs attention; a give ends in "Given".
export type PillKind = "sent" | "paused" | "attention" | "new" | "active" | "signing" | "sold" | "given";
const PILL: Record<PillKind, { word: string; color: string; Icon?: typeof Check }> = {
  sent: { word: "Sent", color: C.success, Icon: Check },
  active: { word: "Active", color: C.success, Icon: Check },
  signing: { word: "Signing", color: C.frozen, Icon: LoaderCircle },
  paused: { word: "Paused for sale", color: C.frozen, Icon: Snowflake },
  attention: { word: "Needs attention", color: C.danger, Icon: TriangleAlert },
  sold: { word: "Sold", color: C.inkMuted, Icon: Handshake },
  given: { word: "Given", color: C.inkMuted, Icon: Gift },
  new: { word: "New", color: C.ink },
};

/** A Day state colour's Night counterpart (D-44 tokens): success #4fd9b0, frozen #8db8ff, danger #ff7a92, muted #b7b0d1. */
const NIGHT_STATE: Record<string, string> = { [C.success]: NIGHT.success, [C.frozen]: NIGHT.frozen, [C.danger]: NIGHT.danger, [C.inkMuted]: NIGHT.inkMuted, [C.ink]: NIGHT.ink };

/** State pill: icon + word on sunken. `night` = the Night pill (bg #29214b, the Night state colours); "New" stays lemon. */
export function Pill({ kind, k = 2, word, night = false, style }: { kind: PillKind; k?: number; word?: string; night?: boolean; style?: CSSProperties }) {
  const base = PILL[kind];
  const isNew = kind === "new";
  const p = night && !isNew ? { ...base, color: NIGHT_STATE[base.color] ?? base.color } : base;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6 * k,
        ...sans(isNew ? 700 : 600),
        fontSize: 13 * k,
        lineHeight: `${18 * k}px`,
        padding: `${6 * k}px ${12 * k}px`,
        borderRadius: 999,
        background: isNew ? C.lemon : night ? NIGHT.sunken : C.sunken,
        border: isNew ? `${2 * k}px solid ${C.ink}` : undefined,
        color: p.color,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {p.Icon ? <p.Icon size={14 * k} strokeWidth={2} color={p.color} /> : null}
      {word ?? p.word}
    </span>
  );
}

export function ChainDot({ chain, k = 2 }: { chain: Chain; k?: number }) {
  return <span style={{ width: 8 * k, height: 8 * k, borderRadius: 99, background: CHAIN[chain].ui, display: "inline-block", flexShrink: 0 }} />;
}

export function Chip({ chain, amount, k = 2, style }: { chain: Chain; amount?: string; k?: number; style?: CSSProperties }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6 * k,
        ...sans(500),
        fontSize: 13 * k,
        lineHeight: `${18 * k}px`,
        padding: `${6 * k}px ${10 * k}px`,
        borderRadius: R.sm * k,
        background: C.sunken,
        color: C.ink,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <ChainDot chain={chain} k={k} />
      {CHAIN[chain].ticker}
      {amount ? ` ${amount}` : null}
    </span>
  );
}

export function Address({ value, k = 2, style }: { value: string; k?: number; style?: CSSProperties }) {
  return <span style={{ ...mono(450), fontSize: 13 * k, lineHeight: `${18 * k}px`, color: C.ink, ...style }}>{value}</span>;
}

/** The lemon "Yours" (or "New") sticker after the card name, tilted −4° (app D-44). Authored at UI scale. */
export function NameSticker({ word = "Yours", style }: { word?: string; style?: CSSProperties }) {
  return (
    <span
      style={{
        display: "inline-block",
        ...sans(700),
        fontSize: 12,
        lineHeight: "16px",
        padding: "2px 8px",
        borderRadius: 999,
        background: C.lemon,
        color: C.ink,
        border: `2px solid ${C.ink}`,
        transform: "rotate(-4deg)",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {word}
    </span>
  );
}

/** A small static charm (the coin with its face) for ledger rows, `size` px across. */
export function LedgerCharm({ chain, size = 24, night = false }: { chain: Chain; size?: number; night?: boolean }) {
  // CharmShape is drawn about its pivot; the coin centre sits at y 108, radius 64 + outline 12/2
  return (
    <svg viewBox="-70 38 140 140" width={size} height={size} style={{ display: "block", flexShrink: 0 }} aria-hidden>
      <CharmShape fill={charmFill(chain)} showStem={false} outlineColor={night ? NIGHT.lineStrong : C.ink} />
    </svg>
  );
}


/* ───────────────────────────── the value card (SCRIPT-v4 "The card"; app D-50/D-52) ───────────────────────────── */

export type Coin = "BTC" | "ETH" | "SOL" | "USDC";
export type Network = "bitcoin" | "ethereum" | "base" | "arbitrum" | "optimism" | "solana" | "near";
/** One holding: the coin, its amount (a number, so scenes can interpolate it) and, for USDC/L2s, its network. */
export interface CardCoin {
  coin: Coin;
  amount: number;
  network?: Network;
}

/** The film's fixed prices (SCRIPT-v4 "Numbers", the landing sample): BTC $80,000 · ETH $2,500 · SOL $100 · USDC $1 · NEAR $4. */
export const COIN_PRICE = { BTC: 80_000, ETH: 2_500, SOL: 100, USDC: 1, NEAR: 4 } as const;

/** Satchel #7 after the P3 sends: 0.05 BTC · 0.80 ETH · 12 SOL · 800 USDC (on Base) → ≈ $8,000.00. */
export const COINS_7: CardCoin[] = [
  { coin: "BTC", amount: 0.05 },
  { coin: "ETH", amount: 0.8 },
  { coin: "SOL", amount: 12 },
  { coin: "USDC", amount: 800, network: "base" },
];

/** The coins' artwork fills (bar segments, coin discs): the chain charms' colours, USDC sky. */
export const COIN_FILL: Record<Coin, string> = { BTC: C.btc, ETH: C.evm, SOL: C.sol, USDC: C.sky };

/** Network stickers on a coin (app CoinIcon): a letter on a coloured disc, so it reads without colour. */
const BADGE: Record<Network, { fill: string; letter: string }> = {
  bitcoin: { fill: C.btc, letter: "₿" },
  ethereum: { fill: C.evm, letter: "E" },
  base: { fill: "#6e9bff", letter: "B" },
  arbitrum: { fill: "#9ed8f2", letter: "A" },
  optimism: { fill: C.brand, letter: "OP" },
  solana: { fill: C.sol, letter: "S" },
  near: { fill: "#7fe3b8", letter: "N" },
};

/** The dollar value of some coins at the film's fixed prices. */
export function usd(coins: CardCoin[]): number {
  return coins.reduce((s, c) => s + Math.max(0, c.amount) * COIN_PRICE[c.coin], 0);
}

/** "$8,000.00" (en-US, two decimals). */
export function usdText(v: number): string {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "50%"; "< 1%" for a sliver (app shareText). */
export function shareText(share: number): string {
  if (share > 0 && share < 0.01) return "< 1%";
  return `${Math.round(share * 100)}%`;
}

export interface CardRow {
  coin: Coin;
  amount: number;
  network?: Network;
  usd: number;
  share: number;
}

/**
 * The overview the card draws: coins merged by coin (amounts summed, the first network kept), valued, shared, sorted by
 * value (order "value", the app's) or kept in the given order ("given": no reordering while a scene animates a drain).
 */
export function cardOverview(coins: CardCoin[], order: "value" | "given" = "value"): { usd: number; rows: CardRow[] } {
  const merged: CardCoin[] = [];
  for (const c of coins) {
    const m = merged.find((x) => x.coin === c.coin);
    if (m) m.amount += c.amount;
    else merged.push({ ...c });
  }
  const total = usd(merged);
  const rows = merged.map((c) => {
    const v = Math.max(0, c.amount) * COIN_PRICE[c.coin];
    return { coin: c.coin, amount: c.amount, network: c.network, usd: v, share: total > 0 ? v / total : 0 };
  });
  if (order === "value") rows.sort((a, b) => b.usd - a.usd);
  return { usd: total, rows };
}

const CHAIN_COIN: Record<Chain, Coin> = { btc: "BTC", evm: "ETH", sol: "SOL" };
/** The v2 `chips` prop ({ chain, amount: "0.0412" }) as coins, so older scenes keep working. */
export function chipsToCoins(chips: { chain: Chain; amount?: string }[]): CardCoin[] {
  return chips.map((c) => ({ coin: CHAIN_COIN[c.chain], amount: Number.parseFloat((c.amount ?? "0").replace(/,/g, "")) || 0 }));
}

/**
 * A coin as Satchel draws it (app CoinIcon): the disc with a face and the ink outline, never a real logo; BTC, ETH and
 * SOL are the charms' coins, USDC is sky. `network` adds the small lettered network sticker on its lower right
 * (USDC anywhere, ETH on an L2). `sad` turns the smile down; `night` uses the Night outline.
 */
export function CoinIcon({ coin, network, size = 24, sad = false, night = false, style }: { coin: Coin; network?: Network | null; size?: number; sad?: boolean; night?: boolean; style?: CSSProperties }) {
  const vb = network ? 154 : 140;
  const ink = night ? NIGHT.lineStrong : C.ink;
  const b = network ? BADGE[network] : null;
  const eyeY = sad ? 66 : 64;
  return (
    <svg viewBox={`0 0 ${vb} ${vb}`} width={size} height={size} style={{ display: "block", flexShrink: 0, overflow: "visible", ...style }} aria-hidden>
      <circle cx="70" cy="70" r="64" fill={COIN_FILL[coin]} stroke={ink} strokeWidth="12" />
      <circle cx="48" cy={eyeY} r="9" fill={C.ink} />
      <circle cx="92" cy={eyeY} r="9" fill={C.ink} />
      <path d={sad ? "M54 100 Q70 86 86 100" : "M54 88 Q70 102 86 88"} fill="none" stroke={C.ink} strokeWidth="9" strokeLinecap="round" />
      {b ? (
        <g>
          <circle cx="120" cy="120" r="30" fill={b.fill} stroke={ink} strokeWidth="8" />
          <text x="120" y="121" textAnchor="middle" dominantBaseline="central" fill={C.ink} fontFamily="Onest, sans-serif" fontWeight={800} fontSize={b.letter.length > 1 ? 24 : 32}>
            {b.letter}
          </text>
        </g>
      ) : null}
    </svg>
  );
}

/**
 * The value bar (app ValueBar): one segment per coin in the coins' colours, sized by value share, inside a
 * sticker-outlined pill. Segments under ~0.1% vanish, so a share animated to 0 closes up cleanly.
 */
export function ValueBar({ rows, height = 12, night = false, style }: { rows: CardRow[]; height?: number; night?: boolean; style?: CSSProperties }) {
  const line = night ? NIGHT.lineStrong : C.ink;
  const segs = rows.filter((r) => r.share > 0.001);
  return (
    <div style={{ display: "flex", height, width: "100%", overflow: "hidden", borderRadius: 999, border: `2px solid ${line}`, background: night ? NIGHT.sunken : C.sunken, boxSizing: "border-box", ...style }}>
      {segs.map((r, i) => (
        <span key={r.coin} style={{ flexGrow: r.share, flexBasis: 0, height: "100%", background: COIN_FILL[r.coin], borderLeft: i > 0 ? `2px solid ${line}` : undefined }} />
      ))}
    </div>
  );
}

/** The legend under the bar: three coins ("BTC 50%"), then "+N" for the rest. Empty → the home coins, faded. */
export function ValueLegend({ rows, max = 3, icons = "charm", night = false, size = 24, style }: { rows: CardRow[]; max?: number; icons?: "charm" | "dot"; night?: boolean; size?: number; style?: CSSProperties }) {
  const ink = night ? NIGHT.ink : C.ink;
  const muted = night ? NIGHT.inkMuted : C.inkMuted;
  const empty = rows.length === 0;
  const shown: { coin: Coin; share: number | null }[] = empty ? (["BTC", "ETH", "SOL"] as Coin[]).map((coin) => ({ coin, share: null })) : rows.slice(0, max);
  const more = rows.length - Math.min(rows.length, max);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, ...style }}>
      {shown.map((r) => (
        <span key={r.coin} style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0, opacity: empty ? 0.5 : 1 }}>
          {icons === "charm" ? (
            <CoinIcon coin={r.coin} size={size} night={night} />
          ) : (
            <span style={{ width: 12, height: 12, borderRadius: 99, background: COIN_FILL[r.coin], border: `2px solid ${night ? NIGHT.lineStrong : C.ink}`, boxSizing: "border-box" }} />
          )}
          <span style={{ ...sans(650), fontSize: 13, lineHeight: "18px", color: ink, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
            {r.coin}
            {r.share !== null ? <span style={{ ...sans(500), color: muted }}>{` ${shareText(r.share)}`}</span> : null}
          </span>
        </span>
      ))}
      {more > 0 ? <span style={{ ...sans(650), fontSize: 13, color: muted, whiteSpace: "nowrap" }}>+{more}</span> : null}
    </div>
  );
}

/**
 * The Satchel card, brand 2.0, as the app and the landing now draw it (D-50/D-52; SCRIPT-v4 "The card"): white body,
 * 3px outline, hard drop, coral band with "Satchel #N" (Funnel Display 800), the lemon "Yours" sticker when owned and
 * the white sticker S. The body is the VALUE OVERVIEW: "≈ $8,000.00" (Funnel Display 800, tabular) with the state pill
 * beside it (centred: no "at mainnet prices" line in the film), the value bar, and the legend "BTC 50% · ETH 25% ·
 * SOL 15% · +1". Fiat appears here and nowhere else. Authored at 400 × 252 (1.586:1) and scaled by `width`.
 *   coins     the holdings, amounts as NUMBERS (interpolate them: the total, bar and shares are computed)
 *             default: Satchel #7, 0.05 BTC · 0.80 ETH · 12 SOL · 800 USDC → ≈ $8,000.00 · BTC 50% · ETH 25% · SOL 15% · +1
 *   chips     (v2, still accepted) { chain, amount: "0.05" } rows, mapped to coins when `coins` is not given
 *   order     "value" (default, the app's) | "given" (keep the array's order, e.g. while C1 drains the ETH to 0%)
 *   empty     all amounts zero or no coins → "Nothing inside yet" and the home coins faded (P1, just minted)
 *   preview   mint preview: band "New Satchel" + "New" sticker, the body keeps the three "{Chain} address" rows
 *   yours / pill / night / lift / width / name / icons ("dot" = legend dots) as before. night = surface #1c1538,
 *             outline #8A82AE, drop #000, total/legend in Night ink (#f4f2ff / #b7b0d1), the pill on #29214b in the
 *             Night state colours (#8db8ff frozen, #4fd9b0 success, #ff7a92 danger)
 *   total     legacy custom body, used only when `coins` is not given and `chips` is [] (P6 v2 rows)
 */
export function SatchelCard({
  id = "7",
  width = 640,
  coins,
  chips,
  order = "value",
  lift = 0,
  pill,
  name,
  yours = false,
  preview = false,
  icons = "charm",
  night = false,
  total,
  label,
  children,
  style,
}: {
  id?: string;
  width?: number;
  coins?: CardCoin[];
  chips?: { chain: Chain; amount?: string }[];
  order?: "value" | "given";
  lift?: number;
  pill?: PillKind;
  name?: string;
  yours?: boolean;
  preview?: boolean;
  icons?: "charm" | "dot";
  night?: boolean;
  total?: ReactNode;
  label?: string;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  const BW = 400;
  const BH = 252;
  const k = width / BW;
  const drop = DROP + 8 * lift;
  const outline = night ? NIGHT.lineStrong : C.ink;
  const shadow = night ? "#000000" : C.ink;
  const ink = night ? NIGHT.ink : C.ink;
  const muted = night ? NIGHT.inkMuted : C.inkMuted;
  const legacy = coins === undefined && chips !== undefined && chips.length === 0 && total !== undefined;
  const list = coins ?? (chips && chips.length ? chipsToCoins(chips) : chips ? [] : COINS_7);
  const ov = cardOverview(list, order);
  const empty = ov.usd <= 0;
  const rows = empty ? [] : ov.rows;
  const previewChains: Chain[] = chips && chips.length ? chips.map((c) => c.chain) : ["btc", "evm", "sol"];
  return (
    <div style={{ width, height: BH * k, position: "relative", ...style }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: BW,
          height: BH,
          transform: `translateY(${-8 * lift * k}px) scale(${k})`,
          transformOrigin: "0 0",
          borderRadius: R.card,
          background: night ? NIGHT.surface : C.surface,
          border: `${OUTLINE}px solid ${outline}`,
          boxShadow: `0 ${drop}px 0 ${shadow}`,
          overflow: "hidden",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ height: 66, background: C.brand, borderBottom: `${OUTLINE}px solid ${outline}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 0 20px", boxSizing: "border-box", flexShrink: 0 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ ...display(800), fontSize: 22, letterSpacing: "-0.02em", color: C.ink }}>{name ?? (preview ? "New Satchel" : `Satchel #${id}`)}</span>
            {preview ? <NameSticker word="New" /> : yours ? <NameSticker /> : null}
          </span>
          <StickerS height={40} />
        </div>
        {preview ? (
          <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6, boxSizing: "border-box" }}>
            {previewChains.map((c) => (
              <div key={c} style={{ display: "flex", alignItems: "center", gap: 10, height: 30 }}>
                {icons === "charm" ? <LedgerCharm chain={c} size={24} night={night} /> : <span style={{ width: 12, height: 12, borderRadius: 99, background: CHAIN[c].color, border: `2px solid ${outline}`, flexShrink: 0, margin: "0 4px" }} />}
                <span style={{ ...sans(600), fontSize: 15, color: ink }}>{CHAIN[c].name} address</span>
              </div>
            ))}
          </div>
        ) : legacy ? (
          <div style={{ flex: 1, padding: "14px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between", boxSizing: "border-box" }}>
            <div>
              {label ? <div style={{ ...sans(500), fontSize: 13, color: muted }}>{label}</div> : null}
              <div style={{ ...display(800), fontSize: 40, lineHeight: "44px", letterSpacing: "-0.03em", color: ink, fontVariantNumeric: "tabular-nums" }}>{total}</div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>{pill ? <Pill kind={pill} k={1} night={night} /> : null}</div>
          </div>
        ) : (
          <div style={{ flex: 1, padding: "18px 20px 18px", display: "flex", flexDirection: "column", justifyContent: "space-between", boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, minWidth: 0 }}>
              {empty ? (
                <span data-card-total="empty" style={{ ...display(800), fontSize: 26, lineHeight: "36px", letterSpacing: "-0.02em", color: muted, whiteSpace: "nowrap" }}>
                  Nothing inside yet
                </span>
              ) : (
                <span data-card-total={ov.usd.toFixed(2)} style={{ ...display(800), fontSize: 32, lineHeight: "36px", letterSpacing: "-0.02em", color: ink, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  ≈ {usdText(ov.usd)}
                </span>
              )}
              {pill ? <Pill kind={pill} k={1} night={night} /> : null}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {empty ? null : <ValueBar rows={rows} night={night} />}
              <ValueLegend rows={rows} icons={icons} night={night} />
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
