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
    // Don't redirect if already on auth pages
    const isAuthPage = typeof window !== "undefined" &&
      (window.location.pathname.startsWith("/login") ||
       window.location.pathname.startsWith("/register"));

    if (!isAuthPage) {
      removeToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
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
  company?: {
    name?: string;
    sector?: string;
    industry?: string;
    country?: string;
    employees?: number;
    description?: string;
    website?: string;
  };
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
    fundamental?: number;
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
  fundamentals?: {
    market_cap?: number;
    pe_ratio?: number;
    forward_pe?: number;
    peg_ratio?: number;
    price_to_book?: number;
    dividend_yield?: number;
    profit_margin?: number;
    revenue_growth?: number;
    earnings_growth?: number;
    debt_to_equity?: number;
    current_ratio?: number;
    roe?: number;
    roa?: number;
    beta?: number;
    "52w_high"?: number;
    "52w_low"?: number;
    "50d_avg"?: number;
    "200d_avg"?: number;
    avg_volume?: number;
    shares_outstanding?: number;
    short_ratio?: number;
    target_price?: number;
    target_high?: number;
    target_low?: number;
    recommendation?: string;
    num_analysts?: number;
  };
  performance?: {
    "1d"?: number;
    "1w"?: number;
    "1m"?: number;
    "3m"?: number;
    "6m"?: number;
    ytd?: number;
  };
  volatility?: {
    "20d"?: number;
    "60d"?: number;
  };
  targets?: {
    bull?: number;
    base?: number;
    bear?: number;
    analyst_mean?: number;
    analyst_high?: number;
    analyst_low?: number;
  };
  analyst_sentiment?: string;
  news?: {
    title?: string;
    publisher?: string;
    link?: string;
    date?: number;
    type?: string;
  }[];
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

// Admin API
export const adminAPI = {
  // Dashboard
  getDashboard: () => fetchAPI<AdminDashboard>("/api/admin/dashboard"),

  // Users
  getUsers: (page = 1, limit = 50, search = "") =>
    fetchAPI<AdminUsersResponse>(`/api/admin/users?page=${page}&limit=${limit}&search=${search}`),

  getUserDetails: (userId: number) =>
    fetchAPI<AdminUserDetails>(`/api/admin/users/${userId}`),

  performUserAction: (userId: number, action: string, reason?: string) =>
    fetchAPI<{ success: boolean; message: string }>("/api/admin/users/action", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, action, reason }),
    }),

  adjustWallet: (userId: number, amount: number, reason: string) =>
    fetchAPI<{ success: boolean; previous_balance: number; new_balance: number }>(
      `/api/admin/users/${userId}/adjust-wallet`,
      {
        method: "POST",
        body: JSON.stringify({ user_id: userId, amount, reason }),
      }
    ),

  // Broadcasts
  sendBroadcast: (title: string, message: string, type = "info") =>
    fetchAPI<{ success: boolean }>("/api/admin/broadcast", {
      method: "POST",
      body: JSON.stringify({ title, message, type }),
    }),

  getBroadcasts: (limit = 20) =>
    fetchAPI<{ broadcasts: AdminBroadcast[] }>(`/api/admin/broadcasts?limit=${limit}`),

  // Settings
  getSettings: () => fetchAPI<{ settings: AdminSetting[] }>("/api/admin/settings"),

  updateSetting: (key: string, value: string) =>
    fetchAPI<{ success: boolean }>("/api/admin/settings", {
      method: "POST",
      body: JSON.stringify({ key, value }),
    }),

  // Analytics
  getUserAnalytics: (days = 30) =>
    fetchAPI<AdminUserAnalytics>(`/api/admin/analytics/users?days=${days}`),

  getTradingAnalytics: (days = 30) =>
    fetchAPI<AdminTradingAnalytics>(`/api/admin/analytics/trading?days=${days}`),

  getAIAnalytics: (days = 30) =>
    fetchAPI<AdminAIAnalytics>(`/api/admin/analytics/ai?days=${days}`),

  // Audit Log
  getAuditLog: (page = 1, limit = 50) =>
    fetchAPI<AdminAuditLogResponse>(`/api/admin/audit-log?page=${page}&limit=${limit}`),

  // Positions
  getPositions: (status = "all", page = 1, limit = 50) =>
    fetchAPI<AdminPositionsResponse>(`/api/admin/positions?status=${status}&page=${page}&limit=${limit}`),

  forceClosePosition: (positionId: number) =>
    fetchAPI<{ success: boolean; message: string }>(`/api/admin/positions/${positionId}/close`, {
      method: "POST",
    }),
};

// Admin Types
export interface AdminDashboard {
  stats: {
    users: {
      total: number;
      active_24h: number;
      active_7d: number;
      new_7d: number;
    };
    trading: {
      open_positions: number;
      trades_24h: number;
      volume_7d: number;
    };
    wallets: {
      total_balance: number;
    };
    ai: {
      total_messages: number;
      messages_24h: number;
    };
    favorites: {
      total: number;
    };
  };
  recent_users: AdminUser[];
  recent_trades: AdminPosition[];
  admin_email: string;
}

export interface AdminUser {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  created_at: string;
  last_login?: string;
  is_active: number;
  balance?: number;
  open_positions?: number;
  favorites_count?: number;
}

export interface AdminUserDetails {
  user: AdminUser;
  wallet: { user_id: string; balance: number; currency: string; created_at: string } | null;
  positions: AdminPosition[];
  favorites: { id: number; user_id: number; symbol: string; added_at: string }[];
  chat_history: { id: number; user_id: number; role: string; content: string; created_at: string }[];
  settings: any;
  trading_stats: {
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    total_pnl: number;
    best_trade: number;
    worst_trade: number;
  } | null;
}

export interface AdminPosition {
  id: number;
  user_id: number;
  symbol: string;
  direction: string;
  entry_price: number;
  quantity: number;
  amount: number;
  leverage: number;
  status: string;
  realized_pnl?: number;
  created_at: string;
  closed_at?: string;
  email?: string;
  username?: string;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AdminBroadcast {
  id: number;
  admin_id: number;
  title: string;
  message: string;
  type: string;
  created_at: string;
  admin_email?: string;
}

export interface AdminSetting {
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface AdminUserAnalytics {
  registrations: { date: string; count: number }[];
  active_users: { date: string; count: number }[];
}

export interface AdminTradingAnalytics {
  daily_trades: { date: string; count: number; volume: number }[];
  top_symbols: { symbol: string; count: number; volume: number }[];
  pnl_distribution: { category: string; count: number }[];
}

export interface AdminAIAnalytics {
  daily_messages: { date: string; count: number }[];
  top_users: { user_id: number; email: string; username: string; message_count: number }[];
}

export interface AdminAuditLogResponse {
  logs: {
    id: number;
    admin_id: number;
    action: string;
    details: string;
    created_at: string;
    admin_email?: string;
  }[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminPositionsResponse {
  positions: AdminPosition[];
  total: number;
  page: number;
  limit: number;
}
