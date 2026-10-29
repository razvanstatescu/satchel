import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import { ADDR, C, CHAIN, F, type Chain } from "../../brand/tokens";
import { ChainDot, SatchelCard } from "../../components/SatchelCard";
import { Sfx } from "../../lib/Sfx";
import { getScene } from "../../lib/timeline";
import { EASE, FPS, H, SPRING, W, s, tween } from "../../lib/time";
import { bric, ChainMark, CLAMP, clamp01, ease, KeyLitGround, landingFrame, lerp, MaskLine, SewPath, shortAddr } from "./kit";

/**
 * S01 Hook, "three wallets" (L01–L04). One camera over a strip of three wallet panels: whip-pans on the cuts (velocity
 * blur), each chain word slams in with a weight/width morph while Satchel #1's real address types out. On L04 the camera
 * pulls back to show the three wallets side by side, they collapse into address tags, the Satchel card slams in above
 * them and three saddle stitches sew every address to the one card. "This NFT is a wallet." lands and holds.
 */

const sc = getScene("S01");
const D = sc.duration;
const T1 = sc.line("L02").start;
const T2 = sc.line("L03").start;
const T4 = sc.line("L04").start;

const CHAINS: Chain[] = ["btc", "evm", "sol"];
const STEP = W + 120; // strip pitch (panel + gutter)
const S0 = 0.27; // pulled-back camera scale
const PSTART = [-0.1, T1, T2]; // panel 0 starts its slam just before frame 0, so frame 0 already moves

// L04 choreography (anchored to the VO, never earlier than the Solana address has had time to finish).
const TC = Math.max(T4 - 0.5, T2 + 1.25); // camera pull-back starts
const TPULL = 0.4;
const TCOL = TC + TPULL + 0.08; // panels collapse into tags
const TS = TCOL + 0.28; // card slams in
const TSTITCH = TS + 0.18; // stitches sew the addresses to the card
const TT = TS + 0.38; // "This NFT is a wallet."

const TYPE_START = PSTART.map((p, i) => (i === 0 ? 0.3 : p + 0.3));
const TYPE_END = [T1 - 0.2, T2 - 0.2, TC - 0.1];
const TYPE_CPS = CHAINS.map((ch, i) => Math.max(46, ADDR[ch].length / Math.max(0.4, TYPE_END[i] - TYPE_START[i])));

const SLAM_LAND = landingFrame(SPRING.slam);

// Final layout (screen space).
const CARD_W = 600;
const CARD_H = (252 * CARD_W) / 400;
const CARD_CX = 960;
const CARD_CY = 292;
const TAG_W = 500;
const TAG_H = 84;
const TAG_CY = 640;
const TAG_CX = [420, 960, 1500];
const CARD_BOTTOM = CARD_CY + CARD_H / 2 + 2;
const DRIFT_END = 1.018; // the settle drift on the final layout (scale about the frame centre)
/** Where Satchel #1 sits on S01's last frame (W1 picks the card up from here). */
export const S01_END_CARD = { cx: CARD_CX, cy: 540 + (CARD_CY - 540) * DRIFT_END, w: CARD_W * DRIFT_END };
const SEAMS = [
  `M 810 ${CARD_BOTTOM} C 810 ${CARD_BOTTOM + 72}, 420 ${TAG_CY - TAG_H / 2 - 72}, 420 ${TAG_CY - TAG_H / 2}`,
  `M 960 ${CARD_BOTTOM} C 960 ${CARD_BOTTOM + 40}, 960 ${TAG_CY - TAG_H / 2 - 40}, 960 ${TAG_CY - TAG_H / 2}`,
  `M 1110 ${CARD_BOTTOM} C 1110 ${CARD_BOTTOM + 72}, 1500 ${TAG_CY - TAG_H / 2 - 72}, 1500 ${TAG_CY - TAG_H / 2}`,
];

// ---- camera -------------------------------------------------------------------------------------------------
function camX(f: number) {
  const intro = interpolate(f, [-3, 9], [900, 0], { ...CLAMP, easing: EASE.expoOut });
  let pos = 0;
  for (const T of [T1, T2]) {
    const cut = s(T);
    pos += interpolate(f, [cut - 4, cut + 4], [0, 1], { ...CLAMP, easing: EASE.whip });
  }
  return -pos * STEP + intro;
}

