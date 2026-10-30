/**
 * Copy deck, shell namespaces (package H after F1): app, title, nav, connect, theme, role, footer, toast, home, mint,
 * contract, errors, a11y. Merged into `copy` by src/lib/copy.ts; import from "@/lib/copy", never from here.
 * Rules (voice-copy.md §1): sentence case, verb first, one verb per action, no fiat, no glyphs typed into strings, a
 * no-break space before every ticker, straight apostrophes. `test/unit/config-copy-theme.test.ts` enforces them.
 */

import { chainList, SOL_NAMED } from "@/lib/copy/chains";
import { plural as n } from "@/lib/format";

export const shell = {
  app: {
    name: "Satchel",
    badge: "Testnet",
    badgeTip: "Satchel runs on NEAR testnet, Bitcoin testnet4 and Ethereum Sepolia. Coins here have no value.",
    fixture: "Sample data: these pages don't read the chains live.",
    /** A flow sheet's step line (FlowShell), on input steps only: "Step 1 of 2". */
    step: (index: number, count: number) => `Step ${index} of ${count}`,
  },
  title: {
    page: (page: string) => `${page} · Satchel`,
  },
  nav: {
    mySatchels: "My Satchels",
    market: "Market",
    mint: "Mint",
    book: "Address book",
    contract: "Contract facts",
    menu: "Menu",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    /** One connect label everywhere (DL-10): the header, the guards, Buy and Mint. */
    connect: "Connect NEAR wallet",
    /** What shows below 480 px; the accessible name stays `connect` (label in name, WCAG 2.5.3). */
    connectShort: "Connect",
    connecting: "Connecting…",
    copyAccount: "Copy account ID",
    viewNearBlocks: "View on NearBlocks",
    disconnect: "Disconnect",
    home: "Satchel home",
    /** The account menu's name (a popover from 768 px, a sheet below), and its sheet's close button. */
    account: "Account",
    close: "Close",
    /** The top bar's avatar button: its name carries the full account ID. */
    accountButton: (account: string) => `Account ${account}`,
    /** The landing header's My Satchels pill: its name continues ("My Satchels, signed in as …"; WCAG 2.5.3). */
    signedInAs: (account: string) => `signed in as ${account}`,
    /** The landing header's in-page links and the menu sheet's group names. */
    onThisPage: "On this page",
    app: "App",
    anchors: { how: "How it works", clean: "Clean history", questions: "Questions" },
  },
  /** NEW (app-screens §11.4): Satchel's wallet picker (R7; live mode). */
  connect: {
    title: "Connect a NEAR wallet",
    body: "Satchel runs on NEAR testnet. Pick a wallet that holds a testnet account.",
    recent: "Recent",
    loading: "Loading wallets",
    loadFailed: "Couldn't load the list of wallets.",
    /** Your own cancel is not an error (app-screens §1.4). */
    cancelled: "You closed the wallet. Nothing changed.",
    failed: (wallet: string) => `Couldn't connect to ${wallet}. Try again, or pick another wallet.`,
  },
  theme: { label: "Theme", system: "System", night: "Night", day: "Day" },
  role: {
    dev: "Dev contract: lock and code checks skipped",
    rc: "Release candidate: testnet rehearsal",
  },
  footer: {
    product: "Product",
    verify: "Verify",
    hackathon: "Hackathon",
    repo: "Repo",
    readme: "README",
    howItWorks: "How it works",
    nearHackathon: "NEAR Hackathon",
    /** The brand column under the lockup. */
    tagline: "An NFT that is a wallet.",
    /** Verify → /s/1, the judge's Satchel. */
    live: "A live Satchel",
    /** The footer's bottom-row note on the landing and in the app (R8). */
    testnet: "Testnet only. Coins here have no value.",
  },
  toast: {
    accountCopied: "Account ID copied",
  },
  home: {
    /** R12.1 (D-44): H1 C, two-tone on the landing (the first sentence ink, the second ink-muted). */
    h1: "Sell a wallet with everything inside. The buyer checks it first.",
    /** Also the site-wide meta description (app/layout.tsx), so search snippets say testnet. */
    lead: "Satchel is an NFT that is a wallet. Each one has its own Bitcoin, Ethereum and Solana addresses on testnet. Give it or sell it, and everything inside goes too.",
    note: "Testnet only. Coins here have no value.",
    howTitle: "How it works",
    empty: {
      title: "You don't own a Satchel yet",
      body: `Mint one and get ${chainList()} addresses that go wherever the NFT goes.`,
      cta: "Mint a Satchel",
      link: "Look inside Satchel #1",
    },
    /** NEW (app-screens §2): /satchels signed out. */
    signedOut: {
      title: "Your Satchels live in your NEAR wallet",
      body: "Connect it to see the Satchels it owns.",
    },
    list: {
      title: "My Satchels",
      count: (c: number) => n(c, "Satchel", "Satchels"),
      /** NEW (app-screens §2): the one line under a listed card on /satchels. */
      forSale: (price: string) => `For sale at ${price}`,
      blocked: (price: string, count: number) =>
        `For sale at ${price}, but ${n(count, "signature", "signatures")} could still move coins, so nobody can buy it yet.`,
    },
    error: "Couldn't load your Satchels.",
    tryAgain: "Try again",
    /** /satchels meta description. */
    meta: "The Satchels your NEAR testnet wallet owns: what's inside each one, and money waiting for you.",
  },
  mint: {
    title: "Mint a Satchel",
    /** /mint meta description. */
    meta: `Mint a Satchel: an NFT with its own ${SOL_NAMED ? "Bitcoin testnet4, Ethereum Sepolia and Solana devnet" : "Bitcoin testnet4 and Ethereum Sepolia"} addresses.`,
    youGet: "You get",
    deposit: "Deposit",
    /** The Deposit row, split (app-screens §10): the amount, and the note under it. */
    depositAmount: "0.02\u00a0NEAR",
    depositNote: "unused part refunded",
    cta: "Mint a Satchel",
    connect: "Connect NEAR wallet",
    /** NEW (app-screens §10): under Connect when signed out. */
    walletHint: "Use a NEAR testnet wallet such as Meteor or Intear.",
    get: [
      "Its own Bitcoin testnet4 address",
      "Its own Ethereum Sepolia address",
      ...(SOL_NAMED ? ["Its own Solana devnet address"] : []),
      "Only its owner can move the coins",
      "A public record of every signature it makes",
    ],
    /** The CTA while the wallet is open, and the note under it. */
    approving: "Approve in your wallet…",
    walletNote: "Check the Meteor or Intear window.",
    minting: "Minting…",
    steps: { approve: "Approve in your wallet", approved: "Approved in your wallet", doing: "Minting on NEAR", done: "Minted" },
    progress: "Progress",
    done: (id: string) => `Satchel #${id} is yours.`,
    mintedIn: (tx: string) => `Minted in ${tx}`,
    fund: "Add coins",
    open: (id: string) => `Open Satchel #${id}`,
    toast: (id: string) => `Minted Satchel #${id}`,
    cancelled: "You cancelled in your wallet. Nothing was minted.",
    /** The wallet failed before a transaction existed. */
    failed: "Something went wrong. Nothing was minted.",
    /** A transaction exists but NEAR hasn't confirmed it (honest: it may still land). */
    unconfirmed: "NEAR hasn't confirmed the mint yet. If it goes through, the new Satchel shows up in My Satchels.",
  },
  contract: {
    title: "Contract facts",
    /** /contract meta description. */
    meta: "Satchel's contract account: born without a key, the code hash it runs, and copy-paste commands to verify both.",
    h1: "Born without a key",
    sub: (c: string) => `${c} was created, deployed, initialized and minted in one transaction with no AddKey. Only sign_for can get signatures for its Satchels.`,
    devH1: "Development contract",
    devSub: "This account has keys. Lock and code checks are skipped on dev.",
    devSubLocked: "Dev contract. Lock and code checks are skipped on dev.",
    /** The badge under the H1 (judge.spec pins it); moved out of contract/page.tsx. */
    keyless: "Keyless since birth.",
    /** The Role fact's value. */
    roles: { dev: "Development", rc: "Release candidate", final: "Final" },
    facts: {
      contract: "Contract",
      role: "Role",
      keys: "Access keys",
      locked: "Account is locked (no access keys)",
      keysSome: (count: number) => n(count, "access key", "access keys"),
      /** The configured account doesn't exist (yet): say so, never "0 access keys". */
      noAccount: "No such account on NEAR testnet",
      unavailable: "Unavailable",
      block: (height: string) => `block ${height}`,
      theBirth: "(the birth)",
      birth: "Birth tx",
      signerTxs: "Signer txs",
      oldest: "Oldest tx",
      codeHash: "Code hash (SHA-256)",
      expected: "Expected",
      matches: "Matches",
      mpc: "MPC version",
      config: "Config",
    },
    verifyTitle: "Verify it yourself",
    /** NEW (app-screens §11.1): what each verify command proves, in the page's order. */
    cmd: {
      summary: "No access keys on the account",
      signer: "It has never signed a transaction",
      oldest: "Its oldest transaction is the birth",
      birth: "The birth: created, deployed, initialized and minted, with no AddKey",
      build: "Rebuild the code and compare its hash",
      copy: "Copy command",
      copied: "Command copied",
    },
    readAt: (t: string) => `Read from NEAR testnet and the FastNEAR transactions API at ${t}.`,
  },
  errors: {
    E3: (id: string) => `Only the owner of Satchel #${id} can sign. It may have changed hands in another tab. Nothing was sent.`,
    E4: (id: string) => `Signing is paused while Satchel #${id} is for sale. Stop selling it to send. Nothing was signed.`,
    E6: (needed: string) => `Your NEAR account doesn't have enough NEAR for this. It needs about ${needed} free (unused NEAR is refunded). Nothing changed.`,
    E7gas: "This request didn't include enough gas. Nothing was signed.",
    E7mpc: "The signer network rejected this request for gas. Nothing was sent. Clean history lists it as Unused until its nonce or coins are used; Try again reuses them.",
    E8: "The signer network rejected this request. Nothing was sent. Clean history lists it as Unused until its nonce or coins are used.",
    E10: "This exact transaction is already being signed. Wait for it to finish.",
    E22: "The signature didn't match this transaction. Nothing was sent.",
    E34listed: (id: string) => `Satchel #${id} is already for sale.`,
    E34not: (id: string) => `Satchel #${id} isn't for sale anymore.`,
    E36: "You can't buy your own Satchel. Stop selling it instead.",
    E38: "Nothing is waiting for you.",
    E39: (chain: string) => `Satchel only signs plain ${chain} transfers. Nothing was signed.`,
    E40: "Solana signing isn't enabled on this contract.",
    /** kb/90 §5.9 nonce-gap rule (D-43): the contract refuses an Ethereum nonce more than one above the highest signed one. */
    nonceGap: (allowed: string) => `This Satchel can only sign Ethereum nonce ${allowed} or lower next. Nothing was signed.`,
    E41: "Can't build a safe transaction. Try a different amount. Nothing was signed.",
    getNear: "Get testnet NEAR",
  },
  a11y: { newTab: "(opens in a new tab)", skip: "Skip to content" },
} as const;
