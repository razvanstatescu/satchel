import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame } from "remotion";
import { C } from "../../brand/tokens";
import { HISTORY_7, PulseDot } from "../../components/ui";
import { RecordFill, RecordOutline } from "../../illustration/props";
import { Sfx } from "../../lib/Sfx";
import { FPS } from "../../lib/time";
import { getScene, marker } from "../../lib/timeline";
import { CaptionSlap, clamp, EASE2, Peel, slapAt, SPRING2 } from "../../motion";
import { ChainStrip } from "../C1/parts";

/**
 * T1 · On the record (76–82 s). On the drop, a macro on the back of the card (its header out of frame): one dashed
 * outline draws itself dash by dash and its label types `ETH · nonce 1` — the record exists first. A frozen pill
 * breathes "Signing with NEAR's signer network · Usually about 10 seconds"; then the signature prints into the outline
 * ("Signed"), peels out from its corner and flies off to the Ethereum strip, leaving the outline behind.
 * Captions: "Recorded first." → "Then signed."
 */

const sc = getScene("T1");
const F = (sec: number) => Math.round(sec * FPS);
const T = {
  drop: F(marker("drop") - sc.start), // 0: the outline starts drawing on the drop
  record: F(sc.wordAt("V18", "record")), // ≈ 50
  near: F(sc.wordAt("V18", "NEAR")), // ≈ 82 ("on NEAR")
  signer: F(sc.wordAt("V18", "signer")), // ≈ 133
  makes: F(sc.wordAt("V18", "makes")), // ≈ 157
  end: F(sc.duration), // 180
};
const DRAW = T.drop; // 16 f, dash by dash
const TYPE = DRAW + 12; // 2 f per character
const LABEL = "ETH · nonce 1";
const BTC_LABEL = HISTORY_7[0].label; // "BTC · coin 7d…e2:1"
const TYPE_END = TYPE + LABEL.length * 2;
const PILL = T.near - 2; // the signing pill pops in
const SIGN = T.signer + 2; // the signature prints into the outline (8 f wipe)
const STRIP_IN = SIGN + 10; // the Ethereum strip slaps in at the right
const PEEL = SIGN + 16; // dog-ear 10 f, then the detach
const DETACH = PEEL + 10;
const GONE = DETACH + 13;

// ── layout (a macro on the card's back: its right edge shows, the header is above the frame) ─────────────────────────
const S = 3.2; // record scale (UI → px): a step closer than T0's last frame (the drop punches in)
const REC = { w: 340, h: 46 };
const RW = REC.w * S;
const RH = REC.h * S;
const REC_C = { x: 900, y: 600 };
const CARD_EDGE = 1504; // the card's right edge (px)
const STRIP = { x: 1528, y: REC_C.y - 65, w: 620, h: 130 };

const prog = (f: number, a: number, b: number, ease: (t: number) => number = EASE2.swing) => interpolate(f, [a, b], [0, 1], { ...clamp, easing: ease });
const sp = (f: number, cfg: { mass: number; stiffness: number; damping: number }) => (f <= 0 ? 0 : spring({ frame: f, fps: FPS, config: cfg }));

function SigningPill({ f }: { f: number }) {
  const inn = sp(f - PILL, SPRING2.pop);
  const out = interpolate(f, [SIGN, SIGN + 3, SIGN + 8], [1, 1.06, 0], clamp);
  const breath = f > PILL + 10 ? 1 + 0.02 * (1 - Math.cos((2 * Math.PI * (f - PILL - 10)) / 15)) : 1; // 1.0 → 1.04 every 15 f
  const s = inn * out * breath;
  if (f < PILL || s <= 0.01) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: REC_C.x,
        top: REC_C.y + RH / 2 + 64,
        translate: "-50% 0",
        scale: `${s}`,
        transformOrigin: "50% 0%",
        display: "flex",
        alignItems: "center",
        gap: 26,
        padding: "22px 40px 24px 32px",
        borderRadius: 44,
        background: C.sunken,
        whiteSpace: "nowrap",
      }}
    >
      <PulseDot pulse={((f - PILL) % 15) / 15} size={26} color={C.frozen} />
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontFamily: "Onest", fontWeight: 650, fontSize: 50, lineHeight: 1.1, color: C.frozen }}>Signing with NEAR's signer network</span>
        <span style={{ fontFamily: "Onest", fontWeight: 500, fontSize: 46, lineHeight: 1.1, color: C.inkMuted }}>Usually about 10 seconds</span>
      </div>
    </div>
  );
}

/**
 * The signature sticker leaving: a shallow dog-ear from its top-right corner, it lifts and tilts, then levels out and
 * slides in BEHIND the Ethereum strip (drawn on top of it), so it reads as posted into Ethereum.
 */
