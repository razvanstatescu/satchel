# apps/web: the Satchel app (Next.js)

The website and app for Satchel, an NFT that is a wallet: each token on the NEAR testnet contract controls a Bitcoin
testnet4, an Ethereum-testnet (Sepolia, Base, Arbitrum and OP Sepolia) and a Solana devnet address through NEAR Chain
Signatures. The app shows a Satchel's addresses and coins, sends from them (the contract's `sign_for`), gives, lists,
sells and buys Satchels, and runs the buyer's clean-history check in the browser before Buy is enabled.

Read `AGENTS.md` and `node_modules/next/dist/docs/` before changing framework code.

## Where the docs are

| Topic | Where |
|---|---|
| Architecture, live vs fixture, deviations | `docs/handoff/web.md` |
| Frontend spec (routes, rendering, providers, signing state machine) | `kb/90-technical-spec.md` §8; backend routes §9 |
| Flows, components and copy | `kb/80-ux-spec.md` (R3, with the R4 note for Satchel 2.0) |
| Design tokens and visual identity | `kb/81-design-tokens.md` R4 (Satchel 2.0), `brand/README.md`, `brand/design-system.md` |
| 2.0 screen specs and prototypes | `docs/design/satchel-2.0/` (`app-screens.md`, `design-system-impl.md`, `voice-copy.md`, `motion-spec.md`) |
| Feature specs | `docs/specs/` (C1–C7), `plan/feature-ideas.md` (A1–A3) |
| UI tests: how to run, coverage | `docs/testing/ui.md` |
| Data-layer and API tests | `docs/testing/core-api.md` |
| Decisions (D-xx, H-xx, R-xx) | `plan/decisions.md`; IDs in general: `docs/GLOSSARY.md` |

In comments, `spec §N` means kb/90 §N unless the file names another spec; `app-screens §N`, `design-system-impl §N`,
`design-spec §N`, `motion-spec §N` and `voice-copy §N` are the files in `docs/design/satchel-2.0/`; `proto/…` is
`docs/design/satchel-2.0/prototypes/…`; and `C4-C6 §N` or `C5 §N` are the files in `docs/specs/`.

## Commands

```bash
pnpm --filter web dev                     # fixture mode by default (.env.example)
pnpm --filter web test                    # vitest (test/unit, src/**/*.test.ts)
pnpm --filter web test:e2e                # Playwright: builds + starts in fixture mode, role final
pnpm --filter web lint && pnpm --filter web typecheck
pnpm --filter web check:rpc               # the deprecated near.org RPC must appear nowhere (incl. .next)
pnpm --filter web fonts:card              # regenerate src/lib/card-fonts.generated.ts (the NFT image's fonts)
pnpm --filter web fonts:og                # regenerate src/lib/og-fonts.generated.ts (the social card's fonts)
```

## Data mode: fixture or live

`NEXT_PUBLIC_DATA_MODE` (parsed in `src/lib/config.ts`, listed in the root `.env.example`) picks one data source for
the whole app (`src/lib/data/source.ts`):

