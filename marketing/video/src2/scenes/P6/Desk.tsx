import { AbsoluteFill, interpolate, spring } from "remotion";
import { charmKick, Hand } from "../../illustration/characters";
import { TradeDesk } from "../../illustration/props";
import { CARD_H, OfferSticker } from "../P5/cards";
import { clamp, EASE2, HANDOFF, SPRING2 } from "../../motion";
import { CHAINS3, FPS, lerp, ramp, REACT_LAG, SwingCard, swingGeom, type SwingOpts } from "../P5/rig";
import { HeavyFront, SLEEVE } from "./cast";
import { ACCEPT, CONTACT, CUT, LIFT } from "./timing";

/**
 * P6a · one trade, whole position, or take an offer (v4). Over an OTC desk the seller's hand holds the heavy
 * Satchel #30 (1.20 BTC · 18 ETH · 300 SOL: the value card reads ≈ $171,000.00); the buyer's offer sticker ("Your
 * offer · 42,000 NEAR · Expires in 7 days · ✓ Clean history") stands on the desk. On the swing the card goes right
 * and the offer slides left along the desk; they cross mid-table on the apex. The heavy card lands on the 54.0 s
 * downbeat (a deeper squash, the buyer's hand dips 16 px); on "offer" the sticker flips to "✓ Accepted".
 */

const O: SwingOpts = { fromX: 610, toX: 1310, y: 430, width: 540 };
const K = O.width / 400;
const DESK = { left: 210, top: 936, width: 1500 }; // low: the card swings over the money, the charms ride across it
const OFFER_K = 1.55;
const OFFER = { w: 230 * OFFER_K, h: 230 * OFFER_K * CARD_H.offer };
const STACK_X = { from: 1380, to: 540 }; // the offer's centre x on the desk
const GRIP = 9;

