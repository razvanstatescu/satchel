import { useCurrentFrame } from "remotion";
import { Sfx } from "../../lib/Sfx";
import { HookShot } from "./hook";
import { T } from "./timing";

const sec = (f: number) => f / 30;

/**
 * H1 (0–3 s), the first half of the hook's one continuous shot (see hook.tsx): three snap-ons, "Stick it on.", alice
 * peels Satchel #7 off and swings it to bob, "Hand it over.", the catch on hookLand, the punch-in toward the charms.
 */
export default function H1() {
  const frame = useCurrentFrame();
  return (
    <>
      <HookShot g={frame} />
      {/* the three snaps, one per 8th note around beat 2; the caption lands with ETH */}
      <Sfx name="pop" at={sec(T.btcSnap)} gainDb={-1} />
      <Sfx name="pop" at={sec(T.ethSnap)} gainDb={-1} />
      <Sfx name="sticker-slap" at={sec(T.ethSnap)} gainDb={-9} />
      <Sfx name="pop-high" at={sec(T.solSnap)} gainDb={0} />
      {/* alice peels the corner: the peel peaks on the detach */}
      <Sfx name="sticker-peel" at={sec(T.handoff)} align="peak" gainDb={-5} />
      {/* the swing: swish mid-lift, the jingle on the arc's apex, the slap + clink on the catch (hookLand) */}
      <Sfx name="swing-swish" at={sec(T.handoff + 10)} align="peak" gainDb={-2} />
      <Sfx name="charm-jingle" at={sec(T.handoff + 15)} align="peak" gainDb={2} />
      <Sfx name="sticker-slap" at={sec(T.hookLand)} gainDb={-2} />
      <Sfx name="chain-clink" at={sec(T.hookLand)} gainDb={-2} />
    </>
  );
}
