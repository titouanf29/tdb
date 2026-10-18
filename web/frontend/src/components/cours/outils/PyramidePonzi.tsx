"use client";

import { useMemo, useState } from "react";
import { BoutonTenir, ChiffreTenir, LienTenir, ResultatTenir, nombre, useAnimeTenir } from "./ElementsTenir";

/**
 * La pyramide de Ponzi, mois par mois. Chacun verse 1 000 € et on lui promet
 * 10 % par mois. Aucun trading : les « gains » des premiers sont payés avec
 * l'argent des nouveaux, et l'organisateur garde la moitié de chaque
 * versement. Quand les nouveaux n'arrivent plus, la caisse ne couvre plus ce
 * qui est promis, et tout s'effondre.
 */

const NOUVEAUX = [10, 20, 40, 80, 160, 240, 120, 40, 10, 0];
const MISE = 1000, PROMESSE = 0.1, GARDE = 0.5;

type Mois = { m: number; nouveaux: number; total: number; verse: number; du: number; caisse: number; paye: number; garde: number; effondre: boolean };

function simuler(): Mois[] {
  const out: Mois[] = [];
  let total = 0, caisse = 0, paye = 0, garde = 0;
  for (let i = 0; i < NOUVEAUX.length; i++) {
    const n = NOUVEAUX[i];
    total += n;
    const verse = n * MISE;
    caisse += verse * (1 - GARDE);
    garde += verse * GARDE;
    const du = total * MISE * PROMESSE;
    const effondre = caisse < du;
    if (!effondre) { caisse -= du; paye += du; }
    out.push({ m: i + 1, nouveaux: n, total, verse, du, caisse, paye, garde, effondre });
    if (effondre) break;
  }
  return out;
}

const euros = (x: number) => `${nombre(Math.round(x))} €`;