export function DeskStage({ frame }: { frame: number }) {
  const t = frame - LIFT.b;
  const push = interpolate(frame, [CONTACT.b, CUT.c], [1, 1.03], { ...clamp, easing: EASE2.pan });

  // the seller's hand dips under the weight before the lift (anticipation), then lets go
  const heave = 10 * Math.sin(Math.PI * ramp(t, -9, -1)) * (t < 0 ? 1 : 0);
  const sellerAt = swingGeom(Math.min(t, 2), O).point(GRIP, GRIP + 3);
  const release = ramp(t, 1, 6);
  const recoil = interpolate(t, [2, 14], [0, 1], { ...clamp, easing: EASE2.out });

  // the buyer's hand (right) catches the heavy card: rises 6 px before, dips 16 px on contact
  const buyerIn = spring({ frame: frame - 2, fps: FPS, config: SPRING2.land });
  // the catch: the right edge just below the band (a thumb never covers the band's sticker S)
  const corner = swingGeom(Math.max(t, HANDOFF.contact), O).point(O.width - GRIP, 0.36 * O.width * (252 / 400));
  const rise6 = -6 * ramp(t, HANDOFF.contact - 4, HANDOFF.contact - 2);
  const dip = t >= HANDOFF.contact ? 16 * (1 - spring({ frame: t - HANDOFF.contact, fps: FPS, config: SPRING2.rebound })) : 0;
  const bx = corner.x + 340 * (1 - buyerIn);
  const by = corner.y + 30 * (1 - buyerIn) + (t < HANDOFF.contact ? rise6 : dip);
  const buyerPinch = 0.15 + 0.85 * ramp(t, HANDOFF.contact - 3, HANDOFF.contact);

  // the USDC stack: slides left along the desk on the slide's own clock, so it crosses the card on the apex
  const p = ramp(t, HANDOFF.slideStart, HANDOFF.slideEnd, EASE2.swing);
  const stackX = lerp(STACK_X.from, STACK_X.to, p);
  const arrive = t >= HANDOFF.slideEnd ? 0.05 * (1 - spring({ frame: t - HANDOFF.slideEnd, fps: FPS, config: SPRING2.rebound })) : 0;
  const stackLift = 10 * Math.sin(Math.PI * p);
  const deskShake = t >= HANDOFF.contact ? 3 * Math.sin((t - HANDOFF.contact) * 2.2) * Math.exp(-(t - HANDOFF.contact) / 4) : 0;

  const fx = (i: number) => {
    const chain = CHAINS3[i];
    const lag = REACT_LAG[i];
    // curious about the money first (looking right, down), then, after the trade, at the stack on the left
    const atStack = ramp(frame, 8 + lag, 11 + lag) * (1 - ramp(t, -6, -3));
    const after = ramp(t, HANDOFF.contact + 6 + lag, HANDOFF.contact + 9 + lag) * (1 - ramp(t, HANDOFF.contact + 30 + lag, HANDOFF.contact + 34 + lag));
    const tilt = i === 1 ? 6 * atStack - 6 * after : 0;
    let angle = 0;
    for (const b of [CONTACT.b + 30, CONTACT.b + 45]) angle += charmKick(chain, (frame - b - lag) / FPS, (b / 15) % 2 ? 3 : -3);
    return {
      worldAngle: angle,
      face: { look: { x: 6 * atStack - 6 * after, y: 3 * atStack + 4 * after }, tilt, smile: 1 + 0.4 * after },
    };
  };

  return (
    <AbsoluteFill style={{ scale: `${push}`, transformOrigin: `${O.toX}px ${O.y + 220}px` }}>
      <div style={{ position: "absolute", left: DESK.left, top: DESK.top + deskShake }}>
        <TradeDesk width={DESK.width} scale={2} legs={50} />
      </div>
      <Offer frame={frame} x={stackX} lift={stackLift} arrive={arrive} shake={deskShake} />
      <Hand pose="pinch" x={sellerAt.x - 22 * recoil} y={sellerAt.y + heave + 30 * recoil} k={K} angle={84} sleeve={SLEEVE.seller} tag={null} pinch={1 - release} layer="back" />
      <Hand pose="pinch" x={bx} y={by} k={K} angle={84} mirror sleeve={SLEEVE.buyer} tag={null} pinch={buyerPinch} layer="back" />
      <SwingCard
        t={t}
        o={O}
        frame={frame}
        id="30"
        fx={fx}
        blinkSeed="otc30"
        offsetY={heave}
        extraSquash={0.03}
        kickPeak={-9}
        front={(lift) => <HeavyFront width={O.width} lift={lift} />}
      />
      <Hand pose="pinch" x={sellerAt.x - 22 * recoil} y={sellerAt.y + heave + 30 * recoil} k={K} angle={84} sleeve={SLEEVE.seller} tag={null} pinch={1 - release} layer="front" />
      <Hand pose="pinch" x={bx} y={by} k={K} angle={84} mirror sleeve={SLEEVE.buyer} tag={null} pinch={buyerPinch} layer="front" />
    </AbsoluteFill>
  );
}


/** The offer sticker standing on the desk: slides on the swing's clock, flips (2D, a scale-x turn) to Accepted. */
function Offer({ frame, x, lift, arrive, shake }: { frame: number; x: number; lift: number; arrive: number; shake: number }) {
  const turn = interpolate(frame, [ACCEPT - 3, ACCEPT, ACCEPT + 4], [1, 0, 1], { ...clamp, easing: EASE2.out });
  const pop = frame >= ACCEPT ? 0.08 * (1 - spring({ frame: frame - ACCEPT, fps: FPS, config: SPRING2.pop })) : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: x - OFFER.w / 2,
        top: DESK.top - OFFER.h - 4 - lift + shake,
        width: OFFER.w,
        scale: `${Math.max(0.02, turn) * (1 + arrive + pop)} ${(1 - arrive) * (1 + pop)}`,
        transformOrigin: "50% 100%",
        rotate: "-2deg",
      }}
    >
      <OfferSticker k={OFFER_K} accepted={ramp(frame, ACCEPT, ACCEPT + 8)} />
    </div>
  );
}
