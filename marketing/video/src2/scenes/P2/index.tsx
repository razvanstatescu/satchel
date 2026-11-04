import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { charmKick } from "../../brand/Charm";
import { C, type Chain } from "../../brand/tokens";
import { NetworksCard, ReceiveScreen } from "../../components/ui";
import { CoinSticker, ExchangeSticker, WalletSticker } from "../../illustration/props";
import { getScene } from "../../lib/timeline";
import { Sfx } from "../../lib/Sfx";
import { clamp, EASE2, gulpScale, slapAt, SPRING2 } from "../../motion";
import { MintPhoneAfter, P1_CAPTION_END, P1T } from "../P1";
import {
  CaptionAt,
  CHAINS3,
  charmBlink,
  charmPoint,
  type CharmSlot,
  ease,
  fmt,
  fr,
  FPS,
  lerp,
  lookToward,
  type Holdings,
  NftChip,
  YoursSticker,
  PagePush,
  Phone,
  sp,
  type TagState,
  TagsLayer,
  TapHand,
  ui,
  WorldCard,
} from "../P1/stage";

/**
 * P2 Fill (18–26 s, V06 v4 "Fill it from any wallet or exchange. USDC too, on Ethereum, Base, Arbitrum or Optimism.").
 * Opens on P1's last frame (same shot). The phone pushes to the Receive screen (QR, "This Satchel's Bitcoin address");
 * alice taps Copy ("Copied"). Outside the phone a generic Wallet sticker slaps in on "wallet" and an Exchange sticker
 * on "exchange"; coin stickers fly from them straight into the charms, each charm GULPS its coin (anticipation "o",
 * stretch, squash, cheeks puff, a happy swing) and its tag grows a balance line that counts up to 0.06 BTC · 0.85 ETH
 * · 13 SOL. On "USDC too" a USDC coin (faced, Base badge) lands at the ETH charm (same address) and its tag gains
 * "+ 800 USDC"; on "Ethereum, Base, Arbitrum or Optimism" the NetworksCard sticker slaps in and its four chips drop in
 * on their words. The value card rolls ≈ $0 → ≈ $9,025.00. The phone's Incoming row goes "+0.06 BTC · in mempool" →
 * "Received". Captions "Fill it up." → "USDC too. Four networks.". The last frame is P3's first frame.
 */

const sc = getScene("P2");
const W = (prefix: string) => fr(sc.wordAt("V06", prefix));
/** frames of the shared stage clock before this scene (charm blinks continue across the cuts) */
export const P2_CLOCK = P1T.end;

const SRC = { wallet: { x: 1738, y: 470 }, exchange: { x: 1738, y: 734 } } as const;
const SRC_SCALE = 1.7;
const D = 104 * SRC_SCALE;
const TAP = ui(200, 609); // the right part of "Copy address", so its label stays readable
type Run = "btc" | "evm" | "sol" | "usdc";
const TARGET: Record<Run, string> = { btc: "0.06", evm: "0.85", sol: "13", usdc: "800" };
const DEC: Record<Run, number> = { btc: 2, evm: 2, sol: 0, usdc: 0 };
const VAL: Record<Run, number> = { btc: 0.06, evm: 0.85, sol: 13, usdc: 800 };

export const P2T = (() => {
  const fill = W("Fill");
  const from = W("from");
  const wallet = W("wallet");
  const exchange = W("exchange");
  const usdcWord = W("USDC");
  const onWord = fr(sc.word("V06", 9)); // "on" (… USDC too, on Ethereum …)
  const nets = [W("Ethereum"), W("Base"), W("Arbitrum"), W("Optimism")];
  const push = 2;
  const copy = from + 4;
  // coins: [charm index, source, launch, arrive (the coin enters the mouth)]
  const coins = [
    { i: 1, chain: "evm" as Run, src: "wallet" as const, launch: wallet + 4, arrive: wallet + 20 },
    { i: 0, chain: "btc" as Run, src: "exchange" as const, launch: exchange + 5, arrive: exchange + 23 },
    { i: 2, chain: "sol" as Run, src: "wallet" as const, launch: exchange + 17, arrive: exchange + 29 },
    // USDC on Base lands at the ETH charm: one address on all four networks
    { i: 1, chain: "usdc" as Run, src: "exchange" as const, launch: usdcWord + 1, arrive: usdcWord + 19 },
  ];
  const received = usdcWord + 31;
  const leave = usdcWord + 27;
  return { fill, from, wallet, exchange, usdcWord, nets, push, copy, coins, cap1: Math.max(0, fill - 4), cap2: usdcWord - 4, netsIn: onWord, received, leave, end: fr(sc.duration) };
})();
const T = P2T;
const coinOf = (c: Run) => T.coins.find((k) => k.chain === c)!;
const runsAt = (i: number) => T.coins.filter((k) => k.i === i);

