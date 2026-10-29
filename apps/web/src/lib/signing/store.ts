import { transition } from "@/lib/signing/machine";
import type { PendingIntent, SigningEvent } from "@/lib/signing/types";

/**
 * The pending-intent store, at MODULE level (kb/90 §8.2: Next 16 <Activity> cleans up effects of hidden routes,
 * so nothing that tracks a signature may live in a component). Persisted to localStorage["satchel:pending:v1"]
 * BEFORE the wallet opens; read back on load for resume. React reads it through useSyncExternalStore.
 */

export const PENDING_KEY = "satchel:pending:v1";

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

function memoryKV(): KV {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

export function isPendingIntent(x: unknown): x is PendingIntent {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.tokenId === "string" &&
    (o.chain === "btc" || o.chain === "evm" || o.chain === "sol") &&
    typeof o.stage === "string" &&
    typeof o.sigCountBefore === "number" &&
    typeof o.heightBefore === "number" &&
    Array.isArray(o.payloadHashes)
  );
}

export function createIntentStore(kv?: KV) {
  const storage: KV = kv ?? (typeof window !== "undefined" ? safeLocalStorage() : memoryKV());
  let intents: PendingIntent[] = load();
  const listeners = new Set<() => void>();

  function load(): PendingIntent[] {
    try {
      const raw = storage.getItem(PENDING_KEY);
      const arr = raw ? (JSON.parse(raw) as unknown[]) : [];
      return Array.isArray(arr) ? arr.filter(isPendingIntent) : [];
    } catch {
      return [];
    }
  }
  function persist() {
    try {
      storage.setItem(PENDING_KEY, JSON.stringify(intents));
    } catch {
      /* quota / private mode: the in-memory copy still drives this tab */
    }
  }
  function emit() {
    for (const l of listeners) l();
  }

  return {
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getSnapshot: () => intents,
    get: (id: string) => intents.find((i) => i.id === id) ?? null,
    /** Insert or replace, then persist synchronously (call before opening the wallet). */
    upsert(intent: PendingIntent) {
      const i = intents.findIndex((x) => x.id === intent.id);
      intents = i >= 0 ? intents.map((x, k) => (k === i ? intent : x)) : [...intents, intent];
      persist();
      emit();
      return intent;
    },
    dispatch(id: string, ev: SigningEvent): PendingIntent | null {
      const cur = intents.find((x) => x.id === id);
      if (!cur) return null;
      const next = transition(cur, ev);
      if (next !== cur) {
        intents = intents.map((x) => (x.id === id ? next : x));
        persist();
        emit();
      }
      return next;
    },
    patch(id: string, p: Partial<PendingIntent>) {
      const cur = intents.find((x) => x.id === id);
      if (!cur) return null;
      const next = { ...cur, ...p };
      intents = intents.map((x) => (x.id === id ? next : x));
      persist();
      emit();
      return next;
    },
    remove(id: string) {
      intents = intents.filter((x) => x.id !== id);
      persist();
      emit();
    },
    /** Another tab changed storage. */
    reload() {
      intents = load();
      emit();
    },
    forToken: (tokenId: string) => intents.filter((i) => i.tokenId === tokenId),
  };
}

function safeLocalStorage(): KV {
  try {
    const t = "__satchel_probe__";
    window.localStorage.setItem(t, "1");
    window.localStorage.removeItem(t);
    return window.localStorage;
  } catch {
    return memoryKV();
  }
}

export type IntentStore = ReturnType<typeof createIntentStore>;

let singleton: IntentStore | null = null;
/** The one store per tab. */
export function intentStore(): IntentStore {
  if (!singleton) {
    singleton = createIntentStore();
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === PENDING_KEY) singleton?.reload();
      });
    }
  }
  return singleton;
}

export function newIntentId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `i-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
