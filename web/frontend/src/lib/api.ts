/**
 * API client for TDB backend
 */

import { authHeaders, removeToken, getToken } from "./auth";

// In the browser, use relative URLs so requests go through Next.js proxy (no CORS).
// During SSR, call the backend directly.
const API_URL = typeof window !== "undefined"
  ? ""
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");

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
    const detail = error.detail;
    let message: string;
    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail)) {
      message = detail.map((e: any) => e.msg || JSON.stringify(e)).join("; ");
    } else if (detail && typeof detail === "object") {
      message = (detail as any).message || JSON.stringify(detail);
    } else {
      message = "Request failed";
    }
    throw new APIError(message, response.status);
  }

  return response.json();
}

// Market API
export const marketAPI = {
  getMarkets: () => fetchAPI<{ markets: Market[] }>("/api/market/list"),

  getMarket: (key: string) => fetchAPI<Market>(`/api/market/${key}`),

  getAssets: (marketKey: string, limit = 20, offset = 0) =>
    fetchAPI<{ assets: Asset[]; total: number; offset: number; limit: number }>(
      `/api/market/${marketKey}/assets?limit=${limit}&offset=${offset}`
    ),

  getPrices: (symbols: string[]) =>
    fetchAPI<{ prices: Record<string, { price: number; change: number; volume: number }> }>(
      `/api/market/prices?symbols=${symbols.join(",")}`
    ),

  getQuote: (symbol: string) => fetchAPI<Quote>(`/api/market/quote/${symbol}`),

  getChart: (symbol: string, period = "1mo", interval = "1d") =>
    fetchAPI<ChartData>(
      `/api/market/chart/${symbol}?period=${period}&interval=${interval}`
    ),

  requestAsset: (data: AssetRequestData) =>
    fetchAPI<{ success: boolean; message: string }>("/api/market/request-asset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  getMyAssetRequests: () =>
    fetchAPI<{ requests: AssetRequest[] }>("/api/market/my-requests"),
};

export interface AssetRequestData {
  symbol: string;
  asset_name?: string;
  asset_type?: string;
  reason?: string;
}

export interface AssetRequest {
  id: number;
  user_id: number;
  symbol: string;
  asset_name?: string;
  asset_type?: string;
  reason?: string;
  status: string;
  admin_notes?: string;
  created_at: string;
  processed_at?: string;
}

// Wallet API
export const walletAPI = {
  getBalance: () => fetchAPI<WalletBalance>("/api/wallet/balance"),

  getPositions: (status = "open") =>
    fetchAPI<{ positions: Position[] }>(`/api/wallet/positions?status=${status}`),

  openPosition: (data: OpenPositionData) =>
    fetchAPI<PositionResult>("/api/wallet/positions/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  closePosition: (positionId: number) =>
    fetchAPI<PositionResult>("/api/wallet/positions/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position_id: positionId }),
    }),

  getHistory: (limit = 50) =>
    fetchAPI<{ history: Position[] }>(`/api/wallet/history?limit=${limit}`),

  getStats: () => fetchAPI<TradingStats>("/api/wallet/stats"),

  addFunds: (amount: number) =>
    fetchAPI<{ success: boolean; message: string; new_balance: number }>("/api/wallet/add-funds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    }),
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

// AI Limit Status
export interface AILimitStatus {
  can_send: boolean;
  messages_today: number;
  daily_limit: number;
  remaining: number;
  is_premium: boolean;
}

// AI Assistant API
export const aiAPI = {
  chat: (message: string, context?: string) =>
    fetchAPI<{ response: string; usage?: object }>("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, context }),
    }),

  getHistory: (limit = 50) =>
    fetchAPI<{ messages: ChatMessage[] }>(`/api/ai/history?limit=${limit}`),

  clearHistory: () =>
    fetchAPI<{ message: string }>("/api/ai/history", { method: "DELETE" }),

  quickAnalysis: (symbol: string) =>
    fetchAPI<{ symbol: string; analysis: string }>(
      `/api/ai/quick-analysis?symbol=${symbol}`,
      { method: "POST", headers: { "Content-Type": "application/json" } }
    ),

  getMarketNews: () =>
    fetchAPI<MarketNews>("/api/ai/market-news"),

  getLimit: () =>
    fetchAPI<AILimitStatus>("/api/ai/limit"),
};

export interface SummaryPoint {
  title: string;
  text: string;
  assets: { name: string; symbol: string }[];
}

export interface MarketNews {
  news: {
    title: string;
    publisher: string;
    link: string;
    timestamp: number;
    related: string;
  }[];
  summary: string | null;
  summary_points: SummaryPoint[] | null;
  generated_at: string;
}

// Favorites API
export const favoritesAPI = {
  getFavorites: () => fetchAPI<{ favorites: Favorite[] }>("/api/favorites"),

  addFavorite: (symbol: string) =>
    fetchAPI<{ message: string }>("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  exit_price?: number;
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
  // Check admin status
  checkAdmin: () => fetchAPI<{ is_admin: boolean; email?: string }>("/api/admin/check"),

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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, action, reason }),
    }),

  adjustWallet: (userId: number, amount: number, reason: string) =>
    fetchAPI<{ success: boolean; previous_balance: number; new_balance: number }>(
      `/api/admin/users/${userId}/adjust-wallet`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, amount, reason }),
      }
    ),

  // Broadcasts
  sendBroadcast: (title: string, message: string, type = "info") =>
    fetchAPI<{ success: boolean }>("/api/admin/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, message, type }),
    }),

  getBroadcasts: (limit = 20) =>
    fetchAPI<{ broadcasts: AdminBroadcast[] }>(`/api/admin/broadcasts?limit=${limit}`),

  // Settings
  getSettings: () => fetchAPI<{ settings: AdminSetting[] }>("/api/admin/settings"),

  updateSetting: (key: string, value: string) =>
    fetchAPI<{ success: boolean }>("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

  // Support Tickets
  getTickets: (status = "all", page = 1, limit = 20) =>
    fetchAPI<AdminTicketsResponse>(`/api/admin/tickets?status=${status}&page=${page}&limit=${limit}`),

  getTicketStats: () =>
    fetchAPI<AdminTicketStats>("/api/admin/tickets/stats"),

  getTicketDetail: (ticketId: number) =>
    fetchAPI<AdminTicketDetail>(`/api/admin/tickets/${ticketId}`),

  replyToTicket: (ticketId: number, message: string) =>
    fetchAPI<{ success: boolean }>(`/api/admin/tickets/${ticketId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    }),

  closeTicket: (ticketId: number) =>
    fetchAPI<{ success: boolean }>(`/api/admin/tickets/${ticketId}/close`, {
      method: "POST",
    }),

  reopenTicket: (ticketId: number) =>
    fetchAPI<{ success: boolean }>(`/api/admin/tickets/${ticketId}/reopen`, {
      method: "POST",
    }),

  // Notifications
  getNotifications: () =>
    fetchAPI<{ notifications: AdminNotification[]; unread_count: number }>("/api/admin/notifications"),

  markNotificationRead: (notifId: number) =>
    fetchAPI<{ success: boolean }>(`/api/admin/notifications/${notifId}/read`, { method: "POST" }),

  markAllNotificationsRead: () =>
    fetchAPI<{ success: boolean }>("/api/admin/notifications/read-all", { method: "POST" }),
};

// Admin Types
export interface AdminNotification {
  id: number;
  type: "new_user" | "premium_request" | "new_ticket" | string;
  title: string;
  message: string;
  link: string | null;
  is_read: number;
  created_at: string;
}

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
    tickets?: {
      open: number;
      awaiting_response: number;
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

// Admin Tickets Types
export interface AdminTicket {
  id: number;
  user_id: number;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  email?: string;
  username?: string;
  message_count?: number;
  last_message?: string;
  last_from_admin?: boolean;
}

export interface AdminTicketsResponse {
  tickets: AdminTicket[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminTicketStats {
  open: number;
  total: number;
  awaiting_response: number;
}

export interface AdminTicketDetail {
  ticket: AdminTicket;
  messages: {
    id: number;
    ticket_id: number;
    user_id: number;
    username: string;
    message: string;
    is_admin: boolean;
    created_at: string;
  }[];
}

// Trading Tools API
export const toolsAPI = {
  // Pivot Points
  getPivotPoints: (symbol: string, method = "standard") =>
    fetchAPI<PivotPointsData>(`/api/tools/pivot-points/${symbol}?method=${method}`),

  // P/E Rankings
  getPERankings: (sector?: string, limit = 20, sort = "asc") =>
    fetchAPI<PERankingsData>(
      `/api/tools/per-rankings?limit=${limit}&sort=${sort}${sector ? `&sector=${sector}` : ""}`
    ),

  // Market Trends
  getTrends: () => fetchAPI<TrendsData>("/api/tools/trends"),

  // Economic Calendar
  getEconomicCalendar: (days = 7) =>
    fetchAPI<EconomicCalendarData>(`/api/tools/economic-calendar?days=${days}`),

  // Get event summary (premium)
  getEventSummary: (eventId: string) =>
    fetchAPI<EventSummary>(`/api/tools/economic-calendar/event/${eventId}/summary`),

  // Geopolitical Analysis
  getGeopoliticalAnalysis: () =>
    fetchAPI<GeopoliticalData>("/api/tools/geopolitical"),

  // Backtest
  runBacktest: (data: BacktestRequest) =>
    fetchAPI<BacktestResult>("/api/tools/backtest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  // Trading Advice Cards (Fiches conseils)
  getAdvice: (category?: string) =>
    fetchAPI<AdviceData>(`/api/tools/advice${category ? `?category=${category}` : ""}`),

  getAdviceDetail: (adviceId: number) =>
    fetchAPI<AdviceCard>(`/api/tools/advice/${adviceId}`),
};

export interface EventSummary {
  event_id: string;
  summary: string;
  generated_at: string;
}

export interface AdviceData {
  advice: AdviceCard[];
  categories: { key: string; label: string }[];
  is_premium: boolean;
}

export interface AdviceCard {
  id: number;
  category: string;
  title: string;
  icon: string;
  summary: string;
  content: string | null;
  premium_only: boolean;
  locked?: boolean;
  lock_message?: string;
}

// Tools Types
export interface PivotPointsData {
  symbol: string;
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
  high: number;
  low: number;
  close: number;
  current_price: number;
  method: string;
  date: string;
}

export interface PERankingsData {
  rankings: {
    symbol: string;
    name: string;
    sector: string;
    pe_ratio: number;
    forward_pe: number | null;
    price: number;
    market_cap: number;
    dividend_yield: number;
  }[];
  total: number;
  sort: string;
  sectors: string[];
}

export interface TrendsData {
  indices: {
    symbol: string;
    name: string;
    price: number;
    change_1d: number;
    change_1w: number;
    change_1m: number;
    sma_20: number;
    sma_50: number | null;
    trend: "bullish" | "bearish" | "neutral";
  }[];
  sectors: {
    symbol: string;
    name: string;
    price: number;
    change_1d: number;
    change_1w: number;
  }[];
  analysis: string | null;
}

export interface EconomicCalendarData {
  events: {
    date: string;
    time: string;
    event: string;
    country: string;
    importance: "high" | "medium" | "low";
    previous: string;
    forecast: string;
    impact: string;
  }[];
  total: number;
  date_range: {
    from: string;
    to: string;
  };
}

export interface GeopoliticalData {
  analysis: string;
  market_data: Record<string, { price: number; change: number }>;
  generated_at: string;
}

export interface BacktestRequest {
  symbol: string;
  strategy: "sma_crossover" | "rsi" | "macd" | "bollinger";
  period?: string;
  initial_capital?: number;
  sma_short?: number;
  sma_long?: number;
  rsi_oversold?: number;
  rsi_overbought?: number;
}

export interface BacktestResult {
  symbol: string;
  strategy: string;
  period: string;
  initial_capital: number;
  final_equity: number;
  total_return: number;
  num_trades: number;
  win_rate: number;
  max_drawdown: number;
  trades: {
    date: string;
    type: "BUY" | "SELL";
    price: number;
    shares: number;
    value: number;
  }[];
  equity_curve: {
    date: string;
    equity: number;
  }[];
}

// Premium API
export const premiumAPI = {
  // Check premium status
  getStatus: () => fetchAPI<PremiumStatus>("/api/premium/status"),

  // Get features comparison
  getFeatures: () => fetchAPI<PremiumFeatures>("/api/premium/features"),

  // Create Stripe checkout session
  createCheckout: () =>
    fetchAPI<{ url: string }>("/api/premium/checkout", { method: "POST" }),

  // Contact admin for premium
  contact: (message: string) =>
    fetchAPI<{ success: boolean; message: string }>("/api/premium/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    }),

  // Get my premium requests
  getMyRequests: () =>
    fetchAPI<{ requests: PremiumRequest[] }>("/api/premium/my-requests"),

  // Admin: Get all premium requests
  getAdminRequests: (status = "all", page = 1, limit = 20) =>
    fetchAPI<PremiumRequestsResponse>(
      `/api/premium/admin/requests?status=${status}&page=${page}&limit=${limit}`
    ),

  // Admin: Process premium request
  processRequest: (requestId: number, status: string, response?: string) =>
    fetchAPI<{ success: boolean }>("/api/premium/admin/requests/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: requestId, status, response }),
    }),

  // Admin: Grant/revoke premium
  grantPremium: (userId: number, action: "grant" | "revoke", durationDays?: number) =>
    fetchAPI<{ success: boolean; message: string }>("/api/premium/admin/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, action, duration_days: durationDays }),
    }),

  // Admin: Get premium users
  getPremiumUsers: () =>
    fetchAPI<{ users: PremiumUser[] }>("/api/premium/admin/users"),
};

// Premium Types
export interface PremiumStatus {
  is_premium: boolean;
  is_admin: boolean;
  limits: PremiumLimits;
  premium_info: {
    since: string | null;
    expires: string | null;
  } | null;
  features: {
    free: PremiumLimits;
    premium: PremiumLimits;
  };
}

export interface PremiumLimits {
  max_positions: number;
  max_favorites: number;
  ai_messages_per_day: number;
  backtest_enabled: boolean;
  geopolitical_enabled: boolean;
  advanced_pivots: boolean;
  per_rankings_limit: number;
  economic_calendar_days: number;
  alerts_enabled: boolean;
  priority_support: boolean;
}

export interface PremiumFeatures {
  free: PremiumLimits;
  premium: PremiumLimits;
  benefits: {
    icon: string;
    title: string;
    description: string;
  }[];
}

export interface PremiumRequest {
  id: number;
  user_id: number;
  message: string;
  status: string;
  admin_response?: string;
  created_at: string;
  processed_at?: string;
  email?: string;
  username?: string;
}

export interface PremiumRequestsResponse {
  requests: PremiumRequest[];
  total: number;
  page: number;
  limit: number;
}

export interface PremiumUser {
  id: number;
  email: string;
  username: string;
  is_premium: boolean;
  is_admin: boolean;
  premium_since: string | null;
  premium_expires: string | null;
  created_at: string;
}

// Community API
export const communityAPI = {
  // Get chat messages
  getMessages: (limit = 50, beforeId?: number) =>
    fetchAPI<{ messages: CommunityMessage[] }>(
      `/api/community/messages?limit=${limit}${beforeId ? `&before_id=${beforeId}` : ""}`
    ),

  // Send a message
  sendMessage: (content: string, replyTo?: number) =>
    fetchAPI<{ success: boolean; message: CommunityMessage }>("/api/community/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, reply_to: replyTo }),
    }),

  // Delete a message
  deleteMessage: (messageId: number) =>
    fetchAPI<{ success: boolean }>(`/api/community/messages/${messageId}`, {
      method: "DELETE",
    }),

  // Like/unlike a message
  likeMessage: (messageId: number) =>
    fetchAPI<{ liked: boolean }>(`/api/community/messages/${messageId}/like`, {
      method: "POST",
    }),

  // Get online count
  getOnlineCount: () =>
    fetchAPI<{ online_count: number }>("/api/community/online-count"),

  // Contact admin
  contactAdmin: (subject: string, message: string) =>
    fetchAPI<{ success: boolean; ticket_id: number; message: string }>("/api/community/contact-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message }),
    }),

  // Get my tickets
  getMyTickets: () =>
    fetchAPI<{ tickets: SupportTicket[] }>("/api/community/my-tickets"),

  // Get ticket messages
  getTicketMessages: (ticketId: number) =>
    fetchAPI<{ ticket: SupportTicket; messages: TicketMessage[] }>(`/api/community/tickets/${ticketId}`),

  // Reply to ticket
  replyToTicket: (ticketId: number, content: string) =>
    fetchAPI<{ success: boolean }>(`/api/community/tickets/${ticketId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }),
};

// Community Types
export interface CommunityMessage {
  id: number;
  user_id: number;
  username: string;
  content: string;
  reply_to: number | null;
  created_at: string;
  is_premium: boolean;
  is_admin: boolean;
  likes: number;
  user_liked: boolean;
}

export interface SupportTicket {
  id: number;
  user_id: number;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  last_message?: string;
  last_from_admin?: boolean;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  user_id: number;
  username: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

/**
 * Create an authenticated WebSocket URL for private endpoints
 * (portfolio, alerts). Passes the JWT as a query param since
 * WebSocket connections cannot send Authorization headers.
 */
export function createAuthenticatedWsUrl(path: string): string {
  const wsBase =
    typeof window !== "undefined"
      ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`
      : "ws://localhost:8000";
  const token = getToken();
  const sep = path.includes("?") ? "&" : "?";
  return token ? `${wsBase}${path}${sep}token=${encodeURIComponent(token)}` : `${wsBase}${path}`;
}
