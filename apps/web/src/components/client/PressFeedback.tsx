"use client";

import { useEffect } from "react";

/**
 * The sticker press, made visible on a quick tap (motion-spec §3). Primary and paper buttons and card links carry
 * `data-press`; their pressed look (4 px down into the drop) comes from `:active` and `[data-pressed]` in CSS. A tap can
 * be shorter than a frame, so this one delegated listener sets `[data-pressed]` on pointerdown (and on Space or Enter)
 * and clears it no sooner than 100 ms later. It renders nothing, never touches disabled or busy controls, and is a
 * no-op without JS (`:active` still presses).
 */
const PRESSABLE = "[data-press]";
const MIN_PRESS_MS = 100;

function pressable(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest<HTMLElement>(PRESSABLE);
  if (!el || el.matches(':disabled, [aria-disabled="true"], [aria-busy="true"], [data-latched]')) return null;
  return el;
}

export function PressFeedback() {
  useEffect(() => {
    const since = new Map<HTMLElement, number>();
    const timers = new Map<HTMLElement, number>();
    let held: HTMLElement | null = null;

    const press = (el: HTMLElement) => {
      window.clearTimeout(timers.get(el));
      el.setAttribute("data-pressed", "");
      since.set(el, performance.now());
    };
    const release = (el: HTMLElement) => {
      const at = since.get(el);
      if (at === undefined) return;
      since.delete(el);
      const wait = Math.max(0, MIN_PRESS_MS - (performance.now() - at));
      timers.set(
        el,
        window.setTimeout(() => {
          timers.delete(el);
          el.removeAttribute("data-pressed");
        }, wait),
      );
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const el = pressable(e.target);
      if (!el) return;
      held = el;
      press(el);
    };
    const onPointerUp = () => {
      if (!held) return;
      release(held);
      held = null;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || (e.key !== " " && e.key !== "Enter")) return;
      const el = pressable(e.target);
      if (!el) return;
      press(el);
      if (e.key === "Enter") release(el); // Enter activates on keydown; Space on keyup
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== " ") return;
      const el = e.target instanceof Element ? e.target.closest<HTMLElement>(PRESSABLE) : null;
      if (el) release(el);
    };

    const opts = { capture: true, passive: true } as const;
    document.addEventListener("pointerdown", onPointerDown, opts);
    document.addEventListener("pointerup", onPointerUp, opts);
    document.addEventListener("pointercancel", onPointerUp, opts);
    document.addEventListener("keydown", onKeyDown, opts);
    document.addEventListener("keyup", onKeyUp, opts);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, opts);
      document.removeEventListener("pointerup", onPointerUp, opts);
      document.removeEventListener("pointercancel", onPointerUp, opts);
      document.removeEventListener("keydown", onKeyDown, opts);
      document.removeEventListener("keyup", onKeyUp, opts);
      timers.forEach((t, el) => {
        window.clearTimeout(t);
        el.removeAttribute("data-pressed");
      });
    };
  }, []);
  return null;
}
