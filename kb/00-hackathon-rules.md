# NEAR HACKATHON: rules, submission API, judging, and what judges can actually do

> **Phase-0 research note (2026-10-21).** Kept as evidence and not maintained; where it disagrees with [kb/90](90-technical-spec.md), kb/90 wins (§13 Errata).
> "Plan" below means `near_hackathon.md`, the team's original plan, which is not in this repo. "Nov 1" dates are the Phase-0 schedule; implementation began 2026-10-21 (D-39).
> The rules changed on 2026-10-29 (D-47 in `plan/decisions.md`: code counts from 2026-10-19, AI screening, demo up to Nov 25). Re-read the live HACKATHON.md (`research/spikes/hackathon/check_rules.sh`) before relying on anything below.

> Owner: hackathon · Checked: 2026-10-21 (11:20–12:00 UTC) · Confidence: high for published rules and API behaviour; medium for judging mechanics (only partly published, the rest is inferred and tagged [ASSUMED])
> Primary sources:
> - `https://nearhackathon.com/HACKATHON.md` (raw, 12,588 bytes, sha256 `39fd3939…e33bb`), snapshot in `research/spikes/hackathon/HACKATHON.snapshot.md`
> - `https://nearhackathon.com/` (landing page, deployment `dpl_4vS1LnfyVwALQxRWc7Ewwg2M1z9M`) and its page bundle `/_next/static/chunks/app/page-55fe0ffc8b19dd8b.js` (holds the FAQ, prize table, judge list, form logic), snapshots in `research/spikes/hackathon/snapshots/`
> - Official announcement on X, 2026-10-19 19:01:58Z: `https://x.com/NEARProtocol/status/2112257967818997891`, and its X Article "NEAR HACKATHON: Build Beyond Boundaries" (`https://x.com/NEARProtocol/article/2112257967818997891`), text captured in `snapshots/x_article_jina.md`
> - Wayback Machine copies of the landing page, 2026-09-29 and 2026-10-15 (`snapshots/wayback/`)
> - Live probes of `https://nearhackathon.com/api/applications` (GET, and POST with an empty body that cannot be saved), listed in `research/spikes/hackathon/RESULTS.md`

## TL;DR — what an implementer must know

1. **Dates (UTC):** start and submissions open 2026-11-01T00:00:00Z; development ends and the submission deadline is **2026-11-14T23:59:00Z** (not 23:59:59); judging starts 2026-11-16T00:00:00Z; results by 2026-11-18T23:59:00Z. In Bucharest time (EET, UTC+2 after DST ends on Oct 25) the deadline is **Sun Nov 15, 01:59**. [SOURCED]
2. **No registration.** "There is no sign-up before the hackathon: the only form is the final submission." An earlier team-application form (live on Sep 29, "ends 5 Oct") is gone. [SOURCED]
3. **Three deliverables, all mandatory:** a **public repository** (public by the deadline), a **public X post** by the human that says the project was built at NEAR HACKATHON with the demo video or screenshots attached, and **one submission** (form or `POST /api/applications`) that links both. [SOURCED]
4. **One attempt per team.** "A submission cannot be edited"; a second submission with the same project name (case-insensitive) or email returns 409. Retries after a network error or 503 must reuse the same `requestId`. [SOURCED]
5. **The API is strict.** It takes exactly 11 fields (`requestId, projectName, leadName, email, size, tracks, nearAddress, projectUrl, demoUrl, idea, consent`); `website` is a honeypot. Before Nov 1 it answers `403 {"error":"Submissions open 1 Nov 2026 · 00:00 UTC."}`; a request with a foreign `Origin` gets `403 {"error":"Please submit from the application page."}`. Plain `curl` without an `Origin` header passes the cross-site check. [VERIFIED]
6. **Judges:** Illia Polosukhin (NEAR), Eddy Lazzarin (a16z crypto), Mert Mumtaz (Helius), Avichal Garg (Electric Capital), Kain Warwick (Synthetix & Infinex), Haseeb Qureshi (Dragonfly), Stepan Gershuni (cyber•Fund), plus **Claude Code & Codex as AI judges**. **No rubric or weights are published.** The FAQ points to past NEAR criteria: "technical implementation, design, impact, originality and sustainability". Past NEAR devpost hackathons weighted these equally. [SOURCED]
7. **Prizes:** $250K "paid in NEAR": one $55K grand prize, plus $10K / $3K / $2K for 1st, 2nd and 3rd in each of the 13 tracks. The payout goes to the mainnet NEAR account in the submission. Conversion rate, KYC and timing are not published. [SOURCED]
8. **Tracks:** select "every track the project fits"; it is still one submission. Satchel's natural set is `["nfts","open"]`. `nfts` hints: DYNAMIC NFTS, NEP-171, SUB-ACCOUNTS. `open` hints: EXPERIMENTAL, CHAIN ABSTRACTION, BUILD YOUR OWN. "Hints and wishes, not requirements … name them in the README." [SOURCED]
9. **There is no explicit rule on pre-existing code, licences, AI-generated code or testnet vs mainnet.** Every signal says "build during Nov 1–14". HACKATHON.md itself is written for AI coding agents, so AI-written code is expected. [SOURCED] Keep the plan's "no product code before Nov 1" stance.
10. **AI judges cannot see what a browser sees.** Verified with an AI fetch tool: X posts return HTTP 402, client-rendered pages return only the app shell, and Codex's cloud mode has no internet in the agent phase by default. The README, the repo and server-rendered pages must carry the evidence themselves. [VERIFIED]/[SOURCED]
11. **Two judge-command traps in the plan's README:** `near account list-keys` prints an empty table for an account that **does not exist**, so it does not prove a lock. Use `near account view-account-summary` plus a curl fallback (below). Also, near-cli-rs 0.30.1's default testnet RPC (`archival-rpc.testnet.fastnear.com`) returned 429s from our shared IP. `rpc.testnet.near.org` is slow (about 3 s per call) and, after roughly ten calls in a few minutes, answers 429 with "THIS ENDPOINT IS DEPRECATED! STOP USING IT NOW!" until the budget recovers (it was back to 200 about 20 minutes later). [VERIFIED]
12. **NearBlocks testnet is stale.** Its newest indexed block is 270,420,307 (2026-09-27 03:13Z) while the chain head is 274,089,744 (2026-10-21). NEAR transaction proof links to NearBlocks may show nothing for November transactions unless it recovers, so give RPC-based proofs too. [VERIFIED]

## Verified facts & measurements

### Source inventory (all fetched 2026-10-21 UTC)

