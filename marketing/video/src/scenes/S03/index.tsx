import type { ReactNode } from "react";
import { AbsoluteFill, Img, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import { C } from "../../brand/tokens";
import { EASE, s, SPRING, springAt, tween } from "../../lib/time";
import { PAPER_CROP, plate, SEED_H, SEED_W, SeedCard } from "./kit";

/**
 * S03 is no longer a timeline scene (v2): its hero move opens S04 ("There's no seed phrase to copy").
 * `SeedCopies` is that move, timed entirely by props (seconds, relative to the host scene's start):
 * the recovery card on the leather desk → a photocopier lamp sweeps it → a ghost lifts off → the ghosts multiply
 * (each copy splits from a copy: 1 → 2 → 4 → 8 …) into a receding tunnel with echo trails while the desk falls away.
 * It draws no text; the host scene owns the words.
 */

export type SeedTiming = {
  /** camera punch-out onto the desk runs from 0 to `open` */
  open: number;
  /** the 12 words type in from `typeIn` over `typeDur` (typeDur 0 = already written) */
  typeIn: number;
  typeDur: number;
  /** the lamp sweeps from `scan` to `scanEnd`; the first ghost lifts with it */
  scan: number;
  scanEnd: number;
  /** the copies burst out from `burst` over `burstDur` */
  burst: number;
  burstDur: number;
  /** the camera pulls back (to make room for the host's line) around `recede` */
  recede: number;
};

/** 0..1: how far the camera has pulled back (the host uses it for its scrim). */
export const seedRecede = (frame: number, T: SeedTiming) => tween(frame, T.recede - 0.2, T.recede + 0.6, 0, 1, EASE.expoOut);

/** Bottom scrim under the host's line (draw it outside any burn filter). */
export const SEED_SCRIM = "linear-gradient(to top, rgba(23,16,12,0.95) 0%, rgba(23,16,12,0.8) 22%, rgba(23,16,12,0) 48%)";

const N = 18; // ghost copies
const CX = PAPER_CROP.x + SEED_W / 2; // card centre in plate/screen space
const CY = PAPER_CROP.y + SEED_H / 2;

type P3 = { x: number; y: number; z: number; r: number };

const TARGET: P3[] = Array.from({ length: N + 1 }, (_, i) => {
  if (i === 0) return { x: 0, y: 0, z: 0, r: 0 };
  const a = i * 2.39996 + 0.9; // golden angle: an even, organic spread
  return {
    x: Math.cos(a) * (700 + 62 * i),
    y: Math.sin(a) * (380 + 30 * i),
    z: -140 - 150 * i,
    r: (random(`s03-rot-${i}`) - 0.5) * 16,
  };
});
const parent = (i: number) => (i <= 1 ? 0 : Math.floor(i / 2));

/** The seed-phrase card and its multiplying copies. `ground` paints the Night ground behind it (off when filtered). */
export function SeedCopies({ T, ground = true }: { T: SeedTiming; ground?: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const paperPlate = plate("paper-plate");

  // camera: opens on a punch-out onto the desk, slow push, then pulls back when the host's line lands
  const open = tween(frame, 0, T.open, 0, 1, EASE.expoOut);
  const pushIn = tween(frame, T.open, T.scan + 0.4, 0, 1, EASE.standard);
  const recede = seedRecede(frame, T);
  const cam = (1.42 - 0.24 * open + 0.05 * pushIn) * (1 - 0.34 * recede);
  const camY = -70 * recede + noise2D("s03-cam", t * 0.2, 0) * 4;
  const camX = noise2D("s03-cam-x", 0, t * 0.2) * 4;

  // the desk falls away to dark as the copies multiply
  const deskFade = tween(frame, T.burst - 0.1, T.burst + 0.6, 0, 1, EASE.standard);
  const worldTilt = tween(frame, T.burst, T.burst + T.burstDur + 0.8, 0, 1, EASE.standard);

  const scanP = tween(frame, T.scan, T.scanEnd, 0, 1, EASE.expoInOut);
  const scanOn = frame >= s(T.scan) && frame < s(T.scanEnd + 0.1);
  const shown = T.typeDur <= 0 ? 12 : tween(frame, T.typeIn, T.typeIn + T.typeDur, 0, 12, (x) => x);

  const spawn = (i: number) => (i === 1 ? T.scanEnd - 0.04 : T.burst + T.burstDur * Math.pow((i - 2) / (N - 2), 0.72));
  const posAt = (i: number, f: number): P3 & { p: number } => {
    if (i === 0) return { ...TARGET[0], p: 1 };
    const p = springAt(f, fps, spawn(i), SPRING.lift);
    const o = i === 1 ? { x: 30, y: -20, z: 110, r: -1.5 } : TARGET[parent(i)];
    const d = TARGET[i];
    const lerp = (a: number, b: number) => a + (b - a) * p;
    const drift = -70 * Math.max(0, f / fps - spawn(i) - 0.3); // keeps receding slowly through the hold
    return { x: lerp(o.x, d.x), y: lerp(o.y, d.y), z: lerp(o.z, d.z) + Math.sin(Math.min(1, p) * Math.PI) * 140 + drift, r: lerp(o.r, d.r), p };
  };

  const ghosts: { key: string; pos: P3; opacity: number; dim: number; clip?: number }[] = [];
  for (let i = N; i >= 1; i--) {
    const baseOpacity = 0.8 - 0.026 * i;
    const dim = Math.min(0.55, 0.03 * i) + 0.28 * recede;
    if (frame < s(spawn(i))) {
      if (i === 1 && scanOn && scanP > 0) {
        // the ghost lifting off the paper as the lamp passes over it
        const lift = tween(frame, T.scan, T.scanEnd, 0, 1, EASE.standard);
        ghosts.push({ key: "c1", pos: { x: 30 * lift, y: -20 * lift, z: 110 * lift, r: -1.5 * lift }, opacity: 0.55, dim: 0, clip: scanP });
      }
      continue;
    }
    const cur = posAt(i, frame);
    if (cur.p < 0.97) {
      for (const lag of [2, 4]) {
        const e = posAt(i, frame - lag);
        if (e.p <= 0.02) continue;
        ghosts.push({ key: `c${i}-e${lag}`, pos: e, opacity: baseOpacity * (lag === 2 ? 0.3 : 0.13), dim });
      }
    }
    ghosts.push({ key: `c${i}`, pos: cur, opacity: baseOpacity * Math.min(1, cur.p * 4), dim });
  }

  return (
    <AbsoluteFill style={{ background: ground ? C.ground : undefined }}>
      <AbsoluteFill style={{ transform: `translate(${camX}px, ${camY}px) scale(${cam})`, transformOrigin: `${CX}px ${CY}px` }}>
        {/* the desk */}
        {paperPlate && deskFade < 1 ? (
          <Img
            src={staticFile(paperPlate)}
            style={{
              position: "absolute",
              inset: 0,
              width: 1920,
              height: 1080,
              opacity: 1 - deskFade,
              WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 49% 50%, #000 60%, transparent 100%)",
              maskImage: "radial-gradient(ellipse 70% 70% at 49% 50%, #000 60%, transparent 100%)",
            }}
          />
        ) : null}

        {/* the copies and the original, in one 3D space anchored on the card */}
        <AbsoluteFill style={{ perspective: 1800, perspectiveOrigin: `${CX}px ${CY}px` }}>
          <div
            style={{
              position: "absolute",
              left: CX,
              top: CY,
              width: 0,
              height: 0,
              transformStyle: "preserve-3d",
              transform: `rotateX(${7 * worldTilt}deg) rotateY(${-10 * worldTilt}deg)`,
            }}
          >
            {ghosts
              .filter((g) => g.pos.z < 0)
              .sort((a, b) => a.pos.z - b.pos.z)
              .map((g) => (
                <Placed key={g.key} pos={g.pos} opacity={g.opacity}>
                  <SeedCard ghost={1} dim={g.dim} />
                </Placed>
              ))}
            <Placed pos={TARGET[0]} opacity={1}>
              <SeedCard shown={shown} dim={0.22 * recede} shadow={deskFade > 0}>
                {scanOn ? <Lamp p={scanP} /> : null}
              </SeedCard>
            </Placed>
            {ghosts
              .filter((g) => g.pos.z >= 0)
              .map((g) => (
                <Placed key={g.key} pos={g.pos} opacity={g.opacity} clip={g.clip}>
                  <SeedCard ghost={1} dim={g.dim} />
                </Placed>
              ))}
            {scanOn ? <LampSpill p={scanP} /> : null}
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Placed({ pos, opacity, clip, children }: { pos: P3; opacity: number; clip?: number; children: ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        left: -SEED_W / 2,
        top: -SEED_H / 2,
        width: SEED_W,
        height: SEED_H,
        opacity,
        transform: `translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px) rotateZ(${pos.r}deg)`,
        clipPath: clip !== undefined ? `inset(0 0 ${(1 - clip) * 100}% 0)` : undefined,
      }}
    >
      {children}
    </div>
  );
}

/** Photocopier lamp: a soft warm band with a defined core, sweeping the paper top to bottom. */
function Lamp({ p }: { p: number }) {
  const y = -70 + p * (SEED_H + 140);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: y - 80,
        height: 160,
        background:
          "linear-gradient(to bottom, rgba(255,246,224,0) 0%, rgba(255,246,224,0.3) 38%, rgba(255,251,240,0.92) 50%, rgba(255,246,224,0.3) 62%, rgba(255,246,224,0) 100%)",
        mixBlendMode: "screen",
      }}
    />
  );
}

/** The lamp bar's spill on the desk beyond the paper edges. */
function LampSpill({ p }: { p: number }) {
  const y = -SEED_H / 2 - 70 + p * (SEED_H + 140);
  const fade = Math.min(1, p * 6, (1 - p) * 6);
  return (
    <div style={{ position: "absolute", left: -SEED_W / 2 - 110, top: y - 3, width: SEED_W + 220, height: 6, transform: "translateZ(1px)", opacity: fade }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 6, background: "linear-gradient(to right, rgba(255,240,210,0), rgba(255,244,222,0.85) 14%, rgba(255,244,222,0.85) 86%, rgba(255,240,210,0))" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: -70, height: 146, background: "radial-gradient(ellipse 55% 50% at 50% 50%, rgba(255,232,190,0.22), rgba(255,232,190,0) 70%)" }} />
    </div>
  );
}
