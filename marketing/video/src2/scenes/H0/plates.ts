import platesJson from "../../../public/v2/intro/plates/plates.json";

/**
 * The intro's third-party material: the PROCESSED plates (public/v2/intro/plates/, real captures with privacy blurs
 * applied, media/agency images left out, words unchanged). Each plate is already cropped; key-phrase boxes come straight
 * from plates.json, so a re-made plate re-times nothing. Credits: marketing/notes/intro-research/sources.md.
 *
 * Balance and scope (coordinator, 2026-11-11, QA v5 #5): no Ledger screenshots (the Devcon clip is the one Ledger item);
 * OpenSea ≤ 2 (decrypt, dfinzer); Trust Wallet ≤ 1 (thn-trust); MetaMask ≤ 1 (metamask); Bybit only as signing (Ben
 * Zhou's signers post: the NBC heist headline is out); no state-hacking or exchange-theft totals (the Chainalysis
 * headline is out); nothing from the FBI. Drift appears once, as CoinDesk's masthead and headline (DRIFT_TOP): its dek
 * says "weeks", so the date comes from a credit chip instead (SLAMS).
 * Attribution (QA v5 #4): every card shows its outlet or account and its date while on screen: X posts and full pages
 * carry them; the light pages slam in whole and only then punch in on their key phrase.
 */
export type Box = { x: number; y: number; w: number; h: number };

type PlateJson = {
  file: string;
  naturalSize: [number, number];
  keyPhrases: { text: string; boxes: number[][]; union: number[] }[];
};
const ALL = (platesJson as unknown as { plates: PlateJson[] }).plates;
const DIR = "v2/intro/plates/";

export type Plate = {
  file: string;
  src: string; // path under public/
  w: number; // natural size of the plate PNG
  h: number;
  key: Box; // the key phrase's union (punch-in focus)
  lines: Box[]; // the key phrase, one box per line (underline)
  x: boolean; // an X post (rounded corners)
  light: boolean; // a white news page: graded down (LIGHT_GRADE) so it never flashes on the black ground
};

const box = (a: number[]): Box => ({ x: a[0], y: a[1], w: a[2], h: a[3] });

/** A plate by file name, with its key phrase picked by the start of its text. */
const plate = (file: string, phrase: string, light = false): Plate => {
  const p = ALL.find((x) => x.file === file);
  if (!p) throw new Error(`H0: plate ${file} is not in plates.json`);
  const k = p.keyPhrases.find((x) => x.text.startsWith(phrase));
  if (!k) throw new Error(`H0: plate ${file} has no key phrase starting "${phrase}"`);
  return { file, src: DIR + file, w: p.naturalSize[0], h: p.naturalSize[1], key: box(k.union), lines: k.boxes.map(box), x: file.includes("-x-"), light };
};

/** Brightness of the light news pages (a grade, words untouched): white lands near 0.32 relative luminance. */
export const LIGHT_GRADE = 0.6;

export const PLATES = {
  // ── bar 1 · seed phrases and keys get copied ──────────────────────────────────────────────────────────────────
  seal: plate("t1-01-x-seal-lastpass-seed-phrases-dark.png", "private keys or seed phrases"), // the hero of bar 1 (F01)
  krebs: plate("t1-02-krebsonsecurity-lastpass-150m.png", "$150M Cyberheist", true),
  metamask: plate("t1-03-x-metamask-icloud-vault-dark.png", "someone phishes"),
  slope: plate("t1-04-x-solanastatus-slope-private-keys-dark.png", "private key information"),
  sparkcat: plate("t1-05-kaspersky-sparkcat-trojan.png", "crypto-stealing Trojan", true),
  "thn-trust": plate("t1-07-thehackernews-trust-wallet-7m.png", "$7 Million", true),
  "cd-282m": plate("t1-12-coindesk-282m-social-engineering.png", "$282 million", true),
  "your-keys": plate("t3-01-cointelegraph-your-keys-his-coins.png", "Your keys, his coins", true),
  "fake-wallet": plate("t3-03-kaspersky-fake-hardware-wallet.png", "fake hardware", true),
  // ── bars 2–3 · signatures drain wallets, signed once and used later ────────────────────────────────────────────
  "ss-458d": plate("t2-01-x-scamsniffer-approval-458-days-dark.png", "phishing approval signed"),
  "ct-908k": plate("t2-02-cointelegraph-908k-15-months.png", "15 months after signing", true),
  decrypt: plate("t2-04-decrypt-opensea-old-prices-1700.png", "$1,700", true), // OpenSea 1 of 2
  dfinzer: plate("t2-07-x-dfinzer-32-users-signed-dark.png", "32 users"), // OpenSea 2 of 2
  benbybit: plate("t2-09-x-benbybit-signers-saw-ui-dark.png", "all the signers saw"), // Bybit, as signing
  "ss-32m": plate("t2-12-x-scamsniffer-permit-32m-dark.png", "after signing a"),
  "ss-35m": plate("t2-13-x-scamsniffer-permit-35m-dark.png", "15,079"),
  wintermute: plate("t2-15-x-wintermute-eip7702-97pct-dark.png", "over 97%"),
  "cd-drift": plate("t2-18-coindesk-drift-durable-nonce-270m.png", "more than $270 million", true), // the one Drift item
  "ss-494m": plate("t4-01-scamsniffer-2024-drainers-494m-headline.png", "Wallet Drainers", true),
  "ss-report": plate("t4-01-scamsniffer-2024-report-card.png", "$494M+"),
} satisfies Record<string, Plate>;

