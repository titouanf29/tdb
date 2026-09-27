"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * « Réduire les animations », lu sans casser l'hydratation.
 *
 * `useReducedMotion` de framer-motion lit la préférence de l'appareil dès le
 * premier rendu. Le serveur, lui, ne la connaît pas : pour quelqu'un qui a
 * activé ce réglage, le HTML du serveur (animé) et le premier rendu du
 * navigateur (immobile) différaient, et React jetait la page entière pour la
 * reconstruire — le réglage censé alléger l'affichage l'alourdissait.
 *
 * Ici, le premier rendu est le même des deux côtés (« pas réduit »), puis la
 * vraie préférence s'applique aussitôt après le montage.
 */
export function useMouvementReduit(): boolean {
  const prefere = useReducedMotion();
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);
  return monte && Boolean(prefere);
}