| Source | What it adds | Snapshot / hash |
|---|---|---|
| `HACKATHON.md` | The authoritative agent instructions: procedure, API contract, tracks, ecosystem | `HACKATHON.snapshot.md`; raw sha256 `39fd39392c43c763222bd4b3f184c173817a3998f92cb212630ceba4a67e33bb` |
| Landing page `/` | Prize table, judges, FAQ, form copy, timeline | `snapshots/index.html` sha256 `460e1589…dbc942`; text `snapshots/index.text.txt` |
| Page JS bundle | Exact config (`buildStartsAtUtc` etc.), FAQ strings, form fields and client logic | `snapshots/js/page-55fe0ffc8b19dd8b.js` sha256 `51796340…875ca2` |
| X announcement + X Article (2026-10-19) | "No signup", README guidance ("name the ones you used"), Illia's ideas link, `@NEAR_hckthn` | `snapshots/x_2112257967818997891.json`, `snapshots/x_article_jina.md` sha256 `2d66017d…3783b` |
| Wayback 2026-09-29 and 2026-10-15 | How the rules changed (see "Rule history") | `snapshots/wayback/` |
| `GET /api/applications` | Public submission counter: `{"count":0}` | live |
| Not found (all 404) | `/llms.txt`, `/llms-full.txt`, `/robots.txt`, `/sitemap.xml`, `/skill.md`, `/SKILL.md`, `/AGENTS.md`, `/agents.md`, `/agent.md`, `/RULES.md`, `/rules`, `/terms`, `/TERMS.md`, `/FAQ.md`, `/faq`, `/JUDGING.md`, `/judging`, `/prizes`, `/privacy`, `/.well-known/llms.txt` | — |

The JS bundle contains no terms, eligibility, KYC, licence or pre-existing-code text (grepped for `terms`, `eligib`, `KYC`, `sanction`, `licen`, `pre-exist`, `existing`). HACKATHON.md, the landing page and the X Article are the complete published rules. [VERIFIED]

`@NEAR_hckthn`, which the X Article says to follow "for updates", had **0 posts** on 2026-10-21; its bio still says "12 tracks" (stale). [VERIFIED via reader proxy]

### Dates and times

| Event | UTC (source) | Bucharest (EET, UTC+2) |
|---|---|---|
| Hackathon starts, submissions open | 2026-11-01T00:00:00Z | Sun Nov 1, 02:00 |
| Development ends = submission deadline = repo must be public | 2026-11-14T23:59:00Z | Sun Nov 15, 01:59 |
| Judging starts | 2026-11-16T00:00:00Z | Mon Nov 16, 02:00 |
| Results announced by | 2026-11-18T23:59:00Z | Thu Nov 19, 01:59 |

Quotes: "All times are UTC. One submission per team." and "Submissions are accepted only during the development phase, from 2026-11-01T00:00:00Z to 2026-11-14T23:59:00Z. Outside that window the API answers 403 and explains why" (HACKATHON.md). The bundle config is identical: `buildStartsAtUtc:"2026-11-01T00:00:00Z", buildEndsAtUtc:"2026-11-14T23:59:00Z", judgingStartsAtUtc:"2026-11-16T00:00:00Z", endsAtUtc:"2026-11-18T23:59:00Z"`. [SOURCED] The Bucharest conversion uses Python `zoneinfo`; Bucharest is UTC+3 until Oct 25 and UTC+2 after. [VERIFIED]

### Registration and eligibility
- "There is no sign-up before the hackathon: the only form is the final submission." (HACKATHON.md) "No signup. Just ship a public repo + public demo post between November 1st & Nov 14, 23:59 UTC." (NEAR on X, 2026-10-19) [SOURCED]
- FAQ "Who can take part?": "Developers, designers and people with ideas for the NEAR ecosystem. No wallet connection is needed to submit: you only enter a NEAR account address, and if you win, the prize is sent there." [SOURCED]
- No age, country, sanctions, KYC or employee-exclusion rules are published. The 2026-10-15 FAQ said "Final eligibility and event rules will be published before the hackathon." That sentence was **removed** by 2026-10-21, and nothing replaced it. [VERIFIED by diff] Re-check on Nov 1 with `check_rules.sh`.

### Teams
- Team size is a bucket: `1`, `2 - 4`, `4 - 6`, `6 - 8`, `8+` (exact strings). Note that `4` fits two buckets. [SOURCED]
- "One submission per team." Project name: 2–80 characters, unique (case-insensitive). Email: unique, max 160. Team lead: 2–80 characters (not stated to be unique). The payout `nearAddress` is **not** stated to be unique. [SOURCED]

### Tracks (13), with hints

"Put the `id` of every track the project fits in the `tracks` array … A team still submits once." "They are hints and wishes, not requirements. Lean on the ones that fit the idea and name them in the README." [SOURCED]

| id | Track | Build (verbatim) | Hints | Fit for Satchel |
|---|---|---|---|---|
| `nfts` | NFTs That Do Something | "Build NFTs as accounts — assets that own money, earn royalties, hold inventory, carry credentials, memberships or access rights. Ownership with behavior." | DYNAMIC NFTS, NEP-171, SUB-ACCOUNTS | **Core.** An NFT that owns native BTC/ETH/SOL. Uses NEP-171, plus a dynamic SVG card. SUB-ACCOUNTS is not used (see recommendations). |
| `open` | Open Innovation | "Have an idea that refuses to fit a category? Explore new ways for money, intelligence and ownership to work together." | EXPERIMENTAL, CHAIN ABSTRACTION, BUILD YOUR OWN | **Core.** Chain abstraction through Chain Signatures. |
| `defi` | Unstoppable DeFi | "Build exchanges, perps, lending, vaults and trading agents that settle across chains through NEAR Intents. Deep liquidity, no custodian, nobody to switch it off." | TRADING, NEAR INTENTS, CHAIN SIGNATURES | Optional. Only if the sale market (S-7/S-8) and the 1Click flow (S-12) ship and the README frames Satchel as custody-free OTC of native positions. |
| `security` | AI Security & Defense | "spending limits, policy engines, sandboxed wallets … Give AI money without giving it the keys to everything." | AGENT SECURITY, FUNCTION CALL KEYS, TEE ATTESTATION | Weak. Fits only if delegates with caps (S-10) ship and are framed as agent spending limits. |
| others | `thesis`, `privacy`, `business`, `swarms`, `agents`, `realworld`, `games`, `memecoins`, `social` | — | — | No. |

