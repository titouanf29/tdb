import type { Metadata } from "next";
import "@/components/landing/vitrine.css";
import "@/components/landing/accueil/accueil.css";
import "@/components/landing/accueil/serieux.css";

import { CloudLayer } from "@/components/design-system";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { Mouvements } from "@/components/landing/accueil/Mouvements";
import {
  Accroche, CaVousParle, DernierMot, QuiEstDerriere, Questions, TroisGestes,
} from "@/components/landing/accueil/Sections";
import { BandeauCours, Bordereau, MesurePasPromis } from "@/components/landing/accueil/Serieux";

/**
 * ESSAI : un accueil plus sérieux, sans toucher aux nuages.
 *
 * Trois propositions, montrées ensemble dans la vraie page pour être jugées
 * en situation :
 *   A. le bandeau des cours réels, juste sous le ciel ;
 *   B. la carte du haut présentée comme un bordereau d'ordre de bourse ;
 *   C. « Mesuré, pas promis » : trois chiffres sourcés, dont celui de l'AMF.
 * Page hors menu, non référencée : /essais/accueil.
 */
export const metadata: Metadata = { title: "Essai : un accueil plus sérieux", robots: { index: false, follow: false } };

function Repere({ lettre, texte }: Readonly<{ lettre: string; texte: string }>) {
  return (
    <div className="ess-repere" role="note">
      <span>{lettre}</span>
      <p>{texte}</p>
    </div>
  );
}

export default function EssaiAccueil() {
  return (
    <div className="cap vitrine accueil min-h-screen">
      <style>{`.ess-repere{position:relative;z-index:5;display:flex;align-items:center;gap:.8rem;margin:0 auto;padding:.7rem 1.25rem;background:#FFF6E0;border-top:2px solid #E5A83A;border-bottom:2px solid #E5A83A;color:#0B1726;font-size:.95rem}
.ess-repere span{display:grid;flex:none;width:2rem;height:2rem;place-items:center;border-radius:50%;background:#0B1726;color:#E5A83A;font-weight:800}
.ess-repere p{margin:0;font-weight:600}`}</style>
      <CloudLayer />
      <LandingNav />
      <main>
        <div style={{ height: "4.5rem" }} />
        <Repere lettre="B" texte="Proposition B : la carte du haut devient un bordereau d'ordre de bourse, avec son numéro et son tampon « Argent fictif »." />
        <Accroche carte={<Bordereau />} />
        <Repere lettre="A" texte="Proposition A : les vrais cours défilent sous le ciel, comme la bande d'un journal financier." />
        <BandeauCours />
        <CaVousParle />
        <TroisGestes />
        <Repere lettre="C" texte="Proposition C : « Mesuré, pas promis », trois chiffres sourcés avant de parler de nous." />
        <MesurePasPromis />
        <QuiEstDerriere />
        <Questions />
        <DernierMot />
      </main>
      <LandingFooter />
      <Mouvements />
    </div>
  );
}
