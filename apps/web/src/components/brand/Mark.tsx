import { ART, artA11y, S_PATH } from "./art";

/** The S drawn as in the pack: the hard drop (+10 y), the ink outline, then the face. */
export function SStrokes({ outline, face = ART.white }: { outline: number; face?: string }) {
  return (
    <>
      <path d={S_PATH} transform="translate(0 10)" fill="none" stroke={ART.ink} strokeWidth={outline} strokeLinecap="round" />
      <path d={S_PATH} fill="none" stroke={ART.ink} strokeWidth={outline} strokeLinecap="round" />
      <path d={S_PATH} fill="none" stroke={face} strokeWidth={56} strokeLinecap="round" />
    </>
  );
}

type MarkProps = { size?: number; title?: string; className?: string };

/**
 * The mark (logo/satchel-mark.svg): the coral tile with the white S, its ink outline and hard drop. For 40 px and up;
 * below that use `MarkSmall`. Never on coral, never recoloured.
 */
export function Mark({ size = 40, title, className }: MarkProps) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} className={className} {...artA11y(title)}>
      <rect width="512" height="512" rx="112" fill={ART.coral} />
      <SStrokes outline={92} />
    </svg>
  );
}

/** The small cut (logo/satchel-mark-small.svg = web/favicon.svg): a bigger, bolder S for 32 px and below. */
export function MarkSmall({ size = 24, title, className }: MarkProps) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} className={className} {...artA11y(title)}>
      <rect width="512" height="512" rx="112" fill={ART.coral} />
      <g transform="translate(256 256) scale(1.1) translate(-256 -256)">
        <SStrokes outline={108} />
      </g>
    </svg>
  );
}
