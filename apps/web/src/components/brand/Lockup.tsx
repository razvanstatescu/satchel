import { ART, artA11y, WORDMARK_PATH, WORDMARK_TRANSFORM } from "./art";
import { SStrokes } from "./Mark";

/**
 * The lockup (logo/satchel-lockup-on-light.svg): the mark plus the lowercase wordmark. The wordmark fills with the
 * `ink` token (`fill-ink`), so one inline asset covers Day and Night (v1 shipped two image files); pass
 * `wordmarkClassName` (e.g. "fill-on-brand") to change it. `height` is the rendered height in px: 32 in the top bar,
 * 34 in the side nav.
 */
export function Lockup({
  height = 32,
  title,
  className,
  wordmarkClassName = "fill-ink",
}: {
  height?: number;
  title?: string;
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <svg viewBox="0 0 2220 512" width={Math.round((height * 2220) / 512)} height={height} className={className} {...artA11y(title)}>
      <rect width="512" height="512" rx="112" fill={ART.coral} />
      <SStrokes outline={92} />
      <g transform={WORDMARK_TRANSFORM}>
        <path d={WORDMARK_PATH} className={wordmarkClassName} />
      </g>
    </svg>
  );
}
