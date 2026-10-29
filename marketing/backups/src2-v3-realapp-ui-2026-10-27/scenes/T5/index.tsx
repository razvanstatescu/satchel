import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { type CharmFace, charmKick } from "../../brand/Charm";
import { C, type Chain } from "../../brand/tokens";
import { Sfx } from "../../lib/Sfx";
import { getScene } from "../../lib/timeline";
import { FPS } from "../../lib/time";
import { blinkSchedule, bonkAngle, CHARM_LAG, CHARM_SWING, clamp, EASE2, eyeOpen, slapAt, SPRING2 } from "../../motion";
import {
  Browser,
  CAM_MID,
  type Cam,
  CameraView,
  camAt,
  Caption,
  type CharmAnim,
  FrameCharms,
  mixFace,

  type RecAnim,
  RECORD_SCROLL,
  recTops,
  rowMid,
  SalePage,
  SparkPoints,
} from "./sale";

/**
 * T5 · The check (99.5–110 s). carol.near's browser opens Satchel #7's sale page: "Checking in your browser…" and a
 * scan beam sweeps the three records (V22). On V23's three phrases each record's charm winds back and bonks its own
 * outline, and the chain's answer stamps in: ETH "Nonce used", BTC "Coin spent", SOL "Blockhash expired". The verdict
 * pops ("Clean history" · "Clean. No past signature can move these coins."), the Buy button wakes up coral and the
 * charms cheer. Captions: "Checked in your browser." → (the stamps) → "Clean history."
 */

const SC = getScene("T5");
const fr = (sec: number) => Math.round(sec * FPS);
const V22 = SC.line("V22");
const V23 = SC.line("V23");
const PHRASES = ((V23.phrases as { absStart: number }[] | undefined) ?? []).map((p) => p.absStart - SC.start);

// rows in signing order (P3: BTC, ETH, SOL); the V23 phrases go ETH, BTC, SOL
export const ROWS7: { chain: Chain; label: string }[] = [
  { chain: "btc", label: "BTC · coin 7d…e2:1" },
  { chain: "evm", label: "ETH · nonce 1" },
  { chain: "sol", label: "SOL · blockhash 9f…" },
];
const KIT: Record<Chain, "btc" | "eth" | "sol"> = { btc: "btc", evm: "eth", sol: "sol" };

export const T5 = {
  /** contact frames (the V23 phrase onsets) per row: BTC "Coin spent", ETH "Nonce used", SOL "Blockhash expired" */
  contact: [fr(PHRASES[1] ?? 6.08), fr(PHRASES[0] ?? 4.62), fr(PHRASES[2] ?? 7.62)],
  browser: fr(SC.wordAt("V22", "browser")),
  checks: fr(SC.wordAt("V22", "checks")),
  v22End: fr(V22.end),
  v23End: fr(V23.end),
  end: fr(SC.duration),
};

const T = {
  capIn: T5.browser, // "Checked in your browser." lands on "browser"
  capOut: Math.min(T5.v22End - 15, T5.contact[1] - 36),
  scanA: T5.checks + 3,
  scanB: T5.v22End - 6,
  camIn: [T5.contact[1] - 31, T5.contact[1] - 12] as const, // land before ETH's wind-up
  camOut: [T5.contact[2] + 19, T5.contact[2] + 35] as const,
  verdict: T5.contact[2] + 37,
  capClean: T5.contact[2] + 41,
  wake: T5.contact[2] + 53,
  cheer: T5.contact[2] + 56,
};

/** CU: the history panel (header, verdict, three records and their charms) fills the frame. */
const CAM_CU: Cam = { x: 1010, y: 482, z: 2.55 };

export const TABS = [{ title: "Satchel #7" }, { title: "Satchel #4" }];

/** The Buy wake's lemon glints, on the button's flanks (page px) so they never cover a word. */
const BUY_SPARKS = [
  { x: 272, y: 478, r: 15 },
  { x: 708, y: 486, r: 17 },
  { x: 274, y: 432, r: 10 },
  { x: 712, y: 434, r: 11 },
  { x: 270, y: 522, r: 8 },
  { x: 704, y: 530, r: 9 },
];
/** the right column scrolls down to "The record" for the scan and the stamps, then back up to the verdict */
const SCROLL_DOWN = [32, 52] as const;

const STAMP_LEN = 10; // frames for the stamp impression to settle (props Stamp `impact` 0.22 → 1)

