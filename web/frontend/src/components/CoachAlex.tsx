"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X, Bot, ChevronRight, ChevronLeft, BarChart2, Globe,
  Lightbulb, Trophy, Sparkles, TrendingUp, Target, Zap,
  BookOpen, Search, MessageSquare, ArrowRight, MousePointer,
  CheckCircle, AlertCircle,
} from "lucide-react";
import { useUserLevel } from "@/hooks/useUserLevel";
import { useAlexStore } from "@/stores/alex-store";
import type { AlexAction } from "@/stores/alex-store";
import { useStepValidation } from "@/hooks/useStepValidation";
import { AlexHoverEngine } from "@/components/alex/AlexHoverEngine";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  ANALYSE_STEPS,
  DAILY_TIPS,
  MENU_ACTIONS,
  MARKET_OVERVIEW,
  type GuidedStep,
} from "@/components/CoachAlexData";

// ─── Main Component ───────────────────────────────────────────────────────────

export function CoachOverlay() {
  const { showCoach } = useUserLevel();
  const {
    isOpen, openPanel, closePanel,
    view, setView,
    guideStep, setGuideStep,
    activeTour, currentStep, totalSteps, currentMessage, currentAction,
    nextStep, previousStep, endTour,
    validationState, validationMessage, setValidation,
    hoverMode, enableHoverMode, disableHoverMode,
    startTour,
  } = useAlexStore();

  useStepValidation();

  if (!showCoach) return null;

  const hasNotif = !isOpen;

  const handleAction = (id: string) => {
    if (id === "missions") { closePanel(); return; }
    if (id === "analyse") {
      startTour("analyze-asset");
      return;
    }
    setView(id as "menu" | "analyse" | "tip" | "markets");
    setGuideStep(0);
  };

  const handleChoiceAction = (value: string) => {
    if (!currentAction || currentAction.type !== "multiple-choice") return;
    const result = currentAction.onSelect(value);
    setValidation(result.valid ? "success" : "error", result.message);
    if (result.valid) {
      setTimeout(() => nextStep(), 2000);
    }
  };

  return (
    <>
      <AlexHoverEngine />
      <div className="fixed bottom-4 left-4 z-50">
        {/* Panel */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="absolute bottom-16 left-0 w-80 sm:w-96"
            >
              {/* Glow */}
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-[#638CFF]/20 to-[#00D4AA]/10 blur-xl pointer-events-none" />

              <div className="relative rounded-2xl border border-white/10 bg-[#080d1a]/95 backdrop-blur-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div
                  className="relative flex items-center gap-3 px-4 py-3 border-b border-white/5"
                  style={{ background: "linear-gradient(135deg, rgba(99,140,255,0.12) 0%, rgba(0,212,170,0.06) 100%)" }}
                >
                  {activeTour ? (
                    <button onClick={endTour} className="text-gray-400 hover:text-white transition-colors mr-1">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  ) : view !== "menu" ? (
                    <button onClick={() => setView("menu")} className="text-gray-400 hover:text-white transition-colors mr-1">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  ) : null}

                  <motion.div
                    className="relative shrink-0"
                    animate={
                      validationState === "success"
                        ? { rotate: [0, -10, 10, -10, 0] }
                        : validationState === "error"
                        ? { x: [0, -5, 5, -5, 0] }
                        : {}
                    }
                    transition={{ duration: 0.4 }}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#638CFF] to-[#00D4AA] flex items-center justify-center shadow-lg shadow-[#638CFF]/30">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#00D4AA] border-2 border-[#080d1a]" />
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white leading-none">Alex</p>
                    <p className="text-xs text-[#00D4AA] mt-0.5">
                      {hoverMode
                        ? "Mode exploration actif 🔍"
                        : activeTour
                        ? `Étape ${currentStep + 1} / ${totalSteps}`
                        : "Coach Trading · En ligne"}
                    </p>
                  </div>
                  <button onClick={closePanel} className="text-gray-500 hover:text-gray-300 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress bar for active tour */}
                {activeTour && (
                  <div className="px-4 pt-2">
                    <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[#638CFF] to-[#00D4AA] rounded-full"
                        initial={false}
                        animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                  </div>
                )}

                {/* Content */}
                <AnimatePresence mode="wait">
                  {activeTour ? (
                    <TourView
                      key="tour"
                      message={currentMessage}
                      action={currentAction}
                      validationState={validationState}
                      validationMessage={validationMessage}
                      currentStep={currentStep}
                      totalSteps={totalSteps}
                      onNext={nextStep}
                      onPrev={previousStep}
                      onEnd={endTour}
                      onChoice={handleChoiceAction}
                      hoverMode={hoverMode}
                      onEnableHover={enableHoverMode}
                    />
                  ) : hoverMode ? (
                    <HoverView
                      key="hover"
                      message={currentMessage}
                      onDisable={disableHoverMode}
                    />
                  ) : view === "menu" ? (
                    <MenuView
                      key="menu"
                      onAction={handleAction}
                      hoverMode={hoverMode}
                      onToggleHover={hoverMode ? disableHoverMode : enableHoverMode}
                    />
                  ) : view === "analyse" ? (
                    <AnalyseView key="analyse" step={guideStep} setStep={setGuideStep} onClose={closePanel} />
                  ) : view === "tip" ? (
                    <TipView key="tip" tip={DAILY_TIPS[new Date().getDay() % DAILY_TIPS.length]} />
                  ) : (
                    <MarketsView key="markets" onClose={closePanel} />
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB */}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => (isOpen ? closePanel() : openPanel())}
          className="relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl"
          style={{
            background: isOpen
              ? "linear-gradient(135deg, #638CFF 0%, #00D4AA 100%)"
              : "linear-gradient(135deg, #1a2444 0%, #0f1e35 100%)",
            border: "1px solid rgba(99,140,255,0.4)",
            boxShadow: "0 4px 24px rgba(99,140,255,0.25), 0 1px 3px rgba(0,0,0,0.5)",
          }}
        >
          {!isOpen && (
            <>
              <motion.span
                className="absolute inset-0 rounded-2xl border border-[#638CFF]/40"
                animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.span
                className="absolute inset-0 rounded-2xl border border-[#638CFF]/20"
                animate={{ scale: [1, 1.6], opacity: [0.3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
              />
            </>
          )}

          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div key="close" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
                <X className="w-5 h-5 text-white" />
              </motion.div>
            ) : (
              <motion.div key="bot" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Bot className="w-6 h-6 text-[#638CFF]" />
              </motion.div>
            )}
          </AnimatePresence>

          {hasNotif && !isOpen && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#FF4757] border-2 border-[#080d1a]">
              <motion.span
                className="absolute inset-0 rounded-full bg-[#FF4757]"
                animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </span>
          )}
        </motion.button>
      </div>
    </>
  );
}

// ─── Tour View ─────────────────────────────────────────────────────────────────

function TourView({
  message, action, validationState, validationMessage,
  currentStep, totalSteps, onNext, onPrev, onEnd, onChoice, hoverMode, onEnableHover,
}: {
  message: string;
  action: AlexAction | null;
  validationState: "idle" | "success" | "error";
  validationMessage: string | null;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onEnd: () => void;
  onChoice: (value: string) => void;
  hoverMode: boolean;
  onEnableHover: () => void;
}) {
  const isLast = currentStep === totalSteps - 1;

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.18 }}
      className="p-4 space-y-3"
    >
      {/* Message */}
      <AnimatePresence mode="wait">
        <motion.div
          key={message}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="text-sm text-gray-300 leading-relaxed"
        >
          {message.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
            part.startsWith("**") ? (
              <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </motion.div>
      </AnimatePresence>

      {/* Validation feedback */}
      <AnimatePresence>
        {validationState !== "idle" && validationMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              "flex gap-2 p-2.5 rounded-xl text-xs leading-relaxed border",
              validationState === "success"
                ? "bg-[#00D4AA]/10 border-[#00D4AA]/30 text-[#00D4AA]"
                : "bg-[#FF4757]/10 border-[#FF4757]/30 text-[#FF6B7A]"
            )}
          >
            {validationState === "success" ? (
              <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            )}
            <span>{validationMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Multiple choice action */}
      {action?.type === "multiple-choice" && validationState === "idle" && (
        <div className="space-y-1.5">
          {action.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChoice(opt.value)}
              className="w-full text-left px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-[#638CFF]/10 hover:border-[#638CFF]/30 text-sm text-gray-300 hover:text-white transition-all"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Hover mode CTA at last step */}
      {isLast && !hoverMode && (
        <button
          onClick={onEnableHover}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-[#00D4AA]/30 bg-[#00D4AA]/10 text-sm text-[#00D4AA] hover:bg-[#00D4AA]/20 transition-colors"
        >
          <MousePointer className="w-4 h-4" />
          Activer le mode exploration
        </button>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-1 border-t border-white/5">
        <button
          onClick={onPrev}
          disabled={currentStep === 0}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Précédent
        </button>

        {isLast ? (
          <button
            onClick={onEnd}
            className="flex items-center gap-1.5 text-xs font-medium text-[#00D4AA] hover:text-[#00D4AA]/80 transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            Terminer !
          </button>
        ) : (
          <button
            onClick={onNext}
            disabled={action?.type === "multiple-choice" && validationState === "idle"}
            className="flex items-center gap-1.5 text-xs text-[#638CFF] hover:text-[#638CFF]/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Suivant
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Hover Mode View ──────────────────────────────────────────────────────────

function HoverView({ message, onDisable }: { message: string; onDisable: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.18 }}
      className="p-4 space-y-3"
    >
      {message ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={message}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="text-sm text-gray-300 leading-relaxed space-y-2"
          >
            {message.split(/\n\n/).map((para, pi) => (
              <p key={pi}>
                {para.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                  part.startsWith("**") ? (
                    <strong key={i} className="text-white font-semibold">
                      {part.slice(2, -2)}
                    </strong>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                )}
              </p>
            ))}
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <MousePointer className="w-8 h-8 text-[#00D4AA]/50" />
          </motion.div>
          <p className="text-sm text-gray-300 font-medium">Mode exploration actif</p>
          <p className="text-xs text-gray-500 leading-relaxed max-w-[220px]">
            Survolez un module sur la page — graphique, RSI, sélecteur d&apos;actif — pour que je l&apos;explique.
          </p>
        </div>
      )}

      <button
        onClick={onDisable}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-gray-500 hover:text-gray-300 hover:border-white/20 transition-colors"
      >
        <X className="w-3 h-3" />
        Désactiver le mode exploration
      </button>
    </motion.div>
  );
}

// ─── Sub-views ─────────────────────────────────────────────────────────────────

function MenuView({
  onAction,
  hoverMode,
  onToggleHover,
}: {
  onAction: (id: string) => void;
  hoverMode: boolean;
  onToggleHover: () => void;
}) {
  return (
    <motion.div
      key="menu"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.18 }}
      className="p-4 space-y-3"
    >
      {/* Welcome message */}
      <div className="flex gap-2.5 p-3 rounded-xl bg-[#638CFF]/8 border border-[#638CFF]/15">
        <Sparkles className="w-4 h-4 text-[#638CFF] shrink-0 mt-0.5" />
        <p className="text-sm text-gray-300 leading-relaxed">
          Bonjour ! Je suis <span className="text-white font-semibold">Alex</span>, votre coach trading.
          Que souhaitez-vous apprendre aujourd&apos;hui ?
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {MENU_ACTIONS.map((action, i) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => action.id === "missions" ? undefined : onAction(action.id)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl border bg-gradient-to-r transition-all text-left group hover:scale-[1.01]",
              action.color
            )}
          >
            {action.id === "missions" ? (
              <Link href="/learn/missions" className="flex items-center gap-3 w-full">
                <div className="shrink-0">{action.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{action.label}</p>
                  <p className="text-xs text-gray-400 truncate">{action.description}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <>
                <div className="shrink-0">{action.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{action.label}</p>
                  <p className="text-xs text-gray-400 truncate">{action.description}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </motion.button>
        ))}
      </div>

      {/* Hover mode toggle */}
      <button
        onClick={onToggleHover}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2 rounded-xl border text-sm transition-colors",
          hoverMode
            ? "border-[#00D4AA]/40 bg-[#00D4AA]/10 text-[#00D4AA] hover:bg-[#00D4AA]/20"
            : "border-white/10 bg-white/5 text-gray-400 hover:text-white hover:border-white/20"
        )}
      >
        <MousePointer className="w-4 h-4" />
        {hoverMode ? "Désactiver le mode exploration" : "Mode exploration"}
      </button>

      {/* Footer */}
      <div className="pt-1 border-t border-white/5 flex items-center justify-between">
        <Link
          href="/learn"
          className="text-xs text-gray-500 hover:text-[#638CFF] transition-colors flex items-center gap-1"
        >
          <BookOpen className="w-3 h-3" />
          Aller à la Formation
        </Link>
        <p className="text-xs text-gray-600">Alex v2.0</p>
      </div>
    </motion.div>
  );
}

// ─── Guided Analysis Flow ─────────────────────────────────────────────────────

function AnalyseView({ step, setStep, onClose }: {
  step: number;
  setStep: (s: number) => void;
  onClose: () => void;
}) {
  const current = ANALYSE_STEPS[step] as GuidedStep;
  const isLast = step === ANALYSE_STEPS.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.18 }}
      className="p-4"
    >
      {/* Step dots */}
      <div className="flex items-center gap-1.5 mb-4">
        {ANALYSE_STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={cn(
              "rounded-full transition-all",
              i === step
                ? "w-6 h-2 bg-[#638CFF]"
                : i < step
                  ? "w-2 h-2 bg-[#00D4AA]/60"
                  : "w-2 h-2 bg-white/15"
            )}
          />
        ))}
        <span className="ml-auto text-xs text-gray-500">{step + 1}/{ANALYSE_STEPS.length}</span>
      </div>

      {/* Step card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          {/* Icon + title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#638CFF]/20 to-[#00D4AA]/10 border border-[#638CFF]/20 flex items-center justify-center text-[#638CFF] shrink-0">
              {current.icon}
            </div>
            <div>
              <p className="text-xs text-[#638CFF] font-medium">{current.emoji} {current.title}</p>
            </div>
          </div>

          {/* Body — parse **bold** */}
          <p className="text-sm text-gray-300 leading-relaxed">
            {current.body.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
              part.startsWith("**") ? (
                <strong key={i} className="text-white font-semibold">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </p>

          {/* Tip box */}
          {current.tip && (
            <div className="flex gap-2 p-2.5 rounded-lg bg-yellow-400/8 border border-yellow-400/20">
              <Lightbulb className="w-3.5 h-3.5 text-yellow-300 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-200/80 leading-relaxed">{current.tip}</p>
            </div>
          )}

          {/* CTA */}
          {current.cta && (
            <Link
              href={current.cta.href!}
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-gradient-to-r from-[#638CFF] to-[#00D4AA] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {current.cta.label}
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Précédent
        </button>

        {isLast ? (
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-medium text-[#00D4AA] hover:text-[#00D4AA]/80 transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            Terminer !
          </button>
        ) : (
          <button
            onClick={() => setStep(Math.min(ANALYSE_STEPS.length - 1, step + 1))}
            className="flex items-center gap-1.5 text-xs text-[#638CFF] hover:text-[#638CFF]/80 transition-colors"
          >
            Suivant
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Tip View ─────────────────────────────────────────────────────────────────

function TipView({ tip }: { tip: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.18 }}
      className="p-4"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-yellow-300" />
          </div>
          <p className="text-sm font-semibold text-white">Conseil du jour</p>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-400/10 to-orange-400/5 border border-yellow-400/20">
          <p className="text-sm text-gray-200 leading-relaxed italic">&ldquo;{tip}&rdquo;</p>
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href="/learn"
            className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Approfondir dans la Formation
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Markets View ─────────────────────────────────────────────────────────────

function MarketsView({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.18 }}
      className="p-4 space-y-3"
    >
      <p className="text-sm text-gray-400">Les 4 grandes familles de marchés sur CaptentDB :</p>

      <div className="space-y-2">
        {MARKET_OVERVIEW.map((m, i) => (
          <motion.div
            key={m.name}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            className={cn("flex items-start gap-3 p-3 rounded-xl border bg-gradient-to-r from-transparent", m.color)}
          >
            <span className="text-lg shrink-0">{m.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">{m.name}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-400">
                  Risque {m.risk}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">{m.examples}</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">{m.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <Link
        href="/markets"
        onClick={onClose}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-[#638CFF] to-[#00D4AA] text-white text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <Globe className="w-4 h-4" />
        Explorer les marchés
      </Link>
    </motion.div>
  );
}
