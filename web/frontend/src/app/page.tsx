"use client";

import { ClosingSection } from "@/components/landing/ClosingSection";
import { DemoSection } from "@/components/landing/DemoSection";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { LearnSection } from "@/components/landing/LearnSection";
import { PaperTradingSection } from "@/components/landing/PaperTradingSection";
import { PersonalisationSection } from "@/components/landing/PersonalisationSection";
import { ProblemSection } from "@/components/landing/ProblemSection";

/**
 * The public page.
 *
 * Each section is one idea and owns its own file; this one only decides the
 * order they are read in. The `cap` class scopes the rebuilt design tokens, so
 * nothing here can reach the screens that have not been migrated yet.
 */
export default function LandingPage() {
  return (
    <div className="cap min-h-screen">
      <LandingNav />
      <main>
        <Hero />
        <ProblemSection />
        <HowItWorks />
        <DemoSection />
        <PaperTradingSection />
        <PersonalisationSection />
        <LearnSection />
        <ClosingSection />
      </main>
      <LandingFooter />
    </div>
  );
}
