// usage.tsx (D): a sticker sheet
import React from "react";
import { AbsoluteFill, random, Sequence } from "remotion";
import { C, FONT, stroke } from "./brand2/tokens";
import { SlapIn } from "./brand2/Sticker";

export const StickerSheet: React.FC<{ labels: string[]; cols?: number }> = ({ labels, cols = 3 }) => {
  const { outline, shadow } = stroke(2.5);
  return (
    <AbsoluteFill style={{ background: C.ground, alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, auto)`, gap: "64px 56px", alignItems: "center" }}>
        {labels.map((label, i) => (
          <div key={label} style={{ rotate: `${(random(`tilt-${label}`) - 0.5) * 8}deg`, justifySelf: "center" }}>
            <Sequence from={i * 3} layout="none">
              <SlapIn padding="36px 48px" fill={C.surface} outline={outline} rest={shadow} radius={40}>
                <span style={{ fontFamily: FONT.sans, fontWeight: 700, fontSize: 56, color: C.ink }}>{label}</span>
              </SlapIn>
            </Sequence>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

