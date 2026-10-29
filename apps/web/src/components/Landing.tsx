import { CleanSection } from "@/components/landing/CleanSection";
import { FinaleSection } from "@/components/landing/FinaleSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowSection } from "@/components/landing/HowSection";
import { LandingMotion } from "@/components/landing/LandingMotion";
import { QuestionsSection } from "@/components/landing/QuestionsSection";
import { TrustSection } from "@/components/landing/TrustSection";
import { UsesSection } from "@/components/landing/UsesSection";
import { WhatSection } from "@/components/landing/WhatSection";
import "@/components/landing/landing.css";

/**
 * The marketing landing `/` (Satchel 2.0; design-spec §1 "Show the object", §4; R12: H1 C, hero A, Day first). Simulated
 * and generic (D-42): one sample card, its coin charms and its record, at real size and in real UI, and no data read on
 * `/` (the live facts are on /s/1 and /contract). Every word is in the server HTML; every illustration is `aria-hidden`
 * with its labels drawn from attributes; every section reads complete with no JS and under reduced motion.
 *
 * One idea per section, in the copywriter's order: the hero (what, who, why; the shelf and its loop), what it is
 * (`#what`), who it's for (`#uses`), how it works (`#how`), the catch and the record (`#clean`), no admin key (`#trust`,
 * with Under the hood), the honest limits (`#questions`), and the brand cover (`#try-it`). Motion (WAAPI and CSS only,
 * R10) is one client island, LandingMotion, that upgrades this server HTML in place after hydration. The app home (My
 * Satchels) is `/satchels`; signed in, the header's My Satchels pill leads there, so `/` reads nothing (D-42).
 */
export function Landing() {
  return (
    <>
      <HeroSection />
      <WhatSection />
      <UsesSection />
      <HowSection />
      <CleanSection />
      <TrustSection />
      <QuestionsSection />
      <FinaleSection />
      <LandingMotion />
    </>
  );
}
