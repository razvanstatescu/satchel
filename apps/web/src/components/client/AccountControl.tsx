"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowUpRight, ChevronUp, Copy, LogOut, type LucideIcon } from "lucide-react";
import { copy, NETWORK_LABEL } from "@/lib/copy";
import { EXPLORERS } from "@/lib/config";
import { readMotionMode } from "@/lib/motion-flag";
import { EASE, play } from "@/lib/motion/play";
import { useWallet } from "@/lib/near/wallet";
import { Avatar, Button, Icon, IconButton, cx } from "@/components/ui";
import { ConnectButton } from "@/components/client/ConnectButton";
import { ModalSheet } from "@/components/client/LandingMenu";
import { toast } from "@/components/client/Toaster";

/**
 * The account control (app-screens §11.3; design-spec §3.3).
 * - Signed out: **Connect NEAR wallet** (secondary; "Connect" below 480 px in the top bar), "Connecting…" while busy.
 * - Signed in: the top bar shows the avatar (a 44 px button; below 480 px it steps aside while a send's pending pill
 *   shows, and the Menu sheet keeps the account), the side nav the account pill (avatar, the account, a chevron). Either opens the account menu: the **full account ID**, Copy account ID, View on NearBlocks, Disconnect.
 *   It is a disclosure (`aria-expanded`), never an arrow-key-less `role=menu`: a bottom sheet below 768 px (modal), a
 *   popover from 768 (non-modal: Esc, a click outside or Tab past its end closes it).
 * Test ids: `connect` (signed out) and `account-pill` (the trigger).
 */

const SHEET_MQ = "(max-width: 47.99rem)";

async function copyAccount(accountId: string) {
  try {
    await navigator.clipboard.writeText(accountId);
  } catch {
    /* clipboard blocked: the full ID is on screen to select */
  }
  toast(copy.toast.accountCopied);
}

/** The full account ID (mono, wrapping only where it must) and the network under it. */
function AccountWho({ accountId, avatar = 40, className }: { accountId: string; avatar?: 32 | 40; className?: string }) {
  return (
    <div className={cx("flex min-w-0 items-center gap-3", className)}>
      <Avatar account={accountId} size={avatar} />
      <div className="min-w-0">
        <p className="m-0 font-mono text-[0.875rem] leading-5 font-[450] wrap-anywhere text-ink">{accountId}</p>
        <p className="m-0 font-sans text-caption text-ink-muted">{NETWORK_LABEL.near}</p>
      </div>
    </div>
  );
}

const MENU_BTN =
  "flex min-h-11 w-full items-center gap-3 rounded-sm px-2.5 text-left font-sans text-label text-ink no-underline transition-colors duration-120 hover:bg-surface-sunken";

function MenuAction({ icon, children, onClick }: { icon: LucideIcon; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={MENU_BTN}>
      <Icon icon={icon} size={20} className="text-ink-muted" />
      {children}
    </button>
  );
}

/** Copy account ID · View on NearBlocks · Disconnect (the popover's and the sheet's rows). */
function AccountActions({ accountId, done }: { accountId: string; done: () => void }) {
  const { signOut } = useWallet();
  return (
    <div className="flex flex-col gap-1">
      <MenuAction
        icon={Copy}
        onClick={() => {
          void copyAccount(accountId);
          done();
        }}
      >
        {copy.nav.copyAccount}
      </MenuAction>
      <a href={EXPLORERS.nearAccount(accountId)} target="_blank" rel="noreferrer" onClick={done} className={MENU_BTN}>
        <Icon icon={ArrowUpRight} size={20} className="text-ink-muted" />
        {copy.nav.viewNearBlocks}
        <span className="sr-only">{` ${copy.a11y.newTab}`}</span>
      </a>
      <MenuAction icon={LogOut} onClick={() => void signOut().then(done)}>
        {copy.nav.disconnect}
      </MenuAction>
    </div>
  );
}

type Place = "bar" | "side";

/** Where the popover sits: under the avatar (top bar, right-aligned) or above the account pill (side nav). */
function popoverPosition(trigger: HTMLElement, place: Place): CSSProperties {
  const r = trigger.getBoundingClientRect();
  return place === "bar"
    ? { top: Math.round(r.bottom + 8), right: Math.max(16, Math.round(window.innerWidth - r.right)) }
    : { bottom: Math.round(window.innerHeight - r.top + 8), left: Math.round(r.left) };
}

