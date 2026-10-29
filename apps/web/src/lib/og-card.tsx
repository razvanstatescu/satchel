import { ImageResponse } from "next/og";
import { ART } from "@/components/brand/art";
import { Mark } from "@/components/brand/Mark";
import { copy } from "@/lib/copy";
import { getSatchelSnapshot } from "@/lib/data/server";
import { buildOgCardProps, type OgCardProps } from "@/lib/og";
import { OG_FONTS } from "@/lib/og-fonts.generated";

/**
 * A1: the social card per Satchel, shared by /s/[id]/opengraph-image and /s/[id]/twitter-image (both files import
 * and re-export this). 1200×630 (the og:image convention), rendered with next/og's ImageResponse (satori), the
 * brand faces embedded as TTF subsets (og-fonts.generated.ts — satori needs sfnt/woff, never woff2, unlike the NFT
 * media's card-svg.ts) so every crawler draws the same glyphs.
 *
 * Reads go through the existing cached server function (getSatchelSnapshot, "use cache" 15 s). This must never
 * hang: an outer 2.5 s race falls back to a static, data-free branded image (also used for an unknown id), so a
 * slow or failing upstream never blocks a link-preview crawler.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_ALT = "Satchel: an NFT that is a wallet";
export const OG_CONTENT_TYPE = "image/png";

const DAY = { ink: ART.ink, coral: ART.coral, white: ART.white, muted: "#5E5776", sunken: "#ECEAF4" } as const;

const DISPLAY = `'${OG_FONTS.display.family}'`;
const LABEL = `'${OG_FONTS.label.family}'`;

function fontData(face: { ttfBase64: string }): Buffer {
  return Buffer.from(face.ttfBase64, "base64");
}

/** Lazily built (not module scope): ImageResponse's `fonts` wants fresh ArrayBuffer-ish data per call under some
 * bundlers, and this keeps the generated file import side-effect free. */
function ogFonts() {
  return [
    { name: OG_FONTS.display.family, data: fontData(OG_FONTS.display), weight: OG_FONTS.display.weight as 800, style: "normal" as const },
    { name: OG_FONTS.label.family, data: fontData(OG_FONTS.label), weight: OG_FONTS.label.weight as 600, style: "normal" as const },
  ];
}

function Pill({ children, color = DAY.ink }: { children: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "12px 26px", borderRadius: 999, backgroundColor: DAY.sunken, fontFamily: LABEL, fontWeight: 600, fontSize: 28, color }}>
      {children}
    </div>
  );
}

function Chip({ ticker, amount }: { ticker: string; amount: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 24px", borderRadius: 999, backgroundColor: DAY.sunken, fontFamily: LABEL, fontWeight: 600, fontSize: 28, color: DAY.ink }}>
      <div style={{ display: "flex" }}>{ticker}</div>
      <div style={{ display: "flex", color: DAY.muted }}>{amount}</div>
    </div>
  );
}

function OgCard({ props }: { props: OgCardProps }) {
  return (
    <div style={{ display: "flex", width: OG_SIZE.width, height: OG_SIZE.height, backgroundColor: DAY.ink, padding: 22 }}>
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", borderRadius: 48, backgroundColor: DAY.white, border: `6px solid ${DAY.ink}`, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 176, flexShrink: 0, backgroundColor: DAY.coral, borderBottom: `6px solid ${DAY.ink}`, padding: "0 56px" }}>
          <div style={{ display: "flex", fontFamily: DISPLAY, fontWeight: 800, fontSize: 64, color: DAY.ink }}>{copy.card.name(props.id)}</div>
          <Mark size={96} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: 30, padding: "0 56px" }}>
          <div style={{ display: "flex", fontFamily: DISPLAY, fontWeight: 800, fontSize: 52, color: DAY.ink }}>{props.sigLine}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <Pill>{props.status}</Pill>
            {props.chains.map((c) => (
              <Chip key={c.ticker} ticker={c.ticker} amount={c.amount} />
            ))}
            <Pill color={DAY.muted}>{props.testnet}</Pill>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The data-free fallback (unknown id, or an upstream error/timeout): the brand mark, the name, the tagline, the
 * Testnet badge. No Satchel facts, so it can never be stale or wrong. */
function FallbackCard() {
  return (
    <div style={{ display: "flex", width: OG_SIZE.width, height: OG_SIZE.height, backgroundColor: DAY.coral, alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
        <Mark size={160} />
        <div style={{ display: "flex", fontFamily: DISPLAY, fontWeight: 800, fontSize: 72, color: DAY.ink }}>Satchel</div>
        <div style={{ display: "flex", fontFamily: LABEL, fontWeight: 600, fontSize: 30, color: DAY.ink }}>An NFT that is a wallet · Testnet</div>
      </div>
    </div>
  );
}

export function renderFallbackOg(): ImageResponse {
  return new ImageResponse(<FallbackCard />, { ...OG_SIZE, fonts: ogFonts() });
}

/** The timeout is intentionally generous but strictly bounded: getSatchelSnapshot's own "use cache" reads already
 * carry their own per-upstream bound (UPSTREAM_MS), so this only guards against that cache call itself stalling. */
const OG_BUDGET_MS = 2500;

export async function renderSatchelOg(id: string): Promise<ImageResponse> {
  let snap: Awaited<ReturnType<typeof getSatchelSnapshot>> = null;
  try {
    snap = await Promise.race([
      getSatchelSnapshot(id),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), OG_BUDGET_MS)),
    ]);
  } catch {
    snap = null;
  }
  if (!snap) return renderFallbackOg();
  try {
    return new ImageResponse(<OgCard props={buildOgCardProps(snap)} />, { ...OG_SIZE, fonts: ogFonts() });
  } catch {
    return renderFallbackOg();
  }
}
