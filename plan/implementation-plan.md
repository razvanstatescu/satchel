# Satchel — implementation plan, Nov 1–14, 2026

> Owner: lead architect · Written 2026-10-21 (Phase 0) · **Revision 2** (post-review; changelog at the top of `plan/decisions.md`) · Design: `kb/90-technical-spec.md` ("spec §x") · Decisions: `plan/decisions.md` (D-xx, H-xx) · Pre-Nov-1 work: `plan/phase0-checklist.md`.
> **Lanes:**
> - **S1:** Rust, contract, MPC, release.
> - **S2:** frontend, including the clean-history checker core (moved from S1 in rev 2).
> - **H:** human-only actions: approvals, faucets, wallets, recording, posting, submission. Who H is gets decided by Oct 24 (H-22).
>
> Both engineers use Claude Code. Estimates assume AI-assisted implementation with a human reviewing every change. Capacity is ≈ 9–10 focused hours per engineer per day; anything above 10 h is flagged ⚠.
> **AI-agent rules (HACKATHON.md, kb/00 §Gotchas 14).** Without the human's explicit confirmation, agents must never push or force-push, make the repo public, post on X, submit, sign transactions, spend tokens or deploy to mainnet.
> - A standing approval on Day 1 covers routine work (H-20, expanded in rev 2 to the `<team>.testnet` key within caps).
> - Each of these needs a **separate, explicit "yes"**: creating or deploying `satchel.<team>.testnet` (the final keyless birth), every mainnet action, making the repo public, the X post and the submission.
>
> Times are UTC. Bucharest (EET) is UTC+2 after Oct 25. The submission deadline is 2026-11-14T23:59:00Z (= Sun Nov 15 01:59 EET); the team target is **Nov 13 18:00 UTC** (kb/00 §Dates). Day 1 starts at **08:00 UTC** (10:00 EET; R-33).

---

## 1. Milestones and gates

| Gate | Date (UTC) | Pass criterion (evidence) | If missed |
|---|---|---|---|
| **G0 Day-1 checks** | Sun Nov 1, 10:00 | All of these hold: `check_rules.sh` shows no breaking diff; MPC `version()` = 3.17.0 and `config().sign_call_gas_attachment_requirement_tera_gas` = 15; the FastNEAR tx API answers keyless; standing approvals (H-20) recorded; private repo created | Read the diff and re-plan before writing code. If the MPC changed, diff `api/sign.rs` (A-01) |
| **G1 Day-1 smoke** | Nov 1 EOD (latest Nov 2, 12:00) | On `dev1.<team>.testnet`: `nft_mint` #1, then `sign_for` with an EVM unsigned tx via near CLI returns a signature that recovers to the derived address (SAT-007) | S2 pairs with S1; EVM only first |
| **G2 Sepolia send** | Tue Nov 3 EOD | The UI sends Sepolia ETH from a dev Satchel through `sign_for`, with an Etherscan link, using Meteor **and** Intear (SAT-224). An AI fetch tool sees the `/s/1` facts on the preview (SAT-215) | Fix tracker/wallet issues before BTC. If WebFetch fails, switch to the §8.1 fallback (spec) |
| **G3 testnet4 send + release tooling** | Wed Nov 4 EOD | The UI sends a 2-input BTC tx (one `sign_for`, fan-out) and mempool.space accepts it (SAT-234). The workspace reproducible build verifies on dev: `near contract verify --use-contract-source-code-path` says "the same" (SAT-035) | DP2: single-UTXO demo (n = 1). A verify failure is fixed before Day 9 (R-11) |
| **G4 Transfer = control** | Thu Nov 5 EOD | alice → bob `nft_transfer`; bob sends; alice's `sign_for` fails `ERR_NOT_OWNER` on testnet and in the sandbox (S-4). The keyless-birth batch passes in the sandbox (SAT-036, INV-31) | Transfer must pass. If the batch fails, use the near-api-js tool (SAT-084), then option (a) (D-02) |
| **G5 MVP freeze + backup video** | Fri Nov 6 EOD | S-1…S-5, S-14 and S-15 pass on dev; backup video ≤ 2:15 recorded | DP3 |
| **G6 Sale on dev** | Sun Nov 8 EOD | On dev via the UI, list → buy (NEAR) **right away**: the lenient gate shows "DEV CONTRACT" and the record checks gate Buy (D-30). The USDC path is green in the sandbox. Circle's failing-buy refund is verified on dev (SAT-073) | DP5; H-26 decided by Nov 8 EOD |
| **G7 Contract freeze + rc** | Mon Nov 9 EOD | All contract INV tests green, also on sandbox 2.14.0-rc.5 and on the reproducible artifact; hash H recorded twice; **rc born keyless** with the final batch; proofs 1–6 and `verify` pass on rc; rc e2e and the clean-history scenario green with the strict gate (SAT-082, SAT-085) | DP5/DP6: drop the failing feature (rc2 birth, SAT-083) |
| **G8 Final keyless birth** | **Tue Nov 10, 12:00** (hard deadline Wed Nov 11, 12:00) | `satchel.<team>.testnet` born in one tx from `<team>.testnet` with no AddKey; code hash = H; ids 1–7 minted to alice; USDC registered; proofs 1–6 in `docs/evidence/birth.json` (SAT-090) | DP6: birth from the last green rc tag |
| **G9 Feature freeze** | Nov 10 EOD | No new features afterwards; only fixes and polish | — |
| **G10 Demo data staged + beats recorded** | Wed Nov 11 EOD | Tokens #1–#5 in their scripted states (§5.4). The gift and sale beats were screen-recorded while being performed (SAT-100). The blocking SSR pages show the states | Retakes with #6/#7 on Day 12 morning |
| **DP9 BTC cut-off** | Thu Nov 12, 06:00 | #5's BTC send is confirmed (K = 1) | List #6 (EVM-only history) for judges instead; the BTC `spent` row comes from the rc evidence (D-32) |
| **G11 Video + README** | Thu Nov 12 EOD | Video ≤ 2:15 cut. README with every command re-run from a clean machine (`tools/judge-snippets.sh`) | Use the backup video (G5) |
| **G12 Submitted** | **Fri Nov 13, 18:00** | Repo public → X post live → payload confirmed → `POST /api/applications` → **201** saved | Day 14 buffer (hard stop Nov 14 23:59) |
| Buffer | Sat Nov 14 | — | — |
| Keep-alive | Nov 14–19 | `tools/monitor.sh` daily: README commands, no-JS page checks, wallet manifest, contract balance, providers (SAT-103) | §5.5 |

### Re-baselined schedule (replaces plan B6)

| Day | S1 (contract / release) | S2 (frontend) | Demo-able at EOD | Main deltas vs B6 |
|---|---|---|---|---|
| 1 Sun Nov 1 | workspace, mock signer, NFT core (all collections declared), `sign_for` v0 (EVM) + record + callback, dev1 deploy, CLI smoke | scaffold Next 16.4.2, tokens, fonts, wallet, RPC config, **derivation** | **G1** signature via our contract | sandbox mock and derivation move to Day 1; no lock |
| 2 Mon Nov 2 | full EVM classifier, **vectors**, storage charging, sandbox batch A (incl. the **timeout** test), dev redeploy | `/s/[id]` **blocking SSR** + `/api/satchels/[id]`, card art, Wallet tab, mint | real addresses + balances for dev token 1, in server HTML | structured payloads Days 1–2 (D-18); judge pages blocking (D-31) |
| 3 Tue Nov 3 | **BTC classifier + fan-out**, BTC sandbox tests, dev redeploy, buffer | tracker, **signing store / watcher**, SigningProgress, Send ETH, WebFetch check | **G2** Sepolia tx | chain-state-driven UI (kb/40) |
| 4 Wed Nov 4 | **SOL classifier**, gas/storage measurement, e2e EVM, CI, **reproducible build + verify on dev** | BTC send (PSBT, preimages, outputs, **txid collision check**) | **G3** testnet4 tx | release tooling proven on Day 4, not Day 9 (R-11) |
| 5 Thu Nov 5 | transfer and refusal sweeps, e2e BTC + fan-out, outcome fallback, **sandbox keyless-birth test** | transfer + handoff, Activity (lean), Broadcast again, home, receive | **G4** bob sends after gift | birth batch tested in the sandbox (A-17) |
| 6 Fri Nov 6 | MVP bug bash, evidence, **4 h buffer** | error states, `/contract`, Playwright, backup video | **G5 MVP + backup video** | real slack before Phase 2 (R-15) |
| 7 Sat Nov 7 | list / delist / quiet period / buy NEAR + payout (no cooldown), dev redeploy | Sell tab, status pills, **checker core**, market | listing freezes signing; buy works at once | checker core moved to S2 (R-15); no buy cooldown (D-05) |
| 8 Sun Nov 8 | USDC `ft_on_transfer` + mock FT, **Circle failing-buy test**, birth tooling, dev redeploy | Buy tab (NEAR), CleanHistory UI with gate modes, settle guidance, verified balance | **G6** testnet sale (NEAR) | gate usable on dev (D-30) |
| 9 Mon Nov 9 | **contract freeze**: review, repro build, **rc keyless birth**, clean-history scenario | USDC buy UI, checker SOL/account/contract checks, rc preview build | **G7** rc green, strict gate | rc rehearses the exact final batch (D-02) |
| 10 Tue Nov 10 | **G8 final keyless birth**, switch app, staging part 1, 3 h buffer | final switch, **Solana send**, regression | keyless contract, SOL send | 1Click cut (D-19) |
| 11 Wed Nov 11 | staging part 2 **with recorded beats**, README contract sections, monitor, 2 h buffer | polish, a11y, Day theme on, screenshots, demo rehearsal, dynamic card | **G10** demo states | beats recorded during staging (R-30) |
| 12 Thu Nov 12 | README final + SECURITY.md, CI badge, secrets scan, payload draft | video ≤ 2:15, X post draft, README UI steps, performance | **G11** | video limit 2:20 (D-17) |
| 13 Fri Nov 13 | submission runbook (with H) | final checks | **G12 submitted** | rules re-check + payload validation |
| 14 Sat Nov 14 | buffer | buffer | — | — |

---

## 2. Capacity check (estimated hours per lane per day)

The S1 and S2 columns are the sums of the Est column of §3. Buffer hours are included in the S1/S2 figures and also shown separately. H counts the human's time: H-only tasks plus the human share of shared (S+H) tasks.

