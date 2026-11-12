import { AbsoluteFill, interpolate, random, spring } from "remotion";
import { C } from "../../brand/tokens";
import { charmKick, Hand, NameTag } from "../../illustration/characters";
import { clamp, EASE2, HANDOFF, SPRING2 } from "../../motion";
import { CARD_RATIO, CHAINS3, FPS, ramp, REACT_LAG, SvgLayer, SwingCard, swingGeom, type SwingOpts } from "../P5/rig";
import { SLEEVE, TREASURY_CHIPS, TreasuryPennant } from "./cast";
import { CONTACT, CUT, LIFT } from "./timing";

/**
 * P6c · hand over a treasury. A relay: old-team.near runs in holding Satchel #21 by its edge like a baton (the
 * "Team treasury" pennant flies from a pole on its corner: a label outside the card, the band still reads
 * "Satchel #21"); new-team.near reaches back with an open hand; the card swings across and is grabbed on the 56.0 s
 * downbeat. Speed lines stream behind; both hands bob at a running cadence (one stride per beat).
 */

const O: SwingOpts = { fromX: 640, toX: 1290, y: 420, width: 500 };
const K = O.width / 400;
const H = O.width * CARD_RATIO;
const GRIP_Y = H * 0.56;
const SPEED_LINES = Array.from({ length: 9 }, (_, i) => ({
  y: 330 + 640 * random(`relay-y-${i}`),
  len: 120 + 220 * random(`relay-l-${i}`),
  x0: 2400 * random(`relay-x-${i}`),
  v: 34 + 18 * random(`relay-v-${i}`),
}));

export function RelayStage({ frame }: { frame: number }) {
  const t = frame - LIFT.c;
  const f = frame - CUT.c;
  const push = interpolate(frame, [CONTACT.c, CONTACT.c + 40], [1, 1.02], { ...clamp, easing: EASE2.pan });
  // running cadence: each hand bobs once per beat, out of phase
  const bobOld = 6 * Math.sin((2 * Math.PI * f) / 15);
  const bobNew = 6 * Math.sin((2 * Math.PI * f) / 15 + Math.PI);
  const offsetY = bobOld * (1 - ramp(t, 0, 4)) + bobNew * ramp(t, HANDOFF.contact, HANDOFF.contact + 4);
  const lift = swingGeom(t, O).m.lift;

  // old-team: grips the left edge like a baton, lets go on the lift, falls back (the runner slows)
  const oldAt = swingGeom(Math.min(t, 2), O).point(-4, GRIP_Y);
  const oldGrip = 1 - ramp(t, 1, 5);
  const fallBack = interpolate(t, [3, 22], [0, 1], { ...clamp, easing: EASE2.out });
  const ox = oldAt.x - 120 * fallBack;
  const oy = oldAt.y + (t < 0 ? bobOld : 0) + 40 * fallBack;

  // new-team: reaches back with an open hand, then grabs the right edge on contact and holds on
  const newIn = spring({ frame: f - 4, fps: FPS, config: SPRING2.land });
  const edge = swingGeom(Math.max(t, HANDOFF.contact), O).point(O.width + 4, GRIP_Y);
  const reach = 1 - ramp(t, HANDOFF.contact - 3, HANDOFF.contact);
  const nx = edge.x + 34 * reach + 300 * (1 - newIn);
  const ny = edge.y + 10 * reach + bobNew + (t >= HANDOFF.contact ? 8 * (1 - spring({ frame: t - HANDOFF.contact, fps: FPS, config: SPRING2.rebound })) : 0);
  const grabbing = t >= HANDOFF.contact - 3;
  // new-team's tag rides with the hand (no tag before the hand arrives); its offset keeps its right edge ≥ 90 px inside
  // the frame with the hand at rest (and the 2 % push)
  const NEW_TAG_DX = Math.min(190, 1690 - (edge.x + 34));
  const newTagX = nx + 34 * (1 - reach) + NEW_TAG_DX; // the entrance moves it; the reach → grab shift doesn't
  // QA verify N2: old-team's tag pops out (6 f) just before the lift, so the leaning card never meets it and it never
  // has to follow the runner's fall-back toward the frame edge
  const oldTagS = 1 - interpolate(t, [-3, -1, 3], [0, -0.08, 1], { ...clamp, easing: EASE2.fall });

  const fx = (i: number) => {
    const chain = CHAINS3[i];
    const lag = REACT_LAG[i];
    // eyes forward to the next runner, then the ride, then a proud little bounce
    const ahead = ramp(f, 8 + lag, 11 + lag) * (1 - ramp(t, -3, 0));
    let angle = charmKick(chain, (frame - (CONTACT.c + 12) - lag) / FPS, 3);
    angle += 1.5 * Math.sin((2 * Math.PI * (f - lag)) / 15) * (1 - ramp(t, -2, 2)); // jiggle with the stride
    return { worldAngle: angle, face: { look: { x: 6 * ahead, y: -1 * ahead }, smile: 1.2 } };
  };

  const flutter = 3 * Math.sin((2 * Math.PI * f) / 10) - 0.6 * swingGeom(t - 2, O).m.rotate;

  return (
    <AbsoluteFill>
      <SvgLayer>
        {SPEED_LINES.map((s, i) => {
          const x = ((((s.x0 - s.v * f) % 2600) + 2600) % 2600) - 340;
          return <line key={i} x1={x} y1={s.y} x2={x + s.len} y2={s.y} stroke={C.lineStrong} strokeWidth={6} strokeLinecap="round" opacity={1} />;
        })}
      </SvgLayer>
      <AbsoluteFill style={{ scale: `${push}`, transformOrigin: `${O.toX}px ${O.y + 200}px` }}>
        <Hand pose="grab" x={ox} y={oy} k={K} angle={90} sleeve={SLEEVE.oldTeam} tag={null} grip={oldGrip} layer="back" />
        {grabbing ? (
          <Hand pose="grab" x={nx} y={ny} k={K} angle={90} mirror sleeve={SLEEVE.newTeam} tag={null} grip={ramp(t, HANDOFF.contact - 3, HANDOFF.contact)} layer="back" />
        ) : (
          <Hand pose="reach" x={nx} y={ny} k={K} angle={96} mirror sleeve={SLEEVE.newTeam} tag={null} spread={0.35} />
        )}
        <SwingCard t={t} o={O} frame={frame} id="21" chips={TREASURY_CHIPS} fx={fx} blinkSeed="relay21" offsetY={offsetY}>
          <TreasuryPennant k={K} lift={lift} flutter={flutter} />
        </SwingCard>
        <Hand pose="grab" x={ox} y={oy} k={K} angle={90} sleeve={SLEEVE.oldTeam} tag={null} grip={oldGrip} layer="front" />
        {grabbing ? <Hand pose="grab" x={nx} y={ny} k={K} angle={90} mirror sleeve={SLEEVE.newTeam} tag={null} grip={ramp(t, HANDOFF.contact - 3, HANDOFF.contact)} layer="front" /> : null}
        <SvgLayer>
          {oldTagS > 0.01 ? <NameTag x={240} y={oy + 30} text="old-team.near" k={2.4 * oldTagS} tilt={-2} /> : null}
          <NameTag x={newTagX} y={ny + 30} text="new-team.near" k={2.4} tilt={2} />
        </SvgLayer>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
