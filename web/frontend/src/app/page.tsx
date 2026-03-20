"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import {
  TrendingUp, TrendingDown, Star, Activity, ArrowUpRight, ArrowDownRight,
  Target, RefreshCw, Loader2, Globe, Newspaper, Shield, Plus, Wallet,
  Bot, BarChart3, Zap, Users, Brain, Lock, ChevronRight, LineChart,
  Sparkles, Bell, BookOpen, ArrowRight, CheckCircle2, Play, Crown, X,
  Settings2, GripVertical, Eye, EyeOff, SortAsc, SortDesc, ExternalLink,
  Clock, Filter, Layers, ChevronUp, ChevronDown,
} from "lucide-react";
import { cn, formatPercent, formatVolume } from "@/lib/utils";
import { walletAPI, favoritesAPI, adminAPI, aiAPI, marketAPI, WalletBalance, TradingStats, Favorite, MarketNews, SummaryPoint, Position } from "@/lib/api";
import { useFormatCurrency, useFormatPrice } from "@/lib/SettingsContext";
import { useAuth } from "@/lib/AuthContext";
import { usePremium } from "@/lib/PremiumContext";
import { getAssetInfo, getAssetLogo } from "@/lib/assetInfo";
import { TDBLogo, TDBLogoSm } from "@/components/ui/TDBLogo";
import { SessionSummaryWidget } from "@/components/dashboard/SessionSummary";

// ─────────────────────────────────────────────────────────────────────────────
//  LANDING PAGE
// ─────────────────────────────────────────────────────────────────────────────

const TICKER_ITEMS = [
  { symbol: "AAPL", price: "212.45", change: "+1.23%" },
  { symbol: "NVDA", price: "138.67", change: "+3.87%" },
  { symbol: "BTC", price: "97 420", change: "+2.14%" },
  { symbol: "MC.PA", price: "612.10", change: "-0.43%" },
  { symbol: "AIR.PA", price: "178.92", change: "+1.05%" },
  { symbol: "ETH", price: "3 482", change: "+4.21%" },
  { symbol: "TSLA", price: "254.88", change: "+5.32%" },
  { symbol: "ASML", price: "742.30", change: "-0.87%" },
  { symbol: "SAP.DE", price: "248.50", change: "+0.69%" },
  { symbol: "OR.PA", price: "381.70", change: "+1.44%" },
];

const FEATURES_MAIN = [
  {
    id: "analysis",
    icon: BarChart3,
    badge: "Intelligence Artificielle",
    title: "Analyse technique automatique",
    desc: "Entrez n'importe quel symbole et obtenez instantanément une analyse complète : RSI, MACD, Bollinger Bands, niveaux clés et score global interprété par l'IA.",
    bullets: [
      "Score technique de 0 à 100",
      "Supports & résistances automatiques",
      "Stratégies de trading suggérées",
      "Signaux haussiers / baissiers clairs",
    ],
    accentColor: "text-blue-400",
    checkBg: "bg-blue-500/15 border-blue-500/20",
    glowColor: "bg-blue-500/20",
    borderColor: "border-blue-500/20",
  },
  {
    id: "scanner",
    icon: Zap,
    badge: "Temps Réel",
    title: "Scanner de marchés intelligent",
    desc: "Scannez des centaines d'actifs simultanément pour détecter les meilleures opportunités techniques. RSI extrême, breakouts, volumes anormaux — tout en un clic.",
    bullets: [
      "Filtres multi-critères avancés",
      "800+ actifs scannés en continu",
      "Top performers et signaux forts",
      "Actions, ETFs, cryptos, forex",
    ],
    accentColor: "text-cyan-400",
    checkBg: "bg-cyan-500/15 border-cyan-500/20",
    glowColor: "bg-cyan-500/20",
    borderColor: "border-cyan-500/20",
  },
  {
    id: "ai",
    icon: Brain,
    badge: "Disponible 24h/24",
    title: "Votre assistant IA trading",
    desc: "Posez n'importe quelle question sur les marchés ou vos positions. Notre IA spécialisée vous répond avec des explications claires, pédagogiques et adaptées.",
    bullets: [
      "Analyse de vos positions en direct",
      "Explications pédagogiques détaillées",
      "Stratégies personnalisées",
      "Résumés des actualités économiques",
    ],
    accentColor: "text-purple-400",
    checkBg: "bg-purple-500/15 border-purple-500/20",
    glowColor: "bg-purple-500/20",
    borderColor: "border-purple-500/20",
  },
];

const SECONDARY_FEATURES = [
  {
    icon: Globe,
    title: "Marchés Mondiaux",
    desc: "CAC 40, DAX, S&P 500, Nasdaq, Nikkei, crypto — 800+ actifs dans 9 marchés couverts en temps réel.",
    colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    icon: Wallet,
    title: "Wallet Virtuel",
    desc: "Simulez vos trades avec 10 000 $ virtuels. Mesurez vos performances sans risquer un centime réel.",
    colorClass: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  },
  {
    icon: Star,
    title: "Watchlist Personnalisée",
    desc: "Suivez vos actifs favoris et consultez leurs performances et alertes en direct à tout moment.",
    colorClass: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  },
];

const STATS_DATA = [
  { value: "842+", label: "Actifs disponibles" },
  { value: "9", label: "Marchés couverts" },
  { value: "0 €", label: "Pour commencer" },
  { value: "30 s", label: "Pour s'inscrire" },
];

const MARKETS_PREVIEW = [
  { name: "CAC 40",   flag: "🇫🇷", change: "+0.82%", up: true  },
  { name: "DAX 40",   flag: "🇩🇪", change: "+1.14%", up: true  },
  { name: "S&P 500",  flag: "🇺🇸", change: "+0.67%", up: true  },
  { name: "Nasdaq",   flag: "🇺🇸", change: "+1.43%", up: true  },
  { name: "FTSE 100", flag: "🇬🇧", change: "-0.21%", up: false },
  { name: "Bitcoin",  flag: "🪙",  change: "+2.14%", up: true  },
];

const CHAT_MESSAGES = [
  { role: "user", text: "Analyse le RSI de AAPL pour moi" },
  { role: "ai",   text: "Le RSI d'AAPL est à 62 — zone neutre légèrement haussière. Pas de surachat, tendance positive au-dessus de l'EMA 20." },
  { role: "user", text: "Est-ce un bon moment pour acheter ?" },
  { role: "ai",   text: "Setup favorable sur un pullback vers l'EMA 20 (~135 $). Stop conseillé à 130 $. R/R ≈ 2:1." },
];

const SCANNER_RESULTS = [
  { symbol: "AAPL",  signal: "RSI survendu",        strength: "FORT",  change: "+2.1%", up: true },
  { symbol: "BTC",   signal: "Breakout résistance",  strength: "FORT",  change: "+3.4%", up: true },
  { symbol: "OR.PA", signal: "MACD croisement +",    strength: "MOYEN", change: "+0.8%", up: true },
  { symbol: "TSLA",  signal: "Volume ×2.4",          strength: "FORT",  change: "+5.2%", up: true },
];


// ── Mini demo components ──────────────────────────────────────────────────────

function AnalysisDemo() {
  const indicators = [
    { name: "RSI",    val: "62",     label: "Neutre",    color: "text-yellow-400" },
    { name: "MACD",   val: "",       label: "Haussier ↑",color: "text-emerald-400" },
    { name: "EMA 20", val: "138.2",  label: "",          color: "text-blue-400" },
    { name: "Score",  val: "74",     label: "/100",      color: "text-primary" },
  ];
  return (
    <div className="rounded-2xl overflow-hidden border border-blue-500/20 bg-card/70 backdrop-blur-sm p-4 shadow-xl">
      <div className="h-28 mb-4 relative">
        <AnimatedChart />
        <div className="absolute top-1 left-1 flex items-center gap-2">
          <span className="text-xs font-bold text-white">NVDA</span>
          <span className="text-xs text-emerald-400">+3.87%</span>
        </div>
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, type: "spring", stiffness: 300 }}
          className="absolute top-1 right-1 w-12 h-12 rounded-full bg-primary/20 border border-primary/40 flex flex-col items-center justify-center"
        >
          <span className="text-xs font-black text-primary leading-none">74</span>
          <span className="text-[8px] text-white/40 leading-none">/100</span>
        </motion.div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {indicators.map((ind, i) => (
          <motion.div
            key={ind.name}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.08 }}
            className="p-2 rounded-lg bg-white/5 border border-white/5"
          >
            <p className="text-[10px] text-white/40">{ind.name}</p>
            <p className={cn("text-xs font-bold", ind.color)}>{ind.val}{ind.label}</p>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8 }}
        className="mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2"
      >
        <TrendingUp className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
        <p className="text-[11px] text-emerald-300">Signal haussier — Momentum positif</p>
      </motion.div>
    </div>
  );
}

