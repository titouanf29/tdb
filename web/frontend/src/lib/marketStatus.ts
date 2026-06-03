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
    closedDays: [6], // Saturday only
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
    closedDays: [6],
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
 * Get time until market opens/closes
 */
export function getTimeUntilChange(marketKey: string): string {
  const config = marketHoursConfig[marketKey];
  if (!config || config.alwaysOpen) return "";

  const isOpen = isMarketOpen(marketKey);
  const now = new Date();

  if (config.alwaysOpenWeekdays) {
    const parisTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    if (isOpen && parisTime.getDay() === 5) {
      // Time until Friday 22:00 (Paris)
      const currentMinutes = parisTime.getHours() * 60 + parisTime.getMinutes();
      const diff = 22 * 60 - currentMinutes;
      if (diff > 0) {
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        return `Ferme dans ${h}h${m.toString().padStart(2, "0")}`;
      }
    }
    return "";
  }

  // Standard markets: compute against the market's own local clock.
  const localTime = new Date(now.toLocaleString("en-US", { timeZone: config.timezone }));
  const currentMinutes = localTime.getHours() * 60 + localTime.getMinutes();

  const [openH, openM] = config.openTime.split(":").map(Number);
  const [closeH, closeM] = config.closeTime.split(":").map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  if (isOpen) {
    const diff = closeMinutes - currentMinutes;
    if (diff > 0) {
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return `Ferme dans ${h}h${m.toString().padStart(2, "0")}`;
    }
  } else {
    let diff = openMinutes - currentMinutes;
    if (diff < 0) diff += 24 * 60;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `Ouvre dans ${h}h${m.toString().padStart(2, "0")}`;
  }

  return "";
}
