import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { type CharmFace, charmKick } from "../../brand/Charm";
import { C } from "../../brand/tokens";
import { PocketJeans, POCKET, SignedSlip, SLIP } from "../../illustration/props";
import { Sfx } from "../../lib/Sfx";
import { getScene } from "../../lib/timeline";
import { FPS } from "../../lib/time";
import { blinkAt, blinkSchedule, bonkAngle, CHARM_SWING, clamp, EASE2, eyeOpen, SPRING2 } from "../../motion";
import { TABS } from "../T5";
import { Browser, CAM_MID, type Cam, CameraView, camAt, Caption, type CharmAnim, FrameCharms, mixFace, RECORD_SCROLL, SalePage } from "../T5/sale";

/**
 * T6 · Blocked (110–116 s; the music drops to bass + tick on the "blocked" marker). A tab switch to Satchel #4: the
 * browser's scan passes its one record and the dashed outline turns red, `ETH · nonce 12 · Unused`. At the frame edge a
 * back pocket rises with C1's jagged signed slip poking out. #4's ETH charm winds back and bonks the red outline, but
 * there is nothing to stamp: it bounces off and looks at us. The verdict turns "Blocked: 1 unused signature" and Buy
 * stays greyed out with the reason under it. No horror sting. Caption: "Blocked: 1 unused signature".
 */

const SC = getScene("T6");
const fr = (sec: number) => Math.round(sec * FPS);


const T = {
  end: fr(SC.duration),
  camIn: [10, 28] as const,
  pocketIn: 8,
  scanA: 16,
  scanB: 34,
  redAt: fr(SC.wordAt("V24", "old")) + 2, // the outline turns red as the beam passes, on "old signature"
  slipOut: fr(SC.wordAt("V24", "signature")) + 6,
  contact: fr(SC.wordAt("V24", "move")), // the bonk lands on "could still MOVE coins"
  camOut: [fr(SC.wordAt("V24", "move")) + 2, fr(SC.wordAt("V24", "move")) + 14] as const, // back up to the verdict
  scrollDown: [4, 20] as const, // the page opens at its top, then scrolls to "The record"
};
const BLOCK = T.contact + 10; // the verdict turns Blocked
const CAP = BLOCK + 4; // caption contact

/** CU for #4: its one record card and the charm on the frame (browser px). */
const CAM_CU4: Cam = { x: 1010, y: 352, z: 2.55 };

function charmT6(f: number, fps: number): CharmAnim {
  const t = f / fps;
  const s = f - T.contact;
  // the bonk, then it bounces off the live signature: an extra kick back to the right (ETH's curious spring)
  let angle = bonkAngle(f, T.contact, CHARM_SWING.eth, fps) + charmKick("evm", (s - 1) / fps, -16);
  // a little startle when the outline turns red
  angle += charmKick("evm", t - (T.redAt + 2) / fps, -5);

  const blinks = blinkSchedule("t6-eth", 40, T.end + 30, []);
  let face: CharmFace = { blink: (1 - eyeOpen(f, blinks)) / 0.88, smile: 1, look: { x: -5, y: 0 } };
  // the scan passes: it follows the beam; the outline turns red: wide eyes and an "o"
  if (f >= T.scanA - 3 && f < T.redAt) face = mixFace(face, { ...face, look: { x: -5, y: interpolate(f, [T.scanA, T.scanB], [-4, 4], clamp) } }, 1);
  const r = f - T.redAt;
  if (r >= 0 && s < -12) face = mixFace(face, { look: { x: -7, y: 0 }, wide: 1, o: 0.7, smile: 0.4 }, interpolate(r, [0, 3], [0, 1], clamp));
  // ready, effort, impact
  if (s >= -12 && s < -2) face = { look: { x: -8, y: -1 }, wide: 0.5, smile: 0.1 };
  else if (s >= -2 && s < 4) face = { blink: 1, smile: 0.2, look: { x: -6, y: 0 } };
  else if (s >= 4) {
    // it turns to us: wide dots, flat mouth with a small "o", one long worried blink later
    const k = interpolate(s, [4, 9], [0, 1], clamp);
    const longBlink = 1 - Math.min(1, ...[T.contact + 52].map((b) => interpolate(f - b, [0, 3, 5, 9], [1, 0.12, 0.12, 1], clamp)));
    const quick = 1 - blinkAt(f, T.contact + 6); // the look change hides behind a blink
    face = mixFace({ look: { x: -6, y: 0 }, wide: 0.6, smile: 0.2 }, { look: { x: 0, y: 1 }, wide: 0.55, o: 0.35, smile: 0, blink: Math.max(longBlink, quick) / 0.88 }, k);
  }
  const squash = interpolate(s, [-1, 0, 2, 5], [0, -0.42, -0.42, 0], clamp);
  return { angle, face, squash };
}

