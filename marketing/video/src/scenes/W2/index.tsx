import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Check, CircleCheck, Copy, Hourglass, Landmark, LoaderCircle, Wallet } from "lucide-react";
import { C, CHAIN, F, type Chain } from "../../brand/tokens";
import { ChainDot } from "../../components/SatchelCard";
import { BuyButton } from "../../components/product";
import { Sfx } from "../../lib/Sfx";
import { getScene } from "../../lib/timeline";
import { EASE, FPS, SPRING, s, tween } from "../../lib/time";
import { bric, CLAMP, clamp01, KeyLitGround, lerp, MaskLine, pickSfx } from "../S01/kit";
import { cardH, Roll, WalletCard } from "../W1/card";
import { S8_ADDR, S8_DEPOSIT, S8_ID, S8_QR_BTC, W1_END_CARD } from "../W1/s8";

/**
 * W2 Fund (L21). Satchel #8 slides over from W1 while the product's Receive view opens beside it: the chain switcher,
 * a real QR of the Bitcoin address, "This Satchel's Bitcoin address", the grouped address and "Copy Bitcoin address".
 * Then coins arrive from outside (a neutral wallet and exchange glyph, no brands): each deposit flies into the card,
 * its Incoming row goes "+0.0123 BTC · in mempool" → "Received 0.0123 BTC" (product copy) and the chip counts up.
 */

const sc = getScene("W2");
const D = sc.duration;
const L = sc.line("L21");
const word = (p: string) => sc.wordAt("L21", p);
const tFund = L.start + (L.words[0]?.start ?? 0);

const CHAINS: Chain[] = ["btc", "evm", "sol"];

// Choreography, anchored to the VO.
const T_COPY = Math.max(0.75, word("any") - 0.05);
const T_SRC = { wallet: Math.max(T_COPY + 0.15, word("wallet") - 0.1), exchange: Math.max(T_COPY + 0.4, word("exchange") - 0.1) };
const DEP_T: number[] = [];
{
  const want = [word("exchange") + 0.3, word("native") - 0.1, word("coins") + 0.4];
  for (let i = 0; i < 3; i++) {
    const lo = i ? DEP_T[i - 1] + 0.75 : T_SRC.exchange + 0.2;
    DEP_T.push(Math.min(Math.max(want[i], lo), D - 1.55 - (2 - i) * 0.5));
  }
}
const FLY = 0.4; // deposit flight
const CONFIRM = 0.55; // mempool → received
const COUNT = 0.45;
const SOURCE_OF: Record<Chain, "wallet" | "exchange"> = { btc: "exchange", evm: "wallet", sol: "exchange" };

// Layout.
const PANEL = { x: 120, y: 268, w: 640 };
const CARD = { cx: 1140, cy: 454, w: 520 };
const CARD_TOP = CARD.cy - cardH(CARD.w) / 2;
const INCOMING_Y = CARD_TOP + cardH(CARD.w) + 40;
const SRC = { wallet: { cx: 1700, cy: 352 }, exchange: { cx: 1700, cy: 612 } };
const SRC_R = 66;
// chip centres on the card (base 400×252 layout: chips row at y≈219, x≈55 / 134 / 214)
const CHIP_TARGET = (i: number) => ({ x: CARD.cx - CARD.w / 2 + [55, 134, 214][i] * (CARD.w / 400), y: CARD_TOP + 219 * (CARD.w / 400) });

const fmt = (v: number, d: number) => (v <= 0 ? "0" : v.toFixed(d));
const DEP_LABEL = (ch: Chain) => `${S8_DEPOSIT[ch].amount.toFixed(S8_DEPOSIT[ch].decimals)} ${CHAIN[ch].ticker}`;

function GroupedAddress({ address, size }: { address: string; size: number }) {
  const groups = address.match(/.{1,4}/g) ?? [address];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", fontFamily: F.mono, fontSize: size, lineHeight: `${size * 1.45}px`, maxWidth: PANEL.w - 72 }}>
      {groups.map((g, i) => {
        const strong = i < 2 || i === groups.length - 1;
        return (
          <span key={i} style={{ marginRight: i === groups.length - 1 ? 0 : "0.35em", fontWeight: strong ? 600 : 450, color: strong ? C.ink : C.inkMuted }}>
            {g}
          </span>
        );
      })}
    </div>
  );
}

