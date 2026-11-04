# Satchel knowledge base

> **What this is.** The design and research behind Satchel, an NFT on NEAR testnet whose tokens each control BTC,
> EVM and SOL addresses through Chain Signatures.
> - **Source of truth: [`90-technical-spec.md`](90-technical-spec.md)** (kb/90). It is the design the code
>   implements, kept in step with it. Where any other doc disagrees with it, kb/90 wins, and every known
>   disagreement is listed in its **§13 Errata** with the value that won.
> - **Sprint features C1–C7** (built 2026-10-29 → 11-02: history digest, USDC on EVM, four EVM testnets, offers,
>   spending allowances, NEAR assets inside a Satchel, message signing) are specified in
>   [`../docs/specs/`](../docs/specs/): [`C1-C2-C3-C7.md`](../docs/specs/C1-C2-C3-C7.md),
>   [`C4-C6.md`](../docs/specs/C4-C6.md) and [`C5.md`](../docs/specs/C5.md). They extend kb/90 and win over it for
>   those features; kb/90 §5.17 and §6.1 index them. Status per feature:
>   [`../plan/progress/feature-sprint.md`](../plan/progress/feature-sprint.md).
> - **Docs 00–82 are Phase-0 research and design notes**, dated 2026-10-21 (80 and 81 carry later design notes, up to 2026-11-03). They are
>   kept as evidence and are **not maintained**: read them for the "why" and the measurements, never for the current
>   interface.
> - IDs such as D-xx, H-xx, INV-xx, E-xx and SAT-xxx are explained in [`../docs/GLOSSARY.md`](../docs/GLOSSARY.md).
>
> **Status as of 2026-11-04.** The contract is complete and audited (`../docs/security/`). The app runs at
> `https://usesatchel.xyz` against `dev2.satchelhq.testnet`. Contract freeze is Nov 9; the keyless birth of the final
> contract `satchel.satchelhq.testnet` is planned for Nov 10 and has not happened yet.

Decisions and their rationale are in [`../plan/decisions.md`](../plan/decisions.md), which opens with the revision-2 changelog (the independent review `../plan/review.md`, R-01…R-41). The original build plan, written for Nov 1–14, is in [`../plan/implementation-plan.md`](../plan/implementation-plan.md); work actually started on 2026-10-21 (D-39), and the hackathon counts code from 2026-10-19 (D-47). The Phase-0 checklist (Oct 21–31, historical) is [`../plan/phase0-checklist.md`](../plan/phase0-checklist.md), and the live pre-submission list is [`../plan/launch-checklist.md`](../plan/launch-checklist.md).
The docs 00–81 were written by nine research agents on 2026-10-21. Each one ends with "Deltas vs plan" and "Open questions"; "plan" there is `near_hackathon.md`, the team's original plan, which is not in this repo. Dates such as "before Nov 1" or "after Nov 1" inside them are the Phase-0 schedule.
- **Visual identity lives in [`../brand/`](../brand/README.md)**: Razvan's **Satchel 2.0** brand (D-44, 2026-10-26), the "Sticker S": a coral tile with a white S, ink outlines and hard sticker shadows, chain charms with faces, Funnel Display / Onest / Geist Mono, Day (the default) and Night. It is the source of truth for how Satchel looks, and `brand/` is never edited from here. Brand 1.0 (the Strap S, brass and leather) is archived in `../brand/archive/v1/`.
- **Exception:** `81-design-tokens.md` is **Revision 4, "Satchel 2.0"** (2026-10-26, D-44); R3 is archived in `archive/81-design-tokens-R3.md`. `80-ux-spec.md` is **Revision 3, "brand consolidated"** (2026-10-21, D-36), with an R4 note at its top for the 2.0 vocabulary and structure. `82-design-references.md` is the R2 reference library, now for structure only (superseded visual rows are marked). The 2.0 design specs are in `../docs/design/satchel-2.0/`.
- R2 of all three is kept verbatim in `../research/spikes/ux-refs/r2-snapshot/`, and rev 1 in `rev1-snapshot/`, because spec §13 quotes both.

The raw spike data lives in `../research/spikes/*/RESULTS.md`. That code is throwaway: never copy it into the product.

