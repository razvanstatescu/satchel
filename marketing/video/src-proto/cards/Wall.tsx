import React from "react";
import { AbsoluteFill, random } from "remotion";
import { CARDS } from "./data";
import { CARD_H, CARD_W, NewsCard } from "./NewsCard";

/** A pile of screenshots filling the frame (the benchmark plate and a "wall" look). Deterministic layout. */
export const WALL_SLOTS = [
  { x: 330, y: 250, s: 0.62 },
  { x: 980, y: 210, s: 0.7 },
  { x: 1600, y: 280, s: 0.6 },
  { x: 420, y: 780, s: 0.66 },
  { x: 1080, y: 650, s: 0.82 },
  { x: 1640, y: 830, s: 0.62 },
  { x: 760, y: 470, s: 0.55 },
];

export const Wall: React.FC<{ offset?: number; bg?: string }> = ({ offset = 0, bg = "#0c0e13" }) => (
  <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>
    {WALL_SLOTS.map((p, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: p.x - CARD_W / 2,
          top: p.y - CARD_H / 2,
          width: CARD_W,
          height: CARD_H,
          scale: `${p.s}`,
          rotate: `${(random(`wall-r${i}`) - 0.5) * 9}deg`,
          boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
          borderRadius: 18,
        }}
      >
        <NewsCard d={CARDS[(i + offset) % CARDS.length]} variant={i + offset} />
      </div>
    ))}
  </AbsoluteFill>
);

export const CardStill: React.FC<{ index: number }> = ({ index }) => (
  <AbsoluteFill style={{ background: "transparent" }}>
    <NewsCard d={CARDS[index % CARDS.length]} variant={index} />
  </AbsoluteFill>
);
