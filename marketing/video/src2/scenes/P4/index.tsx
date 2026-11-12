import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame } from "remotion";
import type React from "react";
import { ArrowUpRight, Ban, Check } from "lucide-react";
import { C, sans } from "../../brand/tokens";
import { SatchelCard } from "../../components/Sticker";
import { charmFollow, charmKick, Hand, handPoint, NameTag } from "../../illustration/characters";
import { StickyNote } from "../../illustration/props";
import { getScene } from "../../lib/timeline";
import { Sfx } from "../../lib/Sfx";
import { clamp, EASE2, noWobbleX, pressAt, SLAP_CONTACT, slapAt, SPRING2 } from "../../motion";
import { AllowanceSticker } from "../P5/cards";
import { SLEEVE } from "../P6/cast";
import { Caption, CHAINS3, FPS, lerp, ramp, REACT_LAG, sec, sleeveDir, SvgLayer, SwingCard, type SwingOpts } from "../P5/rig";

/**
 * P4 · No seed phrase (v4: 35–43 s). Satchel #7 slaps in; a lemon sticky note with 12 words flutters in, tries to
 * stick to the card, slides off and drops out of frame on "no seed phrase to copy" (it brushes BTC on the way down). On
 * "Only the holder can send" a stranger's hand (grey sleeve) taps Send on the card; the card shakes "no" (noWobbleX:
 * translate only, it carries the S), "Not allowed" pops up and the charms side-eye him. On "or someone they allow,
 * within daily limits" the "Who can spend" sticker slaps in, a teammate's hand (tag sam.near) taps Send and it passes:
 * "Sent 0.05 ETH", the day's allowance ticks 0.25 → 0.20 of 0.50 ETH. Captions "No seed phrase." → "Only you, or who
 * you allow." (the second on its sentence start).
 */

const SC = getScene("P4");
const V09 = SC.line("V09");
const starts = (V09.sentenceStarts as number[] | undefined) ?? [0, 2.38];
const BEAT = 0.5;
const onBeat = (t: number) => sec(Math.ceil((SC.start + t - 1e-6) / BEAT) * BEAT - SC.start);

const F = {
  no: sec(SC.wordAt("V09", "no")), // caption 1 lands
  s2: sec(V09.start + starts[1]), // caption 2 lands on the second sentence ("Only the holder can send…")
  daily: sec(SC.wordAt("V09", "daily")),
  end: sec(SC.duration),
};
const NOTE_LAND = onBeat(V09.start - 0.2); // the note slaps onto the card on the beat before the VO (35.5 s)
const NOTE_SLIDE = NOTE_LAND + 15; // it lets go
const NOTE_DROP = NOTE_SLIDE + 15; // off the card's edge, out of frame in 12 f
// v5: the stranger taps on "Only" (the beat after the second sentence starts, 38.0 s), so "Not allowed" holds
// ≥ 1.3 s and is gone before "Who can spend" slaps in; the teammate only enters once the stranger has left the frame.
const PRESS = onBeat(V09.start + starts[1]); // the stranger taps Send (38.0 s)
const NO = PRESS + 1; // the card says no
const PILL = PRESS + 3;
const ALLOW_IN = onBeat(SC.wordAt("V09", "someone")); // "Who can spend" slaps in (40.0 s, contact)
const PRESS2 = onBeat(SC.wordAt("V09", "allow")); // the teammate taps Send (40.5 s) and it passes
const SENT = PRESS2 + 3;
const PILL_OUT = ALLOW_IN - SLAP_CONTACT - 9; // "Not allowed" pops away (6 f) and is gone 3 f before the allowance slap starts
const STRANGER_OUT = PRESS + 26; // the stranger gives up and leaves (18 f, fully out of frame)
const MATE_IN = Math.max(PRESS2 - 14, STRANGER_OUT + 18 + 6); // the teammate enters after the allowance has landed, ≥ 6 f after the stranger is gone

