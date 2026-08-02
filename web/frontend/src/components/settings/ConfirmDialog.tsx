"use client";

import { ReactNode, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/LanguageContext";
import { ModalShell } from "./ModalShell";

export interface ConfirmPayload {
  password: string;
  confirm: string;
}

interface Props {
  title: string;
  body: ReactNode;
  /** When set, the user must type this word exactly (case-insensitive). */
  confirmWord?: string;
  confirmPrompt?: string;
  requirePassword?: boolean;
  passwordPrompt?: string;
  submitLabel: string;
  destructive?: boolean;
  onConfirm: (payload: ConfirmPayload) => Promise<void>;
  onClose: () => void;
}

export function ConfirmDialog({
  title, body, confirmWord, confirmPrompt, requirePassword, passwordPrompt,
  submitLabel, destructive, onConfirm, onClose,
}: Props) {
  const { t } = useLanguage();
  const uid = useId();
  const [word, setWord] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wordOk = !confirmWord || word.trim().toUpperCase() === confirmWord.toUpperCase();
  const pwdOk = !requirePassword || password.length > 0;
  const canSubmit = wordOk && pwdOk && !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm({ password, confirm: word.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title={title} onClose={onClose} closeLabel={t("settings_cancel")} destructive={destructive}>
      <form onSubmit={submit} className="space-y-4">
        <div className="text-sm text-muted-foreground leading-relaxed">{body}</div>

        {confirmWord && (
          <div>
            <label htmlFor={`${uid}-word`} className="block text-sm font-medium mb-1.5">
              {confirmPrompt}
            </label>
            <input
              id={`${uid}-word`} type="text" value={word} autoComplete="off"
              onChange={(e) => setWord(e.target.value)}
              className="input w-full font-mono tracking-wide"
            />
          </div>
        )}

        {requirePassword && (
          <div>
            <label htmlFor={`${uid}-pwd`} className="block text-sm font-medium mb-1.5">
              {passwordPrompt}
            </label>
            <input
              id={`${uid}-pwd`} type="password" value={password} autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full"
            />
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-loss bg-loss/10 border border-loss/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost text-sm">
            {t("settings_cancel")}
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              destructive
                ? "bg-loss text-on-color hover:bg-loss/90 focus-visible:ring-loss"
                : "btn-primary"
            )}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {submitLabel}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
