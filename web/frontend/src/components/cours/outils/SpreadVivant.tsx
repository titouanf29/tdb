"use client";

import { useEffect, useMemo, useState } from "react";
import { hasard } from "@/lib/cours/marche";
import { Bouton, Choix, Chiffre, Curseur, Lien, Verdict, dollars, nb, useCalme, useDefilement, useLargeur } from "./ElementsOrdres";

/**
 * Leçon 16. Le bid et l'ask de l'euro-dollar qui bougent, selon le moment de
 * la journée : le spread se resserre quand le marché est actif, s'élargit la
 * nuit, à l'ouverture du lundi et pendant une annonce. Ce que coûte un achat,
 * le seuil de rentabilité, et l'addition quand on multiplie les trades.
 */

type Moment = "actif" | "nuit" | "lundi" | "annonce";
const MOMENTS: Record<Moment, { t: string; base: number; jeu: number; texte: string }> = {
  actif: { t: "Londres et New York", base: 1, jeu: 0, texte: "Londres et New York sont ouverts ensemble : beaucoup d'acheteurs et de vendeurs, le spread est serré." },
  nuit: { t: "La nuit", base: 3, jeu: 1, texte: "La nuit en Europe, peu de monde échange l'euro-dollar : l'écart s'élargit." },
  lundi: { t: "Ouverture du lundi", base: 5, jeu: 2, texte: "Le marché rouvre après le week-end : les premiers échanges sont rares, et le spread large." },
  annonce: { t: "Pendant une annonce", base: 8, jeu: 7, texte: "Une annonce forte tombe : les teneurs de marché se protègent, le spread saute d'un instant à l'autre." },
};

const px = (p: number) => nb(1.1 + p / 10000, 4);

