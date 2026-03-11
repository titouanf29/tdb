/**
 * API client for TDB backend
 */

import { authHeaders, removeToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class APIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "APIError";
  }
}

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    removeToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new APIError("Unauthorized", 401);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "API Error" }));
    throw new APIError(error.detail || "Request failed", response.status);
  }

  return response.json();
}

// Market API
export const marketAPI = {
  getMarkets: () => fetchAPI<{ markets: Market[] }>("/api/market/list"),

  getMarket: (key: string) => fetchAPI<Market>(`/api/market/${key}`),

  getAssets: (marketKey: string, limit = 20) =>
    fetchAPI<{ assets: Asset[] }>(
      `/api/market/${marketKey}/assets?limit=${limit}`
    ),

  getQuote: (symbol: string) => fetchAPI<Quote>(`/api/market/quote/${symbol}`),

  getChart: (symbol: string, period = "1mo", interval = "1d") =>
    fetchAPI<ChartData>(
      `/api/market/chart/${symbol}?period=${period}&interval=${interval}`
    ),
};

// Wallet API
export const walletAPI = {
  getBalance: () => fetchAPI<WalletBalance>("/api/wallet/balance"),

  getPositions: (status = "open") =>
    fetchAPI<{ positions: Position[] }>(`/api/wallet/positions?status=${status}`),

  openPosition: (data: OpenPositionData) =>
    fetchAPI<PositionResult>("/api/wallet/positions/open", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  closePosition: (positionId: number) =>
    fetchAPI<PositionResult>("/api/wallet/positions/close", {
      method: "POST",
      body: JSON.stringify({ position_id: positionId }),
    }),

  getHistory: (limit = 50) =>
    fetchAPI<{ history: Position[] }>(`/api/wallet/history?limit=${limit}`),

  getStats: () => fetchAPI<TradingStats>("/api/wallet/stats"),
};

// Analysis API
export const analysisAPI = {
  analyze: (symbol: string, timeframe = "1d") =>
    fetchAPI<Analysis>(`/api/analysis/${symbol}?timeframe=${timeframe}`),

  scan: (marketKey: string, minScore = 60, limit = 10) =>
    fetchAPI<ScanResult>(
      `/api/analysis/scan/${marketKey}?min_score=${minScore}&limit=${limit}`
    ),
};

// AI Assistant API
export const aiAPI = {
  chat: (message: string, context?: string) =>
    fetchAPI<{ response: string; usage?: object }>("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message, context }),
    }),

  getHistory: (limit = 50) =>
    fetchAPI<{ messages: ChatMessage[] }>(`/api/ai/history?limit=${limit}`),

  clearHistory: () =>
    fetchAPI<{ message: string }>("/api/ai/history", { method: "DELETE" }),

  quickAnalysis: (symbol: string) =>
    fetchAPI<{ symbol: string; analysis: string }>(
      `/api/ai/quick-analysis?symbol=${symbol}`,
      { method: "POST" }
    ),
};

// Favorites API
export const favoritesAPI = {
  getFavorites: () => fetchAPI<{ favorites: Favorite[] }>("/api/favorites/"),

  addFavorite: (symbol: string) =>
    fetchAPI<{ message: string }>("/api/favorites/", {
      method: "POST",
      body: JSON.stringify({ symbol }),
    }),

  removeFavorite: (symbol: string) =>
    fetchAPI<{ message: string }>(`/api/favorites/${symbol}`, {
      method: "DELETE",
    }),

  checkFavorite: (symbol: string) =>
    fetchAPI<{ is_favorite: boolean }>(`/api/favorites/check/${symbol}`),
};

// Types
export interface Market {
  key: string;
  name: string;
  description: string;
  asset_count: number;
  always_open?: boolean;
  assets?: string[];
}

export interface Asset {
  symbol: string;
  price: number;
  change: number;
  volume: number;
  error?: boolean;
}

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_amount: number;
  high: number;
  low: number;
  open: number;
  volume: number;
  market_cap?: number;
  pe_ratio?: number;
  "52w_high"?: number;
  "52w_low"?: number;
}

export interface ChartData {
  symbol: string;
  period: string;
  interval: string;
  data: {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
}

export interface WalletBalance {
  balance: number;
  currency: string;
  total_pnl: number;
  positions_value: number;
  total_equity?: number;
}

export interface Position {
  id: number;
  symbol: string;
  direction: "LONG" | "SHORT";
  entry_price: number;
  quantity: number;
  amount: number;
  leverage: number;
  take_profit?: number;
  stop_loss?: number;
  status: "open" | "closed";
  current_price?: number;
  unrealized_pnl?: number;
  pnl_percent?: number;
  realized_pnl?: number;
  created_at: string;
  closed_at?: string;
}

export interface OpenPositionData {
  symbol: string;
  direction: "LONG" | "SHORT";
  amount: number;
  leverage?: number;
  take_profit?: number;
  stop_loss?: number;
}

export interface PositionResult {
  success: boolean;
  message: string;
  entry_price?: number;
  exit_price?: number;
  quantity?: number;
  realized_pnl?: number;
  new_balance: number;
}

export interface TradingStats {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_pnl: number;
  best_trade: number;
  worst_trade: number;
  avg_pnl: number;
}

export interface Analysis {
  symbol: string;
  timeframe: string;
  price: {
    current: number;
    change: number;
    high_24h: number;
    low_24h: number;
  };
  score: {
    total: number;
    technical: number;
    volume: number;
    momentum: number;
  };
  signal: {
    text: string;
    emoji: string;
  };
  trend: string;
  indicators: {
    rsi: { value: number; signal: string };
    macd: {
      value: number;
      signal_line: number;
      histogram: number;
      signal: string;
    };
    ema: { ema20: number; ema50: number; ema200: number | null };
    bollinger: {
      upper: number;
      middle: number;
      lower: number;
      position: string;
    };
    atr: number;
    volume_ratio: number;
  };
  levels: {
    support: number;
    resistance: number;
    pivot: number;
  };
  risk: {
    suggested_sl: number;
    suggested_tp: number;
    risk_reward: number;
  };
}

export interface ScanResult {
  market: string;
  min_score: number;
  results: {
    symbol: string;
    price: number;
    change: number;
    score: number;
    rsi: number;
  }[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface Favorite {
  symbol: string;
  price: number;
  change: number;
  added_at: string;
  error?: boolean;
}
