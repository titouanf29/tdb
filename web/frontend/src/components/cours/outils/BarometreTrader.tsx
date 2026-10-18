"use client";

import { useState } from "react";
import { LienTenir, ResultatTenir, useAnimeTenir } from "./ElementsTenir";

/**
 * Le baromètre d'avant séance : six questions honnêtes, oui ou non. Une seule
 * mauvaise réponse suffit à dire « pas maintenant », avec le remède.
 */

const QUESTIONS: { q: string; bon: boolean; remede: string }[] = [
  { q: "Mon plan est écrit : quand entrer, où sortir, combien risquer.", bon: true, remede: "Écrivez votre plan avant d'ouvrir le graphique (leçon « Le plan de trading »). Sans plan, ce sont vos émotions qui décident." },
  { q: "Je connais la somme que je risque par trade, et la perdre ne me fait pas peur.", bon: true, remede: "Baissez la taille jusqu'à ce que la perte possible vous laisse calme : 1 % du compte au plus (leçon « La taille de position »)." },
  { q: "J'ai perdu récemment et j'ai envie de me refaire.", bon: false, remede: "C'est l'état exact du revenge trading. Faites une pause, relisez votre journal, revenez plus tard ou demain." },
  { q: "Je suis fatigué, énervé ou pressé.", bon: false, remede: "La fatigue et l'énervement font faire des erreurs. Un trade attend, votre lucidité non." },
  { q: "J'ai envie d'entrer parce que « ça part sans moi ».", bon: false, remede: "C'est le FOMO. Un train parti, on le laisse partir : attendez un setup de votre plan." },
  { q: "Je m'ennuie et je cherche quelque chose à faire.", bon: false, remede: "L'ennui mène à l'overtrading. Pas de setup, pas de trade : fermez la plateforme." },
];

export function BarometreTrader() {
  const anime = useAnimeTenir();
  const [rep, setRep] = useState<(boolean | null)[]>(() => QUESTIONS.map(() => null));
  const repondues = rep.filter((r) => r != null).length;
  const mauvaises = QUESTIONS.map((q, i) => (rep[i] != null && rep[i] !== q.bon ? i : -1)).filter((i) => i >= 0);
  const bonnes = repondues - mauvaises.length;
  // L'aiguille : de « beau temps » (à droite) à « tempête » (à gauche).
  const pos = mauvaises.length > 0 ? Math.max(0.04, 0.36 - 0.1 * (mauvaises.length - 1)) : 0.5 + (0.46 * bonnes) / QUESTIONS.length;

  return (
    <div>
      <ul className="grid gap-2">
        {QUESTIONS.map((q, i) => (
          <li key={i} className="flex flex-col gap-2 rounded-[10px] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between" style={{ backgroundColor: "var(--cap-surface-2)" }}>
            <span className="text-[0.97rem] leading-snug" style={{ color: "var(--cap-ink)" }} id={`baro-${i}`}>{q.q}</span>
            <span role="group" aria-labelledby={`baro-${i}`} className="flex flex-none gap-1">
              {[true, false].map((v) => {
                const actif = rep[i] === v;
                return (
                  <button key={String(v)} type="button" aria-pressed={actif}
                    onClick={() => setRep((r) => r.map((x, j) => (j === i ? v : x)))}
                    className="h-11 min-w-[64px] rounded-[10px] px-3 text-[0.95rem] font-semibold"
                    style={{
                      backgroundColor: actif ? "var(--cap-ink)" : "var(--cap-surface)",
                      color: actif ? "var(--cap-on-inverse)" : "var(--cap-ink-2)",
                      boxShadow: actif ? "none" : "inset 0 0 0 1px var(--cap-line-strong)",
                    }}>
                    {v ? "Oui" : "Non"}
                  </button>
                );
              })}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <div className="relative h-3 rounded-full" style={{ background: "linear-gradient(90deg, var(--cap-down), var(--cap-line-strong) 50%, var(--cap-up))", opacity: 0.85 }} aria-hidden>
          <span className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${pos * 100}%`, backgroundColor: "var(--cap-surface)", boxShadow: "0 0 0 3px var(--cap-ink)", transition: anime ? "left .5s cubic-bezier(.3,1.3,.5,1)" : "none" }} />
        </div>
        <div className="mt-1 flex justify-between text-[0.85rem]" style={{ color: "var(--cap-ink-3)" }}>
          <span>Tempête : ne tradez pas</span><span>Beau temps</span>
        </div>
      </div>

      <ResultatTenir className="mt-3">
        {repondues < QUESTIONS.length ? (
          <p>Répondez honnêtement aux six questions ({repondues} sur {QUESTIONS.length}). Personne ne voit vos réponses.</p>
        ) : mauvaises.length === 0 ? (
          <p><b style={{ color: "var(--cap-up)" }}>Vous pouvez ouvrir le graphique.</b> Suivez votre plan, et rien que lui. Si l'une de ces réponses change pendant la séance, arrêtez-vous.</p>
        ) : (
          <>
            <p><b style={{ color: "var(--cap-down)" }}>Pas maintenant.</b> {mauvaises.length === 1 ? "Une réponse suffit à fausser vos décisions :" : `${mauvaises.length} réponses vont fausser vos décisions :`}</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">{mauvaises.map((i) => <li key={i}>{QUESTIONS[i].remede}</li>)}</ul>
          </>
        )}
      </ResultatTenir>
      {repondues > 0 && <div className="mt-1"><LienTenir onClick={() => setRep(QUESTIONS.map(() => null))}>Effacer mes réponses</LienTenir></div>}
    </div>
  );
}
