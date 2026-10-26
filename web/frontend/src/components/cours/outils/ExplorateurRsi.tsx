"use client";

import { useMemo, useState } from "react";
import { rsi, type Bougie } from "@/lib/cours/marche";
import { CurseurInd, LectureInd, MiniGraphe, nf, transitionInd, useCalmeInd } from "./ElementsIndicateurs";

/**
 * Le RSI, bougie par bougie. On déplace le curseur (ou le doigt sur le
 * graphique) : les 14 dernières variations s'éclairent, la moyenne des
 * hausses et celle des baisses se mettent à jour, et le RSI se lit. Le calcul
 * est celui du graphique des leçons (Wilder) : les chiffres concordent.
 */

/** Les deux moyennes lissées de Wilder, calculées exactement comme `rsi` de marche.ts. */
function moyennesWilder(x: number[], n = 14) {
  let g = 0, p = 0;
  const G: (number | null)[] = [], P: (number | null)[] = [];
  x.forEach((v, i) => {
    if (i === 0) { G.push(null); P.push(null); return; }
    const d = v - x[i - 1];
    const up = Math.max(d, 0), dn = Math.max(-d, 0);
    if (i <= n) { g += up / n; p += dn / n; G.push(i === n ? g : null); P.push(i === n ? p : null); return; }
    g = (g * (n - 1) + up) / n;
    p = (p * (n - 1) + dn) / n;
    G.push(g); P.push(p);
  });
  return { G, P };
}

function lecture(r: number) {
  if (r >= 70) return { titre: "Surachat (overbought)", texte: "Les hausses dominent nettement : le prix est monté vite, il peut souffler. Ce n'est pas un ordre de vente : en forte tendance, le RSI peut rester au-dessus de 70 longtemps." };
  if (r <= 30) return { titre: "Survente (oversold)", texte: "Les baisses dominent nettement : le prix a beaucoup baissé, un rebond devient possible. Ce n'est pas un ordre d'achat : une forte baisse peut continuer." };
  if (r >= 55) return { titre: "Les hausses l'emportent", texte: "Entre 50 et 70 : les acheteurs ont un peu plus de force que les vendeurs, sans excès." };
  if (r <= 45) return { titre: "Les baisses l'emportent", texte: "Entre 30 et 50 : les vendeurs ont un peu plus de force que les acheteurs, sans excès." };
  return { titre: "L'équilibre", texte: "Autour de 50 : hausses et baisses se valent." };
}

export function ExplorateurRsi({ bougies, depart, periode = 14 }: { bougies: Bougie[]; depart?: number; periode?: number }) {
  const closes = useMemo(() => bougies.map((b) => b.c), [bougies]);
  const r = useMemo(() => rsi(closes, periode), [closes, periode]);
  const { G, P } = useMemo(() => moyennesWilder(closes, periode), [closes, periode]);
  const n = bougies.length;
  const [k, setK] = useState(depart ?? Math.min(n - 1, periode + 10));
  const calme = useCalmeInd();

  const val = r[k]!;
  const variations = Array.from({ length: periode }, (_, j) => closes[k - periode + 1 + j] - closes[k - periode + j]);
  const hausses = variations.filter((d) => d > 0), baisses = variations.filter((d) => d < 0);
  const maxAbs = Math.max(...variations.map(Math.abs), 1e-9);
  const g = G[k]!, p = P[k]!;
  const dernier = variations[periode - 1];
  const premiere = k === periode;
  const lu = lecture(val);

  return (
    <div>
      <CurseurInd id="rsi-bougie" label="La bougie lue" valeur={k} min={periode} max={n - 1} onChange={setK}
        ecrire={(v) => `bougie ${v + 1} sur ${n}`} />
      <p className="mb-2 text-[0.88rem]" style={{ color: "var(--cap-ink-3)" }}>Vous pouvez aussi glisser le doigt sur le graphique.</p>
      <MiniGraphe bougies={bougies} bande={{ i0: k - periode + 1, i1: k }} curseur={k} onIndex={(i) => setK(Math.max(periode, i))}
        panneaux={[{ titre: `RSI (14) : ${nf(val, 1)}`, min: 0, max: 100, seuils: [30, 70], series: [{ v: r, couleur: "var(--cap-ocean)" }], points: [{ i: k, v: val, couleur: "var(--cap-ocean)" }] }]}
        ariaLabel="Le prix et son RSI ; la bande éclaire les 14 dernières bougies" hauteur={220} etroitHauteur={170} />

      <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div>
          <p className="mb-1.5 text-[0.92rem]" style={{ color: "var(--cap-ink-2)" }}>Les 14 dernières variations de clôture</p>
          <svg viewBox="0 0 280 92" width="100%" height="92" role="img" aria-label={`${hausses.length} hausses et ${baisses.length} baisses`}>
            <line x1="0" x2="280" y1="46" y2="46" stroke="var(--cap-line-strong)" />
            {variations.map((d, j) => {
              const h = (Math.abs(d) / maxAbs) * 40;
              return (
                <rect key={j} x={j * 20 + 3} width="14" y={d >= 0 ? 46 - h : 46} height={Math.max(1, h)} rx="2"
                  fill={d >= 0 ? "var(--cap-up-fill)" : "var(--cap-down-fill)"}
                  stroke={j === periode - 1 ? "var(--cap-ambre)" : "none"} strokeWidth="2"
                  style={{ transition: transitionInd(calme, "y 200ms ease, height", 200) }} />
              );
            })}
          </svg>
          <p className="mt-1 text-[0.92rem] tabular-nums" style={{ color: "var(--cap-ink-2)" }}>
            <span style={{ color: "var(--cap-up)" }}>{hausses.length} hausses</span> (en tout +{nf(hausses.reduce((a, v) => a + v, 0), 1)} $),{" "}
            <span style={{ color: "var(--cap-down)" }}>{baisses.length} baisses</span> (en tout −{nf(-baisses.reduce((a, v) => a + v, 0), 1)} $).
          </p>
        </div>
        <LectureInd>
          {premiere ? (
            <p>Première valeur : la moyenne simple des 14 variations. Hausses : {nf(g * periode, 1)} ÷ 14 = <b style={{ color: "var(--cap-up)" }}>{nf(g, 2)}</b>. Baisses : {nf(p * periode, 1)} ÷ 14 = <b style={{ color: "var(--cap-down)" }}>{nf(p, 2)}</b>.</p>
          ) : (
            <p className="tabular-nums">
              La dernière bougie {dernier >= 0 ? "monte" : "baisse"} de <b style={{ color: "var(--cap-ink)" }}>{nf(Math.abs(dernier), 1)} $</b>. Chaque moyenne garde 13 parts de l'ancienne et prend 1 part du jour :
              hausses <b style={{ color: "var(--cap-up)" }}>{nf(g, 2)}</b>, baisses <b style={{ color: "var(--cap-down)" }}>{nf(p, 2)}</b>.
            </p>
          )}
          <p className="mt-2 tabular-nums">
            RSI = 100 × {nf(g, 2)} ÷ ({nf(g, 2)} + {nf(p, 2)}) = <b className="text-[1.1rem]" style={{ color: "var(--cap-ink)" }}>{nf(val, 1)}</b>
          </p>
          <p className="mt-2"><b style={{ color: val >= 70 || val <= 30 ? "var(--cap-amber-ink)" : "var(--cap-ink)" }}>{lu.titre}.</b> {lu.texte}</p>
        </LectureInd>
      </div>
    </div>
  );
}
