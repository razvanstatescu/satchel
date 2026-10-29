import { afterEach, describe, expect, it } from "vitest";
import { inInertTree, MOTION_HEAD_SCRIPT, readMotionMode, REDUCED_MOTION_QUERY, subscribeMotionMode } from "@/lib/motion-flag";
import { THEME_HEAD_SCRIPT, THEME_KEY } from "@/lib/theme";

/**
 * The landing's motion flag (`lib/motion-flag.ts`; v4 §2.11 rule 2): the head script sets `<html data-js
 * data-motion="full|reduce">` before first paint, `readMotionMode`/`subscribeMotionMode` let the hero loop and the catch
 * story follow it live, and `inInertTree` keeps them still behind a dialog or the menu sheet. Split from the v3
 * motion-primitives tests, whose other cases leave with the v3 primitives (Tz).
 */

/** A fake <html> + window, enough to run the head scripts exactly as the browser would. */
function fakeBrowser(opts: { matchMedia?: "no-preference" | "reduce" | "missing" | "throws" } = {}) {
  const dataset: Record<string, string> = {};
  const document = { documentElement: { dataset }, querySelectorAll: () => [] };
  const listeners: ((e: { matches: boolean }) => void)[] = [];
  const mql = { matches: opts.matchMedia === "reduce", media: REDUCED_MOTION_QUERY, addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => void listeners.push(fn) };
  const queries: string[] = [];
  const window: Record<string, unknown> = {};
  if (opts.matchMedia === "throws") {
    window.matchMedia = () => {
      throw new Error("blocked");
    };
  } else if (opts.matchMedia !== "missing") {
    window.matchMedia = (q: string) => {
      queries.push(q);
      return mql;
    };
  }
  const flip = (reduce: boolean) => {
    mql.matches = reduce;
    listeners.forEach((fn) => fn({ matches: reduce }));
  };
  const store = new Map<string, string>();
  const localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
  return { document, window, dataset, flip, queries, localStorage, store };
}
const runScript = (script: string, b: ReturnType<typeof fakeBrowser>) => new Function("document", "window", "localStorage", script)(b.document, b.window, b.localStorage);

describe("motion head script (before first paint)", () => {
  it("flags <html data-js data-motion=full> when the OS allows motion, and follows a later change", () => {
    const b = fakeBrowser({ matchMedia: "no-preference" });
    runScript(MOTION_HEAD_SCRIPT, b);
    expect(b.dataset).toEqual({ js: "", motion: "full" });
    expect(b.queries).toEqual(["(prefers-reduced-motion: reduce)"]);
    b.flip(true);
    expect(b.dataset.motion).toBe("reduce");
    b.flip(false);
    expect(b.dataset.motion).toBe("full");
  });
  it("says reduce under prefers-reduced-motion", () => {
    const b = fakeBrowser({ matchMedia: "reduce" });
    runScript(MOTION_HEAD_SCRIPT, b);
    expect(b.dataset).toEqual({ js: "", motion: "reduce" });
  });
  it("without matchMedia it still flags JS and falls back to reduce (no motion is the safe default)", () => {
    const b = fakeBrowser({ matchMedia: "missing" });
    expect(() => runScript(MOTION_HEAD_SCRIPT, b)).not.toThrow();
    expect(b.dataset).toEqual({ js: "", motion: "reduce" });
  });
  it("never throws, even when matchMedia does (data-motion then stays absent, so no live layout can arm)", () => {
    const b = fakeBrowser({ matchMedia: "throws" });
    expect(() => runScript(MOTION_HEAD_SCRIPT, b)).not.toThrow();
    expect(b.dataset.motion).toBeUndefined();
  });
  it("runs after the theme script in the one inline <script> the root layout injects", () => {
    const b = fakeBrowser({ matchMedia: "no-preference" });
    b.store.set(THEME_KEY, "day");
    runScript(THEME_HEAD_SCRIPT + MOTION_HEAD_SCRIPT, b);
    expect(b.dataset).toEqual({ theme: "day", js: "", motion: "full" });
  });
});

