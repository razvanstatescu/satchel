import { AbsoluteFill, interpolate, spring, useCurrentFrame } from "remotion";
import { C } from "../../brand/tokens";
import { GiveSheet, SatchelScreen } from "../../components/ui";
import { charmKick, Hand, handPoint, NameTag, PhoneFrame } from "../../illustration/characters";
import { getScene } from "../../lib/timeline";
import { Sfx } from "../../lib/Sfx";
import { clamp, EASE2, HANDOFF, pressAt, SPRING2 } from "../../motion";
import { Caption, CHAINS3, FPS, ramp, sec, SvgLayer, SwingCard, swingGeom, type SwingOpts, whip, WhipLayer } from "./rig";

/**
 * P5 · Give (38.5–46 s). The Give sheet ("Give Satchel #7" → bob.near, Account found, "Bob gets everything inside"),
 * alice presses "Give it to bob.near" on a downbeat, a whip out of the phone, then THE SWING at hero size from alice's
 * hand to bob's: lift and 10° lean, the hand-off pendulum, the charms riding with their eyes closed (1.5×, 2/2/3 f),
 * the jingle on the apex, the landing on the bar downbeat. alice waves. Captions "Everything inside goes too." →
 * "No bridge." + "No wrapped tokens." (each on its VO phrase).
 */

const SC = getScene("P5");
const V10 = SC.line("V10");
const starts = (V10.sentenceStarts as number[] | undefined) ?? [0, 3.82, 4.78];
const BEAT = 0.5;
const BAR = 2;
/** first beat / bar downbeat (scene frame) at or after a scene time */
const onBeat = (t: number) => sec(Math.ceil((SC.start + t - 1e-6) / BEAT) * BEAT - SC.start);
const onBar = (t: number) => sec(Math.ceil((SC.start + t - 1e-6) / BAR) * BAR - SC.start);

const F = {
  everything: sec(SC.wordAt("V10", "everything")),
  bridge: sec(V10.start + starts[1]),
  wrapped: sec(V10.start + starts[2]),
  press: onBeat(SC.wordAt("V10", "friend")), // "Give it to bob.near" pressed on the beat after "friend" (40.0 s)
  contact: onBar(SC.wordAt("V10", "inside")), // the swing lands on the bar downbeat after "inside" (42.0 s)
  end: sec(SC.duration),
};
const LIFT = F.contact - HANDOFF.contact; // the hand-off clock's zero
const CUT = F.press + 11; // whip out of the phone
const TYPE0 = 6;
const BOUNCE = onBeat(V10.end + 0.4); // the first beat after the VO has finished (45.5 s)
const FOUND = TYPE0 + 22;

// stage: hero card, alice (left) → bob (right)
const O: SwingOpts = { fromX: 625, toX: 1295, y: 440, width: 600 };
const K = O.width / 400;
const GRIP = 9; // the pinch sits just inside the top corners
const PHONE_K = 2.3;
const PHONE_X = 960 - (406 * PHONE_K) / 2;
const PHONE_Y = -832;

export default function P5() {
  const frame = useCurrentFrame();
  const w = whip(frame, CUT, 1);
  return (
    <AbsoluteFill style={{ background: C.ground, overflow: "hidden" }}>
      {w.outShow ? (
        <WhipLayer x={w.outX} stretch={w.stretch}>
          <PhoneStage frame={frame} />
        </WhipLayer>
      ) : (
        <WhipLayer x={w.inX} stretch={w.stretch}>
          <SwingStage frame={frame} />
        </WhipLayer>
      )}
      <Caption text="Everything inside goes too." at={F.everything} until={F.bridge - 4} size={112} width={1000} seed="p5-a" />
      <Caption text="No bridge." at={F.bridge} size={112} seed="p5-b" />
      <Caption text="No wrapped tokens." at={F.wrapped} size={112} y={100 + 118} seed="p5-c" />
      <Sounds />
    </AbsoluteFill>
  );
}

// ── 1. the Give sheet in the phone ──────────────────────────────────────────────────────────────────────────────

