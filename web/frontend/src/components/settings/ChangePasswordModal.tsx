"use client";

import { useId, useState } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { accountAPI, APIError } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import { ModalShell } from "./ModalShell";

interface Props {
  onClose: () => void;
  onSuccess: (token: string) => void;
}

/** Mirrors the server-side rule in users.py: ≥8 chars, ≥1 letter, ≥1 digit. */
function isStrong(pwd: string): boolean {
  return pwd.length >= 8 && /[A-Za-z]/.test(pwd) && /\d/.test(pwd);
}

export function ChangePasswordModal({ onClose, onSuccess }: Props) {
  const { t } = useLanguage();
  const uid = useId();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reveal, setReveal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strengthError = next.length > 0 && !isStrong(next) ? t("settings_pwd_rules") : null;
  const mismatchError = confirm.length > 0 && next !== confirm ? t("settings_pwd_mismatch") : null;
  const sameError = next.length > 0 && next === current ? t("settings_pwd_same") : null;
  const canSubmit =
    current.length > 0 && isStrong(next) && next === confirm && next !== current && !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await accountAPI.changePassword(current, next);
      onSuccess(res.access_token);
    } catch (err) {
      if (err instanceof APIError && err.status === 401) setError(t("settings_pwd_wrong_current"));
      else setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  const inputType = reveal ? "text" : "password";

  return (
    <ModalShell title={t("settings_change_password")} onClose={onClose} closeLabel={t("settings_cancel")}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor={`${uid}-cur`} className="block text-sm font-medium mb-1.5">
            {t("settings_pwd_current")}
          </label>
          <input
            id={`${uid}-cur`} type={inputType} autoComplete="current-password"
            value={current} onChange={(e) => setCurrent(e.target.value)}
            className="input w-full" required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor={`${uid}-new`} className="text-sm font-medium">
              {t("settings_pwd_new")}
            </label>
            <button
              type="button" onClick={() => setReveal((r) => !r)}
              aria-label={t("settings_pwd_new")} aria-pressed={reveal}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1"
            >
              {reveal ? <EyeOff className="w-3.5 h-3.5" aria-hidden="true" /> : <Eye className="w-3.5 h-3.5" aria-hidden="true" />}
            </button>
          </div>
          <input
            id={`${uid}-new`} type={inputType} autoComplete="new-password"
            value={next} onChange={(e) => setNext(e.target.value)}
            aria-describedby={`${uid}-rules`}
            className="input w-full" required
          />
          <p id={`${uid}-rules`} className="text-[11px] text-muted-foreground mt-1">
            {t("settings_pwd_rules")}
          </p>
          {strengthError && <p className="text-[11px] text-loss mt-1">{strengthError}</p>}
          {sameError && <p className="text-[11px] text-loss mt-1">{sameError}</p>}
        </div>

        <div>
          <label htmlFor={`${uid}-cfm`} className="block text-sm font-medium mb-1.5">
            {t("settings_pwd_confirm")}
          </label>
          <input
            id={`${uid}-cfm`} type={inputType} autoComplete="new-password"
            value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="input w-full" required
          />
          {mismatchError && <p className="text-[11px] text-loss mt-1">{mismatchError}</p>}
        </div>

        {error && (
          <p role="alert" className="text-sm text-loss bg-loss/10 border border-loss/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost text-sm">
            {t("settings_cancel")}
          </button>
          <button type="submit" disabled={!canSubmit} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {t("settings_pwd_submit")}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
