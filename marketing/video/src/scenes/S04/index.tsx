import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Check, X } from "lucide-react";
import { C, F } from "../../brand/tokens";
import { SatchelCard } from "../../components/SatchelCard";
import { Sfx } from "../../lib/Sfx";
import { getScene, type SceneData, type VoLine } from "../../lib/timeline";
import { EASE, s, SPRING, springAt, tween } from "../../lib/time";
import { SEED_SCRIM, SeedCopies, seedRecede, type SeedTiming } from "../S03";
import { AccountChip, headline, MaskLine, SewLine } from "../S03/kit";

/**
 * S04 "No seed phrase · only the owner signs" (L07: "There's no seed phrase to copy. The contract signs only for
 * whoever owns the NFT.").
 * First sentence: S03's hero move, compressed (≈2 s): the seed-phrase card on the desk, the photocopier lamp, the
 * copies multiplying. Text: "No seed phrase to copy." Then the copies burn away.
 * Second sentence: Satchel #1 returns; alice.near's request is sewn to the card (the stitch = "you own this"),
 * goes frozen "Signing…", then "Signed"; mallory.near's bounces with a danger ✕ "Not the owner".
 * Text: "Only the owner signs."
 */

/** Start of L07's second sentence (scene-relative s): the `secondSentenceStart` field if the audio pipeline wrote one
 * (line-relative or absolute), else the first word after a sentence end. */
function secondSentenceAt(sc: SceneData, L: VoLine & { end: number }): number {
  const raw = (L as Record<string, unknown>).secondSentenceStart;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw <= L.duration + 0.05 ? L.start + raw : raw - sc.start;
  const i = L.words.findIndex((w, k) => k > 0 && /[.!?…]$/.test(L.words[k - 1].text.trim()));
  return i > 0 ? L.start + L.words[i].start : L.start + L.duration * 0.42;
}

export function s04Times() {
  const sc = getScene("S04");
  const L = sc.line("L07");
  const w = (p: string) => sc.wordAt("L07", p);
  const second = secondSentenceAt(sc, L);

  // first sentence: the copies (all clamped so the burn is over by the second sentence)
  const seedWord = w("seed");
  const scan = Math.max(0.4, Math.min(seedWord - 0.45, second - 1.95));
  const scanEnd = scan + 0.5;
  const burst = scanEnd + 0.05;
  const burnStart = Math.max(burst + 0.6, Math.min(w("copy") + 0.25, second - 0.45));
  const burstDur = Math.max(0.5, Math.min(0.8, burnStart - burst + 0.1));
  const noSeed = burst + 0.05;
  const burnEnd = burnStart + 0.55;
  const seed: SeedTiming = { open: Math.min(0.5, scan), typeIn: 0, typeDur: 0, scan, scanEnd, burst, burstDur, recede: noSeed };

  // second sentence: the diagram. The closing line lands on "owns" but keeps ≥ 2.3 s before the cut; the
  // alice → mallory beats fit between alice's request and that line (compressed if the read is fast).
  const fit = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
  const cardIn = Math.max(burnStart + 0.25, second - 0.15);
  const label = cardIn + 0.3;
  const aReq = Math.max(label + 0.25, w("signs") - 0.35);
  const only = Math.max(aReq + 1.0, Math.min(w("owns"), sc.duration - 2.3));
  const k = Math.max(0.5, Math.min(1, (only - 0.3 - aReq) / 1.48));
  const aSew = aReq + 0.2 * k;
  const signing = aSew + 0.45 * k;
  const bounceLatest = only - 0.3;
  const signed = fit(w("only"), signing + 0.4 * k, Math.max(signing + 0.4 * k, bounceLatest - 0.43 * k));
  const mReq = fit(w("whoever") - 0.15, signed + 0.15 * k, Math.max(signed + 0.15 * k, bounceLatest - 0.28 * k));
  const bounce = mReq + 0.28 * k;
  return { duration: sc.duration, second, seed, noSeed, burnStart, burnEnd, cardIn, label, aReq, aSew, signing, signed, mReq, bounce, only };
}

