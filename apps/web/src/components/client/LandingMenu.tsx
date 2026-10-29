"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { CircleQuestionMark, Menu, Route, ShieldCheck, X, type LucideIcon } from "lucide-react";
import { copy } from "@/lib/copy";
import { readMotionMode } from "@/lib/motion-flag";
import { EASE, play, type Track } from "@/lib/motion/play";
import { Icon, IconButton } from "@/components/ui";
import { MENU_ROW, MenuNavRows } from "@/components/client/NavLinks";

/**
 * The one overlay-sheet pattern of the shell (design-spec §3.3; motion-spec §4): the menu sheet on both surfaces and
 * the account sheet below 768 px. A bottom sheet below 768 px, a centred 480 px dialog from 768.
 *
 * Behaviour: portalled to <body>; every other child of <body> is `inert` + `aria-hidden` while it is open (the one
 * status region, `[data-flow-keep]`, stays live); focus moves in, Tab is trapped, Esc / the close button / the scrim
 * close it and return focus to the button that opened it; a navigation closes it without moving focus back. The page
 * doesn't scroll behind it. No drag-to-dismiss (WCAG 2.5.7): the grabber is decorative.
 *
 * Motion: the sheet rises (360 ms, the drawer curve) or the dialog settles (240 ms); the exit plays (240 / 160 ms)
 * before it unmounts. Reduced motion: a 150 ms fade.
 */

export type CloseReason = "dismiss" | "navigate";

const SHEET_MQ = "(max-width: 47.99rem)";

function overlayMotion(panel: Element, scrim: Element | null, phase: "in" | "out") {
  const reduce = readMotionMode() === "reduce";
  const sheet = typeof window.matchMedia === "function" ? window.matchMedia(SHEET_MQ).matches : true;
  const fade = (from: number, to: number, ms: number, easing: string = EASE.out): Track<Element>["frames"] => [
    [0, from, easing],
    [ms, to],
  ];
  let tracks: Track<Element>[];
  let T: number;
  if (reduce) {
    T = 150;
    tracks = [
      { el: panel, prop: "opacity", frames: phase === "in" ? fade(0, 1, 150) : fade(1, 0, 150, EASE.in) },
      { el: scrim, prop: "opacity", frames: phase === "in" ? fade(0, 1, 150, "linear") : fade(1, 0, 150, "linear") },
    ];
  } else if (!sheet && phase === "in") {
    T = 240;
    tracks = [
      { el: panel, prop: "opacity", frames: fade(0, 1, 140, "linear") },
      { el: panel, prop: "scale", frames: [[0, "0.96", EASE.out], [240, "1"]] },
      { el: panel, prop: "translate", frames: [[0, "0 12px", EASE.out], [240, "0 0"]] },
      { el: scrim, prop: "opacity", frames: fade(0, 1, 200, "linear") },
    ];
  } else if (!sheet) {
    T = 160;
    tracks = [
      { el: panel, prop: "opacity", frames: fade(1, 0, 160, EASE.in) },
      { el: panel, prop: "scale", frames: [[0, "1", EASE.in], [160, "0.98"]] },
      { el: scrim, prop: "opacity", frames: fade(1, 0, 160, "linear") },
    ];
  } else if (phase === "in") {
    T = 360;
    tracks = [
      { el: panel, prop: "translate", frames: [[0, "0 100%", EASE.sheet], [360, "0 0"]] },
      { el: scrim, prop: "opacity", frames: fade(0, 1, 240, "linear") },
    ];
  } else {
    T = 240;
    tracks = [
      { el: panel, prop: "translate", frames: [[0, "0 0", "cubic-bezier(.32, 0, .67, 0)"], [240, "0 100%"]] },
      { el: scrim, prop: "opacity", frames: fade(1, 0, 200, "linear") },
    ];
  }
  // an exit holds its last frame until the sheet unmounts; an entrance cancels itself and rests on the static CSS
  return play(tracks, T, { keep: phase === "out" });
}

/** Closes the sheet from inside it: links pass "navigate", so focus doesn't jump back to the opener. */
const SheetClose = createContext<(reason: CloseReason) => void>(() => {});
export const useSheetClose = () => useContext(SheetClose);

