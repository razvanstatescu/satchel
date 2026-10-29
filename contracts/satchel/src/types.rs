//! Types (spec §5.3) and view shapes (spec §5.14).

use near_sdk::json_types::{U128, U64};
use near_sdk::{near, AccountId};

pub type TokenId = String;

#[near(serializers = [json, borsh])]
#[serde(rename_all = "snake_case")]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Chain {
    Btc,
    Evm,
    Sol,
}

impl Chain {
    pub fn slug(self) -> &'static str {
        match self {
            Chain::Btc => "btc",
            Chain::Evm => "evm",
            Chain::Sol => "sol",
        }
    }
    pub fn domain_id(self) -> u64 {
        match self {
            Chain::Btc | Chain::Evm => 0,
            Chain::Sol => 1,
        }
    }
}

/// What the caller asks the contract to sign. Externally tagged JSON:
/// `{"evm":{"unsigned_tx":"02…"}}`, `{"btc":{"preimages":["…"],"outputs":"…"}}`, `{"sol":{"message":"…"}}`.
#[near(serializers = [json])]
#[serde(rename_all = "snake_case")]
#[derive(Clone, Debug)]
pub enum SignRequest {
    Evm { unsigned_tx: String },
    Btc { preimages: Vec<String>, outputs: String },
    Sol { message: String },
}

#[near(serializers = [borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct SigRecord {
    pub request_id: u64,
    pub input_index: u8,
    pub height: u64,
    pub timestamp_ms: u64,
    pub requester: AccountId,
    pub payload: [u8; 32],
    pub detail: SigDetail,
    pub status: SigStatus,
    pub signature: [u8; 65],
}

#[near(serializers = [borsh])]
#[derive(Clone, Debug, PartialEq)]
pub enum SigDetail {
    Evm { chain_id: u64, nonce: u64, unsigned_tx: Vec<u8> },
    Btc { txid: [u8; 32], vout: u32, amount_sats: u64 },
    Sol { recent_blockhash: [u8; 32], lamports: u64 },
}

impl SigDetail {
    pub fn chain(&self) -> Chain {
        match self {
            SigDetail::Evm { .. } => Chain::Evm,
            SigDetail::Btc { .. } => Chain::Btc,
            SigDetail::Sol { .. } => Chain::Sol,
        }
    }
}

#[near(serializers = [json, borsh])]
#[serde(rename_all = "snake_case")]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum SigStatus {
    Pending,
    Signed,
    Failed,
    Unparsed,
}

#[near(serializers = [borsh])]
#[derive(Default, Clone, Debug)]
pub struct TokenState {
    pub sig_count: u64,
    pub last_sign_height: u64,
    pub listing: Option<Listing>,
    /// Highest EVM (Sepolia) nonce ever signed for this token; None = no EVM record yet. Drives the nonce-gap rule
    /// (spec §5.9, D-43): a new EVM request needs `nonce ≤ max + 1`, or `nonce ≤ 1` for the first one.
    pub max_evm_nonce: Option<u64>,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Listing {
    pub id: u64,
    pub seller: AccountId,
    pub price: U128,
    pub currency: Currency,
    pub listed_at: u64,
    pub sig_count: u64,
}

#[near(serializers = [json, borsh])]
#[serde(rename_all = "snake_case")]
#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Debug)]
pub enum Currency {
    Near,
    Usdc,
}

/// msg of `ft_transfer_call` to this contract (docs/specs/C4-C6.md §1.2):
/// `{"buy":{"token_id":"3","listing_id":7,"expected_sig_count":4}}` (USDC),
/// `{"offer":{"token_id":"3","expected_sig_count":4,"expected_inside_epoch":0,"expires_at_ms":1793000000000}}` (USDC),
/// `{"deposit":"3"}` (any allowlisted FT).
#[near(serializers = [json])]
#[serde(rename_all = "snake_case")]
#[derive(Clone, Debug)]
pub enum FtMsg {
    Buy { token_id: TokenId, listing_id: u64, expected_sig_count: u64 },
    Offer(crate::offers::OfferMsg),
    Deposit(TokenId),
}

// ── views ────────────────────────────────────────────────────────────────────────────────

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct GasFormula {
    pub base: u64,
    pub per_request: u64,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct ConfigView {
    pub version: String,
    pub mpc_contract_id: AccountId,
    pub usdc_contract_id: Option<AccountId>,
    pub cooldown_blocks: u64,
    pub evm_chain_ids: Vec<u64>,
    pub max_btc_inputs: u64,
    pub mpc_sign_gas_tgas: u64,
    pub on_signed_gas_tgas: GasFormula,
    pub min_sign_prepaid_tgas: GasFormula,
    pub max_mpc_deposit: U128,
    pub storage_byte_cost: U128,
    pub base_uri: String,
    pub next_token_id: u64,
    pub next_listing_id: u64,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct PathsView {
    pub btc: String,
    pub evm: String,
    pub sol: String,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct SatchelView {
    pub token_id: TokenId,
    pub owner_id: AccountId,
    pub sig_count: u64,
    pub last_sign_height: u64,
    pub listable_at: u64,
    pub listing: Option<Listing>,
    pub paths: PathsView,
}

#[near(serializers = [json])]
#[serde(untagged)]
#[derive(Clone, Debug, PartialEq)]
pub enum SignatureView {
    Secp256k1 { r: String, s: String, recovery_id: u8 },
    Ed25519 { signature: String },
}

#[near(serializers = [json])]
#[serde(rename_all = "snake_case")]
#[derive(Clone, Debug, PartialEq)]
pub enum SigDetailView {
    Evm { chain_id: u64, nonce: u64, unsigned_tx: String },
    Btc { txid: String, vout: u32, amount_sats: U64 },
    Sol { recent_blockhash: String, lamports: U64 },
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct SigRecordView {
    pub seq: u64,
    pub request_id: u64,
    pub input_index: u8,
    pub chain: Chain,
    pub height: u64,
    pub timestamp_ms: u64,
    pub requester: AccountId,
    pub payload: String,
    pub status: SigStatus,
    pub signature: Option<SignatureView>,
    pub detail: SigDetailView,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct ListingView {
    pub token_id: TokenId,
    pub listing: Listing,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct ProceedsView {
    pub currency: Currency,
    pub amount: U128,
}
