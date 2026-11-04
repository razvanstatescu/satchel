import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame } from "remotion";
import { C } from "../../brand/tokens";
import { MintScreen, type MintState } from "../../components/ui";
import { getScene } from "../../lib/timeline";
import { Sfx } from "../../lib/Sfx";
import { clamp, EASE2, pressAt, slapAt, SparkBurst, SPRING2 } from "../../motion";
import {
  CaptionAt,
  CARD,
  CHAINS3,
  cardGeo,
  charmBlink,
  type CharmSlot,
  ease,
  EmptySlot,
  fr,
  FPS,
  lerp,
  YoursSticker,
  NftChip,
  Phone,
  PH_CARD,
  PHONE,
  releaseSwing,
  sp,
  type TagState,
  TagsLayer,
  TapHand,
  ui,
  WorldCard,
} from "./stage";

/**
 * P1 Mint (12–18 s, V05 "Mint one on NEAR, and it gets its own Bitcoin, Ethereum and Solana addresses.").
 * Revealed under H2's central peel (the phone is already composed at f0). alice's finger presses "Mint a Satchel"
 * into its shadow; the button narrates "Approve in your wallet…" → "Minting…"; the minted card crouches and LEAPS out
 * of the phone into the world as Satchel #7 (its lemon "Yours" sticker pops on mid-air) and slaps down; its charm bar
 * draws in and the three charms snap on (a quick echo of the hook); an address tag prints under each charm on the
 * words "Bitcoin", "Ethereum", "Solana"; a "Standard NEAR NFT" chip lands on "addresses".
 * The last frame is P2's first frame (the shared stage in ./stage.tsx).
 */

const sc = getScene("P1");
const W = (prefix: string) => fr(sc.wordAt("V05", prefix));

// ── the clock (frames, scene-local), keyed to V05 ──────────────────────────────────────────────────────────────
export const P1T = (() => {
  const near = W("NEAR");
  const btc = W("Bitcoin");
  const eth = W("Ethereum");
  const sol = W("Solana");
  const addr = W("addresses");
  // V05 now starts on the scene's first frame, under H2's peel (f0–19): the caption lands on "on NEAR" once the
  // frame is clear and the finger presses just before "NEAR"; the mint then runs tighter so the charms are on before
  // the first tag prints on "Bitcoin".
  const on = fr(sc.word("V05", 2));
  const press = Math.max(near - 2, 20);
  const wallet = press + 3;
  const minting = wallet + 9;
  const minted = minting + 8;
  const crouch = minted + 3;
  const takeoff = crouch + 3;
  const land = takeoff + 14; // contact frame
  const snaps = [land + 2, land + 6, land + 10];
  return { press, wallet, minting, minted, crouch, takeoff, land, snaps, btc, eth, sol, addr, cap1: Math.max(on, 18) - 4, cap2: btc - 4, tags: [btc, eth, sol], end: fr(sc.duration) };
})();

const T = P1T;

const START = (() => {
  const a = ui(PH_CARD.x, PH_CARD.y);
  const w = PH_CARD.w * PHONE.k;
  return { cx: a.x + w / 2, cy: a.y + (PH_CARD.h * PHONE.k) / 2, w };
})();
const G = cardGeo();
const END = { cx: CARD.cx, cy: CARD.top + G.H / 2, w: CARD.w };
const BUTTON = ui(195, 785); // the Mint button's centre (frame px)
const TAP = ui(306, 790); // where the finger lands: the button's right third, so its label stays readable

export default function P1() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ground }}>
      <P1World f={f} />
      <P1Captions />
      <P1Sound />
    </AbsoluteFill>
  );
}

/** The minted Mint screen as the leap leaves it: the card's spot empty, the footer slid away (P2 opens on this). */
export function MintPhoneAfter({ footerOut = 1, slot = 1, state = "minted", press = 0, f = 0, cardScaleY = 1 }: { footerOut?: number; slot?: number; state?: MintState; press?: number; f?: number; cardScaleY?: number }) {
  const gone = slot > 0;
  return (
    <>
      <div style={{ position: "absolute", left: 0, top: 0, width: 390, height: 844 + 190 * footerOut }}>
        <MintScreen
          state={state}
          press={press}
          spin={(f % 24) / 24}
          pulse={(f % 30) / 30}
          cardStyle={gone ? { visibility: "hidden" } : { scale: `1 ${cardScaleY}`, transformOrigin: "50% 100%" }}
        />
      </div>
      {gone ? <EmptySlot show={slot} /> : null}
    </>
  );
}

