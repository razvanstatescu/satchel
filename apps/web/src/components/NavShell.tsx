import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Info, TriangleAlert } from "lucide-react";
import { Charm, Lockup, MarkSmall } from "@/components/brand";
import { Badge, Button, Icon, cx } from "@/components/ui";
import { AccountBlock, AccountControl, LandingAccount } from "@/components/client/AccountControl";
import { WalletPickerHost } from "@/components/client/ConnectButton";
import { MenuSheet, type PageAnchor } from "@/components/client/LandingMenu";
import { SideNavItems, StickyBar } from "@/components/client/NavLinks";
import { PendingIndicator, PendingPill } from "@/components/client/PendingIndicator";
import { NavFeedback, PendingFrame } from "@/components/client/NavFeedback";
import { RestoreHeadFlags } from "@/components/client/RestoreHeadFlags";
import { ThemeControl } from "@/components/client/ThemeControl";
import { copy } from "@/lib/copy";
import { CONTRACT_ROLE, IS_FIXTURE, REPO_URL } from "@/lib/config";

/**
 * The one shell of Satchel 2.0 (design-spec §3.3; app-screens §1.1; proto/shell.html). Server components; the
 * interactive parts are client islands (the account control, the menu sheet, the theme control, the nav's current item).
 *
 * - `TopBar` (64 px, sticky, a 1 px line once scrolled): the lockup and the Testnet badge, then (landing, from 1024) the
 *   in-page links and Market, then the pending pill, the account control and the Menu button. The app variant shows
 *   below 1024 only; the landing variant always, with the Menu button below 1024.
 * - `SideNav` (from 1024, 256 px, sticky, full height): My Satchels · Market · Mint · Contract facts, then the account,
 *   the theme control and the testnet note.
 * - `MenuSheet` (client): one sheet on both surfaces.
 * - `Footer`: the brand column, Product, Verify, Hackathon, then the Testnet badge and `footer.testnet` (R8), plus the
 *   theme control on the landing.
 * - One ThemeControl per surface: the side nav from 1024 and the menu sheet below it in the app; the footer (and the
 *   menu sheet) on the landing.
 * - `AppShell` composes the app (the `(app)` layout and the root not-found); the `(landing)` layout composes TopBar
 *   variant="landing" + Footer surface="landing".
 */

export { MenuSheet, WalletPickerHost };
export type { PageAnchor };

export const HACKATHON_URL = "https://nearhackathon.com/";

/** The landing's in-page links, in page order (the header from 1024 and the menu sheet). Section ids: #how, #clean, #questions. */
export const LANDING_ANCHORS: readonly PageAnchor[] = [
  { href: "#how", label: copy.nav.anchors.how },
  { href: "#clean", label: copy.nav.anchors.clean },
  { href: "#questions", label: copy.nav.anchors.questions },
];

/** Side gutters: 16 · 24 from 768 · 32 from 1024 (design-spec §3.1). */
export const GUTTER = "px-4 md:px-6 lg:px-8";

/** The skip link: the first thing a keyboard reaches on every page. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-80 focus:rounded-md focus:border-2 focus:border-sticker focus:bg-surface focus:px-4 focus:py-3 focus:font-sans focus:text-label focus:font-bold focus:text-ink"
    >
      {copy.a11y.skip}
    </a>
  );
}

/**
 * The lockup as the home link (32 px in the top bar; 31 in the side nav, so the Testnet badge fits beside it in the 256 px
 * column, as in proto/shell.html; the wordmark follows `ink`). In the top bar
 * it never squeezes; below 360 px, and below 480 while a pending pill shows, it collapses to the tile.
 */
function BrandLink({ height, collapse = false }: { height: number; collapse?: boolean }) {
  return (
    <Link href="/" aria-label={copy.nav.home} className="inline-flex min-h-11 min-w-11 flex-none items-center rounded-sm">
      <Lockup height={height} className={cx("block flex-none", collapse && "max-[359px]:hidden max-[479px]:group-has-data-pending-pill/bar:hidden")} />
      {collapse ? <MarkSmall size={32} className="hidden flex-none max-[359px]:block max-[479px]:group-has-data-pending-pill/bar:block" /> : null}
    </Link>
  );
}

/** The lemon Testnet badge with its tooltip. In the top bar it steps aside below 420 px for Connect or a pending pill
 * (it stays in the menu sheet's testnet line and the footer). */
function TestnetBadge({ inBar = false }: { inBar?: boolean }) {
  return (
    <Badge
      kind="testnet"
      title={copy.app.badgeTip}
      data-testnet=""
      className={cx(inBar && "max-[419px]:group-data-[signed=out]/bar:hidden max-[419px]:group-has-data-pending-pill/bar:hidden")}
    />
  );
}

