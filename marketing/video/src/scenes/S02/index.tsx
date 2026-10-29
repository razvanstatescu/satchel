import { AbsoluteFill, interpolate, interpolateColors, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ArrowRight } from "lucide-react";
import { C, F } from "../../brand/tokens";
import { SatchelCard } from "../../components/SatchelCard";
import { Sfx } from "../../lib/Sfx";
import { getScene } from "../../lib/timeline";
import { EASE, FPS, SPRING, W, s, tween } from "../../lib/time";
import { bric, circlePath, CLAMP, clamp01, KeyLitGround, landingFrame, lerp, MaskLine, SewPath, wordTimes } from "../S01/kit";

/**
 * S02 Transfer (L05: "Transfer the NFT, and the whole wallet goes with it. No bridge. No wrapped tokens.").
 * The stage whips in (it follows S04). alice.near presses "Transfer to bob.near"; Satchel #1 lifts (y up, scale 1.04,
 * 6° tilt: product spring-lift 260/22/1), slides to bob on the product's spring-handoff (120/18/1.2) and lands; the
 * ownership stitch unpicks from alice and sews onto bob's card and avatar, and the band pill reads "Transferred".
 * Text: "Transfer the NFT." → "The wallet goes with it." → slams "No bridge." "No wrapped tokens."
 * Timings ported from apps/web/src/components/client/Handoff.tsx.
 */

const sc = getScene("S02");
const D = sc.duration;
const L = sc.line("L05");
const tTransfer = L.start + (L.words[0]?.start ?? 0);
const tWallet = sc.wordAt("L05", "wallet");
const noTimes = wordTimes(sc, "L05", "no");
const tNo1 = Math.min(noTimes[0] ?? L.start + 3.4, D - 2.0);
const tNo2 = Math.min(Math.max(noTimes[1] ?? tNo1 + 0.9, tNo1 + 0.85), D - 1.1);

// Handoff choreography: the stitch lands on bob as "the whole wallet goes with it" is spoken.
const tLift = Math.max(0.95, tWallet - 0.95);
const tPress = tLift - 0.18; // "Transfer to bob.near" pressed
const tSlide = tLift + 0.15; // product: x delay 0.15
const tSettle = tSlide + 0.55; // product: y/rotate/scale delay 0.7 from the lift
const tSew = tSlide + 0.62;
const tLine2 = Math.max(tSew + 0.1, tWallet - 0.06);
const LIFT_DY = -28;

// Layout.
const CARD_W = 480;
const CARD_H = (252 * CARD_W) / 400;
const CARD_CY = 600;
const ALICE_X = 480;
const BOB_X = 1440;
const AV_Y = 905;
const AV_R = 46;
const RING_R = 62;

function Person({ name, x, ring, ringId, dim }: { name: string; x: number; ring: number; ringId: string; dim: number }) {
  const nameW = name.length * 0.6 * 40;
  const groupW = AV_R * 2 + 44 + nameW;
  const left = x - groupW / 2;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left,
          top: AV_Y - AV_R,
          width: AV_R * 2,
          height: AV_R * 2,
          borderRadius: 999,
          background: C.surfaceRaised,
          boxShadow: `inset 0 0 0 2px ${C.lineStrong}`,
          display: "grid",
          placeItems: "center",
          ...bric(620),
          fontSize: 42,
          color: C.ink,
        }}
      >
        {name.slice(0, 1).toUpperCase()}
      </div>
      <div style={{ position: "absolute", left: left + AV_R * 2 + 44, top: AV_Y - 26, fontFamily: F.mono, fontSize: 40, lineHeight: "52px", color: dim > 0.5 ? C.ink : C.inkMuted, whiteSpace: "nowrap" }}>
        {name}
      </div>
      <svg width={W} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <SewPath d={circlePath(left + AV_R, AV_Y, RING_R)} id={ringId} progress={ring} width={3.5} dash={[9, 7]} needle={ring < 1} />
      </svg>
    </>
  );
}

// the whip-in: the stage arrives from the right with a velocity-driven horizontal blur
const stageX = (f: number) => interpolate(f, [-2, 9], [W * 0.75, 0], { ...CLAMP, easing: EASE.expoOut });

