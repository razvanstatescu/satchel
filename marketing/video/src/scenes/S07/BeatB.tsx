import { Lock } from "lucide-react";
import { AbsoluteFill, spring } from "remotion";
import { BandPill, SatchelCard } from "../../components/SatchelCard";
import { C, F, display } from "../../brand/tokens";
import { EASE, FPS, SPRING } from "../../lib/time";
import { FreezeBanner, STROKE } from "../../components/product";
import { Headline, tw, type Cues } from "./lib";

const CARD_W = 720;
const KS = CARD_W / 400;

/** The rolling signature count (odometer digit). `value` may be fractional while rolling. */
function Count({ value, color }: { value: number; color: string }) {
  return (
    <span style={{ display: "inline-block", height: "1.12em", overflow: "hidden", lineHeight: "1.12em", verticalAlign: "top" }}>
      <span style={{ display: "block", transform: `translateY(${-value * 1.12}em)` }}>
        {[0, 1, 2, 3, 4].map((d) => (
          <span key={d} style={{ display: "block", height: "1.12em", color }}>
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

/**
 * B · L13 "Listed. Signing paused." The card's band pill flips Active → Listed, a frozen sweep crosses the card,
 * the FreezeBanner lands, and the signature count stops at 3 and locks. No countdown, no progress bar.
 */
export function BeatB({ t, q }: { t: number; q: Cues }) {
  const f = t * FPS;
  const t0 = q.cutB;
  const cardIn = spring({ frame: f - t0 * FPS, fps: FPS, config: SPRING.lift });
  // pill flip around X: old face 0→90°, new face -90→0°
  const flip = tw(t, q.bList - 0.08, q.bList + 0.22, 0, 1, EASE.expoInOut);
  const pillFace = flip < 0.5 ? "active" : "listed";
  const pillRot = flip < 0.5 ? flip * 180 : (flip - 1) * 180;
  const pillPop = 1 + 0.12 * Math.sin(Math.PI * tw(t, q.bList + 0.1, q.bList + 0.45, 0, 1, (x) => x));
  // frozen sweep across the card, then a faint frozen edge that stays
  const sweep = tw(t, q.bPause - 0.05, q.bPause + 0.55, 0, 1, EASE.expoInOut);
  const frozenEdge = tw(t, q.bPause + 0.2, q.bPause + 0.7);
  const bannerIn = spring({ frame: f - (q.bPause + 0.1) * FPS, fps: FPS, config: SPRING.slam });
  const iconTurn = (1 - tw(t, q.bPause + 0.1, q.bPause + 1.0, 0, 1, EASE.quintOut)) * -120;
  // signature count: 1 → 2 → 3 while history grows, then it locks
  const roll =
    1 +
    tw(t, t0 + 0.25, t0 + 0.5, 0, 1, EASE.expoOut) +
    tw(t, Math.min(q.bList - 0.4, t0 + 0.85), Math.min(q.bList - 0.15, t0 + 1.1), 0, 1, EASE.expoOut);
  const lockP = spring({ frame: f - q.bLock * FPS, fps: FPS, config: SPRING.slam });
  const locked = t >= q.bLock;
  const countColor = locked ? C.frozen : C.ink;
  const statIn = tw(t, t0 + 0.1, t0 + 0.5);

  const sx = -40 + 180 * sweep; // % across the card
  // camera punch-in on the band pill for the flip, back out before "signing pauses"
  const camIn = tw(t, q.bList - 0.22, q.bList + 0.08, 0, 1, EASE.expoOut);
  const camOut = tw(t, Math.max(q.bList + 0.3, q.bPause - 0.42), q.bPause - 0.02, 0, 1, EASE.expoInOut);
  const cam = 1 + 0.9 * camIn * (1 - camOut);
  const PX = 120 + CARD_W - 60; // pill centre (frame px)
  const PY = 330 + 35.3 * KS;
  return (
    <AbsoluteFill>

      <AbsoluteFill style={{ transform: `scale(${cam})`, transformOrigin: `${PX}px ${PY}px` }}>
      {/* the card */}
      <AbsoluteFill style={{ perspective: 2000 }}>
        <div
          style={{
            position: "absolute",
            left: 120,
            top: 330,
            transform: `translateY(${(1 - cardIn) * 120}px) rotateX(${(1 - cardIn) * 18}deg) rotateZ(${(1 - cardIn) * -3}deg)`,
            opacity: Math.min(1, cardIn * 2.5),
          }}
        >
          <SatchelCard tokenId="1" width={CARD_W} status={null} total="3 chains" />
          {/* band pill (flip) */}
          <div style={{ position: "absolute", right: 16 * KS, top: 35.3 * KS, transform: `translateY(-50%) scale(${KS * pillPop}) perspective(300px) rotateX(${pillRot}deg)`, transformOrigin: "right center" }}>
            <BandPill status={pillFace} />
          </div>
          {/* frozen sweep + edge */}
          <div style={{ position: "absolute", inset: 0, borderRadius: 22 * KS, overflow: "hidden", pointerEvents: "none" }}>
            {sweep > 0 && sweep < 1 ? (
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(110deg, transparent ${sx - 26}%, rgba(148,190,223,0.18) ${sx - 10}%, rgba(200,226,245,0.5) ${sx}%, rgba(148,190,223,0.18) ${sx + 10}%, transparent ${sx + 26}%)`, mixBlendMode: "screen" }} />
            ) : null}
            <div style={{ position: "absolute", inset: 0, borderRadius: 22 * KS, boxShadow: `inset 0 0 0 ${3}px rgba(148,190,223,${0.55 * frozenEdge}), inset 0 0 60px rgba(148,190,223,${0.12 * frozenEdge})` }} />
          </div>
        </div>
      </AbsoluteFill>

      {/* right column: signature count + freeze banner */}
      <div style={{ position: "absolute", left: 930, top: 330, width: 870 }}>
        <div style={{ opacity: statIn, transform: `translateY(${(1 - statIn) * 20}px)` }}>
          <div style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 34, color: C.inkMuted }}>Signatures</div>
          <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 6 }}>
            <span style={{ ...display(700, 96), fontSize: 150, lineHeight: 1, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>
              <Count value={roll} color={countColor} />
            </span>
            <span style={{ ...display(650, 72), fontSize: 64, color: locked ? C.frozen : C.ink, letterSpacing: "-0.02em" }}>signatures</span>
            {locked ? (
              <span style={{ display: "inline-flex", color: C.frozen, transform: `scale(${0.4 + 0.6 * lockP})`, opacity: Math.min(1, lockP * 2) }}>
                <Lock size={64} strokeWidth={STROKE} />
              </span>
            ) : null}
          </div>
        </div>
        <div style={{ marginTop: 56, opacity: Math.min(1, bannerIn * 2), transform: `translateY(${(1 - bannerIn) * 60}px)` }}>
          <FreezeBanner viewer="buyer" width={870} k={2.25} sweep={tw(t, q.bPause + 0.3, q.bPause + 1.0, 0, 1, EASE.expoInOut)} iconTurn={iconTurn} />
        </div>
      </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 120, top: 92 }}>
        <Headline lines={["Listed."]} t={t} at={q.bList - 0.05} size={124} style={{ display: "inline-block" }} />
        <Headline lines={["Signing paused."]} t={t} at={q.bPause - 0.05} size={124} accentLast={C.frozen} style={{ display: "inline-block", marginLeft: 36 }} />
      </div>
    </AbsoluteFill>
  );
}
