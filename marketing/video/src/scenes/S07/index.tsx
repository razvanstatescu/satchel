import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Sfx } from "../../lib/Sfx";
import { FPS } from "../../lib/time";
import { BeatA } from "./BeatA";
import { BeatB } from "./BeatB";
import { BeatC } from "./BeatC";
import { BeatD } from "./BeatD";
import { BeatE } from "./BeatE";
import { cues, Shot, WarmGround } from "./lib";

/**
 * S07 — Solution montage (L12–L17), five beats cut on the beat grid and choreographed on VO word times (lib.cues):
 *   A "Plain transfers only." → "Recorded before it's signed."  a raw hash and a token approval bounce off the
 *     contract, a plain transfer passes and drops into the ledger: record first, then "Signed by NEAR's signer network"
 *   B "Listed. Signing paused."       pill flips to Listed, frozen sweep, FreezeBanner, count locks at 3
 *   C "Checked in your browser." → "Clean history."  real app glimpse → rows resolve on nonce / coin / blockhash → Buy lights
 *   D "Anything live? Buy stays locked."  Satchel #4: nonce 5 Unused, Blocked, Buy at 40 %
 *   E "No admin key. Not even ours."  empty brass hooks, contract facts, real Contract facts page
 */
export default function S07() {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const q = cues();
  return (
    <AbsoluteFill>
      <WarmGround />
      <Shot id="a" t={t} inT={0} outT={q.cutB} inDir="none" outDir="left">
        <BeatA t={t} q={q} />
      </Shot>
      <Shot id="b" t={t} inT={q.cutB} outT={q.cutC} inDir="left" outDir="zoom">
        <BeatB t={t} q={q} />
      </Shot>
      <Shot id="c" t={t} inT={q.cutC} outT={q.cutD} inDir="zoom" outDir="left" drift={0.6}>
        <BeatC t={t} q={q} />
      </Shot>
      <Shot id="d" t={t} inT={q.cutD} outT={q.cutE} inDir="left" outDir="up" drift={0.6}>
        <BeatD t={t} q={q} />
      </Shot>
      <Shot id="e" t={t} inT={q.cutE} outT={q.end + 1} inDir="up" outDir="none" drift={0.5}>
        <BeatE t={t} q={q} />
      </Shot>

      {/* ── sound (1–3 cues per second at most; the VO stays clear) ── */}
      {/* A: two refusals, the plain transfer passes, the camera follows it down, record → sign */}
      <Sfx name="impact-soft" at={q.aHit1} gainDb={-4} />
      <Sfx name="error-low" at={q.aHit1} gainDb={2} />
      <Sfx name="impact-soft" at={q.aHit2} gainDb={-4} />
      <Sfx name="error-low" at={q.aHit2} gainDb={2} />
      <Sfx name="ui-tick" at={q.aPass} gainDb={-3} />
      <Sfx name="ui-click" at={q.aDrop - 0.08} gainDb={-2} />
      <Sfx name="whoosh-fast" at={q.aDrop + 0.33} align="peak" gainDb={-6} />
      <Sfx name="type-tick-run" at={q.aWrite} gainDb={-10} />
      <Sfx name="ui-tick" at={q.aWriteEnd} gainDb={-4} />
      <Sfx name="ui-tick" at={q.aSign} gainDb={-6} />
      <Sfx name="ui-click" at={q.aSigned} gainDb={-4} />
      {/* A → B */}
      <Sfx name="whoosh-fast" at={q.cutB} align="peak" gainDb={-4} />
      {/* B */}
      <Sfx name="ui-click" at={q.bList} gainDb={-3} />
      <Sfx name="freeze-shimmer" at={q.bPause - 0.05} gainDb={-6} />
      <Sfx name="lock-clunk" at={q.bLock} gainDb={-4} />
      {/* B → C */}
      <Sfx name="whoosh-deep" at={q.cutC} align="peak" gainDb={-6} />
      <Sfx name="swish-short" at={q.cPunch} align="peak" gainDb={-4} />
      {/* C */}
      <Sfx name="scanner-sweep" at={q.cScan} gainDb={-12} />
      <Sfx name="ui-tick" at={q.cR1} gainDb={-3} />
      <Sfx name="ui-tick" at={q.cR2} gainDb={-3} />
      <Sfx name="ui-tick" at={q.cR3} gainDb={-3} />
      <Sfx name="impact-soft" at={q.cVerdict} gainDb={-6} />
      <Sfx name="success-brass" at={q.cBuy} gainDb={-3} />
      {/* C → D */}
      <Sfx name="whip-pan" at={q.cutD} align="peak" gainDb={-3} />
      {/* D */}
      <Sfx name="impact-deep" at={q.dUnused} gainDb={-9} />
      <Sfx name="error-low" at={q.dBuy} gainDb={-4} />
      {/* D → E */}
      <Sfx name="whoosh-deep" at={q.cutE} align="peak" gainDb={-5} />
      {/* E */}
      <Sfx name="type-tick-run" at={q.cutE + 0.12} gainDb={-12} />
      <Sfx name="paper-slide" at={q.eNot + 0.35} gainDb={-8} />
      <Sfx name="lock-clunk" at={q.eNo} gainDb={-4} />
      <Sfx name="impact-brass" at={q.eNot} gainDb={-5} />
    </AbsoluteFill>
  );
}
