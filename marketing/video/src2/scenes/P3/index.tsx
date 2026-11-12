import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { C, type Chain } from "../../brand/tokens";
import { SendScreen, type SignStage, SigningScreen, WalletApproveSheet, ReceiveScreen } from "../../components/ui";
import { Hand } from "../../illustration/characters";
import { CoinSticker, ToastSticker } from "../../illustration/props";
import { getScene } from "../../lib/timeline";
import { Sfx } from "../../lib/Sfx";
import { clamp, EASE2, flickAngle, pressAt, slapAt, SPRING2 } from "../../motion";
import { Networks, P2_CAPTION_END, P2_CLOCK, P2T } from "../P2";
import {
  CaptionAt,
  CHAINS3,
  charmBlink,
  charmPoint,
  charmSpring,
  type CharmSlot,
  ease,
  fr,
  FPS,
  lerp,
  YoursSticker,
  PagePush,
  Phone,
  PHONE,
  releaseSwing,
  sp,
  SWAP,
  type TagState,
  TagsLayer,
  ui,
  WorldCard,
} from "../P1/stage";

/**
 * P3 Send (24–33 s, V07 "Then send from it, on all three chains." + V08 "Approve in your NEAR wallet, and NEAR Chain
 * Signatures signs a native transaction."). Opens on P2's last frame (same shot).
 *   1. The phone pushes to "Send Bitcoin": 0.0100 BTC to bc1q…y8sd, "Network fee ~282 sats · paid by this Satchel".
 *      On "all three chains" the charms answer in reaction order (SOL, ETH, BTC).
 *   2. alice presses "Send 0.0100 BTC" into its shadow; the neutral "Your NEAR wallet" sheet slides up; she presses
 *      Approve on "Approve…"; "Approved ✓"; the sheet drops.
 *   3. The tracker: "Approved in your wallet ✓" → "Signing with NEAR's signer network · Usually about 10 seconds"
 *      (frozen pulse; the timer jump-cuts 0:03 → 0:09) → "Signed" → "Broadcast to Bitcoin ✓" on "signs a native…".
 *   4. The BTC charm flicks a coin off frame and the "Sent 0.0100 BTC" toast slaps in; then two quick flashes:
 *      "Sent 0.05 ETH" (ETH flicks) and "Sent 1.25 SOL" (SOL flicks fastest). Each tag slaps to its new balance.
 * Captions "Send on all three." → "NEAR Chain Signatures signs."
 */

const sc = getScene("P3");
const W7 = (prefix: string) => fr(sc.wordAt("V07", prefix));
const W8 = (prefix: string) => fr(sc.wordAt("V08", prefix));
const P3_CLOCK = P2_CLOCK + P2T.end;

// SCRIPT-v4 numbers: fill 0.06 BTC · 0.85 ETH · 13 SOL (+ 800 USDC on Base) → sends 0.0100 · 0.05 · 1 → after
// 0.05 · 0.80 · 12 (+ 800 USDC): the value card rolls ≈ $9,025.00 → ≈ $8,000.00.
const AFTER: Record<Chain, string> = { btc: "0.05", evm: "0.80", sol: "12" };
const FILL: Record<Chain, string> = { btc: "0.06", evm: "0.85", sol: "13" };
const AFTER_N: Record<Chain, number> = { btc: 0.05, evm: 0.8, sol: 12 };
const FILL_N: Record<Chain, number> = { btc: 0.06, evm: 0.85, sol: 13 };
const SENT: Record<Chain, string> = { btc: "Sent 0.0100 BTC", evm: "Sent 0.05 ETH", sol: "Sent 1 SOL" };
/** A coin's amount on the card: the fill until its coin launches, then rolls to the after-send amount in 8 f. */
const cardAmount = (c: Chain, f: number) => interpolate(f, [launchOf(c), launchOf(c) + 8], [FILL_N[c], AFTER_N[c]], { ...clamp, easing: EASE2.out });

