import type { ReactNode } from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { noise2D } from "@remotion/noise";
import { C, CHAIN, display } from "../../brand/tokens";
import { SatchelCard } from "../../components/SatchelCard";
import images from "../../data/images.json";
import sfx from "../../data/sfx.json";
import { Sfx } from "../../lib/Sfx";
import { EASE, FPS, SPRING, springAt, tween } from "../../lib/time";
import { w3Timing, type W3T } from "./timing";
import { mixHex } from "./ui";
import {
  AMOUNT_H,
  AMOUNT_W,
  AmountGroup,
  HEADER_H,
  KP,
  PAD,
  PW,
  RECEIPTS,
  ROW_H,
  ReceiptRow,
  ReviewAction,
  ReviewBody,
  SEND,
  SHEET_W,
  ShellHeader,
  TrackerBody,
  WalletSheet,
} from "./ui";

/**
 * W3 — Spend (L22 "Then spend it like any wallet." + L23 "Approve in your NEAR wallet, and NEAR Chain Signatures signs
 * a native Bitcoin, Ethereum or Solana transaction.").
 * A: from W2's funded Satchel #8 the camera dives into its BTC chip; "0.0100 BTC" slams in, flies into the Review
 *    sheet, the OutcomeCard builds (From −0.01000282 BTC · To +0.0100 BTC, full grouped address, fee), the brass
 *    "Send 0.0100 BTC" is pressed. Caption: "Spend it like any wallet."
 * B: a NEUTRAL "Your NEAR wallet" sheet: "Approve request to satchel.satchelhq.near", Approve.
 * C: the SigningProgress tracker: Approved ✓ → Signing with NEAR's signer network (pulsing frozen dot, m:ss timer,
 *    jump-cut 0:02 → 0:06) → Signed ✓ → Broadcast to Bitcoin ✓ → "Sent 0.0100 BTC" · In mempool.
 *    Caption: "Signed by NEAR Chain Signatures."
 * D: on "Bitcoin, Ethereum or Solana" three "Sent" receipts slam in (BTC, ETH, SOL). Caption: "Spend on any chain."
 */

const PANEL_X = 1330 - PW / 2; // the Send sheet's left edge (screen px)
const HERO_S = 2.35; // hero scale of the amount group
const HERO_X = 960 - (AMOUNT_W * HERO_S) / 2;
const HERO_Y = 540 - (AMOUNT_H * HERO_S) / 2;
const SFX = sfx as Record<string, unknown>;
const pick = (...names: string[]) => names.find((n) => n in SFX) ?? names[names.length - 1];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function plate(name: string): string | null {
  const e = (images as Record<string, { file?: string } | undefined>)[name];
  return e?.file ?? null;
}

export default function W3() {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const T = w3Timing();
  return (
    <AbsoluteFill style={{ background: C.ground, overflow: "hidden" }}>
      <Backdrop frame={frame} />
      {t < T.cut ? <CardDive T={T} frame={frame} /> : <Product T={T} frame={frame} t={t} />}
      <Captions T={T} frame={frame} />
      <Sounds T={T} />
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------------------------------------------

function Backdrop({ frame }: { frame: number }) {
  const leather = plate("leather-ground");
  const dx = noise2D("w3-bg-x", frame * 0.006, 0) * 10;
  return (
    <AbsoluteFill style={{ transform: `translateX(${dx}px) scale(1.06)` }}>
      {leather ? <Img src={staticFile(leather)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.3, mixBlendMode: "luminosity" }} /> : null}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 60% 55% at 22% 18%, rgba(106,71,48,0.32), rgba(23,16,12,0) 72%)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 50% 60% at 70% 55%, rgba(67,44,31,0.22), rgba(23,16,12,0) 75%)" }} />
    </AbsoluteFill>
  );
}

/** W2 ends on Satchel #8's funded card: the camera dives into its BTC chip. */
function CardDive({ T, frame }: { T: W3T; frame: number }) {
  const CWD = 760;
  const k = CWD / 400;
  const p = tween(frame, T.pushStart, T.cut, 0, 1, EASE.expoIn);
  const scale = 1 + 3.2 * p;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: `${64 * k}px ${219 * k}px`, filter: p > 0.02 ? `blur(${(p * 14).toFixed(1)}px)` : undefined }}>
        <SatchelCard
          tokenId={SEND.id}
          width={CWD}
          status="active"
          body="#251709"
          stitch={1}
          chips={[
            { chain: "btc", amount: "0.0123" },
            { chain: "evm", amount: "0.0500" },
            { chain: "sol", amount: "1.25" },
          ]}
        />
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------------------------------------------

