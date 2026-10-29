/**
 * Theme (Satchel 2.0: Day first, whatever the OS; R12.3 keeps D-42 and this mechanism as is; kb/90 §8.10).
 *
 * Storage: localStorage["satchel:theme:v1"] = "day" | "night" | "system". Absent or junk means Day, whatever the OS:
 * "system" is the only way to follow the OS. The key is v3's, so a stored "night" or "day" stays valid.
 *
 * Before first paint, THEME_HEAD_SCRIPT (inlined in the root layout's <head>) resolves the choice, sets
 * `<html data-theme="day|night">` and rewrites every theme-color meta. It also registers one OS `change` listener that
 * re-reads storage and re-applies only while the stored choice is "system", so a later pick in the toggle always wins.
 * Without JS there is no data-theme, and the CSS defaults to Day (`:root { color-scheme: light }`, light-dark() tokens
 * with the Day value first; Night is `:root[data-theme="night"]`).
 */

export const THEME_KEY = "satchel:theme:v1";
/** The stored choice (the toggle's three options). */
export type Theme = "day" | "night" | "system";
/** What the page shows: `<html data-theme>`. */
export type ResolvedTheme = "day" | "night";
export const DARK_QUERY = "(prefers-color-scheme: dark)";
/**
 * The page ground per theme (brand 2.0 `ground`): `<meta name="theme-color">` (the head script and applyTheme rewrite
 * it) and the manifest. Keep in step with `--ground` in globals.css (the contrast unit test checks both).
 */
export const GROUND = { day: "#F6F5FB", night: "#120C26" } as const;

/** A stored value, or null when absent or junk (which then means Day). */
export function parseStoredTheme(v: string | null | undefined): Theme | null {
  return v === "day" || v === "night" || v === "system" ? v : null;
}

/** "night" → night; "system" → the OS; anything else (Day, absent, junk) → day. */
export function resolveTheme(choice: string | null | undefined, prefersDark: boolean): ResolvedTheme {
  return choice === "night" || (choice === "system" && prefersDark) ? "night" : "day";
}

/**
 * The inline head script. It must run before any paint and never throw (private modes throw on localStorage, and some
 * embeds lack matchMedia). Dependency-free and tiny; it mirrors parseStoredTheme + resolveTheme, and the unit tests run
 * it against a fake document exactly as the browser would.
 */
export const THEME_HEAD_SCRIPT = `(function(){var d=document.documentElement,k=${JSON.stringify(THEME_KEY)},m=null;try{m=window.matchMedia?window.matchMedia(${JSON.stringify(DARK_QUERY)}):null;}catch(e){}var r=function(){try{return localStorage.getItem(k);}catch(e){return null;}};var a=function(t){try{var n=t==="night"||(t==="system"&&!!m&&m.matches)?"night":"day";d.dataset.theme=n;var c=n==="night"?${JSON.stringify(GROUND.night)}:${JSON.stringify(GROUND.day)};var x=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<x.length;i++){x[i].setAttribute("content",c);}}catch(e){}};a(r());try{if(m){var f=function(){var t=r();if(t==="system"){a(t);}};if(m.addEventListener){m.addEventListener("change",f);}else if(m.addListener){m.addListener(f);}}}catch(e){}})();`;

/** The stored choice (client). Absent, junk or unreadable storage means Day. */
export function readTheme(): Theme {
  try {
    return parseStoredTheme(localStorage.getItem(THEME_KEY)) ?? "day";
  } catch {
    return "day";
  }
}

/** Does the OS ask for dark? False wherever matchMedia is missing (the server, tests, old embeds). */
function prefersDark(doc: Document): boolean {
  try {
    const view = doc.defaultView ?? (typeof window === "undefined" ? undefined : window);
    return typeof view?.matchMedia === "function" && view.matchMedia(DARK_QUERY).matches;
  } catch {
    return false;
  }
}

/**
 * Apply a choice in place with no reload: store it (all three values, "system" included, so the head script's listener
 * keeps following the OS), then set `data-theme` and every theme-color meta to the resolved theme.
 */
export function applyTheme(theme: Theme, doc: Document = document): ResolvedTheme {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private mode: still apply for this page */
  }
  const resolved = resolveTheme(theme, prefersDark(doc));
  doc.documentElement.dataset.theme = resolved;
  doc.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", GROUND[resolved]));
  return resolved;
}