export default function S02() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / FPS;

  const sx = stageX(f);
  const stageV = Math.abs(stageX(f + 1) - stageX(f - 1)) / 2;
  const stageBlur = Math.min(60, stageV * 0.3);

  // 1. lift, 2. slide, 3. settle (product springs)
  const lift = spring({ frame: f - s(tLift), fps, config: SPRING.lift });
  const settle = spring({ frame: f - s(tSettle), fps, config: SPRING.lift });
  const up = lift - settle;
  const slide = spring({ frame: f - s(tSlide), fps, config: SPRING.handoff });
  const slideV = Math.abs(spring({ frame: f + 1 - s(tSlide), fps, config: SPRING.handoff }) - spring({ frame: f - 1 - s(tSlide), fps, config: SPRING.handoff })) / 2;
  const cardBlur = Math.min(14, slideV * (BOB_X - ALICE_X) * 0.22);
  const cx = lerp(ALICE_X, BOB_X, slide);
  const cy = CARD_CY + LIFT_DY * up;

  // the stitch: unpicks from alice as the card lifts, sews onto bob after it lands
  const unpick = 1 - tween(f, tLift, tLift + 0.32, 0, 1, EASE.standard);
  const sew = tween(f, tSew, tSew + 0.7, 0, 1, EASE.standard);
  const cardStitch = t < tSew ? unpick : sew;
  const bobRing = tween(f, tSew + 0.08, tSew + 0.78, 0, 1, EASE.standard);
  const transferred = t >= tSettle + 0.35;

  // the transfer action between them
  const btnIn = interpolate(f, [s(0.35), s(0.35) + 12], [0, 1], { ...CLAMP, easing: EASE.expoOut });
  const btnOut = interpolate(f, [s(tLift), s(tLift) + 6], [0, 1], { ...CLAMP, easing: EASE.expoIn });
  const btnPress = interpolate(f, [s(tPress), s(tPress) + 2, s(tPress) + 6], [0, 1, 0], CLAMP);

  // type
  const line1 = interpolate(f, [s(tTransfer - 0.06), s(tTransfer - 0.06) + 16], [0, 1], { ...CLAMP, easing: EASE.expoOut });
  const line2 = interpolate(f, [s(tLine2), s(tLine2) + 16], [0, 1], { ...CLAMP, easing: EASE.expoOut });
  const dimHead = tween(f, tNo1 - 0.1, tNo1 + 0.2, 0, 1, EASE.standard);
  const no1 = spring({ frame: f - s(tNo1 - 0.04), fps, config: SPRING.slam });
  const no2 = spring({ frame: f - s(tNo2 - 0.04), fps, config: SPRING.slam });
  const headColor = interpolateColors(dimHead, [0, 1], [C.ink, C.inkMuted]);

  const drift = 1 + 0.02 * tween(f, 0, D, 0, 1, EASE.standard);
  const shadowA = 0.35 + 0.25 * up;

  const strike = (p: number, text: string, top: number) =>
    p > 0 ? (
      <div
        style={{
          position: "absolute",
          left: 140,
          top,
          ...bric(800, lerp(80, 100, clamp01(p))),
          fontSize: 104,
          lineHeight: 1,
          letterSpacing: "-0.03em",
          color: C.ink,
          whiteSpace: "nowrap",
          transformOrigin: "0% 60%",
          transform: `scale(${lerp(1.35, 1, p)})`,
          opacity: clamp01(p * 4),
        }}
      >
        {text}
      </div>
    ) : null;

  return (
    <AbsoluteFill style={{ background: C.ground }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id="s02-slide" x="-10%" y="0" width="120%" height="100%">
          <feGaussianBlur stdDeviation={`${cardBlur.toFixed(2)} 0`} />
        </filter>
        <filter id="s02-whip" x="-5%" y="0" width="110%" height="100%">
          <feGaussianBlur stdDeviation={`${stageBlur.toFixed(2)} 0`} />
        </filter>
      </svg>
      <KeyLitGround plateName="leather-ground-2" plateOpacity={0.3} light={0.22} dx={-20 * tween(f, 0, D, 0, 1, EASE.standard) + sx * 0.3} />
      <AbsoluteFill style={{ transform: `translateX(${sx}px) scale(${drift})`, filter: stageBlur > 0.5 ? "url(#s02-whip)" : undefined }}>
        {/* headline */}
        <div style={{ position: "absolute", left: 140, top: 96, fontSize: 112, lineHeight: 1.04, letterSpacing: "-0.03em" }}>
          <MaskLine p={line1}>
            <div style={{ ...bric(lerp(560, 760, line1), lerp(86, 100, line1)), color: headColor }}>Transfer the NFT.</div>
          </MaskLine>
          <MaskLine p={line2}>
            <div style={{ ...bric(lerp(560, 760, line2), lerp(86, 100, line2)), color: headColor }}>The wallet goes with it.</div>
          </MaskLine>
        </div>

        {/* the two people */}
        <Person name="alice.near" x={ALICE_X} ring={unpick} ringId="s02-ring-a" dim={1 - slide} />
        <Person name="bob.near" x={BOB_X} ring={bobRing} ringId="s02-ring-b" dim={slide} />

        {/* the action: "Transfer to bob.near" (product xfer.cta), pressed, then the card goes */}
        {btnIn > 0 && btnOut < 1 ? (
          <div
            style={{
              position: "absolute",
              left: (ALICE_X + BOB_X) / 2 - 230,
              width: 460,
              top: CARD_CY - 44,
              height: 88,
              boxSizing: "border-box",
              borderRadius: 28,
              boxShadow: `inset 0 0 0 2px ${C.lineStrong}`,
              background: btnPress > 0 ? C.surfaceRaised : "rgba(34,24,18,0.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              fontFamily: F.sans,
              fontWeight: 600,
              fontSize: 34,
              color: C.ink,
              opacity: btnIn * (1 - btnOut),
              transform: `translateY(${(1 - btnIn) * 18}px) scale(${1 - 0.03 * btnPress - 0.06 * btnOut})`,
            }}
          >
            Transfer to bob.near
            <ArrowRight size={36} strokeWidth={1.9} color={C.ink} />
          </div>
        ) : null}

        {/* strikes: in alice's now-empty slot */}
        {strike(no1, "No bridge.", 452)}
        {strike(no2, "No wrapped tokens.", 586)}

        {/* card shadow on the ground */}
        <div
          style={{
            position: "absolute",
            left: cx - CARD_W * 0.48,
            top: CARD_CY + CARD_H / 2 - 10,
            width: CARD_W * 0.96,
            height: 46,
            borderRadius: "50%",
            background: `radial-gradient(ellipse at center, rgba(0,0,0,${shadowA}) 0%, rgba(0,0,0,0) 70%)`,
            transform: `scale(${1 + 0.12 * up})`,
          }}
        />
        {/* Satchel #1 */}
        <div
          style={{
            position: "absolute",
            left: cx - CARD_W / 2,
            top: cy - CARD_H / 2,
            transform: `scale(${1 + 0.04 * up}) rotate(${6 * up}deg)`,
            filter: cardBlur > 0.5 ? "url(#s02-slide)" : undefined,
          }}
        >
          <SatchelCard tokenId="1" width={CARD_W} status={transferred ? "transferred" : "active"} stitch={cardStitch} />
        </div>
      </AbsoluteFill>

      <Sfx name="whip-pan" at={0.05} align="peak" />
      <Sfx name="ui-click" at={tPress} />
      <Sfx name="leather-creak" at={tLift} gainDb={-2} />
      <Sfx name="whoosh-fast" at={tSlide + 0.3} align="peak" gainDb={-4} />
      <Sfx name="impact-soft" at={tSettle + landingFrame(SPRING.lift) / FPS} gainDb={-8} />
      <Sfx name="stitch-run" at={tSew} />
      <Sfx name="impact-soft" at={tNo1 - 0.04 + landingFrame(SPRING.slam) / FPS} gainDb={-2} />
      <Sfx name="impact-soft" at={tNo2 - 0.04 + landingFrame(SPRING.slam) / FPS} gainDb={-2} />
    </AbsoluteFill>
  );
}