function PhoneStage({ frame }: { frame: number }) {
  const open = spring({ frame: frame + 4, fps: FPS, config: SPRING2.land }); // already rising on the cut in
  const typed = ramp(frame, TYPE0, TYPE0 + 16);
  const lookup = frame < TYPE0 + 17 ? "none" : frame < FOUND ? "checking" : "found";
  const caret = frame < TYPE0 + 17 ? 1 : 0;
  const pr = pressAt(frame, F.press, 4, FPS); // button: pressed = 4 UI px into its shadow
  const press = Math.max(0, Math.min(1, -pr.lift / 4));
  // alice's index finger arrives 6 f before the press and pushes with the button
  const handIn = spring({ frame: frame - (F.press - 14), fps: FPS, config: SPRING2.land });
  const btn = { x: PHONE_X + (8 + 300) * PHONE_K, y: PHONE_Y + (8 + 743) * PHONE_K };
  const hx = btn.x + interpolate(handIn, [0, 1], [520, 0]);
  const hy = btn.y + interpolate(handIn, [0, 1], [420, 0]) + 4 * PHONE_K * press;
  const squash = frame >= F.press && frame < F.press + 3 ? 0.04 : 0;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: PHONE_X, top: PHONE_Y }}>
        <PhoneFrame k={PHONE_K} width={406} height={860}>
          <SatchelScreen
            owner="alice.near"
            overlay={<GiveSheet open={open} typed={typed} caret={caret} lookup={lookup} press={press} spin={(frame % 24) / 24} />}
          />
        </PhoneFrame>
      </div>
      {handIn > 0.001 ? (
        <div style={{ position: "absolute", inset: 0, scale: `${1 - squash} ${1 + squash}`, transformOrigin: `${hx}px ${hy}px` }}>
          <Hand pose="tap" x={hx} y={hy} k={PHONE_K} size={1.2} angle={38} mirror sleeve="alice" press={press} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

// ── 2. the swing ────────────────────────────────────────────────────────────────────────────────────────────────

function SwingStage({ frame }: { frame: number }) {
  const t = frame - LIFT;
  // camera: follows the card on `carry` (it lags, so the card leads the frame), then a slow push toward bob's card
  // once it has landed. The captions sit outside this layer, so text never moves.
  const camX = 110 * spring({ frame: t - 8, fps: FPS, config: SPRING2.carry });
  const push = interpolate(frame, [F.contact, F.end], [1, 1.03], { ...clamp, easing: EASE2.pan });

  // alice (left): pinches the top-left corner; follows the card for 2 f of the lift, lets go and lowers her hand,
  // then raises it about the wrist (the sleeve stays put) and waves: ±12° about the wrist, 3 swings in 18 f, twice.
  const aliceAt = swingGeom(Math.min(t, 2), O).point(GRIP, GRIP + 3);
  const release = ramp(t, 1, 6);
  const recoil = interpolate(t, [2, 14], [0, 1], { ...clamp, easing: EASE2.out });
  const pinchProps = { pose: "pinch" as const, x: aliceAt.x - 22 * recoil, y: aliceAt.y + 30 * recoil, k: K, angle: 84, sleeve: "alice" as const, tag: null };
  const wrist = handPoint(pinchProps, "wrist");
  const raise = interpolate(frame, [F.contact - 2, F.contact + 4], [0, 1], { ...clamp, easing: EASE2.out });
  const waveT = frame - (F.contact + 4);
  const wobble = waveT < 0 ? 0 : 12 * Math.sin((Math.PI * waveT) / 6) * (waveT < 18 ? 1 : waveT < 24 ? 0 : waveT < 42 ? 0.8 : 0);
  const handAngle = 84 + (14 - 84) * raise + wobble;
  const waving = raise > 0.6;
  const aliceExit = interpolate(frame, [F.wrapped + 2, F.wrapped + 12], [0, 1], { ...clamp, easing: EASE2.fall });
  const aliceProps = { ...pinchProps, pinch: 1 - release };
  const aliceTag = { x: wrist.x - 200 + 120 * raise, y: wrist.y + 18 + 10 * raise };

  // a little bounce of bob's hand on the 45.5 s beat (after the last caption has been read): the card and charms answer
  const bounce = -14 * Math.sin(Math.PI * ramp(frame, BOUNCE, BOUNCE + 8)) * (frame < BOUNCE + 8 ? 1 : 0);

  // bob (right): slides in, waits with an open pinch, rises 6 px 2 f before contact, dips 8 px on it, then holds the corner
  const bobIn = spring({ frame: frame - CUT, fps: FPS, config: SPRING2.land });
  // the catch: the right edge just below the band (a thumb never covers the band's sticker S)
  const corner = swingGeom(Math.max(t, HANDOFF.contact), O).point(O.width - GRIP, 0.36 * O.width * (252 / 400));
  const rise = -6 * ramp(t, HANDOFF.contact - 4, HANDOFF.contact - 2);
  const dip = t >= HANDOFF.contact ? 8 * (1 - spring({ frame: t - HANDOFF.contact, fps: FPS, config: SPRING2.rebound })) : 0;
  const bx = corner.x + 340 * (1 - bobIn);
  const by = corner.y + 40 * (1 - bobIn) + (t < HANDOFF.contact ? rise : dip) + bounce;
  const bobPinch = 0.15 + 0.85 * ramp(t, HANDOFF.contact - 3, HANDOFF.contact);

  // charms: look at bob as he arrives (SOL, ETH, BTC), ride with joy, then look up at their new holder
  const lookBob = (i: number) => ramp(frame, CUT + 9 + [4, 2, 0][i], CUT + 12 + [4, 2, 0][i]);
  const lookUp = (i: number) => ramp(t, HANDOFF.contact + 6 + [4, 2, 0][i], HANDOFF.contact + 9 + [4, 2, 0][i]) * (1 - ramp(frame, F.bridge - 6, F.bridge));
  const fx = (i: number) => ({
    worldAngle: charmKick(CHAINS3[i], (frame - BOUNCE - 4 - [4, 2, 0][i]) / FPS, i === 1 ? -4 : 4),
    face: {
      look: { x: 6 * lookBob(i) * (1 - ramp(t, 0, 3)) + 3 * lookUp(i), y: -4 * lookUp(i) },
      smile: 1 + 0.35 * lookUp(i) + 0.3 * ramp(frame, BOUNCE, BOUNCE + 4),
    },
  });

  return (
    <AbsoluteFill style={{ translate: `${-camX}px 0`, scale: `${push}`, transformOrigin: `${O.toX}px ${O.y + 200}px` }}>
      {/* alice behind the card (the pinch's thumb crosses in front until she lets go) */}
      {aliceExit < 1 ? (
        <div style={{ position: "absolute", inset: 0, translate: `${-560 * aliceExit}px ${60 * aliceExit}px` }}>
          {waving ? (
            <Hand pose="wave" x={wrist.x + 120 * raise} y={wrist.y + 10 * raise} anchor="wrist" k={K} angle={handAngle} arm={84 - handAngle} sleeve="alice" tag={null} />
          ) : raise > 0 ? (
            <Hand {...aliceProps} x={wrist.x + 120 * raise} y={wrist.y + 10 * raise} anchor="wrist" angle={handAngle} arm={84 - handAngle} pinch={0} />
          ) : (
            <Hand {...aliceProps} layer="back" />
          )}
          <SvgLayer>
            <NameTag x={aliceTag.x} y={aliceTag.y} text="alice.near" k={2.6} tilt={-2} />
          </SvgLayer>
        </div>
      ) : null}
      <Hand pose="pinch" x={bx} y={by} k={K} angle={84} mirror sleeve="bob" tag={null} pinch={bobPinch} layer="back" />
      <SvgLayer>
        <NameTag x={bx + 330} y={by + 30} text="bob.near" k={2.6} tilt={2} />
      </SvgLayer>
      <SwingCard t={t} o={O} frame={frame} fx={fx} blinkSeed="p5" offsetY={bounce} />
      {raise <= 0 && aliceExit < 1 ? <Hand {...aliceProps} layer="front" /> : null}
      <Hand pose="pinch" x={bx} y={by} k={K} angle={84} mirror sleeve="bob" tag={null} pinch={bobPinch} layer="front" />
    </AbsoluteFill>
  );
}

// ── sound ───────────────────────────────────────────────────────────────────────────────────────────────────────

function Sounds() {
  const at = (f: number) => f / FPS;
  return (
    <>
      <Sfx name="paper-slide" at={at(5)} align="peak" gainDb={-2} />
      <Sfx name="type-run" at={at(TYPE0)} gainDb={-4} rate={1.4} />
      <Sfx name="pop" at={at(FOUND)} gainDb={-2} />
      <Sfx name="button-thock" at={at(F.press)} gainDb={-3} />
      <Sfx name="whoosh-zip" at={at(CUT)} align="peak" gainDb={0} />
      <Sfx name="swing-swish" at={at(LIFT + 10)} align="peak" gainDb={-1} />
      <Sfx name="charm-jingle" at={at(LIFT + HANDOFF.apex)} align="peak" gainDb={2} />
      <Sfx name="sticker-slap" at={at(F.contact)} gainDb={-4} />
      <Sfx name="chain-clink" at={at(F.contact)} align="peak" gainDb={0} />
    </>
  );
}
