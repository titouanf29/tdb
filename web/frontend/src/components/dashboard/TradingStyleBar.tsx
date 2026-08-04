"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { useSettings } from "@/lib/SettingsContext";
import { useLanguage } from "@/lib/LanguageContext";
import { getStyle, TRADING_STYLES, TRADING_STYLE_IDS, type TradingStyleId } from "@/lib/tradingStyle";
import { cn } from "@/lib/utils";

/**
 * The style switcher, on the dashboard rather than buried in Settings — and it
 * states what changes, so switching isn't a leap of faith.
 */
export function TradingStyleBar() {
  const { settings, saveSettings } = useSettings();
  const { lang } = useLanguage();
  const active = getStyle(settings.tradingStyle);
  const [saving, setSaving] = useState<TradingStyleId | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const pick = async (id: TradingStyleId) => {
    if (id === active.id || saving) return;
    setSaving(id);
    try {
      await saveSettings({ tradingStyle: id });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1800);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="terminal-label text-muted-foreground">
          {lang === "en" ? "Trading style" : "Style de trading"}
        </p>
        <AnimatePresence>
          {justSaved && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-profit"
            >
              <Check className="w-3 h-3" />
              {lang === "en" ? "Applied everywhere" : "Appliqué partout"}
            </motion.span>
          )}
        </AnimatePresence>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground/70">
          {lang === "en" ? "default chart" : "graphique par défaut"} · {active.defaultTimeframe}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {TRADING_STYLE_IDS.map((id) => {
          const s = TRADING_STYLES[id];
          const isActive = id === active.id;
          return (
            <button
              key={id}
              onClick={() => pick(id)}
              aria-pressed={isActive}
              className={cn(
                "relative flex flex-col items-start gap-0.5 border border-l-2 p-2.5 pl-3 text-left transition-all",
                isActive
                  ? cn(s.chip, "font-semibold")
                  : "border-border border-l-transparent bg-transparent text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              <span className="flex w-full items-center gap-1.5">
                <span className="text-sm leading-none">{s.emoji}</span>
                <span className="truncate text-xs font-semibold">{s.label[lang]}</span>
                {saving === id ? (
                  <Loader2 className="ml-auto w-3 h-3 animate-spin" />
                ) : isActive ? (
                  <Check className="ml-auto w-3.5 h-3.5" />
                ) : null}
              </span>
              <span className={cn("font-mono text-[10px]", isActive ? "opacity-80" : "opacity-60")}>
                {s.horizon[lang]}
              </span>
              {isActive && (
                <motion.span
                  layoutId="style-active-underline"
                  className={cn("absolute inset-x-0 bottom-0 h-px", s.dot)}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* What the choice actually does — otherwise it reads as decoration */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="space-y-2 border-t border-border pt-3"
        >
          <p className="text-xs text-muted-foreground leading-relaxed">{active.pitch[lang]}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
              {lang === "en" ? "watch" : "à surveiller"}
            </span>
            {active.focus[lang].map((f) => (
              <span
                key={f}
                className="border border-border px-1.5 py-0.5 font-mono text-[10px] text-foreground/70"
              >
                {f}
              </span>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
