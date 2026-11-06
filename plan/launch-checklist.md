# Satchel launch checklist: getting live on testnet and submitting

> **Status (2026-11-04): the working launch list, partly out of date.** Written 2026-10-27, with later updates (2026-10-29). The "Where we stand" table is as of 2026-10-27; since then the private repo exists (2026-10-29), `satchelhq.testnet` and `dev1` (D-48) and `dev2` exist, the app is live at `https://usesatchel.xyz` against `dev2.satchelhq.testnet` (D-49), and the feature sprint merged (`plan/progress/feature-sprint.md`). Sections D–H (rc and freeze Nov 9, keyless birth Nov 10, submission Nov 13) are still ahead. Check each item's state before acting on it.

> Written 2026-10-27 from a scan of the repo, `plan/`, `docs/handoff/*`, `docs/security/*`, `tools/`, `README.md` and `marketing/`.
> Owners: **You** = Razvan (human-only or human-decided), **Claude** = the agent team (each step needs your approval, see A-03),
> **Both** = you act while Claude watches and verifies.
> The hackathon window is 2026-11-01T00:00Z → 2026-11-14T23:59:00Z. **Our target is to submit on Nov 13 by 18:00 UTC.**
> Exact commands are in `plan/human-actions-ready.md`, `tools/deploy/keyless-birth.md` and `docs/handoff/release.md` §3.

## Where we stand (2026-10-27)

