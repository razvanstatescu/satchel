/**
 * The landing's layout system (design-spec §3.1–§3.2; proto/landing.css + components.css §15), as Tailwind classes on
 * the 2.0 tokens. Mobile-first: one column at 390, splits from 1024, the 1200 px content width from 1280.
 */

/** The 1200 px content column with the brand's gutters: 16 → 24 from 768 → 32 from 1024 (1264 = 1200 + 2 × 32). */
export const CONTAINER = "mx-auto w-full max-w-[79rem] px-4 md:px-6 lg:px-8";

/** A section's vertical rhythm: 56 → 88 from 768 → 104 from 1280. */
export const SECTION_Y = "py-14 md:py-22 xl:py-26";

/**
 * A plain-ground section after another: they share one gap (the previous section's bottom padding), so it starts at its
 * content. Its anchor lands with some air under the sticky header.
 */
export const FLOW = "scroll-mt-6 pb-14 md:pb-22 md:scroll-mt-8 xl:pb-26";

/** Text and art side by side from 1024 (1fr 1fr, gap 72); stacked below with the text first, so phones read the H2 first. */
export const SPLIT = "grid items-center gap-9 lg:grid-cols-2 lg:gap-18";

/** A section head: the H2, then the lead 14 px below it. */
export const HEAD = "flex max-w-[47.5rem] flex-col gap-3.5";
export const HEAD_CENTER = "mx-auto flex max-w-[47.5rem] flex-col items-center gap-3.5 text-center";

/** The landing H2: Funnel 800, 32/34 → 44/46 from 768. */
export const H2 = "text-section md:text-section-md";

/** The lead: Onest 18/28 → 20/30 from 768, ink-muted, at most 620 px. */
export const LEAD = "max-w-[38.75rem] text-lead text-ink-muted md:text-lead-md";

/** "One NFT. Its own addresses." → ["One NFT.", "Its own addresses."]: a heading's sentences, for per-line layout. */
export function sentences(s: string): string[] {
  return s.split(/(?<=[.!?])\s+/).filter(Boolean);
}
