//! C6: NEAR and allowlisted NEP-141 tokens held inside a Satchel (spec docs/specs/C4-C6.md §2). Balances are keyed by
//! token id, so they move with every ownership change. Deposits: anyone. Withdrawals: the owner, exactly 1 yocto, never
//! while listed; each one debits first, bumps `inside_epoch`, and a failed transfer is re-credited by a panic-free
//! callback that only overwrites existing slots.

use near_sdk::json_types::U128;
use near_sdk::serde_json::json;
use near_sdk::{env, near, AccountId, Gas, PromiseError};

use crate::errors::*;
use crate::events::SatchelEvent;
use crate::types::TokenId;
use crate::{promise, Contract, ContractExt, ON_PAYOUT_GAS_TGAS, PAYOUT_FT_GAS_TGAS};

/// Per-token inside state. Fixed size (borsh: 16 + 8 bytes), so updating it never changes storage usage.
#[near(serializers = [borsh])]
#[derive(Clone, Copy, Default, Debug, PartialEq)]
pub struct Inside {
    pub near: u128,
    /// Bumped by every withdrawal; offers bind to it (C4).
    pub epoch: u64,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct FtBalanceView {
    pub token: AccountId,
    pub amount: U128,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct InsideView {
    pub near: U128,
    pub fts: Vec<FtBalanceView>,
    pub inside_epoch: u64,
}

impl Contract {
    pub(crate) fn inside_epoch(&self, token_id: &TokenId) -> u64 {
        self.market.inside.get(token_id).map(|i| i.epoch).unwrap_or(0)
    }

    /// Withdrawal checks 1–4 of spec §2.2 (token, owner, exactly 1 yocto, not listed). Returns the owner.
    fn check_withdraw(&self, token_id: &TokenId) -> AccountId {
        let owner = self.owner_of(token_id);
        ensure(env::predecessor_account_id() == owner, ERR_NOT_OWNER);
        crate::sale::ensure_one_yocto();
        ensure(self.token_state(token_id).listing.is_none(), ERR_LISTED);
        owner
    }

    /// FT deposit through `ft_on_transfer` msg `{"deposit":"<token_id>"}`. The predecessor is already allowlisted.
    /// Creates the token's inside record and the (token, ft) slot on first use, paid from the sender's storage credit.
    pub(crate) fn ft_deposit(&mut self, ft: AccountId, sender_id: AccountId, token_id: TokenId, amount: u128) {
        self.owner_of(&token_id); // ERR_TOKEN_NOT_FOUND
        ensure(amount > 0, ERR_AMOUNT);
        let s0 = env::storage_usage();
        if !self.market.inside.contains_key(&token_id) {
            self.market.inside.insert(token_id.clone(), Inside::default());
        }
        let key = (token_id.clone(), ft.clone());
        let have = self.market.inside_ft.get(&key).copied().unwrap_or(0);
        self.market.inside_ft.insert(key, have.saturating_add(amount));
        self.market.flush();
        self.charge_credit(&sender_id, s0);
        SatchelEvent::InsideDeposit { token_id, sender_id, ft: Some(ft), amount: U128(amount) }.emit();
    }
}

#[near]
impl Contract {
    /// Anyone. Credits `attached − storage` to the token; storage is only charged when this creates the token's
    /// inside record. Returns the credited amount.
    #[payable]
    pub fn deposit_near(&mut self, token_id: TokenId) -> U128 {
        self.owner_of(&token_id); // ERR_TOKEN_NOT_FOUND
        let attached = env::attached_deposit().as_yoctonear();
        ensure(attached > 0, ERR_DEPOSIT);
        let s0 = env::storage_usage();
        let mut ins = self.market.inside.get(&token_id).copied().unwrap_or_default();
        self.market.inside.insert(token_id.clone(), ins);
        self.market.inside.flush();
        let cost = env::storage_usage().saturating_sub(s0) as u128 * env::storage_byte_cost().as_yoctonear();
        if attached <= cost {
            fail_with(ERR_DEPOSIT, &["attach > ", &cost.to_string(), " yocto"].concat());
        }
        let credited = attached - cost;
        ins.near += credited;
        self.market.inside.insert(token_id.clone(), ins);
        self.market.inside.flush();
        self.market.totals.inside_near += credited;
        SatchelEvent::InsideDeposit { token_id, sender_id: env::predecessor_account_id(), ft: None, amount: U128(credited) }
            .emit();
        U128(credited)
    }

    /// Owner only, exactly 1 yocto, not while listed. Debit, bump the epoch, transfer `.then(on_inside_withdraw)`.
    #[payable]
    pub fn withdraw_near(&mut self, token_id: TokenId, amount: U128, receiver_id: Option<AccountId>) {
        let owner = self.check_withdraw(&token_id);
        ensure(amount.0 > 0, ERR_AMOUNT);
        let mut ins = self.market.inside.get(&token_id).copied().unwrap_or_default();
        ensure(amount.0 <= ins.near, ERR_INSIDE_BALANCE);
        let receiver = receiver_id.unwrap_or_else(|| owner.clone());
        ensure(receiver != env::current_account_id(), ERR_BAD_RECEIVER);
        ins.near -= amount.0;
        ins.epoch += 1;
        self.market.inside.insert(token_id.clone(), ins);
        self.market.totals.inside_near -= amount.0;
        SatchelEvent::InsideWithdraw {
            token_id: token_id.clone(),
            owner_id: owner,
            receiver_id: receiver.clone(),
            ft: None,
            amount,
            inside_epoch: ins.epoch,
        }
        .emit();
        let p = promise::transfer(&receiver, amount.0);
        let cb = json!({ "token_id": token_id, "ft": null, "amount": amount }).to_string();
        let cb = promise::then_call(p, &env::current_account_id(), "on_inside_withdraw", cb.as_bytes(), Gas::from_tgas(ON_PAYOUT_GAS_TGAS));
        env::promise_return(cb);
    }

    /// Owner only, exactly 1 yocto, not while listed. `ft.ft_transfer(receiver, amount)` `.then(on_inside_withdraw)`.
    #[payable]
    pub fn withdraw_ft(&mut self, token_id: TokenId, ft: AccountId, amount: U128, receiver_id: Option<AccountId>) {
        let owner = self.check_withdraw(&token_id);
        ensure(self.is_inside_ft(&ft), ERR_WRONG_TOKEN);
        ensure(amount.0 > 0, ERR_AMOUNT);
        let key = (token_id.clone(), ft.clone());
        let have = self.market.inside_ft.get(&key).copied().unwrap_or(0);
        ensure(amount.0 <= have, ERR_INSIDE_BALANCE);
        let receiver = receiver_id.unwrap_or_else(|| owner.clone());
        ensure(receiver != env::current_account_id(), ERR_BAD_RECEIVER);
        // A non-zero FT slot implies the inside record exists (ft_deposit creates both), so both writes overwrite.
        let mut ins = self.market.inside.get(&token_id).copied().unwrap_or_default();
        ins.epoch += 1;
        self.market.inside.insert(token_id.clone(), ins);
        self.market.inside_ft.insert(key, have - amount.0); // the slot is kept (at 0 if emptied) for a re-credit
        SatchelEvent::InsideWithdraw {
            token_id: token_id.clone(),
            owner_id: owner,
            receiver_id: receiver.clone(),
            ft: Some(ft.clone()),
            amount,
            inside_epoch: ins.epoch,
        }
        .emit();
        let args = json!({ "receiver_id": receiver, "amount": amount, "memo": "satchel withdraw" }).to_string();
        let p = promise::call(&ft, "ft_transfer", args.as_bytes(), 1, Gas::from_tgas(PAYOUT_FT_GAS_TGAS), 0);
        let cb = json!({ "token_id": token_id, "ft": ft, "amount": amount }).to_string();
        let cb = promise::then_call(p, &env::current_account_id(), "on_inside_withdraw", cb.as_bytes(), Gas::from_tgas(ON_PAYOUT_GAS_TGAS));
        env::promise_return(cb);
    }

    /// Self only. MUST NOT panic. Acts only as the callback of exactly one transfer (else a logged no-op, as S-13).
    /// If the transfer failed, re-credits the same token by `amount`; both slots already exist, so this only
    /// overwrites fixed-size values (no contract-paid storage, as S-01). Returns whether the transfer was delivered.
    #[private]
    pub fn on_inside_withdraw(&mut self, token_id: TokenId, ft: Option<AccountId>, amount: U128) -> bool {
        if env::promise_results_count() != 1 {
            env::log_str("on_inside_withdraw: ignored (expects exactly one promise result)");
            return false;
        }
        let ok = !matches!(env::promise_result_checked(0, 0), Err(PromiseError::Failed));
        if !ok {
            match &ft {
                None => {
                    if let Some(ins) = self.market.inside.get_mut(&token_id) {
                        ins.near = ins.near.saturating_add(amount.0);
                        self.market.totals.inside_near = self.market.totals.inside_near.saturating_add(amount.0);
                    } else {
                        env::log_str("on_inside_withdraw: no inside record (unreachable)");
                    }
                }
                Some(f) => {
                    let key = (token_id.clone(), f.clone());
                    if let Some(v) = self.market.inside_ft.get_mut(&key) {
                        *v = v.saturating_add(amount.0);
                    } else {
                        env::log_str("on_inside_withdraw: no ft slot (unreachable)");
                    }
                }
            }
        }
        SatchelEvent::InsideWithdrawResolved { token_id, ft, amount, ok }.emit();
        ok
    }

    /// The token's inside balances (`fts` lists only non-zero balances). None = no such token.
    pub fn inside_of(&self, token_id: TokenId) -> Option<InsideView> {
        self.tokens.owner_by_id.get(&token_id)?;
        let ins = self.market.inside.get(&token_id).copied().unwrap_or_default();
        let fts = self
            .inside_fts()
            .into_iter()
            .filter_map(|f| {
                let a = self.market.inside_ft.get(&(token_id.clone(), f.clone())).copied().unwrap_or(0);
                (a > 0).then_some(FtBalanceView { token: f, amount: U128(a) })
            })
            .collect();
        Some(InsideView { near: U128(ins.near), fts, inside_epoch: ins.epoch })
    }
}