export const P3T = (() => {
  const send = W7("send");
  const all = W7("all");
  const chains = W7("chains");
  const approve = W8("Approve");
  const nearSig = fr(sc.word("V08", 6)); // the second "NEAR" ("…and NEAR Chain Signatures")
  const signatures = W8("Signatures");
  const signs = W8("signs");
  const native = W8("native");
  const transaction = W8("transaction");
  const push1 = 2;
  const wave = [all, all + 4, all + 8]; // SOL, ETH, BTC answer "all three" in reaction order
  const pressSend = Math.round((chains + approve) / 2) - 8;
  const walletCta = pressSend + 3;
  const sheetUp = pressSend + 6;
  const pressApprove = approve + 8;
  const approved = pressApprove + 3;
  const sheetDown = approved + 9;
  const push2 = sheetDown + 6;
  const jump = signatures; // the timer jump-cut 0:03 → 0:09
  const signed = signs - 4;
  const sent = native - 6;
  // flicks: start of the wind-up; the coin launches 6 f later (SOL: 4 f). BTC launches on "native", ETH on
  // "transaction", SOL 8 f after it (it flicks fastest): the ≈ $8,000.00 total settles ≥ 0.5 s before the cut (QA v5 #16)
  const flicks = { btc: native - 6, evm: transaction - 6, sol: transaction + 2 };
  return { send, all, chains, approve, nearSig, signatures, signs, native, transaction, push1, wave, pressSend, walletCta, sheetUp, pressApprove, approved, sheetDown, push2, jump, signed, sent, flicks, cap1: send - 4, cap2: nearSig - 4, end: fr(sc.duration) };
})();
const T = P3T;
const launchOf = (c: Chain) => T.flicks[c] + (c === "sol" ? 4 : 6);

const SEND_TAP = ui(318, 741);
const APPROVE_TAP = ui(345, 776);

// toast stack (right column)
const TOAST = { x: 1536, y: [470, 560, 650], scale: 1.3, h: 54 * 1.3 } as const;

export default function P3() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ground }}>
      <P3World f={f} />
      <P3Captions />
      <P3Sound />
    </AbsoluteFill>
  );
}

