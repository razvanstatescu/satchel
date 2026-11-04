# 51 · USDC on NEAR, the `ft_transfer_call` buy flow (S-8), and 1Click "pay from any chain" (S-12)

> **Phase-0 research note (2026-10-21).** Kept as evidence and not maintained; where it disagrees with [kb/90](90-technical-spec.md), kb/90 wins (§13 Errata).
> "Plan" below means `near_hackathon.md`, the team's original plan, which is not in this repo. "Nov 1" dates are the Phase-0 schedule; implementation began 2026-10-21 (D-39).

> Owner: pay · Checked: 2026-10-21 (11:30–12:30 UTC) · Confidence: high for USDC contract facts, NEP-141 runtime behaviour (real testnet txs) and 1Click keyless behaviour (live mainnet read-only calls); medium for the S-12 cost estimate and the incident timeline (secondary sources); low where marked [ASSUMED]
> Primary sources: live testnet txs and mainnet read-only calls listed in `research/spikes/pay/RESULTS.md` (§4–6); Circle "USDC contract addresses" (developers.circle.com/stablecoins/usdc-contract-addresses) and faucet.circle.com page source; `near/near-sdk-rs` tag `near-sdk-v5.29.1` (commit `421ffb42`, the version `sdk` pins in `20-near-contract-stack.md`) `near-contract-standards/src/fungible_token/{core_impl.rs,storage_impl.rs}` (byte-identical at `near-contract-standards-v5.30.0-rc.1` / `a0d61a03` and on `master` today), snapshots in `research/spikes/pay/vendor/near-sdk/`; `near/NEPs` @ `91562cc` `neps/nep-0141.md`; 1Click OpenAPI `https://1click.chaindefuser.com/docs/v0/openapi.yaml` ("1Click Swap API" v0.1.10, snapshot `vendor/oneclick/openapi.yaml`); `docs.near-intents.org/llms-full.txt` (snapshot `vendor/near-intents-docs/`); npm `@defuse-protocol/one-click-sdk-typescript@0.1.26`; incident: defiprime.com, techflowpost.com (both summarising the 2026-10-16 postmortem), partners.near-intents.org/shield/status.
> Related KB: `50-data-and-indexing.md` (prices, explorers, FastNEAR); `20-near-contract-stack.md` (sdk: near-sdk/FT receiver traits); `70-security-and-clean-history.md` (sec: `ft_on_transfer` invariants); `40-frontend-wallet.md` (web: sending the buyer's tx); `80-ux-spec.md` (ux: copy keys `oneclick.*`).

## TL;DR — what an implementer must know

1. **Testnet USDC for S-8 = Circle's `3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af`** ("USDC", 6 decimals). It has the **identical 37-method interface** to mainnet native USDC `17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1`, though the builds differ (code hashes `EoAUFW…` vs `DVJx7F…`). It emits NEP-297 `nep141` `ft_transfer` events. You get tokens only from **faucet.circle.com ("Near Testnet", 20 USDC per 2 h per address, reCAPTCHA)**: a human step; `mint` is minter-only. **[VERIFIED]**
2. **Self-serve fallback: `usdc.fakes.testnet`** ("Bridged USDC", symbol `USDC.e`, 6 decimals) has an **open `mint(account_id, amount)`** (I minted 1,000 to myself). Its metadata setters are owner-only. It is an old near-sdk 3.1.0 build that logs plain text ("Transfer …", "Refund …") instead of NEP-297 events. Use it for e2e tests and for judges who want test USDC without a captcha, not as the headline token. **[VERIFIED]**
3. **Storage is 0.00125 NEAR (min = max) on all three testnet USDCs and on mainnet USDC.** `ft_transfer`/`ft_transfer_call` to an unregistered receiver panics in the first receipt ("The account … is not registered"). So **`satchel.<team>.testnet` itself must be registered with USDC at deploy time**, or every USDC buy fails. Anyone can register any account (`storage_deposit {account_id}`), so the lock does not block this. Re-registering refunds ("The account is already registered, refunding the deposit"). **[VERIFIED]**
4. **Runtime facts for `ft_on_transfer`** (measured with a hand-written WAT receiver):
   - predecessor = the token contract;
   - `sender_id` = the account that called `ft_transfer_call` (the buyer);
   - `msg` arrives as a JSON string inside JSON (`"{\"buy\":\"1\"}"`); `memo` is **not** forwarded;
   - returning `"250000"` refunded 250,000 and the tx returned `"750000"` (used amount);
   - a receiver with no code got a full refund and the tx returned `"0"`;
   - the whole flow takes 3–4 blocks (~2 s). **[VERIFIED]**
5. **Design S-8 so the sale is atomic inside `ft_on_transfer`.** Checks, NFT transfer, listing removal and a `proceeds[seller]` credit all happen in that one receipt, which returns `U128(0)`. Nothing whose later failure would need to undo the sale goes out as a cross-contract call. **That was exactly the NEAR Intents bug class on Oct 1:** a failed "notification" made the token refund while the contract kept its deposit record, creating ~$3.8M of "ghost funds". Pay the seller from escrow (`withdraw_proceeds`, or an auto-payout with a re-credit callback). **[VERIFIED]** mechanics, **[SOURCED]** incident
6. **`require!(env::predecessor_account_id() == self.usdc)` is the critical line.** Without it, anyone can call `ft_on_transfer` directly with a fake `amount` and take the NFT for free. **[VERIFIED]**: I called my receiver's `ft_on_transfer` directly from a plain account with `sender_id: "attacker.testnet", amount: "999999999"`. It executed, and the receiver saw `pred=satchel-spk-pay-e9ea1a.testnet` (tx `52aCkXrun7PvjJvGbdx4K1WbUtxqzB2V2gBwAzpBQRVJ`).
7. **1Click works keyless for read-only flows:** `GET /v0/tokens`, `POST /v0/quote` with `dry: true`, `GET /v0/status`, and the SDK `getTokens()`/`getQuote()` all succeeded with no auth. The unauthenticated limit is `x-ratelimit-limit-unauth: 1200` per 60 s per IP. **Auth is now an `X-API-Key: <partner JWT>` header** (JWT Bearer is "legacy, use X-API-Key instead"), issued from the **Partner Dashboard** `partners.near-intents.org` (login required). An invalid key is worse than none (`401 Invalid token`). **[VERIFIED]**
8. **Fees:**
   - Docs: "Unauthenticated requests incur an additional **0.25%** … Authenticated requests use the partner fee schedule (typically 20 bps, or **1 bp on stablecoin and same-asset multichain routes**)".
   - My keyless *dry* quotes for Arbitrum USDC → NEAR USDC priced at only **~2 bps** total. For EXACT_OUTPUT 5.000000 USDC: `minAmountIn` 5.001003, `amountIn` 5.051519 (includes the 1% slippage buffer, refunded after), `timeEstimate` 25 s, `refundFee` 0.0053 USDC.
   - So the 25 bps surcharge is not visible in dry quotes. Re-check on a real quote. **[VERIFIED]** quotes, **[SOURCED]** fee text
9. **1Click recipient rules:**
   - A NEAR recipient that is not USDC-registered still quotes, but `minAmountIn` rises by ~0.0065 USDC (1Click pays the 0.00125 NEAR storage).
   - **A named recipient that does not exist fails with an opaque `400 "Internal server error"`**, so create the buyer account first.
   - Use `recipientType: DESTINATION_CHAIN` so USDC lands in the buyer's own NEAR account.
   - Do not use the "HIGHLY EXPERIMENTAL" `customRecipientMsg` to buy in one step: `sender_id` would be `intents.near`, and the docs warn funds can be lost. **[VERIFIED]** / **[SOURCED]**
10. **S-12 mainnet clip needs an unlocked mainnet Satchel deployment** (keep its full-access key, per the plan's no-lock-before-audit rule). Out-of-pocket cost is about $1–3 in fees and gas. Working capital is about 5–6 NEAR (mostly refundable contract storage), ~3 USDC and ~$1 of ETH on Arbitrum. That is well under the $50 budget. **[ASSUMED]** estimate, based on measured fees and quotes
11. **The plan's Oct 1 incident summary checks out** (23 failed deposits, Sep 29–Oct 1, identified 08:04 UTC, paused 29 min later, funds back Oct 2, notification feature removed after an Oct 7 HackenProof report, $300k bounty). The "11 networks" detail was not found in the sources I read. **The status page is now `https://partners.near-intents.org/shield/status`**; `status.near-intents.org` no longer resolves. **[SOURCED]** / **[VERIFIED]**

## Verified facts & measurements

### USDC contracts (view calls 2026-10-21)
| Network | Contract | `ft_metadata` | Supply (raw) | `storage_balance_bounds` | Notes |
|---|---|---|---|---|---|
| testnet | `3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af` | USDC / USDC / 6, spec ft-1.0.0 | 14,081,220,210,067,770 | 0.00125 / 0.00125 NEAR | Circle. 315,265 B, code hash `EoAUFWELjD9gYzsjKDXYRmHDHf1RJ95jaKNSYE6v9b2z`; 37 methods incl. `mint` (minters only), `master_minters`, `minter_allowance`, `blocklist`/`is_blocklisted`, `pausers`, `approve`/`allowance`/`transfer_from`, multisig admin, `upgrade`; 94,921 txs, active today |
| testnet | `usdc.fakes.testnet` | Bridged USDC / USDC.e / 6 | 3.01e32 | 0.00125 / 0.00125 | 205,446 B; 17 methods: open `mint`, `burn`, owner-only `set_decimals`/`set_icon`/`set_token_name`; near-sdk 3.1.0 (`…/near-sdk-3.1.0/src/utils/mod.rs` in a panic); source path `test-token/src/lib.rs` |
| testnet | `usdc.testnet` | USDC / USDC / 6 (no icon) | 1.0e16 | 0.00125 / 0.00125 | 1.89 MB; 12 methods, no mint → no way to obtain tokens |
| mainnet | `17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1` | USDC / USDC / 6 | — | 0.00125 / 0.00125 | Circle native. 321,491 B, code hash `DVJx7F3dHEHJYwpYPwXHu8K9Uo7h4kXFcALucY5oNX8q`; **same 37 method names** as Circle testnet; 1Click asset id `nep141:17208628…33a1` |
Circle docs list exactly these two NEAR ids (mainnet `17208628…33a1`, testnet `3e2210e1…b8af`). **[SOURCED]** The faucet page source contains `"NEAR":"Near Testnet"`, "20 USDC on testnet every 2 hours, per address, and per blockchain. If you need more, you can…" (Circle's Discord) and reCAPTCHA config. **[VERIFIED]**
Event formats: Circle emits `EVENT_JSON:{"standard":"nep141","version":"1.0.0","event":"ft_transfer","data":[{"old_owner_id":…,"new_owner_id":…,…}]}`, plus `EVENT_JSON:{"standard":"x-fiat-token","version":"1.0.0","event":"approve",…}` for allowances. **[VERIFIED]** (FastNEAR tx API on recent Circle testnet txs)

### NEP-141 buy-flow spike (testnet, token `usdc.fakes.testnet`, payer `satchel-spk-pay-e9ea1a.testnet`)
| Test | Tx | Observed |
|---|---|---|
| open mint 1,000 USDC.e | `3VrfdU1eFLgS4tg3NT4zcjDJgFFM1H99kT4qiifjq1qi` | success, FINAL in 2.95 s, **no event logged** |
| A: `ft_transfer` to unregistered account | `GrDXvEChNp87dgJ8feEZoPDTpmmmvUuz7oETPgoZQDyG` | `Smart contract panicked: The account seller.satchel-spk-pay-e9ea1a.testnet is not registered` |
| E: `ft_transfer` without 1 yocto | (rejected) | `Requires attached deposit of exactly 1 yoctoNEAR` |
| B: `ft_transfer_call` to unregistered receiver | `9VnXd1g5HXG1UYPTX9ZJA2DSqjmBTTRJvqSvdAbshgxi` | fails in the first receipt; `ft_on_transfer` never called |
| register other account (payer = me) | `3trnarL8oFnB5NxuNT5Kn5pjfSnAH1H25xKPrFfqC8ik` | `{"total":"1250000000000000000000","available":"0"}` |
| register again | `2BdsDcgxVUFJufkorqaPkd9k6twcZRUYHGV3eMJEG2Rd` | log "The account is already registered, refunding the deposit", deposit refunded |
| C: `ft_transfer_call` 1.000000 to registered account **without code** | `5VY9ejgPyPbcS72fhdX3WeJrXrBqSVZAHHXNEq4Cuyhq` | blk 274090225 transfer; 274090226 `CodeDoesNotExist`; 274090227 "Refund 1000000 …"; return `"0"`; balance restored |
| D: `ft_transfer_call` 1.000000 to WAT receiver returning `"250000"` (msg `{"buy":"1"}`, memo "satchel spike", 100 Tgas) | `1W7TyDFicWGPV2j8qKeDg32CzGvsUHJ5kYzGjhp9qFP` | 274090432 `Transfer 1000000 …`, `Memo: satchel spike` (2.83 Tgas); 274090433 receiver logs `pred=usdc.fakes.testnet` and `input={"sender_id":"satchel-spk-pay-e9ea1a.testnet","amount":"1000000","msg":"{\"buy\":\"1\"}"}` (0.97 Tgas); 274090434 `Refund 250000 …` (resolve 2.04 Tgas); return **`"750000"`**; balances 999,250,000 / 750,000 |

### 1Click (mainnet, read-only, no key, 11:43–11:48 UTC)
| Call | Result |
|---|---|
| `GET /v0/tokens` | 200, 205 tokens, 37 chains; fields `assetId, decimals, blockchain, symbol, price, priceUpdatedAt, contractAddress, coingeckoId`; `access-control-allow-origin: *`; `x-ratelimit-limit-unauth: 1200`, `x-ratelimit-reset-unauth: 60` |
| `POST /v0/quote` dry, EXACT_OUTPUT 5 USDC, Arb USDC → NEAR USDC, recipient `alice.near` (registered) | 201: `amountIn` 5051519, `minAmountIn` 5001003, `amountOut` = `minAmountOut` 5000000, `amountInUsd` 5.048680046322, `timeEstimate` 25, `withdrawFee` 0, `refundFee` 5300, `signature` present, no `depositAddress` (dry) |
| same, recipient `satchel.near` / `zzz.near` (exist, not registered) or fresh implicit `abab…ab` | 201: `minAmountIn` **5007457** (+6,454) |
| same, recipient `satchel-demo-buyer.near` (does not exist) | **400 `{"message":"Internal server error"}`** |
| same, recipient = the USDC contract id | 400 "Internal server error" |
| `recipientType: INTENTS` | 201, `minAmountIn` 5001003 |
| EXACT_INPUT 5 USDC | `amountOut` 4999000, `minAmountOut` 4949010 |
| `amount: "1"` | 400 "Failed to get quote" |
| past `deadline` | 400 "deadline is not valid" |
| unknown `originAsset` | 400 "tokenIn is not valid" |
| `X-API-Key: not-a-real-key` | 401 `{"message":"Invalid token","error":"Unauthorized"}` |
| `GET /v0/status?depositAddress=0x…dEaD` | 404 "Deposit address … not found" (no auth needed) |
| `GET /v0/status` (no param) | 400 "Deposit address should be not empty" |
| SDK 0.1.26, no `OpenAPI.TOKEN` | `getTokens()` and dry `getQuote()` OK |
Not run, by the Phase 0 rule: non-dry quotes (they create a deposit address) and `POST /v0/deposit/submit`.

Delivery pattern on mainnet (20 recent `intents.near` txs via FastNEAR): withdrawals reach recipients as `ft_transfer` (or `ft_transfer_call` when a msg is set) from `intents.near` on the token contract, with an `ft_resolve_withdraw` callback and `do_storage_deposit` when storage is needed. So on SUCCESS the buyer's USDC balance simply increases. **[VERIFIED]**

### Incident (Oct 1, 2026) and status page
- Postmortem by Alex Shevchenko, published 2026-10-16. The exploit was 23 failed deposit transactions from Sep 29 16:14 UTC to Oct 1 05:54 UTC. It was identified Oct 1 08:04 UTC and the contract paused at 08:33 UTC (29 min). All funds were recovered Oct 2. The root cause was "a deposit feature that called third-party contracts on NEAR … The token contract then refunded the deposited tokens, while the NEAR Intents contract retained its record of the deposit". A second vulnerability was reported Oct 7 via HackenProof (reward $300,000), after which "NEAR Intents removed deposit notifications". Monitoring "only tracked the discrepancy between the source chain and NEAR-side total token balances". **[SOURCED]** defiprime.com, techflowpost.com (secondary; the X post itself was not read)
- One X post describes a "1Click API incident, detected at 09:13 AM UTC" on Oct 1 with services under maintenance and no ETA, and says the team points to `partners.near-intents.org/shield/status` "as status.near-intents is being deprecated". **[SOURCED]** x.com/vinibarbosabr (secondary). `https://partners.near-intents.org/shield/status` loads (200: "Shield Status · Ongoing Incidents · Recently resolved incidents · Maintenance"); `status.near-intents.org` does not resolve. **[VERIFIED]** A machine API exists (`GET https://shield.chaindefuser.com/incident`) but needs a separate `SHIELD` key. **[SOURCED]**

## Reference — exact APIs, types, commands, tested snippets

### Ids
| Thing | Testnet | Mainnet |
|---|---|---|
| USDC (Circle) | `3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af` | `17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1` |
| USDC test fallback | `usdc.fakes.testnet` (open mint) | — |
| 1Click asset ids | — | NEAR USDC `nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1`; Arbitrum USDC `nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near`; Base USDC `nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near`; Ethereum USDC `nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near`; Solana USDC `nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near`; wNEAR `nep141:wrap.near` |

### NEP-141 semantics (sourced, then confirmed on-chain)
- NEP-141: "Caller of the method must attach a deposit of 1 yoctoⓃ"; "If it [the receiver] does not [implement `ft_on_transfer`], FT contract's `ft_resolve_transfer` MUST deal with the resulting failed cross-contract call and roll back the transfer"; `ft_on_transfer` "Returns a value, or a promise which resolves with a value. The value is the number of unused tokens in string form." **[SOURCED]** `near/NEPs@91562cc/neps/nep-0141.md`
- Reference implementation (`core_impl.rs` @ `421ffb42` = near-sdk-v5.29.1; identical in 5.30.0-rc.1):
  - `ft_transfer_call` does `assert_one_yocto()`; `sender_id = env::predecessor_account_id()`; `internal_transfer` **before** the call; `ext_ft_receiver::ext(receiver_id).with_unused_gas_weight(1).ft_on_transfer(sender_id, amount, msg).then(ext_ft_resolver::ext(current).with_static_gas(GAS_FOR_RESOLVE_TRANSFER /* 5 Tgas */).with_unused_gas_weight(0).ft_resolve_transfer(…))`.
  - `internal_ft_resolve_transfer`: `unused_amount = promise_result … .unwrap_or(amount).min(amount)`. A failed or unparsable result counts as "unused = everything". The refund is capped at the receiver's current balance and emits an `ft_transfer` event with memo `"refund"`. If the sender has unregistered meanwhile, the refund is **burned** (`FtBurn`, "The account of the sender was deleted").
  - `storage_deposit`: if already registered → log + refund attached deposit; else require `amount >= min` and refund the excess. `registration_only` "doesn't affect the implementation for vanilla fungible token". **[SOURCED]** `storage_impl.rs` @ `421ffb42`. `near_sdk::is_promise_success()` exists in 5.29.1 (`near-sdk/src/utils/mod.rs` L96) **[SOURCED]**
- Circle's contract is not near-contract-standards code. It has the same NEP-141/145 method names, but I could not exercise its `ft_transfer_call`/`storage_deposit` paths without faucet tokens. **[ASSUMED]** identical behaviour; re-run tests A–D against it once a human has fetched faucet USDC (see human actions).

### S-8 contract design sketch (for `sdk`/`sec`; documentation only, not compiled)
```rust
// Buyer: usdc.ft_transfer_call(receiver_id = satchel, amount = price, msg = {"buy":"<token_id>","listing_id":"<n>","expected_sig_count":<n>}), 1 yocto, ~150 Tgas.
// msg fields follow sec's design (70-security-and-clean-history.md): {"buy": id} alone lets a seller swap the listing under the buyer.
#[near]
impl FungibleTokenReceiver for Contract {
    fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> PromiseOrValue<U128> {
        // (1) Only our USDC may credit us. Anyone can call ft_on_transfer directly!
        require!(env::predecessor_account_id() == self.usdc, "ERR_WRONG_TOKEN");
        // (2) Any failure => panic. The panic reverts our state AND the token refunds 100% (resolve sees a failed promise).
        let BuyMsg { buy: token_id, listing_id, expected_sig_count } = near_sdk::serde_json::from_str(&msg).unwrap_or_else(|_| env::panic_str("ERR_BAD_MSG"));
        let l = self.listing_of(&token_id).unwrap_or_else(|| env::panic_str("ERR_NOT_LISTED"));
        require!(l.listing_id == listing_id && self.sig_count(&token_id) == expected_sig_count, "ERR_LISTING_CHANGED");
        require!(l.currency == Currency::Usdc, "ERR_WRONG_CURRENCY");
        require!(amount.0 == l.price.0, "ERR_WRONG_AMOUNT");             // S-8: exact price (or accept >= and return the excess)
        require!(env::block_height() >= l.listed_at + COOLDOWN_BLOCKS, "ERR_COOLDOWN");
        require!(sender_id != l.seller, "ERR_SELF_BUY");
        // (3) Atomic effects in THIS receipt: no cross-contract call that must succeed for the sale to stand.
        self.internal_sale_transfer(&token_id, &l.seller, &sender_id);   // clears approvals + listing, bumps delegate_epoch, emits nft_transfer
        let owed = self.proceeds.get(&l.seller).copied().unwrap_or(0);
        self.proceeds.insert(l.seller.clone(), owed + amount.0);          // escrow; seller withdraws later
        // emit satchel "sold" event {token_id, seller_id, buyer_id, price, currency}
        PromiseOrValue::Value(U128(0))                                    // keep everything
    }
}
#[payable] pub fn withdraw_proceeds(&mut self) -> Promise {               // 1 yocto (full-access-key guard)
    assert_one_yocto();
    let who = env::predecessor_account_id();
    let amt = self.proceeds.remove(&who).unwrap_or_else(|| env::panic_str("ERR_NOTHING_OWED"));
    ext_ft_core::ext(self.usdc.clone()).with_attached_deposit(NearToken::from_yoctonear(1)).with_static_gas(Gas::from_tgas(15))
        .ft_transfer(who.clone(), U128(amt), Some("satchel sale proceeds".into()))
        .then(Self::ext(env::current_account_id()).with_static_gas(Gas::from_tgas(5)).on_proceeds_sent(who, U128(amt)))
}
#[private] pub fn on_proceeds_sent(&mut self, who: AccountId, amount: U128) {
    if !near_sdk::is_promise_success() {                                 // e.g. seller not registered with USDC
        let owed = self.proceeds.get(&who).copied().unwrap_or(0);
        self.proceeds.insert(who, owed + amount.0);                       // re-credit; never lose track
    }
}
```
Notes for the sketch:
- **Panic vs `return amount`.** `sec`'s INV-16 says "refunds the full amount (returns `amount`) and changes nothing". Panicking gives the same refund, because `ft_resolve_transfer` treats a failed promise as "unused = all" (Test C). It also guarantees that no partial state survives. Either is fine; just never mutate state and then return a refund.
- **Why escrow.** A payout `ft_transfer` to an unregistered seller fails (test A). If that transfer were the promise returned from `ft_on_transfer`, the failure would make the token refund the buyer *after* the NFT already moved. That is the ghost-funds pattern. Escrow keeps the sale atomic and puts payout failures where they can be retried.
- **Optional auto-payout (P2).** Inside `ft_on_transfer`, after crediting `proceeds`, fire the same `ft_transfer` + `on_proceeds_sent` chain as a **detached** promise and still return `Value(0)`. A failed payout just leaves the credit in place. You can prefix the chain with `usdc.storage_deposit({account_id: seller, registration_only: true})`, attaching 0.00125 NEAR from the contract balance; it is refunded if the seller was already registered (verified on usdc.fakes; [ASSUMED] for Circle).
- **Gas.** `ft_transfer_call` itself burns ~2.8 Tgas; resolve has a static 5 Tgas; `ft_on_transfer` gets all the remaining gas. Have the wallet attach **100–150 Tgas** (100 Tgas worked with a trivial receiver; our receiver does an NFT transfer plus bookkeeping). Unused gas is refunded. [ASSUMED] for the exact Satchel number; `sdk` should measure it in sandbox.
- **Storage.** The NFT transfer and the `proceeds` insert grow contract storage, paid from the contract's own balance. Keep ≥ 1 NEAR buffer on the locked contract (anyone can top it up with a plain transfer).
- **S-7/S-8 symmetry.** A NEAR-priced `buy` (attached deposit) can pay the seller with `Promise::new(seller).transfer(price)` directly. A NEAR transfer to an existing account doesn't need registration, though it fails for a deleted account [ASSUMED]; use the same escrow for uniformity if cheap.

### Deploy-time and UI commands (testnet)
```bash
# 1) Register the Satchel contract with Circle testnet USDC (any funded account can pay; works after the lock)
near contract call-function as-transaction 3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af storage_deposit \
  json-args '{"account_id":"satchel.<team>.testnet","registration_only":true}' prepaid-gas '30 Tgas' attached-deposit '0.00125 NEAR' \
  sign-as <team-admin>.testnet network-config testnet sign-with-legacy-keychain send
# 2) Check any account's registration (seller before listing, buyer before buying)
near contract call-function as-read-only 3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af storage_balance_of \
  json-args '{"account_id":"seller.<team>.testnet"}' network-config testnet now      # null => not registered
# 3) Fallback token for tests/judges: mint yourself test USDC.e (register first)
near contract call-function as-transaction usdc.fakes.testnet storage_deposit json-args '{"account_id":"<you>.testnet"}' prepaid-gas '30 Tgas' attached-deposit '0.00125 NEAR' sign-as <you>.testnet network-config testnet sign-with-legacy-keychain send
near contract call-function as-transaction usdc.fakes.testnet mint json-args '{"account_id":"<you>.testnet","amount":"100000000"}' prepaid-gas '30 Tgas' attached-deposit '0 NEAR' sign-as <you>.testnet network-config testnet sign-with-legacy-keychain send
```
Buyer transaction from the web app (one action; see `40-frontend-wallet.md` for sending and tracking):
```ts
{ receiverId: USDC_ID, actions: [{ type: 'FunctionCall', params: {
    methodName: 'ft_transfer_call',
    args: { receiver_id: SATCHEL_ID, amount: listing.price /* "5000000" = 5 USDC */,
            msg: JSON.stringify({ buy: tokenId, listing_id: listing.listing_id, expected_sig_count: sigCount }) }, // fields per 70
    gas: '150000000000000', deposit: '1' } }] }
// Outcome: the tx's final SuccessValue is the USED amount ("5000000" on success, "0" if refunded).
// The UI must treat SuccessValue "0" as "purchase failed, refunded", even though the tx itself is a success!
```

### 1Click API reference (v0.1.10)
- Base `https://1click.chaindefuser.com`. Endpoints: `GET /v0/tokens`; `POST /v0/quote`; `GET /v0/status?depositAddress=…[&depositMemo=…]`; `POST /v0/deposit/submit {txHash, depositAddress, nearSenderAccount?, memo?}`. Also present: `/v0/any-input/withdrawals`, `/v0/generate-intent`, `/v0/submit-intent`, `/v0/orders*`, `/v0/auth/*`, `/v0/account/*`.
- Security on quote/status/submit: `X-API-Key` (header, "recommended") or `JWT-auth` (bearer, "legacy, use X-API-Key instead"). Docs: "send it as `X-API-Key` … `Authorization: Bearer` is also accepted for the same partner JWT." **[SOURCED]**
- `QuoteRequest` required fields: `dry`, `swapType` (`EXACT_INPUT|EXACT_OUTPUT|FLEX_INPUT|ANY_INPUT`), `slippageTolerance` (bps), `originAsset`, `depositType` (`ORIGIN_CHAIN|INTENTS|CONFIDENTIAL_INTENTS`), `destinationAsset`, `amount` (base units, integer string), `refundTo`, `refundType` (same enum as depositType), `recipient`, `recipientType` (`DESTINATION_CHAIN|INTENTS|CONFIDENTIAL_INTENTS`), `deadline` (ISO). Optional: `depositMode` (`SIMPLE|MEMO`), `referral`, `quoteWaitingTimeMs` (default 0), `appFees[{recipient, fee}]`, `insured` (+2 bps), `confidentiality`, `customRecipientMsg` (experimental), `connectedWallets`, `sessionId`, `virtualChain*`.
- `EXACT_OUTPUT` semantics (spec text): "The output amount (`amountOut`) is fixed; slippage is applied to the **input** side … `amountIn` will appear higher than `minAmountIn` by approximately your `slippageTolerance` … Any input amount above what is actually needed for the swap is **refunded** to your `refundTo` address after the swap completes … If the deposit is less than `minAmountIn`, the deposit is refunded by deadline."
- `QuoteResponse`: `correlationId`, `timestamp`, `signature` ("Must be saved on the client side (along with the whole quote) in order to resolve any disputes"), `quoteRequest`, `quote {depositAddress, depositMemo?, amountIn(+Formatted,+Usd), minAmountIn, amountOut(+Formatted,+Usd), minAmountOut, deadline ("Time when the deposit address becomes inactive and funds may be lost"), timeWhenInactive ("deposit address becomes cold, causing swap processing to take longer"), timeEstimate (s), refundFee, withdrawFee}`.
- Status values (docs): `PENDING_DEPOSIT` "Awaiting your token deposit" · `KNOWN_DEPOSIT_TX` "Deposit transaction detected" · `PROCESSING` "Swap being executed" · `SUCCESS` "Tokens delivered to destination address" · `INCOMPLETE_DEPOSIT` "Deposit below required amount" · `REFUNDED` "Swap failed, funds returned to refund address" · `FAILED` "Swap encountered an error". Terminal: `SUCCESS`, `REFUNDED`, `FAILED` ("Poll until `status` reaches a terminal state"). Status responses include `swapDetails {intentHashes, nearTxHashes, originChainTxHashes[{hash, explorerUrl}], destinationChainTxHashes[…], amountIn/Out(+Formatted,+Usd), slippage, refundedAmount(+Formatted,+Usd), refundReason, depositedAmount(+Formatted,+Usd), withdrawFee, referral}`. **[SOURCED]**
- SDK `@defuse-protocol/one-click-sdk-typescript@0.1.26` (only dist-tag; 60 KB ESM + axios, form-data, tweetnacl, @noble/hashes, @scure/base). API: `OpenAPI.BASE`, `OpenAPI.TOKEN` (sent as `Authorization: Bearer …`), `OpenAPI.HEADERS` (merged; use for `X-API-Key`); `OneClickService.getTokens()`, `getQuote(req)`, `getExecutionStatus(depositAddress, depositMemo?)`, `submitDepositTx({txHash, depositAddress})`, plus `generateIntent`, `submitIntent`, `createOrder`, … Enums: `QuoteRequest.swapType.EXACT_OUTPUT` etc. Its README still says JWT is "required for most endpoints" and links a Google Form. Both are outdated per the live API and the docs. **[VERIFIED]**

Server-side client (route handlers; the key never reaches the browser):
```ts
// lib/oneclick.ts (server only)
import { OpenAPI, OneClickService, QuoteRequest } from '@defuse-protocol/one-click-sdk-typescript';
OpenAPI.BASE = 'https://1click.chaindefuser.com';
if (process.env.ONECLICK_API_KEY) OpenAPI.HEADERS = { 'X-API-Key': process.env.ONECLICK_API_KEY }; // omit when unset: an invalid key => 401

export const NEAR_USDC = 'nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1';
export const ARB_USDC  = 'nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near';

export function quoteForPurchase(p: { priceUnits: string; buyerNear: string; refundEvm: string; dry: boolean }) {
  return OneClickService.getQuote({
    dry: p.dry, swapType: QuoteRequest.swapType.EXACT_OUTPUT, slippageTolerance: 100,
    originAsset: ARB_USDC, depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
    destinationAsset: NEAR_USDC, amount: p.priceUnits,                 // exactly the listing price, 6 decimals
    recipient: p.buyerNear, recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
    refundTo: p.refundEvm, refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
    deadline: new Date(Date.now() + 30 * 60_000).toISOString(),         // 30 min: Arbitrum confirms in seconds
    referral: 'satchel', quoteWaitingTimeMs: 3000,
  });
}
```

### S-12 end-to-end design (mainnet clip)
```
Buyer (mainnet NEAR wallet + any Arbitrum wallet)          Satchel web (Vercel)                     1Click            NEAR mainnet
1 open /s/1 (mainnet build) → "Pay from any chain"
2 pre-checks: buyer NEAR account exists (named) ─────────▶ view_account; usdc.storage_balance_of(buyer) (null is OK: 1Click covers storage)
3 enter refund address (Arbitrum 0x…) ───────────────────▶ POST /api/oneclick/quote {dry:true}  ───▶ /v0/quote (preview: "Pay ≈5.05 USDC")
4 "Get deposit address" ─────────────────────────────────▶ POST /api/oneclick/quote {dry:false} ───▶ /v0/quote → depositAddress, deadline
   UI stores the full QuoteResponse (incl. signature, correlationId) in localStorage and shows amountIn + address + QR + deadline
5 buyer sends amountIn Arbitrum USDC to depositAddress (MetaMask/any wallet; optional: viem writeContract from a connected wallet)
6 (optional) paste/auto-detect tx hash ──────────────────▶ POST /api/oneclick/submit ───────────────▶ /v0/deposit/submit
7 poll every 5 s ─────────────────────────────────────────▶ GET /api/oneclick/status?d=… ──────────▶ /v0/status
   PENDING_DEPOSIT → KNOWN_DEPOSIT_TX → PROCESSING → SUCCESS (timeEstimate ~25 s after deposit confirmation)
8 on SUCCESS: confirm usdc.ft_balance_of(buyer) ≥ price (RPC), show swapDetails hashes
9 "Complete purchase" (one tap) → wallet: usdc.ft_transfer_call(satchel, price, {"buy":"1","listing_id":…,"expected_sig_count":…}), 1 yocto, 150 Tgas ─▶ ft_on_transfer
10 tx SuccessValue == price ⇒ "You now control Satchel #1"; "0" ⇒ refunded (listing changed / cooldown) → show error, USDC back in buyer's NEAR account
```
Status → UI mapping (keys from `80-ux-spec.md`; corrections in bold):
| 1Click status | UI step / copy key | Behaviour |
|---|---|---|
| (dry quote) | `oneclick.quote` | "Pay {amountInFormatted} USDC on Arbitrum. {price} arrives in your NEAR account, then you complete the purchase." **Mention that the slippage buffer (amountIn − minAmountIn) is refunded to {refundTo}**, possibly minus `refundFee` (0.0053 USDC in today's quote; whether it applies to excess returns is [ASSUMED]). |
| `PENDING_DEPOSIT` | `oneclick.pending` | Show `amountIn`, `depositAddress`, QR, and a countdown to `deadline`. **If the deadline passes client-side: "This quote expired. Don't send funds; get a new quote."** |
| `KNOWN_DEPOSIT_TX` | `oneclick.known` | Link `originChainTxHashes[].explorerUrl` when present |
| `PROCESSING` | `oneclick.processing` | "Usually ~{timeEstimate}s" |
| `SUCCESS` | `oneclick.success` | Verify `ft_balance_of(buyer) ≥ price`, then enable **Complete purchase**; list `nearTxHashes`/`destinationChainTxHashes` for the README |
| `INCOMPLETE_DEPOSIT` | `oneclick.incomplete` | **Not necessarily terminal:** "You sent {depositedAmountFormatted}; {minAmountIn} was needed. Unless completed before {deadline}, it is refunded to {refundTo}." Keep polling [ASSUMED: top-ups count until the deadline; spec says deposits below `minAmountIn` are "refunded by deadline"] |
| `REFUNDED` | `oneclick.refunded` | Show `refundedAmountFormatted`, `refundReason` |
| `FAILED` | `oneclick.failed` | Show `correlationId` + link to `partners.near-intents.org/shield/status`; keep the saved quote + signature |

### Mainnet clip checklist and budget (NEAR $5.16, 2026-10-21)
| Item | Who | Cost | Recoverable |
|---|---|---|---|
| Mainnet team account (e.g. `satchel-<team>.near`) + sub-accounts `app.`, `seller.`, `buyer.` | human (wallet) | account creation ~0.1 NEAR via wallet [ASSUMED]; sub-accounts ≈ 0.002 NEAR each + initial balance | mostly |
| Satchel wasm deployed **unlocked** to `app.satchel-<team>.near`, init with `usdc = 17208628…33a1`, `mpc = v1.signer` | S1 | storage = `storage_amount_per_byte` 1e19 yocto (0.00001 NEAR/B, mainnet protocol 86 [VERIFIED]) × wasm size; ~300 KB [ASSUMED size, `sdk` measures] → ~3 NEAR (~$15) | yes (delete the account after judging) |
| `storage_deposit` on mainnet USDC for `app.` and `seller.` | S1 | 2 × 0.00125 NEAR | yes (`storage_unregister` when the balance is 0) |
| Mint Satchel #1, list for e.g. 2 USDC, wait 210 blocks (~2.1 min) | seller | ~0.01–0.02 NEAR storage + gas | partly |
| Buyer funds: ~2.05 USDC on Arbitrum (`amountIn` incl. 1% buffer) + ~$1 ETH on Arbitrum for gas | human (exchange withdrawal) | the price returns to our own seller; fees ≈ 0.02% swap + 0.0053 USDC refund fee + Arbitrum gas (cents) [VERIFIED quote; gas ASSUMED] | price yes (to seller) |
| Buyer's NEAR gas for "Complete purchase" | buyer | < 0.005 NEAR | no |
| 1Click partner key (to avoid the +25 bps and get per-key limits) | human | free | — |
| **Total** | | out of pocket ≈ $1–3; capital ≈ 5–6 NEAR + ~3 USDC + $1 ETH | well under $50 |
Disclose in the README: "The mainnet deployment used for the clip is unaudited and not locked (the full-access key is kept). It holds no funds; the canonical, locked deployment is on testnet."

## Gotchas & failure modes

1. **`ft_transfer_call` "succeeds" even when the purchase failed.** Its final `SuccessValue` is the *used* amount: "0" means fully refunded. The buyer UI must read it, not just check tx success. **[VERIFIED]** (Test C returned `"0"` with a successful tx status)
2. **Anyone can call `ft_on_transfer` directly.** Gate on `predecessor_account_id() == usdc`. **[VERIFIED]**: a direct call with a fake sender and amount executed (tx `52aCkXru…`), while the real flow shows the token as predecessor (Test D)
3. **The Satchel contract must be USDC-registered**, or every `ft_transfer_call` to it panics in the first receipt (test B). Add it to the deploy script before locking; it also works after locking. **[VERIFIED]**
4. **Seller registration:** the payout fails if the seller isn't registered (test A). Escrow plus re-credit handles it. The list UI should check `storage_balance_of(seller)` and offer "Register for USDC (0.00125 NEAR)" before listing. **[VERIFIED]**
5. **Refund is capped at the receiver's balance.** If our contract had already forwarded the tokens and then returned "unused > 0", the refund would silently shrink. Never return a non-zero unused amount after moving tokens out. **[SOURCED]** `core_impl.rs`
6. **Sender-unregistered edge:** if the buyer unregisters from USDC while the call is in flight, the refund is burned. That's harmless for us, but it shows how strictly the token contract trusts our return value. **[SOURCED]**
7. **`msg` is a string.** The wallet must `JSON.stringify` it; the contract parses with serde. Malformed msg → panic → full refund. **[VERIFIED]** for the encoding (Test D) and for full refund on a failed receiver receipt (Test C); a panic inside our own parser takes the same failed-promise path **[SOURCED]** `core_impl.rs`
8. **`usdc.fakes.testnet` emits no NEP-297 events** and its supply is huge and arbitrary. Never show its balances as "verified", and don't rely on FastNEAR FT indexes for it (`50` gotcha 7). **[VERIFIED]**
9. **Circle testnet USDC behaviour is assumed, not measured.** Circle's code is a separate implementation, and its `ft_resolve_transfer` gas and edge cases are unverified. Run tests A–D against it once faucet tokens exist. **[ASSUMED]**
10. **1Click opaque errors:** a non-existent named NEAR recipient returns `400 "Internal server error"`. Pre-validate with `view_account` and show "Create your NEAR account first". **[VERIFIED]**
11. **1Click unauth limit is per IP (1200/60 s).** Through our server, every user shares Vercel's egress IPs. With a key, limits are per key. **[VERIFIED]** header / **[ASSUMED]** per-key semantics
12. **Don't send an empty or invalid key** (401 "Invalid token"). Only set the header when the env var exists. **[VERIFIED]**
13. **The quote `deadline` is when "the deposit address becomes inactive and funds may be lost"**, so don't let users send after it. `timeWhenInactive` means slower processing. **[SOURCED]**
14. **Save the full `QuoteResponse` + `signature`** for disputes (docs). With no DB, use localStorage and show `correlationId` in the UI. **[SOURCED]**
15. **`customRecipientMsg` is a trap for Satchel.** It would call our `ft_on_transfer` with `sender_id = intents.near`, so the NFT would go to the intents contract unless msg named the buyer, and "Funds will be lost if … the recipient does not implement `ft_on_transfer`" or storage is short. **[SOURCED]**
16. **SDK README is stale** (Google Form, "JWT required"). Follow the OpenAPI spec and docs. **[VERIFIED]**
17. **1Click is mainnet-only**, so on testnet any "pay from any chain" must be clearly simulated or absent. S-8 (testnet USDC) stays canonical, as in the plan. **[SOURCED]** plan; consistent with `/v0/tokens` listing only mainnet assets **[VERIFIED]**

## Recommendations for Satchel (concrete, with priority)

- **P0 (Phase 0, human):** request the 1Click partner key at `https://partners.near-intents.org` (sign-in), and fetch 20 Circle testnet USDC every 2 h to the buyer demo accounts (`faucet.circle.com` → Near Testnet). Start now so ~100 USDC accumulate before Nov 6.
- **P0 (sdk):**
  - init params `usdc: AccountId` = Circle testnet id on testnet, `17208628…` on mainnet;
  - `ft_on_transfer` exactly as sketched (predecessor gate, panic-on-anything, atomic sale, `Value(0)`);
  - `proceeds` escrow + `withdraw_proceeds` with a re-credit callback;
  - sandbox tests: wrong token (direct call), wrong amount, bad msg, not listed, cooldown, self-buy, unregistered seller withdraw → re-credit.
  - answer to `21-testing-sandbox.md`'s open question: mock USDC in the sandbox = near-sdk `examples/fungible-token` built at the pinned 5.29.1. Its `ft_transfer_call`/`ft_resolve_transfer`/`storage_deposit` are the near-contract-standards code quoted above. Tests A–D ran on `usdc.fakes.testnet` (an older near-sdk 3.1 FT), and its results matched those semantics; re-run them once in the sandbox against the 5.29.1 mock. Give the mock 6 decimals and register the Satchel contract in test setup.
  - fill `22-deploy-and-lock.md`'s `"usdc":"<usdc>.testnet"` placeholder with `3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af`, and add the USDC `storage_deposit` for the contract to that runbook.
- **P0 (deploy script):** `storage_deposit` for the Satchel contract on testnet USDC (and `usdc.fakes.testnet` if accepted) before the lock. Verify with `storage_balance_of`.
- **P1 (web):** buyer flow sends `ft_transfer_call` (1 yocto, 150 Tgas) and interprets `SuccessValue`. The seller list flow checks USDC registration and the seller can "Withdraw proceeds". Show the buyer's USDC balance via `ft_balance_of`.
- **P1 (tests/judges):** README "Get test USDC" in two lines: Circle faucet (human), or `usdc.fakes.testnet mint` for a self-serve path. Whether the contract also accepts USDC.e as a second currency is an `sdk`/`sec` call. Recommendation: **single `usdc` per deployment** (simpler invariants), and use USDC.e only in a separate test deployment.
- **P2 (1Click clip):**
  - server routes `/api/oneclick/{quote,status,submit}` with `X-API-Key`, quotes `EXACT_OUTPUT`, `DESTINATION_CHAIN`, `slippageTolerance: 100`, 30-min deadline;
  - poll status every 5 s;
  - mainnet deployment unlocked + disclaimer; record the clip with a visible timer;
  - put all hashes (Arbitrum deposit, 1Click NEAR txs, purchase tx) in the README.
- **P2 (resilience):** link the Shield status page from the 1Click screen. If `/v0/tokens` or a dry quote fails, hide "Pay from any chain" rather than letting the user start.
- **Don't:** use `customRecipientMsg`, ship the key to the browser, or treat a successful `ft_transfer_call` tx as a successful purchase.

## Deltas vs plan (near_hackathon.md)

| Plan item | Finding | Recommended change |
|---|---|---|
| Key Findings 1Click: "Without a JWT you pay 'the extra 0.25% unauthenticated fee'"; SDK README "required for most endpoints" | Both partly stale. Auth is now `X-API-Key` (JWT "legacy"); tokens, dry quote and status work keyless; docs still say +25 bps unauth vs 1 bp partner for stablecoin routes; dry keyless quotes showed ~2 bps | Get the partner key (Partner Dashboard, not the Google Form); send `X-API-Key`; treat +25 bps as the documented unauth cost |
| Phase 0 "request the 1Click JWT" | The request path is now the Partner Dashboard (login at `signin.near-intents.org`) | Human: sign up there |
| Statuses list | Confirmed: `PENDING_DEPOSIT, KNOWN_DEPOSIT_TX, PROCESSING, SUCCESS, INCOMPLETE_DEPOSIT, REFUNDED, FAILED`; terminal = SUCCESS/REFUNDED/FAILED | `INCOMPLETE_DEPOSIT` is not terminal (until the deadline); tell `ux` |
| Oct 1 incident paragraph | Confirmed except "deposits and withdrawals halted on 11 networks" (not found in sources read) | Keep it, mark "11 networks" unverified; add the status page `partners.near-intents.org/shield/status` |
| B5 contract: `usdc: AccountId`, `ft_on_transfer` | Correct shape. Missing: predecessor gate, atomic sale, escrowed proceeds, contract's own USDC registration | Add these to S-8 acceptance criteria and the sandbox test list |
| S-8 "wrong amount or token refunded" | "Wrong token" means a *direct call* or a different FT: the predecessor gate makes it panic, and the FT refunds | Add test "direct `ft_on_transfer` call by an attacker → panic, no NFT moves" |
| S-8 msg `{"buy": token_id}` | `sec` (`70`) shows it's insufficient: the listing can change under the buyer | msg = `{"buy", "listing_id", "expected_sig_count"}`, checked in `ft_on_transfer` |
| S-8 testnet USDC (unspecified); the original plan says "USDC (test)" FT | Circle testnet USDC exists with a faucet (captcha); `usdc.fakes.testnet` has an open mint; no need to deploy our own FT | Use Circle testnet USDC; fall back to our own FT only if the faucet is down on Nov 1 |
| S-12 "USDC lands, one-tap Complete purchase" | Feasible as two steps; EXACT_OUTPUT delivers exactly the price to the buyer's own NEAR account; the purchase tx must check `SuccessValue` | Keep the two-step flow; do not try `customRecipientMsg` |
| B5 "Mainnet clips under $50" / "Do not lock a mainnet contract before an audit" | Clip ≈ $1–3 out of pocket + ~3 NEAR refundable storage; needs an unlocked mainnet deployment | Add "unlocked mainnet demo deployment, holds no funds" to the README limitations |
| B5 "/api/oneclick/quote (JWT server-side)" | Right idea; also add `/status` and `/submit`; key in `X-API-Key` | Three server routes |
| The original plan's "USDC storage 0.00125 NEAR" [37] | Confirmed for testnet (all three) and mainnet USDC | — |

## Open questions / human actions

1. **Human (now):** sign up at `https://partners.near-intents.org` and create a 1Click API key → Vercel env `ONECLICK_API_KEY` (server only). Note the fee schedule it shows for stablecoin routes.
2. **Human (repeat every 2 h until Nov 6):** faucet.circle.com → "Near Testnet" → 20 USDC to the buyer demo accounts (reCAPTCHA). Optionally send 20 to `satchel-spk-pay-e9ea1a.testnet` so `pay` can re-run tests A–D against Circle's contract (scripts ready: `research/spikes/pay/call.mjs`).
3. **Human (Nov 10–11, for the clip):** create mainnet accounts; fund ~6 NEAR; withdraw ~3 USDC + ~$1 ETH to an Arbitrum wallet; after judging (Nov 18+), delete `app.` to reclaim storage.
4. **sdk/sec decision:** accept exact price only (plan) or `>=` with the excess returned (friendlier when a wallet rounds)? Also auto-payout vs claim-only.
5. **Open:** is the +25 bps unauthenticated fee applied to non-dry quotes even though dry quotes don't show it? Compare a keyed dry quote with a keyless one once the key exists (cheap, read-only).
6. **Open:** does an `INCOMPLETE_DEPOSIT` accept a top-up before the deadline for EXACT_OUTPUT? Ask in the 1Click partner channel or test with $1 on mainnet during the clip rehearsal.
7. **Open:** Circle testnet USDC `ft_resolve_transfer` gas and refund behaviour (see gotcha 9).
