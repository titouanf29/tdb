"use client";

import { useState } from "react";
import { Choix, Curseur, Verdict, lots, usd, useCalme } from "./ElementsRisque";

/**
 * Le risque comme un rectangle : la hauteur est le stop (en pips), la largeur
 * la taille (en lots), l'aire le risque en dollars. Avec la bonne méthode,
 * l'aire ne bouge pas : quand le stop s'allonge, le rectangle s'affine. À
 * taille fixe, l'aire enfle avec le stop.
 */
const MAX_PIPS = 60;
const MAX_LOTS = 0.4;

export function RectangleRisque({ risque = 20 }: { risque?: number }) {
  const calme = useCalme();
  const [stop, setStop] = useState(20);
  const [mode, setMode] = useState<"risque" | "taille">("risque");

  // Euro-dollar : 1 pip vaut 10 $ par lot.
  const taille = mode === "risque" ? Math.floor((risque / (stop * 10)) * 100 + 1e-9) / 100 : 0.1;
  const perte = stop * 10 * taille;
  const hPct = (stop / MAX_PIPS) * 100;
  const wPct = (Math.min(taille, MAX_LOTS) / MAX_LOTS) * 100;
  const refH = (20 / MAX_PIPS) * 100, refW = (0.1 / MAX_LOTS) * 100;
  const trop = perte > risque + 0.001;
  const transition = calme ? undefined : "width .3s ease, height .3s ease, background-color .3s ease";

  return (
    <div>
      <Choix label="La méthode" valeur={mode} onChange={setMode}
        options={[{ v: "risque", texte: "Risque fixe" }, { v: "taille", texte: "Taille fixe, 0,10 lot" }]} />

      <div className="mt-3 grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
        <div className="grid grid-cols-[1.6rem_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] gap-1">
          <span className="row-span-1 flex items-center justify-center text-[0.82rem]" style={{ color: "var(--cap-ink-3)", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
            Stop, en pips
          </span>
          <div className="relative h-[220px] border-b border-l sm:h-[260px]" style={{ borderColor: "var(--cap-line-strong)" }}
            role="img" aria-label={`Rectangle du risque : ${stop} pips de haut, ${lots(taille)} de large, ${usd(perte)} de risque`}>
            {/* Le rectangle de référence : 20 pips, 0,10 lot, 20 $ */}
            <div className="absolute bottom-0 left-0 border border-dashed" style={{ height: `${refH}%`, width: `${refW}%`, borderColor: "var(--cap-ink-3)" }} />
            <div className="absolute bottom-0 left-0 flex items-start justify-end overflow-visible"
              style={{
                height: `${hPct}%`, width: `${wPct}%`, transition,
                backgroundColor: trop ? "color-mix(in srgb, var(--cap-down) 22%, transparent)" : "color-mix(in srgb, var(--cap-ocean) 20%, transparent)",
                boxShadow: `inset 0 0 0 2px ${trop ? "var(--cap-down)" : "var(--cap-ocean)"}`,
              }} />
            <p className="absolute right-2 top-2 text-right text-[0.95rem] font-semibold tabular-nums" aria-live="polite"
              style={{ color: trop ? "var(--cap-down)" : "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
              Aire : {usd(perte)}
            </p>
            <p className="absolute bottom-1 text-[0.75rem]" style={{ left: `calc(${refW}% + 4px)`, color: "var(--cap-ink-3)" }}>
              pointillés : 20 pips × 0,10 lot
            </p>
          </div>
          <span />
          <span className="text-center text-[0.82rem]" style={{ color: "var(--cap-ink-3)" }}>Taille, en lots (de 0 à 0,40)</span>
        </div>

        <div>
          <Curseur label="Distance du stop" valeur={stop} texte={`${stop} pips`} min={5} max={MAX_PIPS} pas={1} onChange={setStop} />
          <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
            {[["Hauteur", `${stop} pips`], ["Largeur", lots(taille)], ["Aire", usd(perte)]].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[0.82rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>{k}</dt>
                <dd className="text-[1.05rem] font-semibold tabular-nums" style={{ color: k === "Aire" && trop ? "var(--cap-down)" : "var(--cap-ink)" }}>{v}</dd>
              </div>
            ))}
          </dl>
          <Verdict ton={trop ? "mal" : "neutre"}>
            {mode === "risque"
              ? perte < risque - 0.001
                ? `Le stop à ${stop} pips donne une taille de ${lots(taille)} une fois arrondie vers le bas : le risque tombe à ${usd(perte)}, un peu sous ${usd(risque)}. Il ne le dépasse jamais.`
                : `Stop plus loin, rectangle plus fin ; stop plus près, rectangle plus large. L'aire, votre risque, reste à ${usd(risque)}.`
              : trop
                ? `À taille fixe, un stop de ${stop} pips fait grimper le risque à ${usd(perte)}, ${(perte / risque).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} fois ce que vous aviez prévu.`
                : `À taille fixe, ce stop risque ${usd(perte)}. Ça ne tombe juste que pour un stop de 20 pips : c'est le hasard, pas une méthode.`}
          </Verdict>
        </div>
      </div>
    </div>
  );
}
