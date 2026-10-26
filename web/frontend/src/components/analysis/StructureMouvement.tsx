"use client";

import { Move } from "lucide-react";
import { Panel, Text } from "@/components/design-system";
import { fr } from "@/lib/SettingsContext";
import type { ContexteTechnique, FamilleStructure } from "@/lib/api";

/**
 * La géométrie du mouvement : structure, dernière jambe, où en est le prix.
 *
 * Données du moteur de structure (backend _structure.py / _confluence.py),
 * qui tourne en SHADOW. À LIRE, PAS À CROIRE : mesuré sur 40 actifs et quatre
 * horizons, les zones de Fibonacci n'ont pas montré d'avantage stable — elles
 * ne pèsent pas dans le score, et le panneau le dit. Ce qu'il apporte est une
 * DESCRIPTION : « correction de 40 % de la dernière hausse, structure
 * intacte » se lit mieux qu'une liste de niveaux.
 */

const NOM_FAMILLE: Record<FamilleStructure, string> = {
  FIBONACCI: "Niveau de Fibonacci",
  MULTI_UNITES: "Autres échelles",
  SUPPORT_RESISTANCE: "Support / résistance",
  STRUCTURE: "Structure",
  TENDANCE: "Tendance",
  MOMENTUM: "Momentum",
  VOLUME: "Volume",
  VOLATILITE: "Volatilité",
  PRIX: "Réaction du prix",
};

const RATIOS = [0.236, 0.382, 0.5, 0.618, 0.786];

export function StructureMouvement({
  contexte,
  assetPrice,
}: {
  contexte: ContexteTechnique | null | undefined;
  assetPrice: (v: number) => string;
}) {
  const j = contexte?.fibonacci?.primaire;
  if (!contexte || !j) return null;
  const st = contexte.market_structure?.[contexte.unite];
  const c = contexte.confluence;
  const hausse = j.sens === "hausse";

  const structure = !st || st.etat === "indetermine"
    ? "Pas assez de sommets et de creux confirmés pour la lire."
    : st.etat === "range"
      ? `Sans direction : sommets ${st.sommets === "HH" ? "montants" : "descendants"}, creux ${st.creux === "HL" ? "montants" : "descendants"}.`
      : `${st.etat === "haussiere" ? "Haussière, sommets et creux montants" : "Baissière, sommets et creux descendants"}${
          st.rompue && st.invalidation != null
            ? `, mais ROMPUE : le prix a franchi ${st.etat === "haussiere" ? "le dernier creux" : "le dernier sommet"} (${assetPrice(st.invalidation)}).`
            : st.invalidation != null
              ? `, intacte tant que ${st.etat === "haussiere" ? "le creux" : "le sommet"} de ${assetPrice(st.invalidation)} tient.`
              : "."}`;

  const pct = Math.round(j.retracement * 100);
  const proche = j.niveau_proche;
  const position = j.phase === "extension"
    ? `Au-delà ${hausse ? "du sommet" : "du creux"} : le mouvement se prolonge.`
    : j.phase === "invalidee"
      ? `Revenu au-delà du point de départ : ce mouvement ne décrit plus le marché.`
      : `Correction de ${pct} % de ce mouvement${
          proche.position === "dans la zone"
            ? `, sur la zone ${fr(Number(proche.ratio), 1)} % (${assetPrice(proche.prix)}).`
            : `. Niveau le plus proche : ${fr(Number(proche.ratio), 1)} % à ${assetPrice(proche.prix)}, à ${fr(Math.abs(proche.distance_atr), 1)} ATR.`}`;

  const pour = c?.alignees ?? [];
  const contre = c?.contraires ?? [];

  return (
    <Panel
      repliable="structure"
      title="La structure du mouvement"
      hint="Où se situe le prix dans son dernier mouvement, une description, pas un signal : n'entre pas dans le score."
      aside={<Move aria-hidden className="h-4 w-4" style={{ color: "var(--cap-ink-3)" }} />}
    >
      <dl className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <dt className="text-[0.8rem]" style={{ color: "var(--cap-ink-3)" }}>Structure</dt>
        <dd><Text size="small" tone="ink" as="span">{structure}</Text></dd>

        <dt className="text-[0.8rem]" style={{ color: "var(--cap-ink-3)" }}>Dernier mouvement</dt>
        <dd>
          <Text size="small" tone="ink" as="span">
            {hausse ? "Hausse" : "Baisse"} de {assetPrice(j.depart)} à {assetPrice(j.fin)}, {fr(j.amplitude_atr, 1)} ATR
            sur {j.duree_bougies} bougies{j.fin_confirmee ? "" : " (encore en cours : il peut s'étendre)"}.
          </Text>
        </dd>

        <dt className="text-[0.8rem]" style={{ color: "var(--cap-ink-3)" }}>Où en est le prix</dt>
        <dd>
          <Text size="small" tone="ink" as="span">{position}</Text>
          {j.phase === "correction" && <Reglette retracement={j.retracement} hausse={hausse} />}
        </dd>

        {(pour.length > 0 || contre.length > 0) && (
          <>
            <dt className="text-[0.8rem]" style={{ color: "var(--cap-ink-3)" }}>Autour de cette zone</dt>
            <dd className="space-y-2">
              {c?.lecture && <Text size="small" tone="ink" as="p">{c.lecture}</Text>}
              <ul className="flex flex-wrap gap-1.5">
                {pour.map((k) => <Pastille key={k} texte={NOM_FAMILLE[k] ?? k} titre={c?.familles?.[k]?.pourquoi} ton="up" />)}
                {contre.map((k) => <Pastille key={k} texte={NOM_FAMILLE[k] ?? k} titre={c?.familles?.[k]?.pourquoi} ton="down" />)}
              </ul>
              <Text size="caption" as="p">
                Une famille = une voix : moyennes et ADX comptent pour une seule « tendance », RSI et MACD pour un seul « momentum ».
              </Text>
            </dd>
          </>
        )}
      </dl>
      <Text size="caption" className="mt-5">
        Mesuré sur 40 actifs, en 1 h, en journalier, sur 3 jours et en hebdomadaire : ces zones n&apos;ont pas montré
        d&apos;avantage stable pour décider d&apos;un trade. Elles décrivent le mouvement ; le verdict reste celui du moteur.
      </Text>
    </Panel>
  );
}

