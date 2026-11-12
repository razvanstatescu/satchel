import React, { useId } from "react";
import { AbsoluteFill } from "remotion";
import { intSeed } from "../lib/seed";

/**
 * SVG-filter route (CPU-rasterised by Chrome). Same intensity contract as the GL looks, for comparison and for places
 * where a WebGL context is unwanted. Measured cost: see tech.md (it is the slow route at 1080p).
 *
 * Rules baked in:
 *  - a unique filter id per instance (useId, sanitised: React ids contain characters that break url(#…));
 *  - color-interpolation-filters="sRGB" (the default linearRGB darkens mid-tones and shifts colours);
 *  - the filter region is padded so displaced pixels are not clipped at the element box;
 *  - feTurbulence has no "evolution": animate by scrolling it (feOffset) or by a stepped seed (boil).
 */
export const useFilterId = (name: string) => `${name}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

export type SvgFxProps = {
  /** 0..1 */
  intensity: number;
  frame: number;
  children: React.ReactNode;
  /** px at 1080p are scaled by k = composition height / 1080 */
  k?: number;
  seed?: string;
};

const Defs: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
    <defs>{children}</defs>
  </svg>
);

/** (b) Turbulent displace: fractal noise → displacement. Boils with a 2-frame stepped seed, scrolls with the frame. */
export const SvgWarp: React.FC<SvgFxProps> = ({ intensity: i, frame, children, k = 1, seed = "warp" }) => {
  const id = useFilterId("warp");
  const scale = 300 * i * i * k; // feDisplacementMap: offset = scale * (C - 0.5), so ±150 px at i = 1
  return (
    <AbsoluteFill>
      <Defs>
        <filter id={id} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency={0.0042 / k} numOctaves={2} seed={intSeed(seed, frame, 2) % 1000} result="n" />
          <feOffset in="n" dx={frame * 3 * k} dy={0} result="n2" />
          <feDisplacementMap in="SourceGraphic" in2="n2" scale={scale} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </Defs>
      <AbsoluteFill style={{ filter: i > 0 ? `url(#${id})` : undefined }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** (a) VHS line wave: noise that varies only along y (baseFrequency x = 0), scrolled down, displaces x only. */
export const SvgWave: React.FC<SvgFxProps> = ({ intensity: i, frame, children, k = 1, seed = "wave" }) => {
  const id = useFilterId("wave");
  const amp = 48 * i * k; // ±24 px
  return (
    <AbsoluteFill>
      <Defs>
        <filter id={id} x="-5%" y="0%" width="110%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="turbulence" baseFrequency={`0 ${0.006 / k}`} numOctaves={2} seed={intSeed(seed) % 1000} result="n" />
          <feOffset in="n" dx={0} dy={frame * 7 * k} result="n2" />
          {/* y channel pinned to 0.5 = no vertical displacement */}
          <feColorMatrix in="n2" type="matrix" values="1 0 0 0 0  0 0 0 0 0.5  0 0 0 0 0  0 0 0 0 1" result="m" />
          <feDisplacementMap in="SourceGraphic" in2="m" scale={amp} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </Defs>
      <AbsoluteFill style={{ filter: i > 0 ? `url(#${id})` : undefined }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** (c) RGB split: isolate channels with feColorMatrix, offset R and B in opposite directions, screen them back. */
export const SvgRgbSplit: React.FC<SvgFxProps & { angle?: number }> = ({ intensity: i, children, k = 1, angle = 0 }) => {
  const id = useFilterId("rgb");
  const a = 20 * Math.pow(i, 1.6) * k; // same ceiling as rgbLook()
  const dx = a * Math.cos(angle);
  const dy = a * Math.sin(angle);
  return (
    <AbsoluteFill>
      <Defs>
        <filter id={id} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feOffset in="r" dx={dx} dy={dy} result="r2" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
          <feOffset in="b" dx={-dx} dy={-dy} result="b2" />
          <feBlend in="r2" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="b2" mode="screen" />
        </filter>
      </Defs>
      <AbsoluteFill style={{ filter: i > 0 ? `url(#${id})` : undefined }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** (g) Directional blur for whips: a one-axis Gaussian (stdDeviation "x 0"). sigma ≈ 0.35 × px per frame. */
export const SvgDirBlur: React.FC<{ vx: number; vy?: number; children: React.ReactNode }> = ({ vx, vy = 0, children }) => {
  const id = useFilterId("dirblur");
  const sx = Math.abs(vx) * 0.35;
  const sy = Math.abs(vy) * 0.35;
  return (
    <AbsoluteFill>
      <Defs>
        <filter id={id} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={`${sx} ${sy}`} />
        </filter>
      </Defs>
      <AbsoluteFill style={{ filter: sx + sy > 0.3 ? `url(#${id})` : undefined }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** The three distortions chained in ONE filter (wave → warp → split), for the cost benchmark. */
export const SvgCombo: React.FC<SvgFxProps> = ({ intensity: i, frame, children, k = 1, seed = "combo" }) => {
  const id = useFilterId("combo");
  const a = 20 * Math.pow(i, 1.6) * k;
  return (
    <AbsoluteFill>
      <Defs>
        <filter id={id} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence type="turbulence" baseFrequency={`0 ${0.006 / k}`} numOctaves={2} seed={3} result="wn" />
          <feOffset in="wn" dy={frame * 7 * k} result="wn2" />
          <feColorMatrix in="wn2" type="matrix" values="1 0 0 0 0  0 0 0 0 0.5  0 0 0 0 0  0 0 0 0 1" result="wm" />
          <feDisplacementMap in="SourceGraphic" in2="wm" scale={48 * i * k} xChannelSelector="R" yChannelSelector="G" result="w" />
          <feTurbulence type="fractalNoise" baseFrequency={0.0042 / k} numOctaves={2} seed={intSeed(seed, frame, 2) % 1000} result="tn" />
          <feDisplacementMap in="w" in2="tn" scale={300 * i * i * k} xChannelSelector="R" yChannelSelector="G" result="t" />
          <feColorMatrix in="t" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feOffset in="r" dx={a} result="r2" />
          <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
          <feOffset in="b" dx={-a} result="b2" />
          <feBlend in="r2" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="b2" mode="screen" />
        </filter>
      </Defs>
      <AbsoluteFill style={{ filter: `url(#${id})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
