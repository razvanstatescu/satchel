# Satchel — Phase 0 checklist (Oct 21 → Oct 31, 2026)

> **Status (2026-11-04): historical, Phase 0 (Oct 21–31).** Kept as the record of the P0-xx items. Two rules below no longer apply: "No product code before 2026-11-01" (superseded on 2026-10-21 by D-39; the hackathon counts code from 2026-10-19, D-47) and the per-step approval for testnet transactions (superseded by D-48 on 2026-10-29). Some outputs it names were never written as files (for example `plan/readme-verify-draft.md`; the README's "Verify on-chain" section covers it). Open human steps now live in `plan/launch-checklist.md` and `plan/human-actions-ready.md`.

> Owner: lead architect · Written 2026-10-21 · **Revision 2** (post-review; changelog in `plan/decisions.md`); §6 **Revision 3** (brand consolidated, D-36) · **No product code before 2026-11-01.** Everything below is accounts, keys, funding, decisions, research re-runs or written plans. Spike code may be *run* for research; it must never be copied into the product (`research/README.md`).
> References: `kb/90-technical-spec.md` (spec), `plan/decisions.md` (D-xx, H-xx), `plan/implementation-plan.md`. Citation legend as in the spec (`kb/30 §TL;DR 8` = `kb/30-bitcoin-testnet4.md`, TL;DR item 8).
> Today is Wed Oct 21. Bucharest switches to EET (UTC+2) on Sun Oct 25.
> **Agent conduct in Phase 0.** No standing approval exists before Nov 1, so every agent action that signs a testnet tx needs the human's explicit OK for that step:
> - the faucet command for `<team>.testnet`;
> - creating the personas;
> - the spike sweep;
> - the spike re-runs.
>
> Read-only work (address derivation, views, curl checks) needs no approval. Keys stay in `~/.near-credentials`, never in the project (research/accounts.md).


> **Update 2026-10-21 (D-38):** `<team>` = **`satchelhq`**. Addresses are computed in `research/final-addresses.md`. Every remaining human step, with ready commands and message drafts, is in **`plan/human-actions-ready.md`**. Start with creating `satchelhq.testnet`.

---

## 1. Go / no-go status (Phase 0 gates, measured on 2026-10-21)

| # | Gate | Criterion | Evidence (measured) | Status |
|---|---|---|---|---|
| G-1 | Contract-initiated MPC signing | ≤ 1 timeout in 10 contract signs (plan B2 rule) | **10/10 OK, 0 timeouts**; 44/44 valid contract requests signed overall; latency p50 6.7 s, p90 7.4 s, max 12.8 s; ≈ 12.4 Tgas ≈ 0.0012 NEAR burnt per sign (spike/mpc §0, §6.1; kb/10 §TL;DR 1, 6) | **PASS** |
| G-2 | Key derivation | offline derivation equals the MPC view | 80/80 (spike/mpc §4); 8/8 three-way chainsig / view / noble (spike/chains §1); BTC three-way match (spike/btc §4) | **PASS** |
| G-3 | EVM (Sepolia) | an MPC signature yields a valid signed tx | 4/4 recover to the derived address; the node answered "insufficient funds" (signature valid, funding missing) (spike/chains §3; kb/31 §TL;DR) | **PASS** (funded broadcast pending, P0-R2) |
| G-4 | BTC (testnet4) | multi-input signatures valid; preimage hashing on-chain | 2- and 4-input fan-out in one contract call, ≈ 9.2 s for any N; on-chain `sha256d(preimage)` == bitcoinjs; strict low-S validation; `testmempoolaccept` rejected only for missing inputs (spike/btc §7–8) | **PASS** (real spend pending, P0-R1) |
| G-5 | SOL (devnet) | an Ed25519 signature passes sigverify | passed devnet sigverify, failed only on funding; blockhash life ≈ 36 s measured (spike/chains §6; kb/32 §TL;DR) | **PASS** (funded transfer pending, P0-R3) |
| G-6 | Structured payloads feasible | parsers small and cheap; Rust = JS | 75 JS checks; 19/19 cross-language vectors in two Rust variants; +7.9 KB wasm for the spike parsers; < 0.2 Tgas (spike/sec; kb/70 F8–F10). The v1 multi-preimage BTC parser is measured on Day 4 (SAT-031) | **PASS** |
| G-7 | Contract toolchain | build, deploy, lock, reproducible build, verify | near-sdk 5.29.1 + Rust 1.93 + cargo-near 0.22.0 (needs `near-sdk-env 0.1.6`); lock rehearsed; reproducible wasm bit-identical twice; `near contract verify` succeeded **in a standalone repo** (spike/sdk §2, §5, §6). The workspace build is unproven (R-11) → Day 4, SAT-035 | **PASS** (workspace re-check Day 4) |
| G-8 | Sandbox testability | yield/resume + forced timeout | 10 sandbox tests; `fast_forward(250)` in 2.4 s proves the timeout path (spike/sdk §4; kb/21 §TL;DR) | **PASS** |
| G-9 | Frontend stack | Next 16 + chain libs without polyfills; judge facts visible without JS | headless Chrome run OK; `curl` received the streamed data under Cache Components (spike/web §3). AI fetch tools may drop hidden streamed segments (R-07), so judge routes render blocking (D-31, A-18) → WebFetch check Day 3 (SAT-215) | **PARTIAL** |
| G-10 | Long-tx tracking | survives 2-minute yields, reloads and RPC 408s | tracker made 5 requests per 120 s and resumed after a simulated reload (spike/web §1; kb/40 §F) | **PASS** |
| G-11 | Testnet wallets | ≥ 2 human-usable wallets for `sign_for` | near-connect lists Meteor, Intear, Ledger, Nightly, EVM wallets and NEAR CLI; NEAR CLI was driven in Chrome; Meteor and Intear are **not yet human-tested** (spike/web §2, §4) | **PARTIAL** → P0-H3, P0-R5 |
| G-12 | USDC buy path | `ft_transfer_call` semantics known, incl. the refund path | tests A–D on `usdc.fakes.testnet`; Circle testnet USDC not exercised (no faucet tokens yet) (spike/pay §5; kb/51 §Gotchas 9) | **PARTIAL** → P0-H6, P0-R4 (refund path) |
| G-13 | 1Click (optional clip) | quote and status reachable | keyless dry quotes and status OK (spike/pay §6) | **N/A**: cut (D-19; confirm H-16 by Oct 31) |
| G-14 | Hackathon mechanics | dates, API, rules, judge capabilities | API answers 403 before Nov 1; cross-site check observed; validator self-test passes; AI-judge limits verified (spike/hackathon §2, §5) | **PASS** (re-check Nov 1) |
| G-15 | Novelty | no direct competitor offers verifiable clean history | `nft_key`, Lit PKP, ERC-6551/Tokenbound and Ika reviewed; none provide it (kb/01 §TL;DR 2) | **PASS** (search-based) |
| G-16 | Demo funding | final, rc and dev1 addresses funded (wallet path), or dev1 #1 funded (fallback) | nothing funded yet; `<team>.testnet` not yet created | **OPEN** → P0-H1 → P0-A1 → P0-H4 |
| G-17 | Keyless birth feasible | the 11-action batch can be built, sent and proven | **11-action keyless birth sent on testnet** (tx `2AMrb8J8…`, 78.2 Tgas, 0 keys, code hash = wasm); **a failing batch leaves no account** (tx `DdXHj1EQ…`); FastNEAR `is_any_signer` → 0 txs, history = birth only. near-cli-rs 0.30.1 **can't** build it (only `skip` after DeployContract) → near-api-js tool is primary (`research/spikes/keyless-birth/RESULTS.md`) | **PASS** |

**Verdict: GO.**
- BTC stays in Phase 1 (plan B2's go/no-go rule does not trigger).
- The open items are human actions (G-11, G-12, G-16) and three Day-3 to Day-5 re-checks (G-9, G-7 workspace, G-17).

---

## 2. Human actions (owners and deadlines)

IDs `P0-Hn` are Phase-0 tasks. They implement these decisions.md items:

| P0 task | decisions.md items |
|---|---|
| P0-H1 | H-01, H-22, H-23 |
| P0-H1b | H-03, H-04, H-05 |
| P0-H2 | H-01 |
| P0-H3 | H-17 |
| P0-H4 | H-07 |
| P0-H5 | H-06 |
| P0-H6 | H-08 |
| P0-H7 | H-10 |
| P0-H8 | H-09 |
| P0-H9 | H-16 |
| P0-H10, P0-H11 | H-02 |
| P0-H12 | H-11, H-19 |
| P0-H13 | H-18 |
| P0-H14 | H-14 |
| P0-H15 | H-13 |
| P0-H16 | H-20 |
| P0-H17 | H-15 |
| P0-H18 | H-24 |

"Team lead" means whoever leads the Satchel submission (H-02). Razvan is the design lead.

| # | Owner | Action | Deadline | Why | Done-when |
|---|---|---|---|---|---|
| P0-H1 | Team lead | **Choose the names and create `<team>.testnet` in the same sitting** (R-02).<br>1. Pick `<team>`. Names: `<team>.testnet`; final `satchel.<team>.testnet`; `dev1.`, `rc.`; personas `alice.`, `bob.`, `carol.<team>.testnet`.<br>2. Check that it is free: `near account view-account-summary <team>.testnet network-config testnet-fastnear now` must say the account doesn't exist. `list-keys` can't tell (kb/00 §Gotchas 10).<br>3. Create it at once: `near account create-account sponsor-by-faucet-service <team>.testnet autogenerate-new-keypair save-to-legacy-keychain network-config testnet create` (10 NEAR, as the spike accounts were made, research/accounts.md; grammar checked with `--help` on near-cli-rs 0.30.1, 2026-10-21). **An agent may run this command once the human approves it in the channel.**<br>4. Record the creation tx: `curl -s -X POST https://tx.test.fastnear.com/v0/account -H 'content-type: application/json' -d '{"account_id":"<team>.testnet","desc":false,"limit":1}'`. Check that `satchel.`, `rc.` and `dev1.<team>.testnet` return `"txs_count":0`.<br>5. In the same sitting, answer **H-22** (who is H, time zones) and **H-23** (testnet4-capable wallet: yes/no) | **Sat Oct 24** | every address derives from the final id. Nobody else may own `<team>.testnet` while its sub-accounts' addresses hold funds (D-02) | creation tx + absence checks written at the top of `research/final-addresses.md` |
| P0-H1b | Team lead | Also decide: GitHub org/repo name (H-04), Vercel project name / app host (H-05; frozen in `base_uri` at the rc birth on Day 9), licence (MIT recommended, H-03) | **Oct 28** | `package.repository` and `base_uri` become immutable (D-23) | posted |
| P0-H2 | Any human (or an agent with OK) | **Personas**, after the sweep P0-A7 has funded `<team>.testnet`: `near account create-account fund-myself alice.<team>.testnet '8 NEAR' autogenerate-new-keypair save-to-legacy-keychain sign-as <team>.testnet network-config testnet-fastnear sign-with-legacy-keychain send`; the same for `bob.` (4 NEAR) and `carol.` (8 NEAR) (syntax from kb/22 §Verified facts). **Do not create `satchel.`, `rc.` or `dev1.<team>.testnet`**: dev1 is created on Day 1, rc and the final are born keyless on Days 9–10 (D-02) | Oct 25 | personas sign, list and buy (D-34) | `near account view-account-summary alice.<team>.testnet network-config testnet-fastnear now` |
| P0-H3 | Each engineer + team lead | **Testnet wallets:** install Meteor (web `https://wallet.meteorwallet.app` or the extension) **and** Intear (`https://wallet.intear.tech`); import `alice`, `bob`, `carol`. HOT and MyNearWallet don't support testnet in near-connect (kb/40 §TL;DR 2) | Oct 31 (install); Nov 3 (G2 test) | G-11; users and judges need them | both wallets show the personas |
| P0-H4 | Any human | **Fund the pre-computed addresses** (`research/final-addresses.md`, from P0-A1). The path follows H-23 (D-33); amounts and faucet steps are in §4.<br>• **W** (wallet): 2 BTC claims into the team wallet → one multi-output tx; ETH through MetaMask.<br>• **F** (fallback): 2 BTC claims straight to dev1 #1; 0.3 ETH to dev1 #1; the agent fans out on Day 5 | start **Oct 24** (right after P0-A1). W done by Oct 31; F claims by Nov 2 | testnet4 real-block confirmations take a median 2 h (max 21 h) (kb/30 §TL;DR 7); every faucet needs a human (captcha, login, AI ban) | §4 rows show balances on mempool.space / Etherscan / Solana Explorer |
| P0-H5 | Any human | **FastNEAR API key**: create an account at `https://dashboard.fastnear.com`, issue a server key and store it only in a password manager. It goes into Vercel env `FASTNEAR_API_KEY` on Nov 1 (kb/41 §Open questions 1) | **Oct 28** | shared-IP rate limits were hit within minutes (kb/41 §TL;DR) | key exists |
| P0-H6 | Any human | **Circle testnet USDC** (`https://faucet.circle.com` → "Near Testnet", 20 USDC per 2 h per address, reCAPTCHA):<br>(1) **1 claim to `satchel-spk-pay-e9ea1a.testnet` by Oct 28** for P0-R4;<br>(2) **2 claims to `carol.<team>.testnet` by Nov 7** (40 USDC).<br>Each account first needs USDC storage: `near contract call-function as-transaction 3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af storage_deposit json-args '{"account_id":"carol.<team>.testnet","registration_only":true}' prepaid-gas '30 Tgas' attached-deposit '0.00125 NEAR' sign-as carol.<team>.testnet network-config testnet-fastnear sign-with-legacy-keychain send` [ASSUMED: the faucet may register for you] | Oct 28 / Nov 7 | S-8 demo; the R-10 refund test; the faucet is rate-limited (kb/51 §TL;DR 1) | `ft_balance_of` |
| P0-H7 | Team lead | **Ask the organizers** on the NEAR Discord (`https://discord.gg/nearprotocol`) and record the answers in kb/00 §Open questions:<br>(a) [removed: not applicable]<br>(b) is testnet fine for all judging?<br>(c) can one project win a track and the grand prize, or place in two tracks?<br>(d) will eligibility/KYC/tax terms and the NEAR conversion rate/date be published?<br>(e) are commits after the deadline ignored, or must the repo be frozen?<br>(f) **most important:** do the AI judges have network access and run code? (This weighs live pages against committed evidence; R-07, R-08) | ask by Oct 23; record by Oct 31 | team structure, README/evidence strategy (kb/00 §Open questions 4) | answers recorded |
| P0-H8 | Team lead | **X Premium check** for the account that will post the demo. Without Premium the video must be ≤ 2:20 (plan cut ≤ 2:15) (kb/00 §X post; D-17) | Oct 31 | storyboard length | answer recorded |
| P0-H9 | Team lead | **Confirm the 1Click cut** (H-16, D-19). No partner key is needed. To reverse it, have a mainnet account, ≈ 6 NEAR, ≈ 3 USDC + $1 ETH on Arbitrum and a partner key ready by this date | Oct 31 | frees 5.5 S1 h + 2 H h on the birth days | "cut" posted |
| P0-H10 | Team lead | **Mainnet payout account** (`nearAddress` of the submission): create it yourself in a NEAR wallet (e.g. `<name>.near` or a 64-hex implicit account); lowercase. An agent may never create or invent it (HACKATHON.md) | by Nov 10 (earlier is better) | prize payout | regex check passes (`validate_payload.py`) |
| P0-H11 | Team lead | **Submission fields** for later (do not send now): projectName (unique), leadName, email (unique, monitored until payout), size (`"2 - 4"` recommended), tracks (`["nfts","open"]` recommended), idea text (approve the kb/00 draft or edit it) | Nov 12 | one-shot submission (kb/00 §Submission mechanics) | written down outside the repo |
| P0-H12 | Razvan (design lead) | **Design decisions** (§6 below; post-R3 set UX-1…UX-34). H-19 is resolved by B-08 (D-36) | **Oct 31** | the root layout, fonts and tokens are written on Day 1 | §6 table filled |
| P0-H13 | Team lead | **Hardware check**: nobody on Satchel develops on an Intel Mac (no sandbox binary) (kb/21 §TL;DR 6) | Oct 31 | sandbox tests | confirmed |
| P0-H14 | Team lead | **Ask the NEAR MPC team** (Discord/Telegram) whether `sign` args (`payload_v2`, `domain_id`), the 15 Tgas requirement and the 1-yocto deposit stay stable through Nov 18 | ask by Oct 28 | the immutable contract can't adapt (D-24) | answer recorded in kb/10 §Open questions |
| P0-H15 | Team lead | **Scope confirmations** (defaults in decisions.md): D-07 (no `nft_transfer_call`/approvals), D-13 (no delegates), **D-15 (allowlist `{11155111}`, no ERC-20)**, D-20 (cut order), D-12 (no demo signer) | **Nov 1** (R-31) | the classifier is written on Day 2; the contract is immutable after the birth | "yes" in the channel |
| P0-H16 | Team lead | **Approve the standing-approval text below** (H-20, expanded in rev 2; R-01) and grant it on Nov 1 at 08:00 UTC | text by **Oct 31**; grant Nov 1, 08:00 UTC | HACKATHON.md forbids agents to push, sign or deploy without explicit confirmation (kb/00 §Gotchas 14) | text approved |
| P0-H17 | Team lead | **Confirm keyless birth** as the final-account method (H-15, D-02 option b2). Option (b1) (key + delete-keys) stays the fallback. The Day-10 "yes" to send the printed batch is separate | **Oct 31** | the birth runbook, tooling and README proofs depend on it | "yes" in the channel |
| P0-H18 | Team lead | **Approve the "Pre-hackathon work" disclosure** (H-24, updated by D-36): "Phase-0 work, Oct 20–31: research notes with reference snippets; the Satchel brand, logo and design system, created as design assets (SVG and PNG files, JSON design tokens, a reference HTML head snippet); and testnet faucet funding. All repository code was written from Nov 1, following the KB specs; no spike file was copied. The logo, icon and image files in the repository are those Phase-0 design assets." | **Oct 31** | the Day-1 README stub uses it (R-21) | "yes" or edited text |

**Standing-approval text for P0-H16** (paste into the team channel on Nov 1, 08:00 UTC):

> Standing approval for AI agents working on Satchel, valid 2026-11-01 to 2026-11-19:
> (a) Non-force pushes to the private repo `<org>/<repo>`.
> (b) Testnet transactions signed with the keys of `dev1`/`dev2`, `rc`/`rc2`, `alice`/`bob`/`carol` and `<team>.testnet`. This covers: creating and funding `devN` and `rc` accounts (including the rc keyless birth); deploying to `devN`; mints; `sign_for` calls; sends of test funds; USDC storage registrations; contract top-ups; and the spike-account sweep. Per-day caps: 25 NEAR, 0.25 Sepolia ETH, 0.01 tBTC, 1 devnet SOL, 50 test USDC. Only between team-controlled accounts and addresses.
> (c) Vercel preview and production deploys of the frontend.
> **Not covered** (each needs its own explicit "yes"): creating or deploying `satchel.<team>.testnet`; force-push; making the repo public; any X post; the hackathon submission; anything on mainnet; anything beyond the caps.

Decisions due after Nov 1 (listed so nothing is lost): H-12 and H-25 (Nov 6), H-08 carol USDC (Nov 7), H-26 (Nov 8 EOD), H-02 (Nov 12; payout account Nov 10), H-15 "yes" (Nov 10), H-21 (Nov 13).

---

## 3. Agent-doable tasks before Nov 1 (no product code)

| # | Task | Deadline | Why | Output |
|---|---|---|---|---|
| P0-A1 | **Compute addresses** once P0-H1 is done (read-only):<br>• predecessor `satchel.<team>.testnet`, tokens **1–7**;<br>• `rc.<team>.testnet`, tokens 1–2;<br>• `dev1.<team>.testnet`, tokens 1–3;<br>• `dev2.<team>.testnet`, token 1 (contingency).<br>Paths are `satchel/N/{btc,evm,sol}`. Use the existing **research** scripts (`research/spikes/mpc/js/derive.mjs` / `research/spikes/chains/derive.ts`). Cross-check at least three paths against the live view: `near contract call-function as-read-only v1.signer-prod.testnet derived_public_key json-args '{"path":"satchel/1/btc","predecessor":"satchel.<team>.testnet","domain_id":0}' network-config testnet-fastnear now`. Never derive with `latest_key_version` (kb/10 §TL;DR 12) | same day as P0-H1 (Oct 24) | lets P0-H4 fund before the accounts exist (D-02) | `research/final-addresses.md`: `<team>.testnet` creation tx + absence checks, then a table of token, chain, path, address, explorer link |
| P0-A2 | **Rules check**: `research/spikes/hackathon/check_rules.sh` on Oct 28 and Oct 31; summarise any diff | Oct 28, Oct 31 | rules changed 3× in Sep–Oct (kb/00 §Rule history) | note in kb/00 |
| P0-A3 | **Oct 31 re-check sweep** (read-only):<br>• MPC `version`/`config`/`state` (A-01);<br>• the near-connect manifest and testnet wallet list, plus whether 0.11.4 accepts a manifest override (A-19, by reading the published package);<br>• npm/crates versions in spec §10 (and whether the Oct 19 RCs went stable: still don't adopt them);<br>• NearBlocks testnet freshness (A-14); FastNEAR tx API keyless (A-08);<br>• `mempool.emzy.de/testnet4` availability **and a search for a third testnet4 Esplora** (A-07);<br>• a second keyless Solana devnet RPC (A-06);<br>• Vercel Hobby limits for org private repos and the default Node version (A-09);<br>• the Next 16.4.2 docs for `export const instant = false` (A-18) | Oct 31 | removes `[ASSUMED]` items before Day 1 | update the spec §14 status column |
| P0-A4 | **Spike re-runs** once the human funds the spike addresses (§5). Signing testnet txs with spike keys needs the human's OK | as funding lands | closes G-3, G-4, G-5 and G-12 with real broadcasts | results appended to each spike's RESULTS.md and the KB doc |
| P0-A5 | **Keyless-proof prep** (read-only; R-03/R-04). Draft the README "Verify on-chain" block for spec §5.16 proofs 1–6 as a plan doc (no code). Check each query shape on a spike account: `{"desc":false}` lists the creation tx first and `is_any_signer` lists exactly the signer txs, both checked 2026-10-21 on `lock1.satchel-spk-sdk-e9ea1a.testnet` (A-20). Note in the draft that `list-keys` alone can't prove anything (kb/00 §Gotchas 10) | Oct 31 | Days 10–11 README speed; S-13 | `plan/readme-verify-draft.md` |
| P0-A6 | **Planning docs only** (allowed): README outline, video shot list (≤ 2:15, without the cooldown speed-ramp, D-05), X post draft, submission payload template with placeholders (kb/00 already has them). No code | Oct 31 | Day 12–13 speed | docs in `plan/` |
| P0-A7 | **Sweep the spike leftovers** to `<team>.testnet` (needs the human's OK; D-34). Balances on 2026-10-21: mpc 3.40, chain 10.00, btc 6.97, sdk 4.48, web 9.97, pay 9.38 NEAR. Send all but ≈ 0.05 NEAR from mpc, sdk and web, and all but ≈ 2 NEAR from chain, btc and pay (they still run P0-R1…R4): `near tokens <spike>.testnet send-near <team>.testnet '<amount> NEAR' network-config testnet-fastnear sign-with-legacy-keychain send` (grammar checked with `--help`, 2026-10-21). Sweep the remainder after the re-runs (≈ +5 NEAR). Never copy spike keys into the project (research/accounts.md) | Oct 24 (first sweep), Oct 31 (second) | funds the personas and Days 1–10 without extra faucet accounts | `<team>.testnet` ≈ 48 NEAR, then ≈ 53 |

---

## 4. Funding: amounts, addresses, exact faucet steps

Addresses are filled in from P0-A1. Amounts follow D-33 and implementation-plan §5.3. **W** = wallet path (H-23 = yes); **F** = fallback.

| Address | BTC testnet4 | Sepolia ETH | Devnet SOL | Notes |
|---|---|---|---|---|
| final `satchel/1/*` (#1 Flagship) | 3 UTXOs: 100k + 50k + 50k | 0.05 | 0.5 (human airdrop) | judge view `/s/1` |
| final `satchel/2/*` (#2 Gift) | 2 × 50k | 0.02 | — | bob's BTC send |
| final `satchel/3/*` (#3 Sale) | 1 × 50k (held) | 0.02 | — | EVM-only history (D-32) |
| final `satchel/4/*` (#4 Blocked) | — | 0.01 | — | nonce+1 record |
| final `satchel/5/*` (#5 For sale) | 2 × 50k | 0.01 | — | BTC `spent` row |
| final `satchel/6/*`, `satchel/7/*` (retakes) | #6: 1 × 50k; #7: 2 × 50k | 0.02 each | — | R-14, R-30 |
| rc `satchel/1/*`, `satchel/2/*` | #1: 2 × 50k | 0.01 each | — | SAT-082, SAT-085 |
| dev1 `satchel/1/*` | **W:** 2 × 50k · **F:** 2 × 500k (fan-out source) | **W:** 0.01 · **F:** 0.3 (fan-out source) | 0.2 (human airdrop) | G2/G3 on Days 3–4 |
| dev1 `satchel/2/*`, `satchel/3/*` | #2: 1 × 50k | 0.01 each | — | transfer + sale tests |
| dev2 `satchel/1/*` (contingency) | 1 × 50k | 0.01 | — | only if needed; fan-out from dev1 |

Totals:
- BTC ≈ 850k sats (0.0085 tBTC) within 1M sats of claims.
- ETH ≈ 0.2 (W: final 0.15 + rc 0.02 + dev1 0.03), or one 0.3 send to dev1 #1 (F).
- SOL 0.7.

The rest stays in reserve (W: the team wallet and MetaMask; F: dev1 #1).

**Bitcoin testnet4** (kb/30 §Open questions):
- **W:**
  1. Install a testnet4-capable wallet (e.g. Sparrow; testnet4 support [ASSUMED], A-16) and switch it to testnet4.
  2. Make 2 requests of 500,000 sats each at `https://mempool.space/testnet4/faucet` (log in with GitHub, verify the email).
  3. When they arrive, send **one** tx with one output per BTC row above (≈ 15 outputs, including the 3 outputs to final #1's address), fee ≥ 2 sat/vB.
- **F:** make the same 2 requests straight to dev1 `satchel/1/btc` (Oct 24–Nov 2). On Day 5 the agent fans out with `tools/e2e/btc.ts --fanout` (SAT-044, approval b, within the 0.01 tBTC/day cap).
- Other faucets if mempool.space refuses:
  - the hCaptcha at `https://coinfaucet.eu/en/btc-testnet4/` or `https://faucet.testnet4.dev/`;
  - a Crypto Chief account (`https://crypto-chief.com/faucet/`, 1 claim/day);
  - the keyless API `curl -X POST https://cypherfaucet.com/api/v1/claim -H 'Content-Type: application/json' -d '{"network":"btc-testnet","address":"<tb1q…>"}'` (0.01 tBTC; it was failing on Oct 21).
- Never use `testnet4.mempool.space`, which is **mainnet**. Check receipt at `https://mempool.space/testnet4/address/<addr>`.

**Sepolia ETH** (kb/31 §Faucets):
1. One session at `https://sepolia-faucet.pk910.de/` into the team MetaMask: paste the address, solve the captcha, mine ≈ 20 min until ≥ 0.4 ETH, claim (up to 2.5 ETH per session).
2. **W:** one MetaMask send per address in the table. **F:** one send of 0.3 ETH to dev1 `satchel/1/evm`; the agent fans out on Day 5 with `tools/e2e/evm.ts --fanout`.
3. Alternative faucet: `https://cloud.google.com/application/web3/faucet/ethereum/sepolia` (Google login).

These amounts cover the whole event at today's fees (base fee 16 wei).

**Solana devnet** (kb/32 §Open questions):
- `https://faucet.solana.com`: sign in with GitHub (raises the limit above "2 requests every 8 hours"), choose devnet and airdrop 0.5 to final `satchel/1/sol` and 0.2 to dev1 `satchel/1/sol`. The page says "AI agents should not use this faucet", so a **human** does this.
- Or `solana airdrop 1 <addr> --url devnet` from a home network (1/day/IP).
- Remember the rent minimum: 650,240 lamports.

**NEAR testnet:** P0-H1 (10 NEAR from the faucet) + P0-A7 (sweep) + P0-H2 (personas). Budget in D-34. Create at most one more faucet account, and only if a contingency (dev2, rc2) triggers.

**USDC (Circle testnet):** P0-H6.

---

## 5. Pending spike re-runs (research only; each needs a human to fund the spike address and approve the testnet signing)

| # | Spike | Fund (human) | Then run (agent, approved) | Closes |
|---|---|---|---|---|
| P0-R1 | btc real spend | ≥ 0.005 tBTC to `tb1qd6c87hqfmfltxhra55k3w8ngcdr2dsk89ptr9a` (the spike fan-out contract's token-1 key) | `cd research/spikes/btc/js && node 13-real-spend.mjs tx1` (1-input split via the contract, plus `/txs/test` probes: high-S, 200-sat dust, 0.05 sat/vB), then `node 13-real-spend.mjs tx2` (2-input chained spend) | G-4 real broadcast; relay-fee floor (kb/30 §Open questions) |
| P0-R2 | chains EVM | ≥ 0.001 Sepolia ETH to `0x532b9aAEA7803aDCaC5FB8Fe53166147CEE4832d` | `cd research/spikes/chains && npx tsx evm_sign.ts` (prints an Etherscan link). One of the four leaked nonce-0 txs may land instead. That is harmless, and is itself a clean-history demonstration (kb/31 §Open questions) | G-3 real broadcast |
| P0-R3 | chains SOL | ≥ 0.01 devnet SOL to `6P6GgkFNQKcvCtsMncRF1VtFA6Q79LkcFyvaQz5NXPiA` | `npx tsx sol_sign.ts` (sends 1,000,000 lamports to `8C3C…JN1r`; expect an `explorer.solana.com/tx/…?cluster=devnet` link) | G-5 real transfer; EdDSA latency sample |
| P0-R4 | pay: Circle USDC **incl. the refund path** (R-10) | 20 Circle testnet USDC to `satchel-spk-pay-e9ea1a.testnet` (P0-H6, by Oct 28) | With `research/spikes/pay/call.mjs`, re-run tests A–D and X (spike/pay §5) against Circle's contract `3e2210e1…b8af` instead of `usdc.fakes.testnet`:<br>• **C:** `ft_transfer_call` to a registered account with no code must end `CodeDoesNotExist` → "Refund 1000000" → tx value `"0"`, sender balance unchanged. This is the failed-receiver path that a panicking `ft_on_transfer` also takes.<br>• **D:** to `recv.satchel-spk-pay-e9ea1a.testnet` (returns `"250000"`) → partial refund, tx value `"750000"`.<br>• **X:** a direct `ft_on_transfer` call shows that any account can call it.<br>Record the gas of Circle's `ft_resolve_transfer`. The spike's WAT receiver is research code and is never copied | G-12, A-05; input for H-26 |
| P0-R5 | web wallets (human-driven) | — | in a browser with Meteor and Intear, sign one direct MPC `sign` or a spike-contract `sign_for`, and note when the wallet promise resolves (kb/40 §Open questions 1). Also note whether a 260 Tgas / 0.05 NEAR call is accepted (A-04) | G-11, A-04 |

---

## 6. Design-lead decisions (Razvan; by **Oct 31**)

**Revision 3 (2026-10-21), brand consolidated.**
- **What changed:** Razvan's brand (`brand/`: the Strap S logo, brass and leather, Night and Day, Bricolage Grotesque / Instrument Sans / Spline Sans Mono, the saddle stitch) now decides the visual questions. `kb/81-design-tokens.md` R3 and `kb/80-ux-spec.md` R3 merge it with the R2 Mobbin findings (D-36). The brand closes UX-2, -4, -5, -8, -9, -10, -11, -15, -16, -19, -20, -26 and -29; **UX-1 is reopened** with a new default; UX-3 is moot; UX-31…UX-34 are new.
- **How defaults work:** every row has a recommended default, which applies if nobody objects by **Oct 31**. Closed rows can still be reopened by that date.
- **How to decide:** on the brand canvas (`brand/README.md` links it) against the kb/80 R3 wireframes.
- **Where the reasoning is:** kb/80 R3 §Brand vs R2 and §R2 design decisions: status in R3; kb/81 R3 (verified contrast, the per-token hue, brand issues BI-1…BI-16); `plan/decisions.md` D-36. The R2 version of this table is in `research/spikes/ux-refs/r2-snapshot/phase0-checklist.pre-R3.md`.

| # | Question (source) | Status | Recommended default (applies if no objection) | Deadline | Decision |
|---|---|---|---|---|---|
| UX-1 | **Fiat display** (kb/80 rev 1 OQ 1; **reopened in R3**, B-04) | **open (reopened)** | **The card total "≈ $X" with "at mainnet prices"** (`balance-hero` at its 36 px step), "{n} chains" when prices or a balance are missing, and no fiat anywhere else. Restores `/api/prices` (1Click `/v0/tokens` → CoinGecko; P1, +1.5 h S2, last in the R3 cut order). Amends T7 and D-20 if it stands (D-36). Alternative: native only (the card shows "{n} chains" + chips) | Oct 31 | ☑ **decided 10-21: native only.** No fiat anywhere; the card hero shows the R3 fallback ("{n} chains" + native chips). The prices route stays cut (−1.5 h S2, D-37) |
| UX-2 | Typeface (kb/80 OQ 2; kb/81 OQ 1) | **closed (brand)** | Bricolage Grotesque (display, `opsz`) + Instrument Sans (text) + Spline Sans Mono (addresses and hashes only); sentence case; derived `display` 56, `section` 44, `lead` 19, `caption` 12 (kb/81 R3) | Oct 31 | ☑ |
| UX-3 | Demo token look (#1 seeded to Patina; alloy captions) | **moot (R3)** | No alloys. The per-token look is the leather hue (UX-31) | — | ☑ |
| UX-4 | Hallmark motif (kb/80 OQ 4) | **closed (brand, B-07)** | No assay or hallmark motif: the ProofChip, `shield-check` + "Clean history" + time + link | Oct 31 | ☑ |
| UX-5 | Modal vs full page for Send / Transfer / Receive (kb/80 OQ 5; **H-19**) | **closed (B-08)** | Real routes (deep links, SSR) **presented** as a bottom sheet below 768 and a centred 480 px dialog from 768 over the Satchel page the route renders itself; no intercepting routes. Sell (`?list`) and Mint join. +1 h (FlowShell) | Oct 31 | ☑ |
| UX-6 | Verify disclosure shows the contract + path + a verify command (kb/80 OQ 6) | closed (R2) | Yes, inside the collapsed "Verify these addresses". Judge facts are never only inside it | Oct 31 | ☑ |
| UX-7 | Card SVG content (kb/80 OQ 7) | **closed (D-23 + R3)** | The brand card **without balances and without the stitch**: the band (name + status from contract state), "{n} signatures" where the total sits, chain marks; the Night body in the token's leather | Oct 31 | ☑ |
| UX-8 | Navigation (kb/80 OQ 8) | **closed (brand)** | Below 1024: a top bar (lockup 36 px, account control, menu → NavSheet). From 1024: left navigation (My Satchels · Market · Mint, + Activity only if built). No bottom nav; role-aware bars as in R2 | Oct 31 | ☑ |
| UX-9 | Dark only (kb/81 OQ 2) | **closed (brand): Night + Day** | Night by default; Day follows `prefers-color-scheme: light`; System · Night · Day override in the account menu and the footer. P1 ships Night; P2 switches Day on (R3 cut 3) | Oct 31 | ☑ |
| UX-10 | CTA style (kb/81 OQ 3) | **closed (brand)** | Brass (`brand` + `on-brand`), **once per screen**, `radius-md` 14, not a pill; Day adds a 1 px `brand-deep` border; secondary is an outline | Oct 31 | ☑ |
| UX-11 | Destructive button (kb/81 OQ 4) | **closed (R3)** | A danger outline (transparent, 1 px `danger`, `danger` text; ≥ 4.54:1 verified in both themes). No v1 action needs it | Oct 31 | ☑ |
| UX-12 | Copy changes from measurements (spec §8.9, §13) | closed (R2 + brand corrections) | Applied in the kb/80 R3 copy deck, together with the `brand/README.md` corrections table | Oct 31 | ☑ |
| UX-13 | Figma work (plan B2) | **partly done** | **Done (brand canvas):** the logo system, colour and type boards, the card (desktop Night, mobile Day), header, activity rows, buttons, pills, landing board. **Still to do:** card states (Signing, Listed, Needs attention, Sold) owned and not, in both themes; `/s/1` at 390 and 1440 with the left nav; the FlowShell (sheet and dialog) for Review → tracker → receipt; Before you list; Buy + GateLine; the handoff F1–F4 with the stitch | Oct 31 | ◐ optional, not blocking: remaining Figma frames (card states, both themes) if time allows |
| UX-14 | Copy for "no post-listing cooldown", the dev/rc strips and "1 of 2 sources" | closed (R2; sentence case in R3) | The kb/80 R3 copy deck ("Dev contract: …", "Release candidate: …", "1 of 2 sources") | Oct 31 | ☑ |
| UX-15 | Numbers on the card face (NM OQ 1; VL OQ 1) | **closed (brand, B-04)** | The in-app card shows the total (UX-1) and native chain chips; the SVG shows "{n} signatures" only | Oct 31 | ☑ |
| UX-16 | Page tint / alloy glow (VL-C5) | **moot (brand)** | No glow and no tint | — | ☑ |
| UX-17 | Home layout (WC OQ 1; NM OQ 5; VL OQ 7) | open | Below 768: a stack of the cards' **brass bands** (polish A-04, +0.75 h); without it, one column of cards. From 1024: a grid, 2 columns (3 from 1280) | Oct 31 | ☑ decided: one column of cards below 768; brass-band stack cut (polish) |
| UX-18 | Desktop action placement (NM OQ 3; TS OQ 9) | open | A **left sticky column** beside the left nav from 1024 (`minmax(320px, 400px)`): card → ActionRow, or "Buy for" → GateLine → Buy. Alternative: OpenSea's action panel in the right column | Oct 31 | ☑ decided: default (left sticky column) |
| UX-19 | Frost while listed (VL OQ 4; TS OQ 4) | **moot (brand)** | No frost: the Listed pill (brass word, `tag`) + the FreezeBanner (`frozen`, `snowflake`) | — | ☑ |
| UX-20 | Hallmark strike on the Buy card | **moot (B-06, B-07)** | No strike; the ProofChip and the GateLine carry the verdict | — | ☑ |
| UX-21 | Landing hero (NM OQ 6; VL-C17/C18) | open | The **live card #1** (brand card, no stitch for visitors) beside the `display` H1, the lead and the CTAs; no glow; no full-page stitch frame (the canvas frame conflicts with "the stitch means you own this", BI-5) | Oct 31 | ☑ decided: default (live card #1 as hero, no stitch for visitors) |
| UX-22 | Receive QR frame (WC OQ 3) | open | A `surface` panel **headed by the card's brass band** (name + network), white plate, leather-ink modules. Alternative: a plain panel with the token swatch | Oct 31 | ☑ decided: default (brass-band-headed QR panel) |
| UX-23 | Toast and progress placement (VL OQ 8; WC §2.8) | open | Progress: a pill under the top bar (below 1024), a card at the bottom-right (from 1024). Toasts: above the pinned bar (below 768), top-centre of the main column (desktop) | Oct 31 | ☑ decided: default |
| UX-24 | Warning-tier acknowledgement (WC OQ 4) | open | A Review checkbox **only for warning-tier recipients** (no checksum, contract, PDA). Never for every first-time address | Oct 31 | ☑ decided: default |
| UX-25 | Clock times on finished steps (TS OQ 8) | open | **Yes, inside flows** (tracker, receipt); relative times everywhere else | Oct 31 | ☑ decided: default |
| UX-26 | Card texture (VL OQ 5) | **moot (brand)** | A flat leather body under the brass band; no texture | — | ☑ |
| UX-27 | Does the pre-list "Past signatures" row block List? (R2-D16; D-32 demo #4) | open | **Advisory.** It shows ✕ and How to settle, and List stays enabled with "Buyers can't buy while it can still move coins." Only the quiet period and USDC registration block List | Oct 31 | ☑ decided: default (advisory) |
| UX-28 | Mobile action bars (NM OQ 4) | open | Owner: the round ActionRow under the card (Delist becomes the one brass circle while listed). Visitor on a listed Satchel: the pinned StickyBuyBar with the GateLine as its footnote. Flows: the pinned primary | Oct 31 | ☑ decided: default |
| UX-29 | Serif display for the landing H1 (VL OQ 2) | **closed (brand)** | No: Bricolage `display` | Oct 31 | ☑ |
| UX-30 | Signer credit on the tracker (TS OQ 6) | open | **Yes:** "Signatures by NEAR Chain Signatures" (`body-sm`, sentence case) | Oct 31 | ☑ decided: default |
| UX-31 | **Per-token accent: placement and strength** (B-04; new) | open | Leather hue ±12° from `fnv1a32` of the token id: the **Night card body** (oklch L 0.220, C 0.034) + a **mini-card swatch in both themes**; the Day card body stays white. Text contrast is unchanged (`ink` ≥ 14.48:1), but the tint is barely visible (ΔE ≤ 0.014 between extremes). Alternatives: swatch only; a stronger tint (C 0.046); or ask the brand to widen ±12° | Oct 31 | ☑ decided: default (quiet Night tint + swatch; identity comes from the serial number) |
| UX-32 | **Landing H1 and tagline** (new) | open | The brand canvas H1 **"One strap, every chain."** (`display` 56/700, opsz 96) with a factual lead ("Satchel is an NFT that is a wallet…"). Alternative: R2's "An NFT that is a wallet." as the H1. "Every chain" (canvas, OG image, manifest) overstates v1's three testnets (BI-14); in-product copy names the chains | Oct 31 | ☑ **decided 10-21: H1 "An NFT that is a wallet."** + factual lead; "One strap, every chain." is not used in the app (D-37) |
| UX-33 | **Global Activity route** (B-08; new) | open | **Cut by default** (P2, +1.5 h): the left nav shows Activity only if it is built; the per-Satchel Activity tab stays | Oct 31 | ☑ decided: cut |
| UX-34 | **Pressed primary fix** (verified AA failure; new) | open | `brand-pressed` = `color-mix(in srgb, brand-deep 50%, brand)` `#B7913F` (`on-brand` 5.53:1), because the brand's `brand-deep` pressed fill gives 3.80:1. Alternative: keep the `brand` fill + an inset 2 px `brand-deep` ring (7.74:1). Report upstream either way | Oct 31 | ☑ decided: `brand-pressed` #B7913F |

**Settled by R2 without a row** (answers in kb/80 R3 §R2 design decisions: status in R3; object by Oct 31 if you disagree):

| Researcher question | Answer (R3) |
|---|---|
| Verdict weight (TS OQ 1) | `heading` at 390, `title` on desktop |
| A final "can't be undone" sheet on Transfer (TS OQ 2) | No |
| "What your wallet will show" (TS OQ 3) | A P2 disclosure, cut by default |
| "First send here" chip (TS OQ 7) | P2, cut |
| Clean-history badge on touch (TS OQ 10) | A link to the report (the ProofChip) |
| Amount hero alignment (WC OQ 2) | Centred |
| Activity merge (WC OQ 6) | One row per sign request |
| Live Incoming block (WC OQ 7) | P1 |
| Sent-but-unconfirmed glyph (WC OQ 8) | A static `frozen` ring |
| Share on Receive (WC OQ 9) | Web Share API only |
| Address reveal on the card (NM OQ 2) | None in v1 |
| Blocked listings in the Market (NM OQ 7) | Shown last, with their reason |
| Delist (NM OQ 8) | No dialog |
| Success eyebrow (NM OQ 9) | No |
| Stats strip (NM OQ 11) | Status · Signatures · Listed for · Minted |
| Two caps voices (VL OQ 6) | Superseded: sentence case everywhere (brand) |

Scope of these defaults (kb/80 R3 §Scope and phasing): **+8.5 h of S2 work vs the plan** (R2: +9.0 h): P1 +6.0, P2 +1.5, polish +1.0. Native-only fiat (UX-1 alternative) removes 1.5 h from P1. The shift to P1 needs all of S1's Day-6 buffer as pairing, so the plan owner confirms it with H-11.

---

## 7. Timeline (Oct 21 → Nov 1)

| Date | Human | Agent |
|---|---|---|
| Wed Oct 21 | read spec + decisions; start P0-H7 (organizer questions) and P0-H14 (MPC team) | — |
| Thu–Fri Oct 22–23 | P0-H7 questions sent by Oct 23; think about names, H-22 and H-23 | — |
| **Sat Oct 24** | **P0-H1:** names + create `<team>.testnet` in the same sitting + record its creation tx; H-22; H-23. OK the sweep (P0-A7). P0-H2 personas. Start P0-H4: BTC claims first (W: into the wallet; F: into dev1 #1) | **P0-A1** addresses the same day; **P0-A7** first sweep (with OK); persona creation if asked (with OK) |
| Sun Oct 25 | P0-H2 if not done; W: the multi-output BTC send once the claims arrive; DST ends (UTC+2) | — |
| Mon–Wed Oct 26–28 | P0-H1b repo/app host/licence; P0-H5 FastNEAR key; P0-H14 asked; P0-H6 pay-spike USDC claim + OK for P0-R4; pk910 session + MetaMask sends | P0-A2 rules check (Oct 28); P0-A4 re-runs as funding lands (incl. P0-R4) |
| Thu–Fri Oct 29–30 | P0-H3 wallets; SOL airdrops; Figma (UX-13) | P0-A4; P0-A5 draft |
| **Sat Oct 31** | P0-H12 design decisions; P0-H8 X Premium; P0-H9 1Click cut; P0-H17 keyless birth; P0-H18 disclosure; P0-H13 hardware; P0-H16 approval text; W-path funding complete (G-16) | **P0-A3 re-check sweep**; P0-A2 rules check; P0-A7 second sweep; go/no-go table refreshed |
| **Sun Nov 1, 08:00 UTC** | create the repo; grant the standing approvals (P0-H16) → **G0**; P0-H15 scope "yes" (incl. the allowlist); F-path claims if not done | Day 1 starts (implementation-plan §4) |

Phase-0 human time ≈ 8 h:
- names, accounts and approvals 1.5 h;
- wallets 1 h;
- funding ≈ 2.5 h (2 BTC claims, 1 pk910 session, sends, 2 SOL airdrops, 3 USDC claims);
- design decisions 2 h;
- other decisions and questions 1 h.