export default function T6Scene() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const f = Math.min(frame, T.end);

  const cam = camAt(f, [
    { f: 0, cam: CAM_MID },
    { f: T.camIn[0], cam: CAM_MID },
    { f: T.camIn[1], cam: CAM_CU4 },
    { f: T.camOut[0], cam: CAM_CU4 },
    { f: T.camOut[1], cam: CAM_MID },
  ]);

  const spin = (f % 24) / 24;
  const arrive = spring({ frame: f, fps, config: SPRING2.land });
  const scan = interpolate(f, [T.scanA, T.scanB], [0, 1], { ...clamp, easing: EASE2.pan });
  const brackets = interpolate(f, [T.scanA - 6, T.scanA + 2, T.scanB, T.scanB + 8], [0, 1, 1, 0], clamp);
  const blocked = f >= BLOCK;
  const scroll =
    f < T.camOut[0] ? interpolate(f, [...T.scrollDown], [0, RECORD_SCROLL], { ...clamp, easing: EASE2.pan }) : interpolate(f, [T.camOut[0], T.camOut[1]], [RECORD_SCROLL, 0], { ...clamp, easing: EASE2.pan });
  const s = f - T.contact;

  // the pocket rises from below the frame (bottom-right), then the slip pokes up out of it
  const pk = 1.2; // prop scale
  const pocketY = interpolate(spring({ frame: f - T.pocketIn, fps, config: SPRING2.land }), [0, 1], [height + 150, height - 92]);
  const pocketX = 40;
  const slipRise = spring({ frame: f - T.slipOut, fps, config: SPRING2.land });
  const slipShown = 140 * slipRise; // px of slip above the pocket's opening

  return (
    <AbsoluteFill style={{ background: C.ground, overflow: "hidden" }}>
      <CameraView cam={cam}>
        <Browser tabs={TABS} active={1} url="satchel/s/4" account="carol.near" slap={f}>
          <SalePage
            id="4"
            recs={[
              {
                status: f < T.redAt ? "checking" : "unused",
                pop: f < T.redAt ? undefined : interpolate(f, [T.redAt, T.redAt + 10], [0, 1], clamp),
                warnPop: s >= 0 && s <= 8 ? s / 8 : undefined,
              },
            ]}
            scroll={scroll}
            scan={scan}
            scanBrackets={brackets}
            verdict={blocked ? "blocked" : "checking"}
            verdictPop={blocked ? interpolate(f, [BLOCK, BLOCK + 12], [0, 1], clamp) : undefined}
            buy="disabled"
            spin={spin}
            contentY={40 * (1 - arrive)}
          />
        </Browser>
        <div style={{ position: "absolute", left: 0, top: 0 }}>
          <FrameCharms chains={["evm"]} charms={[charmT6(f, fps)]} />
        </div>
      </CameraView>

      {/* the C1 callback: a back pocket at the frame edge with the jagged signed slip poking out */}
      <div style={{ position: "absolute", left: pocketX, top: pocketY }}>
        <div style={{ position: "absolute", left: 0, top: 0 }}>
          <PocketJeans part="back" fabric scale={pk} />
        </div>
        <div style={{ position: "absolute", left: ((POCKET.w - SLIP.w) / 2) * pk, top: 8 * pk - slipShown, clipPath: `inset(-40px -40px ${Math.max(0, SLIP.h * pk - slipShown - 60)}px -40px)` }}>
          <SignedSlip scale={pk} title="Send 0.40 ETH" tilt={-4 * slipRise} />
        </div>
        <div style={{ position: "absolute", left: 0, top: 0 }}>
          <PocketJeans part="front" fabric scale={pk} />
        </div>
      </div>

      <Caption frame={f} text={<>Blocked:<br />1 unused signature</>} contact={CAP} y={22} size={110} seed="t6-blocked" />

      <Sfx name="sticker-slap" at={4 / FPS} gainDb={-9} />
      <Sfx name="whoosh-soft" at={(T.camIn[0] + 8) / FPS} align="peak" gainDb={-11} />
      <Sfx name="pocket-slip" at={(T.slipOut + 6) / FPS} align="peak" gainDb={2} />
      <Sfx name="stamp-thunk" at={T.contact / FPS} gainDb={-5} />
      <Sfx name="boing-soft" at={(T.contact + 2) / FPS} gainDb={-3} />
      <Sfx name="error-boop" at={BLOCK / FPS} gainDb={0} />
      <Sfx name="whoosh-soft" at={(T.camOut[0] + 8) / FPS} align="peak" gainDb={-12} />
    </AbsoluteFill>
  );
}

