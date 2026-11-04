import type { CSSProperties, ReactNode } from "react";
import { CircleCheck, Copy, Handshake, Link2, Undo2, User, UserPlus } from "lucide-react";
import { C, display, mono, sans } from "../../brand/tokens";
import { CoinIcon } from "../Sticker";

/**
 * Four small app-art stickers for the film (SCRIPT-v4 P2, P4, P5, P6), drawn like the landing's "What else it does"
 * bento art: a white sticker (3px ink outline, hard 4px drop, radius 16), a header with an icon and a bold label, a
 * dashed rule, then the detail. Every state is a prop; nothing keeps time.
 * Shared props: width (authored at 300 px and scaled to it), tilt (degrees, the landing tilts them ±2°), lift (0..1+:
 * rises off the page, the drop grows), style.
 *   AllowanceCard   "Who can spend": avatar + "Daily caps" + Revoke, the bar "0.20 of 0.50 ETH left today"
 *   OfferCard       "Your offer": "42,000 NEAR" in a field, "Expires in 7 days", "✓ Clean history"; accepted → "✓ Accepted"
 *   ClaimLinkCard   "The claim link": "/claim#•••• •••• ••••", "Copy link"; claimed → the lemon "Claimed" badge
 *   NetworksCard    "ETH  USDC", "One address on all four", chips Ethereum · Base · Arbitrum · Optimism
 */

interface Common {
  width?: number;
  tilt?: number;
  lift?: number;
  style?: CSSProperties;
}

const W = 300;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** 0 → 1 pop that overshoots to 1.18 and settles. */
const pop = (t: number) => {
  const x = clamp01(t);
  if (x <= 0) return 0.6;
  return x < 0.35 ? 0.6 + (1.18 - 0.6) * (x / 0.35) : 1.18 + (1 - 1.18) * ((x - 0.35) / 0.65);
};

function Shell({ width = W, tilt = 0, lift = 0, style, children, overhang }: Common & { children: ReactNode; overhang?: ReactNode }) {
  const k = width / W;
  return (
    <div style={{ width, position: "relative", ...style }}>
      <div style={{ width: W, transform: `scale(${k})`, transformOrigin: "0 0", position: "relative" }}>
        <div
          style={{
            width: W,
            boxSizing: "border-box",
            padding: "14px 16px 16px",
            background: C.surface,
            border: `3px solid ${C.ink}`,
            borderRadius: 16,
            boxShadow: `0 ${4 + 6 * lift}px 0 ${C.ink}`,
            transform: `translateY(${-6 * lift}px) rotate(${tilt}deg)`,
            color: C.ink,
            position: "relative",
            ...sans(400),
          }}
        >
          {children}
          {overhang}
        </div>
      </div>
    </div>
  );
}

/** The shells are authored 300 wide; this keeps the outer box's height in step with the scale (for layout). */
function Sized({ width = W, h, children }: { width?: number; h: number; children: ReactNode }) {
  return <div style={{ width, height: (h * width) / W, position: "relative" }}>{children}</div>;
}

function Head({ icon, children, right }: { icon?: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, minHeight: 24 }}>
      {icon}
      <span style={{ ...sans(700), fontSize: 15, lineHeight: "20px", flex: 1, whiteSpace: "nowrap" }}>{children}</span>
      {right}
    </div>
  );
}

const Rule = () => <div style={{ height: 0, borderTop: `1.5px dashed ${C.lineStrong}`, margin: "10px 0 12px", opacity: 0.8 }} />;

function SmallButton({ icon, label, press = 0 }: { icon: ReactNode; label: string; press?: number }) {
  const p = clamp01(press);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 32,
        padding: "0 12px",
        borderRadius: 10,
        border: `2px solid ${C.lineStrong}`,
        background: p > 0 ? C.sunken : C.surface,
        transform: `scale(${1 - 0.04 * p})`,
        ...sans(650),
        fontSize: 14,
        color: C.ink,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {icon}
      {label}
    </span>
  );
}

/* ───────────── Let someone spend ───────────── */

/**
 * AllowanceCard (P4 "someone they allow, within daily limits"): "Who can spend", the avatar with "Daily caps" and
 * Revoke, the cap bar and "0.20 of 0.50 ETH left today".
 *   left / cap   the ETH left today and the daily cap (numbers: animate `left` 0.25 → 0.20 as sam.near sends 0.05)
 *   account      optional mono name under "Daily caps" (e.g. "sam.near")
 *   revokePress  0..1 presses Revoke
 */
