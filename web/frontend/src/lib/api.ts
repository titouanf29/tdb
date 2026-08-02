/**
 * API client for TDB backend
 */

import { authHeaders, removeToken, getToken } from "./auth";

// In the browser, use relative URLs so requests go through Next.js proxy (no CORS).
// During SSR, call the backend directly.
const API_URL = typeof window !== "undefined"
  ? ""
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");

export class APIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "APIError";
  }
}

/**
 * Endpoints that re-verify a *credential* the user just typed. A 401 from these
 * means "wrong password", NOT "session expired" — logging the user out and
 * hard-redirecting to /login would be wrong, so they fall through to the normal
 * error path and the caller renders the message inline.
 */
const CREDENTIAL_ENDPOINTS = ["/api/users/change-password", "/api/users/me"];

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...authHeaders(),
        ...options.headers,
      },
    });
  } catch {
    throw new APIError("Vérifiez votre connexion internet", 0);
  }

  if (response.status === 401 && !CREDENTIAL_ENDPOINTS.includes(endpoint)) {
    // Don't redirect if already on auth pages
    const isAuthPage = typeof window !== "undefined" &&
      (window.location.pathname.startsWith("/login") ||
       window.location.pathname.startsWith("/register") ||
       window.location.pathname.startsWith("/mentions-legales") ||
       window.location.pathname.startsWith("/politique-de-confidentialite") ||
       window.location.pathname.startsWith("/cgu") ||
       window.location.pathname === "/");

    if (!isAuthPage) {
      removeToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    throw new APIError("Unauthorized", 401);
  }

  if (!response.ok) {
    const rawText = await response.text().catch(() => "");
    let detail: any = null;
    try { detail = JSON.parse(rawText).detail; } catch {}
    let message: string;
    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail)) {
      message = detail.map((e: any) => e.msg || JSON.stringify(e)).join("; ");
    } else if (detail && typeof detail === "object") {
      message = (detail as any).message || JSON.stringify(detail);
    } else {
      const statusMessages: Record<number, string> = {
        429: "Trop de requêtes. Attendez un moment avant de réessayer.",
        503: "Service temporairement indisponible. Réessayez dans quelques instants.",
        502: "Le serveur est temporairement indisponible.",
        500: "Erreur interne du serveur. Notre équipe a été notifiée.",
        403: "Accès refusé.",
        404: "Ressource introuvable.",
      };
      message = statusMessages[response.status] ?? `Erreur serveur (${response.status})`;
      if (rawText) console.error(`[API] Non-JSON response for ${endpoint}:`, rawText.slice(0, 200));
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

  updatePosition: (positionId: number, data: { take_profit?: number | null; stop_loss?: number | null }) =>
    fetchAPI<{ success: boolean; message: string }>(`/api/wallet/positions/${positionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
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

// User Settings API — server is the source of truth for every preference.
export interface UserSettings {
  trading_style: string;
  risk_level: string;
  notifications_enabled: boolean;
  theme: string;
  language: string;
  currency: string;
  default_leverage: string;
  accent_color: string;
  recap_frequency: string;
  trading_level?: string | null;
  updated_at?: string | null;
}

export const settingsAPI = {
  get: () => fetchAPI<UserSettings>("/api/users/settings"),

  update: (data: Partial<UserSettings>) =>
    fetchAPI<{ success: boolean; settings: UserSettings }>("/api/users/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  getPublic: () =>
    fetchAPI<{ settings: Record<string, string> }>("/api/users/public-settings"),
};

// Account API — profile, password, RGPD export & deletion
export interface UserExport {
  export_version: number;
  generated_at: string;
  [k: string]: unknown;
}

export const accountAPI = {
  updateProfile: (display_name: string) =>
    fetchAPI<{ success: boolean; display_name: string }>("/api/users/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name }),
    }),

  changePassword: (current_password: string, new_password: string) =>
    fetchAPI<{ success: boolean; access_token: string }>("/api/users/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password, new_password }),
    }),

  exportData: () => fetchAPI<UserExport>("/api/users/export"),

  deleteAccount: (password: string, confirm: string) =>
    fetchAPI<{ success: boolean }>("/api/users/me", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, confirm }),
    }),
};

// Backtest — walk-forward replay of the scoring engine on history
// Price alerts — "préviens-moi quand X franchit Y"
export interface PriceAlert {
  id: number;
  symbol: string;
  direction: "above" | "below";
  target: number;
  note: string;
  status: "active" | "triggered";
  created_at: string;
  triggered_at: string | null;
  triggered_price: number | null;
}

export const alertsAPI = {
  list: () => fetchAPI<{ alerts: PriceAlert[] }>("/api/alerts"),
  create: (symbol: string, direction: "above" | "below", target: number, note = "") =>
    fetchAPI<PriceAlert>("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, direction, target, note }),
    }),
  remove: (id: number) => fetchAPI<{ ok: boolean }>(`/api/alerts/${id}`, { method: "DELETE" }),
  check: () => fetchAPI<{ triggered: PriceAlert[]; active_count: number }>("/api/alerts/check", { method: "POST" }),
};

// Welcome-back recap — "ce qui a bougé depuis votre dernière visite"
export interface WelcomeBackPositionMove {
  symbol: string;
  pnl_now: number;
  pnl_before: number;
  pnl_delta: number;
  price_now: number;
  price_before: number;
  pct_move: number;
}
export interface WelcomeBackFavoriteMove {
  symbol: string;
  price_now: number;
  price_before: number;
  pct_move: number;
}
export interface WelcomeBackResult {
  has_summary: boolean;
  first_name?: string;
  away_minutes?: number;
  away_label?: string;
  currency?: string;
  equity?: { now: number; before: number; change: number; change_pct: number };
  positions?: WelcomeBackPositionMove[];
  favorites?: WelcomeBackFavoriteMove[];
  opened_positions?: string[];
  closed_positions?: string[];
  best?: { symbol: string; pct: number } | null;
  worst?: { symbol: string; pct: number } | null;
  message?: string;
}

export const welcomeBackAPI = {
  // Compares the portfolio to the last time the dashboard was opened; the
  // endpoint refreshes that baseline on each call, so a recap only appears
  // after a real absence and never replays on refresh.
  get: (lang = "fr", minGapMinutes = 30) =>
    fetchAPI<WelcomeBackResult>(`/api/dashboard/welcome-back?lang=${lang}&min_gap_minutes=${minGapMinutes}`),
};

export interface BacktestBucket {
  label: string;
  range: [number, number];
  count: number;
  win_rate: number | null;
  avg_return: number | null;
  median_return: number | null;
}

export interface BacktestResult {
  symbol: string;
  timeframe: string;
  period: string;
  bars_analyzed: number;
  n_samples: number;
  horizon_bars: number;
  buckets: BacktestBucket[];
  correlation: number | null;
  avg_return_buy_zone: number | null;
  avg_return_sell_zone: number | null;
  edge: number | null;
  hit_rate_buy: number | null;
  hit_rate_sell: number | null;
  disclaimer: string;
}

// Daily intent — "volonté du jour" AI space on the dashboard
export interface DailyIntentAsset {
  symbol: string;
  name: string;
  score: number;
  signal: string;
  href: string;
}

export interface DailyIntentExchange {
  message: string;
  response: string;
  suggestions: { label: string; href: string }[];
  assets: DailyIntentAsset[];
}

export interface DailyIntentResult {
  intent: string | null;
  response: string | null;
  suggestions: { label: string; href: string }[];
  assets: DailyIntentAsset[];
  exchanges: DailyIntentExchange[];
  question: { text: string; options: string[] } | null;
  remaining: number;
}

export const dailyIntentAPI = {
  get: () => fetchAPI<DailyIntentResult>("/api/ai/daily-intent"),
  set: (intent: string) =>
    fetchAPI<DailyIntentResult>("/api/ai/daily-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent }),
    }),
  reset: () =>
    fetchAPI<DailyIntentResult>("/api/ai/daily-intent", { method: "DELETE" }),
};

// Analysis API
export const analysisAPI = {
  analyze: (symbol: string, timeframe = "1d") =>
    fetchAPI<Analysis>(`/api/analysis/${symbol}?timeframe=${timeframe}`),

  backtest: (symbol: string, timeframe = "1d", horizon = 10) =>
    fetchAPI<BacktestResult>(
      `/api/analysis/${symbol}/backtest?timeframe=${timeframe}&horizon=${horizon}`
    ),

  scan: (marketKey: string, minScore = 60, limit = 20, oppType = "all") =>
    fetchAPI<ScanResult>(
      `/api/analysis/scan/${marketKey}?min_score=${minScore}&limit=${limit}&opportunity_type=${oppType}`
    ),

  getScanLimit: () =>
    fetchAPI<ScanQuota>("/api/analysis/scan-limit"),
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

  quickAnalysis: (symbol: string, tradingStyle = "day", riskLevel = "moderate", tradingLevel = "intermediate") =>
    fetchAPI<{ symbol: string; analysis: string }>(
      `/api/ai/quick-analysis?symbol=${symbol}&trading_style=${tradingStyle}&risk_level=${riskLevel}&trading_level=${tradingLevel}`,
      { method: "POST", headers: { "Content-Type": "application/json" } }
    ),

  getMarketNews: () =>
    fetchAPI<MarketNews>("/api/ai/market-news"),

  getLimit: () =>
    fetchAPI<AILimitStatus>("/api/ai/limit"),

  analysisChat: (message: string, analysisContext: string, conversationHistory: {role: string; content: string}[]) =>
    fetchAPI<{ response: string; remaining: number; is_premium: boolean }>("/api/ai/analysis-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, analysis_context: analysisContext, conversation_history: conversationHistory }),
    }),

  getSessionNarrative: (payload: {
    session_name: string;
    session_id: string;
    mood: string;
    avg_change: number;
    positive_ratio: number;
    top_performers: { symbol: string; name: string; change: number }[];
    flop_performers: { symbol: string; name: string; change: number }[];
    is_live: boolean;
  }) =>
    fetchAPI<{ narrative: string; generated_at: string }>("/api/ai/session-narrative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
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
  name?: string;
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
    confidence?: number;
  };
  higher_timeframe?: {
    interval: string | null;
    trend: "BULLISH" | "BEARISH" | "NEUTRAL" | "UNKNOWN";
    aligned: boolean | null;
  };
  data_quality?: {
    stale: boolean;
    last_bar_age_minutes: number;
    nan_ratio: number;
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
      percent_b?: number;
    };
    adx?: { value: number; plus_di: number; minus_di: number; signal: string };
    stochastic?: { k: number; d: number; signal: string };
    atr: number;
    volume_ratio: number;
  };
  fibonacci?: {
    high: number;
    low: number;
    levels: Record<string, number>;
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
    direction?: "LONG" | "SHORT";
    sl_basis?: string;
    tp_capped_at_level?: boolean;
    notes?: string[];
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
  trade_window?: {
    min_minutes: number;
    max_minutes: number;
    optimal_minutes: number;
    candles_min: number;
    candles_max: number;
    candles_opt: number;
    label_min: string;
    label_max: string;
    label_optimal: string;
    bar_label: string;
    risk_level: "low" | "medium" | "high";
    unreliable: boolean;
    reasons: string[];
    warnings: string[];
    catalysts: Array<{
      name: string;
      datetime: string;
      when: string;
      impact: string;
      relevance: string;
    }>;
  };
  news?: {
    title?: string;
    publisher?: string;
    link?: string;
    date?: number;
    type?: string;
  }[];
}

export interface ScanResultItem {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  change_1w: number;
  change_1m: number;
  score: number;
  signal: string;
  rsi: number;
  volume_ratio: number;
  trend: "HAUSSIER" | "BAISSIER" | "NEUTRE";
  opportunity: string;
  opp_type: "breakout" | "reversal" | "momentum";
  macd_signal: "HAUSSIER" | "BAISSIER";
  near_breakout: boolean;
  pct_from_high: number;
}

export interface ScanQuota {
  scans_today: number;
  daily_limit: number;
  remaining: number;
  is_premium: boolean;
}

export interface ScanResult {
  market: string;
  min_score: number;
  total_scanned: number;
  results: ScanResultItem[];
  quota?: ScanQuota;
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

  markNotificationTypeRead: (type: string) =>
    fetchAPI<{ success: boolean }>(`/api/admin/notifications/mark-type-read?type=${type}`, { method: "POST" }),
};

// ── Content Factory ───────────────────────────────────────────────────────────

export interface ContentPiece {
  id: string;
  title: string;
  topic: string;
  category: string;
  status: "draft" | "ready" | "published";
  script: string | null;
  hook: string | null;
  call_to_action: string | null;
  hashtags_tiktok: string[];
  hashtags_youtube: string[];
  hashtags_instagram: string[];
  description_tiktok: string | null;
  description_youtube: string | null;
  description_instagram: string | null;
  site_page_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeneratedScript {
  hook: string;
  script: string;
  cta: string;
  description_tiktok: string;
  description_youtube: string;
  description_instagram: string;
  hashtags_tiktok: string[];
  hashtags_youtube: string[];
  hashtags_instagram: string[];
}

export interface LibraryItem {
  topic: string;
  category: string;
}

export const contentFactoryAPI = {
  getPieces: () =>
    fetchAPI<{ pieces: ContentPiece[] }>("/api/admin/content-factory/pieces"),

  getPiece: (id: string) =>
    fetchAPI<{ piece: ContentPiece }>(`/api/admin/content-factory/pieces/${id}`),

  createPiece: (data: Partial<ContentPiece>) =>
    fetchAPI<{ piece: ContentPiece }>("/api/admin/content-factory/pieces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  updatePiece: (id: string, data: Partial<ContentPiece>) =>
    fetchAPI<{ success: boolean }>(`/api/admin/content-factory/pieces/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  deletePiece: (id: string) =>
    fetchAPI<{ success: boolean }>(`/api/admin/content-factory/pieces/${id}`, {
      method: "DELETE",
    }),

  generateScript: (topic: string, category: string) =>
    fetchAPI<{ success: boolean; generated: GeneratedScript; source: string }>(
      "/api/admin/content-factory/generate-script",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, category }),
      }
    ),

  getLibrary: () =>
    fetchAPI<{ library: LibraryItem[] }>("/api/admin/content-factory/library"),

  exportPiece: async (
    id: string,
    filename: string,
    visualFlags?: {
      include_chart?: boolean;
      include_screenshot?: boolean;
      include_ai_image?: boolean;
      stock_photo_url?: string;
    }
  ): Promise<void> => {
    const { getToken } = await import("./auth");
    const token = getToken();
    const params = new URLSearchParams();
    if (visualFlags?.include_chart)      params.set("include_chart", "true");
    if (visualFlags?.include_screenshot) params.set("include_screenshot", "true");
    if (visualFlags?.include_ai_image)   params.set("include_ai_image", "true");
    if (visualFlags?.stock_photo_url)    params.set("stock_photo_url", visualFlags.stock_photo_url);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const response = await fetch(`/api/admin/content-factory/export/${id}${qs}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error("Export failed");
    const blob = await response.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  generateChart: (id: string, format: "portrait" | "landscape" | "square" = "portrait", animated = false) =>
    fetchAPI<{ image: string | null; source: string; error?: string; animated?: boolean }>(
      `/api/admin/content-factory/pieces/${id}/chart?format=${format}&animated=${animated}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }
    ),

  takeScreenshot: (id: string) =>
    fetchAPI<{ image: string | null; source: string; error?: string }>(
      `/api/admin/content-factory/pieces/${id}/screenshot`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }
    ),

  getStockPhotos: (id: string) =>
    fetchAPI<{ photos: { id: string; url: string; thumb: string; credit: string; credit_url: string }[]; error?: string; query?: string }>(
      `/api/admin/content-factory/pieces/${id}/stock-photos`
    ),

  generateAIImage: (id: string) =>
    fetchAPI<{ image: string | null; source: string; error?: string; prompt?: string }>(
      `/api/admin/content-factory/pieces/${id}/ai-image`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }
    ),

  getFilmingGuide: (id: string, topic?: string) => {
    const qs = topic ? `?topic=${encodeURIComponent(topic)}` : "";
    return fetchAPI<{
      topic: string;
      guide: {
        concept: string;
        duree_totale: string;
        plans: { n: number; duree: string; emoji: string; type: string; action: string; conseil: string }[];
        apps: string[];
        equipement: string[];
        ambiance: string;
        tips: string[];
      };
    }>(`/api/admin/content-factory/pieces/${id}/filming-guide${qs}`);
  },
};