function SourceGlyph({ kind, p }: { kind: "wallet" | "exchange"; p: number }) {
  if (p <= 0) return null;
  const { cx, cy } = SRC[kind];
  const Icon = kind === "wallet" ? Wallet : Landmark;
  return (
    <div style={{ position: "absolute", left: cx - 120, top: cy - SRC_R, width: 240, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, opacity: clamp01(p * 3), transform: `scale(${lerp(0.5, 1, p)})` }}>
      <div style={{ width: SRC_R * 2, height: SRC_R * 2, borderRadius: 999, background: C.surfaceRaised, boxShadow: `inset 0 0 0 2px ${C.lineStrong}`, display: "grid", placeItems: "center" }}>
        <Icon size={58} strokeWidth={1.6} color={C.inkMuted} />
      </div>
      <div style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 30, color: C.inkMuted }}>{kind === "wallet" ? "Wallet" : "Exchange"}</div>
    </div>
  );
}

export default function W2() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / FPS;

  // the card slides over from W1's left column
  const travel = spring({ frame: f, fps, config: SPRING.handoff });
  const cx = lerp(W1_END_CARD.cx, CARD.cx, travel);
  const cy = lerp(W1_END_CARD.cy, CARD.cy, travel);
  const cw = lerp(W1_END_CARD.w, CARD.w, travel);

  // Receive view
  const panelIn = interpolate(f, [2, 16], [0, 1], { ...CLAMP, easing: EASE.expoOut });
  const qr = interpolate(f, [s(0.3), s(0.3) + 12], [0, 1], { ...CLAMP, easing: EASE.expoOut });
  const press = interpolate(f, [s(T_COPY), s(T_COPY) + 3, s(T_COPY) + 7], [0, 1, 0], CLAMP);
  const copied = t >= T_COPY + 0.08;
  const panelDim = interpolate(f, [s(DEP_T[0]), s(DEP_T[0]) + 12], [1, 0.62], CLAMP);

  const headP = interpolate(f, [s(tFund - 0.05), s(tFund - 0.05) + 16], [0, 1], { ...CLAMP, easing: EASE.expoOut });
  const drift = 1 + 0.015 * tween(f, 0, D, 0, 1, EASE.standard);

  // deposits
  const dep = CHAINS.map((ch, i) => {
    const t0 = DEP_T[i];
    const fly = interpolate(f, [s(t0), s(t0 + FLY)], [0, 1], { ...CLAMP, easing: EASE.expoInOut });
    const landed = t >= t0 + FLY;
    const received = t >= t0 + FLY + CONFIRM;
    const count = interpolate(f, [s(t0 + FLY + CONFIRM), s(t0 + FLY + CONFIRM + COUNT)], [0, 1], { ...CLAMP, easing: EASE.quintOut });
    const rowIn = interpolate(f, [s(t0 + FLY) - 2, s(t0 + FLY) + 8], [0, 1], { ...CLAMP, easing: EASE.expoOut });
    const flip = interpolate(f, [s(t0 + FLY + CONFIRM), s(t0 + FLY + CONFIRM) + 8], [0, 1], { ...CLAMP, easing: EASE.expoOut });
    const flash = landed ? Math.max(0, 1 - (t - t0 - FLY) / 0.35) : 0;
    return { ch, t0, fly, landed, received, count, rowIn, flip, flash };
  });
  const anyRow = dep.some((d) => d.rowIn > 0);

  return (
    <AbsoluteFill style={{ background: C.ground }}>
      <KeyLitGround plateName="leather-ground" plateOpacity={0.3} light={0.24} dx={-24 * tween(f, 0, D, 0, 1, EASE.standard)} />
      <AbsoluteFill style={{ transform: `scale(${drift})` }}>
        {/* headline */}
        <div style={{ position: "absolute", left: 120, top: 96 }}>
          <MaskLine p={headP}>
            <div style={{ ...bric(lerp(560, 780, headP), lerp(86, 100, headP)), fontSize: 112, lineHeight: 1.04, letterSpacing: "-0.03em", color: C.ink, whiteSpace: "nowrap" }}>Fund it from anywhere.</div>
          </MaskLine>
        </div>

        {/* the Receive view (product receive page, one chain shown) */}
        <div
          style={{
            position: "absolute",
            left: PANEL.x,
            top: PANEL.y,
            width: PANEL.w,
            boxSizing: "border-box",
            padding: "26px 32px 30px",
            borderRadius: 30,
            background: C.surface,
            boxShadow: `inset 0 0 0 2px ${C.line}, 0 24px 60px rgba(0,0,0,0.45)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            clipPath: `inset(0 ${(1 - panelIn) * 100}% 0 0 round 30px)`,
            transform: `translateX(${(1 - panelIn) * -40}px)`,
            opacity: panelDim,
          }}
        >
          {/* chain switcher */}
          <div style={{ display: "inline-flex", borderRadius: 999, background: C.surfaceRaised, padding: 4 }}>
            {CHAINS.map((ch) => (
              <span
                key={ch}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 60,
                  padding: "0 26px",
                  borderRadius: 999,
                  fontFamily: F.sans,
                  fontWeight: 600,
                  fontSize: 29,
                  color: ch === "btc" ? C.ink : C.inkMuted,
                  background: ch === "btc" ? C.surface : "transparent",
                  boxShadow: ch === "btc" ? `inset 0 0 0 2px ${C.lineStrong}` : undefined,
                }}
              >
                {CHAIN[ch].name}
              </span>
            ))}
          </div>
          {/* QR: leather-ink modules on a white plate (generated with the product's qrcode settings) */}
          <div style={{ marginTop: 26, width: 300, height: 300, borderRadius: 18, overflow: "hidden", background: "#fff", boxShadow: `0 0 0 2px ${C.lineStrong}`, position: "relative", clipPath: `inset(0 0 ${(1 - qr) * 100}% 0 round 18px)` }}>
            <Img src={staticFile(S8_QR_BTC)} style={{ width: 300, height: 300, display: "block" }} />
            {qr > 0 && qr < 1 ? <div style={{ position: "absolute", left: 0, right: 0, top: `${qr * 100}%`, height: 3, background: C.frozen, opacity: 0.7 }} /> : null}
          </div>
          <div style={{ marginTop: 22, fontFamily: F.sans, fontSize: 29, lineHeight: "40px", color: C.inkMuted }}>This Satchel's Bitcoin address</div>
          <div style={{ marginTop: 8 }}>
            <GroupedAddress address={S8_ADDR.btc} size={31} />
          </div>
          <div style={{ marginTop: 24, width: "100%" }}>
            <BuyButton
              k={2}
              press={press}
              label={
                <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
                  {copied ? <Check size={34} strokeWidth={2} /> : <Copy size={32} strokeWidth={1.9} />}
                  {copied ? "Copied" : "Copy Bitcoin address"}
                </span>
              }
            />
          </div>
        </div>

        {/* the outside world */}
        <SourceGlyph kind="wallet" p={spring({ frame: f - s(T_SRC.wallet), fps, config: SPRING.slam })} />
        <SourceGlyph kind="exchange" p={spring({ frame: f - s(T_SRC.exchange), fps, config: SPRING.slam })} />

        {/* Satchel #8 */}
        <div style={{ position: "absolute", left: cx - cw / 2, top: cy - cardH(cw) / 2 }}>
          <WalletCard
            width={cw}
            name={`Satchel #${S8_ID}`}
            status="active"
            chips={dep.map((d) => {
              const a = S8_DEPOSIT[d.ch];
              const v = a.amount * d.count;
              return {
                chain: d.ch,
                label: (
                  <span
                    style={{
                      display: "inline-block",
                      color: d.count > 0 && d.count < 1 ? C.brandBright : C.ink,
                      transform: `scale(${1 + 0.28 * Math.sin(Math.PI * d.count) + 0.12 * d.flash})`,
                      transformOrigin: "30% 60%",
                    }}
                  >
                    {CHAIN[d.ch].ticker}
                    {" "}
                    {d.count >= 1 ? a.amount.toFixed(a.decimals) : fmt(v, a.decimals)}
                  </span>
                ),
              };
            })}
            stitch={1}
          />
        </div>

        {/* Incoming (product copy: waiting → in mempool / confirming → received) */}
        <div style={{ position: "absolute", left: CARD.cx - CARD.w / 2, top: INCOMING_Y, opacity: interpolate(f, [8, 20], [0, 1], CLAMP) }}>
          <div style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 31, lineHeight: "40px", color: C.inkMuted }}>Incoming</div>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
            {!anyRow ? (
              <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: F.sans, fontSize: 34, lineHeight: "46px", color: C.ink }}>
                <span style={{ display: "inline-flex", transform: `rotate(${f * 12}deg)` }}>
                  <LoaderCircle size={34} strokeWidth={1.75} color={C.inkMuted} />
                </span>
                Waiting for a deposit…
              </div>
            ) : null}
            {dep.map((d) =>
              d.rowIn > 0 ? (
                <div key={d.ch} style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: F.sans, fontSize: 34, lineHeight: "46px", color: C.ink, opacity: d.rowIn, transform: `translateY(${(1 - d.rowIn) * 14}px)`, fontVariantNumeric: "tabular-nums" }}>
                  <ChainDot chain={d.ch} size={14} />
                  <Roll
                    p={d.flip}
                    from={
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
                        <Hourglass size={32} strokeWidth={1.75} color={C.frozen} />+{DEP_LABEL(d.ch)} · {d.ch === "btc" ? "in mempool" : "confirming"}
                      </span>
                    }
                    to={
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
                        <CircleCheck size={32} strokeWidth={1.75} color={C.success} />
                        Received {DEP_LABEL(d.ch)}
                      </span>
                    }
                  />
                </div>
              ) : null,
            )}
          </div>
        </div>

        {/* deposits in flight: a small amount tag travels from the source into the card's chip */}
        {dep.map((d, i) => {
          if (d.fly <= 0 || d.landed) return null;
          const from = SRC[SOURCE_OF[d.ch]];
          const to = CHIP_TARGET(i);
          const x = lerp(from.cx - 40, to.x, d.fly);
          const y = lerp(from.cy, to.y, d.fly) - Math.sin(Math.PI * d.fly) * 90;
          const k = lerp(1, 0.55, d.fly);
          return (
            <div
              key={d.ch}
              style={{
                position: "absolute",
                left: x,
                top: y,
                transform: `translate(-50%, -50%) scale(${k})`,
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 16px",
                borderRadius: 14,
                background: C.surfaceRaised,
                boxShadow: `inset 0 0 0 2px ${C.lineStrong}, 0 10px 24px rgba(0,0,0,0.4)`,
                fontFamily: F.sans,
                fontWeight: 600,
                fontSize: 30,
                color: C.ink,
                whiteSpace: "nowrap",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <ChainDot chain={d.ch} size={14} />+{DEP_LABEL(d.ch)}
            </div>
          );
        })}
      </AbsoluteFill>

      <Sfx name="whoosh-fast" at={0.16} align="peak" gainDb={-6} />
      <Sfx name="ui-tick" at={0.3} gainDb={-2} />
      <Sfx name="ui-click" at={T_COPY} />
      {dep.map((d) => (
        <Sfx key={`p${d.ch}`} name={pickSfx("deposit-ping", "ui-tick")} at={d.t0 + FLY} gainDb={-3} />
      ))}
      {dep.map((d) => (
        <Sfx key={`c${d.ch}`} name={pickSfx("count-up", "counter-roll")} at={d.t0 + FLY + CONFIRM} gainDb={-4} />
      ))}
    </AbsoluteFill>
  );
}