describe("readMotionMode (client)", () => {
  const g = globalThis as unknown as { document?: unknown; window?: unknown };
  afterEach(() => {
    delete g.document;
    delete g.window;
  });
  it("reads <html data-motion>, falling back to the media query, then to reduce", () => {
    g.document = { documentElement: { dataset: { motion: "full" } } };
    g.window = {};
    expect(readMotionMode()).toBe("full");
    g.document = { documentElement: { dataset: { motion: "reduce" } } };
    g.window = { matchMedia: () => ({ matches: false }) };
    expect(readMotionMode()).toBe("reduce"); // the head flag wins over the media query
    g.document = { documentElement: { dataset: {} } };
    g.window = { matchMedia: () => ({ matches: false }) };
    expect(readMotionMode()).toBe("full");
    g.window = { matchMedia: () => ({ matches: true }) };
    expect(readMotionMode()).toBe("reduce");
    g.window = {};
    expect(readMotionMode()).toBe("reduce");
  });
  it("never throws: no document reads as reduce", () => {
    expect(readMotionMode()).toBe("reduce");
  });
});

describe("subscribeMotionMode (client)", () => {
  const g = globalThis as unknown as { document?: unknown; window?: unknown; MutationObserver?: unknown };
  afterEach(() => {
    delete g.document;
    delete g.window;
    delete g.MutationObserver;
  });

  it("is a no-op on the server", () => {
    const off = subscribeMotionMode(() => {
      throw new Error("never called");
    });
    expect(() => off()).not.toThrow();
  });

  it("calls back when <html data-motion> or the OS setting changes, and one call unsubscribes both", () => {
    const observers: { cb: () => void; target?: unknown; opts?: unknown; disconnected: boolean }[] = [];
    g.MutationObserver = class {
      rec: (typeof observers)[number];
      constructor(cb: () => void) {
        this.rec = { cb, disconnected: false };
        observers.push(this.rec);
      }
      observe(target: unknown, opts: unknown) {
        this.rec.target = target;
        this.rec.opts = opts;
      }
      disconnect() {
        this.rec.disconnected = true;
      }
    };
    const listeners = new Set<() => void>();
    const queries: string[] = [];
    const mql = { matches: false, addEventListener: (_: string, fn: () => void) => void listeners.add(fn), removeEventListener: (_: string, fn: () => void) => void listeners.delete(fn) };
    const root = { dataset: {} };
    g.document = { documentElement: root };
    g.window = { matchMedia: (q: string) => (queries.push(q), mql) };

    let calls = 0;
    const off = subscribeMotionMode(() => calls++);
    expect(observers).toHaveLength(1);
    expect(observers[0].target).toBe(root);
    expect(observers[0].opts).toEqual({ attributes: true, attributeFilter: ["data-motion"] });
    expect(queries).toEqual([REDUCED_MOTION_QUERY]);

    observers[0].cb(); // the head script flipped data-motion
    listeners.forEach((fn) => fn()); // the OS setting changed
    expect(calls).toBe(2);

    off();
    expect(observers[0].disconnected).toBe(true);
    expect(listeners.size).toBe(0);
  });
});

describe("inInertTree (nothing autoplays behind a dialog or the menu sheet)", () => {
  type Fake = { attrs: Record<string, string>; inert?: boolean; parentElement: Fake | null; hasAttribute(k: string): boolean; getAttribute(k: string): string | null };
  const node = (parent: Fake | null, attrs: Record<string, string> = {}, inert?: boolean): Fake => ({
    attrs,
    inert,
    parentElement: parent,
    hasAttribute(k) {
      return k in this.attrs;
    },
    getAttribute(k) {
      return this.attrs[k] ?? null;
    },
  });
  const is = (n: Fake | null) => inInertTree(n as unknown as Element);
  it("is false for a plain tree and for null", () => {
    const main = node(null);
    expect(is(node(node(main)))).toBe(false);
    expect(is(null)).toBe(false);
    expect(is(node(main, { "aria-hidden": "false" }))).toBe(false);
  });
  it("is true inside an inert or aria-hidden ancestor, or on the element itself (FlowShell sets both on the background)", () => {
    const bg = node(null, { inert: "", "aria-hidden": "true" });
    const stage = node(node(bg));
    expect(is(stage)).toBe(true);
    expect(is(node(null, { "aria-hidden": "true" }))).toBe(true);
    expect(is(node(node(null, { inert: "" })))).toBe(true);
    expect(is(node(node(null, {}, true)))).toBe(true); // the .inert property alone (browsers that only set the property)
  });
});
