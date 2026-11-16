"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button, Heading, Nimbo, Text } from "@/components/design-system";

/**
 * Page introuvable.
 *
 * Nimbo, surpris, à la place du grand « 404 » lumineux qui datait d'avant la
 * refonte. Trois sorties utiles plutôt qu'une impasse, et le retour en
 * arrière pour qui s'est trompé de lien. Les sorties dépendent de la personne :
 * un visiteur sans compte repart vers l'accueil et les pages publiques, pas
 * vers un espace qui lui demanderait de se connecter.
 */
/** Un jeton en mémoire locale : la personne a un espace où repartir. */
function sessionOuverte(): boolean {
  try {
    return !!localStorage.getItem("tdb_token");
  } catch {
    // Stockage indisponible (navigation privée, réglages stricts) : on repart vers l'accueil public.
    return false;
  }
}

export default function NotFound() {
  const [connecte, setConnecte] = useState(false);

  // La marque que lit le cadre de l'application pour ne pas rediriger vers la
  // connexion ; posée avant les effets du cadre (les effets des enfants tournent
  // en premier), retirée en quittant la page.
  useEffect(() => {
    document.documentElement.setAttribute("data-introuvable", "1");
    setConnecte(sessionOuverte());
    return () => { document.documentElement.removeAttribute("data-introuvable"); };
  }, []);

  return (
    // Plein écran : une adresse inconnue ne figure pas dans les routes de la
    // nouvelle application, et AppLayout l'enveloppait dans l'ancienne mise
    // en page (barre latérale d'avant la refonte). La page s'affiche donc
    // par-dessus, avec ses propres sorties.
    <div className="cap fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-y-auto px-5 text-center"
      style={{ backgroundColor: "var(--cap-bg)", color: "var(--cap-ink)" }}>
      <Nimbo humeur="surpris" taille={150} label="Nimbo, surpris" />
      <p className="cap-num mt-4 text-[0.8rem] tracking-[0.14em]" style={{ color: "var(--cap-ink-3)" }}>
        ERREUR 404
      </p>
      <Heading level={1} className="mt-2">Cette page n&apos;existe pas.</Heading>
      <Text className="mx-auto mt-3 max-w-[26rem]">
        Le lien est peut-être ancien, ou la page a changé d&apos;adresse. Nimbo ne la trouve pas
        non plus, voici par où repartir.
      </Text>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {connecte ? (
          <>
            <Button href="/dashboard">Mon espace</Button>
            <Button href="/analysis" variant="secondary">Analyser un actif</Button>
            <Button href="/markets" variant="secondary">Les marchés</Button>
          </>
        ) : (
          <>
            <Button href="/">L&apos;accueil</Button>
            <Button href="/cours" variant="secondary">Les leçons</Button>
            <Button href="/actifs" variant="secondary">Analyses du jour</Button>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={() => window.history.back()}
        className="mt-6 inline-flex min-h-[44px] items-center gap-2 px-2 text-[0.85rem] transition-colors hover:text-[color:var(--cap-ink)]"
        style={{ color: "var(--cap-ink-3)" }}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Revenir à la page précédente
      </button>
    </div>
  );
}