/** Face + angle of the charm on record row r at frame f (T5's choreography). */
function charmT5(f: number, r: number, fps: number): CharmAnim {
  const chain = ROWS7[r].chain;
  const C0 = T5.contact[r];
  const kit = KIT[chain];
  const t = f / fps;
  // the bonk (wind back −25°, strike +55°, home on the personality spring)
  let angle = bonkAngle(f, C0, CHARM_SWING[kit], fps);
  // sympathetic jiggles when a neighbour's stamp thunks (personality lag), and the cheer's little swing
  T5.contact.forEach((c, j) => {
    if (j !== r) angle += charmKick(chain, t - (c + CHARM_LAG[kit] + 1) / fps, j < r ? -3 : 3);
  });
  angle += charmKick(chain, t - (T.cheer + CHARM_LAG[kit] + 8) / fps, 7);

  // eyes: blinks on a per-charm clock, forced one after the landing
  const blinks = blinkSchedule(`t5-${chain}`, 30, T5.end + 30, [C0 + 26]);
  const open = eyeOpen(f, blinks);
  let face: CharmFace = { blink: (1 - open) / 0.88, smile: 1, look: { x: -5, y: 0 } };

  // the scan beam: eyes follow it as it passes (it sweeps rows top → bottom)
  const tops = recTops("checking", ["checking", "checking", "checking"], RECORD_SCROLL);
  const rowsH = tops[2] + 76 - tops[0];
  const scanP = interpolate(f, [T.scanA, T.scanB], [0, 1], { ...clamp, easing: EASE2.pan });
  if (f > T.scanA - 4 && f < T.scanB + 8) {
    const beamY = tops[0] + scanP * rowsH;
    const d = Math.max(-1, Math.min(1, (beamY - rowMid(r)) / 70));
    const near = 1 - Math.min(1, Math.abs(beamY - rowMid(r)) / 70);
    face = mixFace(face, { ...face, look: { x: -4, y: 5 * d }, wide: 0.45 * near }, 1);
  }
  // reactions to the other charms' stamps: a glance toward the stamp that just landed (SOL first, BTC last)
  T5.contact.forEach((c, j) => {
    if (j === r) return;
    const s = f - c - CHARM_LAG[kit];
    if (s >= 0 && s < 34) {
      const k = interpolate(s, [0, 3, 26, 34], [0, 1, 1, 0], clamp);
      face = mixFace(face, { ...face, look: { x: -6, y: j < r ? -5 : 5 }, smile: 1.25 }, k);
    }
  });
  // its own bonk: ready (wide), effort (flat), contact (eyes shut tight), joy, then it admires its stamp
  const s = f - C0;
  if (s >= -18 && s < -9) face = mixFace(face, { ...face, look: { x: -8, y: -1 }, wide: 0.7, smile: 0.8 }, interpolate(s, [-18, -14], [0, 1], clamp));
  else if (s >= -9 && s < -2) face = { ...face, blink: 0, look: { x: -8, y: -2 }, wide: 0.5, smile: 0.2 };
  else if (s >= -2 && s < 4) face = { ...face, blink: 1, smile: 0.4, look: { x: -6, y: 0 } };
  else if (s >= 4 && s < 30) face = mixFace({ joy: 1, smile: 1.6, look: { x: -6, y: 1 } }, { blink: face.blink, smile: 1.3, look: { x: -8, y: 1 } }, interpolate(s, [16, 30], [0, 1], clamp));
  else if (s >= 30) face = { ...face, smile: 1.3, look: { x: -8, y: 1 } };
  // after the last stamp: they look up at the verdict, then cheer
  if (f >= T.verdict - 6) {
    const k = interpolate(f, [T.verdict - 6, T.verdict - 3], [0, 1], clamp);
    face = mixFace(face, { ...face, look: { x: -6, y: -5 }, smile: 1.35 }, k);
  }
  const ch = f - (T.cheer + CHARM_LAG[kit]);
  let hop = 0;
  if (ch >= 0) {
    face = ch < 8 ? { ...face, joy: 1, smile: 1.6 } : mixFace({ ...face, joy: 1, smile: 1.6 }, { ...face, joy: 0, smile: 1.5, look: { x: -2, y: 1 } }, interpolate(ch, [8, 14], [0, 1], clamp));
    hop = 9 * (spring({ frame: ch, fps, config: SPRING2.pop }) - spring({ frame: ch - 7, fps, config: SPRING2.land }));
  }
  // contact squash: the coin flattens against the outline for 2 f
  const squash = interpolate(s, [-1, 0, 2, 5], [0, -0.42, -0.42, 0], clamp);
  return { angle, face, squash, hop };
}

/** Record r's state at frame f: the app's pill reads Checking… until its charm's bonk, then Used / Used / Expired. */
function recT5(f: number, r: number): RecAnim {
  const C0 = T5.contact[r];
  return {
    status: f < C0 ? "checking" : "settled",
    pop: f < C0 ? undefined : interpolate(f, [C0, C0 + 10], [0, 1], clamp),
    stamp: f < C0 ? 0 : interpolate(f, [C0, C0 + STAMP_LEN], [0.22, 1], clamp),
  };
}

