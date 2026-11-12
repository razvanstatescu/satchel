import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../../brand/tokens";
import { CardBack, type CharmFace, charmBlink, charmKick, CardWithCharms, Hand, handPoint, type HandProps, NameTag } from "../../illustration/characters";
import { ContractPlaque, plaqueSlot } from "../../illustration/props";
import { Sfx } from "../../lib/Sfx";
import { FPS } from "../../lib/time";
import { clamp, EASE2, SPRING2 } from "../../motion";
import { At, beatAfter, Caption, cameraStyle, onBeat, sceneBeats, voF } from "./kit";

/**
 * T2 · No admin key (82.0–88.5 s; V19 "And there's no admin key. Not even ours. So it can't sign anything off the record.")
 * The camera pulls back from Satchel #7's history (where T1 left us) to the contract it lives on: a screwed-on plaque,
 * `satchel.satchelhq.near`, whose key slot holds only an empty dashed key and a big "0". The team's own hand
 * (plain sleeve, "satchelhq" tag) reaches in to pinch the key, pinches nothing ("tok"), pulls back and shows an empty,
 * wiggling hand on "Not even ours." The charms giggle (motion only, A3). The footnote types for people who pause.
 * The scene whips out to the right on its last 4 frames; T3 whips in.
 */

export const T2_RECORDS = [
  { chain: "btc" as const, label: "BTC · coin 7d…e2:1" },
  { chain: "evm" as const, label: "ETH · nonce 1" },
  { chain: "sol" as const, label: "SOL · blockhash 9f…" },
];

// ── the board (world px at zoom 1 = the settled framing) ─────────────────────────────────────────────────────────
const PS = 2.5; // plaque scale (UI → px): the plaque is ≈ 950 × 485
const PX = 214; // plaque top-left
const PY = 262;
const CARD_W = 520; // Satchel #7 showing its back (the history), right of the plaque
const CARD_X = 1238;
const CARD_Y = 296;
const CHARM_SIZE = 0.22;
const HK = PS; // the hand's scale matches the plaque
const HSIZE = 1.3;
const CAP_Y = 150;