export function AllowanceCard({ left = 0.2, cap = 0.5, account, revokePress = 0, ...common }: Common & { left?: number; cap?: number; account?: string; revokePress?: number }) {
  const share = cap > 0 ? clamp01(left / cap) : 0;
  return (
    <Sized width={common.width} h={account ? 168 : 152}>
      <Shell {...common}>
        <Head icon={<UserPlus size={18} strokeWidth={2} />}>Who can spend</Head>
        <Rule />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 32, height: 32, borderRadius: 999, background: C.sky, border: `2px solid ${C.ink}`, display: "grid", placeItems: "center", boxSizing: "border-box", flexShrink: 0 }}>
            <User size={17} strokeWidth={2} color={C.ink} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...sans(700), fontSize: 15, lineHeight: "20px" }}>Daily caps</div>
            {account ? <div style={{ ...mono(450), fontSize: 12.5, lineHeight: "16px", color: C.inkMuted }}>{account}</div> : null}
          </div>
          <SmallButton icon={<Undo2 size={15} strokeWidth={2} />} label="Revoke" press={revokePress} />
        </div>
        <div style={{ marginTop: 12, height: 12, borderRadius: 999, border: `2px solid ${C.ink}`, background: C.surface, overflow: "hidden", boxSizing: "border-box" }}>
          <div style={{ width: `${share * 100}%`, height: "100%", background: C.evm, borderRight: share > 0 && share < 1 ? `2px solid ${C.ink}` : undefined, boxSizing: "border-box" }} />
        </div>
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 7, ...sans(500), fontSize: 13.5, color: C.inkMuted, fontVariantNumeric: "tabular-nums" }}>
          <CoinIcon coin="ETH" size={18} />
          {left.toFixed(2)} of {cap.toFixed(2)} ETH left today
        </div>
      </Shell>
    </Sized>
  );
}

/* ───────────── Make an offer ───────────── */

/**
 * OfferCard (P6 "or take an offer"): "Your offer", the amount in a field ("42,000 NEAR"), "Expires in 7 days", then
 * "✓ Clean history". Offers are in NEAR only.
 *   amount       "42,000" (string; type it in with `typed` 0..1)
 *   accepted     the "✓ Accepted" stamp in the header (acceptPop 0..1 punches it in)
 */
export function OfferCard({
  amount = "42,000",
  expires = "Expires in 7 days",
  typed = 1,
  accepted = false,
  acceptPop,
  ...common
}: Common & { amount?: string; expires?: string; typed?: number; accepted?: boolean; acceptPop?: number }) {
  const shown = amount.slice(0, Math.round(clamp01(typed) * amount.length));
  const ap = acceptPop === undefined ? 1 : acceptPop;
  return (
    <Sized width={common.width} h={182}>
      <Shell {...common}>
        <Head
          icon={<Handshake size={18} strokeWidth={2} />}
          right={
            accepted ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, background: C.success, color: C.white, ...sans(700), fontSize: 13, transform: `scale(${pop(ap)}) rotate(-3deg)`, opacity: clamp01(ap * 4), whiteSpace: "nowrap" }}>
                <CircleCheck size={14} strokeWidth={2.25} />
                Accepted
              </span>
            ) : null
          }
        >
          Your offer
        </Head>
        <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 8, padding: "8px 14px", borderRadius: 12, background: C.sunken, border: `2px solid ${C.lineStrong}` }}>
          <span style={{ ...display(800), fontSize: 26, lineHeight: "32px", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", minWidth: 10 }}>{shown}</span>
          <span style={{ ...sans(600), fontSize: 15, color: C.inkMuted }}>NEAR</span>
        </div>
        <div style={{ marginTop: 8, ...sans(400), fontSize: 13.5, color: C.inkMuted }}>{expires}</div>
        <Rule />
        <div style={{ display: "flex", alignItems: "center", gap: 7, ...sans(700), fontSize: 14.5, color: C.success, marginTop: -2 }}>
          <CircleCheck size={17} strokeWidth={2} />
          Clean history
        </div>
      </Shell>
    </Sized>
  );
}

/* ───────────── Give by link ───────────── */

