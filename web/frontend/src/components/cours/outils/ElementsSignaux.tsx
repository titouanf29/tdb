"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { useAnimationsEnabled, useMouvementReduit } from "@/components/design-system";

/**
 * Les petites pièces communes aux outils du groupe « signaux » (Bollinger,
 * Fibonacci, cassure, pullback, pin bar, volume) : boutons, curseur, choix,
 * texte de retour. Tout est à la taille du doigt (44 px) et suit la charte.
 */

/** Le bouton principal : encre, point ambre à gauche. */
export function BoutonSignal({ children, onClick, disabled, type = "button" }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; type?: "button" | "submit";
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className="inline-flex h-11 items-center gap-2 rounded-[10px] px-4 text-[0.95rem] font-semibold disabled:opacity-40"
      style={{ backgroundColor: "var(--cap-ink)", color: "var(--cap-on-inverse)" }}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--cap-ambre)" }} />
      {children}
    </button>
  );
}

/** Le bouton secondaire : un lien souligné, pas une boîte. */
export function LienSignal({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="cap-lien inline-flex h-11 items-center px-1 text-[0.95rem] disabled:opacity-40">
      {children}
    </button>
  );
}

/** Recommencer : une icône ronde, discrète. */
export function RecommencerSignal({ onClick, label = "Recommencer" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className="flex h-11 w-11 flex-none items-center justify-center rounded-full transition-colors hover:bg-[color:var(--cap-surface-2)]"
      style={{ color: "var(--cap-ink-2)" }}>
      <RotateCcw size={17} />
    </button>
  );
}

/** Un curseur, son étiquette et sa valeur écrite. */
export function CurseurSignal({ label, valeur, min, max, pas = 1, onChange, ecrire, couleur, aide }: {
  label: string; valeur: number; min: number; max: number; pas?: number;
  onChange: (v: number) => void; ecrire?: (v: number) => string; couleur?: string; aide?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="flex items-baseline justify-between gap-3 text-[0.94rem]" style={{ color: "var(--cap-ink-2)" }}>
        <span>{label}</span>
        <b className="tabular-nums" style={{ color: couleur ?? "var(--cap-ink)" }}>{ecrire ? ecrire(valeur) : valeur}</b>
      </span>
      <input type="range" min={min} max={max} step={pas} value={valeur}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-11 w-full cursor-pointer"
        style={{ accentColor: "var(--cap-ink)" }} />
      {aide && <span className="block text-[0.85rem]" style={{ color: "var(--cap-ink-3)" }}>{aide}</span>}
    </label>
  );
}

/**
 * Un choix entre quelques options : l'option choisie est soulignée d'ambre
 * (ou de vert / rouge une fois corrigée).
 */
export function ChoixSignal({ options, valeur, onChange, etat, label, disabled }: {
  options: string[]; valeur: number | null; onChange: (k: number) => void;
  /** Après correction : la bonne réponse en vert, la mauvaise choisie en rouge. */
  etat?: (k: number) => "juste" | "faux" | null;
  label: string; disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-x-1 gap-y-1">
      {options.map((o, k) => {
        const choisi = valeur === k;
        const e = etat?.(k) ?? null;
        const trait = e === "juste" ? "var(--cap-up)" : e === "faux" ? "var(--cap-down)" : "var(--cap-ambre)";
        return (
          <button key={o} type="button" role="radio" aria-checked={choisi} disabled={disabled}
            onClick={() => onChange(k)}
            className="relative min-h-11 rounded-[8px] px-3 py-2 text-left text-[0.97rem] transition-colors hover:bg-[color:var(--cap-surface-2)] disabled:cursor-default disabled:hover:bg-transparent"
            style={{ color: choisi || e ? "var(--cap-ink)" : "var(--cap-ink-2)", fontWeight: choisi || e === "juste" ? 600 : 400 }}>
            {o}
            <span aria-hidden className="absolute bottom-1 left-3 right-3 h-[2px] rounded-full transition-opacity"
              style={{ backgroundColor: trait, opacity: choisi || e ? 1 : 0 }} />
          </button>
        );
      })}
    </div>
  );
}

/** Le texte de retour d'un exercice, annoncé aux lecteurs d'écran. */
export function RetourSignal({ children, ton, className = "" }: { children: ReactNode; ton?: "juste" | "faux" | null; className?: string }) {
  return (
    <p aria-live="polite" className={`min-w-0 text-[0.98rem] leading-relaxed ${className}`}
      style={{ color: "var(--cap-ink-2)" }}>
      {ton && (
        <b className="mr-1.5" style={{ color: ton === "juste" ? "var(--cap-up)" : "var(--cap-down)" }}>
          {ton === "juste" ? "Juste." : "Pas tout à fait."}
        </b>
      )}
      {children}
    </p>
  );
}

/** Une ligne « intitulé : valeur » dans un relevé de chiffres. */
export function ChiffreSignal({ label, valeur, couleur, fort }: { label: string; valeur: ReactNode; couleur?: string; fort?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-1.5 text-[0.95rem]" style={{ borderColor: "var(--cap-line)" }}>
      <span style={{ color: "var(--cap-ink-2)" }}>{label}</span>
      <b className="flex-none whitespace-nowrap tabular-nums" style={{ color: couleur ?? "var(--cap-ink)", fontSize: fort ? "1.05rem" : undefined }}>{valeur}</b>
    </div>
  );
}

/** La largeur d'un conteneur, pour dessiner un SVG à la bonne taille. */
export function useLargeurSignal(init = 560) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(init);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

/** Écrire un nombre à la française, avec un nombre de décimales fixe. */
export function nf(x: number, d = 0): string {
  return x.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
}

/** Vrai quand rien ne doit bouger : l'appareil demande moins d'animations, ou le site les a coupées. */
export function useCalmeSignal(): boolean {
  const reduit = useMouvementReduit();
  const [animOn] = useAnimationsEnabled();
  return reduit || !animOn;
}
