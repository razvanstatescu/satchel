import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import { SatchelCard } from "../../components/SatchelCard";
import { EASE, s, tween } from "../../lib/time";
import { CardStitch, clamp01, HBlur, lerp } from "./kit";
import { Headline, Plate, ToRow, speed } from "./parts";
import { HEAVY, type U1T } from "./timing";

/**
 * V3 · "Hand over a treasury."
 * A bigger, heavier card ("Team treasury", more mass on the same no-bounce spring) crosses the frame to
 * ops-lead.near and lands with weight (a short translate-only shake), then the stitch sews it to its new owner.
 * At the triptych the UI steps back and the photo racks sharp again.
 */
export const TREASURY = {
  cardW: 620,
  destX: 1010,
  destY: 520,
};
const CARD_H = (252 * TREASURY.cardW) / 400;

export function Treasury({ T }: { T: U1T }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = T.v3;

  // UI steps back as the triptych starts; the photo racks back to sharp under the panels
  const out = tween(f, T.trip - 0.27, T.trip - 0.07, 0, 1, EASE.standard);
  const focus = tween(f, v.focus, v.focus + 0.45, 0, 1, EASE.standard) * (1 - tween(f, T.trip - 0.27, T.trip + 0.3, 0, 1, EASE.standard));
  const inP = (fr: number) => spring({ frame: fr - s(v.cardIn), fps, config: HEAVY });
  const p = inP(f);
  const cardX = (fr: number) => lerp(-TREASURY.cardW - 140, TREASURY.destX, inP(fr));
  const lift = Math.sin(Math.PI * clamp01(p)) * (p < 1 ? 1 : 0);
  const blur = Math.min(28, speed(cardX, f) * 0.16);
  const toRow = tween(f, v.toRow, v.toRow + 0.4, 0, 1, EASE.expoOut);
  const sew = tween(f, v.sew, v.sewEnd, 0, 1, (x) => x);

  // landing weight: a short decaying translate-only shake on the UI layer
  const tl = f - s(v.land);
  const env = tl < 0 ? 0 : 5 * Math.exp(-tl / 4);
  const shx = noise2D("u1-shake-x", tl * 0.4, 0) * env;
  const shy = noise2D("u1-shake-y", 0, tl * 0.4) * env;
  const drift = 1 + 0.015 * tween(f, T.cut3, T.trip, 0, 1, EASE.standard);

  return (
    <AbsoluteFill>
      <Plate name="uc-treasury" frame={f} t0={T.cut3} t1={T.D} focus={focus} origin="68% 44%" />
      <HBlur id="u1t-card" amount={blur} />

      <AbsoluteFill style={{ transform: `translate(${shx}px, ${shy + 14 * out}px) scale(${drift})`, opacity: 1 - out }}>
        <Headline
          frame={f}
          size={140}
          lines={[
            { text: "Hand over", at: v.head },
            { text: "a treasury.", at: v.head + 0.07 },
          ]}
        />
        <ToRow account="ops-lead.near" p={toRow} x={TREASURY.destX} y={TREASURY.destY - 118} />
        <div
          style={{
            position: "absolute",
            left: cardX(f),
            top: TREASURY.destY - 30 * lift,
            transform: `rotate(${4 * lift - 3 * (1 - clamp01(p))}deg) scale(${1 + 0.03 * lift})`,
            transformOrigin: "50% 60%",
            filter: blur > 0.6 ? "url(#u1t-card)" : undefined,
          }}
        >
          <SatchelCard
            tokenId="21"
            width={TREASURY.cardW}
            status="active"
            chips={[
              { chain: "btc", amount: "1.2500" },
              { chain: "evm", amount: "24.0000" },
              { chain: "sol", amount: "640.0000" },
            ]}
          >
            <CardStitch id="u1t-stitch" progress={sew} />
          </SatchelCard>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export const TREASURY_CARD_H = CARD_H;