### Judging
- Jury (landing page and X Article; roles from the bundle): Illia Polosukhin (Co-founder, NEAR Protocol), Eddy Lazzarin (General Partner, a16z crypto), Mert Mumtaz (Co-founder & CEO, Helius), Avichal Garg (Co-founder & GP, Electric Capital), Kain Warwick (Founder, Synthetix & Infinex), Haseeb Qureshi (Managing Partner, Dragonfly), Stepan Gershuni (Principal, cyber•Fund), and "Claude Code & Codex" (role "AI judges", Anthropic & OpenAI). [SOURCED]
- FAQ "How will projects be judged?": "Projects are reviewed by the jury above, with Claude Code & Codex joining as AI judges. Previous NEAR hackathons evaluated technical implementation, design, impact, originality and sustainability — a good guide to prepare by." [SOURCED]
- History: on 2026-09-29 the FAQ said "This event's final rubric, judges and prize allocation will be announced." Judges and prizes were announced; **a rubric never was.** [VERIFIED by diff]
- Past NEAR criteria (MetaBUILD III, NEARCON and NEARCON IRL devpost pages, identical wording): "Technological Implementation: Does the interaction with NEAR demonstrate quality software development?" · "Design: Is the user experience and design of the project well thought out?" · "Potential Impact: Is the Project Open Source and how big of an impact could the project have on the NEAR ecosystem?" · "Quality of the Idea: How creative and unique is the project?" · "Project Sustainability: Is the plan for the Project thought out and realistic?" Their rules pages say "Entries will be judged on the following equally weighted criteria". [SOURCED, precedent]
- Window: 3 days (Nov 16–18) for 8 judges and an unknown number of entries (the public counter was 0 before opening). [ASSUMED] AI judges probably do first-pass review of every repo, and human judges look at a shortlist and the X videos. Nothing is published about how human and AI scores combine.
- What judges are told to look for (X Article): "Give the judges a clear path from your idea to your working prototype. … it should make it easy to understand what you built, how it works, and why it matters." "Make your README work for both audiences. Explain what your product does, the problem it solves, and how to run it. … give judges clear steps to try your prototype, with an expected result for each step – 'do X, see Y.'" "In your README, name the ones [NEAR technologies] you used so judges can see how they power your project." [SOURCED]

### Prizes and payout
- Landing page: "TOTAL PRIZE POOL (paid in NEAR)" · "One grand prize overall. 1st, 2nd and 3rd place in each of the 13 build tracks." Grand $55K ×1 = $55K; 1st $10K ×13 = $130K; 2nd $3K ×13 = $39K; 3rd $2K ×13 = $26K; total $250K. The X Article says "Prize Pool: $250,000 (Paid in NEAR)". [SOURCED] On 2026-10-15 the page said "TOTAL PRIZE POOL (USDT)". It changed to NEAR by 2026-10-21. [VERIFIED by diff]
- Payout account: "NEAR account for the prize payout, mainnet: a named account such as `team.near` or a 64-character implicit account. The team creates it in any NEAR wallet … Never create or invent one on their behalf." Form help: "Your own wallet or your team's. If you win, the prize is sent here." [SOURCED]
- Not published: the USD→NEAR rate or date, payout timing, KYC or tax forms, whether one project can win a track **and** the grand prize, and whether it can place in several tracks.

### Submission mechanics
See "Reference" below for the exact contract. Key points:
- Form at `https://nearhackathon.com/#apply` or API `POST https://nearhackathon.com/api/applications`, with the same fields. "No wallet connection needed." [SOURCED]
- No auth: no API key or wallet signature. Anti-abuse comes from the cross-site check (Origin), the honeypot `website`, the window check, and uniqueness. [VERIFIED for the Origin and window checks]
- **Not editable**: "A submission cannot be edited, so send it when the repository is public and the demo post is up." [SOURCED]
- `requestId` is an idempotency key: "a retry after a network error or a 503 must reuse the same value, and the server then treats it as the same submission." [SOURCED]
- The browser form generates `requestId` with `crypto.randomUUID()` once per page session and sends `{...formFields, tracks, size, consent, requestId}`, which includes `website:""` from the hidden honeypot input. An empty honeypot is accepted, but for the API, omit `website`. [VERIFIED from bundle]
- Do not commit the payload ("it contains personal data"). [SOURCED]

