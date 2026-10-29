import { mergeTracks, toKeyframes } from "@/lib/motion/play";
import { inInertTree, readMotionMode, subscribeMotionMode } from "@/lib/motion-flag";
import { actAt, heroTracks, START_AT, T, travel, type HeroKey } from "./timeline";

/**
 * The hero loop's engine (motion-spec §10, §0 rule 8; the v4 engine's mount, pause and inert logic on the 2.0 data). It
 * never renders: it animates the server-rendered stage (HeroStage.tsx) in place with WAAPI, on one clock, and stop()
 * cancels everything, so the page rests on the server frame again (React StrictMode's double mount is safe).
 *
 * - It plays only with full motion (`<html data-motion="full">`, the head flag, live with the OS setting).
 * - It mounts at START_AT, the frame the server HTML already shows: hydration changes nothing visible.
 * - It pauses on its Pause button (WCAG 2.2.2), below 20 % visibility, on a hidden tab and in an inert tree (a dialog or
 *   the menu sheet over the page). The button is visible only while the loop is live (`data-live`).
 * - The steps list keeps `aria-current` and `data-done` on the act that shows, for assistive tech.
 * - A resize rebuilds the tracks at the current time (the card's travel depends on the scene's width).
 */

export interface HeroHandle {
  /** Resume (clears the user's pause). */
  play(): void;
  /** Pause, as the button does. */
  pause(): void;
  /** Jump to `ms` and hold there until play() (QA, frame strips). */
  seek(ms: number): void;
  /** The loop's time in ms, or null when it isn't live. */
  time(): number | null;
  /** Stop everything and restore the server frame. */
  destroy(): void;
}

const NOOP: HeroHandle = { play() {}, pause() {}, seek() {}, time: () => null, destroy() {} };

/** The steps list as the server frame draws it: acts 1 and 2 done, act 3 current. */
const REST_ACT = 3;

export function mountHero(fig: HTMLElement | null): HeroHandle {
  if (!fig || typeof window === "undefined") return NOOP;
  const root = fig;
  const scene = root.querySelector<HTMLElement>("[data-scene]");
  const card = root.querySelector<HTMLElement>('[data-k="card"]');
  const btn = root.querySelector<HTMLButtonElement>("[data-pause]");
  const steps = [...root.querySelectorAll<HTMLElement>("[data-step]")];
  const q = (k: HeroKey) => root.querySelector<HTMLElement>(`[data-k="${k}"]`);

  let anims: Animation[] = [];
  let userPaused = false;
  /** Held by seek() (QA, frame strips) until play(). */
  let held = false;
  let onScreen = true;
  let inert = inInertTree(root);
  let destroyed = false;
  let raf = 0;
  let act = REST_ACT;
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;

  const isPaused = () => userPaused || held || !onScreen || inert || document.hidden;
  const now = () => (anims.length ? Number(anims[0].currentTime ?? 0) : 0);

  function setAct(n: number) {
    if (n === act) return;
    act = n;
    root.setAttribute("data-act", String(n));
    steps.forEach((li, i) => {
      li.toggleAttribute("data-done", i + 1 < n);
      if (i + 1 === n) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    });
  }

  function watch() {
    raf = 0;
    if (!anims.length) return;
    setAct(actAt(now()));
    if (!isPaused()) raf = requestAnimationFrame(watch);
  }

  /** Apply the paused state to every animation, on one clock. */
  function sync() {
    const paused = isPaused();
    root.toggleAttribute("data-paused", paused && anims.length > 0);
    if (!anims.length) return;
    const t0 = now();
    for (const a of anims) {
      if (paused) a.pause();
      else {
        a.currentTime = t0;
        a.play();
      }
    }
    if (!paused && !raf) raf = requestAnimationFrame(watch);
  }

  function stop() {
    for (const a of anims) a.cancel();
    anims = [];
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    root.removeAttribute("data-live");
    root.removeAttribute("data-paused");
    setAct(REST_ACT);
  }

  function start(t: number) {
    stop();
    if (destroyed || readMotionMode() !== "full" || typeof root.animate !== "function" || !scene || !card) return;
    // the one layout read: how far the card can travel and still swing inside the sky field
    const dx = travel({
      sceneWidth: scene.clientWidth,
      cardWidth: card.offsetWidth,
      cardLeft: card.offsetLeft,
      cardHeight: card.offsetHeight,
      fieldPadRight: parseFloat(getComputedStyle(root).paddingRight) || 0,
    });
    for (const tr of mergeTracks(heroTracks(q, dx))) {
      if (!tr.el || typeof tr.el.animate !== "function" || !tr.frames.length) continue;
      const a = tr.el.animate(toKeyframes(tr.frames, tr.prop, T), { duration: T, iterations: Infinity, fill: "both", easing: "linear" });
      a.currentTime = t;
      anims.push(a);
    }
    root.setAttribute("data-live", "");
    setAct(actAt(t));
    sync();
  }

  const onToggle = () => {
    userPaused = !userPaused;
    btn?.setAttribute("aria-pressed", String(userPaused));
    sync();
  };
  btn?.addEventListener("click", onToggle);

  const io =
    typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(
          (entries) => {
            const e = entries[entries.length - 1];
            onScreen = e.isIntersecting && e.intersectionRatio >= 0.2;
            sync();
          },
          { threshold: [0, 0.2] },
        );
  io?.observe(root);

  const onVisibility = () => sync();
  document.addEventListener("visibilitychange", onVisibility);

  // A dialog or the menu sheet over the page marks the background inert + aria-hidden: nothing autoplays behind it.
  const recheckInert = () => {
    const nowInert = inInertTree(root);
    if (nowInert !== inert) {
      inert = nowInert;
      sync();
    }
  };
  const mo = typeof MutationObserver === "undefined" ? null : new MutationObserver(recheckInert);
  mo?.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["inert", "aria-hidden"] });
  // a dialog rendered in the same commit sets `inert` in its own effect, after this one: look again next frame
  const firstFrame = requestAnimationFrame(recheckInert);

  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (anims.length) start(now() % T);
    }, 200);
  };
  window.addEventListener("resize", onResize, { passive: true });

  // The OS setting applies live (the head flag follows it): full motion plays from the server frame, reduce stops.
  const offMotion = subscribeMotionMode(() => {
    if (readMotionMode() === "full") {
      if (!anims.length) start(START_AT);
    } else stop();
  });

  start(START_AT);

  return {
    play() {
      userPaused = false;
      held = false;
      btn?.setAttribute("aria-pressed", "false");
      sync();
    },
    pause() {
      userPaused = true;
      btn?.setAttribute("aria-pressed", "true");
      sync();
    },
    seek(ms) {
      if (!anims.length) return;
      held = true;
      const t = ((ms % T) + T) % T;
      for (const a of anims) {
        a.pause();
        a.currentTime = t;
      }
      setAct(actAt(t));
    },
    time: () => (anims.length ? now() : null),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      clearTimeout(resizeTimer);
      cancelAnimationFrame(firstFrame);
      io?.disconnect();
      mo?.disconnect();
      offMotion();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      btn?.removeEventListener("click", onToggle);
      btn?.setAttribute("aria-pressed", "false");
    },
  };
}
