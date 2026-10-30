import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * `fetchPrices` (lib/prices.ts) memoizes the live result for 60 s, remembers a FAILURE for only 10 s (so a blip
 * doesn't hide the dollar estimate for a whole minute, per the file's own comment), and de-dupes concurrent callers
 * onto one in-flight request. None of the three were covered before this file — `overview.test.ts` only covers the
 * two parsers and a single fallback call, always after `vi.resetModules()` (so the module-level memo is fresh).
 *
 * `fetchPrices(timeoutMs, now)` takes an explicit `now` for the cache check (but still writes `Date.now()` for real
 * when it actually fetches), so these tests can probe the TTL boundary without fake timers: call once for real to
 * populate the memo, then call again with a synthetic `now` offset from the real call time.
 */

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

const GECKO_OK = { bitcoin: { usd: 1 }, ethereum: { usd: 2 }, solana: { usd: 3 }, near: { usd: 4 }, "usd-coin": { usd: 5 } };

describe("fetchPrices: success memo (60 s)", () => {
  it("a second call just under 60 s later reuses the memo without fetching again", async () => {
    const fetchMock = vi.fn(async (url: string) => (url.includes("1click") ? new Response("nope", { status: 503 }) : Response.json(GECKO_OK)));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchPrices } = await import("@/lib/prices");

    const t0 = Date.now();
    const first = await fetchPrices(500);
    expect(first?.source).toBe("coingecko");
    const callsAfterFirst = fetchMock.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThan(0);

    const second = await fetchPrices(500, t0 + 50_000); // well under the 60s TTL from the real write time
    expect(second).toEqual(first);
    expect(fetchMock.mock.calls.length).toBe(callsAfterFirst); // no new network calls
  });

  it("a call past the 60 s TTL refetches", async () => {
    const fetchMock = vi.fn(async (url: string) => (url.includes("1click") ? new Response("nope", { status: 503 }) : Response.json(GECKO_OK)));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchPrices } = await import("@/lib/prices");

    const t0 = Date.now();
    await fetchPrices(500);
    const callsAfterFirst = fetchMock.mock.calls.length;

    const third = await fetchPrices(500, t0 + 120_000); // well past the 60s TTL
    expect(third?.source).toBe("coingecko");
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterFirst); // it fetched again
  });
});

describe("fetchPrices: failure is cached for only ~10 s, not the full 60 s", () => {
  it("retries once ~10 s have passed, even though a success would still be cached at that point", async () => {
    const fetchMock = vi.fn(async () => new Response("down", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchPrices } = await import("@/lib/prices");

    const t0 = Date.now();
    const first = await fetchPrices(500);
    expect(first).toBeNull();
    const callsAfterFirst = fetchMock.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThan(0);

    // just after the failure: still within the short negative-cache window -> no refetch
    const soon = await fetchPrices(500, t0 + 2_000);
    expect(soon).toBeNull();
    expect(fetchMock.mock.calls.length).toBe(callsAfterFirst);

    // past the ~10s negative-cache window (but nowhere near the full 60s a success would get) -> refetch
    const later = await fetchPrices(500, t0 + 15_000);
    expect(later).toBeNull();
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });
});

describe("fetchPrices: concurrent callers de-dupe onto one in-flight request", () => {
  it("two calls fired back-to-back (no await between them) only hit the network once", async () => {
    let resolveFetch: ((r: Response) => void) | null = null;
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("1click")) return Promise.resolve(new Response("nope", { status: 503 }));
      return new Promise<Response>((res) => {
        resolveFetch = res;
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { fetchPrices } = await import("@/lib/prices");

    const p1 = fetchPrices(500);
    const p2 = fetchPrices(500);
    // let the microtasks run: the 1click attempt rejects, then the gecko fetch is kicked off, for BOTH calls sharing
    // the same `inflight` promise — only one real gecko call should result.
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    const geckoCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes("coingecko")).length;
    expect(geckoCalls).toBe(1);

    resolveFetch!(Response.json(GECKO_OK));
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual(r2);
    expect(r1?.source).toBe("coingecko");
  });
});