export default function P2() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ground }}>
      <P2World f={f} />
      <P2Captions />
      <P2Sound />
    </AbsoluteFill>
  );
}

// ── the world ───────────────────────────────────────────────────────────────────────────────────────────────────
function P2World({ f }: { f: number }) {
  const push = sp(f, T.push, SPRING2.land);
  const btc = coinOf("btc");
  const incoming = f < btc.arrive + 2 ? "waiting" : f < T.received ? "mempool" : "received";
  const charms = fillCharms(f);
  const amounts = CHAINS3.map((c) => countAt(c, f));
  const usdc = countAt("usdc", f);
  const uRun = coinOf("usdc");
  const tags: TagState[] = CHAINS3.map((c, i) => {
    const k = coinOf(c);
    return {
      amount: amounts[i].text,
      amountIn: ease(f, k.arrive + 1, k.arrive + 7, 0, 1, EASE2.out),
      amountPop: amounts[i].pop,
      ...(c === "evm" && f >= uRun.arrive + 1 ? { usdc: usdc.text, usdcIn: ease(f, uRun.arrive + 1, uRun.arrive + 7, 0, 1, EASE2.out), usdcPop: usdc.pop } : {}),
    };
  });
  const holdings: Holdings = { btc: amounts[0].v, eth: amounts[1].v, sol: amounts[2].v, usdc: usdc.v };
  return (
    <AbsoluteFill>
      <Phone>
        <PagePush
          p={push}
          from={<MintPhoneAfter />}
          to={
            <ReceiveScreen
              chain="btc"
              incoming={incoming}
              copied={f >= T.copy + 2}
              press={pressOf(f, T.copy)}
              qrReveal={ease(f, T.push + 5, T.push + 17, 0, 1, EASE2.out)}
              spin={(f % 24) / 24}
              incomingPop={incoming === "received" ? ease(f, T.received, T.received + 10, 0, 1, EASE2.out) : undefined}
            />
          }
        />
      </Phone>
      <TapHand f={f} x={TAP.x} y={TAP.y} arrive={T.copy - 14} at={T.copy} leave={T.copy + 8} />
      <WorldCard charms={charms} coins={holdings}>
        <YoursSticker />
      </WorldCard>
      <TagsLayer tags={tags} angles={charms.map((ch) => ch.angle ?? 0)} dys={charms.map((ch) => ch.dy ?? 0)} />
      <Sources f={f} />
      <Networks f={f} />
      <Coins f={f} />
    </AbsoluteFill>
  );
}

/** "One address on all four": the NetworksCard sticker slaps in on "on Ethereum…"; each chip drops in on its word. */
export const NETS_AT = { x: 1560, y: 556, w: 296 } as const;
export function Networks({ f, out = 0 }: { f: number; out?: number }) {
  const at = T.netsIn;
  if (f < at || out >= 1) return null;
  const s = slapAt(f - at, FPS, 0, { from: 1.26, squash: 0.07, drop: 0 });
  // chip i is fully in once its word is said (reveal·4 − i reaches 1)
  const reveal = interpolate(f, [T.nets[0] - 2, T.nets[0] + 4, T.nets[1] - 2, T.nets[1] + 4, T.nets[2] - 2, T.nets[2] + 4, T.nets[3] - 2, T.nets[3] + 4], [0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1], clamp);
  const highlight = f >= T.nets[1] - 2 ? "base" : undefined;
  return (
    <div style={{ position: "absolute", left: NETS_AT.x + 380 * out, top: NETS_AT.y - 20 * out, opacity: s.opacity, scale: `${s.sx} ${s.sy}`, transformOrigin: "50% 50%" }}>
      <NetworksCard width={NETS_AT.w} tilt={-2} reveal={reveal} highlight={highlight} />
    </div>
  );
}

const pressOf = (f: number, at: number) => (f < at ? interpolate(f, [at - 3, at], [0, 1], { ...clamp, easing: EASE2.fall }) : Math.max(0, 1 - sp(f, at + 2, SPRING2.rebound)));

/** A tag's value: 0 until the gulp, then a 22 f count (EASE2.out, rounded to the tag's decimals) and an 8 % pop. */
function countAt(c: Run, f: number) {
  const k = coinOf(c);
  const start = k.arrive + 2;
  const dur = 22;
  const q = interpolate(f, [start, start + dur], [0, 1], { ...clamp, easing: EASE2.out });
  const done = f >= start + dur;
  const shown = Math.round(VAL[c] * q * 10 ** DEC[c]) / 10 ** DEC[c];
  const text = done ? TARGET[c] : fmt(shown, DEC[c]);
  const pop = done ? 1 - sp(f, start + dur, SPRING2.quick) : 0;
  return { text, v: done ? VAL[c] : shown, pop };
}

