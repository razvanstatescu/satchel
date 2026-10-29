/**
 * BrowserFrame — a minimal Night browser chrome for showing REAL product screenshots ("this is the real app").
 *
 * API (pure):
 *   <BrowserFrame src="ui/desktop/contract@2x.png" width={1200} title="Contract facts · Satchel" path="/contract"
 *                 crop={{ x: 0, y: 0, w: 1, h: 0.8 }} tilt={{ rx, ry, rz }} perspective? shadow? style? />
 *     - `src`: a path under public/ (passed to staticFile) — or pass `children` instead of src for live DOM.
 *     - `crop` (fractions of the image, default whole image): shows only that window of the screenshot, so you can
 *       hide the fixture persona pill or zoom into one region. The frame's height follows the crop's aspect
 *       (`aspect` = image width / height, default 1.6 for the 2880×1800 desktop captures).
 *     - `zoom` (≥ 1) + `focus` ({x, y} 0..1 inside the crop): a camera push inside the frame.
 *     - `tilt` (degrees) applies a 3D rotate on the whole frame with `perspective` (default 2200 px).
 *     - Chrome: three muted dots, a tab title (product title format "{page} · Satchel"), a path pill. No domain is
 *       shown (the public URL is not final).
 */
import type { CSSProperties, ReactNode } from "react";
import { Img, staticFile } from "remotion";
import { Lock } from "lucide-react";
import { C, F } from "../../brand/tokens";
import { STROKE } from "./base";

export function BrowserFrame({
  src,
  children,
  width,
  aspect = 1.6,
  crop = { x: 0, y: 0, w: 1, h: 1 },
  zoom = 1,
  focus = { x: 0.5, y: 0.5 },
  title = "Satchel",
  path,
  tilt,
  perspective = 2200,
  shadow = true,
  style,
}: {
  src?: string;
  children?: ReactNode;
  width: number;
  aspect?: number;
  crop?: { x: number; y: number; w: number; h: number };
  zoom?: number;
  focus?: { x: number; y: number };
  title?: string;
  path?: string;
  tilt?: { rx?: number; ry?: number; rz?: number };
  perspective?: number;
  shadow?: boolean;
  style?: CSSProperties;
}) {
  const bar = Math.round(width * 0.034); // chrome height scales with the frame
  const viewH = (width / aspect) * (crop.h / crop.w);
  const imgW = width / crop.w;
  const imgH = imgW / aspect;
  // zoom about the focus point inside the visible window
  const fx = focus.x * width;
  const fy = focus.y * viewH;
  const t = tilt ? `perspective(${perspective}px) rotateX(${tilt.rx ?? 0}deg) rotateY(${tilt.ry ?? 0}deg) rotateZ(${tilt.rz ?? 0}deg)` : undefined;
  const dot = (i: number) => <span key={i} style={{ width: bar * 0.28, height: bar * 0.28, borderRadius: 99, background: C.line }} />;
  return (
    <div
      style={{
        width,
        borderRadius: bar * 0.45,
        overflow: "hidden",
        background: C.surface,
        border: `1px solid ${C.line}`,
        boxShadow: shadow ? "0 40px 90px rgba(0,0,0,0.6), inset 0 1px 0 rgba(235,203,122,0.08)" : undefined,
        transform: t,
        transformStyle: "preserve-3d",
        ...style,
      }}
    >
      <div style={{ height: bar, display: "flex", alignItems: "center", gap: bar * 0.3, padding: `0 ${bar * 0.5}px`, background: "#1d1510", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", gap: bar * 0.22 }}>{[0, 1, 2].map(dot)}</div>
        <div
          style={{
            marginLeft: bar * 0.4,
            height: bar * 0.62,
            padding: `0 ${bar * 0.4}px`,
            borderRadius: bar * 0.18,
            background: C.surface,
            display: "flex",
            alignItems: "center",
            fontFamily: F.sans,
            fontSize: bar * 0.36,
            color: C.ink,
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
        {path ? (
          <div
            style={{
              flex: 1,
              marginLeft: bar * 0.3,
              height: bar * 0.6,
              borderRadius: 99,
              background: C.ground,
              display: "flex",
              alignItems: "center",
              gap: bar * 0.2,
              padding: `0 ${bar * 0.4}px`,
              fontFamily: F.mono,
              fontSize: bar * 0.32,
              color: C.inkMuted,
              whiteSpace: "nowrap",
            }}
          >
            <Lock size={bar * 0.32} strokeWidth={STROKE} />
            {path}
          </div>
        ) : null}
      </div>
      <div style={{ position: "relative", width, height: viewH, overflow: "hidden", background: C.ground }}>
        <div style={{ position: "absolute", inset: 0, transform: `translate(${fx}px, ${fy}px) scale(${zoom}) translate(${-fx}px, ${-fy}px)` }}>
          {src ? (
            <Img src={staticFile(src)} style={{ position: "absolute", width: imgW, height: imgH, left: -crop.x * imgW, top: -crop.y * imgH }} />
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
