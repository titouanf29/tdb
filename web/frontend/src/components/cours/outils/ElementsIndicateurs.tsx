"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import type { Bougie } from "@/lib/cours/marche";
import { useAnimationsEnabled, useMouvementReduit } from "@/components/design-system";

/** Vrai quand il ne faut rien animer : réglage de l'appareil ou du site. */
export function useCalmeInd() {
  const reduit = useMouvementReduit();
  const [on] = useAnimationsEnabled();
  return reduit || !on;
}

/** Une transition douce, sauf si les animations sont coupées. */
export function transitionInd(calme: boolean, quoi = "transform", ms = 260) {
  return calme ? undefined : `${quoi} ${ms}ms cubic-bezier(.2,.7,.2,1)`;
}

/**
 * L'apparition d'un graphique d'outil : les bougies arrivent de gauche à
 * droite la première fois qu'il passe à l'écran. Renvoie le nombre de
 * bougies à montrer (null : toutes).
 */
function useApparition(ref: React.RefObject<HTMLDivElement | null>, n: number, calme: boolean, actif: boolean) {
  const [revele, setRevele] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || calme || !actif || typeof IntersectionObserver === "undefined") return;
    let raf = 0;
    const lancer = () => {
      const t0 = performance.now();
      const duree = Math.min(1000, 260 + n * 12);
      const pas = (t: number) => {
        const f = Math.min(1, (t - t0) / duree);
        setRevele(Math.round((1 - Math.pow(1 - f, 3)) * n));
        if (f < 1) raf = requestAnimationFrame(pas); else setRevele(null);
      };
      raf = requestAnimationFrame(pas);
    };
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.92 && r.bottom > 0) { lancer(); return () => cancelAnimationFrame(raf); }
    setRevele(-1);
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); lancer(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
    // Une seule apparition, au premier passage à l'écran.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calme]);
  return revele;
}

/**
 * Les éléments communs aux outils des leçons sur les indicateurs (RSI,
 * moyennes mobiles, MACD) et sur l'entraînement (compte démo, plan de
 * trading) : boutons, choix à trait ambre, curseur, encart de lecture, et un
 * petit graphique en SVG qui sait dessiner des panneaux sous le prix, des
 * traits sur ces panneaux, et suivre le doigt bougie par bougie.
 */

export function BoutonInd({ children, onClick, disabled, type = "button" }: {
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
export function LienInd({ children, onClick, disabled, label }: { children: ReactNode; onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label}
      className="cap-lien inline-flex min-h-11 items-center px-1 text-[0.95rem] disabled:opacity-40">
      {children}
    </button>
  );
}

export function RecommencerInd({ onClick, label = "Recommencer" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className="flex h-11 w-11 flex-none items-center justify-center rounded-full transition-colors hover:bg-[color:var(--cap-surface-2)]"
      style={{ color: "var(--cap-ink-2)" }}>
      <RotateCcw size={17} />
    </button>
  );
}

/** Un choix parmi quelques options : le choisi est souligné d'ambre ; `etat` colore après correction. */
export function ChoixInd<T extends string | number>({ options, valeur, onChange, label, etat, desactive, colonne }: {
  options: { v: T; texte: string }[];
  valeur: T | null;
  onChange: (v: T) => void;
  label: string;
  etat?: (v: T) => "juste" | "faux" | null;
  desactive?: boolean;
  /** Les options l'une sous l'autre (pour des phrases longues). */
  colonne?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={colonne ? "flex flex-col items-start gap-1" : "flex flex-wrap gap-x-1 gap-y-1"}>
      {options.map((o) => {
        const choisi = valeur === o.v;
        const e = etat?.(o.v) ?? null;
        const couleur = e === "juste" ? "var(--cap-up)" : e === "faux" ? "var(--cap-down)" : choisi ? "var(--cap-ink)" : "var(--cap-ink-2)";
        return (
          <button key={String(o.v)} type="button" role="radio" aria-checked={choisi} disabled={desactive}
            onClick={() => onChange(o.v)}
            className={`relative min-h-11 rounded-[8px] px-3 py-2 text-[0.95rem] leading-snug transition-colors hover:bg-[color:var(--cap-surface-2)] disabled:cursor-default disabled:hover:bg-transparent ${colonne ? "text-left" : ""}`}
            style={{ color: couleur, fontWeight: choisi || e ? 650 : 500 }}>
            {o.texte}
            <span aria-hidden className="absolute bottom-1 left-3 right-3 h-[2px] rounded-full transition-opacity"
              style={{ backgroundColor: e === "juste" ? "var(--cap-up)" : e === "faux" ? "var(--cap-down)" : "var(--cap-ambre)", opacity: choisi || e ? 1 : 0, maxWidth: colonne ? "8rem" : undefined }} />
          </button>
        );
      })}
    </div>
  );
}

/** Un curseur étiqueté, assez haut pour le doigt, avec sa valeur écrite. */
export function CurseurInd({ label, valeur, min, max, pas = 1, onChange, ecrire, id }: {
  label: string; valeur: number; min: number; max: number; pas?: number;
  onChange: (v: number) => void; ecrire?: (v: number) => string; id: string;
}) {
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[0.95rem]" style={{ color: "var(--cap-ink-2)" }}>{label}</label>
        <span className="text-[0.98rem] font-semibold tabular-nums" style={{ color: "var(--cap-ink)" }}>{ecrire ? ecrire(valeur) : valeur}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={pas} value={valeur}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full cursor-pointer" style={{ accentColor: "var(--cap-ink)" }} />
    </div>
  );
}