/** The open sheets, newest last: only the top one handles keys (the picker can open over the menu sheet). */
const openSheets: symbol[] = [];

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export interface ModalSheetProps {
  open: boolean;
  onClose: (reason: CloseReason) => void;
  /** The head's content (the title); the close button is added after it. */
  head: ReactNode;
  /** The dialog's name: the id of an element in `head`, or a string. */
  labelledBy?: string;
  label?: string;
  closeLabel: string;
  /** Where focus goes on open (default: the first focusable element). */
  initialFocus?: RefObject<HTMLElement | null>;
  /** The button that opened it: focus returns there after a dismissal. */
  returnFocus: RefObject<HTMLElement | null>;
  /**
   * False while another window sits over the sheet (a wallet's own sign-in UI, which near-connect appends to the body
   * after the sheet): Tab is no longer held in the sheet, so it moves on into that window, and `aria-modal` drops so a
   * screen reader can reach it too. Default true.
   */
  modal?: boolean;
  children: ReactNode;
  testId?: string;
}

export function ModalSheet({ open, onClose, head, labelledBy, label, closeLabel, initialFocus, returnFocus, modal = true, children, testId }: ModalSheetProps) {
  // Mounted while open and while its exit plays.
  const [present, setPresent] = useState(open);
  if (open && !present) setPresent(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const lastReason = useRef<CloseReason>("dismiss");
  const close = useCallback(
    (reason: CloseReason) => {
      lastReason.current = reason;
      onClose(reason);
    },
    [onClose],
  );
  // the key handler reads the latest close and modality without re-running the open/close effect below
  const closeRef = useRef(close);
  const modalRef = useRef(modal);
  useEffect(() => {
    closeRef.current = close;
    modalRef.current = modal;
  }, [close, modal]);

  // the entrance, the moment it mounts
  useLayoutEffect(() => {
    if (!open || !present || !panelRef.current) return;
    lastReason.current = "dismiss";
    const h = overlayMotion(panelRef.current, scrimRef.current, "in");
    return () => h.cancel();
  }, [open, present]);

  // the exit, then unmount
  useEffect(() => {
    if (open || !present) return;
    const panel = panelRef.current;
    if (!panel) {
      setPresent(false);
      return;
    }
    let live = true;
    void overlayMotion(panel, scrimRef.current, "out").finished.then(() => live && setPresent(false));
    return () => {
      live = false;
    };
  }, [open, present]);

  // inert background, focus in and trapped, Esc, scroll lock; on unmount everything is restored, then focus returns
  useEffect(() => {
    if (!present) return;
    const panel = panelRef.current;
    const opener = returnFocus.current; // the button that opened it (it stays mounted while the sheet is open)
    const host = panel?.closest("[data-sheet-root]");
    const touched: { el: HTMLElement; inert: boolean; hidden: string | null }[] = [];
    for (const el of Array.from(document.body.children) as HTMLElement[]) {
      if (el === host || el.tagName === "SCRIPT" || el.hasAttribute("data-flow-keep")) continue;
      touched.push({ el, inert: el.inert, hidden: el.getAttribute("aria-hidden") });
      el.inert = true;
      el.setAttribute("aria-hidden", "true");
    }
    (initialFocus?.current ?? panel?.querySelector<HTMLElement>(FOCUSABLE))?.focus();
    const me = Symbol("sheet");
    openSheets.push(me);
    // Capture phase on window, and the event stops here: a sheet opened over a flow (a guard's Connect) owns Esc and
    // Tab, so the FlowShell underneath never sees them.
    const onKey = (e: KeyboardEvent) => {
      if (openSheets[openSheets.length - 1] !== me) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeRef.current("dismiss");
      } else if (e.key === "Tab" && panel && modalRef.current) {
        e.stopPropagation();
        const list = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((x) => x.offsetParent !== null);
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey, true);
      openSheets.splice(openSheets.indexOf(me), 1);
      document.body.style.overflow = prevOverflow;
      for (const t of touched) {
        t.el.inert = t.inert;
        if (t.hidden === null) t.el.removeAttribute("aria-hidden");
        else t.el.setAttribute("aria-hidden", t.hidden);
      }
      // it was on screen when pressed and the page couldn't scroll since: never scroll to it (a sticky bar's button would
      // otherwise send the page ~400 px up, see globals.css §8)
      if (lastReason.current === "dismiss") opener?.focus({ preventScroll: true });
    };
    // once per opening (the refs are stable objects)
  }, [present, initialFocus, returnFocus]);

  if (!present) return null;
  return createPortal(
    <div data-sheet-root="" data-testid={testId}>
      <div ref={scrimRef} className="fixed inset-0 z-60 bg-scrim" onClick={() => close("dismiss")} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal={modal || undefined}
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : label}
        className="fixed inset-x-0 bottom-0 z-61 flex max-h-[calc(100dvh-16px)] flex-col rounded-t-card border border-b-0 border-overlay-edge bg-surface text-ink shadow-overlay md:inset-0 md:m-auto md:h-fit md:max-h-[calc(100dvh-96px)] md:w-flow md:rounded-card md:border-b"
      >
        <div aria-hidden="true" className="mx-auto mt-2 h-1.25 w-10 flex-none rounded-[3px] bg-line-strong md:hidden" />
        <div className="flex flex-none items-start gap-2 px-5 pt-4 pb-2 md:pt-5">
          <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1.5">{head}</div>
          <IconButton icon={X} label={closeLabel} onClick={() => close("dismiss")} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pt-2 pb-[calc(20px+env(safe-area-inset-bottom))] *:shrink-0 md:pb-6">
          <SheetClose.Provider value={close}>{children}</SheetClose.Provider>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── The menu sheet ───────────────────────────────────────────────────────────────────────────────────────────────── */

export interface PageAnchor {
  href: string;
  label: string;
}

/** An in-page link's icon in the landing's menu sheet (the rows keep one rhythm with the app rows). */
const ANCHOR_ICON: Record<string, LucideIcon> = { "#how": Route, "#clean": ShieldCheck, "#questions": CircleQuestionMark };

/**
 * The Menu button and its sheet, one pattern on both surfaces (design-spec §3.3): below 1024 in the app, and on the
 * landing until its header links show. Rows are 56 px with 24 px icons: the landing's in-page links first (`anchors`),
 * then My Satchels · Market · Mint · Contract facts; then the theme control and the account block (passed in by the
 * server shell, so this file never imports the account control), then the testnet line.
 */
export function MenuSheet({ anchors, theme, account, className }: { anchors?: readonly PageAnchor[]; theme: ReactNode; account: ReactNode; className?: string }) {
  const path = usePathname();
  // open = opened on THIS path: a navigation closes it without an effect
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt !== null && openedAt === path;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const onClose = useCallback(() => setOpenedAt(null), []);

  return (
    <>
      <IconButton
        ref={buttonRef}
        icon={Menu}
        iconSize={24}
        label={copy.nav.openMenu}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpenedAt(path)}
        className={className}
      />
      <ModalSheet
        open={open}
        onClose={onClose}
        labelledBy={titleId}
        closeLabel={copy.nav.closeMenu}
        initialFocus={titleRef}
        returnFocus={buttonRef}
        head={
          <h2 id={titleId} ref={titleRef} tabIndex={-1} className="m-0 font-display text-heading text-ink outline-none">
            {copy.nav.menu}
          </h2>
        }
      >
        <MenuLinks anchors={anchors} />
        <div className="flex flex-col gap-2.5 border-t border-line pt-4">{theme}</div>
        <div className="flex flex-col gap-2.5 border-t border-line pt-4">{account}</div>
        <p className="font-sans text-body-sm font-medium text-ink-muted">{copy.footer.testnet}</p>
      </ModalSheet>
    </>
  );
}

