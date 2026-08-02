"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, TrendingUp, TrendingDown, X, ArrowRight } from "lucide-react";
import { alertsAPI, PriceAlert } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useSettings } from "@/lib/SettingsContext";
import { cn } from "@/lib/utils";

const POLL_MS = 60_000;
// Remember which triggered alerts we've already shown, so a re-mount /
// second tab doesn't replay the same toast
const SEEN_KEY = "tdb_alerts_seen";

function loadSeen(): Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); }
  catch { return new Set(); }
}
function saveSeen(s: Set<number>) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(s).slice(-100))); } catch { /* ignore */ }
}

export function PriceAlertWatcher() {
  const { isAuthenticated } = useAuth();
  const { lang } = useLanguage();
  const { settings, isLoaded } = useSettings();
  const fr = lang !== "en";
  const [toasts, setToasts] = useState<PriceAlert[]>([]);
  // "Notifications d'alerte de prix" in /settings → web_user_settings.notifications_enabled
  const enabled = isAuthenticated && isLoaded && settings.priceAlertsEnabled;

  const dismiss = (id: number) => setToasts((t) => t.filter((a) => a.id !== id));

  // Turning the setting off clears anything already on screen.
  useEffect(() => {
    if (!enabled) setToasts([]);
  }, [enabled]);

  const poll = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await alertsAPI.check();
      if (!res.triggered?.length) return;
      const seen = loadSeen();
      const fresh = res.triggered.filter((a) => !seen.has(a.id));
      if (!fresh.length) return;
      fresh.forEach((a) => seen.add(a.id));
      saveSeen(seen);
      setToasts((t) => [...fresh, ...t].slice(0, 4));
      // auto-dismiss each after 12s
      fresh.forEach((a) => setTimeout(() => dismiss(a.id), 12_000));
    } catch { /* ignore transient errors */ }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(poll, 4000); // first check shortly after load
    const iv = setInterval(poll, POLL_MS);
    // also check when the tab regains focus
    const onFocus = () => poll();
    window.addEventListener("focus", onFocus);
    return () => { clearTimeout(t); clearInterval(iv); window.removeEventListener("focus", onFocus); };
  }, [enabled, poll]);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[120] flex flex-col gap-2.5 w-[min(92vw,360px)]">
      <AnimatePresence>
        {toasts.map((a) => {
          const up = a.direction === "above";
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="glass-card border border-[hsl(var(--gold)/0.30)] rounded-2xl p-4 backdrop-glow relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
                style={{ background: `radial-gradient(circle at 100% 0%, ${up ? "hsl(var(--profit)/0.16)" : "hsl(var(--loss)/0.16)"} 0%, transparent 65%)` }} />
              <div className="relative flex items-start gap-3">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                  up ? "bg-profit/12" : "bg-loss/12")}>
                  <Bell className={cn("w-4 h-4", up ? "text-profit" : "text-loss")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold font-mono">{a.symbol}</span>
                    <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-semibold",
                      up ? "text-profit" : "text-loss")}>
                      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {fr ? "alerte atteinte" : "alert hit"}
                    </span>
                  </div>
                  <p className="text-sm mt-0.5 leading-snug">
                    {fr
                      ? <>A {up ? "franchi" : "chuté sous"} votre cible de <b>{a.target}</b>{a.triggered_price != null && <> — cours actuel <b>{a.triggered_price}</b></>}.</>
                      : <>{up ? "Crossed above" : "Dropped below"} your <b>{a.target}</b> target{a.triggered_price != null && <> — now <b>{a.triggered_price}</b></>}.</>}
                  </p>
                  {a.note && <p className="text-[11px] text-muted-foreground mt-0.5 italic">« {a.note} »</p>}
                  <Link href={`/analysis?symbol=${a.symbol}`} onClick={() => dismiss(a.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 mt-1.5 transition-colors">
                    {fr ? "Analyser" : "Analyze"} <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <button onClick={() => dismiss(a.id)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