// diagram anchors
const CARD_B = { cx: 1300, cy: 470, w: 600 };
const REQ = { left: 140, w: 640, h: 150, aliceTop: 300, malTop: 520 };
const CARD_LEFT = CARD_B.cx - CARD_B.w / 2;
const ALICE_PATH = `M ${REQ.left + REQ.w + 6} ${REQ.aliceTop + 75} C ${REQ.left + REQ.w + 110} ${REQ.aliceTop + 75}, ${CARD_LEFT - 110} 420, ${CARD_LEFT - 4} 420`;

export function S04Visual() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const T = s04Times();

  // --- first sentence: the copies, then they burn away (noise-threshold dissolve with an ember edge)
  const burn = tween(frame, T.burnStart, T.burnEnd, 0, 1, (x) => x);
  const recede = seedRecede(frame, T.seed);

  // --- the card flies back in, straight to its place in the diagram
  const enter = springAt(frame, fps, T.cardIn, SPRING.handoff);
  const cw = CARD_B.w;
  const ch = cw * (252 / 400);
  const ccx = CARD_B.cx;
  const ccy = CARD_B.cy;

  const isSigning = frame >= s(T.signing) && frame < s(T.signed);
  const pulse = 0.55 + 0.45 * Math.cos(((frame - s(T.signing)) / fps) * Math.PI * 4);

  // --- requests
  const aliceIn = springAt(frame, fps, T.aReq, SPRING.snap);
  const malIn = springAt(frame, fps, T.mReq - 0.32, SPRING.snap);
  const sew = tween(frame, T.aSew, T.signing, 0, 1, EASE.standard);
  const shot = tween(frame, T.mReq, T.bounce, 0, 1, EASE.expoIn);
  const back = tween(frame, T.bounce, T.bounce + 0.4, 0, 1, EASE.expoOut);
  const malTip = frame < s(T.bounce) ? shot : 1 - back;
  const shakeT = (frame - s(T.bounce)) / fps;
  const shake = shakeT > 0 ? Math.sin(shakeT * 55) * 14 * Math.exp(-shakeT * 7) : 0;
  const wallFlash = frame >= s(T.bounce) ? Math.max(0, 1 - (frame - s(T.bounce)) / 9) : 0;

  const aliceStatus = frame >= s(T.signed) ? "signed" : frame >= s(T.signing) ? "signing" : "ask";
  const malStatus = frame >= s(T.bounce) ? "denied" : "ask";

  // frozen rings around the card while signing
  const ringT = (frame - s(T.signing)) / fps;

  return (
    <AbsoluteFill style={{ background: C.ground }}>
      {/* the seed phrase and its copies (burning away at the end of the first sentence) */}
      {burn < 1 ? (
        <AbsoluteFill style={{ filter: burn > 0.001 ? "url(#s04-burn)" : undefined }}>
          <SeedCopies T={T.seed} ground={false} />
        </AbsoluteFill>
      ) : null}
      <BurnFilter p={burn} />
      {burn < 1 ? <AbsoluteFill style={{ background: SEED_SCRIM, opacity: recede * (1 - burn) }} /> : null}

      {/* label: what does the signing */}
      <div style={{ position: "absolute", left: CARD_B.cx - 500, width: 1000, top: 108, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <MaskLine frame={frame} at={T.label - 0.05} dur={0.45}>
          <div style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 32, color: C.inkMuted }}>Signs through</div>
        </MaskLine>
        <MaskLine frame={frame} at={T.label} dur={0.5}>
          <div style={{ ...headline(68, C.ink, 680), letterSpacing: "-0.03em" }}>NEAR Chain Signatures</div>
        </MaskLine>
      </div>

      {/* frozen rings */}
      {ringT > 0 && ringT < 1.2
        ? [0, 0.22].map((d) => {
            const rt = ringT - d;
            if (rt < 0) return null;
            const k = 1 + rt * 0.12;
            return (
              <div
                key={d}
                style={{
                  position: "absolute",
                  left: ccx - cw / 2,
                  top: ccy - ch / 2,
                  width: cw,
                  height: ch,
                  borderRadius: 22 * (cw / 400),
                  border: `3px solid ${C.frozen}`,
                  opacity: Math.max(0, 0.85 - rt * 1.3),
                  transform: `scale(${k})`,
                }}
              />
            );
          })
        : null}

      {/* the card */}
      {frame >= s(T.cardIn) ? (
        <div style={{ position: "absolute", inset: 0, perspective: 1800 }}>
          <div
            style={{
              position: "absolute",
              left: ccx - cw / 2,
              top: ccy - ch / 2,
              transformStyle: "preserve-3d",
              transform: `translateZ(${-1500 * (1 - enter)}px) translateY(${260 * (1 - enter)}px) rotateX(${48 * (1 - enter)}deg) rotateY(${-14 * (1 - enter)}deg)`,
              opacity: Math.min(1, enter * 3),
            }}
          >
            <SatchelCard tokenId="1" width={cw} status={isSigning ? "signing" : "active"} pillPulse={isSigning ? pulse : 1} stitch={1} />
            {isSigning ? <div style={{ position: "absolute", inset: 0, borderRadius: 22 * (cw / 400), boxShadow: `0 0 0 3px ${C.frozen}`, opacity: 0.6 + 0.4 * pulse }} /> : null}
          </div>
        </div>
      ) : null}

      {/* owner line */}
      <div style={{ position: "absolute", left: CARD_B.cx - 400, width: 800, top: CARD_B.cy + ch / 2 + 30, display: "flex", justifyContent: "center" }}>
        <MaskLine frame={frame} at={T.label + 0.2} dur={0.45}>
          <div style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 36, color: C.inkMuted, whiteSpace: "nowrap" }}>
            Owned by <span style={{ fontFamily: F.mono, fontWeight: 500, color: C.ink }}>alice.near</span>
          </div>
        </MaskLine>
      </div>

      {/* lines: alice is sewn to the card; mallory's request bounces */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <SewLine d={ALICE_PATH} id="s04-alice-sew" p={sew} />
        {malTip > 0 ? (
          <line
            x1={REQ.left + REQ.w + 6}
            y1={REQ.malTop + 75}
            x2={REQ.left + REQ.w + 6 + (CARD_LEFT - 14 - (REQ.left + REQ.w + 6)) * malTip}
            y2={REQ.malTop + 75 + (520 - (REQ.malTop + 75)) * malTip}
            stroke={frame >= s(T.bounce) ? C.danger : C.inkMuted}
            strokeWidth={4}
            strokeDasharray="2 12"
            strokeLinecap="round"
          />
        ) : null}
        {wallFlash > 0 ? <line x1={CARD_LEFT - 12} y1={470} x2={CARD_LEFT - 12} y2={570} stroke={C.danger} strokeWidth={6} strokeLinecap="round" opacity={wallFlash} /> : null}
      </svg>

      {/* requests */}
      <Request top={REQ.aliceTop} p={aliceIn} name="alice.near" status={aliceStatus} pulse={pulse} />
      <Request top={REQ.malTop} p={malIn} name="mallory.near" status={malStatus} pulse={1} dx={shake} />

      {/* the claims share one slot: the first holds through the burn, the second takes over */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 96 }}>
        <MaskLine frame={frame} at={T.noSeed} out={T.only - 0.3} dur={0.5}>
          <div style={headline(132, C.ink, 760)}>No seed phrase to copy.</div>
        </MaskLine>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 96 }}>
        <MaskLine frame={frame} at={T.only} dur={0.55}>
          <div style={headline(132, C.ink, 760)}>Only the owner signs.</div>
        </MaskLine>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Request({ top, p, name, status, pulse, dx = 0 }: { top: number; p: number; name: string; status: "ask" | "signing" | "signed" | "denied"; pulse: number; dx?: number }) {
  if (p <= 0) return null;
  const border = status === "signed" ? C.success : status === "denied" ? C.danger : status === "signing" ? C.frozen : C.line;
  return (
    <div
      style={{
        position: "absolute",
        left: REQ.left,
        top,
        width: REQ.w,
        height: REQ.h,
        borderRadius: 24,
        background: C.surface,
        border: `2px solid ${border}`,
        display: "flex",
        alignItems: "center",
        padding: "0 30px",
        opacity: Math.min(1, p * 2),
        transform: `translateX(${-260 * (1 - p) + dx}px)`,
        boxShadow: "0 18px 40px rgba(0,0,0,0.4)",
      }}
    >
      <AccountChip name={name} size={44}>
        <StatusLine status={status} pulse={pulse} />
      </AccountChip>
    </div>
  );
}

