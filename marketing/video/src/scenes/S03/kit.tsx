import type { CSSProperties, ReactNode } from "react";
import { evolvePath, getLength, getPointAtLength } from "@remotion/paths";
import { Img, staticFile } from "remotion";
import imagesJson from "../../data/images.json";
import { C, F, display } from "../../brand/tokens";
import { EASE, s, tween } from "../../lib/time";

/**
 * Shared kit for the PROBLEM act (S03, S04, S05): paper props (seed card, transaction slip), masked type,
 * account chips, the odometer chip. Owned by scene builder B; imported only by S03–S05.
 */

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Image plate from src/data/images.json (any of file/path/src), or null so the scene falls back to code. */
export function plate(name: string): string | null {
  const cat = imagesJson as unknown as Record<string, unknown>;
  const e = cat[name];
  if (!e) return null;
  if (typeof e === "string") return e;
  if (typeof e === "object") {
    const o = e as Record<string, unknown>;
    for (const k of ["file", "path", "src"]) if (typeof o[k] === "string") return o[k] as string;
  }
  return null;
}

/** Display headline style (Bricolage, display optical size, tight tracking). */
export const headline = (size: number, color: string = C.ink, wght = 720, wdth = 100): CSSProperties => ({
  ...display(wght, 96, wdth),
  fontSize: size,
  lineHeight: 1.04,
  letterSpacing: "-0.035em",
  color,
  whiteSpace: "nowrap",
});

/**
 * Masked line: slides up out of its own mask at `at` (s), leaves upward at `out` (s).
 * Padding keeps descenders inside the mask.
 */
export function MaskLine({
  frame,
  at,
  out,
  dur = 0.5,
  outDur = 0.26,
  children,
  style,
}: {
  frame: number;
  at: number;
  out?: number;
  dur?: number;
  outDur?: number;
  children: ReactNode;
  style?: CSSProperties;
}) {
  if (frame < s(at)) return null;
  if (out !== undefined && frame >= s(out + outDur)) return null;
  const inP = tween(frame, at, at + dur, 0, 1, EASE.expoOut);
  const outP = out === undefined ? 0 : tween(frame, out, out + outDur, 0, 1, EASE.expoIn);
  const y = (1 - inP) * 115 - outP * 115;
  return (
    <div style={{ overflow: "hidden", padding: "0.04em 0.06em 0.16em", margin: "-0.04em -0.06em -0.16em", ...style }}>
      <div style={{ transform: `translateY(${y}%)` }}>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Paper

export const PAPER = {
  bg: "linear-gradient(165deg, #efe4d2 0%, #e5d6bf 52%, #d2bf9f 100%)",
  ink: C.onBrand, // leather ink #2b1d15
  muted: "#6e5541",
  faint: "#8f7458",
  rule: "rgba(43,29,21,0.14)",
};

/** Real BIP39 English words (checked against the list), hand-picked: NOT a real or known phrase. */
export const SEED = ["orbit", "velvet", "harbor", "canyon", "mimic", "ladder", "fossil", "quote", "ribbon", "copper", "walnut", "timber"];

/** The paper card inside `paper-plate` (1920×1080) is x 546–1337, y 291–785; we crop just inside its deckle edge. */
export const PAPER_CROP = { x: 552, y: 296, w: 780, h: 484 };
export const SEED_W = PAPER_CROP.w;
export const SEED_H = PAPER_CROP.h;

/** Paper texture: the plate's own card (cropped), or a code gradient if the plate is missing. */
export function PaperFace() {
  const p = plate("paper-plate");
  if (!p) return <div style={{ position: "absolute", inset: 0, background: PAPER.bg, boxShadow: "inset 0 0 90px rgba(110,72,36,0.38)" }} />;
  return <Img src={staticFile(p)} style={{ position: "absolute", left: -PAPER_CROP.x, top: -PAPER_CROP.y, width: 1920, height: 1080, maxWidth: "none" }} />;
}

/**
 * The 12-word recovery card, authored at the plate's card size (780 × 484). `shown` (0..12, fractional) types the
 * words in. `ghost` (0..1) turns it into a pale photocopy; `dim` (0..1) darkens it toward the ground.
 */
export function SeedCard({ shown = 12, ghost = 0, dim = 0, shadow = false, children }: { shown?: number; ghost?: number; dim?: number; shadow?: boolean; children?: ReactNode }) {
  return (
    <div
      style={{
        width: SEED_W,
        height: SEED_H,
        position: "relative",
        borderRadius: 6,
        overflow: "hidden",
        background: "#e3d6c0",
        boxShadow: shadow ? "0 30px 60px rgba(0,0,0,0.6)" : "none",
      }}
    >
      <PaperFace />
      <div style={{ position: "absolute", inset: 0, padding: "30px 46px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `2px solid ${PAPER.rule}`, paddingBottom: 12 }}>
          <span style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 28, color: PAPER.muted, letterSpacing: "-0.01em" }}>Recovery phrase</span>
          <span style={{ fontFamily: F.mono, fontSize: 22, color: PAPER.faint }}>12 words</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", columnGap: 22, marginTop: 6 }}>
          {SEED.map((w, i) => {
            const local = Math.max(0, Math.min(1, shown - i));
            const chars = Math.floor(local * w.length + 0.0001);
            return (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 12, height: 88, borderBottom: i < 9 ? `1.5px solid ${PAPER.rule}` : "none", paddingTop: 28 }}>
                <span style={{ fontFamily: F.mono, fontSize: 20, color: PAPER.faint, width: 26, fontVariantNumeric: "tabular-nums" }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ fontFamily: F.mono, fontWeight: 500, fontSize: 38, color: PAPER.ink, letterSpacing: "-0.01em" }}>{w.slice(0, chars)}</span>
              </div>
            );
          })}
        </div>
      </div>
      {children}
      {ghost > 0 ? <div style={{ position: "absolute", inset: 0, background: `rgba(214,200,178,${0.34 * ghost})` }} /> : null}
      {dim > 0 ? <div style={{ position: "absolute", inset: 0, background: `rgba(16,11,8,${dim})` }} /> : null}
    </div>
  );
}