// layout: the hero card, centred under the caption
// v5: lower and a little smaller, so the status pills get their own lane between the two-line caption and the band
const O: SwingOpts = { fromX: 960, toX: 960, y: 490, width: 560 };
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
  const pressOf = (at: number) => Math.max(0, Math.min(1, -pressAt(frame, at, 3, FPS).lift / 3));
  const btnPress = frame < PRESS2 - 4 ? pressOf(PRESS) : pressOf(PRESS2);

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
    const side = ramp(frame, PRESS + 4 + lag, PRESS + 7 + lag) * (1 - ramp(frame, STRANGER_OUT + 14 + lag, STRANGER_OUT + 18 + lag));
    // the teammate: they look at him as he arrives, then beam (joy) when the send goes through
    const toMate = ramp(frame, MATE_IN + 4 + lag, MATE_IN + 7 + lag);
    const beam = ramp(frame, SENT + lag, SENT + 3 + lag) * (1 - ramp(frame, SENT + 16 + lag, SENT + 20 + lag));
    const right = Math.max(toStranger * (1 - ramp(frame, STRANGER_OUT + 14, STRANGER_OUT + 20)), side, toMate);
    const lookNote = { x: lerp(-5, -4, followDown), y: lerp(-5, 5, followDown) };
    const lookX = lerp(lerp(lookNote.x * noteSeen, 0, back), 7, right);
    const lookY = lerp(lerp(lookNote.y * noteSeen, 0, back), -1, right);
    if (frame >= SENT) angle += charmKick(chain, (frame - SENT - lag) / FPS, 5);
    // BTC's eyes go wide as the note falls past it; ETH tilts its head to follow it
    const wide = i === 0 ? ramp(frame, NOTE_DROP + 2, NOTE_DROP + 4) * (1 - ramp(frame, NOTE_DROP + 9, NOTE_DROP + 13)) : 0;
    const tilt = i === 1 ? -6 * ramp(frame, NOTE_SLIDE + 4, NOTE_SLIDE + 9, EASE2.out) * (1 - ramp(frame, NOTE_DROP + 14, NOTE_DROP + 20)) : 0;
    // side-eye: lids at 55 %, flat mouth, held, one slow blink (close 3, closed 2, open 4)
    const slow = slowBlink(frame, PRESS + 30 + lag);
    const smile = lerp(lerp(lerp(1, 1.25, back * (1 - toStranger)), 0.15, side), 1.6, beam) + 0.2 * toMate * (1 - side);
    return {
      worldAngle: angle,
      face: { look: { x: lookX, y: lookY }, wide, tilt, smile, joy: beam, blink: Math.max(0.5 * side, slow * (frame < STRANGER_OUT + 18 ? 1 : 0)) },
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
        <StatusPills frame={frame} />
      </AbsoluteFill>
      <Note frame={frame} />
      <Stranger frame={frame} press={btnPress} />
      <Allowance frame={frame} />
      <Teammate frame={frame} press={btnPress} />
      <Caption text="No seed phrase." at={F.no} until={F.s2 - 4} size={130} seed="p4-a" />
      <Caption text={"Only\u00a0you, or\u00a0who\u00a0you\u00a0allow."} at={F.s2} size={110} width={1000} seed="p4-b" />
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

// ── "Not allowed" (the stranger) → "Sent 0.05 ETH" (the teammate): pill stickers that pop up from the button ──────

function PillSticker({ frame, at, out, tone, icon, word }: { frame: number; at: number; out?: number; tone: string; icon: React.ReactNode; word: string }) {
  if (frame < at || (out !== undefined && frame >= out + 6)) return null;
  const s = spring({ frame: frame - at, fps: FPS, config: SPRING2.pop });
  const gone = out === undefined ? 0 : interpolate(frame, [out, out + 2, out + 6], [0, -0.08, 1], { ...clamp, easing: EASE2.fall });
  // its own lane: it pops in place (no rise), growing from its bottom edge, and rests 8 px above the band
  return (
    <div style={{ position: "absolute", left: BTN_C.x - 400, width: 800, top: PILL_TOP, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 14,
          padding: "8px 32px 8px 22px",
          borderRadius: 999,
          background: C.surface,
          border: `5px solid ${C.ink}`,
          boxShadow: `0 8px 0 ${C.ink}`,
          ...sans(700),
          fontSize: 56,
          lineHeight: "66px",
          color: tone,
          whiteSpace: "nowrap",
          scale: `${Math.max(0, s * (1 - gone))}`,
          rotate: "-2deg",
          transformOrigin: "50% 100%",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {icon}
        {word}
      </div>
    </div>
  );
}

/** the pill lane: its bottom edge (with its 8 px drop) 16 px above the card's band, ~50 px below the caption's descenders */
const PILL_TOP = O.y - 16 - 8 - 92;

function StatusPills({ frame }: { frame: number }) {
  return (
    <>
      <PillSticker frame={frame} at={PILL} out={PILL_OUT} tone={C.danger} icon={<Ban size={54} strokeWidth={2.4} color={C.danger} />} word="Not allowed" />
      <PillSticker frame={frame} at={SENT} tone={C.success} icon={<Check size={54} strokeWidth={2.6} color={C.success} />} word="Sent 0.05 ETH" />
    </>
  );
}

// ── "Who can spend": the allowance sticker (left of the card); the day's cap ticks down when the send passes ────────

function Allowance({ frame }: { frame: number }) {
  const start = ALLOW_IN - SLAP_CONTACT;
  if (frame < start) return null;
  const slap = slapAt(frame - start, FPS, 0, { from: 1.2, squash: 0.06, drop: 0 });
  const left = interpolate(frame, [SENT, SENT + 10], [0.25, 0.2], { ...clamp, easing: EASE2.out });
  const pulse = Math.max(0, Math.sin(Math.PI * ramp(frame, F.daily, F.daily + 8)));
  const k = 1.75;
  return (
    <div style={{ position: "absolute", left: CARD_LEFT - 70 - 250 * k, top: O.y + 60, scale: `${slap.sx} ${slap.sy}`, opacity: slap.opacity, rotate: "2deg" }}>
      <AllowanceSticker k={k} left={left} who="sam.near" pulse={pulse} />
    </div>
  );
}

// ── the teammate (tag sam.near): arrives from the right like the stranger, taps Send, and it goes through ──────────

function Teammate({ frame, press }: { frame: number; press: number }) {
  const inP = spring({ frame: frame - MATE_IN, fps: FPS, config: SPRING2.land });
  const out = interpolate(frame, [PRESS2 + 28, PRESS2 + 46], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  if (inP < 0.001 || out >= 1) return null;
  // in from the right edge at mid-height (a different path from the stranger's), out the same way, fully off frame
  const x = BTN_C.x + 18 + lerp(820, 0, inP) + 820 * out;
  const y = BTN_C.y + 4 + lerp(110, 0, inP) + 240 * out + 3 * K * (frame >= PRESS2 - 4 ? press : 0);
  const squash = frame >= PRESS2 && frame < PRESS2 + 3 ? 0.04 : 0;
  const hand = { pose: "tap" as const, x, y, k: K, angle: 34, mirror: true, sleeve: SLEEVE.sam, tag: null, press: frame >= PRESS2 - 4 ? press : 0 };
  // the tag sits on the sleeve; only its REST spot is clamped inside the margin, then it moves with the hand (in, the
  // press and out), so it never stays behind (QA verify N1)
  const rest = { x: BTN_C.x + 18, y: BTN_C.y + 4 };
  const restWrist = handPoint({ ...hand, x: rest.x, y: rest.y, press: 0 }, "wrist");
  const dir = sleeveDir(34, 0, true);
  const tagRest = { x: Math.min(1740, restWrist.x + 190 * dir.x), y: Math.min(962, restWrist.y + 190 * dir.y) };
  const tag = { x: tagRest.x + (x - rest.x), y: tagRest.y + (y - rest.y) };
  return (
    <div style={{ position: "absolute", inset: 0, scale: `${1 - squash} ${1 + squash}`, transformOrigin: `${x}px ${y}px` }}>
      <Hand {...hand} />
      <SvgLayer>
        <NameTag x={tag.x} y={tag.y} text="sam.near" k={2.6} tilt={-2} />
      </SvgLayer>
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
  const out = interpolate(frame, [STRANGER_OUT, STRANGER_OUT + 18], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  if (inP < 0.001 || out >= 1) return null;
  const x = BTN_C.x + 18 + lerp(560, 0, inP) + 760 * out; // the finger stays put: the card shakes under it
  const y = BTN_C.y + 4 + lerp(380, 0, inP) + 560 * out + 3 * K * press;
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
      <Sfx name="sticker-slap" at={at(ALLOW_IN)} gainDb={-6} />
      <Sfx name="button-thock" at={at(PRESS2)} gainDb={-3} />
      <Sfx name="success-marimba" at={at(SENT)} align="peak" gainDb={-2} />
    </>
  );
}

