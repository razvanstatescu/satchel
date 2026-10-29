//! C5 spending allowance (delegated signer), docs/specs/C5.md.
//!
//! The owner lets a delegate call `sign_for` up to a cap per asset per rolling 24 h. The amounts come from the bytes the
//! contract classified itself (worst case, fees included, spec §3), never from the caller. Every delegated signature is
//! an ordinary record (written before the MPC call), so clean history is unchanged. Allowances are cleared on every
//! ownership change and paused while the token is listed.
//!
//! State lives under its own prefix (`StorageKey::Allowances`), opened on demand, so the `Contract` struct and `new`
//! stay unchanged and dev deployments redeploy in place (R-41).

use near_sdk::collections::LookupMap;
use near_sdk::json_types::U128;
use near_sdk::{env, near, AccountId, NearToken};

use crate::errors::{ensure, fail_with, sentence, ERR_DEPOSIT, ERR_NOT_OWNER};
use crate::parse::evm::EVM_CHAIN_IDS;
use crate::parse::rlp::{decode_exact, Item};
use crate::parse::{hex, Classified};
use crate::types::{SigDetail, SignRequest, TokenId};
use crate::{charge_storage, Contract, ContractExt, StorageKey};

// ── constants (spec §5) ──────────────────────────────────────────────────────────────────────────
pub const ALLOWANCE_WINDOW_MS: u64 = 86_400_000;
pub const MAX_DELEGATES: usize = 4;
pub const MAX_CAPS: usize = 8;
pub const MAX_SPENDS: usize = 32;
/// Solana base fee for a one-signature message (the classifier refuses compute-budget instructions).
pub const SOL_FEE_LAMPORTS: u128 = 5_000;
const ERC20_TRANSFER: [u8; 4] = [0xa9, 0x05, 0x9c, 0xbb];

// ── error codes (spec §2) ────────────────────────────────────────────────────────────────────────
pub const ERR_ALLOWANCE_DELEGATE: &str = "ERR_ALLOWANCE_DELEGATE";
pub const ERR_ALLOWANCE_CAPS: &str = "ERR_ALLOWANCE_CAPS";
pub const ERR_ALLOWANCE_EXPIRY: &str = "ERR_ALLOWANCE_EXPIRY";
pub const ERR_ALLOWANCE_LIMIT: &str = "ERR_ALLOWANCE_LIMIT";
pub const ERR_ALLOWANCE_NOT_FOUND: &str = "ERR_ALLOWANCE_NOT_FOUND";
pub const ERR_ALLOWANCE_EXPIRED: &str = "ERR_ALLOWANCE_EXPIRED";
pub const ERR_ALLOWANCE_KIND: &str = "ERR_ALLOWANCE_KIND";
pub const ERR_ALLOWANCE_ASSET: &str = "ERR_ALLOWANCE_ASSET";
pub const ERR_ALLOWANCE_EXCEEDED: &str = "ERR_ALLOWANCE_EXCEEDED";
pub const ERR_ALLOWANCE_RATE: &str = "ERR_ALLOWANCE_RATE";

/// A refusal: a stable code plus the human detail, raised as `CODE: detail`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Refusal {
    pub code: &'static str,
    pub detail: String,
}

impl Refusal {
    pub fn new(code: &'static str, detail: &str) -> Self {
        Refusal { code, detail: detail.to_string() }
    }
    pub fn fail(self) -> ! {
        fail_with(self.code, &self.detail)
    }
}

fn kind_refusal() -> Refusal {
    Refusal::new(ERR_ALLOWANCE_KIND, "delegates may only sign plain transfers (no message signing, no other calldata)")
}

fn overflow_refusal() -> Refusal {
    Refusal::new(ERR_ALLOWANCE_EXCEEDED, "amount overflows u128")
}

// ── types ────────────────────────────────────────────────────────────────────────────────────────

