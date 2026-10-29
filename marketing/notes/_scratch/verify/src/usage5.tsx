// usage.tsx (H): lockup reveal — MarkBuild, then the wordmark slides out from behind the tile
import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { clamp, EASE2 } from "./brand2/motion";
import { MarkBuild } from "./brand2/StickerS";

// Uses satchel-lockup-on-light.svg itself (viewBox 2220 × 512, tile = first 512 units), so the end frame is the
// lockup exactly. Copy brand-v2/logo/*.svg to video/public/v2/logo/ first. Start the wordmark ~f36 of MarkBuild.
export const LockupReveal: React.FC<{ height: number; wordAt: number }> = ({ height, wordAt }) => {
  const frame = useCurrentFrame();
  const width = height * (2220 / 512);
  const p = interpolate(frame, [wordAt, wordAt + 12], [0, 1], { ...clamp, easing: EASE2.out });
  return (
    <div style={{ position: "relative", width, height }}>
      <div style={{ position: "absolute", left: height, top: 0, width: width - height, height, overflow: "hidden" }}>
        <Img
          src={staticFile("v2/logo/satchel-lockup-on-light.svg")}
          style={{ position: "absolute", left: -height, top: 0, width, height, translate: `${(p - 1) * (width - height)}px 0` }}
        />
      </div>
      <div style={{ position: "absolute", left: 0, top: 0 }}>
        <MarkBuild size={height} />
      </div>
    </div>
  );
};

