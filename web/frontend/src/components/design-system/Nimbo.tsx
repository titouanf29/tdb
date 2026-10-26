"use client";

import { useId, useMemo } from "react";
import { cn } from "@/lib/utils";
import { nimboSvg, type NimboHumeur } from "./nimbo";

export type { NimboHumeur } from "./nimbo";

/**
 * Nimbo, le petit nuage de CaptenTDB.
 *
 * <Nimbo humeur="salue" taille={120} /> — le dessin vient de nimboSvg(), le
 * même que celui du rideau de chargement. Décoratif par défaut (aria-hidden) :
 * il accompagne un texte qui dit déjà les choses ; donner un `label` quand il
 * porte seul un sens.
 */
export function Nimbo({
  humeur = "content",
  taille = 120,
  mini,
  label = "",
  className,
}: {
  humeur?: NimboHumeur;
  taille?: number;
  /** Version simplifiée, pour un bouton ou une puce. */
  mini?: boolean;
  label?: string;
  className?: string;
}) {
  const id = useId();
  const html = useMemo(
    () => nimboSvg(humeur, taille, { mini, id: `n${id}`, label }),
    [humeur, taille, mini, id, label],
  );
  return (
    <span
      className={cn("inline-flex shrink-0", className)}
      // Le SVG est construit par nimboSvg() à partir de valeurs internes : aucun
      // texte venu de l'utilisateur n'y entre, sauf `label`, échappé.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