Citation convention used in the plan documents: `kb/10 §TL;DR 6` = `10-mpc-signer.md`, section "TL;DR", item 6.

## Index

| Doc | What it answers | Read it when |
|---|---|---|
| [90-technical-spec.md](90-technical-spec.md) | **The v1 design:** contract interface, types, constants, classifiers, state machine, invariants, clean-history protocol, frontend and backend architecture, pinned versions, repo layout, testing, errata | First, and whenever you're unsure |
| [../docs/specs/](../docs/specs/) | **Sprint features C1–C7** (normative for them; extend kb/90): `C1-C2-C3-C7.md` history digest, USDC on EVM, four EVM testnets, message signing; `C4-C6.md` offers and NEAR-side assets inside a Satchel; `C5.md` spending allowances | Before touching any sprint feature |
| [00-hackathon-rules.md](00-hackathon-rules.md) | Dates, the submission API contract, what AI and human judges can actually see, README/X/video rules, judge-runnable commands, the payload validator | Day 1 (rules check), Days 12–13 (README, submission) |
| [01-prior-art.md](01-prior-art.md) | `nft_key`, Lit PKPs, ERC-6551/Tokenbound, Ika, Metaplex Core; why "clean history" is Satchel's novelty; the empty testnet NFT-venue landscape | Writing the README "Prior art" / "How it differs" sections |
| [10-mpc-signer.md](10-mpc-signer.md) | MPC `sign` request/response, the 15 Tgas / 1 yocto rules, latency, timeout semantics, derivation math, how callbacks fail | Before touching `sign_for`, `on_signed` or `mpc.rs` |
| [11-chainsig-js-and-derivation.md](11-chainsig-js-and-derivation.md) | Offline derivation (noble), derivation test vectors, MPC-response → per-chain signature conversion, chainsig.js pitfalls (we don't use it) | Building `lib/derive` and `lib/near/outcome.ts` |
| [20-near-contract-stack.md](20-near-contract-stack.md) | near-sdk 5.29.1 idioms, NFT standard embedding, storage costs, events, the never-fail callback checklist, toolchain traps | Writing any contract code |
| [21-testing-sandbox.md](21-testing-sandbox.md) | near-workspaces 0.23.0, the mock-signer shape, yield/resume and `fast_forward` timeouts, test helpers, CI caching | Writing the sandbox tests and CI |
| [22-deploy-and-lock.md](22-deploy-and-lock.md) | Deploy, lock, reproducible builds, NEP-330 verification, storage staking, CLI false errors. v1 uses **keyless birth** instead of delete-keys (spec §5.16, E-38) | Day 4 (reproducible build + verify on dev); Days 9–10 release; README "Verify on-chain" |
| [30-bitcoin-testnet4.md](30-bitcoin-testnet4.md) | P2WPKH via MPC, BIP143 preimages, `.and()` fan-out, mempool.space API and CORS traps, fees and dust, BTC clean-history verdicts, faucets | BTC classifier (S1) and BTC send flow (S2) |
| [31-evm-sepolia.md](31-evm-sepolia.md) | The viem-only send recipe, `yParity = recovery_id`, RPC fallback list, nonces and replacement, the EIP-7702 risk, faucets | EVM classifier (S1) and EVM send flow (S2) |
| [32-solana-devnet.md](32-solana-devnet.md) | The Ed25519 message-signing path, **36 s blockhash life**, durable-nonce detection, rent (650,240 lamports), faucets | SOL classifier (S1) and SOL send flow (S2, Phase 2) |
| [40-frontend-wallet.md](40-frontend-wallet.md) | near-connect 0.11.4, which wallets exist on testnet, why wallet promises are unreliable, the tested long-poll tracker, the SigningProgress pattern | Before writing the wallet provider or the signing store |
| [41-web-stack.md](41-web-stack.md) | Next.js 16.4.2 specifics (Cache Components, SSR for judges, TS target), pinned web versions, RPC providers, polyfills, bundle sizes. Judge pages render blocking, not streamed (spec §8.1, E-40) | Day 1 scaffold; any SSR page |
| [50-data-and-indexing.md](50-data-and-indexing.md) | Why there is no DB or indexer; the FastNEAR tx API for events; per-chain balance/history endpoints; price sources | Activity tab, `/api/*` routes, the checker's data calls |
| [51-1click-and-usdc.md](51-1click-and-usdc.md) | Circle testnet USDC, `ft_transfer_call` runtime facts, the atomic `ft_on_transfer` design, the Oct 1 ghost-funds lesson, the 1Click API (the clip is cut in v1, D-19) | Sale contract code (S1); USDC buy UI (S2) |
| [70-security-and-clean-history.md](70-security-and-clean-history.md) | Threat model, why hash-only signing is unsound, classification rules, per-chain "dead" rules, the original invariant list | Before any security-relevant change; when writing SECURITY.md |
| [80-ux-spec.md](80-ux-spec.md) | **Revision 3 (brand consolidated):** routes, the flow and nav shells, screens, states, wireframes, components, state machines, copy deck (brand content rules), error map, motion (one signature moment), accessibility, video beats, the Brand vs R2 table and scope | Every UI task (spec §8.9 and §13 are applied; E-45…E-47 record R3) |
| [81-design-tokens.md](81-design-tokens.md) | **Revision 4 (Satchel 2.0):** the 2.0 tokens (Day and Night) plus derived tokens, the theme mechanism (Day first), [VERIFIED] contrast and the rules it forces, type styles, stickers vs flat, the state mapping, icons and charms, motion tokens, the NFT image, Tailwind v4 rules. The live values are in `apps/web/src/app/globals.css` | Any visual work |
| [82-design-references.md](82-design-references.md) | **R2 library, structure only since R3:** north-star apps, the 2–4 best references per screen and component, conventions, anti-patterns, a 40-screen moodboard. Rows whose visuals the brand replaced are marked "R3 visual: superseded" | Before building any screen (for structure and behaviour) |
| [../brand/README.md](../brand/README.md) | **The Satchel 2.0 brand** (source of truth for visual identity): logo rules, chain charms, colour and themes, type, stickers, interaction and the one signature motion, the web asset set, and the corrections that product facts make to its sample copy | Before any UI work |

## Reading order for a new engineer

**Contract lane (S1), ≈ 2.5 h:**
1. spec §1–§7
2. 10 (TL;DR, `sign`, gotchas)
3. 20 (TL;DR, NFT embedding, never-fail callback)
4. 70 (TL;DR, threat model, classification)
5. 30 §3–§4 + §7
6. 31 §Unsigned EIP-1559 layout + §Security notes
7. 32 §Durable-nonce detector + §Contract-side policy
8. 21 (TL;DR, mock signer, helpers)
9. spec §5.16 (keyless birth), then 22 (TL;DR, reproducible build, verify)
10. 51 §S-8 design sketch + gotchas
11. spec §12–§14
12. spec §5.17 and §6.1, then `../docs/specs/*.md` (sprint features C1–C7)

**Frontend lane (S2), ≈ 2.5 h:**
1. spec §1–§3, §5.5, §5.14, §7, §8–§11
2. 41 (TL;DR, Next 16 changes, SSR pattern)
3. 40 (TL;DR, the tracker, the client flow)
4. 11 (snippets A–B)
5. 31 §viem recipe
6. 30 §1, §3, §5, §6
7. `../brand/README.md` and `../brand/design-system.md`
8. 80 R3 and its R4 note (IA, shells, screens, wireframes, components, state machines, copy, error map)
9. 81 R4 (the live values are in `apps/web/src/app/globals.css`)
10. 82 (north stars and the references for the screen you are building; structure only)
11. 50 (endpoints and snippets)
12. 32 §Send SOL (Phase 2)
13. `../docs/specs/*.md` for the sprint UIs (C2–C7)

**Release / PM (team lead), ≈ 1 h:**
1. 00 (TL;DR, checklists A–B, README skeleton)
2. spec §4 and §7.7
3. spec §5.16 (keyless-birth runbook), then 22 for background
4. `../plan/implementation-plan.md` §1, §5–§9 (the original plan)
5. `../plan/launch-checklist.md` and `../plan/progress/feature-sprint.md` (current status)
6. `../plan/phase0-checklist.md` (historical)

## Errata quick reference (full table: spec §13; revision 2 changes marked "rev 2")

This summary covers errata up to the design revisions of Oct 26. Later ones (E-49 onward: the sprint, Oct 31 and Nov 3 changes) are only in spec §13.

- Solana blockhash life is **≈ 36 s**, not 60–90 s.
- New-account rent is **650,240 lamports**.
- **One 250-block quiet period before `list`; no post-listing buy cooldown** (rev 2). `buy` works as soon as a listing exists, bound to `(listing_id, expected_sig_count)` and gated by clean history. There is no `pending_signs` counter, no `ERR_COOLDOWN` and no "cooling down" pill.
- `sign_for` takes **structured payloads**. BTC takes one call with N preimages plus the serialized outputs; never several `sign` actions in one receipt.
- Gas: `min(300, 60 + 20·n)` Tgas attached; contract floor `30 + 18·n`.
- A missing BTC parent tx is **unfunded** (non-blocking), not live. The BTC builder never creates a txid that an old record references, and randomizes output order (rev 2).
- `nft_transfer_call` is disabled, and there are no NEP-178 approvals and no delegates in v1. A non-owner `nft_transfer` fails `ERR_NOT_OWNER` (behind it the standard says "Approval extension is disabled", not "Unauthorized"). The contract and MPC ids are refused as receivers, `ERR_BAD_RECEIVER` (rev 2).
- No chainsig.js, no database, no worker.
- **Keyless birth** (rev 2): `satchel.<team>.testnet` is created, funded, deployed, initialized and minted (ids 1–7) in **one tx from `<team>.testnet` with no AddKey** on Day 10, after an identical keyless rc birth on Day 9. It never has a key, so there is no trust window and no `delete-keys` step. Proofs: the birth tx's action list, an empty key list, an empty FastNEAR `is_any_signer` history, and an ascending history that starts at the birth.
- **NEAR tx proofs use the FastNEAR tx API** (`POST https://tx.test.fastnear.com/v0/transactions`) (rev 2). Non-archival RPC forgets a tx after ≈ 32–40 h, so never cite RPC `tx` for anything older than a day. NearBlocks pages are links only; its v1 API is frozen.
- **Judge pages render blocking** (`instant = false`, ids 1–7 prerendered) and are checked with an AI fetch tool, not only `curl` (rev 2). PPR streaming puts the data in hidden segments.
- The clean-history gate has three modes (`NEXT_PUBLIC_CONTRACT_ROLE`): dev = lock and code-hash checks as a warning; rc and final strict (rev 2).
- A locked (keyless) account prints "Account is locked (no access keys)". An empty key list alone also means "no such account".
- Never use `rpc.testnet.near.org`.
- **kb/80 and kb/81 Revision 2 supersede rev 1** (spec §13 E-42…E-44):
  - an identity-only card face (no balances, no flip);
  - a near-white CTA pill (metal only on the hallmark stamp);
  - full-page flows;
  - no relay copy;
  - verdict copy per clean-history aggregate;
  - an advisory pre-list past-signatures row.

  The references are in kb/82.
- **Satchel 2.0 (D-44, 2026-10-26) supersedes the R3 visuals below:** kb/81 R4 holds the tokens, the kb/80 R4 note holds the vocabulary and structure (Give, Paused for sale, Stop selling, Add coins, Used/Confirming/Not its coin; the `/satchels` app home; the charm-ledger card with a lemon "Yours" badge instead of the stitch; no fiat), and `docs/design/satchel-2.0/` holds the full specs.
- **kb/80 and kb/81 Revision 3 superseded R2's visuals** (spec §13 E-45…E-47; D-36):
  - the brand's leather and brass, Night (default) + Day;
  - a brass primary once per screen (not a pill);
  - Bricolage Grotesque / Instrument Sans / Spline Sans Mono, sentence case, mono only for addresses;
  - the brand card (band + total + native chips; the stitch only for its owner);
  - pills Active · Signing · Listed · Sold + Needs attention;
  - flows presented as a sheet or a 480 px dialog over the page;
  - the brand `og-image.png` site-wide;
  - a fiat card total "at mainnet prices" if UX-1's reopened default stands.