const GROUP_LABEL = "px-3 font-sans text-[0.875rem] leading-5 font-semibold text-ink-muted";

/** The sheet's links. Following one closes the sheet as a navigation (focus stays with the new page). */
function MenuLinks({ anchors }: { anchors?: readonly PageAnchor[] }) {
  const close = useSheetClose();
  const pageId = useId();
  const appId = useId();
  const navigate = () => close("navigate");
  if (!anchors?.length) {
    return (
      <nav aria-label="Main">
        <MenuNavRows onNavigate={navigate} />
      </nav>
    );
  }
  return (
    <>
      <nav aria-labelledby={pageId} className="flex flex-col gap-1">
        <p id={pageId} className={GROUP_LABEL}>
          {copy.nav.onThisPage}
        </p>
        <ul className="m-0 flex list-none flex-col p-0">
          {anchors.map((a) => (
            <li key={a.href}>
              <a href={a.href} onClick={navigate} className={MENU_ROW}>
                <Icon icon={ANCHOR_ICON[a.href.slice(a.href.indexOf("#"))] ?? Route} size={24} className="text-ink-muted" />
                {a.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <nav aria-labelledby={appId} className="flex flex-col gap-1">
        <p id={appId} className={GROUP_LABEL}>
          {copy.nav.app}
        </p>
        <MenuNavRows onNavigate={navigate} />
      </nav>
    </>
  );
}
