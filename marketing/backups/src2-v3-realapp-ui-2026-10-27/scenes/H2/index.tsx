import { useCurrentFrame } from "remotion";
import { Sfx } from "../../lib/Sfx";
import { BOUNCE_CONTACT, HookShot } from "../H1/hook";
import { CAM, H2_LAST, T } from "../H1/timing";

/** H2 seconds for a global hook frame. */
const sec = (g: number) => (g - T.h2) / 30;

/**
 * H2 (3–12 s), the second half of the hook's continuous shot (H1/hook.tsx): Bitcoin. Ethereum. Solana. as each
 * charm reacts to its name, the pull back to "One NFT.", then the lockup on "Satchel" and the promise. The central
 * peel to P1 extends this scene by 20 frames: the final pose holds (the clock is clamped).
 */
export default function H2() {
  const frame = useCurrentFrame();
  const g = Math.min(T.h2 + frame, H2_LAST);
  return (
    <>
      <HookShot g={g} />
      {/* each name: its sticker lands a frame before the word, a soft tick as its charm reacts (SOL hops: pop-high) */}
      <Sfx name="tick-soft" at={sec(T.wBtc)} gainDb={-5} />
      <Sfx name="tick-soft" at={sec(T.wEth)} gainDb={-5} />
      <Sfx name="pop-high" at={sec(T.wSol + 1)} gainDb={-6} />
      {/* the name stickers come unstuck and drop away on the pull back; "One NFT." slaps on just before "NFT." */}
      <Sfx name="sticker-peel" at={sec(CAM.wordsOut + 4)} align="peak" gainDb={-9} />
      <Sfx name="sticker-slap" at={sec(T.wNft - 1)} gainDb={-6} />
      {/* the frame makes room: "One NFT." peels off, the line lands, the lockup slaps on "Satchel", bob's bounce */}
      <Sfx name="sticker-peel" at={sec(CAM.oneOut + 6)} align="peak" gainDb={-9} />
      <Sfx name="sticker-slap" at={sec(T.wWhoever - 2)} gainDb={-9} />
      <Sfx name="sticker-slap" at={sec(T.wSatchel - 2)} gainDb={-4} />
      <Sfx name="chain-clink" at={sec(BOUNCE_CONTACT)} gainDb={-4} />
      <Sfx name="charm-jingle" at={sec(BOUNCE_CONTACT + 3)} align="peak" gainDb={-6} />
      {/* the central peel to P1 (this scene's 20-frame extension) */}
      <Sfx name="sticker-peel" at={sec(H2_LAST + 1 + 11)} align="peak" gainDb={2} />
    </>
  );
}
