import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { type CharmFace, charmKick } from "../../brand/Charm";
import { C, type Chain, F, sans } from "../../brand/tokens";
import { CardBack, CardWithCharms, Hand, type HandProps } from "../../illustration/characters";
import { Snowflake } from "lucide-react";
import { FrostLaminate, PriceTag, priceTagSize, textWidth } from "../../illustration/props";
import { Sfx } from "../../lib/Sfx";
import { getScene, marker } from "../../lib/timeline";
import { FPS } from "../../lib/time";
import { blinkSchedule, CHARM_LAG, clamp, EASE2, eyeOpen, HANDOFF, handoffAt, pressAt, rideAngle, smear, SPRING2 } from "../../motion";
import { PAGE7, ROWS7, TABS } from "../T5";
import { Browser, CAM_MID, type Cam, CameraView, camAt, Caption, type CharmAnim, mixFace, SalePage, SparkPoints } from "../T5/sale";

/**
 * T7 · The hand-off (116–126.5 s, held 20 f under the peel to E1). Back on #7's tab, carol.near presses "Buy for
 * 2,000 NEAR" → "Re-checking history…" → "Approve in your wallet…" ("One transaction."). A whip to the world: bob
 * holds Satchel #7 by its corner, back up and still frosted, the price tag on it; a binder clip snaps the tag on and
 * it reads "bound to 3 signatures". ONE MOVE: the frost melts, the card flips to its front and swings like a charm from
 * bob's hand to carol's (white sleeve, ink stripes) while the tag pops off and flies the other way, over the card, to
 * bob ("pays the seller"). Both land on the music's landing (122.0) with the charm jingle; the charms cheer.
 * "Satchel #7 is yours." · "You now control 0.05 BTC · 0.80 ETH · 12 SOL · 800 USDC."
 */

const SC = getScene("T7");
const fr = (sec: number) => Math.round(sec * FPS);

const LAND = fr(marker("landing") - SC.start); // 180: the card and the tag land here
const H0 = LAND - HANDOFF.contact; // the hand-off clock's frame 0
const T = {
  end: fr(SC.duration),
  camBuy: [5, 21] as const,
  handIn: 10,
  press: 26, // just after "clean," (bar 59 + 1 beat + 11 f)
  recheck: 28,
  wallet: 46,
  whip: 66, // the cut, on the fastest frame
  clip: fr(SC.wordAt("V25", "bound")) + 4,
  camW3: [H0 - 26, H0 - 6] as const,
  carolIn: H0 - 24,
  melt: H0 - 5,
  yours: fr(SC.wordAt("V26", "gets")) - 2,
  control: fr(SC.wordAt("V26", "everything")) - 4,
};
// "One transaction." lands as the world arrives (end of "transaction"): the browser close-up has no clear band
const CAP_ONE = T.whip + 6;
const CAP_ONE_OUT = H0 - 30;
const NOTE_AT = T.clip + 3;
const TAG_POP = H0 + 1;
const TAG_TOP = H0 + 8; // the tag hangs at the top of its hop, the card swings under it
const CHEER = LAND + 4;

// ── the world (px at zoom 1) ─────────────────────────────────────────────────────────────────────────────────────
const CW = 720; // card width (k 1.8)
const KC = CW / 400;
const CH = (CW * 252) / 400;
const CARD_TOP = 300;
const FROM_X = 560; // card centre at bob
const TO_X = 1360; // card centre at carol
const BOB_PINCH = { x: FROM_X - CW / 2 + 26, y: CARD_TOP + 26 };
const CAROL_PINCH = { x: TO_X + CW / 2 - 26, y: CARD_TOP + 26 };
const TAG_SCALE = 1.8;
const TAG_TEXT = "2,000 NEAR";
const NOTE = "bound to 3 signatures";

const W1: Cam = { x: 600, y: 520, z: 1.0 };
const W1T: Cam = { x: 772, y: 336, z: 2.0 };
const W3: Cam = { x: 960, y: 482, z: 0.86 };
const W4: Cam = { x: 985, y: 478, z: 0.9 };
/** BUY_CU: the Buy panel fills the frame below a caption band (browser px). */
const BUY_CU: Cam = { x: 253, y: 327, z: 2.2 };

