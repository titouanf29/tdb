import "@/components/landing/vitrine.css";

import { Suspense } from "react";
import { CloudLayer, PageCourse, type CourseStop } from "@/components/design-system";
import { ClosingSection } from "@/components/landing/ClosingSection";
import { ChiffresCles } from "@/components/landing/ChiffresCles";
import { FaqSection } from "@/components/landing/FaqSection";
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
 *
 * LA PAGE ELLE-MÊME EST RENDUE PAR LE SERVEUR, ET CHAQUE SECTION SE MET EN
 * ROUTE À SON TOUR. Tout l'accueil s'hydratait d'un bloc dans le navigateur :
 * plus d'une seconde de calcul sur un téléphone moyen (Lighthouse), pendant
 * laquelle la page ne répondait pas et le premier écran tardait. Chaque
 * section est une frontière Suspense : React les hydrate l'une après l'autre
 * et rend la main entre deux, en commençant par celle que l'on touche.
 */

/** Une section qui s'hydrate à son tour (voir plus haut). */
function Tour({ children }: Readonly<{ children: React.ReactNode }>) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

const STOPS: CourseStop[] = [
  { id: "depart", label: "Départ" },
  { id: "probleme", label: "Le problème" },
  { id: "fonctionnement", label: "Fonctionnement" },
  { id: "demo", label: "Démo" },
  { id: "paper-trading", label: "Paper trading" },
  { id: "personnalisation", label: "Personnalisation" },
  { id: "apprendre", label: "Apprendre" },
  { id: "faq", label: "Questions" },
  { id: "arrivee", label: "Arrivée" },
];

export default function LandingPage() {
  return (
    <div className="cap vitrine min-h-screen">
      {/* À l'arrivée, l'écran est sous les nuages, qui s'écartent. */}
      <OuvertureDuCiel />
      <CloudLayer />
      <LandingNav />
      <Tour><PageCourse stops={STOPS} /></Tour>
      <main>
        <Hero />
        <Tour><ChiffresCles /></Tour>
        <Tour><ProblemSection /></Tour>
        <Tour><HowItWorks /></Tour>
        {/* Une seule traversée au milieu de la page, et une avant la fin :
            cinq couches de nuages faisaient de la page une longue attente
            entre deux contenus. */}
        <Tour><Traversee hauteur={380} /></Tour>
        <Tour><DemoSection /></Tour>
        <Tour><PaperTradingSection /></Tour>
        <Tour><PersonalisationSection /></Tour>
        <Tour><LearnSection /></Tour>
        <Tour><FaqSection /></Tour>
        <Tour><Traversee hauteur={340} /></Tour>
        <Tour><ClosingSection /></Tour>
      </main>
      <Tour><LandingFooter /></Tour>
    </div>
  );
}
