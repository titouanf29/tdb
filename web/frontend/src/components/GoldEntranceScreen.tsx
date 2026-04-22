"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onComplete: () => void;
}

export function GoldEntranceScreen({ onComplete }: Props) {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1100);
    const t3 = setTimeout(() => setPhase(3), 2200);
    const t4 = setTimeout(() => onComplete(), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden"
      style={{ background: "#000" }}
      animate={phase === 3 ? { opacity: 0, scale: 1.04 } : { opacity: 1, scale: 1 }}
      transition={phase === 3 ? { duration: 0.7, ease: [0.4, 0, 0.2, 1] } : {}}
    >
      {/* Ambient gold radial */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 1 ? 1 : 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        style={{
          background: "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(245,158,11,0.18) 0%, rgba(180,83,9,0.10) 40%, transparent 70%)",
        }}
      />

      {/* Outer ring — expands slowly */}
      <motion.div
        className="absolute rounded-full border border-amber-500/20"
        initial={{ width: 80, height: 80, opacity: 0 }}
        animate={phase >= 1 ? { width: 700, height: 700, opacity: [0, 0.35, 0.15] } : {}}
        transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Mid ring */}
      <motion.div
        className="absolute rounded-full border border-amber-400/30"
        initial={{ width: 80, height: 80, opacity: 0 }}
        animate={phase >= 1 ? { width: 440, height: 440, opacity: [0, 0.5, 0.2] } : {}}
        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      />

      {/* Inner glowing orb */}
      <motion.div
        className="absolute rounded-full"
        initial={{ width: 0, height: 0, opacity: 0 }}
        animate={phase >= 1 ? { width: 160, height: 160, opacity: 1 } : {}}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: "radial-gradient(circle, rgba(251,191,36,0.5) 0%, rgba(245,158,11,0.25) 45%, transparent 70%)",
          boxShadow: "0 0 80px 20px rgba(245,158,11,0.25), 0 0 140px 40px rgba(180,83,9,0.12)",
        }}
      />

      {/* Gem icon */}
      <motion.div
        className="absolute"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={phase >= 1 ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="rgba(251,191,36,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3h12l4 6-10 13L2 9z"/>
          <path d="M11 3 8 9l4 13 4-13-3-6"/>
          <path d="M2 9h20"/>
        </svg>
      </motion.div>

      {/* Horizontal scan line */}
      <motion.div
        className="absolute w-full h-px"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.6) 30%, rgba(251,191,36,0.9) 50%, rgba(245,158,11,0.6) 70%, transparent 100%)" }}
        initial={{ scaleX: 0, opacity: 0, y: 0 }}
        animate={phase >= 1 ? { scaleX: 1, opacity: [0, 1, 0], y: [-120, 120] } : {}}
        transition={{ duration: 1.4, ease: "easeInOut", delay: 0.3 }}
      />

      {/* Main content block */}
      <div className="relative flex flex-col items-center gap-5 select-none" style={{ marginTop: 0 }}>
        {/* XAU/USD label */}
        <motion.p
          className="text-xs tracking-[0.35em] font-medium uppercase"
          style={{ color: "rgba(245,158,11,0.55)" }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.45 }}
        >
          XAU / USD · GC=F
        </motion.p>

        {/* GOLD HUB letters staggered */}
        <div className="flex items-center gap-1 overflow-hidden">
          {"GOLD HUB".split("").map((char, i) => (
            <motion.span
              key={i}
              className="text-5xl md:text-7xl font-black tracking-tight"
              style={{
                color: char === " " ? "transparent" : "transparent",
                backgroundImage: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 40%, #d97706 70%, #fbbf24 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "none",
                width: char === " " ? "1.5rem" : undefined,
              }}
              initial={{ opacity: 0, y: 40, rotateX: 90 }}
              animate={phase >= 1 ? { opacity: 1, y: 0, rotateX: 0 } : {}}
              transition={{
                duration: 0.55,
                delay: 0.5 + i * 0.045,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {char}
            </motion.span>
          ))}
        </div>

        {/* Separator */}
        <motion.div
          className="w-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.7), transparent)" }}
          initial={{ width: 0 }}
          animate={phase >= 2 ? { width: 240 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Subtitle */}
        <motion.p
          className="text-sm tracking-[0.2em] uppercase font-light"
          style={{ color: "rgba(253,230,138,0.55)" }}
          initial={{ opacity: 0, y: 8 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Analyse · Trading · Marchés
        </motion.p>

        {/* Status dots */}
        <motion.div
          className="flex items-center gap-6 mt-2"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {["COMEX", "LIVE DATA", "AI READY"].map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-amber-400"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
              />
              <span className="text-[10px] tracking-widest font-medium" style={{ color: "rgba(245,158,11,0.45)" }}>
                {label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-[2px]"
        style={{ background: "linear-gradient(90deg, rgba(245,158,11,0.8), rgba(251,191,36,1), rgba(245,158,11,0.8))" }}
        initial={{ width: "0%" }}
        animate={phase >= 0 ? { width: "100%" } : {}}
        transition={{ duration: 2.8, ease: "linear" }}
      />
    </motion.div>
  );
}
