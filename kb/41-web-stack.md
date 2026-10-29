# 41 · Web stack: versions to pin, RPC providers, polyfills, reading NFT state, judge/demo access

> Owner: web · Checked: 2026-10-21 · Confidence: high for versions, bundling and RPC behaviour (all measured today); medium for provider rate limits (unpublished, and measured from one IP that the whole research team shares)
> Primary sources: npm registry (live, 2026-10-21); `create-next-app@16.4.2` scaffold output; Next.js docs bundled in `next@16.4.2` (`node_modules/next/dist/docs/`); `near/docs` @ `117e742` (`api/rpc/providers.mdx`, `api/rpc/transactions.mdx`); `docs.fastnear.com` (`/rpc.md`, `/auth.md`, `/auth/browser-keys.md`, `/api.md`); `vercel.com/docs/functions/limitations` (last_updated 2026-08-24); `near/near-api-js` @ `2546c85` (7.3.1); `chainsig.js@1.1.16` (npm tarball).
> Spikes: `research/spikes/web/next-polyfill-probe/` (Next 16 build plus chain libs), `research/spikes/web/browser-runner/` (system Chrome via playwright-core), `research/spikes/web/rpc-lifecycle/` (RPC probes). Raw output is in `research/spikes/web/RESULTS.md`.

## TL;DR: what an implementer must know

- **Pin these (npm, 2026-10-21):** `next@16.4.2`, `react@19.3.x`, `typescript@5.9.3` (keep it on 5.x even though npm `latest` is now 7.0.2), `tailwindcss@4.3.3` + `@tailwindcss/turbopack@4.3.3`, `shadcn@4.22.1`, `motion@14.5.0`, `@tanstack/react-query@5.104.5`, `viem@2.57.7`, `zod@4.6.7`, `@playwright/test@1.64.1`, `near-api-js@7.3.1`, `@hot-labs/near-connect@0.11.4`. Commit the lockfile on Nov 1. **[VERIFIED]**
- **`create-next-app@16.4.2` is not the Next.js you remember.** It turns on `cacheComponents: true` and `partialPrefetching: true`, wires Tailwind through a Turbopack loader (`@tailwindcss/turbopack`, with no PostCSS config), sets the TS target to ES2017 (which breaks BigInt literals, used by bitcoinjs-lib v7 and viem), and writes an `AGENTS.md` that tells coding agents to read `node_modules/next/dist/docs/`. `middleware.ts` is now `proxy.ts`, which runs on Node only. **[VERIFIED]**
- **Polyfills: Next 16 + Turbopack needs no config** for chainsig.js 1.1.16, bitcoinjs-lib 6.1.9 (the copy inside chainsig) and 7.0.4, viem, near-api-js 7 or near-connect. In a production build in headless Chrome, address derivation, the BTC PSBT sighash path, near-api-js views and the near-connect wallet list all worked. Free `Buffer` references are polyfilled per module, but `globalThis.Buffer` stays `undefined` unless you set it in `src/instrumentation-client.ts`. **[VERIFIED]**
- **chainsig.js costs about 7.2 MB raw / 1.7 MB gzip of client JS**, because its single entry imports chain-registry, cosmjs, xrpl, aptos, sui and solana. Our route with chainsig.js measured 7.9 MB raw / 1.93 MB gzip; the same route without it measured 0.70 MB / 210 KB. Keep chainsig.js out of client components. Do derivation with @noble/curves and build txs with viem / bitcoinjs-lib directly, or lazy-load chainsig.js only inside the Send flow. **[VERIFIED]**
- **chainsig.js defaults to `https://rpc.testnet.near.org`**, which is deprecated and rate-limited. Always pass `fallbackRpcUrls` to `new contracts.ChainSignatureContract({...})`. **[VERIFIED]** (source plus live 429)
- **RPC: `rpc.testnet.near.org` is deprecated.** It answers `429 "WARNING! THIS ENDPOINT IS DEPRECATED! STOP USING IT NOW!"` and, when it does answer, adds about 3.1 s. Use **FastNEAR** `https://rpc.testnet.fastnear.com` as primary and **dRPC** `https://near-testnet.drpc.org` as failover. dRPC's free plan cuts any request at **about 2 s** and has neither `broadcast_tx_commit` nor `tx_status`. The Intear testnet RPC returned 502. **[VERIFIED]**
- **FastNEAR's free tier rate-limited our shared IP within minutes** (`429`, `retry-after: 0`). My scripts were sending about 1–3 req/s, and the 8 other research agents share the same IP. Get a FastNEAR API key for the server/worker (human action). Browser keys restricted to our domain are a paid feature. **[VERIFIED]** for the 429, **[SOURCED]** for the browser-key note.
- **Vercel:** functions on both Hobby and Pro default to 300 s; the maximum is 300 s on Hobby and 800 s on Pro. A route can wait out a 2-minute MPC yield, but it should not: return the tx hash and let the client poll. **[SOURCED]**
- **Reading state:** for "My Satchels", call `nft_tokens_for_owner` on our own contract. FastNEAR's `/v1/account/{id}/nft` only lists which contracts an account holds NFTs in, not token ids. Cache with TanStack Query and invalidate after a tx. **[VERIFIED]**
- **Judges and demo:** make `/s/[id]` fully public and read-only (P0), keep the README CLI proofs (P0), and add a clearly labelled server-side demo signer on its own throwaway account, with a method allowlist, a single-flight lock and a global rate limit (P1). Do not weaken `sign_for` (one yocto, full-access key only) to make the demo easier.

