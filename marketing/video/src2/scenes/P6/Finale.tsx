import { AbsoluteFill } from "remotion";
import { Hand, NameTag, type SleeveStyle } from "../../illustration/characters";
import { CARD_RATIO, CardRig, type CardLook, RIDE_LAG, ramp, SvgLayer } from "../P5/rig";
import { HeavyFront, SLEEVE, TREASURY_CHIPS, TreasuryPennant } from "./cast";
import { END, FINALE } from "./timing";

/**
 * P6 finale (v5): the two new holders hold up their Satchels and the two cards rock in sync, the charms riding at 1.5×
 * with their eyes closed in joy, settling level on the music stop (C1's Night blind then falls over this frozen final
 * pose). v5 (QA r2 #4, #5): the holders grip the cards by their outer edges from the sides (new-team.near
 * by #21's right edge, as it caught it in the relay; the buyer by #30's left edge), so "Hand over a treasury." holds
 * over the finale with the caption band clear; the name tag stays ≥ 90 px inside the frame. Staged in depth so the
 * frame keeps ONE dominant coral (the bible lets a second band share a frame only small and away from the focus):
 * #21, under its pennant, is the hero; the heavy #30 is smaller, further back.
 */

const AMP = 6;
/** frames from the arrival to the scene's last frame (P6 freezes there under C1's Night blind) */
const SPAN = Math.max(8, END - 1 - FINALE);

/**
 * The shared rock, in sync for both cards: they arrive leaning AMP°, swing back once (−0.6 AMP) and come level exactly
 * on the last frame, so the frozen final pose is a clean still. It stretches with the tail if the timeline changes.
 */
export const syncAngle = (f: number) => {
  const p = Math.max(0, Math.min(1, (f - FINALE) / SPAN));
  return AMP * (1 - 0.6 * p) * Math.cos(1.5 * Math.PI * p);
};

interface Holder {
  x: number; // card centre
  top: number; // card top
  w: number; // card width
  side: "left" | "right"; // the edge the holder grips (the rock's pivot)
  gripY: number; // where on that edge, as a share of the card's height (clear of the value line and the bar)
  sleeve: SleeveStyle;
  tag: string | null;
  look: (f: number, k: number, w: number) => CardLook;
}

// back row first (drawn under the hero)
const HOLDERS: Holder[] = [
  {
    x: 420,
    top: 436,
    w: 320,
    side: "left",
    gripY: 0.62, // below "≈ $171,000.00", so the glove never covers the value
    sleeve: SLEEVE.buyer,
    tag: null,
    look: (_f, _k, w) => ({ id: "30", blinkSeed: "fin30", front: (lift) => <HeavyFront width={w} lift={lift} />, fx: () => ({ face: { smile: 1.5 } }) }),
  },
  {
    x: 1010,
    top: 424,
    w: 520,
    side: "right",
    gripY: 0.56, // as it caught it in the relay
    sleeve: SLEEVE.newTeam,
    tag: "new-team.near",
    look: (f, k) => ({
      id: "21",
      chips: TREASURY_CHIPS,
      blinkSeed: "fin21",
      fx: () => ({ face: { smile: 1.5 } }),
      children: <TreasuryPennant k={k} flutter={3 * Math.sin((2 * Math.PI * f) / 10) - 0.6 * syncAngle(f - 2)} />,
    }),
  },
];

/** rotate a point about a pivot by `deg` (CSS sense: clockwise on screen) */
const turn = (p: { x: number; y: number }, c: { x: number; y: number }, deg: number) => {
  const r = (deg * Math.PI) / 180;
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * Math.cos(r) - dy * Math.sin(r), y: c.y + dx * Math.sin(r) + dy * Math.cos(r) };
};

export function FinaleStage({ frame }: { frame: number }) {
  const theta = syncAngle(frame);
  return (
    <AbsoluteFill>
      {HOLDERS.map((c, n) => {
        const k = c.w / 400;
        const hc = c.w * CARD_RATIO;
        const left = c.x - c.w / 2;
        const right = c.side === "right";
        // the pivot is the gripped edge point: the hand and its card rock together about it. The left holder's fingers
        // stop ~10 px inside the edge, short of the value line's "≈" (it starts 16 px in on this small card)
        const pivot = { x: right ? left + c.w : left, y: c.top + c.gripY * hc };
        const grip = { x: right ? pivot.x + 4 : pivot.x - 26, y: pivot.y };
        const hand = { pose: "grab" as const, x: grip.x, y: grip.y, k, angle: 90, mirror: right, sleeve: c.sleeve, tag: null, grip: 1 };
        const rock = { position: "absolute" as const, inset: 0, rotate: `${theta}deg`, transformOrigin: `${pivot.x}px ${pivot.y}px` };
        const tagAt = turn({ x: grip.x + (right ? 240 : -240), y: grip.y + 44 }, pivot, theta);
        return (
          <AbsoluteFill key={n}>
            <div style={rock}>
              <Hand {...hand} layer="back" />
            </div>
            <CardRig
              left={left}
              top={c.top}
              width={c.w}
              rotate={theta}
              charmWorld={(i) => 1.5 * syncAngle(frame - RIDE_LAG[i])}
              joy={() => ramp(frame, FINALE + 2, FINALE + 5)}
              frame={frame}
              look={{ ...c.look(frame, k, c.w), style: { transformOrigin: `${right ? 100 : 0}% ${c.gripY * 100}%` } }}
            />
            <div style={rock}>
              <Hand {...hand} layer="front" />
            </div>
            {c.tag ? (
              <SvgLayer>
                <NameTag x={Math.min(1690, tagAt.x)} y={tagAt.y} text={c.tag} k={2.4} tilt={2} />
              </SvgLayer>
            ) : null}
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
}
