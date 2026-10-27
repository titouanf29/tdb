"use client";

import { useId, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { DUR, EASE, VIEWPORT } from "@/components/design-system";
import { useMouvementReduit } from "@/components/design-system/useMouvementReduit";

/**
 * The hero's visual: one asset, drawn the way this product reads a market.
 *
 * A price line, a trend, two levels, and nothing else. It is deliberately not
 * a dashboard — the point of the whole product is that the noise has already
 * been removed before you look, and the first thing a visitor sees should
 * demonstrate that rather than describe it.
 *
 * The series is fixed, illustrative data. The landing page is public and must
 * render with the API closed, and inventing a live quote on a marketing page
 * would be worse than drawing an honest example.
 */

export interface VisualSeries {
  points: number[];
  support: number;
  resistance: number;
}

export function buildPath(
  values: number[],
  w: number,
  h: number,
  padY = 10,
  /** D'autres valeurs à faire tenir dans le cadre (les niveaux). */
  etendue: number[] = []
): { d: string; x: (i: number) => number; y: (v: number) => number } {
  const min = Math.min(...values, ...etendue);
  const max = Math.max(...values, ...etendue);
  const span = max - min || 1;
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => padY + (1 - (v - min) / span) * (h - padY * 2);
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(v).toFixed(2)}`)
    .join(" ");
  return { d, x, y };
}

const CSS_VISUEL = `@keyframes cap-direct{0%{transform:translate(-50%,-50%) scale(.6);opacity:.55}100%{transform:translate(-50%,-50%) scale(3.2);opacity:0}}
.cap-direct-onde{animation:cap-direct 2.2s cubic-bezier(.2,.6,.3,1) infinite}
.anim-off .cap-direct-onde{animation:none;opacity:0}
@media (prefers-reduced-motion: reduce){.cap-direct-onde{animation:none;opacity:0}}
.cap-niveau{opacity:0;transform:translate3d(8px,-50%,0);transition:opacity .5s ease,transform .6s cubic-bezier(.16,1,.3,1)}
.cap-niveau[data-vu="1"]{opacity:1;transform:translate3d(0,-50%,0)}
.cap-reticule{opacity:0;transition:opacity .2s}
.cap-reticule[data-on="1"]{opacity:1}`;

/** « 245,18 € » → 245.18 ; « 97 420 € » → 97420. */
function lirePrix(p: string): number {
  return parseFloat(p.replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
}

export function AnalysisVisual({
  series,
  className,
  showLevels = true,
  prix,
}: {
  series: VisualSeries;
  className?: string;
  showLevels?: boolean;
  /** Le dernier cours affiché (« 245,18 € ») : le réticule en déduit le
   *  prix sous le curseur. Sans lui, pas de réticule. */
  prix?: string;
}) {
  const boite = useRef<HTMLDivElement>(null);
  const [dessine, setDessine] = useState(false);
  const [survol, setSurvol] = useState<number | null>(null);
  const reduce = useMouvementReduit();
  const W = 800;
  const H = 300;
  // The page renders this twice. A shared gradient id is invalid HTML and
  // leaves the second instance depending on the first one's defs.
  const gradientId = `cap-fill-${useId().replace(/:/g, "")}`;

  const { d, y, areaD, trendD } = useMemo(() => {
    // Les niveaux comptent dans l'échelle : sur de vrais cours, un support
    // peut se trouver sous le plus bas des séances dessinées.
    const { d, x, y } = buildPath(series.points, W, H, 10,
      [series.support, series.resistance].filter((v) => Number.isFinite(v)));
    const areaD = `${d} L ${W} ${H} L 0 ${H} Z`;
    // A straight regression through the series: the trend, stated once.
    const n = series.points.length;
    const meanX = (n - 1) / 2;
    const meanY = series.points.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    series.points.forEach((v, i) => {
      num += (i - meanX) * (v - meanY);
      den += (i - meanX) ** 2;
    });
    const slope = den === 0 ? 0 : num / den;
    const at = (i: number) => meanY + slope * (i - meanX);
    const trendD = `M ${x(0)} ${y(at(0))} L ${x(n - 1)} ${y(at(n - 1))}`;
    return { d, y, areaD, trendD };
  }, [series]);

  const n = series.points.length;
  const dernier = series.points[n - 1];
  const pct = (v: number) => `${(y(v) / H) * 100}%`;
  const base = prix ? lirePrix(prix) : 0;
  // L'unité du cours affiché (€, $, pts), reprise sous le curseur.
  // Ancrée au début, l'expression ne parcourt la chaîne qu'une fois.
  const unite = prix?.replace(/^[\d\s,.\-−]+/, "").trim() || undefined;
  const euro = unite ? ` ${unite}` : "";
  const format = (v: number) =>
    (base * v / dernier).toLocaleString("fr-FR", { minimumFractionDigits: base < 1000 ? 2 : 0, maximumFractionDigits: base < 1000 ? 2 : 0 }) + euro;
  const bouge = (e: React.PointerEvent) => {
    const r = boite.current?.getBoundingClientRect();
    if (!r || e.pointerType === "touch") return;
    const i = Math.round(((e.clientX - r.left) / r.width) * (n - 1));
    setSurvol(Math.max(0, Math.min(n - 1, i)));
  };
  const iSurvol = survol ?? n - 1;

  return (
    <div ref={boite} className={`relative ${className ?? ""}`}
      onPointerMove={prix ? bouge : undefined} onPointerLeave={() => setSurvol(null)}>
    <style dangerouslySetInnerHTML={{ __html: CSS_VISUEL }} />
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label="Exemple d'analyse : une courbe de prix avec sa tendance, un support et une résistance"
    >
      <defs>
        {/* userSpaceOnUse rather than the default. Mapped to the path's own
            bounding box, the gradient follows the line's height, so a rising
            series ends up tinted only on its right half. Anchored to the
            viewBox it washes evenly under the whole curve. */}
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={H}>
          <stop offset="0%" stopColor="var(--cap-ocean)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--cap-ocean)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {showLevels && (
        <>
          {/* Two levels, labelled by position rather than by a legend. */}
          {/* Chaque niveau se trace de gauche à droite. */}
          {[{ v: series.resistance, c: "var(--cap-down)" }, { v: series.support, c: "var(--cap-up)" }].map((l, k) => (
            <motion.line key={k}
              x1="0" y1={y(l.v)} y2={y(l.v)}
              stroke={l.c} strokeWidth="1" strokeDasharray="4 5" opacity="0.5"
              initial={reduce ? false : { x2: 0 }}
              animate={{ x2: W }}
              transition={{ duration: 0.9, delay: k * 0.12, ease: EASE }}
            />
          ))}
        </>
      )}

      <motion.path
        d={trendD}
        stroke="var(--cap-ink-4)"
        strokeWidth="1"
        fill="none"
        initial={reduce ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={VIEWPORT}
        transition={{ duration: DUR.draw, delay: 0.5, ease: EASE }}
      />

      <motion.path
        d={areaD}
        fill={`url(#${gradientId})`}
        initial={reduce ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={VIEWPORT}
        // Only once the line has finished. Fading the fill in underneath a
        // half-drawn line puts colour where no data has been plotted yet.
        transition={{ duration: DUR.slow, delay: DUR.draw }}
      />

      {/* Une fois tracée, la courbe devient un chemin simple : le tiret animé
          (pathLength) se recalculait mal avec vector-effect à chaque rendu, et
          la courbe se retrouvait coupée avant la fin au survol. */}
      {dessine || reduce ? (
        <path d={d} fill="none" stroke="var(--cap-ocean)" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      ) : (
      <motion.path
          d={d}
          fill="none"
          stroke="var(--cap-ocean)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={reduce ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={VIEWPORT}
          transition={{ duration: DUR.draw, ease: EASE }}
          onAnimationComplete={() => setDessine(true)}
        />
      )}

      {/* A scan sweeping across as the curve is drawn.
          Not a dot riding the path: this SVG stretches with
          preserveAspectRatio="none", which turns any circle into an ellipse
          and made the marker read as a squashed oval. A vertical rule is the
          one shape that survives non-uniform scaling intact — and it says
          "this is being read left to right", which is exactly what the curve
          is doing. */}
      {!reduce && (
        <motion.line
          y1="0"
          y2={H}
          stroke="var(--cap-ocean)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          initial={{ x1: 0, x2: 0, opacity: 0 }}
          whileInView={{ x1: W, x2: W, opacity: [0, 0.45, 0.45, 0] }}
          viewport={VIEWPORT}
          transition={{
            duration: DUR.draw,
            ease: EASE,
            opacity: { duration: DUR.draw, times: [0, 0.08, 0.88, 1], ease: "linear" },
          }}
        />
      )}

    </svg>

      {/* Les éléments ronds et le texte sont en HTML, par-dessus : dans le SVG
          étiré, un cercle deviendrait une ellipse. */}
      {showLevels && [{ v: series.resistance, t: "Résistance", c: "var(--cap-down)" }, { v: series.support, t: "Support", c: "var(--cap-up)" }].map((l) => (
        <span key={l.t} aria-hidden data-vu={dessine || reduce ? "1" : "0"}
          className="cap-niveau pointer-events-none absolute right-2 rounded-full px-2 py-0.5 text-[0.68rem] font-medium"
          style={{ top: pct(l.v), color: l.c, backgroundColor: "var(--cap-surface)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}>
          {l.t}
        </span>
      ))}

      {prix && (
        <div aria-hidden className="cap-reticule pointer-events-none absolute inset-y-0" data-on={survol !== null ? "1" : "0"}
          style={{ left: `${(iSurvol / (n - 1)) * 100}%` }}>
          <span className="absolute inset-y-0 w-px" style={{ backgroundColor: "var(--cap-ink-4)" }} />
          <span className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ top: pct(series.points[iSurvol]), backgroundColor: "var(--cap-ocean)", boxShadow: "0 0 0 3px var(--cap-surface)" }} />
          <span className="cap-num absolute -translate-y-[170%] whitespace-nowrap rounded-md px-2 py-1 text-[0.72rem]"
            style={{ top: pct(series.points[iSurvol]), left: iSurvol > n * 0.8 ? "auto" : 8, right: iSurvol > n * 0.8 ? 8 : "auto",
                     backgroundColor: "var(--cap-navy)", color: "#F2F5F7" }}>
            {format(series.points[iSurvol])}
          </span>
        </div>
      )}

      {/* Le dernier cours, qui bat doucement : la courbe est « en direct ». */}
      {(dessine || reduce) && survol === null && (
        <span aria-hidden className="pointer-events-none absolute" style={{ left: "calc(100% - 6px)", top: pct(dernier) }}>
          <span className="cap-direct-onde absolute left-0 top-0 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--cap-ocean)" }} />
          <span className="absolute left-0 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ backgroundColor: "var(--cap-ocean)", boxShadow: "0 0 0 3px var(--cap-surface)" }} />
        </span>
      )}
    </div>
  );
}
