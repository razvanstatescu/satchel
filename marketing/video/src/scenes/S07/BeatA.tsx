import { ArrowRight, CircleX } from "lucide-react";
import { AbsoluteFill, interpolate, spring } from "remotion";
import { noise2D } from "@remotion/noise";
import { C, F, display } from "../../brand/tokens";
import { EASE, FPS, SPRING } from "../../lib/time";
import { CleanHistoryPanel, CleanHistoryRow, SigningStep, STROKE, mixColor } from "../../components/product";
import { Headline, Plate, pulseAt, tw, type Cues } from "./lib";
import { CARD_H, CARD_W, RequestCard, type RequestKind } from "./Requests";

// Right-column geometry (world coordinates; the ledger lives one screen below the gate).
const CX = 1330;
const CARD_LEFT = CX - CARD_W / 2;
const GATE_Y = 742;
const PENDING_TOP = 554;
const CONTACT_TOP = GATE_Y - CARD_H - 4;
const PILE = { left: 120, top: 752, step: 120, scale: 0.66 };
const LEDGER = { left: 860, top: 1080 + 190, width: 940 };
const K = 2.1;
// where the new record row sits inside the ledger stage (order labels 98 + panel padding/eyebrow/old rows)
const SLOT = { left: LEDGER.left + 16 * K, top: LEDGER.top + 98 + 16 * K + 18 * K + 14 * K + 2 * (2 * 9 * K + 18 * K + 1.4) };

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** One of the two order labels: "1 Record" → "2 Sign". `on` 0..1 lights it (number turns brass, word turns ink). */
function OrderLabel({ n, word, on, pop }: { n: number; word: string; on: number; pop: number }) {
  const ink = on > 0.5;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, transform: `scale(${pop})`, transformOrigin: "left center" }}>
      <span
        style={{
          width: 64,
          height: 64,
          borderRadius: 99,
          display: "grid",
          placeItems: "center",
          border: `2px solid ${ink ? C.brand : C.line}`,
          color: ink ? C.brandBright : C.inkMuted,
          ...display(700, 48),
          fontSize: 34,
        }}
      >
        {n}
      </span>
      <span style={{ ...display(650, 72), fontSize: 56, letterSpacing: "-0.02em", color: ink ? C.ink : C.inkMuted, opacity: 0.45 + 0.55 * on }}>{word}</span>
    </div>
  );
}

/** A request that isn't a plain transfer: drops in, is pushed into the contract, bounces off, and is set aside. */
function Refused({ t, kind, enter, hit, slot, leave }: { t: number; kind: RequestKind; enter: number; hit: number; slot: number; leave: number }) {
  if (t < enter) return null;
  const gone = tw(t, leave, leave + 0.16, 0, 1, EASE.standard); // fades as the camera leaves (no streaks over the headline)
  if (gone >= 1) return null;
  const drop = tw(t, enter, enter + 0.24, 0, 1, EASE.expoOut);
  const push = tw(t, hit - 0.1, hit, 0, 1, EASE.expoIn);
  const s = t >= hit ? spring({ frame: (t - hit) * FPS, fps: FPS, config: { stiffness: 420, damping: 15, mass: 0.7 } }) : 0;
  let y = lerp(-CARD_H - 120, PENDING_TOP, drop);
  if (t >= hit - 0.1) y = lerp(PENDING_TOP, CONTACT_TOP, push);
  if (t >= hit) y = CONTACT_TOP - 96 * s;
  const rot = t >= hit ? -2.5 * s : 0;
  const pile = tw(t, hit + 0.3, hit + 0.58, 0, 1, EASE.expoInOut);
  const x = lerp(CARD_LEFT + 18 * s, PILE.left, pile);
  const yy = lerp(y, PILE.top + slot * PILE.step, pile);
  const sc = lerp(1, PILE.scale, pile);
  const p = tw(t, hit, hit + 0.24, 0, 1, EASE.expoOut);
  const flash = t >= hit ? 1 - tw(t, hit, hit + 0.4, 0, 1, EASE.standard) : 0;
  return (
    <div style={{ position: "absolute", left: x, top: yy, opacity: 1 - gone, transform: `scale(${sc}) rotate(${rot * (1 - pile)}deg)`, transformOrigin: "left top" }}>
      <RequestCard kind={kind} verdict={t >= hit ? "refused" : "none"} p={p} flash={flash} />
    </div>
  );
}

