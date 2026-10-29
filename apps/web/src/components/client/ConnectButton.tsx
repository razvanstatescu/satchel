"use client";

import { useCallback, useEffect, useId, useState, useSyncExternalStore, type RefObject } from "react";
import { CircleAlert, LoaderCircle, RefreshCw, TriangleAlert, Undo2, Wallet } from "lucide-react";
import { copy } from "@/lib/copy";
import { IS_FIXTURE } from "@/lib/config";
import { getConnector, useWallet } from "@/lib/near/wallet";
import { isRejection } from "@/lib/signing/machine";
import { Banner, Button, Chip, Icon, Skeleton, cx, type ButtonSize, type ButtonVariant } from "@/components/ui";
import { ModalSheet } from "@/components/client/LandingMenu";

/**
 * Connecting a wallet (DL-10: one label everywhere, "Connect NEAR wallet"; app-screens §11.3–11.4; R7).
 *
 * In live mode every connect control opens **Satchel's own wallet picker** (a sheet below 768 px, a dialog from 768):
 * the testnet wallets of the NEAR connector (`availableWallets`), the last one you used marked Recent. Picking one
 * calls `connector.connect({ walletId })`, which skips the library's own selector (near-connect 0.11.4:
 * `NearConnector.connect` opens its picker only when no `walletId` is given) and goes straight to that wallet's
 * sign-in. The wallet's own window (near-connect's iframe popup, or a browser window) then sits over the picker, which
 * stops holding focus so Tab can reach it; closing that window leaves "You closed the wallet. Nothing changed." in the
 * picker. The WalletProvider's `wallet:signIn` listener sets the account and the picker closes. Fixture mode keeps the
 * mock wallet: connecting signs in the sample account at once.
 */

/* One picker for the whole page: any connect control opens the one host (mounted by the shell). */
let pickerOpen = false;
/** A wallet's sign-in is in progress (picked in the picker): connect controls read "Connecting…". */
let pickerConnecting = false;
let opener: HTMLElement | null = null;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
function setPicker(open: boolean) {
  pickerOpen = open;
  listeners.forEach((l) => l());
}
function setPickerConnecting(on: boolean) {
  pickerConnecting = on;
  listeners.forEach((l) => l());
}
/** Where focus returns when the picker closes: the control that opened it (read when the sheet opens). */
const openerRef: RefObject<HTMLElement | null> = {
  get current() {
    return opener;
  },
  set current(el) {
    opener = el;
  },
};

/**
 * How a "Connect NEAR wallet" control connects: Satchel's picker (live) or the sample wallet (fixture). `connecting` is
 * true while a wallet is signing in.
 */
export function useConnect(): { connect: () => void; connecting: boolean } {
  const { signIn, connecting } = useWallet();
  const picking = useSyncExternalStore(subscribe, () => pickerConnecting, () => false);
  const connect = useCallback(() => {
    if (IS_FIXTURE) {
      void signIn();
      return;
    }
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPicker(true);
  }, [signIn]);
  return { connect, connecting: connecting || picking };
}

/**
 * "Connect NEAR wallet" (the header, the side nav, the menu sheet, the guards, empty states). It renders nothing once a
 * wallet is connected; while a wallet is signing in it reads "Connecting…", busy and (as a primary) latched.
 * `short` shows "Connect" below 480 px; the accessible name stays the full label (label in name, WCAG 2.5.3). Test id
 * `connect`.
 */
export function ConnectButton({
  variant = "primary",
  size = "md",
  block = false,
  short = false,
  icon = true,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  /** "Connect" below 480 px (the top bars). */
  short?: boolean;
  /** The leading wallet icon (on by default). */
  icon?: boolean;
  className?: string;
}) {
  const { accountId } = useWallet();
  const { connect, connecting } = useConnect();
  if (accountId) return null;
  const tail = copy.nav.connect.slice(copy.nav.connectShort.length);
  return (
    <Button variant={variant} size={size} block={block} icon={icon ? Wallet : undefined} loading={connecting} onClick={connect} data-testid="connect" className={className}>
      {connecting ? (
        copy.nav.connecting
      ) : short ? (
        // one span: the button is a flex row with a gap, so two loose children would print a double space
        <span>
          {copy.nav.connectShort}
          <span className="max-sm:sr-only">{tail}</span>
        </span>
      ) : (
        copy.nav.connect
      )}
    </Button>
  );
}

/* ── The picker ──────────────────────────────────────────────────────────────────────────────────────────────────── */

type WalletInfo = { id: string; name: string; icon: string; description: string };

/** The wallet you picked last time (Satchel's own note; the connector forgets its choice on disconnect). */
const RECENT_KEY = "satchel:wallet:recent:v1";
const readRecent = () => {
  try {
    return localStorage.getItem(RECENT_KEY);
  } catch {
    return null;
  }
};

