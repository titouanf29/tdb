/**
 * Les zones du scanner, et si leur marché est ouvert en ce moment.
 *
 * Le scanner a toujours accepté de balayer l'Europe un dimanche. Il rendait
 * alors des résultats parfaitement corrects et parfaitement inutilisables :
 * les cours étaient ceux de la clôture de vendredi, les signaux aussi, et
 * rien de ce qu'il proposait ne pouvait être joué avant lundi matin. Il ne
 * disait rien — l'utilisateur était seul à devoir savoir qu'on était
 * dimanche et que Paris dort.
 *
 * C'est la même faute que le graphique qui s'arrêtait le vendredi soir : les
 * données allaient bien, l'écran se taisait. Et un silence, devant une donnée
 * qui n'évolue pas, se lit comme une panne.
 *
 * Ce module ne bloque rien. Un scan sur un marché fermé reste légitime — on
 * prépare sa semaine le dimanche — il doit simplement être annoncé pour ce
 * qu'il est.
 */

import { isMarketOpen, getTimeUntilChange } from "@/lib/marketStatus";

/** Les clés de zone du serveur -> les fuseaux de marketStatus. */
const ZONE_MARCHE: Record<string, string> = {
  EUROPE: "EUROPE",
  USA: "USA",
  ASIE: "ASIA",
  CRYPTO: "CRYPTO",
  MATIERES: "COMMODITIES",
  // INDICES est absent volontairement : la zone réunit des indices de toutes
  // les régions, donc elle n'a pas UN horaire. Lui en inventer un afficherait
  // « fermé » sur un ensemble dont une partie cote.
};

/** Les places du mode fin -> les mêmes fuseaux. */
const PLACE_MARCHE: Record<string, string> = {
  PARIS: "EUROPE", FRANCFORT: "EUROPE", LONDRES: "EUROPE", AMSTERDAM: "EUROPE",
  BRUXELLES: "EUROPE", MILAN: "EUROPE", MADRID: "EUROPE", ZURICH: "EUROPE",
  LISBONNE: "EUROPE", EUROPE: "EUROPE",
  NEWYORK: "USA",
  TOKYO: "ASIA", HONGKONG: "ASIA", SEOUL: "ASIA", SHANGHAI: "ASIA", MUMBAI: "ASIA",
};

export interface EtatZone {
  /** null quand la zone n'a pas d'horaire propre — on ne dit alors rien. */
  ouvert: boolean | null;
  /** « Ouvre demain à 09:00 », « Ferme dans 2h30 », ou vide. */
  quand: string;
}

function etat(marche: string | undefined): EtatZone {
  if (!marche) return { ouvert: null, quand: "" };
  return { ouvert: isMarketOpen(marche), quand: getTimeUntilChange(marche) };
}

export function etatZone(key: string): EtatZone {
  return etat(ZONE_MARCHE[key.toUpperCase()]);
}

export function etatPlace(key: string): EtatZone {
  return etat(PLACE_MARCHE[key.toUpperCase()]);
}

/* Les zones, telles qu'elles se disent dans une phrase.
 *
 * Le libellé d'une pastille — « Europe », « États-Unis » — n'est pas un
 * sujet de phrase : assemblé tel quel, il donnait « Europe est fermée ». Il
 * faut l'article, le nombre et le genre, faute de quoi l'accord du participe
 * est faux dès qu'on coche deux zones. */
const SUJET: Record<string, { maj: string; min: string; pluriel: boolean; feminin: boolean }> = {
  EUROPE:   { maj: "L'Europe", min: "l'Europe", pluriel: false, feminin: true },
  USA:      { maj: "Les États-Unis", min: "les États-Unis", pluriel: true, feminin: false },
  ASIE:     { maj: "L'Asie", min: "l'Asie", pluriel: false, feminin: true },
  MATIERES: { maj: "Les matières premières", min: "les matières premières", pluriel: true, feminin: true },
};

/**
 * Ce qu'il faut dire d'une sélection avant de lancer le scan.
 *
 * Deux cas, et le premier est muet : tout est ouvert, il n'y a rien à
 * signaler. Sinon on nomme ce qui dort — et surtout on dit CE QUE ÇA CHANGE,
 * parce que « marché fermé » tout seul est une étiquette, pas une
 * information. Ce qui compte tient en deux conséquences : rien de ce que le
 * scan trouvera ne sera jouable avant l'ouverture, et le prix aura bougé d'ici
 * là.
 */
export function avertissementSeance(
  zones: { key: string; label: string }[],
): { ferme: string[]; phrase: string } | null {
  const fermees = zones.filter((z) => etatZone(z.key).ouvert === false);
  if (fermees.length === 0) return null;

  const sujets = fermees.map((z) => SUJET[z.key.toUpperCase()]
    ?? { maj: z.label, min: z.label.toLowerCase(), pluriel: false, feminin: false });

  const liste = sujets.length === 1
    ? sujets[0].maj
    : `${sujets[0].maj}${sujets.slice(1, -1).map((s) => `, ${s.min}`).join("")}`
      + ` et ${sujets[sujets.length - 1].min}`;

  // Accord du participe : pluriel dès qu'il y a plusieurs sujets ou qu'un
  // sujet l'est déjà ; féminin seulement si TOUS le sont — un masculin dans
  // le lot l'emporte.
  const pluriel = sujets.length > 1 || sujets[0].pluriel;
  const feminin = sujets.every((s) => s.feminin);
  const verbe = pluriel ? "sont fermé" : "est fermé";
  const accord = `${verbe}${feminin ? "e" : ""}${pluriel ? "s" : ""}`;

  // La réouverture n'est citée que s'il n'y a qu'une zone fermée : trois
  // horaires dans une phrase ne se retiennent pas, et les pastilles portent
  // déjà le détail, zone par zone, dans leur infobulle.
  const quand = fermees.length === 1 ? etatZone(fermees[0].key).quand : "";
  const reprise = quand ? ` — ${quand.toLowerCase()}` : "";

  const toutFerme = fermees.length === zones.length;
  const phrase = toutFerme
    ? `${liste} ${accord} en ce moment${reprise}. Le scan travaillera sur les ` +
      "cours de la dernière clôture : ce qu'il trouvera restera valable, mais " +
      "rien ne sera jouable avant l'ouverture, et le prix aura bougé d'ici là."
    : `${liste} ${accord} en ce moment${reprise}. Les résultats venant de là ` +
      "reposeront sur la dernière clôture.";

  return { ferme: fermees.map((z) => z.key), phrase };
}
