"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ScanUniverse } from "@/lib/api";
import { DUR, EASE, Text } from "@/components/design-system";

/**
 * Le choix de ce qu'on balaie.
 *
 * Deux niveaux, et l'ordre compte.
 *
 * LES ZONES D'ABORD. Personne ne se dit « aujourd'hui je regarde Lisbonne » ;
 * on se dit « l'Europe », « les États-Unis », « la crypto ». Seize pastilles
 * de places en tête d'écran demandaient un arbitrage fin avant même d'avoir
 * choisi le terrain. Les places existent toujours, repliées derrière
 * « Affiner », pour qui veut exactement ses six marchés.
 *
 * ET LES ZONES S'ADDITIONNENT. C'est une différence de nature avec les
 * places, pas de présentation : places et classes se CROISENT, ce qui rend
 * « Europe et crypto » impossible à exprimer — aucune crypto ne cote à Paris.
 * Une zone porte sa définition complète et l'univers est leur RÉUNION, donc
 * toutes les combinaisons se disent : Europe + US, US + crypto + or, etc.
 *
 * Rien n'est écrit en dur ici. Zones, places, classes et effectifs viennent
 * du serveur : proposer une zone vide serait promettre un résultat que le
 * scan ne rendrait pas.
 */

export interface Selection {
  /** Les zones cochées. Leur réunion forme l'univers. */
  zones: string[];
  /** Le mode fin, quand on a déplié « Affiner ». Ignoré si des zones sont cochées. */
  places: string[];
  classes: string[];
}

export const SELECTION_VIDE: Selection = { zones: [], places: [], classes: [] };

function Chip({
  label,
  count,
  active,
  onClick,
  size = "md",
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  size?: "md" | "sm";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "inline-flex items-center gap-1.5 rounded-[9px] transition-all duration-200 " +
        (size === "md" ? "px-3.5 py-2 text-[0.9rem]" : "px-3 py-1.5 text-[0.82rem]")
      }
      style={{
        backgroundColor: active ? "var(--cap-ink)" : "var(--cap-surface-2)",
        color: active ? "var(--cap-surface)" : "var(--cap-ink-2)",
      }}
    >
      {/* La coche pousse le libellé au lieu de le recouvrir : un chip qui
          change de largeur en changeant d'état se remarque, ce qui est le but. */}
      <span
        className="grid overflow-hidden transition-all duration-200"
        style={{ width: active ? "0.9rem" : 0, opacity: active ? 1 : 0 }}
      >
        <Check className="h-3.5 w-3.5" />
      </span>
      {label}
      {count != null && (
        <span className="cap-num text-[0.72rem] tabular-nums" style={{ opacity: active ? 0.7 : 0.55 }}>
          {count}
        </span>
      )}
    </button>
  );
}

export function UniversePicker({
  universe,
  value,
  onChange,
  count,
}: {
  universe: ScanUniverse | null;
  value: Selection;
  onChange: (s: Selection) => void;
  count: number | null;
}) {
  const [affiner, setAffiner] = useState(false);

  if (!universe) return <Text size="caption">Chargement de l&apos;univers…</Text>;

  const zones = universe.zones ?? [];
  const fin = value.places.length > 0 || value.classes.length > 0;

  const basculerZone = (key: string) => {
    const dedans = value.zones.includes(key);
    onChange({
      ...value,
      zones: dedans ? value.zones.filter((z) => z !== key) : [...value.zones, key],
      // Cocher une zone abandonne la composition fine : les deux ne se
      // combinent pas, et laisser les deux actives ferait un univers que
      // personne ne saurait expliquer.
      places: [],
      classes: [],
    });
  };

  const basculerFin = (axe: "places" | "classes", key: string) => {
    const cur = value[axe];
    onChange({
      ...value,
      zones: [],
      [axe]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key],
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap gap-2">
          {zones.map((z) => (
            <Chip
              key={z.key}
              label={z.label}
              count={z.count}
              active={value.zones.includes(z.key)}
              onClick={() => basculerZone(z.key)}
            />
          ))}
          {(value.zones.length > 0 || fin) && (
            <button
              type="button"
              onClick={() => onChange(SELECTION_VIDE)}
              className="rounded-[9px] px-3 py-2 text-[0.85rem] transition-colors hover:bg-[color:var(--cap-surface-2)]"
              style={{ color: "var(--cap-ink-3)" }}
            >
              Tout effacer
            </button>
          )}
        </div>
        <Text size="caption" className="mt-2">
          {value.zones.length > 1
            ? "Les zones s'additionnent."
            : value.zones.length === 0 && !fin
              ? "Aucune zone cochée : l'univers entier sera balayé."
              : ""}
        </Text>
      </div>

      {/* Le mode fin, replié. Il existe pour qui veut exactement ses places ;
          le montrer d'emblée ferait porter le choix le plus précis à
          quelqu'un qui n'a pas encore choisi le terrain. */}
      <div className="border-t pt-4" style={{ borderColor: "var(--cap-line)" }}>
        <button
          type="button"
          onClick={() => setAffiner((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[0.85rem] transition-colors"
          style={{ color: "var(--cap-ocean)" }}
          aria-expanded={affiner}
        >
          <ChevronDown
            className="h-4 w-4 transition-transform duration-200"
            style={{ transform: affiner ? "rotate(180deg)" : "none" }}
          />
          Affiner place par place
        </button>

        <AnimatePresence initial={false}>
          {affiner && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: DUR.base, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="space-y-4 pt-4">
                <Text size="caption">
                  Ce mode remplace les zones : ici les critères se croisent au
                  lieu de s&apos;additionner.
                </Text>
                <div>
                  <Text size="caption" className="mb-2">
                    Places {value.places.length === 0 && "— toutes"}
                  </Text>
                  <div className="flex flex-wrap gap-1.5">
                    {universe.places.map((pl) => (
                      <Chip
                        key={pl.key}
                        size="sm"
                        label={pl.label}
                        count={pl.count}
                        active={value.places.includes(pl.key)}
                        onClick={() => basculerFin("places", pl.key)}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <Text size="caption" className="mb-2">
                    Types d&apos;actifs {value.classes.length === 0 && "— tous"}
                  </Text>
                  <div className="flex flex-wrap gap-1.5">
                    {universe.classes.map((c) => (
                      <Chip
                        key={c.key}
                        size="sm"
                        label={c.label}
                        count={c.count}
                        active={value.classes.includes(c.key)}
                        onClick={() => basculerFin("classes", c.key)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Le compte en direct : sans lui on coche à l'aveugle et on découvre à
          la fin qu'on vient de lancer 819 actifs — ou zéro. */}
      <Text size="small" tone={count === 0 ? "down" : "ink"}>
        {count === null
          ? ""
          : count === 0
            ? "Aucun actif ne correspond à cette combinaison."
            : `${count} actif${count > 1 ? "s" : ""} à balayer.`}
      </Text>
    </div>
  );
}
