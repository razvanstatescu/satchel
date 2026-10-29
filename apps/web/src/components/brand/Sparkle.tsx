import { ART } from "./art";

/**
 * The sparkle sticker (`assets/sparkle.svg`: lemon, ink outline), for celebrations only: the hand-off and first-mint
 * end frames and the landing's clean-history slip (design-spec §6.10). Always decorative.
 */
export function Sparkle({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
      <path
        d="M50 6 C54 34 66 46 94 50 C66 54 54 66 50 94 C46 66 34 54 6 50 C34 46 46 34 50 6 Z"
        fill={ART.lemon}
        stroke={ART.ink}
        strokeWidth="7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