| Area | State |
|---|---|
| Contract `contracts/satchel` | Done. 86 unit + 83 sandbox tests pass. **Testnet smoke on 2026-10-27, on a throwaway spike account: real MPC signatures for EVM, BTC (2 inputs) and SOL through the contract all verified; sale, transfer = control and the checker all worked** (`research/spikes/smoke/RESULTS.md`). Security review (no Critical or High) and parser fuzzing are done, and every finding is closed (`docs/security/`). wasm sha256 `aea0b2e9…1bd6`. Not yet deployed under `satchelhq`. |
| Core library `packages/core` | Done. 292 tests pass; ~8.5M fuzz inputs in total; Rust and TS agree on every input. |
| Web app `apps/web` (Satchel 2.0) | Done in **fixture mode**: 340 unit + 133 Playwright tests pass. **Live mode has never been run against a deployed contract**, and **it isn't hosted anywhere yet**. |
| Release tooling `tools/` | e2e scripts, keyless-birth tool, judge snippets, monitor and CI: all built and dry-run, **never sent**. |
| Video | `marketing/out/satchel-2-v2.mp4`, 2:14. It still needs a human listen. |
| README | `[TBD: …]` placeholders only for what the final birth creates: hash **H**, birth tx, block A (2026-11-05: team, fee, app URL filled; proof table, balances and CI link dropped). |
| On-chain | **Since 2026-10-29:** `satchelhq.testnet` (15.8 NEAR), `dev1` (contract live, #1–#3 minted), and alice, bob and carol exist. rc and the final contract don't exist yet (Days 9–10). Every demo address still holds 0. |
| Git | There is no repo (D-39: create it when Razvan says so). |
| External | MPC `v1.signer-prod.testnet` is still 3.17.0 with a 15 Tgas floor. **It is flaky under load: on Oct 27 about 1 in 4 recent `sign` requests timed out after ~120 s, and one of ours took 84 s.** `sepolia.drpc.org` is dead and has been replaced. Testnet now runs nearcore **2.14.0 (protocol 88)**. |

---

## A. Before Nov 1 (strongly recommended: these have lead times)

| # | Owner | Task | Why now | Done when |
|---|---|---|---|---|
| A-01 | **You** | **Create `satchelhq.testnet`**: `plan/human-actions-ready.md` §1 option B (works now), or the faucet | **DONE 2026-10-29 (D-48)** by Claude: 9 NEAR, plus 19.8 NEAR swept from the spikes. Everything on-chain waits on it, and so does safe funding (otherwise someone could squat the name) | `near account view-account-summary satchelhq.testnet network-config testnet-fastnear now` shows the account |
| A-02 | **You** | **Top up to the NEAR budget**: 68 NEAR planned (final 20, rc 10, dev1 5, alice 8, bob 4, carol 8, reserve 3, buffer 10). Sources: the spike leftovers (≈ 36 NEAR) + `satchelhq` + 2–3 more faucet-created accounts | The final birth alone needs ≥ 20.3 NEAR on the parent | the parent and the personas hold the D-34 amounts |
| A-03 | **You** | **Decide how Claude may sign testnet txs.** Either add permission rules for `near …` and `npx tsx tools/e2e/*` / `tools/deploy/*` (Claude can set this up via the update-config skill if you say so), or approve each prompt. The auto-mode classifier blocked testnet transfers before | **DONE 2026-10-29 (D-48):** Razvan allowed agents to sign testnet transactions. Without this, Claude can't deploy dev contracts or run e2e | the rule exists, or you've said "approve per prompt" |
| A-04 | **Claude** (after A-01, A-03) | Create `alice` / `bob` / `carol` / `dev1` under `satchelhq.testnet` and sweep the spike NEAR (D-34). Never create `satchel.` or `rc.` this way | **DONE 2026-10-29 (D-48):** dev1 5, alice 3, bob 2, carol 3 NEAR. Personas own the demo tokens; dev1 hosts the dev contract | the accounts exist with keys in `~/.near-credentials/testnet/` |
| A-05 | **You** | **Fund dev1 #1** (`research/final-addresses.md`): BTC testnet4 2 × 500k sats → `tb1qcg94…urc`; Sepolia 0.3 ETH → `0x3551…7db3`; devnet 0.2 SOL → `6ZQT…2Dwu`. Claude fans these out to the other Satchels on testnet later (`tools/e2e/{btc,evm}.ts --fanout`) | testnet4 confirmations can take **hours** (median 2 h, max 21 h) | balances show on mempool.space, Sepolia Etherscan and Solana Explorer |
| A-06 | **You** | Fund **final #1 SOL** (0.5 → `AGSU…XTXd`). Optionally fund final #1–#7 BTC directly if the faucets allow | Final addresses can be funded before the final contract exists; derivation is pure math | — |
| A-07 | **You** | **Circle testnet USDC** (faucet.circle.com → NEAR testnet) → `carol.satchelhq.testnet`, 20 every 2 h, target 40 | the USDC buy demo and its refund-path test | `ft_balance_of(carol) ≥ 40 USDC` |
| A-08 | **You** | **Ask the organizers** the 4 questions still open (Discord; draft in `plan/human-actions-ready.md` §3): whether one project can win both a track and the grand prize, whether post-deadline commits are ignored, the payout's KYC/tax/conversion terms, and whether the screening agents have network access. **Answered by the 2026-10-29 rules (D-47):** the Oct 21 start is inside the window (Q-001); testnet is eligible (Q-010); Claude Code and Codex screen, humans decide (Q-017) | not blocking any more | answers recorded in `kb/00` §Open questions |
| A-09 | **You** | **Ask the NEAR MPC team** whether the `sign` args, the 15 Tgas floor and the 1-yocto deposit stay stable through Nov 18 (draft §4). **Also ask about the testnet timeout rate (≈ 25% on Oct 27, under `tx-bench.testnet` load) and whether load tests can be avoided during judging, Nov 16–18** | a locked contract can't adapt | answer recorded |
| A-10 | **You** | Install the **Meteor** and **Intear** testnet wallets and import alice / bob / carol (after A-04) | the real wallet tests on Day 1–3 | both wallets show the personas |
| A-11 | **You** | **Vercel**: the app domain is **`usesatchel.xyz`** (D-49). Point its DNS at the Vercel project and add the domain there. It is frozen into the contract's `base_uri` (`https://usesatchel.xyz/api/card/`) at the Day-10 birth, so it must serve the app by Day 9. Also, authorise the Vercel connector for Claude, or plan to deploy yourself | the app host must be final before Day 10 | `https://usesatchel.xyz/api/contract` answers |
| A-12 | **You** | Optional: a **FastNEAR API key** (dashboard.fastnear.com) for the server and monitor | our shared IP hit the free-tier limits | `FASTNEAR_API_KEY` set in Vercel |
| A-13 | **You** | **Video**: listen through `marketing/out/satchel-2-v2.mp4`. At **2:14 it fits X's 2:20 non-Premium limit**, even though the marketing README says "Needs X Premium", so confirm. Check that nothing on screen implies mainnet funds, since the app is testnet only | X post on Day 13 | approved |
| A-14 | **You** | **Mainnet payout account** (`<name>.near`). HACKATHON.md: an agent must never create or invent it | submission field | exists by Nov 10 |
| A-15 | **You** | Submission fields: project name, lead name, email (the Satchel team's own), size `"2 - 4"`, tracks `["nfts","open"]`. The repo URL can be submitted only once | one-shot submission | written down outside the repo |

---

## B. Day 1 (Sun Nov 1): go live on dev

| # | Owner | Task | Done when |
|---|---|---|---|
| B-01 | **You** | Grant the **standing approvals** (text: `plan/human-actions-ready.md` §6, H-20) | posted in writing |
| B-02 | **You** → **Claude** | **Say when to create the git repo** (D-39). Recommended: **now**, not Nov 1. Q-001 counts code from Oct 19, so history from today onwards is in-window evidence for the screening agents. Then Claude runs `git init`, makes the first commit (no `research/`, no secrets, `.gitignore` already set) and pushes to your **private** GitHub repo `satchel` (you create it; pushing needs approval (a)) | **DONE 2026-10-29:** Razvan created the private repo `razvanstatescu/satchel`, and Claude pushed `ce5a4eb` to `main`. private repo has the code; CI runs |
| B-03 | **Claude** | Re-check the rules: `research/spikes/hackathon/check_rules.sh` (read any diff); MPC `version` / `config`; NearBlocks and FastNEAR freshness | no breaking change |
| B-04 | **Claude** | Deploy the contract to **`dev1.satchelhq.testnet`** (`cargo near deploy` with init; dev keeps its key). Register dev1 at USDC (`storage_deposit`) | **DONE 2026-10-29 (D-48):** deployed, init done, registered at USDC, #1–#3 minted to alice. `config()` view answers |
| B-05 | **Claude** | **Day-1 smoke on real testnet** (`tools/e2e/evm.ts --send`): mint #1 → `sign_for` EVM → real MPC signature through our contract → recover the address → broadcast on Sepolia. The path was already proven unfunded on Oct 27; this run adds the real broadcast. If the MPC times out, retry with `--nonce <same>` | **DONE 2026-10-29 on all three chains from dev1 #1:** Sepolia `0x4744f9d9…` (after a gas fix, E-48), devnet `7LRedaAK…`, and a 2-input testnet4 send `91663e43…` to dev1 #2. a Sepolia tx from dev1 #1, recorded in `docs/evidence/` |
| B-06 | **Claude** | Fan out the funding (`btc.ts` / `evm.ts --fanout --preset funding`) to dev1 #2/#3, and pre-stage rc/final where useful | balances per `research/final-addresses.md` |
| B-07 | **Claude** | **Vercel preview** in live mode against dev1 (`NEXT_PUBLIC_DATA_MODE=live`, `NEXT_PUBLIC_CONTRACT_ROLE=dev`, `NEXT_PUBLIC_SATCHEL_CONTRACT=dev1.satchelhq.testnet`, plus the RPC env from `.env.example`). Needs A-11 | **DONE 2026-10-29:** production is live at https://usesatchel.xyz (Vercel project `satchel`, root `apps/web`), in live mode against dev1. the preview URL shows dev1's Satchels with live balances |
| B-08 | **Claude** | **AI-judge check** on the preview: fetch `/s/1`, `/contract` and `/market` with an AI fetch tool (WebFetch) and with curl, JS off: the facts must be in the HTML (A-18) | **curl part DONE 2026-10-29:** `/s/1`, `/contract`, `/market`, `/s/9` and `/` render their facts with JS off. The WebFetch run is pending, because this machine's DNS hasn't seen the new domain yet. facts are visible to a bot |

## C. Days 2–8: every flow, end to end, on real networks

| # | Owner | Flow (`tools/e2e/*` + the UI) | Done when |
|---|---|---|---|
| C-01 | **Claude** | **BTC**: a 2-input send (`btc.ts --send`), one `sign_for` fanning out to the MPC | mempool.space accepts it; confirmation later |
| C-02 | **Claude** | **SOL**: a devnet transfer (`sol.ts --send`), inside the ~36 s blockhash window | devnet confirms |
| C-03 | **Claude** | **Transfer = control**: alice gives #2 to bob, bob sends, alice's `sign_for` fails `ERR_NOT_OWNER` | proven on-chain |
| C-04 | **Claude** | **Sale (NEAR)**: list → buy (exact price, `listing_id` + `expected_sig_count`) → payout | the buyer owns it; the seller is paid |
| C-05 | **Claude** | **Sale (USDC)**, including the **refund path**: a wrong `listing_id` → `SuccessValue "0"` and the balance unchanged; a direct `ft_on_transfer` → `ERR_WRONG_TOKEN` (A-05). If Circle fails, the final is born with `usdc: None` (H-26) | refund verified |
| C-06 | **Both** | **Real wallets**: run one `sign_for` on each chain (BTC, ETH, SOL; D-46), one transfer, one list and one buy through the UI with **Meteor** and **Intear** (80–260 Tgas + deposits; partial outcomes; A-04) | each flow completes in each wallet |
| C-07 | **Both** | **Clean history live**: an unused EVM signature blocks Buy; settle it → clean; the BTC `spent` row; the `foreign` status | the UI matches the checker |
| C-08 | **Claude** | **Gas re-measure on testnet** (n = 1, 2, 4, 10 BTC inputs) against the `30 + 18·n` floor (A-02) | the formulas hold, or are adjusted before the freeze |
| C-09 | **Claude** | **Reproducible build** of the workspace (Docker, `cargo near build reproducible-wasm`) twice → identical **H**; sandbox suite + `check-wasm-imports.sh` on that artifact; `near contract verify --use-contract-source-code-path` against a devN deploy of it (R-11, A-10) | H recorded; verify says "the same" |
| C-10 | **You** | Visual review of the live app on a real phone (Day/Night), plus the card SVG in Meteor and Intear | sign-off |

## D. Day 9 (Mon Nov 9): rehearse the final, contract freeze

| # | Owner | Task | Done when |
|---|---|---|---|
| D-01 | **Claude** | Freeze the contract; tag `contract-v1.0.0-rc1`; reproducible build → **H** | H fixed |
| D-02 | **Claude** | **rc keyless birth**: `tools/deploy/keyless-birth.ts` (dry run → review → send) for `rc.satchelhq.testnet` (10 NEAR, same init args as the final) | proofs 1–6 pass on rc (`keyless-birth.md` §3) |
| D-03 | **Claude** | `tools/e2e/clean-history.ts --role rc` (the 4-step scenario) + e2e on rc with the strict gate (`NEXT_PUBLIC_CONTRACT_ROLE=rc`, `EXPECTED_CODE_HASH=H`) | all green |

## E. Day 10 (Tue Nov 10, by 12:00 UTC): final birth, irreversible

| # | Owner | Task | Done when |
|---|---|---|---|
| E-01 | **You** | **Explicit "yes"** to the final birth (H-15), after reviewing the printed batch: 11 actions, **no AddKey**, Transfer 20 NEAR, wasm = H, `base_uri` = `https://usesatchel.xyz/api/card/`, 7 mints to alice | typed "yes" |
| E-02 | **Claude** | Send the birth for `satchel.satchelhq.testnet`; record the birth tx + block **A**; register at USDC **and at wrap.testnet** from `satchelhq.testnet` (C6 wNEAR deposits need the wrap.testnet registration); tag `contract-v1.0.0` | `view-account-summary`: 0 keys, code = H |
| E-03 | **Claude** | Switch production: `NEXT_PUBLIC_SATCHEL_CONTRACT=satchel.satchelhq.testnet`, `NEXT_PUBLIC_CONTRACT_ROLE=final`, `NEXT_PUBLIC_EXPECTED_CODE_HASH=H`, `NEXT_PUBLIC_DATA_MODE=live`; production deploy | `usesatchel.xyz/s/1` shows the live final |
| E-04 | **Claude** | **Stage the demo states** for tokens #1–#7 (D-32): #1 flagship funded; #2 gift (alice → bob, bob sends BTC); #3 sale (EVM-only history, bought by carol); #4 blocked (a nonce + 1 record, unbroadcastable); #5 for sale (BTC spent row); #6 and #7 retakes. Run testnet4 actions early (slow blocks; cut-off rule: Nov 12 06:00 UTC). Budget about 2 min and one retry for each MPC sign (testnet timeouts, Oct 27). #4's unbroadcast record can use `evm.ts --sign-only` | every state visible on the live site |
| E-05 | **Claude** | Capture evidence: FastNEAR `/v0/transactions` JSON for every proof tx → `docs/evidence/*.json`; CLI outputs | files committed |

## F. Days 11–12: README, proofs, polish

| # | Owner | Task | Done when |
|---|---|---|---|
| F-01 | **Claude** | Fill every `[TBD]` in `README.md`: H, birth tx, block A (the proof table, balances and CI link were dropped on 2026-11-05). Keep the README **Timeline** (Q-001) and **Libraries, tools and AI** (Q-005) | `grep -c "TBD" README.md` = 0, except fields you decide |
| F-02 | **You** | README "Team" section; approve the Timeline text (H-24, as reworded by D-47) | — |
| F-03 | **Claude** | `tools/judge-snippets.sh` against the final (every README command prints its documented output); `tools/monitor.sh` green | all PASS |
| F-04 | **Claude** | Full test pass on the release commit: contract unit + sandbox (**also with `SANDBOX_VERSION=2.14.0`**), core, tools, web unit + Playwright; CI green | recorded in the README |
| F-05 | **Both** | If the UI changed after the video was cut, decide whether any shot needs a re-take (marketing/README has the render pipeline) | decided |
| F-07 | **Claude** | **Act as a screening agent (Q-017):** run a fresh clone of the release commit in a clean worktree. Follow only the README (install, tests, reproducible build, the "Try it" and "Verify on-chain" steps) and fix anything that doesn't reproduce | a clean-clone run is green and matches the README's numbers |
| F-06 | **Claude** | Draft the X post text. HACKATHON.md (re-read 2026-11-05) requires "built at NEAR HACKATHON", **@NEARProtocol** and **#NEARHackathon** (optional @NearLegion, @NearBuilders) and the video or screenshots attached. Razvan has X Premium, so there is no 280-character limit. Its advice: open with the user problem in a line a stranger gets; show one complete moment (action → visible result), no intro or architecture slides; say concretely what NEAR enables (one NEAR contract signs native BTC/ETH/SOL; selling the NFT sells the wallet), not "powered by NEAR"; link the demo and the public repo and ask a real question | draft approved by you |

## G. Day 13 (Fri Nov 13): ship (every external action needs your "yes")

| # | Owner | Task | Done when |
|---|---|---|---|
| G-01 | **Claude** | `check_rules.sh` one last time; secret scan of the repo history (`gitleaks`) | clean |
| G-02 | **You** | **Make the repo public** (by ~10:00 UTC) | public |
| G-03 | **You** | **Post on X** with the video, "built at NEAR HACKATHON", and the repo link (~13:00 UTC). Save the post URL | URL saved |
| G-04 | **Claude** → **You** | Build the submission payload; `research/spikes/hackathon/validate_payload.py`; print it; read the consent text to you; **you type "yes"**; one `POST /api/applications`. A 409 now means the repo was already submitted | **201** saved (outside git) |
| G-05 | **Claude** | After the repo is public: `near contract verify deployed-at satchel.satchelhq.testnet` (and optionally NearBlocks "Verify and Publish") | "…are the same" |

## H. Nov 14–25: keep alive (judging Nov 16–18; Q-012: hosted demo up to at least Nov 18, ideally Nov 25)

| # | Owner | Task |
|---|---|---|
| H-01 | **Claude** | `tools/monitor.sh` daily: endpoints, the contract's free balance (alert below 3 NEAR), judge pages without JS, the near-connect wallet list |
| H-02 | **You** | Don't spend the demo funds, rotate keys or let the Vercel / FastNEAR free tiers lapse; keep the payout account and email monitored |
| H-03 | **Both** | No commits to `main` after the deadline, unless the organizers' answer allows it (A-08) |

---

## Cut lines if we fall behind (D-20)

1. Solana UI: it is on by default (D-46), and setting `NEXT_PUBLIC_SOL_UI=off` cuts it in one env change. The Oct 27 smoke proved SOL signing works against the real MPC.
2. The dynamic card extras.
3. The USDC buy UI (the contract path stays).
4. Market polish.

**Never cut:**
- mint;
- BTC and ETH send;
- transfer = control;
- list and buy with NEAR;
- clean history for EVM and BTC;
- the locked final contract;
- the server-rendered judge pages;
- the README.
