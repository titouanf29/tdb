"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { fmt } from "@/lib/cours/marche";
import { useAnimationsEnabled, useMouvementReduit } from "@/components/design-system";

/** Vrai quand il ne faut pas animer : réglage de l'appareil, ou animations coupées sur le site. */
export function useCalme(): boolean {
  const reduit = useMouvementReduit();
  const [on] = useAnimationsEnabled();
  return reduit || !on;
}

/**
 * Les petites pièces communes aux outils des leçons sur le risque (7, 19 à
 * 22) : boutons, sélecteur, curseur, champ chiffré, lignes de résultat, et
 * l'écriture des montants à la française.
 */

// ── Les nombres ────────────────────────────────────────────────────────────

/** Un montant en dollars : « 20 $ », « 0,70 $ », « 1 808,76 $ ». */
export function usd(x: number, d?: number): string {
  const dd = d ?? (Math.abs(x - Math.round(x)) < 0.005 ? 0 : 2);
  return `${fmt(x, dd)} $`;
}

/** Un pourcentage : « 1 % », « 9,6 % ». */
export function pct(x: number, d?: number): string {
  const dd = d ?? (Math.abs(x - Math.round(x)) < 0.05 ? 0 : 1);
  return `${fmt(x, dd)} %`;
}

/** Une taille en lots : « 0,10 lot », « 1,00 lot ». */
export function lots(x: number): string {
  return `${fmt(x, 2)} lot`;
}

/** Un nombre simple, sans décimales inutiles : « 20 », « 0,5 », « 1,5 ». */
export function nb(x: number, max = 2): string {
  return x.toLocaleString("fr-FR", { maximumFractionDigits: max });
}

/** Arrondi vers le bas au centième de lot, sans se faire piéger par 0,1 × 100 = 9,9999. */
export function arrondiBas(x: number, pas = 0.01): number {
  return Math.floor(x / pas + 1e-9) * pas;
}

/** Lit « 0,12 » comme « 0.12 ». */
export function lireNombre(s: string): number | null {
  const t = s.replace(/\s/g, "").replace(",", ".");
  if (t === "" || t === "." || t === "-") return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}

// ── La largeur d'un dessin ─────────────────────────────────────────────────

/** La largeur réelle d'une boîte, pour dessiner un SVG à l'échelle 1 (textes lisibles sur téléphone). */
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
  return { ref, w };
}

// ── Les boutons ────────────────────────────────────────────────────────────

/** Le bouton principal du site : encre, point ambre à gauche. */
export function Bouton({ onClick, disabled, children, label }: {
  onClick: () => void; disabled?: boolean; children: ReactNode; label?: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label}
      className="inline-flex min-h-11 items-center gap-2 rounded-[10px] px-4 py-2 text-left text-[0.95rem] font-semibold transition-opacity disabled:opacity-40"
      style={{ backgroundColor: "var(--cap-ink)", color: "var(--cap-on-inverse)" }}>
      <span aria-hidden className="h-1.5 w-1.5 flex-none rounded-full" style={{ backgroundColor: "var(--cap-ambre)" }} />
      {children}
    </button>
  );
}

/** Le bouton secondaire : un lien souligné, pas une boîte. */
export function BoutonLien({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="cap-lien inline-flex min-h-11 items-center px-1 text-[0.95rem] disabled:opacity-40">
      {children}
    </button>
  );
}

// ── Le sélecteur : un trait ambre sous l'option choisie ────────────────────