export default function T5Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.min(frame, T5.end + 20);

  // camera: the whole browser → the history panel for the stamps → back for the verdict and Buy
  const cam = camAt(f, [
    { f: 0, cam: CAM_MID },
    { f: T.camIn[0], cam: { ...CAM_MID, z: 1.36 } },
    { f: T.camIn[1], cam: CAM_CU },
    { f: T.camOut[0], cam: CAM_CU },
    { f: T.camOut[1], cam: CAM_MID },
  ]);

  // the browser drops onto the desk on the cut (contact f4)
  const drop = slapAt(f, fps, 4, { from: 1.025, squash: 0.012, drop: 22 });

  const spin = (f % 24) / 24;
  const scan = interpolate(f, [T.scanA, T.scanB], [0, 1], { ...clamp, easing: EASE2.pan });
  const brackets = interpolate(f, [T.scanA - 6, T.scanA + 2, T.scanB, T.scanB + 8], [0, 1, 1, 0], clamp);

  const rise = spring({ frame: f - T.wake, fps, config: SPRING2.rebound });
  const scroll =
    f < T.camOut[0] ? interpolate(f, [...SCROLL_DOWN], [0, RECORD_SCROLL], { ...clamp, easing: EASE2.pan }) : interpolate(f, [T.camOut[0], T.camOut[1] + 2], [RECORD_SCROLL, 0], { ...clamp, easing: EASE2.pan });
  const verdictOn = f >= T.verdict;

  const charms = [0, 1, 2].map((r) => {
    const c = charmT5(f, r, fps);
    const show = spring({ frame: f - (20 - 2 * r), fps, config: SPRING2.pop });
    return { ...c, show };
  });


  return (
    <AbsoluteFill style={{ background: C.ground, overflow: "hidden" }}>
      <CameraView cam={cam} dy={interpolate(f - T.wake - 2, [0, 1, 5], [0, 6, 0], { ...clamp, easing: EASE2.out })}>
        <div style={{ position: "absolute", inset: 0, transformOrigin: "50% 50%", transform: `scale(${drop.sx}, ${drop.sy})` }}>
          <Browser tabs={TABS} active={0} url="satchel/s/7" account="carol.near" lift={drop.lift}>
            <SalePage
              id="7"
              recs={[0, 1, 2].map((r) => recT5(f, r))}
              scroll={scroll}
              scan={scan}
              scanBrackets={brackets}
              verdict={verdictOn ? "clean" : "checking"}
              verdictPop={verdictOn ? interpolate(f, [T.verdict, T.verdict + 12], [0, 1], clamp) : undefined}
              buy={f >= T.wake ? "enabled" : "disabled"}
              press={f >= T.wake ? Math.max(0, 1 - rise) : undefined}
              spin={spin}
              overlay={<SparkPoints f={f - T.wake - 1} points={BUY_SPARKS} k={1} />}
            />
          </Browser>
          <div style={{ position: "absolute", left: 0, top: 0, translate: `0 ${-drop.lift}px` }}>
            <FrameCharms chains={ROWS7.map((r) => r.chain)} charms={charms} />
          </div>
        </div>
      </CameraView>

      {/* captions (screen space, in the band above the browser) */}
      <Caption frame={f} text={<>Checked in<br />your browser.</>} contact={T.capIn} out={T.capOut} y={22} size={112} seed="t5-checked" />
      <Caption frame={f} text="Clean history." contact={T.capClean} y={62} size={132} seed="t5-clean" />

      {/* sound */}
      <Sfx name="sticker-slap" at={4 / FPS} gainDb={-7} />
      <Sfx name="sticker-slap" at={T.capIn / FPS} gainDb={-5} />
      <Sfx name="bubble-tick-run" at={(T.scanA + 2) / FPS} gainDb={-4} />
      <Sfx name="sticker-peel" at={(T.capOut + 3) / FPS} align="peak" gainDb={-8} />
      <Sfx name="whoosh-soft" at={(T.camIn[0] + 10) / FPS} align="peak" gainDb={-9} />
      {T5.contact.map((c, i) => (
        <Sfx key={`thunk${i}`} name="stamp-thunk" at={c / FPS} gainDb={0} />
      ))}
      {T5.contact.map((c, i) => (
        <Sfx key={`mar${i}`} name="success-marimba" at={(c + 2) / FPS} gainDb={-3} />
      ))}
      <Sfx name="whoosh-soft" at={(T.camOut[0] + 8) / FPS} align="peak" gainDb={-11} />
      <Sfx name="magic-wand" at={T.verdict / FPS} gainDb={-2} />
      <Sfx name="sparkle" at={(T.wake + 2) / FPS} gainDb={0} />
    </AbsoluteFill>
  );
}
