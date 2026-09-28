"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useMotionValueEvent, useScroll } from "framer-motion";
import { Heading, Text } from "@/components/design-system";
import { useEffetsActifs } from "./effets";

/**
 * Les animations des sections de la page de présentation.
 *
 * UNE SEULE ÉCRITURE PAR IMAGE ET PAR SECTION. Les effets liés au défilement
 * ne déplacent pas chaque élément en JavaScript : ils écrivent une seule
 * variable CSS (--p, de 0 à 1) sur la section, et c'est le CSS qui calcule
 * la position de chaque élément à partir d'elle. Quarante éléments qui
 * bougent coûtent donc une écriture, pas quarante.
 *
 * Tout est posé dans son état final si les animations sont coupées ou
 * réduites : le contenu ne dépend jamais du mouvement.
 */

/** Écrit la progression du défilement dans --p, sur l'élément visé. */
function useProgressionCSS<T extends HTMLElement>(offset: ["start end" | "start 85%" | "start 70%", "center center" | "end center" | "center 45%" | "end 60%"]) {
  const ref = useRef<T>(null);
  const actifs = useEffetsActifs();
  const { scrollYProgress } = useScroll({ target: ref, offset });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (actifs) ref.current?.style.setProperty("--p", v.toFixed(4));
  });
  useEffect(() => {
    ref.current?.style.setProperty("--p", actifs ? scrollYProgress.get().toFixed(4) : "1");
  }, [actifs, scrollYProgress]);
  return ref;
}

/* ── Les titres de section, mot à mot ─────────────────────────────────── */

const CSS_MOTS = `.cap-ms-mot{display:inline-block;transform:translate3d(0,105%,0);transition:transform .9s cubic-bezier(.16,1,.3,1);transition-delay:var(--d)}
.cap-ms.visible .cap-ms-mot{transform:none}
.anim-off .cap-ms-mot{transform:none;transition:none}
@media (prefers-reduced-motion: reduce){.cap-ms-mot{transform:none;transition:none}}`;

/**
 * Chaque mot monte depuis sous sa ligne, comme une ligne de texte qui sort
 * d'un masque, quand le titre entre à l'écran. Le texte est le même, mot pour
 * mot ; seule son arrivée change.
 */