## Verified facts & measurements

### Versions on npm today (`npm view <pkg> version time.modified`, 2026-10-21)

| Package | Latest | Notes |
|---|---|---|
| next / eslint-config-next | 16.4.2 (2026-10-20) | Turbopack is the default for dev and build. The scaffold enables Cache Components and Partial Prefetching. Node ≥ 20.9. |
| react / react-dom | 19.3.1 | `create-next-app@16.4.2` pins 19.3.0 |
| typescript | **7.0.2** (latest), 5.9.3 used by scaffold | The scaffold writes `"typescript": "^5"`. Do not jump to 7 during the event. **[ASSUMED]** risk: Next's type-check pipeline and typescript-eslint are on the TS 5 API. |
| tailwindcss / @tailwindcss/turbopack | 4.3.3 | The new scaffold uses `turbopack.rules['*.css'].loaders = ['@tailwindcss/turbopack']`, not `@tailwindcss/postcss` |
| shadcn (CLI) | 4.22.1 (2026-10-18) | `init -d` gives style `base-nova` on **`@base-ui/react@^1.9`** (not Radix), plus `cn@^0.5`, `lucide-react@^1.61`, `tw-animate-css`. Use `--base radix` if you want Radix primitives. |
| motion | 14.5.0 | `import { motion, AnimatePresence } from "motion/react"`; peer react ^18 \|\| ^19 |
| @tanstack/react-query | 5.104.5 | peer react ^18 \|\| ^19 |
| viem | 2.57.7 | |
| zod | 4.6.7 | `zod/v4`, `zod/mini` subpaths exist |
| @playwright/test | 1.64.1 | Next 16 peer `^1.51.1` |
| bitcoinjs-lib | 7.0.4 | v7 uses `Uint8Array` and **bigint** values. chainsig.js still depends on `^6.1.5` (6.1.9 installed, Buffer and number API). |
| @solana/web3.js / @solana/kit | 3.1.1 / 8.5.0 | chainsig.js depends on `@solana/web3.js ^1.98` (1.99.0 installed) |
| near-api-js | 7.3.1 (2026-08-12) | a single package again; `@near-js/*` stopped at 2.5.1 (2025-11-06). `engines.node >= 22.22.2`. |
| @hot-labs/near-connect | 0.11.4 (2026-05-11) | repo HEAD is at 0.11.5, unreleased |
| near-connect-hooks | 1.1.6 (2026-03-12) | |
| chainsig.js | 1.1.16 (2026-05-12) | depends on `@near-js/* ^2.2.4`, solana v1, bitcoinjs v6, plus cosmos/aptos/sui/xrpl/chain-registry |
| @defuse-protocol/one-click-sdk-typescript | 0.1.26 | (owned by `pay`) |
| eslint | 10.13.0 latest; scaffold installs ^9 (deprecated warning) | Next 16 uses flat config |

### What `create-next-app@16.4.2` generates **[VERIFIED]**

