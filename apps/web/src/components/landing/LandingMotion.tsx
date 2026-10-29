"use client";

import { useEffect } from "react";
import { mountHero } from "@/components/landing/hero/engine";
import { mountCharms } from "@/components/landing/motion/charms";
import { mountEnter } from "@/components/landing/motion/enter";

/**
 * The landing's one client island for motion (R10: WAAPI and CSS only, no `motion` import). It renders nothing: after
 * hydration it upgrades the server-rendered page in place (the hero loop, the once-on-enter moments, the hanging
 * charms), and its cleanup restores the server frame, so React StrictMode's double mount is safe. Every engine reads the
 * head flag (`<html data-motion>`): with reduced motion or without JS the page simply stays as the server drew it.
 */
export function LandingMotion() {
  useEffect(() => {
    const hero = mountHero(document.querySelector<HTMLElement>("[data-stage]"));
    const enter = mountEnter(document);
    const offCharms = mountCharms(document);
    // QA hooks for frame strips (motion-spec §11), next to the hand-off's
    const w = window as unknown as { __satchelMotion?: Record<string, unknown> };
    if (process.env.NODE_ENV !== "production") (w.__satchelMotion ??= {}).landing = { hero, enter };
    return () => {
      hero.destroy();
      enter.destroy();
      offCharms();
      if (w.__satchelMotion) delete w.__satchelMotion.landing;
    };
  }, []);
  return null;
}
