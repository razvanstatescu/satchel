import { ART, artA11y } from "./art";
import { SStrokes } from "./Mark";

/**
 * The charm S, the sticker S without its tile (logo/satchel-charm.svg, or satchel-charm-coral.svg with
 * `face="coral"`). For the card band's corner, empty states, 404 and page loads. Never a button icon, never a face,
 * never rotated; it sits on light fields or coral (its ink outline and drop are fixed). `height` in px.
 */
export function Charm({
  height = 96,
  face = "white",
  title,
  className,
}: {
  height?: number;
  face?: "white" | "coral";
  title?: string;
  className?: string;
}) {
  return (
    <svg viewBox="120 80 272 356" width={Math.round((height * 272) / 356)} height={height} className={className} {...artA11y(title)}>
      <SStrokes outline={92} face={face === "coral" ? ART.coral : ART.white} />
    </svg>
  );
}
