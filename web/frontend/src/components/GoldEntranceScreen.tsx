"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onComplete: () => void;
}

// Small gold particles floating around the orb
function Particle({ i }: { i: number }) {
  const angle  = (i / 12) * 360;
  const radius = 90 + (i % 3) * 28;
  const size   = 2 + (i % 3);
  const dur    = 3.5 + (i % 4) * 0.6;
  const delay  = (i % 6) * 0.18;

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        background: `rgba(251,191,36,${0.5 + (i % 3) * 0.15})`,
        left: `calc(50% + ${Math.cos((angle * Math.PI) / 180) * radius}px)`,
        top:  `calc(50% + ${Math.sin((angle * Math.PI) / 180) * radius}px)`,
        boxShadow: `0 0 ${size * 3}px rgba(251,191,36,0.6)`,
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.9, 0.4, 0.9, 0],
        scale:   [0, 1.2, 0.8, 1.2, 0],
        y: [0, -10, 0, -6, 0],
      }}
      transition={{
        duration: dur,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

export function GoldEntranceScreen({ onComplete }: Props) {
  const [phase, setPhase]     = useState<0 | 1 | 2 | 3 | 4>(0);
  const [shimmer, setShimmer] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 120);
    const t2 = setTimeout(() => setPhase(2), 900);
    const t3 = setTimeout(() => { setPhase(3); setShimmer(true); }, 1700);
    const t4 = setTimeout(() => setPhase(4), 2700);
    const t5 = setTimeout(() => {
      if (!doneRef.current) { doneRef.current = true; onComplete(); }
    }, 3350);
    return () => [t1, t2, t3, t4, t5].forEach(clearTimeout);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase < 4 && (
        <motion.div
          key="entrance"
          className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden"
          style={{ background: "#050400" }}
          exit={{ opacity: 0, scale: 1.06 }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* ── Ambient radial glow ──────────────────────────────────── */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 1 ? 1 : 0 }}
            transition={{ duration: 1.6, ease: "easeOut" }}
            style={{
              background:
                "radial-gradient(ellipse 60% 48% at 50% 50%, rgba(245,158,11,0.14) 0%, rgba(180,83,9,0.07) 50%, transparent 72%)",
            }}
          />

          {/* ── Slow expanding rings ─────────────────────────────────── */}
          {[600, 380, 210].map((size, i) => (
            <motion.div
              key={size}
              className="absolute rounded-full pointer-events-none"
              style={{
                border: `1px solid rgba(245,158,11,${0.08 + i * 0.04})`,
              }}
              initial={{ width: 60, height: 60, opacity: 0 }}
              animate={
                phase >= 1
                  ? { width: size, height: size, opacity: [0, 0.6, 0.15] }
                  : {}
              }
              transition={{
                duration: 2.0 - i * 0.2,
                ease: [0.16, 1, 0.3, 1],
                delay: i * 0.08,
              }}
            />
          ))}

          {/* ── Central orb ─────────────────────────────────────────── */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            initial={{ width: 0, height: 0, opacity: 0 }}
            animate={phase >= 1 ? { width: 130, height: 130, opacity: 1 } : {}}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background:
                "radial-gradient(circle, rgba(251,191,36,0.38) 0%, rgba(245,158,11,0.14) 50%, transparent 70%)",
              boxShadow:
                "0 0 60px 16px rgba(245,158,11,0.18), 0 0 120px 36px rgba(180,83,9,0.10)",
            }}
          />

          {/* ── Floating particles ──────────────────────────────────── */}
          {phase >= 1 &&
            Array.from({ length: 12 }).map((_, i) => <Particle key={i} i={i} />)}

          {/* ── Gold bar icon ────────────────────────────────────────── */}
          <motion.div
            className="absolute"
            initial={{ opacity: 0, scale: 0.6, y: 4 }}
            animate={phase >= 1 ? { opacity: 1, scale: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="4"  y="13" width="28" height="10" rx="2.5"
                    fill="rgba(251,191,36,0.18)" stroke="rgba(251,191,36,0.85)" strokeWidth="1.4"/>
              <rect x="8"  y="9"  width="20" height="5"  rx="1.8"
                    fill="rgba(251,191,36,0.12)" stroke="rgba(245,158,11,0.7)"  strokeWidth="1.2"/>
              <rect x="11" y="23" width="14" height="4"  rx="1.5"
                    fill="rgba(251,191,36,0.10)" stroke="rgba(245,158,11,0.6)"  strokeWidth="1.1"/>
              {/* XAU engraving lines */}
              <line x1="10" y1="17.5" x2="26" y2="17.5" stroke="rgba(251,191,36,0.35)" strokeWidth="0.8"/>
              <line x1="10" y1="19.5" x2="26" y2="19.5" stroke="rgba(251,191,36,0.22)" strokeWidth="0.6"/>
            </svg>
          </motion.div>

          {/* ── Main text block ──────────────────────────────────────── */}
          <div className="relative flex flex-col items-center gap-4 select-none">
            {/* XAU / USD */}
            <motion.p
              className="text-[11px] tracking-[0.38em] font-medium uppercase"
              style={{ color: "rgba(245,158,11,0.45)" }}
              initial={{ opacity: 0, y: 8 }}
              animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.38 }}
            >
              XAU / USD &nbsp;·&nbsp; GC=F
            </motion.p>

            {/* GOLD HUB — letter stagger with blur reveal */}
            <div
              className="relative flex items-center gap-0.5 overflow-hidden"
              style={{ perspective: "600px" }}
            >
              {"GOLD HUB".split("").map((char, i) => (
                <motion.span
                  key={i}
                  className="text-5xl md:text-7xl font-black"
                  style={{
                    backgroundImage:
                      "linear-gradient(160deg, #fde68a 0%, #fbbf24 30%, #f59e0b 60%, #d97706 80%, #fbbf24 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    letterSpacing: char === " " ? "1.2rem" : "-0.01em",
                    width: char === " " ? "1rem" : undefined,
                    display: "inline-block",
                  }}
                  initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
                  animate={
                    phase >= 1
                      ? { opacity: 1, y: 0, filter: "blur(0px)" }
                      : {}
                  }
                  transition={{
                    duration: 0.5,
                    delay: 0.42 + i * 0.042,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  {char === " " ? " " : char}
                </motion.span>
              ))}

              {/* Shimmer sweep */}
              {shimmer && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.22) 45%, rgba(253,230,138,0.18) 55%, transparent 75%)",
                    backgroundSize: "200% 100%",
                  }}
                  initial={{ backgroundPositionX: "200%" }}
                  animate={{ backgroundPositionX: "-100%" }}
                  transition={{ duration: 0.75, ease: "easeInOut" }}
                />
              )}
            </div>

            {/* Divider line */}
            <motion.div
              style={{
                height: 1,
                background:
                  "linear-gradient(90deg, transparent, rgba(245,158,11,0.65), rgba(253,230,138,0.4), rgba(245,158,11,0.65), transparent)",
              }}
              initial={{ width: 0, opacity: 0 }}
              animate={phase >= 2 ? { width: 260, opacity: 1 } : {}}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Subtitle */}
            <motion.p
              className="text-[11px] tracking-[0.22em] uppercase font-light"
              style={{ color: "rgba(253,230,138,0.45)" }}
              initial={{ opacity: 0, y: 6 }}
              animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.08 }}
            >
              Analyse&nbsp;·&nbsp;Trading&nbsp;·&nbsp;Marchés
            </motion.p>

            {/* Status dots */}
            <motion.div
              className="flex items-center gap-7 mt-1"
              initial={{ opacity: 0 }}
              animate={phase >= 2 ? { opacity: 1 } : {}}
              transition={{ duration: 0.45, delay: 0.2 }}
            >
              {(["COMEX", "LIVE DATA", "AI READY"] as const).map((label, i) => (
                <div key={label} className="flex items-center gap-1.5">
                  <motion.div
                    className="rounded-full bg-amber-400"
                    style={{ width: 5, height: 5 }}
                    animate={{ opacity: [0.35, 1, 0.35], scale: [0.9, 1.15, 0.9] }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      delay: i * 0.35,
                      ease: "easeInOut",
                    }}
                  />
                  <span
                    className="text-[9.5px] tracking-[0.18em] font-medium"
                    style={{ color: "rgba(245,158,11,0.4)" }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── Bottom progress bar ──────────────────────────────────── */}
          <motion.div
            className="absolute bottom-0 left-0 h-[1.5px]"
            style={{
              background:
                "linear-gradient(90deg, rgba(245,158,11,0.6), rgba(253,230,138,1), rgba(251,191,36,0.9), rgba(245,158,11,0.6))",
              boxShadow: "0 0 8px rgba(251,191,36,0.5)",
            }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 3.0, ease: "linear" }}
          />

          {/* ── Top thin gold line (mirrored) ────────────────────────── */}
          <motion.div
            className="absolute top-0 left-0 h-[1px]"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(245,158,11,0.3), transparent)",
            }}
            initial={{ width: "0%", opacity: 0 }}
            animate={phase >= 1 ? { width: "100%", opacity: 1 } : {}}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