const CHAINS: Chain[] = ["btc", "evm", "sol"];
const KIT: Record<Chain, "btc" | "eth" | "sol"> = { btc: "btc", evm: "eth", sol: "sol" };

/** The card on its corner-to-corner hand-off clock. */
const cardMove = (f: number, fps: number) => handoffAt(f - H0, fps, { fromX: FROM_X, toX: TO_X, rest: 4 * KC });

/** Charms riding the card (relative to the card: 1.5× its angle, lagged, minus the card's own angle) + reactions. */
function cardCharm(f: number, i: number, fps: number) {
  const chain = CHAINS[i];
  const kit = KIT[chain];
  const t = f / fps;
  const h = f - H0;
  const o = { fromX: FROM_X, toX: TO_X, rest: 4 * KC };
  const lag = [3, 2, 2][i];
  let angle = rideAngle(h, fps, o, lag) - handoffAt(h, fps, o).rotate;
  // landing: they swing on past the stop (to the right), each on its own spring
  angle += charmKick(chain, t - (LAND + 1 + CHARM_LAG[kit]) / fps, -9);
  // the clip snapping on: a small jiggle; the cheer: a happy swing
  angle += charmKick(chain, t - (T.clip + 1 + CHARM_LAG[kit]) / fps, 4);
  angle += charmKick(chain, t - (CHEER + CHARM_LAG[kit] + 8) / fps, 6);

  const blinks = blinkSchedule(`t7-${chain}`, 70, T.end + 40, [LAND + 1]);
  let face: CharmFace = { blink: (1 - eyeOpen(f, blinks)) / 0.88, smile: 1.2, look: { x: 0, y: -2 } };
  // they watch the tag get clipped (up and to the right)
  if (f >= T.clip - 8 && f < H0 - 16) face = mixFace(face, { ...face, look: { x: 6, y: -5 }, wide: f < T.clip + 10 ? 0.35 : 0 }, interpolate(f, [T.clip - 8, T.clip - 5], [0, 1], clamp));
  // pointers: they look where the card is going (carol's hand) just before the move
  if (f >= H0 - 16 && f < H0 + 6) face = mixFace(face, { ...face, look: { x: 8, y: 0 }, smile: 1.35 }, interpolate(f, [H0 - 16 - CHARM_LAG[kit], H0 - 13], [0, 1], clamp));
  // eyes closed for the ride
  if (h >= HANDOFF.slideStart && h < HANDOFF.contact + 1) face = { ...face, blink: 1, smile: 1.3, look: { x: 0, y: 0 } };
  // the cheer, in reaction order
  const ch = f - (CHEER + CHARM_LAG[kit]);
  let hop = 0;
  if (ch >= 0) {
    face = ch < 8 ? { joy: 1, smile: 1.6, look: { x: 0, y: -1 } } : mixFace({ joy: 1, smile: 1.6 }, { ...face, joy: 0, smile: 1.45, look: { x: -2, y: 1 } }, interpolate(ch, [8, 14], [0, 1], clamp));
    hop = 12 * (spring({ frame: ch, fps, config: SPRING2.pop }) - spring({ frame: ch - 7, fps, config: SPRING2.land }));
  }
  return { angle, face, hop };
}

/** The page's charms in the browser phase: T5's happy end state; they look at the Buy button before the press. */
function pageCharm(f: number, r: number): CharmAnim {
  const chain = ROWS7[r].chain;
  const blinks = blinkSchedule(`t7p-${chain}`, 0, 80, []);
  let face: CharmFace = { blink: (1 - eyeOpen(f, blinks)) / 0.88, smile: 1.4, look: { x: -2, y: 1 } };
  const k = interpolate(f, [T.press - 10 - 2 * r, T.press - 7 - 2 * r], [0, 1], clamp);
  face = mixFace(face, { ...face, look: { x: -8, y: -2 } }, k);
  return { angle: 0, face };
}

