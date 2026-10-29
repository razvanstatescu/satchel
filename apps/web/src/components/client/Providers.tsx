"use client";

import type { ReactNode } from "react";
import { WalletProvider } from "@/lib/near/wallet";
import { Toaster } from "@/components/client/Toaster";

/**
 * Client providers, rendered by the (server) root layout. No Suspense here: judge facts must never stream. Motion is
 * WAAPI and CSS only (R10), so there is no motion provider: each animation reads `readMotionMode()` itself.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      {children}
      <Toaster />
    </WalletProvider>
  );
}