### README, demo, video and X post requirements
- README: "The jury includes AI judges, so write the README for a machine reader as well as a human one: what the product is, the problem it solves, and how to try it as "do X - see Y" steps a judge can follow. No marketing." [SOURCED] The X Article adds "how to run it" and "name the [NEAR technologies] you used". [SOURCED]
- X post: "The human records a demo and publishes a public post on X: it says the project was built at NEAR HACKATHON and has the demo video or screenshots attached. You can draft the text; the human posts it and gives you the link." [SOURCED] The `demoUrl` field is the post URL ("Your public post on X with the demo video or screenshots"). [SOURCED]
- The hackathon sets no video length. **X does:** non-Premium accounts can upload at most **140 s (2:20)** and 512 MB; Premium accounts get hours (sendcove.app spec page, published 2026-04-10; several other secondary sources agree; X's help centre blocks automated fetches). [SOURCED, secondary] The plan's 2:45 video does not fit a non-Premium account.

### Repository requirements
- "Make the repository public before development ends, 2026-11-14T23:59:00Z." "The repository may stay private while the team builds … Judges cannot open a private one." [SOURCED]
- No licence, commit-history or host requirement (GitHub is only implied by the form placeholder `https://github.com/your-team/your-project`). [SOURCED] Precedent: past NEAR devpost rules required an open-source licence (MIT, Apache 2.0 or BSD-3), and "Potential Impact" asks "Is the Project Open Source". [SOURCED, precedent]
- Nothing says what happens to commits pushed after the deadline. [ASSUMED] Judges may look at `git log` dates, so treat the deadline as a code freeze for `main`.

### Pre-existing code, AI-generated code, third-party APIs, networks
- **Pre-existing code:** no explicit rule. Signals: "Build the project with the human" (HACKATHON.md); "01 Build your project during the hackathon" (submission steps); "ship a public repo + public demo post between November 1st & Nov 14" (NEAR on X). Precedent: "Projects must be newly created … during the hackathon submission period" (MetaBUILD rules) and "Submissions must be created, or substantially modified, during the hackathon" (NEARCON). [SOURCED] The plan's conservative stance is right.
- **AI-generated code:** explicitly anticipated. HACKATHON.md opens "Instructions for the AI coding agent helping a team take part in NEAR HACKATHON", and the site says "Hand HACKATHON.md to your coding agent … and can file your submission." [SOURCED]
- **Rules for AI agents working on the project** (they bind our Claude engineers): never, without the human's explicit confirmation, "Send the submission", "Post anything on X", "Make the repository public, push, or force-push", "Sign transactions, spend tokens or deploy to mainnet", or "Commit secrets. Keys belong in environment variables, never in the repository." Also "Do not guess, generate or fill in placeholders" for the human-decided fields. [SOURCED]
- **Third-party APIs and partner tools:** allowed and encouraged. HACKATHON.md lists 12 ecosystem partners and says "verify endpoints, contract addresses and SDK versions there instead of assuming them." [SOURCED]
- **Testnet vs mainnet:** no requirement. Nothing in the published rules says the demo must be on mainnet. Only the payout account must be mainnet. [SOURCED] (NEAR Intents/1Click, a hint in several tracks, is mainnet-only according to the plan; pay verifies this in 51-1click-and-usdc.md.)

### Rule history (Wayback diffs)

| Date | Change |
|---|---|
| 2026-09-29 | Registration phase. "Register your team" form (Team name, lead, email, size, single "Preferred track", idea, optional link), counter "ENDS IN … 5 Oct 2026", "Download agent.md". 12 tracks: "Programmable Payments" existed; `defi` and `thesis` did not; Social Money had generic hints (COMMUNITY TREASURIES, MULTISIG). Jury: Illia, Eddy, Mert, Avichal, Kain, Claude Code & Codex. FAQ: "final rubric, judges and prize allocation will be announced". |
| 2026-10-15 | Final-submission form (Project name … Demo post link), still a single "Preferred track". The current 13 tracks: `defi` and `thesis` added, "Programmable Payments" removed, Social Money re-hinted to SPUTNIK DAO / TREZU, Privacy to NEAR AI CLOUD. Haseeb Qureshi and Stepan Gershuni already on the jury. "TOTAL PRIZE POOL (USDT)" with no per-place table. FAQ: "Final eligibility and event rules will be published before the hackathon." `Download HACKATHON.md`. |
| 2026-10-21 (now) | Multi-select "Tracks"; prizes "paid in NEAR" with the per-place table ($55K / $10K / $3K / $2K); OutLayer and GoMining partners added; the "Final eligibility…" sentence removed; FAQ multi-track answer changed to "Select every track your project fits". `/agent.md` now 404s. |

The X Article (2026-10-19) still says the form asks for "Your preferred track" (singular). HACKATHON.md and the live form/API take an array, so they win. [VERIFIED]

## Reference — exact APIs, types, commands, tested snippets

### Submission API contract (verbatim from HACKATHON.md, re-verified 2026-10-21)

`POST https://nearhackathon.com/api/applications`, `Content-Type: application/json`, body ≤ 12,000 bytes, **exactly these fields**:

| Field | Type | Rule |
|---|---|---|
| requestId | string | UUID, generated once per submission and reused on retries |
| projectName | string | 2-80 characters, unique (case-insensitive) |
| leadName | string | 2-80 characters |
| email | string | valid email, max 160 characters, unique |
| size | string | one of `1`, `2 - 4`, `4 - 6`, `6 - 8`, `8+`, exactly as written |
| tracks | array of strings | one or more of `defi`, `thesis`, `privacy`, `business`, `swarms`, `security`, `agents`, `realworld`, `games`, `nfts`, `memecoins`, `social`, `open`, each listed once |
| nearAddress | string | 2-64 characters, lowercase, matching `^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$` |
| projectUrl | string | http(s) URL of the public repository, max 300 characters |
| demoUrl | string | http(s) URL of the public demo post, max 300 characters |
| idea | string | 20-2000 characters |
| consent | boolean | `true`, only after the human agreed to the contact notice |

Consent text, to be read to the human verbatim: "I agree that the organizers may use these details to review our submission and contact us about this hackathon."

| Status | Meaning (verbatim) | What to do |
|---|---|---|
| 201 | Submission saved | Done. Tell the human. |
| 400 | A field failed validation | Fix the fields listed in `fields` of the response and resend with the same requestId. |
| 403 | Submissions are not open, or the request looked cross-site | Tell the human. Do not retry. |
| 409 | Project name or email already used | The team already submitted. Ask the human; do not change the name to get around it. |
| 413 | Body too large | Shorten the description. |
| 503 | Storage temporarily unavailable | Wait a minute and resend with the same requestId. |

**Observed responses (2026-10-21 11:22Z)** [VERIFIED]:
```
$ curl -sS -X POST https://nearhackathon.com/api/applications -H 'Content-Type: application/json' -d '{}'
HTTP/2 403   {"error":"Submissions open 1 Nov 2026 · 00:00 UTC."}

$ curl -sS -X POST https://nearhackathon.com/api/applications -H 'Content-Type: application/json' \
    -H 'Origin: https://example.com' -H 'Sec-Fetch-Site: cross-site' -d '{}'
HTTP/2 403   {"error":"Please submit from the application page."}

$ curl -sS https://nearhackathon.com/api/applications
HTTP/2 200 (cache-control: no-store)   {"count":0}
```
The cross-site check runs **before** the window check. Errors come back as `{"error": "<message>"}` (the form shows `h.error`). The 400 body also has `fields` (per HACKATHON.md), which we could not observe before Nov 1.

### Satchel payload template (placeholders, **never send as is**)
Every `<…>` value is a human decision, per HACKATHON.md "What the human decides".
```json
{
  "requestId": "<uuidgen | tr A-Z a-z, generated once on submission day, saved outside the repo>",
  "projectName": "<e.g. Satchel>",
  "leadName": "<Satchel team lead>",
  "email": "<the Satchel team's email, monitored until payout>",
  "size": "2 - 4",
  "tracks": ["nfts", "open"],
  "nearAddress": "<mainnet payout account created by the human, e.g. <name>.near or a 64-hex implicit>",
  "projectUrl": "https://github.com/<org>/<satchel-repo>",
  "demoUrl": "https://x.com/<handle>/status/<id>",
  "idea": "<20-2000 chars; human-approved; see draft below>",
  "consent": true
}
```
`size`: Satchel is a solo project, so `"1"` (H-02, 2026-11-05).

Draft `idea` (≈700 chars, for the human to edit and approve, not to be sent unreviewed):
> Satchel is an NFT that is a wallet. Each NEP-171 token on NEAR controls its own native Bitcoin (testnet4) and Ethereum (Sepolia) addresses through NEAR Chain Signatures: the Satchel contract checks that the caller owns the token and asks the MPC signer (v1.signer-prod.testnet) to sign for that token's derivation path. Transferring or selling the NFT transfers control of the funds, with no bridge, no wrapped tokens and no seed phrase changing hands. Because a signature issued before a sale could be broadcast after it, Satchel freezes signing while a token is listed and shows buyers a "clean history" check of every signature the token has issued. The contract is locked (no access keys); everything runs on NEAR testnet.

Validate offline before showing the payload to the human: `python3 research/spikes/hackathon/validate_payload.py payload.json` (it checks every documented rule, including the regex; self-test: `--selftest`). [VERIFIED]

Send (only after the human types yes to the printed payload):
```sh
curl -sS -X POST https://nearhackathon.com/api/applications \
  -H 'Content-Type: application/json' --data @payload.json -w '\nHTTP %{http_code}\n'
# 201 -> done. 400 -> fix the `fields`, resend with the SAME requestId. 503/network error -> wait, resend with the same requestId.
```

### Judge-runnable verification commands (tested 2026-10-21)

**near CLI (near-cli-rs 0.30.1)**, with the plan's exact syntax [VERIFIED; about 3.1–3.2 s each over `rpc.testnet.near.org` when it was not throttling]:
```sh
near contract call-function as-read-only <contract> nft_token json-args '{"token_id":"1"}' network-config testnet now
# -> pretty JSON {"owner_id": ..., "token_id": ..., "metadata": {...}, "approved_account_ids": {}}

near account view-account-summary <contract> network-config testnet now
# -> "Local Contract (SHA-256 checksum hex)  <64 hex>"
#    "Access keys  0 full access keys and 0 function-call-only access keys"   (what a locked contract should show)
# For a non-existent account this command FAILS ("does not exist while viewing").
```
Do **not** use `near account list-keys <acct>` as the lock proof. For a **non-existent** account it prints the same empty table as a locked one (tested on `satchel-does-not-exist-zz9.testnet` and on `v2.ref-finance.testnet`, which RPC reports as `UNKNOWN_ACCOUNT`). The RPC `view_access_key_list` also returns `{"keys":[]}` with no error for unknown accounts. [VERIFIED]

Under rate limiting, `view-account-summary` printed `Access keys  Warning: Failed to retrieve access keys. Retry later.` instead of a count, so a judge could misread it. [VERIFIED] If the default RPC throttles, near-cli-rs 0.30.1 already ships a `testnet-fastnear` connection (`https://test.rpc.fastnear.com/`): use `network-config testnet-fastnear`. [VERIFIED in a fresh default config]

**curl + python3 only** (no CLI install; tested end to end in 0.37 s against `near-testnet.drpc.org`; file `research/spikes/hackathon/judge_snippets.sh`) [VERIFIED]:
```sh
RPC=https://near-testnet.drpc.org   # fallback: https://test.rpc.fastnear.com
C=<satchel contract>; T=1
ARGS=$(printf '{"token_id":"%s"}' "$T" | base64)
curl -s $RPC -H 'Content-Type: application/json' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"query\",\"params\":{\"request_type\":\"call_function\",\"finality\":\"final\",\"account_id\":\"$C\",\"method_name\":\"nft_token\",\"args_base64\":\"$ARGS\"}}" \
| python3 -c 'import sys,json; r=json.load(sys.stdin)["result"]; t=json.loads(bytes(r["result"])); print("owner_id =", t["owner_id"])'
# -> owner_id = <account>

for M in view_account view_access_key_list; do
curl -s $RPC -H 'Content-Type: application/json' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"query\",\"params\":{\"request_type\":\"$M\",\"finality\":\"final\",\"account_id\":\"$C\"}}"; echo; done \
| python3 -c '
import sys,json
A="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
acct,keys=[json.loads(l) for l in sys.stdin if l.strip()]
if "error" in acct: sys.exit("account does not exist: "+acct["error"]["data"])
n=0
for ch in acct["result"]["code_hash"]: n=n*58+A.index(ch)
print("code sha256 =", n.to_bytes(32,"big").hex())
k=keys["result"]["keys"]; print("access keys =", len(k), "(full access:", sum(1 for x in k if x["access_key"]["permission"]=="FullAccess"), ")")'
# -> code sha256 = <64 hex, equal to `sha256sum` of the reproducible wasm build>
# -> access keys = 0 (full access: 0 )
```
The RPC `code_hash` is base58 of the wasm's SHA-256: `HPgPfGLZ…jyK4f` decodes to `f38a4ecc…eae9dc`, which is exactly what the CLI prints as "SHA-256 checksum hex". [VERIFIED] So a README step "build reproducibly, compare `sha256sum` with the on-chain hash" is possible. sdk owns the reproducible-build details (`22-deploy-and-lock.md`).

### Testnet RPC endpoints as seen from our (shared, busy) IP on 2026-10-21

| Endpoint | Result | Note |
|---|---|---|
| `https://rpc.testnet.near.org` | 200 in about 3 s at 11:28Z; **429 `"WARNING! THIS ENDPOINT IS DEPRECATED! STOP USING IT NOW! Switch to https://fastnear.com…"`** for every call 11:33–11:35Z (after about 10 calls); 200 again (3.18 s) at 11:58Z | A deprecated, throttled endpoint. Do not use it in README commands or the app. [VERIFIED] |
| `https://archival-rpc.testnet.fastnear.com` (near CLI default `testnet`) | 429 "Rate limits exceeded. For higher rate limits get a subscription" | Probably caused by nine agents sharing one IP; judges may not see it. [VERIFIED/ASSUMED] |
| `https://rpc.testnet.fastnear.com` | 200 in about 70 ms, later 429 | Anonymous per-IP limit. [VERIFIED] |
| `https://test.rpc.fastnear.com` | 200 in 75 ms | near CLI `testnet-fastnear`. [VERIFIED] |
| `https://near-testnet.drpc.org` | 200 in 82 ms | Listed on docs.near.org/api/rpc/providers. [VERIFIED] |
| `https://testnet-rpc.intea.rs` | 502 "Requests without an API key are being slowed" | [VERIFIED] |
| `https://neart.lava.build` | 410 "This endpoint has been discontinued." | Still a `testnet-lava` connection in the near CLI's default config. [VERIFIED] |

### What explorer pages an AI judge's fetch tool can read (tested with Claude's WebFetch, 2026-10-21)

| Link type | Readable? | Evidence |
|---|---|---|
| `mempool.space/testnet4/tx/<txid>` | Yes for bots | Served a 22 KB pre-rendered page with inputs, outputs and fee to UA `Claude-User`, but a 3 KB empty `<app-root>` shell to a browser UA. The API `mempool.space/testnet4/api/tx/<txid>` returns JSON. [VERIFIED] |
| `sepolia.etherscan.io/tx/<hash>` | Yes | Status, from, to, value, block, logs. [VERIFIED] |
| `testnet.nearblocks.io/txns/<hash>` | Yes, server-rendered, **but only for transactions it has indexed** (latest indexed block 2026-09-27) | [VERIFIED] |
| A client-rendered dapp page (`testnet.mynearwallet.com/profile/<acct>`) | **No**: only "MyNearWallet" | [VERIFIED] |
| An X post (`x.com/<user>/status/<id>`) | **No**: HTTP 402 | [VERIFIED] |
| GitHub raw files | Yes | (used throughout this research) |

## Gotchas & failure modes
1. **One shot.** A wrong email or name cannot be fixed, and resubmitting gives 409. Validate offline, print the payload, get a typed "yes", then send. [SOURCED]
2. **The deadline is 23:59:00Z, not midnight**, and the API enforces it with 403. Plan to submit by Nov 13 18:00Z as the plan says. [SOURCED]
3. **Do not submit from a browser tool on another origin.** A foreign `Origin` header gets 403 "Please submit from the application page." Use curl (no Origin) or the official form. [VERIFIED]
4. **The honeypot `website`:** never include it in the API body. Any non-empty value rejects the submission. [SOURCED]
5. **`requestId` must be stable across retries.** Generate it once on submission day and store it outside the repo (not in git: the payload has personal data). [SOURCED]
6. **The demo post must exist before submitting** (`demoUrl` is required), and the repo must already be public. Order: make public → post on X → submit. [SOURCED]
7. **The X video limit** of 2:20 for non-Premium accounts (see above). [SOURCED, secondary]
8. **AI judges cannot see the X post** (402), cannot watch video, and cannot run a wallet. Anything that exists only in the video does not exist for them. [VERIFIED]
9. **Codex cloud blocks internet during the agent phase by default** ("By default, Codex blocks internet access during the agent phase. Setup scripts still run with internet access so you can install dependencies", learn.chatgpt.com/docs/cloud/internet-access, labelled "Legacy"). If the organizers use that mode, RPC commands fail and only offline tests and repo files count. How they actually run the AI judges is unknown. [SOURCED/ASSUMED]
10. **Lock proofs:** use `view-account-summary` or the curl pair above, not `list-keys` (an empty list also means "no such account"). [VERIFIED]
11. **Deprecated RPC:** `rpc.testnet.near.org` is slow (about 3 s per call) and returns 429 with a deprecation message once a small request budget is used up. Search the whole codebase and docs for it. [VERIFIED]
12. **NearBlocks testnet lag** (≈3.7 M blocks, 24 days as of Oct 21). Do not make NearBlocks the only proof for NEAR-side transactions. [VERIFIED]
13. **Client-rendered pages are invisible to AI fetchers.** The plan's "Open `https://satchel-<team>.vercel.app/s/1` → see a Satchel holding testnet BTC and ETH" works for an AI judge only if `/s/[id]` server-renders the owner, addresses, balances and status in the HTML. [VERIFIED for the failure mode]
14. **Agent-conduct rules apply to our Claude engineers:** pushing, force-pushing, making the repo public, signing transactions or deploying to mainnet all need explicit human confirmation. Get a standing written approval for routine testnet work and pushes to the private repo early on Nov 1. [SOURCED]
15. **Rules can change.** HACKATHON.md says "read it again before submitting, because dates and rules may change." It changed three times between Sep 29 and Oct 21. Run `research/spikes/hackathon/check_rules.sh` on Nov 1, Nov 7 and right before submitting. [SOURCED/VERIFIED]

## Recommendations for Satchel (concrete, with priority)

**P0**
1. **Submission runbook (day 13).** (a) Run `check_rules.sh` and read any diff. (b) Make the repo public (human). (c) Human posts on X with the ≤2:20 video attached, the phrase "built at NEAR HACKATHON", and the repo link. (d) Fill the payload template, run `validate_payload.py`, print it, read the consent notice verbatim to the human, get a yes. (e) `curl --data @payload.json` once and save the response (outside git). (f) Confirm 201 and watch the public counter go up.
2. **Make every claim checkable without a browser or wallet.** Server-render `/s/[id]` (owner, chain addresses, balances, frozen/listed state, last signatures) so `curl`/WebFetch shows the facts. Add a JSON endpoint such as `/api/satchels/1`. In the README, put next to each claim a command or URL plus the expected output (the curl snippets above).
3. **Lock proof = `view-account-summary` + curl pair + reproducible build hash**, not `list-keys`. The README step reads: "Run X → see `0 full access keys and 0 function-call-only access keys` and `Local Contract (SHA-256 checksum hex) <hash>`; run `cargo near build reproducible-wasm` → `sha256sum` equals `<hash>`." The subcommand exists in cargo-near 0.22.0 ("Requires `[reproducible_build]` section in Cargo.toml, and all changes committed to git") [VERIFIED via `--help`]; the full procedure is sdk's (22-deploy-and-lock.md).
4. **The video for X must be ≤ 2:20** unless the posting account has X Premium (human to check). Cut the plan's 2:45 storyboard to about 2:15 (suggested cuts: shorten mint/balances and the 1Click clip). Optionally put a longer cut on YouTube and link it from the README and the post.
5. **Use only working RPCs** in README commands and app config: `https://test.rpc.fastnear.com` or `https://near-testnet.drpc.org` (and the near CLI's `testnet-fastnear` connection). Remove `rpc.testnet.near.org`. Hand this to web and pay.
6. **Proof links must survive the judging window (Nov 16–18):** keep the hosted app, worker, DB, API keys and the funded demo Satchels alive until at least Nov 19. Do not rotate keys, run out of the free tier or spend the demo funds after submitting. For each proof, give an explorer link **and** an API or RPC form (mempool.space `/api/tx/`, Sepolia JSON-RPC `eth_getTransactionReceipt`, NEAR RPC `tx`).
7. **Repo hygiene from the first commit on Nov 1:** create the repo on or after 2026-11-01T00:00Z. Do not import Phase 0 spikes. Add `.gitignore` for keys and `.env*`, and keep `.env.example`. Before going public, scan history with GitHub secret scanning or `gitleaks`, because rewriting history needs a force-push and therefore human confirmation.

**P1**
8. **README structure aligned with the five precedent criteria** (equal weight assumed): see the skeleton below. Add three sections the plan's B7 lacks: **License** (MIT or Apache-2.0, which helps "Potential Impact: Is the Project Open Source"), **What's next / sustainability** (audit → mainnet → marketplace integrations, and where revenue would come from), and **Pre-hackathon work disclosure** ("Oct 20–31: research notes and Figma only; no code. First commit 2026-11-01").
9. **Name the hint technologies explicitly in the README** ("NEP-171 (`nfts` hint), Dynamic NFT (`nfts` hint), Chain Signatures / chain abstraction (`open` hint), NEAR Intents 1Click (mainnet clip)"), because the organizers ask for it.
10. **Make the first screen of the README and the first 15 s of the video carry the idea.** Human judges get a 3-day window, and the video is all they may watch.
11. **Cheap evidence for an offline AI judge:** commit `docs/evidence/` with the JSON RPC responses for the key transactions, plus a public CI run showing the sandbox tests. Offline unit tests (`cargo test`) should be runnable in under a few minutes once dependencies are fetched.
12. **Tracks:** submit `["nfts","open"]`. Add `defi` only if the NEAR/USDC sale and the 1Click flow ship (TRADING / NEAR INTENTS / CHAIN SIGNATURES hints). Do not add tracks the product does not really fit: "every track the project fits" is the instruction.

**P2**
13. The `nfts` hint SUB-ACCOUNTS is unused. A cheap nod: deploy as `satchel.<team>.testnet` (a named sub-account) and say so in the README. A larger option (out of scope unless time allows): give each token a NEAR-side address too (`satchel/{id}/near`, an ed25519 implicit account derived via domain 1), so the NFT also holds NEAR and NEP-141 tokens. That idea needs a check by mpc and chains first.
14. Before Nov 13, watch the public counter (`GET /api/applications`) to gauge how much competition each track has.

### Checklist A — what Satchel's submission must contain
- [ ] Public repo URL (public before 2026-11-14T23:59:00Z), with:
  - [ ] README: what it is (2 sentences), the problem, **"do X → see Y" steps with expected outputs**, how to run locally, NEAR technologies used (named against track hints), proof links with API/RPC alternatives, trust assumptions (clean history), limitations, what's next, team, pre-hackathon disclosure, licence. No marketing.
  - [ ] LICENSE file (MIT or Apache-2.0)
  - [ ] Contract source and tests, reproducible-build instructions, deployed contract id and code hash
  - [ ] `.env.example`, no secrets in history
  - [ ] Screenshots or GIFs in the repo (AI judges can read images, not X videos)
- [ ] Live testnet deployment: locked `satchel.<team>.testnet`, at least one funded demo Satchel, a server-rendered `/s/[id]`
- [ ] X post by the human: "built at NEAR HACKATHON", ≤2:20 video (or screenshots) attached, repo link; URL saved
- [ ] Mainnet payout account created by the human, spelled lowercase, re-checked against the regex
- [ ] Submission: 11 fields, consent read verbatim, payload validated and printed, human "yes", single POST, 201 recorded
- [ ] `projectName` and `email` decided by the human, saved `requestId`

### Checklist B — what a judge can actually do (inferred from the rules plus our tests)
| Judge | Can | Cannot / unlikely |
|---|---|---|
| AI judges (Claude Code, Codex) | Clone the public repo; read README and code; run shell commands **if** their harness allows (Codex cloud: internet only during setup by default); fetch URLs as a bot (server-rendered pages, mempool.space, Etherscan, NearBlocks, raw GitHub); read images in the repo; call public JSON-RPC with curl if they have network; compare README claims with the code | See X posts (402) or watch videos; connect a wallet or sign; solve captchas or log in; see client-rendered pages; wait minutes for MPC signatures; install heavy toolchains reliably (Rust + wasm + cargo-near + sandbox binary) |
| Human judges (7 founders and VCs) | Watch the X video; skim the README's first screen; open the hosted URL; maybe click around read-only | Install near CLI or Rust; fund testnet wallets; follow long setup steps during a 3-day window |

So: (1) the video and README top must make the case alone; (2) every claim needs a one-line, copy-pastable check with the expected output; (3) the hosted demo must show a funded Satchel read-only, without a wallet; (4) heavier checks (sandbox tests, reproducible build) are optional extras with recorded output.

### README skeleton for AI and human judges (proposal; replaces plan B7 items 1–5)
1. **Satchel** — "An NFT that is a wallet: each NEP-171 token on NEAR testnet controls its own native BTC (testnet4) and ETH (Sepolia) addresses via NEAR Chain Signatures. Sell or transfer the NFT and you hand over the wallet." Problem: 3 bullets.
2. **Try it in 60 seconds (no wallet needed)**: "Open `<url>/s/1` → see owner `<acct>`, BTC address `tb1…` holding `<x>` tBTC, ETH address `0x…` holding `<y>` SepoliaETH." Plus "`curl <url>/api/satchels/1` → see the same as JSON".
3. **Verify on-chain (copy-paste)**: the owner (`near contract call-function … nft_token` or curl), the lock (`view-account-summary` → 0 keys, code hash), the build (`cargo near build reproducible-wasm` → same hash), and balances (mempool.space API, Sepolia RPC).
4. **Proof transactions** table: chain | what it proves | explorer link | API link.
5. **Run it locally**: prerequisites, `pnpm i`, `pnpm dev`, `pnpm test:contracts` (with the recorded output and CI link).
6. **How it works**: diagram and paths (`satchel/{id}/{btc|evm|sol}`), with links to the code lines for `sign_for`, the owner check and the transfer hook.
7. **NEAR technologies used** (named against the `nfts`/`open` hints).
8. **Security model and trust assumptions** (pre-signed transactions and clean history), and **limitations**.
9. **What's next** (sustainability), **Team**, **Pre-hackathon work**, **License**.

## Deltas vs plan (near_hackathon.md)

| # | Plan says | Reality (2026-10-21) | Change |
|---|---|---|---|
| 1 | Key Findings: "Development ends 2026-11-14T23:59:00Z; judging runs Nov 16-18." | Confirmed; results by 2026-11-18T23:59:00Z; submissions open 2026-11-01T00:00:00Z. [SOURCED] | None. Add Bucharest times to the schedule (deadline = Sun Nov 15, 01:59 EET). |
| 2 | "Submit once … cannot be edited … project name and email must be unique." | Name (case-insensitive) and email uniqueness confirmed. **Payout account uniqueness is not required.** [SOURCED] | None. |
| 3 | "The README must have 'do X - see Y' steps and no marketing." | Confirmed. The X Article adds "how to run it" and "name the [NEAR technologies] you used". [SOURCED] | Add "Run it locally", "NEAR technologies used" (against hints), License, What's next, Team, Pre-hackathon disclosure. |
| 4 | Track hints for `nfts`, `social`, `realworld` | Confirmed verbatim. `open` hints are EXPERIMENTAL, CHAIN ABSTRACTION, BUILD YOUR OWN. `defi` hints include CHAIN SIGNATURES. [SOURCED] | Optionally add `defi` if the sale and 1Click ship. |
| 5 | "The live file has no explicit 'no pre-existing code' clause. Treat it as if it did." | Confirmed. Supporting signals: "Build your project during the hackathon"; "ship … between November 1st & Nov 14"; past NEAR rules required new work. [SOURCED] | Keep. Create the repo on Nov 1 and add a pre-hackathon disclosure to the README. |
| 6 | Missing: prizes, judges, rubric | Grand $55K plus $10K/$3K/$2K per track, paid in NEAR (was USDT on Oct 15). 7 human judges plus Claude Code & Codex. No rubric; past criteria are equally weighted. [SOURCED] | Add to the plan. Map the README to the five criteria. |
| 7 | Missing: X post mechanics | Mandatory; the human posts; must say "built at NEAR HACKATHON" and attach video or screenshots; `demoUrl` is required in the submission. [SOURCED] | Already in B7/B6 day 13. Add "post before submit" ordering. |
| 8 | B7 video 2:45 / B6 "Video under 3:00" | X non-Premium upload limit is 2:20. [SOURCED, secondary] | Cut the X version to ≤2:15, or confirm the posting account has Premium. |
| 9 | B7 step 3: `near account list-keys satchel.<team>.testnet …` → "see no full-access keys" | Returns the same empty table for a **non-existent** account; RPC returns `keys: []` with no error. [VERIFIED] | Replace with `near account view-account-summary` (shows the code SHA-256 and key counts, fails if the account does not exist) plus the curl pair. |
| 10 | B7 step 3: `near contract call-function as-read-only … nft_token json-args '{"token_id":"1"}' network-config testnet now` | Syntax correct with near-cli-rs 0.30.1. [VERIFIED] The default `testnet` connection's RPC was rate-limited from our IP. [VERIFIED] | Keep; add a "if you see 429, use `network-config testnet-fastnear`" note and the curl fallback. |
| 11 | B7 step 2: "Open `https://satchel-<team>.vercel.app/s/1` → see a Satchel holding testnet BTC and ETH." | AI fetchers see only the shell of client-rendered pages. [VERIFIED] | `/s/[id]` must be server-rendered with the facts in the HTML; add a JSON endpoint. (Hand to web.) |
| 12 | B7 step 4: "`pnpm i && pnpm test:contracts` → see sandbox tests pass (no keys)." | Heavy for judges (Rust 1.93 + wasm target + cargo-near + sandbox download). Codex cloud has no internet in the agent phase by default. [SOURCED/ASSUMED] | Keep as optional. Add recorded output and a public CI run, and fast offline unit tests. |
| 13 | B7 step 5: proof links | NearBlocks testnet lags 24 days; `rpc.testnet.near.org` is deprecated and throttled (429 after a small budget). [VERIFIED] | Pair each explorer link with an API/RPC check. Use `test.rpc.fastnear.com` or `near-testnet.drpc.org`. |
| 14 | B6 day 13: "Repo public, tag v1.0 · X post (human), submission JSON · Submitted" | Fine. Missing: the rules re-check, the offline payload validation, keeping the demo alive through Nov 18, and a code freeze after the deadline. | Add these to day 13 and 14. |
| 15 | Plan: "Submission: Nov 13 by 18:00 UTC. Nov 14 is buffer." | Consistent with the rules. | Keep. Note that Nov 14 ends at 23:59:00Z, and in EET the deadline falls in the early hours of Sunday Nov 15. |
| 16 | Part D: "Separate tracks … different names, emails, payout accounts and `requestId`s." | `requestId` must be one per submission, so separate is correct. Payout separation is optional. [SOURCED] | Keep. |
| 17 | Phase 0: "request the 1Click JWT" (Satchel) | Not a hackathon rule. pay owns this. | — |
| 18 | Not in plan | HACKATHON.md binds AI agents: no push, force-push, making public, signing or mainnet deploys without explicit human confirmation. [SOURCED] | Add a Nov 1 "standing approvals" note for Claude engineers (testnet signing and deploys, pushes to the private repo). |
| 19 | Not in plan | Circle's faucet gives "20 USDC on NEAR Testnet (claimable every 2 hours)" (docs.near.org/getting-started/hackathons). [SOURCED] | pay should evaluate it for S-8 (buy with USDC) instead of a self-made test token. |

## Open questions / human actions

**Human actions (who: Razvan or a team lead)**
1. **Create the mainnet payout account(s)** in a NEAR wallet (for example `<name>.near`) before Nov 13. The AI may not create or invent it. It is the Satchel team's own account.
2. **Decide the Satchel `projectName`, `leadName`, `email` and team size.** Check that `email` is one the team will monitor until payout.
3. **Check whether the X account that will post the demo has X Premium.** If not, the video must be ≤ 2:20.
4. **Ask the organizers** (NEAR Discord `https://discord.gg/nearprotocol`, which the X Article links as `https://discord.gg/RhZGHPXPf2`) and record the answers here:
   (b) Is building on testnet acceptable for all judging (mainnet only for the 1Click clip)?
   (c) Can one project win both a track prize and the grand prize, or place in two tracks?
   (d) Will separate terms (eligibility, KYC, tax) be published, and what is the NEAR conversion rate and date for prizes?
   (e) Are commits after the deadline ignored, or must the repo be frozen at the deadline?
   (f) How do AI judges run: do they have network access and run code?
5. **If anyone registered a team on the old Sep–Oct form**, tell the team which name and email were used. It is unlikely to matter (the current counter is 0, which suggests a separate store), but it rules out a 409 surprise.
6. **Run `research/spikes/hackathon/check_rules.sh`** on Nov 1, Nov 7 and Nov 13 before submitting.

**Answered by the 2026-10-29 HACKATHON.md (D-47):**
- Q-001: code from 2026-10-19 counts.
- Q-010: testnet is eligible in all tracks.
- Q-015 does not apply to Satchel (D-47). Repo URLs are unique, project names are not.
- Q-012: keep the hosted demo up to Nov 18, ideally Nov 25.
- Q-014: any licence plus a LICENSE file.
- Q-017: Claude Code and Codex screen (reproducibility, feature checks, preliminary score); humans decide.
- Prizes: $250k in total; grand prize $55k; 1st, 2nd and 3rd per track are $10k, $3k and $2k.

**Open questions (not answerable from published material)**
- Rubric and weights for this event; how AI and human scores combine; whether a shortlist exists.
- Whether the API checks that `projectUrl` and `demoUrl` are reachable or public at submission time.
- Exact email validation rule (uniqueness no longer applies: up to 2 submissions per email, D-47).
- Whether `nearAddress` must exist on mainnet at submission time (the regex only checks format).
- When `rpc.testnet.near.org` will be switched off for good. Today it is throttled: 200 at 11:28Z and 11:58Z, a deprecation 429 at 11:33–11:35Z. Ask web to monitor it.
- Whether NearBlocks testnet will catch up before November. Ask pay to monitor it.
