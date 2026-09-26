/**
 * La fenêtre du week-end, calculée comme le serveur (api/routes/semaine.py) :
 * du vendredi 22 h 30 au lundi 9 h, heure de Paris. Calculée ici pour que
 * l'accueil choisisse sa carte sans attendre une requête ; le serveur reste
 * juge de l'accès à l'espace.
 */
export function weekendOuvert(maintenant: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(maintenant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const jour = get("weekday"); // Mon … Sun
  const h = Number(get("hour")) % 24 + Number(get("minute")) / 60;
  return (jour === "Fri" && h >= 22.5) || jour === "Sat" || jour === "Sun" || (jour === "Mon" && h < 9);
}

/** « 28 septembre » : le lundi qui ouvre la semaine à préparer. */
export function lundiAPreparer(maintenant: Date = new Date()): string {
  const paris = new Date(maintenant.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const jour = paris.getDay(); // 0 = dimanche
  const ecart = jour === 1 && paris.getHours() < 9 ? 0 : (8 - jour) % 7 || 7;
  paris.setDate(paris.getDate() + ecart);
  return paris.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}