/** Le retracement, dessiné : 0 % au bout du mouvement, 100 % à son départ. */
function Reglette({ retracement, hausse }: { retracement: number; hausse: boolean }) {
  const pos = Math.min(1, Math.max(0, retracement));
  return (
    <div aria-hidden className="mt-3 max-w-[26rem]">
      <div className="relative h-[6px] rounded-full" style={{ backgroundColor: "var(--cap-line)" }}>
        <span className="absolute inset-y-0 rounded-full"
          style={{ left: "38.2%", width: `${61.8 - 38.2}%`, backgroundColor: "color-mix(in srgb, var(--cap-ocean) 28%, transparent)" }} />
        {RATIOS.map((r) => (
          <span key={r} className="absolute top-1/2 h-3 w-px -translate-y-1/2" style={{ left: `${r * 100}%`, backgroundColor: "var(--cap-line-strong)" }} />
        ))}
        <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${pos * 100}%`, backgroundColor: "var(--cap-surface)", boxShadow: "0 0 0 2px var(--cap-ink)" }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[0.7rem]" style={{ color: "var(--cap-ink-3)" }}>
        <span>{hausse ? "Sommet" : "Creux"} (0 %)</span>
        <span>38,2 – 61,8 %</span>
        <span>Départ (100 %)</span>
      </div>
    </div>
  );
}

function Pastille({ texte, titre, ton }: { texte: string; titre?: string; ton: "up" | "down" }) {
  const couleur = ton === "up" ? "var(--cap-up)" : "var(--cap-down)";
  return (
    <li
      title={titre}
      className="rounded-full px-2.5 py-1 text-[0.75rem]"
      style={{ color: couleur, backgroundColor: `color-mix(in srgb, ${couleur} 10%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${couleur} 30%, transparent)` }}
    >
      {ton === "up" ? "+ " : "− "}{texte}
    </li>
  );
}