// User notification type
export interface UserNotification {
  id: number;
  user_id: number;
  type: "ticket_reply" | string;
  title: string;
  message: string;
  link: string | null;
  is_read: number;
  created_at: string;
}

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

  // Top Tendances Haussières
  getTopTendances: () =>
    fetchAPI<TopTendancesData>("/api/tools/top-tendances"),
};

export interface EventSummary {
  event_id: string;
  summary: string;
  generated_at: string;
}

export interface TendanceSignal {
  label: string;
  bullish: boolean;
}

export interface TendanceAsset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_1w: number;
  confidence: number;
  rsi: number;
  vol_ratio: number;
  signals: TendanceSignal[];
  reasons: string[];
  market: string;
  near_breakout: boolean;
  macd_cross: boolean;
}

export interface TopTendancesData {
  assets: TendanceAsset[];
  total_scanned: number;
  updated_at: string;
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

  // User: get messages for own request
  getMessages: (requestId: number) =>
    fetchAPI<{ messages: PremiumMessage[] }>(`/api/premium/requests/${requestId}/messages`),

  // User: send follow-up message
  sendMessage: (requestId: number, message: string) =>
    fetchAPI<{ success: boolean }>(`/api/premium/requests/${requestId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    }),

  // Admin: get messages for any request
  adminGetMessages: (requestId: number) =>
    fetchAPI<{ messages: PremiumMessage[]; request: PremiumRequest }>(`/api/premium/admin/requests/${requestId}/messages`),

  // Admin: send message in thread
  adminSendMessage: (requestId: number, message: string) =>
    fetchAPI<{ success: boolean }>(`/api/premium/admin/requests/${requestId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    }),
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

export interface PremiumMessage {
  id: number;
  request_id: number;
  sender_id: number;
  sender_type: "user" | "admin";
  message: string;
  created_at: string;
  is_read: number;
  username?: string;
  is_admin?: number;
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

