"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  Calendar,
  Globe,
  BarChart3,
  Play,
  RefreshCw,
  Loader2,
  ChevronRight,
  AlertTriangle,
  Target,
  Activity,
  DollarSign,
  Percent,
  Clock,
  Flag,
  Bot,
  ArrowUp,
  ArrowDown,
  Minus,
  BookOpen,
  Lock,
  Crown,
  Shield,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  toolsAPI,
  PivotPointsData,
  PERankingsData,
  TrendsData,
  EconomicCalendarData,
  GeopoliticalData,
  BacktestResult,
  BacktestRequest,
  AdviceData,
  AdviceCard,
} from "@/lib/api";
import { usePremium } from "@/lib/PremiumContext";
import { useFormatCurrency } from "@/lib/SettingsContext";

type TabType = "pivot" | "per" | "trends" | "calendar" | "geopolitical" | "backtest" | "advice";

export default function TradingToolsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("calendar");

  const tabs = [
    { id: "calendar" as TabType, label: "Calendrier Eco", icon: Calendar },
    { id: "geopolitical" as TabType, label: "Geopolitique", icon: Globe },
    { id: "trends" as TabType, label: "Tendances", icon: TrendingUp },
    { id: "advice" as TabType, label: "Fiches Conseils", icon: BookOpen },
    { id: "pivot" as TabType, label: "Points Pivots", icon: Target },
    { id: "per" as TabType, label: "Palmares PER", icon: BarChart3 },
    { id: "backtest" as TabType, label: "Backtest", icon: Play },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold mb-2">
          <span className="gradient-text">Outils de Trading</span>
        </h1>
        <p className="text-muted-foreground">
          Analysez les marches avec nos outils professionnels
        </p>
      </div>

      {/* Tabs */}
      <div className="glass-card p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-white/10"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === "pivot" && <PivotPointsTab />}
        {activeTab === "per" && <PERankingsTab />}
        {activeTab === "trends" && <TrendsTab />}
        {activeTab === "calendar" && <EconomicCalendarTab />}
        {activeTab === "geopolitical" && <GeopoliticalTab />}
        {activeTab === "backtest" && <BacktestTab />}
        {activeTab === "advice" && <AdviceTab />}
      </motion.div>
    </div>
  );
}