// ── the world ───────────────────────────────────────────────────────────────────────────────────────────────────
function P3World({ f }: { f: number }) {
  // camera: a slow push onto the phone through the approval and the signing, released for the flicks
  const push = 0.045 * ease(f, T.pressSend - 10, T.push2 + 10, 0, 1, EASE2.pan) * (1 - ease(f, T.sent - 8, T.sent + 8, 0, 1, EASE2.pan));
  const punch = f >= T.jump ? 0.03 * (1 - ease(f, T.jump, T.jump + 10, 0, 1, EASE2.out)) : 0; // sells the jump-cut
  const cam = 1 + push + punch;
  const focus = ui(195, 470);

  const p1 = sp(f, T.push1, SPRING2.land);
  const p2 = sp(f, T.push2, SPRING2.land);
  const sheet = f < T.sheetDown ? sp(f, T.sheetUp, SPRING2.land) : 1 - ease(f, T.sheetDown, T.sheetDown + 8, 0, 1, EASE2.fall);
  const sendPress = pressAt(f, T.pressSend, 4, FPS).pressed;
  const approvePress = pressAt(f, T.pressApprove, 4, FPS).pressed;
  const stage: SignStage = f < T.signed ? "signing" : f < T.sent ? "broadcasting" : "sent";
  const elapsed = f < T.jump ? 3 : 9;

  const send = (
    <SendScreen
      chain="btc"
      cta={f >= T.walletCta ? "wallet" : "idle"}
      press={sendPress}
      spin={(f % 24) / 24}
      overlay={sheet > 0.001 ? <WalletApproveSheet open={sheet} press={approvePress} approved={f >= T.approved} chain="btc" /> : undefined}
    />
  );
  // the tracker in a taller box: its pinned footer (the coral "Done" once sent) sits below the phone's screen, so the
  // frame keeps one coral (the card band); the receipt itself is the content
  const tracker = (
    <div style={{ position: "absolute", left: 0, top: 0, width: 390, height: 844 + 112 }}>
      <SigningScreen chain="btc" stage={stage} elapsedSec={elapsed} pulse={(f % 30) / 30} spin={(f % 24) / 24} />
    </div>
  );

  const charms = sendCharms(f);
  const tags: TagState[] = CHAINS3.map((c) => {
    const L = launchOf(c);
    return { amount: f < L ? FILL[c] : AFTER[c], amountPop: f >= L ? 1 - sp(f, L, SPRING2.quick) : 0, ...(c === "evm" ? { usdc: "800" } : {}) };
  });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ scale: `${cam}`, transformOrigin: `${focus.x}px ${focus.y}px` }}>
        <Phone>
          {f < T.push2 ? <PagePush p={p1} from={<ReceiveScreen chain="btc" incoming="received" copied />} to={send} /> : <PagePush p={p2} from={send} to={tracker} />}
        </Phone>
        <SendHand f={f} />
      </AbsoluteFill>
      <WorldCard charms={charms} coins={{ btc: cardAmount("btc", f), eth: cardAmount("evm", f), sol: cardAmount("sol", f), usdc: 800 }}>
        <YoursSticker />
      </WorldCard>
      <TagsLayer tags={tags} angles={charms.map((ch) => ch.angle ?? 0)} />
      {/* P2's "One address on all four" sticker, held across the cut, then cleared off the right before the toasts */}
      <Networks f={P2T.end + f} out={ease(f, T.send + 2, T.send + 11, 0, 1, EASE2.fall)} />
      <FlickedCoins f={f} />
      <Toasts f={f} />
    </AbsoluteFill>
  );
}

// ── alice's hand: Send, then Approve ────────────────────────────────────────────────────────────────────────────
function SendHand({ f }: { f: number }) {
  const arrive = T.pressSend - 14;
  if (f < arrive) return null;
  const leave = T.pressApprove + 8;
  const outP = ease(f, leave, leave + 10, 0, 1, EASE2.fall);
  if (outP >= 1) return null;
  const inP = sp(f, arrive, SPRING2.land);
  const move = sp(f, T.sheetUp + 4, SPRING2.land); // from Send over to Approve while the sheet rises
  const away = { x: 560, y: 330 };
  const base = { x: lerp(SEND_TAP.x, APPROVE_TAP.x, move), y: lerp(SEND_TAP.y, APPROVE_TAP.y, move) };
  const p1 = pressAt(f, T.pressSend, 4, FPS).pressed;
  const p2 = pressAt(f, T.pressApprove, 4, FPS).pressed;
  const pressed = Math.max(p1, p2);
  const hover1 = 1 - ease(f, T.pressSend - 4, T.pressSend, 0, 1, EASE2.fall);
  const hover2 = f > T.pressSend + 4 ? 1 - ease(f, T.pressApprove - 4, T.pressApprove, 0, 1, EASE2.fall) : 0;
  const hover = f < T.pressSend ? hover1 : f < T.pressApprove ? Math.max(hover2, ease(f, T.pressSend + 2, T.pressSend + 8, 0, 1, EASE2.out) * (f < T.pressApprove - 4 ? 1 : 0)) : 0;
  const x = base.x + away.x * (1 - inP) + away.x * outP;
  const y = base.y + away.y * (1 - inP) + away.y * outP - 16 * hover + 4 * PHONE.k * pressed;
  // no name tag on this sleeve (QA v5 #5): Send and Approve sit at the phone's bottom edge, where even the wrist is
  // within ~80 px of the frame's edge, so the tag could only be clipped. alice's lemon sleeve still says who it is.
  return <Hand pose="tap" sleeve="alice" k={1.55} x={x} y={y} angle={-52} press={pressed} arm={8} tag={null} />;
}

