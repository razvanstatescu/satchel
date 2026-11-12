import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";

/**
 * (e) CSS/canvas "screen" overlay: scanlines, a rolling tracking band, vignette and grain, laid OVER the content.
 * No WebGL context, no filters: gradients plus one small 2D canvas of seeded grain. Cheapest route for (e).
 * Grain is drawn at half resolution (finer grain dies in H.264 anyway) from a xorshift PRNG seeded by the frame.
 */
const xorshift = (seed: number) => {
  let x = seed | 0 || 0x9e3779b9;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
};

export const Grain: React.FC<{ frame: number; amount: number; width: number; height: number; scale?: number; hold?: number }> = ({
  frame,
  amount,
  width,
  height,
  scale = 0.5,
  hold = 1,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const step = Math.floor(frame / hold);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(w, h);
    const rnd = xorshift(0x2545f491 ^ (step * 0x27d4eb2d));
    const d = img.data;
    for (let p = 0; p < d.length; p += 4) {
      const v = (rnd() * 255) | 0;
      d[p] = v;
      d[p + 1] = v;
      d[p + 2] = v;
      d[p + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [step, w, h]);
  return (
    <canvas
      ref={ref}
      width={w}
      height={h}
      style={{ position: "absolute", inset: 0, width, height, mixBlendMode: "overlay", opacity: amount, pointerEvents: "none" }}
    />
  );
};

export const ScreenOverlay: React.FC<{ intensity: number; frame: number; width: number; height: number; gap?: number }> = ({
  intensity: i,
  frame,
  width,
  height,
  gap = 4,
}) => {
  const k = height / 1080;
  const line = Math.max(1, Math.round((gap * k) / 2));
  const rollY = ((frame * 16 * k) % (height * 1.5)) - height * 0.25;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: `repeating-linear-gradient(to bottom, rgba(0,0,0,${0.1 + 0.4 * i}) 0px, rgba(0,0,0,${0.1 + 0.4 * i}) ${line}px, rgba(0,0,0,0) ${line}px, rgba(0,0,0,0) ${line * 2}px)`,
          mixBlendMode: "multiply",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: rollY - 90 * k,
          height: 180 * k,
          background: `linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,${0.09 * i}), rgba(255,255,255,0))`,
        }}
      />
      <Grain frame={frame} amount={0.08 + 0.35 * i} width={width} height={height} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,${0.2 + 0.4 * i}) 100%)` }} />
    </AbsoluteFill>
  );
};
