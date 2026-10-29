import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame } from "remotion";
import { ArrowUpRight, Ban } from "lucide-react";
import { C, sans } from "../../brand/tokens";
import { SatchelCard } from "../../components/Sticker";
import { charmFollow, charmKick, Hand } from "../../illustration/characters";
import { StickyNote } from "../../illustration/props";
import { getScene } from "../../lib/timeline";
import { Sfx } from "../../lib/Sfx";
import { clamp, EASE2, noWobbleX, pressAt, slapAt, SPRING2 } from "../../motion";
import { Caption, CHAINS3, FPS, lerp, ramp, REACT_LAG, sec, SwingCard, type SwingOpts } from "../P5/rig";

/**
 * P4 · No seed phrase (33–38.5 s). Satchel #7 slaps in; a lemon sticky note with 12 words flutters in, tries to stick
 * to the card, slides off and drops out of frame on "no seed phrase to copy" (it brushes BTC on the way down). A
 * stranger's hand (grey sleeve) taps Send on the card; the card shakes "no" (noWobbleX: translate only, it carries the
 * S) and "Not the holder" pops up; the charms side-eye the stranger. Captions "No seed phrase." → "Only the holder
 * signs." (the second on its sentence start).
 */

const SC = getScene("P4");
const V09 = SC.line("V09");
const starts = (V09.sentenceStarts as number[] | undefined) ?? [0, 2.38];
const BEAT = 0.5;
const onBeat = (t: number) => sec(Math.ceil((SC.start + t - 1e-6) / BEAT) * BEAT - SC.start);

const F = {
  no: sec(SC.wordAt("V09", "no")), // caption 1 lands
  copy: sec(SC.wordAt("V09", "copy")),
  s2: sec(V09.start + starts[1]), // caption 2 lands on the second sentence
  contract: sec(SC.wordAt("V09", "contract")),
  end: sec(SC.duration),
};
const NOTE_LAND = onBeat(V09.start - 0.2); // the note slaps onto the card on the beat before the VO (33.5 s)
const NOTE_SLIDE = NOTE_LAND + 15; // it lets go
const NOTE_DROP = NOTE_SLIDE + 15; // off the card's edge, out of frame in 12 f
const PRESS = F.contract + 6; // the stranger taps Send mid-"contract"
const NO = PRESS + 1; // the card says no
const PILL = PRESS + 3;

// layout: the hero card, centred under the caption
const O: SwingOpts = { fromX: 960, toX: 960, y: 400, width: 640 };
const K = O.width / 400;
const CARD_LEFT = O.fromX - O.width / 2;
// Send button on the card face (UI units inside the 400 × 252 card)
const BTN = { x: 266, y: 84, w: 114, h: 44 };
const BTN_C = { x: CARD_LEFT + (BTN.x + BTN.w / 2) * K, y: O.y + (BTN.y + BTN.h / 2) * K };

