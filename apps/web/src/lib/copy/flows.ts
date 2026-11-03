/**
 * Copy deck, the send and give flows (package X after F1): send, sign, xfer. Merged into `copy` by src/lib/copy.ts;
 * import from "@/lib/copy", never from here. `sign.*` is the honest copy (kb/90 §8.6, kb/70 F16): word for word.
 */

import { plural as n } from "@/lib/format";

/** "a Bitcoin testnet4 address", "an Ethereum Sepolia address". */
const aOrAn = (word: string) => (/^[AEIOU]/i.test(word) ? "an" : "a");

export const flows = {
  send: {
    title: (chain: string) => `Send ${chain}`,
    /** NEW (app-screens §6): the sheet's head line ("From Satchel #1 · Step 1 of 2"). */
    meta: (id: string) => `From Satchel #${id}`,
    form: {
      chain: "Chain",
      amountIn: (ticker: string) => `Amount in ${ticker}`,
      max: "Max",
      /** The Max button's name starts with its visible label (WCAG 2.5.3, label in name). */
      maxAria: (amount: string) => `Max: use the maximum, ${amount}`,
      available: (amount: string) => `Available ${amount}`,
      maxNote: "Max leaves room for the network fee.",
      to: "To",
      placeholder: { btc: "tb1… address", evm: "0x… address", sol: "Solana address" },
      paste: "Paste",
      review: "Review",
      /** NEW (app-screens §1.4): the reason under a disabled Review. */
      reviewWhy: (network: string) => `Enter an amount and ${aOrAn(network)} ${network} address.`,
      fixField: "Fix the highlighted field to review.",
      estimating: "Estimating fee…",
      feeError: "Couldn't estimate the fee.",
      retry: "Retry",
    },
    recipient: { accepted: (network: string) => `${network} address accepted`, label: (network: string) => `${network} address`, clear: "Clear address" },
    val: {
      btcMainnet: "That's a mainnet Bitcoin address. Use a tb1… testnet4 address.",
      btcTypo: "That isn't a valid Bitcoin testnet4 address. Check it and try again.",
      evmFormat: "Use a 0x address with 40 hex characters.",
      evmTypo: "The capitalisation doesn't match the checksum. Check the address.",
      evmZero: "That's the zero address. Coins sent there are lost.",
      self: "That's this Satchel's own address.",
      amountPositive: "Enter an amount above zero.",
      amountMax: "That's more than this Satchel can send.",
      amountDecimals: (dp: number) => `Use at most ${dp} decimals.`,
      solFormat: "That isn't a valid Solana address. Check it and try again.",
      solPda: "This is a program address with no private key. Coins sent there may be stuck. Check it carefully.",
      solRent: "A new Solana account needs at least 0.00065024 SOL. Send more.",
      btcDust: (min: string) => `Bitcoin can't send that little to this address. Send at least ${min}.`,
      btcTooSmall: "What's left after the network fee is too little to send. Send more.",
      btcTooManyCoins: "This needs too many coins for one transaction. Send a smaller amount.",
    },
    sol: {
      E25: "This would leave an account below Solana's minimum balance (0.00065024 SOL). Send more, or send everything.",
      E26: "This Satchel's Solana address has no SOL yet. Add SOL first.",
      oldValid: "The earlier Solana transaction can still land for a few more seconds. Try again shortly.",
      refreshing: "Refreshing network details…",
      fresh: "Network details are refreshed every few seconds while you review.",
    },
    guard: {
      connectTitle: "Connect the owner's wallet",
      // C5:147: send stays open to someone the owner lets spend, unlike message signing and giving.
      connectBody: (id: string) => `Only the owner of Satchel #${id}, or someone they let spend, can send from it.`,
      notOwnerTitle: (id: string) => `You don't own Satchel #${id}`,
      notOwnerBody: (account: string, owner: string) => `You're connected as ${account}. Only ${owner}, or someone they let spend, can send from it.`,
      listedTitle: "Paused for sale",
      listedBody: (id: string) => `Satchel #${id} is for sale. Stop selling it to send.`,
      /** app-screens §6, §7: the listed guards' action (send and give). */
      goToSell: "Go to the sale",
      /** NEW (app-screens §6): the zero guard's heading; `zero` is its body. */
      zeroTitle: "Nothing to send yet",
      zero: (ticker: string) => `This Satchel has no ${ticker} yet.`,
      /** NEW (app-screens §6): the zero guard's second sentence. */
      zeroHelp: (chain: string) => `Anyone can add coins to its ${chain} address.`,
      addCoins: "Add coins",
      sendInstead: (ticker: string, network: string) => `Send ${ticker} on ${network}`,
      unsent: "You have an unsent signed transaction. Broadcast it or replace it.",
      /** NEW (app-screens §6): under the unsent card; EVM names the nonce, Bitcoin the coins. */
      replaceNote: (nonce?: number) =>
        nonce === undefined
          ? "Replace builds a new send with the same coins, so only one of the two can ever go through."
          : `Replace builds a new send with nonce ${nonce}, so only one of the two can ever go through.`,
      replace: "Replace",
    },
    review: {
      label: "Send",
      sub: (addr: string, network: string) => `to ${addr} · ${network}`,
      from: "From",
      amountFee: "amount + fee",
      to: "To",
      fee: "Network fee (est.)",
      feePaid: "paid by this Satchel",
      after: (id: string) => `Satchel #${id} after`,
      nearFee: "NEAR fee",
      // Shortened (less-labels): the breakdown (gas + the permanent signature record) and who pays it moved to
      // /questions#q-fees-near, linked next to this value by SendFlow's ReviewCard.
      near: "≈ 0.004 NEAR",
      // nearTip and its "About the NEAR fee" disclosure are gone (less-labels): the help link beside the NEAR fee leads
      // to /questions#q-fees-near, which says both (the cost and the 0.1–0.3 NEAR held while signing).
      timeSign: "Signing: usually about 10 seconds",
      timeChain: { btc: "Confirmation: minutes to hours on testnet4", evm: "Confirmation: about 12 seconds", sol: "Confirmation: a few seconds" },
      inputs: (count: number) => `Uses ${count} coins from this Satchel, so it needs ${count} signatures.`,
      ack: "I checked this address",
      /** NEW (app-screens §1.4): the reason under Send until the box is ticked. */
      ackFirst: "Tick I checked this address to send.",
      // The "a send can't be undone" line (one per chain) is gone (less-labels): it's covered once, for every chain,
      // at /questions#q-undo. The wallet-approval helper is gone too: the wallet names itself and the contract.
      cta: (amount: string) => `Send ${amount}`,
      ctaAria: (amount: string, to: string) => `Send ${amount} to ${to}`,
      walletHint: "Check the Meteor or Intear window.",
      networkAddress: (network: string) => `${network} address`,
    },
  },
  sign: {
    title: (amount: string) => `Sending ${amount}`,
    done: (amount: string) => `Sent ${amount}`,
    doneTo: (addr: string) => `to ${addr}`,
    doneBtn: "Done",
    viewActivity: "View activity",
    prepare: "Preparing…",
    wallet: "Approve in your wallet…",
    /** NEW: the tracker list's accessible name. */
    progress: "Progress",
    /** NEW (app-screens §6): the outcome heading of a mapped failure (`errorCopy` is its body). */
    failedTitle: "Not sent",
    /** NEW: the unknown outcome's explorer link in the sheet foot. */
    viewNear: "View on NearBlocks",
    steps: {
      wallet: { done: "Approved in your wallet", /** NEW: the row while the wallet is open. */ active: "Approve in your wallet" },
      mpc: {
        future: "Sign with NEAR's signer network",
        active: "Signing with NEAR's signer network",
        done: "Signed by NEAR's signer network",
        /** NEW (proto app-send): the row's failed and unknown labels. `mismatch` = the local check failed (E22). */
        failed: "Not signed by NEAR's signer network",
        unknown: "Waiting for NEAR to confirm the request",
        mismatch: "Checked before broadcast: no match",
        /** NEW: how long the signature took, after the NearBlocks link ("in 0:07"). */
        took: (elapsed: string) => `in ${elapsed}`,
      },
      broadcast: {
        future: (net: string) => `Broadcast to ${net}`,
        active: (net: string) => `Broadcasting to ${net}`,
        done: (net: string) => `Broadcast to ${net}`,
        /** NEW (proto app-send): signed, not sent; a Solana message that expired before it could be broadcast. */
        notYet: "Not broadcast yet",
        expired: "Not broadcast",
      },
      confirm: {
        future: "Confirmation",
        active: "Waiting for 1 confirmation",
        done: "Confirmed",
        /** NEW (app-screens §6): the wait under "Waiting for 1 confirmation" (Bitcoin keeps `sentNote.btc`). */
        eta: { evm: "About 12 seconds.", sol: "Usually a few seconds." },
      },
    },
    mpc: {
      0: "Usually about 10 seconds.",
      20: "Taking longer than usual.",
      60: "Still working. The network allows up to about 2 minutes.",
      150: "Still waiting for the network. We'll keep checking.",
    },
    inputs: (count: number) => `Signing ${count} inputs`,
    credit: "Signatures by NEAR Chain Signatures",
    keepOpen: "Keep this tab open until it says Sent.",
    closeOk: "You can close this tab. Activity keeps tracking it.",
    minimized: "Still signing. Keep this tab open until it says Sent.",
    minimize: "Minimize",
    close: "Close",
    details: "Details",
    sentNote: {
      btc: "In mempool. Testnet4 confirmations are irregular: minutes to hours.",
    },
    confirmed: "Confirmed",
    cancelled: "You cancelled in your wallet. Nothing was signed.",
    tryAgain: "Try again",
    timeout: {
      title: "Not signed",
      body: "The signer network did not return a signature. Nothing was sent.",
      cond: "If a signature still turns up, Clean history lists it as Unused until it can't be used.",
      retry: {
        evm: (nonce: number) => `Try again reuses nonce ${nonce}, so only one of them can ever go through.`,
        btc: "Try again reuses the same coins, so only one of them can ever go through.",
        sol: "Try again waits until the old blockhash expires.",
      },
    },
    notSent: {
      title: "Signed, not sent",
      body: (reason: string, id: string) => `${reason} Nothing has left Satchel #${id} yet.`,
      explain: "The signed transaction is saved. Until it's broadcast or replaced, it counts as an unused signature in this Satchel's history.",
      gap: (nonce: number, count: number) => `Can't be broadcast yet: nonce ${nonce} waits for nonce ${count}.`,
      again: "Broadcast again",
      now: "Broadcast now",
    },
    solExpired: {
      title: "Expired",
      body: "The Solana transaction expired while it was being signed. Nothing was sent, and that signature can't be used anymore.",
    },
    unknown: {
      title: "Still waiting for NEAR",
      body: (hash: string) => `NEAR hasn't confirmed transaction ${hash} yet. This app hasn't broadcast anything.`,
      check: "Check again",
    },
    failed: "Something went wrong. Nothing was sent.",
  },
  xfer: {
    title: (id: string) => `Give Satchel #${id}`,
    reviewTitle: "Review gift",
    /** NEW (proto app-give): the sheet's title once it's done, and the step names on the head line. */
    doneTitle: "Given",
    stepWho: "Who gets it",
    stepReview: "Review",
    /** A2 (plan/feature-ideas.md): the alternative to a NEAR account on file — a claim link. */
    giveByLink: "Give by link instead",
    /** NEW (app-screens §7): the give guards' bodies (the titles are send's). */
    guard: {
      connectBody: (id: string) => `Only the owner of Satchel #${id} can give it away.`,
      notOwnerBody: (account: string, owner: string) => `You're connected as ${account}. Only ${owner} can give it away.`,
    },
    /** NEW (app-screens §7.3): the hand-off stage's two ends (Handoff.tsx; give, buy and sold). */
    stage: { from: "From", to: "To", you: "You" },
    to: "To (NEAR account)",
    placeholder: "name.testnet",
    /** NEW (app-screens §7): the account field's help line. */
    help: "The account must exist on NEAR testnet.",
    checking: "Checking account…",
    found: (count: number) => `Account found · owns ${n(count, "Satchel", "Satchels")}`,
    implicit: "Implicit account. Make sure its owner has the key.",
    err: {
      missing: (x: string) => `No account named ${x} on NEAR testnet.`,
      self: "That's your account.",
      contract: "That's the Satchel contract. A Satchel sent there can never be used again.",
      mpc: "That's NEAR's signer network. A Satchel sent there can never be used again.",
      format: "Use a NEAR account like name.testnet.",
    },
    /** NEW (app-screens §7): the gift tag the review card wears on a string. */
    tag: (account: string) => `To ${account}`,
    rows: {
      them: (account: string, balances: string) =>
        `${account} gets everything inside: ${balances}. Its addresses go too, so coins sent to them later are ${account}'s.`,
      you: "Only the new owner will be able to sign. You won't be able to send from it.",
      history: "The signature history stays with the Satchel.",
    },
    soft: (t: string) => `A signature from ${t} ago is still in progress. If you give it now, that signature still works after the hand-off.`,
    final: (account: string) => `This can't be undone. Only ${account} can give it back.`,
    cta: (account: string) => `Give it to ${account}`,
    transferring: "Giving…",
    steps: { approve: "Approve in your wallet", doing: "Handing it over on NEAR", done: "Given" },
    done: (account: string, balances: string) => `${account} now controls ${balances}.`,
    receipt: { from: "From", to: "To", tx: "NEAR transaction", time: "Time" },
    view: (id: string) => `View Satchel #${id}`,
    toast: (id: string, account: string) => `Gave Satchel #${id} to ${account}`,
    blockedListed: (id: string) => `Stop selling Satchel #${id} before you give it.`,
    cancelled: "You cancelled in your wallet. Nothing changed.",
    live: (account: string, balances: string) => `Given. ${account} now controls ${balances}.`,
  },
} as const;