export function SpreadVivant() {
  const [moment, setMoment] = useState<Moment>("actif");
  const [tic, setTic] = useState(0);
  const [trades, setTrades] = useState(10);
  const calme = useCalme();

  useEffect(() => {
    if (calme) return;
    const id = setInterval(() => setTic((t) => t + 1), 900);
    return () => clearInterval(id);
  }, [calme]);

  // Le bid fait un petit pas à chaque tic ; le spread suit le moment choisi.
  const { bid, spread } = useMemo(() => {
    const r = hasard(1000 + tic);
    const m = MOMENTS[moment];
    let b = 0;
    const rr = hasard(77);
    for (let i = 0; i < tic; i++) b = Math.max(-6, Math.min(6, b + Math.round((rr() - 0.5) * 3)));
    return { bid: b, spread: m.base + Math.round(r() * m.jeu) };
  }, [tic, moment]);
  const ask = bid + spread;
  const coutTrade = spread * 1; // 0,10 lot : 1 $ par pip
  const parJour = coutTrade * trades;

  return (
    <div>
      <Choix label="Le moment" valeur={moment} onChange={setMoment} petit
        options={(Object.keys(MOMENTS) as Moment[]).map((v) => ({ v, t: MOMENTS[v].t }))} />

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-6" aria-live="polite">
        <div className="text-right">
          <p className="text-[0.88rem]" style={{ color: "var(--cap-ink-3)" }}>Bid, <b>vendre</b></p>
          <p className="tabular-nums text-[1.7rem] font-semibold leading-tight sm:text-[2.1rem]" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>{px(bid)}</p>
        </div>
        <div className="flex flex-col items-center px-1">
          <span className="text-[0.82rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>spread</span>
          <span className="tabular-nums text-[1.15rem] font-semibold" style={{ color: "var(--cap-amber-ink)" }}>{nb(spread)} pip{spread > 1 ? "s" : ""}</span>
          <span aria-hidden className="mt-1 h-[3px] rounded-full transition-all duration-300" style={{ width: `${Math.min(110, 10 + spread * 7)}px`, backgroundColor: "var(--cap-ambre)" }} />
        </div>
        <div>
          <p className="text-[0.88rem]" style={{ color: "var(--cap-ink-3)" }}>Ask, <b>acheter</b></p>
          <p className="tabular-nums text-[1.7rem] font-semibold leading-tight sm:text-[2.1rem]" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>{px(ask)}</p>
        </div>
      </div>
      <p className="mt-3 text-[0.97rem]" style={{ color: "var(--cap-ink-2)" }}>{MOMENTS[moment].texte}</p>
      {calme && <div className="mt-1"><Lien onClick={() => setTic((t) => t + 1)}>Prix suivant</Lien></div>}

      <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-3">
        <Chiffre label="Vous achetez 0,10 lot à l'ask" valeur={px(ask)} note="Et la position se compte au bid." />
        <Chiffre label="Dès l'ouverture" valeur={`−${dollars(coutTrade)}`} couleur="var(--cap-down)" note={`${nb(spread)} pip${spread > 1 ? "s" : ""} × 1 $`} />
        <Chiffre label="Seuil de rentabilité" valeur={px(ask)} note={`Le bid doit monter de ${nb(spread)} pip${spread > 1 ? "s" : ""} pour revenir à zéro.`} />
      </div>

      <div className="mt-5">
        <Curseur label="Combien de trades par jour ?" min={1} max={50} step={1} valeur={trades} onChange={setTrades} affiche={`${nb(trades)} trade${trades > 1 ? "s" : ""}`} />
        <Verdict couleur={parJour * 20 >= 200 ? "var(--cap-down)" : undefined}>
          Avec ce spread, {nb(trades)} trade{trades > 1 ? "s" : ""} par jour coûtent <b>{dollars(parJour)}</b> par jour, soit <b>{dollars(parJour * 20)}</b> sur un mois de 20 jours de bourse
          {parJour * 20 >= 200 ? <>, déjà {nb((parJour * 20) / 20)} % d'un compte de 2 000 $, avant le moindre gain.</> : "."}
        </Verdict>
      </div>
    </div>
  );
}

/**
 * Le piège du short : le graphique montre le bid, le short se rachète à l'ask.
 * Pendant l'annonce, le spread s'élargit, l'ask touche le stop alors que le
 * graphique reste dessous.
 */
const N = 40;
const BID: number[] = (() => {
  const r = hasard(160);
  const anc: [number, number][] = [[0, 2], [5, 0], [12, -3], [20, 1], [23, 3], [26, 12], [29, 4], [34, -6], [39, -10]];
  return Array.from({ length: N }, (_, i) => {
    const k = anc.findIndex(([j]) => j >= i);
    const [i1, p1] = anc[k], [i0, p0] = anc[Math.max(0, k - 1)];
    const base = i1 === i0 ? p1 : p0 + ((p1 - p0) * (i - i0)) / (i1 - i0);
    const loin = Math.min(...anc.map(([j]) => Math.abs(i - j)));
    return Math.round(base + (r() - 0.5) * 3 * Math.min(1, loin / 2));
  });
})();
const ANNONCE = [24, 25, 26, 27, 28];

export function PiegeShort() {
  const [ecart, setEcart] = useState(9);
  const { k, setK, lancer, arreter, enCours } = useDefilement(N, 110);
  useEffect(() => { arreter(); setK(N - 1); }, [ecart, arreter, setK]);
  const { ref, w } = useLargeur();
  const H = w < 520 ? 230 : 270, G = 6, D = 58;
  const spreadA = (i: number) => (ANNONCE.includes(i) ? Math.max(1, Math.round(ecart * (i === 26 ? 1 : i === 25 || i === 27 ? 0.8 : 0.5))) : 1);
  const ASK = BID.map((b, i) => b + spreadA(i));
  const STOP = 20, ENTREE = 0, I0 = 5;
  const lo = -14, hi = 26;
  const x = (i: number) => G + (i / (N - 1)) * (w - G - D);
  const y = (p: number) => 10 + (1 - (p - lo) / (hi - lo)) * (H - 20);
  const sortie = ASK.findIndex((a, i) => i > I0 && a >= STOP);
  const vu = Math.min(k, sortie >= 0 ? N - 1 : N - 1);
  const chemin = (s: number[]) => s.slice(0, vu + 1).map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const maxBid = Math.max(...BID.slice(I0));
  const touche = sortie >= 0 && sortie <= vu;

  return (
    <div>
      <Curseur label="Le spread au pire de l'annonce" min={1} max={12} step={1} valeur={ecart} onChange={setEcart} affiche={`${nb(ecart)} pip${ecart > 1 ? "s" : ""}`} />
      <div ref={ref} className="mt-2 w-full">
        <svg viewBox={`0 0 ${w} ${H}`} width="100%" height={H} className="block" role="img"
          aria-label="Le bid, que montre le graphique, et l'ask, au-dessus, pendant une annonce, avec le stop d'un short à 1,1020">
          <rect x={x(ANNONCE[0]) - 4} y={8} width={x(ANNONCE[ANNONCE.length - 1]) - x(ANNONCE[0]) + 8} height={H - 16} fill="var(--cap-ink-3)" opacity="0.08" rx="4" />
          <text x={x(26)} y={22} textAnchor="middle" fontSize="11.5" fontStyle="italic" fill="var(--cap-ink-3)">annonce</text>
          <line x1={G} x2={w - D} y1={y(STOP)} y2={y(STOP)} stroke="var(--cap-down)" strokeWidth="1.6" strokeDasharray="6 4" />
          <text x={G + 4} y={y(STOP) - 6} fontSize="12" fontWeight="700" fill="var(--cap-down)" stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">Stop loss du short 1,1020</text>
          <line x1={G} x2={w - D} y1={y(ENTREE)} y2={y(ENTREE)} stroke="var(--cap-line-strong)" />
          <text x={w - D + 6} y={y(STOP) + 4} fontSize="11.5" fill="var(--cap-ink-3)">1,1020</text>
          <text x={w - D + 6} y={y(ENTREE) + 4} fontSize="11.5" fill="var(--cap-ink-3)">1,1000</text>
          <path d={chemin(ASK)} fill="none" stroke="var(--cap-ocean)" strokeWidth="1.8" strokeDasharray="4 3" />
          <path d={chemin(BID)} fill="none" stroke="var(--cap-ink)" strokeWidth="2.2" strokeLinejoin="round" />
          {vu >= I0 && <path d={`M${x(I0)},${y(BID[I0]) - 6} l6,-10 h-12 z`} fill="var(--cap-down)" />}
          {vu >= I0 && <text x={x(I0)} y={y(BID[I0]) - 22} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--cap-down)" stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">Vente</text>}
          {touche && <circle cx={x(sortie)} cy={y(STOP)} r="6" fill="var(--cap-down)" stroke="var(--cap-surface)" strokeWidth="2" />}
          <text x={x(Math.min(vu, N - 1)) - 4} y={y(BID[Math.min(vu, N - 1)]) + 18} textAnchor="end" fontSize="12" fontWeight="700" fill="var(--cap-ink)" stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">bid (le graphique)</text>
          <text x={x(Math.min(vu, N - 1)) - 4} y={y(ASK[Math.min(vu, N - 1)]) - 8} textAnchor="end" fontSize="12" fontWeight="700" fill="var(--cap-ocean)" stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">ask</text>
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <Chiffre label="Plus haut du graphique (bid)" valeur={px(maxBid)} />
          <Chiffre label="Plus haut de l'ask" valeur={px(Math.max(...ASK.slice(I0)))} couleur={sortie >= 0 ? "var(--cap-down)" : undefined} />
        </div>
        <Bouton onClick={lancer} disabled={enCours}>{enCours ? "Le temps passe…" : "Rejouer l'annonce"}</Bouton>
      </div>
      <Verdict couleur={sortie >= 0 ? "var(--cap-down)" : "var(--cap-up)"}>
        {sortie >= 0
          ? <>Le graphique n'est jamais monté au-dessus de <b>{px(maxBid)}</b>, à {nb(STOP - maxBid)} pips de votre stop. Mais l'ask a touché <b>1,1020</b> : votre short a été racheté, avec <b>20 pips de perte</b>. En regardant le graphique, vous ne comprendriez pas pourquoi.</>
          : <>Avec un spread de {nb(ecart)} pip{ecart > 1 ? "s" : ""}, l'ask monte à {px(Math.max(...ASK.slice(I0)))} : le stop tient. Élargissez le spread pour voir ce qui se passe un vrai jour d'annonce.</>}
      </Verdict>
    </div>
  );
}
