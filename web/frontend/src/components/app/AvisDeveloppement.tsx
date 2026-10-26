"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { lancerVisite } from "@/lib/visite";
import { motion } from "framer-motion";
import { Button, EASE, Nimbo, useMouvementReduit } from "@/components/design-system";

const CLE = "tdb_avis_dev_ferme";
const SEANCE = "tdb_avis_dev_seance";
/** Au-delà, le compte n'est plus nouveau : l'avis ne s'affiche plus. */
const JOURS = 2;

/**
 * L'avis d'arrivée : le site est en développement, et voici où écrire.
 *
 * Un souci gardé pour soi, c'est un inscrit qui repart sans rien dire. L'avis
 * le dit d'emblée, et montre le chemin en trois temps, Communauté, Mes
 * demandes, le message ; « Me montrer » le parcourt sur les vrais écrans,
 * avec la visite guidée.
 *
 * IL NE S'AFFICHE QU'UNE FOIS, à l'arrivée sur l'accueil juste après
 * l'inscription. Il revenait à chaque visite pendant trente jours tant qu'on
 * ne le fermait pas : un avis répété devient du bruit qu'on ne lit plus. Il
 * est donc noté comme vu dès sa première apparition : il reste le temps de
 * la séance, puis ne revient plus.
 */
export function AvisDeveloppement() {
  const { user } = useAuth();
  const [ferme, setFerme] = useState(true);
  const reduit = useMouvementReduit();

  // Par compte, comme la présentation de Nimbo : une clé commune au
  // navigateur cachait l'avis à tout compte créé après un premier.
  const cle = `${CLE}_${user?.id ?? "anonyme"}`;
  const seanceCle = `${SEANCE}_${user?.id ?? "anonyme"}`;

  useEffect(() => {
    if (!user) return;
    // Vu une fois : noté aussitôt pour les visites suivantes, mais gardé pour
    // la séance en cours (un aller-retour pendant la visite guidée ne le
    // fait pas disparaître avant qu'on l'ait lu).
    try {
      const vu = localStorage.getItem(cle) === "1";
      const seance = sessionStorage.getItem(seanceCle) === "1";
      if (!vu) { localStorage.setItem(cle, "1"); sessionStorage.setItem(seanceCle, "1"); }
      setFerme(vu && !seance);
    } catch { setFerme(false); }
  }, [user, cle, seanceCle]);

  if (!user || ferme) return null;
  const cree = user.created_at ? Date.parse(user.created_at) : NaN;
  if (Number.isFinite(cree) && Date.now() - cree > JOURS * 86_400_000) return null;

  const fermer = () => {
    setFerme(true);
    try { localStorage.setItem(cle, "1"); sessionStorage.removeItem(seanceCle); } catch { /* navigation privée */ }
  };

  const etapes = ["Communauté", "Mes demandes", "Votre message"];

  return (
    <motion.section
      initial={reduit ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
      aria-labelledby="avis-dev-titre"
      className="relative z-10 rounded-[16px] px-5 py-5 sm:px-6"
      style={{ backgroundColor: "var(--cap-surface)", boxShadow: "inset 3px 0 0 var(--cap-ambre), inset 0 0 0 1px var(--cap-line)" }}
    >
      <button type="button" onClick={fermer} aria-label="Masquer cet avis"
        className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[color:var(--cap-surface-2)]"
        style={{ color: "var(--cap-ink-3)" }}>
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-4 pr-8">
        <Nimbo humeur="reflechit" taille={56} label="" className="hidden flex-none sm:inline-flex" />
        <div className="min-w-0">
          <h2 id="avis-dev-titre" className="text-[1.15rem] font-semibold leading-snug"
            style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
            Le site est en développement.
          </h2>
          <p className="mt-1.5 max-w-[40rem] text-[0.93rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>
            Si vous rencontrez une difficulté, un problème, ou si une idée vous vient, merci de contacter le
            support : chaque message est lu, et la réponse arrive dans Mes demandes.
          </p>
          <ol className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1">
            {etapes.map((e, i) => (
              <li key={e} className="flex items-baseline gap-1.5 text-[0.88rem]" style={{ color: "var(--cap-ink)" }}>
                <span className="italic" style={{ color: "var(--cap-amber-ink)", fontFamily: "var(--cap-font-display)" }}>{i + 1}</span>
                {e}
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Button size="md" onClick={() => lancerVisite("support")}>Me montrer comment</Button>
            <Link href="/support?nouveau=1" className="cap-lien text-[0.9rem]">Écrire au support</Link>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