// ============== PIVOT POINTS TAB ==============
function PivotPointsTab() {
  const formatCurrency = useFormatCurrency();
  const [symbol, setSymbol] = useState("AAPL");
  const [method, setMethod] = useState("standard");
  const [data, setData] = useState<PivotPointsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const methods = [
    { value: "standard", label: "Standard" },
    { value: "fibonacci", label: "Fibonacci" },
    { value: "woodie", label: "Woodie" },
    { value: "camarilla", label: "Camarilla" },
    { value: "demark", label: "DeMark" },
  ];

  const calculate = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await toolsAPI.getPivotPoints(symbol, method);
      setData(result);
    } catch (e: any) {
      setError(e.message || "Erreur lors du calcul");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Calculateur Points Pivots</h2>
      </div>

      {/* Input */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-muted-foreground mb-2">Symbole</label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-primary focus:outline-none"
            placeholder="AAPL, MSFT, BTC-USD..."
          />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-2">Methode</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-primary focus:outline-none"
          >
            {methods.map((m) => (
              <option key={m.value} value={m.value} className="bg-background">
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={calculate}
            disabled={isLoading || !symbol}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            Calculer
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/20 text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Results */}
      {data && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xl font-bold">{data.symbol}</span>
              <span className="text-muted-foreground ml-2">({data.method})</span>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Prix actuel</p>
              <p className="text-xl font-bold">{formatCurrency(data.current_price)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Resistances */}
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400 mb-2">R3</p>
              <p className="text-lg font-bold">{formatCurrency(data.r3)}</p>
            </div>
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400 mb-2">R2</p>
              <p className="text-lg font-bold">{formatCurrency(data.r2)}</p>
            </div>
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400 mb-2">R1</p>
              <p className="text-lg font-bold">{formatCurrency(data.r1)}</p>
            </div>

            {/* Pivot */}
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-sm text-primary mb-2">Pivot</p>
              <p className="text-lg font-bold">{formatCurrency(data.pivot)}</p>
            </div>

            {/* Supports */}
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-green-400 mb-2">S1</p>
              <p className="text-lg font-bold">{formatCurrency(data.s1)}</p>
            </div>
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-green-400 mb-2">S2</p>
              <p className="text-lg font-bold">{formatCurrency(data.s2)}</p>
            </div>
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-green-400 mb-2">S3</p>
              <p className="text-lg font-bold">{formatCurrency(data.s3)}</p>
            </div>

            {/* Info */}
            <div className="p-4 rounded-xl bg-white/5">
              <p className="text-sm text-muted-foreground mb-2">Date</p>
              <p className="text-lg font-bold">{data.date}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 text-sm text-muted-foreground">
            <p><strong>Donnees utilisees:</strong> H: {formatCurrency(data.high)} | L: {formatCurrency(data.low)} | C: {formatCurrency(data.close)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============== P/E RANKINGS TAB ==============
function PERankingsTab() {
  const formatCurrency = useFormatCurrency();
  const [data, setData] = useState<PERankingsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sort, setSort] = useState("asc");
  const [sector, setSector] = useState("");

  const load = async () => {
    setIsLoading(true);
    try {
      const result = await toolsAPI.getPERankings(sector || undefined, 30, sort);
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [sort, sector]);

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Palmares des PER</h2>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm"
          >
            <option value="" className="bg-background">Tous secteurs</option>
            {data?.sectors.map((s) => (
              <option key={s} value={s} className="bg-background">{s}</option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm"
          >
            <option value="asc" className="bg-background">PER croissant</option>
            <option value="desc" className="bg-background">PER decroissant</option>
          </select>

          <button onClick={load} disabled={isLoading} className="p-2 rounded-lg hover:bg-white/10">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : data ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-2 text-sm text-muted-foreground">#</th>
                <th className="text-left py-3 px-2 text-sm text-muted-foreground">Symbole</th>
                <th className="text-left py-3 px-2 text-sm text-muted-foreground">Secteur</th>
                <th className="text-right py-3 px-2 text-sm text-muted-foreground">Prix</th>
                <th className="text-right py-3 px-2 text-sm text-muted-foreground">PER</th>
                <th className="text-right py-3 px-2 text-sm text-muted-foreground">PER Forward</th>
                <th className="text-right py-3 px-2 text-sm text-muted-foreground">Div. Yield</th>
              </tr>
            </thead>
            <tbody>
              {data.rankings.map((item, i) => (
                <tr key={item.symbol} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-3 px-2 text-muted-foreground">{i + 1}</td>
                  <td className="py-3 px-2">
                    <div>
                      <p className="font-semibold">{item.symbol}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">{item.name}</p>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-sm text-muted-foreground">{item.sector}</td>
                  <td className="py-3 px-2 text-right">{formatCurrency(item.price)}</td>
                  <td className="py-3 px-2 text-right font-semibold">{item.pe_ratio.toFixed(1)}</td>
                  <td className="py-3 px-2 text-right text-muted-foreground">
                    {item.forward_pe?.toFixed(1) || "-"}
                  </td>
                  <td className="py-3 px-2 text-right text-muted-foreground">
                    {item.dividend_yield > 0 ? `${item.dividend_yield}%` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

// ============== TRENDS TAB ==============
function TrendsTab() {
  const formatCurrency = useFormatCurrency();
  const [data, setData] = useState<TrendsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const result = await toolsAPI.getTrends();
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === "bullish") return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (trend === "bearish") return <ArrowDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-yellow-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Indices */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Tendances Indices</h2>
          </div>
          <button onClick={load} disabled={isLoading} className="p-2 rounded-lg hover:bg-white/10">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>

        {isLoading && !data ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.indices.map((idx) => (
              <div key={idx.symbol} className="p-4 rounded-xl bg-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{idx.name}</span>
                  <TrendIcon trend={idx.trend} />
                </div>
                <p className="text-xl font-bold mb-2">{formatCurrency(idx.price)}</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">1J</p>
                    <p className={cn(idx.change_1d >= 0 ? "text-green-500" : "text-red-500")}>
                      {idx.change_1d >= 0 ? "+" : ""}{idx.change_1d}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">1S</p>
                    <p className={cn(idx.change_1w >= 0 ? "text-green-500" : "text-red-500")}>
                      {idx.change_1w >= 0 ? "+" : ""}{idx.change_1w}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">1M</p>
                    <p className={cn(idx.change_1m >= 0 ? "text-green-500" : "text-red-500")}>
                      {idx.change_1m >= 0 ? "+" : ""}{idx.change_1m}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Sectors */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Performance Secteurs (1 semaine)</h2>
        </div>

        {data?.sectors && (
          <div className="space-y-2">
            {data.sectors.map((sector) => (
              <div key={sector.symbol} className="flex items-center gap-4">
                <span className="w-24 text-sm">{sector.name}</span>
                <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      sector.change_1w >= 0 ? "bg-green-500" : "bg-red-500"
                    )}
                    style={{ width: `${Math.min(Math.abs(sector.change_1w) * 10, 100)}%` }}
                  />
                </div>
                <span className={cn(
                  "w-16 text-right font-semibold",
                  sector.change_1w >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {sector.change_1w >= 0 ? "+" : ""}{sector.change_1w}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Analysis */}
      {data?.analysis && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Analyse IA</h2>
          </div>
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 whitespace-pre-line">
            {data.analysis}
          </div>
        </div>
      )}
    </div>
  );
}

// ============== ECONOMIC CALENDAR TAB ==============
function EconomicCalendarTab() {
  const [data, setData] = useState<EconomicCalendarData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [days, setDays] = useState(14);

  const load = async () => {
    setIsLoading(true);
    try {
      const result = await toolsAPI.getEconomicCalendar(days);
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [days]);

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case "high": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const getCountryFlag = (country: string) => {
    switch (country) {
      case "USA": return "🇺🇸";
      case "EU": return "🇪🇺";
      case "UK": return "🇬🇧";
      case "JP": return "🇯🇵";
      case "CN": return "🇨🇳";
      default: return "🌍";
    }
  };

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Calendrier Economique</h2>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm"
          >
            <option value={7} className="bg-background">7 jours</option>
            <option value={14} className="bg-background">14 jours</option>
            <option value={30} className="bg-background">30 jours</option>
          </select>

          <button onClick={load} disabled={isLoading} className="p-2 rounded-lg hover:bg-white/10">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Impact eleve</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Impact moyen</span>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : data?.events.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Aucun evenement prevu dans cette periode</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.events.map((event, i) => (
            <div
              key={i}
              className={cn(
                "p-4 rounded-xl border transition-colors",
                event.importance === "high"
                  ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40"
                  : "bg-white/5 border-white/10 hover:border-white/20"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={cn("w-2 h-2 rounded-full mt-2", getImportanceColor(event.importance))} />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getCountryFlag(event.country)}</span>
                      <span className="font-semibold">{event.event}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{event.impact}</p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold">{new Date(event.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}</p>
                  <p className="text-muted-foreground">{event.time}</p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Precedent: </span>
                  <span className="font-semibold">{event.previous}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Prevision: </span>
                  <span className="font-semibold">{event.forecast}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============== GEOPOLITICAL TAB ==============

const REGIONS = [
  { key: "americas", label: "Amériques", flag: "🌎", keywords: ["états-unis", "usa", "canada", "mexique", "brésil", "amérique"] },
  { key: "europe", label: "Europe", flag: "🌍", keywords: ["europe", "zone euro", "BCE", "allemagne", "france", "royaume-uni", "ukraine"] },
  { key: "asia", label: "Asie", flag: "🌏", keywords: ["chine", "japon", "asie", "inde", "corée", "taiwan", "banque du japon"] },
  { key: "mideast", label: "Moyen-Orient", flag: "🕌", keywords: ["pétrole", "opep", "iran", "israël", "arabie", "moyen-orient", "golfe"] },
  { key: "africa", label: "Afrique", flag: "🌍", keywords: ["afrique", "nigeria", "égypte", "or", "matières premières"] },
];

function getRegionImpact(analysis: string, keywords: string[]): "high" | "medium" | "low" {
  const lower = analysis.toLowerCase();
  const count = keywords.filter((k) => lower.includes(k.toLowerCase())).length;
  if (count >= 3) return "high";
  if (count >= 1) return "medium";
  return "low";
}

function GeopoliticalTab() {
  const formatCurrency = useFormatCurrency();
  const [data, setData] = useState<GeopoliticalData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await toolsAPI.getGeopoliticalAnalysis();
      setData(result);
    } catch (e: any) {
      setError(e.message || "Erreur lors du chargement");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const chartData = data?.market_data
    ? Object.entries(data.market_data).map(([name, info]) => ({
        name,
        change: info.change,
        price: info.price,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Loading */}
      {isLoading && !data && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Analyse géopolitique en cours...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/20 text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Indicateurs de marché - grille + graphique */}
          {data.market_data && (
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Indicateurs Clés du Marché</h2>
              </div>

              {/* Cartes indicateurs */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {Object.entries(data.market_data).map(([name, info]) => (
                  <div key={name} className="p-4 rounded-xl bg-white/5 text-center border border-white/5 hover:border-primary/20 transition-colors">
                    <p className="text-xs text-muted-foreground mb-2 truncate">{name}</p>
                    <p className="font-bold text-sm">{formatCurrency(info.price)}</p>
                    <div className={cn(
                      "mt-1 inline-flex items-center gap-1 text-sm font-semibold",
                      info.change >= 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {info.change >= 0
                        ? <ArrowUp className="w-3 h-3" />
                        : <ArrowDown className="w-3 h-3" />}
                      {Math.abs(info.change)}%
                    </div>
                  </div>
                ))}
              </div>

              {/* Graphique des variations */}
              <div>
                <p className="text-sm text-muted-foreground mb-3">Variation journalière (%)</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a2e",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number) => [`${value > 0 ? "+" : ""}${value}%`, "Variation"]}
                      cursor={{ fill: "rgba(255,255,255,0.03)" }}
                    />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                    <Bar dataKey="change" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.change >= 0 ? "#22c55e" : "#ef4444"}
                          fillOpacity={0.8}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Carte d'impact régional */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Globe className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Impact par Région</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {REGIONS.map((region) => {
                const impact = getRegionImpact(data.analysis, region.keywords);
                const impactConfig = {
                  high: { label: "Élevé", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", bar: "bg-red-500", width: "w-full" },
                  medium: { label: "Modéré", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", bar: "bg-yellow-500", width: "w-2/3" },
                  low: { label: "Faible", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30", bar: "bg-green-500", width: "w-1/3" },
                }[impact];

                return (
                  <div
                    key={region.key}
                    className={cn("p-4 rounded-xl border", impactConfig.bg)}
                  >
                    <div className="text-2xl mb-2">{region.flag}</div>
                    <p className="font-semibold text-sm">{region.label}</p>
                    <p className={cn("text-xs mt-1", impactConfig.color)}>{impactConfig.label}</p>
                    <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", impactConfig.bar, impactConfig.width)} />
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Impact estimé basé sur la fréquence de mention dans l'analyse IA
            </p>
          </div>

          {/* Analyse textuelle avec ReactMarkdown */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Analyse Géopolitique Détaillée</h2>
              </div>
              <button
                onClick={load}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 text-sm text-muted-foreground transition-colors"
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                <span className="hidden sm:inline">Actualiser</span>
              </button>
            </div>

            <div className="prose prose-invert max-w-none
              prose-headings:text-foreground prose-headings:font-semibold
              prose-h2:text-base prose-h2:mt-6 prose-h2:mb-3 prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-2
              prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-2 prose-h3:text-primary
              prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:text-sm
              prose-strong:text-foreground prose-strong:font-semibold
              prose-li:text-muted-foreground prose-li:text-sm
              prose-ul:my-3 prose-ol:my-3
              prose-hr:border-white/10">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {data.analysis}
              </ReactMarkdown>
            </div>

            <p className="text-xs text-muted-foreground mt-6 pt-4 border-t border-white/10 text-right">
              Généré le : {new Date(data.generated_at).toLocaleString("fr-FR")}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ============== BACKTEST TAB ==============
function BacktestTab() {
  const formatCurrency = useFormatCurrency();
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<BacktestRequest>({
    symbol: "AAPL",
    strategy: "sma_crossover",
    period: "1y",
    initial_capital: 10000,
    sma_short: 20,
    sma_long: 50,
    rsi_oversold: 30,
    rsi_overbought: 70,
  });

  const strategies = [
    { value: "sma_crossover", label: "Croisement SMA", desc: "Achat quand SMA courte > SMA longue" },
    { value: "rsi", label: "RSI", desc: "Achat en survente, vente en surachat" },
    { value: "macd", label: "MACD", desc: "Achat quand MACD > Signal" },
    { value: "bollinger", label: "Bollinger Bands", desc: "Achat en bas, vente en haut" },
  ];

  const periods = [
    { value: "6mo", label: "6 mois" },
    { value: "1y", label: "1 an" },
    { value: "2y", label: "2 ans" },
    { value: "5y", label: "5 ans" },
  ];

  const runBacktest = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await toolsAPI.runBacktest(form);
      setResult(res);
    } catch (e: any) {
      setError(e.message || "Erreur lors du backtest");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Play className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Backtest Manager</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Symbole</label>
            <input
              type="text"
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">Strategie</label>
            <select
              value={form.strategy}
              onChange={(e) => setForm({ ...form, strategy: e.target.value as any })}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10"
            >
              {strategies.map((s) => (
                <option key={s.value} value={s.value} className="bg-background">{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">Periode</label>
            <select
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10"
            >
              {periods.map((p) => (
                <option key={p.value} value={p.value} className="bg-background">{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">Capital Initial</label>
            <input
              type="number"
              value={form.initial_capital}
              onChange={(e) => setForm({ ...form, initial_capital: Number(e.target.value) })}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Strategy specific params */}
        {form.strategy === "sma_crossover" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">SMA Courte</label>
              <input
                type="number"
                value={form.sma_short}
                onChange={(e) => setForm({ ...form, sma_short: Number(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">SMA Longue</label>
              <input
                type="number"
                value={form.sma_long}
                onChange={(e) => setForm({ ...form, sma_long: Number(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10"
              />
            </div>
          </div>
        )}

        {form.strategy === "rsi" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">RSI Survente</label>
              <input
                type="number"
                value={form.rsi_oversold}
                onChange={(e) => setForm({ ...form, rsi_oversold: Number(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">RSI Surachat</label>
              <input
                type="number"
                value={form.rsi_overbought}
                onChange={(e) => setForm({ ...form, rsi_overbought: Number(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10"
              />
            </div>
          </div>
        )}

        <button
          onClick={runBacktest}
          disabled={isLoading || !form.symbol}
          className="btn-primary flex items-center gap-2"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Lancer la Simulation
        </button>

        {error && (
          <div className="p-4 rounded-lg bg-red-500/20 text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Resultats: {result.symbol}</h3>
            <span className="text-sm text-muted-foreground">{result.strategy} - {result.period}</span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white/5 text-center">
              <p className="text-sm text-muted-foreground mb-1">Capital Final</p>
              <p className="text-xl font-bold">{formatCurrency(result.final_equity)}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 text-center">
              <p className="text-sm text-muted-foreground mb-1">Rendement</p>
              <p className={cn(
                "text-xl font-bold",
                result.total_return >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {result.total_return >= 0 ? "+" : ""}{result.total_return}%
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 text-center">
              <p className="text-sm text-muted-foreground mb-1">Win Rate</p>
              <p className="text-xl font-bold">{result.win_rate}%</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 text-center">
              <p className="text-sm text-muted-foreground mb-1">Max Drawdown</p>
              <p className="text-xl font-bold text-red-500">-{result.max_drawdown}%</p>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Nombre de trades: {result.num_trades}</p>
          </div>

          {/* Trades */}
          {result.trades.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Derniers Trades</h4>
              <div className="max-h-[200px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Type</th>
                      <th className="text-right py-2">Prix</th>
                      <th className="text-right py-2">Valeur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((trade, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="py-2">{trade.date}</td>
                        <td className={cn("py-2", trade.type === "BUY" ? "text-green-500" : "text-red-500")}>
                          {trade.type}
                        </td>
                        <td className="py-2 text-right">{formatCurrency(trade.price)}</td>
                        <td className="py-2 text-right">{formatCurrency(trade.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============== ADVICE TAB (FICHES CONSEILS) ==============
function AdviceTab() {
  const { isPremium } = usePremium();
  const [data, setData] = useState<AdviceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedCard, setSelectedCard] = useState<AdviceCard | null>(null);
  const [loadingCard, setLoadingCard] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const result = await toolsAPI.getAdvice(selectedCategory || undefined);
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedCategory]);

  const openCard = async (card: AdviceCard) => {
    if (card.locked) {
      setSelectedCard(card);
      return;
    }

    setLoadingCard(true);
    try {
      const detail = await toolsAPI.getAdviceDetail(card.id);
      setSelectedCard(detail);
    } catch (e: any) {
      if (e.status === 403) {
        setSelectedCard({ ...card, locked: true, lock_message: "Contenu reserve aux membres Premium" });
      }
    } finally {
      setLoadingCard(false);
    }
  };

  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
      "trending-up": TrendingUp,
      "activity": Activity,
      "shield": Shield,
      "brain": Brain,
      "chart": BarChart3,
      "bar-chart": BarChart3,
      "target": Target,
      "percent": Percent,
    };
    return icons[iconName] || BookOpen;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Fiches Conseils Trading</h2>
          </div>

          <div className="flex items-center gap-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm"
            >
              <option value="" className="bg-background">Toutes les categories</option>
              {data?.categories.map((cat) => (
                <option key={cat.key} value={cat.key} className="bg-background">
                  {cat.label}
                </option>
              ))}
            </select>

            <button onClick={load} disabled={isLoading} className="p-2 rounded-lg hover:bg-white/10">
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </button>
          </div>
        </div>

        {!isPremium && (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-3">
            <Crown className="w-5 h-5 text-yellow-400" />
            <p className="text-sm text-yellow-400">
              Certaines fiches sont reservees aux membres Premium.{" "}
              <a href="/premium" className="underline hover:no-underline">
                Passer Premium
              </a>
            </p>
          </div>
        )}
      </div>

      {/* Cards Grid */}
      {isLoading && !data ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.advice.map((card) => {
            const Icon = getIcon(card.icon);
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => openCard(card)}
                className={cn(
                  "glass-card p-5 cursor-pointer transition-colors relative overflow-hidden",
                  card.locked ? "opacity-80" : "hover:bg-white/5"
                )}
              >
                {card.locked && (
                  <div className="absolute top-3 right-3">
                    <div className="p-1.5 rounded-full bg-yellow-500/20">
                      <Lock className="w-3.5 h-3.5 text-yellow-400" />
                    </div>
                  </div>
                )}

                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>

                <h3 className="font-semibold mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{card.summary}</p>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-muted-foreground capitalize">
                    {data?.categories.find((c) => c.key === card.category)?.label || card.category}
                  </span>
                  {card.premium_only && (
                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      Premium
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Card Detail Modal */}
      {selectedCard && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCard(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto"
          >
            {loadingCard ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : selectedCard.locked ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Lock className="w-10 h-10 text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">{selectedCard.title}</h3>
                <p className="text-muted-foreground mb-6">{selectedCard.lock_message}</p>
                <a
                  href="/premium"
                  className="inline-flex items-center gap-2 btn-primary"
                >
                  <Crown className="w-4 h-4" />
                  Passer Premium
                </a>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      {(() => {
                        const Icon = getIcon(selectedCard.icon);
                        return <Icon className="w-6 h-6 text-primary" />;
                      })()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{selectedCard.title}</h2>
                      <p className="text-sm text-muted-foreground">
                        {data?.categories.find((c) => c.key === selectedCard.category)?.label}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCard(null)}
                    className="p-2 rounded-lg hover:bg-white/10"
                  >
                    <span className="text-xl">&times;</span>
                  </button>
                </div>

                <div className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 prose-table:text-sm prose-th:bg-white/5 prose-th:p-2 prose-td:p-2 prose-td:border-white/10 prose-img:rounded-xl prose-img:border prose-img:border-white/10">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      img: ({ node, ...props }) => (
                        <img {...props} className="max-w-full h-auto rounded-xl border border-white/10 my-4" loading="lazy" />
                      ),
                      table: ({ node, ...props }) => (
                        <div className="overflow-x-auto my-4">
                          <table {...props} className="w-full border-collapse border border-white/10 rounded-lg overflow-hidden" />
                        </div>
                      ),
                      th: ({ node, ...props }) => (
                        <th {...props} className="bg-white/5 p-2 text-left font-semibold border border-white/10" />
                      ),
                      td: ({ node, ...props }) => (
                        <td {...props} className="p-2 border border-white/10" />
                      ),
                      code: ({ node, inline, ...props }: any) => (
                        inline
                          ? <code {...props} className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-sm" />
                          : <code {...props} className="block bg-white/5 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm" />
                      ),
                      blockquote: ({ node, ...props }) => (
                        <blockquote {...props} className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4" />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul {...props} className="list-disc list-inside space-y-1 my-2" />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol {...props} className="list-decimal list-inside space-y-1 my-2" />
                      ),
                    }}
                  >
                    {selectedCard.content}
                  </ReactMarkdown>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
