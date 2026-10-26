"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Choix, useAnimer } from "./ElementsMarches";

/**
 * Un calendrier économique d'exemple, comme sur les sites spécialisés : jour,
 * heure de Paris, pays, annonce, importance, précédent et prévu. On filtre par
 * importance et on touche une ligne pour savoir ce que mesure l'annonce.
 */

type Imp = 1 | 2 | 3;
const LIGNES: { jour: string; heure: string; pays: string; nom: string; imp: Imp; prec: string; prevu: string; quoi: string }[] = [
  { jour: "Lundi", heure: "10 h 30", pays: "Zone euro", nom: "Moral des investisseurs (Sentix)", imp: 1, prec: "−3,1", prevu: "−2,5", quoi: "Une enquête auprès d'investisseurs. Elle bouge rarement le marché seule." },
  { jour: "Mardi", heure: "11 h", pays: "Allemagne", nom: "Confiance économique (ZEW)", imp: 2, prec: "12,5", prevu: "14,0", quoi: "Le moral des analystes allemands. Peut faire bouger l'euro de quelques pips." },
  { jour: "Mercredi", heure: "14 h 30", pays: "États-Unis", nom: "Inflation (CPI), sur un an", imp: 3, prec: "2,9 %", prevu: "2,8 %", quoi: "La hausse des prix. Elle guide la Fed : une des annonces qui font le plus bouger le dollar et l'or." },
  { jour: "Mercredi", heure: "20 h", pays: "États-Unis", nom: "Décision de taux de la Fed", imp: 3, prec: "4,00 %", prevu: "3,75 %", quoi: "Le taux directeur américain, suivi d'une conférence de presse à 20 h 30 qui peut faire bouger autant que la décision." },
  { jour: "Jeudi", heure: "14 h 15", pays: "Zone euro", nom: "Décision de taux de la BCE", imp: 3, prec: "2,00 %", prevu: "2,00 %", quoi: "Le taux de la Banque centrale européenne, puis sa conférence de presse à 14 h 45." },
  { jour: "Jeudi", heure: "14 h 30", pays: "États-Unis", nom: "Inscriptions hebdomadaires au chômage", imp: 2, prec: "228 000", prevu: "225 000", quoi: "Les nouveaux chômeurs de la semaine. Un chiffre chaque jeudi, d'importance moyenne." },
  { jour: "Vendredi", heure: "14 h 30", pays: "États-Unis", nom: "Emploi américain (NFP)", imp: 3, prec: "150 000", prevu: "170 000", quoi: "Les emplois créés en un mois, hors agriculture, publiés en général le premier vendredi du mois. Souvent l'annonce la plus attendue." },
  { jour: "Vendredi", heure: "16 h", pays: "États-Unis", nom: "Confiance des consommateurs (Michigan)", imp: 2, prec: "55,1", prevu: "56,0", quoi: "Le moral des ménages américains. Bouge parfois le dollar, rarement beaucoup." },
];

const NOMS_IMP = ["", "faible", "moyenne", "forte"];

function Points({ imp }: { imp: Imp }) {
  return (
    <span className="inline-flex gap-[3px]" role="img" aria-label={`Importance ${NOMS_IMP[imp]}`}>
      {[1, 2, 3].map((k) => (
        <span key={k} className="h-2 w-2 rounded-full" style={{ backgroundColor: k <= imp ? (imp === 3 ? "var(--cap-ambre)" : "var(--cap-ink-2)") : "var(--cap-line-strong)" }} />
      ))}
    </span>
  );
}

export function CalendrierAnnonces() {
  const animer = useAnimer();
  const [min, setMin] = useState<Imp>(1);
  const [ouvert, setOuvert] = useState<number | null>(null);
  const visibles = LIGNES.map((l, i) => ({ ...l, i })).filter((l) => l.imp >= min);

  return (
    <div>
      <Choix label="Afficher" valeur={min} onChange={(v) => { setMin(v); setOuvert(null); }} petit
        options={[{ v: 1, t: "Toutes" }, { v: 2, t: "Moyennes et fortes" }, { v: 3, t: "Fortes seulement" }]} />
      <p className="mt-1 text-[0.9rem]" style={{ color: "var(--cap-ink-3)" }} aria-live="polite">
        {visibles.length} annonce{visibles.length > 1 ? "s" : ""}. Une semaine d&apos;exemple, chargée exprès. Heures de Paris.
      </p>
      <ul className="mt-3 border-t" style={{ borderColor: "var(--cap-line-strong)" }}>
        {visibles.map((l, n) => {
          const nouveauJour = n === 0 || visibles[n - 1].jour !== l.jour;
          const deplie = ouvert === l.i;
          return (
            <li key={l.i} className="border-b" style={{ borderColor: "var(--cap-line)" }}>
              {nouveauJour && <p className="pt-3 text-[0.88rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>{l.jour}</p>}
              <button type="button" onClick={() => setOuvert(deplie ? null : l.i)} aria-expanded={deplie}
                className="grid min-h-11 w-full grid-cols-[4.2rem_minmax(0,1fr)_auto] items-center gap-x-3 py-2.5 text-left">
                <span className="tabular-nums text-[0.95rem] font-semibold" style={{ color: "var(--cap-ink)" }}>{l.heure}</span>
                <span className="min-w-0">
                  <span className="block text-[0.98rem] leading-snug" style={{ color: "var(--cap-ink)", fontWeight: l.imp === 3 ? 600 : 400 }}>{l.nom}</span>
                  <span className="block text-[0.85rem]" style={{ color: "var(--cap-ink-3)" }}>{l.pays}. Précédent {l.prec}, prévu {l.prevu}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Points imp={l.imp} />
                  <ChevronDown size={16} aria-hidden style={{ color: "var(--cap-ink-3)", transform: deplie ? "rotate(180deg)" : undefined, transition: animer ? "transform .2s ease" : undefined }} />
                </span>
              </button>
              {deplie && (
                <p className="pb-3 pl-[4.95rem] text-[0.95rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>
                  {l.quoi} Importance <b>{NOMS_IMP[l.imp]}</b>. Le publié s&apos;affichera ici à l&apos;heure dite.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
