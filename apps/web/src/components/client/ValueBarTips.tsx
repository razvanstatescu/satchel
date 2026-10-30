"use client";

import { useRef, useState } from "react";
import { cx } from "@/components/ui";

export interface BarSegment {
  coin: string;
  /** the segment's colour (the coin's artwork colour) */
  fill: string;
  /** flex-grow: its share of the total */
  share: number;
  /** the tooltip: "Ethereum", "0.073979 ETH · 43%", "≈ $184.95" */
  title: string;
  lines: string[];
}

/**
 * The value bar's segments with a hover tooltip (the coin, its amount and share, its estimate). Hover or tap a segment;
 * the tooltip sits above it, outside the bar's clipped pill. The bar's `aria-label` (on the wrapper) already says all
 * of it for screen readers, so the tooltip is visual only.
 */
export function ValueBarTips({ segments, label, className }: { segments: BarSegment[]; label: string; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ i: number; x: number } | null>(null);
  const show = (i: number, el: HTMLElement) => {
    const box = wrap.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (box) setTip({ i, x: r.left - box.left + r.width / 2 });
  };
  const seg = tip ? segments[tip.i] : null;
  return (
    <div ref={wrap} className="relative w-full" onMouseLeave={() => setTip(null)}>
      <div role="img" aria-label={label} data-value-bar="" className={cx("flex h-3 w-full overflow-hidden rounded-pill border-2 border-sticker bg-surface-sunken", className)}>
        {segments.map((s, i) => (
          <span
            key={s.coin}
            data-share={s.coin}
            onMouseEnter={(e) => show(i, e.currentTarget)}
            onClick={(e) => {
              // a tap on touch screens toggles it; inside a card link, the tap stays on the bar
              e.preventDefault();
              e.stopPropagation();
              if (tip?.i === i) setTip(null);
              else show(i, e.currentTarget);
            }}
            className={cx("h-full min-w-1.5 cursor-default transition-opacity duration-120", i > 0 && "border-l-2 border-sticker", tip && tip.i !== i && "opacity-60")}
            style={{ flexGrow: s.share, flexBasis: 0, background: s.fill }}
          />
        ))}
      </div>
      {seg && tip ? (
        <div
          aria-hidden="true"
          data-bar-tip={seg.coin}
          className="pointer-events-none absolute bottom-full z-20 mb-2 w-max max-w-56 -translate-x-1/2 rounded-md border-2 border-sticker bg-surface px-3 py-2 text-left shadow-sticker"
          style={{ left: `clamp(4.5rem, ${tip.x}px, calc(100% - 4.5rem))` }}
        >
          <p className="m-0 flex items-center gap-1.5 font-sans text-[0.8125rem] leading-4.5 font-bold text-ink">
            <span aria-hidden="true" className="size-2.5 flex-none rounded-full border border-sticker" style={{ background: seg.fill }} />
            {seg.title}
          </p>
          {seg.lines.map((l) => (
            <p key={l} className="m-0 font-sans text-[0.75rem] leading-4 whitespace-nowrap text-ink-muted t-num">
              {l}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
