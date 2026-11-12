import React from "react";
import { AbsoluteFill, HtmlInCanvas, useCurrentFrame } from "remotion";
import { F } from "../../brand/tokens";
import { Barrage, barrageLook, DEVCON_BOX, slamChipAt } from "./Barrage";
import { barrageFx } from "./fx/barrageFx";
import { H0Sound } from "./Sound";
import { BRIDGE, CAPTIONS, DEVCON, DIVE, SLAP_START } from "./timing";
import { Impact, Iris, RevealCard, Underlay } from "./Turn";

/**
 * H0, the cold open (262 f, 8.73 s; H0's f262 is H1's f0). Build notes: marketing/notes/intro-research/build.md.
 * Layers, bottom to top:
 *   1. black (the ground, and the 2.4 s of black between the barrage and the reveal)
 *   2. the barrage (Barrage.tsx), all third-party material, through ONE GL pass (barrageFx), until the cut to black
 *   3. the bridge title on the black (our words, film v6)
 *   4. the reveal (Turn.tsx), inside one impact (punch and shake): H1's world, the black bursting open around the card,
 *      and the Satchel card itself
 *   5. our captions and credits (never distorted, held perfectly still)
 * The pass needs WebGL: render H0 with --gl=angle (tools/render-master.sh does).
 */

/** Captions sit on the black like title cards: white Funnel Display 800 over a soft top scrim, hard-cut on the bar
 *  lines at full strength from their first frame (no blank or half frame between two captions) and held still. */
const CAPTION_SIZE = 100;
const Captions: React.FC<{ f: number }> = ({ f }) => {
  const c = CAPTIONS.find((x) => f >= x.from && f <= x.to);
  if (!c) return null;
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 330, background: "linear-gradient(rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.72) 45%, rgba(0,0,0,0) 100%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 84, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            fontFamily: F.display,
            fontWeight: 800,
            fontSize: CAPTION_SIZE,
            lineHeight: 1,
            letterSpacing: "-0.035em",
            color: "#ffffff",
            textShadow: "0 6px 28px rgba(0,0,0,0.7)",
            whiteSpace: "nowrap",
          }}
        >
          {c.text}
        </div>
      </div>
    </>
  );
};

/** A credit chip, drawn like the talk's (outside the pass). */
const Chip: React.FC<{ x: number; y: number; text: string }> = ({ x, y, text }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      height: 46,
      padding: "0 18px",
      borderRadius: 999,
      background: "rgba(0,0,0,0.72)",
      color: "#ffffff",
      fontFamily: F.sans,
      fontWeight: 600,
      fontSize: 24,
      display: "flex",
      alignItems: "center",
      whiteSpace: "nowrap",
    }}
  >
    {text}
  </div>
);

/** Attribution: the talk (CC BY) while it is on the glass, and any slam whose page can't show its own date. */
const Credits: React.FC<{ f: number }> = ({ f }) => {
  const slam = slamChipAt(f);
  return (
    <>
      {f >= DEVCON.from + 3 && f < DIVE.from ? <Chip x={DEVCON_BOX.cx - DEVCON_BOX.w / 2 + 28} y={DEVCON_BOX.cy + DEVCON_BOX.h / 2 - 28 - 46} text="Devcon SEA 2024 · CC BY" /> : null}
      {slam ? <Chip x={slam.box.cx - slam.box.w / 2 + 24} y={slam.box.cy + slam.box.h / 2 + 16} text={slam.text} /> : null}
    </>
  );
};

/**
 * The bridge (film v6): the narrator's first line as a title card on the black, the same type as the captions, centred
 * like a title. It hard-cuts in on her first word and holds still until the card starts to fall, so the card drops
 * through clean black as before; the falling card's first frame replaces it (no black frame between them).
 */
const Bridge: React.FC<{ f: number }> = ({ f }) => {
  if (f < BRIDGE.at || f >= SLAP_START) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          fontFamily: F.display,
          fontWeight: 800,
          fontSize: CAPTION_SIZE,
          lineHeight: 1,
          letterSpacing: "-0.035em",
          color: "#ffffff",
          whiteSpace: "nowrap",
        }}
      >
        {BRIDGE.text}
      </div>
    </AbsoluteFill>
  );
};

export default function H0() {
  const frame = useCurrentFrame();
  const look = barrageLook(frame);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {look ? (
        <HtmlInCanvas width={1920} height={1080} effects={[barrageFx(look)]}>
          <Barrage f={frame} />
        </HtmlInCanvas>
      ) : null}
      <Bridge f={frame} />
      <Impact f={frame}>
        <Underlay f={frame} />
        <Iris f={frame} />
        <RevealCard f={frame} />
      </Impact>
      <Captions f={frame} />
      <Credits f={frame} />
      <H0Sound />
    </AbsoluteFill>
  );
}