  // User notifications
  getNotifications: () =>
    fetchAPI<{ notifications: UserNotification[]; unread_count: number }>("/api/community/notifications"),

  markNotificationRead: (notifId: number) =>
    fetchAPI<{ success: boolean }>(`/api/community/notifications/${notifId}/read`, { method: "POST" }),

  markAllNotificationsRead: () =>
    fetchAPI<{ success: boolean }>("/api/community/notifications/read-all", { method: "POST" }),
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

// ── Real Portfolio API ─────────────────────────────────────────────────────────

export interface RealPosition {
  id: number;
  user_id: string;
  symbol: string;
  position_type: "long" | "short";
  quantity: number;
  entry_price: number;
  entry_date: string;
  leverage: number;
  broker?: string;
  notes?: string;
  stop_loss?: number;
  take_profit?: number;
  status: "open" | "closed";
  exit_price?: number;
  exit_date?: string;
  currency: string;
  created_at: string;
  // enriched by backend for open positions
  current_price?: number;
  change_24h?: number;
  unrealized_pnl?: number;
  pnl_percent?: number;
  position_value?: number;
  invested_value?: number;
  days_held?: number;
}

export interface PortfolioSummary {
  open_count: number;
  closed_count: number;
  total_invested: number;
  total_current_value: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  realized_pnl: number;
  total_pnl: number;
  allocation: Record<string, number>;
  best_position: { symbol: string; pnl_percent: number } | null;
  worst_position: { symbol: string; pnl_percent: number } | null;
  largest_position: { symbol: string; value: number } | null;
}

export interface CreatePositionData {
  symbol: string;
  position_type: "long" | "short";
  quantity: number;
  entry_price: number;
  entry_date: string;
  leverage?: number;
  broker?: string;
  notes?: string;
  stop_loss?: number;
  take_profit?: number;
  currency?: string;
}

export const portfolioAPI = {
  getPositions: (status: "open" | "closed" = "open") =>
    fetchAPI<{ positions: RealPosition[] }>(`/api/portfolio/positions?status=${status}`),

  checkPosition: (symbol: string) =>
    fetchAPI<{ positions: RealPosition[]; has_position: boolean }>(
      `/api/portfolio/positions/check/${symbol}`
    ),

  getSummary: () => fetchAPI<PortfolioSummary>("/api/portfolio/summary"),

  createPosition: (data: CreatePositionData) =>
    fetchAPI<{ success: boolean; message: string }>("/api/portfolio/positions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  updatePosition: (id: number, data: Partial<CreatePositionData>) =>
    fetchAPI<{ success: boolean; message: string }>(`/api/portfolio/positions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  closePosition: (id: number, exitPrice: number, exitDate?: string) =>
    fetchAPI<{ success: boolean; realized_pnl: number; message: string }>(
      `/api/portfolio/positions/${id}/close`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exit_price: exitPrice, exit_date: exitDate }),
      }
    ),

  deletePosition: (id: number) =>
    fetchAPI<{ success: boolean }>(`/api/portfolio/positions/${id}`, {
      method: "DELETE",
    }),
};

// ── Trading Journal ────────────────────────────────────────────────────────────

export interface JournalEntry {
  id: number;
  user_id: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  timeframe?: string;
  setup?: string;
  entry_time?: string;
  exit_time?: string;
  entry_price?: number;
  exit_price?: number;
  quantity?: number;
  risk_reward?: number;
  result?: "win" | "loss" | "breakeven";
  pnl?: number;
  pre_trade_notes?: string;
  post_trade_notes?: string;
  screenshot?: string;
  created_at: string;
  updated_at?: string;
}

export interface JournalStats {
  total: number;
  wins: number;
  losses: number;
  breakevens: number;
  win_rate: number;
  total_pnl: number;
  avg_rr: number;
  best_trade: number;
  worst_trade: number;
}

export type JournalEntryCreate = Omit<JournalEntry, "id" | "user_id" | "created_at" | "updated_at">;

export const journalAPI = {
  list: (params?: { result?: string; symbol?: string }) => {
    const qs = new URLSearchParams();
    if (params?.result) qs.set("result", params.result);
    if (params?.symbol) qs.set("symbol", params.symbol);
    const q = qs.toString();
    return fetchAPI<{ entries: JournalEntry[] }>(`/api/journal${q ? "?" + q : ""}`);
  },

  getStats: () => fetchAPI<JournalStats>("/api/journal/stats"),

  get: (id: number) => fetchAPI<JournalEntry>(`/api/journal/${id}`),

  create: (data: JournalEntryCreate) =>
    fetchAPI<JournalEntry>("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<JournalEntryCreate>) =>
    fetchAPI<JournalEntry>(`/api/journal/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchAPI<void>(`/api/journal/${id}`, { method: "DELETE" }),
};

// ── Weekly Market Prep ────────────────────────────────────────────────────────

export interface WeeklyMarket {
  name: string;
  icon: string;
  trend: "bullish" | "bearish" | "neutral";
  summary: string;
  key_zones: string;
  risk: string;
  detailed_analysis?: string;
  opportunities?: string[];
  sectors_watch?: string[];
}

export interface WeeklyWatchItem {
  symbol: string;
  name: string;
  type: string;
  market?: string;
  why: string;
  scenario: string;
  direction: "bullish" | "bearish" | "neutral";
  entry_zone?: string;
  target?: string;
  stop_loss?: string;
  technical_setup?: string;
}

export interface WeeklyEvent {
  day: string;
  time: string;
  event: string;
  country: string;
  importance: "high" | "medium" | "low";
  impact: string;
}

export interface WeeklyTradingIdea {
  title: string;
  symbol: string;
  type: string;
  setup: string;
  entry: string;
  target: string;
  stop: string;
  rr: string;
  direction: "bullish" | "bearish" | "neutral";
  timeframe?: string;
  conditions?: string;
}

export interface WeeklyBriefing {
  week: string;
  generated_at: string;
  generated_by?: string;
  admin_note?: string;
  macro: {
    trend: "bullish" | "bearish" | "neutral";
    summary: string;
    detailed_analysis?: string;
    key_points: string[];
  };
  markets: WeeklyMarket[];
  watchlist: WeeklyWatchItem[];
  events: WeeklyEvent[];
  trading_ideas?: WeeklyTradingIdea[];
  educational_tip?: {
    concept: string;
    explanation: string;
    example: string;
    takeaway: string;
  };
  conclusion: string;
}

export const weeklyPrepAPI = {
  status: () => fetchAPI<{ visible: boolean; week: string }>("/api/weekly-prep/status"),
  get: () => fetchAPI<{ briefing: WeeklyBriefing; cached: boolean }>("/api/weekly-prep"),
  refresh: () => fetchAPI<{ briefing: WeeklyBriefing; cached: boolean }>("/api/weekly-prep/refresh", { method: "POST" }),

  // Admin-only
  adminPreview: () =>
    fetchAPI<{ briefing: WeeklyBriefing; cached: boolean; generated_at: string; week_key: string; visible: boolean }>(
      "/api/weekly-prep/admin/preview"
    ),
  adminSave: (briefing: WeeklyBriefing) =>
    fetchAPI<{ saved: boolean; week_key: string; generated_at: string }>("/api/weekly-prep/admin", {
      method: "PUT",
      body: JSON.stringify({ briefing }),
    }),
  adminGetAutoSend: () =>
    fetchAPI<{ skip: boolean }>("/api/weekly-prep/admin/auto-send"),
  adminSetAutoSend: (skip: boolean) =>
    fetchAPI<{ skip: boolean }>("/api/weekly-prep/admin/auto-send", {
      method: "POST",
      body: JSON.stringify({ skip }),
    }),
};

// ─── Insights Engine (Admin only) ─────────────────────────────────────────────

export interface InsightsAsset {
  name: string;
  ticker: string;
  last_price: number;
  change_pct: number;
  rsi: number;
  ohlcv: { date: string; open: number; high: number; low: number; close: number; volume: number }[];
}

export interface InsightsRegion {
  label: string;
  flag: string;
  assets: InsightsAsset[];
  top: InsightsAsset | null;
  flop: InsightsAsset | null;
}

export interface InsightsSnapshot {
  period: string;
  snapshot: Record<string, InsightsRegion>;
  news: { title: string; summary: string; source: string; language: string; pub_date: string; link: string; impact: string }[];
  fear_greed: { value: number; label: string };
  heat_score: number;
}

export interface InsightsScriptSegment {
  type: string;
  label: string;
  text: string;
  visual: string;
  duration_sec: number;
}

export interface InsightsScript {
  hook: string;
  segments: InsightsScriptSegment[];
  total_duration_sec: number;
  mode: string;
  generated_by: "gemini" | "template";
  geo_context?: string;
  // Mode B only
  scripts?: InsightsScript[];
}

export interface InsightsGenerated {
  period: string;
  mode: string;
  heat_score: number;
  fear_greed: { value: number; label: string };
  script: InsightsScript;
  charts: { performance: string; heatmap: string; fear_greed: string; top_asset: string };
  news_used: any[];
}

export interface InsightsBriefingRegion {
  summary: string;
  top_assets: string[];
  key_risk: string;
  sentiment: string;
}

export interface InsightsBriefingData {
  headline: string;
  executive_summary: string;
  geopolitical: {
    themes: string[];
    dominant_event: string;
    mechanism: string;
    signals: string[];
    outlook: string;
  };
  regions: {
    europe: InsightsBriefingRegion;
    usa: InsightsBriefingRegion;
    crypto: InsightsBriefingRegion;
    commodities: InsightsBriefingRegion;
  };
  risk_level: "low" | "moderate" | "elevated" | "high" | "extreme";
  key_themes: string[];
  trade_implications: string;
  generated_by: "gemini" | "template";
  period: string;
}

export interface InsightsBriefing {
  period: string;
  heat_score: number;
  fear_greed: { value: number; label: string };
  briefing: InsightsBriefingData;
  news: { title: string; summary: string; source: string; language: string; pub_date: string; link: string; impact: string }[];
}

export const insightsAPI = {
  snapshot: (period: string = "week") =>
    fetchAPI<InsightsSnapshot>(`/api/admin/insights/snapshot?period=${period}`),

  generate: (body: { period: string; mode: string; custom_context: string; include_charts: boolean }) =>
    fetchAPI<InsightsGenerated>("/api/admin/insights/generate", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  chartsOnly: (period: string = "week") =>
    fetchAPI<{ charts: InsightsGenerated["charts"]; period: string }>(
      `/api/admin/insights/charts?period=${period}`
    ),

  brief: (body: { period: string; custom_context?: string }) =>
    fetchAPI<InsightsBriefing>("/api/admin/insights/brief", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// ── Missions & Progress ───────────────────────────────────────────────────────

export interface Mission {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  category: string;
  level: string;
  target: number;
  action: string;
  badge: string | null;
  daily?: boolean;
  status: "not_started" | "active" | "completed";
  progress: number;
  completed_at: string | null;
}

export interface UserProgress {
  user_id: number;
  xp: number;
  level: number;
  badges: string[];
  streak_days: number;
  last_activity_date: string | null;
  xp_for_next_level: number;
  xp_in_current_level: number;
  badges_detail: { icon: string; name: string; color: string }[];
}

export interface ActionResult {
  xp_gained: number;
  missions_completed: string[];
  new_badges: { icon: string; name: string; color: string }[];
  new_xp: number;
  new_level: number;
}

export const missionsAPI = {
  list: () => fetchAPI<{ missions: Mission[] }>("/api/learn/missions"),
  progress: () => fetchAPI<UserProgress>("/api/learn/progress"),
  recordAction: (action: string, value: number = 1) =>
    fetchAPI<ActionResult>("/api/learn/progress/action", {
      method: "POST",
      body: JSON.stringify({ action, value }),
    }),
};

// ── IPO Watch ────────────────────────────────────────────────────────────────
export interface IPOWatchItem {
  id: string;
  symbol: string | null;
  name: string;
  full_name: string;
  date: string;
  exchange: string;
  sector: string;
  sector_en: string;
  status: "listed" | "upcoming" | "rumored";
  price_at_ipo: number | null;
  description_fr: string;
  description_en: string;
  tags_fr: string[];
  tags_en: string[];
  ticker_to_watch: string | null;
}

export const ipoAPI = {
  getWatchlist: () => fetchAPI<{ ipos: IPOWatchItem[] }>("/api/ipo-watch"),
};

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
