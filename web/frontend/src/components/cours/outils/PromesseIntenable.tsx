"use client";

import { useEffect, useRef, useState } from "react";
import { ChoixTenir, ResultatTenir, nombre, useAnimeTenir } from "./ElementsTenir";

/**
 * Ce que deviendraient 1 000 € si la promesse était vraie : quelques pourcents
 * par semaine, réinvestis pendant un an. Le chiffre roule jusqu'au résultat.
 */

const TAUX = [1, 2, 5, 10];

export function PromesseIntenable() {
  const anime = useAnimeTenir();
  const [taux, setTaux] = useState(10);
  const cible = 1000 * Math.pow(1 + taux / 100, 52);
  const [affiche, setAffiche] = useState(cible);
  const raf = useRef(0);
  const prec = useRef(cible);

  useEffect(() => {
    const depart = prec.current;
    prec.current = cible;
    if (!anime) { setAffiche(cible); return; }
    const t0 = performance.now();
    const pas = (t: number) => {
      const f = Math.min(1, (t - t0) / 900);
      const e = 1 - Math.pow(1 - f, 3);
      setAffiche(depart + (cible - depart) * e);
      if (f < 1) raf.current = requestAnimationFrame(pas);
    };
    raf.current = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf.current);
  }, [cible, anime]);

  const fois = cible / 1000;
  return (
    <div>
      <div role="group" aria-label="Le gain promis par semaine" className="grid grid-cols-4 gap-2">
        {TAUX.map((t) => (
          <ChoixTenir key={t} etat={taux === t ? "choisi" : "neutre"} presse={taux === t} onClick={() => setTaux(t)}>
            <span className="block text-center font-semibold">{t} %</span>
          </ChoixTenir>
        ))}
      </div>
      <p className="mt-4 text-[0.95rem]" style={{ color: "var(--cap-ink-3)" }}>1 000 € placés à {taux} % par semaine, gains réinvestis, pendant 52 semaines :</p>
      <p className="mt-1 text-[2.2rem] font-medium leading-tight tabular-nums" style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}>
        {nombre(Math.round(affiche))} €
      </p>
      <ResultatTenir className="mt-2">
        <p>
          Soit <b style={{ color: "var(--cap-ink)" }}>{fois >= 10 ? nombre(Math.round(fois)) : nombre(fois, 1)} fois</b> la mise en un an.{" "}
          {taux >= 5
            ? `Avec 10 000 €, on aurait ${nombre(Math.round(cible * 10))} € au bout d'un an. Si c'était possible, celui qui le promet n'aurait aucune raison de vous vendre quoi que ce soit.`
            : "Même ce chiffre, promis à l'avance, serait un mensonge : en trading, on peut perdre n'importe quelle semaine, et les professionnels le savent."}
        </p>
      </ResultatTenir>
    </div>
  );
}
