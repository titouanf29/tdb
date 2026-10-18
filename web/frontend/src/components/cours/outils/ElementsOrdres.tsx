"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { useAnimationsEnabled, useMouvementReduit } from "@/components/design-system";

/**
 * Les éléments communs aux outils du groupe « ordres » (leçons 14 à 18 et 36) :
 * le bouton principal, le choix souligné d'ambre, le curseur, le chiffre mis en
 * avant, une série de situations à trancher, et un petit moteur qui fait
 * défiler le temps (en respectant « Réduire les animations »).
 */

// ── Les nombres, à la française ────────────────────────────────────────────

export function nb(x: number, d = 0): string {
  const v = Object.is(Math.round(x * 10 ** d), -0) ? 0 : x;
  return v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
}
/** Avec le signe devant : « +20 », « −20 » (le signe moins typographique). */
export function signe(x: number, d = 0): string {
  const r = Math.round(x * 10 ** d) / 10 ** d;
  if (r === 0) return nb(0, d);
  return (r > 0 ? "+" : "−") + nb(Math.abs(r), d);
}
export const euros = (x: number, d = 0) => `${nb(x, d)} €`;
export const dollars = (x: number, d = 0) => `${nb(x, d)} $`;
export const ton = (x: number) => (x > 1e-9 ? "var(--cap-up)" : x < -1e-9 ? "var(--cap-down)" : "var(--cap-ink)");

// ── Les boutons ────────────────────────────────────────────────────────────

export function Bouton({ children, onClick, disabled, fleche }: { children: ReactNode; onClick: () => void; disabled?: boolean; fleche?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="inline-flex min-h-11 items-center gap-2 rounded-[10px] px-4 text-[0.95rem] font-semibold transition-opacity disabled:opacity-40"
      style={{ backgroundColor: "var(--cap-ink)", color: "var(--cap-on-inverse)" }}>
      <span aria-hidden className="h-1.5 w-1.5 flex-none rounded-full" style={{ backgroundColor: "var(--cap-ambre)" }} />
      {children}
      {fleche && <ArrowRight size={16} aria-hidden />}
    </button>
  );
}

export function Lien({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="cap-lien inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap px-1 text-[0.95rem] disabled:opacity-40">
      {children}
    </button>
  );
}

export function Recommencer({ onClick, label = "Recommencer" }: { onClick: () => void; label?: string }) {
  return (
    <Lien onClick={onClick}><RotateCcw size={15} aria-hidden /> {label}</Lien>
  );
}

// ── Choisir parmi quelques options : le trait ambre sous l'option choisie ──

