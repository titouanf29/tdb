/**
 * L'appétit pour le risque, traduit en ce qu'il veut dire concrètement : la
 * part du capital qu'on accepte de perdre si le stop est touché.
 *
 * Il règle la TAILLE de la position, jamais le stop ni l'objectif. Ceux-là
 * dépendent de l'horizon (le style de trading) et ont été mesurés : un stop
 * resserré « par prudence » se fait sortir par le bruit du marché et perd
 * plus souvent. Être prudent, c'est miser moins, pas placer le stop plus près.
 */
export const NIVEAUX_RISQUE = ["conservative", "moderate", "aggressive", "very_aggressive"] as const;
export type NiveauRisque = (typeof NIVEAUX_RISQUE)[number];

export const RISQUE: Record<NiveauRisque, { pct: number; label: string }> = {
  conservative: { pct: 0.5, label: "Prudent" },
  moderate: { pct: 1, label: "Modéré" },
  aggressive: { pct: 2, label: "Agressif" },
  very_aggressive: { pct: 5, label: "Très agressif" },
};

export function niveauRisque(v: string | null | undefined): NiveauRisque {
  return (NIVEAUX_RISQUE as readonly string[]).includes(v ?? "") ? (v as NiveauRisque) : "moderate";
}

/** Le montant perdu si le stop est touché, et la taille de position qui y mène
 *  (sans levier), plafonnée au capital disponible. */
export function tailleSelonRisque(capital: number, pct: number, cours: number, stop: number) {
  const perte = (capital * pct) / 100;
  const distance = Math.abs(cours - stop) / cours;
  if (!(distance > 0.0005)) return { perte, position: null, plafonnee: false };
  const brute = perte / distance;
  // Plafonnée au capital, la position perd moins que le budget au stop.
  if (brute > capital) return { perte: capital * distance, position: capital, plafonnee: true };
  return { perte, position: brute, plafonnee: false };
}


// Le seuil d'achat abaissé des profils agressifs (55 en journalier) est une
// règle du MOTEUR : voir web/backend/api/routes/_risque.py. L'écran lit
// `analysis.seuil_achat`, il ne la recalcule pas.
