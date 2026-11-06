import type { Metadata, Viewport } from "next";
import { Funnel_Display, Geist_Mono, Onest } from "next/font/google";
import { Providers } from "@/components/client/Providers";
import { PressFeedback } from "@/components/client/PressFeedback";
import { APP_URL } from "@/lib/config";
import { copy } from "@/lib/copy";
import { LLMS_PATH } from "@/lib/seo";
import { MOTION_HEAD_SCRIPT } from "@/lib/motion-flag";
import { GROUND, THEME_HEAD_SCRIPT } from "@/lib/theme";
import "./globals.css";

/*
 * Fonts (design-system-impl §3): next/font/google, self-hosted at build time, never the Google CSS link. `weight` is
 * omitted on purpose: each is a variable font (the whole axis ships) and Next 16.4 rejects a Google weight range.
 * Funnel Display is for display only (balances, titles, the card name); Onest is for everything people read and tap;
 * Geist Mono is for addresses and hashes only. Mono isn't preloaded: its swap barely reflows (the fallbacks are 0.6 em).
 */
const display = Funnel_Display({ subsets: ["latin"], variable: "--font-funnel", display: "swap" });
const sans = Onest({ subsets: ["latin"], variable: "--font-onest", display: "swap" });
const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: "Satchel", template: "%s · Satchel" },
  description: copy.home.lead,
  applicationName: "Satchel",
  // Fallbacks for a route with no metadata of its own. Pages call `pageMetadata` (lib/seo.ts), which sets title, description,
  // canonical and og/twitter per page; nothing here hard-codes a page's title (the old twitter title was on every page).
  openGraph: { type: "website", siteName: "Satchel" },
  twitter: { card: "summary_large_image" },
  alternates: { types: { "text/markdown": LLMS_PATH } },
};

/**
 * Day first, whatever the OS (R12.3): one theme-color, the Day ground. The head script rewrites it to the Night ground
 * before first paint when Night is stored, or when System is stored and the OS is dark.
 */
export const viewport: Viewport = {
  themeColor: GROUND.day,
  colorScheme: "light",
  interactiveWidget: "resizes-content",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        {/* Resolves the theme (Day unless Night or System is stored) and sets <html data-theme> and theme-color before
            first paint (no flash); then flags <html data-js data-motion> for the motion gates (it never hides
            anything itself). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_HEAD_SCRIPT + MOTION_HEAD_SCRIPT }} />
      </head>
      <body>
        {/* The chrome lives in the route groups: (landing) has the landing shell, (app) the app shell. */}
        <Providers>{children}</Providers>
        <PressFeedback />
      </body>
    </html>
  );
}
