/**
 * Market status utilities - Check if markets are open/closed and get trading hours
 */

export interface MarketHours {
  openTime: string;
  closeTime: string;
  timezone: string;
  closedDays: number[];
  alwaysOpen?: boolean;
  alwaysOpenWeekdays?: boolean;
}

// Market trading hours configuration.
// Times are expressed in each market's OWN local timezone — conversion to the
// user's clock is handled at runtime via the IANA timezone (handles DST).
export const marketHoursConfig: Record<string, MarketHours> = {
  EUROPE: {
    openTime: "09:00",
    closeTime: "17:30",
    timezone: "Europe/Paris",
    closedDays: [0, 6], // Sunday, Saturday
  },
  USA: {
    openTime: "09:30", // NYSE local time (America/New_York)
    closeTime: "16:00",
    timezone: "America/New_York",
    closedDays: [0, 6],
  },
  ASIA: {
    openTime: "09:00", // Tokyo local time (Asia/Tokyo)
    closeTime: "15:00",
    timezone: "Asia/Tokyo",
    closedDays: [0, 6],
  },
  FOREX: {
    openTime: "23:00",
    closeTime: "22:00",
    timezone: "Europe/Paris",
    // Samedi ET dimanche. Le dimanche manquait, et c'était un bug visible :
    // la semaine des changes rouvre dimanche 23:00 (ouverture de Sydney), pas
    // dimanche à minuit. isMarketOpen contient bien la règle « dimanche après
    // 23:00 » — mais elle vit dans une branche que seule closedDays
    // déclenche, donc elle n'était jamais atteinte et le dimanche entier était
    // compté ouvert. La logique était juste, la configuration la contredisait.
    closedDays: [0, 6],
    alwaysOpenWeekdays: true,
  },
  CRYPTO: {
    openTime: "00:00",
    closeTime: "23:59",
    timezone: "UTC",
    closedDays: [],
    alwaysOpen: true,
  },
  COMMODITIES: {
    openTime: "23:00",
    closeTime: "22:00",
    timezone: "Europe/Paris",
    // Même correction que le forex : les contrats à terme du CME rouvrent
    // dimanche soir, pas dimanche matin. C'est ce qui affichait « Matières
    // premières · Ouvert » un dimanche midi.
    closedDays: [0, 6],
    alwaysOpenWeekdays: true,
  },
};

/**
 * Check if a market is currently open
 */
export function isMarketOpen(marketKey: string): boolean {
  const config = marketHoursConfig[marketKey];
  if (!config) return false;

  if (config.alwaysOpen) return true;

  const now = new Date();

  // Forex / commodities run 24h on weekdays — these conventions are anchored to
  // Paris time (Sunday 23:00 open → Friday 22:00 close).
  if (config.alwaysOpenWeekdays) {
    const parisTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    const pDay = parisTime.getDay();
    const pHours = parisTime.getHours();
    if (config.closedDays.includes(pDay)) {
      // Sunday after 23:00 reopens
      if (pDay === 0 && pHours >= 23) return true;
      return false;
    }
    if (pDay === 5 && pHours >= 22) return false; // Friday close
    return true;
  }

  // Standard markets: evaluate against the market's OWN local timezone.
  const localTime = new Date(now.toLocaleString("en-US", { timeZone: config.timezone }));
  const day = localTime.getDay();
  const currentTime = localTime.getHours() * 60 + localTime.getMinutes();

  if (config.closedDays.includes(day)) return false;

  const [openH, openM] = config.openTime.split(":").map(Number);
  const [closeH, closeM] = config.closeTime.split(":").map(Number);
  const openTime = openH * 60 + openM;
  const closeTime = closeH * 60 + closeM;

  return currentTime >= openTime && currentTime < closeTime;
}

/**
 * Get formatted trading hours for display
 */
export function getMarketHoursDisplay(marketKey: string): string {
  const config = marketHoursConfig[marketKey];
  if (!config) return "Horaires inconnus";

  if (config.alwaysOpen) {
    return "24h/24 - 7j/7";
  }

  if (config.alwaysOpenWeekdays) {
    return `Lun-Ven: 24h/24 (Dim ${config.openTime} - Ven ${config.closeTime})`;
  }

  const tzLabels: Record<string, string> = {
    "Europe/Paris": "Paris",
    "America/New_York": "New York",
    "Asia/Tokyo": "Tokyo",
  };
  const tzLabel = tzLabels[config.timezone] || config.timezone;

  const closedDaysNames = config.closedDays.map((d) => {
    const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    return days[d];
  });

  return `${config.openTime} - ${config.closeTime} (${tzLabel}, ferme ${closedDaysNames.join(", ")})`;
}

/**
 * Get time until market opens/closes.
 * Correctly handles weekends — never shows a countdown to a closed day.
 */
