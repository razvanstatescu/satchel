import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Img, interpolate, staticFile } from "remotion";
import { noise2D } from "@remotion/noise";
import imagesJson from "../../data/images.json";
import { C, display } from "../../brand/tokens";
import { BEAT, getScene } from "../../lib/timeline";
import { EASE, FPS, W } from "../../lib/time";

const clampX = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Tween in SECONDS (fractional, not frame-rounded) for smooth sub-frame motion. */
export function tw(t: number, a: number, b: number, from = 0, to = 1, easing = EASE.expoOut) {
  if (b <= a) return t >= a ? to : from;
  return interpolate(t, [a, b], [from, to], { ...clampX, easing });
}

const snapDown = (t: number) => Math.floor(t / BEAT + 1e-6) * BEAT;
const snapNear = (t: number) => Math.round(t / BEAT) * BEAT;

/**
 * Every S07 cue, in seconds relative to the scene start, derived from the VO word timings (so a new timeline.json
 * re-times the scene). Cuts snap to the beat grid.
 */
export function cues() {
  const sc = getScene("S07");
  const L = (id: string) => sc.line(id);
  const clean = (x: string) => x.toLowerCase().replace(/[^a-z0-9#']/g, "");
  /**
   * Time of a word (relative to the scene) by prefix. `nth` picks the first or the last match (L12 says "signs" twice).
   * If the transcript tokenises differently and the word isn't found, fall back to `frac` of the way through the line.
   */
  const w = (id: string, prefix: string, frac: number, which: "start" | "end" = "start", nth: "first" | "last" = "first") => {
    const l = L(id);
    const hits = l.words.filter((x) => clean(x.text).startsWith(clean(prefix)));
    const hit = nth === "first" ? hits[0] : hits[hits.length - 1];
    return hit ? l.start + hit[which] : l.start + l.duration * frac;
  };

  // A · L12 "Satchel signs only plain transfers it can read, and records each one before NEAR's signer network signs it."
  //   A1 "Plain transfers only.": two non-plain requests bounce off the contract, a plain transfer passes
  //   A2 "Recorded before it's signed.": the camera follows it down into the ledger; record FIRST, then the signature
  const aHead = Math.max(0.05, L("L12").start - 0.25);
  const aHit1 = Math.max(aHead + 0.9, w("L12", "only", 0.12)); // raw hash bounces
  const aHit2 = Math.max(aHit1 + 0.62, w("L12", "transfers", 0.22)); // token approval bounces
  const aPass = Math.max(aHit2 + 0.75, w("L12", "read", 0.38)); // the plain transfer is read: ✓
  const aDrop = aPass + 0.28; // the gate opens, the camera follows it down into the ledger
  const aWrite = Math.max(aDrop + 0.7, w("L12", "records", 0.5));
  const aWriteEnd = Math.max(aWrite + 0.9, w("L12", "one", 0.6, "end"));
  const aSign = Math.max(aWriteEnd + 0.25, w("L12", "NEAR", 0.72));
  const aSigned = Math.max(aSign + 0.6, w("L12", "signs", 0.9, "start", "last"));
  const cutB = snapDown(Math.max(L("L13").start - 0.1, aSigned + 0.8));

  // B · L13 "Listed. Signing paused."
  const bList = Math.max(cutB + 0.35, w("L13", "List", 0));
  const bPause = Math.max(bList + 0.6, w("L13", "signing", 0.25));
  const bLock = Math.max(bPause + 0.6, w("L13", "stops", 0.8));
  const cutC = snapDown(Math.max(L("L14").start - 0.1, bLock + 0.9));

  // C · L14–L15 "Checked in your browser." → "Clean history."
  const cPunch = Math.min(Math.max(w("L14", "browser", 0.35, "end"), cutC + 1.1), cutC + 2.0);
  const cScan = Math.max(cPunch + 0.8, w("L14", "against", 0.7));
  const cR1 = w("L15", "nonce", 0);
  const cR2 = Math.max(cR1 + 0.4, w("L15", "coin", 0.36));
  const cR3 = Math.max(cR2 + 0.4, w("L15", "blockhash", 0.7));
  const cVerdict = Math.max(cR3 + 0.5, w("L15", "expired", 0.85));
  const cBuy = cVerdict + 0.5;
  const cutD = snapNear(Math.max(cVerdict + 1.65, L("L16").start));

  // D · L16 "Anything live? Buy stays locked."
  const dUnused = Math.max(cutD + 0.6, w("L16", "still", 0.38));
  const dVerdict = dUnused + 0.35;
  const dBuy = Math.max(dVerdict + 0.5, w("L16", "Buy", 0.72));
  const cutE = snapNear(Math.max(dBuy + 1.6, L("L17").start));

  // E · L17 "And the contract has no admin key. Not even ours." → "No admin key. Not even ours."
  const eNo = Math.max(cutE + 0.9, w("L17", "no", 0.4));
  const eNot = Math.max(eNo + 0.6, w("L17", "not", 0.7));
  const eTilt = Math.max(cutE + 0.35, Math.min(cutE + 0.7, eNo - 0.9));
  const end = sc.duration;
  return { sc, aHead, aHit1, aHit2, aPass, aDrop, aWrite, aWriteEnd, aSign, aSigned, cutB, bList, bPause, bLock, cutC, cPunch, cScan, cR1, cR2, cR3, cVerdict, cBuy, cutD, dUnused, dVerdict, dBuy, cutE, eTilt, eNo, eNot, end };
}
export type Cues = ReturnType<typeof cues>;

/** Image plate from the catalog (src/data/images.json), or null when it hasn't been generated yet. */
export function plate(key: string): string | null {
  const cat = imagesJson as unknown as Record<string, unknown>;
  const v = cat[key];
  if (!v) return null;
  const file = typeof v === "string" ? v : ((v as Record<string, unknown>).file ?? (v as Record<string, unknown>).src ?? (v as Record<string, unknown>).path);
  if (typeof file !== "string") return null;
  return file.startsWith("images/") || file.startsWith("/") ? file.replace(/^\//, "") : `images/${file}`;
}

export function Plate({ name, opacity = 0.3, style }: { name: string; opacity?: number; style?: CSSProperties }) {
  const src = plate(name);
  if (!src || opacity <= 0) return null;
  return <Img src={staticFile(src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity, ...style }} />;
}

/** Warm ground: Night ground plus a soft key light from the upper left (code fallback for plates). */
export function WarmGround({ children }: { children?: ReactNode }) {
  return (
    <AbsoluteFill style={{ background: C.ground }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 60% at 22% 18%, rgba(106,71,48,0.32), rgba(23,16,12,0) 70%)" }} />
      {children}
    </AbsoluteFill>
  );
}

type Dir = "left" | "right" | "up" | "down" | "zoom" | "none";

/**
 * A shot between two cuts with hypermotion edges: whips in after `inT` and out before `outT`, with a cheap
 * directional blur (SVG feGaussianBlur on the motion axis) only during the move. Camera drift via noise.
 */
export function Shot({ id, t, inT, outT, inDir = "left", outDir = "left", children, drift = 1 }: { id: string; t: number; inT: number; outT: number; inDir?: Dir; outDir?: Dir; children: ReactNode; drift?: number }) {
  if (t < inT - 1e-6 || t >= outT) return null;
  const IN = 0.3;
  const OUT = 0.17;
  const pin = tw(t, inT, inT + IN, 0, 1, EASE.expoOut); // 0 → arriving, 1 → landed
  const pout = tw(t, outT - OUT, outT, 0, 1, EASE.expoIn); // 0 → resting, 1 → gone
  let x = 0;
  let y = 0;
  let sc = 1;
  let blurX = 0;
  let blurY = 0;
  let op = 1;
  const vin = 1 - pin; // remaining distance
  const vel = (p: number, a: number, b: number, easeIn: boolean) => {
    // approximate speed (0..1) of an expo move at progress p
    void a;
    void b;
    return easeIn ? p : 1 - p;
  };
  if (inDir === "left") { x += vin * W * 0.55; blurX += vel(pin, 0, 1, false) * 40; }
  if (inDir === "right") { x -= vin * W * 0.55; blurX += vel(pin, 0, 1, false) * 40; }
  if (inDir === "up") { y += vin * 700; blurY += vel(pin, 0, 1, false) * 36; }
  if (inDir === "down") { y -= vin * 700; blurY += vel(pin, 0, 1, false) * 36; }
  if (inDir === "zoom") { sc *= 1 + vin * 0.18; op *= interpolate(pin, [0, 0.35], [0, 1], clampX); }
  if (outDir === "left") { x -= pout * W * 0.7; blurX += pout * 44; }
  if (outDir === "right") { x += pout * W * 0.7; blurX += pout * 44; }
  if (outDir === "up") { y -= pout * 800; blurY += pout * 40; }
  if (outDir === "down") { y += pout * 800; blurY += pout * 40; }
  if (outDir === "zoom") { sc *= 1 + pout * 0.9; op *= 1 - pout; }
  if (inT <= 0.01 && inDir !== "none") { /* scene's first shot: the move still plays from frame 0 */ }
  // camera drift (subpixel, slow)
  const dx = noise2D(`${id}-dx`, t * 0.18, 0) * 7 * drift;
  const dy = noise2D(`${id}-dy`, 0, t * 0.18) * 5 * drift;
  const bx = Math.round(blurX * 10) / 10;
  const by = Math.round(blurY * 10) / 10;
  const fid = `s07blur-${id}`;
  const blurring = bx > 0.3 || by > 0.3;
  return (
    <AbsoluteFill style={{ opacity: op }}>
      {blurring ? (
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter id={fid} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${bx} ${by}`} />
          </filter>
        </svg>
      ) : null}
      <AbsoluteFill style={{ transform: `translate(${x + dx}px, ${y + dy}px) scale(${sc})`, filter: blurring ? `url(#${fid})` : undefined }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
}

/**
 * Kinetic headline: each line rises out of its own mask (T07), words staggered by ~2 frames, while Bricolage's
 * weight and width settle (wght 800 → 680, wdth 82 → 100). `outAt` sends the lines up and out (expoIn).
 */
export function Headline({
  lines,
  t,
  at,
  outAt,
  size = 120,
  color = C.ink,
  style,
  align = "left",
  lineHeight = 1.02,
  accentLast,
}: {
  lines: string[];
  t: number;
  at: number;
  outAt?: number;
  size?: number;
  color?: string;
  style?: CSSProperties;
  align?: "left" | "center";
  lineHeight?: number;
  /** colour for the last line (e.g. a state colour), optional */
  accentLast?: string;
}) {
  const settle = tw(t, at, at + 0.7, 0, 1, EASE.quintOut);
  const wght = interpolate(settle, [0, 1], [800, 680]);
  const wdth = interpolate(settle, [0, 1], [84, 100]);
  let wi = 0;
  return (
    <div style={{ ...display(680, 96, 100), fontVariationSettings: `"wght" ${wght.toFixed(0)}, "opsz" 96, "wdth" ${wdth.toFixed(1)}`, fontSize: size, lineHeight, letterSpacing: "-0.025em", color, textAlign: align, ...style }}>
      {lines.map((line, li) => (
        <div key={li} style={{ overflow: "hidden", paddingBottom: "0.1em", marginBottom: "-0.1em", whiteSpace: "nowrap" }}>
          {line.split(" ").map((word, i) => {
            const k = wi++;
            const a = at + k * (2 / FPS);
            const pin = tw(t, a, a + 0.55, 0, 1, EASE.expoOut);
            const pout = outAt === undefined ? 0 : tw(t, outAt + li * 0.03, outAt + li * 0.03 + 0.22, 0, 1, EASE.expoIn);
            const yy = (1 - pin) * 112 - pout * 112;
            return (
              <span key={i} style={{ display: "inline-block", transform: `translateY(${yy}%)`, color: li === lines.length - 1 && accentLast ? accentLast : undefined, whiteSpace: "pre" }}>
                {word}
                {i < line.split(" ").length - 1 ? " " : ""}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** A smooth 0..1 pulse (the product's 1.2 s `pulse` keyframe). */
export const pulseAt = (t: number) => 0.55 + 0.45 * Math.cos((t / 1.2) * Math.PI * 2);
