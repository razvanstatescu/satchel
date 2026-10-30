"use client";

import Link from "next/link";
import { BookUser, BookmarkPlus, Check, Pencil, Search, Trash2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CopyButton } from "@/components/client/CopyButton";
import { toast } from "@/components/client/Toaster";
import { Button, EmptyState, Icon, Segmented, TextInput, cx } from "@/components/ui";
import {
  BOOK_KINDS,
  detectKinds,
  entriesFor,
  findEntry,
  removeEntry,
  renameEntry,
  saveAddress,
  touchEntry,
  useAddressBook,
  type BookEntry,
  type BookKind,
} from "@/lib/address-book";
import { copy } from "@/lib/copy";
import { truncateAddress } from "@/lib/format";
import { readMotionMode } from "@/lib/motion-flag";

/**
 * The address book's pieces (lib/address-book.ts): the dropdown inside an address field (only that field's kind), the
 * "Save to address book" control for an address just used, the saved name for an address, and the manage page.
 */

const b = copy.book;

/** The saved name for an address of this kind, or null. */
export function useBookName(kind: BookKind, address: string | null | undefined): string | null {
  const list = useAddressBook();
  if (!address) return null;
  const e = findEntry(list, kind, address);
  return e?.alias || null;
}

/**
 * The address book inside an address field: an icon button in the input (beside Paste, where there is one) opens a
 * dropdown under the field with the saved addresses of this field's kind only, the last used first; a search box once
 * there are more than five. Arrow keys move, Enter picks, Escape or a click outside closes it (Escape never closes the
 * popup around it). The caller's wrapper must be `relative`: `button` goes inside the input, `menu` right after it.
 */
export function useBookMenu(kind: BookKind, onPick: (address: string) => void): { button: ReactNode; menu: ReactNode; open: boolean } {
  const list = useAddressBook();
  const mine = useMemo(() => entriesFor(list, kind), [list, kind]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const menuId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // a click or tap anywhere else closes it
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // opening moves focus into the list (the search box when there is one) and scrolls the popup's body so the whole
  // list shows above its pinned foot (a popup's body scrolls; the dropdown can't leave it, the page behind is inert)
  useEffect(() => {
    if (!open) return;
    const m = menuRef.current;
    const first = m?.querySelector<HTMLElement>("input, [data-book-entry]");
    first?.focus({ preventScroll: true });
    m?.scrollIntoView({ block: "nearest", behavior: readMotionMode() === "reduce" ? "auto" : "smooth" });
  }, [open]);

  const close = (refocus = true) => {
    setOpen(false);
    setQ("");
    if (refocus) btnRef.current?.focus();
  };
  const query = q.trim().toLowerCase();
  const shown = query ? mine.filter((e) => e.alias.toLowerCase().includes(query) || e.address.toLowerCase().includes(query)) : mine;

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[data-book-entry]") ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // the popup around the field must stay open
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      items[Math.min(items.length - 1, i + 1)]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (i <= 0) menuRef.current?.querySelector<HTMLElement>("input")?.focus();
      else items[i - 1]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  const button = (
    <button
      ref={btnRef}
      type="button"
      aria-haspopup="true"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      aria-label={b.pickAria(b.kinds[kind])}
      title={b.pickAria(b.kinds[kind])}
      onClick={() => (open ? close(false) : setOpen(true))}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" && !open) {
          e.preventDefault();
          setOpen(true);
        }
      }}
      className={cx(
        "inline-grid size-11 flex-none place-items-center rounded-pill text-ink transition-colors duration-120 hover:bg-line",
        open && "bg-line",
      )}
      data-testid="book-open"
    >
      <Icon icon={BookUser} size={18} />
    </button>
  );

  const menu = open ? (
    <div
      ref={menuRef}
      id={menuId}
      role="dialog"
      aria-label={b.pickAria(b.kinds[kind])}
      onKeyDown={onMenuKey}
      className="absolute inset-x-0 top-full z-30 mt-2 mb-4 flex max-h-72 scroll-mb-4 flex-col overflow-hidden rounded-md border border-line bg-surface shadow-overlay"
      data-testid="book-panel"
      data-book-picker={kind}
    >
      {mine.length > 5 ? (
        <div className="relative flex-none border-b border-line p-2">
          <Icon icon={Search} size={16} className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-ink-muted" />
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={b.search} aria-label={b.search} className="pl-9" />
        </div>
      ) : null}
      <ul className="m-0 flex min-h-0 list-none flex-col overflow-y-auto p-1.5">
        {shown.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => {
                onPick(e.address);
                touchEntry(e.id);
                close();
              }}
              className="flex min-h-12 w-full flex-col items-start rounded-sm px-3 py-2 text-left outline-none hover:bg-surface-sunken focus-visible:bg-surface-sunken focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
              data-book-entry={e.id}
            >
              <span className={cx("font-sans text-label", e.alias ? "text-ink" : "text-ink-muted")}>{e.alias || b.unnamed}</span>
              <span className="max-w-full truncate font-mono text-[0.8125rem] text-ink-muted">{e.address}</span>
            </button>
          </li>
        ))}
        {!mine.length ? <li className="px-3 py-2.5 font-sans text-body-sm text-ink-muted">{b.emptyKind(b.kinds[kind])}</li> : !shown.length ? <li className="px-3 py-2.5 font-sans text-body-sm text-ink-muted">{b.noMatch}</li> : null}
      </ul>
      <Link href="/address-book" className="flex-none border-t border-line px-4 py-2.5 font-sans text-body-sm font-semibold text-link underline decoration-1 underline-offset-3">
        {b.manage}
      </Link>
    </div>
  ) : null;

  return { button, menu, open };
}

