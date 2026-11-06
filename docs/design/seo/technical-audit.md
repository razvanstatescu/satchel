# Satchel website: technical SEO and performance audit

**Date:** 2026-11-06 · **Site:** https://usesatchel.xyz (live production deploy) · **Source:** `apps/web`
**Scope:** baseline only. Nothing was changed. Every finding names the file where the fix would go.

---

## 0. How this was measured (and what could not be)

- **PageSpeed Insights API: not available today.** Every call returned HTTP 429 `Quota exceeded for quota metric
  'Queries' and limit 'Queries per day'`, both at first and on a retry later. The keyless PSI quota is shared by all
  anonymous callers and was already used up for the day. As a result **there is no CrUX field data** in this report.
  The origin is new and has little traffic, so CrUX would probably have reported "insufficient data" anyway. To get
  field data later, re-run PSI with an API key (`&key=…`) or query the CrUX API.
- **Replacement: Lighthouse 13.6.0 run locally against the live site.** It used Playwright's Chromium (Chrome for
  Testing, headless) and Lighthouse's default simulated throttling: mobile = Moto G Power, slow 4G, 4× CPU; desktop
  preset for desktop. There was one run per page per form factor, and nothing else heavy was running on the machine.
- **CPU calibration.** This machine's Lighthouse `benchmarkIndex` is **4461**. PSI's servers are several times slower,
  so with the default 4× CPU slowdown our TBT is too optimistic. To approximate PSI, three key pages were re-run on
  mobile with **12× CPU slowdown** (table 1b). Treat 1b as the realistic mobile expectation.
- **HTML, headers and crawl checks:** `curl` against the live site (including bot user agents), plus reading the source.
- **Bundle:** I downloaded every script that `/` references and identified each chunk by the libraries' own error
  strings and identifiers (Turbopack production chunks carry no module paths). I did not do a local build, because
  the live waterfall was enough.

---

## 1. Baseline scores

### 1a. Lighthouse, default throttling (live site, 2026-11-06 ~10:11–10:13 UTC)

**Mobile**

| Page | Perf | A11y | Best pr. | SEO | FCP | LCP | TBT | CLS | Speed Index | TTI |
|---|---|---|---|---|---|---|---|---|---|---|
| `/` | 100 | 100 | 100 | 100 | 1.1 s | 1.1 s | 70 ms | 0 | 1.7 s | 2.2 s |
| `/questions` | 100 | 100 | 100 | 100 | 1.0 s | 1.0 s | 60 ms | 0 | 1.0 s | 1.9 s |
| `/market` | **97** | 100 | 100 | 100 | 0.9 s | 0.9 s | 80 ms | 0 | **4.4 s** | 1.9 s |
| `/contract` | 100 | 100 | 100 | 100 | 1.0 s | 1.0 s | 60 ms | 0 | 1.0 s | 2.1 s |
| `/s/1` | 100 | 100 | 100 | 100 | 1.0 s | 1.0 s | 70 ms | 0 | 1.4 s | 2.1 s |
| `/mint` | 100 | 100 | 100 | 100 | 1.0 s | 1.0 s | 60 ms | 0 | 1.1 s | 2.0 s |

**Desktop**

| Page | Perf | A11y | Best pr. | SEO | FCP | LCP | TBT | CLS | Speed Index | TTI |
|---|---|---|---|---|---|---|---|---|---|---|
| `/` | 100 | 100 | 100 | 100 | 0.3 s | 0.3 s | 0 ms | 0 | 0.5 s | 0.3 s |
| `/questions` | 100 | 100 | 100 | 100 | 0.3 s | 0.3 s | 0 ms | 0 | 0.3 s | 0.3 s |
| `/market` | **97** | 100 | 100 | 100 | 0.3 s | 0.3 s | 0 ms | 0 | **1.8 s** | 0.3 s |
| `/contract` | 100 | 100 | 100 | 100 | 0.3 s | 0.3 s | 0 ms | 0 | 0.4 s | 0.3 s |
| `/s/1` | 100 | 100 | 100 | 100 | 0.3 s | 0.3 s | 0 ms | 0 | 0.4 s | 0.3 s |
| `/mint` | 100 | 100 | 100 | 100 | 0.3 s | 0.3 s | 0 ms | 0 | 0.4 s | 0.3 s |

### 1b. Mobile with PSI-like CPU (12× slowdown), performance only

| Page | Perf | FCP | LCP | TBT | CLS | SI | TTI | JS boot-up | Main-thread work |
|---|---|---|---|---|---|---|---|---|---|
| `/` | **91** | 1.1 s | 1.1 s | **370 ms** | 0 | 1.4 s | 3.1 s | 1.1 s | 4.1 s |
| `/s/1` | **89** | 1.0 s | 1.0 s | **440 ms** | 0 | 1.3 s | 2.3 s | 1.3 s | 2.7 s |
| `/questions` | **88** | 0.9 s | 0.9 s | **490 ms** | 0 | 0.9 s | 2.1 s | 0.8 s | 1.8 s |