// ── the world layer (phone, hand, card, charms, tags) under a gentle camera ────────────────────────────────────
function P1World({ f }: { f: number }) {
  // camera: a slow push toward the button while alice mints, released as the card leaps (ends at exactly 1)
  const push = 0.03 * ease(f, 0, T.crouch, 0, 1, EASE2.pan) * (1 - ease(f, T.takeoff - 2, T.land, 0, 1, EASE2.pan));
  const state: MintState = f < T.wallet ? "idle" : f < T.minting ? "wallet" : f < T.minted ? "minting" : "minted";
  const press = pressAt(f, T.press, 4, FPS).pressed;
  const crouch = f >= T.crouch && f < T.takeoff ? interpolate(f, [T.crouch, T.takeoff - 1], [0.96, 0.92], clamp) : 1;
  const slot = f >= T.takeoff ? ease(f, T.takeoff, T.takeoff + 6, 0, 1, EASE2.out) : 0;
  const footerOut = ease(f, T.minted, T.minted + 9, 0, 1, EASE2.fall); // the minted footer slides away: one coral (the card band)
  return (
    <AbsoluteFill style={{ scale: `${1 + push}`, transformOrigin: `${BUTTON.x}px ${BUTTON.y - 260}px` }}>
      <Phone>
        <MintPhoneAfter footerOut={footerOut} slot={slot} state={state} press={press} f={f} cardScaleY={crouch} />
      </Phone>
      <TapHand f={f} x={TAP.x} y={TAP.y} arrive={T.press - 15} at={T.press} leave={T.press + 9} />
      <FlyingCard f={f} />
      {f >= T.land ? <LandedCard f={f} /> : null}
    </AbsoluteFill>
  );
}

// ── the leap ────────────────────────────────────────────────────────────────────────────────────────────────────
const flight = (q: number) => {
  const p = interpolate(q, [T.takeoff, T.land], [0, 1], clamp);
  const pe = Easing.inOut(Easing.sin)(p);
  // the ground path (where the hard shadow falls) and the height above it
  return { p, pe, gx: lerp(START.cx, END.cx, pe), gy: lerp(START.cy, END.cy, pe), h: 130 * Math.sin(Math.PI * p) };
};

function FlyingCard({ f }: { f: number }) {
  if (f < T.takeoff || f >= T.land) return null;
  const a = flight(f);
  const b = flight(f + 1);
  // size: from the in-phone card to the world card, a little bigger mid-air (closer to the camera)
  const scale = lerp(START.w / END.w, 1, a.pe) + 0.12 * Math.sin(Math.PI * a.p);
  // smear: stretch up to 1.06 along the motion on the fastest frames
  const vx = b.gx - a.gx;
  const vy = b.gy - b.h - (a.gy - a.h);
  const stretch = 1 + Math.min(0.06, Math.hypot(vx, vy) / 1300);
  const ang = (Math.atan2(vy, vx) * 180) / Math.PI;
  const liftPx = 30 * Math.sin(Math.PI * a.p); // height lives in the hard shadow (capped); the arc is the path
  const badge = sp(f, T.takeoff + 4, SPRING2.pop);
  return (
    <div
      style={{
        position: "absolute",
        left: a.gx - END.w / 2,
        top: a.gy - a.h + liftPx - G.H / 2,
        width: END.w,
        transformOrigin: "50% 50%",
        transform: `rotate(${ang}deg) scale(${stretch}, ${1 / stretch}) rotate(${-ang}deg) scale(${scale})`,
      }}
    >
      <WorldCard charms={[{ hidden: true }, { hidden: true }, { hidden: true }]} lift={liftPx / (8 * G.k)} bar={0} style={{ left: 0, top: 0 }} />
      <YoursSticker pop={badge} lift={liftPx} />
    </div>
  );
}