Command: `CI=1 npx -y create-next-app@16.4.2 next-polyfill-probe --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --disable-git --no-agent-feedback --yes`

```ts
// next.config.ts (generated, verbatim)
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
};
```
- `package.json` contains next 16.4.2, react 19.3.0, `@tailwindcss/turbopack ^4`, `tailwindcss ^4`, `typescript ^5`, `eslint ^9`, `@types/node ^20`.
- `tsconfig.json` uses `"target": "ES2017"`. A BigInt literal (`1000n`) then fails `next build` with `TS2737: BigInt literals are not available when targeting lower than ES2020`. Set `"target": "ES2022"`. After changing tsconfig, **delete `.next/`**: the first rebuild still failed with the cached type info and passed only after `rm -rf .next`.
- `AGENTS.md` says: *"This is NOT the Next.js you know … Read the relevant guide in `node_modules/next/dist/docs/` … before writing any code."* That folder holds 474 docs files. Keep `AGENTS.md` and point Claude at it.

### Next 16 changes that affect Satchel **[SOURCED]** from `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` and `.../next-config-js/cacheComponents.md`

- **Turbopack is the default** for `next dev` and `next build`. A custom `webpack` config makes `next build` **fail** unless you pass `--webpack`. The replacement for `resolve.fallback` is `turbopack.resolveAlias: { fs: { browser: './empty.ts' } }`.
- **`middleware.ts` → `proxy.ts`**, `export function proxy(request)`. *"The `edge` runtime is NOT supported in `proxy`."* (We don't need a proxy for the MVP.)
- **Async request APIs:** `params`, `searchParams`, `cookies()` and `headers()` are Promises. Use `PageProps<'/s/[id]'>` and `const { id } = await props.params`.
- **Cache Components:** data fetching is dynamic by default. Use `"use cache"` together with `cacheLife()` / `cacheTag()` (both `import … from 'next/cache'`). A `runtime` segment export is not allowed. **[VERIFIED]** Reading `params` or uncached RPC data outside `<Suspense>` fails `next build`:
  ```
  Error: Route "/s/[id]": Next.js encountered uncached or runtime data during prerendering.
  `fetch(...)`, `cookies()`, `headers()`, `params`, `searchParams`, or `connection()` accessed outside of `<Suspense>` prevents the route from being prerendered …
    - [stream] Provide a placeholder with `<Suspense fallback={...}>` around the data access
    - [cache] For uncached data (`fetch`, database calls): cache the access with `"use cache"`
    - [block] Set `export const instant = false` to allow a blocking route
  ```
  near-api-js calls count as "uncached data" too. The fix is the `<Suspense>` + `"use cache"` pattern shown under "Reading NFT state".
- **Navigation keeps the previous route mounted inside React `<Activity mode="hidden">`.** Effects are cleaned up when the route is hidden and re-run when it is shown again. So a signing tracker that lives in a component `useEffect` stops when the user navigates away. Put it in a module-level store (see 40 §Client flow).
- `next lint` was removed; run the ESLint CLI with flat config. `images.qualities` now defaults to `[75]`. Parallel-route slots need `default.js`.

### Polyfills and bundling spike **[VERIFIED]**

Setup: the scaffold above, plus `chainsig.js@1.1.16 near-api-js@7.3.1 @hot-labs/near-connect@0.11.4 near-connect-hooks@1.1.6 viem@2.57.7 bitcoinjs-lib@7.0.4 @tanstack/react-query@5.104.5`. The client component `src/app/probe/Probe.tsx` does the following:
1. `new contracts.ChainSignatureContract({ networkId: 'testnet', contractId: 'v1.signer-prod.testnet', fallbackRpcUrls: [...] })`.
2. `new chainAdapters.evm.EVM({ publicClient, contract }).deriveAddressAndPublicKey(predecessor, 'satchel/1/evm')`.
3. `new chainAdapters.btc.Bitcoin({ network: 'testnet', contract, btcRpcAdapter: new chainAdapters.btc.BTCRpcAdapters.Mempool('https://mempool.space/testnet4/api') })`, then `deriveAddressAndPublicKey`, then `prepareTransactionForSigning({ publicKey, inputs:[{txid,vout,value,scriptPubKey}], outputs:[...] })`. This is the bitcoinjs v6 PSBT path, which is full of free `Buffer` references.
4. bitcoinjs-lib v7 `new Psbt().addOutput({ address, value: 1000n })`.
5. near-api-js `JsonRpcProvider.viewBlock`.
6. `new NearConnector({ network: 'testnet' })` and its `availableWallets`.

`next build` (Turbopack) took 7–13 s. `next start`, then headless system Chrome via `playwright-core@1.64.1` with `channel: 'chrome'`. Output, verbatim:
```
Buffer global before: undefined
evm address 0x7b7852f25612Aa7922d4EaBeEaFf8ed721a78cBB
btc address tb1qr5e3spjg0dnyje4v4fspjhtgzh8udyvyy6e987 pub 026ecffe35...
btc prepareTransactionForSigning ok, hashesToSign=1 first=e0b76f97bccdf213
bitcoinjs-lib v7 psbt ok, outputs=1
near-api-js block 274091117
near-connect wallets meteor-wallet,intear-wallet,ledger,nightly-wallet,ethereum-wallets,near-cli
Buffer import resolves to: function isBuffer=function
Buffer global after: undefined
DONE
--- logs   (no console errors, no page errors)
```
- `next dev` behaved the same. Every line appears twice because React StrictMode runs effects twice in development, so make connector creation idempotent (module singleton).
- `import { Buffer } from 'buffer'` resolved because `buffer@6.0.3` is in the tree through `@solana/web3.js`. If you drop chainsig.js, add `buffer@6.0.3` explicitly before you import it.
- If a library reads `globalThis.Buffer`, add this; it was verified to set the global before page code runs:
```ts
// src/instrumentation-client.ts
import { Buffer } from 'buffer';
(globalThis as { Buffer?: typeof Buffer }).Buffer ??= Buffer;
```
- **Bundle weight**, measured as the sum of the JS chunks each route's `page_client-reference-manifest.js` references, gzip -6:

| Route | Imports | Raw | gzip |
|---|---|---|---|
| `/probe` | chainsig.js + viem + bitcoinjs-lib 7 + near-api-js + near-connect | 7,925 KiB | **1,933 KiB** |
| `/probe2` | same minus chainsig.js | 702 KiB | **210 KiB** |

One 7.9 MB chunk contained `chain-registry` (8,539 matches), `osmosis`, `xrpl`, `aptos` and `solana`. chainsig.js's browser entry imports all of its adapters at the top level and has no `sideEffects: false` and no subpath exports.

### RPC providers (testnet), measured 2026-10-21 11:23–12:10 UTC **[VERIFIED]** unless marked

| Endpoint | Status today | CORS (preflight) | Behaviour that matters |
|---|---|---|---|
| `https://rpc.testnet.fastnear.com` (FastNEAR regular) | nearcore 2.14.0-rc.5. **Use as primary.** | `allow-origin: *`, `allow-headers: *` | Holds `send_tx`/`tx`/`broadcast_tx_commit` with `wait_until ≥ EXECUTED_OPTIMISTIC` for **10 s or 30 s**, depending on which node behind the load balancer answers (`send_tx` 30 s in 3/3 runs; `broadcast_tx_commit` 10 s once and 30 s once; `tx` 10 s and 30 s), then `408 TIMEOUT_ERROR` with the pending status (see 40). Free tier returned `429 {"code":-429,"message":"Rate limits exceeded. For higher rate limits get a subscription at https://fastnear.com"}`, `retry-after: 0`, after a few minutes of ~1–3 req/s from our shared IP, and recovered within about 4 minutes. Supports the new `tx_status` name. |
| `https://test.rpc.fastnear.com` | Same backend: same block height and same 429 bucket | `*` | Default in near-api-js README and near-connect-hooks |
| `https://archival-rpc.testnet.fastnear.com` | archival (paid per docs) | `*` | **near-cli-rs 0.30.1 uses this as its testnet `rpc_url`** (from `~/Library/Application Support/near-cli/config.toml`), so README CLI commands go to FastNEAR, not near.org |
| `https://near-testnet.drpc.org` (dRPC) | 200 ~200 ms; nearcore 2.14.0-rc.5. **Use as failover.** | echoes Origin, `allow-headers: content-type,authorization` | **Free plan kills any request at ~2.0 s**: `408 {"message":"Request timeout on the free plan, please upgrade to paid plan","code":30}`. `broadcast_tx_commit` returns `400 method is not available`. `tx_status` also gets `method is not available`. Use `tx` or `EXPERIMENTAL_tx_status`. `send_tx` with `NONE` or `INCLUDED` works. |
| `https://rpc.testnet.near.org` | **Deprecated.** Not listed on docs.near.org's providers page any more | `*` | Under load: `429 {"code":-429,"message":"WARNING! THIS ENDPOINT IS DEPRECATED! STOP USING IT NOW! Switch to https://fastnear.com or alternative RPC providers at https://docs.near.org/api/rpc/providers"}`, `retry-after: 20`. Otherwise it answers 200 with about **3.1–3.2 s added latency** on every call, including `block`. |
| `https://archival-rpc.testnet.near.org` | Same 429 "DEPRECATED" message | `*` | docs: "Severely rate limited" |
| `https://testnet-rpc.intea.rs` (Intear) | **502** `{"error":{"code":-32603,"message":"Internal error"},"note":"Requests without an API key are being slowed down for one second. Get an API key at https://rainy.intea.rs"}` on every try | n/a | Do not rely on it |
| Lava, QuickNode, Tatum, ZAN, All That Node | **[SOURCED]** docs.near.org: API key or no public endpoint (`N/A`) | | Not worth setting up for the hackathon |

FastNEAR auth **[SOURCED]** docs.fastnear.com/auth: one key covers RPC and REST, sent as `Authorization: Bearer <key>` (preferred) or `?apiKey=<key>`; keys are issued at `https://dashboard.fastnear.com`. On browser keys: *"Website restrictions are a **paid-plan** feature."* Also: *"If a browser call exceeds your rate limit, the `429` response may not yet include CORS headers, so the browser can surface it as a generic network error."*

### near-api-js 7 `FailoverRpcProvider` / `JsonRpcProvider` retry semantics **[SOURCED]** `src/providers/{json-rpc-provider,fetch_json,failover-rpc-provider}.ts` @ 2546c85

- `JsonRpcProvider` defaults to `retries: 12`, `wait: 500`, `backoff: 1.5`. It **retries on HTTP 408, 500 and 503** with the same body. It does **not** retry on 429: it throws `ProviderError(cause: 429)`.
- `FailoverRpcProvider([...])` moves to the next provider only after the current provider throws, which means after all of its own retries. It also `console.error`s every failure. Twelve retries on a provider that keeps returning 408 delays failover by tens of seconds. For UI reads, build the providers with `new JsonRpcProvider({ url }, { retries: 2, wait: 250, backoff: 2 })`.
- `provider.callFunction({ contractId, method, args, blockQuery? })` defaults to `{ finality: 'optimistic' }`. It returns parsed JSON, or `undefined` for an empty result.

### Vercel function limits **[SOURCED]** vercel.com/docs/functions/limitations (last_updated 2026-08-24, Fluid compute)

| | Default duration | Max | Memory | Body |
|---|---|---|---|---|
| Hobby | 300 s | 300 s | 2 GB / 1 vCPU | 4.5 MB request/response |
| Pro | 300 s | 800 s (1800 s beta) | up to 4 GB / 2 vCPU | 4.5 MB |

The default region is `iad1`. Unlimited execution needs Vercel Workflows. Edge functions must start a response within 25 s.

## Reference: exact APIs, configs, tested snippets

### `next.config.ts` for Satchel (start here on Nov 1)
```ts
import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  cacheComponents: true,          // keep the scaffold default; mark public RPC reads with "use cache" or wrap in <Suspense>
  partialPrefetching: true,       // must be set explicitly when cacheComponents is on (warning otherwise)
  turbopack: { rules: { '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' } } },
  // No polyfill config is needed for chain libs (verified). If a dep imports 'fs' in the browser:
  // turbopack: { resolveAlias: { fs: { browser: './src/lib/empty.ts' } } },
};
export default nextConfig;
```
In `tsconfig.json` set `"target": "ES2022"`.

### RPC config (client and server)
```ts
// src/lib/near/rpc.ts — sketch to rebuild on Nov 1
import { FailoverRpcProvider, JsonRpcProvider } from 'near-api-js';
export const TESTNET_RPCS = [
  'https://rpc.testnet.fastnear.com',   // primary: long-poll friendly (holds 10–30 s), CORS *
  'https://near-testnet.drpc.org',      // failover: cuts at ~2 s, no broadcast_tx_commit / tx_status
];
const fast = { retries: 2, wait: 250, backoff: 2 };  // fail over quickly in UI reads
export const provider = new FailoverRpcProvider(TESTNET_RPCS.map((url) => new JsonRpcProvider({ url }, fast)));
// Server/worker: new JsonRpcProvider({ url: 'https://rpc.testnet.fastnear.com', headers: { Authorization: `Bearer ${process.env.FASTNEAR_API_KEY}` } })
```
Never put a server FastNEAR key in `NEXT_PUBLIC_*`.

### Reading NFT state for the UI
```ts
// views on our own contract (NEP-171/181 + custom)
provider.callFunction({ contractId: SATCHEL, method: 'nft_token', args: { token_id: '1' } });                         // Token | null
provider.callFunction({ contractId: SATCHEL, method: 'nft_tokens_for_owner', args: { account_id, from_index: '0', limit: 50 } });
provider.callFunction({ contractId: SATCHEL, method: 'nft_supply_for_owner', args: { account_id } });             // "3"
// custom (ask sdk/sec to add): satchel_info(token_id) -> { owner, listed, pending_signs, cooldown_until, ... }
//                              get_sign_request(token_id, payload_hash) -> see 40 TL;DR #8 and "Recommendations"
```
TanStack Query keys: `['satchel', tokenId]`, `['satchels', ownerId]`, `['sign-request', tokenId, payloadHash]`, `['balance', chain, address]`. Use `staleTime: 10_000` for NEAR views and 30 s for chain balances. After any tx, call `queryClient.invalidateQueries({ queryKey: ['satchel', tokenId] })`. Do not poll `nft_tokens_for_owner` faster than every 15 s, because of the free-tier limits.

**Server-render the facts judges need** (owner, derived addresses, balances, clean-history status). Verified pattern, Next 16.4.2 with `cacheComponents`:
```tsx
// src/app/s/[id]/page.tsx
import { Suspense } from 'react';
import { cacheLife } from 'next/cache';
import { JsonRpcProvider } from 'near-api-js';
async function getSatchel(id: string) {
  'use cache';
  cacheLife({ revalidate: 15 });   // one RPC read per 15 s per token, however many judges open the page
  const p = new JsonRpcProvider({ url: 'https://rpc.testnet.fastnear.com' }, { retries: 2, wait: 250, backoff: 2 });
  return p.callFunction({ contractId: SATCHEL, method: 'nft_token', args: { token_id: id } });
}
async function Body({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;              // params is a Promise in Next 16
  const token = await getSatchel(id);
  return <SatchelView token={token} />;     // client islands (TanStack Query) can refresh live data afterwards
}
export default function Page(props: PageProps<'/s/[id]'>) {
  return <Suspense fallback={<CardSkeleton />}><Body params={props.params} /></Suspense>;  // without Suspense the build errors under cacheComponents
}
```
In the spike (`/s/[id]` with `viewAccount`, plus `/cached` with MPC `version`), `next build` marked `/s/[id]` as `◐ Partial Prerender` and `/cached` as static with `Revalidate 15s`. A plain `curl http://localhost:3917/s/<id>` (no JS) received both the `loading` shell **and the streamed final markup** (`account … amount … DONE`) in the same HTTP response. **[VERIFIED]** So a no-JS fetcher, such as an AI judge using HTTP GET, sees server-rendered data. Data that only client-side TanStack Query renders would be invisible to it.

FastNEAR indexed API: `GET https://test.api.fastnear.com/v1/account/{account_id}/nft` returns `{account_id, tokens:[{contract_id,last_update_block_height}]}`. These are contract rows, not token ids **[SOURCED]** docs.fastnear.com/api/v1/account-nft. It is not needed for Satchel.

### Judge and demo access (P1 #8) — recommendation

| Option | What judges get | Cost/risk | Verdict |
|---|---|---|---|
| (a) Public read-only pages: `/s/1`, `/s/1/activity`, `/market` with no login | Live balances, derived addresses, owner, clean-history status, explorer links | None. Reads use public RPC/APIs, cached 15 s | **P0. Must work with no wallet, and the key facts must be server-rendered** so that a no-JS HTTP fetch sees them (verified: PPR streams them into the same response) |
| (c) README CLI steps (`near contract call-function as-read-only …`, `near account list-keys …`) plus proof tx links | Independent verification | None. near-cli-rs uses FastNEAR archival | **P0** (already in plan B7) |
| (b) Labelled **Demo mode**: `POST /api/demo/<action>` signs with a throwaway `demo-*.testnet` key from env | Judges can press "Send 0.00001 test ETH from Satchel #D1" and watch SigningProgress | A full-access key in Vercel env (needed because `sign_for` must require 1 yocto, and function-call keys can't attach deposits). Abuse can drain the demo account or move the demo NFTs. | **P1**, with the guards below |

Demo-mode guards: a separate demo account that holds only demo Satchels, about 5 NEAR, and Sepolia dust. The route builds the tx itself from a **fixed allowlist** (`sign_for` on `satchel.<team>.testnet`, token ids `D1`/`D2`, recipient = our own sink address, amount fixed). It never accepts a client-supplied payload. Use **one in-flight demo tx at a time** (one key means one nonce stream; or rotate 3 keys with near-api-js `MultiKeySigner`). Add a global rate limit (for example 3/min and 50/day, via Vercel Firewall rate-limit rule or a KV counter) and a `DEMO_ENABLED` kill switch. The route returns `{ txHash }` immediately (`send_tx` `INCLUDED`), and the browser runs the same tracker as wallet users. Label it "Demo signer, testnet only" on every screen.

Optional P2: near-connect's built-in **"NEAR CLI" wallet** lets anyone with near-cli-rs and a testnet account sign from the real UI by copy-pasting a command (see 40). That suits technical judges.

## Gotchas & failure modes

1. **TS target ES2017** in the scaffold breaks BigInt literals (bitcoinjs-lib v7 values, viem). Set ES2022 and `rm -rf .next` after any tsconfig change.
2. **Tailwind v4 is wired through `@tailwindcss/turbopack`.** Do not add a `postcss.config.mjs` unless you also remove the Turbopack rule.
3. **chainsig.js in a client component costs about 1.7 MB gzip.** Its browser entry imports `chain-registry`, `xrpl`, `@aptos-labs/ts-sdk`, `@mysten/sui/*`, `@cosmjs/*` and `@solana/web3.js` at the top level. (`got` is declared as a dependency but neither build imports it directly.) Lazy-load it with `await import('chainsig.js')` inside the Send handler, or avoid it in the client.
4. **chainsig.js default RPC is `rpc.<network>.near.org`**, which is deprecated. Pass `fallbackRpcUrls`.
5. **Two bitcoinjs-lib majors** end up in the tree (6.1.9 inside chainsig, 7.0.4 top level). Their types differ (Buffer/number vs Uint8Array/bigint). Never pass objects between them.
6. **dRPC free cuts requests at ~2 s.** Never use it for `broadcast_tx_commit` (unsupported) or any blocking `wait_until`.
7. **FastNEAR 429 in the browser can appear as a CORS "Failed to fetch"** [SOURCED]. Treat `TypeError: Failed to fetch` as retryable and rotate providers.
8. **The research IP is shared by 9 agents.** Rate-limit observations are pessimistic for end users but realistic for one Vercel region or a worker. **[ASSUMED]**
9. **React StrictMode doubles effects in dev.** Create `NearConnector` once at module scope, behind a client-only guard, or the wallet manifest is fetched twice and two sandbox iframes are created.
10. **Cache Components + `<Activity>`**: hidden routes keep state but lose effects. Long-running trackers must live outside component effects.
11. **`npx shadcn init -d` picks Base UI (`@base-ui/react`), not Radix.** Copy-pasted Radix snippets (`@radix-ui/react-*`) won't match. Choose one with `--base radix|base` on day 1.
12. **near-api-js 7 `engines.node >= 22.22.2`.** Set Node 22 or 24 in Vercel and in `package.json` `engines`. **[ASSUMED]** that the Vercel default satisfies it; check on Nov 1.

## Recommendations for Satchel

- **P0** Scaffold with `create-next-app@16.4.2` (flags above). Keep `cacheComponents`. Set TS target ES2022. Pin the versions in the table. Keep `AGENTS.md`.
- **P0** RPC list: FastNEAR primary, dRPC failover, near.org never. A FastNEAR API key for server and worker (human). Low-retry `JsonRpcProvider`s in a `FailoverRpcProvider` for reads.
- **P0** Make `/s/[id]` public and read-only. Server-render owner, addresses and balances (`"use cache"` + `cacheLife({revalidate:15})` inside `<Suspense>`, pattern above), then use client TanStack Query for live refresh. No wallet required, and readable without JS.
- **P0** Keep chainsig.js out of the client bundle (see 11-chainsig-js-and-derivation.md for derivation). If the team wants chainsig.js's tx builders, use them in the Send route behind dynamic `import()`, or in a server route.
- **P1** Demo mode as specified above. Plus a Playwright smoke test (`@playwright/test@1.64.1`) against the deployed URL: load `/s/1` and assert that the derived BTC/EVM addresses and the owner render.
- **P1** UI kit: shadcn 4.22.1 (decide Base UI vs Radix on day 1; Base UI is the default now), motion 14.5 (`motion/react`), TanStack Query 5.104.
- **P2** `instrumentation-client.ts` Buffer global, only if a library needs it.

## Deltas vs plan (near_hackathon.md)

| Plan says | Reality (2026-10-21) | Change |
|---|---|---|
| A, Versions: "near-api-js" (no major) | **near-api-js 7.3.1** is a single package; `@near-js/*` stopped at 2.5.1 | Pin `near-api-js@7.3.1`. Expect a duplicate `@near-js/*@2.5.1` tree via chainsig.js. |
| A, Stack: "Tailwind v4, shadcn/ui, Motion" | Tailwind 4.3.3 via `@tailwindcss/turbopack`. shadcn 4.22.1 defaults to Base UI. motion 14.5. | Note the Base UI default. Use the scaffold's Turbopack CSS rule. |
| A, Stack: "Next.js (App Router)" | Next **16.4.2**: Turbopack default, Cache Components on, `proxy.ts`, async params | Implementers must read `node_modules/next/dist/docs/` (AGENTS.md) |
| B5: chainsig.js in the web tier for "derive/prepare/finalize/broadcast" | chainsig.js costs ~1.7 MB gzip in the client and defaults to the deprecated near.org RPC | Use it server-side or lazy-load it; derive addresses with @noble/curves. Always pass `fallbackRpcUrls`. |
| A, Versions: "bitcoinjs-lib", "@solana/web3.js" | Latest are bitcoinjs-lib **7.0.4** (bigint) and web3.js **3.1.1**, while chainsig.js pins 6.x / 1.x | btc/chains agents choose. Don't mix majors across chainsig objects. |
| B7: "Playwright smoke test on the hosted URL" | @playwright/test 1.64.1. System Chrome works via `channel: 'chrome'`. | Confirmed |
| A: "Vercel" | Hobby 300 s max duration and 4.5 MB bodies; Fluid compute | Confirmed. Keep routes short (return hash, client polls). |
| Not in plan | Public RPC rate limits (FastNEAR 429 on a shared IP, near.org deprecated) | Add "FastNEAR API key" to the Phase 0 human actions |
| B7 README CLI steps | near-cli-rs uses `archival-rpc.testnet.fastnear.com` | Confirmed working path for judges |

## Open questions / human actions

1. **Human:** create a FastNEAR account at `https://dashboard.fastnear.com` and get a server API key (store it as Vercel env `FASTNEAR_API_KEY`, server only). Decide whether a paid plan (needed for domain-restricted browser keys) is worth it; the free tier is probably enough for judges if browser reads are cached.
2. **Human/team, day 1:** choose shadcn base (`base` = Base UI default, or `radix`).
3. **Open:** the Vercel default Node version versus near-api-js's `engines >= 22.22.2`. Check on the first deploy.
4. **Open (chains/btc):** whether we keep chainsig.js at all in the web tier or write small helpers (derive, EVM serialize, BTC PSBT) on viem / bitcoinjs-lib v7 / @noble/curves. The web agent recommends small helpers on the client. chainsig.js is fine server-side.
5. **Open:** whether to run Playwright with system Chrome in CI (GitHub Actions has Chrome) or use `npx playwright install chromium` there.
