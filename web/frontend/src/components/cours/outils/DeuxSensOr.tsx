"use client";

import { useEffect, useRef, useState } from "react";
import { hasard } from "@/lib/cours/marche";
import { Bouton, Chiffre, Curseur, dollars, signe, ton, useAnimer, Verdict } from "./ElementsMarches";

/**
 * Le contrat marche dans les deux sens : deux traders ouvrent au même prix,
 * 4 000 $ l'once, avec 0,01 lot (une once), l'un à l'achat, l'autre à la
 * vente. On fait bouger le prix, et l'on voit qui gagne quoi.
 */

const ENTREE = 4000;

export function DeuxSensOr() {
  const animer = useAnimer();
  const [prix, setPrix] = useState(4020);
  const raf = useRef(0);
  const tirage = useRef(1);

  const bouger = () => {
    cancelAnimationFrame(raf.current);
    const r = hasard(tirage.current++ * 977);
    const cible = Math.round(ENTREE + (r() - 0.5) * 90);
    if (!animer) { setPrix(cible); return; }
    const depart = prix, t0 = performance.now();
    const pas = (t: number) => {
      const f = Math.min(1, (t - t0) / 1100);
      const e = 1 - (1 - f) ** 3;
      // Un petit tremblement en route, comme un vrai cours.
      const tremble = f < 1 ? Math.sin(f * 30) * 4 * (1 - f) : 0;
      setPrix(Math.round(depart + (cible - depart) * e + tremble));
      if (f < 1) raf.current = requestAnimationFrame(pas);
    };
    raf.current = requestAnimationFrame(pas);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const achat = prix - ENTREE;   // 0,01 lot = 1 once : 1 $ par dollar de mouvement
  const vente = ENTREE - prix;
  const larg = (v: number) => `${Math.min(50, (Math.abs(v) / 50) * 50)}%`;

  return (
    <div>
      <Curseur label="Le prix de l'once, plus tard" min={3950} max={4050} step={1} valeur={prix} onChange={(v) => { cancelAnimationFrame(raf.current); setPrix(v); }} affiche={dollars(prix)} />
      <div className="mt-1"><Bouton onClick={bouger}>Faire bouger le prix</Bouton></div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        {[{ nom: "Celui qui a acheté", v: achat, note: "Il gagne si le prix monte." }, { nom: "Celui qui a vendu", v: vente, note: "Il gagne si le prix baisse." }].map((c) => (
          <div key={c.nom} className="min-w-0">
            <Chiffre label={c.nom} valeur={`${signe(c.v)} $`} couleur={ton(c.v)} grand note={c.note} />
            <div className="relative mt-2 h-2 rounded-full" style={{ backgroundColor: "var(--cap-line)" }} aria-hidden>
              <span className="absolute inset-y-0 left-1/2 w-px" style={{ backgroundColor: "var(--cap-line-strong)" }} />
              <span className="absolute inset-y-0 rounded-full" style={{
                backgroundColor: ton(c.v), width: larg(c.v),
                left: c.v >= 0 ? "50%" : `calc(50% - ${larg(c.v)})`,
              }} />
            </div>
          </div>
        ))}
      </div>
      <Verdict>
        Les deux ont ouvert à <b>4 000 $</b> avec <b>0,01 lot</b>, soit une once. Le prix est à <b>{dollars(prix)}</b> : {achat === 0 ? "personne ne gagne ni ne perd (hors spread)." : <>l&apos;acheteur est à <b style={{ color: ton(achat) }}>{signe(achat)} $</b>, le vendeur à <b style={{ color: ton(vente) }}>{signe(vente)} $</b>. Ce que l&apos;un gagne, l&apos;autre le perd.</>}
      </Verdict>
    </div>
  );
}
