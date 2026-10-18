"use client";

import { useState } from "react";
import type { ConditionStrategie } from "@/lib/api";
import { CATALOGUE } from "@/lib/strategie";
import { Nimbo, Text } from "@/components/design-system";

/**
 * Une condition, écrite comme une phrase qu'on peut régler du doigt :
 * « le prix est [au-dessus] de sa moyenne [200] ». Les réglages sont des
 * listes courtes de valeurs qui ont du sens, pas des champs libres : un
 * débutant ne sait pas qu'un RSI à 3 n'arrive jamais. Le point
 * d'interrogation ouvre l'explication de Nimbo.
 */

function Choix<T extends string | number>({ value, options, onChange, label }: {
  value: T; options: Array<[T, string]>; onChange: (v: T) => void; label: string;
}) {
  return (
    <select
      aria-label={label}
      value={String(value)}
      onChange={(e) => {
        const o = options.find(([k]) => String(k) === e.target.value);
        if (o) onChange(o[0]);
      }}
      className="cursor-pointer appearance-none border-b-2 bg-transparent px-0.5 pb-0.5 font-semibold outline-none focus-visible:border-[color:var(--cap-ambre)]"
      style={{ color: "var(--cap-ink)", borderColor: "var(--cap-ambre)", fontFamily: "var(--cap-font-display)" }}
    >
      {options.map(([k, t]) => <option key={String(k)} value={String(k)}>{t}</option>)}
    </select>
  );
}

export function Condition({ c, index, onChange, onRetirer }: {
  c: ConditionStrategie;
  index: number;
  onChange: (c: ConditionStrategie) => void;
  onRetirer: () => void;
}) {
  const [explique, setExplique] = useState(false);
  const info = CATALOGUE[c.type];

  let phrase: React.ReactNode;
  switch (c.type) {
    case "tendance_ma":
      phrase = <>le prix est <Choix label="position" value={c.position} options={[["dessus", "au-dessus"], ["dessous", "en dessous"]]}
        onChange={(position) => onChange({ ...c, position })} /> de sa moyenne <Choix label="période" value={c.periode}
        options={[[20, "20"], [50, "50"], [100, "100"], [200, "200"]]} onChange={(periode) => onChange({ ...c, periode })} /></>;
      break;
    case "croisement_ma":
      phrase = <>la moyenne <Choix label="rapide" value={c.rapide} options={[[10, "10"], [20, "20"], [50, "50"]]}
        onChange={(rapide) => onChange({ ...c, rapide })} /> est <Choix label="sens" value={c.sens}
        options={[["haussier", "au-dessus"], ["baissier", "en dessous"]]} onChange={(sens) => onChange({ ...c, sens })} /> de
        la moyenne <Choix label="lente" value={c.lente} options={[[50, "50"], [100, "100"], [200, "200"]]}
        onChange={(lente) => onChange({ ...c, lente })} /></>;
      break;
    case "rsi":
      phrase = <>le RSI <Choix label="mode" value={c.mode} options={[["sous", "est sous"], ["dessus", "est au-dessus de"],
        ["repasse_dessus", "repasse au-dessus de"], ["repasse_dessous", "repasse sous"]]} onChange={(mode) => onChange({ ...c, mode })} />{" "}
        <Choix label="seuil" value={c.seuil} options={[[20, "20"], [25, "25"], [30, "30"], [35, "35"], [40, "40"], [50, "50"],
          [60, "60"], [65, "65"], [70, "70"], [75, "75"], [80, "80"]]} onChange={(seuil) => onChange({ ...c, seuil })} /></>;
      break;
    case "cassure":
      phrase = <>le prix clôture <Choix label="sens" value={c.sens} options={[["haut", "au-dessus du plus haut"], ["bas", "sous le plus bas"]]}
        onChange={(sens) => onChange({ ...c, sens })} /> des <Choix label="période" value={c.periode}
        options={[[10, "10"], [20, "20"], [50, "50"], [100, "100"]]} onChange={(periode) => onChange({ ...c, periode })} /> dernières bougies</>;
      break;
    case "macd":
      phrase = <>le MACD <Choix label="mode" value={c.mode} options={[["croise_dessus", "croise sa ligne de signal vers le haut"],
        ["croise_dessous", "croise sa ligne de signal vers le bas"], ["dessus", "est au-dessus de sa ligne de signal"],
        ["dessous", "est sous sa ligne de signal"]]} onChange={(mode) => onChange({ ...c, mode })} /></>;
      break;
    case "volume":
      phrase = <>le volume dépasse <Choix label="multiple" value={c.multiple} options={[[1.2, "1,2"], [1.5, "1,5"], [2, "2"], [3, "3"]]}
        onChange={(multiple) => onChange({ ...c, multiple })} /> fois sa moyenne</>;
      break;
    case "score_nimbo":
      phrase = <>mon score atteint au moins <Choix label="score" value={c.min} options={[[50, "50"], [55, "55"], [60, "60"],
        [65, "65"], [70, "70"], [75, "75"]]} onChange={(min) => onChange({ ...c, min })} /> sur 100</>;
      break;
  }

  return (
    <li className="border-t py-4 first:border-t-0" style={{ borderColor: "var(--cap-line)" }}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 w-6 flex-none text-[1.05rem] italic" style={{ fontFamily: "var(--cap-font-display)", color: "#c98a1e" }}>
          {index === 0 ? "Si" : "et"}
        </span>
        <p className="min-w-0 flex-1 text-[1.02rem] leading-[1.9]" style={{ color: "var(--cap-ink-2)" }}>{phrase}</p>
        <div className="flex flex-none items-center gap-1">
          <button type="button" onClick={() => setExplique((x) => !x)} aria-expanded={explique}
            aria-label={`Ce que veut dire : ${info.titre}`}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[0.95rem] font-semibold"
            style={{ color: "var(--cap-ocean)", boxShadow: "inset 0 0 0 1px var(--cap-line-strong)" }}>?</button>
          <button type="button" onClick={onRetirer} aria-label="Retirer cette condition"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[1.1rem]"
            style={{ color: "var(--cap-ink-3)" }}>×</button>
        </div>
      </div>
      {explique && (
        <div className="ml-9 mt-2 flex items-start gap-3 rounded-[12px] p-3" style={{ backgroundColor: "var(--cap-surface-2)" }}>
          <Nimbo humeur="pointe" taille={40} label="" className="-my-1 flex-none" />
          <Text size="small" tone="ink">{info.nimbo}</Text>
        </div>
      )}
    </li>
  );
}