export function getTimeUntilChange(marketKey: string): string {
  const config = marketHoursConfig[marketKey];
  if (!config || config.alwaysOpen) return "";
  const isOpen = isMarketOpen(marketKey);
  const now = new Date();
  if (config.alwaysOpenWeekdays) return changementSemaineContinue(isOpen, now);

  // ── Standard markets (Europe, USA, Asia) ──────────────────────────────────────
  const localTime = new Date(now.toLocaleString("en-US", { timeZone: config.timezone }));
  const currentMinutes = localTime.getHours() * 60 + localTime.getMinutes();
  const [openH, openM] = config.openTime.split(":").map(Number);
  const [closeH, closeM] = config.closeTime.split(":").map(Number);
  const openMinutes = openH * 60 + openM;

  if (isOpen) return dans("Ferme", closeH * 60 + closeM - currentMinutes);
  // Un jour de séance, avant l'ouverture : un simple compte à rebours.
  if (!config.closedDays.includes(localTime.getDay()) && openMinutes > currentMinutes) {
    return dans("Ouvre", openMinutes - currentMinutes);
  }
  return prochaineOuverture(config.timezone, config.closedDays, localTime, openH, openM);
}

/** « Ferme dans 2h05 », ou rien quand l'écart n'est pas positif. */
function dans(verbe: "Ouvre" | "Ferme", minutes: number): string {
  if (minutes <= 0) return "";
  return `${verbe} dans ${Math.floor(minutes / 60)}h${(minutes % 60).toString().padStart(2, "0")}`;
}

/** Forex et matières premières : séance continue du dimanche 23 h au vendredi 22 h, heure de Paris. */
function changementSemaineContinue(isOpen: boolean, now: Date): string {
  const parisTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const pDay = parisTime.getDay();
  const pCurrentMin = parisTime.getHours() * 60 + parisTime.getMinutes();
  if (isOpen) return pDay === 5 ? dans("Ferme", 22 * 60 - pCurrentMin) : "";
  // Vendredi soir ou samedi : réouverture dimanche 23 h ; dimanche avant 23 h : compte à rebours.
  if (pDay === 5 || pDay === 6) return "Ouvre dim à 23 h 00";
  if (pDay === 0) return dans("Ouvre", 23 * 60 - pCurrentMin);
  return "";
}

/**
 * « Ouvre demain à 09:00 », « Ouvre lun à 15:30, heure de Paris » : la prochaine
 * séance, en sautant les jours fermés.
 *
 * L'HEURE EST CELLE DE PARIS. « Ouvre lun à 09:30 » pour New York se lisait à
 * côté de « il rouvre lundi vers 15 h 30 » sur les cartes du scanner : la même
 * ouverture, deux heures différentes sur la même page. L'écran parle à
 * quelqu'un en France ; l'heure locale de la place reste dans l'infobulle des
 * horaires.
 */
function prochaineOuverture(tz: string, joursFermes: number[], localTime: Date, openH: number, openM: number): string {
  let daysAhead = 1;
  let nextDay = (localTime.getDay() + 1) % 7;
  while (joursFermes.includes(nextDay)) {
    daysAhead++;
    nextDay = (nextDay + 1) % 7;
  }
  const dayNamesFr = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
  const heure = heureDeParis(tz, localTime, daysAhead, openH, openM);
  const precision = tz === "Europe/Paris" ? "" : ", heure de Paris";
  const jour = daysAhead === 1 ? "demain" : dayNamesFr[nextDay];
  return `Ouvre ${jour} à ${heure}${precision}`;
}

/** Le décalage, en minutes, entre l'heure murale d'un fuseau et l'heure UTC à un instant donné. */
function decalageMinutes(tz: string, instant: Date): number {
  const mur = new Date(instant.toLocaleString("en-US", { timeZone: tz }));
  const utc = new Date(instant.toLocaleString("en-US", { timeZone: "UTC" }));
  return Math.round((mur.getTime() - utc.getTime()) / 60000);
}

/**
 * « 15:30 » : l'ouverture d'une place, dans `joursPlusTard` jours à `h:m` heure
 * locale de la place, exprimée à l'heure de Paris. Le décalage est pris à
 * l'instant de l'ouverture elle-même, pas maintenant : entre fin octobre et
 * début novembre, Paris et New York ne changent pas d'heure la même semaine.
 */
function heureDeParis(tz: string, localeMaintenant: Date, joursPlusTard: number, h: number, m: number): string {
  const approx = new Date(Date.UTC(
    localeMaintenant.getFullYear(), localeMaintenant.getMonth(), localeMaintenant.getDate() + joursPlusTard, h, m));
  const instant = new Date(approx.getTime() - decalageMinutes(tz, approx) * 60000);
  const [hh, mm] = instant.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).split(":");
  // « 9 h 00 », « 15 h 30 » : l'écriture du reste du site, pas « 09:00 ».
  return `${Number(hh)} h ${mm}`;
}
