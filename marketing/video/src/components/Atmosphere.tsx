import type { ReactNode } from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { C } from "../brand/tokens";

/** Night ground with an optional texture plate (graded down so UI stays legible). */
export function Ground({ texture, textureOpacity = 0.35, children }: { texture?: string; textureOpacity?: number; children?: ReactNode }) {
  return (
    <AbsoluteFill style={{ background: C.ground }}>
      {texture ? (
        <Img src={staticFile(texture)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: textureOpacity, mixBlendMode: "luminosity" }} />
      ) : null}
      {children}
    </AbsoluteFill>
  );
}

/** Soft vignette: pulls the eye to centre, hides plate edges. */
export function Vignette({ strength = 0.7 }: { strength?: number }) {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background: `radial-gradient(ellipse 75% 70% at 50% 48%, rgba(0,0,0,0) 55%, rgba(8,5,3,${strength}) 100%)`,
      }}
    />
  );
}

/** Animated film grain (SVG turbulence, reseeded every 2 frames). Cheap and deterministic. */
export function Grain({ opacity = 0.07 }: { opacity?: number }) {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2) % 97;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity }}>
      <svg width="100%" height="100%">
        <filter id={`grain-${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
      </svg>
    </AbsoluteFill>
  );
}

/** Finish applied over every scene. */
export function Finish({ grain = 0.07, vignette = 0.7 }: { grain?: number; vignette?: number }) {
  return (
    <>
      <Vignette strength={vignette} />
      <Grain opacity={grain} />
    </>
  );
}