/** The charms: idle blinks on the shared clock; each looks at its incoming coin, opens wide, gulps, puffs, beams. */
function fillCharms(f: number): CharmSlot[] {
  return CHAINS3.map((c, i) => {
    let look = { x: 0, y: 0 };
    let notice = 0;
    let pre = 0;
    let squash = 0;
    let puff = 0;
    let joy = 0;
    let kick = 0;
    for (const k of runsAt(i)) {
      const G = k.arrive;
      // eyes track the coin while it flies
      if (f >= k.launch && f < G) look = lookToward(charmPoint(i, 0, "coin"), coinPos(k, f), 1);
      notice = Math.max(notice, interpolate(f, [k.launch - 2, k.launch + 3], [0, 1], clamp) * (f < G + 2 ? 1 : 0));
      // anticipation: mouth "o", eyes wide
      pre = Math.max(pre, interpolate(f, [G - 7, G - 2], [0, 1], clamp) * (f < G ? 1 : 0));
      if (f >= G - 4 && f < G + 14) squash = (1 - gulpScale(f - (G - 4)).y) / 0.12;
      puff = Math.max(puff, interpolate(f, [G, G + 3, G + 10, G + 15], [0, 1, 1, 0], clamp));
      joy = Math.max(joy, interpolate(f, [G + 8, G + 11, G + 26, G + 31], [0, 1, 1, 0], clamp));
      kick += charmKick(c, (f - G) / FPS, 9); // the coin arrives from the right: the bob swings left
    }
    // "Received": all three beam and hop once, in reaction order (SOL, ETH +2, BTC +4)
    const lag = c === "sol" ? 0 : c === "evm" ? 2 : 4;
    const ch = f - (T.received + lag);
    const hop = ch >= 0 && ch <= 10 ? -12 * Math.sin((Math.PI * ch) / 10) : 0;
    const cheer = interpolate(ch, [0, 2, 9, 12], [0, 1, 1, 0], clamp);
    const blink = Math.max(charmBlink(c, f + P2_CLOCK, [], "p1") * (1 - notice), 0);
    return {
      angle: kick,
      dy: hop,
      squash,
      squashAnchor: "center" as const,
      puff,
      face: {
        blink: joy > 0 || cheer > 0 ? 0 : blink,
        joy: Math.max(joy, cheer),
        wide: 0.7 * pre,
        o: pre,
        smile: 1 + 0.55 * Math.max(joy, cheer),
        look: { x: look.x * notice, y: look.y * notice },
      },
    };
  });
}

// ── coin sources: generic Wallet and Exchange stickers ─────────────────────────────────────────────────────────
function Sources({ f }: { f: number }) {
  const out = ease(f, T.leave, T.leave + 9, 0, 1, EASE2.fall);
  if (out >= 1) return null;
  const item = (key: "wallet" | "exchange", at: number, Comp: typeof WalletSticker) => {
    if (f < at - 4) return null;
    const s = slapAt(f - (at - 4), FPS, 0, { from: 1.3, squash: 0.08, drop: 0 });
    const launches = T.coins.filter((k) => k.src === key).map((k) => k.launch);
    const bump = Math.max(0, ...launches.map((L) => interpolate(f, [L - 3, L, L + 6], [0, 1, 0], clamp)));
    const p = SRC[key];
    const delay = key === "exchange" ? 2 : 0;
    const o = ease(f, T.leave + delay, T.leave + delay + 9, 0, 1, EASE2.fall);
    return (
      <div style={{ position: "absolute", left: p.x - D / 2 + 380 * o, top: p.y - D / 2 - 30 * o, opacity: s.opacity, scale: `${s.sx} ${s.sy}` }}>
        <Comp scale={SRC_SCALE} bump={bump} />
      </div>
    );
  };
  return (
    <>
      {item("wallet", T.wallet, WalletSticker)}
      {item("exchange", T.exchange, ExchangeSticker)}
    </>
  );
}

// ── the coins in flight ─────────────────────────────────────────────────────────────────────────────────────────
type CoinRun = (typeof T.coins)[number];
const bez = (a: number, b: number, c: number, d: number, t: number) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};
/**
 * A coin's flight: tossed up out of its source, over the charms, then down through the gap on the right of its charm
 * so it enters the mouth from the side (never across the face).
 */