interface Rect {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

function panelRect(i: number, f: number, fps: number): { r: Rect; pulled: number; collapse: number } {
  const pA = interpolate(f, [s(TC), s(TC + TPULL)], [0, 1], { ...CLAMP, easing: EASE.expoInOut });
  const k = Math.pow(S0, pA);
  const c = lerp(-camX(f) + W / 2, STEP + W / 2, pA);
  const cy = lerp(H / 2, 560, pA);
  const strip: Rect = { cx: W / 2 + (i * STEP + W / 2 - c) * k, cy, w: W * k, h: H * k };
  const pB = spring({ frame: f - s(TCOL) - i * 2, fps, config: SPRING.lift });
  const tag: Rect = { cx: TAG_CX[i], cy: TAG_CY, w: TAG_W, h: TAG_H };
  const r: Rect = { cx: lerp(strip.cx, tag.cx, pB), cy: lerp(strip.cy, tag.cy, pB), w: lerp(strip.w, tag.w, pB), h: lerp(strip.h, tag.h, pB) };
  return { r, pulled: (1 - k) / (1 - S0), collapse: pB };
}

// ---- one wallet panel, authored at 1920×1080 --------------------------------------------------------------------
function PanelContent({ i, f, fps }: { i: number; f: number; fps: number }) {
  const ch = CHAINS[i];
  const start = s(PSTART[i]);
  const t = f / FPS;
  const p = spring({ frame: f - start, fps, config: SPRING.slam });
  const e = interpolate(f, [start, start + 11], [0, 1], { ...CLAMP, easing: EASE.expoOut });
  const push = 1 + 0.025 * clamp01((t - PSTART[i]) / 2);
  const wordScale = lerp(1.45, 1, p) * push;
  const wordOpacity = interpolate(f, [start, start + 2], [0, 1], CLAMP);
  const mark = spring({ frame: f - start - 3, fps, config: SPRING.slam });
  const hud = interpolate(f, [start + 4, start + 12], [0, 1], CLAMP);
  const line = interpolate(f, [start + 5, start + 17], [0, 1], { ...CLAMP, easing: EASE.expoOut });

  const addr = ADDR[ch];
  const typed = Math.max(0, Math.min(addr.length, Math.floor((t - TYPE_START[i]) * TYPE_CPS[i])));
  const done = typed >= addr.length;
  const caretOn = !done || Math.floor(f / 8) % 2 === 0;

  return (
    <AbsoluteFill>
      <KeyLitGround plateName="leather-ground" plateOpacity={0.28} dx={-i * 40} light={0.34} />
      {/* HUD */}
      <div style={{ position: "absolute", left: 120, top: 104, fontFamily: F.mono, fontSize: 30, color: C.inkMuted, opacity: hud, letterSpacing: "0.02em" }}>
        Wallet {i + 1} of 3
      </div>
      <div style={{ position: "absolute", right: 120, top: 104, fontFamily: F.mono, fontSize: 30, color: C.inkMuted, opacity: hud, display: "flex", alignItems: "center", gap: 14 }}>
        <ChainDot chain={ch} size={14} />
        {CHAIN[ch].network}
      </div>
      {/* chain mark */}
      <div style={{ position: "absolute", left: W / 2 - 52, top: 196, transform: `scale(${lerp(0.3, 1, mark)})`, opacity: clamp01(mark * 3) }}>
        <ChainMark chain={ch} size={104} />
      </div>
      {/* kinetic chain word */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 330,
          textAlign: "center",
          ...bric(lerp(360, 800, e), lerp(75, 100, e)),
          fontSize: 270,
          lineHeight: 1,
          letterSpacing: `${lerp(-0.005, -0.035, e)}em`,
          color: C.ink,
          opacity: wordOpacity,
          transform: `translateY(${lerp(36, 0, p)}px) scale(${wordScale})`,
        }}
      >
        {CHAIN[ch].name}
      </div>
      {/* chain accent */}
      <div style={{ position: "absolute", left: W / 2 - 120 * line, top: 662, width: 240 * line, height: 8, borderRadius: 4, background: CHAIN[ch].color }} />
      {/* the real address, typing */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 720, textAlign: "center", fontFamily: F.mono, fontSize: 54, fontWeight: 500, color: C.ink, whiteSpace: "pre" }}>
        <span>{addr.slice(0, typed)}</span>
        <span style={{ position: "relative" }}>
          {caretOn && typed > 0 ? (
            <span style={{ position: "absolute", left: 2, top: "0.12em", width: "0.55em", height: "1.02em", background: C.ink, opacity: 0.85 }} />
          ) : null}
          <span style={{ color: "transparent" }}>{addr.slice(typed)}</span>
        </span>
      </div>
    </AbsoluteFill>
  );
}

