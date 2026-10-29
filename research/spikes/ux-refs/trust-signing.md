# UX references: trust, security, signing and handoff (`ux-trust`)

> Owner: design research, area `ux-trust` · Checked: 2026-10-21 (Phase 0) · Source: Mobbin, 29 searches (27 screen and 2 flow searches; iOS and web). One search returned no results; there were no tool errors.
> Scope: CleanHistory (report, verdict, Buy gate, "How to settle", "Verify these addresses"), the wallet approval and Review step, `SigningProgress`, "Signed, not sent", risk and irreversibility copy, the transfer review and handoff, FreezeBanner and quiet period, and error states.
> **Hard constraints honoured:** kb/90 §7.2–7.7 (statuses, gate modes, the badge's exact promise, browser-only gating, "1 of 2 sources" / H-25), §8.6 (stages; 15/20/60/150 s copy thresholds), §8.7 (retries reuse the nonce or inputs), §8.9 (measured numbers), §5.10–5.12 (freeze while listed, 250-block quiet period, **no** post-listing countdown, E-37), D-08 (soft guard only), D-12 (no relay), D-13 (no delegates), and approvals disabled in v1 (§5.11).
> Every screen below was opened and looked at. Descriptions are of the image, not the metadata. Links go to Mobbin; no images are stored in the repo.

---

## 1. Summary: the strongest patterns to adopt

1. **Lead with a verdict sentence, then the evidence, with the gated action right next to the verdict.**
   - [Polestar's car status](https://mobbin.com/screens/c0029cca-3635-4457-88b9-aebb38affec9) opens with "All good. No issues to report." and then lists checks with the result right-aligned.
   - [Graphite](https://mobbin.com/screens/43724524-d851-43d4-8272-721c43f8f032) states "Ready to merge: All CI and approval requirements have been met."
   - [GitLab](https://mobbin.com/screens/5e12f9b6-2f62-4363-ab08-130d054da0b7) puts the Merge button inside the same widget as the checks.
   - For Satchel: CleanHistory opens with one sentence in plain words, and **Buy sits directly under a compact gate line that repeats it**.
2. **Name each check by what it proves, and give it a one-line result.** [Base44's scan results](https://mobbin.com/screens/998517e6-54d5-46d0-9caf-76480e38f897) read like "Secrets: No exposed secrets found". Satchel's contract, account and signature checks should read the same way, e.g. "Contract keys: none since birth". Avoid icon-only ticks.
3. **Attach freshness and named sources to every verdict.**
   - [Lovable](https://mobbin.com/screens/249b76a6-5a99-48a3-823a-1158adade0d6): "Last scan: less than a minute ago". Its fix action is disabled with "Requires a current scan".
   - [ANZ Plus](https://mobbin.com/screens/f97469ad-a1bc-4b5a-a577-60a0adfec06a): "Checking the details with the Confirmation of Payee service."
   - [Better Stack](https://mobbin.com/screens/04a637bb-f2c3-4309-a47e-d912a00e7adc): a status row per service.
   - For Satchel this becomes "Checked in your browser 8 s ago", plus a per-chain Sources list that carries the "1 of 2 sources" caveat.
4. **Use a vertical stepper whose active row carries its own timer.** [Emergent's deploy list](https://mobbin.com/screens/dff53201-0975-445f-b0e1-75aa0353d9ba) highlights the active row with "04:29" next to it, under "It takes around 5-7 mins". [Wise](https://mobbin.com/screens/d7da9beb-2dd6-4e38-8efd-a08113f32614) and [Topper](https://mobbin.com/screens/cb2b7c34-808d-4778-89c0-f74d8ec60c2f) timestamp the finished steps. For Satchel:
   - finished steps change to past tense and show a clock time;
   - only the active step shows the m:ss timer;
   - the ETA sentence changes at 20, 60 and 150 s (kb/90 §8.6).
5. **The button the user pressed becomes the status.** Uniswap's "[Confirm in wallet](https://mobbin.com/screens/a619a575-5745-4ad8-978c-b25aaaa9bfc5)" turns into a disabled spinner button. Chime's "[Paying…](https://mobbin.com/screens/36840e42-67f7-4ef2-9663-d1d1b174324c)" fills like a progress bar. For Satchel, the Review stays on screen and the CTA reads "Approve in your wallet…" until the contract watcher sees the record.
6. **Account precisely for failures, and use conditional honesty where the system can't know.**
   - [Glow](https://mobbin.com/screens/dc7af07d-0e08-4954-a986-d9d9ff567218): "The transaction fee was still paid but no additional SOL, coins or NFTs were transferred."
   - [Zomato](https://mobbin.com/screens/2225c0f4-21e4-4ebb-a71f-1cf8aa070700): "*If* money was deducted… refund will be initiated within 24 hours."
   - This is how Satchel keeps the never-say-"no signature exists" rule (kb/70 F16) without sounding evasive.
7. **Make the transferred object the hero, and spell out the consequences for both sides.**
   - [Posh](https://mobbin.com/screens/9742a4eb-ff59-4987-913f-8517cae6dc5a) shows the ticket itself, with a Send / To stub attached.
   - [Revolut Business](https://mobbin.com/flows/65406c32-d2b9-41b6-b705-9ea200050edd): "X will become the Owner / Y will become an Admin".
   - [WhatsApp](https://mobbin.com/screens/27d7395c-b7ae-404f-a414-4782c16b3b6b): "You won't be able to…".
   - [Webflow](https://mobbin.com/screens/8938ea06-2743-400e-b73e-03dec7280ff5) names the recipient on the CTA.
8. **Show a freeze as a state on the object, with a sentence saying what's paused and what still works.**
   - [Neo](https://mobbin.com/screens/fe341538-82f2-4cf5-a435-39c4767d54bb): "Your card is frozen and cannot be used for purchases of any kind."
   - [Lloyds](https://mobbin.com/screens/5c38f411-da4d-4d7b-b940-c35d348fbb21): "Still allows cash machine withdrawals."
   - [DoorDash Dasher](https://mobbin.com/screens/731d968c-6684-49d4-9c6c-2e7c3435db04): "You won't get offers while you're paused."
   - For Satchel: "Signing paused while listed" with no countdown (E-37), what's paused, "Anyone can still fund it", and **Delist**.

---

## 2. Per Satchel screen and component

Each block lists the 2–4 best references, then what to borrow and where it lands in kb/80. "390" means the mobile layout. "Desktop" is the ≥ 1024 px layout: a 5-column sticky panel plus 7 columns of content (kb/80 §Wireframes). Send and Transfer are full pages in v1 (kb/90 §8.1), so the desktop dialog references inform a centred ~480 px column, not a modal.

### 2.1 CleanHistory: verdict block and the Buy gate
*Changes kb/80:* §Sale tab: visitor "Buy" · W3 · §FreezeBanner · CleanHistory (CleanHistory row) · §Sale flow › Clean-history aggregate · Copy deck `clean.*`

| Reference | What I saw | Why it is high quality |
|---|---|---|
| [Polestar: Car status](https://mobbin.com/screens/c0029cca-3635-4457-88b9-aebb38affec9) (iOS) | Black screen. Huge two-line verdict "All good. / No issues to report." Hairline rows with the label left and the result right ("Service: 300 days or 8740 mi", "Lights ✓", "12 V battery: Good"). A secondary white rectangular "Go to manual ↗" button | You can read the verdict in a second. Results are words or ticks, aligned like an instrument panel. It is monochrome dark and restrained, the closest match to "dark and metallic" |
| [Graphite: PR status rail](https://mobbin.com/screens/43724524-d851-43d4-8272-721c43f8f032) (web) | Stacked status cards: "✓ Ready to merge · All CI and approval requirements have been met.", "✓ Graphite Agent found no issues", "No status checks set up". The Merge action is in the header | The aggregate is phrased as *requirements met*, and each check is its own card. It is calm and precise |
| [GitLab: merge widget](https://mobbin.com/screens/5e12f9b6-2f62-4363-ab08-130d054da0b7) (web) | One bordered widget stacks "✗ Merge request pipeline #1445694666 failed · … for 017f5f7a just now", "Approval is optional", "✓ Ready to merge!", then the **Merge…** button *inside* the widget | The gate and its reasons live in one container. Each failure links its evidence id and gives a relative time |
| [1Password Watchtower: "All good!"](https://mobbin.com/screens/e4134218-8c44-4892-b6b1-fae75e5ce32c) (iOS) | "All good! Watchtower didn't find any items that need your attention **right now**." | "Right now" bounds the claim in time, which matters because the check repeats every 10 s. Take the copy, not the trophy and confetti (see §4) |

**Borrow, then apply to Satchel:**
- **Anatomy at 390 px:**
  - Verdict block: an eyebrow `CLEAN HISTORY` in `engrave`, then the verdict sentence in `h2` with a status glyph, then a meta line "Checked in your browser {t} ago · {n} signatures · Sources".
  - Then **Checks** (§2.2), then **Signatures** (§2.2), then the Buy panel.
  - Directly above **Buy**, a one-line **GateLine** repeats the verdict ("✓ Clean history · checked 8 s ago"), the way GitLab's "Ready to merge!" row sits on its button.
  - Desktop: the verdict and GateLine sit in the sticky left panel next to price and Buy; the full report goes in the right column.
- **Verdict copy per aggregate** (kb/90 §7.3; this replaces `clean.ok`, whose "{k} of {n} settled" is wrong once records are `expired` or `unfunded`):

| Aggregate | Verdict (`h2`) | Supporting line | Buy |
|---|---|---|---|
| checking | "Checking {n} past signatures…" | "Reading Bitcoin testnet4 and Ethereum Sepolia from your browser." | disabled, "Checking history…" |
| empty | "This Satchel has never signed anything." | "No signature from a previous owner can move these coins." | enabled |
| clean | "Clean. No past signature can move these coins." | "{k} settled · {e} expired · {u} unfunded · checked {t} ago" | enabled |
| clean, 1 of 2 sources (H-25) | same as clean | plus a `1 of 2 sources` chip in warning tint, linking to Sources (§2.3) | enabled, if H-25 allows |
| settling | "{n} signature is still settling." | "Spent in {txid}. Waiting for {k} more confirmation." | disabled, with the reason |
| blocked | "{n} past signature could still move coins." | the item line ("Nonce {n} not used yet" / "{txid}:{vout} unspent") + "The seller has to settle it first." | disabled, with the reason |
| unknown | "Can't verify {n} signature right now." | the cause: providers disagree, no answer, or more than 100 coins (kb/90 §7.5) + "Buying stays paused until it's checked." **Check again** | disabled |
| unsafe | "Unsafe: {reason}." | e.g. "This Ethereum address has delegated code." / "The contract has access keys." / "The contract code doesn't match the published build." | disabled, **no override** |

- **Re-check right before Buy** (kb/90 §7.5): when the buyer presses Buy, the CTA briefly reads "Re-checking history…" in place (the Uniswap pattern, §2.7) and then opens the wallet. If the verdict changed, the CTA disables and the new verdict announces itself (`role="status"`).
- No "I understand the risk" path exists, by design (see §4).

### 2.2 CleanHistory: checks and signature rows
*Changes kb/80:* §FreezeBanner · CleanHistory (CleanHistory props and states) · W3 rows · Copy deck `clean.item.*`

| Reference | What I saw | Why it is high quality |
|---|---|---|
| [Base44: Scan Results](https://mobbin.com/screens/998517e6-54d5-46d0-9caf-76480e38f897) (web) | One card per check: a status icon, a bold check name, and a **one-line result sentence** ("Secrets: No exposed secrets found", "Backend Functions: No unauthenticated backend functions found"). The failing card is red with "2 RLS recommendation(s) found, View recommendations". Toast: "Security scan complete" | Results are findings, not ticks, and failures carry the next action. It teaches the reader what was checked |
| [Tesla: Service history](https://mobbin.com/screens/a1ea4590-a32c-4634-94b0-5dd3e669e2af) (iOS) | Dark list. Each row has a glyph, a bold title, a sub-line and a status word ("Completed", "Resolved Remotely"), with the date right-aligned | A dense, scannable history in a dark palette, with status as a word. It is the closest "vehicle history" analog on Mobbin (Carfax isn't there) |
| [Trust Wallet: pending ETH send](https://mobbin.com/screens/ad69eb60-6926-4ad8-b26d-7a63407e2c35) (iOS) | Rows Date / Status "**Pending**" (amber word) / Recipient / Network fee / Confirmations "--" / **Nonce 41**, then "View on block explorer" | Technical evidence (the nonce) appears as a plain row. Satchel's EVM evidence *is* the nonce |
| [1Password: list grouped by verdict](https://mobbin.com/screens/f0dc40a5-1e3c-4698-b108-7f55eed340aa) (iOS) | Items under section headers per verdict, with a count ("2 Items"). There is also a [category menu](https://mobbin.com/screens/89f7f73e-e73a-40ae-bc7b-3bae8da82416) | Grouping by verdict puts problems first and collapses the noise |

Also seen: [Lovable's detected issues](https://mobbin.com/screens/249b76a6-5a99-48a3-823a-1158adade0d6). Its expandable rows carry a severity chip, a plain title, the technical id in mono (`NO_RLS_POLICIES_CONFIGURED`) and an explanation. It is a good expansion model; leave out its "Ignore issue" button.

**Borrow, then apply to Satchel:**
- **Checks, above the signatures.** These are the account and contract checks from kb/90 §7.2, each written as name plus result:
  - "Contract keys: none since birth (block {A})";
  - "Code: matches the published build";
  - "Ethereum address: no delegated code";
  - "Solana account: plain wallet".
  - With the `dev` role, add a warning row "DEV CONTRACT: lock and code checks skipped" (kb/90 §7.3).
- **Row anatomy (`CleanHistoryRow`)**, at 72 px:

  ```
  [Ξ] Ethereum · nonce 3                                   Settled
      Would send 0.0100 ETH to 0x53f9…1C2A
      Nonce 3 used by 0x8b…41 · 3 confirmations ↗
  ```
  - The title is the chain plus the record's key: nonce, outpoint or blockhash.
  - Line 2 is **what it would pay**, parsed from `unsigned_tx` / BTC outputs. BTC amounts come from the chain; otherwise they are suffixed "(claimed)" (kb/90 §7.3, R-23).
  - Line 3 is the evidence, with an explorer link.
  - The status is a word on the right, coloured per K2 (§5).
  - The row expands to show: signed at block and time (UTC) · requested by {account} · Sources (§2.3) · for BTC, "amount source: chain / claimed".
- **Grouping:** "Needs attention ({n})" first (Unused, Settling, Can't verify), then "Can't move coins ({n})" (Settled, Expired, Unfunded). Show 3 rows, then "Show all {n}" (kb/80 already has "Show all").
- **Unfunded rows** are neutral: `--fg-2` text and an info glyph, neither green nor red. They use kb/90's copy: "Spends coins that don't exist. If they ever appear at this address, the previous owner could move them; they're excluded from what you buy."
- **Owner view of the same rows** adds actions on Unused rows: **Broadcast now**, or the nonce-gap note (§2.5).

### 2.3 CleanHistory: checking state, freshness and "1 of 2 sources"
*Changes kb/80:* CleanHistory states (`checking`), §Data sources (Clean-history status, 10 s), Copy deck `clean.checking`, new `clean.checked` / `clean.sources.*`

| Reference | What I saw | Why it is high quality |
|---|---|---|
| [CRED: verification in progress](https://mobbin.com/screens/a206bc2a-be00-4d8b-aae8-536d97a3330b) (iOS) | Black. Small-caps eyebrow "VERIFICATION IN PROGRESS", headline, a trust chip "🔒 CRED does not store your data", then a stage label in caps "FETCHING QUESTIONS FROM BUREAU" over a thin progress line | Names the current stage. Premium dark type, with tracked caps like Satchel's `engrave`. The privacy reassurance sits right where the doubt arises |
| [ANZ Plus: Verifying account…](https://mobbin.com/screens/f97469ad-a1bc-4b5a-a577-60a0adfec06a) (iOS) | A brushed-metal shield. "Verifying account… Checking the details with the Confirmation of Payee service." | Names *who* is being asked. The metal frame motif is on-brand for Satchel |
| [Lovable: Security Scan](https://mobbin.com/screens/249b76a6-5a99-48a3-823a-1158adade0d6) (web) | An "Up-to-date" pill, "Last scan: less than a minute ago" and an **Update** button. At the bottom: "Requires a current scan — update scan first", with "Try to Fix All" disabled | Freshness is visible and refreshable. The action is gated on a *current* result, exactly Satchel's "only the browser result enables Buy" |
| [Better Stack: status page](https://mobbin.com/screens/04a637bb-f2c3-4309-a47e-d912a00e7adc) (web) | "All services are online · Last updated on…", then a per-service row with a status pill and an uptime bar | Per-source health is the honest way to show "1 of 2 sources" |

**Borrow, then apply to Satchel:**
- **Checking state:** rows render straight from `sig_records`, since the chains and count are known. Each row shows "Checking…" and resolves on its own, rather than one big spinner. The status word swaps in 160 ms (`--duration-base`), with no shimmer under reduced motion. The verdict names the sources: "Checking 4 past signatures against Bitcoin testnet4 and Ethereum Sepolia…" (ANZ).
- **Trust chip** (CRED): "Runs in your browser. Satchel's server isn't trusted for this." This matches kb/90 §7.5, where only the browser result enables Buy.
- **Two-phase verdict:** SSR renders the server hint, muted ("Server check {t} ago: clean"), with Buy disabled and "Waiting for your browser's check" (Lovable's "Requires a current scan"). The browser result then replaces the hint. AI judges still see the hint in HTML (kb/90 §8.1).
- **Freshness:** "Checked in your browser {t} ago · Check again". The 10 s re-check is silent; only *verdict changes* are announced.
- **Sources disclosure:** per chain, list the providers with ✓ or ✗ (Better Stack), e.g. "Bitcoin: mempool.space ✓ · mempool.emzy.de ✓". When H-25 applies, the verdict carries a `1 of 2 sources` chip, and the disclosure says "mempool.emzy.de didn't answer. This verdict uses mempool.space only. Allowed on testnet." Disagreement is never shown as "1 of 2": it is `unknown` and it blocks.

### 2.4 Hallmark, Verified balance and "Verify these addresses"
*Changes kb/80:* §FreezeBanner · CleanHistory (Hallmark row) · §Judge-first view (Verify disclosure) · Copy deck `hallmark.*`, `verify.*` · Open question 4 (assay stamp) and 6 (show derivation)

| Reference | What I saw | Why it is high quality |
|---|---|---|
| [Pinterest: Verified merchant sheet](https://mobbin.com/screens/46522884-5524-44d4-b4e3-d1f864ad2875) (iOS) | Tapping the badge opens a bottom sheet: a check icon, a large "Verified merchant", one sentence ("This retailer meets Pinterest's Merchant Guidelines"), then **Learn more** | A touch-first explanation of a badge, where a hover tooltip can't work. One sentence of definition |
| [eBay: Authenticity Guarantee](https://mobbin.com/screens/00045a1b-52a7-484e-8e4b-00c6ecdc1d61) (iOS) | A section title plus "Learn more", then 4 icon steps: "Make a purchase → Seller ships to eBay → Experts authenticate → eBay ships to you" | Explains *how* trust is produced, inline on the listing, in four glyphs |
| [Airtasker: badges](https://mobbin.com/screens/020508dc-1558-4a51-9ff0-ac606bf21468) (iOS) | "Police Check · Verified on Wednesday, 3 May 2023", "Digital iD · Verified on…" | Each badge carries a *verified on* date, so the claim is bounded in time |
| [Portrait: "Stats for nerds"](https://mobbin.com/screens/e850a968-e00d-423f-b8ad-63183c2680ea) (web) | A collapsed disclosure. It reveals "Stored at" with per-network links (Base Sepolia 0x7bf7…8d7a ↗, IPFS …, Filecoin: *pending*) and a plain guarantee: "nobody except the author can change the data on this page." | Proof sits one click away and never clutters the default view. A plain-language promise sits next to the raw ids |

Also used:
- The [Commons rating stamp](https://mobbin.com/screens/f9ef6acb-0ce5-416c-aab2-ff38656ac5b5): a circular "TOP RATED" stamp plus "has a Good rating because…". It supports the assay-stamp hallmark (Open question 4).
- [OKX "Locked assets"](https://mobbin.com/screens/a100a5dd-d63d-4f23-a58a-505b7ca1d6a4): "The estimated amount of 0.48 SGD has been temporarily locked and can't be used right now due to these reasons:" followed by a reason card. It is the model for excluded, *encumbered* BTC.

**Borrow, then apply to Satchel:**
- **Hallmark interaction.** Desktop keeps the hover and focus tooltip (WCAG 1.4.13). On touch, a tap opens a bottom sheet (Pinterest) containing:
  - the stamp;
  - `CLEAN HISTORY`;
  - kb/90 §7.7's promise **verbatim**;
  - "Checked {t} ago" (Airtasker);
  - a 3-glyph "How it works" (eBay): "Recorded on-chain before signing → Checked in your browser → Buy unlocks only if none can move coins";
  - a "What it doesn't cover" link to kb/90 §4's list.
- **VERIFIED BALANCE sheet:**
  - "Read from each chain {t} ago";
  - an exclusion line, OKX-style: "0.0005 BTC isn't included: an earlier signature can spend it (encumbered)";
  - "Unconfirmed deposits never count."
- **"Verify these addresses" as "Stats for nerds"** (Portrait), collapsed by default. Rows:
  - the contract (link);
  - "Keys: none since birth" (birth tx ↗);
  - "Code hash: matches the published build";
  - each derived address with an explorer link;
  - a guarantee sentence: "Anyone can re-derive these addresses. Only the current owner can get signatures for them."
  - This resolves kb/80 Open question 6 toward *showing* the inputs inside the disclosure (judge-friendly; the default view stays clean).

### 2.5 Seller pre-list check and "How to settle"
*Changes kb/80:* §Sale tab owner "Sell" (Ready / Blocked rows) · Copy deck `sell.blocked.*`, `sell.settle.*` · kb/90 §7.6, §5.12

| Reference | What I saw | Why it is high quality |
|---|---|---|
| [incident.io: "Go live" checklist](https://mobbin.com/screens/fafdfd29-02f9-4d8c-9b10-968732a53273) (web) | Dialog: "Before you go live, there are a few settings we recommend you review:". Rows marked ✓ get **Change**; rows marked ○ get **Setup**. Footer: Cancel / **Go live** | A pre-flight checklist with a fix action on each row, right before a public, consequential action |
| [Phantom: Deposit and withdrawal issues](https://mobbin.com/screens/646789e3-6a66-42d5-ae09-33688e7ba165) (iOS) | Dark sheet: "…may take up to 4 minutes… If your funds seem stuck… you can transfer or convert your balances below." Then a **Funds in Transit** table, a primary "Transfer all to Perps" and an "Advanced" disclosure | Self-serve recovery for a stuck state. The advanced path is tucked away |
| [Uber: Account checkup](https://mobbin.com/screens/bcdfcebe-bae1-49be-ad03-6ebb4aafa322) (web) | An accordion of checks: blue ⓘ means an action is recommended, green ✓ means done. The expanded item shows a card with a "why" sentence and a single **Add** button | One check, one reason, one action. Collapsed rows keep the list short |
| [Whop: Reserve](https://mobbin.com/screens/665c549f-5a6a-4fd1-bb81-0f5ce819f23f) (web) | The held amount, then accordions "How do reserves work?" and "How to get reserves removed" | The removal path sits next to the blocking amount |

**Borrow, then apply to Satchel:** replace the separate "Blocked: pending" and "Blocked: unused signature" states with one **"Before you list"** checklist (incident.io). Each row expands with a reason and a single action (Uber):

```
Before you list Satchel #3
◷ Quiet period      You can list in 143 blocks (~1 min 20 s)   ▰▰▰▱▱   (→ ✓ "No signature in the last 250 blocks")
✗ Past signatures   1 could still move coins                     How to settle ▾
     Ethereum · nonce 4 · not used yet        [Broadcast now]
     (or) Can't be broadcast yet: nonce 4 waits for nonce 3
✓ USDC              Registered                                   (or [Register · 0.00125 NEAR], kb/90 §5.12)
[ List for 250 USDC ]   disabled until every row is ✓
```
- Settle actions per kb/90 §7.6, phrased as fixes:
  - EVM: **Broadcast now**, only when the nonce is next. Otherwise show the nonce-gap note, and say that settling uses **every nonce up to {max}** (kb/70 §P6).
  - BTC: **Broadcast now**, or "Send these coins to this Satchel's own address".
  - SOL: "Wait about 2 minutes."
- Demo token #4 shows the nonce-gap row permanently. That is fine and honest.
- The quiet period is a row with an inline countdown (Vipps tone, §2.15), not a blocking screen. It reads `listable_at` from `satchel()` (kb/90 §5.14).

### 2.6 ReviewCard: before the wallet opens
*Changes kb/80:* §ReviewCard · W2 (left) · §Send (Review) · Copy deck `send.review.*` · kb/90 §8.5, §8.9

Satchel doesn't draw the wallet's own approval sheet: Meteor and Intear do. It owns the Review that comes before it and the waiting state (§2.7), so the Review should use the vocabulary the wallet will show next.

| Reference | What I saw | Why it is high quality |
|---|---|---|
| [Base (web): Review with "Asset changes (estimate)"](https://mobbin.com/screens/5c5a1976-d22a-451e-a95b-0a9812d92c0e) | "Review · Request from Base Account". A section **"Asset changes (estimate)"** shows −0.00002 ETH and $0.04 with a token icon. Then rows "Signing with 0x88AC…51aD", "Network: Ethereum", "Network fee (est.): $0.09 – $0.10" and "**New quote in: 26**". Cancel / Confirm | Separates the outcome from the parameters, labels estimates as estimates, and shows how fresh the quote is |
| [Coinbase Wallet: Send (dark)](https://mobbin.com/screens/79830745-5141-4a17-950e-2abafa1de52c) (iOS) | A card with "Bitcoin · $1.00 · 0.00000971 BTC", a ↓ arrow, then the recipient "bc1qfw…yec7". Rows: Wallet used, Network fee "$0.44 • 0.00000432 BTC", Total cost. Cancel / Confirm | A dark from→to card. Compact, with a clear direction |
| [Cash App: Withdraw to external wallet](https://mobbin.com/screens/3604f666-86b7-40e4-b624-e3f8733dd122) (iOS) | The headline is a sentence: "Withdraw $4.00 to external wallet". Rows: To, Amount, USD equivalent, **"Arrives in ~20m"**, Fees, Total. A one-line footnote "All bitcoin transfers are final." Back / **Confirm and send** | Best-in-class type hierarchy. It sets the BTC timing expectation *inside* the review, and states finality in one quiet line |
| [Family: Confirm transaction](https://mobbin.com/screens/efb3f375-645d-4d97-98cb-ab22e886f3e3) (iOS) | Dark. "Confirm transaction to 0xb249····9768". Fee estimate "$0.05 · Urgent ~15 Secs". A small line above the CTA: "Review the above before confirming. Once made, your transaction is irreversible." | Shows the time estimate next to the fee, and mentions irreversibility once, small, where the eye lands |

Also used:
- [Fuse](https://mobbin.com/screens/24550378-619c-4a21-b382-d56e464a96ff) adds a "**No previous sends**" chip on the recipient, inline with no modal.
- [Uniswap's "New address" sheet](https://mobbin.com/screens/97e9bb9e-11ec-4d6e-a93e-5827cfbe18c4): "You haven't transacted with this address before. Please confirm that the address is correct", with the address chunked.
- [Kraken](https://mobbin.com/screens/2ffd82a1-2182-444a-9585-600d4f53fa6a) chunks the address "0xb2 04b2 … 7f22 f48a" and warns "Only withdraw ETH to Ethereum network addresses".

**Borrow, then apply to Satchel** (390 px and the desktop 480 px column):

```
Send 0.0100 BTC                                     ← sentence headline (Cash App), h1
from Satchel #1 · Bitcoin testnet4
┌──────────────────────────────────────────┐
│ ₿ Satchel #1                 −0.0100 BTC │       ← from→to card (Coinbase Wallet)
│   ↓                                       │
│ tb1q 9x7k m2rd … y8sd   First send here  │       ← full address in groups of 4 · Fuse chip
└──────────────────────────────────────────┘
Changes to Satchel #1 (estimate)                    ← Base "Asset changes (estimate)"
  Recipient gets                 0.0100 BTC
  Network fee        ~282 sats · paid by this Satchel
  Satchel after                  0.0023 BTC
Timing                                               ← Cash App "Arrives in", Family "~15 Secs"
  Signing                usually about 10 seconds
  Confirmation           minutes to hours on testnet4
NEAR fee  ≈ 0.004 NEAR · your NEAR account (needs ≈ 0.1–0.3 NEAR free while signing; refunded)
Bitcoin transfers are final.                          ← one line (Cash App / Family)
[        Send 0.0100 BTC        ]
Your wallet will ask you to approve a request to satchel.<team>.testnet…
```
- The numbers come from kb/90 §8.9: MPC p50 6.7 s, so "usually about 10 seconds"; the BTC fee is ≈ 282 sats at 2 sat/vB; the NEAR fee line is verbatim. ETH confirmation is "about 12 seconds" (kb/80 `sent.note.evm`).
- **"First send here"** is computed from this Satchel's own `sig_records` (EVM `to`, BTC outputs) **[ASSUMED, S2]**. It is advisory and never blocks.
- **Buy review** uses the same "changes" framing as a two-sided exchange (Uniswap's "[You're swapping](https://mobbin.com/screens/a619a575-5745-4ad8-978c-b25aaaa9bfc5)", OKX's [convert confirmation](https://mobbin.com/screens/97e8f3b8-9c5e-4834-895c-b744fbc64933)):

  ```
  You pay   −250.00 USDC
  ↓
  You get   Satchel #3, controlling 0.0123 BTC · 0.0500 ETH (verified balance)
  ```
  Then the GateLine (§2.1), then **Buy for 250 USDC**.
- For SOL (P2), a refresh hint replaces the quote countdown ("New quote in: 26", Base / OKX "[Convert (7s)](https://mobbin.com/screens/97e8f3b8-9c5e-4834-895c-b744fbc64933)"). The blockhash refreshes every 10 s (D-09), so show nothing unless it fails.

### 2.7 "Approve in your wallet" (`awaiting_wallet`)
*Changes kb/80:* W2 · §SigningProgress steps · §State machines › SigningProgress (`awaiting_wallet`) · E1, E2

| Reference | What I saw | Why it is high quality |
|---|---|---|
| [Uniswap (web): "Confirm in wallet"](https://mobbin.com/screens/a619a575-5745-4ad8-978c-b25aaaa9bfc5) | "You're swapping" stays fully visible (amounts, fee, rate, slippage). The CTA becomes a disabled grey button with a spinner and the label "Confirm in wallet" | Context is preserved during the riskiest hand-off. The status lives where the user clicked |
| [Chime: "Paying…"](https://mobbin.com/screens/36840e42-67f7-4ef2-9663-d1d1b174324c) (iOS) | The review sheet stays. The CTA turns into a green progress fill (about 60%) labelled "Paying…" | The button doubles as a progress affordance. Calm |
| [Acctual (web): Awaiting wallet confirmation](https://mobbin.com/screens/84637b5d-c5bd-4c74-80aa-c0823c620de6) | A side panel titled "Awaiting wallet confirmation" with a spinner and a thin bar. Read-only transfer details sit below. A red line reads "Please do not close or refresh the browser" | Keeping the details read-only while waiting is right. The red warning text is the part to avoid (§4) |

**Borrow, then apply to Satchel:**
- On **Send**, keep the ReviewCard on screen with its inputs locked. The CTA morphs into a disabled button reading "◌ Approve in your wallet…". Under it, in `--fg-2`, show "Check the Meteor or Intear window." At 60 s, swap to `sign.wallet.slow`.
- Only when the contract watcher sees the record (kb/90 §8.6) does the view hand over to SigningProgress, so the transition itself signals "the wallet said yes".
- An Intear "Failed to send transaction 1: Timeout" is **not** a rejection: stay in this state, with no error flash. A rejection with no record within 10 s returns to the Review with `sign.cancelled` inline under the CTA.
- A popup block (E2) appears inline under the CTA, with **Try again** in the same place.

### 2.8 `SigningProgress`: signing → broadcasting → sent
*Changes kb/80:* §SigningProgress (Steps, Timer, A11y) · W2 (right) · §State machines › SigningProgress · Copy deck `sign.*`, `sent.note.btc`

| Reference | What I saw | Why it is high quality |
|---|---|---|
| [Emergent: Deployment in progress](https://mobbin.com/screens/dff53201-0975-445f-b0e1-75aa0353d9ba) (web) | Title "Your app will be live soon!" with "It takes around 5-7 mins. We'll notify you once done." Below it, a bordered step list in mono: ✓ done; the **active row tinted, with a spinner and a right-aligned elapsed timer "04:29"**; future steps as hollow circles | The current step and its elapsed time sit in one row, with the expectation stated up front. It is the closest analog to Satchel's machine |
| [Wise: transfer updates](https://mobbin.com/screens/d7da9beb-2dd6-4e38-8efd-a08113f32614) (iOS) | A vertical stepper. Done steps show a green timestamp over a first-person sentence ("We received your SGD"); the current step is bold with a filled dot; future steps are grey. Updates/Details tabs. **Cancel transfer** while it's still allowed. Completed state: [here](https://mobbin.com/screens/0e8e2a40-5a7b-4cc3-bcb2-f85932d08095) | The past is timestamped fact, the present is bold, the future is muted. Narrative and data are split |
| [Topper in Solflare: order status](https://mobbin.com/screens/cb2b7c34-808d-4778-89c0-f74d8ec60c2f) (iOS) | Dark stepper: "✓ Placed · 2:00:37 PM", "✓ Processed · 2:01:22 PM", "○ Completing · Your funds are on the way!", then an order id with copy | Dark palette, second-precision times, and the id one tap away |
| [Obvious: "Downloading 1 of 4"](https://mobbin.com/screens/53593cf0-2812-46da-8e35-981f8036d1a5) (web) | "Downloading 1 of 4 · Processing 'Kanban Board Data'" over a bar | The k-of-n sub-status pattern, used for "Signing 2 of 3 inputs" |

Also seen: [SoundCloud](https://mobbin.com/screens/cdaf74c3-e039-4276-ae2c-82025124ff20) adds "Powered by Dolby" next to its progress. That suggests an optional caption, "Signatures by NEAR Chain Signatures".

**Borrow, then apply to Satchel:**

```
Sending 0.0100 BTC                                  [Minimize]
Usually about 10 seconds.                    ← swaps at 20 / 60 / 150 s (kb/90 §8.6)
┌──────────────────────────────────────────────┐
│ ✓ Prepared                          14:02:11 │
│ ✓ Approved in your wallet           14:02:19 │
│ ◉ Signing with NEAR's signer network   0:07  │ ← tinted active row, its own timer
│   Signing 2 of 3 inputs  ▰▰▱                 │
│   NEAR transaction 7Gh…k2 ↗                  │ ← evidence on the step where it appears
│ ○ Broadcast to Bitcoin testnet4              │
│ ○ Sent                                       │
└──────────────────────────────────────────────┘
Keep this page open until it says Sent.
```
- **Labels flip tense when done:** "Approve in your wallet" becomes "Approved in your wallet", and so on. This follows Wise and Phantom's "Buying → Bought" (§2.9) and kb/80's one-verb rule.
- **Timer:** only on the active row, in tabular figures. **Done rows show a clock time** (Topper), with UTC in `title`. This is an exception to kb/80's relative-time rule, valid inside a flow only.
- **ETA line thresholds:** replace kb/80's 30/90 s notes with kb/90 §8.6. At 0–15 s show "Usually about 10 seconds." From 20 s show "Taking longer than usual." From 60 s show "Still working. The network allows up to about 2 minutes." From 150 s show "Still waiting for the network. We'll keep checking."
- **`sent` for BTC:** "In mempool. Testnet4 confirmations are irregular: minutes to hours." (kb/90 fix), plus "You can close this page. Activity keeps tracking it." This follows the Binance [Withdrawal Processing](https://mobbin.com/screens/01089d07-a4c1-4fb1-8c42-d21cae82d9da) pattern: an ETA, then "View history for the latest updates."
- **Errors attach to the failing row** (§2.16, the Neon pattern). The row turns `--danger` with its message and action inline, and the finished rows above stay visible.
- Use the vertical list at every width. Don't switch to a horizontal stepper on desktop: the 480 px column fits it, and it keeps one mental model.

### 2.9 Background signing: minimize, mini-bar and closing the page
*Changes kb/80:* §Satchel page layout ("Pending signature (this browser)") · §SigningProgress A11y ("Closing the modal while signing is allowed") · Copy deck `sign.closed`, `sign.relay`, `page.pending-mine`

| Reference | What I saw | Why it is high quality |
|---|---|---|
| [Phantom: "Buying $1 of USDT"](https://mobbin.com/screens/6915b149-3288-4218-97c4-562ad17da7ac) → ["Bought $1 of USDT"](https://mobbin.com/screens/566c7ed4-5c23-4d12-a642-ec969f823285) (iOS) | A small dark pill in the Dynamic Island position, with a progress glyph and a present-progressive label. It flips in place to a green check and past tense. Also ["Sent $1.00"](https://mobbin.com/screens/9da3bf28-bdef-4c74-a690-b074342ea921) | Tiny and persistent, and the state changes in the same spot. The tense flip carries the meaning |
| [WRITER: background toast](https://mobbin.com/screens/269c7d1c-02b9-4d4a-92fb-75ed3817bbbc) (web) | A dark bottom-right card with animated dots: "Deploying agent. This might take a few minutes" | Desktop background progress that sets an expectation without blocking |
| [Base44: scan in progress](https://mobbin.com/screens/4a18bfd3-4480-4beb-8b5f-8227ee274532) (web) | A progress dialog with a **collapse control next to close** | "Minimize" is distinct from "cancel" |

**Borrow, then apply to Satchel:**
- **While the state isn't terminal,** SigningProgress shows **Minimize**, not ✕. The kb/80 note "Closing the modal while signing is allowed" becomes "minimizing", so nobody fears they cancelled.
- **Mini-bar:**
  - On mobile, a pill under the TopBar: "◌ Sending 0.0100 BTC · 0:42", changing to "✓ Sent 0.0100 BTC" (Phantom).
  - On desktop, a bottom-right card (WRITER).
  - Tapping either reopens SigningProgress.
  - Only state changes are announced, through the existing `role="status"`.
- **`sign.closed` fixed for the no-relay reality** (D-12): "Signing continues on NEAR. Reopen Satchel #{id} to finish sending." Drop `sign.relay`. A reload or another device then shows "Signed, not sent" with **Broadcast now** (kb/90 §8.6, resume).

### 2.10 "Signed, not sent" → Broadcast again
*Changes kb/80:* §State machines › SigningProgress (`signed_not_sent`) · Copy deck `sign.notsent` · kb/90 §8.6 (resume), §8.7 (block new send) · E23

| Reference | What I saw | Why it is high quality |
|---|---|---|
| [Phantom: Funds in Transit](https://mobbin.com/screens/646789e3-6a66-42d5-ae09-33688e7ba165) (iOS) | "If your funds seem stuck…, you can transfer or convert your balances below.", a "Funds in Transit" table, one primary recovery action and "Advanced" | Self-serve recovery, framed as a normal state rather than an error |
| [Kraken: Sent · In progress](https://mobbin.com/screens/ae576518-621e-4104-a64e-759c78fe4f95) (iOS) | A receipt with Status "**In progress**" as a blue-tint pill, **Share**, and a red-tint "Cancel payment" | A pending item still offers its one relevant action |
| [OKX: Pending](https://mobbin.com/screens/041bd8cd-2428-4c1a-a8d7-c03f699cef4d) (iOS) | A header spinner with "Pending", the full To address with copy, "Network fee <0.000001 OKB", "Block confirmation 0" | The "< 0.000001" display rule matches Satchel's. The full address and copy are right where a user would check |

**Borrow, then apply to Satchel:**
- **A state card, not an error toast.** It uses warning tone, not danger.

  ```
  ⚠ Signed, not sent
  mempool.space isn't responding. The signed transaction is saved. Until it's broadcast
  or replaced, it counts as an unused signature.
  [ Broadcast again ]          Details ▾  (nonce 7 · 0.0100 ETH to 0x53f9…1C2A)
  ```
  For EVM, when the nonce isn't next, the button gives way to "Can't be broadcast yet: nonce {n} waits for nonce {count}" (kb/90 §7.6).
- **Show it in three places, until it's resolved** (the Phantom "in transit" idea):
  - the Satchel page banner;
  - the Activity row;
  - the owner's CleanHistory row ("Unused · Broadcast now").
- **New send while one is unsent** (kb/90 §8.7): an InlineAlert at the top of the Send form reads "You have an unsent signed transaction. Broadcast it or replace it.", with **Broadcast** and **Replace** actions. Replace keeps the same nonce or inputs.

### 2.11 Failures, timeouts and the never-say-"no signature exists" rule
*Changes kb/80:* §Error map (E1, E9, E11, E12, E22, E23) · Copy deck `sign.timeout`, `sign.cancelled`, `sign.sol.expired` · kb/90 §8.6 (`timed_out`), §8.7

| Reference | What I saw | Why it is high quality |
|---|---|---|
| [Glow: Transaction Failed](https://mobbin.com/screens/dc7af07d-0e08-4954-a986-d9d9ff567218) (iOS) | "Transaction Failed · This transaction didn't go through.", a timestamp, and an info line: "**The transaction fee was still paid but no additional SOL, coins or NFTs were transferred.**" Rows: Network Fee, Signature. "View Raw Transaction ↗" | An exact account of what moved and what didn't, with evidence. Honest without alarm |
| [Zomato: Payment failed](https://mobbin.com/screens/2225c0f4-21e4-4ebb-a71f-1cf8aa070700) (iOS) | "Payment of ₹0.90 failed · **If** money was deducted from card (**2652), refund will be initiated within 24 hours". **Retry payment** / Try another payment method | Conditional honesty where the system can't know, plus a concrete promise |
| [GoPay: payment failed](https://mobbin.com/screens/bfe3c74e-626b-45e9-809c-e67594c1a7d6) (iOS) | "Don't worry, your GoPay is not deducted. Please try again after some time." | Names the state of the user's money. Ignore the full-screen pink alarm (§4) |

**Borrow, then apply to Satchel.** Every failure card has the same structure:
1. **title** (what failed);
2. **what moved and what didn't** (Glow);
3. **a conditional line** for unknowns (Zomato);
4. **evidence link**;
5. **one primary action**.

Copy aligned to kb/90:
- `sign.timeout`: "The signer network didn't return a signature. Nothing was sent." Then the conditional (kb/70 F16): "If a signature still turns up, Clean history lists it as Unused until it can't be used." Then the reassurance from kb/90 §8.7, per chain:
  - EVM: "Try again reuses nonce {n}, so only one of them can ever go through."
  - BTC: "…reuses the same coins, so only one of them can ever go through."
  - SOL: "…waits until the old blockhash expires."
- `sign.cancelled` stays: "You cancelled in your wallet. Nothing was signed." This is true only because the state requires no record within 10 s (kb/90 §8.6).
- E12 / `unknown` (250 blocks): "Still waiting for NEAR to confirm. Check transaction {hash} on NearBlocks." with **Check again**. Never "failed".

### 2.12 Risk warnings and irreversible confirmations
*Changes kb/80:* §Sale tab visitor "Blocked" · Copy deck `clean.blocked` · §Send (Review) · §Accessibility 3.3.4

| Reference | What I saw | Why it is high quality |
|---|---|---|
| [Revolut Business (web): Review transfer](https://mobbin.com/screens/14836e01-df66-4ecf-83d0-9248b6b01cc5) | The **first** card on the review, on a dark surface: "Do you know and trust {name}? If you're unsure, don't pay them, since we may not be able to get your money back. Learn more" with ⚠ | Risk comes before details, on a surface card rather than a red flood. Specific and short |
| [Revolut: final sheet](https://mobbin.com/screens/e417be9d-5c9f-4028-9ec6-139d19373885) (iOS) | A dark sheet: "Are the payee and transfer details correct? Once confirmed, the payment can't be unsent", then **Send** (white) / "No, go back" | One last-chance sheet, kept to two lines |
| [Coinbase (web): Security banner](https://mobbin.com/screens/7fa8f944-702b-4488-8de9-e0423e91c7a7) | A tinted banner: "Your account needs work, upgrade to passkey", a reason sentence, then **Add passkey** · Learn more. A red "LESS SECURE" label next to the current method | The state, the reason and the fix in one block, with the risk labelled where it lives |
| [Chime: Confirm payment](https://mobbin.com/screens/55c01b3a-e6a4-4f34-be27-e94ca0091a21) (iOS) | Three short paragraphs ("…it's likely a scam… Once sent, your money can't be refunded."), then **Pay this person** / Back | The warning is short enough to actually be read |

**Borrow, then apply to Satchel:**
- **Buyer, `blocked`:** the danger-tint banner sits at the top of the Buy panel (Coinbase web anatomy):
  - title: "1 past signature could still move coins";
  - reason: "Nonce 4 isn't used yet. Until it is, whoever holds that signature can send 0.0100 ETH out of this Satchel.";
  - actions: **See the signature** (scrolls to the row) · "Why this blocks buying".
  - There is **no** override checkbox. kb/80's Rabby "Forbidden" stance stays.
- **Owner pre-list:** the same banner in the owner's voice, with **How to settle** (§2.5).
- **Irreversibility:** use one quiet line above the CTA ("Bitcoin transfers are final.", "This can't be undone. Only {account} can transfer it back."). Don't add a modal for each send. A final Revolut-style sheet is an option only for Transfer (Open question 2).

### 2.13 Transfer review (ownership handoff)
*Changes kb/80:* §Transfer · W4 F1 · §Role × status matrix (Signing row) · Copy deck `xfer.*` · kb/90 §5.10–5.11, D-08, R-18

| Reference | What I saw | Why it is high quality |
|---|---|---|
| [Posh: Confirm Details](https://mobbin.com/screens/9742a4eb-ff59-4987-913f-8517cae6dc5a) (iOS) | Dark. "Review the transfer to be sure it's correct". The **ticket artwork itself** is the hero, and its stub reads "Send · 1x RSVP / To · +1650…". "All Good, Let's Send" / Back | Shows the object instead of describing it. The stub is a lovely, legible device |
| [Revolut Business: Transfer ownership (flow)](https://mobbin.com/flows/65406c32-d2b9-41b6-b705-9ea200050edd) (iOS) | Dark. A radio list of people, then a sheet "Transfer account ownership?" with icon rows "{name} **will become the Owner**" and "{name} **will become an Admin** · Full access to all features and apps". Confirm / Cancel | States the role change for both sides in two rows |
| [WhatsApp (web): Transfer ownership](https://mobbin.com/screens/27d7395c-b7ae-404f-a414-4782c16b3b6b) | A large recipient avatar, "Transfer ownership to Sam Lee?", and consequence rows: "**You won't be able to** invite or dismiss admins…", "You'll remain an admin or choose to dismiss yourself" | States the giver's loss plainly, in the second person |
| [Webflow (web): Transfer site](https://mobbin.com/screens/8938ea06-2743-400e-b73e-03dec7280ff5) | "…Adobe Fonts will not transfer over. Once you transfer the site, you **will not** be able to make edits…". The CTA reads "**Transfer to alexsmith.mobbin@gmail.com**" | Says what goes with the transfer and what doesn't, and names the recipient on the CTA (WCAG 2.5.3-friendly) |

Also seen:
- the [Shopify transfer flow](https://mobbin.com/flows/f177e807-a39a-4249-9978-53efad49b6dd): "The new store owner will be able to:" as a list, then a "Transfer in progress" chip;
- [Maze](https://mobbin.com/screens/2c0bad91-7796-492a-b479-d4eea6f3382f): type-to-confirm;
- [Wix](https://mobbin.com/screens/bfe98b41-b291-4504-9796-441618298d93): a consent checkbox.

These heavier frictions suit org-level transfers. For Satchel, the typed account plus the wallet approval already give two confirmations.

**Borrow, then apply to Satchel** (W4 F1):

```
Transfer Satchel #1
╭── SatchelCard md (hero) ──╮
╰───────────────────────────╯
│ To  bob.testnet   ✓ Account found │          ← stub attached to the card (Posh)
(◉ bob)  bob.testnet will control everything in this Satchel        ← Revolut Business row
         0.0123 BTC · 0.0500 ETH. Its Bitcoin and Ethereum addresses go with it,
         so anything sent to them later is bob.testnet's too.
(◉ you)  You won't be able to send from it or get it back.            ← WhatsApp "You won't be able to"
(⟲)      Its signature history goes with it.                          ← Webflow "what transfers" (kb/90 §5.11)
⚠ A signature from 12 s ago is still in progress. If you transfer now,  ← D-08 soft guard, only when in flight
  it stays valid for anyone holding it.
This can't be undone. Only bob.testnet can transfer it back.
[      Transfer to bob.testnet      ]
```
- **Remove** "Approvals are cleared." (NEP-178 is disabled in v1, kb/90 §5.11) and the delegate line (cut, D-13).
- The D-08 soft guard **doesn't disable** the CTA, so the role matrix's "Transfer disabled while Signing" becomes "allowed, with a warning".
- The receiver guard (R-18) is an inline error under the account field: "You can't transfer a Satchel to {account}." It applies to the contract and the MPC account.

### 2.14 Handoff success and receipts
*Changes kb/80:* §Transfer (Success) · W4 F3–F4 · §FreezeBanner · CleanHistory (HandoffAnimation row) · §Motion spec (no change to the springs) · Copy deck `xfer.done`, `buy.done`

| Reference | What I saw | Why it is high quality |
|---|---|---|
| [GoHenry: transferred](https://mobbin.com/screens/e1ca6ae4-c7fd-4df4-9fc2-843b65ff21ef) (iOS) | "£1 transferred to {name}" and then "**{name}'s card balance is now £1**", with a big ✓ button | States the *recipient's resulting state*. That is exactly "bob.testnet now controls…" |
| [Wealthsimple: You sent](https://mobbin.com/screens/03537080-3a52-4b30-90f4-482c89dd47f8) (iOS) | The headline is a sentence: "You sent $5.00 to W…" with a ☕. Then a compact receipt card: From / To / Amount / Processing time "⚡ Instant" / Method / Date. **Done** | Restrained craft: a sentence first, then a receipt, with no confetti |
| [CRED: paying](https://mobbin.com/screens/3022db80-7bc3-4c58-b4ef-def0769ef1a5) (iOS) | Black. The sender's avatar and the receiver's avatar sit on a thin ring, with an animated "beam" between them. "PAYING {name} ₹1", then "initiating payment" | A directional two-party motion in a premium dark style, matching the HandoffAnimation's You → bob slots |
| [Solflare: Success](https://mobbin.com/screens/10886625-f794-483a-886f-449004a2947b) (iOS) | A **chamfered-square check tile**, "Success", and rows "Transaction ID ⧉" and "Explorer ↗". Save address / Close | The stamp-like chamfer matches Satchel's hallmark motif, and the evidence rows are one tap away |

Also seen: the [Sonos transfer flow](https://mobbin.com/flows/b9eae9a4-c081-4a8d-94de-ac51971004ad) ends on a calm sheet, "Transfer complete · Your system has been transferred to your new Sonos account."

**Borrow, then apply to Satchel:**
- Keep kb/80's ≈ 1.3 s choreography, which runs only after the final outcome.
- After the message ("bob.testnet now controls 0.0123 BTC and 0.0500 ETH.", validated by GoHenry), add a **receipt** (Wealthsimple / Solflare): From alice.testnet · To bob.testnet · NEAR transaction 7Gh…k2 ↗ · {date, UTC}.
- The success glyph is the **chamfered tile**, in the same geometry as the Hallmark (K3).
- No illustration or confetti (§4).
- The reverse handoff for Buy is "You now control {balances}." Its receipt adds the price, listing id and seller.

### 2.15 FreezeBanner and the quiet period
*Changes kb/80:* §FreezeBanner · CleanHistory (FreezeBanner row) · W3 (the FreezeBanner box) · §Sale tab owner/visitor · Copy deck `freeze.*`, `sell.*` (cooldown strings) · kb/90 §5.10, E-37

| Reference | What I saw | Why it is high quality |
|---|---|---|
| [Neo Financial: card frozen](https://mobbin.com/screens/fe341538-82f2-4cf5-a435-39c4767d54bb) (iOS) | A toast: "Your card is frozen and **cannot be used for purchases of any kind**." The card desaturates and gets a "❄ Frozen" chip. The primary tile is an inverted **Unfreeze card** | The state shows on the object, there's a scope sentence, and undo is one tap away |
| [Lloyds: Full freeze](https://mobbin.com/screens/5c38f411-da4d-4d7b-b940-c35d348fbb21) (iOS) | A toggle, then an info callout: "**Still allows** cash machine withdrawals." | Says what still works, which is the most neglected half of a freeze |
| [DoorDash Dasher: Dash Paused](https://mobbin.com/screens/731d968c-6684-49d4-9c6c-2e7c3435db04) (iOS) | "You won't get offers while you're paused" plus a consequence boundary ("If you pause for more than 35 minutes…") | A one-line scope for the pause |
| [Vipps: inline lockout](https://mobbin.com/screens/893a9846-5bae-4cc0-bc2c-76a9fff210f1) (iOS) | An inline line: "You've entered the wrong code too many times… try again in 5 minutes." | A temporary unavailability shown inline, with a time, in a humane tone. This is the model for the quiet period |

Also seen: [Up's vault countdown](https://mobbin.com/screens/b4aebe71-51d7-4c47-82d4-e60f0560fc2e) ("Unlocking in 0:53", "Cancel timer"). It is dark, crafted metal and useful as inspiration, but too heavy for a 2-minute wait.

**Borrow, then apply to Satchel:**
- **Owner banner:**

  ```
  ❄ Signing paused while listed
  No coins can leave Satchel #3 until you delist it or it sells. Anyone can still fund it.
  [Delist]
  ```
- **Buyer banner:**

  ```
  ❄ Signing paused while listed
  The seller can't sign anything new, so the history below is final for this listing.
  ```
  This is accurate: the quiet period exceeds the MPC yield window (kb/90 §5.12 rationale).
- **No countdown or progress bar on FreezeBanner** (E-37). The buyer's "Safe to buy in {n} blocks" and the owner's "Buyable in" strings go away.
- Keep the **card vivid** while listed: it is the product being sold. The "For sale" pill carries the state. Neo-style desaturation stays reserved for "sold" in seller history (kb/80 SatchelCard states).
- **Quiet period** (owner, before listing): an inline row in the pre-list checklist (§2.5), "You can list in {n} blocks (~{t})", with a thin `role="progressbar"`. It is Vipps-like inline, never a full screen. When done: "No signature in the last 250 blocks ✓".

### 2.16 System banners and error states (RPC down, provider down, gate-mode banners)
*Changes kb/80:* Copy deck `banner.rpc-down`, `banner.offline` · §Error map E11, E30 · §Satchel page layout ("RPC down at SSR") · kb/90 §7.3 (gate modes)

| Reference | What I saw | Why it is high quality |
|---|---|---|
| [incident.io: status write-up](https://mobbin.com/screens/1de9fe66-840e-4a34-9f3c-2df7bc36438b) (web) | One compact row: "Degraded performance • Ongoing for 2m • View the incident →" | The state, its duration and a link in one line |
| [Neon: Import data](https://mobbin.com/screens/7062eab1-79fa-422a-b458-8e0efe3ab1cf) (web) | The header reads "**Your source database remains untouched.**" The step card holds a nested error, "Cannot connect to the source database · …Please check… and try again.", with **Contact support** | The error is scoped to the step that failed, with a reassurance that nothing changed |
| [Dialpad: app-level strip](https://mobbin.com/screens/6f48b680-0e25-4201-bfef-5b979d0a7029) (web) | A full-width warning strip at the very top of the app ("You are not able to send external messages…") and a "Date last updated …" stamp | Persistent environment-level status that doesn't look like content |

**Borrow, then apply to Satchel:**
- **`banner.rpc-down`** becomes one line (incident.io): "NEAR testnet isn't responding · 2 min · Showing data from 14:02 · Retry". Addresses keep rendering (kb/80).
- **Gate-mode strips** (kb/90 §7.3): a Dialpad-style full-width strip under the TopBar. It is non-dismissible: "DEV CONTRACT: lock and code checks skipped" in warning tint, or "RELEASE CANDIDATE: testnet rehearsal" in info tint. There is none for `final`.
- **Provider down** never shows as a page error. It appears only as the `1 of 2 sources` chip, or as `unknown`, on the verdict (§2.3).
- **In flows, the error sits on the failed step** (Neon), together with the reassurance that matches the facts, e.g. E11 in a flow: "Can't reach NEAR testnet. Your funds haven't moved. Retrying…".

---

## 3. Industry-standard conventions observed across apps

- **The review comes before any irreversible move.** Across Coinbase Wallet, Cash App, Family, Base, Kraken, Trust Wallet, Binance and World App it has the same shape: a hero amount or sentence headline, then from → to, then fee (labelled "est." and often with a time estimate), then total, then one finality line, then a CTA naming the action.
- **Addresses are chunked and copyable on review and detail screens.** Seen in [Kraken](https://mobbin.com/screens/2ffd82a1-2182-444a-9585-600d4f53fa6a), [Uniswap's New address](https://mobbin.com/screens/97e9bb9e-11ec-4d6e-a93e-5827cfbe18c4), [OKX Pending](https://mobbin.com/screens/041bd8cd-2428-4c1a-a8d7-c03f699cef4d) and [Binance](https://mobbin.com/screens/5f99db5f-92dd-4d01-b841-b1dbc6fd7258). Binance adds a tag such as "My Wallet" under each address.
- **First-time recipients get flagged.** Usually it's inline ([Fuse](https://mobbin.com/screens/24550378-619c-4a21-b382-d56e464a96ff)); sometimes it's a sheet ([Uniswap](https://mobbin.com/screens/97e9bb9e-11ec-4d6e-a93e-5827cfbe18c4)).
- **Status is written as a word in a tinted pill, not just an icon:** "Pending" ([Trust Wallet](https://mobbin.com/screens/ad69eb60-6926-4ad8-b26d-7a63407e2c35)), "In progress" / "Completed" ([Kraken](https://mobbin.com/screens/ae576518-621e-4104-a64e-759c78fe4f95), [Kraken](https://mobbin.com/screens/10e6fcda-ce7f-4217-b11b-d2825bd00faf)), and "Frozen" / "Locked" chips on cards (Neo, Mercury, KOHO, PayPal).
- **Progress uses a vertical stepper:** done steps show ✓ and a timestamp, the active step is emphasized, future steps are hollow. Seen in Wise, Topper and Emergent. **Waits come with a stated expectation**: "It takes around 5-7 mins" (Emergent), "Arrives in ~20m" (Cash App), "~15 Secs" (Family), "Send time: less than a minute" ([Coinbase web](https://mobbin.com/screens/bae98b68-ca25-4cda-a4dc-2cf3d17dd355)).
- **The action button becomes the waiting state:** "Confirm in wallet" (Uniswap), "Paying…" (Chime), "Confirming…" ([Base](https://mobbin.com/screens/729b8463-bbc5-4ef0-a58c-b833985dfcb2)).
- **Background tasks collapse to a persistent pill or toast that flips tense** (Phantom, WRITER).
- **A freeze is reversible in one tap and shown on the object:** Unfreeze tiles or toggles in Neo, Mercury, KOHO, PayPal, Airwallex and Lloyds.
- **Badges are explainable on tap and dated:** Pinterest, Airtasker, eBay.
- **Ownership transfer names both parties.** The consequences come as a list, often in the "will be able to" / "won't be able to" form. The CTA repeats the action, and sometimes the recipient (Webflow, Revolut Business, WhatsApp, Shopify, Whop, Rows).
- **Crypto exchanges add one-time education interstitials before on-chain sends.** Examples: [Binance](https://mobbin.com/flows/4d6db478-6145-4733-8bb5-eefd42483382) "Protect Your Assets On-Chain", [Coinbase](https://mobbin.com/screens/063f1aad-dc7a-4b45-96bf-dae60b56ac66) "Before you send". Satchel should keep this inline in the Review instead: demo time and judges matter more than a blocking sheet.

---

## 4. Anti-patterns: what to avoid

| Anti-pattern | Examples seen | Rule for Satchel |
|---|---|---|
| A blank full-screen spinner, with or without a "do not reload" threat | [UNIQLO](https://mobbin.com/screens/539dd47d-42d5-486e-8ffe-0c1fee1ef2b9), [StubHub](https://mobbin.com/screens/4e0d4893-dfd9-447e-a850-b2b2fe2c36da), [Circle](https://mobbin.com/screens/4d77259e-badc-485e-8715-edbab4611875), [Shopee security check](https://mobbin.com/screens/bc16265c-fa8a-4b15-939f-c977997cff46) | Always show *which* step and *how long* is normal. State persists and resumes (kb/90 §8.6), so never threaten. "Keep this page open until it says Sent." is the only keep-open line, and it is a fact (no relay) |
| Alarm styling for a normal wait | [Acctual](https://mobbin.com/screens/84637b5d-c5bd-4c74-80aa-c0823c620de6)'s red "Please do not close or refresh the browser" | Use `--fg-2` for guidance. Reserve `--danger` for things that are actually wrong |
| Raw payload hex as the approval content (blind signing UX) | [OKX Approve](https://mobbin.com/screens/29f3154a-7edd-4ac3-a5ba-d23eabe7740c) shows a "Data 0x095ea7b3…ffff" blob under an "access to all your funds" warning | Satchel never shows payloads (kb/80 copy rules). The contract refuses raw hashes anyway (kb/70 §TL;DR 1). Review shows the decoded outcome only |
| "I understand the risks" overrides on a hard block | [OKX](https://mobbin.com/screens/d4d6ac31-b40e-479d-b27e-f78f9dc99ffd), [Zing](https://mobbin.com/screens/f8afac35-6a4d-46cf-85b4-c3fcec7a0b1a), [Base](https://mobbin.com/screens/dfd120e0-c3d6-431f-837d-a7f195df9fcb). Liability shifting: [Crypto.com](https://mobbin.com/screens/62a74313-968a-4391-bef5-e380f305f4f1) | `blocked`, `settling`, `unknown` and `unsafe` disable Buy with **no** override. The UI is the only enforcement (kb/90 §7.3), so it must not leak |
| An "Ignore issue" escape on a security finding | [Lovable](https://mobbin.com/screens/249b76a6-5a99-48a3-823a-1158adade0d6) | Fine for dev tools. Wrong for a gate guarding someone else's money |
| A wall of warning text | [Binance Scam Risk Warning](https://mobbin.com/screens/b68d5283-5730-422d-b607-cf9e992a4b0d), [Marcus](https://mobbin.com/screens/8d89f129-098d-42e8-a625-cf8be0b9628c) | One to three short sentences, specific to *this* risk (Chime, Revolut) |
| Scores and gamification for a binary safety property | [1Password's score 961](https://mobbin.com/screens/bb785e76-767f-4cb8-a630-b24217469a23), its [trophy and confetti](https://mobbin.com/screens/e4134218-8c44-4892-b6b1-fae75e5ce32c), [Careem's celebration](https://mobbin.com/screens/f365fe09-0799-4cfd-87e2-fe4ac2f3a06a) | Clean history is a gate, not a grade: no gauge, no percentage, no confetti. The handoff motion is the one celebratory moment |
| A success glyph on a non-final state | [World App](https://mobbin.com/screens/e4bb22ae-adf1-46d5-b3aa-2aaddb65aa81): a big green ✓ over "Send processing" | Use ✓ only for `sent` / `confirmed` / a settled row. "In mempool" uses the info tint, not success |
| Badge soup | [Temu](https://mobbin.com/screens/d1f4d565-0977-420d-bea0-372beb086857), [Yami](https://mobbin.com/screens/20ce45bb-0726-4b57-a930-5963fb651717) | Two hallmarks maximum (Verified balance, Clean history), each explainable on tap |
| Vague errors | [Snoonu](https://mobbin.com/screens/3999a458-0206-408f-a3e9-d3669304e347): "Oops! Transaction cancelled" | Name what failed and what did or didn't move (§2.11) |
| Drag-only confirmation | [Glow](https://mobbin.com/screens/9bd21aac-3239-4a2f-920a-42689ae858e9) "Slide to Send", [Solflare](https://mobbin.com/screens/662009cf-ee36-4e6c-beae-ed706f64fba2) "Slide to approve" | It fails WCAG 2.5.7 without a single-pointer alternative. Satchel's named CTA plus the wallet approval are enough friction |

---

## 5. Concrete change list for kb/80 and kb/81

IDs are for the synthesizer. Rows marked **(constraint alignment)** bring kb/80 in line with kb/90 or the decisions where my area touches them; they are not Mobbin-derived, but the merged spec breaks without them.

### kb/80-ux-spec.md
| ID | Section | Change | References |
|---|---|---|---|
| T1 | §FreezeBanner · CleanHistory (CleanHistory row) · W3 | Restructure CleanHistory into **Verdict** (eyebrow, sentence, freshness and sources meta) → **Checks** (contract and account) → **Signatures** (grouped "Needs attention" / "Can't move coins") → **Sources** disclosure. Props: `status: 'spent'\|'expired'\|'unfunded'\|'settling'\|'unused'\|'unknown'`; aggregate adds `unsafe` and `settling`; add `wouldPay`, `amountSource: 'chain'\|'claimed'`, `sources[]`, `checkedAt` | [Polestar](https://mobbin.com/screens/c0029cca-3635-4457-88b9-aebb38affec9), [Base44](https://mobbin.com/screens/998517e6-54d5-46d0-9caf-76480e38f897), [1Password grouped](https://mobbin.com/screens/f0dc40a5-1e3c-4698-b108-7f55eed340aa), [Tesla](https://mobbin.com/screens/a1ea4590-a32c-4634-94b0-5dd3e669e2af) |
| T2 | §Sale flow › Clean-history aggregate · Copy deck `clean.*` | Replace the aggregate table and copy with §2.1's verdict table. Fix `clean.ok`: "settled" is wrong when items are expired or unfunded. Add `clean.settling`, `clean.unsafe.*`, `clean.checked`, `clean.sources.one`, `clean.unfunded` (kb/90 wording), `clean.recheck`. **(Constraint alignment: kb/90 §7.3 statuses; E-09 removes "Incomplete")** | [Graphite](https://mobbin.com/screens/43724524-d851-43d4-8272-721c43f8f032), [1Password "All good"](https://mobbin.com/screens/e4134218-8c44-4892-b6b1-fae75e5ce32c) |
| T3 | §Sale tab: visitor "Buy" · W3 | Add a **GateLine** directly above Buy that repeats the verdict. Re-check before Buy with an in-button "Re-checking history…". The disabled reason stays linked via `aria-describedby`. No override, ever. Desktop: verdict, GateLine and Buy go in the sticky left panel | [GitLab](https://mobbin.com/screens/5e12f9b6-2f62-4363-ab08-130d054da0b7), [Lovable "Requires a current scan"](https://mobbin.com/screens/249b76a6-5a99-48a3-823a-1158adade0d6), [Uniswap](https://mobbin.com/screens/a619a575-5745-4ad8-978c-b25aaaa9bfc5) |
| T4 | CleanHistory states (`checking`) · §Data sources | Rows render immediately and resolve one by one. The verdict names the chains being read. Trust chip: "Runs in your browser". Two-phase: SSR hint (muted, Buy disabled) → browser result. Announce only verdict changes | [CRED](https://mobbin.com/screens/a206bc2a-be00-4d8b-aae8-536d97a3330b), [ANZ](https://mobbin.com/screens/f97469ad-a1bc-4b5a-a577-60a0adfec06a), [Lovable](https://mobbin.com/screens/249b76a6-5a99-48a3-823a-1158adade0d6) |
| T5 | CleanHistory (new Sources disclosure) | Per-chain provider rows with ✓/✗, plus a `1 of 2 sources` chip on the verdict when H-25 applies. Disagreement means `unknown`, never "1 of 2". **(Constraint alignment: kb/90 §7.2, H-25)** | [Better Stack](https://mobbin.com/screens/04a637bb-f2c3-4309-a47e-d912a00e7adc) |
| T6 | Hallmark row · Copy deck `hallmark.*` | Touch: tap opens a bottom sheet with the stamp, kb/90 §7.7's promise **verbatim** (replacing kb/80's shorter tooltip), "Checked {t} ago", a 3-glyph How it works and a "What it doesn't cover" link. Verified-balance sheet lists exclusions (encumbered, unconfirmed) | [Pinterest](https://mobbin.com/screens/46522884-5524-44d4-b4e3-d1f864ad2875), [eBay](https://mobbin.com/screens/00045a1b-52a7-484e-8e4b-00c6ecdc1d61), [Airtasker](https://mobbin.com/screens/020508dc-1558-4a51-9ff0-ac606bf21468), [OKX Locked assets](https://mobbin.com/screens/a100a5dd-d63d-4f23-a58a-505b7ca1d6a4) |
| T7 | §Judge-first view (Verify) · `verify.*` · Open question 6 | Turn "Verify these addresses" into a "Stats for nerds"-style disclosure: contract, keys since birth, code hash match, each derived address with an explorer link, and a guarantee sentence. Recommend *showing* the derivation inputs inside it | [Portrait](https://mobbin.com/screens/e850a968-e00d-423f-b8ad-63183c2680ea) |
| T8 | §Sale tab owner "Sell" · `sell.blocked.*`, `sell.settle.*` | Replace the Blocked states with one **"Before you list"** checklist. Rows: quiet period (inline countdown, `listable_at`), past signatures (with **Broadcast now** or the nonce-gap note), and USDC registration. List stays disabled until every row is ✓. **(Constraint alignment: kb/90 §5.10 quiet period replaces `pending_signs`; §7.6; kb/70 §P6 "every nonce up to {max}"; SOL "about 2 minutes")** | [incident.io](https://mobbin.com/screens/fafdfd29-02f9-4d8c-9b10-968732a53273), [Uber](https://mobbin.com/screens/bcdfcebe-bae1-49be-ad03-6ebb4aafa322), [Phantom recovery](https://mobbin.com/screens/646789e3-6a66-42d5-ae09-33688e7ba165) |
| T9 | §ReviewCard · W2 · `send.review.*` | Changes:<br>• a sentence headline;<br>• a from→to card;<br>• "Changes to Satchel #1 (estimate)";<br>• a **Timing** block ("Signing: usually about 10 seconds"; BTC "Confirmation: minutes to hours on testnet4"; ETH "about 12 seconds");<br>• the NEAR fee line verbatim from kb/90 §8.9;<br>• a "First send here" chip [ASSUMED, S2];<br>• a one-line finality notice above the CTA.<br>Buy review uses "You pay / You get". **(Constraint alignment: kb/90 §8.9 fee and latency numbers)** | [Base web](https://mobbin.com/screens/5c5a1976-d22a-451e-a95b-0a9812d92c0e), [Coinbase Wallet](https://mobbin.com/screens/79830745-5141-4a17-950e-2abafa1de52c), [Cash App](https://mobbin.com/screens/3604f666-86b7-40e4-b624-e3f8733dd122), [Family](https://mobbin.com/screens/efb3f375-645d-4d97-98cb-ab22e886f3e3), [Fuse](https://mobbin.com/screens/24550378-619c-4a21-b382-d56e464a96ff) |
| T10 | §SigningProgress (Steps) · W2 · §State machines (`awaiting_wallet`) | "Approve in your wallet" happens **in place on the Review**: the CTA morphs into a disabled "Approve in your wallet…" with a hint, and SigningProgress takes over only when the record is seen. Intear's "Timeout" doesn't flash an error. Cancel returns `sign.cancelled` inline | [Uniswap](https://mobbin.com/screens/a619a575-5745-4ad8-978c-b25aaaa9bfc5), [Chime](https://mobbin.com/screens/36840e42-67f7-4ef2-9663-d1d1b174324c), [Acctual](https://mobbin.com/screens/84637b5d-c5bd-4c74-80aa-c0823c620de6) |
| T11 | §SigningProgress (Timer, A11y) · `sign.mpc.*` | Changes:<br>• Replace the 30/90 s notes with kb/90's 15/20/60/150 s ETA lines, in one ETA slot under the title.<br>• Show the timer only on the active row.<br>• Done rows switch to past tense and show a clock time (UTC in `title`; an in-flow exception to the relative-time rule).<br>• Evidence links appear on the step where they become known.<br>• Errors render on the failed row.<br>• Optional "Signatures by NEAR Chain Signatures" caption.<br>The live region announces only the threshold lines. **(Constraint alignment: D-16)** | [Emergent](https://mobbin.com/screens/dff53201-0975-445f-b0e1-75aa0353d9ba), [Wise](https://mobbin.com/screens/d7da9beb-2dd6-4e38-8efd-a08113f32614), [Topper](https://mobbin.com/screens/cb2b7c34-808d-4778-89c0-f74d8ec60c2f), [Obvious](https://mobbin.com/screens/53593cf0-2812-46da-8e35-981f8036d1a5) |
| T12 | §SigningProgress (A11y "closing allowed") · §Satchel page layout (pending mini-bar) · `sign.closed`, `sign.relay` | **Minimize** replaces ✕ while non-terminal. Mini-bar: a top pill on mobile and a bottom-right card on desktop, with a tense flip. `sign.closed` becomes "Signing continues on NEAR. Reopen Satchel #{id} to finish sending." Delete `sign.relay`. **(Constraint alignment: D-12, no relay)** | [Phantom pill](https://mobbin.com/screens/6915b149-3288-4218-97c4-562ad17da7ac) → [done](https://mobbin.com/screens/566c7ed4-5c23-4d12-a642-ec969f823285), [WRITER](https://mobbin.com/screens/269c7d1c-02b9-4d4a-92fb-75ed3817bbbc), [Base44](https://mobbin.com/screens/4a18bfd3-4480-4beb-8b5f-8227ee274532) |
| T13 | §State machines (`signed_not_sent`) · `sign.notsent` · E23 | A state card in warning tone: **Broadcast again**, the EVM nonce-gap variant, and Details (nonce or inputs). It appears on the Satchel page banner, in Activity and in the owner's CleanHistory row. The Send form shows kb/90 §8.7's InlineAlert with Broadcast / Replace | [Phantom](https://mobbin.com/screens/646789e3-6a66-42d5-ae09-33688e7ba165), [Kraken](https://mobbin.com/screens/ae576518-621e-4104-a64e-759c78fe4f95), [Trust Wallet](https://mobbin.com/screens/ad69eb60-6926-4ad8-b26d-7a63407e2c35) |
| T14 | §Error map · `sign.timeout` | Every failure card follows the same structure: title → what moved and what didn't → a conditional line → evidence → one action. `sign.timeout` takes kb/90's text, plus the F16 conditional and the per-chain "reuses nonce {n} / the same coins" reassurance. **(Constraint alignment: kb/90 §8.6–8.7; never "no signature exists")** | [Glow](https://mobbin.com/screens/dc7af07d-0e08-4954-a986-d9d9ff567218), [Zomato](https://mobbin.com/screens/2225c0f4-21e4-4ebb-a71f-1cf8aa070700), [GoPay](https://mobbin.com/screens/bfe3c74e-626b-45e9-809c-e67594c1a7d6) |
| T15 | §Sale tab visitor "Blocked" · `clean.blocked` | A danger-tint banner at the top of the Buy panel: a specific title, a one-sentence reason naming the nonce or outpoint and the amount it could move, and **See the signature**. No checkbox | [Coinbase web](https://mobbin.com/screens/7fa8f944-702b-4488-8de9-e0423e91c7a7), [Revolut Business](https://mobbin.com/screens/14836e01-df66-4ecf-83d0-9248b6b01cc5), [Chime](https://mobbin.com/screens/55c01b3a-e6a4-4f34-be27-e94ca0091a21) |
| T16 | §Transfer · W4 F1 · `xfer.*` · §Role × status matrix | Changes:<br>• The card is the hero, with a "To" stub attached.<br>• Two rows for the two sides ("will control everything…", "You won't be able to…").<br>• "Its Bitcoin and Ethereum addresses go with it…".<br>• "Its signature history goes with it."<br>• Delete "Approvals are cleared." and the delegate line.<br>• The D-08 soft guard warns but doesn't disable Transfer while Signing.<br>• Add the R-18 receiver error copy.<br>**(Constraint alignment: kb/90 §5.10–5.11, D-08, D-13, R-18)** | [Posh](https://mobbin.com/screens/9742a4eb-ff59-4987-913f-8517cae6dc5a), [Revolut Business flow](https://mobbin.com/flows/65406c32-d2b9-41b6-b705-9ea200050edd), [WhatsApp](https://mobbin.com/screens/27d7395c-b7ae-404f-a414-4782c16b3b6b), [Webflow](https://mobbin.com/screens/8938ea06-2743-400e-b73e-03dec7280ff5) |
| T17 | §Transfer (Success) · W4 F4 · `xfer.done`, `buy.done` | Keep the message and add a receipt (From, To, NEAR transaction ↗, time). The success glyph is a chamfered tile. No confetti or illustration | [GoHenry](https://mobbin.com/screens/e1ca6ae4-c7fd-4df4-9fc2-843b65ff21ef), [Wealthsimple](https://mobbin.com/screens/03537080-3a52-4b30-90f4-482c89dd47f8), [Solflare](https://mobbin.com/screens/10886625-f794-483a-886f-449004a2947b), [CRED](https://mobbin.com/screens/3022db80-7bc3-4c58-b4ef-def0769ef1a5) |
| T18 | §FreezeBanner · W3 · `freeze.*` · `sell.*` cooldown strings · `buy.err.*` cooldown | The owner banner gets scope, a "still works" line and **Delist**. The buyer banner says "the history below is final for this listing". **Delete** the countdown, the `progressbar`, `freeze.owner` / `freeze.buyer` / `freeze.done`, "Buyers can buy after a {n}-block cooldown", and "The cooldown isn't over yet". **(Constraint alignment: E-37)** | [Neo](https://mobbin.com/screens/fe341538-82f2-4cf5-a435-39c4767d54bb), [Lloyds](https://mobbin.com/screens/5c38f411-da4d-4d7b-b940-c35d348fbb21), [DoorDash Dasher](https://mobbin.com/screens/731d968c-6684-49d4-9c6c-2e7c3435db04) |
| T19 | `banner.rpc-down` · E11 · E30 · gate modes | `banner.rpc-down` becomes one line with duration and Retry. Gate-mode strips under the TopBar (`dev`, `rc`). In flows, errors render on the failed step with the matching reassurance | [incident.io](https://mobbin.com/screens/1de9fe66-840e-4a34-9f3c-2df7bc36438b), [Neon](https://mobbin.com/screens/7062eab1-79fa-422a-b458-8e0efe3ab1cf), [Dialpad](https://mobbin.com/screens/6f48b680-0e25-4201-bfef-5b979d0a7029) |
| T20 | §Reference patterns | Replace the "Mobbin was unavailable" note with this file's picks (Mobbin links). Keep the Rabby, LI.FI and OpenSea help-centre rows for behaviour that Mobbin can't show (Rabby is not in Mobbin) | this file |

### kb/81-design-tokens.md
| ID | Section | Change | Basis |
|---|---|---|---|
| K1 | §Status (UI feedback), new "Banner surfaces" | Banner fill = the status colour at **8%** over the host surface. Border = the status colour at 32% (**decorative**: 1.78–2.22:1, so the icon and words carry the meaning). Computed with the WCAG 2.x formula; the throwaway script is not committed, so re-run it in `tokens_table.mjs`. Worst text case: `--fg-muted` on warning-over-`--surface-2` at **5.00:1**. All other text is ≥ 5.04:1 (Appendix B) | verdict, blocked, signed-not-sent and gate-mode banners |
| K2 | §Status (UI feedback) | Map clean-history item statuses:<br>• Settled and Expired: `--success`.<br>• **Unfunded: `--fg-2` with an info glyph** (non-blocking but not "green").<br>• **Settling: `--info`.**<br>• Unused: `--danger`.<br>• Can't verify: `--warning`.<br>• **Unsafe: `--danger` + a solid icon**.<br>• "In mempool": `--info`, never `--success` (World App anti-pattern) | kb/90 §7.3 |
| K3 | §Radii (or a new "Motif") | A shared **chamfer** for the Hallmark stamp and the success tile. Proposal: a 45° corner cut of 6px at 24–32px glyph size, scaling to 12% of the edge; 1px `--metal-lo` outline | [Solflare tile](https://mobbin.com/screens/10886625-f794-483a-886f-449004a2947b), [Commons stamp](https://mobbin.com/screens/f9ef6acb-0ce5-416c-aab2-ff38656ac5b5) |
| K4 | §Typography | Verdict role: `h2` (20/26) at 390 px → `h1` (24/30) at ≥ 1024 px, with a status glyph. The eyebrow uses `engrave`. Step clock times use `small` with `tabular-nums` in `--fg-muted` | [Polestar](https://mobbin.com/screens/c0029cca-3635-4457-88b9-aebb38affec9), [CRED](https://mobbin.com/screens/a206bc2a-be00-4d8b-aae8-536d97a3330b) |
| K5 | §Motion tokens | Row-resolve swap = `--duration-base` (160 ms), stagger ≤ 40 ms, instant under reduced motion. Tense flip on the mini-bar = a 160 ms cross-fade. The CTA → "Approve in your wallet…" morph = `--duration-fast` (120 ms) label swap, with no width animation (avoids layout shift) | §2.3, §2.7, §2.9 |

---

## 6. Open questions for the design lead

1. **How heavy is the verdict?** Should it be `h2` at 390 px (recommended) or the expanded `display` face? kb/81 allows one expanded line per view, and the judge H1 already uses it on `/s/[id]`.
2. **Should Transfer get a final sheet** in the Revolut style ("can't be undone") on top of the Review and the wallet approval? Recommendation: **no**. The typed account plus the wallet approval are already two confirmations, and the sheet costs demo seconds. Keep one finality line above the CTA.
3. **Should the Review preview what the wallet will show** ("a request to satchel.<team>.testnet, method `sign_for`, deposit ≈ 0.005 NEAR")? It improves recognition when Meteor or Intear opens, but adds jargon. Recommendation: put it in a "What your wallet will show" disclosure.
4. **Should the card change while listed** (frost or desaturation, as Neo and Airwallex do)? Recommendation: **keep it vivid**, because it's the product on sale, and let the "For sale" pill and the banner carry the state.
5. **What colour is Unfunded:** neutral `--fg-2` (recommended) or green? It doesn't block Buy, but the coins are excluded, and green would over-promise.
6. **Should SigningProgress credit the signer** ("Signatures by NEAR Chain Signatures", SoundCloud-style)? It supports the hackathon narrative; it costs one caption line.
7. **"First send here" chip:** P1 (needs recipient parsing from records in the browser; S2 time) or P2?
8. **Clock times on finished steps:** absolute times (recommended inside flows) break kb/80's relative-time rule. Confirm the exception.
9. **Where does the desktop Buy layout put the full report?** Right column, with the verdict and GateLine mirrored in the sticky left panel (recommended), or everything in one column?
10. **Hallmark on touch:** a bottom sheet (recommended, Pinterest) or a popover? It is the same content as the desktop tooltip.

---

## 7. Mobbin usage notice (verbatim)

The Mobbin tool attached this notice to every result from the 14th call onward:

---

**Your Mobbin AI usage is high this month**

Usage is unlimited during beta. If your usage stays at this level, you may need to purchase more credits once limits take effect. [View usage and plan options](https://mobbin.com/settings/billing-and-usage)

---

## Appendix A. Search log (29 calls; every call used `output_destination: "doc"` and the shared `task_intent`)

| # | Tool · platform | Query (abridged) | Kept |
|---|---|---|---|
| 1 | screens · ios | Phantom transaction approval sheet with estimated balance changes | Phantom Review Send, pending/done toasts |
| 2 | screens · ios | wallet signature request with simulation and risk warning | Family, Base, Kraken, World App; OKX (anti) |
| 3 | screens · ios | MetaMask confirm transaction, estimated changes | Coinbase Wallet, Fuse, Trust Wallet skeleton, OKX countdown |
| 4 | screens · web | Rabby sign transaction with simulation (Rabby not in Mobbin) | Base web, Uniswap, Revolut Business, Coinbase web, Acctual |
| 5 | screens · ios | Wise transfer status tracking | Wise updates and details |
| 6 | screens · ios | payment processing taking longer than usual | CRED, H&M; UNIQLO/StubHub (anti) |
| 7 | flows · ios | sending crypto to an external wallet | Binance, Brave, MoonPay flows |
| 8 | screens · ios | 1Password Watchtower report | Watchtower grouped list, "All good"; score (anti) |
| 9 | screens · web | Google security checkup | **0 results** |
| 10 | screens · web | security checkup checklist pass/fail | Base44, incident.io, Uber, Coinbase web, Lovable |
| 11 | screens · ios | vehicle history report (Carfax not in Mobbin) | Polestar, Tesla |
| 12 | screens · ios | authenticity guarantee / verified badge | eBay, Pinterest, Airtasker, Commons; Temu/Yami (anti) |
| 13 | screens · web | transfer ownership confirmation | Webflow, WhatsApp, Maze, Wix, Whop, Rows |
| 14 | screens · ios | money sent success | Wealthsimple, GoHenry, Kraken, Solflare; World App (anti) |
| 15 | screens · ios | frozen card banner and unfreeze | Neo, Lloyds, Mercury, KOHO, PayPal |
| 16 | screens · ios | transaction failed, no money taken | Glow, Zomato, GoPay; Snoonu (anti) |
| 17 | screens · ios | Ledger Live confirm on device (not in Mobbin) | Uniswap New address, Binance, Trust Wallet |
| 18 | screens · web | waiting for signature in wallet | Base web SIWE review, Dropbox (mostly e-sign noise) |
| 19 | screens · ios | high-risk scam warning interstitial | Revolut, Chime; OKX/Zing/Base/Binance/Crypto.com (anti) |
| 20 | screens · ios | send NFT collectible review | Posh, Cash App, Base "Confirming…", Kraken |
| 21 | screens · web | proof of reserves, verify inclusion | Portrait "Stats for nerds", OKX Locked assets, Whop |
| 22 | screens · web | minimized background progress panel | Obvious, SoundCloud, Base44 minimize, WRITER |
| 23 | screens · ios | pending crypto tx with speed up/cancel | Phantom Funds in Transit, Topper, Trust Wallet, Kraken, OKX, Cash App, Binance |
| 24 | screens · web | degraded service banner, stale data | incident.io, Better Stack, Neon, Dialpad |
| 25 | screens · web | PR merge box gated by checks | Graphite, GitLab, Emergent, Devin |
| 26 | screens · ios | action unavailable with countdown | Vipps, DoorDash Dasher, Up |
| 27 | flows · ios | transferring ownership to another person | Revolut Business, Sonos, Shopify flows |
| 28 | screens · ios | sender and recipient avatars transfer animation | CRED, Chime, GoHenry |
| 29 | screens · ios | security scan checking items one by one | CRED, ANZ Plus, Lovi; generic spinners (anti) |

Not found in Mobbin: Rabby, Ledger Live, Google Security Checkup, Carfax/Carvana, Apple Safety Check. The closest high-quality analogs above stand in for them.

## Appendix B. Contrast of the proposed banner surfaces (K1)

These were computed with the WCAG 2.x relative-luminance formula. Fill = status colour at 8% over the surface; values are text-to-fill contrast ratios.

| Surface | Status | Fill | `--fg` | `--fg-2` | `--fg-muted` | status text | Border 32% vs surface |
|---|---|---|---:|---:|---:|---:|---:|
| `--surface-1` | success | `#162322` | 14.82 | 8.37 | 5.55 | 9.41 | 2.14 (decorative) |
| `--surface-1` | warning | `#23211C` | 14.72 | 8.31 | 5.52 | 9.91 | 2.22 (decorative) |
| `--surface-1` | danger | `#241B1F` | 15.36 | 8.67 | 5.75 | 6.65 | 1.78 (decorative) |
| `--surface-1` | info | `#1A202A` | 14.98 | 8.45 | 5.61 | 7.92 | 1.99 (decorative) |
| `--surface-2` | success | `#1C2B2A` | 13.46 | 7.60 | 5.04 | 8.55 | 2.15 (decorative) |
| `--surface-2` | warning | `#2A2924` | 13.34 | 7.53 | **5.00** | 8.98 | 2.22 (decorative) |
| `--surface-2` | danger | `#2A2327` | 14.05 | 7.93 | 5.26 | 6.08 | 1.79 (decorative) |
| `--surface-2` | info | `#202832` | 13.63 | 7.69 | 5.10 | 7.21 | 1.99 (decorative) |

At a 10% fill, `--fg-muted` drops to 4.79–4.91:1 on `--surface-2` for success, warning and info, which is still a pass but with a thinner margin. **8% is recommended.**
