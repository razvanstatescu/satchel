import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C } from "../../brand/tokens";
import { Sfx } from "../../lib/Sfx";
import { HANDOFF } from "../../motion";
import { Caption, FPS, whip, WhipLayer } from "../P5/rig";
import { DeskStage } from "./Desk";
import { FinaleStage } from "./Finale";
import { GiftStage, LID_AT, RISE_AT } from "./Gift";
import { RelayStage } from "./Relay";
import { CAP, CONTACT, CUT, FINALE, LIFT } from "./timing";

/**
 * P6 · Use cases (46–58 s), the warmest section. Three 4 s sticker vignettes, each built around the hand-off swing
 * landing on a bar downbeat with the jingle on its apex: (a) a gift box pops and Satchel #12 rises with its charms in
 * party hats, swinging to sam.near; (b) an OTC desk: the heavy #30 (1.20 BTC · 18 ETH · 300 SOL) swings right as an
 * unnumbered USDC stack slides left, crossing mid-table; (c) a relay: #21 passes like a baton from old-team.near to
 * new-team.near under its "Team treasury" pennant. Whips (2-frame smear) link them; the scene ends on the three
 * cards swinging in sync. Captions "Gift a funded wallet." → "One trade. Whole position." → "Hand over a treasury."
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
  const a = stageMotion(frame, undefined, CUT.b);
  const b = stageMotion(frame, CUT.b, CUT.c);
  const c = stageMotion(frame, CUT.c, FINALE);
  const d = stageMotion(frame, FINALE);
  return (
    <AbsoluteFill style={{ background: C.ground, overflow: "hidden" }}>
      {frame < CUT.b ? (
        <WhipLayer x={a.x} stretch={a.s}>
          <GiftStage frame={frame} />
        </WhipLayer>
      ) : frame < CUT.c ? (
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
      <Caption text="Gift a funded wallet." at={CAP.a} until={CUT.b} size={110} width={1200} seed="p6-a" />
      <Caption text={"One trade. Whole position."} at={CAP.b} until={CUT.c} size={112} width={1000} seed="p6-b" />
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
      {/* gift: the box slaps in on the downbeat, the lid pops, #12 swoops up out of the box */}
      <Sfx name="sticker-slap" at={at(2)} gainDb={-5} />
      <Sfx name="pop" at={at(LID_AT + 1)} gainDb={0} />
      <Sfx name="swoop-up" at={at(RISE_AT + 2)} align="peak" gainDb={-3} />
      {swing(LIFT.a, CONTACT.a)}
      <Sfx name="whoosh-zip" at={at(CUT.b)} align="peak" gainDb={-1} />
      {swing(LIFT.b, CONTACT.b, true)}
      <Sfx name="whoosh-zip" at={at(CUT.c)} align="peak" gainDb={-1} />
      {swing(LIFT.c, CONTACT.c)}
      <Sfx name="whoosh-zip" at={at(FINALE)} align="peak" gainDb={-1} />
      <Sfx name="charm-jingle" at={at(FINALE + 15)} align="peak" gainDb={1} />
    </>
  );
}