/** Un encart qui lit les chiffres à voix haute pour les lecteurs d'écran. */
export function LectureInd({ children, ton = "neutre" }: { children: ReactNode; ton?: "neutre" | "juste" | "faux" }) {
  const bord = ton === "juste" ? "var(--cap-up)" : ton === "faux" ? "var(--cap-down)" : "var(--cap-ambre)";
  return (
    <div aria-live="polite" className="rounded-[12px] border-l-[3px] px-4 py-3 text-[0.98rem] leading-relaxed"
      style={{ borderColor: bord, backgroundColor: "var(--cap-surface-2)", color: "var(--cap-ink-2)" }}>
      {children}
    </div>
  );
}

/** Une petite légende de couleur : un trait, son nom. */
export function PastilleInd({ couleur, children, pointille }: { couleur: string; children: ReactNode; pointille?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.88rem]" style={{ color: "var(--cap-ink-2)" }}>
      <svg width="18" height="8" aria-hidden><line x1="1" x2="17" y1="4" y2="4" stroke={couleur} strokeWidth="2.5" strokeDasharray={pointille ? "4 3" : undefined} strokeLinecap="round" /></svg>
      {children}
    </span>
  );
}

export function useLargeur(min = 280) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(min, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [min]);
  return { ref, w };
}

// ── Le petit graphique ───────────────────────────────────────────────────

export type SerieMini = { v: (number | null)[]; couleur: string; epaisseur?: number; pointille?: boolean };
export type TraitMini = { i0: number; v0: number; i1: number; v1: number; couleur: string; label?: string };
export type PointMini = { i: number; v: number; couleur: string; label?: string; dessous?: boolean };

export interface PanneauMini {
  titre?: string;
  hauteur?: number;
  min?: number;
  max?: number;
  series?: SerieMini[];
  /** Des barres autour de zéro (histogramme), vertes ou rouges. */
  barres?: (number | null)[];
  seuils?: number[];
  zero?: boolean;
  traits?: TraitMini[];
  points?: PointMini[];
}

const GM = 6, DM = 56;

/** Des graduations rondes (1, 2, 2,5 ou 5 fois une puissance de 10). */
function graduationsInd(min: number, max: number, n = 4): number[] {
  const brut = (max - min) / n;
  if (!(brut > 0)) return [min];
  const p = Math.pow(10, Math.floor(Math.log10(brut)));
  const pas = [1, 2, 2.5, 5, 10].map((k) => k * p).find((k) => k >= brut) ?? brut;
  const out: number[] = [];
  for (let v = Math.ceil(min / pas) * pas; v <= max + 1e-9; v += pas) out.push(Number(v.toPrecision(12)));
  return out;
}

/**
 * Un graphique d'outil : les bougies (ou une ligne), des courbes par-dessus,
 * des panneaux dessous. `curseur` trace la bougie lue ; `bande` éclaire une
 * fenêtre de bougies ; `onIndex` suit le doigt (appui puis glisser).
 */