**Takeaway.** Accessibility, Best Practices and SEO are 100 on every page. Paint metrics are excellent: LCP is a text
node, CLS is 0 and TTFB is about 100 ms from a Vercel edge HIT. **Two things hold the scores down.** (1) **TBT from
hydration and shipped JS**: on PSI-class hardware, every page loses 9–12 points to TBT. (2) **`/market` paints nothing
for about 2.9 s** (section 2.1). If PSI comes back, mobile Performance is expected around 85–92 and `/market` lower.

### 1c. LCP element and breakdown (mobile)

| Page | LCP element | TTFB | Render delay |
|---|---|---|---|
| `/` | `h1#hero-title` "Sell a wallet with everything inside. The buyer checks it first." | 108 ms | 399 ms |
| `/questions` | header lead `<p>` "The short version is on the homepage…" | 118 ms | 179 ms |
| `/market` | header lead `<p>` "Mint your own, fill it with testnet coins…" | 109 ms | **2765 ms** |
| `/contract` | header `<p>` "This account has keys…" (desktop: a `curl` code block) | 108 ms | 312 ms |
| `/s/1` | object-page lead `<p>` "Whoever owns Satchel #1 controls the coins…" | 104 ms | 378 ms |
| `/mint` | `h2#flow-title` "Mint a Satchel" | 103 ms | 379 ms |

No LCP is an image, so there are no image-delivery opportunities. The render delay on the fast pages comes from the
CSS → font chain (section 2.4).

### 1d. Lighthouse opportunities and diagnostics (same on every page unless noted)