/** Optional `paper-plate` texture under code-drawn paper (multiplied, so code ink stays crisp). */
export function PaperPlate({ opacity = 0.5 }: { opacity?: number }) {
  const p = plate("paper-plate");
  if (!p) return null;
  return (
    <Img
      src={staticFile(p)}
      style={{ position: "absolute", left: -PAPER_CROP.x, top: -PAPER_CROP.y, width: 1920, height: 1080, maxWidth: "none", opacity, mixBlendMode: "multiply" }}
    />
  );
}

export function PlateImg({ src, style }: { src: string; style?: CSSProperties }) {
  return <Img src={staticFile(src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style }} />;
}

// ---------------------------------------------------------------------------------------------------------------
// The signed transaction slip

export const SLIP_W = 1040;
export const SLIP_H = 440;

// A loose hand signature, authored in slip coordinates (drawn left to right).
export const SCRIBBLE =
  "M84 372 C 96 330, 122 300, 132 318 C 142 340, 108 384, 120 386 C 140 388, 160 322, 176 330 C 190 338, 168 380, 186 378 C 206 376, 214 336, 230 342 C 246 348, 230 382, 250 380 C 276 376, 300 312, 318 326 C 334 340, 300 392, 330 384 C 360 376, 392 344, 440 352 C 470 357, 500 352, 520 346";

/**
 * "Send 0.0123 BTC to bc1q…" + a signature scribble. `typed` (0..1) types the two lines; `sign` (0..1) draws the
 * scribble. Authored at 1040 × 440.
 */