export type PlateId = keyof typeof PLATES;

/** A card in the barrage: a plate (or a region of it), or one of the generic built cards (Generic.tsx). */
export type CardRef = { plate: PlateId; region?: Box } | { g: "g2" | "g4" | "g5" };

/** CoinDesk's Drift page from its masthead down to the end of the headline (the dek with "weeks" stays out). */
const DRIFT_TOP: Box = { x: 0, y: 0, w: 2496, h: 1170 };

/**
 * Bar 1, the wall: real screenshots pinned on black around the SEAL post (world px, centre x/y, width, degrees), and
 * the photo (G1) further along the strip for the whip. Nothing sits under the photo's framing (QA v5 #9).
 */
export const SEAL_AT = { x: 0, y: 30, w: 1180, rot: -2 };
export const WALL: { plate: PlateId; x: number; y: number; w: number; rot: number }[] = [
  { plate: "krebs", x: -1240, y: -470, w: 1180, rot: -3 },
  { plate: "slope", x: -1210, y: 230, w: 760, rot: 4 },
  { plate: "thn-trust", x: -560, y: 760, w: 1320, rot: 2 },
  { plate: "cd-282m", x: -1560, y: 900, w: 820, rot: -3 },
  { plate: "metamask", x: 1100, y: -450, w: 760, rot: 5 },
  { plate: "your-keys", x: 1110, y: 430, w: 780, rot: -4 },
  { plate: "sparkcat", x: 560, y: 900, w: 1180, rot: -1 },
  { plate: "fake-wallet", x: 1960, y: -760, w: 1000, rot: 3 },
];

/** The tunnel's stream (bars 2–3): signatures first, dark posts outnumbering the (graded) light pages 3 to 1. */
export const TUNNEL: CardRef[] = [
  { plate: "ss-32m" },
  { g: "g2" },
  { plate: "ss-458d" },
  { plate: "wintermute" },
  { plate: "decrypt" },
  { plate: "ss-35m" },
  { g: "g4" },
  { plate: "dfinzer" },
  { plate: "ct-908k" },
  { plate: "benbybit" },
  { plate: "ss-report" },
  { plate: "seal" },
  { plate: "krebs" },
  { g: "g5" },
  { plate: "slope" },
  { plate: "metamask" },
  { plate: "your-keys" },
  { plate: "ss-35m" },
];

/**
 * Full-frame slams (2 frames in, then held), back to back from f105 to the black: no dark gap ever opens between two
 * light pages (QA v5 #1). Light pages land whole (masthead and date readable) and then punch in on their key phrase.
 * `chip` is a credit drawn outside the pass when the page's own date can't be shown.
 */
export type Slam = { at: number; len: number; card: CardRef; punch?: boolean; focus?: Box; chip?: string; dive?: { from: number; to: number } };
export const SLAMS: Slam[] = [
  { at: 49, len: 11, card: { g: "g5" }, dive: { from: 56, to: 60 } }, // bar 1: the phishing prompt; the camera dives through it
  { at: 105, len: 8, card: { g: "g2" } }, // bar 2: "Sign" goes down on its 3rd frame
  { at: 113, len: 7, card: { plate: "benbybit" } },
  { at: 120, len: 12, card: { plate: "ss-458d" } }, // bar 3 downbeat: the clearest "signed once, used later"
  { at: 132, len: 7, card: { g: "g4" } },
  { at: 139, len: 7, card: { plate: "ss-32m" } },
  { at: 146, len: 8, card: { plate: "ct-908k" }, punch: true },
  { at: 154, len: 7, card: { plate: "cd-drift", region: DRIFT_TOP }, punch: true, chip: "CoinDesk · Apr 2, 2026" },
  { at: 161, len: 7, card: { plate: "decrypt" }, punch: true, focus: { x: 84, y: 940, w: 1960, h: 600 } }, // headline + dek
  { at: 168, len: 12, card: { plate: "ss-494m" } }, // the last word before the black
];
