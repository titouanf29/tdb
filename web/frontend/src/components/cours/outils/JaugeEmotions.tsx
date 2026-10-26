"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fmt, type Bougie } from "@/lib/cours/marche";
import { BoutonTenir, LienTenir, ResultatTenir, useAnimeTenir, useLargeur } from "./ElementsTenir";

/**
 * La jauge peur / avidité : on fait avancer le temps sur un cours, et
 * l'aiguille suit ce que ressent celui qui le regarde. Elle part vers la
 * droite (l'avidité) quand le prix vient de beaucoup monter, vers la gauche
 * (la peur) quand il vient de beaucoup baisser. À la fin, on voit où
 * l'avidité a fait acheter, et où la peur a fait vendre.
 */

const RECUL = 6;

function emotion(c: number[], t: number) {
  const avant = c[Math.max(0, t - RECUL)];
  const d = (c[t] - avant) / avant;
  return Math.max(-1, Math.min(1, d / 0.11));
}

function voix(e: number): { nom: string; phrase: string } {
  if (e >= 0.75) return { nom: "Avidité forte", phrase: "« Tout le monde gagne. Si je n'achète pas maintenant, je vais tout rater. »" };
  if (e >= 0.3) return { nom: "Avidité", phrase: "« Ça monte encore. J'aurais dû acheter plus tôt… il n'est peut-être pas trop tard. »" };
  if (e > -0.3) return { nom: "Calme", phrase: "« Rien de spécial. Je peux réfléchir à mon plan. »" };
  if (e > -0.75) return { nom: "Peur", phrase: "« Ça baisse. Et si ça continuait ? Je devrais peut-être sortir. »" };
  return { nom: "Peur forte", phrase: "« Je vends tout, n'importe quel prix, pourvu que ça s'arrête. »" };
}