/// What a cap limits. JSON: `"btc"` | `"sol"` | `{"evm":{"chain_id":N}}` | `{"erc20":{"chain_id":N,"token":"<40 hex>"}}`.
/// Borsh-stored: never reorder the variants.
#[near(serializers = [json, borsh])]
#[serde(rename_all = "snake_case")]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Asset {
    /// sats
    Btc,
    /// wei, on one EVM chain
    Evm { chain_id: u64 },
    /// lamports
    Sol,
    /// token base units; `token` is 40 lowercase hex, no 0x, once validated
    Erc20 { chain_id: u64, token: String },
}

/// `set_allowance` input and `allowance_set` event entry.
#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct CapInput {
    pub asset: Asset,
    pub limit: U128,
}

/// One debit of a request (`allowance_spent` event entry).
#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct DebitView {
    pub asset: Asset,
    pub amount: U128,
}

#[near(serializers = [borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Spend {
    pub at_ms: u64,
    pub amount: u128,
}

#[near(serializers = [borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Cap {
    pub asset: Asset,
    pub limit: u128,
    /// debits still (possibly) inside the window, oldest first
    pub spends: Vec<Spend>,
}

#[near(serializers = [borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Allowance {
    pub delegate: AccountId,
    pub set_at_ms: u64,
    pub expires_at_ms: Option<u64>,
    pub caps: Vec<Cap>,
}

/// All allowances of one token, bound to the owner who granted them (backstop of the reset rule, spec §4).
#[near(serializers = [borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct TokenAllowances {
    pub owner: AccountId,
    pub list: Vec<Allowance>,
}

/// Who is calling `sign_for`.
#[derive(Clone, Debug, PartialEq)]
pub enum SignerKind {
    Owner(AccountId),
    Delegate { owner: AccountId, delegate: AccountId },
}

impl SignerKind {
    pub fn owner(&self) -> &AccountId {
        match self {
            SignerKind::Owner(o) | SignerKind::Delegate { owner: o, .. } => o,
        }
    }
    /// The account recorded as `requester`.
    pub fn requester(&self) -> &AccountId {
        match self {
            SignerKind::Owner(o) => o,
            SignerKind::Delegate { delegate, .. } => delegate,
        }
    }
}

