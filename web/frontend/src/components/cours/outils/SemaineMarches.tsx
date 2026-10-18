"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { Curseur, heureTexte, JOURS, Lien, maintenantParis, useAnimer } from "./ElementsMarches";

/**
 * Une semaine-type des marchés, à l'heure de Paris : on choisit un jour et une
 * heure (ou « maintenant »), et l'on voit ce qui est ouvert : forex, or,
 * crypto, bourses européennes, Wall Street. Chaque marché a sa bande de la
 * journée, et le curseur montre où l'on en est.
 */

type Marche = { nom: string; detail: string; ouvert: (j: number, h: number) => boolean; pause?: (j: number, h: number) => boolean };

const MARCHES: Marche[] = [
  { nom: "Forex", detail: "euro-dollar, livre-dollar…", ouvert: (j, h) => (j <= 3 ? true : j === 4 ? h < 23 : j === 6 ? h >= 23 : false) },
  {
    nom: "Or", detail: "XAUUSD", ouvert: (j, h) => (j <= 3 ? h < 23 : j === 4 ? h < 23 : false),
    pause: (j, h) => j <= 3 && h >= 23,
  },
  { nom: "Crypto", detail: "Bitcoin, Ethereum…", ouvert: () => true },
  { nom: "Bourses européennes", detail: "CAC 40, DAX, actions", ouvert: (j, h) => j <= 4 && h >= 9 && h < 17.5 },
  { nom: "Wall Street", detail: "S&P 500, Nasdaq, actions", ouvert: (j, h) => j <= 4 && h >= 15.5 && h < 22 },
];

/** Les plages d'ouverture d'un jour, en heures : [[début, fin], …]. */
function plages(m: Marche, j: number): [number, number][] {
  const out: [number, number][] = [];
  for (let k = 0; k < 48; k++) {
    const h = k / 2;
    if (!m.ouvert(j, h)) continue;
    const der = out[out.length - 1];
    if (der && der[1] === h) der[1] = h + 0.5;
    else out.push([h, h + 0.5]);
  }
  return out;
}

const COURTS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function commentaire(j: number, h: number): string {
  if (j === 5 || (j === 6 && h < 23)) return "Le week-end : seule la crypto cote. Le forex rouvre dimanche vers 23 h.";
  if (j === 4 && h >= 23) return "Vendredi soir : tout ferme, sauf la crypto, jusqu'à dimanche soir.";
  if (j === 6) return "Dimanche soir : le forex rouvre, avec peu de monde et un spread souvent large.";
  if (h >= 15.5 && h < 18) return "Londres et New York sont ouverts ensemble, Wall Street aussi : le moment le plus actif de la journée.";
  if (h >= 14 && h < 15.5) return "New York arrive : le forex et l'or s'animent, avec les chiffres américains de 14 h 30. Wall Street ouvre à 15 h 30.";
  if (h >= 9 && h < 14) return "L'Europe travaille : Londres mène le forex, les bourses européennes sont ouvertes.";
  if (h >= 18 && h < 22) return "Le soir : Wall Street cote encore, le forex et l'or se calment peu à peu.";
  if (h >= 22 && h < 23) return "Wall Street a fermé. Le forex et l'or vivent leur dernière heure, très calme.";
  if (h >= 23) return "Le creux de la nuit : l'or fait sa pause quotidienne, le forex tourne au ralenti.";
  return "La nuit : la session asiatique. Le forex et l'or cotent, souvent calmement. Les bourses sont fermées.";
}