export function PyramidePonzi() {
  const anime = useAnimeTenir();
  const mois = useMemo(simuler, []);
  const [k, setK] = useState(0); // nombre de mois écoulés
  const cur = k > 0 ? mois[k - 1] : null;
  const effondre = !!cur?.effondre;
  const etages = mois.slice(0, k).filter((x) => x.nouveaux > 0);
  const maxN = Math.max(...NOUVEAUX);
  const W = 320, HE = 22;
  const H = Math.max(1, etages.length) * (HE + 4) + 24;

  return (
    <div>
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end">
        <div>
          <svg viewBox={`0 0 ${W} ${Math.max(H, 120)}`} width="100%" style={{ maxWidth: 420, display: "block", margin: "0 auto" }} role="img"
            aria-label={k === 0 ? "La pyramide est vide" : `La pyramide après ${k} mois : ${cur!.total} personnes`}>
            {/* Les premiers en haut, les nouveaux dessous : chaque étage est un mois d'arrivées. */}
            {etages.map((x, i) => {
              const larg = 92 + (x.nouveaux / maxN) * (W - 140);
              const y = 8 + i * (HE + 4);
              const chute = effondre;
              const dx = chute ? (i % 2 ? 1 : -1) * (20 + i * 6) : 0;
              const dy = chute ? 18 + (etages.length - i) * 4 : 0;
              const rot = chute ? (i % 2 ? 1 : -1) * (6 + i * 2) : 0;
              return (
                <g key={x.m} style={{ transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, transformOrigin: `${W / 2}px ${y + HE / 2}px`, transformBox: "view-box",
                  transition: anime ? `transform .9s cubic-bezier(.5,0,.75,0) ${(etages.length - i) * 0.06}s, opacity .9s ease ${(etages.length - i) * 0.06}s` : "none",
                  opacity: chute ? 0.35 : 1 }}>
                  <rect x={(W - larg) / 2} y={y} width={larg} height={HE} rx="4"
                    fill={i === 0 ? "var(--cap-ink)" : "var(--cap-surface-2)"} stroke="var(--cap-line-strong)" />
                  <text x={W / 2} y={y + HE / 2 + 4} textAnchor="middle" fontSize="11.5" fontWeight="600"
                    fill={i === 0 ? "var(--cap-on-inverse)" : "var(--cap-ink-2)"}>
                    Mois {x.m} : {x.nouveaux}
                  </text>
                </g>
              );
            })}
            {k > 0 && !effondre && etages.length > 1 && (
              // L'argent monte des nouveaux vers les premiers.
              <g>
                <line x1={W - 16} x2={W - 16} y1={8 + HE / 2} y2={8 + (etages.length - 1) * (HE + 4) + HE / 2} stroke="var(--cap-line-strong)" strokeDasharray="3 3" />
                {[0, 1, 2].map((j) => (
                  <circle key={`${k}-${j}`} cx={W - 16} cy={8 + HE / 2 + Math.min(j, etages.length - 1) * (HE + 4)} r="5" fill="var(--cap-ambre)" stroke="var(--cap-amber-ink)">
                    {anime
                      ? <animate attributeName="cy" from={8 + (etages.length - 1) * (HE + 4) + HE / 2} to={8 + HE / 2} dur="1.4s" begin={`${j * 0.35}s`} repeatCount="2" fill="freeze" />
                      : null}
                  </circle>
                ))}
              </g>
            )}
            {k === 0 && <text x={W / 2} y={60} textAnchor="middle" fontSize="13" fontStyle="italic" fill="var(--cap-ink-3)">Personne encore.</text>}
          </svg>
          {k > 0 && <p className="mt-1 text-center text-[0.85rem]" style={{ color: "var(--cap-ink-3)" }}>En haut, les premiers arrivés ; dessous, les nouveaux de chaque mois. À droite, les pièces montent des nouveaux vers les premiers.</p>}
        </div>

        <div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <ChiffreTenir valeur={cur ? nombre(cur.total) : "0"} legende="personnes dans le système" />
            <ChiffreTenir valeur={cur ? euros(cur.verse) : "0 €"} legende="versés par les nouveaux ce mois-ci" />
            <ChiffreTenir valeur={cur ? euros(cur.du) : "0 €"} legende="« gains » promis ce mois-ci (10 %)" />
            <ChiffreTenir valeur={cur ? euros(cur.caisse) : "0 €"} legende="dans la caisse, après paiement" couleur={effondre ? "var(--cap-down)" : undefined} />
          </div>
        </div>
      </div>

      <ResultatTenir className="mt-4">
        {k === 0 && <p>Un organisateur promet <b style={{ color: "var(--cap-ink)" }}>10 % par mois</b> à qui lui confie 1 000 €. Il ne fait aucun trading. Faites avancer les mois.</p>}
        {cur && !effondre && (
          <p>
            Mois {cur.m} : {cur.nouveaux > 0 ? `${cur.nouveaux} nouveaux arrivent et versent ${euros(cur.verse)}.` : "plus aucun nouveau n'arrive."}{" "}
            L'organisateur en garde la moitié, et paie les 10 % promis à tout le monde avec le reste : {euros(cur.du)}.
            {" "}{cur.m <= 4 ? "Les premiers sont payés à l'heure, ils en parlent autour d'eux : la publicité est gratuite." : cur.nouveaux < (mois[k - 2]?.nouveaux ?? 0) ? <b style={{ color: "var(--cap-ink)" }}>Les nouveaux ralentissent, et la caisse commence à fondre.</b> : "La pyramide grandit vite : tout semble marcher."}
          </p>
        )}
        {effondre && cur && (
          <>
            <p><b style={{ color: "var(--cap-down)" }}>Mois {cur.m} : effondrement.</b> Plus aucun nouveau. Il faudrait payer {euros(cur.du)}, la caisse n'en a que {euros(cur.caisse)}. Les paiements s'arrêtent, tout le monde veut récupérer sa mise en même temps, et l'organisateur disparaît.</p>
            <p className="mt-2">
              Au total, {nombre(cur.total)} personnes ont versé {euros(cur.total * MISE)}. Elles n'ont reçu que {euros(cur.paye)}. L'organisateur a gardé {euros(cur.garde)}.
              {" "}Même les dix premiers n'ont touché que {euros((cur.m - 1) * MISE * PROMESSE)} pour 1 000 € versés ; les derniers arrivés, presque rien.
            </p>
          </>
        )}
      </ResultatTenir>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {!effondre && <BoutonTenir onClick={() => setK((x) => Math.min(mois.length, x + 1))}>{k === 0 ? "Premier mois" : "Mois suivant"}</BoutonTenir>}
        {k > 0 && <LienTenir onClick={() => setK(0)}>Recommencer</LienTenir>}
      </div>
    </div>
  );
}
