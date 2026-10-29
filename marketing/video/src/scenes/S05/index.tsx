import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import { BRASS_GRADIENT, C, F, display } from "../../brand/tokens";
import { SatchelCard } from "../../components/SatchelCard";
import { Sfx } from "../../lib/Sfx";
import { getScene } from "../../lib/timeline";
import { EASE, s, SPRING, springAt, tween } from "../../lib/time";
import { AccountChip, BalanceChip, clamp, headline, MaskLine, PhotoSlip, plate, PSLIP } from "../S03/kit";

/**
 * S05 "The hole" (L08–L11), the villain beat.
 * L08  brass flood "But…" → a transaction slip writes and signs itself → it slides into the seller's pocket.
 * L09  hard cut: the sale (handshake flash, then the card hands over to the buyer and is sewn to them).
 *      Text: "Signed before the sale."
 * L10  staccato "Sign it." "Sell it." "Broadcast it later." → the slip slams back, broadcast to Bitcoin,
 *      the buyer's BTC rolls 0.0123 → 0.0000 in danger red. Text: "The coins are gone."
 * L11  everything falls away; one still question: "Is it clean?"
 */

export function s05Times() {
  const sc = getScene("S05");
  const w8 = (p: string) => sc.wordAt("L08", p);
  const w10 = (p: string, which: "start" | "end" = "start") => sc.wordAt("L10", p, which);
  const L09 = sc.line("L09");
  const L11 = sc.line("L11");
  const but = w8("But");
  const drain = Math.max(but + 0.75, w8("made"));
  const typeA = drain + 0.08;
  const typeB = typeA + 0.5;
  const scribA = Math.max(w8("before"), typeB - 0.15);
  const scribB = scribA + 0.45;
  const pocket = Math.max(scribB + 0.05, w8("sale"));
  const sale = Math.max(pocket + 0.8, L09.start);
  const saleShot = sale + 0.45;
  const handoff = saleShot + 0.12;
  const sew = handoff + 0.62;
  const sign = Math.max(sew + 0.8, w10("Sign") - 0.03);
  const sell = Math.max(sign + 0.6, w10("Sell") - 0.03);
  const bcast = Math.max(sell + 0.6, w10("Broadcast") - 0.03);
  const slam = Math.max(bcast + 0.85, w10("later", "end") + 0.05, w10("The") - 0.45);
  const lines = slam + 0.18;
  const node = lines + 0.3;
  const roll = node + 0.15;
  const gone = Math.max(roll + 0.6, w10("gone"));
  const coinsText = Math.max(slam + 0.3, w10("The"));
  const fall = Math.max(coinsText + 1.8, L11.start);
  const question = fall + 0.6;
  return { duration: sc.duration, but, drain, typeA, typeB, scribA, scribB, pocket, signedText: pocket + 0.2, sale, saleShot, handoff, sew, sign, sell, bcast, slam, lines, node, roll, gone, coinsText, fall, question };
}

type Times = ReturnType<typeof s05Times>;

const LEATHER_INK = C.onBrand; // #2b1d15

