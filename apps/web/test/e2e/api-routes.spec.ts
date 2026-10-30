import { expect, test } from "@playwright/test";
import { ADDR1 } from "./helpers";

/**
 * Direct request tests for the JSON/SVG API routes (kb/90 §9): /api/contract, /api/satchels/[id],
 * /api/satchels/[id]/txs, /api/card/[file], /api/clean-history/[id]. These can't be driven by plain vitest unit
 * tests: every one of them calls into `lib/data/server.ts` / `lib/data/txs.ts`, which use the Next.js "use cache"
 * directive — calling that code outside the Next.js server throws `cacheLife() is only available with the
 * cacheComponents config`. So this is the only layer (besides the Rust/contract suite, out of scope here) that
 * exercises these routes at all: status codes, response shapes, and cache headers for valid/invalid/unknown ids.
 */

test.describe("GET /api/contract", () => {
  test("200, JSON shape, 60s cache header", async ({ request }) => {
    const res = await request.get("/api/contract");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toContain("s-maxage=60");
    const body = await res.json();
    expect(typeof body).toBe("object");
    // keyless/verification facts (kb/90 §9): at least the lock shape should be present
    expect(body).toHaveProperty("access_keys");
    expect(body).toHaveProperty("locked");
  });
});

test.describe("GET /api/satchels/[id]", () => {
  test("a valid, existing id: 200 with the full snapshot shape and a 15s cache header", async ({ request }) => {
    const res = await request.get("/api/satchels/1");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toContain("s-maxage=15");
    const body = await res.json();
    expect(body.token_id).toBe("1");
    expect(body.owner).toBe("alice.satchelhq.testnet");
    expect(body.addresses.btc.toLowerCase()).toBe(ADDR1.btc.toLowerCase());
    expect(body.addresses.evm.toLowerCase()).toBe(ADDR1.evm.toLowerCase());
    expect(body.addresses.sol).toBe(ADDR1.sol);
    expect(typeof body.sig_count).toBe("number");
    expect(body).toHaveProperty("lock");
    expect(body).toHaveProperty("balances");
    expect(Array.isArray(body.errors)).toBe(true);
  });

  test("an id that is syntactically valid but doesn't exist: 404 with token_id echoed back", async ({ request }) => {
    const res = await request.get("/api/satchels/999999");
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("999999");
    expect(body.token_id).toBe("999999");
  });

  test.describe("malformed ids: every one is a 400, never a 404 or a 500", () => {
    for (const id of ["abc", "0", "-1", "1.5", "1e9", "01", "", " 1", "1 ", "٣", "9999999999999999999999"]) {
      test(`id=${JSON.stringify(id)}`, async ({ request }) => {
        const res = await request.get(`/api/satchels/${encodeURIComponent(id)}`);
        // an empty id ("/api/satchels/") doesn't route to this handler at all (Next 404s the route itself); every
        // other malformed id must be this handler's own 400.
        if (id === "") {
          expect(res.status()).toBe(404);
        } else {
          expect(res.status(), `id=${JSON.stringify(id)}`).toBe(400);
          const body = await res.json();
          expect(body.error).toMatch(/decimal integer/);
        }
      });
    }
  });

  test("an id over 10 digits (the isTokenId cap) is rejected even though it parses as a number", async ({ request }) => {
    const res = await request.get("/api/satchels/12345678901");
    expect(res.status()).toBe(400);
  });
});

test.describe("GET /api/satchels/[id]/txs", () => {
  test("no ?source: the list of sources, not a 400", async ({ request }) => {
    const res = await request.get("/api/satchels/1/txs");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.sources)).toBe(true);
    expect(body.sources).toContain("bitcoin");
    expect(body.sources).toContain("near");
  });

  test("a known source on a valid id: 200, ok:true, a 30s cache header", async ({ request }) => {
    const res = await request.get("/api/satchels/1/txs?source=bitcoin");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toContain("s-maxage=30");
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.key).toBe("bitcoin");
    expect(Array.isArray(body.txs)).toBe(true);
  });

  test("an unknown ?source value: 400 listing the valid sources", async ({ request }) => {
    const res = await request.get("/api/satchels/1/txs?source=dogecoin");
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("bitcoin");
  });

  test("a malformed id short-circuits before the source check, even with a bad source too", async ({ request }) => {
    const res = await request.get("/api/satchels/abc/txs?source=dogecoin");
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/decimal integer/);
  });

  test("a syntactically valid but NON-EXISTENT token id still returns 200 (this route never checks existence; it derives\n" +
    "   addresses from the id and, in fixture mode, synthesizes a plausible-looking history for ANY numeric id — a real\n" +
    "   deployment would instead query the real explorer for the derived address, which would legitimately come back\n" +
    "   empty, so this is consistent behavior, not a bug, but worth knowing: /api/satchels/999999/txs never 404s)", async ({ request }) => {
    const res = await request.get("/api/satchels/999999/txs?source=bitcoin");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.txs)).toBe(true);
  });
});

test.describe("GET /api/card/[file]", () => {
  test("a valid existing id: 200 SVG with a 60s cache header", async ({ request }) => {
    const res = await request.get("/api/card/1.svg");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/svg+xml");
    expect(res.headers()["cache-control"]).toContain("s-maxage=60");
    const body = await res.text();
    expect(body).toContain("<svg");
  });

  test("an unknown id: 404 plain text", async ({ request }) => {
    const res = await request.get("/api/card/999999.svg");
    expect(res.status()).toBe(404);
  });

  test("a wrong extension or non-numeric file name never matches the route's own regex: 404", async ({ request }) => {
    for (const file of ["1.png", "abc.svg", "1", "1.svg.svg", "-1.svg"]) {
      const res = await request.get(`/api/card/${encodeURIComponent(file)}`);
      expect(res.status(), file).toBe(404);
    }
  });
});

test.describe("GET /api/clean-history/[id]", () => {
  test("a valid existing id: 200, hint:true, 15s cache header", async ({ request }) => {
    const res = await request.get("/api/clean-history/1");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toContain("s-maxage=15");
    const body = await res.json();
    expect(body.hint).toBe(true);
  });

  test("an unknown id: 404", async ({ request }) => {
    const res = await request.get("/api/clean-history/999999");
    expect(res.status()).toBe(404);
  });

  test("a malformed id: 400", async ({ request }) => {
    const res = await request.get("/api/clean-history/abc");
    expect(res.status()).toBe(400);
  });
});
