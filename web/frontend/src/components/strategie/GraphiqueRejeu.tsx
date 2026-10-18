"use client";

import { useMemo } from "react";
import type { FilmStrategie } from "@/lib/api";
import { prix, signe, compact, nombre, type Rejeu } from "@/lib/rejeu";

/**
 * Le graphique du rejeu. Il s'arrête à la bougie du jour : à droite, la
 * suite reste cachée, comme pour celui qui trade. Dessous, les indicateurs
 * que les conditions regardent, puis une bande par condition qui montre
 * quand elle était vraie : on voit d'un coup d'œil ce qui manquait.
 */

const COULEURS = ["var(--cap-ocean)", "var(--cap-cyan)", "var(--cap-ink-3)", "var(--cap-amber-ink)"];
const L = 6;
const R = 72;

function graduations(min: number, max: number, n = 4): number[] {
  const brut = (max - min) / n;
  if (!(brut > 0)) return [min];
  const p = Math.pow(10, Math.floor(Math.log10(brut)));
  const pas = [1, 2, 2.5, 5, 10].map((k) => k * p).find((k) => k >= brut) ?? brut;
  const out = [];
  for (let v = Math.ceil(min / pas) * pas; v <= max; v += pas) out.push(v);
  return out;
}

/** Les plages consécutives où un masque est vrai, entre a et b. */
function plages(vrai: (k: number) => boolean, a: number, b: number): [number, number][] {
  const out: [number, number][] = [];
  let debut = -1;
  for (let k = a; k <= b; k++) {
    if (vrai(k)) { if (debut < 0) debut = k; }
    else if (debut >= 0) { out.push([debut, k - 1]); debut = -1; }
  }
  if (debut >= 0) out.push([debut, b]);
  return out;
}

