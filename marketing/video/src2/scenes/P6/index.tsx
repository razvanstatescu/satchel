import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C } from "../../brand/tokens";
import { Sfx } from "../../lib/Sfx";
import { HANDOFF } from "../../motion";
import { Caption, FPS, whip, WhipLayer } from "../P5/rig";
import { DeskStage } from "./Desk";
import { FinaleStage } from "./Finale";
import { RelayStage } from "./Relay";
import { ACCEPT, CAP, CONTACT, CUT, FINALE, LIFT } from "./timing";

/**
 * P6 · Use cases (v4: 52–59 s), the warmest section. Two sticker vignettes built around the hand-off swing (the v2
 * gift is cut): (a) an OTC desk: the heavy #30 (1.20 BTC · 18 ETH · 300 SOL, ≈ $171,000.00) swings right as the offer
 * sticker (42,000 NEAR) slides left, crossing mid-table; on "offer" it flips to ✓ Accepted; (b) a relay: #21 passes
 * like a baton from old-team.near to new-team.near under its "Team treasury" pennant. A whip links them and the scene
 * ends on the two cards swinging in sync. Captions "One trade. Whole position." → "Or take an offer." →
 * "Hand over a treasury."
 */

/** a stage's whip in (from the previous cut) and out (to the next) */
function stageMotion(frame: number, inCut?: number, outCut?: number) {
  if (inCut !== undefined && frame < inCut + 4) {
    const w = whip(frame, inCut, 1);
    return { x: w.inX, s: w.stretch };
  }
  if (outCut !== undefined && frame >= outCut - 4) {
    const w = whip(frame, outCut, 1);
    return { x: w.outX, s: w.stretch };
  }
  return { x: 0, s: 1 };
}

export default function P6() {
  const frame = useCurrentFrame();
  const b = stageMotion(frame, undefined, CUT.c);
  const c = stageMotion(frame, CUT.c, FINALE);
  const d = stageMotion(frame, FINALE);
  return (
    <AbsoluteFill style={{ background: C.ground, overflow: "hidden" }}>
      {frame < CUT.c ? (
        <WhipLayer x={b.x} stretch={b.s}>
          <DeskStage frame={frame} />
        </WhipLayer>
      ) : frame < FINALE ? (
        <WhipLayer x={c.x} stretch={c.s}>
          <RelayStage frame={frame} />
        </WhipLayer>
      ) : (
        <WhipLayer x={d.x} stretch={d.s}>
          <FinaleStage frame={frame} />
        </WhipLayer>
      )}
      <Caption text={"One trade. Whole position."} at={CAP.b} until={CAP.or - 4} size={112} width={1000} seed="p6-b" />
      <Caption text="Or take an offer." at={CAP.or} until={CAP.c - 4} size={112} width={1200} seed="p6-o" />
      <Caption text="Hand over a treasury." at={CAP.c} until={FINALE} size={110} width={1200} seed="p6-c" />
      <Sounds />
    </AbsoluteFill>
  );
}

function Sounds() {
  const at = (f: number) => f / FPS;
  const swing = (lift: number, contact: number, heavy = false) => (
    <>
      <Sfx name="swing-swish" at={at(lift + 10)} align="peak" gainDb={-2} />
      <Sfx name="charm-jingle" at={at(lift + HANDOFF.apex)} align="peak" gainDb={2} />
      <Sfx name="sticker-slap" at={at(contact)} gainDb={heavy ? -1 : -4} />
      <Sfx name="chain-clink" at={at(contact)} align="peak" gainDb={heavy ? 2 : 0} />
      {heavy ? <Sfx name="drum-hit-soft" at={at(contact)} gainDb={-6} /> : null}
    </>
  );
  return (
    <>
      {swing(LIFT.b, CONTACT.b, true)}
      <Sfx name="success-marimba" at={at(ACCEPT)} align="peak" gainDb={-2} />
      <Sfx name="whoosh-zip" at={at(CUT.c)} align="peak" gainDb={-1} />
      {swing(LIFT.c, CONTACT.c)}
      <Sfx name="whoosh-zip" at={at(FINALE)} align="peak" gainDb={-1} />
      <Sfx name="charm-jingle" at={at(FINALE + 15)} align="peak" gainDb={1} />
    </>
  );
}
