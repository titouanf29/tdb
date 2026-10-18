"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { useAnimationsEnabled, useMouvementReduit } from "@/components/design-system";

/**
 * Les petits éléments communs aux outils du chapitre « Lire un graphique » :
 * le bouton principal (encre, point ambre), le bouton discret, un sélecteur à
 * trait ambre, un curseur étiqueté, et la largeur d'un conteneur pour les
 * dessins en SVG.
 */

export function BoutonLire({ children, onClick, disabled, type = "button" }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; type?: "button" | "submit";
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className="inline-flex min-h-11 items-center gap-2 rounded-[10px] px-4 text-[0.95rem] font-semibold disabled:opacity-40"
      style={{ backgroundColor: "var(--cap-ink)", color: "var(--cap-on-inverse)" }}>
      <span aria-hidden className="h-1.5 w-1.5 flex-none rounded-full" style={{ backgroundColor: "var(--cap-ambre)" }} />
      {children}
    </button>
  );
}

/** Le bouton secondaire : un lien souligné, pas une boîte. */
export function LienLire({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="cap-lien inline-flex min-h-11 items-center px-1 text-[0.95rem] disabled:opacity-40">
      {children}
    </button>
  );
}

export function RecommencerLire({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Recommencer"
      className="flex h-11 w-11 flex-none items-center justify-center rounded-full transition-colors hover:bg-[color:var(--cap-surface-2)]"
      style={{ color: "var(--cap-ink-2)" }}>
      <RotateCcw size={17} />
    </button>
  );
}

/**
 * Un choix parmi quelques options, comme les onglets du site : le choisi est
 * souligné d'un trait ambre. `etat` colore une option après correction.
 */
export function ChoixLire<T extends string | number>({ options, valeur, onChange, label, etat, desactive }: {
  options: { v: T; texte: string }[];
  valeur: T | null;
  onChange: (v: T) => void;
  label: string;
  etat?: (v: T) => "juste" | "faux" | null;
  desactive?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-x-1 gap-y-1">
      {options.map((o) => {
        const choisi = valeur === o.v;
        const e = etat?.(o.v) ?? null;
        const couleur = e === "juste" ? "var(--cap-up)" : e === "faux" ? "var(--cap-down)" : choisi ? "var(--cap-ink)" : "var(--cap-ink-2)";
        return (
          <button key={String(o.v)} type="button" role="radio" aria-checked={choisi} disabled={desactive}
            onClick={() => onChange(o.v)}
            className="relative min-h-11 rounded-[8px] px-3 text-[0.95rem] transition-colors hover:bg-[color:var(--cap-surface-2)] disabled:cursor-default disabled:hover:bg-transparent"
            style={{ color: couleur, fontWeight: choisi || e ? 650 : 500 }}>
            {o.texte}
            <span aria-hidden className="absolute bottom-1 left-3 right-3 h-[2px] rounded-full transition-opacity"
              style={{ backgroundColor: e === "juste" ? "var(--cap-up)" : e === "faux" ? "var(--cap-down)" : "var(--cap-ambre)", opacity: choisi || e ? 1 : 0 }} />
          </button>
        );
      })}
    </div>
  );
}

/** Un curseur avec son étiquette et sa valeur écrite. */
export function CurseurLire({ label, valeur, min, max, pas = 1, onChange, ecrire, couleur }: {
  label: string; valeur: number; min: number; max: number; pas?: number;
  onChange: (v: number) => void; ecrire?: (v: number) => string; couleur?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3 text-[0.92rem]" style={{ color: "var(--cap-ink-2)" }}>
        <span>{label}</span>
        <b className="tabular-nums" style={{ color: couleur ?? "var(--cap-ink)" }}>{ecrire ? ecrire(valeur) : valeur}</b>
      </span>
      <input type="range" min={min} max={max} step={pas} value={valeur}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-11 w-full cursor-pointer"
        style={{ accentColor: "var(--cap-ink)" }} />
    </label>
  );
}

/** Le texte de retour d'un exercice, lu par les lecteurs d'écran. */
export function RetourLire({ children, ton }: { children: ReactNode; ton?: "juste" | "faux" | null }) {
  return (
    <p aria-live="polite" className="min-w-[min(100%,18rem)] flex-1 text-[0.98rem] leading-snug"
      style={{ color: ton === "juste" ? "var(--cap-up)" : ton === "faux" ? "var(--cap-down)" : "var(--cap-ink-2)" }}>
      {children}
    </p>
  );
}

/** La largeur d'un conteneur, pour dessiner un SVG à la bonne taille. */
export function useLargeurLire(init = 560) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(init);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export const VERT = "var(--cap-up)";
export const ROUGE = "var(--cap-down)";

/** Vrai si l'on peut animer : ni « réduire les animations », ni animations coupées sur le site. */
export function useAnimLire() {
  const reduit = useMouvementReduit();
  const [on] = useAnimationsEnabled();
  return on && !reduit;
}

/** Un bloc qui entre en fondu quand sa clé change (une réponse, un nom de bougie). */
export function FonduLire({ cle, children, className }: { cle: string | number; children: ReactNode; className?: string }) {
  const anim = useAnimLire();
  if (!anim) return <div className={className}>{children}</div>;
  return (
    <motion.div key={cle} className={className} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}
