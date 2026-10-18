"use client";

import { useMemo, useState } from "react";
import { ema, macd, type Bougie } from "@/lib/cours/marche";
import { ChoixInd, CurseurInd, LectureInd, MiniGraphe, PastilleInd, nf, nfp, type PanneauMini, type PointMini } from "./ElementsIndicateurs";

/**
 * Le MACD monté couche par couche : les deux moyennes, leur écart (la ligne
 * MACD), la ligne de signal, l'histogramme, puis les croisements. Un curseur
 * lit les chiffres de la bougie choisie, avec le calcul.
 */
const COUCHES = [
  { v: 1, texte: "1. Deux moyennes" },
  { v: 2, texte: "2. Leur écart" },
  { v: 3, texte: "3. Le signal" },
  { v: 4, texte: "4. L'histogramme" },
  { v: 5, texte: "5. Les croisements" },
];

export function MacdCouches({ bougies, depart }: { bougies: Bougie[]; depart?: number }) {
  const closes = useMemo(() => bougies.map((b) => b.c), [bougies]);
  const e12 = useMemo(() => ema(closes, 12), [closes]);
  const e26 = useMemo(() => ema(closes, 26), [closes]);
  const m = useMemo(() => macd(closes), [closes]);
  const n = bougies.length;
  const debutSignal = m.signal.findIndex((v) => v != null);
  const [couche, setCouche] = useState(1);
  const [k, setK] = useState(depart ?? Math.min(n - 1, 60));
  const kMin = couche >= 3 ? debutSignal : 25;
  const kk = Math.max(kMin, k);

  const croisements = useMemo(() => {
    const out: { i: number; haut: boolean }[] = [];
    for (let i = debutSignal + 1; i < n; i++) {
      const d0 = m.histo[i - 1]!, d1 = m.histo[i]!;
      if (d0 <= 0 && d1 > 0) out.push({ i, haut: true });
      if (d0 >= 0 && d1 < 0) out.push({ i, haut: false });
    }
    return out;
  }, [m, debutSignal, n]);

  const panneau: PanneauMini = {
    titre: couche === 1 ? "MACD (12, 26, 9) : il arrive à la couche 2" : "MACD (12, 26, 9)",
    zero: true,
    series: [
      ...(couche >= 2 ? [{ v: m.macd, couleur: "var(--cap-ocean)", epaisseur: 2 }] : []),
      ...(couche >= 3 ? [{ v: m.signal, couleur: "var(--cap-amber-ink)", epaisseur: 1.8 }] : []),
    ],
    barres: couche >= 4 ? m.histo : undefined,
    points: [
      ...(couche >= 2 ? [{ i: kk, v: m.macd[kk]!, couleur: "var(--cap-ocean)" }] : []),
      ...(couche >= 5 ? croisements.map((c) => ({ i: c.i, v: m.macd[c.i]!, couleur: c.haut ? "var(--cap-up)" : "var(--cap-down)" })) : []),
    ],
  };
  // L'échelle du panneau ne bouge pas d'une couche à l'autre.
  const amp = Math.max(...m.macd.filter((v): v is number => v != null).map(Math.abs));
  panneau.min = -amp * 1.1; panneau.max = amp * 1.1;

  const pointsPrix: PointMini[] = couche < 5
    ? [{ i: kk, v: e12[kk]!, couleur: "var(--cap-ocean)" }, { i: kk, v: e26[kk]!, couleur: "var(--cap-ink-3)" }]
    : croisements.map((c) => ({ i: c.i, v: c.haut ? bougies[c.i].l : bougies[c.i].h, couleur: c.haut ? "var(--cap-up)" : "var(--cap-down)", label: c.haut ? "haussier" : "baissier", dessous: c.haut }));

  // Les chiffres affichés sont arrondis au dixième, et chaque calcul part des chiffres affichés : il tombe juste.
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const vR = r1(e12[kk]!), vL = r1(e26[kk]!), vM = r1(vR - vL);
  const vS = m.signal[kk] != null ? r1(m.signal[kk]!) : null;
  const vH = vS != null ? r1(vM - vS) : null;
  const vHp = m.histo[kk - 1];
  const vHvrai = m.histo[kk];
  const dernierCroisement = [...croisements].reverse().find((c) => c.i <= kk);

  return (
    <div>
      <div className="mb-2 overflow-x-auto">
        <ChoixInd label="La couche du MACD" valeur={couche} options={COUCHES} onChange={setCouche} />
      </div>
      <MiniGraphe bougies={bougies} curseur={kk} onIndex={(i) => setK(i)}
        series={[{ v: e12, couleur: "var(--cap-ocean)", epaisseur: couche === 1 ? 2.4 : 1.6 }, { v: e26, couleur: "var(--cap-ink-3)", epaisseur: couche === 1 ? 2.4 : 1.6 }]}
        points={pointsPrix} panneaux={[panneau]}
        ariaLabel="Le prix, ses moyennes exponentielles 12 et 26, et le MACD" hauteur={230} etroitHauteur={180} />
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <PastilleInd couleur="var(--cap-ocean)">EMA 12, la rapide</PastilleInd>
        <PastilleInd couleur="var(--cap-ink-3)">EMA 26, la lente</PastilleInd>
        {couche >= 2 && <PastilleInd couleur="var(--cap-ocean)">Ligne MACD</PastilleInd>}
        {couche >= 3 && <PastilleInd couleur="var(--cap-amber-ink)">Ligne de signal</PastilleInd>}
      </div>
      <div className="mt-3">
        <CurseurInd id="macd-bougie" label="La bougie lue" valeur={kk} min={kMin} max={n - 1} onChange={setK} ecrire={(v) => `bougie ${v + 1}`} />
      </div>
      <div className="mt-2">
        <LectureInd>
          <p className="tabular-nums">
            EMA 12 : <b style={{ color: "var(--cap-ink)" }}>{nf(vR, 1)} $</b>, EMA 26 : <b style={{ color: "var(--cap-ink)" }}>{nf(vL, 1)} $</b>.{" "}
            {couche === 1 && (vR > vL ? "La rapide est au-dessus de la lente : les prix récents tirent la moyenne vers le haut." : "La rapide est sous la lente : les prix récents tirent la moyenne vers le bas.")}
          </p>
          {couche >= 2 && (
            <p className="mt-1.5 tabular-nums">
              MACD = {nf(vR, 1)} − {nf(vL, 1)} = <b style={{ color: "var(--cap-ocean)" }}>{nf(vM, 1)}</b> :{" "}
              {vM > 0 ? "au-dessus de zéro, la rapide est au-dessus de la lente, plutôt haussier." : "en dessous de zéro, la rapide est sous la lente, plutôt baissier."}
            </p>
          )}
          {couche >= 3 && vS != null && (
            <p className="mt-1.5 tabular-nums">
              Signal (moyenne du MACD sur 9 bougies) : <b style={{ color: "var(--cap-amber-ink)" }}>{nf(vS, 1)}</b>. Le MACD est {vM > vS ? "au-dessus" : "en dessous"} de son signal.
            </p>
          )}
          {couche >= 4 && vH != null && (
            <p className="mt-1.5 tabular-nums">
              Histogramme = {nf(vM, 1)} − {nfp(vS!, 1)} = <b style={{ color: vH >= 0 ? "var(--cap-up)" : "var(--cap-down)" }}>{nf(vH, 1)}</b>
              {vHp != null && vHvrai != null && (Math.abs(vHvrai) > Math.abs(vHp) ? " : la barre grandit, le mouvement prend de la force." : " : la barre rapetisse, le mouvement perd de la force.")}
            </p>
          )}
          {couche >= 5 && (
            <p className="mt-1.5">
              {dernierCroisement
                ? <>Dernier croisement avant cette bougie : bougie {dernierCroisement.i + 1}, <b style={{ color: dernierCroisement.haut ? "var(--cap-up)" : "var(--cap-down)" }}>{dernierCroisement.haut ? "signal haussier" : "signal baissier"}</b> (le MACD passe {dernierCroisement.haut ? "au-dessus" : "sous"} son signal).</>
                : "Pas encore de croisement à cette bougie."}
            </p>
          )}
        </LectureInd>
      </div>
    </div>
  );
}