// ── views ────────────────────────────────────────────────────────────────────────────────────────

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct SpendView {
    pub at_ms: u64,
    pub amount: U128,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct CapView {
    pub asset: Asset,
    pub limit: U128,
    pub spent: U128,
    pub remaining: U128,
    pub spends: Vec<SpendView>,
}

#[near(serializers = [json])]
#[serde(rename_all = "snake_case")]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AllowanceStatus {
    Active,
    Paused,
    Expired,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct AllowanceView {
    pub token_id: TokenId,
    pub delegate: AccountId,
    pub owner_id: AccountId,
    pub set_at_ms: u64,
    pub expires_at_ms: Option<u64>,
    pub status: AllowanceStatus,
    pub now_ms: u64,
    pub window_ms: u64,
    pub spends_in_window: u32,
    pub max_spends: u32,
    pub caps: Vec<CapView>,
}

// ── events (NEP-297, standard "satchel") ─────────────────────────────────────────────────────────

#[near(event_json(standard = "satchel"))]
pub enum AllowanceEvent {
    #[event_version("1.0.0")]
    AllowanceSet { token_id: TokenId, owner_id: AccountId, delegate_id: AccountId, caps: Vec<CapInput>, expires_at_ms: Option<u64> },
    #[event_version("1.0.0")]
    AllowanceRevoked { token_id: TokenId, owner_id: AccountId, delegate_id: AccountId },
    #[event_version("1.0.0")]
    AllowancesCleared { token_id: TokenId, delegate_ids: Vec<AccountId>, reason: String },
    #[event_version("1.0.0")]
    AllowanceSpent { token_id: TokenId, owner_id: AccountId, delegate_id: AccountId, first_seq: u64, debits: Vec<DebitView> },
}

// ── window accounting (pure; spec §4) ────────────────────────────────────────────────────────────

/// A debit stamped `at_ms` counts at `now_ms` iff `now_ms < at_ms + window`.
pub fn in_window(at_ms: u64, now_ms: u64) -> bool {
    now_ms < at_ms.saturating_add(ALLOWANCE_WINDOW_MS)
}

impl Cap {
    pub fn prune(&mut self, now_ms: u64) {
        self.spends.retain(|s| in_window(s.at_ms, now_ms));
    }
    pub fn spent(&self, now_ms: u64) -> u128 {
        self.spends.iter().filter(|s| in_window(s.at_ms, now_ms)).fold(0u128, |a, s| a.saturating_add(s.amount))
    }
    pub fn remaining(&self, now_ms: u64) -> u128 {
        self.limit.saturating_sub(self.spent(now_ms))
    }
}

impl Allowance {
    pub fn is_expired(&self, now_ms: u64) -> bool {
        matches!(self.expires_at_ms, Some(t) if now_ms >= t)
    }

    pub fn spends_in_window(&self, now_ms: u64) -> usize {
        self.caps.iter().map(|c| c.spends.iter().filter(|s| in_window(s.at_ms, now_ms)).count()).sum()
    }

    /// Check every debit against its cap and the rate limit, then append one spend entry per debit. All or nothing:
    /// on a refusal nothing changes except the pruning of entries that left the window (which changes no total).
    /// Order (mirrored in core `applyDebits`): per debit in request order, ASSET then EXCEEDED; then RATE.
    pub fn debit(&mut self, debits: &[(Asset, u128)], now_ms: u64) -> Result<(), Refusal> {
        for c in self.caps.iter_mut() {
            c.prune(now_ms);
        }
        let mut pending: Vec<(usize, u128)> = Vec::with_capacity(debits.len());
        for (asset, amount) in debits {
            let i = self
                .caps
                .iter()
                .position(|c| &c.asset == asset)
                .ok_or_else(|| Refusal::new(ERR_ALLOWANCE_ASSET, "no cap for an asset this request spends"))?;
            let already = pending.iter().filter(|(j, _)| *j == i).fold(0u128, |a, (_, x)| a.saturating_add(*x));
            let cap = &self.caps[i];
            let remaining = cap.remaining(now_ms).saturating_sub(already);
            if *amount > remaining {
                return Err(Refusal {
                    code: ERR_ALLOWANCE_EXCEEDED,
                    detail: ["remaining ", &remaining.to_string(), ", request needs ", &amount.to_string()].concat(),
                });
            }
            pending.push((i, *amount));
        }
        if self.spends_in_window(now_ms) + pending.len() > MAX_SPENDS {
            return Err(Refusal::new(ERR_ALLOWANCE_RATE, "too many delegated signatures in 24 h"));
        }
        for (i, amount) in pending {
            self.caps[i].spends.push(Spend { at_ms: now_ms, amount });
        }
        Ok(())
    }

    pub fn view(&self, token_id: &TokenId, owner: &AccountId, now_ms: u64, listed: bool) -> AllowanceView {
        let status = if self.is_expired(now_ms) {
            AllowanceStatus::Expired
        } else if listed {
            AllowanceStatus::Paused
        } else {
            AllowanceStatus::Active
        };
        AllowanceView {
            token_id: token_id.clone(),
            delegate: self.delegate.clone(),
            owner_id: owner.clone(),
            set_at_ms: self.set_at_ms,
            expires_at_ms: self.expires_at_ms,
            status,
            now_ms,
            window_ms: ALLOWANCE_WINDOW_MS,
            spends_in_window: self.spends_in_window(now_ms) as u32,
            max_spends: MAX_SPENDS as u32,
            caps: self
                .caps
                .iter()
                .map(|c| CapView {
                    asset: c.asset.clone(),
                    limit: U128(c.limit),
                    spent: U128(c.spent(now_ms)),
                    remaining: U128(c.remaining(now_ms)),
                    spends: c
                        .spends
                        .iter()
                        .filter(|s| in_window(s.at_ms, now_ms))
                        .map(|s| SpendView { at_ms: s.at_ms, amount: U128(s.amount) })
                        .collect(),
                })
                .collect(),
        }
    }
}

/// Validate and normalize `set_allowance` caps (spec §2 step 5).
pub fn validate_caps(caps: Vec<CapInput>) -> Result<Vec<Cap>, Refusal> {
    let bad = |d: &str| Refusal::new(ERR_ALLOWANCE_CAPS, d);
    if caps.is_empty() || caps.len() > MAX_CAPS {
        return Err(bad("1 to 8 caps"));
    }
    let mut out: Vec<Cap> = Vec::with_capacity(caps.len());
    for c in caps {
        if c.limit.0 == 0 {
            return Err(bad("a cap's limit must be > 0"));
        }
        let asset = match c.asset {
            Asset::Btc => Asset::Btc,
            Asset::Sol => Asset::Sol,
            Asset::Evm { chain_id } => {
                if !EVM_CHAIN_IDS.contains(&chain_id) {
                    return Err(bad("EVM chain id not allowed"));
                }
                Asset::Evm { chain_id }
            }
            Asset::Erc20 { chain_id, token } => {
                if !EVM_CHAIN_IDS.contains(&chain_id) {
                    return Err(bad("EVM chain id not allowed"));
                }
                match hex::decode(&token) {
                    Ok(b) if b.len() == 20 => Asset::Erc20 { chain_id, token: hex::encode(&b) },
                    _ => return Err(bad("token must be a 20-byte hex address")),
                }
            }
        };
        if out.iter().any(|o| o.asset == asset) {
            return Err(bad("an asset appears twice"));
        }
        out.push(Cap { asset, limit: c.limit.0, spends: vec![] });
    }
    Ok(out)
}

// ── debits: what a request can take out of the Satchel (pure; spec §3) ──────────────────────────

fn be_uint(b: &[u8], max_len: usize) -> Option<u128> {
    if b.len() > max_len || b.len() > 16 {
        return None;
    }
    Some(b.iter().fold(0u128, |a, x| (a << 8) | (*x as u128)))
}

/// EVM type-2 tx bytes → debits. Native: `value + gas_limit × max_fee_per_gas`. ERC-20 `transfer(address,uint256)`:
/// the token amount, then the native debit (gas is paid in ETH). Any other calldata → `ERR_ALLOWANCE_KIND`.
pub fn evm_debits(tx: &[u8]) -> Result<Vec<(Asset, u128)>, Refusal> {
    if tx.first() != Some(&0x02) {
        return Err(kind_refusal());
    }
    let fields = match decode_exact(&tx[1..]) {
        Ok(Item::List(f)) if f.len() == 9 => f,
        _ => return Err(kind_refusal()),
    };
    let s = |i: usize| match &fields[i] {
        Item::Str(b) => Ok(*b),
        Item::List(_) => Err(kind_refusal()),
    };
    let chain_id = be_uint(s(0)?, 8).ok_or_else(kind_refusal)? as u64;
    let max_fee = be_uint(s(3)?, 16).ok_or_else(kind_refusal)?;
    let gas = be_uint(s(4)?, 8).ok_or_else(kind_refusal)?;
    let to = s(5)?;
    let value = be_uint(s(6)?, 16).ok_or_else(kind_refusal)?;
    let data = s(7)?;
    let native = gas.checked_mul(max_fee).and_then(|fee| fee.checked_add(value)).ok_or_else(overflow_refusal)?;
    let evm = Asset::Evm { chain_id };
    if data.is_empty() {
        return Ok(vec![(evm, native)]);
    }
    if data.len() == 68 && data[..4] == ERC20_TRANSFER && to.len() == 20 {
        if data[36..52].iter().any(|b| *b != 0) {
            return Err(overflow_refusal());
        }
        let amount = be_uint(&data[52..68], 16).ok_or_else(overflow_refusal)?;
        return Ok(vec![(Asset::Erc20 { chain_id, token: hex::encode(to) }, amount), (evm, native)]);
    }
    Err(kind_refusal())
}

/// BTC outputs → [(value, script)]. The classifier already validated the encoding; this re-parse is defensive.
fn btc_outputs(o: &[u8]) -> Option<Vec<(u64, &[u8])>> {
    let mut out = Vec::new();
    let mut pos = 0usize;
    while pos < o.len() {
        let v = o.get(pos..pos + 8)?;
        let value = u64::from_le_bytes([v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7]]);
        pos += 8;
        let first = *o.get(pos)?;
        let (len, next) = match first {
            0x00..=0xfc => (first as usize, pos + 1),
            0xfd => {
                let b = o.get(pos + 1..pos + 3)?;
                (u16::from_le_bytes([b[0], b[1]]) as usize, pos + 3)
            }
            _ => return None,
        };
        let script = o.get(next..next.checked_add(len)?)?;
        out.push((value, script));
        pos = next + len;
    }
    Some(out)
}

