"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import { copy } from "@/lib/copy";
import { readMotionMode } from "@/lib/motion-flag";
import { FlowPanel, type FlowHead } from "@/components/ui";
import { toast, usePinnedBar } from "@/components/client/Toaster";

/**
 * FlowShell (kb/80 R3; D-26 as amended by D-36; design-system-impl §4.8; motion-spec §4): flows are real routes
 * PRESENTED as a bottom sheet below 768 px and a centred 480 px dialog from 768 px, over the Satchel page that the
 * route renders itself.
 *
 * Behaviour (unchanged from v4): positioned by CSS, so it is server-rendered and visible without JS. With JS the
 * background is inert + aria-hidden, focus moves to the title and is trapped, Esc closes (or minimizes while signing),
 * and close REPLACES the URL with `closeHref` (never history.back). No drag-to-dismiss (WCAG 2.5.7): the grabber is
 * decorative.
 *
 * `fill` (opt-in) gives the sheet its full height below 768 px, so a multi-step flow's top edge stays still.
 *
 * Motion: a sheet rises (360 ms, the drawer curve) and a dialog fades and settles (240 ms); Close and Esc play the exit
 * (240 / 160 ms), then replace the URL. Reduced motion: a 150 ms fade. A flow opened by a full page load renders
 * already open (its server HTML is the end state); only a client navigation animates it in.
 */

const SHEET_MQ = "(max-width: 47.99rem)";
const EASE_SHEET = "cubic-bezier(.32,.72,0,1)";
const EASE_OUT = "cubic-bezier(.2,0,0,1)";
const EASE_IN = "cubic-bezier(.3,0,1,1)";
const EASE_SHEET_OUT = "cubic-bezier(.32,0,.67,0)";

const noop = () => () => {};
/** False while hydrating server HTML, true for a mount after it (a client navigation). */
const useMountedAfterHydration = () => useSyncExternalStore(noop, () => true, () => false);

type Phase = "in" | "out";

function play(panel: HTMLElement, scrim: HTMLElement | null, phase: Phase): Promise<void> {
  if (typeof panel.animate !== "function") return Promise.resolve();
  const reduce = readMotionMode() === "reduce";
  const sheet = window.matchMedia?.(SHEET_MQ).matches ?? true;
  const fade = (dir: Phase) => (dir === "in" ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }]);
  const anims: Animation[] = [];
  if (reduce) {
    anims.push(panel.animate(fade(phase), { duration: 150, easing: "linear", fill: "both" }));
    if (scrim) anims.push(scrim.animate(fade(phase), { duration: 150, easing: "linear", fill: "both" }));
  } else if (sheet) {
    const rise = [{ translate: "0 100%" }, { translate: "0 0" }];
    anims.push(
      panel.animate(phase === "in" ? rise : [...rise].reverse(), {
        duration: phase === "in" ? 360 : 240,
        easing: phase === "in" ? EASE_SHEET : EASE_SHEET_OUT,
        fill: "both",
      }),
    );
    if (scrim) anims.push(scrim.animate(fade(phase), { duration: phase === "in" ? 240 : 200, easing: "linear", fill: "both" }));
  } else if (phase === "in") {
    anims.push(panel.animate(fade("in"), { duration: 140, easing: "linear", fill: "both" }));
    anims.push(panel.animate([{ scale: "0.96", translate: "0 12px" }, { scale: "1", translate: "0 0" }], { duration: 240, easing: EASE_OUT, fill: "both" }));
    if (scrim) anims.push(scrim.animate(fade("in"), { duration: 200, easing: "linear", fill: "both" }));
  } else {
    anims.push(panel.animate([{ opacity: 1, scale: "1" }, { opacity: 0, scale: "0.98" }], { duration: 160, easing: EASE_IN, fill: "both" }));
    if (scrim) anims.push(scrim.animate(fade("out"), { duration: 200, easing: "linear", fill: "both" }));
  }
  return Promise.all(anims.map((a) => a.finished)).then(
    () => {
      // the static CSS is the end state: an entrance cancels itself; an exit holds until the route unmounts the sheet
      if (phase === "in") anims.forEach((a) => a.cancel());
    },
    () => undefined,
  );
}

/**
 * The background lock, shared by every open shell. Next keeps a closed flow's route alive (hidden, in `<Activity>`)
 * and effects of two shells can run out of order (one flow opening another), so a shell never "restores what it saw":
 * each locked element is counted, and only the last shell out unlocks it (and the body's scroll).
 */
const marks = new Map<Element, { n: number; hidden: string | null; inert: boolean }>();
let scrollLocks = 0;
let scrollBefore = "";

function lockSibling(el: Element) {
  const m = marks.get(el);
  if (m) {
    m.n++;
    return;
  }
  const h = el as HTMLElement;
  marks.set(el, { n: 1, hidden: el.getAttribute("aria-hidden"), inert: h.inert });
  h.inert = true;
  el.setAttribute("aria-hidden", "true");
}