function AccountMenu({ accountId, place }: { accountId: string; place: Place }) {
  const path = usePathname();
  const [state, setState] = useState<{ kind: "sheet" | "popover"; at: string; pos?: CSSProperties } | null>(null);
  const open = state !== null && state.at === path ? state : null; // a navigation closes it
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const close = useCallback(() => setState(null), []);

  const toggle = () => {
    if (open) return close();
    const trigger = triggerRef.current;
    const sheet = typeof window.matchMedia === "function" && window.matchMedia(SHEET_MQ).matches;
    if (sheet || !trigger) setState({ kind: "sheet", at: path ?? "" });
    else setState({ kind: "popover", at: path ?? "", pos: popoverPosition(trigger, place) });
  };

  // The popover: focus its first row; Esc returns focus to the trigger; a click outside, Tab past its end or a resize
  // closes it. It settles in like a dialog (opacity + scale, 240 ms; a fade under reduced motion).
  const popover = open?.kind === "popover";
  useEffect(() => {
    if (!popover) return;
    const panel = panelRef.current;
    const trigger = triggerRef.current;
    if (!panel) return;
    panel.querySelector<HTMLElement>("button, a[href]")?.focus();
    const reduce = readMotionMode() === "reduce";
    const h = reduce
      ? play([{ el: panel, prop: "opacity", frames: [[0, 0, EASE.out], [150, 1]] }], 150)
      : play(
          [
            { el: panel, prop: "opacity", frames: [[0, 0, "linear"], [140, 1]] },
            { el: panel, prop: "scale", frames: [[0, "0.96", EASE.out], [240, "1"]] },
          ],
          240,
        );
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      close();
      trigger?.focus();
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.contains(t) && !trigger?.contains(t)) close();
    };
    const onFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Node | null;
      if (next && !panel.contains(next) && !trigger?.contains(next)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    panel.addEventListener("focusout", onFocusOut);
    window.addEventListener("resize", close);
    return () => {
      h.cancel();
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      panel.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("resize", close);
    };
  }, [popover, close]);

  // The bar's avatar is icon-only, so it is named by `aria-label`; the side pill shows the account, so it is named by
  // its content (a hidden "Account" prefix), and the visible text stays part of the name (WCAG 2.5.3, axe
  // label-content-name-mismatch).
  const triggerProps = {
    ref: triggerRef,
    type: "button" as const,
    "aria-haspopup": "dialog" as const,
    "aria-expanded": !!open,
    "aria-controls": popover ? panelId : undefined,
    onClick: toggle,
    "data-testid": "account-pill",
  };

  return (
    <>
      {place === "bar" ? (
        <button
          {...triggerProps}
          aria-label={copy.nav.accountButton(accountId)}
          className="inline-grid size-11 flex-none place-items-center rounded-pill border-2 border-line bg-surface transition-colors duration-120 hover:bg-surface-sunken max-[479px]:group-has-data-pending-pill/bar:hidden"
        >
          <Avatar account={accountId} size={28} />
        </button>
      ) : (
        <button
          {...triggerProps}
          className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-pill border-2 border-line bg-surface py-0 pr-3 pl-1.5 text-ink transition-colors duration-120 hover:bg-surface-sunken"
        >
          <Avatar account={accountId} size={28} />
          <span className="min-w-0 flex-1 truncate text-left font-sans text-label">
            <span className="sr-only">{`${copy.nav.account} `}</span>
            {accountId}
          </span>
          <Icon icon={ChevronUp} size={16} className="text-ink-muted" />
        </button>
      )}
      {popover ? (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label={copy.nav.account}
          style={open?.pos}
          className="fixed z-61 flex w-[min(340px,calc(100vw-32px))] flex-col gap-1 rounded-md border border-line bg-surface p-2 text-ink shadow-overlay"
        >
          <AccountWho accountId={accountId} className="mb-1 border-b border-line px-2.5 pt-2.5 pb-3" />
          <AccountActions accountId={accountId} done={close} />
        </div>
      ) : null}
      <ModalSheet
        open={open?.kind === "sheet"}
        onClose={close}
        label={copy.nav.account}
        closeLabel={copy.nav.close}
        returnFocus={triggerRef}
        head={<AccountWho accountId={accountId} />}
      >
        <AccountActions accountId={accountId} done={close} />
      </ModalSheet>
    </>
  );
}

/** The app's account control: the top bar (`placement="bar"`, below 1024 px) or the side nav (`"side"`, from 1024). */
export function AccountControl({ placement }: { placement: Place }) {
  const { accountId } = useWallet();
  if (!accountId) return placement === "side" ? <ConnectButton variant="secondary" block /> : <ConnectButton variant="secondary" short />;
  return <AccountMenu accountId={accountId} place={placement} />;
}

/**
 * The landing header's account control: **Connect NEAR wallet** signed out; signed in, one **My Satchels** pill (the
 * avatar and "My Satchels"; the avatar alone below 480 px) that goes to `/satchels`. The landing stays data-free: the
 * pill comes from the wallet's state only (D-42).
 */
export function LandingAccount() {
  const { accountId } = useWallet();
  if (!accountId) return <ConnectButton variant="secondary" short />;
  return (
    <Link
      href="/satchels"
      className="inline-flex min-h-11 flex-none items-center gap-2 rounded-pill border-2 border-line bg-surface py-0 pr-3 pl-1.5 font-sans text-label text-ink no-underline transition-colors duration-120 hover:bg-surface-sunken max-sm:px-1.5"
    >
      <Avatar account={accountId} size={28} />
      {/* One name, "My Satchels, signed in as …", from one hidden text node (two boxes would read "My Satchels , …");
          the visible words repeat its start, and below 480 px only the avatar shows. */}
      <span className="sr-only">{`${copy.nav.mySatchels}, ${copy.nav.signedInAs(accountId)}`}</span>
      <span aria-hidden="true" className="max-sm:hidden">
        {copy.nav.mySatchels}
      </span>
    </Link>
  );
}

/**
 * The menu sheet's account block: the full account ID with Copy, then View on NearBlocks and Disconnect; signed out,
 * Connect NEAR wallet.
 */
export function AccountBlock() {
  const { accountId, signOut } = useWallet();
  if (!accountId) return <ConnectButton variant="secondary" block />;
  return (
    <>
      <div className="flex items-center gap-2">
        <AccountWho accountId={accountId} avatar={32} className="flex-1" />
        <IconButton icon={Copy} label={copy.nav.copyAccount} onClick={() => void copyAccount(accountId)} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button href={EXPLORERS.nearAccount(accountId)} target="_blank" rel="noreferrer" icon={ArrowUpRight}>
          {copy.nav.viewNearBlocks}
          <span className="sr-only">{` ${copy.a11y.newTab}`}</span>
        </Button>
        <Button icon={LogOut} onClick={() => void signOut()}>
          {copy.nav.disconnect}
        </Button>
      </div>
    </>
  );
}
