"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

type Props = {
  type: "login" | "register";
  username?: string;
  onComplete: () => void;
};

// Random particle data — computed once per mount
function makeParticles(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 0.6,
    duration: Math.random() * 0.8 + 0.6,
    // direction toward center (50, 50)
    tx: (50 - Math.random() * 100) * 2,
    ty: (50 - Math.random() * 100) * 2,
  }));
}

// Warp speed lines — streaks flying from center outward
function makeStreaks(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * 360;
    const length = Math.random() * 30 + 15;
    return { id: i, angle, length, delay: Math.random() * 0.3, opacity: Math.random() * 0.6 + 0.3 };
  });
}

const PARTICLES = makeParticles(60);
const STREAKS = makeStreaks(40);

export function AuthTransition({ type, username, onComplete }: Props) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");
  const doneRef = useRef(false);
  const { lang } = useLanguage();
  const fr = lang === "fr";

  useEffect(() => {
    // hold → exit → navigate
    const t1 = setTimeout(() => setPhase("hold"), 1200);
    const t2 = setTimeout(() => setPhase("exit"), 2000);
    const t3 = setTimeout(() => {
      if (!doneRef.current) { doneRef.current = true; onComplete(); }
    }, 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  const isRegister = type === "register";
  const greetLine = isRegister
    ? (fr ? "Bienvenue" : "Welcome")
    : (fr ? "Content de te revoir" : "Welcome back");
  const nameLine  = username ? username : null;
  const fallback  = fr ? "Bienvenue !" : "Welcome!";
  const sub = isRegister
    ? (fr ? "$10 000 virtuels ajoutés à ton portefeuille" : "Virtual $10,000 added to your portfolio")
    : (fr ? "Ton tableau de bord t'attend" : "Your dashboard is waiting");

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{ background: "#020409" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* ── Animated grid ─────────────────────────────────── */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "exit" ? 0 : 0.15 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        style={{
          backgroundImage: `
            linear-gradient(rgba(99,102,241,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.4) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* ── Radial glow background ─────────────────────────── */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{
          opacity: phase === "exit" ? 0 : [0, 0.6, 0.4],
          scale:   phase === "exit" ? 3  : [0.5, 1.2, 1],
        }}
        transition={{ duration: 1.0, ease: "easeOut" }}
        style={{
          background: isRegister
            ? "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(234,179,8,0.18) 0%, rgba(16,185,129,0.08) 50%, transparent 100%)"
            : "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(99,102,241,0.22) 0%, rgba(16,185,129,0.06) 50%, transparent 100%)",
        }}
      />

      {/* ── Warp speed streaks ─────────────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {STREAKS.map((s) => (
          <motion.div
            key={s.id}
            className="absolute origin-left"
            style={{
              width: `${s.length}vw`,
              height: "1px",
              left: "50%",
              top: "50%",
              rotate: s.angle,
              background: isRegister
                ? `rgba(234,179,8,${s.opacity})`
                : `rgba(99,102,241,${s.opacity})`,
              boxShadow: isRegister
                ? `0 0 6px 1px rgba(234,179,8,0.3)`
                : `0 0 6px 1px rgba(99,102,241,0.3)`,
            }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={phase === "exit"
              ? { scaleX: 4, opacity: 0, transition: { duration: 0.5, ease: "easeIn", delay: s.delay * 0.3 } }
              : { scaleX: 1, opacity: s.opacity, transition: { duration: 0.5, delay: 0.2 + s.delay } }
            }
          />
        ))}
      </div>

      {/* ── Floating particles converging to center ────────── */}
      <div className="absolute inset-0 pointer-events-none">
        {PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.x}%`,
              top: `${p.y}%`,
              background: isRegister ? "#eab308" : "#6366f1",
              boxShadow: isRegister
                ? `0 0 ${p.size * 2}px ${p.size}px rgba(234,179,8,0.5)`
                : `0 0 ${p.size * 2}px ${p.size}px rgba(99,102,241,0.5)`,
            }}
            initial={{ opacity: 0, x: 0, y: 0, scale: 1 }}
            animate={phase === "exit"
              ? { opacity: 0, scale: 0, transition: { duration: 0.3 } }
              : {
                  opacity: [0, 1, 0],
                  x: p.tx,
                  y: p.ty,
                  scale: [1, 1.5, 0],
                  transition: { duration: p.duration, delay: p.delay, ease: "easeIn" },
                }
            }
          />
        ))}
      </div>

      {/* ── Central orb ────────────────────────────────────── */}
      <motion.div
        className="absolute"
        initial={{ scale: 0, opacity: 0 }}
        animate={phase === "exit"
          ? { scale: 8, opacity: 0, transition: { duration: 0.5, ease: "easeIn" } }
          : { scale: [0, 1.2, 1], opacity: 1, transition: { duration: 0.7, delay: 0.4, ease: "backOut" } }
        }
      >
        {/* Outer ring pulse */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ margin: -16 }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          initial={false}
        >
          <div
            className="w-full h-full rounded-full border-2"
            style={{
              width: 96 + 32,
              height: 96 + 32,
              borderColor: isRegister ? "rgba(234,179,8,0.4)" : "rgba(99,102,241,0.4)",
            }}
          />
        </motion.div>

        {/* Main orb */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{
            background: isRegister
              ? "radial-gradient(circle at 35% 35%, #fde68a, #eab308 60%, #92400e)"
              : "radial-gradient(circle at 35% 35%, #a5b4fc, #6366f1 60%, #312e81)",
            boxShadow: isRegister
              ? "0 0 60px 20px rgba(234,179,8,0.5), 0 0 120px 40px rgba(234,179,8,0.2)"
              : "0 0 60px 20px rgba(99,102,241,0.5), 0 0 120px 40px rgba(99,102,241,0.2)",
          }}
        >
          <TrendingUp className="w-10 h-10 text-white" strokeWidth={2.5} />
        </div>
      </motion.div>

      {/* ── Text ───────────────────────────────────────────── */}
      <motion.div
        className="absolute text-center px-6 pointer-events-none"
        style={{ top: "calc(50% + 72px)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={phase === "exit"
          ? { opacity: 0, y: -20, transition: { duration: 0.3 } }
          : { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.9 } }
        }
      >
        {nameLine ? (
          <>
            {/* Greeting line — small */}
            <p className="text-base sm:text-lg font-medium text-white/60 mb-1 tracking-wide">
              {greetLine},
            </p>
            {/* Username — big and glowing */}
            <motion.h2
              className="font-black tracking-tight leading-none"
              style={{
                fontSize: "clamp(2.8rem, 8vw, 5rem)",
                background: isRegister
                  ? "linear-gradient(135deg, #fff7aa, #fde68a, #eab308, #f97316)"
                  : "linear-gradient(135deg, #ffffff, #c7d2fe, #818cf8, #6366f1)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: isRegister
                  ? "drop-shadow(0 0 18px rgba(234,179,8,0.7)) drop-shadow(0 0 40px rgba(234,179,8,0.35))"
                  : "drop-shadow(0 0 18px rgba(99,102,241,0.8)) drop-shadow(0 0 40px rgba(99,102,241,0.4))",
              }}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={phase === "exit"
                ? { opacity: 0, scale: 1.05, transition: { duration: 0.25 } }
                : { opacity: 1, scale: 1, transition: { duration: 0.45, delay: 1.0, ease: "backOut" } }
              }
            >
              {nameLine} !
            </motion.h2>
          </>
        ) : (
          <h2
            className="text-3xl sm:text-4xl font-bold leading-tight"
            style={{
              background: isRegister
                ? "linear-gradient(135deg, #fde68a, #eab308, #f97316)"
                : "linear-gradient(135deg, #a5b4fc, #6366f1, #10b981)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {fallback}
          </h2>
        )}
        <motion.p
          className="text-sm text-white/50 mt-3"
          initial={{ opacity: 0 }}
          animate={phase === "exit" ? { opacity: 0 } : { opacity: 1, transition: { delay: 1.4 } }}
        >
          {sub}
        </motion.p>

        {/* Register bonus badge */}
        {isRegister && (
          <motion.div
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full border"
            style={{
              background: "rgba(16,185,129,0.1)",
              borderColor: "rgba(16,185,129,0.4)",
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={phase === "exit"
              ? { opacity: 0 }
              : { opacity: 1, scale: 1, transition: { delay: 1.5, type: "spring", stiffness: 200 } }
            }
          >
            <span className="text-green-400 text-lg">💰</span>
            <span className="text-green-400 font-semibold text-sm">{fr ? "$10 000 ajoutés" : "$10,000 added"}</span>
          </motion.div>
        )}
      </motion.div>

      {/* ── Progress bar at bottom ─────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
        <motion.div
          className="h-full"
          style={{
            background: isRegister
              ? "linear-gradient(90deg, #eab308, #f97316)"
              : "linear-gradient(90deg, #6366f1, #10b981)",
          }}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 2.4, ease: "linear" }}
        />
      </div>
    </motion.div>
  );
}