// ── landed: the card, the bar, the charms snapping on, the tags printing ───────────────────────────────────────
function landedCharms(f: number): CharmSlot[] {
  return CHAINS3.map((c, i) => {
    const S = T.snaps[i];
    if (f < S - 3) return { hidden: true };
    const inP = interpolate(f, [S - 3, S], [0, 1], { ...clamp, easing: EASE2.fall });
    const before = f < S;
    const over = c === "sol" ? 22 * (1 - sp(f, S, SPRING2.pop)) * (before ? 0 : 1) : 0; // SOL overshoots its hook
    const dy = before ? -36 * (1 - inP) : over;
    const show = before ? 0.35 + 0.65 * inP : 1;
    const squash = before ? -0.5 : f < S + 2 ? 1.25 : 1.25 * (1 - sp(f, S + 2, SPRING2.rebound));
    const angle = releaseSwing(c, f, S, i === 1 ? -12 : 12);
    const eyesOpen = ease(f, S + 2, S + 5, 0, 1, EASE2.out);
    const blink = Math.max(1 - eyesOpen, charmBlink(c, f, [], "p1"));
    const grin = interpolate(f, [S + 2, S + 6, S + 26], [0, 1, 0], clamp);
    // look down at the tag 6 f before it prints, hold, then back
    const tagAt = T.tags[i];
    const lookDown = interpolate(f, [tagAt - 7, tagAt - 4, tagAt + 14, tagAt + 20], [0, 1, 1, 0], clamp);
    return { dy, show, squash, squashAnchor: "center" as const, angle, face: { blink, smile: 1 + 0.5 * grin, look: { x: 0, y: 5 * lookDown } } };
  });
}

function LandedCard({ f }: { f: number }) {
  const s = slapAt(f - T.land + 4, FPS, 6.5, { from: 1.0, squash: 0.06, drop: 0 }); // contact on T.land
  const cardLift = s.lift / (8 * G.k);
  const bar = sp(f, T.land + 1, SPRING2.quick);
  const charms = landedCharms(f);
  const tags: TagState[] = T.tags.map((at) => ({ slap: f - (at - 4), typed: interpolate(f, [at + 1, at + 12], [0, 1], clamp), string: ease(f, at - 7, at - 2, 0, 1, EASE2.out) }));
  return (
    <>
      <WorldCard charms={charms} lift={cardLift} bar={bar} scaleX={s.sx} scaleY={s.sy}>
        <YoursSticker lift={cardLift * 8 * G.k} />
      </WorldCard>
      {f - T.land < 24 ? (
        <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <Sequence from={T.land} layout="none">
            <SparkBurst x={END.cx} y={END.cy - 10} radius={330} count={5} seed="p1-mint" size={66} />
          </Sequence>
        </svg>
      ) : null}
      <TagsLayer tags={tags} angles={charms.map((ch) => ch.angle ?? 0)} dys={charms.map((ch) => ch.dy ?? 0)} />
    </>
  );
}

// ── captions ────────────────────────────────────────────────────────────────────────────────────────────────────
export const P1_CAPTION_END = { text: "Three addresses.\nOne NFT.", seed: "p1-three" };

function P1Captions() {
  return (
    <>
      <Sequence from={T.cap1} durationInFrames={T.cap2 - T.cap1} layout="none">
        <CaptionAt text="Mint a Satchel." seed="p1-mint" />
      </Sequence>
      <Sequence from={T.cap2} layout="none">
        <CaptionAt text={P1_CAPTION_END.text} seed={P1_CAPTION_END.seed} />
      </Sequence>
      <Sequence from={T.addr - 4} layout="none">
        <ChipNow />
      </Sequence>
    </>
  );
}

function ChipNow() {
  return <NftChip f={useCurrentFrame()} />;
}

// ── sound ───────────────────────────────────────────────────────────────────────────────────────────────────────
function P1Sound() {
  const at = (frame: number) => frame / FPS;
  return (
    <>
      <Sfx name="button-thock" at={at(T.press)} gainDb={-3} />
      <Sfx name="tick-soft" at={at(T.press + 3)} gainDb={-4} />
      <Sfx name="swoop-up" at={at(T.takeoff + 2)} align="peak" gainDb={-2} />
      <Sfx name="sticker-slap" at={at(T.land)} gainDb={-3} />
      <Sfx name="sparkle" at={at(T.land + 1)} gainDb={-6} />
      <Sfx name="pop" at={at(T.snaps[0])} gainDb={-6} />
      <Sfx name="pop" at={at(T.snaps[1])} gainDb={-6} />
      <Sfx name="pop-high" at={at(T.snaps[2])} gainDb={-6} />
      <Sfx name="type-run" at={at(T.tags[0] + 1)} gainDb={-9} />
      <Sfx name="sticker-slap" at={at(T.tags[1])} gainDb={-10} />
      <Sfx name="sticker-slap" at={at(T.tags[2])} gainDb={-10} />
      <Sfx name="pop" at={at(T.addr)} gainDb={-5} />
    </>
  );
}