/**
 * ClaimLinkCard (P5 "even one who isn't on NEAR yet"): "The claim link", the masked link "/claim#•••• •••• ••••",
 * "Copy link"; once claimed, the lemon "Claimed" badge hangs off its lower-right corner.
 *   press 0..1 presses Copy link · copied swaps it to "Copied" · claimed + claimedPop 0..1 for the badge
 */
export function ClaimLinkCard({ press = 0, copied = false, claimed = false, claimedPop, ...common }: Common & { press?: number; copied?: boolean; claimed?: boolean; claimedPop?: number }) {
  const cp = claimedPop === undefined ? 1 : claimedPop;
  return (
    <Sized width={common.width} h={164}>
      <Shell
        {...common}
        overhang={
          claimed ? (
            <span
              style={{
                position: "absolute",
                right: -14,
                bottom: -16,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 12px",
                borderRadius: 999,
                background: C.lemon,
                border: `2px solid ${C.ink}`,
                boxShadow: `0 3px 0 ${C.ink}`,
                ...sans(700),
                fontSize: 14,
                color: C.ink,
                transform: `rotate(-6deg) scale(${pop(cp)})`,
                opacity: clamp01(cp * 4),
                whiteSpace: "nowrap",
              }}
            >
              <CircleCheck size={15} strokeWidth={2.25} />
              Claimed
            </span>
          ) : null
        }
      >
        <Head icon={<Link2 size={18} strokeWidth={2} />}>The claim link</Head>
        <div style={{ marginTop: 12, padding: "9px 12px", borderRadius: 10, background: C.sunken, ...mono(450), fontSize: 15, letterSpacing: "0.02em", color: C.ink, whiteSpace: "nowrap" }}>
          /claim#<span style={{ letterSpacing: "0.12em" }}>•••• •••• ••••</span>
        </div>
        <div style={{ marginTop: 12 }}>
          <SmallButton icon={copied ? <CircleCheck size={15} strokeWidth={2} /> : <Copy size={15} strokeWidth={2} />} label={copied ? "Copied" : "Copy link"} press={press} />
        </div>
      </Shell>
    </Sized>
  );
}

/* ───────────── USDC and L2s ───────────── */

const NETS = [
  { key: "ethereum", label: "Ethereum" },
  { key: "base", label: "Base" },
  { key: "arbitrum", label: "Arbitrum" },
  { key: "optimism", label: "Optimism" },
] as const;
export type L2 = (typeof NETS)[number]["key"];

/**
 * NetworksCard (P2 "USDC too, on Ethereum, Base, Arbitrum or Optimism"): the ETH and USDC coins, "ETH  USDC", "One
 * address on all four", then the four network chips.
 *   highlight   a chip to mark (ink outline + filled dot), e.g. "base" as the USDC lands
 *   reveal      0..1 drops the chips in one by one
 */
export function NetworksCard({ highlight, reveal = 1, ...common }: Common & { highlight?: L2; reveal?: number }) {
  return (
    <Sized width={common.width} h={190}>
      <Shell {...common}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ display: "flex" }}>
            <CoinIcon coin="ETH" size={30} />
            <CoinIcon coin="USDC" size={30} style={{ marginLeft: -9 }} />
          </span>
          <span style={{ ...sans(700), fontSize: 16, letterSpacing: "0.01em" }}>ETH&nbsp;&nbsp;USDC</span>
        </div>
        <div style={{ marginTop: 6, ...sans(400), fontSize: 14, color: C.inkMuted }}>One address on all four</div>
        <Rule />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {NETS.map((n, i) => {
            const t = clamp01(reveal * 4 - i);
            const on = highlight === n.key;
            return (
              <span
                key={n.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  height: 30,
                  padding: "0 10px",
                  borderRadius: 999,
                  background: C.sunken,
                  border: `2px solid ${on ? C.ink : "transparent"}`,
                  boxSizing: "border-box",
                  ...sans(on ? 700 : 600),
                  fontSize: 13.5,
                  color: C.ink,
                  opacity: t,
                  transform: `translateY(${(1 - t) * 6}px)`,
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ width: 9, height: 9, borderRadius: 99, border: `2px solid ${C.ink}`, background: on ? C.sky : "transparent", boxSizing: "border-box", flexShrink: 0 }} />
                {n.label}
              </span>
            );
          })}
        </div>
      </Shell>
    </Sized>
  );
}
