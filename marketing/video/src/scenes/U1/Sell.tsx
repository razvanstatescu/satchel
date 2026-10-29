import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, F } from "../../brand/tokens";
import { SatchelCard } from "../../components/SatchelCard";
import { RADIUS } from "../../components/product";
import { EASE, SPRING, s, tween } from "../../lib/time";
import { bric, clamp01, HBlur, lerp } from "./kit";
import { Headline, Holdings, Plate, speed } from "./parts";
import type { U1T } from "./timing";

/**
 * V1 · "Sell a position." → "One trade."
 * Seller slot (left): Satchel #7, Listed, holding 0.40 BTC · 2.00 ETH. Buyer slot (right): "Buy for 25,000.00 USDC".
 * On "one trade" the two swap places in ONE move (the card arcs right to the buyer, the payment arcs left to the
 * seller) and land together: the NFT moves and the seller is paid in the same transaction.
 */
export const SELL = {
  cardW: 480,
  sellX: 150,
  buyX: 1240,
  rowY: 566,
  tagW: 560,
  tagH: 210,
  arc: 70,
};
const CARD_H = (252 * SELL.cardW) / 400;
const TAG_Y = SELL.rowY + (CARD_H - SELL.tagH) / 2;

export function Sell({ T }: { T: U1T }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = T.v1;

  const focus = tween(f, v.focus, v.focus + 0.4, 0, 1, EASE.standard);
  const inP = (fr: number) => spring({ frame: fr - s(v.cardIn), fps, config: SPRING.handoff });
  const tagP = (fr: number) => spring({ frame: fr - s(v.tagIn), fps, config: SPRING.handoff });
  const swP = (fr: number) => spring({ frame: fr - s(v.swap), fps, config: SPRING.lift });
  const cardX = (fr: number) => lerp(-SELL.cardW - 80, SELL.sellX, inP(fr)) + (SELL.buyX - SELL.sellX) * swP(fr);
  const tagX = (fr: number) => lerp(1920 + 40, SELL.buyX, tagP(fr)) - (SELL.buyX - SELL.sellX) * swP(fr);
  const sw = swP(f);
  const arc = Math.sin(Math.PI * clamp01(sw));
  const cardY = SELL.rowY - SELL.arc * arc;
  const tagY = TAG_Y + SELL.arc * arc;
  const lift = arc; // product lifted pose while it travels
  const cardBlur = Math.min(26, speed(cardX, f) * 0.16);
  const tagBlur = Math.min(26, speed(tagX, f) * 0.16);
  const enterTilt = (1 - clamp01(inP(f))) * -7;

  const landed = f >= s(v.land);
  const paid = tween(f, v.land - 0.04, v.land + 0.16, 0, 1, EASE.standard);
  const roles = tween(f, v.cardIn + 0.25, v.cardIn + 0.6, 0, 1, EASE.expoOut);
  const hold = tween(f, v.cardIn + 0.3, v.cardIn + 0.7, 0, 1, EASE.expoOut);

  const drift = 1 + 0.015 * tween(f, 0, T.cut2, 0, 1, EASE.standard);

  return (
    <AbsoluteFill>
      <Plate name="uc-sell" frame={f} t0={0} t1={T.cut2} focus={focus} origin="66% 56%" />
      <HBlur id="u1s-card" amount={cardBlur} />
      <HBlur id="u1s-tag" amount={tagBlur} />
      <AbsoluteFill style={{ transform: `scale(${drift})` }}>
        <Headline
          frame={f}
          size={128}
          lines={[
            { text: "Sell a position.", at: v.head },
            { text: "One trade.", at: v.line2 },
          ]}
        />

        {/* who is who: the slots stay, the things in them swap */}
        {[
          { label: "Seller", x: SELL.sellX },
          { label: "Buyer", x: SELL.buyX },
        ].map((r) => (
          <div
            key={r.label}
            style={{
              position: "absolute",
              left: r.x + 4,
              top: SELL.rowY - 68,
              fontFamily: F.sans,
              fontWeight: 600,
              fontSize: 34,
              letterSpacing: "0.01em",
              color: C.inkMuted,
              opacity: roles,
              transform: `translateY(${(1 - roles) * 16}px)`,
            }}
          >
            {r.label}
          </div>
        ))}

        {/* the payment (drawn first: the card passes in front of it) */}
        <div
          style={{
            position: "absolute",
            left: tagX(f),
            top: tagY,
            width: SELL.tagW,
            height: SELL.tagH,
            boxSizing: "border-box",
            borderRadius: RADIUS.md * 2.25,
            background: C.surface,
            boxShadow: `inset 0 0 0 1.5px ${C.line}, 0 24px 60px rgba(0,0,0,0.5)`,
            padding: "34px 40px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            filter: tagBlur > 0.6 ? "url(#u1s-tag)" : undefined,
          }}
        >
          <div style={{ position: "relative", height: 44, fontFamily: F.sans, fontWeight: 500, fontSize: 34, color: C.inkMuted }}>
            <span style={{ position: "absolute", left: 0, top: 0, opacity: 1 - paid }}>Buy for</span>
            <span style={{ position: "absolute", left: 0, top: 0, opacity: paid, color: C.success }}>Paid</span>
          </div>
          <div
            style={{
              ...bric(680, 100, 48),
              fontSize: 58,
              lineHeight: "70px",
              letterSpacing: "-0.015em",
              color: C.ink,
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
            }}
          >
            {landed ? "+" : ""}25,000.00 USDC
          </div>
        </div>

        {/* Satchel #7 */}
        <div
          style={{
            position: "absolute",
            left: cardX(f),
            top: cardY,
            transform: `rotate(${enterTilt + 5 * lift}deg) scale(${1 + 0.04 * lift})`,
            transformOrigin: "50% 60%",
            filter: cardBlur > 0.6 ? "url(#u1s-card)" : undefined,
          }}
        >
          <SatchelCard
            tokenId="7"
            width={SELL.cardW}
            status={landed ? "sold" : "listed"}
            chips={[
              { chain: "btc", amount: "0.4000" },
              { chain: "evm", amount: "2.0000" },
              { chain: "sol", amount: "0.0000" },
            ]}
          />
          <div style={{ position: "absolute", left: 4, top: CARD_H + 24, opacity: hold, transform: `translateY(${(1 - hold) * 14}px)` }}>
            <Holdings
              items={[
                { chain: "btc", text: "0.40 BTC" },
                { chain: "evm", text: "2.00 ETH" },
              ]}
            />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/** The moment the card and the payment cross (sound cue). */
export const sellCross = (T: U1T) => (T.v1.swap + T.v1.land) / 2;
