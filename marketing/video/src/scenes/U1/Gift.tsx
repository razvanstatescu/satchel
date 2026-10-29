import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { F } from "../../brand/tokens";
import { SatchelCard } from "../../components/SatchelCard";
import { EASE, SPRING, s, tween } from "../../lib/time";
import { CardStitch, clamp01, HBlur, lerp } from "./kit";
import { Headline, Holdings, Plate, ToRow, speed } from "./parts";
import type { U1T } from "./timing";

/**
 * V2 · "Gift a wallet."
 * The photo first: "sam.near" is inked onto the blank gift tag (plate space, so it pushes and softens with the photo).
 * Then the rack focus hands over to the product: the funded Satchel #12 glides in and lands in sam's slot, and the
 * saddle stitch sews itself around it, one stitch at a time: sam owns it now.
 */
export const GIFT = {
  cardW: 560,
  destX: 1000,
  destY: 524,
  // the blank tag in uc-gift.jpg (measured on the 1920 × 1080 plate): centre ≈ (1287, 742), ≈ 152 px wide, leaning 8.7°
  tag: { x: 1291, y: 738, rot: 8.7, size: 27 },
};
const CARD_H = (252 * GIFT.cardW) / 400;

/** "sam.near" inked on the blank gift tag, written left to right (`p` 0..1). Lives in uc-gift plate space. */
export function TagInk({ p }: { p: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: GIFT.tag.x,
        top: GIFT.tag.y,
        transform: `translate(-50%, -50%) rotate(${GIFT.tag.rot}deg)`,
        fontFamily: F.mono,
        fontWeight: 500,
        fontSize: GIFT.tag.size,
        letterSpacing: "-0.02em",
        color: "#2b1d15",
        opacity: 0.86,
        whiteSpace: "nowrap",
        clipPath: `inset(-10% ${(1 - Math.max(0, Math.min(1, p))) * 100}% -10% 0)`,
      }}
    >
      sam.near
    </div>
  );
}

export function Gift({ T }: { T: U1T }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = T.v2;

  const focus = tween(f, v.focus, v.focus + 0.45, 0, 1, EASE.standard);
  const ink = tween(f, v.tag, v.tag + 0.42, 0, 1, (x) => x);
  const inP = (fr: number) => spring({ frame: fr - s(v.cardIn), fps, config: SPRING.handoff });
  const p = inP(f);
  const cardX = (fr: number) => lerp(-GIFT.cardW - 120, GIFT.destX, inP(fr));
  const lift = Math.sin(Math.PI * clamp01(p)) * (p < 1 ? 1 : 0);
  const blur = Math.min(26, speed(cardX, f) * 0.16);
  const toRow = tween(f, v.toRow, v.toRow + 0.4, 0, 1, EASE.expoOut);
  const sew = tween(f, v.sew, v.sewEnd, 0, 1, (x) => x);
  const cap = tween(f, v.caption, v.caption + 0.4, 0, 1, EASE.expoOut);
  const drift = 1 + 0.015 * tween(f, T.cut2, T.cut3, 0, 1, EASE.standard);

  return (
    <AbsoluteFill>
      <Plate name="uc-gift" frame={f} t0={T.cut2} t1={T.cut3} focus={focus} origin="67% 62%">
        <TagInk p={ink} />
      </Plate>
      <HBlur id="u1g-card" amount={blur} />
      <AbsoluteFill style={{ transform: `scale(${drift})` }}>
        <Headline frame={f} size={144} lines={[{ text: "Gift a wallet.", at: v.head }]} />

        <ToRow account="sam.near" p={toRow} x={GIFT.destX} y={GIFT.destY - 118} />

        <div
          style={{
            position: "absolute",
            left: cardX(f),
            top: GIFT.destY - 46 * lift,
            transform: `rotate(${6 * lift - 4 * (1 - clamp01(p))}deg) scale(${1 + 0.04 * lift})`,
            transformOrigin: "50% 60%",
            filter: blur > 0.6 ? "url(#u1g-card)" : undefined,
          }}
        >
          <SatchelCard
            tokenId="12"
            width={GIFT.cardW}
            status="active"
            chips={[
              { chain: "btc", amount: "0.0100" },
              { chain: "evm", amount: "0.2500" },
              { chain: "sol", amount: "2.0000" },
            ]}
          >
            <CardStitch id="u1g-stitch" progress={sew} />
          </SatchelCard>
        </div>

        <div
          style={{
            position: "absolute",
            left: GIFT.destX + 4,
            top: GIFT.destY + CARD_H + 26,
            opacity: cap,
            transform: `translateY(${(1 - cap) * 14}px)`,
          }}
        >
          <Holdings
            items={[
              { chain: "btc", text: "0.01 BTC" },
              { chain: "evm", text: "0.25 ETH" },
              { chain: "sol", text: "2.00 SOL" },
            ]}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