export default function T7Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.min(frame, T.end + 20);
  const spin = (f % 24) / 24;
  const inWorld = f >= T.whip;

  // ── the browser phase ────────────────────────────────────────────────────────────────────────────────────────
  const camB = camAt(f, [
    { f: 0, cam: CAM_MID },
    { f: T.camBuy[0], cam: CAM_MID },
    { f: T.camBuy[1], cam: BUY_CU },
  ]);
  const arrive = spring({ frame: f, fps, config: SPRING2.land });
  const pr = pressAt(f, T.press, 4, fps);
  const mode = f < T.recheck ? "enabled" : f < T.wallet ? "recheck" : "wallet";
  // carol's tap: in from below on a shallow arc (land), presses with the button, leaves accelerating down
  const handInP = spring({ frame: f - T.handIn, fps, config: SPRING2.land });
  const handOut = interpolate(f, [T.press + 6, T.press + 14], [0, 1], { ...clamp, easing: EASE2.fall });
  const btn = { x: 40 + 20 + 330, y: 96 + 18 + 58 + 14 + 28 }; // the Buy button's right end (the label stays readable)
  const tap: HandProps = {
    pose: "tap",
    x: btn.x + 30 * (1 - handInP) + 6,
    y: btn.y + 6 + 300 * (1 - handInP) + 4 * pr.pressed + 360 * handOut,
    k: 1,
    sleeve: "carol",
    press: pr.pressed,
    angle: -6 + 8 * (1 - handInP),
    squash: pr.pressed > 0.95 && f < T.press + 3 ? 1 : 0,
  };

  // the whip: the browser flies off right (expo-in), the world flies in from the left (expo-out); 2-frame smears
  const W = 1920;
  const outX = (g: number) => interpolate(g, [T.whip - 6, T.whip], [0, 0.75 * W], { ...clamp, easing: EASE2.fall });
  const inX = (g: number) => interpolate(g, [T.whip, T.whip + 9], [-0.4 * W, 0], { ...clamp, easing: EASE2.out });
  const vOut = outX(f) - outX(f - 1);
  const vIn = inX(f) - inX(f - 1);
  const smB = f >= T.whip - 2 ? smear(vOut * 1.4) : { along: 1, across: 1 };
  const smW = f < T.whip + 2 ? smear(vIn * 1.4) : { along: 1, across: 1 };

  // ── the world phase ──────────────────────────────────────────────────────────────────────────────────────────
  const camW = camAt(f, [
    { f: T.whip, cam: W1 },
    { f: T.clip - 2, cam: W1 },
    { f: T.clip + 14, cam: W1T },
    { f: T.camW3[0], cam: W1T },
    { f: T.camW3[1], cam: W3 },
    { f: LAND + 8, cam: W3 },
    { f: T.end, cam: W4 },
  ]);
  const thump = interpolate(f - LAND, [0, 1, 5], [0, 6, 0], { ...clamp, easing: EASE2.out });

  const m = cardMove(f, fps);
  const flip = 1 + spring({ frame: f - H0, fps, config: SPRING2.quick });
  const melt = interpolate(f, [T.melt, T.melt + 8], [0, 1], { ...clamp, easing: EASE2.fall });
  const charms = [0, 1, 2].map((i) => cardCharm(f, i, fps));

  // hands: bob pinches the card's top-left corner (sky sleeve); carol waits at the landing (stripes)
  const bobRelease = interpolate(f, [H0 + 2, H0 + 6], [1, 0], clamp);
  const bobCatch = interpolate(f, [LAND - 1, LAND + 1], [0, 1], clamp);
  const bobPinch = f < LAND - 1 ? bobRelease * 1 + (1 - bobRelease) * 0.15 : 0.15 + 0.85 * bobCatch;
  const catchDip = (at: number) => interpolate(f - at, [-2, 0, 1, 8], [-6, 8, 8, 0], { ...clamp, easing: EASE2.out }) * (f >= at - 2 ? 1 : 0);
  const bob: HandProps = {
    pose: "pinch",
    x: BOB_PINCH.x,
    y: BOB_PINCH.y + (f >= LAND - 2 ? catchDip(LAND) : 0) + interpolate(f, [H0, H0 + 6], [0, -10], clamp) * (1 - bobCatch),
    k: KC,
    sleeve: "bob",
    angle: 96,
    pinch: bobPinch,
    squash: f >= LAND && f < LAND + 2 ? 1 : 0,
  };
  const carolIn = spring({ frame: f - T.carolIn, fps, config: SPRING2.land });
  const carol: HandProps = {
    pose: "pinch",
    x: CAROL_PINCH.x + 420 * (1 - carolIn),
    y: CAROL_PINCH.y + catchDip(LAND),
    k: KC,
    sleeve: "carol",
    angle: 96,
    mirror: true,
    pinch: f < LAND - 1 ? 0.15 : interpolate(f, [LAND - 1, LAND + 1], [0.15, 1], clamp),
    squash: f >= LAND && f < LAND + 2 ? 1 : 0,
  };

  // the tag: on the card's top-right corner; clipped on "bound"; pops off with the lift, hangs over the swinging card,
  // then drops into bob's fingers ("pays the seller")
  const hasNote = f >= NOTE_AT;
  const tagSize = priceTagSize(TAG_TEXT, hasNote ? NOTE : undefined);
  const tagW = tagSize.w * TAG_SCALE;
  const holeOff = { x: 17 * TAG_SCALE, y: (tagSize.h / 2) * TAG_SCALE };
  const clipX = (tagSize.w - 46) * TAG_SCALE; // the binder clip's x on the tag
  const tagHome = { x: FROM_X + CW / 2 - 30 - clipX, y: CARD_TOP - 18 }; // tag top-left: its clip bites the card's top edge
  const homeHole = { x: tagHome.x + holeOff.x, y: tagHome.y + holeOff.y };
  const landHole = { x: BOB_PINCH.x - 4, y: BOB_PINCH.y + 4 };
  const pop = interpolate(f, [TAG_POP, TAG_TOP], [0, 1], { ...clamp, easing: EASE2.out });
  const fly = interpolate(f, [TAG_TOP, LAND], [0, 1], { ...clamp, easing: EASE2.swing });
  const topHole = { x: homeHole.x + 20, y: homeHole.y - 190 };
  const holeX = f < TAG_TOP ? homeHole.x + (topHole.x - homeHole.x) * pop : topHole.x + (landHole.x - topHole.x) * fly;
  const holeY = f < TAG_TOP ? homeHole.y + (topHole.y - homeHole.y) * pop : topHole.y + (landHole.y - topHole.y) * fly - 70 * Math.sin(Math.PI * fly);
  const tagTilt = f < TAG_POP ? -4 : f < TAG_TOP ? -4 - 10 * pop : interpolate(fly, [0, 0.5, 1], [-14, -24, -2]);
  const tagClip = f < T.clip - 6 ? 0 : f < TAG_POP ? interpolate(f, [T.clip - 6, T.clip], [0, 1], { ...clamp, easing: EASE2.fall }) : interpolate(f, [TAG_POP, TAG_POP + 4], [1, 0], clamp);
  const tagDrop = f < TAG_POP ? 1 : f < LAND ? 1 + 2.4 * Math.sin(Math.PI * Math.min(1, (f - TAG_POP) / (LAND - TAG_POP))) : interpolate(f, [LAND, LAND + 6], [0, 1], clamp);
  // the note re-slaps the tag as it appears; the clip's contact squashes it
  const noteSlap = hasNote ? 1 + 0.08 * Math.max(0, 1 - spring({ frame: f - NOTE_AT, fps, config: SPRING2.rebound })) : 1;
  const tagScale = (f >= T.clip && f < T.clip + 3 ? 0.96 : 1) * noteSlap;

  // landing sparkles around carol's card (world px)
  const sparks = [
    { x: TO_X - CW / 2 - 64, y: CARD_TOP + 70, r: 44 },
    { x: TO_X + CW / 2 + 40, y: CARD_TOP + CH - 40, r: 40 },
    { x: TO_X - 150, y: CARD_TOP - 70, r: 30 },
    { x: TO_X - CW / 2 - 40, y: CARD_TOP + CH + 10, r: 26 },
    { x: TO_X + 120, y: CARD_TOP - 64, r: 24 },
    { x: TO_X + CW / 2 + 70, y: CARD_TOP + CH + 60, r: 20 },
  ];

  const cardFront = { lift: m.lift / (8 * KC) };
  // the back as T4 left it: the frost laminate (pill low) and the header's "3 signatures" sealed in ice; both melt
  const cardBack = (
    <CardBack width={CW} lift={cardFront.lift} records={ROWS7.map((r) => ({ chain: r.chain, label: r.label }))}>
      <FrostLaminate width={400} height={252} progress={1} pill={1} pillY={0.6} melt={melt} k={1} />
      <IceSeal show={1 - melt} />
    </CardBack>
  );

  return (
    <AbsoluteFill style={{ background: C.ground, overflow: "hidden" }}>
      {/* ── browser ── */}
      {!inWorld ? (
        <AbsoluteFill style={{ translate: `${outX(f)}px 0`, scale: `${smB.along} ${smB.across}`, transformOrigin: "50% 50%" }}>
          <CameraView cam={camB}>
            <Browser tabs={TABS} active={0} url="satchel/s/7" account="carol.near" slap={f}>
              <SalePage
                {...PAGE7}
                rows={ROWS7}
                rowAnim={[{ stamp: 1 }, { stamp: 1 }, { stamp: 1 }]}
                charms={[0, 1, 2].map((r) => pageCharm(f, r))}
                verdict="clean"
                checked
                buy={{ mode, wake: 1, lift: pr.lift, press: mode === "enabled" ? pr.pressed : 0, spin, gatePop: f >= T.recheck ? interpolate(f, [mode === "wallet" ? T.wallet : T.recheck, (mode === "wallet" ? T.wallet : T.recheck) + 8], [0, 1], clamp) : undefined }}
                spin={spin}
                contentY={40 * (1 - arrive)}
                overlay={handInP > 0.001 && handOut < 1 ? <Hand {...tap} /> : null}
              />
            </Browser>
          </CameraView>
        </AbsoluteFill>
      ) : null}

      {/* ── the world: bob, carol, Satchel #7 and the tag ── */}
      {inWorld ? (
        <AbsoluteFill style={{ translate: `${inX(f)}px ${thump}px`, scale: `${smW.along} ${smW.across}`, transformOrigin: "50% 50%" }}>
          <CameraView cam={camW} w={2600} h={1400}>
            <Hand {...bob} layer="back" />
            {carolIn > 0.001 ? <Hand {...carol} layer="back" /> : null}
            <div
              style={{
                position: "absolute",
                left: m.x - CW / 2,
                top: CARD_TOP + m.arcY,
                width: CW,
                height: CH,
                transformOrigin: "50% -6%",
                rotate: `${m.rotate}deg`,
                scale: `${m.scale * (1 + m.squash)} ${m.scale * (1 - m.squash)}`,
              }}
            >
              <CardWithCharms
                width={CW}
                charmSize={0.19}
                yours={f >= LAND + 8}
                lift={cardFront.lift}
                flip={flip}
                back={cardBack}
                charms={charms.map((c) => ({ angle: c.angle, face: c.face, dy: -c.hop }))}
              />
            </div>
            <div style={{ position: "absolute", left: holeX - holeOff.x, top: holeY - holeOff.y, transformOrigin: `${holeOff.x}px ${holeOff.y}px`, scale: `${tagScale}` }}>
              <PriceTag text={TAG_TEXT} note={hasNote ? NOTE : undefined} scale={TAG_SCALE} clip={tagClip} tilt={tagTilt} drop={tagDrop} swing={f >= TAG_POP && f < LAND + 10 ? 18 * Math.sin((f - TAG_POP) / 3) * Math.max(0, 1 - (f - TAG_POP) / 36) : 0} />
            </div>
            <Hand {...bob} layer="front" />
            {carolIn > 0.001 ? <Hand {...carol} layer="front" /> : null}
            <SparkPoints f={f - LAND - 1} points={sparks} k={1.4} />
          </CameraView>
        </AbsoluteFill>
      ) : null}

      {/* captions */}
      <Caption frame={f} text="One transaction." contact={CAP_ONE} out={CAP_ONE_OUT} y={58} size={124} seed="t7-one" />
      <Caption frame={f} text="Satchel #7 is yours." contact={T.yours} y={40} size={118} seed="t7-yours" />
      {f >= T.control ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 178, display: "flex", justifyContent: "center", textAlign: "center" }}>
          <Rise frame={f - T.control} />
        </div>
      ) : null}

      {/* sound */}
      <Sfx name="sticker-slap" at={4 / FPS} gainDb={-9} />
      <Sfx name="button-thock-deep" at={T.press / FPS} gainDb={0} />
      <Sfx name="tick-soft" at={(T.press + 3) / FPS} gainDb={-2} />
      <Sfx name="sticker-slap" at={CAP_ONE / FPS} gainDb={-7} />
      <Sfx name="whoosh-zip" at={T.whip / FPS} align="peak" gainDb={-2} />
      <Sfx name="lock-click" at={T.clip / FPS} gainDb={-1} />
      <Sfx name="magic-wand" at={T.melt / FPS} gainDb={-8} />
      <Sfx name="whoosh-soft" at={(H0 + 3) / FPS} align="peak" gainDb={-9} />
      <Sfx name="swing-swish" at={(H0 + HANDOFF.apex) / FPS} align="peak" gainDb={-5} />
      <Sfx name="charm-jingle" at={LAND / FPS} align="peak" gainDb={0} />
      <Sfx name="sticker-slap" at={LAND / FPS} gainDb={-3} />
      <Sfx name="coin-ding" at={(LAND + 3) / FPS} gainDb={-6} />
      <Sfx name="sticker-slap" at={T.yours / FPS} gainDb={-8} />
    </AbsoluteFill>
  );
}

