"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Target,
  Zap,
  ArrowRight,
  Loader2,
  Star,
  StarOff,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUpIcon,
  Gauge,
  LineChart,
  Calendar,
  Globe,
  Shield,
  Clock,
  DollarSign,
  PieChart,
  Briefcase,
  Eye,
  TrendingUp as TrendUp,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Lightbulb,
  BookOpen,
  Newspaper,
  ChevronDown,
  ChevronUp,
  Flame,
  Sparkles,
  Brain,
  CircleDot,
  AlertCircle,
  Plus,
  RefreshCw,
  Timer,
} from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";
import { analysisAPI, favoritesAPI, aiAPI, marketAPI, Analysis } from "@/lib/api";
import { getAssetInfo, getAssetLogo } from "@/lib/assetInfo";
import { useFormatCurrency, useFormatPrice, useSettings } from "@/lib/SettingsContext";
import { authHeaders } from "@/lib/auth";
import PremiumChart from "@/components/PremiumChart";
import { TopLoadingBar } from "@/components/ui/TopLoadingBar";

export default function AnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formatCurrency = useFormatCurrency();
  const formatPriceHook = useFormatPrice();
  const { settings } = useSettings();

  const [symbol, setSymbol] = useState(searchParams.get("symbol") || "");
  // Alias: format a market price in the symbol's native currency
  const formatPrice = (v: number) => formatPriceHook(v, symbol);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("symbol") || "");
  const [suggestions, setSuggestions] = useState<{symbol: string; name: string; exchange: string; type: string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const [timeframe, setTimeframe] = useState("1d");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["main"]));
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  const [requestAssetType, setRequestAssetType] = useState("stock");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0); // seconds, 0=off
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentSymbolRef = useRef<string>("");

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Auto-load if symbol in URL
  useEffect(() => {
    const urlSymbol = searchParams.get("symbol");
    if (urlSymbol) {
      setSymbol(urlSymbol);
      handleSearch(urlSymbol);
    }
  }, [searchParams]);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSuggestions([]); return; }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`, {
        headers: authHeaders() as HeadersInit,
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.results || []);
        if (searchContainerRef.current) {
          setDropdownRect(searchContainerRef.current.getBoundingClientRect());
        }
        setShowSuggestions(true);
      }
    } catch { /* ignore */ } finally {
      setIsSearching(false);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setSearchQuery(value);
    // If it looks like a pure symbol (all caps, no spaces) update symbol directly too
    if (/^[A-Z0-9.\-^=]+$/.test(value.toUpperCase()) && !value.includes(' ')) {
      setSymbol(value.toUpperCase());
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const handleSelectSuggestion = (s: { symbol: string; name: string }) => {
    setSymbol(s.symbol);
    setSearchQuery(`${s.symbol} – ${s.name}`);
    setSuggestions([]);
    setShowSuggestions(false);
    handleSearch(s.symbol);
  };

  const handleSearch = async (searchSymbol?: string, silent = false) => {
    const s = (searchSymbol || symbol).trim().toUpperCase();
    if (!s) return;

    if (!silent) {
      setIsLoading(true);
      setError("");
      setAiInsight(null);
    }
    currentSymbolRef.current = s;

    try {
      const data = await analysisAPI.analyze(s, timeframe);
      setAnalysis(data);
      setLastUpdated(new Date());

      // Check if favorite (only on explicit search, not silent refresh)
      if (!silent) {
        const favCheck = await favoritesAPI.checkFavorite(s);
        setIsFavorite(favCheck.is_favorite);
      }
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "Erreur d'analyse");
        setAnalysis(null);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }
    if (autoRefreshInterval > 0 && currentSymbolRef.current) {
      autoRefreshRef.current = setInterval(() => {
        if (currentSymbolRef.current) {
          handleSearch(currentSymbolRef.current, true);
        }
      }, autoRefreshInterval * 1000);
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefreshInterval]);

  const loadAIInsight = async (sym: string, _data: Analysis): Promise<void> => {
    setIsLoadingAI(true);
    try {
      // Use the premium quick-analysis endpoint which fetches full yfinance data
      // (fundamentals, analyst consensus, news, earnings, advanced indicators)
      const response = await aiAPI.quickAnalysis(sym, settings.tradingStyle, settings.riskLevel);
      setAiInsight(response.analysis);
    } catch (err) {
      console.error("Error loading AI insight:", err);
      throw err;
    } finally {
      setIsLoadingAI(false);
    }
  };

  const toggleFavorite = async () => {
    if (!analysis) return;
    const prev = isFavorite;
    setIsFavorite(!prev); // optimistic update
    try {
      if (prev) {
        await favoritesAPI.removeFavorite(analysis.symbol);
      } else {
        await favoritesAPI.addFavorite(analysis.symbol);
      }
    } catch (error) {
      setIsFavorite(prev); // revert on error
      console.error("Error toggling favorite:", error);
    }
  };

  const handleRequestAsset = async () => {
    if (!symbol.trim()) return;
    setIsSubmittingRequest(true);
    try {
      await marketAPI.requestAsset({
        symbol: symbol.trim().toUpperCase(),
        asset_type: requestAssetType,
        reason: requestReason || undefined,
      });
      setRequestSuccess(true);
      setShowRequestForm(false);
      setRequestReason("");
    } catch (err: any) {
      setError(err.message || "Erreur lors de la demande");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <>
      <TopLoadingBar isLoading={isLoading || isLoadingAI} />
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Search */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4">Analyse IA</h2>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative" ref={searchContainerRef}>
            {isSearching
              ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
              : <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            }
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) {
                  if (searchContainerRef.current) setDropdownRect(searchContainerRef.current.getBoundingClientRect());
                  setShowSuggestions(true);
                }
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Symbole ou nom (ex: AAPL, Air Liquide, Bitcoin…)"
              className="w-full input pl-11 text-lg"
              onKeyDown={(e) => {
                if (e.key === "Enter") { setShowSuggestions(false); handleSearch(); }
                if (e.key === "Escape") setShowSuggestions(false);
              }}
            />
            {/* Suggestions dropdown — rendu via portal pour passer au-dessus de tous les stacking contexts */}
            {showSuggestions && suggestions.length > 0 && dropdownRect && typeof document !== "undefined" && createPortal(
              <div
                style={{
                  position: "fixed",
                  top: dropdownRect.bottom + 4,
                  left: dropdownRect.left,
                  width: dropdownRect.width,
                  zIndex: 9999,
                }}
                className="glass-card border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                {suggestions.map((s) => (
                  <button
                    key={s.symbol}
                    onMouseDown={() => handleSelectSuggestion(s)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors text-left border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-primary text-sm min-w-[80px]">{s.symbol}</span>
                      <span className="text-sm text-slate-300 truncate max-w-[200px]">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-xs text-slate-500">{s.exchange}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-slate-400">{s.type === 'EQUITY' ? 'Action' : s.type === 'ETF' ? 'ETF' : s.type === 'CRYPTOCURRENCY' ? 'Crypto' : s.type === 'INDEX' ? 'Indice' : s.type}</span>
                    </div>
                  </button>
                ))}
              </div>,
              document.body
            )}
          </div>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="input w-full md:w-32"
          >
            <option value="5m">5 min</option>
            <option value="15m">15 min</option>
            <option value="1h">1 heure</option>
            <option value="4h">4 heures</option>
            <option value="1d">1 jour</option>
          </select>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSearch()}
            disabled={isLoading || !symbol.trim()}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Analyser
          </motion.button>
        </div>
      </div>

      {/* Error with Request Asset Option */}
      {error && (
        <div className="glass-card p-6">
          <div className="flex items-start gap-3 text-loss mb-4">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">{error}</p>
              <p className="text-sm text-muted-foreground mt-1">
                L'actif "{symbol}" n'est pas disponible ou n'existe pas.
              </p>
            </div>
          </div>

          {requestSuccess ? (
            <div className="p-4 rounded-xl bg-profit/10 border border-profit/30 text-profit">
              <p className="font-medium">Demande envoyee avec succes!</p>
              <p className="text-sm mt-1">
                Un administrateur examinera votre demande d'ajout de {symbol}.
              </p>
            </div>
          ) : !showRequestForm ? (
            <button
              onClick={() => setShowRequestForm(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Demander l'ajout de cet actif
            </button>
          ) : (
            <div className="space-y-4 p-4 rounded-xl bg-white/5">
              <h3 className="font-semibold">Demander l'ajout de "{symbol}"</h3>

              <div>
                <label className="text-sm text-muted-foreground">Type d'actif</label>
                <select
                  value={requestAssetType}
                  onChange={(e) => setRequestAssetType(e.target.value)}
                  className="w-full input mt-1"
                >
                  <option value="stock">Action</option>
                  <option value="crypto">Crypto-monnaie</option>
                  <option value="etf">ETF</option>
                  <option value="forex">Forex</option>
                  <option value="commodity">Matière première</option>
                  <option value="index">Indice</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Raison (optionnel)</label>
                <textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Pourquoi souhaitez-vous suivre cet actif?"
                  className="w-full input mt-1 min-h-[80px]"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRequestAsset}
                  disabled={isSubmittingRequest}
                  className="btn-primary flex items-center gap-2"
                >
                  {isSubmittingRequest ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  Envoyer la demande
                </button>
                <button
                  onClick={() => setShowRequestForm(false)}
                  className="btn-ghost"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Refresh controls */}
      {analysis && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {lastUpdated && (
              <>
                <Timer className="w-3.5 h-3.5" />
                <span>Mis à jour {Math.floor((Date.now() - lastUpdated.getTime()) / 1000) < 5 ? "à l'instant" : `il y a ${Math.floor((Date.now() - lastUpdated.getTime()) / 1000)}s`}</span>
              </>
            )}
            {autoRefreshInterval > 0 && (
              <span className="text-profit">· Auto-refresh {autoRefreshInterval}s</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSearch(currentSymbolRef.current || symbol, false)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
              Actualiser
            </button>
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs border border-white/10 text-muted-foreground cursor-pointer"
            >
              <option value={0}>Auto-refresh : Off</option>
              <option value={15}>Toutes les 15s</option>
              <option value={30}>Toutes les 30s</option>
              <option value={60}>Toutes les 1 min</option>
              <option value={300}>Toutes les 5 min</option>
            </select>
          </div>
        </div>
      )}

      {/* Results */}
      {analysis && (
        <>
          {/* 1. Asset Header */}
          <AssetHeader analysis={analysis} isFavorite={isFavorite} toggleFavorite={toggleFavorite} formatCurrency={formatPrice} />

          {/* 2. Score cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main score card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-6 text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-radial from-primary/10 to-transparent" />
              <div className="relative">

                <p className="text-sm text-muted-foreground mb-2">Score Global</p>
                <div className="w-32 h-32 mx-auto mb-4 relative">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-white/10"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="url(#scoreGradient)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(analysis.score.total / 100) * 352} 352`}
                    />
                    <defs>
                      <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#22c55e" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-bold">{analysis.score.total}</span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-2xl">{analysis.signal.emoji}</span>
                  <span className={cn(
                    "text-xl font-bold",
                    analysis.signal.text.includes("BUY") ? "text-profit" :
                    analysis.signal.text.includes("SELL") ? "text-loss" : "text-warning"
                  )}>
                    {analysis.signal.text}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Tendance: <span className={cn(
                    analysis.trend === "BULLISH" ? "text-profit" :
                    analysis.trend === "BEARISH" ? "text-loss" : "text-warning"
                  )}>{analysis.trend}</span>
                </p>
              </div>
            </motion.div>

            {/* Score breakdown */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6"
            >
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Detail du Score
              </h3>
              <div className="space-y-4">
                <ScoreBar label="Technique" score={analysis.score.technical} />
                <ScoreBar label="Volume" score={analysis.score.volume} />
                <ScoreBar label="Momentum" score={analysis.score.momentum} />
              </div>
            </motion.div>

            {/* Price info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6"
            >
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Prix & Niveaux
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-muted-foreground">Prix actuel</span>
                  <div className="text-right">
                    <span className="font-bold text-lg">{formatPrice(analysis.price.current)}</span>
                    <span className={cn(
                      "ml-2 text-sm",
                      analysis.price.change >= 0 ? "text-profit" : "text-loss"
                    )}>
                      {formatPercent(analysis.price.change)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Resistance</span>
                  <span className="text-loss font-semibold">{formatCurrency(analysis.levels.resistance)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Pivot</span>
                  <span className="font-semibold">{formatCurrency(analysis.levels.pivot)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Support</span>
                  <span className="text-profit font-semibold">{formatCurrency(analysis.levels.support)}</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* 3. Premium Chart */}
          <PremiumChart symbol={analysis.symbol} timeframe={timeframe} />

          {/* 4. AI Insight */}
          <AIInsightSection
            aiInsight={aiInsight}
            isLoading={isLoadingAI}
            symbol={analysis.symbol}
            tradingStyle={settings.tradingStyle}
            riskLevel={settings.riskLevel}
            onReload={() => loadAIInsight(analysis.symbol, analysis)}
          />

          {/* Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6"
          >
            <h3 className="font-semibold mb-4">Indicateurs Techniques</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <IndicatorCard
                name="RSI (14)"
                value={analysis.indicators.rsi.value.toFixed(1)}
                signal={analysis.indicators.rsi.signal as any}
                tooltip={analysis.indicators.rsi.value < 30 ? "Survendu — rebond potentiel" : analysis.indicators.rsi.value > 70 ? "Suracheté — prudence" : "Zone neutre"}
              />
              <IndicatorCard
                name="MACD"
                value={analysis.indicators.macd.value.toFixed(2)}
                signal={analysis.indicators.macd.signal as any}
                tooltip={`Histogramme: ${analysis.indicators.macd.histogram.toFixed(4)} — ${analysis.indicators.macd.signal === "bullish" ? "momentum haussier" : "momentum baissier"}`}
              />
              <IndicatorCard
                name="EMA 20"
                value={formatCurrency(analysis.indicators.ema.ema20)}
                signal={analysis.price.current > analysis.indicators.ema.ema20 ? "bullish" : "bearish"}
                tooltip={analysis.price.current > analysis.indicators.ema.ema20 ? "Prix au-dessus de l'EMA20 — tendance court terme haussière" : "Prix en-dessous de l'EMA20 — pression baissière CT"}
              />
              <IndicatorCard
                name="EMA 50"
                value={formatCurrency(analysis.indicators.ema.ema50)}
                signal={analysis.price.current > analysis.indicators.ema.ema50 ? "bullish" : "bearish"}
                tooltip={analysis.price.current > analysis.indicators.ema.ema50 ? "Prix au-dessus de l'EMA50 — tendance MT haussière" : "Prix en-dessous de l'EMA50 — pression baissière MT"}
              />
              {analysis.indicators.adx && (
                <IndicatorCard
                  name="ADX"
                  value={analysis.indicators.adx.value.toFixed(1)}
                  signal={analysis.indicators.adx.value > 25 ? (analysis.indicators.adx.plus_di > analysis.indicators.adx.minus_di ? "bullish" : "bearish") : "neutral"}
                  tooltip={`Force de tendance: ${analysis.indicators.adx.value > 50 ? "Très forte" : analysis.indicators.adx.value > 25 ? "Forte" : analysis.indicators.adx.value > 15 ? "Modérée" : "Faible"} — DI+: ${analysis.indicators.adx.plus_di.toFixed(1)} / DI-: ${analysis.indicators.adx.minus_di.toFixed(1)}`}
                />
              )}
              {analysis.indicators.stochastic && (
                <IndicatorCard
                  name="Stoch %K"
                  value={`${analysis.indicators.stochastic.k.toFixed(1)} / ${analysis.indicators.stochastic.d.toFixed(1)}`}
                  signal={analysis.indicators.stochastic.signal as any}
                  tooltip={`%K: ${analysis.indicators.stochastic.k.toFixed(1)} / %D: ${analysis.indicators.stochastic.d.toFixed(1)} — ${analysis.indicators.stochastic.k < 20 ? "Zone de survente" : analysis.indicators.stochastic.k > 80 ? "Zone de surachat" : "Zone neutre"}`}
                />
              )}
              {analysis.indicators.bollinger.percent_b !== undefined && (
                <IndicatorCard
                  name="BB %B"
                  value={`${analysis.indicators.bollinger.percent_b.toFixed(1)}%`}
                  signal={analysis.indicators.bollinger.percent_b > 80 ? "bearish" : analysis.indicators.bollinger.percent_b < 20 ? "bullish" : "neutral"}
                  tooltip={`Position dans les Bandes de Bollinger: 0%=bande basse, 100%=bande haute — ${analysis.indicators.bollinger.percent_b > 100 ? "Au-dessus des bandes" : analysis.indicators.bollinger.percent_b < 0 ? "En-dessous des bandes" : "Dans les bandes"}`}
                />
              )}
              <IndicatorCard
                name="ATR"
                value={analysis.indicators.atr.toFixed(2)}
                signal="neutral"
                tooltip={`Volatilité moyenne sur 14 jours. Stop-loss suggéré: ${(analysis.indicators.atr * 1.5).toFixed(2)} (1.5x ATR)`}
              />
              <IndicatorCard
                name="Volume"
                value={`${analysis.indicators.volume_ratio.toFixed(2)}x`}
                signal={analysis.indicators.volume_ratio > 1.5 ? "bullish" : analysis.indicators.volume_ratio < 0.7 ? "bearish" : "neutral"}
                tooltip={`Volume actuel / volume moyen 20j. ${analysis.indicators.volume_ratio > 1.5 ? "Volume élevé — signal fort" : analysis.indicators.volume_ratio < 0.7 ? "Volume faible — signal peu fiable" : "Volume normal"}`}
              />
            </div>
          </motion.div>

          {/* 5. Suggestion de Trade */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6"
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Suggestion de Trade
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-profit/10 rounded-xl border border-profit/20">
                <p className="text-sm text-muted-foreground mb-1">Take Profit</p>
                <p className="text-xl font-bold text-profit">{formatCurrency(analysis.risk.suggested_tp)}</p>
              </div>
              <div className="p-4 bg-loss/10 rounded-xl border border-loss/20">
                <p className="text-sm text-muted-foreground mb-1">Stop Loss</p>
                <p className="text-xl font-bold text-loss">{formatCurrency(analysis.risk.suggested_sl)}</p>
              </div>
              <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">Risk/Reward</p>
                <p className="text-xl font-bold text-primary">1:{analysis.risk.risk_reward}</p>
              </div>
            </div>
            <Link href={`/trading?symbol=${analysis.symbol}`}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-6 btn-primary w-full flex items-center justify-center gap-2"
              >
                Ouvrir une Position
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </Link>
          </motion.div>

          {/* 6. Évaluation des risques */}
          <RiskAssessmentSection analysis={analysis} formatCurrency={formatPrice} />

          {/* 7. Analyse détaillée */}
          <DetailedAnalysis analysis={analysis} formatCurrency={formatPrice} />

          {/* 8. Fibonacci + Range 52 semaines */}
          {analysis.fibonacci && (
            <FibonacciSection analysis={analysis} formatCurrency={formatPrice} />
          )}
          {analysis.fundamentals?.["52w_high"] && analysis.fundamentals?.["52w_low"] && (
            <WeekRangeSection analysis={analysis} formatCurrency={formatPrice} />
          )}

          {/* 9. Contexte de marché */}
          <MarketContextSection analysis={analysis} formatCurrency={formatPrice} />

          {/* 10. Analyse fondamentale */}
          {analysis.fundamentals && (
            <FundamentalAnalysisEnhanced analysis={analysis} formatCurrency={formatPrice} />
          )}

          {/* 11. Performance & Objectifs de prix */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PerformanceSection analysis={analysis} />
            <PriceTargets analysis={analysis} formatCurrency={formatPrice} />
          </div>

          {/* 12. Thèse d'investissement */}
          <InvestmentThesisSection analysis={analysis} formatCurrency={formatPrice} />

          {/* 13. Stratégies de trading */}
          <TradingStrategiesSection analysis={analysis} formatCurrency={formatPrice} />

          {/* 14. Comparaison sectorielle */}
          <SectorComparisonSection analysis={analysis} />

          {/* 15. Actualités */}
          {analysis.news && analysis.news.length > 0 && (
            <NewsSentimentSection news={analysis.news} symbol={analysis.symbol} />
          )}

          {/* 16. Description entreprise */}
          {analysis.company?.description && (
            <CompanyDescription analysis={analysis} />
          )}

          {/* 17. Section éducative */}
          <EducationalSection analysis={analysis} />
        </>
      )}

      {/* Skeleton loading */}
      {isLoading && (
        <div className="space-y-6 animate-pulse">
          <div className="glass-card p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-white/10" />
              <div className="space-y-2 flex-1">
                <div className="h-5 w-32 bg-white/10 rounded-lg" />
                <div className="h-3 w-24 bg-white/5 rounded-lg" />
              </div>
              <div className="h-8 w-20 bg-white/10 rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl" />)}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card p-6 h-48 bg-white/5" />
            <div className="glass-card p-6 h-48 bg-white/5 lg:col-span-2" />
          </div>
          <div className="glass-card h-64 bg-white/5" />
        </div>
      )}

      {/* Empty state */}
      {!analysis && !isLoading && !error && (
        <div className="glass-card p-12 text-center">
          <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            Entrez un symbole pour lancer l'analyse IA
          </p>
        </div>
      )}
    </motion.div>
    </>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const getColor = () => {
    if (score >= 75) return "from-profit to-green-400";
    if (score >= 60) return "from-green-400 to-emerald-400";
    if (score >= 40) return "from-warning to-yellow-400";
    return "from-loss to-red-400";
  };

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold">{score}/100</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={cn("h-full rounded-full bg-gradient-to-r", getColor())}
        />
      </div>
    </div>
  );
}