// ── the charms ──────────────────────────────────────────────────────────────────────────────────────────────────
function sendCharms(f: number): CharmSlot[] {
  const order: Chain[] = ["sol", "evm", "btc"];
  return CHAINS3.map((c, i) => {
    const waveAt = T.wave[order.indexOf(c)];
    const wave = releaseSwing(c, f, waveAt, i === 1 ? -9 : 9);
    const hop = f >= waveAt ? -10 * Math.sin(Math.PI * Math.min(1, (f - waveAt) / 8)) : 0;
    // the flick: wind back, snap toward the right (mirrored kit flickAngle: positive CSS angles swing the bob left)
    const S = T.flicks[c];
    const speed = c === "sol" ? 1.5 : 1;
    const flick = f >= S ? -flickAngle((f - S) * speed, FPS, charmSpring(c)) : 0;
    // watching the phone while alice sends and signs, then back to us after their own throw
    const watch = interpolate(f, [T.pressSend - 8, T.pressSend - 2], [0, 1], clamp) * (1 - ease(f, S - 2, S + 2, 0, 1, EASE2.out));
    const squint = interpolate(f - S, [0, 3, 5, 6], [0, 0.55, 0.55, 0], clamp);
    const joy = interpolate(f - launchOf(c), [2, 5, 18, 22], [0, 1, 1, 0], clamp);
    const waveJoy = interpolate(f - waveAt, [0, 2, 8, 11], [0, 1, 1, 0], clamp);
    const blink = charmBlink(c, f + P3_CLOCK, [], "p1");
    // the jump-cut gag: after the cut (0:03 → 0:09) the waiting charms have visibly shifted (ETH tilts its head, SOL
    // has gone heavy-lidded, BTC hasn't moved: it's heavy and patient); "Signed" perks them up
    const waited = f >= T.jump && f < T.signed ? 1 : 0;
    const perk = interpolate(f - T.signed, [0, 2, 7, 10], [0, 1, 1, 0], clamp);
    const bored = c === "sol" ? 0.42 * waited : 0;
    return {
      angle: wave + flick,
      dy: hop,
      face: {
        blink: Math.max(blink * (1 - joy) * (1 - perk), squint, bored),
        joy: Math.max(joy, waveJoy),
        wide: 0.6 * perk,
        tilt: c === "evm" ? 6 * waited : 0,
        smile: 1 + 0.5 * Math.max(joy, waveJoy) - (c === "sol" ? 0.35 * waited : 0),
        look: { x: -6 * watch + (c === "sol" ? 1.5 * waited : 0), y: -1.5 * watch - (c === "sol" ? 2 * waited : 0) },
      },
    };
  });
}

// ── coins flicked off frame ────────────────────────────────────────────────────────────────────────────────────
function FlickedCoins({ f }: { f: number }) {
  return (
    <>
      {CHAINS3.map((c, i) => {
        const L = launchOf(c);
        const dur = c === "sol" ? 6 : 8;
        if (f < L || f > L + dur) return null;
        const at = (q: number) => {
          const p = interpolate(q, [L, L + dur], [0, 1], clamp);
          // out through its toast's slot: the "Sent" receipt slaps in as the coin zips past (and hides its exit)
          const from = charmPoint(i, -20, "coin");
          const to = { x: 2030, y: TOAST.y[i] + TOAST.h / 2 };
          const arc = (i === 2 ? 18 : 32) * Math.sin(Math.PI * p);
          return { x: lerp(from.x + 24, to.x, p), y: lerp(from.y - 12, to.y, EASE2.out(p)) - arc, p };
        };
        const a = at(f);
        const b = at(f + 1);
        const v = Math.hypot(b.x - a.x, b.y - a.y);
        const along = 1 + Math.min(0.25, v / 500);
        const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
        const size = 70;
        return (
          <div key={c} style={{ position: "absolute", left: a.x - size / 2, top: a.y - size / 2, width: size, height: size, transform: `rotate(${ang}deg) scale(${along}, ${1 / along}) rotate(${-ang}deg) rotate(${-200 * a.p}deg)` }}>
            <CoinSticker chain={c} size={size} k={1.9} flip={30 * Math.sin(a.p * 6)} drop={0.8} />
          </div>
        );
      })}
    </>
  );
}