| Day | S1 h | of which buffer | S2 h | of which buffer | H h | Note |
|---|---:|---:|---:|---:|---:|---|
| 1 | **10.0** ⚠ (at limit) | 0 | 9.5 | 0 | 1.5 | Day starts 08:00 UTC; G1 may slip to Day 2 noon without harm |
| 2 | 9.75 | 0 | 9.5 | 0 | 0.5 | H: fallback BTC/ETH claims if H-23 = no wallet |
| 3 | 9.0 | 1.0 | 9.5 | 0 | 1.0 | H: wallet tests (SAT-224) |
| 4 | 9.75 | 0 | 9.0 | 0 | 0 | |
| 5 | 8.75 | 0 | 9.25 | 0 | 0.25 | H: approve the fan-out run |
| 6 | 8.0 | **4.0** | 8.5 | 1.0 | 2.0 | real slack (R-15); H: backup video |
| 7 | 8.5 | 0 | 9.5 | 0 | 0 | |
| 8 | 8.25 | 0.5 | 9.25 | 0 | 0.5 | H: Circle test witness; H-26 by EOD |
| 9 | 8.75 | 0 | 8.5 | 0 | 0.5 | H: contract review sign-off |
| 10 | 9.0 | **3.0** | 8.5 | 0 | 1.5 | H: final-birth "yes", staging |
| 11 | 9.0 | **2.0** | 9.0 | 0 | 2.0 | H: staging + recorded beats |
| 12 | 8.25 | 0 | 8.0 | 0 | 2.5 | H: voice-over, README review, payload fields |
| 13 | 3.0 | 0 | 2.0 | 0 | 1.5 | H: public / post / submit |
| 14 | 0 (buffer) | — | 0 (buffer) | — | — | 16 h buffer after the target |
| **Total** | **110.0 h** | **10.5 h** | **110.0 h** | **1.0 h** | **13.75 h** | + Phase-0 human work ≈ 8 h (checklist) |

- **No day exceeds 10 h.** S1's buffer grew from ≈ 1 h to 10.5 h because SAT-072 moved to S2, SECURITY.md was folded into SAT-110, the 1Click clip and the prices route were cut, and SAT-052/063 were absorbed.
- **S2 has little slack (1 h) but holds the cuttable work:**
  - Solana UI, 5.5 h (DP7);
  - the dynamic card, 2.0 h in the Est column, of which 1.0 h is now saved: the OG image is the brand's file (DP2; D-36).

  S1's Day-10/11 buffer (5 h) is the first reserve for S2 slips (pairing).
- **If H is S1** (H-22), S1's Day-10/11 buffer absorbs the 3.5 H hours of those days, so no day exceeds 10 h. **If H is S2**, move SAT-303 (demo rehearsal, 2 h) into S1's Day-11 buffer. Day 12 then carries S2 8.0 h + H 2.5 h, so SAT-301 (performance, 1.5 h) moves to Day 13.
- If both lanes slip more than 4 h by the end of Day 4, take DP2's cuts early.

**Critical path** (S1; review §6.2, revised):

SAT-003 → 004/005 → 006 → 010 → 012/013 → 020 → 021 → 022 → 030 → 040/041 → 060 → 061 → 071 → 084 → 080 → 081 → 082 → 085 → **090 (final birth, human gate)** → 092 → 100 → 310 → 120 (human gate).

- **Testnet4 is off the video's critical path.** #3's sale story is EVM-only, and #5's BTC row has a cut-off (DP9).
- **Release tooling is proven early:** reproducible build + verify on Day 4 (SAT-035) and the keyless batch in the sandbox on Day 5 (SAT-036).
- **Same-day cross-lane dependencies (fragile):**
  - SAT-023 (S1, Day 4) ← SAT-223 (S2, Day 3; previous day, fine);
  - SAT-260 ← SAT-062 (Day 7);
  - SAT-271 ← SAT-072 (same lane since rev 2);
  - SAT-285 ← SAT-082 (Day 9: DP5 at 12:00, then SAT-081, so rc is born ≈ 14:00 UTC and SAT-285 runs late in the day);
  - SAT-291 ← SAT-090 (Day 10, after noon).

**D-37 update:** UX-1 native-only removes the prices route (−1.5 h), so the S2 delta is **+7.0 h** and P1 is +4.5 h (S2 Day-6 buffer 1 h + 3.5 h of S1's Day-6 pairing buffer). Brass-band stack and global Activity are cut.

**Design Revision 3 (brand consolidated, 2026-10-21; kb/80 R3 §Scope and phasing; D-36).** R3 merges Razvan's brand (`brand/`) with the R2 Mobbin redesign. If everything not marked "cut" ships, S2 gains **+8.5 h** over the Est column (R2 was +9.0 h). The Est column itself is unchanged; these are deltas:

| Part | Hours | What it covers | Funded by |
|---|---:|---|---|
| P1 | +6.0 | R2's core restyles +2.0 and Receive +1.0 (A-01 QR panel and info rows, A-02 Incoming); R3: Night + Day tokens +0.25, the FlowShell (sheet / 480 px dialog over the page) +1.0, the NavShell (left nav from 1024, NavSheet) +0.5, the prices route + card total +1.5 (if UX-1's default stands), card chips + stitch +0.5, brand assets + fonts +0.25; savings: the brand card replaces the alloy −0.5, a simpler handoff −0.25, no alloy QR frame −0.25 | the S2 Day-6 buffer (1 h) + **all 4 h** of S1's Day-6 buffer as pairing (R2 used 2) + the prices route as the last R3 cut at DP3 |
| P2 | +1.5 | StickyBuyBar + listing-changed +1.0, CleanHistory grouping +0.5, the Day theme switch-on +1.0; saving: the brand OG image replaces SAT-292's generated OG −1.0 | S1's Day-10/11 pairing buffer |
| Polish | +1.0 | A-04 home stack 0.75 + A-09 overflow menu 0.5 − no card tilt 0.25. R2's frost, hallmark strike, materialise, finishes wall and SVG frost (−3.25 h) are dropped | nothing reserved; cut first after DP8 |

