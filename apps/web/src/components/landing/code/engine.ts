import { mergeTracks, toKeyframes } from "@/lib/motion/play";
import { inInertTree, readMotionMode, subscribeMotionMode } from "@/lib/motion-flag";
import { codeTracks, START_AT, T, type CodeKey } from "./timeline";

/**
 * Trust, dev's code-card loop engine (site polish round §2.5; `hero/engine.ts` without the hero-only parts: no
 * `travel`, no acts or steps list, no resize rebuild — the lines are a fixed 24 px, so nothing depends on width). It
 * never renders: it animates the server-rendered card (`CodeCard`) in place with WAAPI, on one clock, and `destroy()`
 * cancels everything, so the page rests on the server frame again (React StrictMode's double mount is safe).
 *
 * - It plays only with full motion (`<html data-motion="full">`).
 * - It mounts at `START_AT`, the frame the server HTML already shows: hydration changes nothing visible.
 * - It sets `data-live` on the field (Pause shows) and pauses on Pause (`aria-pressed`), below 20 % visible, on a
 *   hidden tab and in an inert tree (a dialog or the menu sheet over the page).
 * - It follows `subscribeMotionMode` live, and `destroy()` restores the server frame.
 */

export interface CodeHandle {
  play(): void;
  pause(): void;
  seek(ms: number): void;
  time(): number | null;
  destroy(): void;
}

const NOOP: CodeHandle = { play() {}, pause() {}, seek() {}, time: () => null, destroy() {} };

export function mountCode(field: HTMLElement | null): CodeHandle {
  if (!field || typeof window === "undefined") return NOOP;
  const root = field;
  const btn = root.querySelector<HTMLButtonElement>("[data-code-pause]");
  const q = (k: CodeKey) => root.querySelector<HTMLElement>(`[data-k="${k}"]`);

  let anims: Animation[] = [];
  let userPaused = false;
  let held = false;
  let onScreen = true;
  let inert = inInertTree(root);
  let destroyed = false;

  const isPaused = () => userPaused || held || !onScreen || inert || document.hidden;
  const now = () => (anims.length ? Number(anims[0].currentTime ?? 0) : 0);

  function sync() {
    const paused = isPaused();
    if (!anims.length) return;
    const t0 = now();
    for (const a of anims) {
      if (paused) a.pause();
      else {
        a.currentTime = t0;
        a.play();
      }
    }
  }

  function stop() {
    for (const a of anims) a.cancel();
    anims = [];
    root.removeAttribute("data-live");
  }

  function start(t: number) {
    stop();
    if (destroyed || readMotionMode() !== "full" || typeof root.animate !== "function") return;
    for (const tr of mergeTracks(codeTracks(q))) {
      if (!tr.el || typeof tr.el.animate !== "function" || !tr.frames.length) continue;
      const a = tr.el.animate(toKeyframes(tr.frames, tr.prop, T), { duration: T, iterations: Infinity, fill: "both", easing: "linear" });
      a.currentTime = t;
      anims.push(a);
    }
    root.setAttribute("data-live", "");
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

  const recheckInert = () => {
    const nowInert = inInertTree(root);
    if (nowInert !== inert) {
      inert = nowInert;
      sync();
    }
  };
  const mo = typeof MutationObserver === "undefined" ? null : new MutationObserver(recheckInert);
  mo?.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["inert", "aria-hidden"] });
  const firstFrame = requestAnimationFrame(recheckInert);

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
    },
    time: () => (anims.length ? now() : null),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      cancelAnimationFrame(firstFrame);
      io?.disconnect();
      mo?.disconnect();
      offMotion();
      document.removeEventListener("visibilitychange", onVisibility);
      btn?.removeEventListener("click", onToggle);
      btn?.setAttribute("aria-pressed", "false");
    },
  };
}