const TOP_LINK =
  "inline-flex min-h-11 items-center rounded-pill px-3 font-sans text-label whitespace-nowrap text-ink-muted no-underline transition-colors duration-120 hover:bg-surface-sunken hover:text-ink";

/** The one top bar. `app`: below 1024 only (the side nav takes over). `landing`: always; its links show from 1024. */
export function TopBar({ variant }: { variant: "app" | "landing" }) {
  const app = variant === "app";
  return (
    <StickyBar className={cx("sticky top-0 z-40 bg-ground data-scrolled:shadow-[inset_0_-1px_0_var(--line)]", app && "lg:hidden")}>
      <div className={GUTTER}>
        {/* 8 px gaps below 380: at 360 the lockup, "Connect" and Menu need every pixel (the Menu button must stay 44) */}
        <div className="mx-auto flex h-16 w-full max-w-app items-center gap-3 max-[379px]:gap-2">
          <BrandLink height={32} collapse />
          <TestnetBadge inBar />
          {app ? null : (
            <div className="ml-5 hidden items-center gap-1 lg:flex">
              <nav aria-label={copy.nav.onThisPage}>
                <ul className="m-0 flex list-none items-center gap-1 p-0">
                  {LANDING_ANCHORS.map((a) => (
                    <li key={a.href}>
                      <a href={a.href} className={TOP_LINK}>
                        {a.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
              <Link href="/market" className={TOP_LINK}>
                {copy.nav.market}
              </Link>
            </div>
          )}
          <div className="ml-auto flex min-w-0 items-center justify-end gap-2">
            <PendingPill />
            {app ? <AccountControl placement="bar" /> : <LandingAccount />}
            <MenuSheet
              anchors={app ? undefined : LANDING_ANCHORS}
              theme={<ThemeControl size="sm" className="justify-between" />}
              account={<AccountBlock />}
              className={app ? undefined : "lg:hidden"}
            />
          </div>
        </div>
      </div>
    </StickyBar>
  );
}

/** The side nav (from 1024): brand, the four items, then the account, the theme control and the testnet note. */
export function SideNav() {
  return (
    <div className="sticky top-0 z-30 hidden h-dvh flex-col gap-6 overflow-y-auto border-r border-line bg-ground px-4 py-6 lg:flex">
      <div data-sticky-bar="" className="flex items-center gap-2.5 px-2">
        <BrandLink height={31} />
        <TestnetBadge />
      </div>
      <nav aria-label="Main">
        <SideNavItems />
      </nav>
      <div className="mt-auto flex flex-col gap-3 border-t border-line pt-4">
        <AccountControl placement="side" />
        <ThemeControl layout="stacked" size="sm" />
        <p className="m-0 font-sans text-caption text-ink-muted">{copy.footer.testnet}</p>
      </div>
    </div>
  );
}

/** The fixture ("Sample data") and role (dev / rc) strips. `contained` aligns their text with the landing's container. */
export function Strips({ contained = false }: { contained?: boolean }) {
  const rows: { key: string; icon: typeof Info; text: string; tone: string }[] = [];
  if (IS_FIXTURE) rows.push({ key: "fixture-strip", icon: Info, text: copy.app.fixture, tone: "text-ink-muted" });
  if (CONTRACT_ROLE !== "final") rows.push({ key: "role-strip", icon: TriangleAlert, text: CONTRACT_ROLE === "dev" ? copy.role.dev : copy.role.rc, tone: "text-danger" });
  if (!rows.length) return null;
  return (
    <div className="bg-surface-sunken">
      {rows.map((r) => (
        <div key={r.key} className={GUTTER} data-testid={r.key}>
          <p className={cx("m-0 flex items-center gap-2 py-2 font-sans text-caption text-ink-muted", contained && "mx-auto max-w-app")}>
            <Icon icon={r.icon} size={16} className={r.tone} />
            {r.text}
          </p>
        </div>
      ))}
    </div>
  );
}

type FooterLink = { href: string; label: string; external?: boolean };

const FOOTER_GROUPS: { id: string; title: string; links: FooterLink[] }[] = [
  {
    id: "product",
    title: copy.footer.product,
    links: [
      { href: "/satchels", label: copy.nav.mySatchels },
      { href: "/market", label: copy.nav.market },
      { href: "/mint", label: copy.nav.mint },
      { href: "/#how", label: copy.footer.howItWorks },
    ],
  },
  {
    id: "verify",
    title: copy.footer.verify,
    links: [
      { href: "/contract", label: copy.nav.contract },
      { href: "/s/1", label: copy.footer.live },
      { href: `${REPO_URL}#readme`, label: copy.footer.readme, external: true },
      { href: REPO_URL, label: copy.footer.repo, external: true },
    ],
  },
  { id: "hackathon", title: copy.footer.hackathon, links: [{ href: HACKATHON_URL, label: copy.footer.nearHackathon, external: true }] },
];

const FOOTER_LINK =
  "inline-flex min-h-11 min-w-11 items-center gap-1.5 font-sans text-body-sm text-ink-muted no-underline underline-offset-3 transition-colors duration-120 hover:text-ink hover:underline";

/**
 * The one footer: the brand column (lockup, "An NFT that is a wallet."), Product, Verify and Hackathon (2 columns at
 * 390, 3 from 480, 4 from 1024), then the Testnet badge with `footer.testnet` (R8) and, on the landing, the theme control.
 */
export function Footer({ surface }: { surface: "app" | "landing" }) {
  const landing = surface === "landing";
  const body = (
    <>
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
        <div className="col-span-full flex flex-col items-start gap-3 lg:col-span-1">
          <Link href="/" aria-label={copy.nav.home} className="inline-flex min-h-11 items-center rounded-sm">
            <Lockup height={32} />
          </Link>
          <p className="m-0 font-sans text-body-sm text-ink-muted">{copy.footer.tagline}</p>
        </div>
        {FOOTER_GROUPS.map((g) => (
          <nav key={g.id} aria-labelledby={`footer-${g.id}`}>
            <p id={`footer-${g.id}`} className="m-0 mb-1 font-sans text-label text-ink">
              {g.title}
            </p>
            <ul className="m-0 flex list-none flex-col p-0">
              {g.links.map((l) => (
                <li key={l.href}>
                  {l.external ? (
                    <a href={l.href} target="_blank" rel="noreferrer" className={FOOTER_LINK}>
                      {l.label}
                      <Icon icon={ArrowUpRight} size={14} />
                      <span className="sr-only">{` ${copy.a11y.newTab}`}</span>
                    </a>
                  ) : (
                    <Link href={l.href} className={FOOTER_LINK}>
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
        <p className="m-0 inline-flex flex-wrap items-center gap-2 font-sans text-body-sm font-semibold text-ink">
          <Badge kind="testnet" aria-hidden="true" />
          {copy.footer.testnet}
        </p>
        {landing ? <ThemeControl size="sm" /> : null}
      </div>
    </>
  );
  return (
    <footer className={cx("border-t border-line pt-10 pb-8", landing ? GUTTER : "mt-12")}>
      {landing ? <div className="mx-auto w-full max-w-app">{body}</div> : body}
    </footer>
  );
}

/** The app frame: the top bar below 1024, the side nav from 1024, the strips, the page and the footer in one column. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <SkipLink />
      <TopBar variant="app" />
      <SideNav />
      <div className="min-w-0">
        <Strips />
        <div className={GUTTER}>
          <div className="mx-auto w-full max-w-app">
            <main id="main" tabIndex={-1} className="pt-6 outline-none lg:pt-10">
              <PendingFrame>{children}</PendingFrame>
            </main>
            <Footer surface="app" />
          </div>
        </div>
      </div>
      <PendingIndicator />
      <NavFeedback />
      <WalletPickerHost />
      {/* a 404 thrown in a route's shell (/s/999) is rendered on the client from scratch: keep the theme */}
      <RestoreHeadFlags />
    </div>
  );
}

/**
 * Not found, in the one shell (app-screens §11.2): the charm S on sky, "This Satchel doesn't exist", Mint a Satchel and
 * Go to My Satchels. `/s/[id]` past the minted ids renders it inside the (app) layout (a soft 404, noindex); any other
 * URL renders it from the root not-found inside `AppShell` (a hard 404).
 */
export function NotFoundView() {
  return (
    <div className="mx-auto flex max-w-110 flex-col items-center gap-3 pt-6 pb-4 text-center md:pt-12">
      {/* A wide, flat sky capsule, never a square sky sticker tile: that would read as a recoloured logo tile (brand
          logo rules). The charm S is the sticker. Same art as EmptyState's "charm". */}
      <div aria-hidden="true" className="mb-2 rounded-pill bg-sky px-12 py-3">
        <Charm height={96} />
      </div>
      <h1 className="m-0 font-display text-title text-ink">{copy.page.notfound.generic}</h1>
      <p className="m-0 font-sans text-body text-ink-muted">{copy.page.notfound.body}</p>
      <div className="mt-1 flex flex-col items-center gap-3">
        <Button variant="primary" size="lg" href="/mint">
          {copy.page.notfound.mint}
        </Button>
        <Button size="lg" href="/satchels">
          {copy.page.notfound.mine}
        </Button>
      </div>
    </div>
  );
}