export function TxSlip({ typed = 1, sign = 1, dim = 0, edge }: { typed?: number; sign?: number; dim?: number; edge?: string }) {
  const l1 = "Send 0.0123 BTC";
  const l2 = "to bc1q…";
  const total = l1.length + l2.length;
  const n = Math.floor(typed * total + 0.0001);
  const evo = evolvePath(Math.max(0.0001, sign), SCRIBBLE);
  return (
    <div
      style={{
        width: SLIP_W,
        height: SLIP_H,
        position: "relative",
        borderRadius: 12,
        overflow: "hidden",
        background: PAPER.bg,
        boxShadow: `inset 0 0 70px rgba(110,72,36,0.36), 0 36px 70px rgba(0,0,0,0.55)${edge ? `, 0 0 0 4px ${edge}` : ""}`,
      }}
    >
      <PaperPlate opacity={0.45} />
      <div style={{ position: "absolute", left: 60, right: 60, top: 40, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `2px solid ${PAPER.rule}`, paddingBottom: 16 }}>
        <span style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 30, color: PAPER.muted }}>Signed transaction</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 12, fontFamily: F.sans, fontWeight: 600, fontSize: 28, color: PAPER.muted }}>
          <span style={{ width: 16, height: 16, borderRadius: 99, background: C.btc }} />
          Bitcoin
        </span>
      </div>
      <div style={{ position: "absolute", left: 60, top: 118, fontFamily: F.mono, fontWeight: 600, fontSize: 76, color: PAPER.ink, letterSpacing: "-0.02em", whiteSpace: "pre" }}>
        {l1.slice(0, Math.min(n, l1.length))}
        {n < l1.length && typed > 0 ? <Caret /> : null}
      </div>
      <div style={{ position: "absolute", left: 60, top: 212, fontFamily: F.mono, fontWeight: 500, fontSize: 56, color: PAPER.ink, whiteSpace: "pre" }}>
        {l2.slice(0, Math.max(0, n - l1.length))}
        {n >= l1.length && n < total ? <Caret /> : null}
      </div>
      <div style={{ position: "absolute", left: 600, top: 372, width: 380, borderTop: `2px dashed ${PAPER.rule}` }} />
      <span style={{ position: "absolute", left: 600, top: 384, fontFamily: F.sans, fontSize: 24, color: PAPER.faint }}>Signature</span>
      <svg width={SLIP_W} height={SLIP_H} style={{ position: "absolute", inset: 0 }}>
        {sign > 0 ? (
          <path
            d={SCRIBBLE}
            transform="translate(506 -10) scale(0.9)"
            fill="none"
            stroke={PAPER.ink}
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={evo.strokeDasharray}
            strokeDashoffset={evo.strokeDashoffset}
          />
        ) : null}
      </svg>
      {dim > 0 ? <div style={{ position: "absolute", inset: 0, background: `rgba(23,16,12,${dim})` }} /> : null}
    </div>
  );
}

function Caret() {
  return <span style={{ display: "inline-block", width: "0.08em", height: "0.9em", background: PAPER.ink, marginLeft: 4, verticalAlign: "-0.1em", opacity: 0.8 }} />;
}

// ---------------------------------------------------------------------------------------------------------------
// People

export function AccountChip({ name, size = 44, tone = C.ink, accent, style, children }: { name: string; size?: number; tone?: string; accent?: string; style?: CSSProperties; children?: ReactNode }) {
  const av = size * 1.6;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: size * 0.45, ...style }}>
      <div
        style={{
          width: av,
          height: av,
          borderRadius: 999,
          background: C.surfaceRaised,
          border: `2px solid ${accent ?? C.line}`,
          display: "grid",
          placeItems: "center",
          fontFamily: F.display,
          fontWeight: 700,
          fontSize: size * 0.85,
          color: C.ink,
          flexShrink: 0,
        }}
      >
        {name[0].toUpperCase()}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontFamily: F.mono, fontWeight: 500, fontSize: size, color: tone, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{name}</span>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Odometer chip: "BTC 0.0123" rolls down to "BTC 0.0000".

function RollDigit({ from, to, p, turns, color }: { from: number; to: number; p: number; turns: number; color: string }) {
  // rolls DOWNWARD (values decrease): position goes from `from + 10*turns` to `to`
  const start = from + 10 * turns;
  const pos = start + (to - start) * p; // continuous digit position
  const cells = Array.from({ length: Math.ceil(start) + 2 }, (_, d) => d);
  return (
    <span style={{ display: "inline-block", height: "1.1em", overflow: "hidden", lineHeight: "1.1em", verticalAlign: "bottom" }}>
      <span style={{ display: "block", transform: `translateY(${-pos * 1.1}em)` }}>
        {cells.map((d) => (
          <span key={d} style={{ display: "block", height: "1.1em", color }}>
            {d % 10}
          </span>
        ))}
      </span>
    </span>
  );
}

