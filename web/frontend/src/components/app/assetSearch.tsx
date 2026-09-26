"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { marketAPI, type AssetHit } from "@/lib/api";
import { DUR, EASE } from "@/components/design-system";

/**
 * La recherche d'actif, une seule fois.
 *
 * Elle existait en deux exemplaires, et les deux avaient le même défaut :
 * prendre le texte tapé, le passer en majuscules, et le traiter comme un
 * symbole. L'en-tête a été corrigé ; l'écran d'analyse gardait sa copie, et
 * comme le champ de l'en-tête est masqué sous 640 px, c'était la SEULE
 * recherche disponible sur téléphone. Le correctif ne tenait donc que sur
 * grand écran.
 *
 * D'où cette extraction. Deux présentations — un champ d'en-tête étroit, un
 * champ large avec son bouton — mais un seul comportement : la même liste de
 * propositions, les mêmes flèches, le même Entrée qui ouvre la proposition
 * plutôt que le texte brut.
 */

export function useAssetSuggestions(valeur: string) {
  const [hits, setHits] = useState<AssetHit[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(0);
  const [cherche, setCherche] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Le numéro de la requête en cours : une réponse lente pour « ap » ne doit
  // pas écraser une réponse rapide pour « apple ».
  const seq = useRef(0);
  /* LA VALEUR D'ARRIVÉE NE DÉCLENCHE RIEN. L'écran d'analyse préremplit son
     champ avec le symbole de l'URL : ouvrir /analysis?symbol=AAPL faisait
     donc chercher « AAPL » et dérouler la liste par-dessus la page, alors
     que personne n'avait rien tapé. Une suggestion répond à une frappe.

     Un drapeau qui se lève au premier changement, et non une comparaison à
     la valeur initiale : sinon retaper plus tard ce même symbole resterait
     muet, ce qui serait un second défaut pour en corriger un premier. */
  const initiale = useRef(valeur);
  const touche_clavier = useRef(false);
  /* Une valeur posée par l'écran (un actif choisi, l'actif de l'URL) n'est pas
     une frappe non plus : la liste ne doit pas se rouvrir 220 ms après qu'on
     a choisi. `poser` la marque pour que l'effet la laisse passer en silence. */
  const posee = useRef<string | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = valeur.trim();
    if (posee.current !== null && q === posee.current.trim()) {
      posee.current = null;
      setHits([]); setOuvert(false); setCherche(false);
      return;
    }
    posee.current = null;
    if (!touche_clavier.current) {
      if (q === initiale.current.trim()) return;
      touche_clavier.current = true;
    }
    if (q.length < 2) { setHits([]); setCherche(false); return; }
    setCherche(true);
    // 220 ms : assez pour ne pas appeler à chaque lettre, assez peu pour que
    // la liste paraisse suivre la frappe.
    timer.current = setTimeout(async () => {
      const n = ++seq.current;
      try {
        const r = await marketAPI.searchAssets(q);
        if (n === seq.current) { setHits(r.results.slice(0, 7)); setActif(0); setOuvert(true); }
      } catch {
        if (n === seq.current) setHits([]);
      } finally {
        if (n === seq.current) setCherche(false);
      }
    }, 220);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [valeur]);

  const touche = useCallback((e: React.KeyboardEvent) => {
    if (!ouvert || !hits.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActif((i) => (i + 1) % hits.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActif((i) => (i - 1 + hits.length) % hits.length); }
    else if (e.key === "Escape") { setOuvert(false); }
  }, [ouvert, hits.length]);

  /** La proposition que Entrée doit ouvrir, ou null s'il n'y en a aucune. */
  const choisi = hits.length ? (hits[actif] ?? hits[0]) : null;

  return { hits, ouvert, setOuvert, actif, setActif, cherche, touche, choisi,
           vider: () => { setHits([]); setOuvert(false); },
           poser: (v: string) => { posee.current = v; setHits([]); setOuvert(false); } };
}

export function ListeSuggestions({
  hits,
  actif,
  cherche,
  onSurvol,
  onChoisir,
  className,
  style,
}: {
  hits: AssetHit[];
  actif: number;
  cherche: boolean;
  onSurvol: (i: number) => void;
  onChoisir: (symbole: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      role="listbox"
      className={className}
      style={{
        borderRadius: "var(--cap-r-lg)",
        backgroundColor: "var(--cap-surface)",
        boxShadow: "inset 0 0 0 1px var(--cap-line), var(--cap-shadow-lg)",
        ...style,
      }}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: DUR.quick, ease: EASE }}
    >
      {hits.length === 0 ? (
        <div className="px-3 py-2.5 text-[0.82rem]" style={{ color: "var(--cap-ink-3)" }}>
          {cherche ? "Recherche…" : "Aucun actif de ce nom dans le catalogue."}
        </div>
      ) : (
        hits.map((h, i) => (
          <button
            key={h.symbol}
            type="button"
            role="option"
            aria-selected={i === actif}
            onMouseEnter={() => onSurvol(i)}
            onClick={() => onChoisir(h.symbol)}
            className="flex w-full items-baseline gap-2.5 rounded-[9px] px-3 py-2 text-left transition-colors"
            style={{ backgroundColor: i === actif ? "var(--cap-surface-2)" : "transparent" }}
          >
            <span className="cap-num shrink-0 text-[0.78rem]" style={{ color: "var(--cap-ink-3)" }}>
              {h.symbol}
            </span>
            <span className="min-w-0 flex-1 truncate text-[0.88rem]" style={{ color: "var(--cap-ink)" }}>
              {h.name}
            </span>
            {/* Quand la correspondance vient d'un rattrapage de faute, on le
                signale : le lecteur doit savoir qu'on a interprété ce qu'il a
                tapé plutôt que de le prendre au mot. */}
            {h.score < 0.62 && (
              <span className="shrink-0 text-[0.7rem]" style={{ color: "var(--cap-ink-4)" }}>
                approchant
              </span>
            )}
          </button>
        ))
      )}
    </motion.div>
  );
}

/** Ferme un panneau quand on clique ailleurs. */
export function useFermetureExterieure(
  ref: React.RefObject<HTMLElement | null>,
  ouvert: boolean,
  fermer: () => void,
) {
  useEffect(() => {
    if (!ouvert) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) fermer();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [ouvert, fermer, ref]);
}
