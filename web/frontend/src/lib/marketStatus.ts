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

// Market trading hours configuration
export const marketHoursConfig: Record<string, MarketHours> = {
  EUROPE: {
    openTime: "09:00",
    closeTime: "17:30",
    timezone: "Europe/Paris",
    closedDays: [0, 6], // Sunday, Saturday
  },
  USA: {
    openTime: "15:30", // 09:30 NY = 15:30 Paris
    closeTime: "22:00", // 16:00 NY = 22:00 Paris
    timezone: "Europe/Paris",
    closedDays: [0, 6],
  },
  ASIA: {
    openTime: "01:00", // 09:00 Tokyo = 01:00 Paris
    closeTime: "07:00", // 15:00 Tokyo = 07:00 Paris
    timezone: "Europe/Paris",
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
  const parisTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const day = parisTime.getDay();
  const hours = parisTime.getHours();
  const minutes = parisTime.getMinutes();
  const currentTime = hours * 60 + minutes;

  // Check if closed day
  if (config.closedDays.includes(day)) return false;

  // For always open weekdays (Forex, Commodities)
  if (config.alwaysOpenWeekdays) {
    // Special case: Sunday after 23:00 is open
    if (day === 0 && hours >= 23) return true;
    // Friday after 22:00 is closed
    if (day === 5 && hours >= 22) return false;
    // Other weekdays are open 24h
    if (day >= 1 && day <= 4) return true;
    return false;
  }

  // Parse open/close times
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

  const closedDaysNames = config.closedDays.map((d) => {
    const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    return days[d];
  });

  return `${config.openTime} - ${config.closeTime} (Ferme ${closedDaysNames.join(", ")})`;
}

/**
 * Get time until market opens/closes
 */
export function getTimeUntilChange(marketKey: string): string {
  const config = marketHoursConfig[marketKey];
  if (!config || config.alwaysOpen) return "";

  const isOpen = isMarketOpen(marketKey);
  const now = new Date();
  const parisTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const hours = parisTime.getHours();
  const minutes = parisTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  if (config.alwaysOpenWeekdays) {
    if (isOpen) {
      // Time until Friday 22:00
      const day = parisTime.getDay();
      if (day === 5) {
        const closeMinutes = 22 * 60;
        const diff = closeMinutes - currentMinutes;
        if (diff > 0) {
          const h = Math.floor(diff / 60);
          const m = diff % 60;
          return `Ferme dans ${h}h${m.toString().padStart(2, "0")}`;
        }
      }
    }
    return "";
  }

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