export default function T2() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beats = sceneBeats("T2");
  const vo = voF("T2", "V19");

  // ── timing (scene frames), from the voice, landed on the groove ──────────────────────────────────────────────
  const capNo = vo.word(1); // "No admin key." lands on "there's", so it reads ≥ 1.55 s before "Not even ours." replaces it
  const capNot = vo.sentence(1); // "Not even ours." lands on "Not", after the narrator's beat
  const zeroAt = onBeat(vo.word(2), beats); // the "0" pops on the beat under "no"
  const pinchAt = beatAfter(vo.word(4, "end") - 3, beats); // the pinch closes on nothing as "key." ends: the "tok"
  const handIn = pinchAt - 26; // the hand enters
  const openAt = pinchAt + 8; // pulled back: it opens, empty
  const handOut = Math.max(capNot + 14, vo.word(7) + 2); // leaves on "ours."
  const giggleAt = onBeat(vo.word(7) + 6, beats); // the charms giggle as "ours." lands
  const typeFrom = vo.sentence(2); // the footnote types under "So it can't sign anything off the record."
  const typeTo = vo.word(15) - 4;
  const end = vo.duration; // 195
  const whipFrom = end - 4; // whip out to T3 (the cut is the scene boundary)

  // ── camera: a macro on the history → pull back to the contract; whip right at the end ─────────────────────────
  const cardCX = CARD_X + CARD_W / 2;
  const cardCY = CARD_Y + 175;
  const pull = interpolate(f, [0, 24], [0, 1], { ...clamp, easing: Easing.bezier(0.55, 0, 0.3, 1) });
  const z0 = 2.0;
  const zoom = Math.exp(Math.log(z0) * (1 - pull));
  let camX = cardCX + (960 - cardCX) * pull;
  const camY = cardCY + (544 - cardCY) * pull;
  let smear = 1;
  let whipX = 0; // screen px the whole frame has travelled (captions travel with it)
  if (f >= whipFrom) {
    const w = (u: number) => Math.pow(interpolate(u, [whipFrom, end], [0, 1], clamp), 2.2);
    whipX = 1150 * w(f);
    camX += whipX;
    smear = 1 + Math.min(0.25, (1150 * (w(f) - w(f - 1))) / 1000);
  }

  // ── plaque ────────────────────────────────────────────────────────────────────────────────────────────────────
  const zero = f < zeroAt - 4 ? 0 : spring({ frame: f - (zeroAt - 4), fps, config: SPRING2.pop });
  const searching = f >= handIn + 10 && f < openAt + 4;
  const march = searching ? (f - handIn - 10) * 0.8 : 0;
  const reveal = interpolate(f, [typeFrom, typeTo], [0, 1], clamp);
  const slot = plaqueSlot();
  // the empty key's bow, in world px
  const bowX = PX + (slot.x + 44) * PS;
  const bowY = PY + (slot.y + slot.h / 2 - 3) * PS;

  // ── the team's hand (palm-anchored, so the pinch → open switch keeps the palm in place) ─────────────────────
  const pinchProps: HandProps = { pose: "pinch", k: HK, size: HSIZE, angle: 34, sleeve: "team", anchor: "palm", x: 0, y: 0, pinch: 1 };
  const tip = handPoint(pinchProps, "contact"); // thumb/index tips relative to the palm centre
  const palmAtBow = { x: bowX + 4 - tip.x, y: bowY + 2 - tip.y };
  const enter = spring({ frame: f - handIn, fps, config: SPRING2.land });
  const reachIn = interpolate(f, [handIn + 9, pinchAt - 3], [0, 1], { ...clamp, easing: EASE2.out });
  const pinch = interpolate(f, [pinchAt - 4, pinchAt], [0, 1], { ...clamp, easing: EASE2.fall });
  const back = interpolate(f, [pinchAt + 1, openAt + 2], [0, 1], { ...clamp, easing: EASE2.out });
  const leave = interpolate(f, [handOut, handOut + 9], [0, 1], { ...clamp, easing: EASE2.fall });
  const off = { x: -600, y: 640 };
  const near = { x: -60, y: 60 };
  // after the pinch it pulls out (towards us: a touch bigger) and slides left of the slot, so the empty dashed key
  // stays in view while the open fingers wiggle
  const palmX = palmAtBow.x + off.x * (1 - enter) + near.x * (1 - reachIn) * enter - 140 * back - 380 * leave;
  const palmY = palmAtBow.y + off.y * (1 - enter) + near.y * (1 - reachIn) * enter - 24 * back + 640 * leave;
  const handScale = 1 + 0.05 * back * (1 - leave);
  const opened = f >= openAt;
  const openPop = opened ? spring({ frame: f - openAt, fps, config: SPRING2.pop }) : 0;
  const wiggle = opened ? interpolate(f, [openAt, openAt + 3, handOut, handOut + 6], [0, 1, 1, 0], clamp) : 0;
  const phase = (f - openAt) * 1.2;
  const squash = interpolate(f, [pinchAt, pinchAt + 1, pinchAt + 4], [1, 1, 0], clamp);
  const handVisible = f >= handIn - 1 && leave < 1;
  // the pinch → open pose change: the arm turns 34° → −6° (and the sleeve bends 0° → 26°) evenly over 6 f around the
  // switch (≈ 7° a frame) instead of snapping in one frame; the palm anchor holds the hand in place while it turns
  const turn = interpolate(f, [openAt - 4, openAt + 2], [0, 1], clamp);
  const handAngle = 34 + (-6 - 34) * turn;
  const handArm = 26 * turn;
  const shownHand: HandProps = opened
    ? { pose: "open", anchor: "palm", x: palmX, y: palmY, k: HK, size: HSIZE * handScale, angle: handAngle, arm: handArm, sleeve: "team", spread: 0.9 * openPop, wiggle, phase }
    : { ...pinchProps, x: palmX, y: palmY, size: HSIZE * handScale, angle: handAngle, arm: handArm, pinch, squash };
  // the "satchelhq" sleeve tag, drawn 40 px further up the arm than the kit puts it (clear of the bottom margin)
  const tagAt = handPoint(shownHand, "tag");
  const wristAt = handPoint(shownHand, "wrist");
  const toWrist = Math.hypot(wristAt.x - tagAt.x, wristAt.y - tagAt.y) || 1;
  const tagX = tagAt.x + ((wristAt.x - tagAt.x) / toWrist) * 40;
  const tagY = tagAt.y + ((wristAt.y - tagAt.y) / toWrist) * 40;

  // ── charms: look at the plaque, widen at the "tok", giggle as "ours." lands ───────────────────────────────────
  const lag = { btc: 4, evm: 2, sol: 0 } as const;
  const chains = ["btc", "evm", "sol"] as const;
  const charms = chains.map((c, i) => {
    const g = f - giggleAt - lag[c];
    const t = g / FPS;
    const hop = g >= 0 && g < 16 ? Math.abs(Math.sin((g / 8) * Math.PI)) * 9 * (g < 8 ? 1 : 0.6) : 0;
    const joy = interpolate(g, [0, 2, 26, 31], [0, 1, 1, 0], clamp);
    const lookIn = interpolate(f, [zeroAt - 7 + lag[c], zeroAt - 4 + lag[c]], [0, 1], { ...clamp, easing: EASE2.out });
    const lookHand = interpolate(f, [handIn + 6, handIn + 9], [0, 1], { ...clamp, easing: EASE2.out });
    const lookBack = interpolate(f, [giggleAt + 28, giggleAt + 31], [0, 1], { ...clamp, easing: EASE2.out });
    const lx = (-7 * lookIn) * (1 - lookBack);
    const ly = (-2 * lookIn + 5 * lookHand * lookIn) * (1 - lookBack);
    const wide = interpolate(f - pinchAt - lag[c], [0, 2, 7, 10], [0, 1, 1, 0], clamp);
    const blink = charmBlink(f / FPS, [(zeroAt - 8 + lag[c]) / FPS, (giggleAt + 29 + lag[c]) / FPS, (138 + 21 * i) / FPS]);
    const face: CharmFace = { look: { x: lx, y: ly }, wide, joy, blink: joy > 0.5 ? 0 : blink, smile: 1 + 0.6 * joy, grin: 0.4 * joy };
    const angle = charmKick(c, t, i === 1 ? -9 : 9) + charmKick(c, (f - pinchAt - lag[c]) / FPS, 3);
    return { angle, face, dy: -hop };
  });

  return (
    <AbsoluteFill style={{ background: C.ground, overflow: "hidden" }}>
      <div style={cameraStyle(camX, camY, zoom, smear, 1 / smear)}>
        <At x={PX} y={PY}>
          <ContractPlaque scale={PS} zero={zero} march={march} footnote reveal={reveal} />
        </At>
        <At x={CARD_X} y={CARD_Y}>
          <CardWithCharms width={CARD_W} front={<CardBack width={CARD_W} records={T2_RECORDS} />} charmSize={CHARM_SIZE} charms={charms} />
        </At>
        {handVisible ? (
          <>
            <Hand {...shownHand} tag={null} />
            <svg width={1} height={1} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
              <NameTag x={tagX} y={tagY} text="satchelhq" k={HK} tilt={-2} />
            </svg>
          </>
        ) : null}
      </div>

      <div style={{ position: "absolute", inset: 0, translate: `${-whipX}px 0`, scale: `${smear} ${1 / smear}` }}>
        <Caption text="No admin key." contact={capNo} leaveAt={Math.round(capNot) - 4} y={CAP_Y} seed="t2-no-admin" />
        <Caption text="Not even ours." contact={capNot} y={CAP_Y} seed="t2-not-even" swapIn />
      </div>

      {/* sound: the pull-back, the slaps, the empty slot's "tok", the charms, the typing (the whip's whoosh is in T3) */}
      <Sfx name="whoosh-soft" at={4 / FPS} align="peak" gainDb={-8} />
      <Sfx name="sticker-slap" at={capNo / FPS} gainDb={-9} />
      <Sfx name="pop" at={zeroAt / FPS} gainDb={-4} />
      <Sfx name="lock-click" at={pinchAt / FPS} />
      <Sfx name="sticker-slap" at={capNot / FPS} gainDb={-9} />
      <Sfx name="charm-jingle" at={(giggleAt + 4) / FPS} align="peak" gainDb={-1} />
      <Sfx name="type-run" at={typeFrom / FPS} gainDb={-7} />
      <Sfx name="type-run" at={(typeFrom + 28) / FPS} gainDb={-9} />
    </AbsoluteFill>
  );
}
