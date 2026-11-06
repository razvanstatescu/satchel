"use client";

import { useEffect } from "react";
import { mountCode } from "@/components/landing/code/engine";
import { mountHero } from "@/components/landing/hero/engine";
import { mountCharms } from "@/components/landing/motion/charms";
import { mountEnter } from "@/components/landing/motion/enter";

/**
 * The landing's one client island for motion (R10: WAAPI and CSS only, no `motion` import). It renders nothing: once the
 * page has loaded and the main thread is idle it upgrades the server-rendered page in place (the hero loop, the
 * once-on-enter moments, the hanging charms), and its cleanup restores the server frame, so React StrictMode's double
 * mount is safe. Every engine reads the head flag (`<html data-motion>`): with reduced motion or without JS the page
 * simply stays as the server drew it. Starting after load keeps the engines' style and layout work out of the load
 * (Total Blocking Time), since the server frame is already the first frame of every loop.
 */
export function LandingMotion() {
  useEffect(() => {
    let stop = () => {};
    let cancelIdle = () => {};
    const start = () => {
      const hero = mountHero(document.querySelector<HTMLElement>("[data-stage]"));
      const code = mountCode(document.querySelector<HTMLElement>("[data-code]"));
      const enter = mountEnter(document);
      const offCharms = mountCharms(document);
      // QA hooks for frame strips (motion-spec §11), next to the hand-off's
      const w = window as unknown as { __satchelMotion?: Record<string, unknown> };
      if (process.env.NODE_ENV !== "production") (w.__satchelMotion ??= {}).landing = { hero, code, enter };
      stop = () => {
        hero.destroy();
        code.destroy();
        enter.destroy();
        offCharms();
        if (w.__satchelMotion) delete w.__satchelMotion.landing;
      };
    };
    const whenIdle = () => {
      if (typeof window.requestIdleCallback === "function") {
        const id = window.requestIdleCallback(start, { timeout: 1500 });
        cancelIdle = () => window.cancelIdleCallback(id);
      } else {
        const id = setTimeout(start, 200);
        cancelIdle = () => clearTimeout(id);
      }
    };
    if (document.readyState === "complete") whenIdle();
    else window.addEventListener("load", whenIdle, { once: true });
    return () => {
      window.removeEventListener("load", whenIdle);
      cancelIdle();
      stop();
    };
  }, []);
  return null;
}
