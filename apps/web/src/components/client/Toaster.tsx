"use client";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type RefObject } from "react";
import { readMotionMode } from "@/lib/motion-flag";
import { ToastView, type ToastTone } from "@/components/ui";

export type { ToastTone } from "@/components/ui";

/**
 * Toasts and the one app-wide polite status region (WCAG 4.1.3; design-system-impl §4.9; motion-spec §5).
 *
 * - `toast(text, { tone })`: five words or fewer, one at a time (a new one waits for the old one's exit, then rises);
 *   it holds 4 s, paused while hovered; the toast itself is `aria-hidden` and the status region announces it. Never
 *   for errors that need reading.
 * - `announce(text)`: the status region only (signing progress, copy confirmations, hand-off sentences).
 * - `usePinnedBar(ref, active, { below })`: while a bar is pinned to the bottom of the screen (the buy bar and the offer
 *   bar below 1024 px, the default; a flow sheet's foot below 768, `below: 768`), toasts sit above it.
 *
 * Tones (the icon carries the state, never colour alone): success (default) · progress (a spinner: "Still signing") ·
 * neutral (undo: your own cancel, "Stopped selling") · info · warning · danger.
 */

type Toast = { id: number; text: string; tone: ToastTone };
type Shown = Toast & { phase: "in" | "out" };

const HOLD_MS = 4000;

let current: Shown | null = null;
let queued: Toast | null = null;
let status = "";
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function toast(text: string, opts: { tone?: ToastTone } = {}) {
  const next: Toast = { id: ++seq, text, tone: opts.tone ?? "success" };
  status = text;
  if (current) {
    queued = next; // the newest wins; it rises once the shown one has left
    if (current.phase === "in") current = { ...current, phase: "out" };
  } else {
    current = { ...next, phase: "in" };
  }
  emit();
}

export function announce(text: string) {
  status = text;
  emit();
}

/** Starts the exit of toast `id` (its hold ran out). */
function dismiss(id: number) {
  if (current?.id !== id || current.phase === "out") return;
  current = { ...current, phase: "out" };
  emit();
}

/** Toast `id` has left: show the queued one, if any. */
function advance(id: number) {
  if (current?.id !== id) return;
  current = queued ? { ...queued, phase: "in" } : null;
  queued = null;
  emit();
}

/* Every bar pinned right now, with its height (0 while its width leaves it unpinned); --pinned-h is the tallest. */
const pinnedBars = new Map<HTMLElement, number>();
function syncPinned() {
  const h = Math.max(0, ...pinnedBars.values());
  if (h > 0) document.body.style.setProperty("--pinned-h", `${h}px`);
  else document.body.style.removeProperty("--pinned-h");
}

/**
 * Lifts toasts above a bar pinned to the bottom of the screen while it is mounted: it sets `--pinned-h` on <body> to
 * the bar's height while the viewport is narrower than `below` px (default 1024: the buy bar and the offer bar are
 * pinned below 1024; a flow sheet's foot passes 768, where the sheet becomes a dialog). Several bars at once: the
 * tallest wins.
 */
export function usePinnedBar(ref: RefObject<HTMLElement | null>, active = true, { below = 1024 }: { below?: number } = {}) {
  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    const mq = window.matchMedia?.(`(max-width: ${below / 16 - 0.01}rem)`);
    const update = () => {
      pinnedBars.set(el, !mq || mq.matches ? Math.round(el.getBoundingClientRect().height) : 0);
      syncPinned();
    };
    update();
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    mq?.addEventListener?.("change", update);
    return () => {
      ro?.disconnect();
      mq?.removeEventListener?.("change", update);
      pinnedBars.delete(el);
      syncPinned();
    };
  }, [ref, active, below]);
}

function animate(el: HTMLElement, phase: "in" | "out"): Promise<void> {
  if (typeof el.animate !== "function") return Promise.resolve();
  const reduce = readMotionMode() === "reduce";
  const anims: Animation[] = [];
  if (reduce) {
    anims.push(el.animate(phase === "in" ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: "linear", fill: "both" }));
  } else if (phase === "in") {
    anims.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: "linear", fill: "both" }));
    anims.push(el.animate([{ translate: "0 16px", scale: "0.94" }, { translate: "0 0", scale: "1" }], { duration: 260, easing: "cubic-bezier(.2,0,0,1)", fill: "both" }));
  } else {
    anims.push(el.animate([{ opacity: 1, translate: "0 0" }, { opacity: 0, translate: "0 8px" }], { duration: 160, easing: "cubic-bezier(.3,0,1,1)", fill: "both" }));
  }
  return Promise.all(anims.map((a) => a.finished)).then(
    () => {
      if (phase === "in") anims.forEach((a) => a.cancel()); // rest on the static CSS
    },
    () => undefined,
  );
}

export function Toaster() {
  const t = useSyncExternalStore(subscribe, () => current, () => null);
  const s = useSyncExternalStore(subscribe, () => status, () => "");
  const el = useRef<HTMLDivElement>(null);

  // Rise in when a toast appears (a toast object only ever changes from "in" to "out").
  useLayoutEffect(() => {
    if (t?.phase === "in" && el.current) void animate(el.current, "in");
  }, [t]);

  // Hold 4 s (paused while hovered), then leave; a leaving toast plays its exit, then makes room for the next.
  useEffect(() => {
    const node = el.current;
    if (!t || !node) return;
    if (t.phase === "out") {
      let live = true;
      void animate(node, "out").then(() => live && advance(t.id));
      return () => {
        live = false;
      };
    }
    let left = HOLD_MS;
    let since = performance.now();
    let timer = window.setTimeout(() => dismiss(t.id), left);
    const pause = () => {
      window.clearTimeout(timer);
      left -= performance.now() - since;
    };
    const resume = () => {
      since = performance.now();
      timer = window.setTimeout(() => dismiss(t.id), Math.max(0, left));
    };
    node.addEventListener("pointerenter", pause);
    node.addEventListener("pointerleave", resume);
    return () => {
      window.clearTimeout(timer);
      node.removeEventListener("pointerenter", pause);
      node.removeEventListener("pointerleave", resume);
    };
  }, [t]);

  return (
    <div data-flow-keep>
      <div role="status" aria-live="polite" className="sr-only" data-testid="status-region">
        {s}
      </div>
      {t ? (
        <div className="pointer-events-none fixed bottom-[calc(var(--pinned-h,0px)+16px+env(safe-area-inset-bottom))] left-1/2 z-70 flex w-max max-w-[calc(100vw-32px)] -translate-x-1/2 justify-center md:bottom-[calc(var(--pinned-h,0px)+24px)]">
          <ToastView key={t.id} ref={el} tone={t.tone} aria-hidden="true" data-testid="toast">
            {t.text}
          </ToastView>
        </div>
      ) : null}
    </div>
  );
}