export function S05Visual() {
  const frame = useCurrentFrame();
  const T = s05Times();
  const t = frame / 30;
  // one shot at a time (hard cuts); each shot is a function of the scene frame
  let shot: ReactNode;
  if (t < T.drain + 0.32) shot = <BrassAndSlip T={T} />;
  else if (t < T.sale) shot = <SlipToPocket T={T} />;
  else if (t < T.saleShot) shot = <HandshakeFlash T={T} />;
  else if (t < T.sign) shot = <SaleShot T={T} />;
  else if (t < T.slam) shot = <Staccato T={T} />;
  else if (t < T.question) shot = <Broadcast T={T} />;
  else shot = <Question T={T} />;

  const signedTextOn = t >= T.signedText && t < T.sign;
  return (
    <AbsoluteFill style={{ background: C.ground }}>
      {shot}
      {signedTextOn ? (
        <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 0 104px 128px" }}>
          <MaskLine frame={frame} at={T.signedText} dur={0.5}>
            <div style={{ ...headline(124, C.ink, 760), textShadow: "0 4px 40px rgba(0,0,0,0.55)" }}>Signed before</div>
          </MaskLine>
          <MaskLine frame={frame} at={T.signedText + 0.08} dur={0.5}>
            <div style={{ ...headline(124, C.ink, 760), textShadow: "0 4px 40px rgba(0,0,0,0.55)" }}>the sale.</div>
          </MaskLine>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// L08 · brass flood "But…", then the slip writes itself

function HBlur({ id, amount }: { id: string; amount: number }) {
  return (
    <svg width={0} height={0} style={{ position: "absolute" }}>
      <filter id={id} x="-10%" y="0" width="120%" height="100%">
        <feGaussianBlur stdDeviation={`${amount.toFixed(1)} 0`} />
      </filter>
    </svg>
  );
}
function VBlur({ id, amount }: { id: string; amount: number }) {
  return (
    <svg width={0} height={0} style={{ position: "absolute" }}>
      <filter id={id} x="0" y="-10%" width="100%" height="120%">
        <feGaussianBlur stdDeviation={`0 ${amount.toFixed(1)}`} />
      </filter>
    </svg>
  );
}

function BrassAndSlip({ T }: { T: Times }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brassPlate = plate("brass-plate");
  const leather = plate("leather-ground");
  // a hard cut onto the dark desk with the brass already whipping in from the right (no dependency on the
  // previous scene's last frame): it covers the frame by `whipEnd`
  const whipEnd = Math.min(0.3, T.but - 0.05);
  const X0 = 0.62; // fraction of the frame still uncovered on frame 0
  const xIn = tween(frame, 0, whipEnd, X0, 0, EASE.expoOut);
  const vIn = Math.abs(tween(frame + 1, 0, whipEnd, X0, 0, EASE.expoOut) - xIn) * 1920; // forward difference: frame 0 is already moving
  // drain: the brass leaves upward, the slip rises from below
  const up = tween(frame, T.drain, T.drain + 0.3, 0, 1, EASE.expoIn);
  const vUp = Math.abs(tween(frame + 1, T.drain, T.drain + 0.3, 0, 1, EASE.expoIn) - up) * 1080;
  const butP = springAt(frame, fps, T.but - 0.03, SPRING.slam);
  return (
    <AbsoluteFill>
      {xIn > 0.001 ? (
        <AbsoluteFill style={{ transform: `translateX(${-(X0 - xIn) * 900}px)`, filter: vIn > 2 ? "url(#s05-hb-a)" : undefined }}>
          {leather ? <Img src={staticFile(leather)} style={{ position: "absolute", inset: 0, width: 1920, height: 1080, opacity: 0.5 }} /> : null}
          <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 70% at 40% 45%, rgba(23,16,12,0.1), rgba(23,16,12,0.9) 100%)" }} />
        </AbsoluteFill>
      ) : null}
      {frame >= s(T.drain) ? <SlipShotBody T={T} /> : null}
      <HBlur id="s05-hb-a" amount={Math.min(40, vIn * 0.25)} />
      <HBlur id="s05-hb-b" amount={Math.min(40, vIn * 0.3)} />
      <VBlur id="s05-vb" amount={Math.min(40, vUp * 0.3)} />
      {up < 1 ? (
        <AbsoluteFill
          style={{
            transform: `translate(${xIn * 1920}px, ${-up * 1080}px)`,
            filter: vIn > 2 ? "url(#s05-hb-b)" : vUp > 2 ? "url(#s05-vb)" : undefined,
            overflow: "hidden",
          }}
        >
          <AbsoluteFill style={{ background: BRASS_GRADIENT }} />
          {brassPlate ? <Img src={staticFile(brassPlate)} style={{ position: "absolute", inset: 0, width: 1920, height: 1080, opacity: 0.92 }} /> : null}
          <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 70% at 45% 45%, rgba(255,240,200,0.10), rgba(43,29,21,0.28) 100%)" }} />
          {frame >= s(T.but - 0.03) ? (
            <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
              <div
                style={{
                  ...display(800, 96, interpolate(butP, [0, 1], [75, 100], clamp)),
                  fontSize: 300,
                  letterSpacing: "-0.045em",
                  color: LEATHER_INK,
                  transform: `scale(${interpolate(butP, [0, 1], [1.25, 1])})`,
                  opacity: tween(frame, T.but - 0.03, T.but + 0.04, 0, 1, (x) => x),
                  lineHeight: 1,
                  paddingBottom: 30,
                }}
              >
                But…
              </div>
            </AbsoluteFill>
          ) : null}
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
}

const SLIP_SCALE = 0.9;
const SLIP_C = { x: 960, y: 520 };

/** The slip on the dark desk, writing and signing itself. */
function SlipShotBody({ T, flight = 0 }: { T: Times; flight?: number }) {
  const frame = useCurrentFrame();
  const rise = tween(frame, T.drain + 0.05, T.drain + 0.55, 0, 1, EASE.expoOut);
  const typed = tween(frame, T.typeA, T.typeB, 0, 1, (x) => x);
  const sign = tween(frame, T.scribA, T.scribB, 0, 1, EASE.standard);
  const leather = plate("leather-ground");
  // flight into the pocket (photo slip sits at ≈ (1350, 450), ~205 px wide, leaning right)
  const fx = SLIP_C.x + (1352 - SLIP_C.x) * flight;
  const fy = SLIP_C.y + 380 * (1 - rise) + (452 - SLIP_C.y) * flight;
  const sc = SLIP_SCALE + (0.3 - SLIP_SCALE) * flight;
  const rot = -3 + 2 * (1 - rise) + 14 * flight;
  return (
    <AbsoluteFill>
      {flight < 1 ? (
        <AbsoluteFill style={{ opacity: 1 - flight }}>
          {leather ? <Img src={staticFile(leather)} style={{ position: "absolute", inset: 0, width: 1920, height: 1080, opacity: 0.55 }} /> : null}
          <AbsoluteFill style={{ background: "radial-gradient(ellipse 60% 70% at 50% 45%, rgba(23,16,12,0.1), rgba(23,16,12,0.85) 100%)" }} />
        </AbsoluteFill>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: fx - PSLIP.w / 2,
          top: fy - PSLIP.h / 2,
          transform: `scale(${sc}) rotate(${rot}deg)`,
          opacity: flight > 0.82 ? 1 - (flight - 0.82) / 0.18 : 1,
        }}
      >
        <PhotoSlip typed={typed} sign={sign} />
      </div>
    </AbsoluteFill>
  );
}

function SlipToPocket({ T }: { T: Times }) {
  const frame = useCurrentFrame();
  const flight = tween(frame, T.pocket, T.pocket + 0.48, 0, 1, EASE.expoInOut);
  const pocketPlate = plate("pocket-slip");
  const plateIn = tween(frame, T.pocket + 0.05, T.pocket + 0.4, 0, 1, EASE.standard);
  const push = tween(frame, T.pocket, T.sale, 0, 1, EASE.standard);
  return (
    <AbsoluteFill>
      {pocketPlate ? (
        <AbsoluteFill style={{ opacity: plateIn, transform: `scale(${1.08 + 0.05 * push}) translateY(${10 * push}px)`, transformOrigin: "70% 45%" }}>
          <Img src={staticFile(pocketPlate)} style={{ position: "absolute", inset: 0, width: 1920, height: 1080, filter: "brightness(0.82)" }} />
          <AbsoluteFill style={{ background: "linear-gradient(to right, rgba(16,11,8,0.75) 0%, rgba(16,11,8,0.35) 40%, rgba(16,11,8,0) 60%)" }} />
        </AbsoluteFill>
      ) : (
        <CodePocket p={plateIn} />
      )}
      <SlipShotBody T={T} flight={flight} />
      {/* who keeps it */}
      <div style={{ position: "absolute", left: 128, top: 112, opacity: tween(frame, T.pocket + 0.3, T.pocket + 0.6, 0, 1, EASE.standard) }}>
        <AccountChip name="alice.near" size={40}>
          <span style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 30, color: C.inkMuted }}>Seller</span>
        </AccountChip>
      </div>
    </AbsoluteFill>
  );
}

/** Fallback pocket if the plate is missing: a dark jacket panel with a welt pocket. */
function CodePocket({ p }: { p: number }) {
  return (
    <AbsoluteFill style={{ opacity: p }}>
      <AbsoluteFill style={{ background: "linear-gradient(160deg, #2a1c13, #120c08)" }} />
      <div style={{ position: "absolute", left: 1150, top: 520, width: 420, height: 380, borderRadius: 18, background: "linear-gradient(180deg, #3a281c, #1d140e)", boxShadow: "0 -6px 0 #0b0705" }} />
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// L09 · the sale

function HandshakeFlash({ T }: { T: Times }) {
  const frame = useCurrentFrame();
  const hs = plate("handshake");
  const push = tween(frame, T.sale, T.saleShot, 0, 1, (x) => x);
  if (!hs) return <AbsoluteFill style={{ background: C.ground }} />;
  return (
    <AbsoluteFill style={{ transform: `scale(${1.12 + 0.06 * push})`, transformOrigin: "50% 45%" }}>
      <Img src={staticFile(hs)} style={{ position: "absolute", inset: 0, width: 1920, height: 1080, filter: "brightness(0.78)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(16,11,8,0.8) 0%, rgba(16,11,8,0) 45%)" }} />
    </AbsoluteFill>
  );
}

const SALE = { cardY: 300, cardW: 520, sellerX: 470, buyerX: 1450, chipY: 560 };

function SaleShot({ T }: { T: Times }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const leather = plate("leather-ground-2");
  const p = springAt(frame, fps, T.handoff, SPRING.handoff);
  const cx = SALE.sellerX + (SALE.buyerX - SALE.sellerX) * p;
  const lift = Math.sin(Math.min(1, p) * Math.PI);
  const tilt = 6 * lift;
  const unpick = 1 - tween(frame, T.handoff, T.handoff + 0.2, 0, 1, EASE.standard);
  const sewIn = tween(frame, T.sew, T.sew + 0.6, 0, 1, EASE.standard);
  const stitch = frame < s(T.sew) ? unpick : sewIn;
  const bought = frame >= s(T.sew + 0.6);
  const appear = tween(frame, T.saleShot, T.saleShot + 0.3, 0, 1, EASE.expoOut);
  const ch = SALE.cardW * (252 / 400);
  return (
    <AbsoluteFill>
      {leather ? <Img src={staticFile(leather)} style={{ position: "absolute", inset: 0, width: 1920, height: 1080, opacity: 0.32 }} /> : null}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 80% at 50% 35%, rgba(23,16,12,0.2), rgba(23,16,12,0.9) 100%)" }} />
      {/* seller and buyer */}
      <div style={{ position: "absolute", left: SALE.sellerX - 230 - PSLIP.w / 2 - 34, top: SALE.chipY + 34 - PSLIP.h / 2, transform: "scale(0.13) rotate(-12deg)", opacity: appear }}>
        <PhotoSlip />
      </div>
      <div style={{ position: "absolute", left: SALE.sellerX - 230, top: SALE.chipY, opacity: appear }}>
        <AccountChip name="alice.near" size={40}>
          <span style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 30, color: C.inkMuted }}>Seller · keeps the slip</span>
        </AccountChip>
      </div>
      <div style={{ position: "absolute", left: SALE.buyerX - 210, top: SALE.chipY, opacity: appear }}>
        <AccountChip name="bob.near" size={40} accent={bought ? C.success : undefined}>
          <span style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 30, color: C.inkMuted }}>Buyer</span>
        </AccountChip>
      </div>
      {/* the card hands over */}
      <div style={{ position: "absolute", inset: 0, perspective: 1600 }}>
        <div
          style={{
            position: "absolute",
            left: cx - SALE.cardW / 2,
            top: SALE.cardY - ch / 2 - 40 * lift + 30 * (1 - appear),
            transform: `rotateZ(${tilt}deg) scale(${1 + 0.05 * lift})`,
            opacity: appear,
          }}
        >
          <SatchelCard tokenId="1" width={SALE.cardW} status={bought ? "bought" : "active"} stitch={stitch} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// L10 · staccato, then the slip comes back

function Staccato({ T }: { T: Times }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const beats: { at: number; text: string; size: number }[] = [
    { at: T.sign, text: "Sign it.", size: 260 },
    { at: T.sell, text: "Sell it.", size: 260 },
    { at: T.bcast, text: "Broadcast it later.", size: 200 },
  ];
  const cur = [...beats].reverse().find((b) => t >= b.at) ?? beats[0];
  const idx = beats.indexOf(cur);
  const p = springAt(frame, fps, cur.at, SPRING.slam);
  const wdth = interpolate(p, [0, 1], [75, 100], clamp);
  const shake = noise2D(`stc${idx}`, (frame - s(cur.at)) * 0.4, 0) * 10 * Math.exp(-(frame - s(cur.at)) / 4);
  // the signature scribble under "Sign it."
  const scrib = idx === 0 ? tween(frame, T.sign + 0.08, T.sign + 0.45, 0, 1, EASE.standard) : 0;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translateX(${shake}px)` }}>
      <div
        style={{
          ...display(800, 96, wdth),
          fontSize: cur.size,
          letterSpacing: "-0.045em",
          color: C.ink,
          lineHeight: 1,
          whiteSpace: "nowrap",
          transform: `scale(${interpolate(p, [0, 1], [1.22, 1])})`,
          opacity: tween(frame, cur.at, cur.at + 0.07, 0, 1, (x) => x),
          paddingBottom: 24,
        }}
      >
        {cur.text}
      </div>
      {idx === 0 && scrib > 0 ? (
        <svg width={760} height={120} viewBox="0 0 760 120" style={{ position: "absolute", top: 640 }}>
          <path
            d="M20 80 C 60 30, 90 20, 100 50 C 110 80, 70 100, 90 98 C 120 95, 140 40, 160 50 C 180 60, 150 95, 180 92 C 220 88, 240 40, 270 52 C 300 64, 260 100, 300 96 C 360 90, 420 70, 520 74 C 600 77, 680 70, 740 62"
            fill="none"
            stroke={C.ink}
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={2000}
            strokeDashoffset={2000 * (1 - scrib)}
            opacity={0.85}
          />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
}

const BC = { slipX: 330, slipY: 470, slipScale: 0.6, nodeX: 905, nodeY: 430, cardX: 1440, cardY: 400, cardW: 600 };

function Broadcast({ T }: { T: Times }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slamP = springAt(frame, fps, T.slam, SPRING.slam);
  const slamScale = interpolate(slamP, [0, 1], [1.9, 1]);
  const hitT = (frame - s(T.slam + 0.12)) / fps;
  const shakeAmp = hitT > 0 ? 14 * Math.exp(-hitT * 9) : 0;
  const camShake = { x: noise2D("bc-x", frame * 0.4, 0) * shakeAmp, y: noise2D("bc-y", 0, frame * 0.4) * shakeAmp };
  const lineP = tween(frame, T.lines, T.node, 0, 1, EASE.expoIn);
  const nodeP = springAt(frame, fps, T.node, SPRING.snap);
  const toCard = tween(frame, T.node + 0.05, T.roll + 0.1, 0, 1, EASE.expoOut);
  const roll = tween(frame, T.roll, T.gone, 0, 1, (x) => x);
  const landed = frame >= s(T.gone);
  const cardIn = springAt(frame, fps, T.slam + 0.05, SPRING.snap);
  // everything falls away (gravity: cubic-in), staggered, fading as it drops
  const fallIn = Easing.in(Easing.cubic);
  const fall = tween(frame, T.fall + 0.22, T.fall + 0.62, 0, 1, EASE.standard);
  const fallY = (i: number) => tween(frame, T.fall + i * 0.04, T.fall + 0.55 + i * 0.04, 0, 1, fallIn);
  const ch = BC.cardW * (252 / 400);
  const split = landed && frame < s(T.gone) + 3;
  const dx = split ? (random(`bc-split-${frame}`) - 0.5) * 22 : 0;

  // broadcast lines from the slip's right edge to the node
  const sx = BC.slipX + PSLIP.w * BC.slipScale * 0.5 - 10;
  const lineYs = [-90, -45, 0, 45, 90];

  return (
    <AbsoluteFill style={{ transform: `translate(${camShake.x}px, ${camShake.y}px)` }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(43,29,21,0.35), rgba(23,16,12,0) 100%)", opacity: 1 - fall }} />
      {/* lines */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: 1 - fall }}>
        {lineYs.map((dy, i) => {
          const x1 = sx;
          const y1 = BC.slipY + dy * 0.9;
          const x2 = BC.nodeX - 64;
          const y2 = BC.nodeY + dy * 0.25;
          const head = Math.max(0, Math.min(1, lineP * 1.15 - i * 0.03));
          if (head <= 0) return null;
          const tail = Math.max(0, head - 0.55);
          return (
            <line
              key={i}
              x1={x1 + (x2 - x1) * tail}
              y1={y1 + (y2 - y1) * tail}
              x2={x1 + (x2 - x1) * head}
              y2={y1 + (y2 - y1) * head}
              stroke={C.ink}
              strokeOpacity={0.75}
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })}
        {toCard > 0 ? (
          <line
            x1={BC.nodeX + 64}
            y1={BC.nodeY}
            x2={BC.nodeX + 64 + (BC.cardX - BC.cardW / 2 - 24 - BC.nodeX - 64) * toCard}
            y2={BC.nodeY + (BC.cardY + 40 - BC.nodeY) * toCard}
            stroke={C.danger}
            strokeWidth={4}
            strokeDasharray="2 12"
            strokeLinecap="round"
          />
        ) : null}
        {/* node rings */}
        {[0, 0.2].map((d) => {
          const rt = (frame - s(T.node + d)) / fps;
          if (rt < 0 || rt > 0.8) return null;
          return <circle key={d} cx={BC.nodeX} cy={BC.nodeY} r={60 + rt * 140} fill="none" stroke={C.btc} strokeOpacity={0.6 * (1 - rt / 0.8)} strokeWidth={3} />;
        })}
      </svg>

      {/* Bitcoin */}
      <div
        style={{
          position: "absolute",
          left: BC.nodeX - 240,
          top: BC.nodeY - 58,
          width: 480,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
          opacity: Math.min(1, nodeP * 2) * (1 - fall),
          transform: `translateY(${fallY(1) * 600}px) scale(${0.8 + 0.2 * nodeP})`,
        }}
      >
        <div style={{ width: 116, height: 116, borderRadius: 999, border: `3px solid ${C.btc}`, background: C.surface, display: "grid", placeItems: "center" }}>
          <div style={{ width: 34, height: 34, borderRadius: 99, background: C.btc }} />
        </div>
        <div style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 40, color: C.ink, whiteSpace: "nowrap" }}>Bitcoin</div>
      </div>

      {/* the slip slams back */}
      <div
        style={{
          position: "absolute",
          left: BC.slipX - PSLIP.w / 2,
          top: BC.slipY - PSLIP.h / 2,
          transform: `translateY(${fallY(0) * 760}px) scale(${BC.slipScale * slamScale}) rotate(${-5 + 4 * (1 - slamP) + 10 * fallY(0)}deg)`,
          opacity: 1 - fall,
        }}
      >
        <PhotoSlip />
      </div>

      {/* the buyer's card */}
      <div
        style={{
          position: "absolute",
          left: BC.cardX - BC.cardW / 2,
          top: BC.cardY - ch / 2 - 60,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 26,
          opacity: cardIn * (1 - fall),
          transform: `translateY(${(1 - cardIn) * 60 + fallY(2) * 700}px)`,
        }}
      >
        <div style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 34, color: C.inkMuted, whiteSpace: "nowrap" }}>
          Buyer{"\u00a0·\u00a0"}<span style={{ fontFamily: F.mono, fontWeight: 500, color: C.ink }}>bob.near</span>
        </div>
        <SatchelCard tokenId="1" width={BC.cardW} status={landed ? "needs_attention" : "bought"} stitch={1} chips={[{ chain: "btc", amount: landed ? "0.0000" : "0.0123" }, { chain: "evm", amount: "0.0500" }, { chain: "sol", amount: "1.2500" }]} />
        <div style={{ position: "relative" }}>
          {split ? <BalanceChip roll={roll} size={68} color={C.frozen} style={{ position: "absolute", left: dx, top: 0, opacity: 0.6, mixBlendMode: "screen" }} /> : null}
          <BalanceChip roll={roll} size={68} color={landed ? C.danger : C.ink} style={landed ? { boxShadow: `0 0 0 3px ${C.danger}` } : undefined} />
        </div>
      </div>

      {/* the claim */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 92, opacity: 1 - fall, transform: `translateY(${fallY(3) * 400}px)` }}>
        <MaskLine frame={frame} at={T.coinsText} dur={0.5}>
          <div style={headline(132, C.ink, 760)}>The coins are gone.</div>
        </MaskLine>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// L11 · the question

function Question({ T }: { T: Times }) {
  const frame = useCurrentFrame();
  const p = tween(frame, T.question, T.question + 1.0, 0, 1, EASE.quintOut);
  const drift = tween(frame, T.question, T.duration, 0, 1, EASE.standard);
  const style: CSSProperties = {
    ...display(Math.round(interpolate(p, [0, 1], [800, 720])), 96, 100),
    fontSize: 230,
    letterSpacing: `${interpolate(p, [0, 1], [-0.07, -0.04])}em`,
    color: C.ink,
    lineHeight: 1,
    whiteSpace: "nowrap",
    opacity: p,
    transform: `translateY(${(1 - p) * 40}px) scale(${1 + 0.025 * drift})`,
    paddingBottom: 30,
  };
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={style}>Is it clean?</div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------------------------------------------

export function S05Sound() {
  const T = s05Times();
  return (
    <>
      <Sfx name="whip-pan" at={0.12} align="peak" gainDb={-2} />
      <Sfx name="impact-brass" at={T.but} gainDb={0} />
      <Sfx name="whoosh-fast" at={T.drain + 0.2} align="peak" gainDb={-4} />
      <Sfx name="type-tick-run" at={T.typeA} gainDb={-3} />
      <Sfx name="swish-short" at={T.scribA + 0.1} gainDb={-8} />
      <Sfx name="pocket-slip" at={T.pocket + 0.36} align="peak" gainDb={0} />
      <Sfx name="impact-soft" at={T.sale} gainDb={-2} />
      <Sfx name="leather-creak" at={T.handoff} gainDb={-4} />
      <Sfx name="stitch-run" at={T.sew} gainDb={-4} />
      <Sfx name="impact-soft" at={T.sign} gainDb={0} />
      <Sfx name="impact-soft" at={T.sell} gainDb={0} />
      <Sfx name="impact-soft" at={T.bcast} gainDb={0} />
      <Sfx name="impact-deep" at={T.slam + 0.12} gainDb={-2} />
      <Sfx name="whoosh-fast" at={T.node} align="peak" gainDb={-5} />
      <Sfx name="heartbeat-tension" at={T.node} gainDb={-4} />
      <Sfx name="counter-roll" at={T.roll} gainDb={0} />
      <Sfx name="glitch-short" at={T.gone} gainDb={-4} />
      <Sfx name="sub-drop" at={T.gone} align="peak" gainDb={-2} />
      <Sfx name="downlifter" at={T.fall} gainDb={-6} />
    </>
  );
}

export default function S05() {
  return (
    <>
      <S05Visual />
      <S05Sound />
    </>
  );
}
