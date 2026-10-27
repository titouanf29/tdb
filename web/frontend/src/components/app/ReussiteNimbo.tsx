"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { DUR, EASE, Nimbo, useAnimationsEnabled } from "@/components/design-system";
import { EVENEMENT_REUSSITE, brancherHote, type Reussite } from "@/lib/reussite";

const DUREE_MS = 6000;
const MAX_VISIBLES = 3;

/**
 * Nimbo vient féliciter : une carte en bas de l'écran, au-dessus de la barre
 * d'onglets sur téléphone, qui survit à la navigation (une position ouverte
 * redirige vers le portefeuille juste après). Elle part seule au bout de six
 * secondes — sauf pendant qu'on la survole ou qu'elle a le focus — et se ferme
 * d'un clic.
 */
export function ReussiteNimbo() {
  const [items, setItems] = useState<(Reussite & { id: number })[]>([]);
  const suivant = useRef(0);
  const [anim] = useAnimationsEnabled();

  const retirer = useCallback((id: number) => {
    setItems((l) => l.filter((i) => i.id !== id));
  }, []);

  useEffect(() => {
    const surReussite = (e: Event) => {
      const r = (e as CustomEvent<Reussite>).detail;
      if (!r?.titre) return;
      const id = ++suivant.current;
      setItems((l) => [...l, { ...r, id }].slice(-MAX_VISIBLES));
    };
    window.addEventListener(EVENEMENT_REUSSITE, surReussite);
    const debrancher = brancherHote();
    return () => {
      window.removeEventListener(EVENEMENT_REUSSITE, surReussite);
      debrancher();
    };
  }, []);

  return (
    <div
      aria-live="polite"
      // SUR TÉLÉPHONE, JUSTE AU-DESSUS DE LA BARRE DU BAS, à gauche du bouton
      // de Nimbo : au milieu de l'écran, la carte cachait le verdict qu'on
      // était en train de lire. Sur ordinateur, au-dessus du bouton, dans le
      // coin.
      className="pointer-events-none fixed inset-x-0 bottom-[calc(4.6rem+env(safe-area-inset-bottom,0px))] z-50 flex flex-col items-start gap-3 pl-3 pr-[5.25rem] sm:inset-x-auto sm:right-6 sm:items-end sm:px-0 lg:bottom-24"
    >
      <AnimatePresence initial={false}>
        {/* Sur téléphone, une seule carte à la fois — la plus récente : trois
            empilées couvraient la moitié de l'écran et le bouton en dessous.
            Les précédentes attendent leur tour, masquées. */}
        {items.map((r, i) => (
          <Carte key={r.id} r={r} anim={anim} masqueMobile={i < items.length - 1} onFermer={() => retirer(r.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Carte({
  r, anim, masqueMobile, onFermer,
}: { r: Reussite; anim: boolean; masqueMobile: boolean; onFermer: () => void }) {
  const [enPause, setEnPause] = useState(false);

  useEffect(() => {
    // Masquée (téléphone, pas encore son tour) : son délai n'a pas commencé.
    if (enPause || (masqueMobile && window.matchMedia("(max-width: 639px)").matches)) return;
    const t = window.setTimeout(onFermer, DUREE_MS);
    return () => window.clearTimeout(t);
  }, [enPause, masqueMobile, onFermer]);

  return (
    <motion.div
      layout={anim}
      initial={anim ? { opacity: 0, y: 24, scale: 0.96 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={anim ? { opacity: 0, y: 12, transition: { duration: DUR.quick } } : { opacity: 0, transition: { duration: 0 } }}
      transition={{ duration: DUR.base, ease: EASE }}
      onMouseEnter={() => setEnPause(true)}
      onMouseLeave={() => setEnPause(false)}
      onFocus={() => setEnPause(true)}
      onBlur={() => setEnPause(false)}
      className={`pointer-events-auto w-full ${masqueMobile ? "hidden sm:flex" : "flex"} max-w-[24rem] items-center gap-2.5 rounded-[var(--cap-r-lg)] border py-1.5 pl-2 pr-1 sm:gap-3 sm:py-2.5 sm:pr-1.5`}
      style={{
        backgroundColor: "var(--cap-surface)",
        borderColor: "var(--cap-line)",
        boxShadow: "var(--cap-shadow-lg)",
        color: "var(--cap-ink)",
      }}
      role="status"
    >
      {/* Plus petit sur téléphone : la carte tient sur deux lignes. */}
      <Nimbo humeur="fete" taille={40} className="sm:hidden" />
      <Nimbo humeur="fete" taille={56} className="hidden sm:inline-flex" />
      <div className="min-w-0 flex-1">
        <p className="text-[0.95rem] font-semibold leading-snug">{r.titre}</p>
        {r.detail && (
          <p className="mt-0.5 text-[0.85rem] leading-snug" style={{ color: "var(--cap-ink-2)" }}>
            {r.detail}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onFermer}
        aria-label="Fermer le message"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[color:var(--cap-surface-2)]"
        style={{ color: "var(--cap-ink-3)" }}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </motion.div>
  );
}
