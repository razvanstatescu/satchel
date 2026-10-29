// Usage sketches quoted in brand2-motion-bible.md (typechecked with the brand2 helpers).
import React from "react";
import { AbsoluteFill, Img, interpolate, random, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { pushCut } from "@remotion/transitions/push-cut";
import { Snowflake } from "lucide-react";
import { C, FONT, stroke } from "./brand2/tokens";
import { clamp, EASE2, SLAP_CONTACT, smear, SPRING2 } from "./brand2/motion";
import { SlapIn } from "./brand2/Sticker";
import { ChainCharm } from "./brand2/Charm";
import { inkSwipe, peelOff, tileIris } from "./brand2/transitions";
import { MarkBuild } from "./brand2/StickerS";

// --- A. The charm swing with the stock spring (released at 10°, rests in 600 ms) -------------------------
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

// --- B. A sticker crossing the board on a pan, smeared on its fastest frames (no motion blur) -------------
export const SmearMove: React.FC<{ fromX: number; toX: number; dur: number; children: React.ReactNode }> = ({ fromX, toX, dur, children }) => {
  const frame = useCurrentFrame();
  const xAt = (f: number) => interpolate(f, [0, dur], [fromX, toX], { ...clamp, easing: EASE2.pan });
  const { along, across } = smear(xAt(frame) - xAt(frame - 1)); // px per frame → stretch ≤ 1.25
  return <div style={{ position: "absolute", left: 0, top: 0, translate: `${xAt(frame)}px 0`, scale: `${along} ${across}` }}>{children}</div>;
};

// --- C. Wiring the brand transitions (durations shorten the timeline: 120 + 90 + 90 + 120 − 20 − 22 − 18) ----
export const Chapters: React.FC<{ a: React.ReactNode; b: React.ReactNode; c: React.ReactNode; d: React.ReactNode }> = ({ a, b, c, d }) => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={120}>{a}</TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={tileIris({ from: { x: 840, y: 420, w: 240, h: 240 }, to: { x: 510, y: 256, w: 900, h: 132, r: 70 }, outline: 8 })}
      timing={linearTiming({ durationInFrames: 20 })}
    />
    <TransitionSeries.Sequence durationInFrames={90}>{b}</TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={peelOff({ corner: "br" })} timing={linearTiming({ durationInFrames: 22 })} />
    <TransitionSeries.Sequence durationInFrames={90}>{c}</TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={inkSwipe()} timing={linearTiming({ durationInFrames: 18 })} />
    <TransitionSeries.Sequence durationInFrames={120}>{d}</TransitionSeries.Sequence>
  </TransitionSeries>
);

// In phone mocks: a page push on the land spring, and a punch-in cut with the flash switched off.
export const phonePush = { presentation: slide({ direction: "from-right" }), timing: springTiming({ config: SPRING2.land, durationInFrames: 14 }) };
export const punch = { presentation: pushCut({ outgoingScale: 1.08, incomingStartScale: 1.12, incomingEndScale: 1, flashOpacity: 0 }), timing: linearTiming({ durationInFrames: 10, easing: EASE2.out }) };

// --- D. A sticker sheet: loose grid, seeded tilt (never on logo assets), slapped on 3 f apart ---------------
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

// --- E. "Paused for sale": the snowflake turns exactly 60° (six-fold, so it lands on itself) ---------------
export const FrozenIcon: React.FC<{ at: number; size: number }> = ({ at, size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const turn = 60 * spring({ frame: frame - at, fps, config: SPRING2.quick });
  return <Snowflake size={size} strokeWidth={2} color={C.frozen} style={{ rotate: `${turn}deg` }} />;
};

// --- F. Sound on the contact frame (the slap transient lands on f4 of the slap) ---------------------------
export const db = (d: number) => Math.pow(10, d / 20);
export const SlapWithSound: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    {children}
    <Sequence from={SLAP_CONTACT} layout="none">
      <Audio src={staticFile("sfx/v2/slap.wav")} volume={db(-8)} />
    </Sequence>
  </>
);

// --- G. Impact thump: the whole frame drops 6 px and recovers in 5 f (translate only). Max 3 in the film --
export const Thump: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  const y = interpolate(frame - at, [0, 1, 5], [0, 6, 0], { ...clamp, easing: EASE2.out });
  return <AbsoluteFill style={{ translate: `0 ${y}px` }}>{children}</AbsoluteFill>;
};

// --- H. Lockup reveal: the mark is built (MarkBuild), then the wordmark slides out from behind the tile. ---
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