/// BTC preimages + outputs → the sats the tx can take out: Σ outputs not paying `0014‖pkh` + the fee
/// (Σ input amounts − Σ outputs, if positive). `pkh` = the preimages' scriptCode pkh (a usable signature must carry it).
pub fn btc_debit(preimages: &[Vec<u8>], outputs: &[u8]) -> Result<u128, Refusal> {
    let p0 = preimages.first().filter(|p| p.len() == 182).ok_or_else(kind_refusal)?;
    let mut own = vec![0x00, 0x14];
    own.extend_from_slice(&p0[108..128]);
    let mut inputs: u128 = 0;
    for p in preimages {
        let a = p.get(130..138).ok_or_else(kind_refusal)?;
        inputs += u64::from_le_bytes([a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7]]) as u128;
    }
    let outs = btc_outputs(outputs).ok_or_else(kind_refusal)?;
    let total: u128 = outs.iter().map(|(v, _)| *v as u128).sum();
    let external: u128 = outs.iter().filter(|(_, s)| *s != own.as_slice()).map(|(v, _)| *v as u128).sum();
    Ok(external + inputs.saturating_sub(total))
}

/// What a classified request debits (spec §3). Exhaustive over `SigDetail` on purpose: a new record kind (C7 message
/// signing, …) does not compile until it is decided here, and the decision for anything that can't be measured is
/// `ERR_ALLOWANCE_KIND`.
pub fn request_debits(c: &Classified) -> Result<Vec<(Asset, u128)>, Refusal> {
    let first = c.items.first().ok_or_else(kind_refusal)?;
    match &first.detail {
        SigDetail::Evm { unsigned_tx, .. } => evm_debits(unsigned_tx),
        SigDetail::Btc { .. } => {
            let outputs = c.btc_outputs.as_deref().ok_or_else(kind_refusal)?;
            Ok(vec![(Asset::Btc, btc_debit(&c.preimages, outputs)?)])
        }
        SigDetail::Sol { lamports, .. } => Ok(vec![(Asset::Sol, *lamports as u128 + SOL_FEE_LAMPORTS)]),
        // C7: a message moves no coins, so no cap can measure it; delegates are refused in `authorize_signer` already
        SigDetail::EvmMessage { .. } | SigDetail::SolMessage { .. } => Err(kind_refusal()),
    }
}

