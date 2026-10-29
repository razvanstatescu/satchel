/**
 * The landing's motion flag (landing v4 build spec §2.11 rule 2).
 *
 * The root layout injects MOTION_HEAD_SCRIPT right after THEME_HEAD_SCRIPT, in the same inline <script>. Before first
 * paint it sets `<html data-js>` and `data-motion="full" | "reduce"` from the reduced-motion media query, and keeps
 * `data-motion` live when the OS setting changes. It never hides anything and never throws: with scripting off neither
 * attribute exists, so the CSS shows the static frames. The figures' live layouts (the hero loop's caption ticker, the
 * catch story's sticky desk) are gated in CSS on `:root[data-motion="full"]` from first paint, so hydration never swaps
 * layouts, and their engines read the mode here (readMotionMode / subscribeMotionMode) rather than their own query.
 * Without matchMedia it says "reduce": no motion is the safe default.
 */

export type MotionMode = "static" | "reduce" | "full";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** The inline head script. Dependency-free and tiny; `window`/`document` are the only globals it touches. */
export const MOTION_HEAD_SCRIPT = `(function(){try{var d=document.documentElement;d.dataset.js="";var m=window.matchMedia?window.matchMedia(${JSON.stringify(REDUCED_MOTION_QUERY)}):null;var s=function(){d.dataset.motion=m&&!m.matches?"full":"reduce";};s();if(m){if(m.addEventListener){m.addEventListener("change",s);}else if(m.addListener){m.addListener(s);}}}catch(e){}})();`;

/**
 * The current mode (client only). `<html data-motion>` is the source of truth, so JS and the CSS gates always agree;
 * the media query is only a fallback for a page where the head script didn't run.
 */
export function readMotionMode(): "reduce" | "full" {
  try {
    const v = document.documentElement.dataset.motion;
    if (v === "full" || v === "reduce") return v;
    const m = typeof window.matchMedia === "function" ? window.matchMedia(REDUCED_MOTION_QUERY) : null;
    return m && !m.matches ? "full" : "reduce";
  } catch {
    return "reduce";
  }
}

/**
 * True when `el` sits in an inert or aria-hidden subtree (itself included), e.g. the whole landing behind the /mint
 * dialog (FlowShell marks the background `inert` + `aria-hidden="true"`), or behind the landing's menu sheet. The hero
 * loop pauses and a catch frame never plays in such a tree: nothing autoplays behind a modal. The `.inert` property also
 * catches browsers that only set the property.
 */
export function inInertTree(el: Element | null): boolean {
  for (let n: Element | null = el; n; n = n.parentElement) {
    if (n.hasAttribute("inert") || n.getAttribute("aria-hidden") === "true" || (n as HTMLElement).inert === true) return true;
  }
  return false;
}

/** Calls `cb` when `<html data-motion>` changes (or, without the head flag, when the media query does). */
export function subscribeMotionMode(cb: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  const offs: (() => void)[] = [];
  if (typeof MutationObserver !== "undefined") {
    const mo = new MutationObserver(cb);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    offs.push(() => mo.disconnect());
  }
  if (typeof window.matchMedia === "function") {
    const m = window.matchMedia(REDUCED_MOTION_QUERY);
    if (typeof m.addEventListener === "function") {
      m.addEventListener("change", cb);
      offs.push(() => m.removeEventListener("change", cb));
    }
  }
  return () => offs.forEach((off) => off());
}
