// usage.tsx (E): "Paused for sale" — the snowflake turns exactly 60° (six-fold, so it lands on itself)
import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Snowflake } from "lucide-react";
import { C } from "./brand2/tokens";
import { SPRING2 } from "./brand2/motion";

export const FrozenIcon: React.FC<{ at: number; size: number }> = ({ at, size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const turn = 60 * spring({ frame: frame - at, fps, config: SPRING2.quick });
  return <Snowflake size={size} strokeWidth={2} color={C.frozen} style={{ rotate: `${turn}deg` }} />;
};

