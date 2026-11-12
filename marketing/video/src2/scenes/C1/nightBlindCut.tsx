import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import type { FC } from "react";
import { AbsoluteFill, Freeze, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE2 } from "../../motion";

/**
 * P6 → C1 (QA #6): Night falls as a roller blind over P6's last frame (the kit's NightBlind numbers: the edge falls
 * 0 → H in 18 f on EASE2.fall, with a hard 10 px black shadow under it). TransitionSeries draws the entering scene on
 * top, so the entering C1, already Night, is clipped to the part above the edge and the exiting P6 stays below it.
 * P6 holds the frame of the music stop while the blind falls (a Freeze, which also mutes its sounds from there, so the
 * stop stays as hard as it was before the transition existed). Wire it with 18 frames in transitions.ts (linear
 * timing; the cut stays on the music stop).
 */
type Props = { shadow?: number };

const NightBlindCut: FC<TransitionPresentationComponentProps<Props>> = ({ children, presentationDirection, presentationProgress, presentationDurationInFrames, passedProps }) => {
  const { height } = useVideoConfig();
  const frame = useCurrentFrame();
  if (presentationDirection === "exiting") {
    const stop = frame - Math.round(presentationProgress * presentationDurationInFrames); // the transition's first frame
    return (
      <AbsoluteFill>
        <Freeze frame={stop}>{children}</Freeze>
      </AbsoluteFill>
    );
  }
  const edge = EASE2.fall(Math.max(0, Math.min(1, presentationProgress))) * height;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(0 0 ${Math.max(0, height - edge)}px 0)` }}>{children}</AbsoluteFill>
      {edge > 0.5 && edge < height ? <div style={{ position: "absolute", left: 0, right: 0, top: edge, height: passedProps.shadow ?? 10, background: "#000000" }} /> : null}
    </AbsoluteFill>
  );
};

export const nightBlindCut = (props: Props = {}): TransitionPresentation<Props> => ({ component: NightBlindCut, props });