| Audit | Result |
|---|---|
| Reduce unused JavaScript | **119–121 KiB** savings. Top: `118omhmyyyefa.js` (73% unused, noble curves), `2npu3km12ktyc.js` (36%, React DOM + Next runtime), `1gx3gizth54sj.js` (70%, secp256k1), `32cj4vjjlrbu6.js` (66%, zod + hashing) |
| Render-blocking requests | 150 ms on `/` (`10bgs-m9kq52z.css` 17 KB br, global; `3bcrh90zw8pyq.css` 7 KB br, landing) |
| Legacy JavaScript | 14 KiB in the Next/React chunk (`Array.prototype.at/flat/flatMap`, `Object.fromEntries`, `Object.hasOwn`, `trimStart/End` polyfills) |
| Network dependency tree | Longest chain: document → global CSS → `797e433ab948586e…woff2` (a font found through the CSS, not preloaded) = 475 ms. No preconnects needed |
| Long tasks (4× CPU) | 3 on `/`: React DOM chunk 108 ms, Next router chunk 66 ms, document 64 ms. At 12× CPU the React DOM chunk reaches 319 + 218 ms |
| JS boot-up (12× CPU, `/`) | `3bwo3losw1p5m.js` (LandingMotion) **1487 ms total, of which 104 ms is scripting**. The rest is style, layout and paint triggered by the motion engine at load. React DOM chunk 876 ms. Document parse 1046 ms |
| Main-thread breakdown (12×, `/`) | Other 1.49 s · Script eval 1.03 s · Style & layout 0.80 s · Rendering 0.39 s · Parse/compile 0.30 s |
| Third parties | **`raw.githubusercontent.com/hot-dao/near-selector/…/manifest.json`** (near-connect's wallet manifest), fetched on **every page load** for every visitor |
| DOM size | `/` 1513 elements (depth 20) · `/s/1` 921 · `/questions` 557 · `/market` 429 · `/contract` 367 · `/mint` 319. All under the warning threshold |
| Transfer (`/`, mobile) | 631 KiB total over 42 requests: **script 466 KiB (26 requests)**, fonts 74 KiB (3), document 35 KiB, CSS 24 KiB, other 32 KiB. 0 images |
| Cache policy / image delivery / font-display / CLS culprits / forced reflow / duplicated JS | all pass |

---

## 2. Performance findings

### 2.1 `/market` blocks the whole document for about 2.6–3 s (highest-impact performance bug)

- **Measured.** Three of three `curl` requests to `/market` took a **total of 2.64–2.73 s**, even though the first header
  bytes arrive at about 120 ms and `x-vercel-cache` says HIT. A chunk-timed fetch received the first body bytes at
  **3.06 s**. The other pages finish in 0.11–0.39 s. Lighthouse observed **FCP = LCP = 2.87 s**, and its filmstrip is
  blank until 3.2 s, which explains SI 4.4 s and Perf 97. The simulated LCP of 0.9 s hides this.
- **Cause.** `src/app/(app)/market/page.tsx` calls `await connection()` (in `requestTime()`) so that "checked 2 min ago"
  is computed per request. That makes the whole page a request-time render. The page has no Suspense boundary (by
  design: judge facts must not stream), so React cannot flush any of the body until `getMarket()` and
  `getUnlistedMarket()` resolve. Those are "use cache" (15 s), but in production they still took about 2.5 s on every
  request, either because the cache entry is per instance or in memory, or because it misses and recomputes the
  snapshots and server clean checks.
- **Fix (S–M).** Make `/market` prerenderable again. Drop `connection()`, render with `as_of` from the cached data,
  and let a tiny client island turn `checked_at` into "N min ago" after hydration. The server HTML can say "Server
  check at 10:14 UTC", which is still a fact without a fallback. Alternatively, keep request time but move the reads to
  a shared cache (`"use cache: remote"`) so they are always warm. Files: `src/app/(app)/market/page.tsx`,
  `src/components/Clean.tsx` (`checkedAgo`, `GateLine`), `src/lib/data/server.ts` (`getMarket`, `getUnlistedMarket`).

### 2.2 Every page ships the whole wallet, signing and chain stack (largest JS cost)

JS that the HTML of `/` references: **23 files, 1.52 MB raw / 486 KB brotli**. That includes the `noModule` polyfill
`0c0hxoamwjsbw.js` (41 KB br), which modern browsers skip, so the effective figure is **about 445 KB br for modern
browsers**. Lighthouse counted 466 KiB of script, including lazy chunks.

| Chunk (br) | What it is (by fingerprint) | Needed on a marketing page? |
|---|---|---|
| `2npu3km12ktyc` 73 KB, `0pw_cp-_l0mvu` 47 KB, `21bvmkm3qt98n` 8 KB, `0q25xv62me76x` 4 KB, `turbopack-…` 5 KB, `423_…` 2 KB | React DOM, Next app router, prefetch, runtime | yes (about 139 KB br baseline) |
| `118omhmyyyefa` 71 KB | `@noble/curves` secp256k1 + ed25519, `@noble/hashes` (keccak/sha3), via `@satchel/core/derive` | **no** |
| `1gx3gizth54sj` 31 KB | secp256k1 field math (viem / noble) | **no** |
| `2vwmqmcrlehiu` 20 KB | viem chains and errors (Sepolia, Arbitrum Sepolia, …), via `@satchel/core/chains/evm` | **no** |
| `20soa7xyeah4r` 13 KB | `@bitcoinerlab/secp256k1` / tiny-secp256k1 + Buffer polyfill | **no** |
| `3tiogjo_z1nic` 9 KB | bech32 (`@scure/base`) | **no** |
| `32cj4vjjlrbu6` 33 KB | **zod** (from `src/lib/config.ts`, `import { z } from "zod"`) + hashing | **no** (validate env on the server) |
| `2pks94li91rus` 29 KB | **the entire `copy` object** (`src/lib/copy.ts` aggregates every namespace) | only the shell strings |
| `34xfakj6nehgr` 14 KB | NEAR birth-action and history checks (`DeployContract`, `FunctionCall new`) | **no** |
| `41e8l59i128j7` 20 KB | WalletProvider, NEAR outcome/errors, near-api-js bits | defer |
| `0m42syupr7x6w` 12 KB | `WalletPickerHost` and the ed25519 path | defer |
| `0hxi2oxuuptsm` 8 KB | Onboarding overlay | defer |
| `1uurfe8jn34p5` 5 KB | AccountControl, LandingAccount, PendingIndicator, RefreshAfterSend | small, keep |
| `0ic-7j07dgbm-` 10 KB | lucide icons + toast | keep / trim |
| `3bwo3losw1p5m` 7 KB | LandingMotion | keep (defer mount, see 2.5) |
| lazy `3gwx7-h5loerp` 14 KB | **`@hot-labs/near-connect`**, imported on mount at about 575 ms | defer to click |
| lazy `14h3w…`, `3mq77…`, `39ft1…`, `0xtv3…` ≈ 37 KB | route prefetch of `/s/1` from in-viewport links | fine |

**How it gets in.** The root layout renders `<Providers>` (`src/components/client/Providers.tsx`: `WalletProvider`,
`OnboardingProvider`, `Toaster`), and both shells render client islands that statically import data and signing
modules:

- `PendingIndicator` → `src/lib/signing/client.ts` → `lib/data/source.ts` (fixtures, sim, `evm-networks` → **viem**,
  `near/rpc` → **near-api-js**, `near/history`), plus `signing/runner`.
- `RefreshAfterSend` → `src/lib/data/client.ts` → `lib/data/snapshot.ts` → `lib/derive.ts` → **noble curves,
  bech32**.
- `NavLinks` and `Onboarding` → `dataSource()` + `contractViews` (`@satchel/core/near`).
- `ConnectButton` / `WalletPickerHost` → `lib/signing/machine`, `getConnector`.
- `lib/config.ts` → **zod** at module scope. Any client file that reads a constant pulls zod in.
- Any client file importing `copy` from `@/lib/copy` gets every namespace (84 KB raw).

**Estimate.** Gating these behind dynamic imports takes `/` from about 445 KB br to roughly **150–180 KB br** of JS.
That removes most of the 370–490 ms TBT seen at 12× CPU.

### 2.3 near-connect and its GitHub manifest load for every visitor

`src/lib/near/wallet.tsx` calls `getConnector()` in a mount `useEffect` on every page. That imports near-connect
(14 KB br), constructs `NearConnector`, and fetches
`https://raw.githubusercontent.com/hot-dao/near-selector/refs/heads/main/repository/manifest.json`. This is the only
third party on the site. It costs main-thread time, raw GitHub rate limits are shared, and it leaks a request for
visitors who never connect. **Fix (S):** on mount, only construct the connector if a session is stored. near-connect
persists `selected-wallet` in its storage: confirm the exact key or prefix and read it with `localStorage`. Otherwise
set `{ ready: true, accountId: null }` and build the connector inside `signIn()`. A `requestIdleCallback` is enough
if a session exists.

### 2.4 Render-blocking CSS and the font chain

Two blocking stylesheets on `/` (87 KB raw / 17 KB br global + 32 KB raw / 7 KB br landing) cost about 150 ms of
render delay. Funnel Display and Onest are preloaded by a `Link` header. A third WOFF2 (`797e433ab948586e`) is found
only through the CSS: Geist Mono (`preload: false`), or a second subset, used above the fold. **Options (S):**
try `experimental.inlineCss: true` in `apps/web/next.config.ts` (it inlines the CSS into `<head>` and removes the
round trip; measure the HTML growth). Check whether the font found late is above the fold on `/`. If it is, preload
it; if not, keep it off the critical path.

### 2.5 Landing motion and hydration CPU

At 12× CPU, `LandingMotion`'s chunk accounts for **1.5 s of main-thread time, but only 0.1 s of it is script**. The
rest is style and layout work the motion engines (`mountHero`, `mountCode`, `mountCharms`, `mountEnter`) start at
load. **Fix (S):** start the engines after `load` plus `requestIdleCallback` (or on first intersection for each
section, which `mountEnter` already uses), and keep the hero's first frame static. Visuals are unchanged, only the
scheduling moves. File: `src/components/landing/LandingMotion.tsx`.

### 2.6 HTML weight: every SVG is sent twice

`/` is **367 KB of raw HTML (35 KB br)**. **235 KB of it is inline `<script>` (the RSC flight payload)**, which
re-serialises the server tree, including **139 inline `<svg>`** (charms, art, icons). Other pages have the same
ratio: `/s/1/activity` is 359 KB raw with 268 KB inline script. Compressed it is fine, but the browser still parses
it all (document 1.0 s of CPU at 12×). **Fix (M):** move repeated decorative art to a server-rendered SVG sprite
(`<svg><use href="#charm-btc"/></svg>`) or to static `.svg` files referenced by `<img>`/CSS. Both render the same
pixels. Files: `src/components/landing/art.tsx`, `src/components/landing/more-art.tsx`, `src/components/brand/*`.

### 2.7 Smaller items

- **Legacy JS 14 KiB.** These are Next's own polyfill module in the framework chunk. Not actionable by the app today;
  ignore.
- **`/s/[id]/opengraph-image`** is served with `cache-control: public, max-age=0, must-revalidate` (41 KB PNG). Social
  scrapers refetch it each time. Add a short `revalidate` (e.g. 300 s) on the image route.
- **TTFB is excellent** everywhere except `/market`: about 0.11–0.15 s with an edge HIT. `/s/1` is 0.30–0.38 s (STALE
  revalidation).

---

## 3. Crawlability and HTML audit

### 3.1 Site-wide

| Check | Result |
|---|---|
| `<html lang>` | `en` on every page ✓ |
| `viewport`, `theme-color`, manifest, favicon/icon/apple-icon | all present ✓ (`src/app/layout.tsx`, `manifest.ts`) |
| **Canonical** | **missing on every page.** `/mint?from=/`, `/mint?from=/market`, `/mint?from=/s/1` are all linked internally and have no canonical |
| **`og:url`** | **missing on every page** |
| OG image | `/opengraph-image.png` 1200×630, 50 KB ✓; per-Satchel `/s/[id]/opengraph-image` ✓ |
| **`og:title` / `og:description`** | **"Satchel" / "An NFT that is a wallet." on every inner page** (`/questions`, `/market`, `/contract`, `/mint`, `/satchels`), because those pages inherit the root layout's `openGraph` object |
| **`twitter:title` / `twitter:description`** | **"Satchel" / "An NFT that is a wallet." on every page, including `/` and `/s/1`**, because the root layout hard-codes them in `twitter`. No `twitter:site` |
| JSON-LD | **none** on any page |
| hreflang | none (single language, which is correct) |
| Images | 0 `<img>`; all art is inline SVG (no alt or format issues; decorative SVGs are `aria-hidden`) |
| Server HTML without JS | ✓ All key copy, FAQ answers (inside `<details>`), market listings, Satchel addresses and contract facts are in the HTML. No Suspense fallbacks (`<!--$?-->`) and no hidden `S:` segments. Content works for crawlers that don't run JS |
| Bot access | `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Googlebot` and `curl` all get **200** and the same 367 KB document on `/` ✓ |
| HTTPS / redirects | `http://` → **308** → `https://` ✓; `/questions/` → **308** → `/questions` ✓ |
| **www** | **`www.usesatchel.xyz` has no DNS record** (NXDOMAIN). Anyone typing www gets a browser error |
| 404 | `/nope`, `/QUESTIONS`, `/s/abc`, `/s/9999` → **404** with `noindex` and a server-rendered "This Satchel doesn't exist" page ✓ (`src/proxy.ts`) |
| Compression | HTML served br (`/` 35.6 KB) and gzip (47 KB) ✓; static chunks `public, max-age=31536000, immutable` + br ✓ |
| HTML caching | `cache-control: public, max-age=0, must-revalidate`, `x-vercel-cache: HIT/PRERENDER/STALE`, `x-nextjs-prerender: 1` ✓ |
| Security headers | only HSTS. No `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` or CSP (Lighthouse BP is still 100; low priority) |
| `/llms.txt` | 404 (optional; useful for AI agents, see fix 13) |

### 3.2 `/robots.txt` (from `src/lib/seo.ts` `robotsFor`)

```
User-Agent: *
Allow: /
Host: https://usesatchel.xyz
Sitemap: https://usesatchel.xyz/sitemap.xml
```

Correct and permissive. `Host:` is a non-standard Yandex directive that Google ignores. It is harmless, but it can
be dropped.

### 3.3 `/sitemap.xml` (from `src/lib/seo.ts` `sitemapFor`)

17 URLs: `/`, `/market`, `/mint`, `/contract`, `/satchels`, and `/s/{1..4}` × {object, `/activity`, `/sale`}.

- **`/questions` is missing.** It is the longest page on the site (1,924 words) and the best answer page for AI
  crawlers. Add it to `STATIC_PATHS`.
- No `<lastmod>`. Google ignores `changefreq`/`priority`, but it uses `lastmod`. Use the deploy time for static pages
  and, if cheap, the latest activity block time for Satchels.
- `/satchels` is listed, but it is a per-wallet page with 106 words of static copy for crawlers (thin). Consider
  removing it from the sitemap and marking it `noindex`.
- `/s/N/sale` is listed for every Satchel. For an unlisted one it is a thin "Satchel #1 isn't for sale" page (142
  words). List `/sale` only for listed tokens (the listing data is already read for the market), or `noindex`
  unlisted sale pages.
- `/s/N/transactions` (indexable, no robots meta) is not in the sitemap. Decide whether it is a public page; if it
  is, add it.

### 3.4 Per-page findings

| Page | `<title>` (len) | Meta description (len) | H1 | Heading outline (H2s) | Words (SSR) | Internal links | Issues |
|---|---|---|---|---|---|---|---|
| `/` | "An NFT that is a wallet · Satchel" (33) | "An NFT on NEAR with its own Bitcoin, Ethereum and Solana addresses. Give it or sell it…" **(172: over ~155–160, gets cut off)** | 1: "Sell a wallet with everything inside. The buyer checks it first." | One NFT. Its own addresses · Sending coins is easy… · Mint it. Add coins. Hand it over. · A signature can outlive a sale · Development contract · What else it does · Questions · Stick it on. Hand it over. (h3s under the use/how/more sections) | 1,217 | 14 unique (incl. `/questions` + 5 deep anchors, `/s/1`, `/s/1/activity`, `/market`, `/contract`, `/mint`) | og:title "Satchel" (not the page title); twitter:title/desc generic; no canonical/og:url; no JSON-LD; 8 FAQ items as `<summary>` without heading or FAQ schema |
| `/questions` | "Questions · Satchel" (19) | "Every honest answer about how Satchel works, grouped and in one place." **(70: short, no keywords)** | 1: "Questions" | 10 group h2s (Basics … Testnet and safety); **35 questions are `<summary>` text, not headings** | 1,924 | 9 unique | **not in sitemap**; generic og/twitter; title is generic ("Questions"); no FAQPage JSON-LD |
| `/market` | "Market · Satchel" (16) | "Satchels for sale on NEAR testnet. Your browser checks each one's history before you can buy." (93) | 1: "Market" | Nothing's for sale right now · Unlisted Satchels · Satchel #1…#4 (card names as h2) | 209 | 14 unique (`/s/N/offer` ×4) | **2.6–3 s blocking render** (2.1); generic og/twitter; thin intro copy |
| `/contract` | "Contract facts · Satchel" (24) | "Satchel's contract account: born without a key, the code hash it runs, and copy-paste commands to verify both." (110) | 1: "Development contract" | Verify it yourself | 341 | 9 unique | title says "Contract facts", H1 says "Development contract" (fine for dev; align when the final contract ships); generic og/twitter |
| `/s/1` | "Satchel #1 · Satchel" (20) | "Satchel #1 is an NFT on NEAR testnet. It controls Bitcoin testnet4 address tb1q…, Ethereum Sepolia address 0x2f63…, Solana devnet address 2jgC… through NEAR Chain Signatures…" **(347: about 2× too long)** | 1: **"This NFT is a wallet."** (visitor H1; generic and identical on every Satchel) | Satchel #1 · Want this Satchel? · Inside · Addresses · Facts · Spending allowance · How it works | 643 | 30+ (coin pages, explorers) | og:title ✓ but **og:type and og:site_name missing** (the segment's `openGraph` replaces the root's); twitter:title/desc generic; og:image:alt generic |
| `/s/1/activity` | "Activity · Satchel #1" (21) | **same 347-char description as `/s/1`** (duplicate) | 1: "Satchel #1" | **h2 "Satchel #1" again**, then date groups (Nov 5, Nov 4…) | 512 | 11 + explorer links | duplicate description; duplicate H1/H2 text; og:title "Satchel #1 · Satchel" (not "Activity …") |
| `/s/1/sale` | "Sale · Satchel #1" (17) | **same 347-char description** (duplicate) | 1: "Satchel #1" | Satchel #1 · "Satchel #1 isn't for sale." | 142 | 11 | thin when unlisted; duplicate description |
| `/mint` | "Mint a Satchel · Satchel" (24) | "Mint a Satchel: an NFT with its own Bitcoin testnet4, Ethereum Sepolia and Solana devnet addresses." (99) | **0**: the flow title is `h2#flow-title`; the backdrop's "My Satchels" is a `<p>` | Mint a Satchel | 149 | 9 | **no H1**; `?from=` duplicates with no canonical; generic og/twitter |
| `/satchels` | "My Satchels · Satchel" (21) | 94 chars ✓ | 1: "My Satchels" | Your Satchels live in your NEAR wallet | 106 | 9 | thin for crawlers; in sitemap; consider `noindex` |
| flows (`/s/N/send`, `/offer`, `/transfer`, `/sign`, `/allowance`, `/give-link`, `/empty`, `/coin/*`), `/address-book`, `/claim`, 404 | — | — | — | — | — | — | `noindex` ✓ (`/s/N/receive` and `/s/N/transactions` are indexable: intended?) |

---

## 4. Prioritised fixes (impact × effort)

Impact: H = moves a Lighthouse score or what a crawler or sharer sees on a key page; M = noticeable; L = hygiene.
Effort: XS < 30 min · S < 2 h · M = half a day · L = more than a day.

| # | Fix | Impact | Effort | File(s) |
|---|---|---|---|---|
| **1** | **Unblock `/market`**: drop `await connection()`, render from cached `as_of`, show "N min ago" from a client island (or use `"use cache: remote"`). Removes the 2.6–3 s blank page (Perf 97 → 100, SI 4.4 s → about 1 s) | **H** | S–M | `src/app/(app)/market/page.tsx`, `src/components/Clean.tsx`, `src/lib/data/server.ts` |
| **2** | **Add `/questions` to the sitemap** and add `lastModified`; drop `/satchels`; list `/sale` only for listed tokens | **H** (crawl) | XS | `src/lib/seo.ts` (`STATIC_PATHS`, `sitemapFor`), `src/app/sitemap.ts` |
| **3** | **One `pageMetadata({ title, description, path, ogImage? })` helper** that sets `alternates.canonical`, `openGraph.{title,description,url,type,siteName,images}` and `twitter.{title,description}` per page. Remove the hard-coded `twitter.title/description` from the root layout. Fixes generic og/twitter text on every inner page, missing canonical/og:url, and missing og:type/site_name on `/s/*` | **H** (sharing, dedupe) | S | `src/lib/seo.ts`, `src/app/layout.tsx`, `src/app/(landing)/page.tsx`, every `src/app/(app)/**/page.tsx`, `src/app/(app)/s/[id]/layout.tsx` |
| **4** | **Take the chain, signing and data stack off the shared shell**: dynamic-import `lib/signing/client` in `PendingIndicator` only when stored intents exist; lazy `RefreshAfterSend`; `next/dynamic` for `OnboardingProvider` (only when `shouldShowOnboarding`) and `WalletPickerHost`; move `NavLinks`' contract read behind `import()`. Target: about 445 → about 160 KB br JS on `/`; TBT at 12× CPU 370–490 ms → under 150 ms | **H** (perf, every page) | M | `src/components/client/{Providers,PendingIndicator,RefreshAfterSend,NavLinks,Onboarding,ConnectButton}.tsx`, `src/lib/signing/client.ts`, `src/lib/data/{client,source}.ts` |
| **5** | **Don't build near-connect on mount** unless a session is stored. This removes the third-party GitHub manifest fetch and 14 KB of JS for visitors who don't connect | M | S | `src/lib/near/wallet.tsx` |
| **6** | **Keep zod and the full copy object out of the client**: validate env once on the server and export plain constants to client code (`src/lib/config.ts`); client components import namespaced copy (`@/lib/copy/shell`, `…/landing`) instead of the `copy` aggregate (29 KB br today) | M | M | `src/lib/config.ts`, `src/lib/copy.ts`, client components that import `copy` |
| **7** | **JSON-LD**: `WebSite` + `Organization` (name, url, logo, `sameAs` GitHub) + `SoftwareApplication`/`WebApplication` (applicationCategory "FinanceApplication", operatingSystem "Web", offers price 0) on `/`; `FAQPage` on `/questions` (and the landing FAQ); `BreadcrumbList` on `/s/[id]/*`. Server-render it as `<script type="application/ld+json">` | M (AI answers, entity) | S | `src/app/(landing)/page.tsx`, `src/app/(app)/questions/page.tsx`, `src/app/(app)/s/[id]/layout.tsx`, new builder in `src/lib/seo.ts` |
| **8** | **Headings**: give `/mint` an H1 (make the flow title `h1` when the flow is the page); make the `/s/[id]` visitor H1 name the Satchel ("Satchel #1: this NFT is a wallet"); remove the duplicate "Satchel #1" H2 on tab pages; wrap each FAQ question in an `h3` inside `<summary>` (no visual change) | M | S | `src/components/client/FlowShell.tsx` / `MintFlow.tsx`, `src/components/client/SatchelPage.tsx`, `src/lib/copy/satchel.ts` (`visitorH1`), `src/app/(app)/questions/page.tsx`, `src/components/landing/QuestionsSection.tsx` |
| **9** | **Meta descriptions**: `/s/[id]` 347 → ≤155 chars (move the full addresses to the page body, which already has them); a distinct description for `/activity` ("Every signature Satchel #1 has issued…") and `/sale`; `/` 172 → ≤155; `/questions` 70 → about 140 with keywords; consider more descriptive titles for `/questions`, `/market`, `/contract` | M | XS | `src/lib/copy/satchel.ts` (`page.meta`), `src/lib/copy/landing.ts`, `src/lib/copy/questions.ts`, `src/app/(app)/s/[id]/{activity,sale}/page.tsx` |
| **10** | **Landing CPU**: start LandingMotion's engines after load/idle or on first intersection (1.5 s main-thread at 12× today, almost all style/layout); move repeated decorative SVG to a sprite or static files to shrink the 235 KB flight payload on `/` | M | M | `src/components/landing/LandingMotion.tsx`, `src/components/landing/{art,more-art}.tsx`, `src/components/brand/*` |
| 11 | Try `experimental.inlineCss: true` (saves the 150 ms CSS round trip) and preload the late-discovered WOFF2 if it is above the fold | L–M | S | `apps/web/next.config.ts`, `src/app/layout.tsx` |
| 12 | Add a `www` DNS record that 308-redirects to the apex (Vercel domain settings) | L | XS | Vercel project → Domains (no code) |
| 13 | Add `/llms.txt` (a short Markdown index: what Satchel is, the key URLs `/questions`, `/contract`, `/s/1/activity`, the repo) as a static route | L–M (AI agents) | XS | `src/app/llms.txt/route.ts` (new) |
| 14 | `noindex` `/satchels`; decide on `/s/N/receive` and `/s/N/transactions`; drop the `Host:` line from robots | L | XS | `src/app/(app)/satchels/page.tsx`, `src/app/(app)/s/[id]/{receive,transactions}/page.tsx`, `src/lib/seo.ts` |
| 15 | Cache the per-Satchel OG and Twitter images (`revalidate` about 300 s); per-Satchel `og:image:alt` ("Satchel #1 card: …") | L | XS | `src/app/(app)/s/[id]/opengraph-image.tsx`, `twitter-image.tsx` |
| 16 | Baseline security headers (`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`) via `headers()` | L | XS | `apps/web/next.config.ts` |

**Expected result after fixes 1–6 and 10:** mobile Performance ≥ 95 on PSI-class hardware on every audited page, with
A11y, Best Practices and SEO staying at 100.

---

## 5. A reusable marketing-page template that scores ≥ 95 on all four categories

For new pages that are marketing or content (landing variants, `/questions`, future "how it works" or comparison
pages). It can live as a `(marketing)` route group with its own layout.

**Include**
- A **server-only layout**: static TopBar (links + one small "Connect" client button), Footer, SkipLink. Mark the
  route `export const dynamic = "error"` or keep it free of `connection()`/cookies so it is fully prerendered at the
  edge.
- Metadata from the shared **`pageMetadata()` helper** (title ≤ 60, description 120–155, canonical, og/twitter with
  the page's own text, `og:url`, 1200×630 image + alt).
- **Exactly one H1** with the page's primary phrase, then a logical H2/H3 outline. FAQ questions are headings.
- **JSON-LD** fitting the page type (`WebPage` + `BreadcrumbList`; `FAQPage` where there are Q&As; `WebSite` /
  `Organization` / `SoftwareApplication` on `/` only).
- All copy **server-rendered** with no Suspense fallbacks (it already works this way for judges and AI crawlers).
- `next/font` with **at most two preloaded** families. Mono stays non-preloaded unless it is above the fold.
- Decorative art as an **SVG sprite or static `.svg`**, not repeated inline SVG trees (smaller HTML and RSC payload).
- Motion as a **single deferred island** that starts on idle or intersection and respects `prefers-reduced-motion`.
- An entry in `sitemapFor()` (with `lastModified`) and a link from at least one existing page.

**Exclude**
- `Providers`/`WalletProvider`, `OnboardingProvider`, `PendingIndicator`, `RefreshAfterSend`, `NavLinks` contract
  reads, `WalletPickerHost`: anything that imports `lib/data/*`, `lib/signing/*`, `lib/near/*`, `lib/derive`,
  `@satchel/core/*`, viem, near-api-js or near-connect. "Connect" can be a link to `/satchels`, or a button that
  `import()`s the wallet on click.
- The `copy` aggregate and `zod` in client code.
- Request-time APIs (`connection()`, `cookies()`, `headers()`) anywhere in the tree.
- Third-party requests on load (wallet manifests, analytics without consent).
- Images without explicit `width`/`height` (CLS), and any above-the-fold content that waits on JS to become visible.

On this site's numbers, that page would ship about 140–160 KB br of JS (React + Next + one island), with TBT under
150 ms at PSI-class CPU, LCP about 1 s on mobile and CLS 0: Performance ≥ 95, A11y/BP/SEO 100.

---

## Appendix: raw numbers

- HTML size (raw / br): `/` 367 KB / 35.6 KB · `/questions` 203 / 20.6 · `/market` 225 / 17.6 · `/contract` 135 /
  15.6 · `/s/1` 210 / 23.2 · `/mint` 176 / 15.3 · `/s/1/activity` 359 KB raw.
- Inline-script (RSC payload) share of HTML: `/` 235 KB · `/s/1/activity` 268 KB · `/market` 165 KB · `/mint` 132 KB
  · `/questions` 123 KB · `/s/1` 105 KB · `/contract` 84 KB.
- Requests (mobile Lighthouse): `/` 42 · `/questions` 34 · `/market` 43 · `/contract` 35 · `/s/1` 53 · `/mint` 34.
  Script transfer 430–486 KiB on every page (it is the shared shell, not the page).
- `/market` document completion: three `curl` runs 2.65, 2.73, 2.64 s; one chunk-timed fetch with the first body byte at
  3.06 s; Lighthouse observed FCP 2.87 s (mobile). Other pages: 0.11–0.39 s.
- Lighthouse JSON reports for this baseline were kept outside the repo (scratch). Re-run with
  `npx lighthouse https://usesatchel.xyz/<path> [--preset=desktop] [--throttling.cpuSlowdownMultiplier=12]`.