export function MotsAuScroll({ texte }: { texte: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const vu = useInView(ref, { once: true, amount: 0.6 });
  const mots = texte.split(" ");
  return (
    <span ref={ref} className={`cap-ms${vu ? " visible" : ""}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS_MOTS }} />
      {mots.map((m, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <span className="cap-ms-mot" style={{ ["--d" as string]: `${i * 55}ms` }}>{m}</span>
          {i < mots.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

/* ── Du bruit au signal ───────────────────────────────────────────────── */

const GROUPES = ["Tendance", "Momentum", "Risque", "Contexte"];

// Des lectures de marché éparpillées, chacune rattachée à la famille qu'elle
// informe. Positions fixes (en % du cadre) : un tirage aléatoire changerait
// à chaque rendu et ne correspondrait plus entre serveur et navigateur.
const LECTURES: [string, number, number, number][] = [
  ["EMA 200", 0, 8, 10], ["+2,4 %", 0, 58, 6], ["ADX 27", 0, 30, 28], ["Support", 0, 78, 22],
  ["Plus haut 52 s.", 0, 44, 16], ["Pente ↗", 0, 88, 38],
  ["RSI 71", 1, 20, 44], ["MACD ↗", 1, 70, 48], ["Stoch 82", 1, 4, 58], ["Momentum", 1, 52, 34], ["Volume ×1,8", 1, 84, 62],
  ["ATR 3,1", 2, 36, 64], ["VIX 18", 2, 62, 76], ["Stop −3 %", 2, 12, 82], ["Bollinger", 2, 86, 88], ["Écart-type", 2, 46, 90],
  ["Fed", 3, 24, 72], ["Taux 10 ans", 3, 72, 20], ["Dollar", 3, 6, 36], ["Pétrole", 3, 54, 84], ["PER 24", 3, 92, 8], ["CAC 40", 3, 38, 4],
];

const CSS_SIGNAL = `.cap-signal{container-type:size;--p:0}
@keyframes cap-flotte{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-5px,0)}}
.cap-lecture{position:absolute;left:0;top:0;white-space:nowrap;will-change:transform,opacity;
  transform:translate3d(calc(var(--x) * 1cqw + (var(--tx) - var(--x)) * 1cqw * var(--q)),calc(var(--y) * 1cqh + (var(--ty) - var(--y)) * 1cqh * var(--q)),0) scale(calc(1 - var(--q) * .45));
  opacity:calc(1 - var(--q) * 1.15);--q:clamp(0,(var(--p) - var(--r)) * 2.2,1)}
.cap-lecture > span{display:inline-block;animation:cap-flotte var(--f) ease-in-out infinite}
.cap-groupe{opacity:clamp(0,(var(--p) - .45 - var(--g) * .06) * 4,1);transform:translate3d(calc((1 - clamp(0,(var(--p) - .45 - var(--g) * .06) * 4,1)) * -18px),0,0)}
.cap-jauge{transform-origin:0 50%;transform:scaleX(clamp(0,(var(--p) - .55 - var(--g) * .06) * 3,1))}
.anim-off .cap-lecture > span{animation:none}
@media (prefers-reduced-motion: reduce){.cap-lecture > span{animation:none}}`;

/**
 * Des lectures de marché éparpillées — RSI, taux, volume, Fed — qui, au fil
 * du défilement, rejoignent chacune leur famille : Tendance, Momentum,
 * Risque, Contexte. Le bruit devient une grille de lecture, et c'est le
 * lecteur qui le fait advenir en descendant.
 */
export function NuageDeDonnees() {
  const ref = useProgressionCSS<HTMLDivElement>(["start 85%", "center 45%"]);
  return (
    <div ref={ref} className="cap-signal relative aspect-[4/3] w-full">
      <style dangerouslySetInnerHTML={{ __html: CSS_SIGNAL }} />
      {LECTURES.map(([t, g, x, y], i) => (
        <span key={t} aria-hidden className="cap-lecture"
          style={{
            ["--x" as string]: x, ["--y" as string]: y,
            ["--tx" as string]: 8, ["--ty" as string]: 17 + g * 22,
            ["--r" as string]: (0.05 + (i % 6) * 0.05).toFixed(2),
            ["--f" as string]: `${4 + (i % 5)}s`,
          }}>
          <span className="rounded-full px-2.5 py-1 text-[0.78rem] cap-num"
            style={{ backgroundColor: "var(--cap-surface)", color: "var(--cap-ink-2)", boxShadow: "inset 0 0 0 1px var(--cap-line), 0 4px 14px -8px rgba(11,23,38,.25)" }}>
            {t}
          </span>
        </span>
      ))}

      <div className="absolute inset-0 flex flex-col justify-center gap-4 sm:gap-5">
        {GROUPES.map((g, i) => (
          <div key={g} className="cap-groupe flex items-center gap-4" style={{ ["--g" as string]: i }}>
            <span aria-hidden className="cap-jauge h-[2px] w-10 shrink-0 rounded-full" style={{ backgroundColor: "var(--cap-ocean)", ["--g" as string]: i }} />
            <span className="text-[1.15rem] font-semibold tracking-[-0.015em] sm:text-[1.35rem]"
              style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}>
              {g}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Le parcours de « Fonctionnement » ────────────────────────────────── */

const CSS_PARCOURS = `.cap-parcours{--p:0}
.cap-trace{stroke-dasharray:1;stroke-dashoffset:calc(1 - var(--p))}
.cap-etape{transition:transform .5s cubic-bezier(.16,1,.3,1),box-shadow .5s,background-color .5s}
.cap-etape[data-actif="1"]{transform:translate3d(0,-6px,0);background-color:var(--cap-surface);box-shadow:0 18px 40px -24px rgba(11,23,38,.35), inset 0 0 0 1px var(--cap-line)}
.cap-etape .cap-num-etape{color:var(--cap-ocean);box-shadow:inset 0 0 0 1px var(--cap-line);transition:background-color .5s,color .5s,box-shadow .5s}
.cap-etape[data-actif="1"] .cap-num-etape{background-color:var(--cap-ocean);color:#fff;box-shadow:0 0 0 6px color-mix(in srgb, var(--cap-ocean) 18%, transparent)}`;

/**
 * La ligne du parcours se trace au fil du défilement, un point la parcourt,
 * et chaque étape s'allume quand le point l'atteint.
 */
const TRACE = "M 20 70 C 120 10, 230 10, 333 60 S 560 110, 666 60 S 880 10, 980 50";

export function ParcoursDefilant({ etapes }: { etapes: { n: string; title: string; body: string }[] }) {
  const ref = useProgressionCSS<HTMLDivElement>(["start 70%", "end 60%"]);
  const actifs = useEffetsActifs();
  const chemin = useRef<SVGPathElement>(null);
  const point = useRef<HTMLSpanElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 60%"] });
  const [atteinte, setAtteinte] = useState(actifs ? 0 : etapes.length);

  // Le point suit le vrai tracé : sa position est lue sur la courbe, puis
  // ramenée à la taille affichée (le tracé est dessiné en 1000 × 120).
  const place = (v: number) => {
    const c = chemin.current, pt = point.current, svg = c?.ownerSVGElement;
    if (!c || !pt || !svg) return;
    const p = c.getPointAtLength(c.getTotalLength() * v);
    const sx = svg.clientWidth / 1000, sy = svg.clientHeight / 120;
    pt.style.transform = `translate3d(${(p.x * sx).toFixed(1)}px, ${(p.y * sy).toFixed(1)}px, 0) translate(-50%, -50%)`;
  };
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (!actifs) return;
    place(v);
    const n = v > 0.78 ? 3 : v > 0.42 ? 2 : v > 0.08 ? 1 : 0;
    setAtteinte((a) => (a === n ? a : n));
  });
  useEffect(() => {
    place(actifs ? scrollYProgress.get() : 1);
    if (!actifs) setAtteinte(etapes.length);
    const surTaille = () => place(actifs ? scrollYProgress.get() : 1);
    window.addEventListener("resize", surTaille);
    return () => window.removeEventListener("resize", surTaille);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actifs, etapes.length]);

  return (
    <div ref={ref} className="cap-parcours">
      <style dangerouslySetInnerHTML={{ __html: CSS_PARCOURS }} />
      <div className="relative mx-auto mt-16 hidden h-[120px] sm:block" aria-hidden>
        <svg viewBox="0 0 1000 120" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <path d={TRACE} fill="none" stroke="var(--cap-line-strong)" strokeWidth="1.5" strokeDasharray="4 7" vectorEffect="non-scaling-stroke" />
          <path ref={chemin} className="cap-trace" pathLength={1} d={TRACE} fill="none"
            // Sans vector-effect : avec lui, Chrome mesure les tirets à
            // l'écran et le tracé s'arrêtait avant le bout.
            stroke="var(--cap-ocean)" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span ref={point} className="absolute left-0 top-0 block h-3.5 w-3.5 rounded-full"
          style={{ backgroundColor: "var(--cap-ocean)", boxShadow: "0 0 0 5px color-mix(in srgb, var(--cap-ocean) 20%, transparent)", willChange: "transform" }} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {etapes.map((s, i) => (
          <div key={s.n} className="cap-etape h-full rounded-[18px] px-5 py-7 sm:px-7" data-actif={atteinte > i ? "1" : "0"}>
            <span className="cap-num cap-num-etape inline-flex h-9 w-9 items-center justify-center rounded-full text-[0.8rem]"
>
              {s.n}
            </span>
            <Heading level={2} className="mt-4">{s.title}</Heading>
            <Text size="body" className="mt-3">{s.body}</Text>
          </div>
        ))}
      </div>
    </div>
  );
}
