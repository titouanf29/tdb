"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import {
  TrendingUp, TrendingDown, Star, Activity, ArrowUpRight, ArrowDownRight,
  Target, RefreshCw, Loader2, Globe, Newspaper, Shield, Plus, Wallet,
  Bot, BarChart3, Zap, Users, Brain, Lock, ChevronRight, LineChart,
  Sparkles, Bell, BookOpen, ArrowRight, CheckCircle2, Play, Crown, X,
} from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";
import { walletAPI, favoritesAPI, adminAPI, aiAPI, WalletBalance, TradingStats, Favorite, MarketNews, SummaryPoint } from "@/lib/api";
import { useFormatCurrency } from "@/lib/SettingsContext";
import { useAuth } from "@/lib/AuthContext";

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
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
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
                whileHover={{ scale: 1.06, y: -2 }}
                className="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all cursor-default"
              >
                <motion.span
                  className="text-xl mb-1"
                  animate={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 2, delay: i * 0.3, repeat: Infinity, repeatDelay: 4 }}
                >
                  {m.flag}
                </motion.span>
                <span className="text-xs font-semibold text-white/80">{m.name}</span>
                <motion.span
                  className={cn("text-xs mt-0.5 font-mono font-bold", m.up ? "text-emerald-400" : "text-rose-400")}
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                >
                  {m.change}
                </motion.span>
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
                whileHover={{ y: -6, scale: 1.01, transition: { duration: 0.2 } }}
                className={cn(
                  "relative p-6 rounded-2xl border bg-gradient-to-br overflow-hidden group cursor-default",
                  f.color, f.border
                )}
              >
                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 bg-white/5" />
                <div className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-2xl bg-gradient-to-br from-white/10 to-transparent" />
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-white/5 border transition-all duration-300 group-hover:scale-110 group-hover:bg-white/10",
                  f.border
                )}>
                  <f.icon className={cn("w-6 h-6 transition-transform duration-300 group-hover:rotate-6", f.iconColor)} />
                </div>
                <h3 className="text-base font-bold mb-2 text-white">{f.title}</h3>
                <p className="text-sm text-white/55 leading-relaxed">{f.desc}</p>
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
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px border-t border-dashed border-white/15" />
                )}
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
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-yellow-400 via-primary to-purple-500 p-[1px]">
                <div className="w-full h-full rounded-2xl bg-card/95" />
              </div>
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
          <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
            <TrendingUp className="w-3 h-3 text-white" />
          </div>
          <span className="font-semibold text-white/50">CaptenTDB</span>
        </div>
        <p>Fait avec ❤️ par <span className="text-primary font-semibold">CaptenQwark</span></p>
        <p className="mt-1 text-xs">Les analyses sont à but éducatif uniquement. Ce site ne fournit pas de conseils financiers.</p>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD (affiché si connecté)
