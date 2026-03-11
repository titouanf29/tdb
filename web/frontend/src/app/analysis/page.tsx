"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import { analysisAPI, favoritesAPI, Analysis } from "@/lib/api";
import { getAssetInfo, getAssetLogo } from "@/lib/assetInfo";

export default function AnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [symbol, setSymbol] = useState(searchParams.get("symbol") || "");
  const [timeframe, setTimeframe] = useState("1d");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);

  // Auto-load if symbol in URL
  useEffect(() => {
    const urlSymbol = searchParams.get("symbol");
    if (urlSymbol) {
      setSymbol(urlSymbol);
      handleSearch(urlSymbol);
    }
  }, [searchParams]);

  const handleSearch = async (searchSymbol?: string) => {
    const s = (searchSymbol || symbol).trim().toUpperCase();
    if (!s) return;

    setIsLoading(true);
    setError("");

    try {
      const data = await analysisAPI.analyze(s, timeframe);
      setAnalysis(data);

      // Check if favorite
      const favCheck = await favoritesAPI.checkFavorite(s);
      setIsFavorite(favCheck.is_favorite);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'analyse");
      setAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (!analysis) return;
    try {
      if (isFavorite) {
        await favoritesAPI.removeFavorite(analysis.symbol);
      } else {
        await favoritesAPI.addFavorite(analysis.symbol);
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Search */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4">Analyse IA</h2>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Entrez un symbole (ex: AAPL, BTC-USD)"
              className="w-full input pl-11 text-lg"
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
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

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-loss/10 border border-loss/30 text-loss">
          {error}
        </div>
      )}

      {/* Results */}
      {analysis && (
        <>
          {/* Asset Header */}
          <AssetHeader analysis={analysis} isFavorite={isFavorite} toggleFavorite={toggleFavorite} />

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
                    <span className="font-bold text-lg">{formatCurrency(analysis.price.current)}</span>
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
                name="RSI"
                value={analysis.indicators.rsi.value.toFixed(1)}
                signal={analysis.indicators.rsi.signal as any}
              />
              <IndicatorCard
                name="MACD"
                value={analysis.indicators.macd.value.toFixed(2)}
                signal={analysis.indicators.macd.signal as any}
              />
              <IndicatorCard
                name="EMA 20"
                value={formatCurrency(analysis.indicators.ema.ema20)}
                signal={analysis.price.current > analysis.indicators.ema.ema20 ? "bullish" : "bearish"}
              />
              <IndicatorCard
                name="EMA 50"
                value={formatCurrency(analysis.indicators.ema.ema50)}
                signal={analysis.price.current > analysis.indicators.ema.ema50 ? "bullish" : "bearish"}
              />
              <IndicatorCard
                name="ATR"
                value={analysis.indicators.atr.toFixed(2)}
                signal="neutral"
              />
              <IndicatorCard
                name="Volume"
                value={`${analysis.indicators.volume_ratio.toFixed(2)}x`}
                signal={analysis.indicators.volume_ratio > 1 ? "bullish" : "neutral"}
              />
            </div>
          </motion.div>

          {/* Risk suggestion */}
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

          {/* Detailed Analysis */}
          <DetailedAnalysis analysis={analysis} />
        </>
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
}: {
  name: string;
  value: string;
  signal: "bullish" | "bearish" | "neutral" | "oversold" | "overbought";
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
    <div className={cn("p-4 rounded-xl border", signalColors[normalizedSignal])}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{name}</span>
        {signalIcons[normalizedSignal]}
      </div>
      <p className="font-bold">{value}</p>
    </div>
  );
}

// Asset Header with logo and name
function AssetHeader({
  analysis,
  isFavorite,
  toggleFavorite
}: {
  analysis: Analysis;
  isFavorite: boolean;
  toggleFavorite: () => void;
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
function DetailedAnalysis({ analysis }: { analysis: Analysis }) {
  const getRSIInterpretation = () => {
    const rsi = analysis.indicators.rsi.value;
    if (rsi < 30) {
      return {
        status: "oversold",
        icon: <CheckCircle className="w-5 h-5 text-profit" />,
        title: "Zone de survente",
        description: `Le RSI a ${rsi.toFixed(1)} indique que l'actif est survendu. Cela suggere un potentiel rebond haussier. Les acheteurs pourraient bientot reprendre le controle.`,
        color: "text-profit",
        bgColor: "bg-profit/10 border-profit/20"
      };
    } else if (rsi > 70) {
      return {
        status: "overbought",
        icon: <AlertTriangle className="w-5 h-5 text-loss" />,
        title: "Zone de surachat",
        description: `Le RSI a ${rsi.toFixed(1)} indique que l'actif est surachete. Une correction baissiere est probable. Prudence recommandee pour les nouvelles positions longues.`,
        color: "text-loss",
        bgColor: "bg-loss/10 border-loss/20"
      };
    } else {
      return {
        status: "neutral",
        icon: <Activity className="w-5 h-5 text-primary" />,
        title: "Zone neutre",
        description: `Le RSI a ${rsi.toFixed(1)} se situe dans une zone neutre. Pas de signal extreme de surachat ou de survente. L'actif evolue normalement.`,
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
        description: `Le MACD (${macd.value.toFixed(4)}) est au-dessus de sa ligne de signal (${macd.signal_line.toFixed(4)}). L'histogramme positif confirme la dynamique haussiere. Bon moment pour considerer des positions longues.`,
        color: "text-profit",
        bgColor: "bg-profit/10 border-profit/20"
      };
    } else {
      return {
        icon: <TrendingDown className="w-5 h-5 text-loss" />,
        title: "Signal baissier",
        description: `Le MACD (${macd.value.toFixed(4)}) est en dessous de sa ligne de signal (${macd.signal_line.toFixed(4)}). L'histogramme negatif indique une pression vendeuse. Prudence recommandee.`,
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
        title: "Proche de la bande superieure",
        description: `Le prix (${formatCurrency(price)}) est proche ou au-dessus de la bande superieure (${formatCurrency(bb.upper)}). Cela peut indiquer une surchauffe du marche. Un retour vers la moyenne (${formatCurrency(bb.middle)}) est possible.`,
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
        description: `Le prix (${formatCurrency(price)}) evolue entre les bandes de Bollinger (${formatCurrency(bb.lower)} - ${formatCurrency(bb.upper)}). Le marche est dans une phase normale avec une volatilite moderee.`,
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
        title: "Tendance haussiere",
        description: `Le prix (${formatCurrency(price)}) est au-dessus des moyennes mobiles EMA20 (${formatCurrency(ema.ema20)}) et EMA50 (${formatCurrency(ema.ema50)}). La structure du marche est haussiere. Les corrections peuvent etre des opportunites d'achat.`,
        color: "text-profit",
        bgColor: "bg-profit/10 border-profit/20"
      };
    } else if (trend === "BEARISH") {
      return {
        icon: <TrendingDown className="w-5 h-5 text-loss" />,
        title: "Tendance baissiere",
        description: `Le prix (${formatCurrency(price)}) est en dessous des moyennes mobiles EMA20 (${formatCurrency(ema.ema20)}) et EMA50 (${formatCurrency(ema.ema50)}). La structure du marche est baissiere. Evitez les positions longues jusqu'a un retournement confirme.`,
        color: "text-loss",
        bgColor: "bg-loss/10 border-loss/20"
      };
    } else {
      return {
        icon: <Activity className="w-5 h-5 text-warning" />,
        title: "Tendance neutre / Consolidation",
        description: `Le prix oscille autour des moyennes mobiles sans direction claire. Le marche est en phase de consolidation. Attendez une cassure nette avant de prendre position.`,
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
        title: "Volume eleve",
        description: `Le volume actuel est ${ratio.toFixed(2)}x superieur a la moyenne. Un fort volume confirme la validite du mouvement en cours. Les mouvements avec volume sont plus fiables.`,
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
        description: `Le volume actuel (${ratio.toFixed(2)}x la moyenne) est dans la norme. L'activite du marche est standard sans exces ni manque de liquidite.`,
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
        {/* Trend Analysis */}
        <div className={cn("p-4 rounded-xl border", trendInfo.bgColor)}>
          <div className="flex items-start gap-3">
            {trendInfo.icon}
            <div>
              <h4 className={cn("font-semibold", trendInfo.color)}>{trendInfo.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">{trendInfo.description}</p>
            </div>
          </div>
        </div>

        {/* RSI Analysis */}
        <div className={cn("p-4 rounded-xl border", rsiInfo.bgColor)}>
          <div className="flex items-start gap-3">
            {rsiInfo.icon}
            <div>
              <h4 className={cn("font-semibold", rsiInfo.color)}>RSI: {rsiInfo.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">{rsiInfo.description}</p>
            </div>
          </div>
        </div>

        {/* MACD Analysis */}
        <div className={cn("p-4 rounded-xl border", macdInfo.bgColor)}>
          <div className="flex items-start gap-3">
            {macdInfo.icon}
            <div>
              <h4 className={cn("font-semibold", macdInfo.color)}>MACD: {macdInfo.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">{macdInfo.description}</p>
            </div>
          </div>
        </div>

        {/* Bollinger Analysis */}
        <div className={cn("p-4 rounded-xl border", bbInfo.bgColor)}>
          <div className="flex items-start gap-3">
            {bbInfo.icon}
            <div>
              <h4 className={cn("font-semibold", bbInfo.color)}>Bollinger: {bbInfo.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">{bbInfo.description}</p>
            </div>
          </div>
        </div>

        {/* Volume Analysis */}
        <div className={cn("p-4 rounded-xl border", volumeInfo.bgColor)}>
          <div className="flex items-start gap-3">
            {volumeInfo.icon}
            <div>
              <h4 className={cn("font-semibold", volumeInfo.color)}>{volumeInfo.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">{volumeInfo.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-primary" />
          Resume de l'analyse
        </h4>
        <p className="text-sm text-muted-foreground">
          {analysis.score.total >= 75 ? (
            <>L'ensemble des indicateurs techniques convergent vers un signal <span className="text-profit font-semibold">fortement haussier</span>. Les conditions sont favorables pour une prise de position longue avec un ratio risque/rendement de 1:{analysis.risk.risk_reward}.</>
          ) : analysis.score.total >= 60 ? (
            <>Les indicateurs montrent une tendance <span className="text-profit font-semibold">moderement haussiere</span>. Le marche presente des opportunites mais avec une conviction moins forte. Gerez votre risque avec attention.</>
          ) : analysis.score.total >= 40 ? (
            <>Le marche est actuellement en <span className="text-warning font-semibold">phase neutre</span>. Aucune direction claire ne se degage. Il est preferable d'attendre un signal plus net avant de prendre position.</>
          ) : analysis.score.total >= 25 ? (
            <>Les indicateurs pointent vers une tendance <span className="text-loss font-semibold">moderement baissiere</span>. Evitez les positions longues et considerez des strategies de couverture.</>
          ) : (
            <>L'ensemble des signaux indiquent une <span className="text-loss font-semibold">forte pression vendeuse</span>. Il est fortement deconseille de prendre des positions longues dans ces conditions.</>
          )}
        </p>
      </div>
    </motion.div>
  );
}
