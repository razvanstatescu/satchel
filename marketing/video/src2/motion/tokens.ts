import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Satchel 2.0 colour tokens (marketing/brand-v2/tokens.json). Day is the default.
export const C = {
  ground: "#f6f5fb", // cool off-white, never cream
  surface: "#ffffff",
  sunken: "#eceaf4",
  line: "#e2dfee",
  lineStrong: "#7f7999",
  ink: "#1d1340", // text, outlines, hard shadows
  inkMuted: "#5e5776",
  coral: "#ff5c4d", // the brand: one coral fill per frame
  coralDeep: "#d9402f", // pressed primary button
  coralSoft: "#ffe3df",
  lemon: "#ffd84d", // sticker accent only
  sky: "#8fd3ff", // sticker accent only
  success: "#0b6e54",
  frozen: "#2a63c7",
  danger: "#c61f45",
  btc: "#f7931a", // charm fills (illustration colours, both themes)
  eth: "#a3abe0",
  sol: "#c08cff",
  nightGround: "#120c26",
  nightSurface: "#1c1538",
  nightInk: "#f4f2ff",
  nightShadow: "#000000",
} as const;

/** The logo tile's corner ratio (112/512). The Satchel card and the coral iris use it too. */
export const TILE_RADIUS = 112 / 512;

/**
 * Stroke weights at video scale. k = on-screen size / UI size (a 360 px phone card shown 900 px wide: k = 2.5).
 * Brand UI values are outline 3 px and shadow 4 px; whole pixels, with floors so they survive a phone screen.
 */
export const stroke = (k: number) => ({
  outline: Math.max(5, Math.round(3 * k)),
  shadow: Math.max(6, Math.round(4 * k)),
});

export const FONT = { display: "Funnel Display", sans: "Onest", mono: "Geist Mono" } as const;

/** Call once at module level (Root.tsx). loadFont() from @remotion/fonts holds the render until each face is ready. */
export const loadBrand2Fonts = () =>
  Promise.all([
    loadFont({ family: FONT.display, url: staticFile("v2/fonts/FunnelDisplay-VF.ttf"), weight: "300 800" }),
    loadFont({ family: FONT.sans, url: staticFile("v2/fonts/Onest-VF.ttf"), weight: "100 900" }),
    loadFont({ family: FONT.mono, url: staticFile("v2/fonts/GeistMono-VF.ttf"), weight: "100 900" }),
  ]);
