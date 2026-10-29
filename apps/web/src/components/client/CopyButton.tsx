"use client";

import { useEffect, useLayoutEffect, useRef, useState, type Ref } from "react";
import { Check, Copy } from "lucide-react";
import { Button, Icon, Morph, cx } from "@/components/ui";
import { announce } from "@/components/client/Toaster";
import { copy } from "@/lib/copy";
import { readMotionMode } from "@/lib/motion-flag";
import { EASE, play, stickOnTracks, type Track } from "@/lib/motion/play";

/**
 * Copy (motion-spec §3 "Copy"): copying always yields the raw string. The Copy icon fades (90 ms) and a Check **sticks
 * on** (from 1.5×, no turn, 320 ms) while the label rolls to "Copied"; 1.5 s later it all rolls back. The one status
 * region announces `toastText` ("Bitcoin address copied"); no toast. Every label shares one grid cell, so the button
 * never resizes. Reduced motion: cross-fades only.
 *
 * Variants: `tool` (the Inside rows' 44 px sunken pill, "Copy"), `primary` (Add coins' pinned "Copy address", a coral
 * lg button) and `icon` (a 44 px round icon button).
 */

const HOLD_MS = 1500;

/** The icon swap of the tool and icon variants (their icons sit outside the label). */
function swapTracks(from: HTMLElement | null, to: HTMLElement | null, reduce: boolean, sticking: boolean): { tracks: Track<Element>[]; T: number } {
  if (reduce) {
    return {
      T: 150,
      tracks: [
        { el: from, prop: "opacity", frames: [[0, 1, EASE.in], [150, 0]] },
        { el: to, prop: "opacity", frames: [[0, 0, EASE.out], [150, 1]] },
      ],
    };
  }
  if (sticking) return { T: 320, tracks: [{ el: from, prop: "opacity", frames: [[0, 1, EASE.in], [90, 0]] }, ...stickOnTracks(to, 0, { from: 1.5, turn: 0 })] };
  return {
    T: 300,
    tracks: [
      { el: from, prop: "opacity", frames: [[0, 1, EASE.in], [140, 0]] },
      { el: to, prop: "opacity", frames: [[0, 0], [140, 0, EASE.out], [300, 1]] },
    ],
  };
}

export function CopyButton({
  value,
  label,
  toastText,
  className,
  variant = "tool",
  text,
}: {
  value: string;
  /** The accessible name ("Copy Bitcoin address"). Dropped when it equals the visible text. */
  label: string;
  /** Announced after copying (the one polite status region). */
  toastText: string;
  className?: string;
  variant?: "tool" | "primary" | "icon";
  /** The visible label at rest (default "Copy"; "Copied" after). */
  text?: string;
}) {
  const kind = variant;
  const idle = text ?? (kind === "primary" ? copy.fund.copy : copy.wallet.copy);
  const [done, setDone] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLSpanElement>(null);
  const checkRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  // The static classes are the end state; this animates from the previous one, then rests on the CSS. The primary's
  // icons ride in its Morph labels (the roll moves them), and its Check still sticks on.
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const reduce = readMotionMode() === "reduce";
    if (kind === "primary") {
      const check = done && !reduce ? rootRef.current?.querySelector('[data-pos="current"] svg') : null;
      if (!check) return;
      // a smaller stick-on: the Morph's label window clips anything that grows past it
      const h = play(stickOnTracks(check, 70, { from: 1.2, turn: 0 }), 390);
      return () => h.cancel();
    }
    const { tracks, T } = done ? swapTracks(copyRef.current, checkRef.current, reduce, true) : swapTracks(checkRef.current, copyRef.current, reduce, false);
    const h = play(tracks, T);
    return () => h.cancel();
  }, [done, kind]);

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* clipboard blocked: the value is visible text, so it can still be selected */
    }
    announce(toastText);
    setDone(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), HOLD_MS);
  };

  const name = label === idle ? undefined : label;

  if (kind === "primary") {
    return (
      <Button
        ref={rootRef as Ref<HTMLButtonElement>}
        type="button"
        variant="primary"
        size="lg"
        block
        aria-label={name}
        data-done={done ? "" : undefined}
        className={className}
        onClick={onClick}
      >
        <Morph value={done ? "done" : "idle"} labels={{ idle: { label: idle, icon: Copy }, done: { label: copy.wallet.copied, icon: Check } }} />
      </Button>
    );
  }

  const size = kind === "tool" ? 16 : 20;
  const icons = (
    <span aria-hidden="true" className="grid flex-none place-items-center *:[grid-area:1/1]">
      <span ref={copyRef} className={cx("grid", done && "opacity-0")}>
        <Icon icon={Copy} size={size} />
      </span>
      <span ref={checkRef} className={cx("grid", !done && "opacity-0")}>
        <Icon icon={Check} size={size} />
      </span>
    </span>
  );

  if (kind === "icon") {
    return (
      <button
        type="button"
        aria-label={label}
        data-done={done ? "" : undefined}
        onClick={onClick}
        className={cx(
          "inline-grid size-11 flex-none place-items-center rounded-pill text-ink transition-[scale,background-color] duration-120 hover:bg-surface-sunken active:scale-[.96] active:bg-surface-sunken data-done:text-success",
          className,
        )}
      >
        {icons}
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-label={name}
      data-done={done ? "" : undefined}
      onClick={onClick}
      className={cx(
        "inline-flex min-h-11 flex-none items-center gap-1.5 rounded-pill bg-surface-sunken px-3.5 font-sans text-[0.875rem]/5 font-semibold whitespace-nowrap text-ink transition-colors duration-120 hover:bg-line data-done:text-success",
        className,
      )}
    >
      {icons}
      <Morph value={done ? "done" : "idle"} labels={{ idle, done: copy.wallet.copied }} className="justify-items-start" />
    </button>
  );
}
