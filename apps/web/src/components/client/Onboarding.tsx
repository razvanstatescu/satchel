"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useWallet } from "@/lib/near/wallet";
import { readOnboarding, shouldShowOnboarding, writeOnboardingDone } from "@/lib/onboarding-storage";
import type { View } from "@/components/client/OnboardingOverlay";

/**
 * First-time onboarding (the onboarding build): three short screens on a Satchel's first wallet connect in this
 * browser, then an optional "about you" survey. Client-only, mounted after hydration (no SSR HTML, no layout
 * shift), built on the one overlay-sheet pattern (`ModalSheet`, LandingMenu.tsx) so it inherits its focus trap, Esc,
 * scroll lock and reduced-motion entrance/exit for free.
 *
 * `OnboardingProvider` wraps the app (Providers.tsx): it watches the wallet for a first connect with no stored
 * record and opens itself, and exposes `useOnboardingReplay()` so the account menu's "Replay intro" row can reopen
 * it on demand. Closing it any way (X, Escape, Skip, a screen-3 CTA, or the survey's Skip/Send) writes the stored
 * record once and never shows it again; `submitted` is sticky, so a replay that's closed without resending never
 * un-submits an earlier survey.
 */

const OnboardingOverlay = dynamic(() => import("@/components/client/OnboardingOverlay").then((m) => m.OnboardingOverlay));

const OnboardingReplayCtx = createContext<(() => void) | null>(null);

/** The account menu's "Replay intro" row calls this. A no-op outside `OnboardingProvider` (there should always be
 * one, but a stray import elsewhere must never throw). */
export function useOnboardingReplay(): () => void {
  return useContext(OnboardingReplayCtx) ?? (() => {});
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { ready, accountId } = useWallet();
  const [state, setState] = useState<{ view: View; step: number }>({ view: "closed", step: 0 });
  const autoTriggered = useRef(false);
  // The overlay (screens, survey, the card art, the data reads) is its own chunk: it loads when the intro first opens
  // and stays mounted after that, so closing still plays its exit.
  const [opened, setOpened] = useState(false);
  if (state.view !== "closed" && !opened) setOpened(true);

  // The first wallet connect in this browser with no stored record: open screen 1. Checked once per account
  // becoming available; `view !== "closed"` guards a replay already in progress.
  useEffect(() => {
    if (!ready || !accountId || autoTriggered.current || state.view !== "closed") return;
    if (!shouldShowOnboarding()) return;
    // next tick, like the rest of the app's effects (no synchronous setState in an effect body)
    const t = setTimeout(() => {
      autoTriggered.current = true;
      setState({ view: "screens", step: 0 });
    }, 0);
    return () => clearTimeout(t);
  }, [ready, accountId, state.view]);

  const setStep = useCallback((step: number) => setState((s) => ({ ...s, step })), []);

  const finish = useCallback((submitted: boolean) => {
    writeOnboardingDone(submitted);
    setState((s) => ({ ...s, view: "closed" }));
  }, []);

  const onFinishScreens = useCallback(
    ({ toSurvey }: { toSurvey: boolean }) => {
      if (!toSurvey) return finish(false);
      // a replay whose survey was already submitted skips straight past it (never shown twice)
      if (readOnboarding()?.submitted) return finish(true);
      setState((s) => ({ ...s, view: "survey" }));
    },
    [finish],
  );

  const close = useCallback(
    (submitted: boolean = false) => finish(submitted),
    [finish],
  );

  const replay = useCallback(() => {
    setState({ view: "screens", step: 0 });
  }, []);

  return (
    <OnboardingReplayCtx.Provider value={replay}>
      {children}
      {opened ? <OnboardingOverlay view={state.view} step={state.step} setStep={setStep} close={close} onFinishScreens={onFinishScreens} /> : null}
    </OnboardingReplayCtx.Provider>
  );
}
