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

/**
 * Un profil agressif voit aussi les achats dès un score de 55, mais seulement
 * là où c'est mesuré gagnant : en journalier.
 *
 * Mesuré sur 40 actifs, avec le plan de l'écran et le filtre R/R ≥ 1,2, frais
 * compris : la tranche 55–59 a rapporté +0,21 R par trade sur la période A et
 * +0,26 R sur la période jamais vue B (74 % et 64 % des actifs positifs) —
 * à peine moins que les scores ≥ 60 (+0,22 et +0,35), pour deux fois plus de
 * signaux. En 3 jours et en hebdomadaire, la tranche change de signe d'une
 * période à l'autre ; en intraday, elle perd davantage encore. Là, rien ne
 * change : même agressif, le seuil reste 60.
 */
export const SEUIL_AGRESSIF = { score: 55, unites: ["1d"], etude: "+0,21 R et +0,26 R par trade sur deux périodes, 40 actifs" };

export function seuilAbaisse(niveau: NiveauRisque, unite: string | undefined): boolean {
  return (niveau === "aggressive" || niveau === "very_aggressive") && SEUIL_AGRESSIF.unites.includes(unite ?? "");
}
