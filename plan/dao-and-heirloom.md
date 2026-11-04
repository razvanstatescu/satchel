# DAO ownership and Heirloom (inheritance): research and implementation plan (2026-11-04)

> **Status (2026-11-04): open proposal, not a decision.** Nothing here is built or approved. The H-27…H-34 and D-53/D-54 numbers are proposed only: `plan/1click-convert-fund.md` proposes different questions under the same H numbers, and `plan/decisions.md` ends at D-52 and H-26.

> **Status:** proposal for Razvan. Nothing is implemented. The decisions needed are in §9 (proposed H-27 to H-34).
> **Scope:** exactly two features, which also work together:
> 1. **DAO ownership:** a Satchel owned by an entity (a Sputnik DAO, or any NEAR account that can make contract calls)
>    works with every feature we ship today.
> 2. **Heirloom:** native inheritance with check-ins, guardians, an owner-cancellable waiting window and a claim by the
>    heir. It is the official `open` track example, built into the Satchel contract.
>
> **Inputs (all of this session's research):**
> - Our code: contract `lib.rs`, `sign.rs`, `allowance.rs`, `sale.rs`, `offers.rs`, `inside.rs`, `types.rs`,
>   `events.rs`; the sandbox suite `tests/tests/*`; `contracts/mock-signer`; web `SatchelPage.tsx`, `lib/signing/*`,
>   `lib/data/*`.
> - Specs and plans: kb/90 §INV (INV-01…INV-37), D-29.
> - Live testnet and mainnet view calls; Sputnik v3.31, v3.2 and v2.0 source; Trezu, NEAR Treasury and
>   core-contracts source.
> - Inheritance products: Casa, Bitkey, Nunchuk, Liana, Bron, Argent, Candide/Safe, Rhinestone, ERC-7878, Tokenbound.
> - The Certora audit of the Safe recovery module, and the Codehawks InheritanceManager contest.
> - The live HACKATHON.md and the track prompt examples.
>
> Scratch evidence (scripts, decoded transactions, downloaded wasm and source) lives in the session scratchpad, not
> the repo.

## 0. Summary

- **DAO ownership needs no contract change.**
  - Every owner check is `predecessor_account_id == owner`. A DAO executing an approved proposal *is* the predecessor.
  - On testnet, a Sputnik DAO can already own a Satchel and call every owner method through FunctionCall proposals.
  - What's missing is in **the app**: a "DAO mode" to build proposals, vote with the right gas, track them and
    broadcast the resulting signature. It also needs a few **rules** so nothing gets stuck:
    - SOL goes through an allowance, never a vote;
    - one pending EVM send per chain;
    - offer expiry longer than the voting period;
    - never vote after the deadline;
    - always attach 300 Tgas to a vote.
- **Heirloom needs a contract change** (new state under its own storage prefix, so the dev contract redeploys in
  place). Its design follows the products that already ship inheritance:
  - **Only the owner keeps it alive.** Any owner action is a check-in, and a delegate's spending is not.
  - **Two waiting windows:** a short one when k-of-n guardians approve, and a long solo one. Lost or hostile guardians
    therefore can't block or force anything.
  - **The owner can cancel until the transfer happens.**
  - **The heir must accept the nomination first.**
  - **Selling, giving or transferring wipes the Heirloom.**
  - **Claims are bound to a config epoch.**
  - **The heir receives a quiet Satchel** that passes clean history.
- **They work together:**
  - a DAO can be the owner (each executed proposal is a check-in);
  - a DAO can be the heir, which is the right way to split between several heirs;
  - a DAO can be a guardian.

  Heirloom is also the backstop for a DAO that loses quorum.
- **Hackathon fit:**
  - Heirloom answers the `open` prompt point by point (§3.1, §3.8).
  - DAO ownership strengthens `nfts` ("NFTs as accounts … carry access rights") and gives a real-world entity story.
- **Effort:** about 12–13 dev-days across four parallel lanes, Nov 5–12.
  - The Heirloom contract must be merged by the **Nov 8 12:00 UTC cut rule**, or the Nov 10 birth moves (H-30).
  - **Prerequisite:** the MPC 3.18.0 version check in the birth preflight (§7, WP0).

---

## 1. Research findings: DAO ownership

### 1.1 Why it works (verified)
| Fact | Evidence |
|---|---|
| Every owner path checks `env::predecessor_account_id() == owner`:<br>• `sign_for`, through `authorize_signer`;<br>• `nft_transfer`, `list`, `delist`;<br>• `set_allowance`, `revoke_allowance`;<br>• `accept_offer`, `withdraw_near`, `withdraw_ft`. | `lib.rs` L275, `sale.rs` L88 and L133, `allowance.rs` L566 and L618, `offers.rs` L277, `inside.rs` L47 |
| The receiver guard accepts DAO accounts. It refuses only the contract itself, the MPC and USDC. | `lib.rs` `ensure_receiver` |
| Sputnik executes a `FunctionCall{receiver_id, actions[{method_name,args,deposit,gas}]}` as **one receipt from the DAO account**:<br>• the deposit comes from the DAO balance;<br>• the inner call's predecessor is the DAO;<br>• our excess-deposit refunds go back to the DAO;<br>• gas refunds go to the voter. | Sputnik source `proposals.rs`; live testnet txs |
| `sputnikv2.testnet` is live, and its default code (v3.31, hash `AA4nA45v…`, commit `7764926`, 2024-08) has the failure callback: if our call panics, the proposal becomes **Failed** (bond kept), and **Finalize** before expiry re-executes it. | factory `get_contracts_metadata`; source |
| **The legacy factory `sputnik-v2.testnet` deploys v2.0 code (hash `ZGdM2T…`) with no failure callback.** A failed call there still shows **Approved**. | live; v2.0 source |
| Testnet and mainnet allow **1 PGas per transaction** (protocol 88 and 87). | `EXPERIMENTAL_protocol_config` |
| Sputnik DAOs export **no `nft_on_transfer` or `ft_on_transfer`**:<br>• give a Satchel to a DAO with a plain `nft_transfer` (our `nft_transfer_call` is disabled anyway, D-07);<br>• a DAO must be `storage_deposit`-registered with USDC before it can receive USDC. | DAO wasm exports |
| Precedent: DAOs already hold NFTs on NEAR (`marmaj.sputnik-dao.near` owns a Mintbase NFT). | mainnet view |

### 1.2 Sputnik facts that shape the design
- **Creating a DAO** (`sputnikv2.testnet.create`): deposit ≥ 5.397 NEAR (use 6 NEAR), 150 Tgas. A DAO uses about 540 KB
  of storage, so fund it beyond the 6 NEAR for `sign_for` deposits. The tx result is `true` on success; `false` means it
  was refunded.
- **Thresholds:** `threshold: [n,d]` means *more than* n/d, so `[2,3]` of 3 members is **3 of 3**. Use `[1,2]` or the
  fixed `"2"` for a 2-of-3 council.
- **`add_proposal`:** the deposit must equal `proposal_bond` **exactly**; it returns the proposal id.
- **`act_proposal`:**
  - A non-final vote burns about 2.3 Tgas.
  - The **final** vote (or an executing Finalize) needs about 3.1 Tgas + Σ action gas + a 10 Tgas callback, all
    static.
  - If the vote carries too little gas, the receipt panics and **the vote is not recorded**; the proposal stays open.
  - **Always attach 300 Tgas and keep action gas ≤ 280 Tgas.**
  - **Always pass the `proposal` kind.** Testnet v3.31 ignores it; mainnet v3.2 requires it and rejects unknown
    arguments.
- **Expiry:** a proposal expires when `now > submission_time + proposal_period`.
  - **A vote cast after the deadline is recorded, sets Expired and keeps the bond**; a later Finalize then fails.
    **The UI must block votes after the deadline.**
  - Finalize before casting another vote refunds the bond.
- **Failure vs timeout:**
  - **Failed** (our method refused, for example `ERR_FROZEN`, a nonce gap, or `ERR_QUIET_PERIOD`) → Finalize re-runs it
    while the proposal is still live.
  - **An MPC timeout ends Approved**, because `on_signed` never panics. The record shows `failed` and no signature.
    It needs a new proposal, or a `retry_sign` (WP-H, optional).
  - **The vote tx returns nothing useful:** `act_proposal` returns `()`. The truth is in our `SigRecord`s.
- **Detecting a DAO:**
  - Compare `view_account.code_hash`, or `global_contract_hash` for new mainnet DAOs, with the known hashes below.
  - Fall back to a `get_policy` probe, since DAOs can upgrade themselves.
  - `version()` is useless: v3.31 and v3.2 both return "2.3.1".

| Network | Version | Code hash |
|---|---|---|
| testnet | v2.0 (legacy) | `8RMeZ5cXDap6TENxaJKtigRYf3n139iHmTRe8ZUNey6N`, `ZGdM2TFdQpcXrxPxvq25514EViyi9xBSboetDiB3Uiq` (`sputnik-v2.testnet`) |
| testnet | 3.0 / 3.1 / 3.2 / 3.3 | `783vth3F…`, `49J3TShw…`, `12wLinsP…`, `xJQXQqHW…` |
| testnet | **3.31 (default)** | `AA4nA45vauiac3jdVwJTzSdUP3oj2r1fDaPAb2mHdgcH` |
| mainnet | **3.2 (default, `proposal` argument required)** | `DtHZA1mUmGYeScEaUoUZYQGGFHSMpnjMCvkr5U9hJXuF` |

### 1.3 The platform landscape (does it only work with Sputnik?)
**No.** Our contract has no Sputnik-specific code. Any account that can make a FunctionCall *as itself*, with a chosen
deposit and gas, can own a Satchel.

| Platform | Status | Can own a Satchel? | Notes |
|---|---|---|---|
| **Sputnik DAO** (contract) | live: testnet v3.31 (5,399 DAOs), mainnet v3.2 (2,070) | ✅ **primary target** | No hosted UI on testnet, so we build the propose and vote flow ourselves |
| **Trezu** (NEAR DevHub, on Sputnik) | active, **mainnet only** | ✅ | Its **Trezu Wallet connector for near-connect** turns any dApp's `signAndSendTransaction` into a proposal. That would make our app usable on mainnet almost unchanged (§4.6). It votes at a fixed 300 Tgas. |
| NEAR Treasury | deprecated ("switch to Trezu") | ✅ | Its custom function-call form works; votes at a fixed 300 Tgas |
| AstroDAO | dead (2023) | — | — |
| **multisig2** (core-contracts) | the contract works; the testnet factory `multisignature.testnet` **fails every create since 2024-05** | ✅ | Deploy it directly with no access key. `add_request_and_confirm` → `confirm`; the final confirmation executes the call and returns `sign_for`'s result. No expiry. Phase 2 (§4.7). |
| House of Stake | mainnet; veNEAR governance | ❌ for teams | 14-day votes, a 14-day timelock, a 100 NEAR bond |
| Safe on Aurora + XCC | Safe{Wallet} supports Aurora mainnet only | ✅ in principle | The Safe's `<hex>.aurora` sub-account makes NEAR calls with deposit and gas |
| AI-agent voters | any account can vote in Sputnik | ✅ | An agent can be a council member |

**Precedent check:**
- Trezu's "Chain Signature" proposals and `omni-cli-rs` let a DAO sign other chains' transactions by calling the MPC
  directly with **raw hashes**. The real transaction lives only in the description, which is blind signing.
- NEAR's "multichain DAO" tutorial (`abstract-dao.testnet`) instead hashes **structured** EIP-1559 transactions
  on-chain, as Satchel does.

What Satchel adds:
- voters see exactly what they approve;
- the treasury can be handed over or sold with clean history;
- allowances mean not every send needs a vote.

---

## 2. Research findings: Heirloom (inheritance)

### 2.1 What shipping products do

| Product | What keeps it alive or starts a claim | Periods | Guardians | Cancel | Notifications | Heirs |
|---|---|---|---|---|---|---|
| Casa | The recipient requests at any time | 6-month verification | — (Casa holds a key) | Owner, at any time | Monthly | 1 |
| Bitkey | An *Active* (accepted) beneficiary claims | 6 months | — | Owner, until approved | Regular alerts | 1 |
| Nunchuk | A timelock the owner rolls forward | Timelock 1–2 years recommended; 7 or 30 day buffer | Optional trustee | Owner, during the buffer | Repeated reminders, yearly review | Phased splits |
| Liana | A relative timelock per coin; "refresh" by moving coins | Tiered recovery paths | A later tier is the safety net | Refresh | GUI reminders | Multisig per path |
| **Bron** | The beneficiary starts | **12 months, or 6 with 2 guardian codes** | Guardians **shorten** the wait and can cancel | Owner, guardian, beneficiary | Start, joins, cancel, **7 days before the end** | Several; joint approval |
| Argent | A guardian triggers an "escape" | 7 days; expires after one more period | Trigger | Owner overrides | SMS, email, push | — |
| Candide (Safe) | k-of-n guardians confirm, bound to a nonce | 3 min (testnet only) / 3 / 7 / 14 days | Approve | **Any guardian or threshold change cancels a pending recovery** | — | 1 |
| Rhinestone DeadmanSwitch | **Any** execution, session keys included | One timeout | — | — | — | 1 nominee |
| ERC-7878 | An executor announces | Moratorium ≥ 30 days | Executors | Owner or any executor | — | Single inheritor |

### 2.2 Failure modes we must design out (sources: the Certora audit of the Safe recovery module, Codehawks 2025-03, products)
1. **An owner path that forgets to reset the clock.** This was the Codehawks finding: heirs could claim early. **Use
   one helper on every owner path, and a test that lists every owner method.**
2. **Something other than the owner keeps it alive.** Rhinestone counts session keys. **Delegate (allowance) spending
   must not count.**
3. **Delegates keep spending during a claim.** **Pause allowances while a claim is pending.**
4. **The seller's heir claims a sold Satchel.** **Every ownership change wipes the Heirloom.**
5. **A typo in the heir account, or a lost or deleted account.** **The heir must accept the nomination** (Bitkey's
   "Active", Bron's "join") **and finishes in person.**
6. **A pending claim survives a config change, or stale approvals are reused** (Certora L-03, I-07, L-04). **Claims
   carry the config epoch, approvals are a bitmask inside the claim, and any change cancels.**
7. **A deadline race** (Certora I-04). **The owner always wins until the transfer has happened.** Windows use strict
   `<` and `≥`. NEAR timestamp drift is seconds.
8. **Lost guardian keys, or a hostile guardian.** **Guardians can only shorten the wait.** The solo path still works
   without them. A guardian can't veto, can't approve alone, and can't be the heir.
9. **An owner who is alive but offline.** **A long inactivity period plus a waiting window plus reminders. Check-in is
   one cheap transaction, and any owner action counts.**
10. **A claim griefing the owner's listing or sale.** **Starting a claim delists** (that listing is older than the
    inactivity period). Relisting is owner activity and cancels the claim.

### 2.3 The official `open` prompt (verbatim requirements)
> Build an inheritance account. One NEAR account controls the owner's addresses on Bitcoin and Ethereum through Chain
> Signatures. The owner checks in on a schedule. If they miss check-ins for 90 days, a set of guardians can approve
> releasing the assets to named heirs, after a waiting period the owner can still cancel.
> - The release rules live in a contract and anyone can read them.
> - The owner can cancel any pending release until the waiting period ends.
> - A demo on testnet with the timers shortened to minutes.
> - A README section on failure cases: lost guardian keys, a guardian who turns hostile, an owner who is alive but
>   offline.
>
> Before building, argue against this idea for one paragraph. Then tell me which of your objections the design must
> answer.

The repo's README says: "Keep the requirements and the checkpoint." Our checkpoint paragraph is §3.8.

---

## 3. Heirloom design (contract spec draft → `docs/specs/C8-heirloom.md`)

### 3.1 Model
- **Roles:**
  - the **owner** (the NFT owner);
  - **one heir** (any account: a person, an implicit account, a DAO or multisig for splits);
  - up to **5 guardians** with a threshold `k`.

  The heir can't be a guardian. Neither the heir nor a guardian can be the owner, the contract, the MPC or USDC.
- **Activity = any owner-authenticated call:**
  - `sign_for` *by the owner*, `list`, `delist`, `nft_transfer`;
  - `set_allowance`, `revoke_allowance`, `accept_offer`, `withdraw_*`, `withdraw_proceeds` *for its owner*;
  - every Heirloom setter, and `heirloom_check_in`.

  It updates `last_seen_ms`. **Delegate signatures, offers, deposits and views do not count.**
- **States** (computed, never stored as an enum):

```
NONE ──set──▶ ARMED(unaccepted) ──heir accepts──▶ ARMED
ARMED: now < last_seen + inactivity                 (any owner activity → stays ARMED, clock reset)
CLAIMABLE: now ≥ last_seen + inactivity, no claim   (heir may start a claim)
CLAIM_PENDING: claim{started, epoch, approvals}     (owner activity → CANCELLED → ARMED; delegates paused; listing removed at start)
FINISHABLE: now ≥ started + (approvals ≥ k ? wait_guarded : wait_solo) and quiet period since the last signature
CLAIMED: token moved to the heir; Heirloom, allowances and listing cleared (on_owner_change)
Any ownership change (transfer, sale, offer accept, claim) → NONE
```

- **The prompt says "until the waiting period ends"; we are stricter in the owner's favour.** Owner activity cancels a
  claim at any time *until the transfer has actually happened*. A heir who finishes promptly loses nothing, and an
  owner who is alive always wins the race.

### 3.2 Interface

| Method | Who | Deposit | Effect / checks |
|---|---|---|---|
| `set_heirloom(token_id, heir, guardians: Vec<AccountId>, threshold: u8, inactivity_ms: U64, wait_solo_ms: U64, wait_guarded_ms: Option<U64>)` | owner | storage (exact, excess refunded) | Validates bounds (§3.4) and roles. Reserves the fixed-size claim slot now (the S-01 pattern), so a claim never grows storage the contract pays for. Bumps `epoch`. If the heir changed, resets `accepted`. Cancels any claim. Touches the clock. |
| `clear_heirloom(token_id)` | owner | 1 yocto | Removes the entry and refunds its storage to the owner. Touches the clock. |
| `heirloom_check_in(token_id)` | owner | 1 yocto | Touches the clock and cancels a pending claim. Emits `heirloom_check_in`. |
| `heirloom_accept(token_id, epoch)` | heir | 1 yocto | Sets `accepted` for that epoch's heir. Proves the heir account exists and is controlled. |
| `heirloom_start_claim(token_id)` | heir (accepted) | 1 yocto | Requires `now ≥ last_seen + inactivity` and no pending claim. **If listed, delists** (`Delisted` event). Stores the claim `{id, started_ms, epoch, approvals: 0}`. |
| `heirloom_approve(token_id, claim_id)` | guardian | 1 yocto | Requires a pending claim with a matching id and epoch. Sets its bit; idempotent. |
| `heirloom_finish(token_id)` | heir | 1 yocto | Requires a pending claim with matching epoch, `now ≥ started + window` and `height ≥ last_sign_height + COOLDOWN_BLOCKS` (no MPC in flight). Then `move_token(owner→heir)`, `emit nft_transfer`, `heirloom_claimed`, and `on_owner_change` (clears allowances and the Heirloom). |
| `heirloom_of(token_id)` → `HeirloomView` | view | — | Config plus computed `state`, `claimable_at_ms`, `finishable_at_ms`, the claim and its approvals. Anyone can read the rules (a prompt requirement). |

**Changes to existing paths:**
- `authorize_signer`: a delegate is refused with `ERR_HEIRLOOM_CLAIM_PENDING` while a claim is pending.
- **Every owner gate** becomes `self.assert_owner_and_touch(&token_id)`, one helper.
- `on_owner_change` also clears the Heirloom.
- **Storage:** a new `StorageKey::Heirloom`, appended last (R-41 redeploy in place). The `Contract` struct and `new`
  are unchanged.

### 3.3 Events (NEP-297, `satchel` standard)
`heirloom_set`, `heirloom_cleared`, `heirloom_accepted`, `heirloom_check_in`, `heirloom_claim_started`,
`heirloom_claim_approved`, `heirloom_claim_cancelled {reason: "owner_activity"|"config_change"}`, `heirloom_claimed`.

All of them are emitted after the last check that can refuse (the AUDIT-04 rule). They also show in Activity and the
buyer's history ("inherited from …").

### 3.4 Parameters and bounds
| | Contract bounds (testnet release) | UI "Demo" preset | UI "Real" preset (and mainnet-profile minimums) |
|---|---|---|---|
| Inactivity | 3 min … 10 years | **3 min** | **365 days** (mainnet min 90 days) |
| Solo waiting window | 2 min … 2 years | **6 min** | **180 days** (Casa and Bitkey use 6 months) |
| Guarded window (k approvals) | 1 min … solo window | **2 min** | **30 days** (ERC-7878 ≥ 30; Safe 28) |
| Guardians | 0 … 5, 1 ≤ k ≤ n | carol + 2 test accounts, 2-of-3 | 2-of-3 |
| DAO owner | — | — | The UI requires the solo window ≥ the DAO's `proposal_period` + 7 days |

- The final contract is born on **testnet**, so its bounds allow minute-level timers; the prompt requires them.
- A later mainnet build raises the minimums through a `mainnet` cargo feature (Candide's testnet-only 3-minute
  precedent).

### 3.5 Invariants (new rows for kb/90 §INV)
| ID | Invariant |
|---|---|
| INV-38 | **Only the owner keeps it alive:** every owner-gated method updates `last_seen_ms`; no delegate, heir, guardian or third-party call does. This is enforced by one helper plus a test that enumerates every owner method. |
| INV-39 | **No early claim:** `heirloom_start_claim` fails before `last_seen + inactivity`, and `heirloom_finish` fails before `started + window(approvals)` or within `COOLDOWN_BLOCKS` of the last signature. |
| INV-40 | **The owner always wins:** any owner activity while a claim is pending cancels it. After a cancel, a new claim needs a full new inactivity period. |
| INV-41 | **Bound claims:** approvals are only valid for the claim id and epoch they were cast on; any config change cancels the claim. |
| INV-42 | **Ownership change wipes the Heirloom:** after `nft_transfer`, `buy`, `ft_on_transfer` and `accept_offer`, `heirloom_of` is `None`. INV-02 and INV-35 now also list `heirloom_finish`. |
| INV-43 | **Delegates are paused** while a claim is pending (`ERR_HEIRLOOM_CLAIM_PENDING`). |
| INV-44 | **Storage:** the claim slot is reserved at `set_heirloom`; claim, approve, cancel and finish never grow storage. The contract stays solvent (INV-36). |

### 3.6 Interplay with existing features
- **Listing:**
  - Starting a claim delists, because the listing is older than the inactivity period.
  - Relisting is owner activity, so it cancels the claim.
  - A buyer can buy before a claim starts; the sale wipes the Heirloom.
- **Offers** (bound to sig_count and inside_epoch) survive, and the heir may accept them after receiving the Satchel.
- **Inside coins** (C6) are keyed by token, so they move to the heir.
- **NEAR proceeds already owed to the dead owner's account do not move.** That is a documented limit.
- **Allowances:** paused during a claim (INV-43) and cleared at finish.
- **Clean history:**
  - Finish requires the 250-block quiet period, so the heir receives a Satchel with no MPC request in flight.
  - The heir's claim page runs the same browser checker.
  - The Heirloom events appear in the record timeline.
- **DAO:**
  - **A DAO as owner:** every executed owner proposal is activity; check-in is a cheap proposal.
  - **A DAO as heir:** accept, start and finish through proposals.
  - **A DAO as guardian:** approvals through proposals.
  - **A DAO that loses quorum** is the "owner offline" case, so an Heirloom to a backup entity is its recovery path.

### 3.7 Heirloom UX (app)
- **The owner's "Heirloom" tab** (`/s/[id]/heirloom`):
  - Set it up with the heir (an address-book field; a DAO is detected and labelled), guardians plus threshold, and the
    timers (Demo or Real preset).
  - The review step states "This is not a will" and that the heir and guardians are **public on-chain**.
  - The status card shows armed / awaiting the heir's acceptance / check-in due by, with **Check in** and **Remove**
    buttons.
- **Reminders without a backend:**
  - Banners on My Satchels and the Satchel page at T−30, T−7 and T−1 days (T−1 min in demo).
  - A client-side **.ics calendar** download with those reminders and a yearly "review your Heirloom".
- **The heir's view:**
  - "You're named heir of Satchel #7": **Accept**, then a status line ("claimable from …").
  - **Start claim**, a countdown, then **Finish**.
  - Before Finish, the clean-history checker and the Satchel's coins.
  - A printable **Heirloom card**: contract, token, heir, guardians and the claim steps.
- **The guardian's view:** "Claim pending on #7 by bob: approve to shorten the wait to 30 days."
- **Server-rendered facts on `/s/[id]`** (a judge-page rule), for example "Heirloom: armed · heir bob.… · last check-in
  3 days ago · claimable after …".
- **README:** a "Failure cases" section answering the prompt's three cases and the §2.2 list.

### 3.8 The prompt's checkpoint: arguing against the idea, and what the design must answer
**Against:**
- An on-chain inheritance switch is a liveness bet on a person. An owner who is alive but offline (in hospital, in
  prison, travelling) can lose everything to a heir who is waiting for it.
- Guardians add collusion risk and social pressure.
- The heir must keep a NEAR account alive for years.
- Public heir and guardian lists leak family structure.
- It is not a legal will, and courts may disagree with it.
- On a mutable account, a compromised owner key can simply rewrite the heir.

**What the design must answer, and how it does:**
- **Offline owner:** long defaults (365 days + 180 days), reminders, any owner action counts, and cancel until the
  transfer has happened.
- **Collusion:** guardians can only shorten the wait, never act alone, never veto, and can't be the heir.
- **Heir's account rot:** acceptance, an in-person finish, and re-nominating at any time.
- **Privacy:** disclosed in the UI; a DAO or multisig heir hides individuals.
- **Legal:** "not a will".
- **Key compromise:** that is the owner's NEAR account security, and the same as for every Satchel action.
  Mitigations are a DAO or multisig owner (§1) and the public `heirloom_set` events, which watchers see.

---

## 4. DAO ownership design (app + tooling; no contract change)

### 4.1 Every current feature with a DAO as owner
| Feature | Through a DAO | Rule that keeps it from getting stuck |
|---|---|---|
| Mint, Add coins, inside deposits | ✅ no vote (anyone can mint to the DAO or deposit) | — |
| **Send ETH / USDC** | ✅ one proposal | The nonce and max fee are frozen at proposal time. **One pending EVM send per chain**, nonce = next unsigned (INV-10 allows ≤ max+1), and a ×2 fee headroom. The description shows "valid while base fee ≤ X". Re-propose with the same nonce if it gets stuck. |
| **Send BTC** | ✅ one proposal | The inputs and fee rate are frozen. Lock the inputs against other pending proposals; fee rate +50%. A competing spend makes the signature dead, which is harmless. |
| **Send SOL** | ❌ by vote | The blockhash lives about 36 s on devnet, and durable nonces are refused. **Refuse in DAO mode → "Set a SOL allowance for a treasurer"**: the delegate sends with no vote. |
| Take it all out | ⚠️ | One proposal per chain; SOL through the allowance holder. |
| Give (`nft_transfer`) | ✅ | 1 yocto. The Give flow **refuses legacy v2.0 DAOs** as receivers and warns about any contract account with unknown code. |
| Give by link | ⚠️ hidden in DAO mode | The proposer's browser would hold the link key. A DAO receives a gift link through a member claiming it and then giving it to the DAO. |
| **List / delist** | ✅ | The 250-block quiet period is checked at execution. If it fails, Finalize re-runs it. NEAR proceeds land in the DAO. **USDC needs the DAO registered** (a "Register the DAO for USDC" button anyone can press), or the proceeds wait in escrow for a `withdraw_proceeds` proposal. |
| **Buy** (DAO as buyer) | ✅ | Bound to `listing_id` and `expected_sig_count`, so a changed listing fails or refunds safely. **Members must see the clean-history check in the proposal view before voting.** For a USDC buy, read the returned amount: `"0"` means refunded even though the proposal shows Approved. |
| **Offers** | ✅ | `expires_at` ≥ execution, so the UI sets it to now + proposal period + 1 day at least (max 90 days). Accepting is bound to sig_count and inside_epoch, so **the app warns while other DAO sign proposals are pending.** |
| **Allowances** | ✅ **key for entities** | The DAO votes once to give a treasurer or bot daily caps. Everyday sends, SOL included, need no vote. Paused while listed and cleared on sale (existing rules). |
| Message signing | ✅ | The full text goes in the proposal description. Flag JSON containing `verifying_contract` / `intents.near` (the earlier `intents.near` finding). |
| **Heirloom** (new) | ✅ | Executed proposals count as activity. The solo window must be ≥ the proposal period + 7 days. |
| Clean history, pages, card, APIs | ✅ unchanged | Records show the DAO as the requester. |

**Built-in safety we keep and test:** a proposal can't outlive ownership.
- After a sale or gift, executing it fails with `ERR_NOT_OWNER` (or `ERR_FROZEN` while listed).
- A stale vote can never move a new owner's coins.

### 4.2 Stuck points and their guards
| # | Risk | Guard |
|---|---|---|
| 1 | The final vote carries too little gas | Always attach 300 Tgas; action gas `min(280, 60+20n)` Tgas; **one `sign_for` per proposal** (two MPC calls in one tx both time out). |
| 2 | An MPC timeout ends *Approved* with no signature | Drive the UI from our `SigRecord`s, not the proposal status. Offer **"Propose again (same nonce/inputs)"**, or **`retry_sign`** (WP-H, optional, H-28). |
| 3 | Refusals (frozen, quiet period, nonce gap) | The proposal ends Failed; **Finalize** re-runs it before expiry. The UI explains why and when to retry. |
| 4 | Voting after the deadline burns the bond | The UI blocks votes past `submission_time + proposal_period` and offers Finalize (which refunds the bond). |
| 5 | A legacy v2.0 DAO (no failure callback) | Refuse in Give and in DAO mode; recommend `sputnikv2.testnet`. |
| 6 | The DAO's balance is too low for deposits and storage | Pre-check `get_available_amount` and show a "Fund the DAO" banner. |
| 7 | The DAO can't receive USDC | A "Register the DAO for USDC" button (anyone pays 0.00125 NEAR). |
| 8 | Time-sensitive payloads (SOL, fees, offers, listing state) | Validity analysis per proposal in the UI. SOL refused. Fee headroom. Expiry > voting period. |
| 9 | EVM nonce contention | One pending EVM proposal per chain (UI). The contract's nonce-gap rule refuses out-of-order nonces anyway. |
| 10 | Nobody broadcasts after the vote | **A broadcaster that works from the records** (any member, any device), plus an "Executed, waiting for broadcast" badge. |
| 11 | The DAO loses quorum (members lose keys) | A DAO policy with a backup role (documented). A standing allowance. **Heirloom to a backup entity.** |
| 12 | A DAO upgrade changes its behaviour | Detect the code hash on every visit; an unknown hash → read-only mode with a warning. |

### 4.3 App architecture
- **`packages/core/src/dao/`** (pure, with vectors and unit tests):
  - `sputnik.ts`: code-hash table and detection, policy parsing, `canVote` / `isFinalVote` (§1.2 rules, including
    the Ratio "more than" formula), `deadline()`, the `addProposal` / `actProposal` JSON builders (always passing the
    `proposal` kind), and `decodeProposal()`. The latter decodes base64 args into our request types, then into the
    existing human description; **voters' UI recomputes from the args, never trusting the description.**
  - `validity.ts`: SOL refusal, EVM nonce and fee checks, BTC input locks, offer expiry vs period, quiet-period ETA.
- **`packages/core/src/broadcast/fromRecords.ts`:** rebuilds and broadcasts a signed tx from on-chain data.
  - EVM: the record's `unsigned_tx` plus the signature.
  - BTC: the `sign_requested` event's preimages and outputs plus the per-input signatures, via the FastNEAR tx API.
  - SOL: the event's message plus the signature.
  - Messages: show and verify.

  This also gives normal users cross-device "Broadcast now".
- **Web (`apps/web`):**
  - `ownerKind` in the snapshot: `account | sputnik(version, policy) | multisig2 | contract-unknown`.
  - **DAO mode**: when the connected account is a member, owner actions show **"Propose"** instead of "Sign".
  - `PendingIntent` gets a `proposal` kind with stages: proposed → voting → executed / failed / expired → (the
    existing tail) signed → broadcasting → sent → confirmed.
  - A **Proposals panel** on `/s/[id]`: pending proposals for this token (filtered by receiver and `token_id`), votes
    needed, deadline, validity warnings, Vote / Finalize buttons ("this vote executes the proposal").
  - The **server-rendered owner line**: "Owned by DAO `satchel-council.sputnikv2.testnet` · council 2 of 3 · Sputnik
    v3.31".
  - **Copy** for every guard in §4.2; built to the brand system (D-44), not stock defaults.
- **`tools/dao/`:** `create.ts` (§1.2 policy; 6 NEAR + funding), `propose.ts`, `vote.ts`, `status.ts`.
  `tools/e2e/dao.ts` covers the scripted flows (§6).

### 4.4 Example payloads (verified shapes)
```jsonc
// add_proposal (deposit = proposal_bond exactly, 50 Tgas)
{"proposal":{"description":"Satchel #9 · send 5 USDC on Base Sepolia to 0x… · nonce 3 · valid while maxFee ≥ base fee",
  "kind":{"FunctionCall":{"receiver_id":"dev2.satchelhq.testnet","actions":[
    {"method_name":"sign_for","args":"<base64 {token_id, request, mpc_deposit?}>","deposit":"5000000000000000000000","gas":"80000000000000"}]}}}}
// act_proposal (0 deposit, ALWAYS 300 Tgas, ALWAYS echo the kind)
{"id":3,"action":"VoteApprove","proposal":{"FunctionCall":{ /* copied verbatim from get_proposal */ }}}
// 2-of-3 council policy for sputnikv2.testnet create (threshold "2" or [1,2]; NOT [2,3])
{"roles":[{"name":"council","kind":{"Group":["alice.satchelhq.testnet","bob.satchelhq.testnet","carol.satchelhq.testnet"]},
  "permissions":["*:AddProposal","*:VoteApprove","*:VoteReject","*:VoteRemove","*:Finalize"],"vote_policy":{}}],
 "default_vote_policy":{"weight_kind":"RoleWeight","quorum":"0","threshold":"2"},
 "proposal_bond":"100000000000000000000000","proposal_period":"3600000000000",
 "bounty_bond":"100000000000000000000000","bounty_forgiveness_period":"86400000000000"}
```

### 4.5 Optional contract helper: `retry_sign` (WP-H, decision H-28)
- **Problem:** about 1 in 4 testnet MPC requests time out. For a DAO, each timeout is a new proposal and a new vote.
- **Proposal:** `retry_sign(token_id, seq)`, callable by **anyone**. It re-requests the MPC for an existing record,
  **overwriting that record's status and signature in place**: no new record, `sig_count` unchanged, no storage growth.
- **Allowed only if:**
  - the record status is `failed`;
  - the record's requester is still the current owner, or a delegate with a live allowance;
  - the token is not listed and no Heirloom claim is pending;
  - `height ≤ record.height + RETRY_WINDOW_BLOCKS` (proposed 3,600 ≈ 1 h).
- It sets `last_sign_height = now`, so the quiet period restarts. The caller pays the MPC deposit and gas. It emits
  `sign_retried`.
- **Why it's safe:** clean history already treats a failed record as possibly live, because a late MPC answer can
  leak. Re-signing the identical payload adds no authority and no new risk class, and the window bounds an owner
  changing their mind.
- **Cost:** about 1 contract-day plus a security review. **It benefits every user,** not just DAOs: retry without
  signing in the wallet again.
- If it's cut, the UI uses "Propose again (same nonce/inputs)".

### 4.6 Mainnet note: the Trezu Wallet connector (later, not testnet)
- Our app already uses near-connect, which has a Trezu Wallet connector. A Trezu treasury could sign in with the
  DAO id as the account, and each owner transaction would become one FunctionCall proposal.
- Caveats:
  - Its promise resolves only after approval, with **no timeout**, and is lost on reload.
  - `Approved` can come back with no signature.

  So our pipeline must already be record-driven: WP-D2 makes it so.
- Rules carried over: one `sign_for` per transaction, JSON-object args, action gas ≤ 280 Tgas, SOL refused.
- Testnet throws `Unsupported network`, which is why we build our own flow.

### 4.7 multisig2 (phase 2)
- Same app adapter, a different builder: `add_request_and_confirm` then `confirm`. The final confirmation executes the
  call and returns `sign_for`'s result.
- No expiry; any member can `delete_request` after 15 min; at most 12 active requests per member.
- Deploy it directly: a keyless batch from `satchelhq.testnet` (~4 NEAR), because the testnet factory is broken.
- Not in this sprint unless time is left (§7.3).

---

## 5. Hackathon and README fit
- **`open`:** Heirloom implements the official example on top of Satchel's Chain Signatures. The README gains
  **"Heirloom: failure cases"** (lost guardian keys, a hostile guardian, an owner alive but offline, plus §2.2) and the
  §3.8 checkpoint paragraph.
- **`nfts`:** "NFTs as accounts … carry access rights". DAO ownership plus the existing allowances is an entity
  treasury that can be handed over or sold with its history.
- **The X post's NEAR angle:** "one NEAR DAO vote moves native BTC — and the treasury itself can be inherited".
- **AI screening (Q-017):**
  - Every claim needs a runnable command (`tools/e2e/heirloom.ts`, `tools/e2e/dao.ts`) and server-rendered facts
    (owner kind, Heirloom state).
  - The README's "Verify on-chain" section gains `heirloom_of` and `get_policy` view commands.

---

## 6. Test plan
| Layer | What |
|---|---|
| Contract unit (Rust) | Heirloom: every precondition and refusal code; window boundaries (strict `<`/`≥`); epoch binding; the bitmask; **an enumeration test that calls every owner-gated method and asserts `last_seen` moved, and every non-owner path asserts it didn't** (INV-38); storage exactness (INV-44). |
| Property fuzz (`proptest`, docs/security/fuzzing.md) | Random sequences of owner, delegate, heir, guardian and stranger actions with random time jumps. Invariants: no transfer before the conditions; owner activity always cancels; ownership change wipes; delegates paused while pending; solvency. |
| Sandbox (`tests/tests/heirloom.rs`) | The full flow with fast-forward; claim while listed (delists); claim vs sale race; delegate paused; finish requires the quiet period; INV-02 and INV-35 extended to `heirloom_finish`. |
| Sandbox (`tests/tests/dao.rs`, **new**) | Vendors **the Sputnik v3.31 wasm** (`AA4nA45…`, from the source repo at commit 7764926; licence check H-33). It runs every owner method through `add_proposal` + `act_proposal`; a refusal → Failed → Finalize re-run; an MPC timeout (mock-signer `never` mode) → Approved + record `failed`; a vote with too little gas → not recorded; votes after expiry; **a proposal executed after a sale → `ERR_NOT_OWNER`**; a DAO as Heirloom owner, heir and guardian; `retry_sign` if WP-H lands. |
| TS core (vitest) | `dao/sputnik.ts` (detection, Ratio thresholds, final-vote math, builders round-trip with vectors); `dao/validity.ts`; `broadcast/fromRecords.ts` against recorded EVM, BTC and SOL vectors; the Heirloom state mirror (`heirloomState(view, now)`), with vectors shared with Rust. |
| Web (Playwright, fixture mode) | A DAO sim in `lib/data/sim.ts`: propose → vote → execute → broadcast; every §4.2 guard's copy; the Heirloom tabs for owner, heir and guardian; the .ics download; server-rendered facts without JS. |
| **Testnet e2e** | `tools/e2e/heirloom.ts`: alice owner, bob heir, guardians carol + 2 new accounts at 2-of-3, demo timers. Paths: check-in resets; solo path; guarded path; cancel by activity; listing delisted at claim start. `tools/e2e/dao.ts`: create a 2-of-3 DAO, mint a Satchel to it, fund it, then USDC send by vote, BTC send by vote, message, allowance → SOL by delegate, list → carol buys, offer → accept, a DAO as Heirloom heir. Run on dev2 first, then on the final contract after the birth. |
| Security review | The `satchel-reviewer` pass on the Heirloom (and `retry_sign`) diff before the cut. Checklist: §2.2 failure modes and INV-38…44. |

---

## 7. Implementation plan

### 7.1 Work packages
Lanes:
- **S1a** = contract Heirloom;
- **S1b** = contract tests, `retry_sign` and tools;
- **S2a** = web DAO mode;
- **S2b** = web Heirloom;
- **H** = Razvan.

| WP | Lane | What | Files | Est. |
|---|---|---|---|---|
| **WP0** | S1b | **Prerequisite (blocks the birth):** MPC 3.18.0. Update the version checks (`tools/deploy/keyless-birth.ts:181`, `tools/monitor.sh:111`, `tools/judge-snippets.sh:132`, `apps/web/src/lib/data/fixtures.ts:313`, README, kb/90 A-01). Diff the `sign` API (one doc line changed). Re-measure the timeout rate. | tools, docs | 0.25 d |
| WP-H1 | S1a | **Heirloom spec:** `docs/specs/C8-heirloom.md` from §3 (interface, errors, events, invariants, storage maths). The interface freezes so the web lanes can start. | docs/specs | 0.5 d (Nov 5 AM) |
| WP-H2 | S1a | **Heirloom contract:** `heirloom.rs`; `assert_owner_and_touch` across all owner gates; `on_owner_change` extension; delegate pause in `authorize_signer`; views and events; unit tests. | `contracts/satchel/src/{heirloom.rs,lib.rs,allowance.rs,sale.rs,offers.rs,inside.rs,sign.rs,events.rs,errors.rs}` | 1.5 d |
| WP-H3 | S1b | **Heirloom tests:** sandbox `heirloom.rs`, proptest fuzz, the TS mirror `packages/core/src/heirloom` plus vectors, kb/90 INV-38…44. | tests, core, vectors | 1.0 d |
| WP-H4 | S1a | **Security review and fixes** (`satchel-reviewer`), dev2 redeploy in place, testnet e2e `tools/e2e/heirloom.ts`. | — | 0.75 d |
| WP-H (opt.) | S1b | **`retry_sign`** (§4.5): contract, tests, the TS policy mirror. Only if H-28 = yes and WP-H2 is on track by Nov 6. | contract, tests, core | 1.0 d |
| WP-D1 | S2a | **Core DAO library:** `dao/sputnik.ts`, `dao/validity.ts` plus vectors. | `packages/core/src/dao/*` | 1.0 d |
| WP-D2 | S2a | **Broadcaster from records** (also used for cross-device broadcast and Trezu later). | `packages/core/src/broadcast/*`, web signing runner | 1.0 d |
| WP-D3 | S2a | **DAO mode UI:** owner kind, the Propose action variants for every §4.1 row, the Proposals panel, Vote / Finalize, guards and copy, server-rendered owner line, Give guard. | `apps/web/src/components/client/{Dao*.tsx,…}`, `lib/signing/*`, `lib/data/*` | 2.0 d |
| WP-D4 | S1b | **DAO tools and sandbox:** `tools/dao/*`, `tests/tests/dao.rs` with the vendored Sputnik wasm, `tools/e2e/dao.ts`. | tools, tests | 1.25 d |
| WP-H5 | S2b | **Heirloom UI:** owner tab (setup, presets, status, check-in, remove), heir view (accept, claim, finish, card), guardian view, banners, .ics, server-rendered facts. | `apps/web/src/app/(app)/s/[id]/heirloom/*`, components | 1.5 d |
| WP-T | S2a+S2b | **Playwright:** the DAO sim and Heirloom flows; accessibility and 320 px checks per docs/testing/ui.md. | `apps/web/test/e2e/*` | 1.0 d |
| WP-Doc | all | README (Heirloom failure cases, DAO section, verify commands), kb/53-dao-ownership.md, decisions D-53 and D-54, landing copy within D-52's boundary (H-34). | docs | 0.5 d |

**Total ≈ 13 dev-days** (12 without WP-H): four agents in parallel, plus the orchestrator merging and running the full
suites.

### 7.2 Schedule (today is Wed Nov 4)
| Day | S1a (Heirloom contract) | S1b (tests and tools) | S2a (DAO web) | S2b (Heirloom web) | H (Razvan) |
|---|---|---|---|---|---|
| Thu Nov 5 | WP-H1 spec by 12:00 UTC, then WP-H2 | **WP0**; WP-D4 tools (create a test DAO on dev2) | WP-D1 | read the spec; UI skeleton against fixtures | **H-27…H-30, H-32**; OK to spend ~10 testnet NEAR on DAO tests |
| Fri Nov 6 | WP-H2 | WP-D4 sandbox `dao.rs`; WP-H (opt.) start | WP-D2 | WP-H5 owner tab | — |
| Sat Nov 7 | WP-H2 done → WP-H4 review | WP-H3 | WP-D3 | WP-H5 heir and guardian | — |
| Sun Nov 8 | **WP-H4 fixes; merge by 12:00 UTC (cut rule)**; dev2 redeploy; heirloom e2e | WP-H3 / WP-H (opt.) merge by 12:00 | WP-D3; `tools/e2e/dao.ts` on dev2 | WP-H5 against dev2 | review the README failure cases |
| Mon Nov 9 | rc rehearsal (existing; now includes Heirloom) | e2e on rc | WP-T | WP-T | — |
| Tue Nov 10 | **final keyless birth** (existing, H-15) | e2e on final: Heirloom (demo timers), DAO flows | regression | regression | H-15 "yes" |
| Wed Nov 11 | buffer | evidence hashes in the README | WP-Doc | WP-Doc | record the demo beats: DAO vote moves BTC; Heirloom claim |
| Thu Nov 12 | buffer | keep-alive checks | buffer | buffer | — |
| Fri Nov 13 | — | — | — | — | **submit by 18:00 UTC** |

### 7.3 Cut lines (in order)
1. WP-H `retry_sign` → the UI's "Propose again".
2. multisig2 support (already phase 2).
3. The printable Heirloom card and the .ics reminders (keep the banners).
4. DAO-as-buyer and offer flows in the UI (still possible through the CLI tools; documented).
5. If the Heirloom contract misses the cut: either **move the birth by one day** (H-30), or ship DAO ownership alone
   and move Heirloom to "What's next" with the spec published.

**Never cut:**
- INV-38 (only the owner keeps it alive) and its enumeration test;
- wiping the Heirloom on every ownership change;
- the delegate pause;
- the deadline-vote block and the 300 Tgas votes;
- refusing SOL by vote;
- the record-driven status (never trusting "Approved");
- the README failure-cases section.

### 7.4 Budget (testnet)
| Item | NEAR |
|---|---|
| DAO creation (`sputnikv2.testnet`) | 6 |
| DAO operating balance (sign deposits, bonds of 0.1 each, storage, USDC registration) | 2 |
| 2 extra guardian accounts (D-48 allows creating them) | ~0.2 |
| Heirloom storage per Satchel | ~0.006 |
| Optional multisig2 deployment (phase 2) | ~4 |
| **Total** | **≈ 8.2** (12.2 with multisig2) |

The coins for the DAO's Satchel come from existing balances (dev1 #1 holds about 474k sats and 0.025 Sepolia ETH),
moved with the product's own Send.

---

## 8. Risks
1. **Contract timing.** The Heirloom must pass review by Nov 8 12:00 UTC. Mitigations: a spec-first interface on
   Nov 5, two contract lanes, and the cut line (§7.3 item 5).
2. **Owner-path coverage** (the Codehawks bug class). Mitigation: one helper plus the enumeration test plus the
   fuzzer.
3. **MPC timeouts** frustrate DAO votes (about 1 in 4 on testnet; 3.18.0's leader failover may help, so re-measure in
   WP0). Mitigations: `retry_sign`, or "Propose again", plus allowances for routine sends.
4. **The vendored Sputnik wasm licence** (H-33). Check the licence; if it is unclear, fetch it at test time from the
   factory instead of committing it.
5. **UX complexity.** DAO mode multiplies every flow. Keep the Propose variants thin: the same builders, wrapped.
6. **Public data.** Heir and guardian accounts are public, and so is DAO membership. Disclose it in the UI.
7. **Legal.** Heirloom is not a will: say so on the setup review and in the README.
8. **The `intents.near` message finding** (earlier research) remains open for the Nov 9 freeze. It interacts with DAO
   message signing (§4.1).

## 9. Decisions needed (proposed H-27…H-34)
| # | Decision | Recommended default | By |
|---|---|---|---|
| H-27 | Scope: Heirloom (contract + UI) + DAO ownership (app + tools), as planned here | **Go** | Nov 5 |
| H-28 | Include the `retry_sign` contract helper (§4.5) | **Yes if** WP-H2 is on track by Nov 6 EOD; otherwise cut | Nov 6 |
| H-29 | Heirloom bounds and presets (§3.4): minute-level minimums on the testnet release; Real preset 365 d / 180 d / 30 d with 2-of-3 | as listed | Nov 5 |
| H-30 | Keep the Nov 8 cut and the Nov 10 birth, or move the birth to Nov 11 if the Heirloom review slips | keep; slip by one day only if needed | Nov 7 |
| H-31 | Tracks: keep `nfts` + `open` (Heirloom is the `open` example) | keep | Nov 12 |
| H-32 | OK to create the test DAO and the guardian accounts and spend ≈ 8 testnet NEAR (D-48 covers signing; D-34 is the budget) | yes | Nov 5 |
| H-33 | Vendor the Sputnik v3.31 wasm into `tests/` (after a licence check) or fetch it at test time | fetch at test time unless the licence is clearly OK | Nov 6 |
| H-34 | Landing and README present "Inheritance" and "Owned by a team / DAO" as product features (D-52 boundary) | yes | Nov 11 |

## 10. Sources
- **Our repo:**
  - `contracts/satchel/src/{lib.rs,sign.rs,allowance.rs,sale.rs,offers.rs,inside.rs,types.rs,events.rs}`
  - `tests/tests/*`, `contracts/mock-signer`
  - `apps/web/src/components/client/SatchelPage.tsx`, `apps/web/src/lib/{signing,data}/*`
  - kb/90 §INV, `plan/decisions.md` D-07, D-29, D-34, D-48, D-52
- **Sputnik:**
  - https://github.com/near-daos/sputnik-dao-contract: `sputnikdao2/src/{proposals.rs,policy.rs,lib.rs}`; testnet
    default commit `7764926`; mainnet v3.2 commit `2b0f34a`
  - live views on `sputnikv2.testnet`, `sputnik-v2.testnet` and `sputnik-dao.near`
  - live txs: earmark-demo and alajo-efe-estate DAOs; the Trezu 300 Tgas vote failure on `neardevgov.sputnik-dao.near`
- **Trezu:** https://github.com/NEAR-DevHub/trezu (`nt-fe/near-connect/src/trezu-wallet.ts`,
  `app/wallet/utils/proposals.ts`) and https://github.com/NEAR-DevHub/trezu-docs
