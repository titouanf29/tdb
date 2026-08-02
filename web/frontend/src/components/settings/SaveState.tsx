"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check, AlertTriangle, RotateCcw } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface Props {
  status: SaveStatus;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
  /** Override the default "Enregistrement… / Sauvegardé" wording. */
  savingLabel?: string;
  savedLabel?: string;
}

/**
 * The single place a save is reported. "✓ Sauvegardé" can only render once the
 * network call has actually resolved — `status` is driven by useSaveStatus.
 */
export function SaveState({ status, error, onRetry, className, savingLabel, savedLabel }: Props) {
  const { t } = useLanguage();

  return (
    <div className={className} aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        {status === "saving" && (
          <motion.span
            key="saving"
            initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            {savingLabel ?? t("settings_saving")}
          </motion.span>
        )}

        {status === "saved" && (
          <motion.span
            key="saved"
            initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-xs font-medium text-profit"
          >
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
            {savedLabel ?? t("settings_saved")}
          </motion.span>
        )}

        {status === "error" && (
          <motion.span
            key="error"
            initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-xs text-loss max-w-full"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{error || t("settings_save_error")}</span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1 shrink-0 rounded-md px-1.5 py-0.5 font-semibold underline underline-offset-2 hover:bg-loss/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-loss/50 transition-colors"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                {t("settings_retry")}
              </button>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
