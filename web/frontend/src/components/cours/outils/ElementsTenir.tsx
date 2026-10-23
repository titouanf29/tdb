"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAnimationsEnabled, useMouvementReduit } from "@/components/design-system";

/**
 * Les petites pièces communes aux outils du groupe « tenir » (leçons 10, 11,
 * 26 et 27) : le bouton principal, le lien discret, une option à choisir, une
 * phrase de résultat lue par les lecteurs d'écran, et la largeur d'un dessin.
 */

/** Le bouton principal du site : encre, point ambre à gauche. */
export function BoutonTenir({ children, onClick, disabled, type = "button", label }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; type?: "button" | "submit"; label?: string;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} aria-label={label}
      className="inline-flex min-h-11 items-center gap-2 rounded-[10px] px-4 py-2 text-left text-[0.95rem] font-semibold disabled:opacity-40"
      style={{ backgroundColor: "var(--cap-ink)", color: "var(--cap-on-inverse)" }}>
      <span aria-hidden className="h-1.5 w-1.5 flex-none rounded-full" style={{ backgroundColor: "var(--cap-ambre)" }} />
      {children}
    </button>
  );
}

/** L'action secondaire : un lien souligné, sans boîte. */
export function LienTenir({ children, onClick, disabled, label }: { children: ReactNode; onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label}
      className="cap-lien inline-flex min-h-11 items-center px-1 text-[0.95rem] disabled:opacity-40">
      {children}
    </button>
  );
}

export type EtatChoix = "neutre" | "choisi" | "juste" | "faux" | "manque";

/** Une réponse possible. Après correction : juste en vert, faux en rouge. */
export function ChoixTenir({ children, etat = "neutre", onClick, disabled, presse }: {
  children: ReactNode; etat?: EtatChoix; onClick?: () => void; disabled?: boolean; presse?: boolean;
}) {
  const bord = etat === "juste" ? "var(--cap-up)" : etat === "faux" ? "var(--cap-down)" : etat === "choisi" ? "var(--cap-ink)" : etat === "manque" ? "var(--cap-up)" : "var(--cap-line-strong)";
  const fond = etat === "juste" ? "var(--cap-up-fill)" : etat === "faux" ? "var(--cap-down-fill)" : null;
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={presse}
      className="relative min-h-11 w-full rounded-[10px] px-4 py-2.5 text-left text-[0.97rem] leading-snug transition-colors disabled:cursor-default"
      style={{
        color: "var(--cap-ink)",
        backgroundColor: fond ? `color-mix(in srgb, ${fond} 12%, var(--cap-surface))` : etat === "choisi" ? "var(--cap-surface-2)" : "var(--cap-surface)",
        boxShadow: etat === "manque" ? undefined : `inset 0 0 0 ${etat === "neutre" ? 1 : 2}px ${bord}`,
        outlineStyle: etat === "manque" ? "dashed" : undefined,
        outlineWidth: etat === "manque" ? 2 : undefined,
        outlineColor: etat === "manque" ? bord : undefined,
        outlineOffset: etat === "manque" ? "-2px" : undefined,
      }}>
      {children}
    </button>
  );
}

/** La phrase qui dit le résultat, annoncée aux lecteurs d'écran. */
export function ResultatTenir({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div aria-live="polite" className={`text-[0.98rem] leading-relaxed ${className}`} style={{ color: "var(--cap-ink-2)" }}>
      {children}
    </div>
  );
}

/** Un grand chiffre, dans la serif des titres. */
export function ChiffreTenir({ valeur, legende, couleur }: { valeur: string; legende: string; couleur?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[1.5rem] font-medium leading-none tabular-nums" style={{ fontFamily: "var(--cap-font-display)", color: couleur ?? "var(--cap-ink)" }}>{valeur}</p>
      <p className="mt-1 text-[0.85rem]" style={{ color: "var(--cap-ink-3)" }}>{legende}</p>
    </div>
  );
}

/** La largeur d'une boîte, pour dessiner un SVG à la bonne taille. */
export function useLargeur(defaut = 640) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(defaut);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Un montant en dollars, à la française, avec son signe : « +20 $ », « −30 $ ». */
export function dollars(x: number, signe = true, dec = 0): string {
  const v = Math.abs(x).toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  if (!signe) return `${x < 0 ? "−" : ""}${v} $`;
  return `${x > 0 ? "+" : x < 0 ? "−" : ""}${v} $`;
}

/** Un nombre à la française. */
export function nombre(x: number, dec = 0): string {
  return x.toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

/** Vrai si l'on peut animer : ni « réduire les animations » sur l'appareil, ni animations coupées sur le site. */
export function useAnimeTenir(): boolean {
  const reduit = useMouvementReduit();
  const [actives] = useAnimationsEnabled();
  return !reduit && actives;
}
