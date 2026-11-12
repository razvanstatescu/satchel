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
  CAPTION_2L,
  type CharmAnim,
  holdTop,
  mixFace,
  ROW,
  rowMid,
  type RowAnim,
  type RowSpec,
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
export const ROWS7: RowSpec[] = [
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

/**
 * The ending, laid out backwards from the scene's end so it adapts to the timeline (QA v5 #5). After SOL's contact
 * the close-up holds still on the three stamps ("Blockhash expired" settles in 10 f, then stays put). The camera then
 * cuts back to the whole page on a beat (T6's move: push in, hard cut out; a pull-back would drag the tab and URL bars
 * through the caption band and cost 12 f), the verdict pops on the cut, "Clean history." slaps in with it and is read
 * alone for ≥ 1.05 s, and only then does Buy wake up coral, with ≥ 24 f left before the tab switch to #4 so the wake's
 * sparkles end before it (QA v5 N4). With a 10.5 s T5 (SOL at f229, end f315): still close-up 26 f, cut f255,
 * caption f259, Buy wake f291, last sparkle gone by f313.
 */
const C3 = T5.contact[2];
const CAP_ALONE = 32; // "Clean history." landed and alone ≥ 1.05 s before the Buy wake (it stays readable during it)
const WAKE_MIN = 24; // the Buy wake (grey → coral) and its sparkles finish before the tab switch to T6 (QA v5 N4)
const CUT_OUT = Math.max(C3 + 12, Math.floor((T5.end - 4 - CAP_ALONE - WAKE_MIN) / 15) * 15); // the latest beat that fits

const T = {
  capIn: T5.browser, // "Checked in your browser." lands on "browser"
  capOut: Math.min(T5.v22End - 15, T5.contact[1] - 36),
  scanA: T5.checks + 3,
  scanB: T5.v22End - 6,
  camIn: [T5.contact[1] - 31, T5.contact[1] - 12] as const, // land before ETH's wind-up
  cutOut: CUT_OUT,
  verdict: CUT_OUT, // the page arrives with its verdict popping
  capClean: CUT_OUT + 4, // the caption's slap starts on the cut frame
  wake: CUT_OUT + 4 + CAP_ALONE,
  cheer: CUT_OUT + 4 + CAP_ALONE + 3,
};

/** CU: the history panel (header, verdict, three records and their charms) fills the frame. */
const CAM_CU: Cam = { x: 900, y: 402, z: 2.55 };

/** SCRIPT-v4 numbers: #7 is listed for 2,000 NEAR and holds 0.05 BTC · 0.80 ETH · 12 SOL · 800 USDC. */
export const PRICE_7 = "2,000 NEAR";
export const PAGE7 = { id: "7" as const, price: PRICE_7, seller: "bob.near", balances: "0.05 BTC · 0.80 ETH · 12 SOL · 800 USDC" };
export const TABS = [{ title: "Satchel #7" }, { title: "Satchel #4" }];

/** The Buy wake's lemon glints, on the button's flanks (page px) so they never cover a word: 4 (a 3–5 burst, §2.13). */
const BUY_SPARKS = [
  { x: 24, y: 206, r: 17 },
  { x: 488, y: 196, r: 19 },
  { x: 30, y: 150, r: 11 },
  { x: 506, y: 246, r: 12 },
];

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
  angle += charmKick(chain, t - (T.cheer + CHARM_LAG[kit] + 2) / fps, 5);

  // eyes: blinks on a per-charm clock, forced one after the landing
  const blinks = blinkSchedule(`t5-${chain}`, 30, T5.end + 30, [C0 + 26]);
  const open = eyeOpen(f, blinks);
  let face: CharmFace = { blink: (1 - open) / 0.88, smile: 1, look: { x: -5, y: 0 } };

  // the scan beam: eyes follow it as it passes (it sweeps rows top → bottom)
  const rowsH = 3 * ROW.h + 2 * ROW.gap;
  const scanP = interpolate(f, [T.scanA, T.scanB], [0, 1], { ...clamp, easing: EASE2.pan });
  if (f > T.scanA - 4 && f < T.scanB + 8) {
    const beamY = ROW.y + scanP * rowsH;
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
  // the cheer: joy faces and a small happy swing in reaction order (no hop: the caption is being read, QA v5 #5)
  const ch = f - (T.cheer + CHARM_LAG[kit]);
  if (ch >= 0) {
    face = ch < 8 ? { ...face, joy: 1, smile: 1.6 } : mixFace({ ...face, joy: 1, smile: 1.6 }, { ...face, joy: 0, smile: 1.5, look: { x: -2, y: 1 } }, interpolate(ch, [8, 14], [0, 1], clamp));
  }
  // contact squash: the coin flattens against the outline for 2 f
  const squash = interpolate(s, [-1, 0, 2, 5], [0, -0.42, -0.42, 0], clamp);
  return { angle, face, squash };
}

/** Row r's animation at frame f. */
function rowT5(f: number, r: number): RowAnim {
  const C0 = T5.contact[r];
  return {
    draw: interpolate(f, [5 + 3 * r, 21 + 3 * r], [0, 1], clamp),
    type: interpolate(f, [13 + 3 * r, 27 + 3 * r], [0, 1], clamp),
    stamp: f < C0 ? 0 : interpolate(f, [C0, C0 + STAMP_LEN], [0.22, 1], clamp),
    checking: f < C0 ? interpolate(f, [24 + 2 * r, 30 + 2 * r, C0 - 3, C0], [0, 1, 1, 0], clamp) : 0,
  };
}

export default function T5Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.min(frame, T5.end + 20);

  // camera: the whole browser → the history panel for the stamps → back for the verdict and Buy. The slow drift
  // before the push-in holds the browser's top edge, so it never creeps up under "your browser." (QA v5 #4)
  const cam = camAt(f, [
    { f: 0, cam: CAM_MID },
    { f: T.camIn[0], cam: holdTop(CAM_MID, 1.36) },
    { f: T.camIn[1], cam: CAM_CU },
    { f: T.cutOut - 1, cam: CAM_CU },
    { f: T.cutOut, cam: CAM_MID }, // the hard cut back to the page, on a beat
  ]);

  // the browser drops onto the desk on the cut (contact f4)
  const drop = slapAt(f, fps, 4, { from: 1.025, squash: 0.012, drop: 22 });

  const spin = (f % 24) / 24;
  const scan = interpolate(f, [T.scanA, T.scanB], [0, 1], { ...clamp, easing: EASE2.pan });
  const brackets = interpolate(f, [T.scanA - 6, T.scanA + 2, T.scanB, T.scanB + 8], [0, 1, 1, 0], clamp);

  const wakeSpring = spring({ frame: f - T.wake, fps, config: SPRING2.fade });
  const rise = spring({ frame: f - T.wake, fps, config: SPRING2.rebound });
  const verdictOn = f >= T.verdict;

  const charms = [0, 1, 2].map((r) => {
    const c = charmT5(f, r, fps);
    const show = spring({ frame: f - (20 - 2 * r), fps, config: SPRING2.pop });
    return { ...c, show };
  });


  return (
    <AbsoluteFill style={{ background: C.ground, overflow: "hidden" }}>
      <CameraView cam={cam}>
        <div style={{ position: "absolute", inset: 0, transformOrigin: "50% 50%", transform: `scale(${drop.sx}, ${drop.sy})` }}>
          <Browser tabs={TABS} active={0} url="satchel/s/7" account="carol.near" lift={drop.lift}>
            <SalePage
              {...PAGE7}
              rows={ROWS7}
              rowAnim={[0, 1, 2].map((r) => rowT5(f, r))}
              charms={charms}
              scan={scan}
              scanBrackets={brackets}
              verdict={verdictOn ? "clean" : "checking"}
              verdictPop={verdictOn ? interpolate(f, [T.verdict, T.verdict + 12], [0, 1], clamp) : undefined}
              checked={f >= T.verdict}
              checkedPop={interpolate(f, [T.verdict, T.verdict + 10], [0, 1], clamp)}
              buy={{
                mode: f >= T.wake ? "enabled" : "checking",
                wake: f >= T.wake ? wakeSpring : 0,
                lift: f >= T.wake ? -4 * (1 - rise) : -4,
                spin,
                gatePop: f >= T.wake ? interpolate(f, [T.wake, T.wake + 10], [0, 1], clamp) : undefined,
              }}
              spin={spin}
              enter={f < 30 ? f : undefined}
              overlay={<SparkPoints f={f - T.wake} points={BUY_SPARKS} k={1} />}
            />
          </Browser>
        </div>
      </CameraView>

      {/* captions (screen space, in the band above the browser) */}
      {/* the shared two-line setting: cap tops ≥ 60 px from the top, the "y" of "your" ≥ 20 px over the tab bar (QA v5 #4, N5) */}
      <Caption frame={f} text={<>Checked in<br />your browser.</>} contact={T.capIn} out={T.capOut} y={CAPTION_2L.y} size={CAPTION_2L.size} leading={CAPTION_2L.leading} seed="t5-checked" />
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
      <Sfx name="whoosh-soft" at={T.cutOut / FPS} align="peak" gainDb={-11} />
      <Sfx name="magic-wand" at={T.verdict / FPS} gainDb={-2} />
      <Sfx name="sparkle" at={T.wake / FPS} gainDb={0} />
    </AbsoluteFill>
  );
}