function TagContent({ i }: { i: number }) {
  const ch = CHAINS[i];
  return (
    <div style={{ width: TAG_W, height: TAG_H, display: "flex", alignItems: "center", gap: 16, padding: "0 28px", boxSizing: "border-box" }}>
      <ChainDot chain={ch} size={18} />
      <span style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 30, color: C.inkMuted, width: 62 }}>{CHAIN[ch].ticker}</span>
      <span style={{ fontFamily: F.mono, fontSize: 36, fontWeight: 500, color: C.ink, whiteSpace: "nowrap" }}>{shortAddr(ADDR[ch], 6, 6)}</span>
    </div>
  );
}

function PanelBox({ i, f, fps }: { i: number; f: number; fps: number }) {
  const { r, pulled, collapse } = panelRect(i, f, fps);
  if (r.cx + r.w / 2 < -40 || r.cx - r.w / 2 > W + 40) return null; // off-screen
  const radius = lerp(lerp(0, 26, clamp01(pulled)), 18, clamp01(collapse));
  const contentScale = Math.min(r.w / W, r.h / H);
  const bigOpacity = 1 - clamp01(collapse * 2.4);
  const tagOpacity = clamp01((collapse - 0.35) * 2.6);
  return (
    <div
      style={{
        position: "absolute",
        left: r.cx - r.w / 2,
        top: r.cy - r.h / 2,
        width: r.w,
        height: r.h,
        borderRadius: radius,
        overflow: "hidden",
        background: C.ground,
        boxShadow: `inset 0 0 0 ${2 * clamp01(pulled * 1.5)}px ${C.line}`,
      }}
    >
      {bigOpacity > 0 ? (
        <div style={{ position: "absolute", left: r.w / 2 - W / 2, top: r.h / 2 - H / 2, width: W, height: H, transform: `scale(${contentScale})`, opacity: bigOpacity }}>
          <PanelContent i={i} f={f} fps={fps} />
        </div>
      ) : null}
      {tagOpacity > 0 ? (
        <>
          <div style={{ position: "absolute", inset: 0, background: C.surface, opacity: tagOpacity, boxShadow: `inset 0 0 0 2px ${C.line}`, borderRadius: radius }} />
          <div style={{ position: "absolute", left: r.w / 2 - TAG_W / 2, top: r.h / 2 - TAG_H / 2, opacity: tagOpacity, transform: `scale(${r.w / TAG_W})` }}>
            <TagContent i={i} />
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function S01() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  // velocity-driven horizontal blur during whips (only while the camera is still at full scale)
  const v = Math.abs(camX(f + 1) - camX(f - 1)) / 2;
  const blur = f < s(TC) ? Math.min(70, v * 0.3) : 0;

  // card slam + impact shake (translate only)
  const cardP = spring({ frame: f - s(TS), fps, config: SPRING.slam });
  const cardOpacity = interpolate(f, [s(TS), s(TS) + 3], [0, 1], CLAMP);
  const shakeT = f - (s(TS) + SLAM_LAND);
  const env = shakeT < 0 ? 0 : 9 * Math.exp(-shakeT / 5);
  const shx = noise2D("s01x", shakeT * 0.35, 0) * env;
  const shy = noise2D("s01y", 0, shakeT * 0.35) * env;
  const drift = 1 + (DRIFT_END - 1) * tween(f, TS, D, 0, 1, EASE.standard);

  const cardStitch = tween(f, TS + 0.3, TS + 1.0, 0, 1, EASE.standard);
  const textP = interpolate(f, [s(TT), s(TT) + 16], [0, 1], { ...CLAMP, easing: EASE.expoOut });

  return (
    <AbsoluteFill style={{ background: "#120c09" }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id="s01-whip" x="-5%" y="0" width="110%" height="100%">
          <feGaussianBlur stdDeviation={`${blur.toFixed(2)} 0`} />
        </filter>
      </svg>
      <AbsoluteFill style={{ transform: `translate(${shx}px, ${shy}px) scale(${drift})` }}>
        {/* backdrop once the camera pulls back */}
        <AbsoluteFill style={{ opacity: tween(f, TC, TC + TPULL, 0, 1) }}>
          <KeyLitGround plateName="leather-ground" plateOpacity={0.22} light={0.26} />
        </AbsoluteFill>
        <AbsoluteFill style={{ filter: blur > 0.5 ? "url(#s01-whip)" : undefined, overflow: "hidden" }}>
          {CHAINS.map((_, i) => (
            <PanelBox key={i} i={i} f={f} fps={fps} />
          ))}
        </AbsoluteFill>

        {/* the stitches: each address sewn to the one card */}
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {SEAMS.map((d, i) => (
            <SewPath key={i} d={d} id={`s01-seam-${i}`} progress={tween(f, TSTITCH + i * 0.07, TSTITCH + 0.6 + i * 0.07, 0, 1, EASE.standard)} width={4} dash={[11, 9]} />
          ))}
        </svg>

        {/* Satchel #1 slams to centre */}
        {cardOpacity > 0 ? (
          <div
            style={{
              position: "absolute",
              left: CARD_CX - CARD_W / 2,
              top: CARD_CY - CARD_H / 2,
              opacity: cardOpacity,
              transform: `translateY(${lerp(-50, 0, cardP)}px) scale(${lerp(1.7, 1, cardP)})`,
            }}
          >
            <SatchelCard tokenId="1" width={CARD_W} status="active" stitch={cardStitch} />
          </div>
        ) : null}

        {/* the claim */}
        {textP > 0 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 772, display: "flex", justifyContent: "center" }}>
            <MaskLine p={textP}>
              <div style={{ ...bric(lerp(560, 800, textP), lerp(86, 100, textP)), fontSize: 124, lineHeight: 1.04, letterSpacing: "-0.03em", color: C.ink, whiteSpace: "nowrap" }}>
                This NFT is a wallet.
              </div>
            </MaskLine>
          </div>
        ) : null}
      </AbsoluteFill>

      {/* sound */}
      <Sfx name="whoosh-fast" at={0.05} align="peak" gainDb={-3} />
      <Sfx name="impact-soft" at={(s(PSTART[0]) + SLAM_LAND) / FPS} gainDb={-2} />
      <Sfx name="whip-pan" at={T1} align="peak" />
      <Sfx name="whip-pan" at={T2} align="peak" />
      <Sfx name="impact-soft" at={T1 + SLAM_LAND / FPS} gainDb={-6} />
      <Sfx name="impact-soft" at={T2 + SLAM_LAND / FPS} gainDb={-6} />
      {CHAINS.map((ch, i) => {
        const dur = ADDR[ch].length / TYPE_CPS[i];
        return <Sfx key={ch} name="type-tick-run" at={TYPE_START[i]} rate={Math.max(0.8, Math.min(1.6, 1.156 / dur))} />;
      })}
      <Sfx name="whoosh-deep" at={TC + TPULL * 0.5} align="peak" gainDb={-3} />
      <Sfx name="swish-short" at={TCOL + 0.05} align="peak" gainDb={-4} />
      <Sfx name="impact-deep" at={TS + SLAM_LAND / FPS} />
      <Sfx name="stitch-run" at={TSTITCH} />
    </AbsoluteFill>
  );
}
