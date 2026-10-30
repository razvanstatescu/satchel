"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { BookUser, FileCode, Sparkles, Store, Wallet, type LucideIcon } from "lucide-react";
import { copy } from "@/lib/copy";
import { SATCHEL_CONTRACT } from "@/lib/config";
import { dataSource } from "@/lib/data/source";
import { contractViews } from "@/lib/near/contract";
import { useWallet } from "@/lib/near/wallet";
import { Icon, cx } from "@/components/ui";

/**
 * The app's navigation (design-spec §3.3; app-screens §1.1): one model, drawn as the side nav's items from 1024 px and
 * as the menu sheet's 56 px rows below. My Satchels is the current item on `/satchels`, and on `/s/[id]` only when the
 * viewer owns that Satchel (an `nft_token` read, once per path).
 */

export type NavKey = "satchels" | "market" | "mint" | "book" | "contract";

export interface NavItem {
  key: NavKey;
  href: string;
  label: string;
  icon: LucideIcon;
}

export const APP_NAV: readonly NavItem[] = [
  { key: "satchels", href: "/satchels", label: copy.nav.mySatchels, icon: Wallet },
  { key: "market", href: "/market", label: copy.nav.market, icon: Store },
  { key: "mint", href: "/mint", label: copy.nav.mint, icon: Sparkles },
  { key: "book", href: "/address-book", label: copy.nav.book, icon: BookUser },
  { key: "contract", href: "/contract", label: copy.nav.contract, icon: FileCode },
];

const SATCHEL_PATH = /^\/s\/(\d+)(?:\/|$)/;

/**
 * Does the connected account own Satchel `tokenId`? False until the read lands, and false for visitors. `path` keys the
 * read, so moving between a Satchel's tabs re-reads it (a Give or a sale changes the answer).
 */
function useOwnsSatchel(tokenId: string | null, path: string): boolean {
  const { accountId } = useWallet();
  const key = accountId && tokenId ? `${accountId}|${tokenId}|${path}` : null;
  const [answer, setAnswer] = useState<{ key: string; owns: boolean } | null>(null);
  useEffect(() => {
    if (!key || !accountId || !tokenId) return;
    let alive = true;
    contractViews(dataSource().view, SATCHEL_CONTRACT)
      .nftToken(tokenId)
      .then((t) => {
        if (alive) setAnswer({ key, owns: t?.owner_id === accountId });
      })
      .catch(() => {
        /* unknown: nothing is current */
      });
    return () => {
      alive = false;
    };
  }, [key, accountId, tokenId]);
  return !!key && answer?.key === key && answer.owns;
}

/** The Satchel a path is about (`/s/7`, `/s/7/sale` → "7"), or null. */
export const satchelIdOf = (path: string): string | null => SATCHEL_PATH.exec(path)?.[1] ?? null;

/**
 * The current nav item for a path, and whether the page is the item itself (`exact`: aria-current="page") or inside it
 * (aria-current="true"). A Satchel's pages belong to My Satchels only when the viewer owns that Satchel.
 */
export function navKeyFor(path: string, ownsSatchel: boolean): { key: NavKey | null; exact: boolean } {
  if (satchelIdOf(path)) return { key: ownsSatchel ? "satchels" : null, exact: false };
  for (const item of APP_NAV) {
    if (path === item.href) return { key: item.key, exact: true };
    if (path.startsWith(`${item.href}/`)) return { key: item.key, exact: false };
  }
  return { key: null, exact: false };
}

/** The current item on this page (see `navKeyFor`). */
export function useCurrentNav(): { key: NavKey | null; exact: boolean } {
  const path = usePathname() ?? "/";
  const owns = useOwnsSatchel(satchelIdOf(path), path);
  return navKeyFor(path, owns);
}

const ariaCurrent = (on: boolean, exact: boolean) => (on ? (exact ? "page" : "true") : undefined);

/** The side nav's items (from 1024): 44 tall, a 20 px icon; the current one sunken and bold with a 4×20 coral bar. */
export function SideNavItems() {
  const current = useCurrentNav();
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {APP_NAV.map((item) => {
        const on = item.key === current.key;
        return (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={ariaCurrent(on, current.exact)}
              className={cx(
                "relative flex min-h-11 items-center gap-3 rounded-md px-3 font-sans text-label no-underline transition-colors duration-120",
                on
                  ? "bg-surface-sunken font-bold text-ink before:absolute before:top-3 before:-left-4 before:h-5 before:w-1 before:rounded-r-[3px] before:bg-brand-line before:content-['']"
                  : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
              )}
            >
              <Icon icon={item.icon} size={20} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** A 56 px menu-sheet row (24 px icon, 16/24 semibold). */
export const MENU_ROW =
  "flex min-h-14 w-full items-center gap-4 rounded-md px-3 font-sans text-body font-semibold text-ink no-underline transition-colors duration-120 hover:bg-surface-sunken";

/** The menu sheet's app rows. `onNavigate` closes the sheet (a link to the page you're on doesn't change the path). */
export function MenuNavRows({ onNavigate }: { onNavigate?: () => void }) {
  const current = useCurrentNav();
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {APP_NAV.map((item) => {
        const on = item.key === current.key;
        return (
          <li key={item.key}>
            <Link href={item.href} onClick={onNavigate} aria-current={ariaCurrent(on, current.exact)} className={cx(MENU_ROW, on && "bg-surface-sunken")}>
              <Icon icon={item.icon} size={24} className={on ? "text-ink" : "text-ink-muted"} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The sticky top bar's frame: a `<header>` that draws its 1 px `line` once the page has scrolled (`data-scrolled`) and
 * says whether a wallet is connected (`data-signed`), so the bar's CSS can step the Testnet badge aside on small phones.
 */
export function StickyBar({ className, children, ...rest }: ComponentProps<"header">) {
  const ref = useRef<HTMLElement>(null);
  const { accountId } = useWallet();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => el.toggleAttribute("data-scrolled", window.scrollY > 4);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <header ref={ref} data-signed={accountId ? "in" : "out"} data-sticky-bar="" className={cx("group/bar", className)} {...rest}>
      {children}
    </header>
  );
}
