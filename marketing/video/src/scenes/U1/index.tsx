import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C } from "../../brand/tokens";
import { Sfx } from "../../lib/Sfx";
import { EASE, s, tween, W } from "../../lib/time";
import { Gift } from "./Gift";
import { HBlur } from "./kit";
import { Sell, sellCross } from "./Sell";
import { u1Times } from "./timing";
import { Treasury } from "./Treasury";
import { Triptych } from "./Triptych";

export { u1Times } from "./timing";

/**
 * U1 "Who it's for" (L24–L26): three photographic vignettes, each with one product move, then a triptych.
 *   V1 "Sell a position." → "One trade."  Satchel #7 (0.40 BTC · 2.00 ETH) and "Buy for 25,000.00 USDC" swap
 *      places in one move: the NFT goes to the buyer, the seller is paid.
 *   V2 "Gift a wallet."  "sam.near" is inked on the gift tag; the funded Satchel #12 lands in sam's slot and the
 *      ownership stitch sews itself around it.
 *   V3 "Hand over a treasury."  A heavier "Team treasury" card lands at ops-lead.near; the stitch sews.
 *   Triptych: "Sell." "Gift." "Hand over." land on three consecutive half-beats and hold into S05's "But…".
 * Each vignette opens on the photo, then racks focus to the product UI. The vignettes are cut on the beat where each
 * line starts (whip pans across a continuous strip: the cut is the fastest frame). Everything re-times from the VO.
 */

const WHIP_F = 8; // frames for the whole whip; its midpoint (the cut) sits on the beat

function whipP(frame: number, cutFrame: number) {
  const u = (frame - (cutFrame - WHIP_F / 2)) / WHIP_F;
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  return EASE.whip(u);
}

function Layer({
  id,
  x,
  blur,
  scale = 1,
  extraBlur = 0,
  children,
}: {
  id: string;
  x: number;
  blur: number;
  scale?: number;
  extraBlur?: number;
  children: ReactNode;
}) {
  const filters = [blur > 0.6 ? `url(#${id})` : "", extraBlur > 0.2 ? `blur(${extraBlur.toFixed(2)}px)` : ""].filter(Boolean).join(" ");
  return (
    <AbsoluteFill style={{ transform: `translateX(${x.toFixed(1)}px) scale(${scale})`, filter: filters || undefined, overflow: "hidden" }}>
      <HBlur id={id} amount={blur} />
      {children}
    </AbsoluteFill>
  );
}

export function U1Visual() {
  const f = useCurrentFrame();
  const T = u1Times();
  const c2 = s(T.cut2);
  const c3 = s(T.cut3);
  const half = WHIP_F / 2;

  // strip positions (the camera whips right: content moves left)
  const x1 = (fr: number) => -whipP(fr, c2) * W;
  const x2 = (fr: number) => (1 - whipP(fr, c2)) * W - whipP(fr, c3) * W;
  const x3 = (fr: number) => (1 - whipP(fr, c3)) * W;
  const smear = (x: (fr: number) => number) => Math.min(70, (Math.abs(x(f + 1) - x(f - 1)) / 2) * 0.09);

  // the cut in from S02: a punch-in on the downbeat
  const punch = tween(f, 0, 0.36, 0, 1, EASE.expoOut);

  return (
    <AbsoluteFill style={{ background: C.ground }}>
      {f < c2 + half ? (
        <Layer id="u1-w1" x={x1(f)} blur={smear(x1)} scale={1.07 - 0.07 * punch} extraBlur={(1 - tween(f, 0, 0.14, 0, 1, (t) => t)) * 5}>
          <Sell T={T} />
        </Layer>
      ) : null}
      {f >= c2 - half && f < c3 + half ? (
        <Layer id="u1-w2" x={x2(f)} blur={smear(x2)}>
          <Gift T={T} />
        </Layer>
      ) : null}
      {f >= c3 - half ? (
        <Layer id="u1-w3" x={x3(f)} blur={smear(x3)}>
          <Treasury T={T} />
        </Layer>
      ) : null}
      {f >= s(T.trip) - 8 ? <Triptych T={T} /> : null}
    </AbsoluteFill>
  );
}

export function U1Sound() {
  const T = u1Times();
  const { v1, v2, v3 } = T;
  return (
    <>
      {/* V1 */}
      <Sfx name="whoosh-fast" at={0.04} align="peak" gainDb={-7} />
      <Sfx name="card-flick" at={v1.cardLand} align="peak" gainDb={-4} />
      <Sfx name="whoosh-fast" at={sellCross(T)} align="peak" gainDb={-6} />
      <Sfx name="impact-soft" at={v1.land} gainDb={-5} />
      <Sfx name="deposit-ping" at={v1.land + 0.03} gainDb={-9} />
      {/* V2 */}
      <Sfx name="whip-pan" at={T.cut2} align="peak" gainDb={-4} />
      <Sfx name="leather-creak" at={v2.cardIn} gainDb={-5} />
      <Sfx name="stitch-run" at={v2.sew} rate={1.2} gainDb={-1} />
      {/* V3 */}
      <Sfx name="whip-pan" at={T.cut3} align="peak" gainDb={-4} />
      <Sfx name="whoosh-deep" at={v3.cardIn + (v3.land - v3.cardIn) * 0.42} align="peak" gainDb={-7} />
      <Sfx name="impact-deep" at={v3.land} gainDb={-5} />
      <Sfx name="stitch-run" at={v3.sew} rate={1.6} gainDb={-3} />
      {/* triptych: one soft hit per panel, on the half-beat grid */}
      {T.hits.map((h, i) => (
        <Sfx key={i} name="impact-soft" at={h} gainDb={i === 2 ? -4 : -6} />
      ))}
    </>
  );
}

export default function U1() {
  return (
    <AbsoluteFill>
      <U1Visual />
      <U1Sound />
    </AbsoluteFill>
  );
}