function Product({ T, frame, t }: { T: W3T; frame: number; t: number }) {
  // gentle hand-held drift on the product side (never on the captions)
  const dx = noise2D("w3-cam-x", frame * 0.01, 0) * 4;
  const dy = noise2D("w3-cam-y", 0, frame * 0.01) * 3;

  // ---- review sheet: appears around the flying amount, then scrolls up as it builds
  const sheetP = tween(frame, T.fly + 0.04, T.fly + 0.4, 0, 1, EASE.expoOut);
  const reviewTop = lerp(110, -22, tween(frame, T.fly, T.press - 0.05, 0, 1, EASE.standard));
  const dim = tween(frame, T.sheetIn, T.sheetIn + 0.25, 0, 1, EASE.standard) * (1 - tween(frame, T.sheetOut, T.sheetOut + 0.2, 0, 1));

  // ---- the amount: slam (hero) → fly into its slot
  const slam = springAt(frame, FPS, T.cut, SPRING.slam);
  const flyP = tween(frame, T.fly, T.flyEnd, 0, 1, EASE.expoInOut);
  const slotX = PANEL_X + PAD;
  const slotY = reviewTop + HEADER_H + PAD;
  const ax = lerp(HERO_X, slotX, flyP);
  const ay = lerp(HERO_Y, slotY, flyP);
  const as = lerp(HERO_S * (1.16 - 0.16 * Math.min(1.2, slam)), 1, flyP);
  const aBlur = Math.max(0, 1 - slam) * 10;
  const handedOver = t >= T.flyEnd;

  // ---- review reveals
  const from = tween(frame, T.fromRow, T.fromRow + 0.3, 0, 1, EASE.expoOut);
  const to = tween(frame, T.toRow, T.toRow + 0.3, 0, 1, EASE.expoOut);
  const addrShown = Math.floor(tween(frame, T.addr, T.addrEnd, 0, 11.99, (x) => x));
  const check = tween(frame, T.check, T.check + 0.25, 0, 1, EASE.expoOut);
  const fee = tween(frame, T.feeRow, T.feeRow + 0.3, 0, 1, EASE.expoOut);
  const action = tween(frame, T.action, T.action + 0.3, 0, 1, EASE.expoOut);
  const sheen = tween(frame, T.sheen, T.sheen + 0.5, 0, 1, EASE.standard);
  const press = tween(frame, T.press - 0.05, T.press, 0, 1) * (1 - 0.6 * tween(frame, T.press + 0.08, T.press + 0.25, 0, 1));
  const ctaLabel = t >= T.ctaWallet ? "Approve in your wallet…" : `Send ${SEND.amount}`;

  // ---- the wallet sheet
  const sheetIn = tween(frame, T.sheetIn, T.sheetIn + 0.38, 0, 1, EASE.expoOut);
  const sheetOut = tween(frame, T.sheetOut, T.sheetOut + 0.12, 0, 1, EASE.expoIn);
  const sheetPush = 1 + 0.03 * tween(frame, T.sheetIn + 0.3, T.sheetOut, 0, 1, EASE.standard);
  const apPress = tween(frame, T.approvePress - 0.05, T.approvePress, 0, 1) * (1 - 0.7 * tween(frame, T.approvePress + 0.06, T.approvePress + 0.22, 0, 1));
  const approved = tween(frame, T.approved, T.approved + 0.16, 0, 1, EASE.expoOut);

  // ---- tracker
  const trackIn = tween(frame, T.trackerIn, T.trackerIn + 0.3, 0, 1, EASE.expoOut);
  const trackOut = tween(frame, T.btc - 0.08, T.btc + 0.02, 0, 1, EASE.expoIn);
  const sent = t >= T.sent;
  const signState = t < T.signed ? "active" : "done";
  const bcState = t < T.bcActive ? "future" : t < T.sent ? "active" : "done";
  const secs = t < T.jumpCut ? Math.min(2, Math.floor((t - T.trackerIn) * 3.2)) : 6 + Math.min(1, Math.floor((t - T.jumpCut) / 0.5));
  const timer = `0:${String(Math.max(0, secs)).padStart(2, "0")}`;
  const pulse = 0.7 + 0.3 * Math.cos((2 * Math.PI * (t - T.trackerIn)) / 1.6);
  const creditLit = tween(frame, T.sigAt - 0.3, T.sigAt + 0.1, 0, 1, EASE.standard);
  const headingRoll = tween(frame, T.sent, T.sent + 0.22, 0, 1, EASE.expoOut);
  const progress = lerp(2 / 3, 1, tween(frame, T.trackerIn + 0.1, T.trackerIn + 0.45, 0, 1, EASE.standard));
  // camera on the tracker: a slow push toward the signing row, a jump cut tighter, then back out on "Sent"
  const push = t < T.jumpCut ? 1 + 0.05 * tween(frame, T.trackerIn + 0.2, T.jumpCut, 0, 1, EASE.standard) : 1.11 - 0.11 * tween(frame, T.signed, T.sent + 0.3, 0, 1, EASE.expoOut);

  return (
    <AbsoluteFill style={{ transform: `translate(${dx}px, ${dy}px)` }}>
      {/* ---------------- Review sheet ---------------- */}
      {t < T.trackerIn ? (
        <div
          style={{
            position: "absolute",
            left: PANEL_X,
            top: reviewTop,
            width: PW,
            borderRadius: 22 * KP,
            background: C.surface,
            boxShadow: `0 ${16 * KP}px ${48 * KP}px rgba(0,0,0,0.55), inset 0 0 0 1.5px ${C.line}`,
            overflow: "hidden",
            opacity: sheetP,
            transform: `translateY(${(1 - sheetP) * 40}px) scale(${(0.97 + 0.03 * sheetP) * (1 - 0.035 * dim)})`,
            transformOrigin: "50% 30%",
            filter: dim > 0.01 ? `brightness(${1 - 0.55 * dim}) blur(${(dim * 2.5).toFixed(1)}px)` : undefined,
          }}
        >
          <div style={{ position: "relative", height: HEADER_H }}>
            <ShellHeader title="Review send" step="2 of 3" progress={2 / 3} icon="close" />
          </div>
          <ReviewBody amountVisible={handedOver} from={from} to={to} addrShown={addrShown} check={check} fee={fee} />
          <ReviewAction show={action} press={press} sheen={sheen} label={<span>{ctaLabel}</span>} />
        </div>
      ) : null}

      {/* the amount, flying from the hero into its slot (handed to the sheet once it lands) */}
      {!handedOver ? (
        <div style={{ position: "absolute", left: 0, top: 0, transform: `translate(${ax}px, ${ay}px) scale(${as})`, transformOrigin: "0 0", filter: aBlur > 0.2 ? `blur(${aBlur.toFixed(1)}px)` : undefined }}>
          <AmountGroup />
        </div>
      ) : null}

      {/* ---------------- Wallet approval sheet ---------------- */}
      {t >= T.sheetIn && t < T.sheetOut + 0.14 ? (
        <div
          style={{
            position: "absolute",
            left: 1330 - SHEET_W / 2,
            bottom: 40,
            transform: `translateY(${(1 - sheetIn) * 760}px) scale(${sheetPush * (1 - 0.06 * sheetOut)})`,
            transformOrigin: "50% 70%",
            opacity: 1 - sheetOut,
          }}
        >
          <WalletSheet press={apPress} approved={approved} />
        </div>
      ) : null}

      {/* the owner's pointer: to the brass CTA (click), then to the wallet's Approve (click) */}
      {t >= T.press - 0.6 && t < T.trackerIn ? <Pointer T={T} frame={frame} t={t} /> : null}

      {/* ---------------- Tracker ---------------- */}
      {t >= T.trackerIn && t < T.btc + 0.02 ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingLeft: PANEL_X * 2 + PW - 1920 }}>
          <div style={{ transform: `translate(${-trackOut * 70}px, 0) scale(${1.06 * push})`, transformOrigin: "50% 50%" }}>
            <div
              style={{
                position: "relative",
                width: PW,
                borderRadius: 22 * KP,
                background: C.surface,
                boxShadow: `0 ${16 * KP}px ${48 * KP}px rgba(0,0,0,0.55), inset 0 0 0 1.5px ${C.line}`,
                overflow: "hidden",
                opacity: Math.min(1, trackIn * 4) * (1 - trackOut),
                transform: `translateY(${(1 - trackIn) * 28}px) scale(${1.04 - 0.04 * trackIn})`,
              }}
            >
              <div style={{ position: "relative", height: HEADER_H }}>
                <ShellHeader title={`Send ${SEND.network}`} step="3 of 3" progress={progress} icon={sent ? "close" : "minimize"} />
              </div>
              <TrackerBody
                sent={sent}
                heading={<HeadingRoll p={headingRoll} from={`Sending ${SEND.amount}`} to={`Sent ${SEND.amount}`} />}
                timer={timer}
                pulse={pulse}
                signState={signState}
                bcState={bcState}
                confirmActive={sent}
                creditLit={creditLit}
              />
            </div>
          </div>
        </AbsoluteFill>
      ) : null}

      {/* ---------------- Three receipts ---------------- */}
      {t >= T.btc - 0.06 ? <Receipts T={T} frame={frame} /> : null}
    </AbsoluteFill>
  );
}