function ScannerDemo() {
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setVisible(v => v < SCANNER_RESULTS.length ? v + 1 : v), 700);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="rounded-2xl overflow-hidden border border-cyan-500/20 bg-card/70 backdrop-blur-sm p-4 shadow-xl">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
        <motion.div
          className="w-2 h-2 rounded-full bg-cyan-400"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        <span className="text-xs text-cyan-400 font-semibold">Scanner actif</span>
        <span className="ml-auto text-[10px] text-white/30">{visible}/{SCANNER_RESULTS.length} signaux</span>
      </div>
      <div className="space-y-2 min-h-[140px]">
        {SCANNER_RESULTS.map((r, i) => (
          <AnimatePresence key={r.symbol}>
            {i < visible && (
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/5 border border-white/5"
              >
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/70 flex-shrink-0">
                  {r.symbol.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white">{r.symbol}</p>
                  <p className="text-[10px] text-white/40 truncate">{r.signal}</p>
                </div>
                <span className={cn("text-xs font-bold", r.up ? "text-emerald-400" : "text-rose-400")}>{r.change}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0",
                  r.strength === "FORT" ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-400"
                )}>{r.strength}</span>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>
    </div>
  );
}

function ChatDemo() {
  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    if (step >= CHAT_MESSAGES.length) return;
    const delay = CHAT_MESSAGES[step]?.role === "ai" ? 800 : 1400;
    const t1 = setTimeout(() => setTyping(true), delay * 0.3);
    const t2 = setTimeout(() => { setTyping(false); setStep(s => s + 1); }, delay);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [step]);
  return (
    <div className="rounded-2xl overflow-hidden border border-purple-500/20 bg-card/70 backdrop-blur-sm p-4 shadow-xl">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
        <div className="w-7 h-7 rounded-full bg-purple-500/30 flex items-center justify-center">
          <Brain className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <span className="text-xs text-purple-400 font-semibold">Assistant IA</span>
        <div className="ml-auto flex items-center gap-1">
          <motion.div className="w-1.5 h-1.5 rounded-full bg-emerald-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
          <span className="text-[10px] text-emerald-400">En ligne</span>
        </div>
      </div>
      <div className="space-y-2 min-h-[160px]">
        {CHAT_MESSAGES.slice(0, step).map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "max-w-[88%] px-3 py-2 rounded-xl text-xs leading-relaxed",
              m.role === "user"
                ? "ml-auto bg-primary/30 text-white"
                : "bg-white/5 border border-white/8 text-white/80"
            )}
          >
            {m.text}
          </motion.div>
        ))}
        {typing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1 px-3 py-2 w-fit">
            {[0, 1, 2].map(i => (
              <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-white/30"
                animate={{ y: [0, -4, 0] }} transition={{ duration: 0.5, delay: i * 0.12, repeat: Infinity }} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

const DEMO_COMPONENTS: Record<string, React.ComponentType> = {
  analysis: AnalysisDemo,
  scanner:  ScannerDemo,
  ai:       ChatDemo,
};

function FeatureShowcase({ feature, reversed }: { feature: typeof FEATURES_MAIN[0]; reversed?: boolean }) {
  const DemoComponent = DEMO_COMPONENTS[feature.id];
  return (
    <div className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center", reversed && "")}>
          {/* Text side */}
          <motion.div
            initial={{ opacity: 0, x: reversed ? 28 : -28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={reversed ? "md:order-2" : ""}
          >
            <div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold mb-5", feature.checkBg)}>
              <feature.icon className={cn("w-3 h-3", feature.accentColor)} />
              <span className={feature.accentColor}>{feature.badge}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">{feature.title}</h2>
            <p className="text-white/55 text-base leading-relaxed mb-7">{feature.desc}</p>
            <div className="space-y-3 mb-8">
              {feature.bullets.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.08 + i * 0.07 }}
                  className="flex items-center gap-3"
                >
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border", feature.checkBg)}>
                    <CheckCircle2 className={cn("w-3 h-3", feature.accentColor)} />
                  </div>
                  <span className="text-sm text-white/70">{b}</span>
                </motion.div>
              ))}
            </div>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold transition-all hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5"
            >
              Essayer gratuitement
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
          {/* Demo side */}
          <motion.div
            initial={{ opacity: 0, x: reversed ? -28 : 28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className={reversed ? "md:order-1" : ""}
          >
            <div className="relative">
              <div className={cn("absolute inset-0 blur-3xl opacity-25 rounded-3xl scale-110", feature.glowColor)} />
              <div className="relative">
                <DemoComponent />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function TickerBar() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="relative overflow-hidden bg-black/30 border-y border-white/5 py-2.5">
      <div className="flex animate-[ticker_40s_linear_infinite] whitespace-nowrap will-change-transform">
        {items.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-2 mx-6 text-sm font-mono">
            <span className="text-white/60 font-semibold">{item.symbol}</span>
            <span className="text-white/90">{item.price}</span>
            <span className={item.change.startsWith("+") ? "text-emerald-400" : "text-rose-400"}>
              {item.change}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function FloatingOrb({ className }: { className?: string }) {
  return (
    <div className={cn(
      "absolute rounded-full blur-3xl opacity-20 animate-pulse pointer-events-none",
      className
    )} />
  );
}

function Particles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 8 + 6,
    delay: Math.random() * 4,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-primary/40"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [0, -40, 0], opacity: [0, 0.8, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function AnimatedCounter({ target }: { target: string }) {
  const isNum = /^\d+/.test(target);
  const num = isNum ? parseInt(target.replace(/\D/g, "")) : null;
  const [display, setDisplay] = useState(isNum ? "0" : target);

  useEffect(() => {
    if (!isNum || !num) return;
    let start = 0;
    const step = Math.ceil(num / 40);
    const timer = setInterval(() => {
      start = Math.min(start + step, num);
      setDisplay(target.replace(/\d+/, String(start)));
      if (start >= num) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [num, isNum, target]);

  return <>{display}</>;
}

/** 3-D perspective tilt card — follows mouse inside the card */
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 280, damping: 22 });
  const springY = useSpring(rotateY, { stiffness: 280, damping: 22 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    rotateX.set(-y * 10);
    rotateY.set(x * 10);
  };

  const onLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      style={{ rotateX: springX, rotateY: springY, transformPerspective: 900 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Animated step connector (growing line) */
function StepConnector() {
  return (
    <motion.div
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.6, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px origin-left bg-gradient-to-r from-primary/50 to-transparent"
    />
  );
}

/** Floating data chip that drifts in from below */
function FloatingChip({ label, value, color, delay, x, y }: {
  label: string; value: string; color: string; delay: number; x: string; y: string;
}) {
  return (
    <motion.div
      className={`absolute hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-card/80 backdrop-blur-sm z-10 pointer-events-none ${color}`}
      style={{ left: x, top: y }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: [0, -6, 0] }}
      transition={{
        opacity: { delay, duration: 0.5 },
        y: { delay, duration: 3, repeat: Infinity, ease: "easeInOut" },
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      <span className="text-white/50">{label}</span>
      <span>{value}</span>
    </motion.div>
  );
}

function AnimatedChart() {
  const points = [40, 55, 45, 65, 60, 75, 70, 85, 78, 92, 88, 95];
  const w = 300; const h = 80;
  const min = Math.min(...points); const max = Math.max(...points);
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / (max - min)) * h * 0.85 - h * 0.05;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(243,75%,59%)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="hsl(243,75%,59%)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.polyline
        points={coords}
        fill="none"
        stroke="hsl(243,75%,59%)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
      <motion.polygon
        points={`0,${h} ${coords} ${w},${h}`}
        fill="url(#chartGrad)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
      />
    </svg>
  );
}

// ── Live Scan Demo — vraie interface ──────────────────────────────────────────

const SCAN_STEPS = [
  "Collecte des données de marché...",
  "Calcul RSI, MACD, Bollinger Bands...",
  "Analyse des niveaux clés S/R...",
  "Évaluation du contexte macro...",
  "Génération du score IA...",
];

// Données AAPL statiques reproduisant fidèlement la structure Analysis
const AAPL = {
  score:  { total: 74, technical: 68, volume: 82, momentum: 71 },
  signal: { text: "BUY", emoji: "🟢" },
  trend:  "BULLISH",
  price:  { current: 212.45, change: 1.23 },
  levels: { support: 207.20, resistance: 218.50, pivot: 212.85 },
  risk:   { sl: 205.40, tp: 224.80, rr: 2.1 },
  indicators: {
    rsi:    { value: 62.4,  signal: "neutral"  as const },
    macd:   { value: 1.24,  signal: "bullish"  as const },
    ema20:  { value: 209.80, signal: "bullish" as const },
    ema50:  { value: 205.40, signal: "bullish" as const },
    adx:    { value: 28.4,  signal: "bullish"  as const },
    stoch:  { value: "67.3 / 61.8", signal: "neutral" as const },
    bb:     { value: "58%", signal: "neutral"  as const },
    atr:    { value: "3.84", signal: "neutral" as const },
    volume: { value: "1.34×", signal: "neutral" as const },
  },
  aiInsight: "AAPL présente un setup technique solide. Le RSI à 62 laisse de la marge avant la zone de surachat, et le MACD haussier confirme le momentum positif. Les deux EMA clés (20 et 50) soutiennent la tendance. Zone d'entrée favorable autour de $210–212, avec un objectif vers $224.",
};

function DemoScoreBar({ label, score }: { label: string; score: number }) {
  const color =
    score >= 75 ? "from-profit to-green-400" :
    score >= 60 ? "from-green-400 to-emerald-400" :
    score >= 40 ? "from-warning to-yellow-400" :
                  "from-loss to-red-400";
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
          transition={{ duration: 0.6, delay: 0.2 }}
          className={cn("h-full rounded-full bg-gradient-to-r", color)}
        />
      </div>
    </div>
  );
}

function DemoIndicatorCard({ name, value, signal, tooltip }: {
  name: string; value: string;
  signal: "bullish" | "bearish" | "neutral";
  tooltip?: string;
}) {
  const colors = {
    bullish: "border-profit/30 bg-profit/10",
    bearish: "border-loss/30 bg-loss/10",
    neutral: "border-white/10 bg-white/5",
  };
  const icons = {
    bullish: <TrendingUp className="w-4 h-4 text-profit" />,
    bearish: <TrendingDown className="w-4 h-4 text-loss" />,
    neutral: <Activity className="w-4 h-4 text-muted-foreground" />,
  };
  return (
    <div className={cn("p-4 rounded-xl border", colors[signal])} title={tooltip}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{name}</span>
        {icons[signal]}
      </div>
      <p className="font-bold text-sm">{value}</p>
      {tooltip && <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-tight">{tooltip}</p>}
    </div>
  );
}

function LiveScanDemo() {
  const [phase, setPhase] = useState<"idle" | "scanning" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetScan = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("idle");
    setProgress(0);
    setCurrentStep(0);
  };

  const startScan = () => {
    if (phase === "scanning") return;
    if (phase === "done") { resetScan(); return; }
    setPhase("scanning");
    setProgress(0);
    setCurrentStep(0);
    const totalTicks = 2800 / 40;
    let tick = 0;
    timerRef.current = setInterval(() => {
      tick++;
      const p = (tick / totalTicks) * 100;
      setProgress(Math.min(p, 100));
      setCurrentStep(Math.min(Math.floor((p / 100) * SCAN_STEPS.length), SCAN_STEPS.length - 1));
      if (tick >= totalTicks) {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeout(() => setPhase("done"), 200);
      }
    }, 40);
  };

  const d = AAPL;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">

      {/* ── Browser chrome ── */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-black/20">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
          <div className="ml-3 flex-1 max-w-xs px-3 py-1 rounded-md bg-white/5 border border-white/8 text-[11px] text-white/30 font-mono flex items-center gap-1.5">
            <Shield className="w-2.5 h-2.5 text-emerald-500/70" />
            captentdb.fr/analysis?symbol=AAPL
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-5 bg-background/40">

          {/* ── Asset header ── */}
          <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-lg font-black text-primary">A</div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl font-black">AAPL</span>
                  <span className="text-muted-foreground text-sm">Apple Inc.</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-profit/10 border border-profit/20 text-profit font-semibold">BULLISH</span>
                </div>
                <div className="text-xs text-muted-foreground">Technology • NASDAQ</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black">$212.45</div>
              <div className="text-profit text-sm font-semibold">+$2.58 (+1.23%)</div>
            </div>
          </div>

          {/* ── Scan overlay (idle + scanning) ── */}
          {phase !== "done" && (
            <div className="glass-card p-8 flex flex-col items-center gap-5">
              {phase === "idle" && (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                    <BarChart3 className="w-7 h-7 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold mb-1">Analyse IA prête</p>
                    <p className="text-sm text-muted-foreground">Lancez l&apos;analyse pour voir la vraie interface CaptenTDB</p>
                  </div>
                  <button
                    onClick={startScan}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-cyan-500 text-white text-sm font-bold hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
                  >
                    <Zap className="w-4 h-4" />
                    Analyser AAPL avec l&apos;IA
                  </button>
                </>
              )}
              {phase === "scanning" && (
                <div className="w-full space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                      <RefreshCw className="w-5 h-5 text-primary" />
                    </motion.div>
                    <span className="text-sm font-medium">{SCAN_STEPS[currentStep]}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary via-cyan-400 to-emerald-400 rounded-full"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.08 }}
                    />
                  </div>
                  <p className="text-center text-xs text-muted-foreground">{Math.round(progress)}% — Analyse AAPL en cours...</p>
                </div>
              )}
            </div>
          )}

          {/* ── Full results (done) ── */}
          {phase === "done" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="space-y-5"
            >
              {/* Score cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Main score */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 }}
                  className="glass-card p-5 text-center relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-radial from-primary/10 to-transparent" />
                  <div className="relative">
                    <p className="text-sm text-muted-foreground mb-3">Score Global</p>
                    <div className="w-28 h-28 mx-auto mb-3 relative">
                      <svg className="w-full h-full -rotate-90">
                        <circle cx="56" cy="56" r="48" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/10" />
                        <circle
                          cx="56" cy="56" r="48" fill="none"
                          stroke="url(#demoGrad)" strokeWidth="8" strokeLinecap="round"
                          strokeDasharray={`${(d.score.total / 100) * 301} 301`}
                        />
                        <defs>
                          <linearGradient id="demoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#22c55e" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className="text-3xl font-black"
                        >
                          {d.score.total}
                        </motion.span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="text-xl">{d.signal.emoji}</span>
                      <span className="text-lg font-bold text-profit">{d.signal.text}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tendance: <span className="text-profit font-semibold">{d.trend}</span>
                    </p>
                  </div>
                </motion.div>

                {/* Score breakdown */}
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass-card p-5"
                >
                  <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Détail du Score
                  </h3>
                  <div className="space-y-4">
                    <DemoScoreBar label="Technique" score={d.score.technical} />
                    <DemoScoreBar label="Volume"    score={d.score.volume} />
                    <DemoScoreBar label="Momentum"  score={d.score.momentum} />
                  </div>
                </motion.div>

                {/* Price & levels */}
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className="glass-card p-5"
                >
                  <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm">
                    <Activity className="w-4 h-4 text-primary" />
                    Prix & Niveaux
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center p-2.5 bg-white/5 rounded-lg">
                      <span className="text-muted-foreground">Prix actuel</span>
                      <div>
                        <span className="font-bold">${d.price.current}</span>
                        <span className="ml-2 text-profit text-xs">+{d.price.change}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Résistance</span>
                      <span className="text-loss font-semibold">${d.levels.resistance}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Pivot</span>
                      <span className="font-semibold">${d.levels.pivot}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Support</span>
                      <span className="text-profit font-semibold">${d.levels.support}</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Chart */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-sm flex items-center gap-2"><LineChart className="w-4 h-4 text-primary" />Graphique AAPL</span>
                  <div className="flex gap-1">
                    {["1j","1s","1m","3m"].map(t => (
                      <span key={t} className={cn("text-[11px] px-2 py-0.5 rounded cursor-pointer transition-colors", t === "1j" ? "bg-primary/20 text-primary" : "bg-white/5 text-white/35 hover:bg-white/10")}>{t}</span>
                    ))}
                  </div>
                </div>
                <div className="h-36 relative">
                  <AnimatedChart />
                </div>
              </motion.div>

              {/* AI Insight */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="glass-card p-5 border border-primary/20 bg-primary/5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                    <Brain className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1 flex items-center gap-2">
                      Analyse IA
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">Disponible 24h/24</span>
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{d.aiInsight}</p>
                  </div>
                </div>
              </motion.div>

              {/* Indicators */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card p-5"
              >
                <h3 className="font-semibold mb-4 text-sm">Indicateurs Techniques</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {([
                    { name: "RSI (14)",    value: d.indicators.rsi.value.toFixed(1),    signal: d.indicators.rsi.signal,    tooltip: "62.4 — Zone neutre, pas de surachat" },
                    { name: "MACD",        value: d.indicators.macd.value.toFixed(2),   signal: d.indicators.macd.signal,   tooltip: "Histogramme positif — momentum haussier" },
                    { name: "EMA 20",      value: "$209.80",                             signal: d.indicators.ema20.signal,  tooltip: "Prix au-dessus — tendance CT haussière" },
                    { name: "EMA 50",      value: "$205.40",                             signal: d.indicators.ema50.signal,  tooltip: "Prix au-dessus — tendance MT haussière" },
                    { name: "ADX",         value: d.indicators.adx.value.toFixed(1),    signal: d.indicators.adx.signal,    tooltip: "Force de tendance forte (>25) et DI+ > DI-" },
                    { name: "Stoch %K",    value: d.indicators.stoch.value,             signal: d.indicators.stoch.signal,  tooltip: "67.3 / 61.8 — Zone neutre" },
                    { name: "BB %B",       value: d.indicators.bb.value,                signal: d.indicators.bb.signal,     tooltip: "Position dans les bandes de Bollinger" },
                    { name: "ATR",         value: d.indicators.atr.value,               signal: d.indicators.atr.signal,    tooltip: "Volatilité moyenne 14j — stop suggéré: $5.76" },
                    { name: "Volume",      value: d.indicators.volume.value,            signal: d.indicators.volume.signal, tooltip: "Volume actuel vs moyenne 20j — normal" },
                  ] as { name: string; value: string; signal: "bullish"|"bearish"|"neutral"; tooltip: string }[]).map((ind, i) => (
                    <motion.div key={ind.name} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 + i * 0.04 }}>
                      <DemoIndicatorCard {...ind} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Trade suggestion */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="glass-card p-5"
              >
                <h3 className="font-semibold mb-4 text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Suggestion de Trade
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-profit/10 rounded-xl border border-profit/20 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Take Profit</p>
                    <p className="text-lg font-bold text-profit">${d.risk.tp}</p>
                  </div>
                  <div className="p-3 bg-loss/10 rounded-xl border border-loss/20 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Stop Loss</p>
                    <p className="text-lg font-bold text-loss">${d.risk.sl}</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Risk/Reward</p>
                    <p className="text-lg font-bold text-primary">1:{d.risk.rr}</p>
                  </div>
                </div>
                <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/8 flex items-center justify-between text-xs text-muted-foreground">
                  <span>🔒 Paper trading uniquement — aucun argent réel</span>
                  <span className="text-profit font-semibold">✓ Éducatif</span>
                </div>
              </motion.div>

              {/* Reset + CTA */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
              >
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold transition-all hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5"
                >
                  Analyser mes propres actifs
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <button onClick={resetScan} className="text-sm text-white/35 hover:text-white/60 transition-colors">
                  ↺ Relancer la démo
                </button>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function LandingPage() {
  const { isAuthenticated } = useAuth();
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroY       = useTransform(scrollY, [0, 400], [0, -60]);

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ── Background ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <FloatingOrb className="w-[700px] h-[700px] bg-indigo-600 top-[-200px] left-[-100px]" />
        <FloatingOrb className="w-[500px] h-[500px] bg-purple-600 top-[30%] right-[-200px]" />
        <FloatingOrb className="w-[350px] h-[350px] bg-blue-500 bottom-[5%] left-[15%]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(222_47%_8%/0.3)_0%,hsl(222_47%_5%/0.98)_70%)]" />
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: "linear-gradient(hsl(var(--border)) 1px,transparent 1px),linear-gradient(90deg,hsl(var(--border)) 1px,transparent 1px)",
          backgroundSize: "50px 50px",
        }} />
      </div>

      {/* ── Nav ── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-background/60 backdrop-blur-xl border-b border-white/5"
      >
        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.08 }} transition={{ type: "spring", stiffness: 400 }}>
            <TDBLogo size={34} />
          </motion.div>
          <span className="text-lg font-bold">Capten<span className="gradient-text">TDB</span></span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-white/55">
          <a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a>
          <a href="#how" className="hover:text-white transition-colors">Comment ça marche</a>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5">
              Accéder à l'app
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-white/65 hover:text-white transition-colors">
                Connexion
              </Link>
              <Link href="/register" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5">
                Commencer gratuitement
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>
      </motion.nav>

      {/* ── Ticker ──────────────────────────────────────────────── */}
      <div className="pt-[73px]">
        <TickerBar />
      </div>

      {/* ── Hero ── */}
      <motion.section
        style={{ opacity: heroOpacity, y: heroY }}
        className="relative flex flex-col items-center text-center px-6 pt-16 pb-24 md:pt-24 md:pb-36"
      >
        <Particles />

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold mb-7 uppercase tracking-widest"
        >
          <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
            <Sparkles className="w-3 h-3" />
          </motion.span>
          Plateforme éducative de trading — 100% gratuite
        </motion.div>

        {/* H1 */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl md:text-7xl font-black leading-tight tracking-tight max-w-4xl"
        >
          La bourse,{" "}
          <motion.span
            className="gradient-text inline-block"
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            style={{ backgroundSize: "200%" }}
          >
            enfin claire.
          </motion.span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="mt-6 text-lg md:text-xl text-white/55 max-w-2xl leading-relaxed"
        >
          CaptenTDB analyse automatiquement les marchés pour vous — indicateurs, signaux IA, scanner et wallet virtuel.{" "}
          <span className="text-white/80 font-semibold">Apprenez à trader sans risquer un centime.</span>
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4"
        >
          {isAuthenticated ? (
            <Link href="/dashboard" className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary hover:bg-primary/90 text-white text-base font-bold transition-all hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-1">
              Accéder à mon espace
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <>
              <Link href="/register" className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary hover:bg-primary/90 text-white text-base font-bold transition-all hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-1">
                Créer mon compte — C&apos;est gratuit
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#demo" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-base font-semibold transition-all hover:-translate-y-0.5">
                <Play className="w-4 h-4 text-primary" />
                Voir la démo en direct
              </a>
            </>
          )}
        </motion.div>

        {/* Trust micro-badges */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
          className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs text-white/35"
        >
          {["Pas de CB requise", "Inscription en 30 s", "800+ actifs", "0 engagement"].map((t, i) => (
            <span key={i} className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />{t}
            </span>
          ))}
        </motion.div>

        {/* Dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-14 w-full max-w-5xl mx-auto"
        >
          <div className="relative">
            <FloatingChip label="BTC"     value="+2.14%"  color="border-emerald-500/30 text-emerald-400" delay={1.8} x="-2%" y="15%" />
            <FloatingChip label="NVDA"    value="+3.87%"  color="border-blue-500/30 text-blue-400"       delay={2.1} x="101%" y="25%" />
            <FloatingChip label="Win Rate" value="68%"   color="border-purple-500/30 text-purple-400"   delay={2.4} x="88%" y="70%" />
            <FloatingChip label="P&L"     value="+$2 438" color="border-yellow-500/30 text-yellow-400"  delay={2.0} x="-4%" y="65%" />
            <div className="absolute inset-0 bg-primary/15 blur-3xl rounded-3xl scale-95 pointer-events-none" />
            <div className="relative glass-card p-1 rounded-2xl border border-white/10">
              <div className="rounded-xl bg-card/80 p-5 md:p-6 overflow-hidden">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                  <div className="ml-3 flex-1 max-w-xs px-3 py-1 rounded-md bg-white/5 text-[11px] text-white/30 font-mono text-left">captentdb.fr/analysis</div>
                </div>
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  {[
                    { label: "Solde Virtual", val: "$12 438", icon: Wallet,    color: "text-white" },
                    { label: "P&L Total",     val: "+$2 438", icon: TrendingUp, color: "text-emerald-400" },
                    { label: "Win Rate",      val: "68%",     icon: Target,    color: "text-emerald-400" },
                    { label: "Actifs suivis", val: "14",      icon: Star,      color: "text-white" },
                  ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 + i * 0.08 }}
                      className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <s.icon className="w-3 h-3 text-white/30" />
                        <p className="text-[10px] text-white/40">{s.label}</p>
                      </div>
                      <p className={cn("text-sm font-bold", s.color)}>{s.val}</p>
                    </motion.div>
                  ))}
                </div>
                {/* Chart */}
                <div className="h-36 w-full relative">
                  <AnimatedChart />
                  <div className="absolute top-2 left-2 flex items-center gap-2">
                    <span className="text-xs font-bold text-white">NVDA</span>
                    <span className="text-xs text-emerald-400">+3.87%</span>
                  </div>
                  <div className="absolute bottom-2 right-2 flex gap-1.5">
                    {["1j", "1s", "1m", "3m"].map(t => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/30">{t}</span>
                    ))}
                  </div>
                </div>
                {/* Indicators */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    { l: "RSI",    v: "62",       c: "text-yellow-400" },
                    { l: "MACD",   v: "Haussier ↑", c: "text-emerald-400" },
                    { l: "EMA 20", v: "138.2",    c: "text-blue-400" },
                    { l: "Score",  v: "74/100",   c: "text-primary" },
                    { l: "Vol",    v: "+24%",     c: "text-cyan-400" },
                  ].map((ind, i) => (
                    <motion.span key={i} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.2 + i * 0.08 }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 font-mono flex items-center gap-1.5">
                      <span className="text-white/40">{ind.l}:</span>
                      <span className={ind.c}>{ind.v}</span>
                    </motion.span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* ── Stats band ── */}
      <section className="py-14 px-6 bg-black/30 border-y border-white/5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS_DATA.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
              <p className="text-4xl md:text-5xl font-black gradient-text mb-1"><AnimatedCounter target={s.value} /></p>
              <p className="text-sm text-white/45">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Markets preview ── */}
      <section className="py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-center text-xs text-white/35 font-semibold uppercase tracking-widest mb-5">
            Tous les marchés mondiaux couverts
          </motion.p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {MARKETS_PREVIEW.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.06 }} whileHover={{ scale: 1.06, y: -2 }}
                className={cn("relative flex flex-col items-center p-3 rounded-xl border transition-all cursor-default overflow-hidden group bg-white/4 border-white/5",
                  m.up ? "hover:border-emerald-500/30" : "hover:border-rose-500/30")}>
                <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300", m.up ? "bg-emerald-500/5" : "bg-rose-500/5")} />
                <motion.span className="text-xl mb-1" animate={{ rotate: [0, -5, 5, 0] }} transition={{ duration: 2, delay: i * 0.3, repeat: Infinity, repeatDelay: 5 }}>
                  {m.flag}
                </motion.span>
                <span className="text-xs font-semibold text-white/75">{m.name}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <motion.span className={cn("w-1.5 h-1.5 rounded-full", m.up ? "bg-emerald-400" : "bg-rose-400")}
                    animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }} />
                  <span className={cn("text-xs font-mono font-bold", m.up ? "text-emerald-400" : "text-rose-400")}>{m.change}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature showcases ── */}
      <section id="features" className="pt-6">
        {FEATURES_MAIN.map((feature, i) => (
          <FeatureShowcase key={feature.id} feature={feature} reversed={i % 2 === 1} />
        ))}
      </section>

      {/* ── Secondary features ── */}
      <section className="py-16 px-6 bg-black/20 border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black mb-2">Et bien plus encore</h2>
            <p className="text-white/45 text-sm">Tout ce dont vous avez besoin dans une seule plateforme.</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {SECONDARY_FEATURES.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }} className="glass-card hover-lift p-6 rounded-2xl">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4 border", f.colorClass)}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4">Démarrer en <span className="gradient-text">3 étapes</span></h2>
            <p className="text-white/45 text-lg">Simple, rapide, gratuit.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { step: "01", icon: Users, title: "Créez votre compte", desc: "Inscription gratuite en 30 secondes. Aucune carte bancaire, aucun engagement de durée." },
              { step: "02", icon: Star,  title: "Ajoutez vos actifs", desc: "Recherchez vos actions, ETFs ou cryptos préférées et construisez votre watchlist personnalisée." },
              { step: "03", icon: Brain, title: "Analysez & Progressez", desc: "Accédez aux analyses IA instantanées, lancez des trades virtuels et améliorez vos stratégies." },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }} className="relative flex flex-col items-center text-center">
                {i < 2 && <StepConnector />}
                <motion.div whileHover={{ scale: 1.08 }}
                  className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-5 relative">
                  <s.icon className="w-7 h-7 text-primary" />
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">
                    {s.step.slice(1)}
                  </span>
                </motion.div>
                <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Demo ── */}
      <section id="demo" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/25 bg-cyan-500/8 text-cyan-400 text-xs font-semibold mb-5 uppercase tracking-widest">
              <Zap className="w-3 h-3" />
              Démo interactive
            </span>
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              Voyez l&apos;IA en <span className="gradient-text">action</span>
            </h2>
            <p className="text-white/45 text-lg max-w-xl mx-auto">
              Cliquez sur le bouton pour lancer une analyse complète en temps réel — exactement comme dans l&apos;application.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <LiveScanDemo />
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 bg-black/20 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="relative glass-card p-10 md:p-16 rounded-3xl overflow-hidden neon-border">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-purple-500/8 to-pink-500/8" />
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/25 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500/15 rounded-full blur-3xl" />
            <div className="relative">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} className="inline-block mb-5">
                <Sparkles className="w-9 h-9 text-primary" />
              </motion.div>
              <h2 className="text-3xl md:text-5xl font-black mb-4">
                Prêt à comprendre<br />les marchés ?
              </h2>
              <p className="text-white/55 text-lg mb-8 leading-relaxed">
                Rejoignez CaptenTDB et accédez à des outils d&apos;analyse professionnels.<br />
                <span className="text-white/80 font-semibold">Gratuit. Sans CB. En 30 secondes.</span>
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {isAuthenticated ? (
                  <Link href="/dashboard" className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary hover:bg-primary/90 text-white text-base font-bold transition-all hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-1 w-full sm:w-auto justify-center">
                    Accéder à mon espace
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                ) : (
                  <>
                    <Link href="/register" className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary hover:bg-primary/90 text-white text-base font-bold transition-all hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-1 w-full sm:w-auto justify-center">
                      Créer mon compte gratuit
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link href="/login" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/15 hover:bg-white/5 text-white text-base font-semibold transition-all w-full sm:w-auto justify-center">
                      Se connecter
                    </Link>
                  </>
                )}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-xs text-white/35">
                {["100% gratuit", "Aucun engagement", "800+ actifs", "Analyses IA incluses"].map((t, i) => (
                  <span key={i} className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />{t}</span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-6 border-t border-white/5 text-center text-sm text-white/30">
        <div className="flex items-center justify-center gap-2 mb-2">
          <TDBLogoSm size={20} />
          <span className="font-semibold text-white/50">CaptenTDB</span>
        </div>
        <p>Fait avec ❤️ par <span className="text-primary font-semibold">CaptenQwark</span></p>
        <p className="mt-1 text-xs">Les analyses sont à but éducatif uniquement. Ce site ne fournit pas de conseils financiers.</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-white/25">
          <a href="/mentions-legales" className="hover:text-white/60 transition-colors">Mentions légales</a>
          <span>·</span>
          <a href="/politique-de-confidentialite" className="hover:text-white/60 transition-colors">Politique de confidentialité</a>
          <span>·</span>
          <a href="/cgu" className="hover:text-white/60 transition-colors">CGU</a>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD CONFIG
// ─────────────────────────────────────────────────────────────────────────────

type WidgetId = "indices" | "sessions" | "favorites" | "news" | "stats" | "positions" | "quickactions";

const DEFAULT_WIDGETS: WidgetId[] = ["indices", "sessions", "favorites", "news", "stats", "quickactions"];
const DASHBOARD_STORAGE_KEY = "tdb_dashboard_config";

const WIDGET_META: Record<WidgetId, { label: string; icon: string; description: string }> = {
  indices:      { label: "Indices & Marchés",     icon: "📈", description: "CAC40, S&P500, BTC, Or en temps réel" },
  sessions:     { label: "Résumés de Séance",     icon: "🌍", description: "Top/Flop, humeur du marché, signaux J+1" },
  favorites:    { label: "Mes Favoris",            icon: "⭐", description: "Watchlist avec prix et performances" },
  news:         { label: "Actualités",             icon: "📰", description: "News filtrées par IA + résumé" },
  stats:        { label: "Statistiques Trading",   icon: "🎯", description: "Win rate, P&L, historique" },
  positions:    { label: "Positions Ouvertes",     icon: "💼", description: "Positions actives en cours" },
  quickactions: { label: "Actions Rapides",        icon: "⚡", description: "Raccourcis vers les pages clés" },
};

const INDICES_SYMBOLS = ["^FCHI", "^GSPC", "^IXIC", "BTC-USD", "GC=F", "^VIX"];
const INDICES_LABELS: Record<string, string> = {
  "^FCHI": "CAC 40", "^GSPC": "S&P 500", "^IXIC": "NASDAQ", "BTC-USD": "Bitcoin", "GC=F": "Or", "^VIX": "VIX",
};

// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD (affiché si connecté)
// ─────────────────────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function Dashboard() {
  const formatCurrency = useFormatCurrency();
  const formatPrice = useFormatPrice();
  const router = useRouter();
  const { isPremium } = usePremium();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [openPositions, setOpenPositions] = useState<Position[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [marketNews, setMarketNews] = useState<MarketNews | null>(null);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [indices, setIndices] = useState<Record<string, { price: number; change: number }>>({});
  const [isLoadingIndices, setIsLoadingIndices] = useState(false);
  const [favSort, setFavSort] = useState<"change_desc" | "change_asc" | "alpha">("change_desc");
  const [favFilter, setFavFilter] = useState<"all" | "profit" | "loss">("all");
  const [newsFilter, setNewsFilter] = useState<"all" | "mine">("all");
  const [activeWidgets, setActiveWidgets] = useState<WidgetId[]>(DEFAULT_WIDGETS);
  const [editMode, setEditMode] = useState(false);

  // Load widget config from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(DASHBOARD_STORAGE_KEY);
    if (stored) {
      try { setActiveWidgets(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  const saveWidgetConfig = (widgets: WidgetId[]) => {
    setActiveWidgets(widgets);
    localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(widgets));
  };

  const toggleWidget = (id: WidgetId) => {
    saveWidgetConfig(
      activeWidgets.includes(id) ? activeWidgets.filter(w => w !== id) : [...activeWidgets, id]
    );
  };

  const moveWidget = (id: WidgetId, dir: -1 | 1) => {
    const idx = activeWidgets.indexOf(id);
    if (idx < 0) return;
    const next = [...activeWidgets];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    saveWidgetConfig(next);
  };

  const loadIndices = useCallback(async () => {
    setIsLoadingIndices(true);
    try {
      const data = await marketAPI.getPrices(INDICES_SYMBOLS);
      setIndices(data.prices);
    } catch { /* ignore */ } finally {
      setIsLoadingIndices(false);
    }
  }, []);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const [balanceData, statsData, favoritesData, adminData, positionsData] = await Promise.all([
        walletAPI.getBalance(),
        walletAPI.getStats(),
        favoritesAPI.getFavorites().catch(() => ({ favorites: [] })),
        adminAPI.checkAdmin().catch(() => ({ is_admin: false })),
        walletAPI.getPositions("open").catch(() => ({ positions: [] })),
      ]);
      setBalance(balanceData);
      setStats(statsData);
      setFavorites(favoritesData.favorites || []);
      setIsAdmin(adminData.is_admin);
      setOpenPositions(positionsData.positions || []);
      loadIndices();
      loadMarketNews();
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadMarketNews = async () => {
    setIsLoadingNews(true);
    try {
      const newsData = await aiAPI.getMarketNews();
      setMarketNews(newsData);
    } catch { /* ignore */ } finally {
      setIsLoadingNews(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(), 60000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const avgFavChange = favorites.length > 0
    ? favorites.filter(f => !f.error).reduce((sum, f) => sum + f.change, 0) / Math.max(1, favorites.filter(f => !f.error).length)
    : 0;

  const sortedFavorites = [...favorites]
    .filter(f => favFilter === "all" ? true : favFilter === "profit" ? f.change >= 0 : f.change < 0)
    .sort((a, b) => {
      if (favSort === "change_desc") return b.change - a.change;
      if (favSort === "change_asc") return a.change - b.change;
      return a.symbol.localeCompare(b.symbol);
    });

  // Filter news to only show items mentioning watched assets
  const favoriteSymbols = new Set(favorites.map(f => f.symbol.replace(/-USD$/, "").replace(/\..*/, "")));
  const filteredNews = newsFilter === "mine" && marketNews
    ? { ...marketNews, news: marketNews.news.filter(n => favoriteSymbols.has(n.related?.toUpperCase() || "")) }
    : marketNews;

  const visibleWidget = (id: WidgetId) => activeWidgets.includes(id);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-5">
      {/* Welcome banner */}
      <motion.div variants={itemVariants} className="glass-card p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              Tableau de bord <span className="gradient-text">TDB</span>
            </h1>
            <p className="text-muted-foreground text-sm">Suivez vos actifs, restez informé, tradez mieux.</p>
          </div>
          <div className="flex items-center gap-2">
            {isPremium && (
              <button
                onClick={() => setEditMode(!editMode)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  editMode
                    ? "bg-primary text-white shadow-glow-sm"
                    : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
                )}
              >
                <Settings2 className="w-4 h-4" />
                {editMode ? "Terminer" : "Personnaliser"}
              </button>
            )}
            <button onClick={() => loadData(true)} disabled={isRefreshing} className="p-2 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground">
              <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Premium widget customizer */}
      <AnimatePresence>
        {editMode && isPremium && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-5 border border-primary/30">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-4 h-4 text-yellow-400" />
                <h3 className="font-semibold">Personnalisation Premium</h3>
                <span className="text-xs text-muted-foreground ml-auto">Activez/désactivez les widgets et réordonnez-les</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(Object.entries(WIDGET_META) as [WidgetId, typeof WIDGET_META[WidgetId]][]).map(([id, meta]) => {
                  const isActive = activeWidgets.includes(id);
                  const idx = activeWidgets.indexOf(id);
                  return (
                    <div
                      key={id}
                      className={cn(
                        "p-3 rounded-xl border transition-all",
                        isActive ? "border-primary/40 bg-primary/5" : "border-white/10 bg-white/3 opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{meta.icon}</span>
                          <div>
                            <p className="text-sm font-medium">{meta.label}</p>
                            <p className="text-[11px] text-muted-foreground">{meta.description}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleWidget(id)}
                          className={cn("p-1.5 rounded-lg transition-colors flex-shrink-0 ml-2",
                            isActive ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-white/10"
                          )}
                        >
                          {isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                      {isActive && (
                        <div className="flex items-center gap-1 mt-2">
                          <button onClick={() => moveWidget(id, -1)} disabled={idx <= 0}
                            className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors">
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button onClick={() => moveWidget(id, 1)} disabled={idx >= activeWidgets.length - 1}
                            className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors">
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          <span className="text-[10px] text-muted-foreground ml-1">pos. {idx + 1}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Card */}
      {isAdmin && (
        <motion.div variants={itemVariants}>
          <Link href="/admin">
            <div className="glass-card p-4 border border-yellow-500/30 hover:border-yellow-500/50 transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-yellow-500/20"><Shield className="w-5 h-5 text-yellow-500" /></div>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-500">Panneau d'Administration</h3>
                  <p className="text-sm text-muted-foreground">Gérez les utilisateurs, consultez les statistiques</p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-yellow-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </div>
            </div>
          </Link>
        </motion.div>
      )}

      {/* Quick Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Actifs Suivis" value={String(favorites.length)} icon={Star} href="/favorites" />
        <StatCard title="Perf. Moy. Favoris" value={formatPercent(avgFavChange)} change={avgFavChange} icon={TrendingUp} />
        <StatCard title="Solde Wallet" value={formatCurrency(balance?.total_equity || balance?.balance || 0)} icon={Wallet} href="/wallet" />
        <StatCard title="Win Rate" value={`${stats?.win_rate || 0}%`} subtitle={`${stats?.total_trades || 0} trades`} icon={Target} />
      </motion.div>

      {/* Render widgets in user-defined order */}
      {activeWidgets.map((widgetId) => {
        if (widgetId === "indices") return (
          <motion.div key="indices" variants={itemVariants}>
            <IndicesBar indices={indices} isLoading={isLoadingIndices} onRefresh={loadIndices} />
          </motion.div>
        );

        if (widgetId === "sessions") return (
          <motion.div key="sessions" variants={itemVariants}>
            <SessionSummaryWidget />
          </motion.div>
        );

        if (widgetId === "favorites") return (
          <motion.div key="favorites" variants={itemVariants}>
            <FavoritesWidget
              favorites={sortedFavorites}
              favSort={favSort}
              setFavSort={setFavSort}
              favFilter={favFilter}
              setFavFilter={setFavFilter}
              formatCurrency={formatCurrency}
              formatPrice={formatPrice}
            />
          </motion.div>
        );

        if (widgetId === "news") return (
          <motion.div key="news" variants={itemVariants}>
            <NewsWidget
              marketNews={filteredNews}
              isLoadingNews={isLoadingNews}
              newsFilter={newsFilter}
              setNewsFilter={setNewsFilter}
              hasFavorites={favorites.length > 0}
              onRefresh={loadMarketNews}
            />
          </motion.div>
        );

        if (widgetId === "stats" && (stats?.total_trades || 0) > 0) return (
          <motion.div key="stats" variants={itemVariants}>
            <TradingStatsWidget stats={stats} balance={balance} formatCurrency={formatCurrency} />
          </motion.div>
        );

        if (widgetId === "positions" && openPositions.length > 0) return (
          <motion.div key="positions" variants={itemVariants}>
            <OpenPositionsWidget positions={openPositions} formatCurrency={formatCurrency} />
          </motion.div>
        );

        if (widgetId === "quickactions") return (
          <motion.div key="quickactions" variants={itemVariants}>
            <QuickActionsWidget isPremium={isPremium} />
          </motion.div>
        );

        return null;
      })}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  WIDGET: Indices de marché
// ─────────────────────────────────────────────────────────────────────────────

function IndicesBar({ indices, isLoading, onRefresh }: {
  indices: Record<string, { price: number; change: number }>;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Marchés en direct</h2>
        </div>
        <button onClick={onRefresh} disabled={isLoading} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground transition-colors">
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {INDICES_SYMBOLS.map((sym) => {
          const d = indices[sym];
          const isUp = d ? d.change >= 0 : true;
          return (
            <Link key={sym} href={`/analysis?symbol=${sym}`}
              className="flex-shrink-0 min-w-[110px] p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <p className="text-xs text-muted-foreground font-medium mb-1">{INDICES_LABELS[sym] || sym}</p>
              {d ? (
                <>
                  <p className="font-bold text-sm">
                    {d.price > 1000
                      ? d.price.toLocaleString("fr-FR", { maximumFractionDigits: 0 })
                      : d.price.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className={cn("flex items-center gap-1 text-xs mt-0.5", isUp ? "text-profit" : "text-loss")}>
                    {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {formatPercent(d.change)}
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-1">
                  <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
                  <div className="h-3 w-10 bg-white/10 rounded animate-pulse" />
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  WIDGET: Favoris enrichis
// ─────────────────────────────────────────────────────────────────────────────

function FavoritesWidget({ favorites, favSort, setFavSort, favFilter, setFavFilter, formatCurrency, formatPrice }: {
  favorites: Favorite[];
  favSort: "change_desc" | "change_asc" | "alpha";
  setFavSort: (s: "change_desc" | "change_asc" | "alpha") => void;
  favFilter: "all" | "profit" | "loss";
  setFavFilter: (f: "all" | "profit" | "loss") => void;
  formatCurrency: (v: number) => string;
  formatPrice: (v: number, symbol: string) => string;
}) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? favorites : favorites.slice(0, 8);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          <h2 className="text-lg font-semibold">Mes Favoris</h2>
          {favorites.length > 0 && (
            <span className="text-xs bg-white/10 text-muted-foreground px-2 py-0.5 rounded-full">{favorites.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Filter */}
          <div className="flex rounded-lg bg-white/5 p-0.5 gap-0.5">
            {([["all", "Tous"], ["profit", "📈"], ["loss", "📉"]] as const).map(([val, label]) => (
              <button key={val} onClick={() => setFavFilter(val)}
                className={cn("px-2 py-1 rounded text-xs transition-colors", favFilter === val ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}
              >{label}</button>
            ))}
          </div>
          {/* Sort */}
          <select value={favSort} onChange={e => setFavSort(e.target.value as typeof favSort)}
            className="text-xs bg-white/5 rounded-lg px-2 py-1.5 text-muted-foreground border border-white/10 cursor-pointer">
            <option value="change_desc">Perf ↓</option>
            <option value="change_asc">Perf ↑</option>
            <option value="alpha">A → Z</option>
          </select>
          <Link href="/favorites" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Gérer →</Link>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucun actif suivi</p>
          <p className="text-sm mt-1">Ajoutez des favoris depuis la page Marchés ou Analyse</p>
          <Link href="/markets" className="inline-flex items-center gap-1 text-primary text-sm mt-3 hover:underline">
            <Plus className="w-4 h-4" /> Explorer les marchés
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {displayed.map((fav) => (
              <FavoriteCard key={fav.symbol} favorite={fav} formatPrice={formatPrice} />
            ))}
          </div>
          {favorites.length > 8 && (
            <button onClick={() => setShowAll(!showAll)}
              className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors py-2 rounded-lg hover:bg-white/5 flex items-center justify-center gap-1"
            >
              {showAll ? <><ChevronUp className="w-4 h-4" /> Réduire</> : <><ChevronDown className="w-4 h-4" /> +{favorites.length - 8} autres actifs</>}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  WIDGET: Actualités
// ─────────────────────────────────────────────────────────────────────────────

function NewsWidget({ marketNews, isLoadingNews, newsFilter, setNewsFilter, hasFavorites, onRefresh }: {
  marketNews: MarketNews | null;
  isLoadingNews: boolean;
  newsFilter: "all" | "mine";
  setNewsFilter: (f: "all" | "mine") => void;
  hasFavorites: boolean;
  onRefresh: () => void;
}) {
  const timeAgo = (ts: number) => {
    const diff = (Date.now() / 1000) - ts;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}j`;
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Actualités</h2>
        </div>
        <div className="flex items-center gap-2">
          {hasFavorites && (
            <div className="flex rounded-lg bg-white/5 p-0.5 gap-0.5">
              {([["all", "Tout"], ["mine", "Mes actifs"]] as const).map(([val, label]) => (
                <button key={val} onClick={() => setNewsFilter(val)}
                  className={cn("px-2 py-1 rounded text-xs transition-colors", newsFilter === val ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}
                >{label}</button>
              ))}
            </div>
          )}
          <button onClick={onRefresh} disabled={isLoadingNews} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground">
            <RefreshCw className={cn("w-3.5 h-3.5", isLoadingNews && "animate-spin")} />
          </button>
        </div>
      </div>

      {isLoadingNews && !marketNews ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : marketNews ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* IA Summary */}
          {(marketNews.summary_points || marketNews.summary) && (
            <div className="lg:col-span-2">
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 h-full">
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Résumé IA</span>
                </div>
                {marketNews.summary_points ? (
                  <div className="space-y-3">
                    {marketNews.summary_points.map((point: SummaryPoint, idx: number) => (
                      <div key={idx} className="flex gap-2.5">
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-primary">{idx + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold leading-tight mb-0.5">{point.title}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{point.text}</p>
                          {point.assets && point.assets.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {point.assets.map((asset) => (
                                <Link key={asset.symbol} href={`/analysis?symbol=${asset.symbol}`}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/15 hover:bg-primary/30 border border-primary/30 text-primary text-[10px] font-medium transition-colors">
                                  {asset.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed">{marketNews.summary}</p>
                )}
                {marketNews.generated_at && (
                  <p className="text-[10px] text-muted-foreground mt-3">
                    Généré le {new Date(marketNews.generated_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* News list */}
          <div className={cn((marketNews.summary_points || marketNews.summary) ? "lg:col-span-3" : "lg:col-span-5")}>
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {(marketNews.news || []).length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">Aucune actualité pour vos actifs</p>
              ) : (
                (marketNews.news || []).slice(0, 12).map((item, i) => (
                  <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[11px] text-muted-foreground">{item.publisher}</span>
                        {item.related && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">{item.related}</span>
                        )}
                        <span className="text-[11px] text-muted-foreground ml-auto flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(item.timestamp)}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Cliquez sur actualiser pour charger les actualités</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  WIDGET: Statistiques trading
// ─────────────────────────────────────────────────────────────────────────────

function TradingStatsWidget({ stats, balance, formatCurrency }: {
  stats: TradingStats | null;
  balance: WalletBalance | null;
  formatCurrency: (v: number) => string;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Statistiques Trading</h2>
        </div>
        <Link href="/wallet" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Voir le wallet →</Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Win Rate",     value: `${stats?.win_rate || 0}%`,              color: (stats?.win_rate || 0) >= 50 ? "text-profit" : "text-loss" },
          { label: "Total trades", value: String(stats?.total_trades || 0),         color: "text-foreground" },
          { label: "P&L total",    value: formatCurrency(stats?.total_pnl || 0),    color: (stats?.total_pnl || 0) >= 0 ? "text-profit" : "text-loss" },
          { label: "Solde",        value: formatCurrency(balance?.balance || 0),    color: "text-foreground" },
        ].map(item => (
          <div key={item.label} className="p-4 rounded-xl bg-white/5">
            <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
            <p className={cn("text-xl font-bold", item.color)}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  WIDGET: Positions ouvertes
// ─────────────────────────────────────────────────────────────────────────────

function OpenPositionsWidget({ positions, formatCurrency }: {
  positions: Position[];
  formatCurrency: (v: number) => string;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Positions Ouvertes</h2>
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">{positions.length}</span>
        </div>
        <Link href="/trading" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Tout voir →</Link>
      </div>
      <div className="space-y-2">
        {positions.slice(0, 5).map((pos) => {
          const pnl = pos.unrealized_pnl || 0;
          const isProfit = pnl >= 0;
          return (
            <Link key={pos.id} href="/trading">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0", pos.direction === "LONG" ? "bg-profit" : "bg-loss")} />
                  <div>
                    <p className="font-semibold text-sm">{pos.symbol}</p>
                    <p className="text-xs text-muted-foreground">{pos.direction} · {pos.leverage}x</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn("font-semibold text-sm", isProfit ? "text-profit" : "text-loss")}>
                    {isProfit ? "+" : ""}{formatCurrency(pnl)}
                  </p>
                  <p className="text-xs text-muted-foreground">Entrée {formatCurrency(pos.entry_price)}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  WIDGET: Actions rapides
// ─────────────────────────────────────────────────────────────────────────────

function QuickActionsWidget({ isPremium }: { isPremium: boolean }) {
  const actions = [
    { href: "/analysis",  icon: <BarChart3 className="w-5 h-5" />,  label: "Analyser",     sub: "Actif" },
    { href: "/markets",   icon: <Globe className="w-5 h-5" />,      label: "Marchés",      sub: "Explorer" },
    { href: "/scanner",   icon: <Activity className="w-5 h-5" />,   label: "Scanner",      sub: "Opportunités" },
    { href: "/assistant", icon: <Bot className="w-5 h-5" />,        label: "Assistant IA", sub: "Conseils" },
    { href: "/trading",   icon: <TrendingUp className="w-5 h-5" />, label: "Positions",    sub: "Paper trading" },
    { href: "/favorites", icon: <Star className="w-5 h-5" />,       label: "Favoris",      sub: "Watchlist" },
  ];

  return (
    <div className="glass-card p-5">
      <h2 className="text-lg font-semibold mb-4">Actions Rapides</h2>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {actions.map(a => (
          <Link key={a.href} href={a.href}>
            <div className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.03] text-center cursor-pointer group">
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                {a.icon}
              </div>
              <p className="text-xs font-semibold">{a.label}</p>
              <p className="text-[10px] text-muted-foreground">{a.sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
//  ROOT PAGE — Toujours la landing page
//  Le dashboard est accessible à /dashboard
// ─────────────────────────────────────────────────────────────────────────────

export default function RootPage() {
  return <LandingPage />;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ title, value, change, subtitle, icon: Icon, href }: {
  title: string; value: string; change?: number; subtitle?: string;
  icon: React.ElementType; href?: string;
}) {
  const isPositive = change !== undefined ? change >= 0 : true;
  const content = (
    <div className={cn("glass-card-hover p-5", href && "cursor-pointer")}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change !== undefined && change !== 0 ? (
            <div className={cn("flex items-center gap-1 mt-2 text-sm", isPositive ? "text-profit" : "text-loss")}>
              {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span>{formatPercent(Math.abs(change))}</span>
            </div>
          ) : (subtitle && <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>)}
        </div>
        <div className="p-3 rounded-xl bg-primary/10"><Icon className="w-5 h-5 text-primary" /></div>
      </div>
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

function FavoriteCard({ favorite, formatPrice }: { favorite: Favorite; formatPrice: (v: number, symbol: string) => string }) {
  const isProfit = favorite.change >= 0;
  const info = getAssetInfo(favorite.symbol);
  const logoUrl = getAssetLogo(favorite.symbol);

  return (
    <Link href={`/analysis?symbol=${favorite.symbol}`}>
      <div className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
        <div className="flex items-center gap-3">
          {/* Logo */}
          {logoUrl ? (
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              <img src={logoUrl} alt={info.name} className="w-6 h-6 object-contain"
                onError={(e) => {
                  const t = e.target as HTMLImageElement;
                  t.style.display = "none";
                  t.parentElement!.innerHTML = `<span class="text-xs font-bold">${favorite.symbol.slice(0,2)}</span>`;
                }} />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold flex-shrink-0">
              {favorite.symbol.slice(0, 2)}
            </div>
          )}
          {/* Name + symbol */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{info.name !== favorite.symbol ? info.name : favorite.symbol}</p>
            <p className="text-[11px] text-muted-foreground">{favorite.symbol}</p>
          </div>
          {/* Price + change */}
          <div className="text-right flex-shrink-0">
            <p className="font-semibold text-sm">{favorite.error ? "—" : formatPrice(favorite.price, favorite.symbol)}</p>
            {!favorite.error && (
              <div className={cn(
                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium mt-0.5",
                isProfit ? "bg-profit/15 text-profit" : "bg-loss/15 text-loss"
              )}>
                {isProfit ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                {formatPercent(favorite.change)}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function QuickActionCard({ title, icon }: { title: string; icon: string }) {
  const icons: Record<string, React.ReactNode> = {
    star: <Star className="w-6 h-6" />,
    globe: <Globe className="w-6 h-6" />,
    chart: <Target className="w-6 h-6" />,
    bot: <Bot className="w-6 h-6" />,
  };
  return (
    <div className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.02] text-center cursor-pointer">
      <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
        {icons[icon]}
      </div>
      <p className="text-sm font-medium">{title}</p>
    </div>
  );
}