export default function P4() {
  const frame = useCurrentFrame();

  // ── the card: slaps in on the cut, says "no" after the stranger's tap
  const slap = slapAt(frame + 2, FPS, 4 * K, { from: 1.12, squash: 0.05, drop: 28 }); // mid-slap on the cut: visible from frame 0, contact f2
  const wobble = noWobbleX(frame - NO);
  const pr = pressAt(frame, PRESS, 3, FPS);
  const btnPress = Math.max(0, Math.min(1, -pr.lift / 3));

  // ── the charms
  const fx = (i: number) => {
    const chain = CHAINS3[i];
    const lag = REACT_LAG[i];
    const t = (f: number) => (frame - f - lag) / FPS;
    // world swing: the slap jolt, the note brushing BTC, the card's sideways "no" shake
    let angle = charmKick(chain, t(2), 6);
    if (i === 0) angle += charmKick(chain, (frame - (NOTE_DROP + 4)) / FPS, -10);
    angle += charmFollow(chain, Math.max(0, frame - NO + 1) / FPS, (s) => noWobbleX(s * FPS), { lengthPx: 140, maxDeg: 12 });
    // looks: the note arriving (up-left), on the card, sliding down past them, gone; then the stranger (right)
    const noteSeen = ramp(frame, 2 + lag, 5 + lag);
    const followDown = ramp(frame, NOTE_SLIDE + lag, NOTE_DROP + 6 + lag, Easing.inOut(Easing.quad));
    const back = ramp(frame, NOTE_DROP + 12 + lag, NOTE_DROP + 16 + lag);
    const toStranger = ramp(frame, PRESS - 30 + lag, PRESS - 27 + lag);
    const side = ramp(frame, PRESS + 4 + lag, PRESS + 7 + lag);
    const lookNote = { x: lerp(-5, -4, followDown), y: lerp(-5, 5, followDown) };
    const lookX = lerp(lerp(lookNote.x * noteSeen, 0, back), 7, Math.max(toStranger, side));
    const lookY = lerp(lerp(lookNote.y * noteSeen, 0, back), -1, Math.max(toStranger, side));
    // BTC's eyes go wide as the note falls past it; ETH tilts its head to follow it
    const wide = i === 0 ? ramp(frame, NOTE_DROP + 2, NOTE_DROP + 4) * (1 - ramp(frame, NOTE_DROP + 9, NOTE_DROP + 13)) : 0;
    const tilt = i === 1 ? -6 * ramp(frame, NOTE_SLIDE + 4, NOTE_SLIDE + 9, EASE2.out) * (1 - ramp(frame, NOTE_DROP + 14, NOTE_DROP + 20)) : 0;
    // side-eye: lids at 55 %, flat mouth, held, one slow blink (close 3, closed 2, open 4)
    const slow = slowBlink(frame, PRESS + 30 + lag);
    const smile = lerp(lerp(1, 1.25, back * (1 - toStranger)), 0.15, side);
    return {
      worldAngle: angle,
      face: { look: { x: lookX, y: lookY }, wide, tilt, smile, blink: Math.max(0.5 * side, slow) },
    };
  };

  return (
    <AbsoluteFill style={{ background: C.ground, overflow: "hidden" }}>
      <AbsoluteFill style={{ translate: `${wobble}px 0`, scale: `${slap.sx} ${slap.sy}`, transformOrigin: `${O.fromX}px ${O.y + 300}px`, opacity: slap.opacity }}>
        <SwingCard
          t={-1000}
          o={O}
          frame={frame}
          fx={fx}
          blinkSeed="p4"
          extraLift={slap.lift}
          front={(lift) => (
            <SatchelCard id="7" width={O.width} lift={lift}>
              <SendButton press={btnPress} />
            </SatchelCard>
          )}
        />
        <NotHolderPill frame={frame} />
      </AbsoluteFill>
      <Note frame={frame} />
      <Stranger frame={frame} press={btnPress} />
      <Caption text="No seed phrase." at={F.no} until={F.s2 - 4} size={130} seed="p4-a" />
      <Caption text="Only the holder signs." at={F.s2} size={110} seed="p4-b" />
      <Sounds />
    </AbsoluteFill>
  );
}

/** A long, worried blink (close 3, closed 2, open 4), as a blink amount 0..1. */
function slowBlink(f: number, at: number) {
  const v = interpolate(f - at, [0, 3, 5, 9], [0, 1, 1, 0], { ...clamp, easing: Easing.inOut(Easing.quad) });
  return v * 0.95;
}

// ── the Send button on the card face (white sticker button: the card band is this frame's one coral) ──────────────

function SendButton({ press }: { press: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: BTN.x,
        top: BTN.y,
        width: BTN.w,
        height: BTN.h,
        borderRadius: 14,
        background: C.surface,
        border: `2px solid ${C.ink}`,
        boxShadow: `0 ${3 * (1 - press)}px 0 ${C.ink}`,
        transform: `translateY(${3 * press}px)`,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        ...sans(700),
        fontSize: 17,
        color: C.ink,
      }}
    >
      Send
      <ArrowUpRight size={18} strokeWidth={2.4} color={C.ink} />
    </div>
  );
}

// ── "Not the holder": a danger pill sticker that pops up from the button ─────────────────────────────────────────

function NotHolderPill({ frame }: { frame: number }) {
  if (frame < PILL) return null;
  const s = spring({ frame: frame - PILL, fps: FPS, config: SPRING2.pop });
  const rise = interpolate(s, [0, 1], [40, 0]);
  return (
    <div
      style={{
        position: "absolute",
        left: BTN_C.x - 400,
        width: 800,
        top: O.y - 128 + rise,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 16,
          padding: "14px 34px 14px 24px",
          borderRadius: 999,
          background: C.surface,
          border: `5px solid ${C.ink}`,
          boxShadow: `0 8px 0 ${C.ink}`,
          ...sans(700),
          fontSize: 58,
          lineHeight: "70px",
          color: C.danger,
          whiteSpace: "nowrap",
          scale: `${Math.max(0, s)}`,
          rotate: "-2deg",
          transformOrigin: "50% 100%",
        }}
      >
        <Ban size={56} strokeWidth={2.4} color={C.danger} />
        Not the holder
      </div>
    </div>
  );
}