function coinPos(k: CoinRun, f: number) {
  const from = SRC[k.src];
  const mouth = charmPoint(k.i, 0, "mouth");
  const gapX = k.i === 2 ? mouth.x + 110 : (charmPoint(k.i, 0, "coin").x + charmPoint(k.i + 1, 0, "coin").x) / 2;
  const p = interpolate(f, [k.launch, k.arrive], [0, 1], clamp);
  const t = EASE2.swing(p);
  const P0 = { x: from.x - 30, y: from.y - 30 };
  const P1 = { x: from.x - 90, y: Math.min(from.y, mouth.y) - (k.src === "exchange" ? 300 : 200) };
  // the USDC coin shares the ETH charm's gap with SOL's left edge: it drops in steeper so it never crosses SOL's face
  const P2 = k.chain === "usdc" ? { x: gapX - 6, y: mouth.y - 150 } : { x: gapX + 24, y: mouth.y - 70 };
  const P3 = { x: mouth.x + 10, y: mouth.y + 2 };
  return { x: bez(P0.x, P1.x, P2.x, P3.x, t), y: bez(P0.y, P1.y, P2.y, P3.y, t), p };
}

function Coins({ f }: { f: number }) {
  return (
    <>
      {T.coins.map((k) => {
        if (f < k.launch || f >= k.arrive) return null;
        const a = coinPos(k, f);
        const b = coinPos(k, f + 1);
        const size = lerp(92, 58, a.p) * interpolate(f, [k.arrive - 3, k.arrive - 1], [1, 0.45], clamp);
        const v = Math.hypot(b.x - a.x, b.y - a.y);
        const along = 1 + Math.min(0.2, v / 300); // smear on the fastest frames
        const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
        const tumble = k.chain === "usdc" ? 20 * Math.sin(a.p * Math.PI) : 320 * a.p; // the faced USDC coin keeps its face up // a 2D tumble (the rim highlight turns) with a light flip wobble: never edge-on
        return (
          <div
            key={`${k.chain}-${k.i}`}
            style={{
              position: "absolute",
              left: a.x - size / 2,
              top: a.y - size / 2,
              width: size,
              height: size,
              transform: `rotate(${ang}deg) scale(${along}, ${1 / along}) rotate(${-ang}deg) rotate(${tumble}deg)`,
            }}
          >
            <CoinSticker chain={k.chain} network={k.chain === "usdc" ? "base" : null} size={size} k={1.9} flip={k.chain === "usdc" ? 0 : 38 * Math.sin(a.p * Math.PI * 3)} drop={0.8} />
          </div>
        );
      })}
    </>
  );
}

// ── captions ────────────────────────────────────────────────────────────────────────────────────────────────────
export const P2_CAPTION_END = { text: "USDC too.\nFour networks.", seed: "p2-usdc" };

function P2Captions() {
  return (
    <>
      {/* P1's last caption and chip hold under the incoming slap's 2-frame anti-pop, so the cut frame matches */}
      <Sequence from={-60} durationInFrames={62} layout="none">
        <CaptionAt text={P1_CAPTION_END.text} seed={P1_CAPTION_END.seed} />
        <NftChip />
      </Sequence>
      <Sequence from={T.cap1} durationInFrames={T.cap2 - T.cap1} layout="none">
        <CaptionAt text="Fill it up." seed="p2-fill" />
      </Sequence>
      <Sequence from={T.cap2} layout="none">
        <CaptionAt text={P2_CAPTION_END.text} seed={P2_CAPTION_END.seed} />
      </Sequence>
    </>
  );
}

// ── sound ───────────────────────────────────────────────────────────────────────────────────────────────────────
function P2Sound() {
  const at = (frame: number) => frame / FPS;
  return (
    <>
      <Sfx name="paper-slide" at={at(T.push + 5)} align="peak" gainDb={-6} />
      <Sfx name="button-thock" at={at(T.copy)} gainDb={-3} />
      <Sfx name="pop" at={at(T.copy + 2)} gainDb={-6} />
      <Sfx name="sticker-slap" at={at(T.wallet)} gainDb={-3} />
      <Sfx name="sticker-slap" at={at(T.exchange)} gainDb={-3} />
      {T.coins.map((k) => (
        <Sfx key={`g${k.chain}`} name="pop" at={at(k.arrive)} gainDb={-2} />
      ))}
      <Sfx name="bubble-tick-run" at={at(coinOf("evm").arrive + 2)} gainDb={-10} />
      <Sfx name="bubble-tick-run" at={at(coinOf("btc").arrive + 6)} gainDb={-10} />
      <Sfx name="sticker-slap" at={at(T.netsIn + 4)} gainDb={-6} />
      {T.coins.map((k) => (
        <Sfx key={`d${k.chain}`} name="coin-ding" at={at(k.arrive + 24)} gainDb={-9} />
      ))}
      <Sfx name="success-marimba" at={at(T.received)} gainDb={-6} />
      <Sfx name="whoosh-soft" at={at(T.leave + 5)} align="peak" gainDb={-10} />
    </>
  );
}
