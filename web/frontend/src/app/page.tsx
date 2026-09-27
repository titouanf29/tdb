"use client";

import { CloudLayer, PageCourse, type CourseStop } from "@/components/design-system";
import { ClosingSection } from "@/components/landing/ClosingSection";
import { OuvertureDuCiel, Traversee } from "@/components/landing/effets";
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
 * order they are read in, and names the stops along the way. The `cap` class
 * scopes the rebuilt design tokens, so nothing here can reach the screens
 * that have not been migrated yet.
 */

const STOPS: CourseStop[] = [
  { id: "depart", label: "Départ" },
  { id: "probleme", label: "Le problème" },
  { id: "fonctionnement", label: "Fonctionnement" },
  { id: "demo", label: "Démo" },
  { id: "paper-trading", label: "Paper trading" },
  { id: "personnalisation", label: "Personnalisation" },
  { id: "apprendre", label: "Apprendre" },
  { id: "arrivee", label: "Arrivée" },
];

export default function LandingPage() {
  return (
    <div className="cap min-h-screen">
      {/* À l'arrivée, l'écran est sous les nuages, qui s'écartent. */}
      <OuvertureDuCiel />
      <CloudLayer />
      <LandingNav />
      <PageCourse stops={STOPS} />
      <main>
        <Hero />
        {/* Entre deux sections, on traverse une couche de nuages qui
            s'ouvre par le milieu. Purement visuel, masqué aux lecteurs
            d'écran, absent si les animations sont réduites. */}
        <Traversee />
        <ProblemSection />
        <HowItWorks />
        <Traversee />
        <DemoSection />
        <PaperTradingSection />
        <PersonalisationSection />
        <Traversee />
        <LearnSection />
        <ClosingSection />
      </main>
      <LandingFooter />
    </div>
  );
}
