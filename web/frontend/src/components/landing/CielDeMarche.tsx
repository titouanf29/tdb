"use client";

import { useEffect, useMemo, useState } from "react";
import {
  motion, useMotionValue, useScroll, useSpring, useTransform, type MotionValue,
} from "framer-motion";
import { marketAPI } from "@/lib/api";
import { Nuage, cielEnCours, useEffetsActifs } from "./effets";

/**
 * Le marché, caché dans les nuages.
 *
 * Le ciel du haut de page n'est plus seulement un décor : des chandeliers
 * poussent à l'horizon quand les nuages s'ouvrent, une ligne de cours dorée
 * se dessine à travers eux, et des nuages passent DEVANT le graphique — on le
 * devine plus qu'on ne le lit, exactement comme un marché avant qu'on ait
 * appris à le lire. Des bulles de vrais cours flottent entre les nuages.
 *
 * Tout bouge en profondeur avec la souris (les plans proches plus que les
 * lointains) et s'enfonce quand on descend. Le graphique est illustratif ;
 * les bulles, elles, affichent les cours réels du moment.
 */

/* ── La série ─────────────────────────────────────────────────────────── */

type Bougie = { o: number; c: number; h: number; l: number };

/** Une marche aléatoire à graine fixe : la même à chaque visite, tendance haussière. */
function serie(n: number, graine: number): Bougie[] {
  let s = graine;
  const alea = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const out: Bougie[] = [];
  let prix = 100;
  for (let i = 0; i < n; i++) {
    const o = prix;
    const c = o + (alea() - 0.42) * 7;
    const h = Math.max(o, c) + alea() * 3.5;
    const l = Math.min(o, c) - alea() * 3.5;
    out.push({ o, c, h, l });
    prix = c;
  }
  return out;
}

/* ── La souris, en profondeur ─────────────────────────────────────────── */

function useSouris() {
  const x = useMotionValue(0), y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 50, damping: 18 }), sy = useSpring(y, { stiffness: 50, damping: 18 });
  const actifs = useEffetsActifs();
  useEffect(() => {
    if (!actifs) return;
    const bouge = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x.set((e.clientX / window.innerWidth) * 2 - 1);
      y.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", bouge, { passive: true });
    return () => window.removeEventListener("pointermove", bouge);
  }, [actifs, x, y]);
  return { sx, sy };
}

function useProfondeur(sx: MotionValue<number>, sy: MotionValue<number>, px: number) {
  return { x: useTransform(sx, (v) => v * -px), y: useTransform(sy, (v) => v * -px * 0.6) };
}

/* ── Le graphique dans le ciel ────────────────────────────────────────── */

const COULEURS = { hausse: "#23A884", baisse: "#D9675A", or: "#E8A820" };

