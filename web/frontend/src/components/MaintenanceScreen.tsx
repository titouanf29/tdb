"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Wrench, Clock, TrendingUp, Shield } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

function Countdown({ target }: { target: string }) {
  const { lang } = useLanguage();
  const [diff, setDiff] = useState<{ h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const end = new Date(target).getTime();
    const update = () => {
      const now = Date.now();
      const rem = end - now;
      if (rem <= 0) { setDiff({ h: 0, m: 0, s: 0 }); return; }
      setDiff({
        h: Math.floor(rem / 3600000),
        m: Math.floor((rem % 3600000) / 60000),
        s: Math.floor((rem % 60000) / 1000),
      });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!diff) return null;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex items-center gap-3 justify-center">
      {[
        { v: diff.h, label: lang === "fr" ? "heures" : "hours" },
        { v: diff.m, label: lang === "fr" ? "min" : "min" },
        { v: diff.s, label: lang === "fr" ? "sec" : "sec" },
      ].map(({ v, label }, i) => (
        <div key={label} className="flex items-center gap-3">
          {i > 0 && <span className="text-white/30 text-2xl font-light">:</span>}
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black"
              style={{
                background: "rgba(99,140,255,0.12)",
                border: "1px solid rgba(99,140,255,0.25)",
                boxShadow: "0 0 16px rgba(99,140,255,0.1)",
              }}
            >
              {pad(v)}
            </div>
            <p className="text-[10px] text-white/30 mt-1.5 uppercase tracking-wider">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

const GEAR_POSITIONS = [
  { x: "10%", y: "15%", size: 120, duration: 8, delay: 0, dir: 1 },
  { x: "80%", y: "10%", size: 80,  duration: 12, delay: 1, dir: -1 },
  { x: "5%",  y: "70%", size: 100, duration: 10, delay: 0.5, dir: -1 },
  { x: "85%", y: "65%", size: 140, duration: 9,  delay: 2, dir: 1 },
  { x: "50%", y: "82%", size: 60,  duration: 7,  delay: 1.5, dir: -1 },
];

function GearSVG({ size, className }: { size: number; className?: string }) {
  const r = size / 2;
  const teeth = 8;
  const innerR = r * 0.55;
  const outerR = r * 0.85;
  const toothW = (2 * Math.PI * outerR) / (teeth * 3);

  const points: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a1 = (i / teeth) * 2 * Math.PI - Math.PI / 2;
    const a2 = a1 + (Math.PI / teeth) * 0.5;
    const a3 = a1 + Math.PI / teeth;
    const a4 = a3 + (Math.PI / teeth) * 0.5;
    points.push(
      `${(Math.cos(a1) * innerR + r).toFixed(1)},${(Math.sin(a1) * innerR + r).toFixed(1)}`,
      `${(Math.cos(a2) * outerR + r).toFixed(1)},${(Math.sin(a2) * outerR + r).toFixed(1)}`,
      `${(Math.cos(a3) * outerR + r).toFixed(1)},${(Math.sin(a3) * outerR + r).toFixed(1)}`,
      `${(Math.cos(a4) * innerR + r).toFixed(1)},${(Math.sin(a4) * innerR + r).toFixed(1)}`,
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      <polygon points={points.join(" ")} fill="currentColor" />
      <circle cx={r} cy={r} r={r * 0.3} fill="var(--background, #020409)" />
    </svg>
  );
}

export function MaintenanceScreen({
  message,
  endTime,
}: {
  message?: string;
  endTime?: string;
}) {
  const { lang } = useLanguage();
  const fr = lang === "fr";

  const hasEndTime = !!endTime && !isNaN(new Date(endTime).getTime());
  const endDate = hasEndTime ? new Date(endTime!) : null;
  const formattedEnd = endDate
    ? endDate.toLocaleString(fr ? "fr-FR" : "en-US", {
        weekday: "long", day: "numeric", month: "long",
        hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(160deg, #020409 0%, #060c1a 50%, #030810 100%)" }}
    >
      {/* Animated grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,140,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,140,255,0.5) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-violet-500/6 blur-3xl pointer-events-none" />

      {/* Floating gears */}
      {GEAR_POSITIONS.map((g, i) => (
        <motion.div
          key={i}
          className="absolute text-white/[0.04] pointer-events-none"
          style={{ left: g.x, top: g.y }}
          animate={{ rotate: g.dir > 0 ? 360 : -360 }}
          transition={{ duration: g.duration, repeat: Infinity, ease: "linear", delay: g.delay }}
        >
          <GearSVG size={g.size} />
        </motion.div>
      ))}

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-lg mx-4"
      >
        {/* Border glow */}
        <div className="absolute -inset-px rounded-3xl"
          style={{ background: "linear-gradient(135deg, rgba(99,140,255,0.35), rgba(139,92,246,0.15), rgba(99,140,255,0.30))" }} />

        <div
          className="relative rounded-3xl p-8 space-y-7 text-center"
          style={{ background: "linear-gradient(160deg, hsl(220 50% 6.5%) 0%, hsl(220 45% 5.5%) 100%)" }}
        >
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-3xl overflow-hidden">
            <motion.div
              className="h-full w-full"
              style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6, #6366f1)" }}
              animate={{ backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
          </div>

          {/* Logo area */}
          <div className="flex flex-col items-center gap-4">
            {/* Animated wrench orb */}
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0.1, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                style={{ margin: -12 }}
              >
                <div
                  className="w-full h-full rounded-full border-2"
                  style={{ width: 88, height: 88, borderColor: "rgba(99,140,255,0.3)" }}
                />
              </motion.div>
              <motion.div
                className="w-16 h-16 rounded-2xl flex items-center justify-center relative"
                animate={{ rotate: [0, -8, 8, -5, 5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                style={{
                  background: "radial-gradient(circle at 35% 35%, #a5b4fc, #6366f1 60%, #312e81)",
                  boxShadow: "0 0 40px rgba(99,102,241,0.5), 0 0 80px rgba(99,102,241,0.2)",
                }}
              >
                <Wrench className="w-8 h-8 text-white" strokeWidth={2} />
              </motion.div>
            </div>

            {/* Logo text */}
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary/80">CaptenTDB</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight"
                style={{
                  background: "linear-gradient(135deg, #ffffff, #c7d2fe, #818cf8)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 12px rgba(99,102,241,0.5))",
                }}>
                {fr ? "Maintenance en cours" : "Under Maintenance"}
              </h1>
              <p className="text-white/50 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                {fr
                  ? "La plateforme est temporairement hors ligne pour une mise à jour. Elle sera de retour très bientôt."
                  : "The platform is temporarily offline for an update. It will be back very soon."}
              </p>
            </div>
          </div>

          {/* Admin message */}
          {message && message.trim() && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="px-5 py-4 rounded-2xl text-left"
              style={{
                background: "rgba(99,140,255,0.06)",
                border: "1px solid rgba(99,140,255,0.2)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-primary/70">
                  {fr ? "Message de l'équipe" : "Team message"}
                </span>
              </div>
              <p className="text-sm text-white/75 leading-relaxed">{message}</p>
            </motion.div>
          )}

          {/* Countdown or end time */}
          {hasEndTime && endTime && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-3.5 h-3.5 text-white/40" />
                <p className="text-xs text-white/40 uppercase tracking-wider">
                  {fr ? "Retour prévu" : "Expected return"}
                </p>
              </div>
              <Countdown target={endTime} />
              {formattedEnd && (
                <p className="text-xs text-white/30 capitalize">{formattedEnd}</p>
              )}
            </motion.div>
          )}

          {/* Status dots */}
          <div className="flex items-center justify-center gap-3">
            {[
              { label: fr ? "Serveurs" : "Servers", ok: false },
              { label: fr ? "Données" : "Data", ok: true },
              { label: fr ? "Sécurité" : "Security", ok: true },
            ].map(({ label, ok }) => (
              <div key={label} className="flex items-center gap-1.5">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: ok ? "#10b981" : "#f59e0b" }}
                  animate={ok ? {} : { opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
                <span className="text-[10px] text-white/35">{label}</span>
              </div>
            ))}
          </div>

          {/* Illustration strip — 3 decorative feature cards */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { icon: "📊", label: fr ? "Analyses" : "Analysis" },
              { icon: "🤖", label: fr ? "IA" : "AI" },
              { icon: "💰", label: fr ? "Portefeuille" : "Portfolio" },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl opacity-30 select-none"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <span className="text-lg grayscale">{icon}</span>
                <span className="text-[9px] text-white/50 font-medium">{label}</span>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-white/20 pb-1">
            © CaptenTDB · {fr ? "Merci pour votre patience" : "Thank you for your patience"}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
