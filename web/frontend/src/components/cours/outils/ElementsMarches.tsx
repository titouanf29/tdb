"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { useAnimationsEnabled, useMouvementReduit } from "@/components/design-system";

/** Vrai quand on peut animer : ni « Réduire les animations », ni animations coupées sur le site. */
export function useAnimer(): boolean {
  const reduit = useMouvementReduit();
  const [on] = useAnimationsEnabled();
  return on && !reduit;
}

/**
 * Les éléments communs aux outils du groupe « marchés » (leçons 2, 5, 12 et
 * 13) : nombres à la française, bouton principal, choix souligné d'ambre,
 * curseur, chiffre mis en avant, verdict annoncé, et la lecture de l'heure
 * réelle à Paris, Londres, New York et Tokyo.
 */

// ── Les nombres, à la française ────────────────────────────────────────────

export function nb(x: number, d = 0): string {
  const v = Object.is(Math.round(x * 10 ** d), -0) || Math.round(x * 10 ** d) === 0 ? 0 : x;
  return v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
}
/** Avec le signe devant : « +20 », « −20 » (le signe moins typographique). */
export function signe(x: number, d = 0): string {
  const r = Math.round(x * 10 ** d) / 10 ** d;
  if (r === 0) return nb(0, d);
  return (r > 0 ? "+" : "−") + nb(Math.abs(r), d);
}
export const dollars = (x: number, d = 0) => `${nb(x, d)}\u00a0$`;
export const ton = (x: number) => (x > 1e-9 ? "var(--cap-up)" : x < -1e-9 ? "var(--cap-down)" : "var(--cap-ink)");

/** 13.5 → « 13 h 30 » ; 9 → « 9 h ». */
export function heureTexte(h: number): string {
  const t = ((h % 24) + 24) % 24;
  let hh = Math.floor(t + 1e-9);
  let mm = Math.round((t - hh) * 60);
  if (mm === 60) { hh = (hh + 1) % 24; mm = 0; }
  return mm === 0 ? `${hh}\u00a0h` : `${hh}\u00a0h\u00a0${String(mm).padStart(2, "0")}`;
}

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
      className="cap-lien inline-flex min-h-11 items-center gap-1.5 px-1 text-[0.95rem] disabled:opacity-40">
      {children}
    </button>
  );
}

export function Recommencer({ onClick, label = "Recommencer" }: { onClick: () => void; label?: string }) {
  return <Lien onClick={onClick}><RotateCcw size={15} aria-hidden /> {label}</Lien>;
}

// ── Choisir parmi quelques options : le trait ambre sous l'option choisie ──

export function Choix<T extends string | number>({ label, options, valeur, onChange, petit }: {
  label: string;
  options: { v: T; t: ReactNode; aide?: string }[];
  valeur: T | null;
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
  affiche: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3 text-[0.95rem]">
        <span style={{ color: "var(--cap-ink-2)" }}>{label}</span>
        <b className="tabular-nums" style={{ color: "var(--cap-ink)" }}>{affiche}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={valeur} disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))} aria-valuetext={affiche}
        className="mt-1 block h-11 w-full cursor-pointer disabled:cursor-default disabled:opacity-50"
        style={{ accentColor: "var(--cap-ink)" }} />
    </label>
  );
}

/** Deux petits boutons − et + autour d'une valeur (au doigt, plus précis qu'un curseur). */
export function Pas({ label, valeur, affiche, onMoins, onPlus, moinsOff, plusOff }: {
  label: string; valeur?: number; affiche: string; onMoins: () => void; onPlus: () => void; moinsOff?: boolean; plusOff?: boolean;
}) {
  const btn = "flex h-11 w-11 flex-none items-center justify-center rounded-full text-[1.3rem] leading-none transition-colors hover:bg-[color:var(--cap-surface-2)] disabled:opacity-30";
  return (
    <div>
      <p className="text-[0.88rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>{label}</p>
      <div className="flex items-center gap-1">
        <button type="button" className={btn} onClick={onMoins} disabled={moinsOff} aria-label={`${label} : moins`}
          style={{ boxShadow: "inset 0 0 0 1px var(--cap-line-strong)", color: "var(--cap-ink)" }}>−</button>
        <output className="min-w-[6.5rem] px-2 text-center text-[1.25rem] font-semibold tabular-nums" aria-live="polite" data-valeur={valeur}
          style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>{affiche}</output>
        <button type="button" className={btn} onClick={onPlus} disabled={plusOff} aria-label={`${label} : plus`}
          style={{ boxShadow: "inset 0 0 0 1px var(--cap-line-strong)", color: "var(--cap-ink)" }}>+</button>
      </div>
    </div>
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
export function Verdict({ children, couleur, live = true }: { children: ReactNode; couleur?: string; live?: boolean }) {
  return (
    <div className="mt-4 border-l-[3px] py-1 pl-4 text-[1rem] leading-relaxed" aria-live={live ? "polite" : undefined}
      style={{ borderColor: couleur ?? "var(--cap-line-strong)", color: "var(--cap-ink)" }}>
      {children}
    </div>
  );
}

/** Une petite étiquette en italique serif (comme les étiquettes du site). */
export function Etiquette({ children, ambre }: { children: ReactNode; ambre?: boolean }) {
  return (
    <p className="text-[0.88rem] italic" style={{ color: ambre ? "var(--cap-amber-ink)" : "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>{children}</p>
  );
}

// ── L'heure réelle ─────────────────────────────────────────────────────────

/** Décalage d'un fuseau par rapport à UTC, en heures, à l'instant `d`. */
export function decalage(tz: string, d: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(d);
  const v = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const local = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour") % 24, v("minute"));
  const utc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes());
  return Math.round((local - utc) / 1800000) / 2;
}

/** Le moment présent, vu de Paris : jour (0 = lundi … 6 = dimanche), heure décimale, et les décalages utiles. */
export function maintenantParis(d = new Date()) {
  const P = decalage("Europe/Paris", d);
  const N = decalage("America/New_York", d);
  const t = new Date(d.getTime() + P * 3600000);
  const jour = (t.getUTCDay() + 6) % 7;
  const heure = t.getUTCHours() + t.getUTCMinutes() / 60;
  return { jour, heure, P, N };
}

export const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/** La largeur réelle d'un élément, pour dessiner un SVG net à toutes les tailles. */
export function useLargeur(defaut = 600): [RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(defaut);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}