const CTA_AT = { x: 1505, y: 918 };
const APPROVE_AT = { x: 1615, y: 962 };

function Pointer({ T, frame, t }: { T: W3T; frame: number; t: number }) {
  const c1 = tween(frame, T.press - 0.6, T.press - 0.07, 0, 1, EASE.expoOut);
  const c2 = tween(frame, T.sheetIn + 0.4, T.approvePress - 0.07, 0, 1, EASE.expoOut);
  const x = t < T.sheetIn + 0.4 ? lerp(1720, CTA_AT.x, c1) : lerp(CTA_AT.x, APPROVE_AT.x, c2);
  const y = t < T.sheetIn + 0.4 ? lerp(1130, CTA_AT.y, c1) : lerp(CTA_AT.y, APPROVE_AT.y, c2);
  const click = (at: number) => tween(frame, at - 0.05, at, 0, 1) * (1 - tween(frame, at + 0.05, at + 0.2, 0, 1));
  const press = Math.max(click(T.press), click(T.approvePress));
  const opacity = tween(frame, T.press - 0.6, T.press - 0.45, 0, 1) * (1 - tween(frame, T.sheetOut, T.sheetOut + 0.1, 0, 1));
  return (
    <svg width={64} height={64} viewBox="0 0 24 24" style={{ position: "absolute", left: x - 4 * (64 / 24), top: y - 3 * (64 / 24), opacity, transform: `scale(${1 - 0.12 * press})`, transformOrigin: "10% 8%", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.5))" }}>
      <path d="M4 3 L4 19 L8.6 14.9 L11.6 21.2 L14.4 19.9 L11.5 13.7 L17.6 13.4 Z" fill={C.ink} stroke={C.ground} strokeWidth={1.2} strokeLinejoin="round" />
    </svg>
  );
}