/** An address input with the address book's button inside it (the input needs `pr-13` for room) and its dropdown. */
export function BookField({ kind, onPick, children }: { kind: BookKind; onPick: (address: string) => void; children: ReactNode }) {
  const book = useBookMenu(kind, onPick);
  return (
    <div className="relative">
      {children}
      <div className="absolute top-1 right-1">{book.button}</div>
      {book.menu}
    </div>
  );
}

/** For an address just used (a send's receipt, a transaction row): saved → its name; else Save, with an optional name. */
export function SaveToBook({ kind, address, compact = false, className }: { kind: BookKind; address: string; compact?: boolean; className?: string }) {
  const list = useAddressBook();
  const found = findEntry(list, kind, address);
  const [editing, setEditing] = useState(false);
  const [alias, setAlias] = useState("");
  const inputId = useId();
  if (found) {
    if (compact) return null;
    return (
      <p className={cx("m-0 flex items-center gap-1.5 font-sans text-body-sm text-ink-muted", className)} data-book-saved="">
        <Icon icon={Check} size={16} className="text-success" />
        {found.alias ? b.saveAs(found.alias) : b.alreadyUnnamed}
      </p>
    );
  }
  if (compact)
    return (
      <button
        type="button"
        onClick={() => {
          saveAddress(kind, address);
          toast(b.saved);
        }}
        aria-label={`${b.saveThis}: ${address}`}
        title={b.saveThis}
        className={cx("inline-grid size-11 flex-none place-items-center rounded-pill text-ink-muted hover:bg-surface-sunken hover:text-ink", className)}
        data-testid="book-save-compact"
      >
        <Icon icon={BookmarkPlus} size={18} />
      </button>
    );
  if (!editing)
    return (
      <Button variant="link" icon={BookmarkPlus} onClick={() => setEditing(true)} className={cx("self-start", className)} data-testid="book-save">
        {b.saveThis}
      </Button>
    );
  return (
    <form
      className={cx("flex flex-col gap-2 rounded-md border border-line bg-surface p-3", className)}
      onSubmit={(e) => {
        e.preventDefault();
        saveAddress(kind, address, alias);
        toast(b.saved);
        setEditing(false);
      }}
      data-testid="book-save-form"
    >
      <label htmlFor={inputId} className="font-sans text-label text-ink">
        {b.alias}
      </label>
      <p className="m-0 truncate font-mono text-[0.8125rem] text-ink-muted">{address}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <TextInput id={inputId} value={alias} onChange={(e) => setAlias(e.target.value)} placeholder={b.aliasPlaceholder} maxLength={40} autoFocus className="min-w-0 sm:flex-1" />
        <Button type="submit" variant="primary" data-testid="book-save-submit">
          {b.save}
        </Button>
      </div>
    </form>
  );
}

/* ── The manage page: /address-book ──────────────────────────────────────────────────────────────────────────────── */

