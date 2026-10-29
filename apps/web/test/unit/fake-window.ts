/** A minimal browser `window` (localStorage + sessionStorage) for fixture-simulation tests in the node environment. */
export function installFakeWindow(): () => void {
  const store = () => {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, String(v)),
      removeItem: (k: string) => void m.delete(k),
      clear: () => m.clear(),
    };
  };
  const g = globalThis as unknown as { window?: unknown };
  const prev = g.window;
  g.window = { localStorage: store(), sessionStorage: store() };
  return () => {
    g.window = prev;
  };
}
