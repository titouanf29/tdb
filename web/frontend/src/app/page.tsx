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
import { useFormatCurrency } from "@/lib/SettingsContext";
import { useAuth } from "@/lib/AuthContext";
import { usePremium } from "@/lib/PremiumContext";
import { getAssetInfo, getAssetLogo } from "@/lib/assetInfo";
import { TDBLogo, TDBLogoSm } from "@/components/ui/TDBLogo";

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

const FEATURES = [
  {
    icon: BarChart3,
    title: "Analyse Technique IA",
    desc: "RSI, MACD, Bollinger Bands, EMA — analysés et interprétés automatiquement par notre IA pour chaque actif.",
    color: "from-blue-500/20 to-indigo-500/20",
    border: "border-blue-500/30",
    iconColor: "text-blue-400",
  },
  {
    icon: Globe,
    title: "Marchés Mondiaux",
    desc: "CAC 40, DAX, FTSE, S&P 500, Nasdaq, cryptos — plus de 800 actifs à portée de main en temps réel.",
    color: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-500/30",
    iconColor: "text-emerald-400",
  },
  {
    icon: Brain,
    title: "Assistant IA",
    desc: "Posez vos questions à notre assistant spécialisé en trading. Stratégies, lectures de marché, conseils pédagogiques.",
    color: "from-purple-500/20 to-pink-500/20",
    border: "border-purple-500/30",
    iconColor: "text-purple-400",
  },
  {
    icon: Star,
    title: "Watchlist Personnalisée",
    desc: "Suivez vos actifs préférés, recevez leurs performances en direct et organisez votre portefeuille de suivi.",
    color: "from-yellow-500/20 to-orange-500/20",
    border: "border-yellow-500/30",
    iconColor: "text-yellow-400",
  },
  {
    icon: Wallet,
    title: "Wallet Virtuel",
    desc: "Simulez vos trades avec 10 000 $ virtuels. Mesurez vos performances sans risquer un seul centime réel.",
    color: "from-rose-500/20 to-red-500/20",
    border: "border-rose-500/30",
    iconColor: "text-rose-400",
  },
  {
    icon: Zap,
    title: "Scanner de Marchés",
    desc: "Détectez automatiquement les opportunités techniques sur des centaines d'actifs avec notre scanner IA.",
    color: "from-cyan-500/20 to-sky-500/20",
    border: "border-cyan-500/30",
    iconColor: "text-cyan-400",
  },
];

const STATS = [
  { value: "842+", label: "Actifs disponibles" },
  { value: "9", label: "Marchés couverts" },
  { value: "Gratuit", label: "Pour commencer" },
  { value: "Premium", label: "Pour aller plus loin" },
];

const MARKETS_PREVIEW = [
  { name: "CAC 40", flag: "🇫🇷", change: "+0.82%", up: true },
  { name: "DAX 40", flag: "🇩🇪", change: "+1.14%", up: true },
  { name: "S&P 500", flag: "🇺🇸", change: "+0.67%", up: true },
  { name: "Nasdaq", flag: "🇺🇸", change: "+1.43%", up: true },
  { name: "FTSE 100", flag: "🇬🇧", change: "-0.21%", up: false },
  { name: "Bitcoin", flag: "🪙", change: "+2.14%", up: true },
];

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