/** Big balance chip. `roll` 0..1 runs 0.0123 → 0.0000 (right-most digit first). */
export function BalanceChip({ roll, size = 64, color = C.ink, style }: { roll: number; size?: number; color?: string; style?: CSSProperties }) {
  const digits = [1, 2, 3]; // 0.0[1][2][3]
  const stagger = 0.12;
  const span = 1 - stagger * (digits.length - 1);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.32,
        background: C.surfaceRaised,
        borderRadius: size * 0.28,
        padding: `${size * 0.22}px ${size * 0.4}px`,
        fontFamily: F.mono,
        fontWeight: 600,
        fontSize: size,
        lineHeight: "1.1em",
        color,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <span style={{ width: size * 0.32, height: size * 0.32, borderRadius: 99, background: C.btc, flexShrink: 0 }} />
      <span style={{ fontFamily: F.sans, fontWeight: 600 }}>BTC</span>
      <span style={{ display: "inline-flex" }}>
        <span>0.0</span>
        {digits.map((d, i) => {
          const order = digits.length - 1 - i; // right-most first
          const local = Math.max(0, Math.min(1, (roll - order * stagger) / span));
          const eased = EASE.quintOut(local);
          return <RollDigit key={i} from={d} to={0} p={eased} turns={1 + order} color={color} />;
        })}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The photographed slip (`slip-cutout`, 688 × 928, transparent PNG): code text on top, the inked scribble revealed
// left to right by sliding a clean paper patch (taken from the slip's own blank band) off it.

export const PSLIP = { w: 688, h: 928, band: { x: 40, y: 565, w: 610, h: 160 }, cleanY: 250 };

export function PhotoSlip({ typed = 1, sign = 1, dim = 0 }: { typed?: number; sign?: number; dim?: number }) {
  const p = plate("slip-cutout");
  const l1 = "Send 0.0123 BTC";
  const l2 = "to bc1q…";
  const total = l1.length + l2.length;
  const n = Math.floor(typed * total + 0.0001);
  if (!p) {
    // code fallback: the landscape slip, scaled into the same box
    return (
      <div style={{ width: PSLIP.w, height: PSLIP.h, position: "relative", display: "grid", placeItems: "center" }}>
        <div style={{ transform: `scale(${PSLIP.w / SLIP_W})` }}>
          <TxSlip typed={typed} sign={sign} dim={dim} />
        </div>
      </div>
    );
  }
  const B = PSLIP.band;
  return (
    <div style={{ width: PSLIP.w, height: PSLIP.h, position: "relative", filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.55))" }}>
      <Img src={staticFile(p)} style={{ position: "absolute", inset: 0, width: PSLIP.w, height: PSLIP.h }} />
      {sign < 1 ? (
        <div style={{ position: "absolute", left: B.x, top: B.y, width: B.w, height: B.h, overflow: "hidden", clipPath: `inset(0 0 0 ${sign * 100}%)` }}>
          <Img src={staticFile(p)} style={{ position: "absolute", left: -B.x, top: -PSLIP.cleanY, width: PSLIP.w, height: PSLIP.h, maxWidth: "none" }} />
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 58, top: 78, right: 50 }}>
        <div style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 30, color: PAPER.muted, paddingBottom: 14, borderBottom: `2px solid ${PAPER.rule}` }}>Signed transaction</div>
        <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 60, color: PAPER.ink, letterSpacing: "-0.03em", marginTop: 26, whiteSpace: "pre", height: 74 }}>
          {l1.slice(0, Math.min(n, l1.length))}
        </div>
        <div style={{ fontFamily: F.mono, fontWeight: 500, fontSize: 54, color: PAPER.ink, letterSpacing: "-0.02em", whiteSpace: "pre", height: 70, marginTop: 6 }}>
          {l2.slice(0, Math.max(0, n - l1.length))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 22, fontFamily: F.sans, fontWeight: 600, fontSize: 28, color: PAPER.muted, opacity: typed >= 1 ? 1 : 0 }}>
          <span style={{ width: 16, height: 16, borderRadius: 99, background: C.btc }} />
          Bitcoin
        </div>
      </div>
      {dim > 0 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `rgba(16,11,8,${dim})`,
            WebkitMaskImage: `url(${staticFile(p)})`,
            maskImage: `url(${staticFile(p)})`,
            WebkitMaskSize: "100% 100%",
            maskSize: "100% 100%",
          }}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The saddle stitch sewing itself along a path (ownership only). SVG element: place inside an <svg>.


export function SewLine({ d, id, p, dash = [14, 10], width = 4, color = C.brandBright, opacity = 0.9 }: { d: string; id: string; p: number; dash?: [number, number]; width?: number; color?: string; opacity?: number }) {
  if (p <= 0) return null;
  const len = getLength(d);
  const pitch = dash[0] + dash[1];
  const sewn = Math.min(len, Math.ceil((p * len) / pitch) * pitch); // whole stitches: sewn, not drawn
  const reveal = evolvePath(Math.max(0.0001, sewn / len), d);
  const tip = getPointAtLength(d, Math.max(0, Math.min(len, p * len)));
  return (
    <g>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={-4000} y={-4000} width={8000} height={8000}>
          <path d={d} fill="none" stroke="#fff" strokeWidth={width * 4} strokeDasharray={reveal.strokeDasharray} strokeDashoffset={reveal.strokeDashoffset} />
        </mask>
      </defs>
      <path d={d} fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={width} strokeDasharray={dash.join(" ")} strokeLinecap="round" mask={`url(#${id})`} />
      {tip && p < 1 ? <circle cx={tip.x} cy={tip.y} r={width * 1.1} fill={color} /> : null}
    </g>
  );
}
