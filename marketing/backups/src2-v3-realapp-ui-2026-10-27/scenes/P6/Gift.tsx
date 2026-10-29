import { AbsoluteFill, Easing, interpolate, spring } from "remotion";
import { C } from "../../brand/tokens";
import { charmKick, Hand, NameTag } from "../../illustration/characters";
import { GIFT, GiftBox } from "../../illustration/props";
import { clamp, EASE2, HANDOFF, slapAt, SPRING2 } from "../../motion";
import { CHAINS3, FPS, ramp, REACT_LAG, SvgLayer, SwingCard, swingGeom, type SwingOpts } from "../P5/rig";
import { GIFT_CHIPS, SLEEVE } from "./cast";
import { CONTACT, CUT, LIFT } from "./timing";

/**
 * P6a · the gift. A sky gift box with a lemon ribbon (never coral: the card band is this frame's coral; lemon kept to
 * the ribbon, within its ~10% budget) slaps in, hops, its lid blasts off
 * up and out of frame, Satchel #12 pops up out of it with its charms in tiny party hats, grinning, and swings to
 * sam.near's hand (the hand-off, landing on the 48.0 s downbeat). The charms cheer, then bop on the beats.
 */

const O: SwingOpts = { fromX: 460, toX: 1250, y: 312, width: 460 };
const K = O.width / 400;
const BOX_S = 2.8;
const BOX = { w: GIFT.w * BOX_S, h: GIFT.h * BOX_S, left: O.fromX - (GIFT.w * BOX_S) / 2, top: 560 };
const MOUTH_Y = BOX.top + GIFT.mouth.y * BOX_S;
const DEPTH = MOUTH_Y + 30 - O.y; // #12 starts with its top 30 px inside the mouth
const GRIP = 8;
export const LID_AT = 10;
export const RISE_AT = 13;
const HATS = [-1, 1, 1];

export function GiftStage({ frame }: { frame: number }) {
  const t = frame - LIFT.a;
  // the box slaps in on the downbeat (mid-slap on the cut, contact f2), gives one eager hop (anticipation), then
  // stretches as the lid blasts off
  const slap = slapAt(frame + 2, FPS, 0, { from: 1.12, squash: 0.06, drop: 0 });
  const hopY = -18 * Math.max(0, Math.sin(Math.PI * ramp(frame, 5, 9)));
  const boxSq = interpolate(frame, [8, 9, 10, LID_AT + 1, LID_AT + 3, LID_AT + 8], [0, 0.06, 0, -0.07, -0.07, 0], clamp);
  const open = 7 * Easing.out(Easing.quad)(ramp(frame, LID_AT, LID_AT + 12)); // the lid blasts off up-left, out of frame
  // #12 pops up (rebound: ~18% overshoot) and hangs over the open box until its lift
  const rise = spring({ frame: frame - RISE_AT, fps: FPS, config: SPRING2.rebound });
  const offsetY = DEPTH * (1 - rise);
  // camera: a gentle push toward sam's card once it has landed
  const push = interpolate(frame, [CONTACT.a, CUT.b], [1, 1.03], { ...clamp, easing: EASE2.pan });

  // sam (right): slides in while the card pops, waits with an open pinch, catches on the downbeat
  const samIn = spring({ frame: frame - 16, fps: FPS, config: SPRING2.land });
  // the catch: the right edge just below the band (a thumb never covers the band's sticker S)
  const corner = swingGeom(Math.max(t, HANDOFF.contact), O).point(O.width - GRIP, 0.36 * O.width * (252 / 400));
  const rise6 = -6 * ramp(t, HANDOFF.contact - 4, HANDOFF.contact - 2);
  const dip = t >= HANDOFF.contact ? 8 * (1 - spring({ frame: t - HANDOFF.contact, fps: FPS, config: SPRING2.rebound })) : 0;
  const sx = corner.x + 560 * (1 - samIn);
  const sy = corner.y + 30 * (1 - samIn) + (t < HANDOFF.contact ? rise6 : dip);
  const samPinch = 0.15 + 0.85 * ramp(t, HANDOFF.contact - 3, HANDOFF.contact);

  const fx = (i: number) => {
    const chain = CHAINS3[i];
    const lag = REACT_LAG[i];
    // popping out: wide eyes and a big grin (they ARE the surprise); a bounce off the pop
    const out = ramp(frame, RISE_AT + 5 + lag, RISE_AT + 8 + lag);
    let angle = charmKick(chain, (frame - (RISE_AT + 6 + lag)) / FPS, [7, -6, 8][i]);
    // after the landing: a cheer (joy, big smile), then a bop on every beat (music-only hold)
    const cheer = ramp(frame, CONTACT.a + 2 + lag, CONTACT.a + 4 + lag) * (1 - ramp(frame, CONTACT.a + 16 + lag, CONTACT.a + 20 + lag));
    for (const b of [CONTACT.a + 15, CONTACT.a + 30, CONTACT.a + 45]) angle += charmKick(chain, (frame - b - lag) / FPS, (b / 15) % 2 ? 3.5 : -3.5);
    const wide = out * (1 - ramp(frame, RISE_AT + 14, RISE_AT + 18));
    return {
      hat: 1,
      hatSide: HATS[i],
      worldAngle: angle,
      face: { wide, grin: 0.85 * out * (1 - cheer * 0.2), joy: cheer, smile: 1.25 + 0.35 * cheer, look: { x: 0, y: -2 * out } },
    };
  };

  return (
    <AbsoluteFill style={{ scale: `${push}`, transformOrigin: `${O.toX}px ${O.y + 200}px` }}>
      <Box part="back" open={open} hopY={hopY} sq={boxSq} slap={slap} />
      <SwingCard t={t} o={O} frame={frame} id="12" chips={GIFT_CHIPS} fx={fx} blinkSeed="gift12" offsetY={offsetY} />
      <Box part="front" open={open} hopY={hopY} sq={boxSq} slap={slap} />
      <Hand pose="pinch" x={sx} y={sy} k={K} angle={84} mirror sleeve={SLEEVE.sam} tag={null} pinch={samPinch} layer="back" />
      <Hand pose="pinch" x={sx} y={sy} k={K} angle={84} mirror sleeve={SLEEVE.sam} tag={null} pinch={samPinch} layer="front" />
      <SvgLayer>
        <NameTag x={sx + 230} y={sy + 28} text="sam.near" k={2.6} tilt={2} />
      </SvgLayer>
    </AbsoluteFill>
  );
}

function Box({ part, open, hopY, sq, slap }: { part: "back" | "front"; open: number; hopY: number; sq: number; slap: { sx: number; sy: number; opacity: number } }) {
  return (
    <div
      style={{
        position: "absolute",
        left: BOX.left,
        top: BOX.top + hopY,
        width: BOX.w,
        height: BOX.h,
        scale: `${slap.sx * (1 + sq)} ${slap.sy * (1 - sq)}`,
        opacity: slap.opacity,
        transformOrigin: "50% 100%",
      }}
    >
      <GiftBox part={part} open={open} box={C.sky} ribbon={C.lemon} scale={BOX_S} />
    </div>
  );
}
