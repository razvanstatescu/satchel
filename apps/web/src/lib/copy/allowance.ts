/**
 * Copy deck, C5 spending allowance (docs/specs/C5.md). Merged into `copy` by src/lib/copy.ts; import from "@/lib/copy",
 * never from here. Voice-copy rules apply: sentence case, no fiat, native amounts only, straight apostrophes, and
 * (test/unit/config-copy-theme.test.ts) never the plumbing word "delegate" — this UI calls them "someone"/"an account".
 */

import { plural as n } from "@/lib/format";

export const allowanceCopy = {
  allowance: {
    sectionTitle: "Spending allowance",
    none: "No one else can spend from this Satchel.",
    countNote: (count: number) => n(count, "account", "accounts"),
    capRow: (ticker: string, remaining: string, limit: string) => `${remaining} of ${limit} ${ticker} left today`,
    noExpiry: "No expiry",
    expires: (when: string) => `Expires ${when}`,
    statusWord: { active: "Active", paused: "Paused", expired: "Expired" } as const,

    manage: {
      title: "Who can spend",
      add: "Add someone who can spend…",
      revoke: "Revoke",
      revoking: "Revoking…",
      revokedToast: (who: string) => `${who} can no longer spend from this Satchel.`,
      revokeCancelled: "Revoking was cancelled. Nothing changed.",
      limitReached: "This Satchel already lets 4 accounts spend. Revoke one before adding another.",
      /** The history-griefing note (spec §7 "Security notes"), shortened (less-labels); the full explanation moved
       * to /questions#q-allow-history, linked by the Allowance/AllowanceFlow components. */
      trustNote: "Their signatures count as yours. Add only someone you trust.",
      /** R3-A-1: the limit is on what they can sign per day, not on what they can send, so signatures they already
       * hold stay valid after Revoke. Shown on each row (from the clean-history check) and in the Revoke confirmation. */
      sigs: {
        checking: "Checking their earlier signatures…",
        unavailable: "Couldn't check their earlier signatures right now.",
        none: "No earlier signature from them can still move coins.",
        count: (count: number) => `${n(count, "signature", "signatures")} from them could still move coins.`,
        listLabel: "Still able to move coins",
      },
      confirm: {
        title: (who: string) => `Revoke ${who}?`,
        body: "Revoking stops only new signatures. A signature they already hold can still be sent to the network later, even after you revoke, until it is spent or expires.",
        expiredBody: "This access has expired, which stops only new signatures. A signature they already hold can still be sent to the network later, until it is spent or expires.",
        none: "None of their earlier signatures can still move coins, as far as the check can tell.",
        unavailable: "The check isn't available right now, so there is no list of what they still hold.",
        settle: "How to clear it",
        confirm: "Revoke",
        cancel: "Keep access",
      },
      /** R3-A-2: before List or Accept offer. A request from them restarts the quiet period and makes every open offer stale. */
      revokeFirst: {
        link: "Review who can spend",
        list: "Someone else can still ask this Satchel to sign. Each request restarts the quiet period and can stop a sale, and you can't list during it. Consider revoking them first.",
        accept: "Someone else can still ask this Satchel to sign. A request from them makes every open offer stale, so accepting can fail. Consider revoking them first.",
      },
    },

    /** The Add sheet (/s/[id]/allowance). */
    add: {
      title: "Let someone spend",
      stepWho: "Who",
      stepCaps: "Limits",
      to: "NEAR account",
      placeholder: "name.testnet",
      checking: "Checking…",
      found: (owns: number) => (owns > 0 ? `Owns ${n(owns, "Satchel", "Satchels")}` : "No Satchels yet"),
      review: "Continue",
      capsTitle: "Daily caps",
      capAmountIn: (ticker: string) => `Daily cap in ${ticker}`,
      otherNetworksHelp: "ETH on Base, Arbitrum and OP, and USDC on any of the four testnets.",
      networkTicker: (ticker: string, network: string) => `${ticker} on ${network}`,
      capLimitReached: "That's 8 caps, the most one access grant can hold. Turn one off to add another.",
      expiryTitle: "Expiry",
      expiryOptions: { "24h": "24 hours", "7d": "7 days", "30d": "30 days", never: "No expiry" } as const,
      needCap: "Turn on at least one coin.",
      cta: (who: string) => `Let ${who} spend`,
      adding: "Adding…",
      addedToast: (who: string) => `${who} can now spend from this Satchel.`,
      cancelled: "Adding them was cancelled. Nothing changed.",
      err: {
        self: "That's you. Pick someone else.",
        contract: "That's the Satchel contract. It can't spend on its own behalf.",
        mpc: "That's NEAR's signer network. It can't hold this kind of access.",
        format: "Use a NEAR account like name.testnet.",
        missing: (who: string) => `${who} doesn't exist on NEAR testnet yet.`,
      },
    },

    /** The banner on `/s/[id]` for a viewer who holds access here, but doesn't own it. */
    banner: {
      title: "You can spend from this Satchel",
      lede: (owner: string) => `${owner} let you send up to the amounts below, each rolling 24 hours.`,
      expired: "This access has expired. Ask the owner to renew it.",
      paused: "Sending is paused while this Satchel is listed for sale.",
    },

    /** Send flow: a chain this access doesn't cover, and the remaining-amount line when it does. */
    send: {
      chainNotAllowed: (ticker: string) => `You can't send ${ticker} with this access.`,
      remaining: (amount: string) => `You can send up to ${amount} today`,
      overCap: (remaining: string) => `That's over today's remaining amount (${remaining} left).`,
      /** AUDIT-01: a delegate's bitcoin send spends one deposit; the largest one here holds `largest`. */
      oneCoin: (largest: string) =>
        `With this access, a bitcoin send can spend only one of this Satchel's bitcoin deposits at a time. The largest holds ${largest}, and the fee comes out of it too. Send less.`,
    },

    /** errorCopy mappings (docs/specs/C5.md §2 error table). */
    err: {
      ERR_ALLOWANCE_DELEGATE: "That account can't be given this kind of access (it's you, the contract or NEAR's signer network).",
      ERR_ALLOWANCE_CAPS: "Check the caps: at least one, no coin twice, and every cap above zero.",
      ERR_ALLOWANCE_EXPIRY: "Pick an expiry in the future, or no expiry.",
      ERR_ALLOWANCE_LIMIT: "This Satchel already lets 4 accounts spend. Revoke one before adding another.",
      ERR_ALLOWANCE_NOT_FOUND: "That access is already gone.",
      ERR_ALLOWANCE_EXPIRED: "This access has expired. Ask the owner to renew it.",
      ERR_ALLOWANCE_KIND: "This access only covers sending coins, not signing messages or other contract calls.",
      ERR_ALLOWANCE_ASSET: "This access has no cap for that coin.",
      ERR_ALLOWANCE_EXCEEDED: "That's over today's remaining amount.",
      ERR_ALLOWANCE_RATE: "This access has hit today's limit on the number of sends. Try again tomorrow.",
      ERR_ALLOWANCE_BTC_ONE_INPUT:
        "With this access, a bitcoin send can spend only one of this Satchel's bitcoin deposits at a time. Send less, so a single deposit covers the amount and the fee.",
    },
  },
} as const;

export type AllowanceCopy = typeof allowanceCopy;
