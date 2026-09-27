"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { marketAPI } from "@/lib/api";
import { Container, CountUp, EASE } from "@/components/design-system";
import { NUIT } from "./nuit";

/**
 * Quatre nombres, et chacun est vrai : le nombre d'actifs couverts est lu sur
 * le serveur, celui des figures mesurées aussi. Pas de « 10 000 utilisateurs
 * satisfaits » : le site n'a pas besoin d'inventer ce qu'il peut compter.
 */
export function Preuves() {
  const reduit = useReducedMotion();
  const [actifs, setActifs] = useState(819);
  const [figures, setFigures] = useState(1527);
  const [annees, setAnnees] = useState(10);

  useEffect(() => {
    marketAPI.getMarkets()
      .then((d) => {
        const n = (d.markets ?? []).reduce((s, m) => s + (m.asset_count ?? 0), 0);
        if (n > 0) setActifs(n);
      })
      .catch(() => {});
    marketAPI.getFiguresMesure()
      .then((d) => { if (d?.methode?.figures) { setFigures(d.methode.figures); setAnnees(d.methode.annees); } })
      .catch(() => {});
  }, []);

  const CHIFFRES = [
    { n: actifs, suffixe: "", titre: "actifs suivis", detail: "Actions, indices, crypto, matières premières, devises" },
    { n: figures, suffixe: "", titre: "figures chartistes mesurées", detail: `Sur ${annees} ans de cours, pour savoir si elles marchent vraiment` },
    { n: 46, suffixe: "", titre: "décisions de la Fed analysées", detail: "Et leur effet réel, actif par actif" },
    { n: 0, suffixe: " €", titre: "risqués", detail: "10 000 € virtuels pour vous entraîner" },
  ];

  return (
    <section style={{ backgroundColor: NUIT.fond, color: NUIT.texte }} aria-label="Le site en chiffres">
      <Container width="wide">
        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-[20px] lg:grid-cols-4" style={{ backgroundColor: NUIT.ligne }}>
          {CHIFFRES.map((c, i) => (
            <motion.li key={c.titre}
              {...(reduit ? {} : { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: 0.45, delay: i * 0.07, ease: EASE } })}
              className="p-5 sm:p-7" style={{ backgroundColor: NUIT.fond2 }}>
              <div className="cap-num text-[clamp(1.9rem,4.5vw,2.9rem)] font-medium leading-none" style={{ color: i === 3 ? NUIT.hausse : NUIT.or }}>
                {reduit ? `${c.n.toLocaleString("fr-FR")}${c.suffixe}` : <CountUp to={c.n} suffix={c.suffixe} />}
              </div>
              <div className="mt-3 text-[0.98rem] font-semibold">{c.titre}</div>
              <div className="mt-1 text-[0.85rem] leading-snug" style={{ color: NUIT.texte3 }}>{c.detail}</div>
            </motion.li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
