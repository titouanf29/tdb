"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bouton, Choix, Chiffre, nb, Pas, Recommencer, signe, ton, useAnimer, useLargeur, Verdict, heureTexte } from "./ElementsMarches";

/**
 * Le simulateur d'annonce : on choisit l'annonce (NFP, CPI, taux de la Fed),
 * le chiffre publié, éventuellement un pronostic, puis on publie. L'euro-dollar
 * réagit sous nos yeux : le saut, l'aller-retour, le spread qui s'élargit, et
 * le stop exécuté plus loin que prévu (le slippage).
 *
 * Un modèle volontairement simple et déterministe : la réaction dépend de la
 * surprise (publié moins prévu). Le texte rappelle que le vrai marché n'est
 * pas aussi mécanique.
 */

type Cle = "nfp" | "cpi" | "fed";

const ANNONCES: Record<Cle, {
  nom: string; court: string; heure: number; unite: string; precedent: number; prevu: number;
  min: number; max: number; pas: number; dec: number; pipsParPas: number; defaut: number;
  fmt: (v: number) => string; surprise: (d: number) => string; sens: string;
}> = {
  nfp: {
    nom: "Emploi américain (NFP)", court: "NFP", heure: 14.5, unite: "emplois créés en un mois",
    precedent: 150000, prevu: 170000, min: 20000, max: 320000, pas: 10000, dec: 0, pipsParPas: 5, defaut: 230000,
    fmt: (v) => nb(v), surprise: (d) => `${nb(Math.abs(d))} emplois de ${d > 0 ? "plus" : "moins"} que prévu`,
    sens: "Plus d'emplois que prévu, c'est une économie solide : la Fed a moins de raisons de baisser ses taux. Le dollar a tendance à monter, et l'euro-dollar à baisser.",
  },
  cpi: {
    nom: "Inflation américaine (CPI)", court: "CPI", heure: 14.5, unite: "hausse des prix sur un an",
    precedent: 2.9, prevu: 2.8, min: 2.2, max: 3.4, pas: 0.1, dec: 1, pipsParPas: 18, defaut: 3.1,
    fmt: (v) => `${nb(v, 1)} %`, surprise: (d) => `${nb(Math.abs(d), 1)} point de ${d > 0 ? "plus" : "moins"} que prévu`,
    sens: "Une inflation plus forte que prévu pousse la Fed à garder des taux hauts, ou à les monter. Le dollar a tendance à monter, et l'euro-dollar à baisser.",
  },
  fed: {
    nom: "Taux de la Fed", court: "Fed", heure: 20, unite: "taux directeur",
    precedent: 4.0, prevu: 3.75, min: 3.5, max: 4.25, pas: 0.25, dec: 2, pipsParPas: 55, defaut: 4.0,
    fmt: (v) => `${nb(v, 2)} %`, surprise: (d) => `${nb(Math.abs(d), 2)} point de ${d > 0 ? "plus" : "moins"} que prévu`,
    sens: "Un taux plus haut que prévu rend le dollar plus intéressant à détenir. Le dollar a tendance à monter, et l'euro-dollar à baisser.",
  },
};

const N = 120;     // 120 instants de 5 secondes : 10 minutes
const T0 = 36;     // l'annonce tombe au 36e instant
const PIP = 0.0001;
const ENTREE = 1.1;
const STOP = 1.098;

