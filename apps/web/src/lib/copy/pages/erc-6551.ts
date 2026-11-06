import type { FaqEntry, TableCopy } from "@/lib/copy/marketing";

/**
 * Copy for /erc-6551 (docs/design/seo/keyword-research.md §2 entry 3; claims register CR-8, CR-14, CR-32, CR-50).
 * A fair explainer first, then the comparison. Satchel is a NEAR NEP-171 contract: not ERC-6551, not on Ethereum, and
 * no compatibility claim. ERC-6551 is credited as prior art. Sentences stay short (6 to 20 words).
 */
export const erc6551 = {
  answer:
    "ERC-6551 is an Ethereum standard that gives each NFT its own smart contract account, called a token bound account. Satchel takes a different route. It is an NFT on NEAR that controls native Bitcoin, Ethereum and Solana addresses. Satchel is not ERC-6551.",
  sections: {
    what: {
      h2: "What ERC-6551 is",
      body: [
        "ERC-6551, \"Non-fungible Token Bound Accounts\", defines a registry that creates a smart contract account for any ERC-721 token. The account has a predictable address. Whoever owns the NFT controls the account. Read the standard at [eips.ethereum.org](https://eips.ethereum.org/EIPS/eip-6551).",
        "A token bound account is a normal contract account on an EVM chain. It can hold ETH, tokens and other NFTs, and it can call other contracts. When the NFT moves to a new owner, control of the account moves with it.",
        "The idea works with NFT collections that already exist, because the NFT contract needs no change. For a longer explanation, read the [RareSkills guide](https://rareskills.io/post/erc-6551) or the [Tokenbound docs](https://docs.tokenbound.org/faq).",
      ],
    },
    credit: {
      h2: "Why Satchel credits it as prior art",
      body: [
        "ERC-6551 showed that an NFT can own things. Satchel lists it as prior art, next to NEAR's nft_key, Lit PKPs and Ika dWallets. All of them ask a version of the same question: what if the NFT holds the keys?",
        "Satchel answers it differently. It is a NEAR contract that follows the NEP-171 NFT standard. It uses [NEAR Chain Signatures](/chain-signatures) to sign for other chains. It is not built on ERC-6551, it does not run on Ethereum, and it makes no promise to work with ERC-6551 tools.",
      ],
    },
    chains: {
      h2: "One EVM chain, or Bitcoin, Ethereum and Solana",
      body: [
        "A token bound account is an EVM account. It holds assets on EVM chains. It cannot hold native Bitcoin or native Solana coins, because those chains have no EVM accounts.",
        "A Satchel has three addresses of its own: one on Bitcoin, one on Ethereum and one on Solana. The coins are native on their own chains. There is no bridge and no wrapped token for the chain addresses.",
        "The Ethereum address also works on Base, Arbitrum and Optimism test networks, so one address holds ETH and USDC on four networks.",
      ],
    },
    sale: {
      h2: "The sale problem both designs face",
      body: [
        "When the account follows the NFT, a buyer pays for the NFT and expects the coins inside. But the seller controls the account until the sale lands. The seller can send a transaction that empties the account in the same block, ahead of the buy.",
        "This was raised in the [ERC-6551 discussion on Ethereum Magicians](https://ethereum-magicians.org/t/erc-6551-non-fungible-token-bound-accounts/13030). The thread treated marketplace-level fraud as out of scope for the standard. An academic write-up, [arXiv 2508.07190](https://arxiv.org/pdf/2508.07190), studies the problem. Proposed fixes include a nonce in the sale order and a lock on the account while it is listed.",
      ],
    },
    fix: {
      h2: "How Satchel handles the sale",
      lead: "Satchel's answer has four parts. They sit in the contract and the buyer's browser.",
      items: [
        "While a Satchel is for sale it is paused. It can't sign, and only a purchase or an accepted offer can move it.",
        "A Satchel can be listed only after 250 blocks, about 2 min 20 s, with no new signature. That keeps the record from changing as the listing goes up.",
        "The contract writes down each signature request on NEAR before NEAR's signer network sees it. A buyer can read everything the Satchel ever signed.",
        "The buy names the listing and the signature count the buyer's browser checked. If either changed, the purchase fails and the buyer is refunded.",
      ],
      after: [
        "The buyer's browser then checks each old signature on its own chain. Buy turns on only when no old signature can move the coins. The contract can't see Bitcoin, Ethereum or Solana, so it does not enforce this check. The full method is in the guide to [clean history](/clean-history).",
        "Clean history is not a guarantee. It does not cover signatures made after you buy, or NEAR's signer network, which you still trust. Satchel is new and hasn't been audited.",
      ],
    },
    table: {
      h2: "Satchel, ERC-6551 and a seed phrase compared",
      lead: "A seed phrase is how most people hand over a wallet today. Here it sits beside the two NFT designs.",
      table: {
        caption: "Satchel, ERC-6551 and handing over a seed phrase, compared",
        head: ["Compared on", "Satchel", "ERC-6551", "Handing over a seed phrase"],
        rows: [
          ["Runs on", "NEAR, as a NEP-171 contract", "Ethereum and other EVM chains, on top of ERC-721", "Any wallet software"],
          ["Native coins held", "Bitcoin, Ethereum and Solana addresses, one set per NFT", "EVM assets: ETH, tokens and NFTs", "Whatever the wallet supports"],
          ["Control moves with", "The NFT, through the contract", "The NFT, through the registry", "The seed phrase, which can be copied"],
          ["Seller keeps a copy of the keys?", "No seed phrase exists for its addresses", "No: the account follows the NFT owner", "Yes, if the seller wrote it down"],
          ["Seller can empty it before the sale lands?", "Not while listed. Earlier signatures are on record for the buyer to check", "Possible unless the marketplace or the account adds a lock", "Yes"],
          ["Buyer can check past signatures?", "Yes: every signature is recorded on NEAR", "No such record in the standard", "No"],
          ["Works with ERC-6551 tools?", "No", "Yes", "Not applicable"],
        ],
      } satisfies TableCopy,
    },
    choose: {
      h2: "Which one fits",
      body: [
        "If you build on Ethereum and your NFTs already exist, ERC-6551 is the standard to learn. If your assets are all on EVM chains, a token bound account may be all you need.",
        "If you want one NFT that holds Bitcoin, Ethereum and Solana, and you want a buyer to check its history before paying, look at Satchel. You can open [a Satchel](/s/1) and read its record, or browse the [Satchels for sale](/market).",
        "Both designs have limits. ERC-6551 puts you on EVM chains. Satchel puts you on NEAR and asks you to trust its signer network.",
      ],
    },
  },
  faq: [
    {
      q: "What is ERC-6551?",
      a: "ERC-6551 is an Ethereum standard that gives every ERC-721 NFT its own smart contract account. Whoever owns the NFT controls the account, and the account can hold assets.",
    },
    {
      q: "What is a token bound account?",
      a: "A token bound account is the contract account ERC-6551 creates for an NFT. It sits at a predictable address, and control follows the NFT's owner.",
    },
    {
      q: "Is Satchel an ERC-6551 implementation?",
      a: "No. Satchel is a NEAR contract that follows the NEP-171 standard. It doesn't run on Ethereum and makes no promise to work with ERC-6551 tools.",
    },
    {
      q: "Can an NFT hold ETH or other tokens?",
      a: "Yes. A token bound account can hold ETH, tokens and other NFTs on its EVM chain. A Satchel holds ETH and USDC on four Ethereum test networks, plus Bitcoin and Solana coins.",
    },
    {
      q: "Can an ERC-6551 account hold Bitcoin or Solana?",
      a: "Not natively. A token bound account is an EVM account. A Satchel has its own Bitcoin and Solana addresses, each on its own chain.",
    },
    {
      q: "Can the seller empty the wallet right before I buy it?",
      a: "With a token bound account that is possible unless a lock exists. A listed Satchel is paused, and the buyer's browser checks every earlier signature before Buy turns on.",
    },
  ] satisfies FaqEntry[],
} as const;