- Native-only fiat (UX-1's alternative) removes the prices route: P1 +4.5, total +7.0 h.
- R3 cut order, appended to D-20's: A-09 → A-04 → the Day switch-on (the app stays Night) → prices (the card reads "{n} chains"). The FlowShell, NavShell, card and assets are structural and are not cut.
- **Plan owner: confirm the S1 pairing hours on Day 6 (all four) and Days 10–11** (H-11 / checklist §6).

---

## 3. Task list

Columns:
- **Est** is in hours.
- **AC** = acceptance criterion: S-x from plan B3 as restated in the spec; INV-xx from spec §6; S-13 "keyless and verifiable", S-14 "judge path", S-15 "signing robustness" (all defined in spec §6).
- Every contract change lands with its sandbox test in the same PR. Every PR runs CI.
- Rev 2 removed SAT-043 (into SAT-110), SAT-052 (into SAT-060), SAT-063 (buffers), SAT-093/101 (1Click), SAT-253 (into SAT-300), SAT-263 (into SAT-291) and SAT-283 (prices).

### Phase 1 — MVP (Days 1–6)

| ID | Lane | Day | Title | Description | Deliverables | Deps | AC | Test | Est |
|---|---|---|---|---|---|---|---|---|---|
| SAT-001 | H | 1 | Day-1 checks + approvals | Run `research/spikes/hackathon/check_rules.sh` and read the diff; MPC `version`/`config` views; FastNEAR tx API keyless (A-08) and NearBlocks freshness (A-14); collect the standing approvals H-20 (rev-2 text) in writing; create the private repo | note in team channel; `docs/day1-checks.md` (no secrets) | — | G0 | — | 1.5 |
| SAT-002 | S1 | 1 | Repo skeleton | Layout spec §11; `.gitignore`, `.env.example` (every key of spec §8.4, no values), LICENSE (H-03), README stub with the approved "Pre-hackathon work" disclosure (H-24), `rust-toolchain.toml`, workspace `Cargo.toml`, `pnpm-workspace.yaml`, `.nvmrc` | repo root files | SAT-001 | — | CI lint later | 1.0 |
| SAT-003 | S1 | 1 | Contract crate bootstrap | `contracts/satchel` with the Cargo.toml from spec §5.2. **Declare every collection of the root `Contract` struct now** (tokens, records, per-token state, listings, proceeds), even those first used on Days 7–8, so dev1 can be redeployed in place through Day 9 (R-41). `cargo generate-lockfile`; confirm `near-sdk-env 0.1.6`; `cargo near build non-reproducible-wasm --locked`; prove `serde_json::Value` in a return type compiles with the ABI (A-11) | `contracts/satchel/*`, `Cargo.lock` | SAT-002 | — | build | 1.5 |
| SAT-004 | S1 | 1 | Mock signer | `contracts/mock-signer`: `sign` (≥ 1 yocto, ≥ 15 Tgas, `Promise::new_yield` with a 7 Tgas callback), `respond(id, json)`, `respond_garbage(id)`, modes `reply`/`never`/`panic`, `fail_on_timeout` panicking `"Request has timed out."`, a view of the recorded (predecessor, path, payload_v2, domain_id, prepaid_gas, deposit). Re-written from the kb/21 §Mock signer spec; never paste spike code | `contracts/mock-signer/*` | SAT-003 | INV-06 groundwork | sandbox | 2.0 |
| SAT-005 | S1 | 1 | NFT core | `#[init] new(mpc, usdc, base_uri)`, not `#[private]` (spec §5.6, R-32). `nft_mint` with measure → flush → charge → refund. `nft_transfer` wrapper in order `ERR_TOKEN_NOT_FOUND` → `ERR_NOT_OWNER` → `ERR_LISTED` → `ERR_BAD_RECEIVER` (contract id or MPC id) → standard (R-16, R-18). `nft_transfer_call` → `ERR_TRANSFER_CALL_DISABLED`. `nft_token`, NEP-181 enumeration, NEP-177 metadata (`media = "{id}.svg"`); approvals prefix `None` | `src/lib.rs` | SAT-003 | S-1, INV-05, INV-21, INV-30 | unit + 1 sandbox | 2.0 |
| SAT-006 | S1 | 1 | `sign_for` v0 + callback | EVM path only, with a minimal parse (type 0x02, 9-item list, chain id); write the `SigRecord`; `sign_requested` event; MPC promise (15 Tgas, weight 1, `mpc_deposit`); raw `on_signed` (spec §5.8); `satchel` and `sig_records` views | `src/{sign,mpc,events,views,types}.rs` | SAT-004, SAT-005 | S-3 | sandbox happy path | 2.5 |
| SAT-007 | S1 | 1 | Dev deploy + G1 smoke | Create `dev1.<team>.testnet` (5 NEAR) with the `<team>.testnet` key (approval b), deploy + init, mint #1 to `alice`. Build an unsigned Sepolia tx with a tiny viem script (`tools/smoke/evm-unsigned.ts`); call `sign_for` via near CLI (`prepaid-gas '80 Tgas' attached-deposit '0.005 NEAR'`); recover the address locally (`tools/smoke/verify-evm.ts`) | tx hash + FastNEAR outcome in `docs/evidence/day1-smoke.json` | SAT-006 | **G1**, S-3 | testnet | 1.0 |
| SAT-200 | S2 | 1 | Web scaffold | `create-next-app@16.4.2` (flags spec §11) into `apps/web`; pin every version in spec §10 with `--save-exact`; tsconfig `ES2022` + `rm -rf .next`; keep AGENTS.md; Node 22.22.2; Vercel project on the chosen host (H-05) + first deploy (check A-09) | `apps/web/*`, `pnpm-lock.yaml` | SAT-002 | — | `next build` | 2.0 |
| SAT-201 | S2 | 1 | Brand tokens, fonts, shell | Re-type the kb/81 R3 CSS block (brand tokens, Night + Day via `light-dark()`; P1 renders `data-theme="night"`); `next/font` Bricolage Grotesque (`opsz`) + Instrument Sans + Spline Sans Mono + the Satchel Symbols subset; brand assets through the Metadata API (favicons, PWA, manifest, the brand `og-image.png` as `app/opengraph-image.png`; spec §8.10); NavShell (top bar < 1024, left nav ≥ 1024, NavSheet); shadcn init (choose the base on Day 1); Testnet chip, footer ("Testnet only…"), `MotionConfig reducedMotion="user"`; role banner from `NEXT_PUBLIC_CONTRACT_ROLE` ("DEV CONTRACT" / "RELEASE CANDIDATE") | `app/layout.tsx`, `globals.css`, components | SAT-200 | — | visual | 2.0 |
| SAT-202 | S2 | 1 | Wallet provider | `lib/near/wallet.tsx`: module singleton `NearConnector({network:'testnet', footerBranding:null})`, sign-in/out, account state; WalletButton. Read the 0.11.4 source for a manifest override and note it (A-19) | `lib/near/wallet.tsx` | SAT-200 | — | Chrome: 6 testnet wallets listed (kb/40 §A) | 1.5 |
| SAT-203 | S2 | 1 | Config + RPC | `lib/config.ts` (zod env incl. `CONTRACT_ROLE`, `EXPECTED_CODE_HASH`), `lib/near/rpc.ts` (FailoverRpcProvider [FastNEAR, dRPC], retries 2), `lib/near/constants.ts` (spec §5.5 formulas) | lib files | SAT-200 | — | unit | 1.0 |
| SAT-204 | S2 | 1 | Derivation module | `lib/derive`: evm/btc/sol for testnet + mainnet roots; vitest with the kb/11 vectors → `vectors/derive.json`; `@network` test against the live `derived_public_key` view; address → token index (spec §8.2) | `lib/derive/*`, `vectors/derive.json`, tests | SAT-200 | S-2 | vitest | 2.0 |
| SAT-205 | S2 | 1 | Contract client | `lib/near/contract.ts`: typed views and call builders from the spec §5.14 JSON shapes | lib file | SAT-203 | — | unit (types) | 1.0 |
| SAT-010 | S1 | 2 | EVM classifier | Full rules (spec §5.9 EVM): canonical RLP, widths, `to`, `data`, access list, chain id; error codes; unit tests on the KB constants (kb/31 48-byte tx → `bc65…c377`; kb/70 F1 52-byte → `8cb1…a1a9`) | `src/parse/{rlp,evm,hex}.rs` | SAT-006 | INV-07, INV-09 (EVM) | unit | 3.0 |
| SAT-011 | S1 | 2 | Shared vectors | `tools/vectors/gen.ts` (viem / bitcoinjs-lib 7 / web3.js 1.99), every accepted and refused case in spec §12.2 → `vectors/{evm,btc,sol}.json` (the durable-nonce vector expects `ERR_SOL_DURABLE_NONCE`, R-24); Rust unit tests read them via `include_str!` | `tools/vectors/*`, `vectors/*.json` | SAT-010 | INV-09 | unit (Rust + TS) | 2.0 |
| SAT-012 | S1 | 2 | Storage + deposits | Measured charging in `sign_for` (`n × mpc_deposit` + Δstorage), refunds, `ERR_DEPOSIT` / `ERR_GAS` / `ERR_MPC_DEPOSIT`; **measure the record sizes** (A-03) and update spec §5.4 | `src/sign.rs` | SAT-006 | INV-17, INV-18, INV-26 | sandbox | 1.5 |
| SAT-013 | S1 | 2 | Sandbox batch A | Test helpers (re-written from kb/21 §Test helpers); tests INV-01, 06 (EVM), 07 (EVM), 08, 11, **12 (timeout via `fast_forward(250)`, garbage, panic)**, 17, **18 exact** (`attached − refund == Δstorage × byte_cost + n × mpc_deposit`, R-26), 19 (n = 1), 26, 29 | `tests/tests/{sign,storage,gas}.rs` | SAT-004, SAT-012 | INV list | sandbox | 3.0 |
| SAT-014 | S1 | 2 | Dev redeploy (EVM) | Redeploy dev1 in place with the full EVM classifier; re-run the G1 smoke (R-41) | — | SAT-010 | — | testnet | 0.25 |
| SAT-210 | S2 | 2 | `/s/[id]` blocking SSR | `export const instant = false` (A-18); reads in `"use cache"` + `cacheLife({revalidate:15})` with 1.5 s upstream timeouts; **no Suspense above the facts**; `generateStaticParams` → ids 1–7; H1/sub, owner, status, full addresses, balance snapshot, `sig_count`, lock facts, Facts `<dl>`, meta description, `<title>`, 404. Fallback per spec §8.1 rule 4 | `app/s/[id]/*` | SAT-204, SAT-205 | S-2, S-14 | curl without JS shows the facts outside `hidden` nodes; WebFetch in SAT-215 | 3.0 |
| SAT-211 | S2 | 2 | `/api/satchels/[id]` (+ `/api/prices`) | Route handler spec §9 (1.5 s upstream timeouts, partial results). If UX-1's reopened default stands: `/api/prices` (1Click `/v0/tokens` → CoinGecko, 60 s; spec E-47) | `app/api/satchels/[id]/route.ts` | SAT-210 | S-14 | curl | 1.5 |
| SAT-212 | S2 | 2 | Satchel card (brand) | `lib/card` per-token leather hue (kb/81 R3; test vectors ids 1–8, 42); `SatchelCard` (brass band + status pill, leather body, native chips, the total or "{n} chains", the stitch for owners; kb/80 R3); `/api/card/[id].svg` = the brand card without balances or stitch (static first; status + `sig_count` added in SAT-292) | components, route | SAT-201 | S-1 | vitest vectors | 2.0 |
| SAT-213 | S2 | 2 | Wallet tab | ChainRows (BTC mempool, ETH Sepolia; SOL row hidden until P2), copy, QR (pick the lib, A-12), explorer links, "read {t} ago" | components | SAT-210 | S-2 | Playwright later | 1.5 |
| SAT-214 | S2 | 2 | Mint flow | `/mint`: storage line, wallet call (0.02 NEAR, 30 Tgas), minimal tx tracking, reveal | `app/mint/*` | SAT-202, SAT-205 | S-1 | manual on dev | 1.5 |
| SAT-020 | S1 | 3 | BTC classifier | Spec §5.9 BTC: 182-byte layout, version 2, SIGHASH_ALL, scriptCode, locktime 0, sequence ≥ fffffffd, completeness (`hashPrevouts`), `hashSequence`, outputs parse and `hashOutputs`, duplicates, n ≤ 10 | `src/parse/btc.rs` | SAT-011 | INV-09 (BTC), INV-23 | unit vectors | 3.5 |
| SAT-021 | S1 | 3 | BTC fan-out | n promises joined with `.and()`, `on_signed(n)` per index, per-input records, event with preimages + outputs | `src/sign.rs` | SAT-020 | INV-24 | sandbox | 1.5 |
| SAT-022 | S1 | 3 | BTC sandbox tests | INV-06 BTC (`mpc_request_shape_btc`, R-27), INV-07 (BTC), 23, 24 (partial failure), 19 (n = 2, 4, 10) | `tests/tests/{sign,gas}.rs` | SAT-021 | INV-06/07/19/23/24 | sandbox | 2.75 |
| SAT-024 | S1 | 3 | Dev redeploy (BTC) | Redeploy dev1 in place with the BTC classifier (R-41) | — | SAT-021 | — | testnet | 0.25 |
| SAT-025 | S1 | 3 | Buffer | — | — | — | — | — | 1.0 |
| SAT-220 | S2 | 3 | Tx tracker + outcome | `lib/near/track-tx.ts` (re-written from kb/40 §Tested tracker), `lib/near/outcome.ts` (decode the array of MPC JSON; receipts fallback that matches signatures to payloads by verification) | lib + tests | SAT-203 | S-15 | vitest with recorded outcomes | 1.5 |
| SAT-221 | S2 | 3 | Signing store | `lib/signing`: `PendingIntent` (spec §8.6) in `localStorage['satchel:pending:v1']`, module-level store + `useSyncExternalStore`, contract watcher (`sig_records(token, s0, 20)` every 2 s), state machine, resume on load | lib + tests | SAT-220 | S-15 | vitest (fake timers) | 2.5 |
| SAT-222 | S2 | 3 | SigningProgress UI + FlowShell | Steps, timer, copy thresholds 15/20/60/150 s (D-16), `role="status"`, error map hookup; the FlowShell (sheet < 768 px, 480 px dialog ≥ 768 px over the Satchel page the route renders; kb/80 R3) | component | SAT-221 | S-15 | visual | 1.5 |
| SAT-223 | S2 | 3 | EVM send | `lib/chains/evm` (viem fallback client, pending nonce, `estimateFeesPerGas`, gas 21000, unsigned type-2, `yParity = recovery_id`, `recoverTransactionAddress` check, hash-first broadcast); Send form, recipient validation (EIP-55 rules), ReviewCard | lib + `app/s/[id]/send/*` | SAT-221, SAT-012 | S-3 | vitest vs vectors | 2.5 |
| SAT-215 | S2 | 3 | WebFetch check | On the Vercel preview, an agent fetches `/s/1` (dev contract) with an AI fetch tool (WebFetch) and confirms that owner, full addresses, status, `sig_count` and lock facts are visible. `/contract` and `/market` are checked when they exist (SAT-251, SAT-262). Repeated on Day 12 (R-07) | `docs/evidence/webfetch.md` | SAT-210 | S-14 | AI fetch | 0.5 |
| SAT-224 | S2+H | 3 | **G2 run** | Sepolia send from dev #1 with Meteor and with Intear (H-17); record when each wallet's promise resolves | `docs/evidence/g2.json` | SAT-223 | **G2** | testnet | 1.0 |
| SAT-030 | S1 | 4 | SOL classifier | Spec §5.9 SOL: legacy, 1 signer, **durable-nonce scan first** (R-24), then exactly one System Transfer; vectors; unit + sandbox INV-06/07 (SOL) | `src/parse/sol.rs` | SAT-011 | INV-07/09 (SOL) | unit + sandbox | 3.0 |
| SAT-031 | S1 | 4 | Gas/storage measurement | Sandbox + testnet: n = 1, 2, 4, 10 entry burn, callback burn, record bytes, and the wasm size of the v1 parsers; confirm `30 + 18n` / `60 + 20n` / 0.005 NEAR × n (A-02, A-03); update spec §5.5 if needed | `docs/evidence/gas.json`, spec PR | SAT-021 | INV-19 | measurement | 1.5 |
| SAT-023 | S1 | 4 | e2e EVM | `tools/e2e/evm.ts`: near-api-js `send_tx INCLUDED` + trackTx → signature → broadcast (reuses S2's `lib/chains/evm`) → receipt; `--fanout` sends ETH to a list of addresses (R-14) | `tools/e2e/evm.ts` | SAT-012, SAT-223 | S-3 | testnet | 1.0 |
| SAT-033 | S1 | 4 | CI | GitHub Actions per spec §12.6 (cache, sandbox, wasm-imports check, grep for the near.org RPC) | `.github/workflows/ci.yml`, `tools/check-wasm-imports.sh` | SAT-013 | INV-22 | CI | 2.0 |
| SAT-034 | S1 | 4 | Views final | `config()` and view encodings exactly per spec §5.14 | `src/views.rs` | SAT-030 | INV-27 | sandbox | 0.5 |
| SAT-037 | S1 | 4 | Dev redeploy (SOL) | Redeploy dev1 in place with the SOL classifier (R-41) | — | SAT-030 | — | testnet | 0.25 |
| SAT-035 | S1 | 4 | **Reproducible build + verify on dev** | On the real workspace (commit pushed to the private repo): `cargo near build reproducible-wasm --manifest-path contracts/satchel/Cargo.toml`; `check-wasm-imports.sh` on that artifact (R-35); deploy it to dev1 with `near contract deploy … use-file`; `near contract verify --use-contract-source-code-path ./ deployed-at dev1.<team>.testnet network-config testnet-fastnear now` → "…are the same"; check `build_info.contract_path` (R-11) | `docs/evidence/repro-dev.txt` | SAT-033 | S-13 | testnet | 1.5 |
| SAT-230 | S2 | 4 | BTC data client | `lib/chains/btc/api.ts`: mempool.space + emzy fallback, text/plain POST, genesis guard, `/tx/:txid/outspends` per distinct txid (404 ⇒ unknown txid) | lib | SAT-203 | — | vitest (fixtures) | 1.0 |
| SAT-231 | S2 | 4 | Coin selection + fees | largest-first; vsize formula; `max(2, halfHourFee)`; dust per recipient type; change < 294 → fee; Max = sweep without change; at most 10 inputs | lib + tests | SAT-230 | — | vitest | 1.5 |
| SAT-232 | S2 | 4 | PSBT + preimages + outputs + **collision check** | bitcoinjs-lib 7 PSBT (version 2, locktime 0, sequence `0xfffffffd`, `witnessUtxo`); browser-safe BIP143 preimage builder; outputs serializer; `initEccLib(@bitcoinerlab/secp256k1)` for `tb1p`. **Random output order**; candidate txid checked against the txids referenced by this token's records and the recipient Satchel's records; perturb with fee +1 sat (≤ 3), then nSequence `fffffffd`↔`fffffffe`; refuse if none is free (spec §8.2, R-05) | lib + tests | SAT-231 | INV-07 (client), INV-32 | vitest: `sha256d(preimage) == hashForWitnessV0`; vectors; `builder.test.ts::avoids_logged_txids` | 3.0 |
| SAT-233 | S2 | 4 | Assemble + broadcast | r‖s 64 bytes, defensive low-S, `psbt.signInput` with a custom signer, strict `validateSignaturesOfAllInputs` (`prehash:false`), finalize, broadcast, status polling | lib | SAT-232 | S-3 | vitest + testnet | 1.5 |
| SAT-234 | S2 | 4 | Send BTC UI + **G3** | recipient validation via `toOutputScript(addr, testnet)`; Satchel recipients recognised through the address index; review in sats; "Uses n coins…" note; one `sign_for` with n preimages (gas `60+20n`) | `app/s/[id]/send/*` | SAT-233 | **G3**, S-3 | testnet | 2.0 |
| SAT-040 | S1 | 5 | Transfer tests | INV-02 (transfer), INV-03 (`ERR_NOT_OWNER` before the standard's checks), INV-05, INV-11 `records_survive_transfer` (R-27), INV-21, INV-28, INV-30 `bad_receivers`; error-code sweep against spec §5.15 | `tests/tests/{transfer,nft}.rs` | SAT-013 | S-4, S-5 | sandbox | 2.5 |
| SAT-041 | S1 | 5 | Refusal sweep | INV-09 for every vector (all chains) in the sandbox, plus "refusal changes nothing"; property test over random valid EVM txs (fields round-trip) | `tests/tests/sign.rs` | SAT-030 | INV-09 | sandbox + unit | 2.0 |
| SAT-032 | S1 | 5 | e2e BTC + fan-out | `tools/e2e/btc.ts`: 2-input preimages + outputs → `sign_for` → assemble → `POST /tx`. `--fanout` builds one tx with many outputs (collision-checked) to split a large UTXO across Satchel addresses (R-14) | `tools/e2e/btc.ts` | SAT-021, SAT-232 | S-3 | testnet | 1.0 |
| SAT-042 | S1 | 5 | Pairing: BTC + outcome fallback | Work with S2 on BTC send edge cases (partial fan-out failure → retry with the same inputs); tests for the `outcome.ts` receipt-scan fallback | tests | SAT-234 | S-15 | vitest | 1.5 |
| SAT-044 | S1+H | 5 | MVP dev data + fallback funding | Mint the MVP tokens on dev1. If H-23 = no wallet, run `btc.ts --fanout` and `evm.ts --fanout` from dev1 #1 to the final 1–7, rc 1–2 and dev1 2–3 rows of checklist §4 (approval b, within caps; H approves the printed output list) | `docs/funding.md` (addresses + txids) | SAT-032 | — | testnet | 0.75 |
| SAT-036 | S1 | 5 | **Sandbox keyless-birth test** | `tests/tests/release.rs::keyless_birth_batch`: a parent account sends CreateAccount · Transfer · DeployContract · `new` · `nft_mint` ×7 in one tx (near-workspaces batch API). Assert the account exists, its key list is empty, `config()` is right and ids 1–7 belong to the persona. `failed_birth_leaves_nothing`: a bad `new` arg leaves no account. (Protocol acceptance and atomicity already VERIFIED on testnet 2026-10-21, `research/spikes/keyless-birth/RESULTS.md`; this is the regression test with the real Satchel wasm. near-cli-rs can't build the batch, so no CLI dry run) | `tests/tests/release.rs` | SAT-034 | INV-31, S-13 | sandbox | 1.0 |
| SAT-240 | S2 | 5 | Transfer + handoff | `/s/[id]/transfer`: AccountInput (`view_account`, debounced 400 ms); **blocks missing accounts, the contract id and the MPC id** (R-18); review copy per E-36; exactly 1 yocto; processing; HandoffAnimation (springs from kb/80 §Motion spec), reduced-motion variant; runs **only after** final success | route + components | SAT-221 | **G4**, S-4 | testnet + visual | 3.75 |
| SAT-241 | S2 | 5 | Activity tab (lean) | Contract records + FastNEAR tx API events (filter by `token_id`) with explorer links; in-flight items pinned; SSR first page. No merged chain histories (review §6.4 #4) | `app/s/[id]/activity/*` | SAT-210 | S-14 | curl / Playwright | 2.0 |
| SAT-242 | S2 | 5 | Broadcast again + retry rules | `signed_not_sent` handling; rebuild EVM from the record's `unsigned_tx` **only if its nonce equals the pending count** (else the nonce-gap note, R-13), BTC from the local intent or the event; same-nonce / same-inputs retry (spec §8.7); block a new send while an intent is open | lib + UI | SAT-221 | S-15 | vitest | 1.5 |
| SAT-243 | S2 | 5 | Home | Landing (the brand hero beside the live card #1, How it works, proof strip) + My Satchels (`nft_tokens_for_owner`) | `app/page.tsx` | SAT-212 | S-14 | Playwright | 1.0 |
| SAT-235 | S2 | 5 | Receive page | `/s/[id]/receive`: chain toggle, QR, grouped full address, "Send only…" warning, faucet links | route | SAT-213 | S-2 | Playwright | 1.0 |
| SAT-050 | S1 | 6 | MVP bug bash | All MVP flows on dev with Meteor and Intear; fix | fixes | all P1 | G5 | manual + CI | 3.0 |
| SAT-051 | S1 | 6 | Evidence (MVP) | `docs/evidence/` with the FastNEAR `/v0/transactions` JSON of the MVP proof txs (D-10); backup-video script and data | docs | SAT-050 | S-14 | — | 1.0 |
| SAT-053 | S1 | 6 | **Buffer** | Real slack: absorb Days 1–5 slips; otherwise pair with S2 (R-15) | — | — | — | — | 4.0 |
| SAT-250 | S2 | 6 | Error and empty states | Error map E1–E26 (kb/80) with spec §5.15 codes (incl. `ERR_BAD_RECEIVER`, `ERR_CHAIN_UNSUPPORTED`; no `ERR_COOLDOWN`); `lib/copy.ts`; empty states | components | — | S-15 | visual | 2.0 |
| SAT-251 | S2 | 6 | `/contract` + `/api/contract` | Blocking SSR (60 s cache): role, code hash vs expected, key list, birth tx and block A, `is_any_signer` count, oldest tx, MPC version, `config()`, copy-paste verify commands (spec §5.16 proofs) | route + page | SAT-210 | S-13, S-14 | curl + WebFetch | 1.5 |
| SAT-252 | S2 | 6 | Playwright smoke | Spec §12.5 checks with JavaScript disabled (facts not inside `hidden` elements); CI manual job | `apps/web/e2e/*` | SAT-210 | S-14 | Playwright | 1.5 |
| SAT-254 | S2+H | 6 | **Backup video** | ≤ 2:15 on the dev deployment (hook, mint/fund, send ETH, transfer + bob sends BTC, repo) | video file (outside the repo) | SAT-050 | **G5** | — | 2.5 |
| SAT-255 | S2 | 6 | Buffer | — | — | — | — | — | 1.0 |

### Phase 2 — full v1 (Days 7–11)

| ID | Lane | Day | Title | Description | Deliverables | Deps | AC | Test | Est |
|---|---|---|---|---|---|---|---|---|---|
| SAT-060 | S1 | 7 | list / delist | Listing state (collections declared on Day 1), quiet period `ERR_QUIET_PERIOD`, `ERR_*` guards, `listings` index, `listed`/`delisted` events, storage charge | `src/sale.rs` | SAT-013, SAT-040 | S-6, INV-13 | sandbox | 3.5 |
| SAT-061 | S1 | 7 | buy (NEAR) + payout | Atomic sale with **no cooldown** (`sale.rs::buy_right_after_list`), detached payout + `on_payout` re-credit with `saturating_add` (R-25), `withdraw_proceeds` | `src/sale.rs` | SAT-060 | S-7, INV-14/15/25, INV-02 (buy) | sandbox (incl. a deleted-seller test) | 3.0 |
| SAT-062 | S1 | 7 | Sale views + e2e | `listings`, `proceeds_of`; `tools/e2e/sale.ts` (NEAR) on dev | views, script | SAT-061 | S-7 | testnet | 1.5 |
| SAT-064 | S1 | 7 | Dev redeploy (sale) | Redeploy dev1 in place with the sale (R-41) | — | SAT-061 | — | testnet | 0.25 |
| SAT-065 | S1 | 7 | INV-17 sale half | `sale.rs::zero_deposit_rejected` for `list`, `delist`, `withdraw_proceeds` (R-27) | test | SAT-061 | INV-17 | sandbox | 0.25 |
| SAT-260 | S2 | 7 | Sell tab | ListingForm (price, currency, USDC `storage_balance_of(seller)` check + "Register for USDC"); quiet-period countdown ("You can list in {t}", from `config()` and the 100-block average); FreezeBanner "Signing paused while listed" (no buy countdown, E-37); "Before you list" checklist + GateLine; Delist in the same sheet, no confirm dialog (kb/80 R2 S-03, S-12) | `app/s/[id]/sale/*` | SAT-062 | S-6 | testnet | 3.0 |
| SAT-261 | S2 | 7 | Status pills | Active / Signing / For sale / Sold derivation (spec §5.10) | component | SAT-260 | — | vitest | 1.0 |
| SAT-072 | S2 | 7 | **Checker core (TS)** (moved from S1, R-15) | `lib/clean-history`: EVM + BTC item rules (`/outspends` per distinct txid), BTC request shortcut, `unfunded`, encumbered UTXOs, provider agreement and the "1 of 2 sources" policy (H-25), gate modes by role (INV-33), 100-txid soft cap, aggregate (spec §7), final-verdict cache | lib + fixture tests | SAT-230, SAT-205 | S-9 | vitest | 3.0 |
| SAT-262 | S2 | 7 | Market | `/market` blocking SSR listings + MarketCard; WebFetch check (SAT-215) | route | SAT-062 | S-14 | Playwright + WebFetch | 2.5 |
| SAT-070 | S1 | 8 | Mock FT | `contracts/mock-ft` (near-contract-standards FT 5.29.1, 6 decimals) | crate | — | — | sandbox | 1.5 |
| SAT-071 | S1 | 8 | USDC buy | `ft_on_transfer` (predecessor gate, panic-on-mismatch, atomic sale, `Value(0)`, detached `ft_transfer` payout). Tests: INV-16 incl. `direct_call_attack`, `near_listing_refunds` and `ft_self_buy` (R-27), INV-02 (USDC), INV-25 (unregistered seller) | `src/sale.rs` | SAT-061, SAT-070 | S-8 | sandbox | 3.0 |
| SAT-073 | S1+H | 8 | **Circle USDC check** (R-10) | On dev with faucet USDC: register the contract, list in USDC, buy via `ft_transfer_call` (happy path). **Failing buy** (wrong `listing_id`): the buyer's tx returns `SuccessValue "0"` and carol's balance is unchanged. **Direct `ft_on_transfer`** call → `ERR_WRONG_TOKEN`. If either fails → H-26 (`usdc: None`) by Nov 8 EOD | `docs/evidence/usdc.json` | SAT-071 | S-8 | testnet | 2.0 |
| SAT-074 | S1 | 8 | Dev redeploy (USDC) | Redeploy dev1 in place with USDC (R-41) | — | SAT-071 | — | testnet | 0.25 |
| SAT-084 | S1 | 8 | Keyless-birth tooling | `tools/deploy/keyless-birth.md`: the spec §5.16 runbook as a checklist with every human gate. `tools/deploy/keyless-birth.ts`: the near-api-js 7.3.1 **primary** birth tool (near-cli-rs 0.30.1 can't put actions after DeployContract); prints the action list and SHA-256 and requires a typed "yes"; `--dry-run` prints the rc batch for review without sending | docs + script | SAT-036 | S-13 | dry run | 1.0 |
| SAT-075 | S1 | 8 | Buffer | — | — | — | — | — | 0.5 |
| SAT-270 | S2 | 8 | Buy tab (NEAR) | BuyPanel; `buy(token_id, listing_id, expected_sig_count)` with exactly `price`, available as soon as listed; reverse handoff; `buy.err.*` (no cooldown error) | `app/s/[id]/sale/*` | SAT-061 | S-7 | testnet | 3.0 |
| SAT-271 | S2 | 8 | CleanHistory UI | Items, aggregate, ProofChip, `clean.disclosure`; role banner and the dev-mode warning (D-30); "1 of 2 sources" label; Buy enabled only for `clean`/`empty`; re-check right before sending | components | SAT-072 | S-9 | vitest + manual | 3.0 |
| SAT-272 | S2 | 8 | Pre-list check + settle | The owner sees the same checker before listing; "How to settle" per chain (EVM nonce-gap note, spec §7.6); "Broadcast now" from rows | components | SAT-271, SAT-242 | S-9 | manual | 2.0 |
| SAT-273 | S2 | 8 | Verified balance | Exclude encumbered UTXOs; BTC amounts from the chain, the record's amount labelled "claimed" (R-23); "as of" timestamp | component | SAT-072 | S-9 | vitest | 1.25 |
| SAT-080 | S1 (+H) | 9 | Contract review | Full suite on `sandbox_with_version("2.14.0-rc.5")`; clippy; invariant checklist review (human + AI) against spec §6; verify no admin/upgrade surface; **DP5 at 12:00** (before the rc birth) | review notes | all contract | all INV | sandbox | 1.5 |
| SAT-081 | S1 | 9 | Reproducible build (release) | Tag `contract-v1.0.0-rc1`; `cargo near build reproducible-wasm` twice → identical SHA-256 **H** (`shasum -a 256` / `sha256sum`); sandbox suite + `check-wasm-imports.sh` on that artifact (R-35) | hash in `docs/evidence/build.json` | SAT-080, SAT-035 | S-13 | sandbox | 1.25 |
| SAT-082 | S1 | 9 | **rc keyless birth + rehearsal** | Print the rc batch (Transfer 5 NEAR; same `new` args as the final) and check 11 actions, no AddKey; send under approval (b). USDC registration from `<team>.testnet`. Proofs 1–6 on rc. `near contract verify --use-contract-source-code-path ./ deployed-at rc.<team>.testnet …` → "the same" (R-11). Fund rc #1/#2 if not pre-funded. e2e EVM, BTC, transfer, sale NEAR + USDC on rc | `docs/evidence/rc.json` | SAT-081, SAT-084 | **G7**, S-13 | testnet | 3.0 |
| SAT-085 | S1 | 9 | **Clean-history scenario on rc** (R-09) | `tools/e2e/clean-history.ts` with `CONTRACT_ROLE=rc` (strict). (1) Sign EVM without broadcast → list → checker `blocked`, Buy disabled. (2) Delist → broadcast → 3 confirmations → relist → `clean`. (3) A stale `expected_sig_count` buy → `ERR_LISTING_CHANGED`; the current pair buys. (4) One BTC record reaches `spent` at K = 1 | `docs/evidence/rc-clean-history.json` | SAT-082, SAT-072 | **G7**, S-9 | testnet | 2.0 |
| SAT-083 | S1 | 9 | Fix + rebuild | Any contract fix → new rc tag → rc2 keyless birth (D-34 contingency) → repeat SAT-081/082/085 for the changed paths | — | SAT-082 | G7 | — | 1.0 |
| SAT-280 | S2 | 9 | USDC buy UI + withdraw | `ft_transfer_call` (1 yocto, 150 Tgas, msg); interpret `SuccessValue` ("0" = refunded); buyer USDC balance; Withdraw proceeds. Hidden if H-26 chose `usdc: None` | components | SAT-071 | S-8 | testnet | 2.5 |
| SAT-281 | S2 | 9 | Checker SOL + account + contract | SOL age rule (R-19); `eth_getCode`; SOL account owner; keyless + code-hash checks for roles rc/final; `/api/clean-history/[id]`; blocking SSR verdicts on `/s/[id]/sale` and `/market` | lib + route | SAT-072 | S-9, S-13 | vitest + curl | 2.0 |
| SAT-282 | S2 | 9 | Sale e2e via UI on dev | Personas on dev (lenient gate): list → buy right away (NEAR and USDC) | notes | SAT-280 | G6/G7 | testnet | 1.5 |
| SAT-285 | S2 | 9 | rc preview build | Vercel preview with `CONTRACT_ROLE=rc`, the rc contract and H. Walk the SAT-085 scenario in the UI: Buy disabled at `blocked`, enabled at `clean`; RELEASE CANDIDATE banner; WebFetch on `/contract` | preview URL + notes | SAT-082, SAT-271 | S-9, S-14 | testnet + WebFetch | 1.5 |
| SAT-284 | S2 | 9 | Polish | — | — | — | — | — | 1.0 |
| SAT-090 | S1+H | 10 | **Final keyless birth** | §6 checklist. Preconditions (G7; rc proofs; MPC check A-01; `satchel.<team>.testnet` still absent). Tag `contract-v1.0.0` on the rc1 commit (R-29). Print the final batch. **H's explicit "yes"** (H-15). Send; record the birth tx and block A. Proofs 1–6 → `docs/evidence/birth.json`. USDC registration (approval b) | evidence | SAT-082, SAT-085, H-15 | **G8**, S-13 | testnet | 1.5 |
| SAT-091 | S1 | 10 | Switch the app | Vercel env `CONTRACT_ROLE=final`, `SATCHEL_CONTRACT=satchel.<team>.testnet`, `EXPECTED_CODE_HASH=H`; production redeploy (approval c); SSR checks | env change | SAT-090 | S-14 | Playwright | 1.0 |
| SAT-092 | S1+H | 10 | Staging part 1 | Per §5.4: #1 one ETH + one BTC send; #3 one ETH send (EVM-only); #4 sign an EVM tx with **nonce = current + 1** and never broadcast it; #5 one BTC send (its `spent` row); check the blocking SSR | `docs/demo-state.md` | SAT-091 | S-9 | testnet | 2.5 |
| SAT-094 | S1 | 10 | Birth evidence | `view-account-summary` output, the curl pair, FastNEAR proofs 1, 3, 4, `contract_source_metadata` JSON → `docs/evidence/` | docs | SAT-090 | S-13 | — | 1.0 |
| SAT-095 | S1 | 10 | Buffer | First reserve for S2 (pairing) or a slipped birth | — | — | — | — | 3.0 |
| SAT-290 | S2 | 10 | Final switch check | All pages and flows on the final contract | — | SAT-091 | S-14 | Playwright | 1.0 |
| SAT-291 | S2 | 10 | **Solana UI** (cuttable, DP7) | `lib/chains/sol` (legacy transfer message, rent/fee rules 650,240 lamports, ed25519 verify, expiry check; vectors) + SOL ChainRow, Send SOL (prefetch/refresh the blockhash on Review, ≤ 10 s; expiry state; rent rules), Receive SOL; test on #1 | lib + routes | SAT-030, SAT-090 | S-11 | vitest + testnet | 5.5 |
| SAT-293 | S2 | 10 | Regression on final | Every flow on final with Meteor and Intear | fixes | SAT-290 | G9 | manual | 2.0 |
| SAT-100 | S1+H | 11 | **Staging part 2 + recorded beats** | Screen-record while performing (R-30): #2 alice → bob gift, bob sends BTC; #3 list 5 USDC → carol buys right away. Then #4 list → Buy disabled. #5 list 1 NEAR once its BTC send is confirmed (DP9). Check SSR + WebFetch | `docs/demo-state.md`, raw recordings (outside the repo) | SAT-092 | G10, S-4/7/8/9 | testnet | 3.5 |
| SAT-102 | S1 | 11 | README contract sections + judge snippets | "Verify on-chain": owner, keyless proofs 1–6, code hash, `sig_records`, `config`. A proof-tx table with a NearBlocks link + FastNEAR command for each. `tools/judge-snippets.sh` runs every command with its expected output from a clean machine without keys | README, `tools/judge-snippets.sh` | SAT-094 | S-13, S-14 | manual | 2.0 |
| SAT-103 | S1 | 11 | Monitor | `tools/monitor.sh` (read-only, no keys): judge-snippets, no-JS HTML checks of `/s/1`, `/contract`, `/market`, near-connect manifest diff (R-34), contract liquid ≥ 5 NEAR, MPC `version()`, provider reachability. Daily Nov 14–19 | script | SAT-102 | S-14 | run | 1.5 |
| SAT-105 | S1 | 11 | Buffer | — | — | — | — | — | 2.0 |
| SAT-300 | S2 | 11 | Polish + a11y + Day theme | The Day switch-on (head script, ThemeControl, `theme-color` sync, a Day QA pass; kb/80 R3 T-02), motion (the handoff), responsive (390 px, left nav and grids), focus-ring offsets, `role=status`/`alert`, full-address `aria-label`, reduced motion, keyboard and VoiceOver pass (kb/80 §Accessibility checklist) | fixes | — | — | axe + manual | 3.5 |
| SAT-302 | S2 | 11 | Hosted Playwright + screenshots | Smoke on final; screenshots/GIFs → `docs/screenshots/` (AI judges read repo images) | images | SAT-290 | S-14 | Playwright | 1.5 |
| SAT-303 | S2 | 11 | Demo rehearsal | Shot list against the staged states and the SAT-100 recordings; timing ≤ 2:15 | shot list | SAT-100 | — | — | 2.0 |
| SAT-292 | S2 | 11 | Dynamic card (cuttable) | `/api/card/[id].svg` adds the status pill and `sig_count` from contract state, `s-maxage=60` (R-22). The OG image is the brand's `og-image.png`, shipped in SAT-201 (D-36: the generation work, ≈ 1 h, is gone) | files | SAT-212 | — | visual | 2.0 |

### Release — README, video, X, submission (Days 12–13)

| ID | Lane | Day | Title | Description | Deliverables | Deps | AC | Est |
|---|---|---|---|---|---|---|---|---|
| SAT-110 | S1 | 12 | README final + SECURITY.md | README structure from kb/00 §README skeleton:<br>• 2-sentence what/problem;<br>• "Try it in 60 seconds (no wallet)";<br>• Verify on-chain (keyless proofs);<br>• Proof transactions (NearBlocks link + FastNEAR command each);<br>• Run locally (`pnpm i`, `pnpm test:contracts` with recorded output + CI link);<br>• How it works (diagram, paths, code links);<br>• NEAR technologies used vs track hints: NEP-171, NEP-177 card that shows the live status and `sig_count` (R-22), Chain Signatures / chain abstraction, NEP-297, NEP-330;<br>• Security model + clean-history disclosure (spec §7.7, incl. #4's nonce gap);<br>• Limitations (testnet, MPC trust, K = 1, v1 cuts);<br>• Prior art (kb/01 §Rec P0-2 draft); What's next; Team;<br>• Pre-hackathon work (H-24 text); License.<br>SECURITY.md (threat model, invariants, disclosure) is written in the same task | README.md, SECURITY.md | SAT-102 | S-14 | 4.0 |
| SAT-111 | S1 | 12 | CI green + badge | Main is green; badge in the README (public once the repo is public) | CI | — | S-14 | 0.5 |
| SAT-112 | S1 | 12 | Video support | Terminal segments (keyless proof, tests), demo data refresh | footage | SAT-303 | — | 2.0 |
| SAT-113 | S1 | 12 | Secrets scan + wallet re-check | gitleaks over the full history; check `.env.example`; no keys or payload in the repo (a force-push is needed only if something leaks, and needs human confirmation). Re-test Meteor and Intear on final and diff the near-connect manifest (R-34). NearBlocks freshness (D-10). WebFetch re-run (SAT-215) | report | — | S-14 | 1.25 |
| SAT-114 | S1 | 12 | Payload draft | Fill the kb/00 template **from the human's answers only** (H-02); `python3 research/spikes/hackathon/validate_payload.py payload.json` (outside the repo); print it for the human | `~/satchel-submission/payload.json` (not in git) | H-02 | — | 0.5 |
| SAT-310 | S2+H | 12 | **Video** | ≤ 2:15 (kb/80 §Demo video beats, adjusted): 0:00 hook `/s/1` · 0:12 mint + fund (speed-ramped) · 0:35 send ETH (timer visible) · 1:00 gift → bob sends BTC ("In mempool"; SAT-100 recording) · 1:30 list → clean history → buy right away (#3, EVM-only; SAT-100 recording) · 2:05 keyless contract proof + repo. Retakes with #6/#7. Optional longer YouTube cut | video file | SAT-303 | — | 4.0 |
| SAT-311 | S2 | 12 | X post draft | Text for the human (plan B7 wording, "built at NEAR HACKATHON", video attached, repo link, @NEARProtocol), ≤ 280 chars unless Premium | draft in team channel | SAT-310 | — | 0.5 |
| SAT-312 | S2 | 12 | README UI steps | "Open `<url>/s/1` → see …" steps checked on the hosted URL; screenshots embedded | README | SAT-302 | S-14 | 2.0 |
| SAT-301 | S2 | 12 | Performance | Lazy chain libs; initial JS ≤ 300 KB gzip on `/s/[id]` (kb/41 measured 210 KB without chainsig); Lighthouse | report | — | — | 1.5 |
| SAT-120 | S1+H | 13 | **Submission runbook** | §7 below (rules check → public → verify → X post → payload yes → POST → 201) | `~/satchel-submission/response.json` | all | **G12** | 2.0 |
| SAT-121 | S1 | 13 | Keep-alive plan | Freeze the demo data (no more demo actions); `monitor.sh` schedule through Nov 19 | checklist | SAT-103 | — | 1.0 |
| SAT-320 | S2 | 13 | Final checks | Hosted app, SSR facts (WebFetch), links; support the submission | — | — | — | 2.0 |

---

## 4. Day 1 bootstrap checklist (Sun Nov 1; starts 08:00 UTC = 10:00 EET)

| # | When (UTC) | Who | Step | Done when |
|---|---|---|---|---|
| 1 | 08:00 | H | Read `https://nearhackathon.com/HACKATHON.md` again; run `research/spikes/hackathon/check_rules.sh`; read any diff (kb/00 §Gotchas 15) | diff empty, or changes noted in kb/00 |
| 2 | 08:00 | H | **Grant the standing approvals (H-20, rev-2 text)** in writing:<br>(a) non-force pushes to the private repo;<br>(b) testnet txs signed with dev, rc, persona **and `<team>.testnet`** keys: creating and funding `devN`/`rc` (incl. the rc keyless birth), deploys to `devN`, mints, signs, test-fund sends, USDC storage registration, contract top-ups, the spike sweep; caps ≤ 25 NEAR, ≤ 0.25 Sepolia ETH, ≤ 0.01 tBTC, ≤ 1 devnet SOL, ≤ 50 test USDC per day, only between team-controlled accounts and addresses;<br>(c) Vercel deploys.<br>**Excluded:** creating or deploying `satchel.<team>.testnet`, force-push, making the repo public, X posts, the submission, mainnet, anything beyond the caps | message pinned |
| 3 | 08:15 | H | Create the **private** GitHub repo `<org>/<repo>` (H-04) (after 2026-11-01T00:00Z); add both engineers; no imports from `research/` | empty repo exists |
| 4 | 08:30 | S1 | Toolchains: `rustup toolchain install 1.93.0 --profile minimal --target wasm32-unknown-unknown --component rustfmt,clippy`; cargo-near 0.22.0 installer; near-cli-rs 0.30.1; Docker running. This Mac's default Rust is nightly-2023-12-11, so always rely on `rust-toolchain.toml` or `cargo +1.93.0` | `cargo near --version` = 0.22.0 |
| 5 | 08:30 | S2 | Node 22.22.2 (`nvm install 22.22.2`), corepack pnpm (pin `packageManager`) | `node -v` |
| 6 | 09:00 | S1 | Skeleton per spec §11:<br>• `.gitignore` (target, node_modules, .next, .vercel, `.env*` + `!.env.example`, `*.key`, `**/.near-credentials/**`, `payload.json`, `research/`);<br>• `.env.example` (all keys of spec §8.4, no values);<br>• LICENSE;<br>• README stub with the H-24 disclosure (updated by D-36): "Pre-hackathon work: Phase-0 work, Oct 20–31: research notes with reference snippets; the Satchel brand, logo and design system, created as design assets (SVG and PNG files, JSON design tokens, a reference HTML head snippet); and testnet faucet funding. All repository code was written from Nov 1, following the KB specs; no spike file was copied. The logo, icon and image files in the repository are those Phase-0 design assets. First commit 2026-11-01.";<br>• `rust-toolchain.toml`, workspace `Cargo.toml` (resolver 3) | first commit pushed (approval a) |
| 7 | 09:30 | S1 | `cargo generate-lockfile`; `cargo tree -i near-sdk-env` → **0.1.6** (else `cargo update near-sdk-env --precise 0.1.6`); commit `Cargo.lock` | lock committed |
| 8 | 09:30 | S2 | `create-next-app@16.4.2` (spec §11 flags); tsconfig ES2022; `rm -rf .next`; `pnpm add --save-exact` per spec §10; commit `pnpm-lock.yaml` | `next build` passes |
| 9 | 10:00 | S1 | MPC check: `near contract call-function as-read-only v1.signer-prod.testnet version json-args '{}' network-config testnet-fastnear now` → `"3.17.0"`; the `config` view shows the sign gas = 15. FastNEAR tx API: `curl -s -X POST https://tx.test.fastnear.com/v0/account -H 'content-type: application/json' -d '{"account_id":"<team>.testnet","desc":false,"limit":1}'` returns the recorded creation tx | noted (A-01, A-08) |
| 10 | 10:00 | H | **G0** sign-off in the team channel | — |
| 11 | 10:30 | S1 | near CLI connection `testnet-drpc` (kb/22 §One-time CLI setup) and, with the FastNEAR key, a keyed connection (`--rpc-api-key`) | `near config` shows both |
| 12 | 10:30 | S2 | Vercel project on the chosen host (H-05); env vars from `.env.example` (`CONTRACT_ROLE=dev`); Node 22; first deploy (check A-09: GitHub org private repo support) | preview URL renders |
| 13 | 11:00 | S1 | Create `dev1.<team>.testnet` (5 NEAR) with the `<team>.testnet` key (approval b) | account exists |
| 14 | ongoing | both | CI skeleton (full CI on Day 4); every PR gets green CI before merge | — |
| 15 | by 20:00 | S1 | G1 smoke (SAT-007); otherwise Day 2, 12:00 | tx in `docs/evidence/day1-smoke.json` |

---

## 5. Deployment and funding schedule

### 5.1 Accounts

| Account | Created | By | Keys | Funding | Purpose |
|---|---|---|---|---|---|
| `<team>.testnet` | **Oct 24, in the same sitting as choosing the name** (H-01, P0-H1) | H, or an agent with the human's OK (faucet command) | full-access (human's keychain) | 10 NEAR from the faucet + the spike sweep (D-34) | parent; pays the birth batches, dev/rc creation, USDC registrations |
| `alice.` / `bob.` / `carol.<team>.testnet` | Oct 24–25 (P0-H2) | H (or agent with OK) | keyed (wallets) | 8 / 4 / 8 NEAR | owner/seller · gift recipient · buyer; imported into Meteor **and** Intear (H-17) |
| `dev1.<team>.testnet` (→ `dev2` only if needed) | Day 1 | S1 (approval b) | keyed | 5 NEAR | dev contract, redeployed in place (R-41); lenient gate |
| `rc.<team>.testnet` (`rc2` only if needed) | Day 9, **keyless birth** | S1 (approval b) | **none** | 5 NEAR (birth Transfer) | rehearsal of the exact final batch; strict gate; permanent |
| `satchel.<team>.testnet` | **Day 10, keyless birth** | S1 after the human's explicit "yes" (H-15) | **none, ever** | **10 NEAR** (birth Transfer) | final |
| mainnet payout account | by Nov 10 | H only | — | — | the submission's `nearAddress` (never created by an agent) |

Rev 1's optional 1Click mainnet accounts are gone (D-19).

### 5.2 NEAR budget

The full line-by-line table is in D-34: **53 NEAR planned, 63 with the dev2/rc2 contingencies** (rev 1 said "≥ 120").
- **Sources:** `<team>.testnet` faucet creation (10), plus the spike-account sweep (balances 44.2 NEAR on 2026-10-21: ≈ 38 now, ≈ 5 after the P0-R re-runs).
- **At most one** extra faucet account, and only if a contingency triggers.
- The sweep signs with spike keys: human OK in Phase 0 (P0-A7), approval (b) after Nov 1.

### 5.3 Funding plan

Addresses come from `research/final-addresses.md`, produced in Phase 0 by agent task **P0-A1** right after `<team>.testnet` exists. Two paths, chosen by H-23 (D-33):
- **W** = wallet path: Phase 0, by the human.
- **F** = fallback: claims into dev1 #1, then agent fan-out on Day 5 (SAT-044).

| What | BTC testnet4 | Sepolia ETH | Devnet SOL | When (W / F) | Why |
|---|---|---|---|---|---|
| final #1 Flagship | 3 UTXOs: 100k + 50k + 50k | 0.05 | 0.5 (human airdrop) | Oct 24–31 / Day 5 | multi-input send; P2 Solana demo |
| final #2 Gift | 2 × 50k | 0.02 | — | same | bob's BTC send |
| final #3 Sale | 1 × 50k (held, never spent) | 0.02 | — | same | EVM-only history; the buyer gets coins |
| final #4 Blocked | — | 0.01 | — | same | nonce+1 record |
| final #5 For sale | 2 × 50k | 0.01 | — | same | one BTC send → `spent` row |
| final #6, #7 Retakes | #6: 1 × 50k; #7: 2 × 50k | 0.02 each | — | same | retakes of the sale (#6) and gift (#7) beats |
| rc #1, #2 | #1: 2 × 50k | 0.01 each | — | Oct 24–31 / Day 5 | SAT-082 e2e; SAT-085 BTC `spent` (#1) and the EVM scenario (#2) |
| dev1 #1 | **W:** 2 × 50k · **F:** 2 claims × 500k (the fan-out source) | **W:** 0.01 · **F:** 0.3 from MetaMask (the fan-out source) | 0.2 (human airdrop) | W: Oct 28–31 / F: Nov 1–2 | G2/G3 on Days 3–4 |
| dev1 #2, #3 | #2: 1 × 50k | 0.01 each | — | W: Oct 28–31 / F: Day 5 | transfer + sale tests |
| dev2 (contingency) | 1 × 50k | 0.01 | — | only if needed, by fan-out from dev1 | state-layout change (unlikely, R-41) |
| team reserves | **W:** the rest of 1M sats in the wallet | ≥ 0.1 left in MetaMask | — | Oct 31 | retakes, rc2, top-ups |
| `carol` USDC | — | — | — | 2 claims by Nov 7 (40 USDC) | S-8; faucet.circle.com, 20 USDC / 2 h / address |
| pay-spike USDC (P0-R4) | — | — | — | 1 claim by Oct 28 (20 USDC) | Circle refund test (R-10) |
| contract USDC registration | — | — | — | Day 9 (rc), Day 10 (final), 0.00125 NEAR each, from `<team>.testnet` | `ft_transfer_call` to an unregistered receiver panics (kb/51 §TL;DR 3) |

Totals:
- BTC ≈ 0.0085 tBTC: final 600k + rc 100k + dev1 150k sats.
- ETH ≈ 0.2 (W: final 0.15 + rc 0.02 + dev1 0.03), or one 0.3 send to dev1 #1 (F), from which the agent fans out ≈ 0.19 on Day 5.
- SOL 0.7.

**Human faucet work:**
- 2 BTC claims;
- 1 pk910 session (≥ 0.4 ETH into MetaMask), then MetaMask sends (W) or a single send to dev1 #1 (F);
- 2 SOL airdrops;
- 3 USDC claims.

**Safety of pre-funding.**
- Nobody can sign for `satchel.`, `rc.` or `dev1.<team>.testnet` paths until those accounts exist, and only `<team>.testnet` can create them.
- `<team>.testnet` is created in the same sitting as choosing the name, **before** any address is computed or funded (P0-H1 → P0-A1 → P0-H4). Its creation tx is recorded.
- README proof 4 shows that the final account's history starts at its birth tx.
- dev1 is keyed, so its key holder can sign anything for dev paths. They hold dev funds only.
- A changed name strands the testnet coins, which have no value.

### 5.4 Demo data staging (final contract; D-32)

All seven ids are minted to `alice` inside the birth tx.

| Token | Final owner | State at recording (G10) | Proves | Used in |
|---|---|---|---|---|
| #1 Flagship | alice | Active; history: 1 ETH send + 1 BTC send (Day 10); never listed | S-2, S-3, S-14 | judge view `/s/1`, video hook, README "Try it in 60 seconds" |
| #2 Gift | bob | alice → bob (Day 11, recorded); bob sends BTC afterwards | S-4 | video transfer beat |
| #3 Sale | carol | 1 ETH send (Day 10, settled in ≈ 36 s) → listed 5 USDC (Day 11) → carol buys at once (recorded); "Clean: 1 of 1 settled"; holds 50k sats + ETH | S-7/8/9 | video sale beat, proof table |
| #4 Blocked | alice | one EVM tx with nonce = current + 1, signed and never broadcast (Day 10) → listed (Day 11) → Buy disabled, "1 signature was issued but never used". **Never send from #4** | S-9 (negative) | README (explains why nobody can unblock it), screenshot |
| #5 For sale | alice | 1 BTC send (Day 10) → `spent` at K = 1 → listed 1 NEAR (judges with a testnet wallet may buy it). **DP9:** unconfirmed at Nov 12 06:00 → stays unlisted; #6 is listed instead | S-7, S-9 (BTC row) | README optional step ("if it's sold, see /market") |
| #6 | alice | retake token for the sale beat (EVM-only); judge listing if DP9 triggers | — | retakes |
| #7 | alice | retake token for the gift beat | — | retakes |
| #8+ | — | minted live in the video | S-1 | video mint beat |

**Freeze the demo data** after Nov 13 18:00 UTC: no more sends or listings by the team (SAT-121).

### 5.5 Keep-alive through Nov 19 (kb/00 §Rec P0-6)

- Daily from Nov 14 to Nov 19, run `tools/monitor.sh` (read-only, no keys; SAT-103):
  - every README command (`tools/judge-snippets.sh`) with its expected output, NEAR tx proofs through FastNEAR;
  - `/s/1`, `/contract`, `/market` no-JS HTML: the facts are present and not inside `hidden` elements;
  - `/api/satchels/1` OK;
  - contract liquid balance ≥ 5 NEAR. A top-up from `<team>.testnet` falls under approval (b);
  - MPC `version()`;
  - the near-connect wallet manifest diff (R-34);
  - mempool.space / emzy / Sepolia / devnet endpoints reachable.
- Results go to the human. Nothing in the repo changes after the 2026-11-14T23:59Z freeze. Env-var-only redeploys (e.g. switching an RPC) are allowed; code changes on `main` are not (kb/00 §Repository requirements).
- Don't rotate API keys. Stay inside the free tiers; the FastNEAR key is server-only.
- Devnet ledger resets and Sepolia outages are covered by `docs/evidence/*.json`.

---

## 6. Release checklist for the final keyless birth (Day 10, SAT-090; expands spec §5.16)

1. **Preconditions** (all must hold):
   - G7 green: rc born keyless from the same batch template; proofs 1–6 and `verify --use-contract-source-code-path` pass on rc; SAT-085 green with the strict gate.
   - The SAT-081 hash **H** was recorded twice.
   - MPC `version()` = 3.17.0 and gas = 15 (A-01).
   - The app host is final (D-23). H-26 was decided before the rc birth, so rc and final share the init args.
   - `satchel.<team>.testnet` still doesn't exist: `view_account` → unknown account; FastNEAR `/v0/account` → `txs_count: 0`.
2. **Tag** `contract-v1.0.0` on the rc1 commit and push it (approval a; R-29). If the contract changed after rc1, it must have passed an rc2 birth first (SAT-083).
3. **Build and print** the batch with `sign-later` (spec §5.16), then `near transaction print-transaction`. Review it:
   - signer `<team>.testnet`, receiver `satchel.<team>.testnet`;
   - 11 actions in order, **no AddKey**;
   - Transfer 10 NEAR;
   - code SHA-256 = H;
   - `new` args identical to rc's;
   - 7 × `nft_mint` to `alice.<team>.testnet` at 0.02 NEAR each;
   - 170 Tgas in total.
4. **The human's explicit "yes"** in the team channel, quoting the receiver and H (H-15). Without it, nothing is sent.
5. **Sign and send** with `tools/deploy/keyless-birth.ts` (near-cli-rs can't build an 11-action birth; spec §5.16). Record the tx hash and block **A**.
6. **Proofs 1–6** (spec §5.16) → `docs/evidence/birth.json`, using FastNEAR JSON and CLI outputs.
7. **USDC** `storage_deposit` for the contract from `<team>.testnet` (approval b) → `storage_balance_of` is non-null. Skip it if H-26 chose `usdc: None`.
8. **Switch the app** (SAT-091) and start staging part 1 (SAT-092).
9. **Failure handling:**
   - The batch is rejected → nothing exists (atomic). Fix it, re-print, get a new "yes", resend.
   - The batch succeeded with a wrong argument → permanent. Fall back to `satchel-v2.<team>.testnet` with new addresses and new funding from the reserves. v1 tokens stay operable if v1 can still sign (kb/22 §Deltas).
   - There is never a key on the account, so there is no trust window to disclose.

---

## 7. Submission runbook (Day 13; every external action needs the human's explicit "yes")

| Step | Time (UTC) | Who | Action | Evidence |
|---|---|---|---|---|
| 1 | 09:00 | S1 | `check_rules.sh`; read any diff; `GET /api/applications` count | diff noted |
| 2 | 09:30 | S1 | Final gitleaks (SAT-113); README links checked; repo tag `v1.0.0` (the contract tag `contract-v1.0.0` exists since SAT-090) | report |
| 3 | 10:00 | **H** | Make the repo **public** (explicit yes) | public URL |
| 4 | 10:30 | S1 | `near contract verify deployed-at satchel.<team>.testnet network-config testnet-fastnear now` → "…are the same"; optional NearBlocks "Verify and Publish"; README verification block updated | log in `docs/evidence/verify.txt` |
| 5 | 11:00 | S2 | Final hosted checks: Playwright smoke; WebFetch on `/s/1`, `/contract`, `/market`; `tools/judge-snippets.sh` | CI run |
| 6 | 13:00 | **H** | Publish the X post: "built at NEAR HACKATHON", video ≤ 2:15 attached (or screenshots), repo link; save the URL (kb/00 §X post) | post URL |
| 7 | 14:00 | S1 + **H** | Payload: `requestId` = `uuidgen \| tr A-Z a-z`, generated once and stored outside git; every field from H-02; `validate_payload.py`; print the full JSON; read the consent text **verbatim** ("I agree that the organizers may use these details to review our submission and contact us about this hackathon."); wait for the human's typed "yes" | printed payload |
| 8 | 14:15 | S1 (after yes) | `curl -sS -X POST https://nearhackathon.com/api/applications -H 'Content-Type: application/json' --data @payload.json -w '\nHTTP %{http_code}\n'` (no Origin header).<br>• **400** → fix `fields`, **print the corrected JSON in full and wait for a new "yes"** (R-28), then resend with the **same** requestId.<br>• **503** / network error → wait and resend the unchanged payload with the same requestId.<br>• **403/409** → stop and ask the human | response saved outside git |
| 9 | 14:30 | H | Confirm **201**; check the public counter; announce the freeze | — |
| 10 | — | all | No commits to `main` after submission except docs typos with human approval; demo data frozen; keep-alive (§5.5) | — |

**Hard fallbacks:**
- Submission fails on Nov 13 → retry on Nov 14 before 20:00 UTC (deadline 23:59).
- Video not ready → post screenshots plus the backup video (G5).
- Final contract broken → submit with the honest status, using rc (keyless, same code) or the dev deployment as the demo, and disclose it.

---

## 8. Cut lines and decision points

| DP | When | Question | Default if "no" |
|---|---|---|---|
| DP1 | Day 2, 12:00 | G1 smoke passed? | S2 pairs with S1 until it passes; Activity moves to Day 6 |
| DP2 | Day 5, 12:00 | G3 (2-input BTC) passed? Both lanes within 4 h of plan? | BTC demo uses single-UTXO sends (fan-out n = 1 is the same code path); cut the dynamic card now |
| DP3 | Day 6, EOD | MVP (G5) and backup video done? | Sale moves +1 day; cut the Solana UI now |
| ~~DP4~~ | — | ~~1Click clip~~ | cut on Oct 31 (D-19, H-16) |
| DP5 | **Day 9, 12:00** (before the rc birth) | Every contract feature green (USDC, SOL classifier, sale)? | Remove the failing feature *from the contract* before the rc birth: SOL → `ERR_CHAIN_UNSUPPORTED`. USDC → `usdc: None` (already decided by Nov 8 EOD, H-26). Never birth untested code. A later change needs an rc2 birth (SAT-083) |
| DP6 | Day 10, 12:00 (hard Day 11, 12:00) | rc rehearsal green? | Birth from the last green rc tag |
| DP7 | Day 10, EOD | SOL send end-to-end on final? | Hide the SOL row and send flow; README: "contract supports Solana; UI cut for time" |
| DP8 | Day 10, EOD | Feature freeze | Anything unfinished is cut, not finished on Day 11 |
| DP9 | Day 12, 06:00 | #5's BTC send confirmed? | Keep #5 unlisted; list #6 (EVM-only) for judges; the BTC `spent` row comes from the rc evidence (D-32) |

**Cut order** (D-20 rev 2, amended by D-36; the 1Click clip is cut; prices are cut unless UX-1's reopened default stands):
1. Solana UI
2. Dynamic card (the OG image is the brand's file)
3. USDC buy UI (the contract path stays, or `usdc: None` per H-26)
4. Market polish
5. R3 (kb/80 R3): A-09 overflow menu → A-04 home stack → the Day switch-on (the app stays Night) → prices (the card reads "{n} chains")

**Never cut:** mint · BTC + ETH send · transfer = control · list / freeze / quiet period / buy (NEAR) · clean history (EVM + BTC) · keyless final contract · blocking SSR judge pages + JSON · README with verified commands.

---

## 9. Risk register (measured data where available)

| # | Risk | L | I | Mitigation | Owner | Trigger |
|---|---|---|---|---|---|---|
| R1 | MPC outage or latency spike during recording | L (0/44 timeouts; p50 6.7 s, kb/10) | H | backup video G5; beats recorded during staging (SAT-100) with retake tokens #6/#7 | S1 | > 2 timeouts in a session |
| R2 | MPC interface/config drift before Nov 18 (gas floor, deposit, args) | L | H (immutable contract) | weight-1 leftover gas; `mpc_deposit` param; checks Nov 1, 10, 13 (A-01); ask the MPC team (H-14); disclose | S1 | `version()` ≠ 3.17.0 |
| R3 | testnet4 confirmations slow (median 2 h, max 21 h) | **H** | M → L | pre-fund in Phase 0 or by Day 5; #3's sale is EVM-only; #5's BTC row has the DP9 cut-off; the video ends BTC sends at "In mempool"; K = 1 | H/S1 | #5 unconfirmed at Nov 12 06:00 |
| R4 | Faucet friction (captchas, logins, AI bans; Circle 20 USDC / 2 h) | **H** | M | human sends cut to 2 BTC claims + 1 pk910 session + 2 SOL airdrops + 3 USDC claims (D-33); fan-out fallback; `usdc.fakes.testnet` for dev tests | H | < 50 % funded by Oct 29 (W) or Nov 2 (F) |
| R5 | RPC rate limits (FastNEAR shared-IP 429; dRPC 2 s cut) | M | M | FastNEAR key server-side; failover; 15 s caches; long-poll tracker (5 requests per 120 s) | S2 | 429s in logs |
| R6 | Wallet behaviour (partial outcomes, Intear 60 s reject, unknown Meteor timing, gas caps) | **H** | M | chain-state-driven UI; watcher; G2 with both wallets on Day 3; A-04 | S2 | G2 fails on a wallet |
| R7 | Contract bug found after the birth | M | H | invariant suite, 2.14 sandbox, tests on the reproducible artifact, keyless rc rehearsal with the identical batch; fallback `satchel-v2` (new addresses) | S1 | any INV failure after Day 10 |
| R8 | Birth day slips | M | H | contract freeze Day 9; hard deadline Day 11, 12:00; DP5/DP6; S1 buffer 3 h on Day 10 | S1 | G7 not green by Day 9 EOD |
| R9 | Next 16 / Cache Components pitfalls (uncached data outside Suspense fails the build; `<Activity>` cleans up effects) | M | M | `instant = false` + `"use cache"` (A-18); module-level stores; CI `next build` | S2 | build error |
| R10 | Clean history false "clean" (provider lag or lies; predicted-outpoint trick) | L | H | two providers must agree; "1 of 2 sources" only under H-25; depth policy; browser re-check before Buy; builder collision check (R-05); disclosure | S2 | provider disagreement in tests |
| R11 | Stranded signed-not-sent signature blocks a sale | M | M | on-chain signatures + Broadcast again + same-nonce/inputs retry; EVM nonce precheck | S2 | `signed_not_sent` in staging |
| R12 | Solana 36 s window too tight (slow wallet approval) | M | L | prefetch/refresh the blockhash; expiry state; SOL UI is the first cut | S2 | > 1 in 3 SOL sends expire |
| R13 | AI judges have no network / can't run toolchains | M | M | blocking SSR facts, `docs/evidence`, screenshots, offline unit tests, public CI; ask the organizers (H-10) | S1 | — |
| R14 | X video limit / posting account issues | M | M | ≤ 2:15 cut; Premium check (H-09); screenshots fallback | H | — |
| R15 | Rules change (HACKATHON.md changed 3× in Phase 0) | M | M | `check_rules.sh` on Nov 1, 7, 13 | H | non-empty diff |
| R16 | Secret leak in git history (keys, payload) | L | H | `.gitignore`, env-only keys, gitleaks before public; a force-push needs human confirmation | S1 | gitleaks hit |
| R17 | Agent-conduct violation (push/post/sign without approval) | L | H | standing approvals with explicit scope incl. `<team>.testnet`; runbooks mark human gates; the final birth needs its own "yes" | all | — |
| R18 | Vercel Hobby limits (org private repo deploys; Node version) | M | M | Day 1 check (A-09); fallback: personal repo or CLI `--prebuilt` | S2 | first deploy fails |
| R19 | Contract storage exhaustion (`LackBalanceForState`) | L | M | 10 NEAR birth funding, monitor ≥ 5 NEAR, anyone can top up | S1 | liquid < 5 NEAR |
| R20 | NearBlocks testnet stale | M | L | links only; FastNEAR proofs (D-10) | S1 | pages missing Nov txs |
| R21 | ~~Team composition~~ **closed 2026-10-29: Satchel is a solo project (D-47)** | M | M | ask the organizers (H-10); Satchel needs no design work after Nov 1 beyond decisions (H-11) | H | — |
| R22 | Intel Mac (no sandbox binary) | L | M | Linux CI / Apple Silicon (H-18) | H | — |
| R23 | Dev-account state-layout churn (re-funding) | L | L | every collection declared on Day 1 (R-41); explicit in-place redeploys; dev2 as contingency | S1 | layout change after Day 3 |
| R24 | Circle USDC behaves differently from the standard FT | L | M | P0-R4 refund test in Phase 0; SAT-073 failing buy + direct call; fallback `usdc: None` (H-26) | S1 | SAT-073 fails |
| R25 | The keyless batch is rejected by the protocol or the CLI (A-17). **Protocol acceptance and atomicity VERIFIED 2026-10-21** (`research/spikes/keyless-birth`); the CLI can't build it, so the tool is primary | VL | H | sandbox test Day 5 (SAT-036); rc birth Day 9; near-api-js tool (SAT-084); option (a) with disclosure | S1 | SAT-036 fails |
| R26 | AI fetch tools miss data that isn't in the visible HTML (A-18) | M | M | blocking routes, prerendered ids; WebFetch acceptance Days 2–3 and 12 (SAT-215); fallback snapshot outside Suspense | S2 | WebFetch shows a skeleton |
| R27 | The near-connect manifest changes during judging (R-34) | L | M | Day-12 re-test; `monitor.sh` diff; README names the tested wallets and date; NEAR CLI wallet path | S2 | manifest diff |
| R28 | NEAR tx proofs expire on non-archival RPC (R-08) | **H** (certain without the fix) | M | FastNEAR `/v0/transactions` canonical; `docs/evidence` JSON; daily monitor | S1 | a README command fails |
| R29 | A testnet4 difficulty-1 reorg revives an old spend (R-17) | L | L | disclosed; testnet only; mainnet K = 6 | S1 | — |
| R30 | S2 overload (110 h with 1 h buffer; design R3 adds +8.5 h, +6.0 of it in P1) | M | M | S1 Day-6 (4 h) and Day-10/11 (5 h) buffers pair with S2; DP7 (SOL UI, 5.5 h), DP2 (dynamic card); the R3 cuts (A-09 → A-04 → Day → prices) | S2 | S2 > 4 h behind on Day 8 |
