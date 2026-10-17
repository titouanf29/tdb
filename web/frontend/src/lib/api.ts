/**
 * API client for TDB backend
 */

import { authHeaders, removeToken, getToken } from "./auth";
import { annoncerRecompenses } from "./reussite";

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
       // Les pages de récupération : un vieux jeton périmé ferait sinon
       // rediriger vers /login au premier 401, et l'utilisateur perdrait le
       // lien qu'il vient de recevoir par e-mail.
       window.location.pathname.startsWith("/forgot-password") ||
       window.location.pathname.startsWith("/reset-password") ||
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
export interface AssetHit {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  /** 1 = symbole exact ; sous 0,6 = rattrapage d'une faute de frappe. */
  score: number;
}

export const marketAPI = {
  /** Recherche d'actif, tolérante aux fautes et aux noms d'usage. */
  searchAssets: (q: string) =>
    fetchAPI<{ results: AssetHit[] }>(`/api/market/search?q=${encodeURIComponent(q)}`),

  getMarkets: () => fetchAPI<{ markets: Market[]; all_asset_count?: number }>("/api/market/list"),

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

  /** Les figures chartistes de la fenêtre, avec ce qu'elles ont donné.
   *  À appeler avec la MÊME période et la MÊME unité que `getChart` : les
   *  indices rendus pointent dans son tableau `data`. */
  /** La mesure des figures, pour le cours : mêmes chiffres que le graphique. */
  getFiguresMesure: () => fetchAPI<FiguresMesure>("/api/market/figures-mesure"),

  getFigures: (symbol: string, period = "1mo", interval = "1d") =>
    fetchAPI<FiguresReponse>(
      `/api/market/figures/${encodeURIComponent(symbol)}?period=${period}&interval=${interval}`
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

  devisTurbo: (p: { symbol: string; direction: "LONG" | "SHORT"; levier: number; montant?: number; unites?: number }) => {
    const q = new URLSearchParams({ symbol: p.symbol, direction: p.direction, levier: String(p.levier) });
    if (p.unites) q.set("unites", String(p.unites));
    else q.set("montant", String(p.montant ?? 0));
    return fetchAPI<DevisTurbo>(`/api/wallet/turbo/devis?${q}`);
  },

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

  getHistoryBySymbol: () =>
    fetchAPI<{ by_symbol: SymbolSummary[]; total_trades: number; total_pnl: number }>(
      "/api/wallet/history/by-symbol"
    ),

  getStats: () => fetchAPI<TradingStats>("/api/wallet/stats"),
  getCourbe: () => fetchAPI<CourbeWallet>("/api/wallet/courbe"),
  /** La façon de trader mesurée sur les positions (backend moi.py). */
  getProfilObserve: () => fetchAPI<ProfilObserve>("/api/moi/profil"),

  /** Créditer, ou RETIRER avec un montant négatif. Le solde ne peut pas
   *  devenir négatif : ce n'est pas un découvert, c'est un simulateur. */
  addFunds: (amount: number) =>
    fetchAPI<{ success: boolean; message: string; new_balance: number }>("/api/wallet/add-funds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    }),

  /** Pose le solde à une valeur, sans toucher aux positions ni à
   *  l'historique — contrairement à `resetSimulation`, qui archive tout.
   *  Sans montant : le capital de départ, dont seul le serveur a le chiffre. */
  setBalance: (amount?: number) =>
    fetchAPI<{ success: boolean; balance: number; previous_balance: number }>(
      "/api/wallet/set-balance",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(amount === undefined ? {} : { amount }),
      },
    ),

  /** Repart du capital de départ. Les trades passés sont ARCHIVÉS, pas
   *  supprimés : ils sortent des écrans et des statistiques, la trace reste. */
  resetSimulation: () =>
    fetchAPI<{ success: boolean; balance: number; archived: number }>("/api/wallet/reset", {
      method: "POST",
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
  broker?: string;
  order_mode?: string;
  order_fee?: string;
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

/**
 * Le profil de personnalisation : trois réponses, trois effets.
 *
 * Chaque champ agit quelque part, et c'est la condition pour qu'il existe.
 * Une préférence stockée que rien ne lit est un fichage sans contrepartie.
 */
export interface ProfilePreferences {
  /** comprendre | tester | suivre — ce que l'accueil met en avant. */
  goal: string | null;
  /** europe | usa | crypto | devises | matieres, par ordre de préférence.
   *  Le premier est la place ouverte par défaut dans les Marchés. */
  markets: string[];
  /** court | moyen | long — le rythme proposé au Parcours. */
  weekly_time: string | null;
  updated_at?: string | null;

  // ── Les intentions ──────────────────────────────────────────────────────
  // Les trois champs ci-dessus orientent des écrans. Ceux-ci entrent dans le
  // CALCUL de l'analyse : taille de position, comparaison du stop avec la
  // perte acceptée, faisabilité de la fenêtre de trade. Voir le bloc
  // `personnel` de l'analyse et backend/api/routes/_personnel.py.

  /** Ce qu'on engage sur une position, en euros. null = non communiqué. */
  mise_eur: number | null;
  /** 2 | 5 | 10 | 20 — la perte acceptée sur une position. */
  perte_max_pct: number | null;
  /** continu | quotidien | soir | weekend — quand on peut vraiment regarder. */
  disponibilite: string | null;
  /** coupe | attend | renforce | inconnu — ce qu'on fait quand ça baisse. */
  reaction: string | null;
  /** verdict | raisons | detail — la profondeur d'ouverture de l'analyse. */
  lecture: string | null;
  /** Les indicateurs déjà connus : ceux-là ne sont plus expliqués. */
  connait: string[];
  /** Posée dès qu'une intention est répondue. null = questionnaire jamais rempli. */
  intentions_at?: string | null;
}

/** Ce que l'analyse dit de ce plan-ci POUR CETTE PERSONNE.
 *
 *  Absent tant qu'aucune intention n'a été donnée — et c'est voulu : un
 *  encadré de conseils génériques présenté comme personnel est pire que pas
 *  d'encadré du tout. */
export interface BlocPersonnel {
  taille: {
    mise_eur: number;
    parts: number;
    risque_eur: number;
    risque_pct: number | null;
    gain_eur?: number;
    gain_pct?: number;
  } | null;
  constats: {
    cle: string;
    ton: "attention" | "info";
    titre: string;
    texte: string;
    suggerer_horizon?: string | null;
  }[];
  /** Les indicateurs présents dans l'analyse que la personne ne connaît pas. */
  a_expliquer: string[];
  deja_connus: string[];
  lecture: string | null;
  disponibilite: string | null;
  repondu: boolean;
}

/** Mot de passe oublié. Les trois appels fonctionnent sans être connecté. */
export const passwordResetAPI = {
  /** Répond pareil que le compte existe ou non : c'est voulu. */
  request: (email: string) =>
    fetchAPI<{ success: boolean; message: string }>("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }),
  check: (token: string) =>
    fetchAPI<{ valid: boolean }>(`/api/auth/reset-password/check?token=${encodeURIComponent(token)}`),
  reset: (token: string, password: string) =>
    fetchAPI<{ success: boolean }>("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    }),
};

export const profileAPI = {
  get: () => fetchAPI<ProfilePreferences>("/api/users/profile-preferences"),
  update: (patch: Partial<Omit<ProfilePreferences, "updated_at">>) =>
    fetchAPI<ProfilePreferences>("/api/users/profile-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),
};

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
  /** Average outcome in R — multiples of the risk taken. */
  avg_r: number | null;
}

export interface BacktestResult {
  symbol: string;
  timeframe: string;
  period: string;
  bars_analyzed: number;
  engine_version: string;
  /** "event" = one trade at a time, so the samples are independent. */
  mode: string;
  horizon_bars: number;
  sl_atr: number;
  tp_atr: number;
  cost_bps: number;

  n_evaluated: number;
  n_trades: number;
  /** False when there are too few closed trades for the stats to mean much. */
  enough_samples: boolean;
  min_trades_for_confidence: number;

  p_target: number;
  p_stop: number;
  p_timeout: number;

  win_rate: number;
  avg_win_r: number | null;
  avg_loss_r: number | null;
  expectancy_gross_r: number;
  expectancy_net_r: number;
  cost_drag_r: number;
  profit_factor: number | null;
  max_drawdown_r: number;
  avg_bars_held: number;

  buckets: BacktestBucket[];
  correlation: number | null;
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
// ── Structure du mouvement (backend _structure.py / _confluence.py, v1.0) ──
export type FamilleStructure =
  | "FIBONACCI" | "MULTI_UNITES" | "SUPPORT_RESISTANCE" | "STRUCTURE" | "TENDANCE"
  | "MOMENTUM" | "VOLUME" | "VOLATILITE" | "PRIX";

export interface JambeStructure {
  unite: string;
  echelle: string;
  id: string;
  sens: "hausse" | "baisse";
  depart: number;
  fin: number;
  fin_confirmee: boolean;
  amplitude_atr: number;
  duree_bougies: number;
  age_bougies: number;
  phase: "extension" | "correction" | "invalidee";
  retracement: number;
  zone_repli: boolean;
  niveau_proche: { ratio: string; prix: number; zone: [number, number]; distance_atr: number; position: string };
  confiance: "haute" | "moyenne" | "faible";
  raisons_confiance: string[];
}

export interface ContexteTechnique {
  version: string;
  shadow: boolean;
  unite: string;
  market_structure: Record<string, {
    etat: "haussiere" | "baissiere" | "range" | "indetermine";
    sommets: "HH" | "LH" | null;
    creux: "HL" | "LL" | null;
    invalidation: number | null;
    rompue: boolean;
  } | null>;
  fibonacci: {
    primaire: JambeStructure | null;
    alternative: JambeStructure | null;
    mineure: JambeStructure | null;
    superieure: JambeStructure | null;
    bruite: boolean;
  };
  confluence: {
    situation: string;
    lecture: string;
    familles: Partial<Record<FamilleStructure, { vote: -1 | 0 | 1; pourquoi: string }>>;
    alignees: FamilleStructure[];
    contraires: FamilleStructure[];
    force?: number;
  };
}

export const analysisAPI = {
  // sl/tp/fundWeight come from the trading profile so the risk plan, the
  // setups and the backtest all describe one stop and one target.
  // riskLevel : le risque par trade choisi. Le moteur s'en sert pour le seuil
  // d'achat des profils agressifs (dès 55 en journalier), rien d'autre.
  analyze: (symbol: string, timeframe = "1d", slAtr = 2.0, tpAtr = 3.0, fundWeight = 0,
             style = "day", riskLevel?: string) =>
    fetchAPI<Analysis>(
      `/api/analysis/${symbol}?timeframe=${timeframe}&sl_atr=${slAtr}&tp_atr=${tpAtr}`
      + `&fund_weight=${fundWeight}&style=${style}`
      + (riskLevel ? `&risk_level=${riskLevel}` : "")
    ),

  // slAtr/tpAtr come from the trading profile, so the backtest validates
  // the very stop and target the analysis shows the user.
  backtest: (symbol: string, timeframe = "1d", horizon = 10, slAtr = 2.0, tpAtr = 3.0) =>
    fetchAPI<BacktestResult>(
      `/api/analysis/${symbol}/backtest?timeframe=${timeframe}&horizon=${horizon}` +
      `&sl_atr=${slAtr}&tp_atr=${tpAtr}`
    ),

  // `timeframe` must be the one the analysis page will open on, otherwise the
  // scanner scores an asset on one history and the analysis on another.
  scan: (marketKey: string, minScore = 60, limit = 20, oppType = "all", timeframe = "1d") =>
    fetchAPI<ScanResult>(
      `/api/analysis/scan/${marketKey}?min_score=${minScore}&limit=${limit}&opportunity_type=${oppType}&timeframe=${timeframe}`
    ),

  getScanLimit: () =>
    fetchAPI<ScanQuota>("/api/analysis/scan-limit"),

  getScanUniverse: () =>
    fetchAPI<ScanUniverse>("/api/analysis/scan-universe"),

  readScanIntent: (q: string) =>
    fetchAPI<ScanIntent>(`/api/analysis/scan-intent?q=${encodeURIComponent(q)}`),

  /**
   * Le scan, lu au fil de l'eau.
   *
   * Le scan classique rend tout d'un bloc après une à plusieurs minutes.
   * Ici chaque actif arrive dès qu'il est scoré, et l'appelant reçoit aussi
   * les actifs ÉCARTÉS : c'est ce qui permet de montrer le balayage complet
   * sans transporter 819 objets dont une poignée sera affichée.
   *
   * fetchAPI ne convient pas — il lit le corps entier avant de rendre la
   * main, ce qui annulerait tout l'intérêt. On lit donc le flux nous-mêmes,
   * en découpant sur les sauts de ligne : une ligne JSON peut arriver coupée
   * en deux paquets réseau, et concaténer sans garder le reste produirait du
   * JSON invalide au hasard des tailles de paquets.
   */
  scanStream: async (
    params: {
      zones?: string[];
      places?: string[];
      classes?: string[];
      minScore?: number;
      /** Le sens cherché. Le score du moteur étant orienté à la hausse, une
       *  vente se cherche de l'autre côté de l'échelle — c'est le serveur qui
       *  applique la symétrie, pas un filtre d'affichage. */
      direction?: "long" | "short" | "both";
      limit?: number;
      oppType?: string;
      timeframe?: string;
    },
    onEvent: (e: ScanEvent) => void,
    signal?: AbortSignal
  ): Promise<void> => {
    const { getToken } = await import("./auth");
    const token = getToken();
    const qs = new URLSearchParams({
      stream: "true",
      min_score: String(params.minScore ?? 60),
      limit: String(params.limit ?? 30),
      opportunity_type: params.oppType ?? "all",
      direction: params.direction ?? "both",
      timeframe: params.timeframe ?? "1d",
    });
    if (params.zones?.length) qs.set("zones", params.zones.join(","));
    if (params.places?.length) qs.set("places", params.places.join(","));
    if (params.classes?.length) qs.set("classes", params.classes.join(","));

    const res = await fetch(`/api/analysis/scan/ALL?${qs.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal,
    });

    if (!res.ok || !res.body) {
      let detail = "Le scan n'a pas pu démarrer.";
      try {
        const j = await res.json();
        if (typeof j?.detail === "string") detail = j.detail;
        else if (typeof j?.detail?.message === "string") detail = j.detail.message;
      } catch { /* corps illisible : le message générique suffit */ }
      throw new Error(detail);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let reste = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      reste += decoder.decode(value, { stream: true });
      const lignes = reste.split("\n");
      reste = lignes.pop() ?? "";
      for (const l of lignes) {
        if (!l.trim()) continue;
        try { onEvent(JSON.parse(l) as ScanEvent); }
        catch { /* ligne tronquée en fin de flux : on l'ignore */ }
      }
    }
    if (reste.trim()) {
      try { onEvent(JSON.parse(reste) as ScanEvent); } catch { /* idem */ }
    }
  },
};

/* ── Le contexte de presse ────────────────────────────────────────────────── */

/** Ce que la dernière lecture des flux a réellement vu. */
export interface IntelVeille {
  articles: number;
  redactions: number;
  groupes: number;
  dossiers: number;
  lu_a: string | null;
}

export interface IntelEvenement {
  titre: string;
  /** L'échelle d'incertitude : CONFIRMED, PROBABLE, POSSIBLE, UNCERTAIN, DISPUTED, FALSE. */
  niveau: string;
  confiance: number;
  raisons: string[];
  /** Rédactions indépendantes, après amortissement des reprises d'agence. */
  voix: number;
  articles: number;
  nouveaute: number;
  absorption: number;
  age_heures: number;
  changements: string[];
  cible: string;
  /** +1 favorable à cet actif, -1 défavorable, 0 sans sens. */
  sens: number;
  /** Ce qui rattache cet actif au panier exposé — son métier. */
  pourquoi: string;
  /** Ce que l'événement lui fait concrètement, dans le sens observé. */
  effet: string;
  /** Ce qu'il faut regarder pour voir si la chaîne s'enclenche — ou pas. */
  a_surveiller: string;
  conteste: boolean;
  mecanisme: string[];
  solidite: number;
  qualite_mecanisme: string;
  horizon: string;
  reserve: string;
  poids: number;
  marche?: {
    etat: "confirme" | "contredit" | "sans reaction" | "indetermine" | "sans attente";
    phrase: string;
    lectures: string[];
    seuil_pct: number;
    variation_pct: number;
    surprise: number;
  };
}

export interface IntelContext {
  symbole: string;
  couvert: boolean;
  indisponible?: boolean;
  resume: string;
  evenements: IntelEvenement[];
  surveille: string[];
  veille: IntelVeille;
}

export const intelAPI = {
  /**
   * Les données de marché sont passées par l'appelant, qui les tient déjà de
   * l'analyse : les redemander côté serveur doublerait les appels au
   * fournisseur de cours et pourrait afficher deux prix différents sur une
   * même page.
   */
  forSymbol: (
    symbol: string,
    market?: { variationPct?: number; volumeRatio?: number; volatiliteJour?: number },
  ) => {
    const qs = new URLSearchParams();
    if (market?.variationPct != null) qs.set("variation_pct", String(market.variationPct));
    if (market?.volumeRatio != null) qs.set("volume_ratio", String(market.volumeRatio));
    if (market?.volatiliteJour != null) qs.set("volatilite_jour", String(market.volatiliteJour));
    const q = qs.toString();
    return fetchAPI<IntelContext>(
      `/api/intel/${encodeURIComponent(symbol)}${q ? `?${q}` : ""}`,
    );
  },
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

/** Une figure chartiste trouvée sur la fenêtre affichée.
 *  `i` : indices dans `ChartData.data` de la même période et unité. */
export interface Figure {
  cle: string;
  nom: string;
  sens: "haussier" | "baissier";
  points: { i: number; prix: number; ts: number }[];
  /** La ligne de cou, la base ou la borne cassée. */
  ligne: { i1: number; p1: number; i2: number; p2: number; ts1: number; ts2: number } | null;
  ts_fin: number;
  /** La géométrie exacte, décidée côté serveur, là où la figure est comprise. */
  dessin: {
    /** Polygone à teinter : la figure elle-même. */
    zone: { i: number; prix: number; ts: number }[];
    /** Segments nommés : ligne de cou, côtés d'un triangle, mât d'un drapeau… */
    traces: { role: "cou" | "cote_haut" | "cote_bas" | "mat" | "borne";
              i1: number; p1: number; i2: number; p2: number; ts1: number; ts2: number }[];
    /** Où et à quel cours la figure s'est confirmée. */
    cassure: { i: number; prix: number; ts: number };
  };
  /** La bougie de la cassure. */
  i_fin: number;
  /** La première bougie où la figure était réellement visible. */
  i_connu: number;
  objectif: number | null;
  invalidation: number | null;
  verdict: {
    ton: "favorable" | "neutre" | "defavorable" | "inconnu";
    phrase: string;
    n: number;
    ecart?: number;
  };
}

export interface StatFigure {
  n: number;
  sens_20: number;
  ecart: number;
  erreur_type: number;
  ecart_A: number | null;
  ecart_B: number | null;
  moy_20: number;
  objectif: number;
  invalide: number;
  verdict: "favorable" | "neutre" | "defavorable" | "trop_peu";
}

export interface FigureMoteur {
  cle: string;
  nom: string;
  sens: "haussier" | "baissier";
  /** « il y a 3 séances » */
  age: string;
  /** Points de score apportés. 0 tant que la mesure ne les justifie pas. */
  poids: number;
  raison: "mesuree" | "pas_mieux_que_le_hasard" | "trop_peu" | "non_mesuree" | "invalidee";
  invalidation: number | null;
  objectif: number | null;
  n_mesure: number | null;
}

export interface FiguresMesure {
  methode: { panel: number; bougies: number; figures: number; annees: number;
             base_hausse_20: number; note: string };
  statistiques: Record<string, StatFigure>;
}

export interface FiguresReponse {
  symbol: string;
  figures: Figure[];
  methode: { panel: number; figures: number; annees: number; note: string };
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
  /** Le nom lisible, fourni par le serveur avec les positions ouvertes. */
  name?: string;
  direction: "LONG" | "SHORT";
  entry_price: number;
  quantity: number;
  amount: number;
  leverage: number;
  take_profit?: number;
  stop_loss?: number;
  status: "open" | "closed";
  /** null quand le cours n'a pas pu être récupéré — pas quand il est stable. */
  current_price?: number | null;
  unrealized_pnl?: number | null;
  pnl_percent?: number | null;
  /** False = aucun cours disponible. Sans ce drapeau, « pas de variation » et
   *  « pas de données » s'affichaient de façon identique. */
  price_available?: boolean;
  /** Variation de la séance pour cet actif, telle que la renvoie le marché. */
  day_change_percent?: number | null;
  exit_price?: number;
  realized_pnl?: number;
  created_at: string;
  closed_at?: string;
  /** « cfd » (montant × levier) ou « turbo » (titres entiers à barrière). */
  instrument?: "cfd" | "turbo";
  unites?: number | null;
  prix_unitaire?: number | null;
  parite?: number | null;
  barriere?: number | null;
  frais_ordre?: number | null;
  /** Frais de courtage déjà payés (achat, puis vente une fois clôturée). */
  frais_payes?: number | null;
  prix_titre_actuel?: number | null;
  levier_actuel?: number | null;
  distance_barriere_pct?: number | null;
}

export interface OpenPositionData {
  symbol: string;
  direction: "LONG" | "SHORT";
  amount: number;
  leverage?: number;
  take_profit?: number;
  stop_loss?: number;
  instrument?: "cfd" | "turbo";
  unites?: number;
}

/** Le turbo qu'un courtier proposerait, calculé par le serveur au cours du moment. */
export interface DevisTurbo {
  direction: "LONG" | "SHORT";
  levier: number;
  exercice: number;
  barriere: number;
  parite: number;
  prix_juste: number;
  prix_titre: number;
  ecart_titre: number;
  mouvement_desactivation_pct: number;
  cours: number;
  unites: number;
  cout_titres: number;
  frais: number;
  total: number;
  exposition: number;
  perte_maxi: number;
  montant_non_investi: number;
}

/** Le bilan d'un trade clôturé, produit PAR LE SERVEUR.
 *
 *  Il vit côté serveur parce qu'une position atteinte par son stop se ferme
 *  sans l'utilisateur, et qu'il faut alors le même jugement qu'à la clôture
 *  manuelle. L'écrire une seconde fois ici garantirait qu'au premier
 *  ajustement les deux versions disent des choses différentes du même trade. */
export interface TradeReview {
  symbol: string;
  direction: "LONG" | "SHORT";
  entry_price: number;
  exit_price: number;
  quantity: number;
  pnl: number;
  result: "win" | "loss" | "breakeven";
  risk_reward: number | null;
  entry_time?: string;
  exit_time: string;
  closed_by: "stop_loss" | "take_profit" | null;
  held_minutes: number;
  advice: string[];
  pre_trade_notes: string;
  post_trade_notes: string;
}

export interface PositionResult {
  success: boolean;
  message: string;
  entry_price?: number;
  exit_price?: number;
  quantity?: number;
  realized_pnl?: number;
  review?: TradeReview | null;
  new_balance: number;
  instrument?: "cfd" | "turbo";
  turbo?: DevisTurbo | null;
  frais?: number;
  liquidated?: boolean;
}

/** Le bilan d'un actif sur l'ensemble des trades, pas la liste des trades. */
export interface SymbolSummary {
  symbol: string;
  trades: number;
  wins: number;
  losses: number;
  breakeven: number;
  win_rate: number | null;
  pnl: number;
  avg_pnl: number;
  return_pct: number | null;
  engaged: number;
  best: number | null;
  worst: number | null;
  long: number;
  short: number;
  avg_held_minutes: number | null;
  last_closed_at: string | null;
}

/** Un constat sur la façon de trader : mérité par les chiffres de la
 *  personne, ou absent. */
export interface ConstatObserve {
  cle: string;
  ton: "attention" | "neutre" | "bien";
  titre: string;
  phrase: string;
  conseil: string;
  lien: { href: string; label: string };
}

export interface ProfilObserve {
  trades_fermes: number;
  positions_ouvertes: number;
  assez: boolean;
  min_trades: number;
  declare: {
    style: string; style_mot: string;
    risque: string; risque_mot: string; risque_pct: number;
    perte_max_pct: number | null; disponibilite: string | null;
  };
  mesures: {
    detention?: { mediane_min: number; mediane_mot: string; dans_horizon: number };
    sorties?: { objectif: number; stop: number; manuelle: number };
    taux_gagnants?: number;
    r_moyen?: number;
    perte_sur_gain?: number | null;
    sans_stop?: number;
    risque_capital_pct?: number;
    stop_montant_pct?: number;
    actifs?: Array<{ symbol: string; n: number }>;
    classes?: Array<{ classe: string; mot: string; part: number }>;
    rythme?: { heure: number; jour: string; part_soir: number; part_weekend: number };
  };
  constats: ConstatObserve[];
}

/** Le résultat cumulé des trades clôturés (backend wallet.py, /courbe). */
export interface CourbeWallet {
  capital_depart: number;
  points: Array<{ t: string; cumul: number; pnl: number; symbol: string; issue: "objectif" | "stop" | "manuelle" }>;
  trades: number;
  issues: { objectif: number; stop: number; manuelle: number };
  gagnants: number;
  sur_dix: SurDix | null;
  r_moyen: number | null;
  trades_avec_stop: number;
  nimbo: { sur_dix: SurDix; r_moyen: number; echeance_seances: number };
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

export interface ClimatMesure {
  niveau: number;
  variation_20: number;
  variation_20_pct: number | null;
  bas_1an: number;
  haut_1an: number;
  position_1an: number | null;
  unite: string;
  date: string;
  etat: string;
  phrase: string;
}

export interface Analysis {
  /** Les signaux nommés que le moteur a relevés, haussiers et baissiers.
   *  Manquait au type alors que l'API les renvoie depuis toujours — donc
   *  invisibles à l'écran sans qu'aucune erreur ne le signale. */
  conviction?: {
    score: number;
    bullish_signals: string[];
    bearish_signals: string[];
    total_signals: number;
  };
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
    /** Points retirés (négatif) ou ajoutés par cette tendance. */
    ajustement?: number;
  };
  /** Ce qui arrive en vrai aux achats que le moteur propose à cet horizon
   *  (mesuré sur 40 actifs, plan de l'écran). Absent si rien n'est mesuré. */
  /** Positions ouvertes qui gagnent et perdent avec celle-ci (backend _correlation.py). */
  correlation_positions?: {
    proches: Array<{ symbol: string; nom?: string | null; direction: string; correlation: number; seances: number }>;
    ouvertes: number;
  };
  /** Ce qui tombe avant l'échéance du plan (backend _evenements.py). */
  evenements_plan?: {
    jours: number;
    resultats: { quand: string; date_longue: string; dans_jours: number } | null;
    macro: Array<{ banque: "FED" | "BCE"; titre: string; quand: string; date_longue: string;
      dans_jours: number; officiel: boolean; sens_si_restrictive: number }>;
    phrases: string[];
  };
  probabilites?: {
    objectif: number; stop: number; echeance: number; echeance_en_gain: number;
    duree_objectif_seances: number; echeance_seances: number; r_moyen: number;
    n: number; actifs: number; libelle: string;
    sur_dix: { objectif: number; stop: number; echeance: number };
  } | null;
  /** Le moteur de structure / Fibonacci / confluence, en shadow (hors score). */
  contexte_technique?: ContexteTechnique | null;
  /** Le score avant les deux portes, et ce que chacune a fait. */
  portes?: {
    score_avant: number;
    unite_superieure: number;
    contexte: number;
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
  /** Peur (VIX) et taux US 10 ans : contexte à lire, n'entre pas dans le score. */
  climat_marche?: {
    dans_le_score: false;
    vix?: ClimatMesure;
    taux_10ans?: ClimatMesure & { variation_20_pb?: number };
  } | null;
  indicators: {
    /** Écart du cours à sa moyenne 200 bougies, en ATR, et la composante de
     *  score qui en découle (60 % du score depuis le moteur 2.1). */
    extension?: { atr: number | null; score: number | null };
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
  engine_version?: string;
  risk_multiples?: { sl_atr: number; tp_atr: number };
  /** Les figures chartistes que le moteur a vues, et le poids qu'il leur a
   *  donné — nul tant que la mesure ne dit pas qu'elles battent le hasard. */
  figures?: FigureMoteur[];
  /** Ce que ce plan veut dire pour cette personne. Absent sans intentions. */
  personnel?: BlocPersonnel;
  /** Technical verdict re-read with the profile's fundamental weight. Kept
   *  apart from `score`, which stays the verdict the scanner shares. */
  profile_score?: {
    total: number;
    signal: string;
    fundamentals_applied: boolean;
    fund_weight: number;
    fund_fields_present: number;
  };
  /** What this score level has been worth on THIS asset — with sample size. */
  historical_edge?: {
    n_trades: number;
    enough_samples: boolean;
    expectancy_net_r?: number | null;
    win_rate?: number | null;
    p_target?: number | null;
    p_stop?: number | null;
    p_timeout?: number | null;
    profit_factor?: number | null;
    by_regime?: Record<string, {
      n_trades: number; enough: boolean;
      p_target: number; p_stop: number; p_timeout: number;
      win_rate: number; expectancy_net_r: number;
    }>;
    /** Le même replay, découpé par sens : l'achat au-dessus de 60 et la vente
     *  sous 40 sont deux populations que l'espérance globale mélangeait. */
    by_direction?: Record<"long" | "short", {
      n_trades: number; enough: boolean;
      p_target: number; p_stop: number; p_timeout: number;
      win_rate: number; expectancy_net_r: number; se_r?: number | null;
    }>;
    /** Most likely outcome for this setup in today's market — conditioned on
     *  the market regime when the sample allows, unconditional otherwise, and
     *  it always says which. */
    scenario?: {
      basis: "conditional" | "unconditional";
      regime: string | null;
      label: string;
      n_trades: number;
      enough: boolean;
      p_target: number | null;
      p_stop: number | null;
      p_timeout: number | null;
      expectancy_net_r: number | null;
      most_likely: "target" | "stop" | "timeout";
      most_likely_pct: number;
      fallback_reason: string | null;
    } | null;
  };
  /** Trust in the direction — distinct from confidence in the data. */
  signal_quality?: { score: number; notes: string[] };
  /** Regime of the asset's own market, and whether it leads or lags it. */
  market_context?: {
    benchmark: string;
    regime: "BULL" | "BEAR" | "NEUTRAL" | "UNKNOWN";
    bench_change_20: number | null;
    asset_change_20: number | null;
    relative_strength: number | null;
    correlation: number | null;
    outperforming: boolean | null;
  } | null;
  volatility_context?: {
    /** Where today's volatility sits in THIS asset's own history, 0-100. */
    percentile: number | null;
    regime: "LOW" | "NORMAL" | "HIGH" | "EXTREME" | "UNKNOWN";
    basis: "percentile" | "absolute";
  };
  /** Direction of each independent factor family, -1 to +1. */
  factor_directions?: Record<string, number>;
  /** Le seuil d'achat appliqué à cet utilisateur : 55 pour un profil
   *  agressif en journalier, 60 sinon. `abaisse` : ce score n'est proposé
   *  QUE grâce au profil. */
  seuil_achat?: {
    valeur: number;
    niveau_risque: string;
    abaisse: boolean;
    etude: string | null;
  };
  tradeability?: {
    tradable: boolean;
    blockers: string[];
    warnings: string[];
  };
  /** L'edge historique restreint au SENS que le plan propose — la mesure que
   *  la jouabilité oppose au verdict, et donc celle que l'écran doit citer. */
  edge_direction?: {
    base: "directionnelle" | "globale";
    sens: "long" | "short" | null;
    n_trades: number;
    expectancy_net_r?: number | null;
    se_r?: number | null;
    win_rate?: number | null;
    fiable: boolean;
    /** Faux au-dessus de l'intraday : l'historique d'un seul actif y est
     *  affiché mais ne pèse pas (il n'y prédit pas l'avenir). */
    pris_en_compte?: boolean;
    /** Le résultat mesuré sur l'ensemble des actifs, cité à la place. */
    panel?: { expectancy_net_r: number; base: string };
  } | null;
  levels: {
    support: number;
    resistance: number;
    pivot: number;
    /** How the levels were measured: N bars of this interval. On a monthly
     *  chart 20 bars is 20 months, which the labels must say. */
    window_bars?: number;
    window_interval?: string;
  };
  risk: {
    suggested_sl: number;
    suggested_tp: number;
    risk_reward: number;
    /** Vrai quand le plan n'est qu'un exemple (verdict neutre, ou vente à
     *  découvert que l'historique n'a pas validée) : il ne s'ouvre pas. */
    illustratif?: boolean;
    direction?: "LONG" | "SHORT";
    sl_basis?: string;
    tp_capped_at_level?: boolean;
    /** Un obstacle (résistance, ou support pour une vente) entre le cours et
     *  l'objectif. En journalier et 3 jours l'objectif le dépasse (mesuré). */
    obstacle?: boolean;
    tp_structure?: number | null;
    /** Rapport gain/risque jusqu'à l'obstacle : c'est lui qui décide d'entrer. */
    risk_reward_obstacle?: number | null;
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
  /** Generated server-side from the score's own terms — see _build in scan_market. */
  reason?: string;
  /** Achat, vente, ou rien — selon le score ET l'horizon déclaré du lecteur. */
  sens?: "long" | "short" | "aucun";
  /** Pourquoi ce sens, et ce que l'horizon y change. */
  sens_phrase?: string;
  /** Entrée, objectif, invalidation — null quand la structure ne les donne pas. */
  plan?: {
    sens: "long" | "short";
    entree: number;
    entree_condition: string;
    invalidation: number;
    objectif: number;
    rapport: number | null;
    commentaire: string;
    verdict: string;
  } | null;
  opp_type: "breakout" | "reversal" | "momentum";
  macd_signal: "HAUSSIER" | "BAISSIER";
  near_breakout: boolean;
  pct_from_high: number;
  market_regime?: string | null;
  relative_strength?: number | null;
  /** Où l'actif cote et ce qu'il est — les deux axes du sélecteur d'univers. */
  place?: string;
  asset_class?: string;
  /** La famille de configuration : c'est elle qui range le résultat, pas le
   *  score. Une cassure et un rebond ne se tradent pas au même moment, et un
   *  classement unique trié par score les mélange en permanence. */
  family?: "cassure" | "rebond" | "tendance";
  setup?: string;
  /** Ce qui se passe, en une phrase. */
  headline?: string;
  /** Ce qui confirme et ce qui invalide. Sans cette seconde phrase, une
   *  « opportunité » n'est qu'une opinion. */
  action?: string;
  support?: number | null;
  resistance?: number | null;
}

export interface ScanPlace {
  key: string;
  label: string;
  iso: string;
  count: number;
  classes: Record<string, number>;
}

export interface ScanZone {
  key: string;
  label: string;
  count: number;
}

export interface ScanUniverse {
  total: number;
  places: ScanPlace[];
  classes: { key: string; label: string; count: number }[];
  regions: { key: string; places: string[] }[];
  /** Les zones — ce qu'on choisit d'abord, et qui s'UNISSENT. */
  zones?: ScanZone[];
}

/** Ce qu'une phrase d'intention a produit comme réglages. */
export interface ScanIntent {
  zones: string[];
  horizon: "scalp" | "day" | "swing" | "long" | null;
  timeframe: string | null;
  direction: "long" | "short" | "both";
  min_score: number | null;
  /** Ce qui a été compris, phrase par phrase, pour être affiché et corrigé. */
  understood: string[];
  recognised: boolean;
}

/** Un événement du scan diffusé au fil de l'eau. */
export type ScanEvent =
  | { type: "start"; total: number; symbols: string[]; timeframe: string; min_score: number }
  | { type: "phase"; phase: string; label: string }
  | { type: "result"; done: number; item: ScanResultItem }
  | { type: "seen"; done: number; symbol: string; score: number; place?: string }
  | { type: "skip"; done: number }
  | { type: "done"; total_scanned: number; total_analyzed: number; kept: number;
      results: ScanResultItem[]; quota?: ScanQuota };

export interface ScanQuota {
  scans_today: number;
  daily_limit: number;
  remaining: number;
  is_premium: boolean;
  /** ISO8601 next UTC midnight — only set once the quota is spent. */
  next_reset?: string | null;
}

export interface ScanResult {
  market: string;
  /** Timeframe the scan actually ran on — matches the user's trading style. */
  timeframe?: string;
  min_score: number;
  total_scanned: number;
  /** Assets that returned usable data; below total_scanned when a ticker is dead. */
  total_analyzed?: number;
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
  /** Le nom lisible. « CL=F » a sa place dans une URL, pas dans une phrase. */
  name?: string;
  price: number;
  change: number;
  added_at: string;
  error?: boolean;
}

// Admin API
export interface AdminAssetRequest {
  id: number;
  user_id: number;
  email?: string;
  username?: string;
  symbol: string;
  name?: string;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  admin_note?: string;
  created_at: string;
}

export interface AdminChangelog {
  id: number;
  admin_id: number;
  title: string;
  content: string;
  version?: string;
  created_at: string;
}

export interface AdminAIHealth {
  ok: boolean;
  serving: string | null;
  providers: {
    provider: string;
    key: boolean;
    model: string | null;
    ok: boolean;
    detail: string;
  }[];
}

/** L'état de l'envoi d'e-mails — sans aucune valeur secrète. */
export interface EmailEtat {
  fournisseur: "brevo" | "resend" | "smtp" | "aucun";
  expediteur: string | null;
  frontend_url: string;
  frontend_url_locale: boolean;
  variables: Record<string, boolean>;
}

export interface EmailTest extends EmailEtat {
  ok: boolean;
  to: string;
  voie?: string;
  erreur?: string;
  conseil?: string;
}

export interface AdminDataHealth {
  depuis: number;
  compteurs: Partial<Record<"yahoo" | "twelvedata" | "cache_expire" | "echec", number>>;
  part_yahoo: number | null;
  incidents: Array<{ quand: number; source: string; symbole: string; detail: string | null }>;
  secours_configure: boolean;
}

export const adminAPI = {
  emailStatus: () => fetchAPI<EmailEtat>("/api/admin/email/status"),
  /** Envoie en direct et rend l'erreur exacte en cas d'échec. */
  emailTest: (to?: string) =>
    fetchAPI<EmailTest>("/api/admin/email/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(to ? { to } : {}),
    }),
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

  // ── Ce que l'ancien écran ne branchait pas ──────────────────────────────
  //
  // Les routes existaient côté serveur et les composants côté client, mais
  // rien ne les reliait : quatre sections entières — positions de tous les
  // utilisateurs, demandes d'actifs, journal d'audit, statistiques — étaient
  // écrites, compilées, et inatteignables.
  getAssetRequests: () =>
    fetchAPI<{ requests: AdminAssetRequest[] }>("/api/admin/asset-requests"),

  assetRequestAction: (requestId: number, action: "approve" | "reject", note?: string) =>
    fetchAPI<{ success: boolean }>("/api/admin/asset-requests/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: requestId, action, note }),
    }),

  getChangelogs: () =>
    fetchAPI<{ changelogs: AdminChangelog[] }>("/api/admin/changelogs"),

  createChangelog: (title: string, content: string, version?: string) =>
    fetchAPI<{ success: boolean }>("/api/admin/changelog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, version }),
    }),

  deleteChangelog: (id: number) =>
    fetchAPI<{ success: boolean }>(`/api/admin/changelog/${id}`, { method: "DELETE" }),

  deleteBroadcast: (id: number) =>
    fetchAPI<{ success: boolean }>(`/api/admin/broadcast/${id}`, { method: "DELETE" }),

  promote: (email: string) =>
    fetchAPI<{ success: boolean; message?: string }>("/api/admin/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }),

  /** D'où viennent les cours depuis le démarrage du serveur (backend _qualite.py). */
  getDataHealth: () =>
    fetchAPI<AdminDataHealth>("/api/admin/data-health"),

  /** L'état réel des fournisseurs d'IA : chacun est interrogé, pas seulement
   *  vérifié pour la présence d'une clé. */
  getAIHealth: () =>
    fetchAPI<AdminAIHealth>("/api/admin/ai-health"),

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

/** Une action d'administration. Nommée à part pour être manipulable : le
 *  type était enfoui dans la réponse, donc inutilisable ailleurs. */
export interface AdminAuditEntry {
  id: number;
  admin_id: number;
  action: string;
  details: string;
  created_at: string;
  admin_email?: string;
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

/** L'éditeur publié par le serveur (backend api/legal.py) : une seule source
 *  pour les mentions légales, les CGV et l'ouverture de l'offre. */
export interface EditeurPublic {
  statut: "non_immatricule" | "micro_entreprise" | "societe";
  nom_public: string;
  identite: string;
  adresse: string;
  email: string;
  telephone: string;
  siren: string;
  rcs: string;
  tva_intracom: string;
  mention_tva: string;
  mediateur: { nom: string; adresse: string; site: string };
  pays: string;
  offre_ouverte: boolean;
  prix_centimes: number;
  cgv_version: string;
}

/** La liste de contrôle d'ouverture du Premium (admin). */
export interface OuverturePremium {
  ouverte: boolean;
  mode_test: boolean;
  essai_admin: boolean;
  liste: Array<{ cle: string; libelle: string; ok: boolean; comment: string }>;
  stripe: null | { joignable: boolean; erreur?: string; montant_centimes?: number; devise?: string;
    intervalle?: string; actif?: boolean };
  webhook_url: string;
  evenements_webhook: string[];
}

export const legalAPI = {
  editeur: () => fetchAPI<EditeurPublic>("/api/legal/editeur"),
  ouverture: () => fetchAPI<OuverturePremium>("/api/legal/ouverture"),
};

// Premium API
export const premiumAPI = {
  // Check premium status
  getStatus: () => fetchAPI<PremiumStatus>("/api/premium/status"),

  // Get features comparison
  getFeatures: () => fetchAPI<PremiumFeatures>("/api/premium/features"),

  // Ouvre le paiement Stripe. Refusé côté serveur sans acceptation des CGV.
  createCheckout: (accepteCgv: boolean) =>
    fetchAPI<{ url: string }>("/api/premium/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accepte_cgv: accepteCgv }),
    }),

  /** Résilier : effet à la fin du mois payé. */
  resilier: () => fetchAPI<{ ok: boolean; fin: string | null }>("/api/premium/resilier", { method: "POST" }),
  /** Annuler une résiliation programmée. */
  reprendre: () => fetchAPI<{ ok: boolean }>("/api/premium/reprendre", { method: "POST" }),
  /** Le portail Stripe : carte et factures. */
  portail: () => fetchAPI<{ url: string }>("/api/premium/portail", { method: "POST" }),
  /** Se rétracter dans les 14 jours : remboursement intégral. */
  retractation: () =>
    fetchAPI<{ ok: boolean; rembourse_centimes: number }>("/api/premium/retractation", { method: "POST" }),

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
  /** L'abonnement Stripe, s'il y en a eu un (backend premium.py). */
  abonnement: {
    statut: "active" | "annulation_programmee" | "impaye" | "termine" | "retracte" | null;
    en_cours: boolean;
    fin_periode: string | null;
    souscrit_le: string | null;
    retractation_jusquau: string | null;
    retractation_possible: boolean;
    portail: boolean;
  } | null;
  /** L'état de l'offre : ouverte au public, ou en essai pour un administrateur. */
  offre: { ouverte: boolean; essai_admin: boolean; prix_centimes: number };
  features: {
    free: PremiumLimits;
    premium: PremiumLimits;
  };
}

export interface PremiumLimits {
  max_positions: number;
  max_favorites: number;
  ai_messages_per_day: number;
  /** -1 = sans limite. Ce champ existait côté serveur et manquait ici, ce qui
   *  a laissé la page Premium annoncer un chiffre écrit à la main. */
  scanner_scans_per_day: number;
  backtest_enabled: boolean;
  geopolitical_enabled: boolean;
  advanced_pivots: boolean;
  per_rankings_limit: number;
  economic_calendar_days: number;
  alerts_enabled: boolean;
  priority_support: boolean;
}

export interface PremiumFeatures {
  /** Les limites gratuites à l'ouverture de l'offre (avant : tout le monde a les limites Premium). */
  free_ouverture?: PremiumLimits;
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
  mission_titles?: string[];
  level_up?: boolean;
}

export const missionsAPI = {
  list: () => fetchAPI<{ missions: Mission[] }>("/api/learn/missions"),
  progress: () => fetchAPI<UserProgress>("/api/learn/progress"),
  // Chaque récompense gagnée est annoncée par Nimbo, où que l'action ait été
  // faite : l'appelant n'a rien à afficher lui-même.
  recordAction: (action: string, value: number = 1) =>
    fetchAPI<ActionResult>("/api/learn/progress/action", {
      method: "POST",
      body: JSON.stringify({ action, value }),
    }).then((r) => {
      annoncerRecompenses(r);
      return r;
    }),
};

// ── Parcours : progression des leçons ────────────────────────────────────────
// Elle vivait dans localStorage sous "tdb_learn_progress", alors que l'XP, le
// niveau, les badges et la série étaient déjà côté serveur. La seule chose qui
// ne l'était pas, c'était l'endroit où l'utilisateur en est — donc changer
// d'appareil remettait le parcours à zéro.
export interface LessonRecord {
  quiz_score: number | null;
  completed_at: string;
}

export const learnAPI = {
  lessons: () => fetchAPI<{ lessons: Record<string, LessonRecord> }>("/api/learn/lessons"),

  complete: (moduleId: string, lessonId: string, quizScore?: number) =>
    fetchAPI<ActionResult & { already_completed: boolean; quiz_score: number | null }>(
      `/api/learn/lessons/${moduleId}/${lessonId}`,
      { method: "POST", body: JSON.stringify({ quiz_score: quizScore ?? null }) }
    ).then((r) => {
      if (!r.already_completed) annoncerRecompenses(r);
      return r;
    }),

  /** Reprise unique de ce qu'un navigateur détient encore localement. */
  importLocal: (completed: string[], quizScores: Record<string, number>) =>
    fetchAPI<{ imported: number }>("/api/learn/lessons/import", {
      method: "POST",
      body: JSON.stringify({ completed, quiz_scores: quizScores }),
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

// ── Préparation de la semaine (le week-end) ────────────────────────────────

export interface FenetreSemaine {
  ouvert: boolean;
  lundi: string;
  lundi_ecoule: string;
  libelle: string;
  prochaine_ouverture: string | null;
  fermeture: string;
}

export interface ActifSemaine {
  symbole: string;
  nom: string;
  crypto: boolean;
  disponible: boolean;
  dernier?: number;
  semaine_pct?: number;
  mois_pct?: number | null;
  haut?: number;
  bas?: number;
  amplitude_pct?: number | null;
}

export interface EvenementMacro {
  id?: number;
  resume?: string | null;
  officiel?: boolean;
  titre: string;
  titre_origine: string;
  pourquoi: string;
  pays: string;
  pays_nom: string;
  quand: string;
  jour: string;
  heure: string;
  importance: "forte" | "moyenne" | "faible" | "férié";
  prevision: string | null;
  precedent: string | null;
}

export interface PointAPenser {
  niveau: "important" | "conseil";
  titre: string;
  texte: string;
  lien: string | null;
}

export interface PreparationSemaine {
  fenetre: FenetreSemaine;
  profil: { goal: string | null; markets: string[]; style: string; weekly_time: string | null };
  semaine: {
    trades: number;
    resultat: number;
    gagnants: number;
    perdants: number;
    taux_reussite: number | null;
    sans_stop: number;
    fermetures_forcees: number;
    frais: number;
    meilleur: { symbole: string; nom: string; resultat: number } | null;
    pire: { symbole: string; nom: string; resultat: number } | null;
    journal: number;
    solde: number | null;
  };
  positions: {
    symbole: string; nom: string; sens: "LONG" | "SHORT"; instrument: string;
    montant: number; stop: number | null; objectif: number | null; barriere: number | null;
    crypto: boolean; semaine_pct: number | null;
  }[];
  actifs: { suivis: ActifSemaine[]; reperes: ActifSemaine[] };
  actualite: {
    sujets: {
      titre: string; titre_fr: string; voix: number; articles: number; confiance: number;
      niveau: string; premiere_vue: string; vos_actifs: { symbole: string; nom: string }[];
    }[];
    vos_actifs: {
      symbole: string; nom: string; resume: string; titre: string; titre_fr: string;
      effet: string; sens: number; a_surveiller: string;
    }[];
    veille: { articles?: number; redactions?: number; lu_a?: string | null };
  };
  agenda: {
    a_venir: EvenementMacro[];
    semaine_ecoulee: EvenementMacro[];
    publie: boolean;
    note: string | null;
    source: string;
    devises: string[];
  };
  a_penser: PointAPenser[];
}

export const semaineAPI = {
  fenetre: () => fetchAPI<FenetreSemaine>("/api/semaine/fenetre"),
  get: () => fetchAPI<PreparationSemaine>("/api/semaine"),
  synthese: () => fetchAPI<{ texte: string | null; source: string }>("/api/semaine/synthese"),
};

// ── Le suivi réel des propositions de Nimbo (backend nimbo_suivi.py) ───────
export interface SurDix { objectif: number; stop: number; echeance: number }
export interface BilanHorizon {
  cle: string;
  libelle: string;
  closes: number;
  en_cours: number;
  compte: { objectif: number; stop: number; echeance: number };
  sur_dix: SurDix | null;
  r_moyen: number | null;
  r_erreur: number | null;
  attendu: { sur_dix: SurDix; r_moyen: number } | null;
}
export interface PropositionSuivie {
  symbol: string; timeframe: string; direction: string; score: number;
  entree: number; stop: number; objectif: number; cree_le: string;
  statut: "en_cours" | "objectif" | "stop" | "echeance";
  sortie: number | null; r: number | null; clos_le: string | null;
}
export interface SuiviNimbo {
  depuis: string | null;
  total: number;
  horizons: BilanHorizon[];
  dernieres: PropositionSuivie[];
}
export const nimboSuiviAPI = {
  get: () => fetchAPI<SuiviNimbo>("/api/nimbo/suivi"),
};

// ── Notifications push (backend routes/push.py) ────────────────────────────
export const pushAPI = {
  cle: () => fetchAPI<{ cle: string | null }>("/api/push/cle"),
  abonner: (a: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
    fetchAPI<{ ok: boolean }>("/api/push/abonnement", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(a),
    }),
  desabonner: (endpoint: string) =>
    fetchAPI<{ ok: boolean }>("/api/push/abonnement", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint }),
    }),
  essai: () => fetchAPI<{ envoyees: number }>("/api/push/essai", { method: "POST" }),
};

// ── Le moteur macro ────────────────────────────────────────────────────────

export interface AnnonceMacro {
  id: number;
  titre: string;
  titre_origine: string;
  pourquoi: string;
  famille: string | null;
  famille_nom: string | null;
  banque: "FED" | "BCE" | "BOE" | "BOJ" | null;
  pays: string;
  pays_nom: string;
  quand: string;
  jour: string;
  date_longue: string;
  heure: string;
  importance: "forte" | "moyenne" | "faible" | "férié";
  prevision: string | null;
  precedent: string | null;
  officiel: boolean;
  source: string | null;
  note: string | null;
  statut: "a_venir" | "en_cours" | "publie";
  resume: string | null;
  lecture: number | null;
  vos_actifs?: {
    symbole: string; nom: string; position: string | null;
    sens_si_restrictive: number; sens_effectif: number | null; mesure: boolean;
  }[];
}

export interface MesureMacro {
  n?: number;
  fiabilite: "fiable" | "indicatif" | "non_mesurable" | "en_calcul" | "thermometre";
  amplification?: number | null;
  pente_par_pas?: number;
  t?: number;
  moyenne_durs?: number | null;
  n_durs?: number;
  moyenne_doux?: number | null;
  n_doux?: number;
  regularite?: number | null;
  decalage_jours?: number;
  thermometre?: string;
  pas?: string;
  raison?: string;
}

export interface ImpactMacro {
  symbole: string;
  nom: string;
  banque: string;
  sens_si_restrictive: number;
  source: "mesure" | "mecanisme" | null;
  conforte: boolean;
  contredit_mecanisme: boolean;
  pourquoi: string | null;
  mesure: MesureMacro | null;
  mesure_par_procuration: boolean;
  sens_effectif: number | null;
  mouvement_attendu_pct: number | null;
  phrase: string;
  position?: string | null;
}

export interface ResultatMacro {
  officiel: {
    titre: string; url: string; publie_le: string;
    decision: { action: "hausse" | "baisse" | "maintien"; ampleur_pb: number | null; niveau: string | null;
      vote: string | null; unanime: boolean | null; extrait: string } | null;
  } | null;
  reaction: { symbole: string; nom: string; avant: number; apres: number; variation: number; unite: "pb" | "%"; minutes: number }[];
  lecture: { sens: number | null; thermometre: string | null; mouvement: number | null; unite: string | null; phrase: string };
  presse: { titre: string; source: string; lien: string; quand: string }[];
  resume: string;
  resume_communique: string | null;
  maj: string;
  definitif: boolean;
}

export interface FicheMacro extends AnnonceMacro {
  explication: string | null;
  restrictive: string | null;
  type: "decision" | "statistique" | "discours" | null;
  resultat: ResultatMacro | null;
  impacts_vous: ImpactMacro[];
  impacts_reference: ImpactMacro[];
  thermometre: string | null;
}

export const macroAPI = {
  agenda: (p: { jours?: number; passe?: number; importance?: "Low" | "Medium" | "High"; toutes?: boolean } = {}) => {
    const q = new URLSearchParams();
    if (p.jours) q.set("jours", String(p.jours));
    if (p.passe != null) q.set("passe", String(p.passe));
    if (p.importance) q.set("importance", p.importance);
    if (p.toutes) q.set("toutes", "true");
    return fetchAPI<{ evenements: AnnonceMacro[]; mes_actifs: { symbole: string; nom: string }[]; devises: string[] | null }>(
      `/api/macro/agenda?${q}`);
  },
  evenement: (id: number) => fetchAPI<FicheMacro>(`/api/macro/evenement/${id}`),
  actif: (symbol: string) =>
    fetchAPI<{ symbole: string; nom: string; sensibilites: Record<"FED" | "BCE", ImpactMacro>; prochaines: (AnnonceMacro & { sens_si_restrictive: number })[] }>(
      `/api/macro/actif/${encodeURIComponent(symbol)}`),
};