/** Un bruit reproductible, pour que la même annonce donne toujours le même dessin. */
function bruit(i: number, graine: number) {
  const x = Math.sin(i * 12.9898 + graine * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function chemin(mouvement: number, graine: number) {
  const prix: number[] = [];
  const spread: number[] = [];
  const m = mouvement;
  const fort = Math.abs(m) >= 6;
  for (let i = 0; i < N; i++) {
    let p: number;
    if (i < T0) p = 0.6 * bruit(i, graine);
    else if (fort) {
      const s = Math.sign(m), a = Math.abs(m);
      if (i === T0) p = s * a * 0.95;
      else if (i === T0 + 1) p = s * a * 1.15;
      else if (i < T0 + 22) p = s * a * (1.15 - 0.6 * ((i - T0 - 1) / 21)) + 2.5 * bruit(i, graine);
      else p = s * a * (0.55 + 0.25 * ((i - T0 - 22) / (N - T0 - 22))) + 1.6 * bruit(i, graine);
    } else {
      const k = i - T0;
      const sens = graine % 2 ? 1 : -1;
      if (k <= 2) p = sens * 13 * (k / 2);
      else if (k <= 8) p = sens * (13 - 28 * ((k - 2) / 6));
      else if (k <= 30) p = sens * (-15 + 17 * ((k - 8) / 22)) + 2 * bruit(i, graine);
      else p = 1.2 * bruit(i, graine) + sens * 2;
    }
    prix.push(ENTREE + p * PIP);
    const d = i - T0;
    spread.push(d < -2 ? 0.8 : d < 0 ? 1.4 : d < 6 ? 5.8 - d * 0.25 : Math.max(1, 4.3 * Math.exp(-(d - 6) / 10)));
  }
  return { prix, spread };
}

export function SimulateurAnnonce() {
  const animer = useAnimer();
  const [cle, setCle] = useState<Cle>("nfp");
  const A = ANNONCES[cle];
  const [publie, setPublie] = useState(A.defaut);
  const [prono, setProno] = useState<"monte" | "baisse" | null>(null);
  const [position, setPosition] = useState<"aucune" | "achat">("achat");
  const [k, setK] = useState(T0 - 1);
  const [lance, setLance] = useState(false);
  const raf = useRef(0);
  const [boite, W] = useLargeur(600);

  const surprise = Math.round((publie - A.prevu) / A.pas);
  const mouvement = -Math.sign(surprise) * Math.min(85, Math.abs(surprise) * A.pipsParPas);
  const { prix, spread } = useMemo(() => chemin(mouvement, Math.round(publie * 100) + cle.length), [mouvement, publie, cle]);
  const fini = lance && k >= N - 1;

  const choisirAnnonce = (c: Cle) => { cancelAnimationFrame(raf.current); setCle(c); setPublie(ANNONCES[c].defaut); setLance(false); setK(T0 - 1); setProno(null); };
  const reinit = () => { cancelAnimationFrame(raf.current); setLance(false); setK(T0 - 1); };

  const publier = () => {
    setLance(true);
    if (!animer) { setK(N - 1); return; }
    setK(T0 - 1);
    const t0 = performance.now();
    const pas = (t: number) => {
      // Lent avant et pendant le saut, plus rapide ensuite.
      const f = Math.min(1, (t - t0) / 4200);
      const e = f < 0.35 ? (f / 0.35) * 0.25 : 0.25 + ((f - 0.35) / 0.65) * 0.75;
      setK(Math.round(T0 - 1 + (N - T0) * e));
      if (f < 1) raf.current = requestAnimationFrame(pas);
    };
    raf.current = requestAnimationFrame(pas);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // Le stop : une position acheteuse se ferme au prix de vente (bid), sous le milieu.
  const bid = (i: number) => prix[i] - (spread[i] / 2) * PIP;
  let iStop = -1;
  if (position === "achat") for (let i = T0; i < N; i++) if (bid(i) <= STOP) { iStop = i; break; }
  const stopVu = iStop >= 0 && k >= iStop;
  const sortie = iStop >= 0 ? bid(iStop) : bid(N - 1);
  const glissement = iStop >= 0 ? (STOP - sortie) / PIP : 0;
  const resultat = (sortie - ENTREE) / PIP; // 0,10 lot : 1 pip = 1 $

  // ── Le dessin ──
  const H = W < 480 ? 230 : 270;
  const G = 8, D = 64, HAUT = 14, BAS = 26;
  const ext = prix.reduce((m, p) => Math.max(m, Math.abs(p - ENTREE) / PIP + 4), 26);
  const lo = ENTREE - ext * PIP, hi = ENTREE + ext * PIP;
  const x = (i: number) => G + (i / (N - 1)) * (W - G - D);
  const y = (p: number) => HAUT + (1 - (p - lo) / (hi - lo)) * (H - HAUT - BAS);
  const fin = Math.min(k, N - 1);
  const ligne = prix.slice(0, fin + 1).map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join("");
  const bande = (() => {
    if (fin < 1) return "";
    const haut = prix.slice(0, fin + 1).map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p + (spread[i] / 2) * PIP).toFixed(1)}`).join("");
    const bas = prix.slice(0, fin + 1).map((p, i) => [x(i), y(p - (spread[i] / 2) * PIP)] as const).reverse().map(([a, b]) => `L${a.toFixed(1)},${b.toFixed(1)}`).join("");
    return `${haut}${bas}Z`;
  })();
  const graduations = [-2, -1, 0, 1, 2].map((g) => ENTREE + g * Math.round(ext / 2.5 / 5) * 5 * PIP).filter((v, i, t) => t.indexOf(v) === i);
  const heureDe = (i: number) => A.heure + (i - T0) * 5 / 3600;

  const directionVue = mouvement < 0 ? "baisse" : mouvement > 0 ? "monte" : null;

  return (
    <div>
      <Choix label="L'annonce" valeur={cle} onChange={choisirAnnonce} petit
        options={[{ v: "nfp", t: "Emploi (NFP)" }, { v: "cpi", t: "Inflation (CPI)" }, { v: "fed", t: "Taux de la Fed" }]} />

      <div className="mt-3 grid grid-cols-3 gap-3 rounded-[12px] px-4 py-3" style={{ backgroundColor: "var(--cap-surface-2)" }}>
        <Chiffre label="Précédent" valeur={A.fmt(A.precedent)} />
        <Chiffre label="Prévu" valeur={A.fmt(A.prevu)} />
        <Chiffre label="Publié" valeur={lance ? A.fmt(publie) : "?"} couleur={lance ? "var(--cap-amber-ink)" : "var(--cap-ink-3)"} />
      </div>
      <p className="mt-1.5 text-[0.88rem]" style={{ color: "var(--cap-ink-3)" }}>{A.nom}, {A.unite}. Chiffres d&apos;exemple. Publication à {heureTexte(A.heure)}, heure de Paris.</p>

      <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
        <Pas label="Le chiffre qui sera publié" valeur={publie} affiche={A.fmt(publie)}
          onMoins={() => { reinit(); setPublie((v) => Math.max(A.min, Number((v - A.pas).toFixed(4)))); }}
          onPlus={() => { reinit(); setPublie((v) => Math.min(A.max, Number((v + A.pas).toFixed(4)))); }}
          moinsOff={publie <= A.min + 1e-9} plusOff={publie >= A.max - 1e-9} />
        <Choix label="Votre pronostic pour l'euro-dollar" valeur={prono} onChange={(v) => { reinit(); setProno(v); }} petit
          options={[{ v: "monte", t: "Il monte" }, { v: "baisse", t: "Il baisse" }]} />
        <Choix label="Votre position" valeur={position} onChange={(v) => { reinit(); setPosition(v); }} petit
          options={[{ v: "achat", t: "Achat, stop à 1,0980" }, { v: "aucune", t: "Aucune" }]} />
      </div>

      <div ref={boite} className="mt-4 w-full">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="block" role="img"
          aria-label={`Euro-dollar autour de l'annonce, de ${heureTexte(heureDe(0))} à ${heureTexte(heureDe(N - 1))}`}>
          {graduations.map((g) => (
            <g key={g}>
              <line x1={G} x2={W - D} y1={y(g)} y2={y(g)} stroke="var(--cap-line-chart)" />
              <text x={W - D + 6} y={y(g) + 4} fontSize="11.5" fill="var(--cap-ink-3)">{nb(g, 4)}</text>
            </g>
          ))}
          {(W < 480 ? [0, T0, 72, 108] : [0, 24, T0, 60, 84, 108]).map((i) => (
            <text key={i} x={x(i)} y={H - 8} fontSize="11" textAnchor={i === 0 ? "start" : "middle"} fill={i === T0 ? "var(--cap-ink)" : "var(--cap-ink-3)"} fontWeight={i === T0 ? 600 : 400}>
              {heureTexte(heureDe(i))}
            </text>
          ))}
          <line x1={x(T0)} x2={x(T0)} y1={HAUT - 6} y2={H - BAS} stroke="var(--cap-ambre)" strokeWidth="1.5" strokeDasharray="4 3" />
          {position === "achat" && (
            <g>
              <line x1={G} x2={W - D} y1={y(ENTREE)} y2={y(ENTREE)} stroke="var(--cap-ink-3)" strokeDasharray="2 3" />
              <line x1={G} x2={W - D} y1={y(STOP)} y2={y(STOP)} stroke="var(--cap-down)" strokeWidth="1.3" strokeDasharray="6 4" />
              <text x={G + 4} y={y(STOP) + 14} fontSize="11.5" fontWeight="700" fill="var(--cap-down)" stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">Stop 1,0980</text>
            </g>
          )}
          {bande && <path d={bande} fill="var(--cap-ocean)" opacity="0.18" />}
          <path d={ligne} fill="none" stroke="var(--cap-ink)" strokeWidth="1.8" strokeLinejoin="round" />
          {stopVu && (
            <g>
              <circle cx={x(iStop)} cy={y(sortie)} r="5" fill="var(--cap-down)" stroke="var(--cap-surface)" strokeWidth="1.5" />
              <text x={x(iStop) + 9} y={y(sortie) + 4} fontSize="11.5" fontWeight="700" fill="var(--cap-down)" stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">
                Exécuté à {nb(sortie, 4)}
              </text>
            </g>
          )}
          {fin >= 0 && <circle cx={x(fin)} cy={y(prix[fin])} r="3.5" fill="var(--cap-ambre)" />}
        </svg>
        <div className="mt-1 flex flex-wrap justify-between gap-x-4 text-[0.88rem]" style={{ color: "var(--cap-ink-3)" }}>
          <span>La bande bleue : l&apos;écart entre achat et vente, le spread.</span>
          <span className="tabular-nums" aria-live="off">Spread : <b style={{ color: spread[fin] > 2 ? "var(--cap-down)" : "var(--cap-ink)" }}>{nb(spread[fin], 1)} pip</b></span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!lance && <Bouton onClick={publier}>Publier le chiffre à {heureTexte(A.heure)}</Bouton>}
        {lance && <Recommencer onClick={reinit} label="Changer le chiffre et rejouer" />}
      </div>

      {fini && (
        <Verdict couleur="var(--cap-ambre)">
          <p><b>La surprise : {surprise === 0 ? "aucune, le chiffre est celui qu'on attendait." : `${A.surprise(publie - A.prevu)}.`}</b>{" "}
            {surprise === 0
              ? "Le prix fait un aller-retour : il saute d'un côté, puis de l'autre, puis revient presque à son point de départ. Sans surprise, rien de neuf à intégrer."
              : `${A.sens.replace(/\.$/, "")}${surprise < 0 ? " (ici, c'est l'inverse : surprise à la baisse, dollar plus faible, euro-dollar en hausse)." : "."} Le prix a sauté de ${nb(Math.abs(mouvement))} pips environ, puis il est revenu en partie : c'est l'aller-retour, fréquent juste après une annonce.`}
          </p>
          {prono && (
            <p className="mt-2">Votre pronostic : {directionVue == null ? "sans surprise, ni l'un ni l'autre ne s'est vraiment produit." : prono === directionVue ? "juste, cette fois. Mais remarquez qu'avec le saut et le spread, avoir raison ne suffit pas toujours." : "le prix est parti dans l'autre sens. C'est pour ça qu'on ne parie pas sur une annonce."}</p>
          )}
          <p className="mt-2">Le <b>spread</b> est passé de 0,8 pip à près de 6 pips pendant quelques secondes, puis il est revenu.</p>
          {position === "achat" && (iStop >= 0 ? (
            <p className="mt-2">Votre <b>stop à 1,0980</b> a été exécuté à <b>{nb(sortie, 4)}</b> : <b style={{ color: "var(--cap-down)" }}>{nb(glissement, 1)} pips plus loin</b> que prévu. C&apos;est le <b>slippage</b>. Avec 0,10 lot, la perte est de <b style={{ color: "var(--cap-down)" }}>{nb(-resultat, 0)} $</b> au lieu des 20 $ prévus (1 % d&apos;un compte de 2 000 $).</p>
          ) : (
            <p className="mt-2">Votre stop n&apos;a pas été touché. Votre achat est à <b style={{ color: ton(resultat) }}>{signe(resultat, 0)} $</b> (0,10 lot) au bout de dix minutes{resultat > 0 ? ", mais un chiffre dans l'autre sens l'aurait coupé, peut-être plus loin que prévu" : ""}.</p>
          ))}
          <p className="mt-2 text-[0.92rem]" style={{ color: "var(--cap-ink-3)" }}>Une simulation simplifiée. En vrai, le marché regarde aussi la révision du chiffre précédent, les détails et ce qu&apos;il avait déjà anticipé : la même surprise ne donne pas toujours la même réaction.</p>
        </Verdict>
      )}
    </div>
  );
}