// ── storage ──────────────────────────────────────────────────────────────────────────────────────

/// The allowance map, opened on demand under its own prefix (no `Contract` field: R-41 in-place redeploys).
/// The legacy map writes through at once, so `env::storage_usage()` sees every change without a flush.
fn store() -> LookupMap<TokenId, TokenAllowances> {
    LookupMap::new(StorageKey::Allowances)
}

/// The token's allowances, if they were granted by `owner` (the current owner). A set left by a previous owner is
/// treated as absent everywhere (spec §4 backstop).
fn live_set(token_id: &TokenId, owner: &AccountId) -> Option<TokenAllowances> {
    store().get(token_id).filter(|s| &s.owner == owner)
}

fn one_yocto() {
    if env::attached_deposit() != NearToken::from_yoctonear(1) {
        fail_with(ERR_DEPOSIT, "attach exactly 1 yocto");
    }
}

// ── hooks used by sign_for, nft_transfer and the sale ────────────────────────────────────────────

impl Contract {
    /// `sign_for` step 1: the owner, or a delegate with a live, unexpired allowance from the current owner, for a request
    /// kind delegates may sign. Strangers get `ERR_NOT_OWNER` as before (INV-01). Panics `ERR_TOKEN_NOT_FOUND`.
    pub(crate) fn authorize_signer(
        &self,
        token_id: &TokenId,
        predecessor: &AccountId,
        request: &SignRequest,
    ) -> Result<SignerKind, Refusal> {
        let owner = self.owner_of(token_id);
        if *predecessor == owner {
            return Ok(SignerKind::Owner(owner));
        }
        let not_owner = || Refusal::new(ERR_NOT_OWNER, sentence(ERR_NOT_OWNER));
        let set = live_set(token_id, &owner).ok_or_else(not_owner)?;
        let a = set.list.iter().find(|a| &a.delegate == predecessor).ok_or_else(not_owner)?;
        // Kinds a delegate may sign. Exhaustive on purpose: a new SignRequest kind (C7 messages) must be decided here;
        // anything whose value can't be capped is refused.
        match request {
            SignRequest::Evm { .. } | SignRequest::Btc { .. } | SignRequest::Sol { .. } => {}
            // C7: message signing (log-ins, ownership proofs) is the owner's alone
            SignRequest::EvmMessage { .. } | SignRequest::SolMessage { .. } => return Err(kind_refusal()),
        }
        if a.is_expired(env::block_timestamp_ms()) {
            return Err(Refusal::new(ERR_ALLOWANCE_EXPIRED, "the allowance has expired"));
        }
        Ok(SignerKind::Delegate { owner, delegate: predecessor.clone() })
    }