function Row({ e }: { e: BookEntry }) {
  const [editing, setEditing] = useState(false);
  const [alias, setAlias] = useState(e.alias);
  const [confirm, setConfirm] = useState(false);
  const inputId = useId();
  return (
    <li className="relative flex flex-col gap-2 px-4 py-3.5" data-book-row={e.id}>
      <span aria-hidden="true" className="absolute inset-x-4 top-0 hidden h-px bg-line in-[li+li]:block" />
      {editing ? (
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(ev) => {
            ev.preventDefault();
            renameEntry(e.id, alias);
            setEditing(false);
          }}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor={inputId} className="sr-only">
              {b.renameLabel(e.address)}
            </label>
            <TextInput id={inputId} value={alias} onChange={(ev) => setAlias(ev.target.value)} placeholder={b.aliasPlaceholder} maxLength={40} autoFocus />
          </div>
          <Button type="submit" variant="primary">
            {b.done}
          </Button>
        </form>
      ) : (
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <span className={cx("font-sans text-label", e.alias ? "text-ink" : "text-ink-muted")}>{e.alias || b.unnamed}</span>
            <span className="font-mono text-[0.8125rem] break-all text-ink-muted">{e.address}</span>
          </div>
        </div>
      )}
      {!editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton value={e.address} label={`${b.copy} ${e.alias || truncateAddress(e.address)}`} toastText={b.copied} />
          <Button size="md" variant="link" icon={Pencil} onClick={() => setEditing(true)} aria-label={`${b.rename} ${e.alias || truncateAddress(e.address)}`}>
            {b.rename}
          </Button>
          <Button
            size="md"
            variant="link"
            icon={Trash2}
            onClick={() => {
              if (!confirm) return setConfirm(true);
              removeEntry(e.id);
              toast(b.removed, { tone: "neutral" });
            }}
            onBlur={() => setConfirm(false)}
            aria-label={`${confirm ? b.removeConfirm : b.remove} ${e.alias || truncateAddress(e.address)}`}
            data-testid="book-remove"
          >
            {confirm ? b.removeConfirm : b.remove}
          </Button>
        </div>
      ) : null}
    </li>
  );
}

function AddForm() {
  const list = useAddressBook();
  const [address, setAddress] = useState("");
  const [alias, setAlias] = useState("");
  const [pick, setPick] = useState<BookKind | null>(null);
  const kinds = detectKinds(address);
  const kind = pick && kinds.includes(pick) ? pick : (kinds[0] ?? null);
  const existing = kind ? findEntry(list, kind, address) : null;
  const err = address.trim() && !kinds.length ? b.kindUnknown : null;
  return (
    <form
      className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4 md:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!kind || existing) return;
        saveAddress(kind, address, alias);
        toast(b.saved);
        setAddress("");
        setAlias("");
        setPick(null);
      }}
      data-testid="book-add"
    >
      <h2 className="m-0 font-display text-heading text-ink">{b.add}</h2>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="book-address" className="font-sans text-label text-ink">
          {b.address}
        </label>
        <TextInput id="book-address" mono value={address} onChange={(e) => setAddress(e.target.value)} placeholder={b.addressPlaceholder} autoComplete="off" spellCheck={false} invalid={!!err} data-testid="book-address" />
        {err ? <p className="m-0 font-sans text-body-sm text-danger">{err}</p> : null}
      </div>
      {kinds.length > 1 ? (
        <Segmented label={b.kind} size="sm" value={kind!} onChange={(k) => setPick(k)} options={kinds.map((k) => ({ value: k, label: b.kinds[k] }))} className="self-start" />
      ) : kind ? (
        <p className="m-0 font-sans text-body-sm text-ink-muted" data-testid="book-kind">
          {`${b.kinds[kind]} · ${b.kindNote[kind]}`}
        </p>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="book-alias" className="font-sans text-label text-ink">
          {b.alias}
        </label>
        <TextInput id="book-alias" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder={b.aliasPlaceholder} maxLength={40} data-testid="book-alias" />
      </div>
      {existing ? <p className="m-0 font-sans text-body-sm text-ink-muted">{existing.alias ? b.already(existing.alias) : b.alreadyUnnamed}</p> : null}
      <Button type="submit" variant="primary" size="lg" disabled={!kind || !!existing} className="self-start" data-testid="book-add-submit">
        {b.save}
      </Button>
    </form>
  );
}

export function AddressBookManager() {
  const list = useAddressBook();
  const [filter, setFilter] = useState<"all" | BookKind>("all");
  const kinds = filter === "all" ? BOOK_KINDS : [filter];
  return (
    <div className="flex flex-col gap-6" data-address-book="">
      <AddForm />
      {list.length ? (
        <>
          <Segmented
            label={b.filterLabel}
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[{ value: "all", label: b.all }, ...BOOK_KINDS.map((k) => ({ value: k, label: b.kinds[k] }))]}
            className="self-start"
          />
          {kinds.map((k) => {
            const rows = entriesFor(list, k);
            if (!rows.length) return filter === "all" ? null : <p key={k} className="m-0 font-sans text-body text-ink-muted">{b.emptyKind(b.kinds[k])}</p>;
            return (
              <section key={k} aria-labelledby={`book-${k}`} className="flex flex-col gap-2">
                <h2 id={`book-${k}`} className="m-0 font-sans text-body-sm font-semibold text-ink-muted">
                  {`${b.kinds[k]} · ${b.kindNote[k]}`}
                </h2>
                <ul className="m-0 list-none rounded-md border border-line bg-surface p-0">
                  {rows.map((e) => (
                    <Row key={e.id} e={e} />
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      ) : (
        <EmptyState className="my-2" artSize={64} title={b.empty} body={b.emptyBody} />
      )}
      <p className="m-0 font-sans text-body-sm text-ink-muted">{b.local}</p>
    </div>
  );
}
