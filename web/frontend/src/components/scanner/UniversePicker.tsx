"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import type { ScanUniverse } from "@/lib/api";
import { Text } from "@/components/design-system";

/**
 * Le choix de ce qu'on balaie.
 *
 * Le scanner ne savait viser qu'un marché à la fois — Europe, ou USA, ou
 * tout. « Uniquement Paris », « tout sauf la crypto », « les actions
 * européennes et l'or » n'étaient pas exprimables, alors que ce sont des
 * demandes normales : un lecteur du CAC devait avaler douze valeurs
 * allemandes et britanniques pour voir les siennes.
 *
 * Deux axes qui se croisent, et un axe vide ne contraint rien. C'est ce qui
 * permet de n'exprimer QUE la contrainte à laquelle on tient : cocher
 * « actions » sans place donne toutes les actions du monde, cocher « Paris »
 * sans classe donne tout ce qui cote à Paris.
 *
 * Les préréglages existent parce que l'outil doit convenir aux deux bouts :
 * un débutant ne compose pas un univers, il clique « Europe » ; un habitué
 * veut cocher exactement ses six places. Les deux sont là, et le préréglage
 * n'est qu'un raccourci vers la même sélection — il ne verrouille rien.
 *
 * Rien n'est écrit en dur ici : places, classes et effectifs viennent du
 * serveur. Proposer une place vide serait promettre un résultat que le scan
 * ne rendrait pas.
 */

export interface Selection {
  places: string[];
  classes: string[];
}

function Chip({
  label,
  count,
  active,
  onClick,
  tone = "default",
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  tone?: "default" | "preset";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="group inline-flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[0.85rem] transition-all duration-200"
      style={{
        backgroundColor: active
          ? "var(--cap-ink)"
          : tone === "preset"
            ? "transparent"
            : "var(--cap-surface-2)",
        color: active ? "var(--cap-surface)" : "var(--cap-ink-2)",
        boxShadow: active
          ? "none"
          : tone === "preset"
            ? "inset 0 0 0 1px var(--cap-line)"
            : "none",
      }}
    >
      {/* La coche n'apparaît que sur un élément actif, et elle pousse le
          libellé plutôt que de le recouvrir : un chip qui change de largeur
          en changeant d'état se remarque, ce qui est le but. */}
      <span
        className="grid overflow-hidden transition-all duration-200"
        style={{ width: active ? "0.85rem" : 0, opacity: active ? 1 : 0 }}
      >
        <Check className="h-3.5 w-3.5" />
      </span>
      {label}
      {count != null && (
        <span
          className="cap-num text-[0.72rem] tabular-nums"
          style={{ opacity: active ? 0.7 : 0.55 }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

const PRESETS: { key: string; label: string; build: (u: ScanUniverse) => Selection }[] = [
  {
    key: "europe",
    label: "Europe",
    build: (u) => ({
      places: u.regions.find((r) => r.key === "EUROPE")?.places ?? [],
      classes: [],
    }),
  },
  {
    key: "usa",
    label: "États-Unis",
    build: (u) => ({
      places: u.regions.find((r) => r.key === "AMERIQUE")?.places ?? [],
      classes: [],
    }),
  },
  { key: "crypto", label: "Crypto seule", build: () => ({ places: [], classes: ["CRYPTO"] }) },
  {
    key: "sans-crypto",
    label: "Tout sauf la crypto",
    build: (u) => ({
      places: [],
      classes: u.classes.map((c) => c.key).filter((k) => k !== "CRYPTO"),
    }),
  },
  { key: "tout", label: "Tout", build: () => ({ places: [], classes: [] }) },
];

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
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
  /** Combien d'actifs la sélection représente, calculé par l'appelant. */
  count: number | null;
}) {
  const presetActif = useMemo(() => {
    if (!universe) return null;
    for (const p of PRESETS) {
      const s = p.build(universe);
      if (sameSet(s.places, value.places) && sameSet(s.classes, value.classes)) return p.key;
    }
    return null;
  }, [universe, value]);

  if (!universe) {
    return <Text size="caption">Chargement de l&apos;univers…</Text>;
  }

  const toggle = (axe: "places" | "classes", key: string) => {
    const cur = value[axe];
    onChange({
      ...value,
      [axe]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key],
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <Text size="caption" className="mb-2">Raccourcis</Text>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Chip
              key={p.key}
              label={p.label}
              tone="preset"
              active={presetActif === p.key}
              onClick={() => onChange(p.build(universe))}
            />
          ))}
        </div>
      </div>

      <div>
        <Text size="caption" className="mb-2">
          Places {value.places.length === 0 && "— toutes"}
        </Text>
        <div className="flex flex-wrap gap-2">
          {universe.places.map((pl) => (
            <Chip
              key={pl.key}
              label={pl.label}
              count={pl.count}
              active={value.places.includes(pl.key)}
              onClick={() => toggle("places", pl.key)}
            />
          ))}
        </div>
      </div>

      <div>
        <Text size="caption" className="mb-2">
          Types d&apos;actifs {value.classes.length === 0 && "— tous"}
        </Text>
        <div className="flex flex-wrap gap-2">
          {universe.classes.map((c) => (
            <Chip
              key={c.key}
              label={c.label}
              count={c.count}
              active={value.classes.includes(c.key)}
              onClick={() => toggle("classes", c.key)}
            />
          ))}
        </div>
      </div>

      {/* Le compte en direct. Sans lui, on coche à l'aveugle et on découvre à
          la fin qu'on vient de lancer un balayage de 819 actifs — ou de zéro. */}
      <Text size="small" tone={count === 0 ? "down" : "ink"}>
        {count === null
          ? ""
          : count === 0
            ? "Aucun actif ne correspond : cette place ne propose pas ce type d'actif."
            : `${count} actif${count > 1 ? "s" : ""} à balayer.`}
      </Text>
    </div>
  );
}
