"use client";

import { useEffect, useState, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, ChevronRight, ChevronLeft, Zap, Star, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TourStepDef = {
  element?: string;
  title: string;
  description: string;
  emoji?: string;
};

type SpotRect = { x: number; y: number; width: number; height: number } | null;
type Mood = "idle" | "excited" | "happy";

// ── Spotlight SVG ─────────────────────────────────────────────────────────────

function Spotlight({ rect, maskId, padding = 16 }: { rect: SpotRect; maskId: string; padding?: number }) {
  const [vp, setVp] = useState({ w: 1440, h: 900 });

  useEffect(() => {
    const upd = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    upd();
    window.addEventListener("resize", upd);
    return () => window.removeEventListener("resize", upd);
  }, []);

  if (!rect) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-[9990] pointer-events-none"
        style={{ background: "rgba(6,6,7,0.86)" }}
      />
    );
  }

  const x = Math.round(rect.x - padding);
  const y = Math.round(rect.y - padding);
  const w = Math.round(rect.width + padding * 2);
  const h = Math.round(rect.height + padding * 2);

  return (
    <svg
      className="fixed inset-0 z-[9990] pointer-events-none"
      width={vp.w}
      height={vp.h}
      style={{ overflow: "visible" }}
    >
      <defs>
        <mask id={maskId}>
          <rect width={vp.w} height={vp.h} fill="white" />
          <rect x={x} y={y} width={w} height={h} rx={12} fill="black" />
        </mask>
      </defs>

      {/* Dark overlay with hole */}
      <rect
        width={vp.w}
        height={vp.h}
        fill="rgba(6,6,7,0.86)"
        mask={`url(#${maskId})`}
      />

      {/* Animated spotlight border */}
      <motion.rect
        x={x - 1} y={y - 1} width={w + 2} height={h + 2} rx={13}
        fill="none"
        stroke="rgba(232,168,32,0.9)"
        strokeWidth={2}
        initial={false}
        animate={{ x: x - 1, y: y - 1, width: w + 2, height: h + 2 }}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
      />

      {/* Outer pulsing ring */}
      <motion.rect
        x={x - 7} y={y - 7} width={w + 14} height={h + 14} rx={18}
        fill="none"
        stroke="rgba(232,168,32,0.3)"
        strokeWidth={1.5}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Scan line effect */}
      <motion.rect
        x={x} y={y} width={w} height={2} rx={1}
        fill="rgba(232,168,32,0.4)"
        animate={{ y: [y, y + h - 2, y] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

// ── Alex Avatar ───────────────────────────────────────────────────────────────

function AlexAvatar({ mood, stepKey }: { mood: Mood; stepKey: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 88, height: 88 }}>

      {/* Outer glow */}
      <motion.div
        className="absolute inset-0 rounded-[24px]"
        style={{ background: "hsl(var(--primary) / 0.35)", filter: "blur(14px)" }}
        animate={{ opacity: [0.35, 0.6, 0.35], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Body */}
      <motion.div
        key={stepKey}
        className="relative flex items-center justify-center rounded-[22px] shadow-2xl"
        style={{
          width: 80, height: 80,
          background: "hsl(var(--card))",
          border: "2px solid rgba(232,168,32,0.55)",
          boxShadow: "none",
        }}
        animate={
          mood === "happy"
            ? { rotate: [-8, 8, -8, 8, 0], scale: [1, 1.1, 1.05, 1.1, 1] }
            : mood === "excited"
            ? { scale: [1, 1.06, 1, 1.06, 1], y: [0, -4, 0, -4, 0] }
            : { y: [0, -5, 0] }
        }
        transition={
          mood === "happy"
            ? { duration: 0.55, repeat: 1 }
            : mood === "excited"
            ? { duration: 0.4, repeat: 2 }
            : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
        }
      >
        {/* Bot icon */}
        <Bot className="w-10 h-10" style={{ color: "#E8A820" }} />

        {/* Highlight */}
        <div
          className="absolute top-2 left-2 w-6 h-2 rounded-full"
          style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.15), transparent)" }}
        />

        {/* Status badge */}
        <motion.div
          className="absolute -bottom-1.5 -right-1.5 rounded-full border-2 flex items-center justify-center"
          style={{
            width: 22, height: 22,
            background: mood === "happy" ? "#E8A820" : "#5FC9DC",
            borderColor: "hsl(var(--card))",
          }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          {mood === "happy"
            ? <Star className="w-2.5 h-2.5 text-white fill-white" />
            : <Sparkles className="w-2.5 h-2.5 text-white" />
          }
        </motion.div>
      </motion.div>

      {/* Floating particles — happy */}
      <AnimatePresence>
        {mood === "happy" && [0, 1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 5, height: 5,
              background: i % 2 ? "#E8A820" : "#5FC9DC",
              left: "50%", top: "50%",
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos((i / 6) * Math.PI * 2) * 44,
              y: Math.sin((i / 6) * Math.PI * 2) * 44,
              opacity: 0,
              scale: 0.2,
            }}
            transition={{
              duration: 0.9,
              delay: i * 0.07,
              repeat: Infinity,
              repeatDelay: 1.6,
              ease: "easeOut",
            }}
          />
        ))}
      </AnimatePresence>

      {/* Orbit dot */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 8, height: 8, background: "#5FC9DC", top: "10%", left: "50%", transformOrigin: "0 32px" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

// ── Tour Card ──────────────────────────────────────────────────────────────────

function TourCard({
  step, stepIndex, totalSteps, onNext, onPrev, onClose,
}: {
  step: TourStepDef;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}) {
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;
  const mood: Mood = isLast ? "happy" : isFirst ? "excited" : "idle";
  const progress = (stepIndex + 1) / totalSteps;

  return (
    <motion.div
      className="fixed z-[9995]"
      style={{ bottom: 16, left: "50%", width: "min(420px, calc(100vw - 24px))" }}
      initial={{ opacity: 0, y: 40, scale: 0.9, x: "-50%" }}
      animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
      exit={{ opacity: 0, y: 40, scale: 0.9, x: "-50%" }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
    >
      {/* Alex floats above */}
      <motion.div
        className="flex justify-center"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.08, type: "spring", stiffness: 280, damping: 20 }}
        style={{ marginBottom: -8 }}
      >
        <AlexAvatar mood={mood} stepKey={stepIndex} />
      </motion.div>

      {/* Speech bubble */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(150deg, rgba(18,26,52,0.98) 0%, rgba(8,13,26,0.98) 100%)",
          border: "1px solid rgba(232,168,32,0.2)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(232,168,32,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* Progress stripe */}
        <div className="h-[3px] w-full" style={{ background: "rgba(255,255,255,0.06)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #E8A820, #00D4AA)" }}
            initial={false}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          />
        </div>

        <div className="p-5 pt-4 sm:p-6 sm:pt-5">
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: "#E8A820" }}>Alex</span>
              <span className="text-xs text-gray-600">·</span>
              <span className="text-sm text-gray-400 font-medium">
                {stepIndex + 1} / {totalSteps}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-200 hover:bg-white/10 transition-all"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Title */}
          <AnimatePresence mode="wait">
            <motion.h3
              key={`t-${stepIndex}`}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="text-lg font-bold text-white mb-2 leading-snug"
            >
              {step.emoji && <span className="mr-2">{step.emoji}</span>}
              {step.title}
            </motion.h3>
          </AnimatePresence>

          {/* Description */}
          <AnimatePresence mode="wait">
            <motion.p
              key={`d-${stepIndex}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, delay: 0.04 }}
              className="text-[15px] leading-relaxed mb-4"
              style={{ color: "rgba(200,215,235,0.9)" }}
            >
              {step.description}
            </motion.p>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <motion.div
                key={i}
                className="rounded-full"
                style={{
                  background: i === stepIndex
                    ? "linear-gradient(90deg, #E8A820, #00D4AA)"
                    : i < stepIndex
                    ? "rgba(232,168,32,0.45)"
                    : "rgba(255,255,255,0.14)",
                }}
                animate={{ width: i === stepIndex ? 24 : 7, height: 7 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            {stepIndex > 0 && (
              <motion.button
                onClick={onPrev}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(170,180,200,1)",
                  minHeight: 48,
                }}
              >
                <ChevronLeft className="w-4 h-4" />
                Retour
              </motion.button>
            )}

            <motion.button
              onClick={isLast ? onClose : onNext}
              whileHover={{ scale: 1.02, opacity: 0.92 }}
              whileTap={{ scale: 0.97 }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[15px] font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #E8A820 0%, #00D4AA 100%)", minHeight: 48 }}
            >
              {isLast ? (
                <>
                  <Zap className="w-4 h-4" />
                  C&apos;est parti !
                </>
              ) : (
                <>
                  Suivant
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </motion.button>

            {!isLast && (
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(140,150,170,1)",
                  minHeight: 48,
                }}
              >
                Ignorer
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main AlexTour ─────────────────────────────────────────────────────────────

export function AlexTour({ steps, onDone }: { steps: TourStepDef[]; onDone: () => void }) {
  const uid = useId().replace(/:/g, "");
  const maskId = `spotlight-mask-${uid}`;
  const [stepIndex, setStepIndex] = useState(0);
  const [spotRect, setSpotRect] = useState<SpotRect>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Compute spotlight rect for current step
  useEffect(() => {
    const step = steps[stepIndex];
    if (!step?.element) {
      setSpotRect(null);
      return;
    }

    const update = () => {
      const el = document.querySelector(step.element!);
      if (!el) { setSpotRect(null); return; }

      // Scroll element into view, then measure
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      const apply = () => {
        const r = el.getBoundingClientRect();
        if (r.width > 0) {
          setSpotRect({ x: r.left, y: r.top, width: r.width, height: r.height });
        }
      };
      setTimeout(apply, 380);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [stepIndex, steps]);

  const handleNext = useCallback(() => {
    if (stepIndex < steps.length - 1) setStepIndex((s) => s + 1);
    else onDone();
  }, [stepIndex, steps.length, onDone]);

  const handlePrev = useCallback(() => {
    setStepIndex((s) => Math.max(0, s - 1));
  }, []);

  if (!mounted || steps.length === 0) return null;

  return createPortal(
    <AnimatePresence>
      <Spotlight rect={spotRect} maskId={maskId} />
      {/* Click blocker on overlay (not on spotlight area — handled by SVG pointer-events:none) */}
      <div className="fixed inset-0 z-[9991]" style={{ pointerEvents: "none" }} />
      <TourCard
        step={steps[stepIndex]}
        stepIndex={stepIndex}
        totalSteps={steps.length}
        onNext={handleNext}
        onPrev={handlePrev}
        onClose={onDone}
      />
    </AnimatePresence>,
    document.body
  );
}
