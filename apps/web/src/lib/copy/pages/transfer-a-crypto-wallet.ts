import type { FaqEntry, TableCopy } from "@/lib/copy/marketing";

/**
 * Copy for /transfer-a-crypto-wallet (docs/design/seo/keyword-research.md #5). A how-to: handing over a wallet while its
 * addresses stay the same. Testnet-explicit; gifts skip the buyer's check and the page says so; give-by-link is a
 * bearer link ("cash in an envelope"). The UI verb is Give. Links use `[label](/path)`.
 */
export const transferCopy = {
  answer:
    "Yes, you can give your crypto wallet to someone else, but not by handing over a seed phrase: you would keep a copy. A Satchel is an NFT on NEAR that is a wallet. Give the NFT to another NEAR account, and its addresses, coins and records go with it.",
  today: {
    h2: "How people hand over a wallet today",
    lead: "A normal wallet has no owner field. Whoever holds the secret is the owner, so each route has a catch.",
    sharing: {
      h3: "Share the seed phrase",
      body: [
        "The other person types your phrase into their wallet and controls the coins. But you still know the phrase, and any backup of it still works. Two people can sign, and neither can prove the other can't.",
      ],
    },
    moving: {
      h3: "Move the coins to their wallet",
      body: [
        "This is the cleanest option for a one-off gift. It gives them coins, not your wallet. The addresses change, so anyone who pays your old address has to be told.",
      ],
    },
    custodian: {
      h3: "Use a custodian's tools",
      body: [
        "Some exchanges and trust services let you move an account to another person. The rules, the checks and the wait differ by provider, and the provider holds the keys.",
      ],
    },
  },
  compare: {
    h2: "Ways to give a wallet, compared",
    table: {
      caption: "Ways to give a crypto wallet to someone else",
      head: ["Route", "Same addresses?", "Giver keeps a copy?", "Old permissions cleared?", "Chains"],
      rows: [
        ["Share the seed phrase", "Yes", "Yes, any backup still works", "No, nothing changes", "Depends on the wallet app"],
        ["Move the coins to their wallet", "No, new addresses", "Not applicable: coins move", "Not applicable", "One send per chain"],
        ["Use a custodian's tools", "Depends on the provider", "The provider holds the keys", "Set by the provider", "Set by the provider"],
        ["Give a Satchel", "Yes, the Satchel's own", "No seed phrase exists for its addresses", "Yes, all allowances are cleared", "Bitcoin, Ethereum and Solana"],
      ],
    } satisfies TableCopy,
  },
  give: {
    h2: "Giving a Satchel to someone on NEAR",
    lead: "A Satchel is a standard NFT, so giving it is a NEAR transaction. In the app the button is called Give.",
    steps: [
      "Open the Satchel you own and choose Give.",
      "Enter the receiver's NEAR account. They must already exist on NEAR.",
      "Review the account and approve in your NEAR wallet.",
      "In the same transaction, the receiver becomes the only one who can sign.",
    ],
    after: [
      "The giver keeps nothing to sign with. Every spending allowance is cleared, and the NEAR held inside moves along. The signature record stays with the Satchel, so the new owner can read it.",
      "A Satchel that is listed for sale can't be given. Stop selling first, or read about [selling a crypto wallet](/sell-a-crypto-wallet).",
    ],
  },
  same: {
    h2: "Same addresses, so payments keep arriving",
    body: [
      "A Satchel's Bitcoin, Ethereum and Solana addresses belong to the Satchel, not to its owner. After a Give they don't change.",
      "Anyone who pays the Satchel keeps paying the same place, and the new owner sees it. The coins already inside go with it.",
      "This suits a project wallet that changes hands, or a payment address a shop or creator might pass on. A Satchel has one NEAR owner, so a team handover means choosing that account. Multisig or DAO ownership is untested.",
    ],
  },
  link: {
    h2: "Give by link, for someone not on NEAR yet",
    body: [
      "If the receiver has no NEAR account, Give by link creates a one-time claim link. It works like cash in an envelope: whoever opens it claims the Satchel.",
      "The giver's browser creates a fresh account for the link and sends about 0.02 NEAR for its gas. The secret stays in the part of the link after the # sign and is never sent to a server.",
      "The receiver opens the link, connects a NEAR wallet and claims. Keep three limits in mind:",
    ],
    items: [
      "Anyone with the link can claim it, the giver included, until it is claimed.",
      "A link can't be cancelled, and a lost link can't be replaced.",
      "The receiver still needs a NEAR wallet to claim.",
    ],
  },
  trust: {
    h2: "Gifts are not checked",
    body: [
      "Selling a Satchel makes the buyer's browser check every past signature first. Giving does not. A gift doesn't wait for the [clean history](/clean-history) check, so give only to someone you trust.",
      "The receiver can still read the record on the Satchel's Activity tab, and only they can undo a gift, by giving it back. If the receiver is a stranger, [sell it instead](/sell-a-crypto-wallet) or read the [buyer's guide](/buy-a-crypto-wallet).",
    ],
  },
  limits: {
    h2: "What to know before you give one",
    items: [
      "Satchel runs on testnet today. Its coins have no value, so try a Give with test coins.",
      "There is no recovery service. If an owner loses access to their NEAR account, nobody at Satchel can restore it.",
      "Everyone still trusts NEAR's signer network, which makes every signature. Satchel hasn't been audited.",
      "Satchel gives no tax or legal advice. Gifts of crypto can have tax rules, so check yours.",
    ],
  },
  faq: [
    {
      q: "Can I give my crypto wallet to someone else?",
      a: "Yes, but not by sharing a seed phrase, because you keep a copy. With a Satchel you give the NFT to another NEAR account, and its addresses and coins go with it.",
    },
    {
      q: "Will payments to my old addresses still arrive?",
      a: "Yes. A Satchel's addresses belong to the Satchel, not the owner. After a Give, anyone who pays them is paying the new owner's Satchel.",
    },
    {
      q: "What happens to spending allowances when I give a Satchel?",
      a: "They are cleared in the same transaction. The old owner and anyone they let spend can no longer sign.",
    },
    {
      q: "Can I give a Satchel to someone without a NEAR account?",
      a: "Yes, by link. It works like cash in an envelope: whoever opens it claims the Satchel, so send it only to the person you mean. They connect a NEAR wallet to claim.",
    },
    {
      q: "Can I undo a Give?",
      a: "No. Only the receiver can undo a gift, by giving the Satchel back. Give only to someone you trust.",
    },
  ] satisfies FaqEntry[],
} as const;