/** Mount once per surface (the shell does). Renders nothing in fixture mode. */
export function WalletPickerHost() {
  const open = useSyncExternalStore(subscribe, () => pickerOpen, () => false);
  if (IS_FIXTURE) return null;
  return <WalletPicker open={open} />;
}

type Note = { tone: "neutral" | "danger"; text: string };

function WalletPicker({ open }: { open: boolean }) {
  const { accountId } = useWallet();
  const [list, setList] = useState<{ wallets: WalletInfo[]; failed: boolean } | null>(null); // null: loading
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const titleId = useId();
  const close = useCallback(() => setPicker(false), []);

  // The list: the connector's testnet wallets, once its manifest has loaded (and live as extensions inject themselves).
  useEffect(() => {
    if (!open) return;
    let alive = true;
    let off = () => {};
    void getConnector()
      .then(async (c) => {
        const update = (failed = false) => {
          if (!alive) return;
          const wallets = c.availableWallets.map((w) => ({ id: w.manifest.id, name: w.manifest.name, icon: w.manifest.icon, description: w.manifest.description }));
          setList({ wallets, failed: failed && wallets.length === 0 });
        };
        const onChange = () => update();
        c.on("selector:walletsChanged", onChange);
        off = () => c.off("selector:walletsChanged", onChange);
        const loaded = await c.whenManifestLoaded.then(
          () => true,
          () => false,
        );
        update(!loaded);
      })
      .catch(() => alive && setList({ wallets: [], failed: true }));
    return () => {
      alive = false;
      off();
    };
  }, [open, attempt]);

  // Connected (here or in another tab): the picker's job is done.
  useEffect(() => {
    if (accountId && open) close();
  }, [accountId, open, close]);

  const pick = async (w: WalletInfo) => {
    setBusy(w.id);
    setNote(null);
    setPickerConnecting(true);
    try {
      await (await getConnector()).connect({ walletId: w.id });
      try {
        localStorage.setItem(RECENT_KEY, w.id);
      } catch {
        /* private mode: nothing to remember */
      }
      close();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setNote(isRejection(msg) || /closed|cancel/i.test(msg) ? { tone: "neutral", text: copy.connect.cancelled } : { tone: "danger", text: copy.connect.failed(w.name) });
    } finally {
      setBusy(null);
      setPickerConnecting(false);
    }
  };

  const recent = open ? readRecent() : null;
  const wallets = list ? [...list.wallets].sort((a, b) => Number(b.id === recent) - Number(a.id === recent)) : [];

  return (
    <ModalSheet
      open={open}
      onClose={close}
      labelledBy={titleId}
      closeLabel={copy.nav.close}
      returnFocus={openerRef}
      // while a wallet signs in, its own window (near-connect's, appended after this sheet) sits on top: let focus reach it
      modal={busy === null}
      testId="wallet-picker"
      head={
        <h2 id={titleId} className="m-0 font-display text-heading text-ink">
          {copy.connect.title}
        </h2>
      }
    >
      <p className="m-0 font-sans text-body text-ink-muted">{copy.connect.body}</p>
      {list === null ? (
        <ul aria-busy="true" aria-label={copy.connect.loading} className="m-0 flex list-none flex-col gap-2 p-0">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <Skeleton className="h-16 w-full rounded-md" />
            </li>
          ))}
        </ul>
      ) : list.failed ? (
        <Banner
          icon={CircleAlert}
          tone="danger"
          titleAs="p"
          title={copy.connect.loadFailed}
          action={
            <Button
              icon={RefreshCw}
              onClick={() => {
                setList(null);
                setAttempt((n) => n + 1);
              }}
            >
              {copy.home.tryAgain}
            </Button>
          }
        />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {wallets.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => void pick(w)}
                disabled={busy !== null && busy !== w.id}
                aria-busy={busy === w.id || undefined}
                className={cx(
                  "flex min-h-16 w-full items-center gap-3 rounded-md border border-line bg-surface px-3.5 py-2.5 text-left text-ink transition-colors duration-120 hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                <span className="grid size-10 flex-none place-items-center overflow-hidden rounded-sm bg-surface-sunken">
                  {/* the wallets' own icons, from the connector's manifest (any host, any size) */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={w.icon} alt="" width={40} height={40} className="size-10 object-contain" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-sans text-label">{w.name}</span>
                  <span className="truncate font-sans text-caption text-ink-muted">{w.description}</span>
                </span>
                {busy === w.id ? (
                  <Icon icon={LoaderCircle} size={20} spin className="text-frozen" label={copy.nav.connecting} />
                ) : w.id === recent ? (
                  <Chip>{copy.connect.recent}</Chip>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
      {note ? (
        <p role={note.tone === "danger" ? "alert" : "status"} className={cx("m-0 flex items-start gap-2 font-sans text-body-sm", note.tone === "danger" ? "text-danger" : "text-ink")}>
          <Icon icon={note.tone === "danger" ? TriangleAlert : Undo2} size={16} className="mt-0.5" />
          <span>{note.text}</span>
        </p>
      ) : null}
    </ModalSheet>
  );
}