function unlockSibling(el: Element) {
  const m = marks.get(el);
  if (!m) return;
  if (--m.n > 0) return;
  marks.delete(el);
  (el as HTMLElement).inert = m.inert;
  if (m.hidden === null) el.removeAttribute("aria-hidden");
  else el.setAttribute("aria-hidden", m.hidden);
}

function lockScroll() {
  if (scrollLocks++ === 0) {
    scrollBefore = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
}

function unlockScroll() {
  if (scrollLocks > 0 && --scrollLocks === 0) document.body.style.overflow = scrollBefore;
}

export function FlowShell({ testId, ...head }: FlowHead & { testId?: string }) {
  const { closeHref, minimize = false, action } = head;
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLAnchorElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const minimizeRef = useRef(minimize);
  const closingRef = useRef(false);
  const [scrolled, setScrolled] = useState(false);
  const mountedAfterHydration = useMountedAfterHydration();
  const [enterAnimated] = useState(mountedAfterHydration); // fixed at the first render
  usePinnedBar(footRef, Boolean(action), { below: 768 }); // the foot is pinned only while it's a bottom sheet

  useEffect(() => {
    minimizeRef.current = minimize;
  }, [minimize]);

  /** Close: the exit plays, then the URL is replaced (Back unmounts at once). Minimizing also says so in a toast. */
  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (minimizeRef.current) toast(copy.sign.minimized, { tone: "progress" });
    const panel = panelRef.current;
    const done = () => router.replace(closeHref);
    if (!panel) return done();
    void play(panel, scrimRef.current, "out").then(done);
  }, [closeHref, router]);

  // The entrance, only for a client navigation (a full page load renders the end state).
  useLayoutEffect(() => {
    if (!enterAnimated || !panelRef.current) return;
    void play(panelRef.current, scrimRef.current, "in");
  }, [enterAnimated]);

  // Shown again after being hidden (Next reuses a closed flow's route): start fresh, not mid-exit. A kept exit
  // animation would leave an invisible panel over the scrim, and a kept `closing` flag would make Close do nothing.
  useLayoutEffect(() => {
    closingRef.current = false;
    for (const el of [panelRef.current, scrimRef.current]) el?.getAnimations?.().forEach((a) => a.cancel());
  }, []);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    // inert background: every sibling along the path from the shell to <body> (counted; see `marks`)
    const touched: Element[] = [];
    let node: Element | null = root;
    while (node && node !== document.body) {
      const parent: Element | null = node.parentElement;
      if (parent) {
        for (const sib of Array.from(parent.children)) {
          if (sib === node || sib.tagName === "SCRIPT" || sib.hasAttribute("data-flow-keep")) continue;
          touched.push(sib);
          lockSibling(sib);
        }
      }
      node = parent;
    }
    // this shell's own path must never stay locked by another shell's earlier pass
    for (let n: Element | null = root; n && n !== document.body; n = n.parentElement) {
      const m = marks.get(n);
      if (m) {
        marks.delete(n);
        (n as HTMLElement).inert = m.inert;
        if (m.hidden === null) n.removeAttribute("aria-hidden");
        else n.setAttribute("aria-hidden", m.hidden);
      }
    }
    titleRef.current?.focus();
    lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "Tab") {
        const f = root.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const list = Array.from(f).filter((x) => !x.hasAttribute("disabled") && x.offsetParent !== null);
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      unlockScroll();
      for (const el of touched) unlockSibling(el);
    };
  }, [close]);

  // The foot's top line shows only while content scrolls under it.
  useEffect(() => {
    const body = bodyRef.current;
    if (!body || !action) return;
    const update = () => setScrolled(body.scrollHeight - body.scrollTop - body.clientHeight > 1);
    update();
    body.addEventListener("scroll", update, { passive: true });
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    ro?.observe(body);
    if (body.firstElementChild) ro?.observe(body.firstElementChild);
    return () => {
      body.removeEventListener("scroll", update);
      ro?.disconnect();
    };
  }, [action]);

  const onCloseClick = (e: MouseEvent) => {
    // a plain click plays the exit, then replaces; modified clicks (and no JS) just follow the link
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    close();
  };

  return (
    <div ref={ref} data-flow-shell data-testid={testId}>
      <Link ref={scrimRef} href={closeHref} replace onClick={onCloseClick} data-local-nav="" className="fixed inset-0 z-60 bg-scrim" aria-hidden="true" tabIndex={-1} />
      <FlowPanel {...head} scrolled={scrolled} onCloseClick={onCloseClick} panelRef={panelRef} titleRef={titleRef} bodyRef={bodyRef} footRef={footRef} />
    </div>
  );
}
