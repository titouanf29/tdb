"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useAnimationsEnabled, useMouvementReduit } from "@/components/design-system";
import { hasard, bollinger as calcBollinger, ema as calcEma, fmt, macd as calcMacd, rsi as calcRsi, sma as calcSma, type Bougie } from "@/lib/cours/marche";

/**
 * Le graphique des leçons.
 *
 * Un seul composant pour toutes les leçons, qui dessine des bougies (ou une
 * ligne) et ce qu'une leçon veut montrer par-dessus : moyennes, bandes de
 * Bollinger, niveaux, zones, lignes de tendance, annotations, marqueurs ; et
 * dessous, le RSI, le MACD ou le volume. Survoler une bougie dit ses quatre
 * prix en clair. `jusqua` n'affiche que les premières bougies : une leçon peut
 * faire avancer le temps, comme sur une vraie plateforme.
 *
 * Il s'anime : quand il arrive à l'écran, les bougies apparaissent de gauche à
 * droite, puis les lignes se tracent, les zones apparaissent en fondu et les
 * marques arrivent avec un léger rebond. Un élément qui change d'une étape à
 * l'autre (dans les scènes) s'anime à son tour. `vivant` fait vibrer la
 * dernière bougie comme un cours en direct. Rien ne bouge si l'utilisateur a
 * coupé les animations (sur le site ou sur son appareil).
 */

export type Niveau = { prix: number; label?: string; couleur?: string; pointille?: boolean; epaisseur?: number; zone?: number };
export type Trait = { de: [number, number]; a: [number, number]; label?: string; couleur?: string; prolonger?: boolean; pointille?: boolean };
export type Note = { i: number; prix: number; texte: string; couleur?: string; dessous?: boolean };
export type Marque = { i: number; prix?: number; type: "achat" | "vente" | "point" | "croix"; label?: string };
export type Zone = { i0: number; i1: number; p0: number; p1: number; couleur?: string; label?: string };

export interface ConfigGraphique {
  bougies: Bougie[];
  type?: "bougies" | "ligne";
  moyennes?: { n: number; type?: "sma" | "ema"; couleur?: string; label?: string }[];
  bollinger?: { n?: number; k?: number };
  niveaux?: Niveau[];
  traits?: Trait[];
  notes?: Note[];
  marques?: Marque[];
  zones?: Zone[];
  panneaux?: ("rsi" | "macd" | "volume")[];
  rsiSeuils?: number[];
  /** N'affiche que les bougies 0 à jusqua (le reste est caché, comme le futur). */
  jusqua?: number;
  /** Une bougie à mettre en avant (cadre ambre). */
  surligne?: number[];
  hauteur?: number;
  /** Le prix sous le pointeur, au clic (pour les exercices). */
  onClic?: (prix: number, i: number) => void;
  /** Masque l'info-bulle de survol (exercices où elle donnerait la réponse). */
  sansSurvol?: boolean;
  /** Unité affichée sous le survol : « jour », « heure »… */
  unite?: string;
  ariaLabel?: string;
  /** La dernière bougie bouge comme un cours en direct. */
  vivant?: boolean;
  /** false : pas d'apparition des bougies à l'arrivée à l'écran (les exercices, par exemple). */
  apparition?: boolean;
}

const COUL = ["var(--cap-ocean)", "var(--cap-amber-ink)", "var(--cap-ink-3)", "var(--cap-cyan)"];
const G = 6, D = 66;

function graduations(min: number, max: number, n = 4): number[] {
  const brut = (max - min) / n;
  if (!(brut > 0)) return [min];
  const p = Math.pow(10, Math.floor(Math.log10(brut)));
  const pas = [1, 2, 2.5, 5, 10].map((k) => k * p).find((k) => k >= brut) ?? brut;
  const out: number[] = [];
  for (let v = Math.ceil(min / pas) * pas; v <= max + 1e-9; v += pas) out.push(Number(v.toPrecision(12)));
  return out;
}