- **`fixture`** (the default): no network. Views come from `src/lib/data/fixtures.ts` (the demo world of D-32, shaped
  exactly like the contract's views in kb/90 §5.14), wallet calls go to a mock wallet (`src/lib/near/mock-wallet.ts`) that
  runs `@satchel/core`'s policy mirror, and `src/lib/data/sim.ts` simulates what the contract and the chains would do
  next, in the browser. Every page shows a "Fixture data" strip. Unit tests and Playwright run in this mode.
- **`live`**: NEAR testnet through FastNEAR with dRPC as fallback (never the deprecated near.org RPC), the FastNEAR tx
  API for history, mempool.space and emzy for Bitcoin testnet4, keyless RPCs for each EVM testnet, and Solana devnet.
  **Production must set `live`.**

Other switches: `NEXT_PUBLIC_CONTRACT_ROLE` (`dev`, `rc` or `final`: the clean-history gate mode, kb/90 §7.3),
`NEXT_PUBLIC_SATCHEL_CONTRACT`, `NEXT_PUBLIC_EXPECTED_CODE_HASH` (required for `rc` and `final`), and
`NEXT_PUBLIC_SOL_UI` (on by default, D-46).

## Route map

Judge pages (kb/90 §8.1) render their facts in the server HTML with no Suspense fallback, because AI judges read only
server-rendered HTML.

| Route | What it is |
|---|---|
| `/` | The landing: what a Satchel is, how it works, clean history, trust, questions |
| `/satchels` | The app home: the connected wallet's Satchels, money waiting, Mint (client data only) |
| `/s/[id]` | The Wallet tab, the judge page for `/s/1`: addresses, coins, facts (blocking SSR) |
| `/s/[id]/activity` | Activity: every NEAR event and signature of the Satchel, newest first |
| `/s/[id]/transactions` | Coins in and out on every chain with a keyless source (`src/lib/chain-txs.ts`) |
| `/s/[id]/coin/[key]` | One coin of the Satchel: amount, where it sits, what can be done with it |
| `/s/[id]/receive?chain=` | Add coins: the derived addresses with QR codes; anyone can open it |
| `/s/[id]/send?chain=` | Send: build the chain tx, `sign_for` it, broadcast (owner flow) |
| `/s/[id]/sign` | Sign a message with the Ethereum or Solana address (C7) |
| `/s/[id]/transfer` | Give the Satchel to a NEAR account (`nft_transfer`), ending in the hand-off |
| `/s/[id]/give-link` | Give by link (A2): a claim link that carries a fresh key |
| `/s/[id]/sale` | Sell and Buy: the listing and the server's clean-history hint (judge route); `?list` opens the list form |
| `/s/[id]/offer` | Make an offer, listed or not (C4) |
| `/s/[id]/allowance` | Let another account send up to a daily cap (C5) |
| `/s/[id]/empty` | Empty the Satchel (A3): send every coin out |
| `/s/[id]/opengraph-image`, `/twitter-image` | The social card per Satchel (A1) |
| `/mint` | Mint a Satchel |
| `/market` | Every listing with its card, price and the server's check (judge route) |
| `/contract` | Contract facts: born without a key, code hash, birth transaction, commands to verify (judge route) |
| `/fund/[id]` | The public Add coins page for a Satchel (pick a coin and a network, get one address) |
| `/claim` | Claim a Satchel from a give link (client only: the secret stays in the URL fragment) |
| `/address-book` | Addresses the user saved, kept in this browser |
| `/questions` | Every question and answer, in the server HTML |

API routes (`src/app/api/`; kb/90 §9):

| Route | What it returns |
|---|---|
| `GET /api/satchels/[id]` | The Satchel snapshot JSON (cached 15 s; 1.5 s bound per upstream) |
| `GET /api/satchels/[id]/txs?source=` | One source's transactions for the Transactions tab; without `source`, the list of sources |
| `GET /api/clean-history/[id]` | The server's clean-history hint (15 s). Never authoritative: the browser re-checks before Buy |
| `GET /api/contract` | Keyless and verification facts; backs `/contract` and the README curl (cached 60 s) |
| `GET /api/card/{id}.svg` | The NFT image (the contract's `base_uri`): name, state pill, signature count, chains |
| `POST /api/onboarding` | The optional first-time survey (below) |

`manifest.ts`, `robots.ts` and `sitemap.ts` in `src/app/` serve the web manifest, robots rules and the sitemap.

## Code layout

- `src/lib/config.ts`: environment parsing (zod); the server and the browser use the same lists.
- `src/lib/data/`: server reads (`server.ts`, "use cache"), the snapshot shape, live vs fixture sources, the
  clean-history view model (`clean.ts`) and the live check through `@satchel/core/clean-history` (`clean-live.ts`).
- `src/lib/near/`: RPC with failover, typed contract views and call builders, the wallet, the tx tracker, outcome
  decoding, FastNEAR history.
- `src/lib/signing/`: the SigningProgress state machine (kb/90 §8.6), the pending-intent store, the runner, retries.
- `src/lib/chains/`: send preparation and chain adapters, loaded lazily by the Send flow.
- `src/lib/copy.ts` and `src/lib/copy/`: the copy deck; components take their strings from it.
- `src/components/`: shared components at the top level, client islands in `client/`, the landing in `landing/`,
  brand marks and charms in `brand/`.

Chain logic (derivation, transaction builders, the policy mirror, the clean-history checker) lives in
`packages/core` (`@satchel/core`), not here.

## Onboarding survey (Upstash Redis)

The optional "about you" survey (first-time onboarding, `src/components/client/Onboarding.tsx`) posts to
`POST /api/onboarding` (`src/app/api/onboarding/route.ts`), which writes straight to the Upstash Redis REST API with
plain `fetch` — no new dependency. Server-only env vars, never `NEXT_PUBLIC_*`:

- `KV_REST_API_URL` / `KV_REST_API_TOKEN` — the names the **Vercel Marketplace Upstash integration** injects when it's
  added to the project and connected to an environment. This is the intended path: on Vercel, add the "Upstash for
  Redis" integration to the project and connect it to **Production** (`plan/human-actions-ready.md` has the step).
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — fallbacks with the same names the plain Upstash dashboard
  uses, for a database created outside the Vercel integration.

When neither pair is set (fixture mode, e2e, local dev), the route answers `204` and stores nothing — no Redis
needed to develop or test the app.

Data written: `LPUSH satchel:onboarding:responses <json>` (one entry per non-skipped submission: the answers, `ts`,
`role` and `v`, plus `accountId` only when the survey's share-account box was ticked) and
`HINCRBY satchel:onboarding:counts <question>:<option>` / `responses` / `skipped` for the running totals. The IP
address is used only for an in-memory, best-effort per-IP rate limit (`src/lib/onboarding-ratelimit.ts`) and is
never stored — it doesn't survive a cold start or a different serverless instance, which is fine for a 20-second
survey nobody has a reason to script.

Read it back with `pnpm --filter @satchel/tools onboarding:report` (same env vars). There is no admin web page.