    /// `sign_for` step 4c (delegates only; owners pass through): debit the request against the delegate's caps and
    /// append the spend entries. Call inside the storage measurement, before the records are written. Returns the
    /// `allowance_spent` event to emit after `sign_requested`.
    pub(crate) fn debit_allowance(
        &mut self,
        token_id: &TokenId,
        signer: &SignerKind,
        c: &Classified,
        first_seq: u64,
    ) -> Result<Option<AllowanceEvent>, Refusal> {
        let SignerKind::Delegate { owner, delegate } = signer else {
            return Ok(None);
        };
        let debits = request_debits(c)?;
        let not_owner = || Refusal::new(ERR_NOT_OWNER, sentence(ERR_NOT_OWNER));
        let mut set = live_set(token_id, owner).ok_or_else(not_owner)?;
        let a = set.list.iter_mut().find(|a| &a.delegate == delegate).ok_or_else(not_owner)?;
        a.debit(&debits, env::block_timestamp_ms())?;
        store().insert(token_id, &set);
        Ok(Some(AllowanceEvent::AllowanceSpent {
            token_id: token_id.clone(),
            owner_id: owner.clone(),
            delegate_id: delegate.clone(),
            first_seq,
            debits: debits.into_iter().map(|(asset, amount)| DebitView { asset, amount: U128(amount) }).collect(),
        }))
    }

    /// Reset rule (spec §4): every ownership change clears all allowances of the token. `reason`: "transfer" | "sale".
    pub(crate) fn clear_allowances(&mut self, token_id: &TokenId, reason: &str) {
        if let Some(set) = store().remove(token_id) {
            AllowanceEvent::AllowancesCleared {
                token_id: token_id.clone(),
                delegate_ids: set.list.into_iter().map(|a| a.delegate).collect(),
                reason: reason.to_string(),
            }
            .emit();
        }
    }
}

// ── public methods and views ─────────────────────────────────────────────────────────────────────

