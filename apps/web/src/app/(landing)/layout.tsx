import { Footer, SkipLink, Strips, TopBar, WalletPickerHost } from "@/components/NavShell";
import { PendingIndicator } from "@/components/client/PendingIndicator";

/**
 * The landing's chrome (design-spec §3.3, §4.1): the one top bar in its landing variant (the in-page links and Market
 * from 1024, the Menu sheet below it, Connect NEAR wallet or the My Satchels pill), the strips, the page, then the one
 * footer with the theme control in its bottom row. The landing's sections are the landing builder's (`page.tsx`).
 */
export default function LandingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh">
      <SkipLink />
      <TopBar variant="landing" />
      <Strips contained />
      <main id="main" tabIndex={-1} className="w-full outline-none">
        {children}
      </main>
      <Footer surface="landing" />
      <PendingIndicator />
      <WalletPickerHost />
    </div>
  );
}