export function GraphiqueRejeu({ f, rj, i, fenetre, largeur, survol, onSurvol }: {
  f: FilmStrategie;
  rj: Rejeu;
  i: number;
  fenetre: number;
  largeur: number;
  survol: number | null;
  onSurvol: (k: number | null) => void;
}) {
  const W = Math.max(300, largeur);
  const etroit = W < 560;
  const HP = etroit ? 230 : 310;
  const HPAN = etroit ? 70 : 84;
  const LIGNE = 20;
  const achat = f.sens === "achat";

  const g = useMemo(() => {
    const visibles = Math.max(10, Math.round(fenetre * 0.86));
    const start = Math.max(0, i - visibles + 1);
    const plotW = W - L - R;
    const slot = plotW / fenetre;
    const x = (k: number) => L + (k - start + 0.5) * slot;

    let lo = Infinity, hi = -Infinity;
    for (let k = start; k <= i; k++) {
      const l = f.l[k], h = f.h[k];
      if (l != null) lo = Math.min(lo, l);
      if (h != null) hi = Math.max(hi, h);
      for (const s of f.superpositions) {
        const v = s.valeurs[k];
        if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
      }
    }
    const trades = f.trades.map((t, n) => ({ t, n })).filter(({ t }) => t.i_e <= i && t.i_s >= start);
    for (const { t } of trades) { lo = Math.min(lo, t.stop, t.objectif); hi = Math.max(hi, t.stop, t.objectif); }
    if (!Number.isFinite(lo)) { lo = 0; hi = 1; }
    const pad = (hi - lo) * 0.06 || 1;
    lo -= pad; hi += pad;
    const top = 8;
    const y = (v: number) => top + (1 - (v - lo) / (hi - lo)) * (HP - top - 6);
    return { start, plotW, slot, x, y, lo, hi, trades, top };
  }, [f, i, fenetre, W, HP]);

  const { start, slot, x, y, trades } = g;
  const finPresent = x(i) + slot / 2;
  const finPlot = L + g.plotW;
  const corps = Math.max(1, slot * 0.62);
  const panneaux = f.panneaux;
  const yPanneaux = HP + 14;
  const yBandes = yPanneaux + panneaux.length * (HPAN + 12) + 6;
  const lignes = f.conditions.length + 1;
  const H = yBandes + lignes * LIGNE + 4;
  const ouvert = rj.ouvert[i] >= 0 ? f.trades[rj.ouvert[i]] : null;
  const cours = f.c[i];

  const surMouvement = (e: React.PointerEvent<SVGRectElement>) => {
    const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * W;
    const k = start + Math.floor((mx - L) / slot);
    onSurvol(k >= start && k <= i ? k : null);
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="block select-none" role="img"
      aria-label={`Graphique de ${f.symbol} jusqu'au ${f.dates[i]}, cours ${prix(cours)}`}>
      <defs>
        <pattern id="rj-futur" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="var(--cap-line-strong)" strokeWidth="1" />
        </pattern>
      </defs>

      {/* Graduations du prix */}
      {graduations(g.lo, g.hi).map((v) => (
        <g key={v}>
          <line x1={L} x2={finPlot} y1={y(v)} y2={y(v)} stroke="var(--cap-line-chart)" />
          <text x={finPlot + 6} y={y(v) + 3.5} fontSize="10.5" fill="var(--cap-ink-4)">{prix(v)}</text>
        </g>
      ))}

      {/* La suite, cachée */}
      <rect x={finPresent} y={g.top} width={Math.max(0, finPlot - finPresent)} height={HP - g.top - 6} fill="url(#rj-futur)" opacity="0.55" />
      {finPlot - finPresent > 74 && (
        <text x={(finPresent + finPlot) / 2} y={g.top + 16} textAnchor="middle" fontSize="11" fontStyle="italic"
          fill="var(--cap-ink-3)" style={{ fontFamily: "var(--cap-font-display)" }}>la suite</text>
      )}

      {/* Les trades : zone de gain au-dessus (ou dessous), zone de perte de l'autre côté */}
      {trades.map(({ t, n }) => {
        const fin = Math.min(t.i_s, i);
        const x1 = x(t.i_e), x2 = t.i_s > i ? finPlot : x(fin);
        const enCours = t.i_s > i;
        return (
          <g key={n}>
            <rect x={x1} width={Math.max(1, x2 - x1)} y={Math.min(y(t.objectif), y(t.entree))}
              height={Math.abs(y(t.objectif) - y(t.entree))} fill="var(--cap-up-fill)" opacity={enCours ? 0.13 : 0.07} />
            <rect x={x1} width={Math.max(1, x2 - x1)} y={Math.min(y(t.stop), y(t.entree))}
              height={Math.abs(y(t.stop) - y(t.entree))} fill="var(--cap-down-fill)" opacity={enCours ? 0.13 : 0.07} />
            <line x1={x1} x2={x2} y1={y(t.entree)} y2={y(t.entree)} stroke="var(--cap-ink-3)" strokeDasharray={enCours ? "0" : "3 3"} />
            {enCours && (
              <>
                <line x1={x1} x2={x2} y1={y(t.objectif)} y2={y(t.objectif)} stroke="var(--cap-up)" strokeDasharray="5 4" />
                <line x1={x1} x2={x2} y1={y(t.stop)} y2={y(t.stop)} stroke="var(--cap-down)" strokeDasharray="5 4" />
              </>
            )}
            {!enCours && (
              <text x={(x1 + x2) / 2} y={Math.min(y(t.objectif), y(t.stop)) - 4} textAnchor="middle" fontSize="10.5" fontWeight="600"
                fill={t.r >= 0 ? "var(--cap-up)" : "var(--cap-down)"}>{signe(t.r, 1)} R</text>
            )}
          </g>
        );
      })}

      {/* Moyennes, canaux */}
      {f.superpositions.map((s, n) => {
        let d = "";
        for (let k = start; k <= i; k++) {
          const v = s.valeurs[k];
          if (v == null) continue;
          d += `${d && s.valeurs[k - 1] != null ? "L" : "M"}${x(k).toFixed(1)},${y(v).toFixed(1)}`;
        }
        const canal = s.cle.startsWith("haut") || s.cle.startsWith("bas");
        return <path key={s.cle} d={d} fill="none" stroke={COULEURS[n % COULEURS.length]} strokeWidth={canal ? 1.2 : 1.6}
          strokeDasharray={canal ? "4 3" : undefined} opacity="0.95" />;
      })}

      {/* Les bougies */}
      {Array.from({ length: i - start + 1 }, (_, j) => start + j).map((k) => {
        const o = f.o[k], h = f.h[k], l = f.l[k], c = f.c[k];
        if (o == null || h == null || l == null || c == null) return null;
        const hausse = c >= o;
        const couleur = hausse ? "var(--cap-up-fill)" : "var(--cap-down-fill)";
        const xx = x(k);
        return (
          <g key={k}>
            <line x1={xx} x2={xx} y1={y(h)} y2={y(l)} stroke={couleur} strokeWidth={slot > 3 ? 1 : 0.8} />
            <rect x={xx - corps / 2} width={corps} y={Math.min(y(o), y(c))} height={Math.max(0.8, Math.abs(y(o) - y(c)))} fill={couleur} />
          </g>
        );
      })}

      {/* Entrées et sorties */}
      {trades.map(({ t, n }) => {
        const xe = x(t.i_e);
        const ye = achat ? y((f.l[t.i_e] ?? t.entree)) + 10 : y((f.h[t.i_e] ?? t.entree)) - 10;
        return (
          <g key={`m${n}`}>
            <path d={achat ? `M${xe},${ye - 6} l5,8 h-10 z` : `M${xe},${ye + 6} l5,-8 h-10 z`} fill="var(--cap-ink)" />
            {t.i_s <= i && (
              <circle cx={x(t.i_s)} cy={y(t.sortie)} r="4" fill={t.r >= 0 ? "var(--cap-up)" : "var(--cap-down)"} stroke="var(--cap-surface)" strokeWidth="1.5" />
            )}
          </g>
        );
      })}

      {/* Étiquettes du trade ouvert, dans la marge */}
      {ouvert && (
        <>
          <Etiquette y={y(ouvert.objectif)} x={finPlot} texte={`obj. ${prix(ouvert.objectif)}`} couleur="var(--cap-up)" />
          <Etiquette y={y(ouvert.stop)} x={finPlot} texte={`stop ${prix(ouvert.stop)}`} couleur="var(--cap-down)" />
        </>
      )}
      {cours != null && (
        <g>
          <line x1={finPresent} x2={finPlot} y1={y(cours)} y2={y(cours)} stroke="var(--cap-ink)" strokeWidth="0.8" strokeDasharray="2 3" />
          <rect x={finPlot + 2} y={y(cours) - 9} width={R - 4} height={18} rx="4" fill="var(--cap-ink)" />
          <text x={finPlot + 2 + (R - 4) / 2} y={y(cours) + 3.8} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--cap-on-inverse)">{prix(cours)}</text>
        </g>
      )}

      {/* Les indicateurs */}
      {panneaux.map((p, n) => {
        const y0 = yPanneaux + n * (HPAN + 12);
        let lo = Infinity, hi = -Infinity;
        if (p.type === "rsi") { lo = 0; hi = 100; }
        else {
          for (const s of p.series) for (let k = start; k <= i; k++) {
            const v = s.valeurs[k];
            if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
          }
          if (p.type === "volume") lo = 0;
          if (p.type === "macd") { const m = Math.max(Math.abs(lo), Math.abs(hi)) || 1; lo = -m; hi = m; }
          if (!Number.isFinite(lo)) { lo = 0; hi = 1; }
        }
        const yy = (v: number) => y0 + 14 + (1 - (v - lo) / (hi - lo || 1)) * (HPAN - 16);
        const derniere = p.series[0]?.valeurs[i];
        return (
          <g key={p.type}>
            <line x1={L} x2={finPlot} y1={y0} y2={y0} stroke="var(--cap-line)" />
            <text x={L} y={y0 + 11} fontSize="10.5" fill="var(--cap-ink-3)">
              {p.label}{derniere != null ? ` : ${p.type === "volume" ? compact(derniere) : nombre(derniere, p.type === "rsi" ? 1 : 2)}` : ""}
            </text>
            {p.type === "rsi" && [30, 70].map((s) => <line key={s} x1={L} x2={finPlot} y1={yy(s)} y2={yy(s)} stroke="var(--cap-line-strong)" />)}
            {p.seuils.map((s) => (
              <g key={s}>
                <line x1={L} x2={finPlot} y1={yy(s)} y2={yy(s)} stroke="var(--cap-amber-ink)" strokeDasharray="4 3" />
                {p.type !== "macd" && <text x={finPlot + 6} y={yy(s) + 3.5} fontSize="10" fill="var(--cap-amber-ink)">{nombre(s, 0)}</text>}
              </g>
            ))}
            {p.type === "volume"
              ? (
                <>
                  {Array.from({ length: i - start + 1 }, (_, j) => start + j).map((k) => {
                    const v = p.series[0].valeurs[k];
                    return v == null ? null : <rect key={k} x={x(k) - corps / 2} width={corps} y={yy(v)} height={Math.max(0, yy(0) - yy(v))} fill="var(--cap-ink-4)" opacity="0.6" />;
                  })}
                  {p.series.slice(1).map((s) => <Ligne key={s.cle} s={s.valeurs} start={start} i={i} x={x} y={yy} couleur="var(--cap-amber-ink)" />)}
                </>
              )
              : p.series.map((s, m) => <Ligne key={s.cle} s={s.valeurs} start={start} i={i} x={x} y={yy} couleur={m === 0 ? "var(--cap-ocean)" : "var(--cap-ink-3)"} />)}
            <rect x={finPresent} y={y0 + 1} width={Math.max(0, finPlot - finPresent)} height={HPAN - 1} fill="url(#rj-futur)" opacity="0.4" />
          </g>
        );
      })}

      {/* Les bandes : chaque condition, vraie ou pas */}
      {[...f.conditions.map((c, n) => ({ texte: c.texte, n })), { texte: "toutes réunies", n: -1 }].map(({ texte, n }, ligne) => {
        const y0 = yBandes + ligne * LIGNE;
        const c = n >= 0 ? f.conditions[n] : null;
        const vrai = c ? (c.masque ? (k: number) => c.masque![k] === "1" : null) : (k: number) => rj.toutes[k] === 1;
        return (
          <g key={ligne}>
            <text x={L} y={y0 + 8} fontSize="10" fill={n < 0 ? "var(--cap-ink)" : "var(--cap-ink-3)"} fontWeight={n < 0 ? 600 : 400}>
              {texte.charAt(0).toUpperCase() + texte.slice(1)}{c && !c.masque ? " (calculé seulement quand le reste est réuni)" : ""}
            </text>
            <rect x={L} y={y0 + 11} width={finPresent - L} height="6" rx="1" fill="var(--cap-surface-2)" />
            {vrai && plages(vrai, start, i).map(([a, b]) => (
              <rect key={a} x={x(a) - slot / 2} y={y0 + 11} width={(b - a + 1) * slot} height="6" fill={n < 0 ? "var(--cap-ink)" : "var(--cap-ocean)"} opacity={n < 0 ? 0.9 : 0.55} />
            ))}
            {(n < 0 || (c && !c.masque)) && rj.evenements.filter((e) => e.i >= start && e.i <= i && (e.type === "entree" || (e.type === "refus" && c && !c.masque))).map((e) => (
              <rect key={`${e.type}${e.i}`} x={x(e.i) - 1.5} y={y0 + 9} width="3" height="10" fill={e.type === "entree" ? "var(--cap-ambre)" : "var(--cap-ink-4)"} />
            ))}
          </g>
        );
      })}

      {/* Le survol */}
      {survol != null && survol >= start && survol <= i && (
        <line x1={x(survol)} x2={x(survol)} y1={g.top} y2={H - 4} stroke="var(--cap-ink-3)" strokeWidth="0.8" strokeDasharray="2 2" pointerEvents="none" />
      )}
      <rect x={L} y={0} width={Math.max(0, finPresent - L)} height={H} fill="transparent"
        onPointerMove={surMouvement} onPointerLeave={() => onSurvol(null)} />
    </svg>
  );
}

function Ligne({ s, start, i, x, y, couleur }: {
  s: (number | null)[]; start: number; i: number; x: (k: number) => number; y: (v: number) => number; couleur: string;
}) {
  let d = "";
  for (let k = start; k <= i; k++) {
    const v = s[k];
    if (v == null) continue;
    d += `${d && s[k - 1] != null ? "L" : "M"}${x(k).toFixed(1)},${y(v).toFixed(1)}`;
  }
  return <path d={d} fill="none" stroke={couleur} strokeWidth="1.4" />;
}

function Etiquette({ x, y, texte, couleur }: { x: number; y: number; texte: string; couleur: string }) {
  return (
    <g>
      <rect x={x + 2} y={y - 8} width={R - 4} height={16} rx="4" fill="var(--cap-surface)" stroke={couleur} strokeWidth="1" />
      <text x={x + 2 + (R - 4) / 2} y={y + 3.5} textAnchor="middle" fontSize="9.5" fontWeight="600" fill={couleur}>{texte}</text>
    </g>
  );
}
