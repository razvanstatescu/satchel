# Security model, trust assumptions and limitations

> Part of the Satchel docs. Start at the [README](../README.md); a guide for AI reviewers is in [`AGENTS.md`](../AGENTS.md).

What the clean-history check proves, what it trusts, what it does not cover, and the limits of this version.

## Security model and trust assumptions

**Clean history: what it checks and what it trusts.**

**What signs.** A Satchel's keys can sign only through `sign_for` on `satchel.satchelhq.testnet`.
- That account was **born without a key**. One transaction (`[TBD: birth tx hash]`, block `[TBD: block A]`) created
  it, deployed the published code, initialized it and minted Satchels #1–#7. That transaction contains no AddKey
  action.
- It still has no access keys (`near account view-account-summary satchel.satchelhq.testnet network-config testnet-fastnear now`
  shows "Account is locked (no access keys)").
- It has never signed a transaction, delegated ones included. The FastNEAR `is_any_signer` query in step 4 of [verify.md](verify.md) returns
  nothing.
- Its history starts at the birth transaction.
- It runs the published code: SHA-256 `[TBD: H]`, reproducible with `cargo near build reproducible-wasm` at tag
  `contract-v1.0.0`. Compare with `shasum -a 256` on macOS or `sha256sum` on Linux.

**What gets recorded.** Before NEAR's MPC network signs anything, `sign_for` records on-chain exactly what is being
signed:
- the Ethereum chain and nonce;
- the Bitcoin coin (outpoint) being spent;
- the Solana blockhash;
- the full text of a signed message.

It accepts only plain ETH and USDC transfers on four Ethereum testnets, standard Bitcoin spends, plain SOL transfers and
plain-text messages (EIP-191 and Solana off-chain). It refuses everything else: raw hashes, EIP-712 permits, EIP-7702
authorizations, any other contract call, other chains, Bitcoin sighash types other than ALL, and Solana durable nonces.

**What "Clean history" means.** Your browser read every record and found that none can still move funds:
- Ethereum: the nonce was used (3 confirmations), on whichever of the four supported testnets the record names.
- A signed message (EIP-191 or a Solana off-chain message) never blocks: it can never move funds on any chain.
- Bitcoin: the coin was spent in a confirmed transaction, or it never existed. Coins that never existed are excluded
  from the balance you buy.
- Solana: the blockhash expired.

It also checked that the Ethereum address has no delegated code and that the Solana account is a plain wallet.

**What it trusts.**
- The contract does **not** enforce this check, because it cannot see other chains. The app disables Buy until the
  check passes.
- It trusts NEAR's MPC network. A threshold of its nodes could sign anything, and on testnet the MPC contract account
  itself has full-access keys.
- It trusts the data providers it queries (two each for Bitcoin and Ethereum; the UI says when only one answered) and
  the confirmation depth used.

**What it does not cover.**
- Other chains or addresses, and tokens other than USDC.
- Signatures made after you buy.
- Testnet4 reorgs: anyone who mines two difficulty-1 blocks can undo one confirmation on testnet4.
- Coins that another wallet later sends to an outpoint an old signature already spends. The app marks them
  "encumbered". A send made in the Satchel app, from one Satchel into another, cannot create such an outpoint: the app
  refuses to build any transaction whose id a record of the sending Satchel or of the receiving Satchel already
  references (and refuses to build it at all if it cannot read the receiving Satchel's records). A send from any other
  wallet is not checked, which is why the coin is marked "encumbered" instead.

### Demo token #4 is blocked on purpose

Satchel #4's only record is an Ethereum transaction signed with nonce = current + 1 and never broadcast. It cannot be
mined while the current nonce is unused, and only the Satchel's own key (through `sign_for` by the owner) could use
that nonce. The record therefore stays "unused" forever, and #4's listing always shows "Blocked: 1 unused signature".
This is the negative case of the clean-history check. Nobody will ever send from #4.

## Limitations

- **Testnet only**: Bitcoin testnet4, Ethereum Sepolia, Solana devnet and NEAR testnet. There is no mainnet
  deployment, and a mainnet version would need an audit.
- **The MPC is trusted** (see "What it trusts" above). If the MPC network changed its `sign` interface, gas floor or deposit, a locked
  Satchel could no longer sign. The contract forwards leftover gas and lets the caller raise the MPC deposit to
  soften this.
- **Confirmation depth is testnet-grade**: BTC K = 1, a disclosed weakness. Mainnet would use K = 6 and EVM `finalized`.
- **v1 scope**: native transfers plus USDC ERC-20 transfers (no SPL), EVM on four testnets (Sepolia, Base Sepolia,
  Arbitrum Sepolia, OP Sepolia), P2WPKH Bitcoin, Solana legacy messages only, and EIP-191/Solana off-chain message
  signing. There are no NEP-178 approvals; delegated signing (allowances, capped and rolling-window) shipped in the
  2026-10-29 sprint, and `nft_transfer_call` is still disabled. The contract can sign Solana transfers; the app shows
  Bitcoin, Ethereum and Solana, including the Solana send flow.
- **The contract is immutable** (keyless). A bug means a new contract with new addresses (`satchel-v2`), and old
  funds stay with v1.
- **If something fails:**
  - *The MPC network is slow or down:* nothing is lost, and the owner signs again later. A request that timed out
    stays on record and counts in the buyer's check like any other signature.
  - *A data provider is down or wrong:* the check asks two providers per chain. If they disagree, the verdict is
    "unknown" and Buy stays disabled; if only one answers, the page says so.
  - *The owner loses their NEAR wallet:* the Satchel and its coins go with it, as with any NFT. There is no admin
    and no recovery key, by design.
  - *The app goes down:* the contract does not depend on it. Anyone can still call the contract directly; the scripts
    in `tools/e2e` show how.
- Screening agents (Claude Code and Codex, Q-017) and `curl` see the server-rendered pages. Wallet flows (mint,
  send, buy) need a testnet wallet. Every on-chain fact also has a read-only command in [verify.md](verify.md).