/**
 * A · L12 "Satchel signs only plain transfers it can read, and records each one before NEAR's signer network signs it."
 * A1 "Plain transfers only.": a raw hash and a token approval bounce off the contract (danger ✕, "· refused"); a plain
 *    transfer passes, the gate opens, and the camera follows it down into the ledger.
 * A2 "Recorded before it's signed.": the record writes itself FIRST ("1 Record"), then "2 Sign" lights and the step ticks
 *    to "Signed by NEAR's signer network".
 */
export function BeatA({ t, q }: { t: number; q: Cues }) {
  const f = t * FPS;
  // the three requests
  const enter1 = Math.max(q.aHead + 0.3, q.aHit1 - 0.8);
  const enter2 = Math.max(q.aHit1 + 0.4, q.aHit2 - 0.6);
  const enter3 = Math.max(q.aHit2 + 0.4, q.aPass - 0.6);
  // camera follows the plain transfer down into the ledger (one screen)
  const panAt = (x: number) => tw(x, q.aDrop + 0.02, q.aDrop + 0.64, 0, 1, EASE.expoInOut);
  const pan = panAt(t);
  const panY = -1080 * pan;
  const speed = Math.abs(panAt(t + 1 / FPS) - pan) * 1080; // px per frame
  const blurY = Math.min(26, speed * 0.32);
  // impact shake (translate only), on each refusal
  const shakeAt = (hit: number) => {
    const st = t - hit;
    if (st < 0) return 0;
    return 9 * Math.exp(-st / 0.09);
  };
  const env = shakeAt(q.aHit1) + shakeAt(q.aHit2);
  const shx = noise2D("a-x", t * 14, 0) * env;
  const shy = noise2D("a-y", 0, t * 14) * env * 0.6;
  // gate
  const gateIn = tw(t, 0, 0.55, 0, 1, EASE.expoOut);
  const flashD = Math.max(t >= q.aHit1 ? 1 - tw(t, q.aHit1, q.aHit1 + 0.45) : 0, t >= q.aHit2 ? 1 - tw(t, q.aHit2, q.aHit2 + 0.45) : 0);
  const flashS = t >= q.aPass ? 1 - tw(t, q.aDrop, q.aDrop + 0.5, 0, 1, EASE.standard) : 0;
  const open = tw(t, q.aDrop - 0.12, q.aDrop + 0.12, 0, 1, EASE.expoOut);
  const gateColor = flashD > 0.01 ? mixColor(C.lineStrong, C.danger, flashD) : flashS > 0.01 ? mixColor(C.lineStrong, C.success, flashS) : C.lineStrong;
  const xMark = (hit: number) => {
    if (t < hit || t > hit + 0.5) return null;
    const pop = spring({ frame: (t - hit) * FPS, fps: FPS, config: SPRING.slam });
    const fade = 1 - tw(t, hit + 0.28, hit + 0.5, 0, 1, EASE.standard);
    return (
      <span key={hit} style={{ position: "absolute", left: CX - 34, top: GATE_Y - 34, display: "inline-flex", color: C.danger, transform: `scale(${0.5 + 0.6 * pop})`, opacity: fade, background: C.ground, borderRadius: 99 }}>
        <CircleX size={68} strokeWidth={STROKE} />
      </span>
    );
  };

  // the plain transfer: drop in, pass the open gate, ride the camera down into the ledger slot, dissolve into the record
  const drop3 = tw(t, enter3, enter3 + 0.24, 0, 1, EASE.expoOut);
  const fall = tw(t, q.aDrop, q.aDrop + 0.64, 0, 1, EASE.expoInOut);
  const passWorldY = t < q.aDrop ? lerp(-CARD_H - 120, PENDING_TOP, drop3) : lerp(PENDING_TOP, SLOT.top, fall);
  const passX = lerp(CARD_LEFT, SLOT.left, fall);
  const passP = tw(t, q.aPass, q.aPass + 0.24, 0, 1, EASE.expoOut);
  const passFade = 1 - tw(t, q.aWrite - 0.04, q.aWrite + 0.16, 0, 1, EASE.standard);

  // ledger (A2)
  const write = tw(t, q.aWrite, q.aWriteEnd, 0, 1, (x) => x);
  const stamp = spring({ frame: f - q.aWriteEnd * FPS, fps: FPS, config: SPRING.slam });
  const stampScale = q.aWriteEnd <= t ? 1 + 0.05 * (1 - stamp) : 1;
  const recOn = tw(t, q.aWrite - 0.1, q.aWrite + 0.15);
  const recPop = 1 + 0.08 * Math.sin(Math.PI * tw(t, q.aWrite - 0.1, q.aWrite + 0.25, 0, 1, (x) => x));
  const signOn = tw(t, q.aSign - 0.05, q.aSign + 0.2);
  const signPop = 1 + 0.08 * Math.sin(Math.PI * tw(t, q.aSign - 0.05, q.aSign + 0.3, 0, 1, (x) => x));
  const arrow = tw(t, q.aWriteEnd, q.aSign, 0, 1, EASE.expoInOut);
  const metaIn = tw(t, q.aWriteEnd + 0.05, q.aWriteEnd + 0.4);
  const stepIn = tw(t, q.aSign - 0.1, q.aSign + 0.3);
  const stepState = t >= q.aSigned ? "done" : t >= q.aSign ? "active" : "future";
  const doneP = spring({ frame: f - q.aSigned * FPS, fps: FPS, config: SPRING.slam });
  const caret = Math.floor(f / 8) % 2 === 0 ? 1 : 0.15;
  const ry = -6 + 2 * tw(t, q.aDrop, q.cutB, 0, 1, EASE.standard);
  const fid = "s07a-vblur";

  return (
    <AbsoluteFill>
      <Plate name="ledger" opacity={0.22 * pan} style={{ transform: `translateY(${(1 - pan) * 360}px)` }} />

      {/* the world: gate + refused pile (screen 1) and the ledger (screen 2), panned as one */}
      {blurY > 0.4 ? (
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter id={fid} x="-5%" y="-10%" width="110%" height="120%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`0 ${blurY.toFixed(1)}`} />
          </filter>
        </svg>
      ) : null}
      <AbsoluteFill style={{ transform: `translate(${shx}px, ${panY + shy}px)`, filter: blurY > 0.4 ? `url(#${fid})` : undefined }}>
        {/* gate: the contract that reads every request */}
        <div style={{ position: "absolute", left: 880, top: GATE_Y - 5, width: 900, height: 10, transform: `scaleX(${gateIn})` }}>
          <span style={{ position: "absolute", left: 0, top: 0, width: 450, height: 10, borderRadius: 5, background: gateColor, transform: `translateX(${-open * 400}px)`, opacity: 1 - open * 0.7 }} />
          <span style={{ position: "absolute", right: 0, top: 0, width: 450, height: 10, borderRadius: 5, background: gateColor, transform: `translateX(${open * 400}px)`, opacity: 1 - open * 0.7 }} />
        </div>
        <div style={{ position: "absolute", left: 880, top: GATE_Y + 26, fontFamily: F.mono, fontSize: 30, color: C.inkMuted, opacity: gateIn, fontFeatureSettings: '"zero" 1' }}>
          satchel.satchelhq.near
        </div>
        {xMark(q.aHit1)}
        {xMark(q.aHit2)}
        <Refused t={t} kind="hash" enter={enter1} hit={q.aHit1} slot={0} leave={q.aDrop - 0.04} />
        <Refused t={t} kind="approval" enter={enter2} hit={q.aHit2} slot={1} leave={q.aDrop - 0.04} />

        {/* the ledger, one screen below */}
        <AbsoluteFill style={{ perspective: 2000 }}>
          <div style={{ position: "absolute", left: LEDGER.left, top: LEDGER.top, width: LEDGER.width, transform: `rotateY(${ry}deg)`, transformOrigin: "left center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 28, marginBottom: 34, marginLeft: 6, height: 64 }}>
              <OrderLabel n={1} word="Record" on={recOn} pop={recPop} />
              <span style={{ position: "relative", width: 96, height: 40, display: "inline-flex", alignItems: "center", color: C.brand, overflow: "hidden" }}>
                <span style={{ clipPath: `inset(0 ${100 - arrow * 100}% 0 0)`, display: "inline-flex", opacity: 0.35 + 0.65 * arrow }}>
                  <ArrowRight size={52} strokeWidth={STROKE} />
                </span>
              </span>
              <OrderLabel n={2} word="Sign" on={signOn} pop={signPop} />
            </div>
            <CleanHistoryPanel k={K} eyebrow="Signature records · Satchel #1" style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.55)" }}>
              <div style={{ marginTop: 14 * K }}>
                <div style={{ opacity: 0.42 }}>
                  <CleanHistoryRow k={K} pad={9} chain="btc" title="Bitcoin · coin 7d…e2:1" status="spent" pill={null} divider="top" />
                  <CleanHistoryRow k={K} pad={9} chain="evm" title="Ethereum · nonce 2" status="spent" pill={null} divider="top" />
                </div>
                <div style={{ transform: `scale(${stampScale})`, transformOrigin: "left center" }}>
                  <CleanHistoryRow
                    k={K}
                    pad={11}
                    chain="evm"
                    title="Ethereum · nonce 3"
                    wouldPay="Would send 0.0100 ETH to 0x53f9…1C2A"
                    status="unfunded"
                    pill={null}
                    write={t < q.aWrite ? 0 : write}
                    caret={t < q.aWrite ? 0 : caret}
                    divider="both"
                    evidence={
                      <span style={{ fontFamily: F.mono, fontSize: 26, color: C.inkMuted, opacity: metaIn }}>
                        Recorded on NEAR · block 274,140,212
                      </span>
                    }
                    resolve={metaIn}
                  />
                </div>
                <div style={{ marginTop: 16 * K, opacity: stepIn, transform: `translateY(${(1 - stepIn) * 16}px)` }}>
                  <div style={{ transform: `scale(${stepState === "done" ? 1 + 0.04 * (1 - doneP) : 1})`, transformOrigin: "left center" }}>
                    <SigningStep k={K} step="mpc" state={stepState} pulse={pulseAt(t)} />
                  </div>
                </div>
              </div>
            </CleanHistoryPanel>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* the plain transfer rides the camera (not blurred: it stays nearly still on screen) */}
      {t >= enter3 && passFade > 0.001 ? (
        <div style={{ position: "absolute", left: passX, top: passWorldY + panY, opacity: passFade }}>
          <RequestCard kind="send" verdict={t >= q.aPass ? "plain" : "none"} p={passP} flash={t >= q.aPass ? interpolate(passP, [0, 0.4, 1], [0, 1, 0]) : 0} />
        </div>
      ) : null}

      {/* headlines (fixed; the camera move doesn't touch them) */}
      <div style={{ position: "absolute", left: 120, top: 268 }}>
        <Headline lines={["Plain", "transfers", "only."]} t={t} at={q.aHead} outAt={q.aDrop + 0.2} size={132} />
      </div>
      <div style={{ position: "absolute", left: 120, top: 268 }}>
        {t >= q.aDrop + 0.4 ? <Headline lines={["Recorded", "before it's", "signed."]} t={t} at={q.aDrop + 0.46} size={132} /> : null}
      </div>
    </AbsoluteFill>
  );
}