- **NEAR Treasury:** https://github.com/NEAR-DevHub/neardevhub-treasury-dashboard
- **multisig2:** https://github.com/near/core-contracts
- **Multichain DAO tutorial:** https://docs.near.org/chain-abstraction/chain-signatures/tutorials/multichain-dao/0-intro and https://github.com/nearuaguild/abstract-dao
- **Aurora Safe controlling BTC:** https://doc.aurora.dev/blog/safe-bitcoin-demo
- **House of Stake:** https://github.com/houseofstake/house-of-stake-contracts
- **Inheritance products:**
  - Casa: https://support.casa.io/knowledge/what-is-the-request-access-process-for-inheritance
  - Bitkey: https://support.bitkey.world/hc/en-us/articles/32939502001300
  - Nunchuk: https://nunchuk.io/blog/autonomous-inheritance and https://nunchuk.io/blog/phased-rollout
  - Liana: https://github.com/wizardsardine/liana
  - Bron: https://support.bron.org/en/articles/13673945-inheritance
  - Argent: https://github.com/argentlabs/argent-contracts-starknet/blob/main/docs/argent_account_escape.md
  - Candide: https://github.com/candidelabs/candide-contracts
  - Safe RecoveryHub: https://help.safe.global/en/articles/110656-account-recovery-with-safe-recoveryhub
  - Rhinestone DeadmanSwitch: https://github.com/rhinestonewtf/core-modules/blob/main/src/DeadmanSwitch/DeadmanSwitch.sol
  - Blockful DMS: https://github.com/blockful/deadman-switch-safe
  - ERC-7878: https://eips.ethereum.org/EIPS/eip-7878
  - Tokenbound `Lockable.sol`: https://github.com/tokenbound/contracts/blob/main/src/abstract/Lockable.sol
- **Audits:** the Certora audit of the Safe Social Recovery Module (Aug 2026: L-03, M-01, I-04, I-07, L-04); the
  Codehawks InheritanceManager contest (2025-03).
- **Hackathon:** https://raw.githubusercontent.com/nearai/near-hackathon-prompt-examples/main/tracks/13-open.md and
  https://nearhackathon.com/HACKATHON.md (re-fetched 2026-11-04).
