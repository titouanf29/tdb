"use client";

import { Gauge } from "lucide-react";
import type { Analysis, ClimatMesure } from "@/lib/api";
import { fr } from "@/lib/SettingsContext";
import { Num, Panel, Text } from "@/components/design-system";

/**
 * Le climat des marchés : la peur (VIX) et le prix de l'argent (taux US à
 * 10 ans).
 *
 * À LIRE, PAS À CALCULER. Mesuré sur 40 actifs et 5 ans, ni l'un ni l'autre
 * n'améliore les signaux du moteur de façon stable : leur effet apparent
 * tenait à deux crises. Ils n'entrent donc pas dans le score, et le panneau
 * le dit. Ils restent utiles pour lire un plan : un stop se fait toucher plus
 * souvent quand le marché a peur.
 *
 * Deux tuiles, pas un graphique : une valeur, sa variation sur un mois, sa
 * place dans l'année, et une phrase. Le sens est toujours dit en mots — la
 * couleur n'en porte aucun.
 */
export function ClimatMarche({ climat }: { climat: Analysis["climat_marche"] }) {
  if (!climat || (!climat.vix && !climat.taux_10ans)) return null;
  return (
    <Panel
      title="Le climat des marchés"
      hint="Contexte à lire — n'entre pas dans le score : mesuré, il n'améliorait pas les signaux de façon stable."
      aside={<Gauge aria-hidden className="h-4 w-4" style={{ color: "var(--cap-ink-3)" }} />}
    >
      <div className="cap-liste grid gap-6 sm:grid-cols-2">
        {climat.vix && (
          <Tuile
            titre="La peur — VIX"
            m={climat.vix}
            valeur={fr(climat.vix.niveau, 1)}
            variation={`${climat.vix.variation_20 >= 0 ? "+" : ""}${fr(climat.vix.variation_20, 1)} pt sur un mois`}
            etat={{ calme: "Calme", normal: "Ordinaire", nerveux: "Nerveux", stress: "En stress" }[climat.vix.etat] ?? climat.vix.etat}
          />
        )}
        {climat.taux_10ans && (
          <Tuile
            titre="Le prix de l'argent — taux US 10 ans"
            m={climat.taux_10ans}
            valeur={`${fr(climat.taux_10ans.niveau, 2)} %`}
            variation={`${(climat.taux_10ans.variation_20_pb ?? 0) >= 0 ? "+" : ""}${climat.taux_10ans.variation_20_pb ?? 0} pb sur un mois`}
            etat={{ hausse: "En hausse", baisse: "En baisse", stable: "Stable" }[climat.taux_10ans.etat] ?? climat.taux_10ans.etat}
          />
        )}
      </div>
    </Panel>
  );
}

function Tuile({ titre, m, valeur, variation, etat }: {
  titre: string; m: ClimatMesure; valeur: string; variation: string; etat: string;
}) {
  const pos = m.position_1an;
  return (
    <div className="min-w-0">
      <div className="text-[0.75rem] uppercase tracking-[0.12em]" style={{ color: "var(--cap-ink-3)" }}>
        {titre}
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Num className="text-[1.6rem] font-medium leading-none">{valeur}</Num>
        <span className="rounded-full px-2 py-0.5 text-[0.75rem] font-medium"
          style={{ color: "var(--cap-ink-2)", boxShadow: "inset 0 0 0 1px var(--cap-line-strong)" }}>
          {etat}
        </span>
      </div>
      <Text size="caption" className="mt-1.5">{variation}</Text>

      {/* Sa place dans l'année : du plus bas au plus haut des 12 derniers mois. */}
      {pos != null && (
        <div className="mt-4" role="img"
          aria-label={`Sur un an : plus bas ${fr(m.bas_1an, 2)}, plus haut ${fr(m.haut_1an, 2)}, niveau actuel ${fr(m.niveau, 2)}`}>
          <div className="relative h-[4px] rounded-full" style={{ backgroundColor: "var(--cap-line)" }}>
            <span className="cap-barre absolute inset-y-0 left-0 w-full origin-left rounded-full"
              style={{ transform: `scaleX(${pos})`, backgroundColor: "var(--cap-ink-4)" }} />
            <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2" style={{ left: `${pos * 100}%` }}>
              <span className="cap-pop block h-full w-full rounded-full"
                style={{ backgroundColor: "var(--cap-surface)", boxShadow: "0 0 0 2px var(--cap-ink)", ["--d" as string]: ".6s" }} />
            </span>
          </div>
          <div className="mt-1.5 flex justify-between text-[0.72rem]" style={{ color: "var(--cap-ink-3)" }}>
            <span>Plus bas 1 an · {fr(m.bas_1an, 2)}</span>
            <span>{fr(m.haut_1an, 2)} · plus haut 1 an</span>
          </div>
        </div>
      )}

      <Text size="small" className="mt-3">{m.phrase}</Text>
    </div>
  );
}