/** T4's ice over the header's "3 signatures" (card UI units, drawn inside CardBack): the price is frozen to it. */
function IceSeal({ show }: { show: number }) {
  if (show <= 0.001) return null;
  const head = { family: F.sans, weight: 700, size: 18 };
  const tail = { family: F.sans, weight: 600, size: 18 };
  const x0 = 18 + textWidth("History", head) + textWidth(" · ", tail) - 6;
  const x1 = 18 + textWidth("History", head) + textWidth(" · 3 signatures", tail) + 6;
  return (
    <div
      style={{
        position: "absolute",
        left: x0,
        top: 18,
        width: x1 - x0 + 22,
        height: 30,
        borderRadius: 10,
        background: "#eef4ff",
        border: `2px solid ${C.frozen}`,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "0 0 0 5px",
        scale: `${show}`,
        opacity: Math.min(1, show * 2),
        transformOrigin: "30% 50%",
      }}
    >
      <span style={{ ...sans(600), fontSize: 18, color: C.frozen, whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>3 signatures</span>
      <Snowflake size={15} strokeWidth={2.4} color={C.frozen} style={{ flexShrink: 0 }} />
    </div>
  );
}

/** "You now control 0.05 BTC · 0.80 ETH · 12 SOL · 800 USDC." rising line by line (must-read: Onest 600, 56 px). */
function Rise({ frame }: { frame: number }) {
  return (
    <div style={{ display: "inline-block" }}>
      <RiseInner frame={frame} />
    </div>
  );
}

function RiseInner({ frame }: { frame: number }) {
  // line 1 in Onest (must-read, 56 px); the amounts in Funnel Display 800 with tabular figures (motion bible §2.9)
  const lines = [
    { text: "You now control", style: { fontFamily: '"Onest", system-ui, sans-serif', fontSize: 56, fontWeight: 600 } },
    { text: "0.05 BTC · 0.80 ETH · 12 SOL · 800 USDC.", style: { fontFamily: '"Funnel Display", Onest, sans-serif', fontSize: 58, fontWeight: 800, letterSpacing: "-0.02em" } },
  ];
  return (
    <div style={{ lineHeight: 1.1, color: C.ink, fontVariantNumeric: "tabular-nums" }}>
      {lines.map((line, i) => {
        const y = interpolate(frame, [i * 3, i * 3 + 16], [110, 0], { ...clamp, easing: EASE2.out });
        return (
          <div key={i} style={{ overflow: "hidden", paddingBottom: "0.08em", ...line.style }}>
            <div style={{ translate: `0 ${y}%` }}>{line.text}</div>
          </div>
        );
      })}
    </div>
  );
}