#[near]
impl Contract {
    /// Owner only. Creates or replaces `delegate`'s allowance. Attach ≥ the measured storage (min 1 yocto; callers
    /// attach 0.01 NEAR), excess refunded. Spends still inside the window are kept for assets that keep a cap.
    #[payable]
    pub fn set_allowance(&mut self, token_id: TokenId, delegate: AccountId, caps: Vec<CapInput>, expires_at_ms: Option<u64>) {
        let owner = self.owner_of(&token_id);
        ensure(env::predecessor_account_id() == owner, ERR_NOT_OWNER);
        if env::attached_deposit().is_zero() {
            fail_with(ERR_DEPOSIT, "attach ≥ 1 yocto");
        }
        if delegate == owner
            || delegate == env::current_account_id()
            || delegate == self.mpc
            || Some(&delegate) == self.usdc.as_ref()
        {
            fail_with(ERR_ALLOWANCE_DELEGATE, "the delegate can't be the owner, the contract, the MPC or USDC");
        }
        let mut new_caps = validate_caps(caps).unwrap_or_else(|r| r.fail());
        let now = env::block_timestamp_ms();
        if matches!(expires_at_ms, Some(t) if t <= now) {
            fail_with(ERR_ALLOWANCE_EXPIRY, "expires_at_ms must be in the future");
        }
        let mut set = live_set(&token_id, &owner).unwrap_or(TokenAllowances { owner: owner.clone(), list: vec![] });
        set.list.retain(|a| a.delegate == delegate || !a.is_expired(now));
        match set.list.iter().position(|a| a.delegate == delegate) {
            Some(i) => {
                let old = &set.list[i];
                for c in new_caps.iter_mut() {
                    if let Some(o) = old.caps.iter().find(|o| o.asset == c.asset) {
                        c.spends = o.spends.iter().filter(|s| in_window(s.at_ms, now)).cloned().collect();
                    }
                }
                set.list[i] = Allowance { delegate: delegate.clone(), set_at_ms: now, expires_at_ms, caps: new_caps };
            }
            None => {
                if set.list.len() >= MAX_DELEGATES {
                    fail_with(ERR_ALLOWANCE_LIMIT, "a token can have at most 4 delegates");
                }
                set.list.push(Allowance { delegate: delegate.clone(), set_at_ms: now, expires_at_ms, caps: new_caps });
            }
        }
        let caps_now: Vec<CapInput> = set
            .list
            .iter()
            .find(|a| a.delegate == delegate)
            .map(|a| a.caps.iter().map(|c| CapInput { asset: c.asset.clone(), limit: U128(c.limit) }).collect())
            .unwrap_or_default();
        let s0 = env::storage_usage();
        store().insert(&token_id, &set);
        charge_storage(s0, 0, 1);
        AllowanceEvent::AllowanceSet { token_id, owner_id: owner, delegate_id: delegate, caps: caps_now, expires_at_ms }.emit();
    }

    /// Owner only, exactly 1 yocto. Removes `delegate`'s allowance (expired ones too). Freed storage stays in the
    /// contract, like `delist`.
    #[payable]
    pub fn revoke_allowance(&mut self, token_id: TokenId, delegate: AccountId) {
        let owner = self.owner_of(&token_id);
        ensure(env::predecessor_account_id() == owner, ERR_NOT_OWNER);
        one_yocto();
        fn not_found() -> ! {
            fail_with(ERR_ALLOWANCE_NOT_FOUND, "no allowance for this delegate")
        }
        let mut set = live_set(&token_id, &owner).unwrap_or_else(|| not_found());
        let i = set.list.iter().position(|a| a.delegate == delegate).unwrap_or_else(|| not_found());
        set.list.remove(i);
        if set.list.is_empty() {
            store().remove(&token_id);
        } else {
            store().insert(&token_id, &set);
        }
        AllowanceEvent::AllowanceRevoked { token_id, owner_id: owner, delegate_id: delegate }.emit();
    }

    /// Every allowance of the token granted by its current owner, with the amounts left in the current window.
    pub fn allowances_of(&self, token_id: TokenId) -> Vec<AllowanceView> {
        let Some(owner) = self.tokens.owner_by_id.get(&token_id) else {
            return vec![];
        };
        let listed = self.token_state(&token_id).listing.is_some();
        let now = env::block_timestamp_ms();
        live_set(&token_id, &owner)
            .map(|s| s.list.iter().map(|a| a.view(&token_id, &owner, now, listed)).collect())
            .unwrap_or_default()
    }

    /// One delegate's allowance on the token, or null.
    pub fn allowance(&self, token_id: TokenId, delegate: AccountId) -> Option<AllowanceView> {
        self.allowances_of(token_id).into_iter().find(|v| v.delegate == delegate)
    }
}
