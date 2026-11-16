/**
 * Le bord d'une feuille, en nuages.
 *
 * Chez Clair, chaque feuille crème a un bord liquide qui ondule. Ici le ciel
 * fait le même travail : la feuille claire monte du bas comme une mer de
 * nuages, et pend en cumulus au-dessus de la nuit. Deux nappes pleines, celle
 * de derrière d'un ton plus foncé ; le script les fait glisser en sens
 * contraire pendant qu'on descend. Tout est opaque, aucun texte n'y repose.
 */

/** Une rangée de bosses : x de départ, largeur, hauteur (sur 80). */
function rangee(bosses: [number, number][], debord: number, base = 80): string {
  let x = -40;
  let d = `M${x} ${base} L${x} ${base - bosses[0][1] * 0.4}`;
  for (const [largeur, haut] of bosses) {
    const fin = x + largeur;
    const sommet = base - haut;
    // Deux quarts de courbe : un dôme, plus rond qu'une sinusoïde.
    d += ` C${x} ${sommet} ${fin} ${sommet} ${fin} ${base - haut * 0.42}`;
    x = fin;
  }
  // La nappe de devant déborde sous la base, celle de derrière s'arrête avant :
  // deux bords confondus laissaient passer un liseré sombre le long de la feuille.
  return `${d} L${x} ${base + debord} L-40 ${base + debord} Z`;
}

const AVANT: [number, number][] = [[150, 46], [120, 34], [190, 58], [110, 30], [170, 50], [140, 38], [200, 60], [120, 32], [180, 52], [150, 40], [160, 48]];
const ARRIERE: [number, number][] = [[180, 64], [140, 50], [210, 72], [130, 46], [190, 66], [160, 54], [220, 74], [150, 50], [200, 68], [170, 58]];

const D_AVANT = rangee(AVANT, 6);
const D_ARRIERE = rangee(ARRIERE, -6);

export function BordNuages({ cote, avant, arriere }: Readonly<{
  /** « haut » : la feuille monte du bas ; « bas » : elle pend au-dessus de la section suivante. */
  cote: "haut" | "bas";
  /** La couleur de la feuille. */
  avant: string;
  /** La nappe de derrière, un ton plus foncé. */
  arriere: string;
}>) {
  return (
    <svg className={`acc-bord acc-bord-${cote}`} aria-hidden focusable="false" viewBox="0 0 1440 80" preserveAspectRatio="none">
      <g className="acc-bord-arriere"><path d={D_ARRIERE} fill={arriere} /></g>
      <g className="acc-bord-avant"><path d={D_AVANT} fill={avant} /></g>
    </svg>
  );
}