function StatusLine({ status, pulse }: { status: "ask" | "signing" | "signed" | "denied"; pulse: number }) {
  const base = { display: "inline-flex", alignItems: "center", gap: 10, fontFamily: F.sans, fontWeight: 600, fontSize: 32, whiteSpace: "nowrap" as const };
  if (status === "signing")
    return (
      <span style={{ ...base, color: C.frozen }}>
        <span style={{ width: 14, height: 14, borderRadius: 99, background: C.frozen, opacity: pulse }} />
        Signing…
      </span>
    );
  if (status === "signed")
    return (
      <span style={{ ...base, color: C.success }}>
        <Check size={32} strokeWidth={2.5} color={C.success} />
        Signed
      </span>
    );
  if (status === "denied")
    return (
      <span style={{ ...base, color: C.danger }}>
        <X size={32} strokeWidth={2.75} color={C.danger} />
        Not the owner
      </span>
    );
  return <span style={{ ...base, color: C.inkMuted }}>Asks for a signature</span>;
}

/** Noise-threshold dissolve with a thin ember edge. p: 0 (intact) → 1 (gone). */
function BurnFilter({ p }: { p: number }) {
  const th = 0.2 + p * 0.66;
  const K = 22;
  return (
    <svg width={0} height={0} style={{ position: "absolute" }}>
      <filter id="s04-burn" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves={3} seed={11} result="noise" />
        <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.4 0 0 0 -0.2" result="n" />
        <feComponentTransfer in="n" result="keep">
          <feFuncA type="linear" slope={K} intercept={-th * K} />
        </feComponentTransfer>
        <feComponentTransfer in="n" result="halo">
          <feFuncA type="linear" slope={K} intercept={-(th - 0.035) * K} />
        </feComponentTransfer>
        <feComposite in="halo" in2="keep" operator="out" result="edge" />
        <feFlood floodColor="#f0b35e" result="ember" />
        <feComposite in="ember" in2="edge" operator="in" result="emberEdge" />
        <feComposite in="SourceGraphic" in2="keep" operator="in" result="kept" />
        <feComposite in="emberEdge" in2="SourceGraphic" operator="in" result="emberOnPaper" />
        <feMerge>
          <feMergeNode in="kept" />
          <feMergeNode in="emberOnPaper" />
        </feMerge>
      </filter>
    </svg>
  );
}

export function S04Sound() {
  const T = s04Times();
  return (
    <>
      <Sfx name="paper-slide" at={0.08} align="peak" gainDb={-4} />
      <Sfx name="scanner-sweep" at={T.seed.scan} gainDb={-1} />
      <Sfx name="whoosh-deep" at={T.seed.burst + 0.25} align="peak" gainDb={-6} />
      <Sfx name="downlifter" at={T.burnStart} gainDb={-7} />
      <Sfx name="impact-soft" at={T.cardIn + 0.4} gainDb={-4} />
      <Sfx name="stitch-run" at={T.aSew} gainDb={-3} />
      <Sfx name="freeze-shimmer" at={T.signing} gainDb={-3} />
      <Sfx name="success-brass" at={T.signed} gainDb={-2} />
      <Sfx name="error-low" at={T.bounce} gainDb={0} />
      <Sfx name="impact-soft" at={T.only + 0.06} gainDb={-4} />
    </>
  );
}

export default function S04() {
  return (
    <>
      <S04Visual />
      <S04Sound />
    </>
  );
}
