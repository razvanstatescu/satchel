"use client";

import { useSyncExternalStore } from "react";

/**
 * The address book: addresses the user knows, each with an optional name, kept in this browser (localStorage, shared
 * across tabs; nothing leaves the device). Every entry has one kind, and each context only offers its own kind: a
 * Bitcoin field never lists a Solana address; one Ethereum address serves all four EVM testnets; Give and allowances
 * take NEAR accounts. Reads never throw (private windows, blocked storage): the book is then simply empty.
 */

export type BookKind = "btc" | "evm" | "sol" | "near";
export const BOOK_KINDS: readonly BookKind[] = ["btc", "evm", "sol", "near"];

export interface BookEntry {
  id: string;
  kind: BookKind;
  address: string;
  /** the user's name for it ("Mom", "Cold wallet"); "" when unnamed */
  alias: string;
  addedAt: number;
  usedAt: number | null;
}

const KEY = "satchel:address-book:v1";
const EMPTY: BookEntry[] = [];
let cache: BookEntry[] | null = null;
const listeners = new Set<() => void>();

function read(): BookEntry[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as unknown) : [];
    cache = Array.isArray(v) ? (v.filter((e) => e && typeof e.address === "string" && BOOK_KINDS.includes(e.kind)) as BookEntry[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(list: BookEntry[]) {
  cache = list;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage blocked: the book still works for this page view */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = null;
    l();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useAddressBook(): BookEntry[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** The comparison form: EVM addresses and bech32 are case-insensitive; NEAR accounts are lowercase anyway. */
export function sameAddress(kind: BookKind, a: string, b: string): boolean {
  const x = a.trim();
  const y = b.trim();
  return kind === "sol" ? x === y : x.toLowerCase() === y.toLowerCase();
}

/** Which kinds an address could be, best guess first (the add form lets the user pick when it's ambiguous). */
export function detectKinds(raw: string): BookKind[] {
  const a = raw.trim();
  const out: BookKind[] = [];
  if (/^0x[0-9a-fA-F]{40}$/.test(a)) out.push("evm");
  if (/^(tb1|bcrt1|bc1)[02-9ac-hj-np-z]{8,87}$/i.test(a) || /^[mn2][1-9A-HJ-NP-Za-km-z]{25,34}$/.test(a)) out.push("btc");
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)) out.push("sol");
  if (/^[0-9a-f]{64}$/.test(a) || (/^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/.test(a) && a.length >= 2 && a.length <= 64 && /\.(testnet|near)$/.test(a))) out.push("near");
  return out;
}

export function findEntry(list: readonly BookEntry[], kind: BookKind, address: string): BookEntry | null {
  return list.find((e) => e.kind === kind && sameAddress(kind, e.address, address)) ?? null;
}

/** A context's entries: its kind only, the last used first, then the named ones A–Z, then the rest. */
export function entriesFor(list: readonly BookEntry[], kind: BookKind): BookEntry[] {
  return list
    .filter((e) => e.kind === kind)
    .sort((a, b) => (b.usedAt ?? 0) - (a.usedAt ?? 0) || Number(!!b.alias) - Number(!!a.alias) || a.alias.localeCompare(b.alias) || b.addedAt - a.addedAt);
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Save an address (or rename it, if it's already there). Returns the entry. */
export function saveAddress(kind: BookKind, address: string, alias = "", now = Date.now()): BookEntry {
  const list = read();
  const found = findEntry(list, kind, address);
  if (found) {
    const next = { ...found, alias: alias.trim() || found.alias };
    write(list.map((e) => (e.id === found.id ? next : e)));
    return next;
  }
  const entry: BookEntry = { id: newId(), kind, address: address.trim(), alias: alias.trim(), addedAt: now, usedAt: null };
  write([...list, entry]);
  return entry;
}

export function renameEntry(id: string, alias: string) {
  write(read().map((e) => (e.id === id ? { ...e, alias: alias.trim() } : e)));
}

export function removeEntry(id: string) {
  write(read().filter((e) => e.id !== id));
}

/** Picked in a form: it moves to the top of that context's list next time. */
export function touchEntry(id: string, now = Date.now()) {
  write(read().map((e) => (e.id === id ? { ...e, usedAt: now } : e)));
}

/** A chain context → the book's kind (every EVM testnet shares "evm"). */
export const kindOfChain = (chain: "btc" | "evm" | "sol"): BookKind => chain;