export function GraphiqueEcole(cfg: ConfigGraphique) {
  const boite = useRef<HTMLDivElement | null>(null);
  const [W, setW] = useState(640);
  const [survol, setSurvol] = useState<number | null>(null);
  const reduit = useMouvementReduit();
  const [animOn] = useAnimationsEnabled();
  const calme = reduit || !animOn;
  // L'apparition : null tant qu'on ne sait pas (tout est affiché, comme au
  // rendu du serveur) ; 0 pour un graphique encore hors de l'écran ; puis la
  // part dévoilée, de 0 à 1, qui avance image par image : un balayage continu
  // de gauche à droite, pas des bougies qui sautent une à une.
  const [prog, setProg] = useState<number | null>(null);
  const uid = useId().replace(/:/g, "");
  const [introFinie, setIntroFinie] = useState(true);
  const [tic, setTic] = useState(0);
  // « Revoir » : rejoue l'apparition et l'entrée des éléments.
  const [rejeu, setRejeu] = useState(0);

  useEffect(() => {
    const el = boite.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = cfg.bougies.length;
  const finCfg = Math.min(n - 1, cfg.jusqua ?? n - 1);

  useEffect(() => {
    const el = boite.current;
    if (!el || calme || cfg.apparition === false || typeof IntersectionObserver === "undefined") {
      // « Réduire les animations » n'est connu qu'après le premier rendu : une
      // apparition déjà commencée doit alors laisser place au graphique entier.
      setProg(null);
      setIntroFinie(true);
      return;
    }
    let raf = 0;
    const lancer = () => {
      setIntroFinie(false);
      const t0 = performance.now();
      // Lent et régulier, avec un départ et une arrivée en douceur : on doit
      // pouvoir suivre ce qui se passe.
      const duree = Math.min(5000, 1800 + n * 40);
      const pas = (t: number) => {
        const f = Math.min(1, (t - t0) / duree);
        setProg(-(Math.cos(Math.PI * f) - 1) / 2);
        if (f < 1) raf = requestAnimationFrame(pas);
        else { setProg(null); setIntroFinie(true); }
      };
      raf = requestAnimationFrame(pas);
    };
    const r = el.getBoundingClientRect();
    if (rejeu > 0 || (r.top < window.innerHeight * 0.92 && r.bottom > 0)) { lancer(); return () => cancelAnimationFrame(raf); }
    setProg(0);
    setIntroFinie(false);
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { io.disconnect(); lancer(); }
    }, { threshold: 0.25 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
    // Une seule apparition, au premier passage à l'écran.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calme, rejeu]);

  // Le cours en direct : la dernière bougie visible respire autour de sa clôture.
  useEffect(() => {
    if (!cfg.vivant || calme || !introFinie) return;
    const id = window.setInterval(() => setTic((t) => t + 1), 1100);
    return () => window.clearInterval(id);
  }, [cfg.vivant, calme, introFinie]);

  const fin = finCfg;
  const bougies = useMemo(() => {
    if (!cfg.vivant || tic === 0) return cfg.bougies;
    const b = cfg.bougies[finCfg];
    const r = hasard(tic * 7919 + 13);
    const amp = (b.h - b.l) * 0.35 || Math.abs(b.c) * 0.002;
    const c = b.c + (r() - 0.5) * amp;
    const copie = cfg.bougies.slice();
    copie[finCfg] = { ...b, c, h: Math.max(b.h, c), l: Math.min(b.l, c) };
    return copie;
  }, [cfg.bougies, cfg.vivant, tic, finCfg]);
  const closes = useMemo(() => bougies.map((b) => b.c), [bougies]);
  const etroit = W < 520;
  const HP = cfg.hauteur ?? (etroit ? 230 : 300);
  const HPAN = etroit ? 100 : 124;
  const panneaux = cfg.panneaux ?? [];

  const ind = useMemo(() => {
    const moy = (cfg.moyennes ?? []).map((m) => (m.type === "ema" ? calcEma(closes, m.n) : calcSma(closes, m.n)));
    const bol = cfg.bollinger ? calcBollinger(closes, cfg.bollinger.n ?? 20, cfg.bollinger.k ?? 2) : null;
    const r = panneaux.includes("rsi") ? calcRsi(closes) : null;
    const m = panneaux.includes("macd") ? calcMacd(closes) : null;
    return { moy, bol, r, m };
  }, [closes, cfg.moyennes, cfg.bollinger, panneaux]);

  // L'échelle couvre TOUTE la série, visible ou non : quand le temps avance,
  // le graphique ne saute pas, et la place de la suite est déjà là.
  const echelle = useMemo(() => {
    let lo = Infinity, hi = -Infinity;
    for (const b of bougies) { lo = Math.min(lo, b.l); hi = Math.max(hi, b.h); }
    for (const s of ind.moy) for (const v of s) if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    if (ind.bol) for (const s of [ind.bol.haut, ind.bol.bas]) for (const v of s) if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    for (const nv of cfg.niveaux ?? []) { lo = Math.min(lo, nv.prix - (nv.zone ?? 0) / 2); hi = Math.max(hi, nv.prix + (nv.zone ?? 0) / 2); }
    for (const z of cfg.zones ?? []) { lo = Math.min(lo, z.p0, z.p1); hi = Math.max(hi, z.p0, z.p1); }
    const pad = (hi - lo) * 0.08 || 1;
    return { lo: lo - pad, hi: hi + pad };
  }, [bougies, ind, cfg.niveaux, cfg.zones]);

  // Le même nombre de décimales sur tout l'axe, d'après l'écart entre deux graduations.
  const grads = graduations(echelle.lo, echelle.hi);
  const pasAxe = grads.length > 1 ? grads[1] - grads[0] : 1;
  // Assez de décimales pour écrire le pas exactement : 2,5 en demande une.
  let decAxe = 0;
  while (decAxe < 5 && Math.abs(pasAxe * 10 ** decAxe - Math.round(pasAxe * 10 ** decAxe)) > 1e-6) decAxe++;
  const plotW = W - G - D;
  // Deux niveaux proches : la seconde étiquette passe sous sa ligne plutôt que
  // de recouvrir la première.
  const placesEtiquettes = useMemo(() => {
    const yy = (p: number) => 8 + (1 - (p - echelle.lo) / (echelle.hi - echelle.lo)) * (HP - 16);
    const nv = cfg.niveaux ?? [];
    const ordre = nv.map((n, k) => ({ k, y: yy(n.prix) })).sort((a, b) => a.y - b.y);
    const out: number[] = [];
    let derniere = -Infinity;
    for (const o of ordre) {
      let pos = o.y - 6;
      if (pos - derniere < 15) pos = o.y + 16;
      out[o.k] = pos;
      derniere = pos;
    }
    return out;
  }, [cfg.niveaux, echelle, HP]);
  const slot = plotW / n;
  const x = (i: number) => G + (i + 0.5) * slot;
  const y = (p: number) => 8 + (1 - (p - echelle.lo) / (echelle.hi - echelle.lo)) * (HP - 16);
  const corps = Math.max(1.2, slot * 0.64);
  const finX = x(fin) + slot / 2;
  const finXCfg = x(finCfg) + slot / 2;
  // Un élément après l'autre, sans faire attendre plus de quelques secondes.
  const nbZones = (cfg.zones ?? []).length, nbNiveaux = (cfg.niveaux ?? []).length;
  const delai = (k: number) => `${Math.min(k * 0.6, 2.4)}s`;
  // Le bord du balayage, en pixels, et ce qui est déjà passé dessous.
  const bord = prog == null ? null : G + prog * (finXCfg - G);
  const passe = (i: number) => bord == null || x(i) <= bord;
  const masque = prog == null ? undefined : `url(#ge-m-${uid})`;
  const yPan0 = HP + 10;
  const H = yPan0 + panneaux.length * (HPAN + 10);

  const chemin = (s: (number | null)[], yy: (v: number) => number, max = fin) => {
    let d = "";
    for (let i = 0; i <= max; i++) {
      const v = s[i];
      if (v == null) continue;
      d += `${d && s[i - 1] != null ? "L" : "M"}${x(i).toFixed(1)},${yy(v).toFixed(1)}`;
    }
    return d;
  };

  const surDeplacement = (e: React.PointerEvent<SVGRectElement>) => {
    const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * W;
    const i = Math.floor((mx - G) / slot);
    setSurvol(i >= 0 && i <= fin ? i : null);
  };
  const surClic = (e: React.MouseEvent<SVGRectElement>) => {
    if (!cfg.onClic) return;
    const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * W;
    const my = ((e.clientY - r.top) / r.height) * H;
    if (my > HP) return;
    const prix = echelle.lo + (1 - (my - 8) / (HP - 16)) * (echelle.hi - echelle.lo);
    cfg.onClic(prix, Math.max(0, Math.min(n - 1, Math.floor((mx - G) / slot))));
  };

  const b = survol != null ? bougies[survol] : null;
  const ligne = cfg.type === "ligne";

  return (
    <div ref={boite} className="relative w-full select-none">

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className={`ge block${calme ? " ge-calme" : ""}`} role="img"
        aria-label={cfg.ariaLabel ?? "Graphique de la leçon"} style={{ fontFamily: "var(--cap-font-text)" }}>
        <defs>
          {bord != null && (
            <>
              <linearGradient id={`ge-g-${uid}`} gradientUnits="userSpaceOnUse" x1={bord - 28} x2={bord} y1="0" y2="0">
                <stop offset="0" stopColor="white" />
                <stop offset="1" stopColor="black" />
              </linearGradient>
              <mask id={`ge-m-${uid}`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
                <rect x="0" y="0" width={Math.max(0, bord - 28)} height={H} fill="white" />
                <rect x={bord - 28} y="0" width="28" height={H} fill={`url(#ge-g-${uid})`} />
              </mask>
            </>
          )}
          <pattern id="ge-futur" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="var(--cap-line-strong)" strokeWidth="1" />
          </pattern>
        </defs>

        {grads.map((v) => (
          <g key={v}>
            <line x1={G} x2={G + plotW} y1={y(v)} y2={y(v)} stroke="var(--cap-line-chart)" />
            <text x={G + plotW + 6} y={y(v) + 4} fontSize="11.5" fill="var(--cap-ink-3)">{fmt(v, decAxe)}</text>
          </g>
        ))}

        {/* Zones et niveaux d'abord : sous le prix */}
        {introFinie && (cfg.zones ?? []).map((z, k) => (
          <g key={`${rejeu}z${z.i0}-${z.i1}-${z.p0}-${z.p1}-${z.label ?? ""}`} className="ge-fondu" style={{ animationDelay: delai(k) }}>
            <rect x={x(z.i0) - slot / 2} width={Math.max(1, x(z.i1) - x(z.i0) + slot)} y={y(Math.max(z.p0, z.p1))}
              height={Math.abs(y(z.p0) - y(z.p1))} fill={z.couleur ?? "var(--cap-ocean)"} opacity="0.12" rx="3" />
            {z.label && <text x={x(z.i0)} y={y(Math.max(z.p0, z.p1)) - 5} fontSize="12" fontWeight="600" fill={z.couleur ?? "var(--cap-ocean)"}>{z.label}</text>}
          </g>
        ))}
        {introFinie && (cfg.niveaux ?? []).map((nv, k) => {
          const c = nv.couleur ?? "var(--cap-ink-2)";
          const yLabel = placesEtiquettes[k];
          return (
            <g key={`${rejeu}n${nv.prix}-${nv.label ?? ""}-${nv.couleur ?? ""}`} className="ge-etire" style={{ animationDelay: delai(nbZones + k) }}>
              {nv.zone ? <rect x={G} width={plotW} y={y(nv.prix + nv.zone / 2)} height={Math.abs(y(nv.prix - nv.zone / 2) - y(nv.prix + nv.zone / 2))} fill={c} opacity="0.1" /> : null}
              <line x1={G} x2={G + plotW} y1={y(nv.prix)} y2={y(nv.prix)} stroke={c} strokeWidth={nv.epaisseur ?? 1.5} strokeDasharray={nv.pointille === false ? undefined : "6 4"} />
              {nv.label && (
                <text x={G + 4} y={yLabel} fontSize="12" fontWeight="700" fill={c}
                  stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">{nv.label}</text>
              )}
            </g>
          );
        })}

        <g mask={masque}>
        {/* Bandes de Bollinger */}
        {ind.bol && (
          <g>
            <path d={`${chemin(ind.bol.haut, y)}`} fill="none" stroke="var(--cap-ocean)" strokeWidth="1.3" opacity="0.8" />
            <path d={`${chemin(ind.bol.bas, y)}`} fill="none" stroke="var(--cap-ocean)" strokeWidth="1.3" opacity="0.8" />
            <path d={`${chemin(ind.bol.milieu, y)}`} fill="none" stroke="var(--cap-ocean)" strokeWidth="1.1" strokeDasharray="4 3" opacity="0.8" />
          </g>
        )}

        {/* Le prix */}
        {ligne ? (
          <path d={chemin(closes, y)} fill="none" stroke="var(--cap-ink)" strokeWidth="2" strokeLinejoin="round" />
        ) : (
          bougies.slice(0, fin + 1).map((bg, i) => {
            const hausse = bg.c >= bg.o;
            const col = hausse ? "var(--cap-up-fill)" : "var(--cap-down-fill)";
            return (
              <g key={i}>
                <line x1={x(i)} x2={x(i)} y1={y(bg.h)} y2={y(bg.l)} stroke={col} strokeWidth={slot > 4 ? 1.2 : 0.9} />
                <rect x={x(i) - corps / 2} width={corps} y={Math.min(y(bg.o), y(bg.c))} height={Math.max(1, Math.abs(y(bg.o) - y(bg.c)))} fill={col} rx={corps > 6 ? 1 : 0} />
              </g>
            );
          })
        )}

        {(cfg.surligne ?? []).filter((i) => i <= fin).map((i) => (
          <rect key={`s${i}`} x={x(i) - Math.max(corps, 8) / 2 - 4} width={Math.max(corps, 8) + 8} y={y(bougies[i].h) - 6}
            height={y(bougies[i].l) - y(bougies[i].h) + 12} fill="none" stroke="var(--cap-ambre)" strokeWidth="2" rx="4" />
        ))}

        {ind.moy.map((s, k) => (
          <path key={`m${k}`} d={chemin(s, y)} fill="none" stroke={cfg.moyennes![k].couleur ?? COUL[k % COUL.length]} strokeWidth="2" strokeLinejoin="round" />
        ))}
        </g>

        {introFinie && (cfg.traits ?? []).map((t, k) => {
          const [i0, p0] = t.de, [i1, p1] = t.a;
          const pente = (p1 - p0) / (i1 - i0 || 1);
          const iFin = t.prolonger ? n - 1 : i1;
          const c = t.couleur ?? "var(--cap-ink)";
          return (
            <g key={`${rejeu}t${k}-${i0}-${p0}-${i1}-${p1}-${t.label ?? ""}`} className="ge-etire" style={{ animationDelay: delai(nbZones + nbNiveaux + k) }}>
              <line x1={x(i0)} y1={y(p0)} x2={x(iFin)} y2={y(p0 + pente * (iFin - i0))} stroke={c} strokeWidth="2" strokeDasharray={t.pointille ? "6 4" : undefined} />
              {t.label && <text x={x(i1) + 6} y={y(p1) - 8} fontSize="12" fontWeight="700" fill={c} stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">{t.label}</text>}
            </g>
          );
        })}

        {(cfg.marques ?? []).filter((m) => m.i <= fin && passe(m.i)).map((m, k) => {
          const bg = bougies[m.i];
          const p = m.prix ?? (m.type === "vente" ? bg.h : bg.l);
          const yy = y(p);
          const xx = x(m.i);
          const c = m.type === "achat" ? "var(--cap-up)" : m.type === "vente" ? "var(--cap-down)" : "var(--cap-ink)";
          return (
            <g key={`${rejeu}k${m.i}-${m.type}-${m.label ?? ""}-${k}`} className="ge-pop">
              {m.type === "achat" && <path d={`M${xx},${yy + 6} l6,10 h-12 z`} fill={c} />}
              {m.type === "vente" && <path d={`M${xx},${yy - 6} l6,-10 h-12 z`} fill={c} />}
              {m.type === "point" && <circle cx={xx} cy={yy} r="4.5" fill={c} stroke="var(--cap-surface)" strokeWidth="1.5" />}
              {m.type === "croix" && <path d={`M${xx - 5},${yy - 5} l10,10 M${xx + 5},${yy - 5} l-10,10`} stroke="var(--cap-down)" strokeWidth="2.4" />}
              {m.label && (
                <text x={xx} y={m.type === "achat" ? yy + 30 : yy - 22} textAnchor="middle" fontSize="12" fontWeight="700" fill={c}
                  stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">{m.label}</text>
              )}
            </g>
          );
        })}

        {(cfg.notes ?? []).filter((no) => no.i <= fin && passe(no.i)).map((no, k) => {
          const xx = Math.min(Math.max(x(no.i), G + 40), G + plotW - 40);
          const yy = y(no.prix) + (no.dessous ? 22 : -14);
          return (
            <text key={`${rejeu}o${no.i}-${no.texte}-${k}`} className="ge-fondu" x={xx} y={yy} textAnchor="middle" fontSize="12.5" fontWeight="600" fill={no.couleur ?? "var(--cap-ink)"}
              stroke="var(--cap-surface)" strokeWidth="4" paintOrder="stroke">{no.texte}</text>
          );
        })}

        {finCfg < n - 1 && (
          <g>
            <rect x={finXCfg} y={8} width={G + plotW - finXCfg} height={HP - 16} fill="url(#ge-futur)" opacity="0.6" />
            {G + plotW - finXCfg > 60 && (
              <text x={(finXCfg + G + plotW) / 2} y={26} textAnchor="middle" fontSize="12.5" fontStyle="italic" fill="var(--cap-ink-3)"
                style={{ fontFamily: "var(--cap-font-display)" }}>la suite</text>
            )}
          </g>
        )}

        {bord != null && prog! > 0 && prog! < 1 && (() => {
          const fi = Math.max(0, Math.min(fin, (bord - G) / slot - 0.5));
          const i0 = Math.floor(fi), f = fi - i0;
          const c = bougies[i0].c + ((bougies[Math.min(fin, i0 + 1)].c - bougies[i0].c) * f);
          return (
            <g pointerEvents="none">
              <line x1={bord} x2={bord} y1={4} y2={H - 2} stroke="var(--cap-ambre)" strokeWidth="2" opacity="0.85" />
              <circle cx={bord} cy={y(c)} r="4.5" fill="var(--cap-ambre)" />
            </g>
          );
        })()}

        <g mask={masque}>
        {/* Les panneaux du dessous */}
        {panneaux.map((p, k) => {
          const y0 = yPan0 + k * (HPAN + 10);
          let lo = 0, hi = 100;
          let series: { s: (number | null)[]; c: string }[] = [];
          if (p === "rsi" && ind.r) series = [{ s: ind.r, c: "var(--cap-ocean)" }];
          if (p === "macd" && ind.m) {
            series = [{ s: ind.m.macd, c: "var(--cap-ocean)" }, { s: ind.m.signal, c: "var(--cap-amber-ink)" }];
            const vals = [...ind.m.macd, ...ind.m.signal, ...ind.m.histo].filter((v): v is number => v != null);
            const mx = Math.max(...vals.map(Math.abs), 1e-9);
            lo = -mx; hi = mx;
          }
          if (p === "volume") { lo = 0; hi = Math.max(...bougies.map((bg) => bg.v)) * 1.1; }
          const yy = (v: number) => y0 + 18 + (1 - (v - lo) / (hi - lo || 1)) * (HPAN - 24);
          const val = p === "rsi" ? ind.r?.[survol ?? fin] : p === "macd" ? ind.m?.macd[survol ?? fin] : bougies[survol ?? fin]?.v;
          return (
            <g key={p}>
              <line x1={G} x2={G + plotW} y1={y0} y2={y0} stroke="var(--cap-line)" />
              <text x={G} y={y0 + 13} fontSize="12" fontWeight="600" fill="var(--cap-ink-2)">
                {p === "rsi" ? "RSI (14)" : p === "macd" ? "MACD (12, 26, 9)" : "Volume"}{val != null ? ` : ${p === "volume" ? Math.round(val).toLocaleString("fr-FR") : fmt(val, p === "rsi" ? 1 : 2)}` : ""}
              </text>
              {p === "rsi" && (cfg.rsiSeuils ?? [30, 70]).map((s) => (
                <g key={s}>
                  <line x1={G} x2={G + plotW} y1={yy(s)} y2={yy(s)} stroke="var(--cap-amber-ink)" strokeDasharray="4 3" />
                  <text x={G + plotW + 6} y={yy(s) + 4} fontSize="11" fontWeight="600" fill="var(--cap-amber-ink)">{s}</text>
                </g>
              ))}
              {p === "macd" && <line x1={G} x2={G + plotW} y1={yy(0)} y2={yy(0)} stroke="var(--cap-line-strong)" />}
              {p === "macd" && ind.m && ind.m.histo.slice(0, fin + 1).map((v, i) => v == null ? null : (
                <rect key={i} x={x(i) - corps / 2} width={corps} y={Math.min(yy(0), yy(v))} height={Math.abs(yy(v) - yy(0))}
                  fill={v >= 0 ? "var(--cap-up-fill)" : "var(--cap-down-fill)"} opacity="0.45" />
              ))}
              {p === "volume" && bougies.slice(0, fin + 1).map((bg, i) => (
                <rect key={i} x={x(i) - corps / 2} width={corps} y={yy(bg.v)} height={yy(0) - yy(bg.v)}
                  fill={bg.c >= bg.o ? "var(--cap-up-fill)" : "var(--cap-down-fill)"} opacity="0.5" />
              ))}
              {series.map((s, j) => <path key={j} d={chemin(s.s, yy)} fill="none" stroke={s.c} strokeWidth="1.8" />)}
              {finCfg < n - 1 && <rect x={finXCfg} y={y0 + 2} width={G + plotW - finXCfg} height={HPAN - 2} fill="url(#ge-futur)" opacity="0.45" />}
            </g>
          );
        })}

        </g>

        {survol != null && !cfg.sansSurvol && (
          <line x1={x(survol)} x2={x(survol)} y1={8} y2={H - 2} stroke="var(--cap-ink-3)" strokeDasharray="2 2" pointerEvents="none" />
        )}
        <rect x={G} y={0} width={Math.max(0, (cfg.onClic ? G + plotW : finX) - G)} height={H} fill="transparent"
          style={{ cursor: cfg.onClic ? "crosshair" : "default" }}
          onPointerMove={cfg.sansSurvol ? undefined : surDeplacement} onPointerLeave={() => setSurvol(null)} onClick={surClic} />
      </svg>

      {!calme && cfg.apparition !== false && !cfg.onClic && (
        <div className="flex h-8 items-center justify-end">
          {introFinie && prog == null && (
            <button type="button" onClick={() => setRejeu((r) => r + 1)}
              className="rounded-[8px] px-2 py-1 text-[0.82rem] font-medium underline decoration-[color:var(--cap-ambre)] decoration-2 underline-offset-4 transition-colors hover:bg-[color:var(--cap-surface-2)]"
              style={{ color: "var(--cap-ink-2)" }} aria-label="Revoir l'animation du graphique">
              Revoir l&apos;animation
            </button>
          )}
        </div>
      )}
      {b && !cfg.sansSurvol && !ligne && (
        <div className="pointer-events-none absolute left-2 top-2 rounded-[10px] px-3 py-2 text-[0.84rem] leading-snug shadow-sm"
          style={{ backgroundColor: "var(--cap-surface)", color: "var(--cap-ink-2)", border: "1px solid var(--cap-line-strong)" }}>
          <b style={{ color: "var(--cap-ink)" }}>Bougie {survol! + 1}{cfg.unite ? ` (un ${cfg.unite})` : ""}</b>,{" "}
          <span style={{ color: b.c >= b.o ? "var(--cap-up)" : "var(--cap-down)" }}>{b.c >= b.o ? "haussière" : "baissière"}</span>
          <br />ouverture {fmt(b.o)}, plus haut {fmt(b.h)}
          <br />plus bas {fmt(b.l)}, clôture {fmt(b.c)}
        </div>
      )}
    </div>
  );
}
