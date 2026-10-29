import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CARD_FONTS, CARD_LABEL_WIDTHS } from "@/lib/card-fonts.generated";
import { CARD_CHIPS, CARD_FONT_CSS, CARD_STATUS_WORDS, CARD_SUB, cardSvg, labelWidth, type CardSvgStatus } from "@/lib/card-svg";
import { copy } from "@/lib/copy";

/**
 * /api/card/{id}.svg (Satchel 2.0, design-system-impl §8; D-23): the sticker card in Day colours, its words from the
 * copy deck, the brand faces inside the SVG as WOFF2 data: URIs. Snapshot + font integrity + glyph coverage + layout.
 */

const STATUSES = Object.keys(CARD_STATUS_WORDS) as CardSvgStatus[];
const fontless = (svg: string) => svg.replace(/base64,[A-Za-z0-9+/=]+/g, "base64,<woff2>");

describe("card SVG", () => {
  it("matches the snapshot (fonts elided; their bytes are pinned below)", () => {
    expect(fontless(cardSvg("1", "active", 2))).toMatchSnapshot();
    expect(fontless(cardSvg("3", "listed", 1))).toMatchSnapshot();
  });

  it("says what the app says: the pill words, the count and the sub line come from the copy deck", () => {
    expect(CARD_STATUS_WORDS).toEqual({ active: copy.pill.active, signing: copy.pill.signing, listed: copy.pill.listed });
    expect(CARD_STATUS_WORDS.listed).toBe("Paused for sale");
    expect(CARD_SUB).toBe(copy.card.svgSub);
    const svg = cardSvg("3", "listed", 1);
    expect(svg).toContain(">Paused for sale</text>");
    expect(svg).toContain(`>${copy.card.svgSigs(1)}</text>`);
    expect(svg).not.toContain(">Listed<");
  });

  it("pins the embedded font bytes (regenerate with `pnpm --filter web fonts:card`)", () => {
    expect(Object.fromEntries(Object.entries(CARD_FONTS).map(([k, f]) => [k, `${f.family} ${f.weight} ${f.bytes} B ${f.sha256}`]))).toMatchInlineSnapshot(`
      {
        "display": "Satchel Card Display 800 2748 B 27de6f1f7c983dc3e89454a89abe7df28d9300a726cf0cab338c37afaf833607",
        "label": "Satchel Card Label 600 3520 B db4d5cbc9a5d5d8aae4ff410d459a12f33e9bbaa400430ecdd8366fcc3c25449",
        "sans": "Satchel Card Sans 500 2072 B d749c289ea004b8c9ef014b7039e16b444ffa7b963f9f94cace9d3ecbd217de5",
      }
    `);
  });

  it("embeds three WOFF2 faces whose bytes match their recorded sha256", () => {
    const svg = cardSvg("7", "signing", 0);
    expect(svg).toContain(`<style>${CARD_FONT_CSS}</style>`);
    expect(svg.match(/@font-face\{/g)).toHaveLength(3);
    for (const f of Object.values(CARD_FONTS)) {
      const bytes = Buffer.from(f.woff2Base64, "base64");
      expect(bytes.subarray(0, 4).toString("latin1")).toBe("wOF2");
      expect(bytes.length).toBe(f.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(f.sha256);
      expect(svg).toContain(`font-family:'${f.family}';font-weight:${f.weight}`);
    }
    // the whole image stays small enough for wallet caches (3 subsets ≈ 8 KB of WOFF2)
    expect(svg.length).toBeLessThan(20_000);
  });

  it("every character the card can draw is in the subset of the face that draws it", () => {
    const missing = (chars: string, text: string) => [...text].filter((ch) => !chars.includes(ch));
    const ids = ["1", "7", "42", "100", "9999999999", "1234567890"];
    const counts = [0, 1, 2, 10, 1088, 9_876_543];
    for (const id of ids)
      for (const st of STATUSES)
        for (const n of counts) {
          const svg = cardSvg(id, st, n);
          const texts = [...svg.matchAll(/<text [^>]*font-family="'(Satchel Card [A-Za-z]+)'[^>]*>([^<]*)<\/text>/g)].map((m) => [m[1], m[2]] as const);
          expect(texts.length).toBe(4 + CARD_CHIPS.length); // name, count, sub, pill + the chips
          for (const [family, text] of texts) {
            const face = Object.values(CARD_FONTS).find((f) => f.family === family)!;
            expect(missing(face.chars, text), `${family}: "${text}"`).toEqual([]);
          }
        }
    // the SOL chip (shown only with the SOL UI flag) is covered too
    expect(missing(CARD_FONTS.label.chars, "SOL")).toEqual([]);
  });

  it("lays its pills out from shaped constants: a width for every word it draws, no overlap, chips flush right", () => {
    for (const w of [...Object.values(CARD_STATUS_WORDS), "BTC", "ETH", "SOL"]) expect(CARD_LABEL_WIDTHS[w], w).toBeGreaterThan(0);
    expect(() => labelWidth("Listed")).toThrow(/fonts:card/);
    for (const st of STATUSES) {
      const svg = cardSvg("3", st, 1);
      const pill = Number(/<g transform="translate\(44 412\)"><rect width="([\d.]+)"/.exec(svg)![1]);
      const chips = [...svg.matchAll(/<g transform="translate\(([\d.]+) 412\)"><rect width="([\d.]+)"/g)].map((m) => [Number(m[1]), Number(m[2])]).filter(([x]) => x !== 44);
      expect(chips).toHaveLength(CARD_CHIPS.length);
      const [lastX, lastW] = chips[chips.length - 1];
      expect(Math.abs(lastX + lastW - 756)).toBeLessThan(0.2); // flush right at x 756
      expect(44 + pill).toBeLessThan(chips[0][0] - 10); // the pill never meets the chips
    }
  });

  it("is the sticker card: Day colours, the hard drop, the coral band, the charm S; no balances, owner, fiat or Yours", () => {
    const svg = cardSvg("1", "active", 2);
    expect(svg).toContain('viewBox="0 0 800 512"');
    expect(svg).toContain('<rect y="8" width="800" height="504" rx="56" fill="#1D1340"/>'); // the 8 px drop
    expect(svg).toContain('<rect width="800" height="141" fill="#FF5C4D"/>'); // the band
    expect(svg).toContain('stroke="#1D1340" stroke-width="6"'); // the outline
    expect(svg).not.toMatch(/0\.00|alice|owner|Yours|\$|stroke-dasharray/i);
    expect(svg).toContain('aria-label="Satchel #1. Active. 2 signatures recorded on NEAR testnet."');
    expect(CARD_CHIPS).toEqual(["BTC", "ETH", "SOL"]); // SOL follows SOL_UI_ENABLED, on by default since D-46
  });
});