export function MiniGraphe({ bougies, fin, ligne, series = [], panneaux = [], curseur, bande, traits = [], points = [], onIndex, onTape, hauteur, ariaLabel, decimales = 0, etroitHauteur, apparition = true }: {
  bougies: Bougie[];
  /** Dernière bougie visible (le reste est le futur, caché). */
  fin?: number;
  ligne?: boolean;
  series?: SerieMini[];
  panneaux?: PanneauMini[];
  curseur?: number | null;
  bande?: { i0: number; i1: number } | null;
  traits?: TraitMini[];
  points?: PointMini[];
  onIndex?: (i: number) => void;
  /** Un toucher (sans glisser) : la bougie touchée et le prix sous le doigt (null sous le graphique du prix). */
  onTape?: (i: number, prix: number | null) => void;
  hauteur?: number;
  etroitHauteur?: number;
  ariaLabel: string;
  decimales?: number;
  /** false : pas d'apparition des bougies (exercice où l'on touche tout de suite). */
  apparition?: boolean;
}) {
  const { ref, w: W } = useLargeur();
  const appui = useRef(false);
  const n = bougies.length;
  const calme = useCalmeInd();
  const revele = useApparition(ref, n, calme, apparition);
  const derVrai = Math.min(n - 1, fin ?? n - 1);
  const der = revele == null ? derVrai : Math.min(derVrai, revele - 1);
  const anime = revele != null;
  const etroit = W < 520;
  const HP = etroit ? (etroitHauteur ?? 200) : (hauteur ?? 260);
  const plotW = W - GM - DM;
  const slot = plotW / n;
  const x = (i: number) => GM + (i + 0.5) * slot;
  const corps = Math.max(1, slot * 0.64);

  let lo = Infinity, hi = -Infinity;
  for (const b of bougies) { lo = Math.min(lo, ligne ? b.c : b.l); hi = Math.max(hi, ligne ? b.c : b.h); }
  for (const s of series) for (const v of s.v) if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const pad = (hi - lo) * 0.08 || 1;
  lo -= pad; hi += pad;
  const y = (p: number) => 8 + (1 - (p - lo) / (hi - lo)) * (HP - 16);
  const grads = graduationsInd(lo, hi);
  const pasAxe = grads.length > 1 ? grads[1] - grads[0] : 1;
  let decAuto = 0;
  while (decAuto < 5 && Math.abs(pasAxe * 10 ** decAuto - Math.round(pasAxe * 10 ** decAuto)) > 1e-6) decAuto++;

  const hPan = (p: PanneauMini) => p.hauteur ?? (etroit ? 96 : 116);
  const tops: number[] = [];
  let acc = HP + 10;
  for (const p of panneaux) { tops.push(acc); acc += hPan(p) + 10; }
  const H = acc;

  const chemin = (s: (number | null)[], yy: (v: number) => number) => {
    let d = "";
    for (let i = 0; i <= der; i++) {
      const v = s[i];
      if (v == null) continue;
      d += `${d && s[i - 1] != null ? "L" : "M"}${x(i).toFixed(1)},${yy(v).toFixed(1)}`;
    }
    return d;
  };

  const versIndex = (e: React.PointerEvent<SVGRectElement>) => {
    const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * W;
    return Math.max(0, Math.min(der, Math.floor((mx - GM) / slot)));
  };
  const dAxe = Math.max(decimales, decAuto);
  const fmtAxe = (v: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: dAxe, maximumFractionDigits: dAxe });
  const finX = x(derVrai) + slot / 2;

  return (
    <div ref={ref} className="relative w-full select-none">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="block" role="img" aria-label={ariaLabel}
        style={{ fontFamily: "var(--cap-font-text)", touchAction: onIndex ? "pan-y" : undefined }}>
        <defs>
          <pattern id="mi-futur" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="var(--cap-line-strong)" strokeWidth="1" />
          </pattern>
        </defs>
        {grads.map((v) => (
          <g key={v}>
            <line x1={GM} x2={GM + plotW} y1={y(v)} y2={y(v)} stroke="var(--cap-line-chart)" />
            <text x={GM + plotW + 6} y={y(v) + 4} fontSize="11" fill="var(--cap-ink-3)">{fmtAxe(v)}</text>
          </g>
        ))}
        {bande && !anime && (
          <rect x={0} width={(bande.i1 - bande.i0 + 1) * slot} y={4} height={H - 8}
            fill="var(--cap-ambre)" opacity="0.13" rx="4"
            style={{ transform: `translateX(${x(bande.i0) - slot / 2}px)`, transition: transitionInd(calme, "transform", 200) }} />
        )}
        {ligne ? (
          <path d={chemin(bougies.map((b) => b.c), y)} fill="none" stroke="var(--cap-ink)" strokeWidth="1.6" strokeLinejoin="round" />
        ) : bougies.slice(0, der + 1).map((b, i) => {
          const col = b.c >= b.o ? "var(--cap-up-fill)" : "var(--cap-down-fill)";
          return (
            <g key={i}>
              <line x1={x(i)} x2={x(i)} y1={y(b.h)} y2={y(b.l)} stroke={col} strokeWidth={slot > 4 ? 1.2 : 0.9} />
              <rect x={x(i) - corps / 2} width={corps} y={Math.min(y(b.o), y(b.c))} height={Math.max(1, Math.abs(y(b.o) - y(b.c)))} fill={col} rx={corps > 6 ? 1 : 0} />
            </g>
          );
        })}
        {series.map((s, k) => (
          <path key={k} d={chemin(s.v, y)} fill="none" stroke={s.couleur} strokeWidth={s.epaisseur ?? 2} strokeDasharray={s.pointille ? "5 4" : undefined} strokeLinejoin="round" />
        ))}
        {!anime && traits.map((t, k) => (
          <g key={`t${k}`}>
            <line x1={x(t.i0)} y1={y(t.v0)} x2={x(t.i1)} y2={y(t.v1)} stroke={t.couleur} strokeWidth="2.4" strokeLinecap="round" />
            {t.label && <text x={(x(t.i0) + x(t.i1)) / 2} y={(y(t.v0) + y(t.v1)) / 2 - 10} textAnchor="middle" fontSize="12" fontWeight="700" fill={t.couleur} stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">{t.label}</text>}
          </g>
        ))}
        {!anime && points.map((p, k) => (
          <g key={`p${k}`} style={{ transform: `translate(${x(p.i)}px, ${y(p.v)}px)`, transition: transitionInd(calme) }}>
            <circle cx={0} cy={0} r="5" fill={p.couleur} stroke="var(--cap-surface)" strokeWidth="1.5" />
            {p.label && <text x={Math.min(Math.max(x(p.i), GM + 30), GM + plotW - 30) - x(p.i)} y={p.dessous ? 22 : -11} textAnchor="middle" fontSize="12" fontWeight="700" fill={p.couleur} stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">{p.label}</text>}
          </g>
        ))}

        {panneaux.map((p, k) => {
          const y0 = tops[k];
          const h = hPan(p);
          let pl = p.min, ph = p.max;
          if (pl == null || ph == null) {
            const vals = [...(p.series ?? []).flatMap((s) => s.v), ...(p.barres ?? [])].filter((v): v is number => v != null);
            const m = Math.max(...vals.map(Math.abs), 1e-9);
            pl = pl ?? -m; ph = ph ?? m;
          }
          const yy = (v: number) => y0 + 18 + (1 - (v - pl!) / (ph! - pl! || 1)) * (h - 24);
          return (
            <g key={k}>
              <line x1={GM} x2={GM + plotW} y1={y0} y2={y0} stroke="var(--cap-line)" />
              {p.titre && <text x={GM} y={y0 + 13} fontSize="12" fontWeight="600" fill="var(--cap-ink-2)">{p.titre}</text>}
              {(p.seuils ?? []).map((s) => (
                <g key={s}>
                  <line x1={GM} x2={GM + plotW} y1={yy(s)} y2={yy(s)} stroke="var(--cap-amber-ink)" strokeDasharray="4 3" />
                  <text x={GM + plotW + 6} y={yy(s) + 4} fontSize="11" fontWeight="600" fill="var(--cap-amber-ink)">{s}</text>
                </g>
              ))}
              {p.zero && (
                <g>
                  <line x1={GM} x2={GM + plotW} y1={yy(0)} y2={yy(0)} stroke="var(--cap-line-strong)" />
                  <text x={GM + plotW + 6} y={yy(0) + 4} fontSize="11" fill="var(--cap-ink-3)">0</text>
                </g>
              )}
              {(p.barres ?? []).slice(0, der + 1).map((v, i) => v == null ? null : (
                <rect key={i} x={x(i) - corps / 2} width={corps} y={Math.min(yy(0), yy(v))} height={Math.max(0.5, Math.abs(yy(v) - yy(0)))}
                  fill={v >= 0 ? "var(--cap-up-fill)" : "var(--cap-down-fill)"} opacity="0.55" />
              ))}
              {(p.series ?? []).map((s, j) => (
                <path key={j} d={chemin(s.v, yy)} fill="none" stroke={s.couleur} strokeWidth={s.epaisseur ?? 1.8} strokeDasharray={s.pointille ? "5 4" : undefined} />
              ))}
              {!anime && (p.traits ?? []).map((t, j) => (
                <g key={`pt${j}`}>
                  <line x1={x(t.i0)} y1={yy(t.v0)} x2={x(t.i1)} y2={yy(t.v1)} stroke={t.couleur} strokeWidth="2.4" strokeLinecap="round" />
                  {t.label && <text x={(x(t.i0) + x(t.i1)) / 2} y={(yy(t.v0) + yy(t.v1)) / 2 - 9} textAnchor="middle" fontSize="12" fontWeight="700" fill={t.couleur} stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">{t.label}</text>}
                </g>
              ))}
              {!anime && (p.points ?? []).map((pt, j) => (
                <circle key={`pp${j}`} cx={0} cy={0} r="4.5" fill={pt.couleur} stroke="var(--cap-surface)" strokeWidth="1.5"
                  style={{ transform: `translate(${x(pt.i)}px, ${yy(pt.v)}px)`, transition: transitionInd(calme) }} />
              ))}
              {derVrai < n - 1 && <rect x={finX} y={y0 + 2} width={GM + plotW - finX} height={h - 2} fill="url(#mi-futur)" opacity="0.45" />}
            </g>
          );
        })}

        {derVrai < n - 1 && <rect x={finX} y={8} width={GM + plotW - finX} height={HP - 16} fill="url(#mi-futur)" opacity="0.6" />}
        {!anime && curseur != null && curseur <= der && (
          <line x1={0} x2={0} y1={4} y2={H - 2} stroke="var(--cap-ink)" strokeWidth="1.2" strokeDasharray="3 3" pointerEvents="none"
            style={{ transform: `translateX(${x(curseur)}px)`, transition: transitionInd(calme, "transform", 160) }} />
        )}
        {onTape && !onIndex && (
          <rect x={GM} y={0} width={plotW} height={H} fill="transparent" style={{ cursor: "pointer" }}
            onClick={(e) => {
              const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
              const mx = ((e.clientX - r.left) / r.width) * W, my = ((e.clientY - r.top) / r.height) * H;
              const i = Math.max(0, Math.min(der, Math.floor((mx - GM) / slot)));
              onTape(i, my <= HP ? lo + (1 - (my - 8) / (HP - 16)) * (hi - lo) : null);
            }} />
        )}
        {onIndex && (
          <rect x={GM} y={0} width={plotW} height={H} fill="transparent" style={{ cursor: "ew-resize" }}
            onPointerDown={(e) => { appui.current = true; e.currentTarget.setPointerCapture(e.pointerId); onIndex(versIndex(e)); }}
            onPointerMove={(e) => { if (appui.current) onIndex(versIndex(e)); }}
            onPointerUp={() => { appui.current = false; }}
            onPointerCancel={() => { appui.current = false; }} />
        )}
      </svg>
    </div>
  );
}

/** Un nombre à la française, avec ses décimales. */
export function nf(x: number, d = 0) {
  const t = Math.abs(x).toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
  return x < 0 && Number(t.replace(/\s/g, "").replace(",", ".")) !== 0 ? `−${t}` : t;
}

/** Un nombre négatif entre parenthèses, pour l'écrire après un signe moins. */
export function nfp(x: number, d = 0) {
  return x < 0 ? `(${nf(x, d)})` : nf(x, d);
}