function LandingPage() {
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroY = useTransform(scrollY, [0, 400], [0, -80]);

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    show: (i: number) => ({
      opacity: 1, y: 0,
      transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    }),
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ── Background orbs ─────────────────────────────────────── */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <FloatingOrb className="w-[600px] h-[600px] bg-indigo-600 top-[-200px] left-[-100px]" />
        <FloatingOrb className="w-[500px] h-[500px] bg-purple-600 top-[20%] right-[-150px] animation-delay-2000" />
        <FloatingOrb className="w-[400px] h-[400px] bg-blue-500 bottom-[10%] left-[20%] animation-delay-4000" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(222_47%_8%/0.4)_0%,_hsl(222_47%_6%/0.95)_70%)]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* ── Navbar ──────────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-background/60 backdrop-blur-xl border-b border-white/5"
      >
        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.08 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
            <TDBLogo size={34} />
          </motion.div>
          <span className="text-lg font-bold">
            Capten<span className="gradient-text">TDB</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
          >
            Connexion
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5"
          >
            Commencer gratuitement
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </motion.nav>

      {/* ── Ticker ──────────────────────────────────────────────── */}
      <div className="pt-[73px]">
        <TickerBar />
      </div>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <motion.section
        style={{ opacity: heroOpacity, y: heroY }}
        className="relative flex flex-col items-center text-center px-6 pt-20 pb-32 md:pt-28 md:pb-40"
      >
        <Particles />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold mb-6 uppercase tracking-widest"
        >
          <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
            <Sparkles className="w-3 h-3" />
          </motion.span>
          Plateforme éducative de trading
        </motion.div>

        <motion.h1
          custom={0} variants={fadeUp} initial="hidden" animate="show"
          className="text-5xl md:text-7xl font-black leading-tight tracking-tight max-w-4xl"
        >
          Apprenez à lire{" "}
          <motion.span
            className="gradient-text inline-block"
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            style={{ backgroundSize: "200%" }}
          >
            les marchés
          </motion.span>
          <br />comme un pro.
        </motion.h1>

        <motion.p
          custom={1} variants={fadeUp} initial="hidden" animate="show"
          className="mt-6 text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed"
        >
          Analyses IA, watchlist temps réel, wallet virtuel et scanner de marchés
          — tout ce qu'il faut pour progresser en trading, gratuitement et sans risque.
        </motion.p>

        <motion.div
          custom={2} variants={fadeUp} initial="hidden" animate="show"
          className="mt-10 flex flex-col sm:flex-row items-center gap-4"
        >
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary hover:bg-primary/90 text-white text-base font-bold transition-all hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-1"
          >
            Créer mon compte gratuitement
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-base font-semibold transition-all hover:-translate-y-0.5"
          >
            <Play className="w-4 h-4" />
            J'ai déjà un compte
          </Link>
        </motion.div>

        {/* ── Hero dashboard preview ── */}
        <motion.div
          custom={3} variants={fadeUp} initial="hidden" animate="show"
          className="mt-16 w-full max-w-5xl mx-auto"
        >
          <div className="relative">
            {/* Floating data chips */}
            <FloatingChip label="BTC" value="+2.14%" color="border-emerald-500/30 text-emerald-400" delay={1.8} x="-2%" y="15%" />
            <FloatingChip label="NVDA" value="+3.87%" color="border-blue-500/30 text-blue-400" delay={2.1} x="101%" y="25%" />
            <FloatingChip label="Win Rate" value="68%" color="border-purple-500/30 text-purple-400" delay={2.4} x="88%" y="70%" />
            <FloatingChip label="P&L" value="+$2 438" color="border-yellow-500/30 text-yellow-400" delay={2.0} x="-4%" y="65%" />

            {/* Glow behind card */}
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-3xl scale-95" />
            <div className="relative glass-card p-1 rounded-2xl border border-white/10">
              <div className="rounded-xl bg-card/80 p-6 overflow-hidden">
                {/* Fake header */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                  <div className="ml-4 text-xs text-white/30 font-mono">captentdb.fr/analysis</div>
                </div>
                {/* Fake stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: "Solde", val: "$12 438", up: true },
                    { label: "P&L Total", val: "+$2 438", up: true },
                    { label: "Win Rate", val: "68%", up: true },
                    { label: "Actifs suivis", val: "14", up: null },
                  ].map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1 + i * 0.1 }}
                      className="p-3 rounded-xl bg-white/5 border border-white/5"
                    >
                      <p className="text-[11px] text-white/40">{s.label}</p>
                      <p className={cn("text-base font-bold mt-0.5", s.up === true ? "text-emerald-400" : s.up === false ? "text-rose-400" : "text-white")}>
                        {s.val}
                      </p>
                    </motion.div>
                  ))}
                </div>
                {/* Fake chart */}
                <div className="h-32 md:h-40 w-full relative">
                  <AnimatedChart />
                  {/* Labels */}
                  <div className="absolute top-2 left-2 flex items-center gap-2">
                    <span className="text-xs font-bold text-white">NVDA</span>
                    <span className="text-xs text-emerald-400">+3.87%</span>
                  </div>
                </div>
                {/* Fake indicators */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {["RSI: 62 (Neutre)", "MACD: Haussier ↑", "EMA 20: 138.2", "Vol: +24%"].map((t, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.5 + i * 0.1 }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/60 font-mono"
                    >
                      {t}
                    </motion.span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* ── Markets preview band ─────────────────────────────────── */}
      <section className="py-8 px-6 bg-black/20 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {MARKETS_PREVIEW.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ scale: 1.07, y: -3 }}
                className={cn(
                  "relative flex flex-col items-center p-3 rounded-xl bg-white/5 border transition-all cursor-default overflow-hidden group",
                  m.up ? "hover:border-emerald-500/40" : "hover:border-rose-500/40",
                  "border-white/5"
                )}
              >
                {/* Glow on hover */}
                <div className={cn(
                  "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                  m.up ? "bg-emerald-500/5" : "bg-rose-500/5"
                )} />
                <motion.span
                  className="text-xl mb-1"
                  animate={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 2, delay: i * 0.3, repeat: Infinity, repeatDelay: 4 }}
                >
                  {m.flag}
                </motion.span>
                <span className="text-xs font-semibold text-white/80">{m.name}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  {/* Live indicator */}
                  <motion.span
                    className={cn("w-1.5 h-1.5 rounded-full", m.up ? "bg-emerald-400" : "bg-rose-400")}
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.25 }}
                  />
                  <motion.span
                    className={cn("text-xs font-mono font-bold", m.up ? "text-emerald-400" : "text-rose-400")}
                    animate={{ opacity: [1, 0.6, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                  >
                    {m.change}
                  </motion.span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="text-center"
              >
                <p className="text-4xl md:text-5xl font-black gradient-text mb-2">
                  <AnimatedCounter target={s.value} />
                </p>
                <p className="text-sm text-white/50">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              Tout ce dont vous avez{" "}
              <span className="gradient-text">besoin</span>
            </h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              Des outils professionnels, accessibles à tous, pour apprendre et progresser.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <TiltCard className={cn(
                  "relative p-6 rounded-2xl border bg-gradient-to-br overflow-hidden group cursor-default h-full",
                  f.color, f.border
                )}>
                  {/* Hover glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 bg-white/5" />
                  <div className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-2xl bg-gradient-to-br from-white/10 to-transparent" />
                  {/* Shine sweep on hover */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
                    style={{
                      background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%)",
                      backgroundSize: "200% 100%",
                    }}
                    animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-white/5 border transition-all duration-300 group-hover:scale-110 group-hover:bg-white/10",
                    f.border
                  )}>
                    <f.icon className={cn("w-6 h-6 transition-transform duration-300 group-hover:rotate-6", f.iconColor)} />
                  </div>
                  <h3 className="text-base font-bold mb-2 text-white">{f.title}</h3>
                  <p className="text-sm text-white/55 leading-relaxed">{f.desc}</p>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-black/20 border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              Comment ça <span className="gradient-text">fonctionne ?</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: Users,
                title: "Créez votre compte",
                desc: "Inscription gratuite en 30 secondes. Pas de carte bancaire, pas d'engagement.",
              },
              {
                step: "02",
                icon: Star,
                title: "Ajoutez vos actifs",
                desc: "Recherchez vos actions, ETFs ou cryptos préférées et construisez votre watchlist.",
              },
              {
                step: "03",
                icon: Brain,
                title: "Analysez & Progressez",
                desc: "Accédez aux analyses IA, lancez des trades virtuels et améliorez vos stratégies.",
              },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative flex flex-col items-center text-center"
              >
                {i < 2 && <StepConnector />}
                <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-4 relative">
                  <step.icon className="w-7 h-7 text-primary" />
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">
                    {step.step.slice(1)}
                  </span>
                </div>
                <h3 className="font-bold text-base mb-2">{step.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Highlights list ─────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-black mb-6">
              Une plateforme pensée pour{" "}
              <span className="gradient-text">l'éducation</span>
            </h2>
            <div className="space-y-4">
              {[
                "Analyses techniques interprétées par l'IA",
                "Plus de 800 actifs — CAC 40, DAX, S&P 500, cryptos…",
                "Wallet virtuel pour pratiquer sans risque",
                "Assistant IA disponible 24h/24",
                "Scanner de signaux sur tous les marchés",
                "Communauté et éducation intégrées",
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-white/70 text-sm">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card p-5 rounded-2xl space-y-3"
          >
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-white/40">Signal IA — AAPL</p>
                <p className="text-sm font-semibold">RSI survendu · Signal haussier détecté</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">FORT</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                <Brain className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-white/40">Assistant IA</p>
                <p className="text-sm font-semibold">Qu'est-ce que le MACD ?</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30" />
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="w-9 h-9 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Bell className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-white/40">Actualité IA</p>
                <p className="text-sm font-semibold">Résumé des marchés du jour</p>
              </div>
              <span className="text-xs text-white/30">il y a 2 min</span>
            </div>
            <div className="h-24 w-full rounded-xl overflow-hidden bg-white/5 border border-white/5 p-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-white/40 font-mono">BTC-USD</span>
                <span className="text-xs text-emerald-400 font-bold">+2.14%</span>
              </div>
              <AnimatedChart />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-black/20 border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              Commencez <span className="gradient-text">gratuitement</span>,
              <br />évoluez avec <span className="text-yellow-400">Premium</span>
            </h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              Les bases sont accessibles à tous. Le Premium débloque les outils avancés.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="glass-card p-8 rounded-2xl border border-white/10"
            >
              <div className="mb-6">
                <p className="text-sm text-white/50 font-semibold uppercase tracking-widest mb-2">Gratuit</p>
                <p className="text-4xl font-black">0 €<span className="text-lg font-normal text-white/40"> / mois</span></p>
              </div>
              <div className="space-y-3 mb-8">
                {[
                  "Watchlist jusqu'à 20 actifs",
                  "Analyses techniques de base",
                  "Wallet virtuel (10 000 $)",
                  "Marchés mondiaux (800+ actifs)",
                  "Assistant IA (20 msg/jour)",
                  "Actualités économiques",
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-sm text-white/70">{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/register" className="block w-full text-center px-6 py-3 rounded-xl border border-white/15 hover:bg-white/5 font-semibold transition-all text-sm">
                Commencer gratuitement
              </Link>
            </motion.div>

            {/* Premium */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative rounded-2xl overflow-hidden"
            >
              {/* Animated gradient border */}
              <motion.div
                className="absolute inset-0 rounded-2xl p-[1px]"
                style={{
                  background: "linear-gradient(135deg, #facc15, #4472f5, #9b54e8, #facc15)",
                  backgroundSize: "300% 300%",
                }}
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <div className="w-full h-full rounded-2xl bg-card/95" />
              </motion.div>
              <div className="relative p-8">
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-400/20 border border-yellow-400/40 text-yellow-400 text-xs font-bold">
                    <Crown className="w-3 h-3" />
                    PREMIUM
                  </span>
                </div>
                <div className="mb-6">
                  <p className="text-sm text-yellow-400 font-semibold uppercase tracking-widest mb-2">Premium</p>
                  <p className="text-4xl font-black gradient-text">Voir les offres</p>
                </div>
                <div className="space-y-3 mb-8">
                  {[
                    "Tout le plan Gratuit inclus",
                    "Assistant IA illimité",
                    "Scanner avancé en temps réel",
                    "Alertes de prix instantanées",
                    "Analyses IA approfondies",
                    "Support prioritaire",
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Crown className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      <span className="text-sm text-white/80">{f}</span>
                    </div>
                  ))}
                </div>
                <Link href="/register" className="block w-full text-center px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-primary text-black font-bold transition-all hover:opacity-90 hover:-translate-y-0.5 text-sm">
                  Découvrir Premium
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative glass-card p-10 md:p-16 rounded-3xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/10 to-pink-500/10" />
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/30 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl" />
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="inline-block mb-4"
              >
                <Sparkles className="w-8 h-8 text-primary" />
              </motion.div>
              <h2 className="text-3xl md:text-5xl font-black mb-4">
                Prêt à progresser ?
              </h2>
              <p className="text-white/60 text-lg mb-8">
                Rejoignez la plateforme. Accès gratuit, sans CB, en 30 secondes.
                <br /><span className="text-yellow-400 font-semibold">Premium disponible</span> pour débloquer toutes les fonctionnalités.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary hover:bg-primary/90 text-white text-base font-bold transition-all hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-1 w-full sm:w-auto justify-center"
                >
                  Créer mon compte
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/15 hover:bg-white/5 text-white text-base font-semibold transition-all w-full sm:w-auto justify-center"
                >
                  Se connecter
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-white/5 text-center text-sm text-white/30">
        <div className="flex items-center justify-center gap-2 mb-2">
          <TDBLogoSm size={20} />
          <span className="font-semibold text-white/50">CaptenTDB</span>
        </div>
        <p>Fait avec ❤️ par <span className="text-primary font-semibold">CaptenQwark</span></p>
        <p className="mt-1 text-xs">Les analyses sont à but éducatif uniquement. Ce site ne fournit pas de conseils financiers.</p>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD CONFIG
// ─────────────────────────────────────────────────────────────────────────────

type WidgetId = "indices" | "favorites" | "news" | "stats" | "positions" | "quickactions";

const DEFAULT_WIDGETS: WidgetId[] = ["indices", "favorites", "news", "stats", "quickactions"];
const DASHBOARD_STORAGE_KEY = "tdb_dashboard_config";

const WIDGET_META: Record<WidgetId, { label: string; icon: string; description: string }> = {
  indices:      { label: "Indices & Marchés",     icon: "📈", description: "CAC40, S&P500, BTC, Or en temps réel" },
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

        if (widgetId === "favorites") return (
          <motion.div key="favorites" variants={itemVariants}>
            <FavoritesWidget
              favorites={sortedFavorites}
              favSort={favSort}
              setFavSort={setFavSort}
              favFilter={favFilter}
              setFavFilter={setFavFilter}
              formatCurrency={formatCurrency}
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

function FavoritesWidget({ favorites, favSort, setFavSort, favFilter, setFavFilter, formatCurrency }: {
  favorites: Favorite[];
  favSort: "change_desc" | "change_asc" | "alpha";
  setFavSort: (s: "change_desc" | "change_asc" | "alpha") => void;
  favFilter: "all" | "profit" | "loss";
  setFavFilter: (f: "all" | "profit" | "loss") => void;
  formatCurrency: (v: number) => string;
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
              <FavoriteCard key={fav.symbol} favorite={fav} formatCurrency={formatCurrency} />
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
//  ROOT PAGE — Landing si non connecté, Dashboard si connecté
// ─────────────────────────────────────────────────────────────────────────────

export default function RootPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <Dashboard />;
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

function FavoriteCard({ favorite, formatCurrency }: { favorite: Favorite; formatCurrency: (v: number) => string }) {
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
            <p className="font-semibold text-sm">{favorite.error ? "—" : formatCurrency(favorite.price)}</p>
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
