import "@/components/landing/vitrine.css";
import "@/components/landing/accueil/accueil.css";

import { CloudLayer } from "@/components/design-system";
import { OuvertureDuCiel } from "@/components/landing/effets";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { Mouvements } from "@/components/landing/accueil/Mouvements";
import {
  Accroche, BarreAction, CaVousParle, DernierMot, QuiEstDerriere, Questions, TroisGestes,
} from "@/components/landing/accueil/Sections";

/**
 * La page de présentation.
 *
 * REFAITE SUR LE PLAN DE L'ACCUEIL DE CLAIR (l'autre site de l'auteur) : une
 * question en titre et la réponse calculée sous les yeux, le problème en trois
 * moments, trois gestes montrés avec de vraies captures, ce que le site ne
 * prend pas, les questions, le dernier mot. Neuf sections et quinze écrans de
 * téléphone avant : deux visiteurs ont décroché vers le septième.
 *
 * Le ciel reste : il ouvre la page et se voit derrière le haut ; ensuite, les
 * sections sont des fonds pleins. Le détail des sections est dans
 * components/landing/accueil/.
 */
export default function LandingPage() {
  return (
    <div className="cap vitrine accueil min-h-screen">
      {/* À l'arrivée, l'écran est sous les nuages, qui s'écartent. */}
      <OuvertureDuCiel />
      <CloudLayer />
      <LandingNav />
      <main>
        <Accroche />
        <CaVousParle />
        <TroisGestes />
        <QuiEstDerriere />
        <Questions />
        <DernierMot />
      </main>
      <LandingFooter />
      <BarreAction />
      <Mouvements />
    </div>
  );
}
