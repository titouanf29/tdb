"use client";

import { useMemo, useState } from "react";
import { sma, type Bougie } from "@/lib/cours/marche";
import { ChoixInd, CurseurInd, LectureInd, MiniGraphe, PastilleInd, nf } from "./ElementsIndicateurs";

/**
 * Le réglage d'une moyenne mobile : un curseur de 5 à 200 bougies. Plus le
 * nombre est grand, plus la ligne est lisse… et plus elle tourne tard. On lit
 * le retard en bougies, au creux et au sommet du prix.
 */
const couleurDe = (n: number) => (n <= 30 ? "var(--cap-ocean)" : n <= 100 ? "var(--cap-amber-ink)" : "var(--cap-ink-2)");

function extreme(s: (number | null)[], a: number, b: number, bas: boolean) {
  let k = -1;
  for (let i = a; i <= b; i++) {
    const v = s[i];
    if (v == null) continue;
    if (k < 0 || (bas ? v < s[k]! : v > s[k]!)) k = i;
  }
  return k;
}

export function PeriodeMoyenne({ bougies, zoneCreux, zoneSommet }: {
  bougies: Bougie[];
  /** Où chercher le creux puis le sommet du prix (indices de bougies). */
  zoneCreux: [number, number];
  zoneSommet: [number, number];
}) {
  const [n, setN] = useState(20);
  const closes = useMemo(() => bougies.map((b) => b.c), [bougies]);
  const moy = useMemo(() => sma(closes, n), [closes, n]);
  const der = closes.length - 1;

  const creuxPrix = extreme(closes, zoneCreux[0], zoneCreux[1], true);
  const sommetPrix = extreme(closes, zoneSommet[0], zoneSommet[1], false);
  const creuxMoy = extreme(moy, zoneCreux[0], sommetPrix, true);
  const sommetMoy = extreme(moy, creuxPrix, der, false);
  const prix = closes[der], m = moy[der]!;
  const dessus = prix > m;
  const couleur = couleurDe(n);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[0.95rem]" style={{ color: "var(--cap-ink-2)" }}>Les plus suivies :</span>
        <ChoixInd label="Choisir une moyenne courante" valeur={[20, 50, 200].includes(n) ? n : null}
          options={[{ v: 20, texte: "MA 20" }, { v: 50, texte: "MA 50" }, { v: 200, texte: "MA 200" }]} onChange={setN} />
      </div>
      <CurseurInd id="periode-moyenne" label="Nombre de bougies dans la moyenne" valeur={n} min={5} max={200} onChange={setN}
        ecrire={(v) => `${v} bougies`} />
      <div className="mt-3">
        <MiniGraphe bougies={bougies} ligne series={[{ v: moy, couleur, epaisseur: 2.6 }]}
          points={[
            { i: creuxPrix, v: closes[creuxPrix], couleur: "var(--cap-ink)" },
            { i: sommetPrix, v: closes[sommetPrix], couleur: "var(--cap-ink)" },
            ...(creuxMoy >= 0 ? [{ i: creuxMoy, v: moy[creuxMoy]!, couleur }] : []),
            ...(sommetMoy >= 0 && sommetMoy < der ? [{ i: sommetMoy, v: moy[sommetMoy]!, couleur }] : []),
          ]}
          ariaLabel={`Le prix sur ${der + 1} jours et sa moyenne mobile sur ${n} bougies`} hauteur={260} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <PastilleInd couleur="var(--cap-ink)">Le prix (clôtures)</PastilleInd>
        <PastilleInd couleur={couleur}>MA {n}</PastilleInd>
      </div>
      <div className="mt-4">
        <LectureInd>
          <p>
            La MA {n} commence à la bougie {n} : il lui faut {n} clôtures.{" "}
            {creuxMoy >= 0 && (
              <>Le prix a fait son creux à la bougie <b style={{ color: "var(--cap-ink)" }}>{creuxPrix + 1}</b> ; la moyenne a fait le sien à la bougie{" "}
                <b style={{ color: "var(--cap-ink)" }}>{creuxMoy + 1}</b>, soit <b style={{ color: "var(--cap-ink)" }}>{creuxMoy - creuxPrix} bougies de retard</b>. </>
            )}
            {sommetMoy >= 0 && sommetMoy < der
              ? <>Au sommet (bougie {sommetPrix + 1}), elle tourne <b style={{ color: "var(--cap-ink)" }}>{sommetMoy - sommetPrix} bougies</b> après le prix.</>
              : <>Au sommet (bougie {sommetPrix + 1}), elle n'a <b style={{ color: "var(--cap-ink)" }}>toujours pas tourné</b> à la fin du graphique.</>}
          </p>
          <p className="mt-2">
            À la dernière bougie, le prix ({nf(prix)} $) est <b style={{ color: dessus ? "var(--cap-up)" : "var(--cap-down)" }}>{dessus ? "au-dessus" : "en dessous"}</b> de
            sa MA {n} ({nf(m)} $) : sur {n} bougies, la tendance est plutôt {dessus ? "haussière" : "baissière"}.
          </p>
        </LectureInd>
      </div>
    </div>
  );
}