function HeadingRoll({ p, from, to }: { p: number; from: string; to: string }) {
  if (p <= 0) return <span>{from}</span>;
  return (
    <span style={{ display: "inline-grid", overflow: "hidden", verticalAlign: "bottom" }}>
      <span style={{ gridArea: "1 / 1", transform: `translateY(${-110 * p}%)`, opacity: 1 - p }}>{from}</span>
      <span style={{ gridArea: "1 / 1", transform: `translateY(${110 * (1 - p)}%)` }}>{to}</span>
    </span>
  );
}

function Receipts({ T, frame }: { T: W3T; frame: number }) {
  const times = [T.btc, T.eth, T.sol];
  const GAP = 26;
  const total = ROW_H * 3 + GAP * 2;
  const top0 = 540 - total / 2;
  const hold = 1.08 + 0.02 * tween(frame, T.sol + 0.3, T.D, 0, 1, EASE.standard);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${hold})`, transformOrigin: `${PANEL_X + PW / 2}px 540px` }}>
      {RECEIPTS.map((r, i) => {
        const at = times[i];
        if (frame / FPS < at - 0.06) return null;
        const sp = springAt(frame, FPS, at - 0.05, SPRING.slam);
        const markIn = tween(frame, at + 0.03, at + 0.25, 0, 1, EASE.expoOut);
        const checkIn = tween(frame, at + 0.14, at + 0.36, 0, 1, EASE.expoOut);
        const settle = Math.min(1, sp);
        // each send lands with a brief chain-colour edge (the "flash"), settling to the product's line colour
        const edge = mixHex(CHAIN[r.chain].color, C.line, tween(frame, at + 0.05, at + 0.5, 0, 1, EASE.standard));
        return (
          <div
            key={r.chain}
            style={{
              position: "absolute",
              left: PANEL_X,
              top: top0 + i * (ROW_H + GAP),
              width: PW,
              height: ROW_H,
              borderRadius: 30,
              background: C.surface,
              boxShadow: `0 24px 60px rgba(0,0,0,0.5), inset 0 0 0 2px ${edge}`,
              opacity: Math.min(1, sp * 1.8),
              transform: `translateX(${(1 - settle) * 90}px) scale(${1.07 - 0.07 * sp})`,
              overflow: "hidden",
            }}
          >
            <ReceiptRow chain={r.chain} amount={r.amount} to={r.to} markIn={markIn} checkIn={checkIn} />
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Captions (left rail): still while read; masked line reveals; leave upward.

const CAP_X = 120;

function Caption({ frame, at, out, lines, size = 104 }: { frame: number; at: number; out?: number; lines: ReactNode[]; size?: number }) {
  const t = frame / FPS;
  if (t < at || (out !== undefined && t > out + 0.3)) return null;
  const lh = size * 1.04;
  const h = lines.length * lh;
  return (
    <div style={{ position: "absolute", left: CAP_X, top: 540 - h / 2 - 10, ...display(720, 96, 100), fontSize: size, lineHeight: `${lh}px`, letterSpacing: "-0.035em", color: C.ink, whiteSpace: "nowrap" }}>
      {lines.map((line, i) => {
        const inP = tween(frame, at + i * 0.07, at + i * 0.07 + 0.5, 0, 1, EASE.expoOut);
        const outP = out === undefined ? 0 : tween(frame, out + i * 0.04, out + i * 0.04 + 0.24, 0, 1, EASE.expoIn);
        return (
          <div key={i} style={{ overflow: "hidden", padding: "0.04em 0.06em 0.16em", margin: "-0.04em -0.06em -0.16em" }}>
            <div style={{ transform: `translateY(${(1 - inP) * 112 - outP * 112}%)` }}>{line}</div>
          </div>
        );
      })}
    </div>
  );
}

function Captions({ T, frame }: { T: W3T; frame: number }) {
  return (
    <>
      <Caption frame={frame} at={T.cap1} out={T.cap1Out} lines={["Spend it like", "any wallet."]} />
      <Caption frame={frame} at={T.cap2} out={T.cap2Out} lines={["Signed by", "NEAR Chain", "Signatures."]} />
      <Caption frame={frame} at={T.cap3} lines={["Spend on", "any chain."]} />
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------------

function Sounds({ T }: { T: W3T }) {
  const flick = pick("card-flick", "impact-soft");
  return (
    <>
      <Sfx name="whoosh-fast" at={T.cut} align="peak" gainDb={-6} />
      <Sfx name="impact-soft" at={T.cut + 0.03} gainDb={-10} />
      <Sfx name="swish-short" at={T.fly + 0.25} align="peak" gainDb={-12} />
      <Sfx name="type-tick-run" at={T.addr} rate={1.5} gainDb={-16} />
      <Sfx name="ui-click" at={T.press} gainDb={-4} />
      <Sfx name={pick("card-flick", "swish-short")} at={T.sheetIn + 0.12} align="peak" gainDb={-8} />
      <Sfx name="ui-click" at={T.approvePress} gainDb={-4} />
      <Sfx name={pick("approve-chime", "ui-tick")} at={T.approved} gainDb={0} />
      <Sfx name="whoosh-fast" at={T.trackerIn} align="peak" gainDb={-10} />
      <Sfx name="ui-tick" at={T.trackerIn + 1 / 3.2} gainDb={-16} />
      <Sfx name="ui-tick" at={T.trackerIn + 2 / 3.2} gainDb={-16} />
      <Sfx name="ui-tick" at={T.signed} gainDb={-8} />
      <Sfx name={pick("deposit-ping", "ui-tick")} at={T.sent} gainDb={-6} />
      <Sfx name={flick} at={T.btc + 0.04} align="peak" gainDb={-6} />
      <Sfx name={flick} at={T.eth + 0.04} align="peak" gainDb={-6} />
      <Sfx name={flick} at={T.sol + 0.04} align="peak" gainDb={-6} />
    </>
  );
}