export function SemaineMarches() {
  const animer = useAnimer();
  const [jour, setJour] = useState(2);
  const [heure, setHeure] = useState(15.5);
  const [reel, setReel] = useState(false);

  const maintenant = () => {
    const m = maintenantParis();
    setJour(m.jour);
    setHeure(Math.floor(m.heure * 2) / 2);
    setReel(true);
  };

  const pos = (heure / 24) * 100;
  const ouverts = MARCHES.filter((m) => m.ouvert(jour, heure));

  return (
    <div>
      <div role="radiogroup" aria-label="Le jour">
        <p className="mb-0.5 text-[0.88rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>Le jour</p>
        <div className="grid max-w-[28rem] grid-cols-7">
          {COURTS.map((c, i) => (
            <button key={c} type="button" role="radio" aria-checked={i === jour} aria-label={JOURS[i]} onClick={() => { setReel(false); setJour(i); }}
              className="relative min-h-11 text-[0.92rem]" style={{ color: i === jour ? "var(--cap-ink)" : "var(--cap-ink-3)", fontWeight: i === jour ? 650 : 500 }}>
              {c}
              <span aria-hidden className="absolute inset-x-2 bottom-1.5 h-[2px] rounded-full" style={{ backgroundColor: "var(--cap-ambre)", opacity: i === jour ? 1 : 0 }} />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2">
        <Curseur label="L'heure à Paris" min={0} max={23.5} step={0.5} valeur={heure} onChange={(v) => { setReel(false); setHeure(v); }} affiche={heureTexte(heure)} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3">
        <Lien onClick={maintenant}><Clock size={15} aria-hidden /> Maintenant</Lien>
        {reel && <span className="text-[0.88rem] italic" style={{ color: "var(--cap-amber-ink)", fontFamily: "var(--cap-font-display)" }}>l&apos;heure réelle de Paris</span>}
      </div>

      <div className="mt-4">
        {/* L'échelle des heures */}
        <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
          <span />
          <div className="relative h-5 text-[0.78rem]" style={{ color: "var(--cap-ink-3)" }} aria-hidden>
            {[0, 6, 12, 18].map((h) => (
              <span key={h} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${(h / 24) * 100}%`, transform: h === 0 ? "none" : h === 24 ? "translateX(-100%)" : undefined }}>{h} h</span>
            ))}
          </div>
        </div>
        <ul className="space-y-2.5">
          {MARCHES.map((m) => {
            const ok = m.ouvert(jour, heure);
            const enPause = m.pause?.(jour, heure);
            return (
              <li key={m.nom} className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-x-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
                <div className="min-w-0 leading-tight">
                  <p className="text-[0.95rem] font-semibold" style={{ color: "var(--cap-ink)" }}>{m.nom}</p>
                  <p className="truncate text-[0.8rem]" style={{ color: ok ? "var(--cap-ocean)" : "var(--cap-ink-3)" }}>
                    {ok ? "Ouvert" : enPause ? "Pause du soir" : "Fermé"}<span className="hidden sm:inline" style={{ color: "var(--cap-ink-3)" }}>, {m.detail}</span>
                  </p>
                </div>
                <div className="relative h-7 overflow-hidden rounded-[6px]" style={{ backgroundColor: "var(--cap-surface-2)" }} aria-hidden>
                  {plages(m, jour).map(([a, b]) => (
                    <span key={a} className="absolute inset-y-1 rounded-[3px]" style={{ left: `${(a / 24) * 100}%`, width: `${((b - a) / 24) * 100}%`, backgroundColor: "var(--cap-ocean)", opacity: ok ? 0.85 : 0.45 }} />
                  ))}
                  <span className="absolute inset-y-0 w-[2px]" style={{ left: `calc(${pos}% - 1px)`, backgroundColor: "var(--cap-ambre)", transition: animer ? "left .3s ease" : undefined }} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-4 rounded-[12px] px-4 py-3" style={{ backgroundColor: "var(--cap-surface-2)" }} aria-live="polite">
        <p className="text-[1rem] font-semibold" style={{ color: "var(--cap-ink)" }}>
          {JOURS[jour].charAt(0).toUpperCase() + JOURS[jour].slice(1)}, {heureTexte(heure)} : {ouverts.length === MARCHES.length ? "tout est ouvert" : `${ouverts.length} marché${ouverts.length > 1 ? "s" : ""} ouvert${ouverts.length > 1 ? "s" : ""} sur ${MARCHES.length}`}.
        </p>
        <p className="mt-1 text-[0.97rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>{commentaire(jour, heure)}</p>
      </div>
      <p className="mt-2 text-[0.85rem]" style={{ color: "var(--cap-ink-3)" }}>
        Heures de Paris, en temps normal. Les jours fériés ferment les bourses, les horaires varient un peu selon le courtier, et quelques semaines par an Wall Street ouvre à 14 h 30 pour nous (leçon « Les sessions »).
      </p>
    </div>
  );
}
