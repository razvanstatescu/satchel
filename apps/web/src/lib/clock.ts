"use client";

import { useSyncExternalStore } from "react";

/**
 * One shared 1 s clock for relative times and timers. The server snapshot is 0, so nothing reads the clock during the
 * prerender (Next 16 refuses Date.now() in client renders) and hydration matches; components render "now"-dependent
 * text only when the value is non-zero.
 */
let now = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(l: () => void) {
  listeners.add(l);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((fn) => fn());
    }, 1000);
    queueMicrotask(() => listeners.forEach((fn) => fn()));
  }
  return () => {
    listeners.delete(l);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function useNow(): number {
  return useSyncExternalStore(subscribe, () => now, () => 0);
}
