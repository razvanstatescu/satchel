"use client";

import type { ReactNode } from "react";
import { WalletProvider } from "@/lib/near/wallet";
import { OnboardingProvider } from "@/components/client/Onboarding";
import { Toaster } from "@/components/client/Toaster";

/**
 * Client providers, rendered by the (server) root layout. No Suspense here: judge facts must never stream. Motion is
 * WAAPI and CSS only (R10), so there is no motion provider: each animation reads `readMotionMode()` itself.
 *
 * `OnboardingProvider` renders the first-time onboarding overlay itself (client-only, mounted after hydration): it
 * never appears in the server HTML and adds nothing to it (the onboarding build).
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <OnboardingProvider>
        {children}
        <Toaster />
      </OnboardingProvider>
    </WalletProvider>
  );
}
