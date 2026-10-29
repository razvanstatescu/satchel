// usage.tsx (A): the charm swing with the stock spring (released at 10°, rests in 600 ms)
import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SPRING2 } from "./brand2/motion";
import { ChainCharm } from "./brand2/Charm";

export const SwingingCharm: React.FC<{ at: number; fill: string }> = ({ at, fill }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const deg = frame < at ? 0 : spring({ frame: frame - at, fps, from: 10, to: 0, config: SPRING2.swing });
  return (
    <svg viewBox="-80 -110 160 190" width={320} height={380} style={{ overflow: "visible" }}>
      <g transform={`rotate(${deg} 0 -96)`}>
        <ChainCharm fill={fill} />
      </g>
    </svg>
  );
};