// ─────────────────────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function Dashboard() {
  const formatCurrency = useFormatCurrency();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [marketNews, setMarketNews] = useState<MarketNews | null>(null);
  const [isLoadingNews, setIsLoadingNews] = useState(false);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const [balanceData, statsData, favoritesData, adminData] = await Promise.all([
        walletAPI.getBalance(),
        walletAPI.getStats(),
        favoritesAPI.getFavorites().catch(() => ({ favorites: [] })),
        adminAPI.checkAdmin().catch(() => ({ is_admin: false })),
      ]);
      setBalance(balanceData);
      setStats(statsData);
      setFavorites(favoritesData.favorites || []);
      setIsAdmin(adminData.is_admin);
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
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const avgFavChange = favorites.length > 0
    ? favorites.filter(f => !f.error).reduce((sum, f) => sum + f.change, 0) / favorites.filter(f => !f.error).length
    : 0;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Welcome banner */}
      <motion.div variants={itemVariants} className="glass-card p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Bienvenue sur <span className="gradient-text">TDB</span>
            </h1>
            <p className="text-muted-foreground">Suivez vos actifs favoris et restez informé des marchés</p>
          </div>
          <button onClick={() => loadData(true)} disabled={isRefreshing} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
          </button>
        </div>
      </motion.div>

      {/* Admin Card */}
      {isAdmin && (
        <motion.div variants={itemVariants}>
          <Link href="/admin">
            <div className="glass-card p-5 border border-yellow-500/30 hover:border-yellow-500/50 transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-yellow-500/20"><Shield className="w-6 h-6 text-yellow-500" /></div>
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
        <StatCard title="Perf. Moyenne" value={formatPercent(avgFavChange)} change={avgFavChange} icon={TrendingUp} />
        <StatCard title="Solde Wallet" value={formatCurrency(balance?.total_equity || balance?.balance || 0)} icon={Wallet} href="/wallet" />
        <StatCard title="Win Rate" value={`${stats?.win_rate || 0}%`} subtitle={`${stats?.total_trades || 0} trades`} icon={Target} />
      </motion.div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <h2 className="text-lg font-semibold">Mes Favoris</h2>
              </div>
              <Link href="/favorites" className="btn-ghost text-sm">Voir tout</Link>
            </div>
            {favorites.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun actif suivi</p>
                <Link href="/favorites" className="text-primary hover:underline text-sm flex items-center justify-center gap-1 mt-2">
                  <Plus className="w-4 h-4" />Ajouter des favoris
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {favorites.slice(0, 6).map((fav) => (
                  <FavoriteCard key={fav.symbol} favorite={fav} formatCurrency={formatCurrency} />
                ))}
                {favorites.length > 6 && (
                  <Link href="/favorites" className="block text-center text-sm text-primary hover:underline pt-2">
                    +{favorites.length - 6} autres actifs
                  </Link>
                )}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Actualités</h2>
              </div>
              <button onClick={loadMarketNews} disabled={isLoadingNews} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <RefreshCw className={cn("w-4 h-4", isLoadingNews && "animate-spin")} />
              </button>
            </div>
            {isLoadingNews && !marketNews ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : marketNews ? (
              <div className="space-y-4">
                {(marketNews.summary_points || marketNews.summary) && (
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Bot className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider">Résumé IA</span>
                    </div>
                    {marketNews.summary_points ? (
                      <div className="space-y-3">
                        {marketNews.summary_points.map((point: SummaryPoint, idx: number) => (
                          <div key={idx} className="flex gap-3">
                            <div className="mt-1 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-bold text-primary">{idx + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground mb-0.5">{point.title}</p>
                              <p className="text-xs text-muted-foreground leading-relaxed">{point.text}</p>
                              {point.assets && point.assets.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {point.assets.map((asset) => (
                                    <Link key={asset.symbol} href={`/analysis?q=${encodeURIComponent(asset.symbol)}`}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 hover:bg-primary/30 border border-primary/30 text-primary text-[11px] font-medium transition-colors">
                                      <TrendingUp className="w-2.5 h-2.5" />{asset.name}
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-line">{marketNews.summary}</p>
                    )}
                  </div>
                )}
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {marketNews.news.slice(0, 6).map((item, i) => (
                    <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
                      className="block p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                      <p className="text-sm font-medium line-clamp-2">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{item.publisher}</span>
                        {item.related && <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">{item.related}</span>}
                      </div>
                    </a>
                  ))}
                </div>
                {marketNews.generated_at && (
                  <p className="text-xs text-muted-foreground text-center">
                    Mis à jour: {new Date(marketNews.generated_at).toLocaleString("fr-FR")}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Cliquez sur actualiser pour charger les actualités</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick actions */}
      <motion.div variants={itemVariants}>
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Actions Rapides</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/favorites"><QuickActionCard title="Ajouter un Favori" icon="star" /></Link>
            <Link href="/markets"><QuickActionCard title="Explorer les Marchés" icon="globe" /></Link>
            <Link href="/analysis"><QuickActionCard title="Analyser un Actif" icon="chart" /></Link>
            <Link href="/assistant"><QuickActionCard title="Assistant IA" icon="bot" /></Link>
          </div>
        </div>
      </motion.div>

      {/* Trading Summary */}
      {(stats?.total_trades || 0) > 0 && (
        <motion.div variants={itemVariants}>
          <div className="glass-card p-6 opacity-80">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-muted-foreground">Résumé Trading</h2>
              <Link href="/wallet" className="btn-ghost text-sm">Voir le wallet</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-muted-foreground">Trades</p><p className="font-semibold">{stats?.total_trades || 0}</p></div>
              <div><p className="text-muted-foreground">Gagnés</p><p className="font-semibold text-profit">{stats?.winning_trades || 0}</p></div>
              <div><p className="text-muted-foreground">Perdus</p><p className="font-semibold text-loss">{stats?.losing_trades || 0}</p></div>
              <div>
                <p className="text-muted-foreground">P&L Total</p>
                <p className={cn("font-semibold", (stats?.total_pnl || 0) >= 0 ? "text-profit" : "text-loss")}>
                  {formatCurrency(stats?.total_pnl || 0)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
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
  return (
    <Link href={`/analysis?symbol=${favorite.symbol}`}>
      <div className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="font-semibold">{favorite.symbol}</span>
          </div>
          <div className="text-right">
            <p className="font-semibold">{favorite.error ? "N/A" : formatCurrency(favorite.price)}</p>
            {!favorite.error && (
              <p className={cn("text-sm flex items-center justify-end gap-1", isProfit ? "text-profit" : "text-loss")}>
                {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {formatPercent(favorite.change)}
              </p>
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
