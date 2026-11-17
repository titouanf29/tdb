/**
 * Lire ce qu'une personne tape en France : « 131,50 », « 1 234,5 »,
 * « 20/03/2020 ». Les formulaires attendaient « 131.50 » et « 2020-03-20 », et
 * refusaient le reste avec un message faux (« doit être supérieur à zéro »).
 */

/** Un nombre écrit à la française ou à l'anglaise, ou null s'il n'en est pas un. */
export function lireNombre(texte: string): number | null {
  const t = texte.trim().replace(/[\s  €$]/g, "");
  if (!t) return null;
  // « 1.234,56 » : le point sépare les milliers, la virgule les décimales.
  const normal = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  if (!/^-?\d+(\.\d+)?$/.test(normal)) return null;
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

/** Un nombre à la française pour un champ de saisie : 131.5 → « 131,5 ». */
export function ecrireNombre(n: number): string {
  return n ? String(n).replace(".", ",") : "";
}

/** Une date « JJ/MM/AAAA » ou « AAAA-MM-JJ » en AAAA-MM-JJ, ou null. */
export function lireDate(texte: string): string | null {
  const t = texte.trim();
  let a: number, m: number, j: number;
  const fr = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(t);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (fr) { j = Number(fr[1]); m = Number(fr[2]); a = Number(fr[3]); }
  else if (iso) { a = Number(iso[1]); m = Number(iso[2]); j = Number(iso[3]); }
  else return null;
  const d = new Date(Date.UTC(a, m - 1, j));
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== j) return null;
  return `${a}-${String(m).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
}

/** « 12 jours », « 3 mois », « 6 ans et 8 mois » : une durée de détention qui se lit. */
export function dureeDetention(jours: number): string {
  const j = Math.max(0, Math.round(jours));
  if (j < 31) return `${j} jour${j > 1 ? "s" : ""}`;
  // Arrondi au mois le plus proche : 365 jours font « 1 an », pas « 11 mois ».
  const moisTotal = Math.max(1, Math.round(j / 30.4375));
  const ans = Math.floor(moisTotal / 12);
  const mois = moisTotal % 12;
  if (ans === 0) return `${mois} mois`;
  const partAns = `${ans} an${ans > 1 ? "s" : ""}`;
  return mois ? `${partAns} et ${mois} mois` : partAns;
}
