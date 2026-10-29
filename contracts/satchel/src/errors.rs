//! Stable error codes (spec §5.15). Every panic reads `ERR_X: human sentence`; the UI maps by the prefix before ":".

use near_sdk::env;

pub const ERR_TOKEN_NOT_FOUND: &str = "ERR_TOKEN_NOT_FOUND";
pub const ERR_NOT_OWNER: &str = "ERR_NOT_OWNER";
pub const ERR_FROZEN: &str = "ERR_FROZEN";
pub const ERR_LISTED: &str = "ERR_LISTED";
pub const ERR_BAD_RECEIVER: &str = "ERR_BAD_RECEIVER";
pub const ERR_TRANSFER_CALL_DISABLED: &str = "ERR_TRANSFER_CALL_DISABLED";
pub const ERR_CHAIN_UNSUPPORTED: &str = "ERR_CHAIN_UNSUPPORTED";
pub const ERR_DEPOSIT: &str = "ERR_DEPOSIT";
pub const ERR_GAS: &str = "ERR_GAS";
pub const ERR_MPC_DEPOSIT: &str = "ERR_MPC_DEPOSIT";
pub const ERR_HEX: &str = "ERR_HEX";

pub const ERR_EVM_TYPE: &str = "ERR_EVM_TYPE";
pub const ERR_EVM_RLP: &str = "ERR_EVM_RLP";
pub const ERR_EVM_CHAIN_ID: &str = "ERR_EVM_CHAIN_ID";
pub const ERR_EVM_INT_WIDTH: &str = "ERR_EVM_INT_WIDTH";
pub const ERR_EVM_TO: &str = "ERR_EVM_TO";
pub const ERR_EVM_DATA: &str = "ERR_EVM_DATA";
pub const ERR_EVM_ACCESS_LIST: &str = "ERR_EVM_ACCESS_LIST";
pub const ERR_EVM_TOO_LONG: &str = "ERR_EVM_TOO_LONG";
pub const ERR_EVM_NONCE_GAP: &str = "ERR_EVM_NONCE_GAP";

pub const ERR_BTC_INPUT_COUNT: &str = "ERR_BTC_INPUT_COUNT";
pub const ERR_BTC_PREIMAGE_LEN: &str = "ERR_BTC_PREIMAGE_LEN";
pub const ERR_BTC_VERSION: &str = "ERR_BTC_VERSION";
pub const ERR_BTC_SIGHASH: &str = "ERR_BTC_SIGHASH";
pub const ERR_BTC_SCRIPTCODE: &str = "ERR_BTC_SCRIPTCODE";
pub const ERR_BTC_LOCKTIME: &str = "ERR_BTC_LOCKTIME";
pub const ERR_BTC_SEQUENCE: &str = "ERR_BTC_SEQUENCE";
pub const ERR_BTC_MIXED_TX: &str = "ERR_BTC_MIXED_TX";
pub const ERR_BTC_PREVOUTS_INCOMPLETE: &str = "ERR_BTC_PREVOUTS_INCOMPLETE";
pub const ERR_BTC_SEQUENCES_MISMATCH: &str = "ERR_BTC_SEQUENCES_MISMATCH";
pub const ERR_BTC_OUTPUTS_MISMATCH: &str = "ERR_BTC_OUTPUTS_MISMATCH";
pub const ERR_BTC_OUTPUTS_MALFORMED: &str = "ERR_BTC_OUTPUTS_MALFORMED";
pub const ERR_BTC_DUPLICATE_INPUT: &str = "ERR_BTC_DUPLICATE_INPUT";

pub const ERR_SOL_TOO_LONG: &str = "ERR_SOL_TOO_LONG";
pub const ERR_SOL_VERSION: &str = "ERR_SOL_VERSION";
pub const ERR_SOL_HEADER: &str = "ERR_SOL_HEADER";
pub const ERR_SOL_MALFORMED: &str = "ERR_SOL_MALFORMED";
pub const ERR_SOL_INSTRUCTION: &str = "ERR_SOL_INSTRUCTION";
pub const ERR_SOL_DURABLE_NONCE: &str = "ERR_SOL_DURABLE_NONCE";

pub const ERR_QUIET_PERIOD: &str = "ERR_QUIET_PERIOD";
pub const ERR_ALREADY_LISTED: &str = "ERR_ALREADY_LISTED";
pub const ERR_NOT_LISTED: &str = "ERR_NOT_LISTED";
pub const ERR_PRICE: &str = "ERR_PRICE";
pub const ERR_CURRENCY: &str = "ERR_CURRENCY";
pub const ERR_LISTING_CHANGED: &str = "ERR_LISTING_CHANGED";
pub const ERR_SELF_BUY: &str = "ERR_SELF_BUY";
pub const ERR_WRONG_AMOUNT: &str = "ERR_WRONG_AMOUNT";
pub const ERR_WRONG_TOKEN: &str = "ERR_WRONG_TOKEN";
pub const ERR_BAD_MSG: &str = "ERR_BAD_MSG";
pub const ERR_NOTHING_OWED: &str = "ERR_NOTHING_OWED";

/// Default human sentence for a code. Kept short: every byte is wasm.
pub fn sentence(code: &str) -> &'static str {
    match code {
        ERR_TOKEN_NOT_FOUND => "token does not exist",
        ERR_NOT_OWNER => "caller is not the owner",
        ERR_FROZEN => "token is listed; signing is paused",
        ERR_LISTED => "token is listed; delist before transferring",
        ERR_BAD_RECEIVER => "receiver would strand the funds",
        ERR_TRANSFER_CALL_DISABLED => "nft_transfer_call is disabled",
        ERR_CHAIN_UNSUPPORTED => "chain not enabled on this contract",
        ERR_HEX => "bad hex",
        ERR_DEPOSIT => "attached deposit too small",
        ERR_GAS => "attach more gas",
        ERR_QUIET_PERIOD => "signed too recently to list",
        ERR_ALREADY_LISTED => "token is already listed",
        ERR_NOT_LISTED => "token is not listed",
        ERR_PRICE => "price must be > 0",
        ERR_CURRENCY => "currency not accepted",
        ERR_LISTING_CHANGED => "listing changed",
        ERR_SELF_BUY => "seller cannot buy own listing",
        ERR_WRONG_AMOUNT => "amount must equal the price",
        ERR_WRONG_TOKEN => "only the configured USDC may call",
        ERR_BAD_MSG => "msg must be {\"buy\":{...}}",
        ERR_NOTHING_OWED => "nothing to withdraw",
        ERR_MPC_DEPOSIT => "mpc_deposit must be in [1 yocto, 0.01 NEAR]",
        c if c.starts_with("ERR_EVM") => "only plain Sepolia ETH transfers are signed",
        c if c.starts_with("ERR_BTC") => "BTC payload refused by policy",
        c if c.starts_with("ERR_SOL") => "SOL payload refused by policy",
        _ => "refused",
    }
}

/// Panic with `CODE: sentence`.
pub fn fail(code: &str) -> ! {
    env::panic_str(&[code, ": ", sentence(code)].concat())
}

/// Panic with `CODE: detail` (e.g. the required deposit or gas).
pub fn fail_with(code: &str, detail: &str) -> ! {
    env::panic_str(&[code, ": ", detail].concat())
}

/// `require!` with a stable code.
#[inline]
pub fn ensure(cond: bool, code: &str) {
    if !cond {
        fail(code)
    }
}