export function JaugeEmotions({ bougies, depart = 8 }: { bougies: Bougie[]; depart?: number }) {
  const anime = useAnimeTenir();
  const [boite, W] = useLargeur();
  const c = useMemo(() => bougies.map((b) => b.c), [bougies]);
  const n = c.length;
  const [t, setT] = useState(depart);
  const [revele, setRevele] = useState(false);

  // Où l'avidité achète : l'émotion la plus forte vers le haut ; où la peur vend : la plus forte vers le bas, après.
  // Où l'avidité achète : à la fin de la première poussée d'avidité forte (tout en haut) ;
  // où la peur vend : à la fin de la poussée de peur forte qui suit (tout en bas).
  const { iAchat, iVente } = useMemo(() => {
    const fin = (de: number, test: (e: number) => boolean) => {
      let i = de;
      while (i < n && !test(emotion(c, i))) i++;
      if (i >= n) return -1;
      while (i + 1 < n && test(emotion(c, i + 1))) i++;
      return i;
    };
    const ia = Math.max(0, fin(1, (e) => e >= 0.85));
    const iv = fin(ia + 1, (e) => e <= -0.85);
    return { iAchat: ia, iVente: iv < 0 ? n - 1 : iv };
  }, [c, n]);

  const e = emotion(c, t);
  const v = voix(e);
  const H = W < 520 ? 200 : 240;
  const mn = Math.min(...c), mx = Math.max(...c);
  const lo = mn - (mx - mn) * 0.2, hi = mx + (mx - mn) * 0.3;
  const X = (i: number) => 8 + (i / (n - 1)) * (W - 60);
  const Y = (p: number) => 10 + (1 - (p - lo) / (hi - lo)) * (H - 20);
  const chemin = c.slice(0, t + 1).map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p).toFixed(1)}`).join("");
  const perte = (c[iVente] - c[iAchat]) / c[iAchat];

  // La jauge : un demi-cercle, la peur en rouge à gauche, l'avidité en vert à droite.
  const R = 70, cx = 90, cy = 84;
  const arc = (a0: number, a1: number) => {
    const p = (a: number) => [cx + R * Math.cos(((a - 90) * Math.PI) / 180), cy + R * Math.sin(((a - 90) * Math.PI) / 180)];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return `M${x0},${y0} A${R},${R} 0 0 1 ${x1},${y1}`;
  };

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px] md:items-center">
        <div ref={boite} className="min-w-0">
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Le cours de l'action d'exemple, jusqu'au moment choisi">
            {[0.2, 0.5, 0.8].map((f) => <line key={f} x1={8} x2={W - 52} y1={Y(lo + (hi - lo) * f)} y2={Y(lo + (hi - lo) * f)} stroke="var(--cap-line-chart)" />)}
            {[lo + (hi - lo) * 0.2, lo + (hi - lo) * 0.5, lo + (hi - lo) * 0.8].map((p) => (
              <text key={p} x={W - 46} y={Y(p) + 4} fontSize="11.5" fill="var(--cap-ink-3)">{fmt(p, 0)}</text>
            ))}
            <path d={chemin} fill="none" stroke="var(--cap-ink)" strokeWidth="2.2" strokeLinejoin="round" />
            <defs>
              <pattern id="jauge-futur" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="8" stroke="var(--cap-line-strong)" strokeWidth="1" />
              </pattern>
            </defs>
            {t < n - 1 && <rect x={X(t) + 6} y={10} width={Math.max(0, W - 52 - X(t) - 6)} height={H - 20} fill="url(#jauge-futur)" opacity="0.6" />}
            {t < n - 1 && W - 52 - X(t) > 70 && <text x={(X(t) + W - 52) / 2} y={28} textAnchor="middle" fontSize="12.5" fontStyle="italic" fill="var(--cap-ink-3)" style={{ fontFamily: "var(--cap-font-display)" }}>la suite</text>}
            <circle cx={X(t)} cy={Y(c[t])} r="5.5" fill={e >= 0.3 ? "var(--cap-up)" : e <= -0.3 ? "var(--cap-down)" : "var(--cap-ink)"} stroke="var(--cap-surface)" strokeWidth="2" />
            {revele && (
              <g>
                <path d={`M${X(iAchat)},${Y(c[iAchat]) - 8} l7,-12 h-14 z`} fill="var(--cap-up)" />
                <text x={Math.min(Math.max(X(iAchat), 70), W - 120)} y={Y(c[iAchat]) - 26} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--cap-up)" stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">L'avidité achète à {fmt(c[iAchat], 0)}</text>
                <path d={`M${X(iVente)},${Y(c[iVente]) + 8} l7,12 h-14 z`} fill="var(--cap-down)" />
                <text x={Math.min(Math.max(X(iVente), 70), W - 120)} y={Y(c[iVente]) + 34} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--cap-down)" stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">La peur vend à {fmt(c[iVente], 0)}</text>
              </g>
            )}
          </svg>
        </div>
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 180 104" width="180" height="104" role="img" aria-label={`Jauge des émotions : ${v.nom}`}>
            <path d={arc(-80, -28)} stroke="var(--cap-down)" strokeWidth="12" fill="none" strokeLinecap="round" opacity="0.85" />
            <path d={arc(-20, 20)} stroke="var(--cap-line-strong)" strokeWidth="12" fill="none" strokeLinecap="round" />
            <path d={arc(28, 80)} stroke="var(--cap-up)" strokeWidth="12" fill="none" strokeLinecap="round" opacity="0.85" />
            <g style={{ transform: `rotate(${e * 80}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: anime ? "transform .45s cubic-bezier(.3,1.4,.5,1)" : "none" }}>
              <line x1={cx} y1={cy} x2={cx} y2={cy - R + 10} stroke="var(--cap-ink)" strokeWidth="3" strokeLinecap="round" />
            </g>
            <circle cx={cx} cy={cy} r="6" fill="var(--cap-ink)" />
            <text x="12" y="102" fontSize="12" fontWeight="600" fill="var(--cap-down)">Peur</text>
            <text x="168" y="102" fontSize="12" fontWeight="600" fill="var(--cap-up)" textAnchor="end">Avidité</text>
          </svg>
          <p className="mt-1 text-[1.05rem] font-semibold" style={{ fontFamily: "var(--cap-font-display)", color: e >= 0.3 ? "var(--cap-up)" : e <= -0.3 ? "var(--cap-down)" : "var(--cap-ink)" }}>{v.nom}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button type="button" aria-label="Une bougie en arrière" onClick={() => setT((x) => Math.max(1, x - 1))}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full transition-colors hover:bg-[color:var(--cap-surface-2)]"><ChevronLeft size={18} /></button>
        <input type="range" min={1} max={n - 1} value={t} onChange={(ev) => setT(Number(ev.target.value))}
          aria-label="Faire avancer le temps" className="h-11 min-w-0 flex-1" style={{ accentColor: "var(--cap-ambre)" }} />
        <button type="button" aria-label="Une bougie en avant" onClick={() => setT((x) => Math.min(n - 1, x + 1))}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full transition-colors hover:bg-[color:var(--cap-surface-2)]"><ChevronRight size={18} /></button>
      </div>

      <ResultatTenir className="mt-2">
        <p>Jour {t + 1}, cours <b style={{ color: "var(--cap-ink)" }}>{fmt(c[t], 0)}</b>. Ce que dit l'émotion : <em>{v.phrase}</em></p>
        {revele && (
          <p className="mt-2">
            Acheter à <b style={{ color: "var(--cap-ink)" }}>{fmt(c[iAchat], 0)}</b> quand l'avidité est au plus fort, revendre à <b style={{ color: "var(--cap-ink)" }}>{fmt(c[iVente], 0)}</b> quand la peur est au plus fort :
            {" "}<b style={{ color: "var(--cap-down)" }}>{fmt(perte * 100, 0)} %</b> de la mise. Ce ne sont pas les chiffres qui ont décidé, ce sont les émotions. Et regardez la fin : le cours est remonté, sans vous.
          </p>
        )}
      </ResultatTenir>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {!revele
          ? <BoutonTenir onClick={() => { setRevele(true); setT(n - 1); }}>Voir ce que les émotions ont fait</BoutonTenir>
          : <LienTenir onClick={() => { setRevele(false); setT(depart); }}>Recommencer</LienTenir>}
      </div>
    </div>
  );
}
