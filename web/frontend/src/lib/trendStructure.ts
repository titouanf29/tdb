/**
 * La structure d'une tendance : sommets et creux successifs.
 *
 * C'est le seul « schéma à poser sur un graphique » qui tienne debout, et il
 * vaut la peine de dire pourquoi. Une tendance haussière n'est pas « ça
 * monte » : c'est une suite de sommets plus hauts ET de creux plus hauts.
 * Cette phrase n'est pas une prédiction, c'est une DÉFINITION — elle décrit
 * ce que le prix a déjà fait, et elle se vérifie mécaniquement sur les
 * données. Rien à croire.
 *
 * C'est ce qui la sépare des figures qu'on voit passer sur les réseaux —
 * épaule-tête-épaule, drapeaux, triangles, grilles de Gann. Celles-là
 * prétendent dire ce qui VA se passer, et la littérature qui a tenté de les
 * tester ne leur trouve pas d'avantage stable une fois les frais déduits.
 * Nous n'en dessinons aucune.
 *
 * Ce module ne dit donc que trois choses, toutes vérifiables :
 *   - où sont les sommets et les creux marquants ;
 *   - si leur suite monte, descend, ou ne dit rien ;
 *   - à partir de quel prix la structure observée cesse d'être vraie.
 *
 * Ce dernier point est le plus utile, et c'est celui que les vidéos oublient :
 * une lecture qui ne dit pas ce qui l'invalide n'est pas une lecture.
 */

export interface Bar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Swing {
  /** Index de la bougie dans la série. */
  i: number;
  price: number;
  kind: "high" | "low";
}

export type StructureKind = "up" | "down" | "range";

export interface Structure {
  kind: StructureKind;
  swings: Swing[];
  /** Le prix sous (ou au-dessus) duquel la structure observée est cassée. */
  invalidation: number | null;
  /** Une phrase, en français, qui dit ce qu'on voit et ce qui l'annulerait. */
  sentence: string;
}

/**
 * Les points pivots, à la fractale.
 *
 * Un sommet est une bougie dont le plus haut domine les `k` bougies de
 * chaque côté. `k` s'adapte à la longueur de la série : sur 60 bougies un
 * voisinage de 2 donne une vingtaine de pivots — du bruit, pas une
 * structure. L'objectif est d'en retenir une poignée, ceux qu'un œil humain
 * désignerait.
 */
export function findSwings(bars: Bar[], k?: number): Swing[] {
  const n = bars.length;
  if (n < 12) return [];
  const w = k ?? Math.max(2, Math.round(n / 22));
  const out: Swing[] = [];

  for (let i = w; i < n - w; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = i - w; j <= i + w; j++) {
      if (j === i) continue;
      if (bars[j].high >= bars[i].high) isHigh = false;
      if (bars[j].low <= bars[i].low) isLow = false;
      if (!isHigh && !isLow) break;
    }
    if (isHigh) out.push({ i, price: bars[i].high, kind: "high" });
    else if (isLow) out.push({ i, price: bars[i].low, kind: "low" });
  }

  // Deux pivots de même nature qui se suivent : on ne garde que le plus
  // marquant. Sans cela une zone agitée produit trois « sommets » collés qui
  // ne décrivent rien.
  const cleaned: Swing[] = [];
  for (const s of out) {
    const last = cleaned[cleaned.length - 1];
    if (last && last.kind === s.kind) {
      const keepNew = s.kind === "high" ? s.price > last.price : s.price < last.price;
      if (keepNew) cleaned[cleaned.length - 1] = s;
      continue;
    }
    cleaned.push(s);
  }
  return cleaned;
}

/** Lit la structure des derniers pivots, et ce qui la casserait. */
export function readStructure(bars: Bar[]): Structure {
  const swings = findSwings(bars);
  const highs = swings.filter((s) => s.kind === "high");
  const lows = swings.filter((s) => s.kind === "low");

  if (highs.length < 2 || lows.length < 2) {
    return {
      kind: "range",
      swings,
      invalidation: null,
      sentence:
        "Pas assez de sommets et de creux marqués sur cette période pour lire une structure. Élargissez l'horizon.",
    };
  }

  const h1 = highs[highs.length - 1], h0 = highs[highs.length - 2];
  const l1 = lows[lows.length - 1], l0 = lows[lows.length - 2];

  const higherHighs = h1.price > h0.price;
  const higherLows = l1.price > l0.price;
  const lowerHighs = h1.price < h0.price;
  const lowerLows = l1.price < l0.price;

  if (higherHighs && higherLows) {
    return {
      kind: "up",
      swings,
      invalidation: l1.price,
      sentence:
        `Sommets et creux de plus en plus hauts : structure haussière. ` +
        `Elle cesse d'être vraie si le prix repasse sous ${fmt(l1.price)}, le dernier creux.`,
    };
  }
  if (lowerHighs && lowerLows) {
    return {
      kind: "down",
      swings,
      invalidation: h1.price,
      sentence:
        `Sommets et creux de plus en plus bas : structure baissière. ` +
        `Elle cesse d'être vraie si le prix repasse au-dessus de ${fmt(h1.price)}, le dernier sommet.`,
    };
  }

  // Le cas le plus fréquent, et celui que personne ne montre : ça ne dit rien.
  return {
    kind: "range",
    swings,
    invalidation: null,
    sentence:
      `Les sommets ${higherHighs ? "montent" : "descendent"} mais les creux ` +
      `${higherLows ? "montent" : "descendent"} : la structure n'est ni franchement ` +
      `haussière ni franchement baissière. C'est le cas le plus courant, et le moins exploitable.`,
  };
}

function fmt(v: number): string {
  return v.toLocaleString("fr-FR", { maximumFractionDigits: v < 10 ? 4 : 2 });
}