export function Choix<T extends string | number>({ label, options, valeur, onChange, petit }: {
  label: string;
  options: { v: T; t: ReactNode; aide?: string }[];
  valeur: T;
  onChange: (v: T) => void;
  petit?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label}>
      <p className="mb-0.5 text-[0.88rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>{label}</p>
      <div className="flex flex-wrap gap-x-1">
        {options.map((o) => {
          const choisi = o.v === valeur;
          return (
            <button key={String(o.v)} type="button" role="radio" aria-checked={choisi} title={o.aide} onClick={() => onChange(o.v)}
              className={`relative min-h-11 min-w-11 px-2.5 ${petit ? "text-[0.92rem]" : "text-[0.98rem]"} transition-colors`}
              style={{ color: choisi ? "var(--cap-ink)" : "var(--cap-ink-3)", fontWeight: choisi ? 650 : 500 }}>
              {o.t}
              <span aria-hidden className="absolute inset-x-2.5 bottom-1.5 h-[2px] rounded-full transition-opacity"
                style={{ backgroundColor: "var(--cap-ambre)", opacity: choisi ? 1 : 0 }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Le curseur ─────────────────────────────────────────────────────────────

export function Curseur({ label, min, max, step, valeur, onChange, affiche, disabled }: {
  label: string;
  min: number;
  max: number;
  step: number;
  valeur: number;
  onChange: (v: number) => void;
  /** Ce qu'on lit à droite du libellé (et ce que lit un lecteur d'écran). */
  affiche: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="flex flex-wrap items-baseline justify-between gap-x-3 text-[0.95rem]">
        <span style={{ color: "var(--cap-ink-2)" }}>{label}</span>
        <b className="whitespace-nowrap tabular-nums" style={{ color: "var(--cap-ink)" }}>{affiche}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={valeur} disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))} aria-valuetext={affiche}
        className="mt-1 block h-11 w-full cursor-pointer disabled:cursor-default disabled:opacity-50"
        style={{ accentColor: "var(--cap-ink)" }} />
    </label>
  );
}

// ── Un chiffre, son libellé ────────────────────────────────────────────────

export function Chiffre({ label, valeur, couleur, grand, note }: { label: string; valeur: ReactNode; couleur?: string; grand?: boolean; note?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.86rem] leading-tight" style={{ color: "var(--cap-ink-3)" }}>{label}</p>
      <p className={`tabular-nums leading-tight ${grand ? "text-[1.6rem]" : "text-[1.2rem]"}`}
        style={{ color: couleur ?? "var(--cap-ink)", fontFamily: "var(--cap-font-display)", fontWeight: 600 }}>{valeur}</p>
      {note && <p className="mt-0.5 text-[0.84rem] leading-snug" style={{ color: "var(--cap-ink-3)" }}>{note}</p>}
    </div>
  );
}

/** Le message qui dit ce qui se passe : un filet à gauche, annoncé aux lecteurs d'écran. */
export function Verdict({ children, couleur }: { children: ReactNode; couleur?: string }) {
  return (
    <div className="mt-4 border-l-[3px] py-1 pl-4 text-[1rem] leading-relaxed" aria-live="polite"
      style={{ borderColor: couleur ?? "var(--cap-line-strong)", color: "var(--cap-ink)" }}>
      {children}
    </div>
  );
}

// ── Faire avancer le temps ─────────────────────────────────────────────────

/** Vrai quand il ne faut rien animer : « Réduire les animations », ou les animations coupées sur le site. */
export function useCalme(): boolean {
  const reduce = useMouvementReduit();
  const [actives] = useAnimationsEnabled();
  return reduce || !actives;
}

/**
 * Fait défiler un compteur de 0 à n - 1, un pas toutes les `ms` millisecondes.
 * Avec « Réduire les animations », le compteur va directement au bout.
 */
export function useDefilement(n: number, ms: number) {
  const reduce = useCalme();
  const [k, setK] = useState(n - 1);
  const [enCours, setEnCours] = useState(false);
  const minuteur = useRef<ReturnType<typeof setInterval> | null>(null);

  const arreter = useCallback(() => {
    if (minuteur.current) clearInterval(minuteur.current);
    minuteur.current = null;
    setEnCours(false);
  }, []);

  const lancer = useCallback(() => {
    arreter();
    if (reduce) { setK(n - 1); return; }
    setK(0);
    setEnCours(true);
    let i = 0;
    minuteur.current = setInterval(() => {
      i += 1;
      setK(i);
      if (i >= n - 1) arreter();
    }, ms);
  }, [arreter, n, ms, reduce]);

  useEffect(() => arreter, [arreter]);
  return { k, setK, lancer, arreter, enCours, reduce };
}

/** La largeur d'une boîte, pour dessiner un SVG à l'échelle 1 (texte lisible sur téléphone). */
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

// ── Une série de situations à trancher ─────────────────────────────────────

export interface Situation { situation: string; options: string[]; correct: number; pourquoi: string }

export function Situations({ items, titreFin = "Toutes les situations sont faites." }: { items: Situation[]; titreFin?: string }) {
  const [k, setK] = useState(0);
  const [choix, setChoix] = useState<number | null>(null);
  const [bons, setBons] = useState(0);
  const fini = k >= items.length;
  const s = items[Math.min(k, items.length - 1)];

  const repondre = (j: number) => {
    if (choix != null) return;
    setChoix(j);
    if (j === s.correct) setBons((b) => b + 1);
  };

  if (fini) {
    return (
      <div aria-live="polite">
        <p className="text-[1.05rem]" style={{ color: "var(--cap-ink)" }}>
          {titreFin} Vous en avez réussi <b className="cap-chiffre">{bons} sur {items.length}</b>.
          {bons < items.length ? " Relisez les explications des autres : c'est là qu'on apprend le plus." : " Vous savez choisir."}
        </p>
        <div className="mt-2"><Recommencer onClick={() => { setK(0); setChoix(null); setBons(0); }} /></div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[0.86rem] italic" style={{ color: "var(--cap-amber-ink)", fontFamily: "var(--cap-font-display)" }}>
        Situation {k + 1} sur {items.length}
      </p>
      <p className="mt-1 text-[1.06rem] leading-snug" style={{ color: "var(--cap-ink)" }} dangerouslySetInnerHTML={{ __html: s.situation }} />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {s.options.map((o, j) => {
          const montre = choix != null;
          const juste = j === s.correct;
          const choisi = j === choix;
          const bord = montre && juste ? "var(--cap-up)" : montre && choisi ? "var(--cap-down)" : "var(--cap-line-strong)";
          return (
            <button key={j} type="button" onClick={() => repondre(j)} disabled={montre && !choisi && !juste}
              aria-pressed={choisi}
              className="min-h-11 rounded-[10px] px-4 py-2 text-left text-[0.97rem] transition-colors disabled:opacity-50"
              style={{ boxShadow: `inset 0 0 0 ${montre && (juste || choisi) ? 2 : 1}px ${bord}`, color: "var(--cap-ink)", backgroundColor: "var(--cap-surface)" }}>
              {o}{montre && juste ? " : oui" : montre && choisi ? " : non" : ""}
            </button>
          );
        })}
      </div>
      {choix != null && (
        <>
          <Verdict couleur={choix === s.correct ? "var(--cap-up)" : "var(--cap-down)"}>
            <b>{choix === s.correct ? "Juste." : `Pas ici : la bonne réponse est « ${s.options[s.correct]} ».`}</b>{" "}
            <span dangerouslySetInnerHTML={{ __html: s.pourquoi }} />
          </Verdict>
          <div className="mt-3">
            <Bouton fleche onClick={() => { setK(k + 1); setChoix(null); }}>{k < items.length - 1 ? "Situation suivante" : "Voir le bilan"}</Bouton>
          </div>
        </>
      )}
    </div>
  );
}