export function Choix<T extends string | number>({ label, options, valeur, onChange }: {
  label: string;
  options: { v: T; texte: string }[];
  valeur: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-0.5 text-[0.88rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>{label}</p>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-x-1">
        {options.map((o) => {
          const choisi = o.v === valeur;
          return (
            <button key={String(o.v)} type="button" role="radio" aria-checked={choisi} onClick={() => onChange(o.v)}
              className="relative min-h-11 px-2.5 text-[0.95rem] transition-colors"
              style={{ color: choisi ? "var(--cap-ink)" : "var(--cap-ink-3)", fontWeight: choisi ? 650 : 500 }}>
              {o.texte}
              <span aria-hidden className="absolute inset-x-2 bottom-1.5 h-[2px] rounded-full transition-opacity"
                style={{ backgroundColor: "var(--cap-ambre)", opacity: choisi ? 1 : 0 }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Le curseur ─────────────────────────────────────────────────────────────

export function Curseur({ label, valeur, texte, min, max, pas, onChange, aide }: {
  label: string;
  valeur: number;
  /** La valeur écrite en clair, à droite du libellé. */
  texte: string;
  min: number; max: number; pas: number;
  onChange: (v: number) => void;
  aide?: ReactNode;
}) {
  return (
    <div className="py-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-[0.95rem] font-semibold" style={{ color: "var(--cap-ink)" }}>{label}</label>
        <span className="whitespace-nowrap text-[1.12rem] font-semibold tabular-nums" style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}>
          {texte}
        </span>
      </div>
      <input type="range" min={min} max={max} step={pas} value={valeur} aria-label={label} aria-valuetext={texte}
        onChange={(e) => onChange(Number(e.target.value))}
        className="block h-11 w-full cursor-pointer" style={{ accentColor: "var(--cap-ambre)" }} />
      {aide && <p className="text-[0.88rem] leading-snug" style={{ color: "var(--cap-ink-3)" }}>{aide}</p>}
    </div>
  );
}

// ── Le champ chiffré, écrit comme dans un carnet ───────────────────────────

export function ChampNombre({ label, valeur, onChange, suffixe, largeur = "6.5rem", id }: {
  label: string;
  valeur: string;
  onChange: (s: string) => void;
  suffixe?: string;
  largeur?: string;
  id: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <label htmlFor={id} className="text-[0.95rem] font-semibold" style={{ color: "var(--cap-ink)" }}>{label}</label>
      <span className="inline-flex items-baseline gap-1.5">
        <input id={id} type="text" inputMode="decimal" autoComplete="off" value={valeur} onChange={(e) => onChange(e.target.value)}
          className="cap-champ-ligne h-11 bg-transparent px-1 text-[1.1rem] font-semibold tabular-nums outline-none"
          style={{ width: largeur, color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }} />
        {suffixe && <span className="text-[0.95rem]" style={{ color: "var(--cap-ink-2)" }}>{suffixe}</span>}
      </span>
    </div>
  );
}

// ── Les lignes d'un résultat ───────────────────────────────────────────────

export function Lignes({ children }: { children: ReactNode }) {
  return <dl className="divide-y" style={{ borderColor: "var(--cap-line)" }}>{children}</dl>;
}

export function Ligne({ label, valeur, fort, couleur }: { label: ReactNode; valeur: ReactNode; fort?: boolean; couleur?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2" style={{ borderColor: "var(--cap-line)" }}>
      <dt className="min-w-0 text-[0.95rem]" style={{ color: "var(--cap-ink-2)" }}>{label}</dt>
      <dd className={`whitespace-nowrap text-right tabular-nums ${fort ? "text-[1.15rem] font-semibold" : "text-[0.98rem] font-medium"}`}
        style={{ color: couleur ?? "var(--cap-ink)", fontFamily: fort ? "var(--cap-font-display)" : undefined }}>{valeur}</dd>
    </div>
  );
}

/** Un chiffre mis en avant dans une phrase, surligné d'ambre. */
export function Chiffre({ children }: { children: ReactNode }) {
  return <span className="cap-chiffre">{children}</span>;
}

/** La phrase qui commente le résultat : lue à voix haute par les lecteurs d'écran. */
export function Verdict({ children, ton = "neutre" }: { children: ReactNode; ton?: "neutre" | "bien" | "mal" }) {
  const c = ton === "bien" ? "var(--cap-up)" : ton === "mal" ? "var(--cap-down)" : "var(--cap-line-strong)";
  return (
    <p aria-live="polite" className="mt-3 border-l-2 py-0.5 pl-3 text-[0.98rem] leading-relaxed" style={{ borderColor: c, color: "var(--cap-ink)" }}>
      {children}
    </p>
  );
}

/** Un petit intitulé en italique, comme les étiquettes du site. */
export function Etiquette({ children }: { children: ReactNode }) {
  return <p className="text-[0.9rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>{children}</p>;
}

// ── Le calcul de la taille (leçon 19) ──────────────────────────────────────

export type Instrument = "eurusd" | "or";

export const INSTRUMENTS: Record<Instrument, { nom: string; unite: string; unites: string; parLot: number; explication: string }> = {
  eurusd: { nom: "Euro-dollar", unite: "pip", unites: "pips", parLot: 10, explication: "Sur l'euro-dollar, un pip vaut 10 $ pour un lot." },
  or: { nom: "Or", unite: "dollar", unites: "dollars", parLot: 100, explication: "Sur l'or, un lot vaut 100 onces : 1 $ de mouvement vaut 100 $ pour un lot." },
};

/** Les trois étapes : le risque en argent, le stop, la valeur par lot ; puis la taille, arrondie vers le bas. */
export function calculTaille(inst: Instrument, capital: number, risquePct: number, stop: number) {
  const risque = (capital * risquePct) / 100;
  const parLot = stop * INSTRUMENTS[inst].parLot;
  const brute = parLot > 0 ? risque / parLot : 0;
  const taille = arrondiBas(brute);
  const reel = taille * parLot;
  return { risque, parLot, brute, taille, reel, reelPct: capital > 0 ? (reel / capital) * 100 : 0 };
}

/** Le stop écrit en clair : « 20 pips », « 10 $ ». */
export function ecrireStop(inst: Instrument, stop: number): string {
  return inst === "eurusd" ? `${nb(stop, 1)} pip${stop >= 2 ? "s" : ""}` : usd(stop);
}