// ── the Sent toasts: BTC, then two quick flashes (ETH, SOL) ────────────────────────────────────────────────────
function Toasts({ f }: { f: number }) {
  return (
    <>
      {CHAINS3.map((c, i) => {
        const at = launchOf(c) + 2; // slap starts; contact 4 f later
        if (f < at) return null;
        const s = slapAt(f - at, FPS, 0, { from: 1.14, squash: 0.07, drop: 0 }); // a small overshoot, grown mostly rightward
        const check = interpolate(f - at, [3, 9], [0, 1], clamp);
        return (
          <div key={c} style={{ position: "absolute", left: TOAST.x, top: TOAST.y[i], opacity: s.opacity, scale: `${s.sx} ${s.sy}`, transformOrigin: "8% 50%" }}>
            <ToastSticker text={SENT[c]} check={check} scale={TOAST.scale} tilt={i === 1 ? 1.5 : -1.5} />
          </div>
        );
      })}
    </>
  );
}

// ── captions ────────────────────────────────────────────────────────────────────────────────────────────────────
function P3Captions() {
  return (
    <>
      {/* P2's last caption, held across the cut until "Send on all three." reaches full opacity (the swap rule) */}
      <Sequence from={-60} durationInFrames={60 + T.cap1 + SWAP} layout="none">
        <CaptionAt text={P2_CAPTION_END.text} seed={P2_CAPTION_END.seed} />
      </Sequence>
      <Sequence from={T.cap1} durationInFrames={T.cap2 - T.cap1 + SWAP} layout="none">
        <CaptionAt text="Send on all three." seed="p3-send" />
      </Sequence>
      <Sequence from={T.cap2} layout="none">
        {/* 104 px (QA v5 #15): the "g" of "signs." would otherwise rest on the card's top outline */}
        <CaptionAt text={"NEAR Chain\nSignatures signs."} seed="p3-signs" size={104} />
      </Sequence>
    </>
  );
}

// ── sound ───────────────────────────────────────────────────────────────────────────────────────────────────────
function P3Sound() {
  const at = (frame: number) => frame / FPS;
  return (
    <>
      <Sfx name="paper-slide" at={at(T.push1 + 5)} align="peak" gainDb={-8} />
      <Sfx name="charm-jingle" at={at(T.wave[1] + 2)} align="peak" gainDb={-2} />
      <Sfx name="button-thock" at={at(T.pressSend)} gainDb={-3} />
      <Sfx name="whoosh-soft" at={at(T.sheetUp + 5)} align="peak" gainDb={-8} />
      <Sfx name="button-thock" at={at(T.pressApprove)} gainDb={-4} />
      <Sfx name="pop" at={at(T.approved)} gainDb={-6} />
      <Sfx name="paper-slide" at={at(T.push2 + 5)} align="peak" gainDb={-10} />
      <Sfx name="tick-soft" at={at(T.jump)} gainDb={-2} />
      <Sfx name="pop-high" at={at(T.signed)} gainDb={-8} />
      <Sfx name="success-marimba" at={at(T.sent)} gainDb={-6} />
      {CHAINS3.map((c) => (
        <Sfx key={`z${c}`} name="whoosh-zip" at={at(launchOf(c) + 2)} align="peak" gainDb={-11} />
      ))}
      {CHAINS3.map((c) => (
        <Sfx key={`s${c}`} name="sticker-slap" at={at(launchOf(c) + 6)} gainDb={-11} />
      ))}
    </>
  );
}