function IndicatorCard({
  name,
  value,
  signal,
  tooltip,
}: {
  name: string;
  value: string;
  signal: "bullish" | "bearish" | "neutral" | "oversold" | "overbought";
  tooltip?: string;
}) {
  const normalizedSignal =
    signal === "oversold" ? "bullish" :
    signal === "overbought" ? "bearish" : signal;

  const signalColors = {
    bullish: "border-profit/30 bg-profit/10",
    bearish: "border-loss/30 bg-loss/10",
    neutral: "border-white/10 bg-white/5",
  };

  const signalIcons = {
    bullish: <TrendingUp className="w-4 h-4 text-profit" />,
    bearish: <TrendingDown className="w-4 h-4 text-loss" />,
    neutral: <Activity className="w-4 h-4 text-muted-foreground" />,
  };

  return (
    <div className={cn("p-4 rounded-xl border", signalColors[normalizedSignal])} title={tooltip}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{name}</span>
        {signalIcons[normalizedSignal]}
      </div>
      <p className="font-bold">{value}</p>
      {tooltip && <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-tight">{tooltip}</p>}
    </div>
  );
}

function FibonacciSection({ analysis, formatCurrency }: { analysis: Analysis; formatCurrency: (v: number) => string }) {
  const fib = analysis.fibonacci!;
  const price = analysis.price.current;
  const fibEntries = Object.entries(fib.levels).sort((a, b) => b[1] - a[1]); // descending price

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-1 flex items-center gap-2">
        <Scale className="w-5 h-5 text-primary" />
        Niveaux de Fibonacci
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Calculés sur le plus haut ({formatCurrency(fib.high)}) et le plus bas ({formatCurrency(fib.low)}) des {Math.min(60, 60)} dernières séances
      </p>
      <div className="space-y-2">
        {fibEntries.map(([level, lvlPrice]) => {
          const isNearPrice = Math.abs(lvlPrice - price) / price < 0.015; // within 1.5%
          const isPriceAbove = price >= lvlPrice;
          return (
            <div
              key={level}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg transition-colors",
                isNearPrice ? "bg-primary/20 border border-primary/40" : "bg-white/5"
              )}
            >
              <span className={cn(
                "text-xs font-mono w-12 text-right",
                level === "0" || level === "100" ? "text-muted-foreground" : "text-primary"
              )}>
                {level}%
              </span>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    level === "61.8" || level === "38.2" ? "bg-primary" :
                    level === "50.0" ? "bg-warning" : "bg-white/30"
                  )}
                  style={{ width: `${100 - parseFloat(level)}%` }}
                />
              </div>
              <span className={cn(
                "font-semibold text-sm w-24 text-right",
                isNearPrice ? "text-primary" : isPriceAbove ? "text-profit/80" : "text-loss/80"
              )}>
                {formatCurrency(lvlPrice)}
              </span>
              {isNearPrice && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/30 text-primary">← Prix actuel</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        💡 Les niveaux 38.2% et 61.8% sont les plus importants. Ils agissent souvent comme supports ou résistances lors d&apos;une correction.
      </p>
    </motion.div>
  );
}

function WeekRangeSection({ analysis, formatCurrency }: { analysis: Analysis; formatCurrency: (v: number) => string }) {
  const low52 = analysis.fundamentals!["52w_low"]!;
  const high52 = analysis.fundamentals!["52w_high"]!;
  const price = analysis.price.current;
  const rangeSize = high52 - low52;
  const position = rangeSize > 0 ? Math.min(100, Math.max(0, ((price - low52) / rangeSize) * 100)) : 50;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Gauge className="w-5 h-5 text-primary" />
        Position 52 semaines
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Plus bas 52s: <span className="text-loss font-semibold">{formatCurrency(low52)}</span></span>
          <span>Plus haut 52s: <span className="text-profit font-semibold">{formatCurrency(high52)}</span></span>
        </div>
        <div className="relative h-6 bg-white/10 rounded-full overflow-visible">
          {/* gradient track */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-loss/40 via-warning/40 to-profit/40" />
          {/* price marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
            style={{ left: `${position}%` }}
          >
            <div className="w-5 h-5 rounded-full bg-white border-2 border-primary shadow-lg shadow-primary/50 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">0%</span>
          <div className="text-center">
            <p className="text-lg font-bold">{formatCurrency(price)}</p>
            <p className="text-xs text-muted-foreground">
              {position.toFixed(0)}% du range annuel — {position > 80 ? "Près du sommet annuel" : position < 20 ? "Près du plancher annuel" : "Zone médiane"}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">100%</span>
        </div>
      </div>
    </motion.div>
  );
}

// Asset Header with logo and name
function AssetHeader({
  analysis,
  isFavorite,
  toggleFavorite,
  formatCurrency
}: {
  analysis: Analysis;
  isFavorite: boolean;
  toggleFavorite: () => void;
  formatCurrency: (value: number) => string;
}) {
  const assetInfo = getAssetInfo(analysis.symbol);
  const logoUrl = getAssetLogo(analysis.symbol);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden">
              <img
                src={logoUrl}
                alt={assetInfo.name}
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement!.innerHTML = `<span class="font-bold text-2xl">${analysis.symbol.slice(0, 2)}</span>`;
                }}
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
              <span className="font-bold text-2xl text-white">{analysis.symbol.slice(0, 2)}</span>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{assetInfo.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-muted-foreground">{analysis.symbol}</span>
              {assetInfo.sector && (
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs">
                  {assetInfo.sector}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-3xl font-bold">{formatCurrency(analysis.price.current)}</p>
            <p className={cn(
              "text-lg font-semibold",
              analysis.price.change >= 0 ? "text-profit" : "text-loss"
            )}>
              {formatPercent(analysis.price.change)}
            </p>
          </div>
          <button
            onClick={toggleFavorite}
            className="p-3 rounded-xl hover:bg-white/10 transition-colors"
          >
            {isFavorite ? (
              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            ) : (
              <StarOff className="w-6 h-6 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Detailed Analysis with explanations
function DetailedAnalysis({ analysis, formatCurrency }: { analysis: Analysis; formatCurrency: (value: number) => string }) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const toggleModule = (module: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(module)) {
        newSet.delete(module);
      } else {
        newSet.add(module);
      }
      return newSet;
    });
  };

  // Educational content for each indicator
  const indicatorEducation = {
    rsi: {
      title: "RSI (Relative Strength Index)",
      formula: "RSI = 100 - (100 / (1 + RS)) ou RS = Moyenne gains / Moyenne pertes",
      basics: [
        "Le RSI mesure la vitesse et l'amplitude des mouvements de prix recents",
        "Il oscille entre 0 et 100",
        "Periode standard: 14 (parametre par defaut de Wilder)"
      ],
      interpretation: [
        { condition: "RSI < 30", meaning: "Zone de survente - Signal d'achat potentiel" },
        { condition: "RSI > 70", meaning: "Zone de surachat - Signal de vente potentiel" },
        { condition: "RSI ~ 50", meaning: "Zone neutre - Pas de signal extrême" }
      ],
      advanced: [
        "Les divergences RSI/Prix sont des signaux tres fiables",
        "En tendance forte, utilisez 80/20 au lieu de 70/30",
        "Le RSI peut rester en zone extrême longtemps en tendance"
      ],
      tips: "Ne jamais trader uniquement sur les niveaux 30/70. Confirmez toujours avec la tendance generale."
    },
    macd: {
      title: "MACD (Moving Average Convergence Divergence)",
      formula: "MACD = EMA(12) - EMA(26) | Signal = EMA(9) du MACD",
      basics: [
        "Le MACD montre la relation entre deux moyennes mobiles exponentielles",
        "Compose de: Ligne MACD, Ligne Signal, Histogramme",
        "Créé par Gerald Appel en 1979"
      ],
      interpretation: [
        { condition: "MACD > Signal", meaning: "Signal haussier - Momentum positif" },
        { condition: "MACD < Signal", meaning: "Signal baissier - Momentum négatif" },
        { condition: "MACD > 0", meaning: "Tendance haussière dominante" }
      ],
      advanced: [
        "Les croisements de la ligne zéro sont plus significatifs",
        "L'histogramme prédit souvent les croisements à venir",
        "Les divergences MACD/Prix precedent les retournements"
      ],
      tips: "L'histogramme est predictif - quand il diminue, le croisement approche. Surveillez-le!"
    },
    bollinger: {
      title: "Bandes de Bollinger",
      formula: "Bande Haute = SMA(20) + 2σ | Bande Basse = SMA(20) - 2σ",
      basics: [
        "Les bandes encadrent le prix avec des niveaux de deviation standard",
        "Elles s'adaptent automatiquement à la volatilité",
        "95% du temps, le prix reste dans les bandes"
      ],
      interpretation: [
        { condition: "Prix > Bande haute", meaning: "Potentiel surachat - Extension du mouvement" },
        { condition: "Prix < Bande basse", meaning: "Potentiel survente - Rebond possible" },
        { condition: "Bandes resserrees", meaning: "Squeeze - Explosion a venir" }
      ],
      advanced: [
        "Le Squeeze (bandes etroites) precede souvent un grand mouvement",
        "Utilisez avec le volume pour confirmer les cassures",
        "Les touches de bande ne sont pas des signaux automatiques"
      ],
      tips: "Le meilleur signal: Squeeze + Cassure avec volume = Mouvement explosif probable!"
    },
    volume: {
      title: "Analyse du Volume",
      formula: "Volume Ratio = Volume Actuel / Moyenne Volume (20 periodes)",
      basics: [
        "Le volume mesure l'activité et l'intérêt du marché",
        "Un mouvement avec volume est plus fiable",
        "Le volume confirme ou infirme les mouvements de prix"
      ],
      interpretation: [
        { condition: "Volume > 1.5x moyenne", meaning: "Fort interet - Mouvement significatif" },
        { condition: "Volume < 0.7x moyenne", meaning: "Faible interet - Mouvement suspect" },
        { condition: "Volume normal", meaning: "Activite standard du marche" }
      ],
      advanced: [
        "Volume croissant en tendance = Tendance saine",
        "Volume decroissant en tendance = Essoufflement",
        "Divergence prix/volume = Signal de retournement"
      ],
      tips: "Regle d'or: Ne jamais faire confiance a un mouvement sans volume!"
    },
    trend: {
      title: "Analyse de Tendance (EMA)",
      formula: "EMA = Prix × k + EMA(hier) × (1-k) ou k = 2/(n+1)",
      basics: [
        "Les EMAs donnent plus de poids aux prix recents",
        "EMA20 pour le court terme, EMA50 pour le moyen terme",
        "Prix > EMAs = Tendance haussière | Prix < EMAs = Tendance baissière"
      ],
      interpretation: [
        { condition: "Prix > EMA20 > EMA50", meaning: "Tendance haussière forte" },
        { condition: "Prix < EMA20 < EMA50", meaning: "Tendance baissière forte" },
        { condition: "EMAs entremelees", meaning: "Pas de tendance claire (range)" }
      ],
      advanced: [
        "Golden Cross: EMA50 croise EMA200 vers le haut = Signal bullish majeur",
        "Death Cross: EMA50 croise EMA200 vers le bas = Signal bearish majeur",
        "Les pullbacks vers l'EMA20 sont des opportunités d'entrée"
      ],
      tips: "Tradez toujours DANS le sens de la tendance. 'Trend is your friend!'"
    }
  };

  const getRSIInterpretation = () => {
    const rsi = analysis.indicators.rsi.value;
    if (rsi < 30) {
      return {
        status: "oversold",
        icon: <CheckCircle className="w-5 h-5 text-profit" />,
        title: "Zone de survente",
        description: `Le RSI à ${rsi.toFixed(1)} indique que l'actif est survendu. Cela suggère un potentiel rebond haussier. Les acheteurs pourraient bientôt reprendre le contrôle.`,
        color: "text-profit",
        bgColor: "bg-profit/10 border-profit/20"
      };
    } else if (rsi > 70) {
      return {
        status: "overbought",
        icon: <AlertTriangle className="w-5 h-5 text-loss" />,
        title: "Zone de surachat",
        description: `Le RSI à ${rsi.toFixed(1)} indique que l'actif est suracheté. Une correction baissière est probable. Prudence recommandée pour les nouvelles positions longues.`,
        color: "text-loss",
        bgColor: "bg-loss/10 border-loss/20"
      };
    } else {
      return {
        status: "neutral",
        icon: <Activity className="w-5 h-5 text-primary" />,
        title: "Zone neutre",
        description: `Le RSI à ${rsi.toFixed(1)} se situe dans une zone neutre. Pas de signal extrême de surachat ou de survente. L'actif évolue normalement.`,
        color: "text-primary",
        bgColor: "bg-primary/10 border-primary/20"
      };
    }
  };

  const getMACDInterpretation = () => {
    const macd = analysis.indicators.macd;
    const isBullish = macd.histogram > 0;
    const crossingUp = macd.histogram > 0 && macd.value > macd.signal_line;

    if (crossingUp) {
      return {
        icon: <TrendingUp className="w-5 h-5 text-profit" />,
        title: "Signal haussier",
        description: `Le MACD (${macd.value.toFixed(4)}) est au-dessus de sa ligne de signal (${macd.signal_line.toFixed(4)}). L'histogramme positif confirme la dynamique haussière. Bon moment pour considérer des positions longues.`,
        color: "text-profit",
        bgColor: "bg-profit/10 border-profit/20"
      };
    } else {
      return {
        icon: <TrendingDown className="w-5 h-5 text-loss" />,
        title: "Signal baissier",
        description: `Le MACD (${macd.value.toFixed(4)}) est en dessous de sa ligne de signal (${macd.signal_line.toFixed(4)}). L'histogramme négatif indique une pression vendeuse. Prudence recommandée.`,
        color: "text-loss",
        bgColor: "bg-loss/10 border-loss/20"
      };
    }
  };

  const getBollingerInterpretation = () => {
    const bb = analysis.indicators.bollinger;
    const price = analysis.price.current;
    const position = bb.position;

    if (position === "upper") {
      return {
        icon: <AlertTriangle className="w-5 h-5 text-warning" />,
        title: "Proche de la bande supérieure",
        description: `Le prix (${formatCurrency(price)}) est proche ou au-dessus de la bande supérieure (${formatCurrency(bb.upper)}). Cela peut indiquer une surchauffe du marché. Un retour vers la moyenne (${formatCurrency(bb.middle)}) est possible.`,
        color: "text-warning",
        bgColor: "bg-warning/10 border-warning/20"
      };
    } else if (position === "lower") {
      return {
        icon: <CheckCircle className="w-5 h-5 text-profit" />,
        title: "Proche de la bande inferieure",
        description: `Le prix (${formatCurrency(price)}) est proche ou en dessous de la bande inferieure (${formatCurrency(bb.lower)}). Cela peut representer une opportunite d'achat. Un rebond vers la moyenne (${formatCurrency(bb.middle)}) est envisageable.`,
        color: "text-profit",
        bgColor: "bg-profit/10 border-profit/20"
      };
    } else {
      return {
        icon: <Activity className="w-5 h-5 text-primary" />,
        title: "Dans le canal",
        description: `Le prix (${formatCurrency(price)}) évolue entre les bandes de Bollinger (${formatCurrency(bb.lower)} - ${formatCurrency(bb.upper)}). Le marché est dans une phase normale avec une volatilité modérée.`,
        color: "text-primary",
        bgColor: "bg-primary/10 border-primary/20"
      };
    }
  };

  const getTrendInterpretation = () => {
    const trend = analysis.trend;
    const ema = analysis.indicators.ema;
    const price = analysis.price.current;

    if (trend === "BULLISH") {
      return {
        icon: <TrendingUp className="w-5 h-5 text-profit" />,
        title: "Tendance haussière",
        description: `Le prix (${formatCurrency(price)}) est au-dessus des moyennes mobiles EMA20 (${formatCurrency(ema.ema20)}) et EMA50 (${formatCurrency(ema.ema50)}). La structure du marché est haussière. Les corrections peuvent être des opportunités d'achat.`,
        color: "text-profit",
        bgColor: "bg-profit/10 border-profit/20"
      };
    } else if (trend === "BEARISH") {
      return {
        icon: <TrendingDown className="w-5 h-5 text-loss" />,
        title: "Tendance baissière",
        description: `Le prix (${formatCurrency(price)}) est en dessous des moyennes mobiles EMA20 (${formatCurrency(ema.ema20)}) et EMA50 (${formatCurrency(ema.ema50)}). La structure du marché est baissière. Évitez les positions longues jusqu'à un retournement confirmé.`,
        color: "text-loss",
        bgColor: "bg-loss/10 border-loss/20"
      };
    } else {
      return {
        icon: <Activity className="w-5 h-5 text-warning" />,
        title: "Tendance neutre / Consolidation",
        description: `Le prix oscille autour des moyennes mobiles sans direction claire. Le marché est en phase de consolidation. Attendez une cassure nette avant de prendre position.`,
        color: "text-warning",
        bgColor: "bg-warning/10 border-warning/20"
      };
    }
  };

  const getVolumeInterpretation = () => {
    const ratio = analysis.indicators.volume_ratio;

    if (ratio > 1.5) {
      return {
        icon: <BarChart3 className="w-5 h-5 text-profit" />,
        title: "Volume élevé",
        description: `Le volume actuel est ${ratio.toFixed(2)}x supérieur à la moyenne. Un fort volume confirme la validité du mouvement en cours. Les mouvements avec volume sont plus fiables.`,
        color: "text-profit",
        bgColor: "bg-profit/10 border-profit/20"
      };
    } else if (ratio < 0.7) {
      return {
        icon: <AlertTriangle className="w-5 h-5 text-warning" />,
        title: "Volume faible",
        description: `Le volume actuel est ${ratio.toFixed(2)}x inferieur a la moyenne. Un faible volume peut indiquer un manque de conviction. Les mouvements de prix sont moins fiables.`,
        color: "text-warning",
        bgColor: "bg-warning/10 border-warning/20"
      };
    } else {
      return {
        icon: <BarChart3 className="w-5 h-5 text-primary" />,
        title: "Volume normal",
        description: `Le volume actuel (${ratio.toFixed(2)}x la moyenne) est dans la norme. L'activité du marché est standard sans excès ni manque de liquidité.`,
        color: "text-primary",
        bgColor: "bg-primary/10 border-primary/20"
      };
    }
  };

  const rsiInfo = getRSIInterpretation();
  const macdInfo = getMACDInterpretation();
  const bbInfo = getBollingerInterpretation();
  const trendInfo = getTrendInterpretation();
  const volumeInfo = getVolumeInterpretation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-6 flex items-center gap-2 text-lg">
        <Info className="w-5 h-5 text-primary" />
        Analyse Detaillee
      </h3>

      <div className="space-y-4">
        {/* Trend Analysis - Interactive Module */}
        <div
          className={cn("p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01]", trendInfo.bgColor)}
          onClick={() => toggleModule('trend')}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              {trendInfo.icon}
              <div>
                <h4 className={cn("font-semibold", trendInfo.color)}>{trendInfo.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{trendInfo.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Cliquez pour en savoir +</span>
              {expandedModules.has('trend') ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
          {expandedModules.has('trend') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <div className="space-y-4">
                <div className="p-3 bg-white/5 rounded-lg">
                  <h5 className="text-sm font-semibold text-primary mb-2">{indicatorEducation.trend.title}</h5>
                  <p className="text-xs text-muted-foreground font-mono mb-2">{indicatorEducation.trend.formula}</p>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Les bases:</h6>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {indicatorEducation.trend.basics.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CircleDot className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Interpretation:</h6>
                  <div className="space-y-2">
                    {indicatorEducation.trend.interpretation.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <code className="px-2 py-0.5 bg-primary/20 text-primary rounded">{item.condition}</code>
                        <span className="text-muted-foreground">{item.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Techniques avancees:</h6>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {indicatorEducation.trend.advanced.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Sparkles className="w-3 h-3 mt-0.5 text-yellow-400 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs font-medium">{indicatorEducation.trend.tips}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* RSI Analysis - Interactive Module */}
        <div
          className={cn("p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01]", rsiInfo.bgColor)}
          onClick={() => toggleModule('rsi')}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              {rsiInfo.icon}
              <div>
                <h4 className={cn("font-semibold", rsiInfo.color)}>RSI: {rsiInfo.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{rsiInfo.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Cliquez pour en savoir +</span>
              {expandedModules.has('rsi') ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
          {expandedModules.has('rsi') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <div className="space-y-4">
                <div className="p-3 bg-white/5 rounded-lg">
                  <h5 className="text-sm font-semibold text-primary mb-2">{indicatorEducation.rsi.title}</h5>
                  <p className="text-xs text-muted-foreground font-mono mb-2">{indicatorEducation.rsi.formula}</p>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Les bases:</h6>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {indicatorEducation.rsi.basics.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CircleDot className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Interpretation:</h6>
                  <div className="space-y-2">
                    {indicatorEducation.rsi.interpretation.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <code className="px-2 py-0.5 bg-primary/20 text-primary rounded">{item.condition}</code>
                        <span className="text-muted-foreground">{item.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Techniques avancees:</h6>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {indicatorEducation.rsi.advanced.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Sparkles className="w-3 h-3 mt-0.5 text-yellow-400 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs font-medium">{indicatorEducation.rsi.tips}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* MACD Analysis - Interactive Module */}
        <div
          className={cn("p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01]", macdInfo.bgColor)}
          onClick={() => toggleModule('macd')}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              {macdInfo.icon}
              <div>
                <h4 className={cn("font-semibold", macdInfo.color)}>MACD: {macdInfo.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{macdInfo.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Cliquez pour en savoir +</span>
              {expandedModules.has('macd') ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
          {expandedModules.has('macd') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <div className="space-y-4">
                <div className="p-3 bg-white/5 rounded-lg">
                  <h5 className="text-sm font-semibold text-primary mb-2">{indicatorEducation.macd.title}</h5>
                  <p className="text-xs text-muted-foreground font-mono mb-2">{indicatorEducation.macd.formula}</p>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Les bases:</h6>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {indicatorEducation.macd.basics.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CircleDot className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Interpretation:</h6>
                  <div className="space-y-2">
                    {indicatorEducation.macd.interpretation.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <code className="px-2 py-0.5 bg-primary/20 text-primary rounded">{item.condition}</code>
                        <span className="text-muted-foreground">{item.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Techniques avancees:</h6>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {indicatorEducation.macd.advanced.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Sparkles className="w-3 h-3 mt-0.5 text-yellow-400 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs font-medium">{indicatorEducation.macd.tips}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Bollinger Analysis - Interactive Module */}
        <div
          className={cn("p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01]", bbInfo.bgColor)}
          onClick={() => toggleModule('bollinger')}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              {bbInfo.icon}
              <div>
                <h4 className={cn("font-semibold", bbInfo.color)}>Bollinger: {bbInfo.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{bbInfo.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Cliquez pour en savoir +</span>
              {expandedModules.has('bollinger') ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
          {expandedModules.has('bollinger') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <div className="space-y-4">
                <div className="p-3 bg-white/5 rounded-lg">
                  <h5 className="text-sm font-semibold text-primary mb-2">{indicatorEducation.bollinger.title}</h5>
                  <p className="text-xs text-muted-foreground font-mono mb-2">{indicatorEducation.bollinger.formula}</p>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Les bases:</h6>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {indicatorEducation.bollinger.basics.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CircleDot className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Interpretation:</h6>
                  <div className="space-y-2">
                    {indicatorEducation.bollinger.interpretation.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <code className="px-2 py-0.5 bg-primary/20 text-primary rounded">{item.condition}</code>
                        <span className="text-muted-foreground">{item.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Techniques avancees:</h6>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {indicatorEducation.bollinger.advanced.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Sparkles className="w-3 h-3 mt-0.5 text-yellow-400 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs font-medium">{indicatorEducation.bollinger.tips}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Volume Analysis - Interactive Module */}
        <div
          className={cn("p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01]", volumeInfo.bgColor)}
          onClick={() => toggleModule('volume')}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              {volumeInfo.icon}
              <div>
                <h4 className={cn("font-semibold", volumeInfo.color)}>{volumeInfo.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{volumeInfo.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Cliquez pour en savoir +</span>
              {expandedModules.has('volume') ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
          {expandedModules.has('volume') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <div className="space-y-4">
                <div className="p-3 bg-white/5 rounded-lg">
                  <h5 className="text-sm font-semibold text-primary mb-2">{indicatorEducation.volume.title}</h5>
                  <p className="text-xs text-muted-foreground font-mono mb-2">{indicatorEducation.volume.formula}</p>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Les bases:</h6>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {indicatorEducation.volume.basics.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CircleDot className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Interpretation:</h6>
                  <div className="space-y-2">
                    {indicatorEducation.volume.interpretation.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <code className="px-2 py-0.5 bg-primary/20 text-primary rounded">{item.condition}</code>
                        <span className="text-muted-foreground">{item.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Techniques avancees:</h6>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {indicatorEducation.volume.advanced.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Sparkles className="w-3 h-3 mt-0.5 text-yellow-400 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs font-medium">{indicatorEducation.volume.tips}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-primary" />
          Résumé de l'analyse
        </h4>
        <p className="text-sm text-muted-foreground">
          {analysis.score.total >= 75 ? (
            <>L'ensemble des indicateurs techniques convergent vers un signal <span className="text-profit font-semibold">fortement haussier</span>. Les conditions sont favorables pour une prise de position longue avec un ratio risque/rendement de 1:{analysis.risk.risk_reward}.</>
          ) : analysis.score.total >= 60 ? (
            <>Les indicateurs montrent une tendance <span className="text-profit font-semibold">modérément haussière</span>. Le marché présente des opportunités mais avec une conviction moins forte. Gérez votre risque avec attention.</>
          ) : analysis.score.total >= 40 ? (
            <>Le marché est actuellement en <span className="text-warning font-semibold">phase neutre</span>. Aucune direction claire ne se dégage. Il est préférable d'attendre un signal plus net avant de prendre position.</>
          ) : analysis.score.total >= 25 ? (
            <>Les indicateurs pointent vers une tendance <span className="text-loss font-semibold">modérément baissière</span>. Évitez les positions longues et considérez des stratégies de couverture.</>
          ) : (
            <>L'ensemble des signaux indiquent une <span className="text-loss font-semibold">forte pression vendeuse</span>. Il est fortement déconseillé de prendre des positions longues dans ces conditions.</>
          )}
        </p>
      </div>
    </motion.div>
  );
}

// Fundamental Analysis Section
function FundamentalAnalysis({ analysis, formatCurrency }: { analysis: Analysis; formatCurrency: (value: number) => string }) {
  const f = analysis.fundamentals;
  if (!f) return null;

  const formatLargeNumber = (num: number | undefined) => {
    if (!num) return "N/A";
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    return num.toLocaleString();
  };

  const formatPct = (num: number | undefined) => {
    if (num === undefined || num === null) return "N/A";
    return `${(num * 100).toFixed(2)}%`;
  };

  const getValueColor = (value: number | undefined, goodAbove: number, badBelow: number) => {
    if (value === undefined) return "text-muted-foreground";
    if (value >= goodAbove) return "text-profit";
    if (value <= badBelow) return "text-loss";
    return "text-warning";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-6 flex items-center gap-2 text-lg">
        <BarChart3 className="w-5 h-5 text-primary" />
        Analyse Fondamentale
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Market Cap */}
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Capitalisation</p>
          <p className="font-bold text-lg">{formatLargeNumber(f.market_cap)}</p>
        </div>

        {/* P/E Ratio */}
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">P/E Ratio</p>
          <p className={cn("font-bold text-lg", getValueColor(f.pe_ratio, 25, 10))}>
            {f.pe_ratio?.toFixed(2) || "N/A"}
          </p>
        </div>

        {/* Forward P/E */}
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Forward P/E</p>
          <p className="font-bold text-lg">{f.forward_pe?.toFixed(2) || "N/A"}</p>
        </div>

        {/* PEG Ratio */}
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">PEG Ratio</p>
          <p className={cn("font-bold text-lg", f.peg_ratio && f.peg_ratio < 1 ? "text-profit" : f.peg_ratio && f.peg_ratio > 2 ? "text-loss" : "")}>
            {f.peg_ratio?.toFixed(2) || "N/A"}
          </p>
        </div>

        {/* Revenue Growth */}
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Croissance CA</p>
          <p className={cn("font-bold text-lg", f.revenue_growth && f.revenue_growth > 0 ? "text-profit" : "text-loss")}>
            {formatPct(f.revenue_growth)}
          </p>
        </div>

        {/* Profit Margin */}
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Marge nette</p>
          <p className={cn("font-bold text-lg", f.profit_margin && f.profit_margin > 0.1 ? "text-profit" : "text-loss")}>
            {formatPct(f.profit_margin)}
          </p>
        </div>

        {/* ROE */}
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">ROE</p>
          <p className={cn("font-bold text-lg", f.roe && f.roe > 0.15 ? "text-profit" : "")}>
            {formatPct(f.roe)}
          </p>
        </div>

        {/* Dividend Yield */}
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Dividende</p>
          <p className="font-bold text-lg">{formatPct(f.dividend_yield)}</p>
        </div>

        {/* Debt/Equity */}
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Dette/Equity</p>
          <p className={cn("font-bold text-lg", f.debt_to_equity && f.debt_to_equity > 100 ? "text-loss" : "text-profit")}>
            {f.debt_to_equity?.toFixed(2) || "N/A"}
          </p>
        </div>

        {/* Beta */}
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Beta</p>
          <p className={cn("font-bold text-lg", f.beta && f.beta > 1.5 ? "text-warning" : "")}>
            {f.beta?.toFixed(2) || "N/A"}
          </p>
        </div>

        {/* 52W High */}
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Plus haut 52s</p>
          <p className="font-bold text-lg">{f["52w_high"] ? formatCurrency(f["52w_high"]) : "N/A"}</p>
        </div>

        {/* 52W Low */}
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Plus bas 52s</p>
          <p className="font-bold text-lg">{f["52w_low"] ? formatCurrency(f["52w_low"]) : "N/A"}</p>
        </div>
      </div>

      {/* Analyst Recommendation */}
      {f.recommendation && (
        <div className="mt-4 p-4 bg-white/5 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Recommandation des analystes</p>
              <p className={cn(
                "font-bold text-xl mt-1",
                f.recommendation.includes("buy") ? "text-profit" :
                f.recommendation.includes("sell") ? "text-loss" : "text-warning"
              )}>
                {f.recommendation.toUpperCase()}
              </p>
            </div>
            {f.num_analysts && (
              <p className="text-sm text-muted-foreground">{f.num_analysts} analystes</p>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Performance Section
function PerformanceSection({ analysis }: { analysis: Analysis }) {
  const p = analysis.performance;
  const v = analysis.volatility;

  const formatPct = (num: number | undefined | null) => {
    if (num === undefined || num === null) return "N/A";
    const sign = num >= 0 ? "+" : "";
    return `${sign}${num.toFixed(2)}%`;
  };

  const getColor = (num: number | undefined | null) => {
    if (num === undefined || num === null) return "text-muted-foreground";
    return num >= 0 ? "text-profit" : "text-loss";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        Performance Historique
      </h3>

      <div className="space-y-3">
        {[
          { label: "1 jour", value: p?.["1d"] },
          { label: "1 semaine", value: p?.["1w"] },
          { label: "1 mois", value: p?.["1m"] },
          { label: "3 mois", value: p?.["3m"] },
          { label: "6 mois", value: p?.["6m"] },
          { label: "YTD", value: p?.ytd },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <span className={cn("font-semibold", getColor(item.value))}>
              {formatPct(item.value)}
            </span>
          </div>
        ))}
      </div>

      {v && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-sm text-muted-foreground mb-2">Volatilite annualisee</p>
          <div className="flex gap-4">
            <div className="flex-1 p-2 bg-white/5 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">20 jours</p>
              <p className="font-semibold">{v["20d"]?.toFixed(1)}%</p>
            </div>
            {v["60d"] && (
              <div className="flex-1 p-2 bg-white/5 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">60 jours</p>
                <p className="font-semibold">{v["60d"]?.toFixed(1)}%</p>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Price Targets Section
function PriceTargets({ analysis, formatCurrency }: { analysis: Analysis; formatCurrency: (value: number) => string }) {
  const t = analysis.targets;
  const currentPrice = analysis.price.current;

  const getPctFromCurrent = (target: number | undefined) => {
    if (!target) return null;
    return ((target - currentPrice) / currentPrice * 100).toFixed(1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-primary" />
        Objectifs de Prix
      </h3>

      {/* Technical Targets */}
      <div className="space-y-3 mb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Objectifs techniques</p>
        {t?.bull && (
          <div className="flex items-center justify-between p-3 bg-profit/10 rounded-lg border border-profit/20">
            <div>
              <span className="text-sm text-muted-foreground">Scenario haussier</span>
              <p className="font-bold text-profit">{formatCurrency(t.bull)}</p>
            </div>
            <span className="text-profit text-sm">+{getPctFromCurrent(t.bull)}%</span>
          </div>
        )}
        {t?.base && (
          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div>
              <span className="text-sm text-muted-foreground">Scenario base</span>
              <p className="font-bold text-primary">{formatCurrency(t.base)}</p>
            </div>
            <span className="text-primary text-sm">+{getPctFromCurrent(t.base)}%</span>
          </div>
        )}
        {t?.bear && (
          <div className="flex items-center justify-between p-3 bg-loss/10 rounded-lg border border-loss/20">
            <div>
              <span className="text-sm text-muted-foreground">Scenario baissier</span>
              <p className="font-bold text-loss">{formatCurrency(t.bear)}</p>
            </div>
            <span className="text-loss text-sm">{getPctFromCurrent(t.bear)}%</span>
          </div>
        )}
      </div>

      {/* Analyst Targets */}
      {t?.analyst_mean && (
        <div className="pt-4 border-t border-white/10">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Objectifs analystes</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-white/5 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Bas</p>
              <p className="font-semibold text-loss">{formatCurrency(t.analyst_low || 0)}</p>
            </div>
            <div className="p-2 bg-white/5 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Moyen</p>
              <p className="font-semibold">{formatCurrency(t.analyst_mean)}</p>
            </div>
            <div className="p-2 bg-white/5 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Haut</p>
              <p className="font-semibold text-profit">{formatCurrency(t.analyst_high || 0)}</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Company Description
function CompanyDescription({ analysis }: { analysis: Analysis }) {
  const c = analysis.company;
  if (!c?.description) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Info className="w-5 h-5 text-primary" />
        A propos de {c.name || analysis.symbol}
      </h3>

      <div className="flex flex-wrap gap-2 mb-4">
        {c.sector && (
          <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">{c.sector}</span>
        )}
        {c.industry && (
          <span className="px-3 py-1 bg-white/10 rounded-full text-sm">{c.industry}</span>
        )}
        {c.country && (
          <span className="px-3 py-1 bg-white/10 rounded-full text-sm">{c.country}</span>
        )}
        {c.employees && (
          <span className="px-3 py-1 bg-white/10 rounded-full text-sm">{c.employees.toLocaleString()} employes</span>
        )}
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        {c.description.length > 500 ? c.description.substring(0, 500) + "..." : c.description}
      </p>

      {c.website && (
        <a
          href={c.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-3 text-primary hover:underline text-sm"
        >
          Visiter le site web
          <ArrowRight className="w-3 h-3" />
        </a>
      )}
    </motion.div>
  );
}

// ── Markdown renderer for AI analysis output ──────────────────────────────

function renderInlineAI(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
      return <strong key={i} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
      return <em key={i} className="text-foreground/80">{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2)
      return <code key={i} className="bg-black/30 px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    return <span key={i}>{part}</span>;
  });
}

function renderAIText(text: string): React.ReactNode {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let k = 0;

  const flushList = () => {
    if (!listBuffer.length) return;
    nodes.push(
      <ul key={`l${k++}`} className="space-y-1.5 my-2 ml-1">
        {listBuffer.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-muted-foreground leading-relaxed">
            <span className="text-primary/70 mt-0.5 shrink-0">▸</span>
            <span>{renderInlineAI(item)}</span>
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  for (const line of lines) {
    if (line.startsWith("## ")) {
      flushList();
      nodes.push(
        <h2 key={`h${k++}`} className="text-sm font-bold text-foreground mt-5 mb-2 pb-1.5 border-b border-white/10">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      flushList();
      nodes.push(
        <h3 key={`h${k++}`} className="text-sm font-semibold text-foreground/90 mt-3 mb-1">
          {line.slice(4)}
        </h3>
      );
    } else if (/^[-*•] /.test(line)) {
      listBuffer.push(line.replace(/^[-*•] /, ""));
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      nodes.push(
        <p key={`p${k++}`} className="text-sm text-muted-foreground leading-relaxed mb-1.5">
          {renderInlineAI(line)}
        </p>
      );
    }
  }
  flushList();
  return <>{nodes}</>;
}

// ─────────────────────────────────────────────────────────────────────────────

const STYLE_LABELS: Record<string, { label: string; emoji: string }> = {
  scalp: { label: "Scalping", emoji: "⚡" },
  day:   { label: "Day Trading", emoji: "📈" },
  swing: { label: "Swing", emoji: "🔄" },
  long:  { label: "Long Terme", emoji: "🏦" },
};
const RISK_LABELS: Record<string, string> = {
  conservative: "Conservateur",
  moderate: "Modéré",
  aggressive: "Agressif",
  very_aggressive: "Très Agressif",
};

// AI Insight Section - Future Predictions
function AIInsightSection({
  aiInsight,
  isLoading,
  symbol,
  tradingStyle = "day",
  riskLevel = "moderate",
  onReload
}: {
  aiInsight: string | null;
  isLoading: boolean;
  symbol: string;
  tradingStyle?: string;
  riskLevel?: string;
  onReload: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const handleReload = async () => {
    setError(null);
    try {
      await onReload();
    } catch (err: any) {
      const msg: string = err.message || "";
      if (msg.includes("not configured") || msg.includes("API_KEY") || msg.includes("GROQ")) {
        setError("L'assistant IA n'est pas configuré. Contactez l'administrateur.");
      } else if (msg.includes("503") || err.status === 503) {
        setError("L'assistant IA n'est pas disponible. Vérifiez la configuration GROQ_API_KEY.");
      } else if (msg.includes("429") || err.status === 429) {
        setError(msg || "Service IA surchargé. Réessayez dans quelques secondes.");
      } else if (msg.includes("timeout") || msg.includes("504")) {
        setError("L'analyse a pris trop de temps. Reessayez.");
      } else {
        setError(msg || "Erreur lors de la génération de l'analyse. Vérifiez que GROQ_API_KEY est configuré.");
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="glass-card p-6 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/20 to-transparent rounded-full blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2 text-lg flex-wrap">
            <Brain className="w-5 h-5 text-purple-400" />
            Analyse IA & Prévisions
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">Premium</span>
            {/* Active style badge */}
            <span className="px-2 py-0.5 bg-white/10 text-xs rounded-full text-muted-foreground font-normal">
              {STYLE_LABELS[tradingStyle]?.emoji ?? "📈"} {STYLE_LABELS[tradingStyle]?.label ?? tradingStyle}
              {" · "}{RISK_LABELS[riskLevel] ?? riskLevel}
            </span>
          </h3>
          {aiInsight && (
            <button
              onClick={handleReload}
              disabled={isLoading}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Régénérer l'analyse"
            >
              <Sparkles className={cn("w-4 h-4 text-purple-400", isLoading && "animate-spin")} />
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Brain className="w-8 h-8 text-purple-400 animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-purple-400/30 border-t-purple-400 animate-spin" />
            </div>
            <span className="text-muted-foreground">L'IA analyse {symbol}...</span>
            <p className="text-xs text-muted-foreground">Cela peut prendre quelques secondes</p>
          </div>
        ) : aiInsight ? (
          <div className="space-y-4">
            <div className="space-y-0.5">
              {renderAIText(aiInsight)}
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-white/10">
              <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Cette analyse est generee par IA a titre informatif. Elle ne constitue pas un conseil financier.
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-loss" />
            <p className="text-sm text-loss mb-3">{error}</p>
            <button
              onClick={handleReload}
              className="btn-primary px-4 py-2"
            >
              Reessayer
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Brain className="w-10 h-10 text-purple-400" />
            </div>
            <h4 className="font-semibold mb-2">Analyse predictive par IA</h4>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Obtenez une analyse approfondie avec des prévisions sur le court et moyen terme, les risques et opportunités.
            </p>
            <button
              onClick={handleReload}
              disabled={isLoading}
              className="btn-primary px-6 py-3 flex items-center gap-2 mx-auto"
            >
              <Sparkles className="w-4 h-4" />
              Generer l'analyse IA
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Market Context & Economic Analysis
function MarketContextSection({ analysis, formatCurrency }: { analysis: Analysis; formatCurrency: (value: number) => string }) {
  const getMarketPhase = () => {
    const score = analysis.score.total;
    const rsi = analysis.indicators.rsi.value;
    const trend = analysis.trend;

    if (score >= 75 && trend === "BULLISH") {
      return {
        phase: "Expansion",
        icon: <TrendingUp className="w-5 h-5 text-profit" />,
        description: "Le marché est en phase d'expansion avec une forte dynamique haussière. Les acheteurs dominent et la confiance est élevée.",
        color: "text-profit",
        bgColor: "bg-profit/10 border-profit/20"
      };
    } else if (score >= 60 && rsi > 50) {
      return {
        phase: "Croissance",
        icon: <ArrowUpRight className="w-5 h-5 text-green-400" />,
        description: "Phase de croissance modérée. Le marché montre des signes positifs mais sans exubérance excessive.",
        color: "text-green-400",
        bgColor: "bg-green-400/10 border-green-400/20"
      };
    } else if (score >= 40) {
      return {
        phase: "Consolidation",
        icon: <Activity className="w-5 h-5 text-warning" />,
        description: "Le marché consolide sans direction claire. Phase d'accumulation ou de distribution possible.",
        color: "text-warning",
        bgColor: "bg-warning/10 border-warning/20"
      };
    } else if (score >= 25) {
      return {
        phase: "Correction",
        icon: <ArrowDownRight className="w-5 h-5 text-orange-400" />,
        description: "Phase de correction en cours. Les vendeurs prennent le contrôle mais sans panique généralisée.",
        color: "text-orange-400",
        bgColor: "bg-orange-400/10 border-orange-400/20"
      };
    } else {
      return {
        phase: "Contraction",
        icon: <TrendingDown className="w-5 h-5 text-loss" />,
        description: "Marché en contraction avec forte pression vendeuse. Prudence maximale recommandée.",
        color: "text-loss",
        bgColor: "bg-loss/10 border-loss/20"
      };
    }
  };

  const getVolatilityContext = () => {
    const atr = analysis.indicators.atr;
    const price = analysis.price.current;
    const atrPercent = (atr / price) * 100;

    if (atrPercent > 5) {
      return { level: "Très élevée", color: "text-loss", description: "Marché très volatile - risque élevé mais opportunités importantes" };
    } else if (atrPercent > 3) {
      return { level: "Élevée", color: "text-warning", description: "Volatilité supérieure à la normale - prudence recommandée" };
    } else if (atrPercent > 1.5) {
      return { level: "Moderee", color: "text-primary", description: "Volatilite normale pour ce type d'actif" };
    } else {
      return { level: "Faible", color: "text-profit", description: "Marche calme - mouvements limites attendus" };
    }
  };

  const getLiquidityContext = () => {
    const ratio = analysis.indicators.volume_ratio;
    if (ratio > 2) {
      return { level: "Excellente", color: "text-profit", description: "Volume très élevé - forte liquidité et intérêt institutionnel probable" };
    } else if (ratio > 1) {
      return { level: "Bonne", color: "text-primary", description: "Volume supérieur à la moyenne - bonnes conditions de trading" };
    } else if (ratio > 0.5) {
      return { level: "Correcte", color: "text-warning", description: "Volume dans la moyenne - conditions normales" };
    } else {
      return { level: "Limitee", color: "text-loss", description: "Faible volume - spreads potentiellement eleves, slippage possible" };
    }
  };

  const marketPhase = getMarketPhase();
  const volatility = getVolatilityContext();
  const liquidity = getLiquidityContext();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-6 flex items-center gap-2 text-lg">
        <Globe className="w-5 h-5 text-primary" />
        Contexte de Marche & Economique
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Market Phase */}
        <div className={cn("p-4 rounded-xl border", marketPhase.bgColor)}>
          <div className="flex items-center gap-2 mb-2">
            {marketPhase.icon}
            <span className={cn("font-semibold", marketPhase.color)}>Phase: {marketPhase.phase}</span>
          </div>
          <p className="text-xs text-muted-foreground">{marketPhase.description}</p>
        </div>

        {/* Volatility */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-primary" />
            <span className="font-semibold">Volatilite: <span className={volatility.color}>{volatility.level}</span></span>
          </div>
          <p className="text-xs text-muted-foreground">{volatility.description}</p>
          <p className="text-xs mt-1 text-muted-foreground">ATR: {formatCurrency(analysis.indicators.atr)}</p>
        </div>

        {/* Liquidity */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <span className="font-semibold">Liquidite: <span className={liquidity.color}>{liquidity.level}</span></span>
          </div>
          <p className="text-xs text-muted-foreground">{liquidity.description}</p>
          <p className="text-xs mt-1 text-muted-foreground">Ratio: {analysis.indicators.volume_ratio.toFixed(2)}x moyenne</p>
        </div>
      </div>

      {/* Economic Factors */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <PieChart className="w-4 h-4" />
          Facteurs Economiques a Considerer
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Position dans le range 52 semaines</p>
            {analysis.fundamentals?.["52w_high"] && analysis.fundamentals?.["52w_low"] ? (
              <div>
                <div className="h-2 bg-white/10 rounded-full mb-2 relative">
                  <div
                    className="absolute h-full bg-gradient-to-r from-loss via-warning to-profit rounded-full"
                    style={{ width: '100%' }}
                  />
                  <div
                    className="absolute w-3 h-3 bg-primary rounded-full -top-0.5 shadow-lg shadow-primary/50"
                    style={{
                      left: `${Math.max(0, Math.min(100, ((analysis.price.current - analysis.fundamentals["52w_low"]) / (analysis.fundamentals["52w_high"] - analysis.fundamentals["52w_low"])) * 100))}%`,
                      transform: 'translateX(-50%)'
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-loss">{formatCurrency(analysis.fundamentals["52w_low"])}</span>
                  <span className="text-profit">{formatCurrency(analysis.fundamentals["52w_high"])}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm font-semibold">N/A</p>
            )}
          </div>

          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Distance aux moyennes mobiles</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>EMA20:</span>
                <span className={analysis.price.current > analysis.indicators.ema.ema20 ? "text-profit" : "text-loss"}>
                  {((analysis.price.current - analysis.indicators.ema.ema20) / analysis.indicators.ema.ema20 * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span>EMA50:</span>
                <span className={analysis.price.current > analysis.indicators.ema.ema50 ? "text-profit" : "text-loss"}>
                  {((analysis.price.current - analysis.indicators.ema.ema50) / analysis.indicators.ema.ema50 * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Risk Assessment Section
function RiskAssessmentSection({ analysis, formatCurrency }: { analysis: Analysis; formatCurrency: (value: number) => string }) {
  const calculateRiskScore = () => {
    let score = 50; // Base score

    // RSI risk
    if (analysis.indicators.rsi.value > 80) score += 20;
    else if (analysis.indicators.rsi.value > 70) score += 10;
    else if (analysis.indicators.rsi.value < 20) score += 15;
    else if (analysis.indicators.rsi.value < 30) score += 5;

    // Volatility risk (ATR based)
    const atrPercent = (analysis.indicators.atr / analysis.price.current) * 100;
    if (atrPercent > 5) score += 20;
    else if (atrPercent > 3) score += 10;

    // Volume risk
    if (analysis.indicators.volume_ratio < 0.5) score += 10;

    // Beta risk
    if (analysis.fundamentals?.beta) {
      if (analysis.fundamentals.beta > 2) score += 15;
      else if (analysis.fundamentals.beta > 1.5) score += 10;
      else if (analysis.fundamentals.beta < 0.5) score -= 10;
    }

    // Debt risk
    if (analysis.fundamentals?.debt_to_equity) {
      if (analysis.fundamentals.debt_to_equity > 200) score += 15;
      else if (analysis.fundamentals.debt_to_equity > 100) score += 5;
    }

    return Math.min(100, Math.max(0, score));
  };

  const riskScore = calculateRiskScore();

  const getRiskLevel = (score: number) => {
    if (score >= 75) return { level: "Très élevé", color: "text-loss", bg: "bg-loss" };
    if (score >= 60) return { level: "Eleve", color: "text-orange-400", bg: "bg-orange-400" };
    if (score >= 40) return { level: "Modere", color: "text-warning", bg: "bg-warning" };
    if (score >= 25) return { level: "Faible", color: "text-green-400", bg: "bg-green-400" };
    return { level: "Tres faible", color: "text-profit", bg: "bg-profit" };
  };

  const risk = getRiskLevel(riskScore);

  const riskFactors = [
    {
      name: "Volatilite",
      value: (analysis.indicators.atr / analysis.price.current) * 100,
      threshold: 3,
      isHigh: (analysis.indicators.atr / analysis.price.current) * 100 > 3,
      description: "Amplitude moyenne des mouvements de prix"
    },
    {
      name: "Liquidite",
      value: analysis.indicators.volume_ratio,
      threshold: 0.7,
      isHigh: analysis.indicators.volume_ratio < 0.7,
      description: "Capacite a entrer/sortir sans impact sur le prix"
    },
    {
      name: "Surachat/Survente",
      value: analysis.indicators.rsi.value,
      threshold: 70,
      isHigh: analysis.indicators.rsi.value > 70 || analysis.indicators.rsi.value < 30,
      description: "Niveau extrême du RSI"
    },
    ...(analysis.fundamentals?.beta ? [{
      name: "Beta",
      value: analysis.fundamentals.beta,
      threshold: 1.5,
      isHigh: analysis.fundamentals.beta > 1.5,
      description: "Sensibilite aux mouvements du marche"
    }] : []),
    ...(analysis.fundamentals?.debt_to_equity ? [{
      name: "Endettement",
      value: analysis.fundamentals.debt_to_equity,
      threshold: 100,
      isHigh: analysis.fundamentals.debt_to_equity > 100,
      description: "Ratio dette/capitaux propres"
    }] : [])
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-6 flex items-center gap-2 text-lg">
        <Shield className="w-5 h-5 text-primary" />
        Evaluation des Risques
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Gauge */}
        <div className="flex flex-col items-center">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                className="text-white/10"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${(riskScore / 100) * 352} 352`}
                className={risk.bg}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-3xl font-bold", risk.color)}>{riskScore}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          </div>
          <p className={cn("font-semibold mt-2", risk.color)}>Risque {risk.level}</p>
        </div>

        {/* Risk Factors */}
        <div className="lg:col-span-2 space-y-3">
          {riskFactors.map((factor, idx) => (
            <div key={idx} className="p-3 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{factor.name}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-medium",
                  factor.isHigh ? "bg-loss/20 text-loss" : "bg-profit/20 text-profit"
                )}>
                  {factor.isHigh ? "Attention" : "OK"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{factor.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Management Suggestions */}
      <div className="mt-6 p-4 bg-primary/10 rounded-xl border border-primary/20">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" />
          Recommandations de Gestion du Risque
        </h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <CircleDot className="w-3 h-3 mt-1.5 text-primary flex-shrink-0" />
            <span>Taille de position recommandée : <strong className="text-foreground">{riskScore > 60 ? "1-2%" : riskScore > 40 ? "2-3%" : "3-5%"}</strong> du capital</span>
          </li>
          <li className="flex items-start gap-2">
            <CircleDot className="w-3 h-3 mt-1.5 text-primary flex-shrink-0" />
            <span>Stop loss suggere: <strong className="text-foreground">{formatCurrency(analysis.risk.suggested_sl)}</strong> ({(((analysis.price.current - analysis.risk.suggested_sl) / analysis.price.current) * 100).toFixed(1)}% du prix)</span>
          </li>
          <li className="flex items-start gap-2">
            <CircleDot className="w-3 h-3 mt-1.5 text-primary flex-shrink-0" />
            <span>Diversification : <strong className="text-foreground">{analysis.fundamentals?.beta && analysis.fundamentals.beta > 1.2 ? "Fortement recommandée" : "Standard"}</strong></span>
          </li>
        </ul>
      </div>
    </motion.div>
  );
}

// Enhanced Fundamental Analysis
function FundamentalAnalysisEnhanced({ analysis, formatCurrency }: { analysis: Analysis; formatCurrency: (value: number) => string }) {
  const f = analysis.fundamentals;
  if (!f) return null;

  const formatLargeNumber = (num: number | undefined) => {
    if (!num) return "N/A";
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    return num.toLocaleString();
  };

  const formatPct = (num: number | undefined) => {
    if (num === undefined || num === null) return "N/A";
    return `${(num * 100).toFixed(2)}%`;
  };

  // Valuation Analysis
  const getValuationAnalysis = () => {
    if (!f.pe_ratio) return null;

    let assessment = "";
    let color = "text-warning";

    if (f.pe_ratio < 15) {
      assessment = "L'action semble sous-évaluée avec un P/E inférieur à la moyenne historique du marché (15-20). Cela peut indiquer une opportunité d'achat ou des inquiétudes du marché sur la croissance future.";
      color = "text-profit";
    } else if (f.pe_ratio < 25) {
      assessment = "Le P/E est dans une fourchette raisonnable. L'action est evaluee a sa juste valeur par rapport a ses benefices actuels.";
      color = "text-primary";
    } else if (f.pe_ratio < 40) {
      assessment = "Le P/E élevé suggère que les investisseurs anticipent une forte croissance future. Attention au risque de correction si les attentes ne sont pas respectées.";
      color = "text-warning";
    } else {
      assessment = "Le P/E très élevé indique une valorisation spéculative. Le marché price une croissance exceptionnelle. Risque de volatilité important.";
      color = "text-loss";
    }

    return { assessment, color };
  };

  // Growth Analysis
  const getGrowthAnalysis = () => {
    const growth = f.revenue_growth;
    if (!growth) return null;

    if (growth > 0.3) {
      return { text: "Croissance exceptionnelle (>30%)", color: "text-profit" };
    } else if (growth > 0.15) {
      return { text: "Forte croissance (15-30%)", color: "text-green-400" };
    } else if (growth > 0.05) {
      return { text: "Croissance modérée (5-15%)", color: "text-primary" };
    } else if (growth > 0) {
      return { text: "Croissance faible (<5%)", color: "text-warning" };
    } else {
      return { text: "Décroissance", color: "text-loss" };
    }
  };

  // Profitability Analysis
  const getProfitabilityAnalysis = () => {
    const margin = f.profit_margin;
    if (!margin) return null;

    if (margin > 0.2) {
      return { text: "Excellente rentabilite (>20%)", color: "text-profit", score: 5 };
    } else if (margin > 0.1) {
      return { text: "Bonne rentabilite (10-20%)", color: "text-green-400", score: 4 };
    } else if (margin > 0.05) {
      return { text: "Rentabilite correcte (5-10%)", color: "text-primary", score: 3 };
    } else if (margin > 0) {
      return { text: "Rentabilite faible (<5%)", color: "text-warning", score: 2 };
    } else {
      return { text: "Non rentable", color: "text-loss", score: 1 };
    }
  };

  const valuation = getValuationAnalysis();
  const growth = getGrowthAnalysis();
  const profitability = getProfitabilityAnalysis();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.65 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-6 flex items-center gap-2 text-lg">
        <BarChart3 className="w-5 h-5 text-primary" />
        Analyse Fondamentale Approfondie
      </h3>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Capitalisation</p>
          <p className="font-bold text-lg">{formatLargeNumber(f.market_cap)}</p>
        </div>
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">P/E Ratio</p>
          <p className={cn("font-bold text-lg", f.pe_ratio && f.pe_ratio > 30 ? "text-warning" : f.pe_ratio && f.pe_ratio < 15 ? "text-profit" : "")}>
            {f.pe_ratio?.toFixed(2) || "N/A"}
          </p>
        </div>
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Forward P/E</p>
          <p className="font-bold text-lg">{f.forward_pe?.toFixed(2) || "N/A"}</p>
        </div>
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">PEG Ratio</p>
          <p className={cn("font-bold text-lg", f.peg_ratio && f.peg_ratio < 1 ? "text-profit" : f.peg_ratio && f.peg_ratio > 2 ? "text-loss" : "")}>
            {f.peg_ratio?.toFixed(2) || "N/A"}
          </p>
        </div>
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Prix/Book</p>
          <p className="font-bold text-lg">{f.price_to_book?.toFixed(2) || "N/A"}</p>
        </div>
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Dividende</p>
          <p className="font-bold text-lg">{formatPct(f.dividend_yield)}</p>
        </div>
      </div>

      {/* Analysis Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Valuation */}
        <div className="p-4 bg-white/5 rounded-xl">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            Valorisation
          </h4>
          {valuation ? (
            <p className="text-sm text-muted-foreground">{valuation.assessment}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Donnees insuffisantes</p>
          )}
        </div>

        {/* Growth */}
        <div className="p-4 bg-white/5 rounded-xl">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Croissance
          </h4>
          {growth ? (
            <>
              <p className={cn("font-semibold mb-1", growth.color)}>{growth.text}</p>
              <p className="text-sm text-muted-foreground">CA: {formatPct(f.revenue_growth)}</p>
              {f.earnings_growth && <p className="text-sm text-muted-foreground">Benefices: {formatPct(f.earnings_growth)}</p>}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Donnees insuffisantes</p>
          )}
        </div>

        {/* Profitability */}
        <div className="p-4 bg-white/5 rounded-xl">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Rentabilite
          </h4>
          {profitability ? (
            <>
              <p className={cn("font-semibold mb-1", profitability.color)}>{profitability.text}</p>
              <p className="text-sm text-muted-foreground">ROE: {formatPct(f.roe)}</p>
              <p className="text-sm text-muted-foreground">ROA: {formatPct(f.roa)}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Donnees insuffisantes</p>
          )}
        </div>
      </div>

      {/* Health Indicators */}
      <div className="p-4 bg-white/5 rounded-xl">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Sante Financiere
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Dette/Equity</p>
            <p className={cn("font-bold", f.debt_to_equity && f.debt_to_equity > 100 ? "text-loss" : "text-profit")}>
              {f.debt_to_equity?.toFixed(2) || "N/A"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {f.debt_to_equity && f.debt_to_equity > 100 ? "Endettement élevé" : f.debt_to_equity ? "Endettement sain" : ""}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Current Ratio</p>
            <p className={cn("font-bold", f.current_ratio && f.current_ratio > 1.5 ? "text-profit" : f.current_ratio && f.current_ratio < 1 ? "text-loss" : "")}>
              {f.current_ratio?.toFixed(2) || "N/A"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {f.current_ratio && f.current_ratio > 1.5 ? "Bonne liquidité" : f.current_ratio && f.current_ratio < 1 ? "Liquidité tendue" : ""}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Beta</p>
            <p className={cn("font-bold", f.beta && f.beta > 1.5 ? "text-warning" : "")}>
              {f.beta?.toFixed(2) || "N/A"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {f.beta && f.beta > 1.5 ? "Volatile" : f.beta && f.beta < 0.8 ? "Defensif" : f.beta ? "Normal" : ""}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Short Ratio</p>
            <p className={cn("font-bold", f.short_ratio && f.short_ratio > 5 ? "text-warning" : "")}>
              {f.short_ratio?.toFixed(2) || "N/A"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {f.short_ratio && f.short_ratio > 5 ? "Short squeeze possible" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Analyst Consensus */}
      {f.recommendation && (
        <div className="mt-4 p-4 bg-primary/10 rounded-xl border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Consensus analystes ({f.num_analysts || 0} analystes)</p>
              <p className={cn(
                "font-bold text-xl mt-1",
                f.recommendation.includes("buy") ? "text-profit" :
                f.recommendation.includes("sell") ? "text-loss" : "text-warning"
              )}>
                {f.recommendation.toUpperCase()}
              </p>
            </div>
            {f.target_price && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Objectif moyen</p>
                <p className="font-bold text-xl">{formatCurrency(f.target_price)}</p>
                <p className={cn(
                  "text-sm",
                  f.target_price > analysis.price.current ? "text-profit" : "text-loss"
                )}>
                  {f.target_price > analysis.price.current ? "+" : ""}{((f.target_price - analysis.price.current) / analysis.price.current * 100).toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Investment Thesis Section
function InvestmentThesisSection({ analysis, formatCurrency }: { analysis: Analysis; formatCurrency: (value: number) => string }) {
  const getBullCase = () => {
    const points = [];

    if (analysis.score.total >= 60) {
      points.push("Les indicateurs techniques convergent vers un signal positif");
    }
    if (analysis.indicators.rsi.value < 40) {
      points.push("RSI en zone de survente - potentiel de rebond");
    }
    if (analysis.trend === "BULLISH") {
      points.push("Tendance haussière établie avec structure de prix favorable");
    }
    if (analysis.indicators.volume_ratio > 1.2) {
      points.push("Volume supérieur à la moyenne confirmant l'intérêt acheteur");
    }
    if (analysis.fundamentals?.revenue_growth && analysis.fundamentals.revenue_growth > 0.1) {
      points.push("Croissance du chiffre d'affaires supérieure à 10%");
    }
    if (analysis.fundamentals?.profit_margin && analysis.fundamentals.profit_margin > 0.15) {
      points.push("Marges bénéficiaires solides (>15%)");
    }
    if (analysis.price.current < analysis.levels.resistance) {
      points.push(`Potentiel haussier vers la resistance a ${formatCurrency(analysis.levels.resistance)}`);
    }

    return points.length > 0 ? points : ["Signaux positifs limites dans l'environnement actuel"];
  };

  const getBearCase = () => {
    const points = [];

    if (analysis.score.total < 40) {
      points.push("Score technique faible indiquant une pression vendeuse");
    }
    if (analysis.indicators.rsi.value > 70) {
      points.push("RSI en zone de surachat - risque de correction");
    }
    if (analysis.trend === "BEARISH") {
      points.push("Tendance baissière dominante");
    }
    if (analysis.fundamentals?.debt_to_equity && analysis.fundamentals.debt_to_equity > 100) {
      points.push("Niveau d'endettement élevé pesant sur le bilan");
    }
    if (analysis.fundamentals?.pe_ratio && analysis.fundamentals.pe_ratio > 40) {
      points.push("Valorisation élevée, vulnérable aux déceptions");
    }
    if (analysis.indicators.volume_ratio < 0.7) {
      points.push("Faible volume pouvant amplifier les mouvements baissiers");
    }

    return points.length > 0 ? points : ["Risques identifies limites"];
  };

  const getCatalysts = () => {
    const catalysts = [];

    if (analysis.news && analysis.news.length > 0) {
      catalysts.push("Publications de résultats à venir");
    }
    catalysts.push("Évolution des taux d'intérêt");
    catalysts.push("Sentiment global du marche");
    if (analysis.company?.sector === "Technology") {
      catalysts.push("Innovations technologiques et nouveaux produits");
    }

    return catalysts;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-6 flex items-center gap-2 text-lg">
        <BookOpen className="w-5 h-5 text-primary" />
        These d'Investissement
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bull Case */}
        <div className="p-4 bg-profit/10 rounded-xl border border-profit/20">
          <h4 className="font-semibold text-profit mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Scenario Haussier
          </h4>
          <ul className="space-y-2">
            {getBullCase().map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-profit mt-0.5 flex-shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bear Case */}
        <div className="p-4 bg-loss/10 rounded-xl border border-loss/20">
          <h4 className="font-semibold text-loss mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            Scenario Baissier
          </h4>
          <ul className="space-y-2">
            {getBearCase().map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="w-4 h-4 text-loss mt-0.5 flex-shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Catalysts */}
      <div className="mt-4 p-4 bg-white/5 rounded-xl">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          Catalyseurs a Surveiller
        </h4>
        <div className="flex flex-wrap gap-2">
          {getCatalysts().map((catalyst, idx) => (
            <span key={idx} className="px-3 py-1 bg-orange-400/20 text-orange-400 rounded-full text-sm">
              {catalyst}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Sector Comparison Section
function SectorComparisonSection({ analysis }: { analysis: Analysis }) {
  const getSectorContext = () => {
    const sector = analysis.company?.sector || "General";
    const industry = analysis.company?.industry || "";

    const sectorInfo: Record<string, { description: string; typical_pe: string; growth_expectation: string }> = {
      "Technology": {
        description: "Le secteur technologique est caractérisé par une forte croissance mais une volatilité élevée. Les valorisations sont souvent élevées en premier.",
        typical_pe: "25-40",
        growth_expectation: "15-25%"
      },
      "Financial Services": {
        description: "Le secteur financier est sensible aux taux d'interet et aux cycles economiques. Dividendes generalement stables.",
        typical_pe: "10-15",
        growth_expectation: "5-10%"
      },
      "Healthcare": {
        description: "Secteur défensif avec une demande stable. Les biotechs offrent un potentiel de croissance élevé mais risqué.",
        typical_pe: "15-25",
        growth_expectation: "8-15%"
      },
      "Consumer Cyclical": {
        description: "Sensible aux cycles economiques. Performance correlee a la confiance des consommateurs.",
        typical_pe: "15-25",
        growth_expectation: "5-15%"
      },
      "Energy": {
        description: "Secteur cyclique fortement influence par les prix du petrole et la transition energetique.",
        typical_pe: "8-15",
        growth_expectation: "Variable"
      },
      "General": {
        description: "Analyse le contexte specifique de l'actif et son positionnement competitif.",
        typical_pe: "15-20",
        growth_expectation: "5-10%"
      }
    };

    return sectorInfo[sector] || sectorInfo["General"];
  };

  const sectorContext = getSectorContext();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.85 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-4 flex items-center gap-2 text-lg">
        <Briefcase className="w-5 h-5 text-primary" />
        Contexte Sectoriel
      </h3>

      <div className="p-4 bg-white/5 rounded-xl mb-4">
        <div className="flex items-center gap-3 mb-2">
          {analysis.company?.sector && (
            <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">
              {analysis.company.sector}
            </span>
          )}
          {analysis.company?.industry && (
            <span className="px-3 py-1 bg-white/10 rounded-full text-sm">
              {analysis.company.industry}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{sectorContext.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">P/E typique du secteur</p>
          <p className="font-bold">{sectorContext.typical_pe}</p>
          {analysis.fundamentals?.pe_ratio && (
            <p className={cn(
              "text-xs mt-1",
              analysis.fundamentals.pe_ratio > 30 ? "text-warning" : "text-profit"
            )}>
              Actuel: {analysis.fundamentals.pe_ratio.toFixed(1)}
            </p>
          )}
        </div>
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Croissance attendue</p>
          <p className="font-bold">{sectorContext.growth_expectation}</p>
          {analysis.fundamentals?.revenue_growth && (
            <p className={cn(
              "text-xs mt-1",
              analysis.fundamentals.revenue_growth > 0.1 ? "text-profit" : "text-warning"
            )}>
              Actuel: {(analysis.fundamentals.revenue_growth * 100).toFixed(1)}%
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Trading Strategies Section
function TradingStrategiesSection({ analysis, formatCurrency }: { analysis: Analysis; formatCurrency: (value: number) => string }) {
  const getStrategies = () => {
    const strategies = [];

    // Swing Trading Strategy
    if (analysis.score.total >= 60 && analysis.trend === "BULLISH") {
      strategies.push({
        name: "Swing Trading Long",
        timeframe: "1-2 semaines",
        entry: `Sur pullback vers ${formatCurrency(analysis.indicators.ema.ema20)}`,
        target: formatCurrency(analysis.risk.suggested_tp),
        stop: formatCurrency(analysis.risk.suggested_sl),
        rr: analysis.risk.risk_reward,
        probability: "65-70%",
        color: "bg-profit/10 border-profit/20"
      });
    }

    // Breakout Strategy
    if (analysis.price.current > analysis.indicators.ema.ema50 && analysis.indicators.volume_ratio > 1) {
      strategies.push({
        name: "Breakout",
        timeframe: "1-5 jours",
        entry: `Sur cassure de ${formatCurrency(analysis.levels.resistance)}`,
        target: formatCurrency(analysis.levels.resistance * 1.05),
        stop: formatCurrency(analysis.levels.pivot),
        rr: 2,
        probability: "55-60%",
        color: "bg-primary/10 border-primary/20"
      });
    }

    // Mean Reversion
    if (analysis.indicators.rsi.value < 35 || analysis.indicators.rsi.value > 65) {
      const isOversold = analysis.indicators.rsi.value < 35;
      strategies.push({
        name: isOversold ? "Rebond Technique" : "Prise de Profits",
        timeframe: "1-3 jours",
        entry: isOversold ? "Achat immediat ou sur confirmation" : "Vente sur resistance",
        target: isOversold ? formatCurrency(analysis.indicators.bollinger.middle) : formatCurrency(analysis.indicators.bollinger.lower),
        stop: isOversold ? formatCurrency(analysis.levels.support * 0.98) : formatCurrency(analysis.levels.resistance * 1.02),
        rr: 1.5,
        probability: "60-65%",
        color: isOversold ? "bg-profit/10 border-profit/20" : "bg-loss/10 border-loss/20"
      });
    }

    // Conservative Hold
    if (analysis.score.total >= 40 && analysis.score.total < 60) {
      strategies.push({
        name: "Attente / Observation",
        timeframe: "Indefini",
        entry: "Attendre un signal plus clair",
        target: "-",
        stop: "-",
        rr: 0,
        probability: "-",
        color: "bg-warning/10 border-warning/20"
      });
    }

    return strategies;
  };

  const strategies = getStrategies();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-6 flex items-center gap-2 text-lg">
        <Target className="w-5 h-5 text-primary" />
        Strategies de Trading Suggerees
      </h3>

      <div className="space-y-4">
        {strategies.length === 0 ? (
          <div className="p-4 rounded-xl border bg-loss/10 border-loss/20 text-sm text-muted-foreground">
            Aucune stratégie applicable — signal trop faible ou configuration de marché défavorable.
          </div>
        ) : (
          strategies.map((strategy, idx) => (
            <div key={idx} className={cn("p-4 rounded-xl border", strategy.color)}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">{strategy.name}</h4>
                <span className="text-xs px-2 py-1 bg-white/10 rounded-full">{strategy.timeframe}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Entree</p>
                  <p className="font-medium">{strategy.entry}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Objectif</p>
                  <p className="font-medium text-profit">{strategy.target}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Stop Loss</p>
                  <p className="font-medium text-loss">{strategy.stop}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">R/R</p>
                  <p className="font-medium">
                    {strategy.rr > 0 ? `1:${strategy.rr}` : "—"}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 p-3 bg-warning/10 rounded-lg border border-warning/20">
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          Ces strategies sont fournies a titre indicatif. Adaptez-les a votre profil de risque et votre capital.
        </p>
      </div>
    </motion.div>
  );
}

// News Section with Sentiment
function NewsSentimentSection({ news, symbol }: { news: Analysis["news"]; symbol: string }) {
  if (!news || news.length === 0) return null;

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  };

  const getRelativeTime = (timestamp: number | undefined) => {
    if (!timestamp) return "";
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)} jours`;
    return formatDate(timestamp);
  };

  // Simple sentiment analysis based on title keywords
  const analyzeSentiment = (title: string) => {
    const positiveWords = ["surge", "gain", "rise", "jump", "soar", "beat", "strong", "growth", "profit", "success", "up", "high", "buy", "bullish", "record", "rally", "boost", "outperform"];
    const negativeWords = ["drop", "fall", "decline", "plunge", "crash", "miss", "weak", "loss", "fail", "down", "low", "sell", "bearish", "concern", "risk", "warn", "cut", "layoff", "slump"];

    const titleLower = title.toLowerCase();
    let score = 0;

    positiveWords.forEach(word => {
      if (titleLower.includes(word)) score++;
    });

    negativeWords.forEach(word => {
      if (titleLower.includes(word)) score--;
    });

    if (score > 0) return { sentiment: "Positif", color: "text-profit", bg: "bg-profit/20", icon: "📈" };
    if (score < 0) return { sentiment: "Negatif", color: "text-loss", bg: "bg-loss/20", icon: "📉" };
    return { sentiment: "Neutre", color: "text-muted-foreground", bg: "bg-white/10", icon: "📰" };
  };

  // Generate a summary based on title
  const generateSummary = (title: string, publisher: string | undefined) => {
    const sentiment = analyzeSentiment(title);
    const titleLower = title.toLowerCase();

    // Extract key themes
    let theme = "";
    if (titleLower.includes("earning") || titleLower.includes("revenue") || titleLower.includes("profit")) {
      theme = "Resultats financiers";
    } else if (titleLower.includes("analyst") || titleLower.includes("rating") || titleLower.includes("target")) {
      theme = "Recommandation analyste";
    } else if (titleLower.includes("ceo") || titleLower.includes("executive") || titleLower.includes("management")) {
      theme = "Actualite dirigeants";
    } else if (titleLower.includes("product") || titleLower.includes("launch") || titleLower.includes("release")) {
      theme = "Produit/Innovation";
    } else if (titleLower.includes("market") || titleLower.includes("stock") || titleLower.includes("share")) {
      theme = "Évolution du cours";
    } else if (titleLower.includes("deal") || titleLower.includes("acquisition") || titleLower.includes("merger")) {
      theme = "Fusion/Acquisition";
    } else {
      theme = "Actualite generale";
    }

    return { theme, sentiment };
  };

  const positiveCount = news.filter(item => analyzeSentiment(item.title || "").sentiment === "Positif").length;
  const negativeCount = news.filter(item => analyzeSentiment(item.title || "").sentiment === "Negatif").length;
  const neutralCount = news.length - positiveCount - negativeCount;

  const overallSentiment = positiveCount - negativeCount;

  // Generate overall summary
  const getOverallSummary = () => {
    if (positiveCount > negativeCount * 2) {
      return `Couverture médiatique très positive avec ${positiveCount} article(s) favorable(s). Le sentiment général est optimiste concernant ${symbol}.`;
    } else if (positiveCount > negativeCount) {
      return `Couverture légèrement positive avec ${positiveCount} article(s) favorable(s) contre ${negativeCount} négatif(s). Tendance modérément optimiste.`;
    } else if (negativeCount > positiveCount * 2) {
      return `Couverture médiatique préoccupante avec ${negativeCount} article(s) négatif(s). Vigilance recommandée sur ${symbol}.`;
    } else if (negativeCount > positiveCount) {
      return `Couverture légèrement négative avec ${negativeCount} article(s) défavorable(s). Quelques inquiétudes à surveiller.`;
    } else {
      return `Couverture équilibrée avec ${positiveCount} article(s) positif(s) et ${negativeCount} négatif(s). Pas de tendance claire dans les actualités.`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2 text-lg">
          <Newspaper className="w-5 h-5 text-primary" />
          Actualités & Sentiment
        </h3>
        <div className={cn(
          "px-3 py-1 rounded-full text-sm font-medium",
          overallSentiment > 0 ? "bg-profit/20 text-profit" :
          overallSentiment < 0 ? "bg-loss/20 text-loss" : "bg-white/10"
        )}>
          {overallSentiment > 0 ? "📈 Positif" : overallSentiment < 0 ? "📉 Négatif" : "➖ Neutre"}
        </div>
      </div>

      {/* Summary Box */}
      <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 mb-6">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          Résumé des actualités
        </h4>
        <p className="text-sm text-muted-foreground mb-3">{getOverallSummary()}</p>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-profit" />
            {positiveCount} positif(s)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-white/50" />
            {neutralCount} neutre(s)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-loss" />
            {negativeCount} négatif(s)
          </span>
        </div>
      </div>

      {/* News List */}
      <div className="space-y-4">
        {news.map((item, index) => {
          const { theme, sentiment } = generateSummary(item.title || "", item.publisher);

          return (
            <div
              key={index}
              className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0">{sentiment.icon}</div>
                <div className="flex-1 min-w-0">
                  {/* Theme tag */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", sentiment.bg, sentiment.color)}>
                      {sentiment.sentiment}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs bg-white/10 text-muted-foreground">
                      {theme}
                    </span>
                  </div>

                  {/* Title */}
                  <p className="font-medium text-sm mb-2">{item.title}</p>

                  {/* Summary based on title */}
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {item.title && item.title.length > 50
                      ? `Cet article de ${item.publisher || "source inconnue"} traite ${
                          theme === "Resultats financiers" ? "des performances financieres" :
                          theme === "Recommandation analyste" ? "d'une analyse de marche" :
                          theme === "Produit/Innovation" ? "d'une nouveaute produit" :
                          theme === "Fusion/Acquisition" ? "d'une operation strategique" :
                          "de l'actualite"
                        } de ${symbol}.`
                      : `Article concernant ${symbol} publie par ${item.publisher || "source inconnue"}.`
                    }
                  </p>

                  {/* Meta info and link */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {item.publisher && (
                        <span className="font-medium">{item.publisher}</span>
                      )}
                      {item.date && (
                        <>
                          <span>•</span>
                          <span>{getRelativeTime(item.date)}</span>
                        </>
                      )}
                    </div>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                      >
                        Lire l'article
                        <ArrowRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-white/5 rounded-lg">
        <p className="text-xs text-muted-foreground">
          L'analyse de sentiment est basee sur les mots-cles des titres. Elle ne remplace pas une lecture approfondie des articles. Cliquez sur "Lire l'article" pour acceder a la source complete.
        </p>
      </div>
    </motion.div>
  );
}

// Educational Section
function EducationalSection({ analysis }: { analysis: Analysis }) {
  const [expanded, setExpanded] = useState(false);

  const getEducationalContent = () => {
    const content = [];

    // RSI Education
    content.push({
      indicator: "RSI (Relative Strength Index)",
      description: "Le RSI mesure la vitesse et le changement des mouvements de prix. Il oscille entre 0 et 100.",
      interpretation: "En dessous de 30 = survente (achat potentiel). Au-dessus de 70 = surachat (vente potentielle).",
      currentValue: `${analysis.indicators.rsi.value.toFixed(1)}`,
      currentInterpretation: analysis.indicators.rsi.value < 30 ? "Zone de survente" : analysis.indicators.rsi.value > 70 ? "Zone de surachat" : "Zone neutre"
    });

    // MACD Education
    content.push({
      indicator: "MACD (Moving Average Convergence Divergence)",
      description: "Le MACD montre la relation entre deux moyennes mobiles exponentielles du prix.",
      interpretation: "Signal haussier quand la ligne MACD croise au-dessus de la ligne de signal. Baissier dans le cas contraire.",
      currentValue: `${analysis.indicators.macd.value.toFixed(4)}`,
      currentInterpretation: analysis.indicators.macd.histogram > 0 ? "Signal haussier" : "Signal baissier"
    });

    // Bollinger Bands Education
    content.push({
      indicator: "Bandes de Bollinger",
      description: "Les bandes de Bollinger encadrent le prix avec des niveaux de deviation standard.",
      interpretation: "Prix proche de la bande supérieure = potentiel surachat. Prix proche de la bande inférieure = potentiel survente.",
      currentValue: `Position: ${analysis.indicators.bollinger.position}`,
      currentInterpretation: analysis.indicators.bollinger.position === "upper" ? "Proche de la resistance" : analysis.indicators.bollinger.position === "lower" ? "Proche du support" : "Dans le canal"
    });

    return content;
  };

  const educationalContent = getEducationalContent();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.1 }}
      className="glass-card p-6"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="font-semibold flex items-center gap-2 text-lg">
          <BookOpen className="w-5 h-5 text-primary" />
          Comprendre les Indicateurs
        </h3>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 space-y-4"
        >
          {educationalContent.map((item, idx) => (
            <div key={idx} className="p-4 bg-white/5 rounded-xl">
              <h4 className="font-semibold text-primary mb-2">{item.indicator}</h4>
              <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
              <p className="text-sm text-muted-foreground mb-3"><strong>Interpretation:</strong> {item.interpretation}</p>
              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <span className="text-sm">Valeur actuelle: <strong>{item.currentValue}</strong></span>
                <span className="text-sm px-2 py-0.5 bg-primary/20 text-primary rounded">{item.currentInterpretation}</span>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
