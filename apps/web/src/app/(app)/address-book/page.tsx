import type { Metadata } from "next";
import { AddressBookManager } from "@/components/client/AddressBook";
import { copy } from "@/lib/copy";

/** /address-book: the addresses the user saved (lib/address-book.ts), kept in this browser. */
export const metadata: Metadata = { title: copy.book.title, robots: { index: false } };

export default function AddressBookPage() {
  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-6" data-page="address-book">
      <header className="flex flex-col gap-1.5">
        <h1 className="m-0 font-display text-title text-ink">{copy.book.title}</h1>
        <p className="m-0 font-sans text-body text-ink-muted">{copy.book.lead}</p>
      </header>
      <AddressBookManager />
    </article>
  );
}
