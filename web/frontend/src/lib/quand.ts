/**
 * « aujourd'hui », « hier », « il y a 3 jours », puis la date : la distance
 * d'un instant passé, en jours, telle qu'on la dit.
 */
export function jours(iso: string, maintenant: number = Date.now()): number {
  return Math.max(0, Math.floor((maintenant - new Date(iso).getTime()) / 86_400_000));
}

export function ilYA(iso: string, maintenant: number = Date.now()): string {
  const j = jours(iso, maintenant);
  if (j <= 0) return "aujourd'hui";
  if (j === 1) return "hier";
  if (j < 14) return `il y a ${j} jours`;
  return `le ${new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
}

/** « d'hier », « d'il y a 3 jours », « du 12 octobre » : après « votre lecture ». */
export function deQuand(iso: string, maintenant: number = Date.now()): string {
  const j = jours(iso, maintenant);
  if (j <= 1) return "d'hier";
  if (j < 14) return `d'il y a ${j} jours`;
  return `du ${new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
}