function FlyingSignature({ f }: { f: number }) {
  if (f < PEEL || f >= GONE) return null;
  const inset = 5 * S; // RecordFill draws the sticker 5 UI units inside the outline box
  const w = RW - 2 * inset;
  const h = RH - 2 * inset;
  const peel = ((0.92 * h * Math.SQRT2) / (w + h)) * prog(f, PEEL, DETACH, EASE2.rip); // the flap stays inside the sticker
  const up = sp(f - DETACH + 2, SPRING2.land) - prog(f, DETACH + 3, GONE - 2, EASE2.swing); // lift, then level out
  const go = prog(f, DETACH + 1, GONE, EASE2.fall);
  const travel = STRIP.x + STRIP.w * 0.5 - (REC_C.x - RW / 2); // until its tail is well behind the strip
  const x = REC_C.x - RW / 2 + inset + travel * go;
  const y = REC_C.y - RH / 2 + inset - 34 * up;
  const v = travel * (prog(f + 1, DETACH + 1, GONE, EASE2.fall) - go); // px per frame → a smear on the fastest frames
  const smear = 1 + Math.min(0.25, Math.abs(v) / 1000);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        rotate: `${-6 * up}deg`,
        scale: `${(1 + 0.04 * up) * smear} ${(1 + 0.04 * up) / smear}`,
        transformOrigin: "100% 50%",
      }}
    >
      <Peel w={w} h={h} progress={peel} corner="tr" radius={10 * S} outline={2.5 * S} rest={3 * S} backing={C.sunken}>
        <div style={{ position: "absolute", left: -inset, top: -inset }}>
          <RecordFill chain="evm" label={LABEL} w={REC.w} h={REC.h} scale={S} drop={1 + 3 * Math.max(0, up)} />
        </div>
      </Peel>
    </div>
  );
}

export default function T1() {
  const f = useCurrentFrame();
  const draw = interpolate(f, [DRAW, DRAW + 15], [0.07, 1], clamp); // dash by dash, the first dashes on the drop frame
  const type = prog(f, TYPE, TYPE_END, (t) => t);
  const signed = f < PEEL ? prog(f, SIGN, SIGN + 8, EASE2.out) : 0;
  const settle = 1 + 0.03 * Math.sin(Math.PI * prog(f, TYPE_END, TYPE_END + 8)); // the record "commits": a soft breath
  const stripIn = slapAt(f - (STRIP_IN - 4), FPS, 0, { from: 1.22, squash: 0.06, drop: 0 });
  const stripJolt = f >= GONE - 6 ? 0.8 * (1 - sp(f - GONE + 4, SPRING2.rebound)) : 0; // it swallows the sticker
  // the drop lands as a punch (1.07 → 1 in 8 f, continuing T0's fall), then a slow push on the hold (≈ 0.5% per second)
  const cam = 1 + 0.07 * (1 - prog(f, 0, 8, EASE2.out)) + 0.03 * prog(f, 8, T.end, (t) => t);
  return (
    <AbsoluteFill style={{ background: C.ground, overflow: "hidden" }}>
      <AbsoluteFill style={{ scale: `${cam}`, transformOrigin: `${REC_C.x}px ${REC_C.y}px` }}>
        {/* the card's back, seen close: its right edge, the header far above the frame */}
        <div
          style={{
            position: "absolute",
            left: -400,
            top: -420,
            width: CARD_EDGE + 400,
            height: 1900,
            borderRadius: 28 * S,
            background: C.surface,
            border: `${Math.round(3 * S)}px solid ${C.ink}`,
            boxShadow: `0 ${Math.round(4 * S)}px 0 ${C.ink}`,
            boxSizing: "border-box",
          }}
        />
        {/* the record before it (P3's Bitcoin send) is already on the card; the header is above the frame */}
        <div style={{ position: "absolute", left: REC_C.x - RW / 2, top: REC_C.y - RH / 2 - 54 * S }}>
          <RecordOutline chain="btc" label={BTC_LABEL} w={REC.w} h={REC.h} scale={S} />
        </div>
        {/* the record: the outline draws itself, the label types, the signature prints into it */}
        <div style={{ position: "absolute", left: REC_C.x - RW / 2, top: REC_C.y - RH / 2, scale: `${settle}` }}>
          <RecordOutline chain="evm" label={LABEL} w={REC.w} h={REC.h} scale={S} draw={draw} type={type} signed={signed} />
        </div>
        <SigningPill f={f} />
        <FlyingSignature f={f} />
        {f >= STRIP_IN - 4 ? (
          <div style={{ position: "absolute", left: STRIP.x, top: STRIP.y, opacity: stripIn.opacity, scale: `${stripIn.sx} ${stripIn.sy}`, transformOrigin: "0% 50%" }}>
            <ChainStrip w={STRIP.w} h={STRIP.h} theme="day" press={stripJolt} />
          </div>
        ) : null}
      </AbsoluteFill>

      <Sequence from={T.record - 4} durationInFrames={SIGN - T.record} layout="none">
        <div style={{ position: "absolute", left: 0, right: 0, top: 104, display: "flex", justifyContent: "center" }}>
          <CaptionSlap text="Recorded first." size={140} seed="t1-recorded" />
        </div>
      </Sequence>
      <Sequence from={SIGN - 4} layout="none">
        <div style={{ position: "absolute", left: 0, right: 0, top: 104, display: "flex", justifyContent: "center" }}>
          <CaptionSlap text="Then signed." size={150} seed="t1-signed" />
        </div>
      </Sequence>

      <Sfx name="pen-scribble" at={DRAW / FPS} gainDb={2} />
      <Sfx name="type-run" at={TYPE / FPS} gainDb={-2} />
      <Sfx name="sticker-slap" at={T.record / FPS} gainDb={-12} />
      <Sfx name="pop" at={PILL / FPS} gainDb={-6} />
      <Sfx name="success-marimba" at={SIGN / FPS} gainDb={-6} />
      <Sfx name="sticker-peel" at={DETACH / FPS} align="peak" gainDb={0} />
      <Sfx name="whoosh-zip" at={(DETACH + 5) / FPS} align="peak" gainDb={-2} />
      <Sfx name="paper-slide" at={(GONE - 3) / FPS} align="peak" gainDb={2} />
    </AbsoluteFill>
  );
}
