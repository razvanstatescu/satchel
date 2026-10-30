"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Icon, Skeleton, cx } from "@/components/ui";
import { copy } from "@/lib/copy";
import { classify, getPending, setPending, usePendingNav, type PendingTarget } from "@/lib/nav-pending";

/**
 * Feedback for in-app navigation (lib/nav-pending.ts). A plain click on an internal link starts it; the URL committing
 * (Next updates history when the new page is on screen), Back/Forward, or 20 s end it. While it runs: a progress bar
 * at the top after 80 ms (a quick navigation never flashes it) and, for a popup route, the popup itself as a skeleton
 * panel saying what it's reading. The page and tab skeletons live where the content goes (PendingFrame, ObjArticle).
 * Links that handle a click themselves (the public page's pickers, a popup's Close) carry `data-local-nav`.
 */

const SAFETY_MS = 20_000;
let patched = false;

function sameUrl(t: PendingTarget) {
  return window.location.pathname === t.path && window.location.search === t.search;
}

/** End the pending navigation once the browser's URL is the target's, or the page changed anyway (a redirect). */
function settle(from: string) {
  const t = getPending();
  if (!t) return;
  if (sameUrl(t) || window.location.pathname !== from) setPending(null);
}

export function NavFeedback() {
  const t = usePendingNav();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let from = window.location.pathname;
    let safety: ReturnType<typeof setTimeout> | null = null;
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download") || a.closest("[data-local-nav]")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname.startsWith("/api/")) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      from = window.location.pathname;
      const next = classify(url.pathname, url.search, from, Date.now());
      setPending(next ?? { path: url.pathname, search: url.search, kind: "page", name: "none", tokenId: null, startedAt: Date.now() });
      if (safety) clearTimeout(safety);
      safety = setTimeout(() => setPending(null), SAFETY_MS);
    };
    // capture: runs before the Link's own handler (which prevents the default and navigates in place)
    document.addEventListener("click", onClick, true);
    const onPop = () => setPending(null);
    window.addEventListener("popstate", onPop);
    if (!patched) {
      patched = true;
      for (const k of ["pushState", "replaceState"] as const) {
        const orig = window.history[k].bind(window.history);
        window.history[k] = (...args: Parameters<History["pushState"]>) => {
          orig(...args);
          queueMicrotask(() => settle(from));
        };
      }
    }
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      if (safety) clearTimeout(safety);
    };
  }, []);

  // show only past 80 ms: a prefetched navigation lands before anything flashes
  useEffect(() => {
    if (!t) {
      const r = setTimeout(() => setVisible(false), 0);
      return () => clearTimeout(r);
    }
    const s = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(s);
  }, [t]);

  if (!t || !visible) return null;
  return (
    <>
      <div role="progressbar" aria-label={copy.loading.label} data-nav-progress="" className="pointer-events-none fixed inset-x-0 top-0 z-90 h-[3px] overflow-hidden">
        <div className="h-full w-1/3 bg-brand motion-safe:animate-[nav-progress_1.1s_ease-in-out_infinite]" />
      </div>
      {t.kind === "flow" ? <FlowSkeleton t={t} /> : null}
    </>
  );
}

/** What a link to a popup route shows at once: the popup, its title, what it's reading, and placeholder rows. */
function FlowSkeleton({ t }: { t: PendingTarget }) {
  const f = copy.loading.flows[t.name] ?? { title: copy.loading.label, detail: copy.loading.pages.page.detail };
  return (
    <div data-flow-skeleton={t.name} className="fixed inset-0 z-60" role="status" aria-live="polite" aria-busy="true">
      <div className="absolute inset-0 bg-scrim" />
      <div className="fixed inset-x-0 bottom-0 z-61 flex flex-col gap-5 rounded-t-card border border-b-0 border-overlay-edge bg-surface px-5 pt-6 pb-[calc(24px+env(safe-area-inset-bottom))] text-ink shadow-overlay md:inset-0 md:m-auto md:h-fit md:w-flow md:rounded-card md:border-b md:pb-6">
        <div className="flex flex-col gap-1.5">
          <p className="m-0 font-display text-title text-ink">{f.title}</p>
          <p className="m-0 flex items-center gap-2 font-sans text-body-sm text-ink-muted">
            <Icon icon={LoaderCircle} size={16} spin />
            {f.detail}
          </p>
        </div>
        <div aria-hidden="true" className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full rounded-card motion-safe:animate-pulse" />
          <Skeleton line className="w-3/4 motion-safe:animate-pulse" />
          <Skeleton line className="w-1/2 motion-safe:animate-pulse" />
          <Skeleton className="mt-2 h-13 w-full rounded-pill motion-safe:animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/** The content area of a tab while it loads: what it's reading, then placeholder rows. */
export function TabSkeleton({ tab }: { tab: string }) {
  return (
    <div data-tab-skeleton={tab} role="status" aria-live="polite" aria-busy="true" className="flex min-w-0 flex-col gap-5 lg:[grid-area:main]">
      <p className="m-0 flex items-center gap-2 font-sans text-body text-ink-muted">
        <Icon icon={LoaderCircle} size={18} spin />
        {copy.loading.tabs[tab] ?? copy.loading.pages.page.detail}
      </p>
      <div aria-hidden="true" className="flex flex-col gap-3">
        <Skeleton line className="w-28 motion-safe:animate-pulse" />
        <div className="rounded-md border border-line bg-surface">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={cx("flex items-center gap-3 px-4 py-4", i > 0 && "border-t border-line")}>
              <Skeleton className="size-9 flex-none rounded-full motion-safe:animate-pulse" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton line className="w-32 motion-safe:animate-pulse" />
                <Skeleton line className="w-48 max-w-full motion-safe:animate-pulse" />
              </div>
              <Skeleton line className="w-16 motion-safe:animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The page area while another page loads: its title, what it's reading, and placeholder cards. The current page
 * stays mounted underneath (hidden), so a cancelled or slow navigation never loses it. */
export function PendingFrame({ children }: { children: ReactNode }) {
  const t = usePendingNav();
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!t || t.kind !== "page") {
      const r = setTimeout(() => setLate(false), 0);
      return () => clearTimeout(r);
    }
    const s = setTimeout(() => setLate(true), 120);
    return () => clearTimeout(s);
  }, [t]);
  const show = !!t && t.kind === "page" && t.name !== "none" && late;
  const p = t ? (copy.loading.pages[t.name] ?? copy.loading.pages.page) : null;
  const title = t?.name === "satchel" && t.tokenId ? copy.card.name(t.tokenId) : p?.title;
  return (
    <>
      <div hidden={show || undefined} className="contents">
        {children}
      </div>
      {show && p ? (
        <div data-page-skeleton={t!.name} role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="m-0 font-display text-title text-ink">{title}</p>
            <p className="m-0 flex items-center gap-2 font-sans text-body text-ink-muted">
              <Icon icon={LoaderCircle} size={18} spin />
              {p.detail}
            </p>
          </div>
          <div aria-hidden="true" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-3">
                <Skeleton className="aspect-[1.586/1] w-full rounded-card motion-safe:animate-pulse" />
                <Skeleton line className="w-2/3 motion-safe:animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
