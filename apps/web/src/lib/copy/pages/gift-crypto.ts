import type { FaqEntry, TableCopy } from "@/lib/copy/marketing";

/**
 * Copy for /gift-crypto (docs/design/seo/keyword-research.md §2 entry 2; claims register CR-30, CR-40, CR-41).
 * Product framing, like the landing (D-52): it describes the product, never the deployment (the header badge is the only
 * network signal); no fiat, prices in NEAR only. The honesty notes are required text: the receiver connects a NEAR wallet
 * to claim, the link works like cash in an envelope, it can't be cancelled, gifts skip the buyer's check.
 * No tax advice. Sentences stay short (6 to 20 words).
 */
export const giftCrypto = {
  answer:
    "To gift crypto to someone without a wallet, give them a Satchel by link. A Satchel is an NFT on NEAR that is a wallet, with its own Bitcoin, Ethereum and Solana addresses. They open the link and connect a NEAR wallet to claim it, and every coin inside comes with it.",
  sections: {
    usual: {
      h2: "The usual ways to gift crypto",
      lead: "Most guides list the same four options. Each one trades something away.",
      subs: [
        {
          h3: "A gift card",
          body: "A crypto gift card is a code for one platform. The receiver makes an account there and redeems it. It is easy to wrap, but the coins live with the platform, and the platform decides which coins you can give.",
        },
        {
          h3: "Set up a wallet for them",
          body: "You create a wallet, send coins to it and hand over the seed phrase. The receiver gets a real wallet at once. But you saw the seed phrase, so you could still move the coins. Some guides say plainly that making keys for someone else is not best practice.",
        },
        {
          h3: "A pre-loaded hardware wallet",
          body: "A hardware wallet keeps keys on a device the receiver holds. Whether you keep a copy depends on who set it up. A device has to reach them, it costs money, and it usually covers the coins you chose at setup.",
        },
        {
          h3: "A link from a single app",
          body: "Some wallet and exchange apps send crypto by link. The receiver opens the link inside that app. These gifts tend to cover one chain or one app's tokens, and the receiver usually needs an account in the app first.",
        },
      ],
    },
    table: {
      h2: "How the options compare",
      lead: "The question to ask is who could still move the coins after the gift. This table sets the options side by side.",
      table: {
        caption: "Ways to gift crypto, compared on copies, setup and chains",
        head: ["Option", "Giver can keep a copy of the keys?", "Receiver needs a wallet first?", "Chains"],
        rows: [
          ["Gift card", "Not applicable: the platform holds the coins", "Usually an account on that platform", "Whatever the platform sells"],
          ["Set up a wallet for them", "Yes: you saw the seed phrase", "No, but you set it up for them", "Your choice"],
          ["Hardware wallet", "Depends on who set it up", "A device must reach them", "Whatever the device supports"],
          ["Link from one app", "Depends on the app", "Usually an account in that app", "Usually one chain or one app's tokens"],
          ["Satchel by link", "No seed phrase exists for its addresses. Until it is claimed, the link can claim it", "Not before. They connect a NEAR wallet to claim", "Bitcoin, Ethereum and Solana in one gift"],
        ],
      } satisfies TableCopy,
      after: [
        "No option is best for everyone. A gift card suits someone who already uses that platform. A Satchel suits a gift that spans three chains, where you don't want to keep a copy of the keys.",
      ],
    },
    satchel: {
      h2: "Give a whole wallet by link",
      lead: "A Satchel is an NFT on NEAR that controls its own Bitcoin, Ethereum and Solana addresses. Whoever owns the NFT controls the coins. Giving the NFT gives the whole wallet. Here is how a gift by link goes.",
      steps: [
        "[Mint a Satchel](/mint) or open one you own, then add coins to it. Anyone can add coins to its addresses, so friends can chip in too.",
        "Choose Give by link, then review. Your browser makes a one-time secret and builds the link. The secret sits after the # in the link, so it never goes to a server.",
        "Create the link. Your wallet asks you once. The Satchel moves to a fresh NEAR account made for the claim, and 0.02 NEAR goes along to pay gas.",
        "Send the link in a message or as a QR code. Keeping a copy of the link in your browser is off by default.",
        "The receiver opens the link and connects a NEAR wallet. The Satchel and any leftover NEAR move to their wallet, and the coins inside go with it.",
      ],
      after: [
        "If the receiver already has a NEAR account, skip the link. Use Give and enter the account name. The Satchel and everything inside move in one NEAR transaction.",
        "Not sure what a Satchel is? The [questions page](/questions) answers the basics, and [Satchel #1](/s/1) is a live example you can open.",
      ],
    },
    know: {
      h2: "What to know before you send a link",
      lead: "A Satchel gift has sharp edges. Read these before you send one.",
      items: [
        "The receiver connects a NEAR wallet to claim. They don't need an account beforehand, but they do need a NEAR wallet at the moment they claim.",
        "The link works like cash in an envelope. Whoever holds it can claim the Satchel and everything inside, and that includes you.",
        "You can't cancel a link once it is out. A lost link can't be replaced either.",
        "Gifts skip the buyer's check. Giving doesn't wait for [clean history](/clean-history), so give only to someone you trust.",
        "You still trust NEAR's signer network, which makes every signature. Satchel is new and hasn't been audited.",
      ],
      after: [
        "Gifts of crypto can have tax consequences, and the rules differ by country. Satchel gives no tax advice. Ask a tax professional, or start with Bankrate's [guide to gifting crypto](https://www.bankrate.com/investing/how-to-gift-crypto/).",
      ],
    },
    seen: {
      h2: "What the receiver gets",
      body: [
        "The receiver becomes the only owner. Every spending allowance you set ends when the Satchel changes hands, and the coins inside move with the token.",
        "The addresses stay the same after the gift. The signature record stays with the Satchel too, and the new owner can read it on the [Activity tab](/s/1/activity).",
        "That record is what makes a sale checkable. To see how, read the guide to [clean history](/clean-history). To compare this design with other NFT wallets, read [ERC-6551 and token bound accounts](/erc-6551).",
      ],
    },
  },
  faq: [
    {
      q: "How do I gift crypto to someone without a wallet?",
      a: "Give them a Satchel by link. The link carries a one-time secret. They open it, connect a NEAR wallet and claim the Satchel with its Bitcoin, Ethereum and Solana addresses.",
    },
    {
      q: "Can I send bitcoin to someone without a wallet?",
      a: "Yes. Put bitcoin in a Satchel and give it by link. The receiver needs no Bitcoin wallet, only a NEAR wallet to claim it.",
    },
    {
      q: "Can I cancel a gift link?",
      a: "No. The link works like cash in an envelope: whoever holds it can claim, including you, until it is claimed. There is no way to cancel it or replace a lost link.",
    },
    {
      q: "Does a gifted Satchel get the clean-history check?",
      a: "No. Gifts skip the buyer's check, because giving doesn't wait for it. Only a sale shows the check. Give only to someone you trust.",
    },
    {
      q: "Can I gift crypto for Christmas with a Satchel?",
      a: "Yes. Add coins to a Satchel, create a link and put it in a card, as text or a QR code. Whoever holds the link can claim it, so keep it private until the day.",
    },
    {
      q: "Is gifting crypto taxable?",
      a: "It can be, and the rules depend on your country. Satchel gives no tax advice, so ask a tax professional.",
    },
  ] satisfies FaqEntry[],
} as const;