// ── the seed-phrase note: flutters in, tries to stick, slides off, drops out of frame ────────────────────────────

function Note({ frame }: { frame: number }) {
  const S = 176 * 1.5; // note size at scale 1.5
  const land = { x: CARD_LEFT + 172, y: O.y + 228 }; // note centre on the card body (covers "3 chains")
  let x: number;
  let y: number;
  let rot: number;
  let drop = 1;
  let sq = 0;
  if (frame < NOTE_LAND) {
    // flutter: falls from the top-left with one lazy sway, accelerating into contact
    const p = ramp(frame, -6, NOTE_LAND);
    x = lerp(land.x - 560, land.x, Easing.out(Easing.quad)(p)) + 70 * Math.sin(p * Math.PI * 1.6) * (1 - p);
    y = lerp(land.y - 640, land.y, EASE2.fall(p));
    rot = -6 + 24 * Math.sin(p * Math.PI * 1.6 + 0.6) * (1 - p);
    drop = 2.6 - 1.6 * p;
  } else if (frame < NOTE_SLIDE) {
    // stuck... almost: squash on contact (held 2 f), a shiver as the glue gives
    const f = frame - NOTE_LAND;
    sq = f < 2 ? 0.06 : 0.06 * Math.max(0, 1 - (f - 2) / 4);
    x = land.x + (f > 8 ? 2.5 * Math.sin(f * 2.4) : 0);
    y = land.y;
    rot = -6;
  } else if (frame < NOTE_DROP) {
    // it lets go: slides down the card face, turning
    const p = ramp(frame, NOTE_SLIDE, NOTE_DROP, EASE2.fall);
    x = land.x - 30 * p;
    y = land.y + 150 * p;
    rot = -6 - 6 * p;
  } else {
    // off the edge: drops out of frame in 12 f
    const p = ramp(frame, NOTE_DROP, NOTE_DROP + 12, EASE2.fall);
    x = land.x - 30 - 70 * p;
    y = land.y + 150 + 700 * p;
    rot = -12 - 10 * p;
    drop = 1 + 1.2 * p;
  }
  if (y - S / 2 > 1100) return null;
  const curl = frame < NOTE_LAND ? 0.18 : interpolate(frame, [NOTE_LAND + 6, NOTE_SLIDE, NOTE_DROP], [0.18, 0.42, 0.6], clamp);
  return (
    <div style={{ position: "absolute", left: x - S / 2, top: y - S / 2, width: S, height: S, scale: `${1 + sq} ${1 - sq}`, transformOrigin: "50% 100%" }}>
      <StickyNote scale={1.5} tilt={rot} curl={curl} drop={drop} />
    </div>
  );
}

// ── the stranger's hand (grey sleeve, no tag): arrives from the right, taps Send, gives up ───────────────────────

function Stranger({ frame, press }: { frame: number; press: number }) {
  const inP = spring({ frame: frame - (PRESS - 22), fps: FPS, config: SPRING2.land });
  const out = interpolate(frame, [PRESS + 26, PRESS + 44], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  if (inP < 0.001 || out >= 1) return null;
  const x = BTN_C.x + 18 + lerp(560, 0, inP) + 420 * out; // the finger stays put: the card shakes under it
  const y = BTN_C.y + 4 + lerp(380, 0, inP) + 300 * out + 3 * K * press;
  const squash = frame >= PRESS && frame < PRESS + 3 ? 0.04 : 0;
  return (
    <div style={{ position: "absolute", inset: 0, scale: `${1 - squash} ${1 + squash}`, transformOrigin: `${x}px ${y}px` }}>
      <Hand pose="tap" x={x} y={y} k={K} angle={34} mirror sleeve="stranger" press={press} />
    </div>
  );
}

// ── sound ───────────────────────────────────────────────────────────────────────────────────────────────────────

function Sounds() {
  const at = (f: number) => f / FPS;
  return (
    <>
      <Sfx name="sticker-slap" at={at(2)} gainDb={-5} />
      <Sfx name="sticker-slap" at={at(NOTE_LAND)} gainDb={-9} rate={1.25} />
      <Sfx name="paper-slide" at={at(NOTE_SLIDE + 8)} align="peak" gainDb={0} />
      <Sfx name="swoop-down" at={at(NOTE_DROP + 3)} align="peak" gainDb={-1} />
      <Sfx name="button-thock" at={at(PRESS)} gainDb={-3} />
      <Sfx name="error-boop" at={at(NO)} gainDb={2} />
      <Sfx name="pop" at={at(PILL + 2)} gainDb={-6} />
    </>
  );
}