export function CielDeMarche() {
  const actifs = useEffetsActifs();
  const { sx, sy } = useSouris();
  const loin = useProfondeur(sx, sy, 10);
  const proche = useProfondeur(sx, sy, 34);
  const { scrollY } = useScroll();
  const descente = useTransform(scrollY, [0, 700], [0, 140]);
  const fondu = useTransform(scrollY, [0, 600], [1, 0.25]);

  const [attente] = useState(() => (cielEnCours() ? 1.0 : 0.15));
  const bougies = useMemo(() => serie(34, 20250927), []);
  const W = 1360, H = 420, pas = W / bougies.length, larg = pas * 0.52;
  const min = Math.min(...bougies.map((b) => b.l)), max = Math.max(...bougies.map((b) => b.h));
  const y = (v: number) => 30 + (1 - (v - min) / (max - min)) * (H - 60);
  const ligne = bougies.map((b, i) => `${i ? "L" : "M"}${(i * pas + pas / 2).toFixed(1)},${y(b.c).toFixed(1)}`).join(" ");
  const dernier = bougies[bougies.length - 1];
  const variation = ((dernier.c / bougies[0].o - 1) * 100);

  return (
    <motion.div aria-hidden className="pointer-events-none absolute inset-x-0 top-[10vh] h-[88vh]"
      style={actifs ? { y: descente, opacity: fondu } : undefined}>
      {/* Le graphique, au loin — estompé au centre, là où se lit le titre. */}
      <motion.div className="absolute inset-0"
        style={{
          ...(actifs ? { x: loin.x, y: loin.y } : {}),
          maskImage: "radial-gradient(ellipse 46% 56% at 50% 42%, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.3) 55%, black 95%)",
          WebkitMaskImage: "radial-gradient(ellipse 46% 56% at 50% 42%, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.3) 55%, black 95%)",
        }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full" style={{ opacity: 0.62 }}>
          <defs>
            <filter id="cm-halo" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="f" />
              <feMerge><feMergeNode in="f" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="cm-doux"><feGaussianBlur stdDeviation="0.9" /></filter>
            <linearGradient id="cm-h" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={COULEURS.hausse} stopOpacity="0.85" />
              <stop offset="100%" stopColor={COULEURS.hausse} stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id="cm-b" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={COULEURS.baisse} stopOpacity="0.8" />
              <stop offset="100%" stopColor={COULEURS.baisse} stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Les chandeliers poussent depuis l'horizon, l'un après l'autre. */}
          <g filter="url(#cm-doux)">
            {bougies.map((b, i) => {
              const hausse = b.c >= b.o;
              const cx = i * pas + pas / 2;
              const haut = y(Math.max(b.o, b.c)), bas = y(Math.min(b.o, b.c));
              return (
                <motion.g key={i} style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
                  {...(actifs ? {
                    initial: { scaleY: 0, opacity: 0 },
                    animate: { scaleY: 1, opacity: 1 },
                    transition: { duration: 0.7, delay: attente + i * 0.045, ease: [0.16, 1, 0.3, 1] },
                  } : {})}>
                  <line x1={cx} x2={cx} y1={y(b.h)} y2={y(b.l)} stroke={hausse ? COULEURS.hausse : COULEURS.baisse} strokeOpacity="0.55" strokeWidth="2" />
                  <rect x={cx - larg / 2} y={haut} width={larg} height={Math.max(3, bas - haut)} rx={larg / 3}
                    fill={`url(#${hausse ? "cm-h" : "cm-b"})`} />
                </motion.g>
              );
            })}
          </g>

          {/* La ligne de cours dorée, qui se dessine à travers le ciel. */}
          <motion.path d={ligne} fill="none" stroke={COULEURS.or} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
            filter="url(#cm-halo)" vectorEffect="non-scaling-stroke"
            {...(actifs ? {
              initial: { pathLength: 0 },
              animate: { pathLength: 1 },
              transition: { duration: 2.4, delay: attente + 0.5, ease: [0.45, 0, 0.2, 1] },
            } : {})} />
        </svg>

        {/* Le point vivant au bout de la ligne, et sa variation. */}
        <motion.div className="absolute"
          style={{ left: `${((bougies.length - 0.5) * pas / W) * 100}%`, top: `${(y(dernier.c) / H) * 100}%` }}
          {...(actifs ? { initial: { opacity: 0, scale: 0.4 }, animate: { opacity: 1, scale: 1 }, transition: { delay: attente + 2.8, duration: 0.5 } } : {})}>
          <span className="absolute -left-[7px] -top-[7px] h-[14px] w-[14px] rounded-full" style={{ backgroundColor: COULEURS.or, boxShadow: `0 0 18px ${COULEURS.or}` }} />
          {actifs && (
            <motion.span className="absolute -left-[7px] -top-[7px] h-[14px] w-[14px] rounded-full" style={{ backgroundColor: COULEURS.or }}
              animate={{ scale: [1, 2.8], opacity: [0.6, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }} />
          )}
        </motion.div>
        <motion.div className="cap-num absolute hidden rounded-full px-2.5 py-1 text-[0.8rem] font-medium sm:block"
          style={{ right: "1.5%", top: `calc(${(y(dernier.c) / H) * 100}% - 40px)`, backgroundColor: "rgba(255,255,255,0.72)", color: "#0B6B4F",
                   boxShadow: "0 6px 20px -8px rgba(11,23,38,0.35)", backdropFilter: "blur(6px)" }}
          {...(actifs ? { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { delay: attente + 3, duration: 0.6 } } : {})}>
          ▲ +{variation.toFixed(1).replace(".", ",")} %
        </motion.div>
      </motion.div>

      {/* Des nuages passent DEVANT le graphique : on le devine à travers. */}
      <motion.div className="absolute inset-0" style={actifs ? { x: proche.x, y: proche.y } : undefined}>
        {[
          { left: "-6%", top: "38%", w: "34%", forme: 0, duree: 70, o: 0.9 },
          { left: "58%", top: "52%", w: "30%", forme: 2, duree: 90, o: 0.85 },
          { left: "26%", top: "72%", w: "40%", forme: 1, duree: 110, o: 0.8 },
        ].map((n, i) => (
          <motion.div key={i} className="absolute" style={{ left: n.left, top: n.top, width: n.w, opacity: n.o }}
            {...(actifs ? { animate: { x: ["0%", "18%", "0%"] }, transition: { duration: n.duree, repeat: Infinity, ease: "easeInOut" } } : {})}>
            <Nuage forme={n.forme} retourne={i % 2 === 1} flou={3.4} style={{ width: "100%", height: "auto" }} />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

/* ── Les bulles de cours ──────────────────────────────────────────────── */

const BULLES: { s: string; nom: string; cote: "g" | "d"; top: string; px: number; retard: number }[] = [
  // En vh : le premier écran, quelle que soit la hauteur du haut de page.
  // À droite, rien au-dessus de 48vh : c'est là que la ligne dorée finit.
  { s: "BTC-USD", nom: "Bitcoin", cote: "g", top: "30vh", px: 26, retard: 0 },
  { s: "^FCHI", nom: "CAC 40", cote: "d", top: "52vh", px: 20, retard: 0.15 },
  { s: "GC=F", nom: "Or", cote: "g", top: "60vh", px: 40, retard: 0.3 },
  { s: "NVDA", nom: "Nvidia", cote: "d", top: "72vh", px: 34, retard: 0.45 },
  { s: "EURUSD=X", nom: "Euro / dollar", cote: "g", top: "84vh", px: 18, retard: 0.6 },
  { s: "TTE.PA", nom: "TotalEnergies", cote: "d", top: "90vh", px: 30, retard: 0.75 },
];

/** De vrais cours qui flottent entre les nuages, chacun à sa profondeur. */
export function BullesDeCours() {
  const actifs = useEffetsActifs();
  const { sx, sy } = useSouris();
  const [prix, setPrix] = useState<Record<string, { price: number; change: number }>>({});
  const [attente] = useState(() => (cielEnCours() ? 1.6 : 0.5));

  useEffect(() => {
    marketAPI.getPrices(BULLES.map((b) => b.s)).then((d) => setPrix(d.prices ?? {})).catch(() => {});
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
      {BULLES.filter((b) => prix[b.s]?.price).map((b, i) => (
        <Bulle key={b.s} b={b} p={prix[b.s]} sx={sx} sy={sy} actifs={actifs} delai={attente + b.retard} i={i} />
      ))}
    </div>
  );
}

function Bulle({ b, p, sx, sy, actifs, delai, i }: {
  b: (typeof BULLES)[number]; p: { price: number; change: number };
  sx: MotionValue<number>; sy: MotionValue<number>; actifs: boolean; delai: number; i: number;
}) {
  const { x, y } = useProfondeur(sx, sy, b.px);
  const hausse = p.change >= 0;
  const position = b.cote === "g" ? { left: `${3 + (i % 3) * 2}%` } : { right: `${3 + (i % 3) * 2}%` };
  return (
    <motion.div className="absolute" style={{ top: b.top, ...position, ...(actifs ? { x, y } : {}) }}>
      <motion.div
        className="flex items-center gap-2 rounded-full px-3.5 py-2 text-[0.8rem]"
        style={{ backgroundColor: "rgba(255,255,255,0.62)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                 boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.8), 0 10px 30px -12px rgba(11,23,38,0.35)", color: "var(--cap-ink)" }}
        {...(actifs ? {
          initial: { opacity: 0, y: 30, scale: 0.8, filter: "blur(8px)" },
          animate: { opacity: 1, y: [0, -7, 0], scale: 1, filter: "blur(0px)" },
          transition: { opacity: { delay: delai, duration: 0.7 }, scale: { delay: delai, duration: 0.7 }, filter: { delay: delai, duration: 0.7 },
                        y: { delay: delai, duration: 5 + (i % 3), repeat: Infinity, ease: "easeInOut" } },
        } : {})}>
        <span style={{ color: "var(--cap-ink-2)" }}>{b.nom}</span>
        <span className="cap-num font-medium">{p.price.toLocaleString("fr-FR", { maximumFractionDigits: p.price < 10 ? 4 : 2 })}</span>
        <span className="cap-num" style={{ color: hausse ? "var(--cap-up)" : "var(--cap-down)" }}>
          {hausse ? "▲" : "▼"} {Math.abs(p.change).toFixed(2).replace(".", ",")} %
        </span>
      </motion.div>
    </motion.div>
  );
}

/* ── Le marché derrière la couche de nuages ───────────────────────────── */

/**
 * Au centre d'une traversée : quand les nuages s'écartent, des chandeliers
 * poussent et une ligne dorée les relie — puis tout disparaît quand la
 * couche est passée.
 */
export function MarcheCache({ p }: { p: MotionValue<number> }) {
  const bougies = useMemo(() => serie(16, 777), []);
  const W = 640, H = 220, pas = W / bougies.length, larg = pas * 0.5;
  const min = Math.min(...bougies.map((b) => b.l)), max = Math.max(...bougies.map((b) => b.h));
  const y = (v: number) => 12 + (1 - (v - min) / (max - min)) * (H - 24);
  const ligne = bougies.map((b, i) => `${i ? "L" : "M"}${(i * pas + pas / 2).toFixed(1)},${y(b.c).toFixed(1)}`).join(" ");
  const opacite = useTransform(p, [0.2, 0.38, 0.62, 0.8], [0, 1, 1, 0]);
  const trace = useTransform(p, [0.3, 0.55], [0, 1]);
  const echelle = useTransform(p, [0.2, 0.5], [0.85, 1]);

  return (
    // Le centrage vit sur un conteneur à part : un `scale` animé réécrit la
    // transformation de l'élément et annulait le -translate-x-1/2.
    <div className="absolute left-1/2 top-[46%] w-[min(880px,88vw)] -translate-x-1/2 -translate-y-1/2">
    <motion.div style={{ opacity: opacite, scale: echelle }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" style={{ overflow: "visible" }}>
        <defs>
          <filter id="mc-halo" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="f" />
            <feMerge><feMergeNode in="f" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {bougies.map((b, i) => <BougieCachee key={i} b={b} i={i} n={bougies.length} p={p} x={i * pas + pas / 2} larg={larg} y={y} />)}
        <motion.path d={ligne} fill="none" stroke={COULEURS.or} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
          filter="url(#mc-halo)" style={{ pathLength: trace }} />
      </svg>
    </motion.div>
    </div>
  );
}

function BougieCachee({ b, i, n, p, x, larg, y }: {
  b: Bougie; i: number; n: number; p: MotionValue<number>; x: number; larg: number; y: (v: number) => number;
}) {
  const debut = 0.22 + (i / n) * 0.22;
  const scaleY = useTransform(p, [debut, debut + 0.1], [0, 1]);
  const hausse = b.c >= b.o;
  const couleur = hausse ? COULEURS.hausse : COULEURS.baisse;
  const haut = y(Math.max(b.o, b.c)), bas = y(Math.min(b.o, b.c));
  return (
    <motion.g style={{ scaleY, transformBox: "fill-box", transformOrigin: "50% 100%" }}>
      <line x1={x} x2={x} y1={y(b.h)} y2={y(b.l)} stroke={couleur} strokeOpacity="0.6" strokeWidth="1.6" />
      <rect x={x - larg / 2} y={haut} width={larg} height={Math.max(2, bas - haut)} rx={larg / 3} fill={couleur} fillOpacity="0.7" />
    </motion.g>
  );
}
