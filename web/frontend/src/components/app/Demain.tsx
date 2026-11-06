"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { demainAPI, type Demain as Donnees } from "@/lib/api";
import { Panel, Text } from "@/components/design-system";
import { formatCours } from "@/lib/devise";
import { ilYA } from "@/lib/quand";

/**
 * « Demain » : ce qui attend la personne à la prochaine séance.
 *
 * L'accueil disait ce qui s'était passé et ce qu'il fallait faire
 * maintenant ; rien ne regardait devant. C'est le soir, en préparant le
 * lendemain, qu'on prend l'habitude de revenir le matin. Le panneau ne
 * s'affiche que s'il a quelque chose de particulier à dire : une annonce,
 * un plan de Nimbo encore ouvert sur un favori, une position sans stop.
 */
/** « 16:00 » → « 16 h », « 14:30 » → « 14 h 30 » ; « journée » reste tel quel. */
function heureLisible(h: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(h);
  if (!m) return h;
  const minutes = m[2] === "00" ? "" : ` ${m[2]}`;
  return `${Number(m[1])} h${minutes}`;
}

export function Demain() {
  const [d, setD] = useState<Donnees | null>(null);

  useEffect(() => { demainAPI.get().then(setD).catch(() => {}); }, []);

  if (!d || (d.agenda.length === 0 && d.plans.length === 0 && d.sans_stop === 0)) return null;
  const [paris, ny] = d.seances;

  return (
    <Panel
      title={d.jour.est_demain ? "Demain" : "La prochaine séance"}
      hint={`${d.jour.libelle.charAt(0).toUpperCase() + d.jour.libelle.slice(1)}. ${paris.place} ouvre à ${paris.ouvre}, ${ny.place} à ${ny.ouvre}, heure de Paris. La crypto ne ferme pas.`}
      action={d.agenda.length > 0 ? { label: "Tout l'agenda", href: "/macro" } : undefined}
    >
      <ul className="cap-liste">
        {d.sans_stop > 0 && (
          <li className="border-b py-2.5" style={{ borderColor: "var(--cap-line)" }}>
            <Link href="/wallet" className="block transition-colors hover:text-[color:var(--cap-ocean)]">
              <span className="text-[0.93rem] font-medium" style={{ color: "var(--cap-down)" }}>
                {d.sans_stop === 1 ? "Une position passe la nuit sans stop." : `${d.sans_stop} positions passent la nuit sans stop.`}
              </span>
              <Text size="caption">Un stop se décide avant, pas pendant. Posez-le ce soir.</Text>
            </Link>
          </li>
        )}
        {d.plans.map((p) => (
          <li key={p.symbol} className="border-b py-2.5" style={{ borderColor: "var(--cap-line)" }}>
            <Link href={`/analysis?symbol=${encodeURIComponent(p.symbol)}`} className="block transition-colors hover:text-[color:var(--cap-ocean)]">
              <span className="text-[0.93rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                Nimbo suit encore son plan {p.achat ? "à l'achat" : "à la vente"} sur {p.nom}, proposé {ilYA(p.depuis)}.
              </span>
              {/* Le plan d'origine, daté : l'analyse d'aujourd'hui peut en proposer
                  un autre, celui-ci est celui que Nimbo tient jusqu'au bout. */}
              <Text size="caption">
                Objectif {formatCours(p.objectif, p.symbol)}, stop {formatCours(p.stop, p.symbol)}, tels que proposés ce jour-là. À relire avant l&apos;ouverture.
              </Text>
            </Link>
          </li>
        ))}
        {d.agenda.map((a, i) => (
          <li key={`${a.heure}-${i}`} className="flex items-baseline gap-3 border-b py-2.5" style={{ borderColor: "var(--cap-line)" }}>
            <span className="cap-num w-14 shrink-0 text-[0.88rem]" style={{ color: a.importance === "forte" ? "var(--cap-amber-ink)" : "var(--cap-ink-3)" }}>
              {heureLisible(a.heure)}
            </span>
            <span className="min-w-0">
              <span className="block text-[0.93rem]" style={{ color: "var(--cap-ink)" }}>{a.titre}</span>
              <Text size="caption">{a.pays}{a.importance === "forte" ? ". Les cours peuvent bouger vite autour." : ""}</Text>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
