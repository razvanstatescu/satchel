import { AbsoluteFill } from "remotion";
import { Hand, NameTag, type SleeveStyle } from "../../illustration/characters";
import { CARD_RATIO, CardRig, type CardLook, RIDE_LAG, ramp, SvgLayer } from "../P5/rig";
import { HeavyFront, SLEEVE, TREASURY_CHIPS, TreasuryPennant } from "./cast";
import { FINALE } from "./timing";

/**
 * P6 finale (v4): the two new holders hold up their Satchels and the two cards swing in sync, one extreme per beat,
 * the charms riding at 1.5× with their eyes closed in joy, up to the music stop at 59.0 s (C1's Night falls on it).
 * Staged in depth so the frame keeps ONE dominant coral (brand rule; the bible lets a second band share a frame only
 * small and away from the focus): #21, just handed over under its pennant, is the hero up front; the heavy #30 hangs
 * smaller, further back.
 */

const SYNC = FINALE + 15; // first in-sync extreme (on a beat)
const OMEGA = (2 * Math.PI) / 30; // one swing per beat: extremes every 15 f
const AMP = 9;

/** the shared sway: in sync, extremes on the beats, easing in over the first 10 f */
export const syncAngle = (f: number) => AMP * Math.cos(OMEGA * (f - SYNC)) * ramp(f, FINALE, FINALE + 10);

interface Holder {
  x: number; // card centre
  top: number; // card top
  w: number; // card width
  sleeve: SleeveStyle;
  tag: string | null;
  look: (f: number, k: number, w: number) => CardLook;
}

// back row first (drawn under the hero)
const HOLDERS: Holder[] = [
  {
    x: 1390,
    top: 372,
    w: 320,
    sleeve: SLEEVE.buyer,
    tag: null,
    look: (_f, _k, w) => ({ id: "30", blinkSeed: "fin30", front: (lift) => <HeavyFront width={w} lift={lift} />, fx: () => ({ face: { smile: 1.5 } }) }),
  },
  {
    x: 860,
    top: 470,
    w: 520,
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

export function FinaleStage({ frame }: { frame: number }) {
  const theta = syncAngle(frame);
  const r = (theta * Math.PI) / 180;
  return (
    <AbsoluteFill>
      {HOLDERS.map((c, n) => {
        const k = c.w / 400;
        const hc = c.w * CARD_RATIO;
        // the hands rock their cards: the pivot moves a little, in phase with the swing (scaled with depth)
        const drive = -6 * k * Math.cos(OMEGA * (frame - SYNC)) * ramp(frame, FINALE, FINALE + 10);
        // the pinch point (card top centre) turned about the card's pivot (50% -6%)
        const d = 14 * k + 0.06 * hc;
        const px = c.x + drive - d * Math.sin(r);
        const py = c.top - 0.06 * hc + d * Math.cos(r);
        const hand = { pose: "pinch" as const, x: px, y: py, k, angle: 180, sleeve: c.sleeve, tag: null, pinch: 1 };
        return (
          <AbsoluteFill key={n}>
            <Hand {...hand} layer="back" />
            <CardRig
              left={c.x - c.w / 2 + drive}
              top={c.top}
              width={c.w}
              rotate={theta}
              charmWorld={(i) => 1.5 * syncAngle(frame - RIDE_LAG[i])}
              joy={() => ramp(frame, FINALE + 2, FINALE + 5)}
              frame={frame}
              look={c.look(frame, k, c.w)}
            />
            <Hand {...hand} layer="front" />
            {c.tag ? (
              <SvgLayer>
                <NameTag x={c.x + drive} y={c.top - 300 * k} text={c.tag} k={1.6 + 0.8 * k} tilt={n % 2 ? 2 : -2} />
              </SvgLayer>
            ) : null}
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
}
