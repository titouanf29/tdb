import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatVolume(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toString();
}

export function getScoreColor(score: number): string {
  if (score >= 75) return "text-profit";
  if (score >= 60) return "text-green-400";
  if (score >= 40) return "text-warning";
  return "text-loss";
}

export function getScoreBadgeClass(score: number): string {
  if (score >= 75) return "score-high";
  if (score >= 40) return "score-medium";
  return "score-low";
}

export function getPriceChangeColor(change: number): string {
  return change >= 0 ? "text-profit" : "text-loss";
}

export function getSignalEmoji(signal: string): string {
  const signals: Record<string, string> = {
    "STRONG BUY": "🔥",
    BUY: "🟢",
    HOLD: "🟡",
    SELL: "🟠",
    "STRONG SELL": "🔴",
  };
  return signals[signal] || "⚪";
}

export function timeAgo(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins}m`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  return `Il y a ${diffDays}j`;
}
