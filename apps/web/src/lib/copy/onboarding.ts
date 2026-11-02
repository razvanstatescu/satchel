/**
 * Copy deck, first-time onboarding (three screens) and the optional "about you" survey. Merged into `copy` by
 * src/lib/copy.ts as `copy.onboarding`; import from "@/lib/copy", never from here. Same rules as the rest of the
 * deck (test/unit/config-copy-theme.test.ts): sentence case, no fiat, no plumbing words, straight apostrophes.
 *
 * The option ids below (goal, experience, chains, source) are a stable contract shared with the API route
 * (src/lib/onboarding-validate.ts) and the report tool (tools/onboarding-report.ts): only the WORDS here may change.
 */
export const onboardingCopy = {
  skip: "Skip",
  next: "Next",
  back: "Back",
  close: "Close intro",
  replayIntro: "Replay intro",
  learnMore: "Learn more",
  /** read after a Learn more link's topic: the answer opens in a new tab, so the intro stays put */
  newTab: " (opens in a new tab)",
  screens: [
    {
      id: "hand-over",
      title: "A wallet you can hand over",
      body: "One Satchel is an NFT on NEAR. It holds its own Bitcoin, Ethereum and Solana addresses. Give it or sell it, and everything inside goes too.",
      learnMore: { anchor: "q-give", label: "How giving a Satchel works" },
    },
    {
      id: "clean-history",
      title: "Every signature is on the record",
      body: "The contract writes down every signature a Satchel makes. A buyer's browser checks that none of them can still move the coins, which is what lets a Satchel be sold safely.",
      learnMore: { anchor: "q-proves", label: "What the buyer's check covers" },
    },
    {
      id: "one-wallet",
      title: "No new keys to keep",
      body: "Send Bitcoin, Ethereum and Solana with the NEAR wallet you already use. There's no seed phrase for each chain: whoever owns the Satchel controls what's inside.",
      learnMore: { anchor: "q-keys", label: "Who holds the keys" },
    },
  ],
  mintCta: "Mint your first Satchel",
  openCta: "Open my Satchels",
  continueCta: "Continue",
  survey: {
    title: "Help us build Satchel",
    lead: "About 20 seconds, and everything here is optional.",
    learnMoreLabel: "What we collect, and why",
    goal: {
      q: "What brings you here?",
      options: {
        explore: "Just exploring or judging",
        gift: "Giving crypto to someone",
        trade: "Buying or selling a wallet with its coins",
        multichain: "Holding coins on several chains in one place",
        build: "Building with chain signatures",
        other: "Something else",
      },
    },
    experience: {
      q: "How familiar are you with crypto wallets?",
      options: {
        new: "New to them",
        some: "I've used one or two",
        regular: "I use several chains often",
        builder: "I build crypto apps",
      },
    },
    chains: {
      q: "Which chains do you use most?",
      options: {
        btc: "Bitcoin",
        evm: "Ethereum and L2s",
        sol: "Solana",
        near: "NEAR",
        none: "None yet",
      },
    },
    source: {
      q: "How did you find Satchel?",
      options: {
        hackathon: "NEAR Hackathon",
        x: "X",
        friend: "Someone gave me a Satchel or a link",
        search: "Search",
        other: "Other",
      },
    },
    shareAccount: {
      label: "Include my NEAR account so you can see how I use Satchel",
      hint: "With it on, we can match your answers to your Satchel activity on NEAR, which is already public.",
    },
    privacy:
      "We send your answers, the time and the app version, and your account id only if you ticked the box above. Nothing else is collected: no IP address stored, no cookies.",
    skip: "Skip",
    send: "Send",
    sending: "Sending…",
    thanks: "Thanks, that helps.",
  },
} as const;
