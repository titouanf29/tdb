"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, TrendingDown, ArrowRight, X, Trophy, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { WelcomeBackResult } from "@/lib/api";
import { getAssetInfo } from "@/lib/assetInfo";

function useCountUp(target: number, duration = 1100, run = true) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) { setV(target); return; }
    let raf = 0; const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, run]);
  return v;
}

function Particles({ up }: { up: boolean }) {
  const dots = Array.from({ length: 14 });
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {dots.map((_, i) => (
        <motion.span
          key={i}
          className={cn("absolute w-1.5 h-1.5 rounded-full", up ? "bg-profit/70" : "bg-primary/50")}
          initial={{ x: `${10 + (i * 6) % 80}%`, y: "110%", opacity: 0 }}
          animate={{ y: "-10%", opacity: [0, 1, 0] }}
          transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.25, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

export function WelcomeBackModal({
  data, lang, formatCurrency, onClose,
}: {
  data: WelcomeBackResult;
  lang: string;
  formatCurrency: (v: number) => string;
  onClose: () => void;
}) {
  const fr = lang !== "en";
  const [step, setStep] = useState(0);
  const eq = data.equity!;
  const up = eq.change >= 0;
  const movers = [
    ...(data.positions || []).map((p) => ({ symbol: p.symbol, pct: p.pct_move, kind: "position" as const, extra: p.pnl_delta })),
    ...(data.favorites || []).map((f) => ({ symbol: f.symbol, pct: f.pct_move, kind: "favorite" as const, extra: 0 })),
  ].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 6);

  const totalSteps = movers.length > 0 ? 3 : 2;
  const counted = useCountUp(eq.change, 1100, step === 0);

  // Esc to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const next = () => setStep((s) => Math.min(totalSteps - 1, s + 1));

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="relative w-full max-w-lg glass-card border border-[hsl(var(--gold)/0.30)] rounded-3xl overflow-hidden backdrop-glow"
        >
          {up && step === 0 && <Particles up={up} />}
          <div className="absolute top-0 right-0 w-72 h-72 pointer-events-none"
            style={{ background: `radial-gradient(circle at 100% 0%, ${up ? "hsl(var(--profit)/0.18)" : "hsl(var(--primary)/0.16)"} 0%, transparent 65%)` }} />

          <button onClick={onClose}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>

          <div className="relative p-7 min-h-[340px] flex flex-col">
            <AnimatePresence mode="wait">
              {/* ── Step 0 : hero ── */}
              {step === 0 && (
                <motion.div key="hero" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[hsl(var(--gold))] uppercase tracking-widest mb-4">
                    <Sparkles className="w-3.5 h-3.5" />
                    {fr ? "Votre récap" : "Your recap"}
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {fr ? "Content de vous revoir" : "Welcome back"}
                    {data.first_name ? <>, <span className="gradient-text-gold">{data.first_name}</span></> : ""} 👋
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {fr ? `Absent·e pendant ${data.away_label}. Voici ce qui a bougé sur votre portefeuille.`
                        : `Away for ${data.away_label}. Here's what moved in your portfolio.`}
                  </p>

                  <div className="my-auto py-6 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      {fr ? "Évolution du portefeuille" : "Portfolio change"}
                    </p>
                    <p className={cn("text-5xl font-black font-display tabular-nums tracking-tight", up ? "text-profit" : "text-loss")}>
                      {up ? "+" : ""}{formatCurrency(counted)}
                    </p>
                    <p className={cn("text-lg font-bold mt-1 tabular-nums", up ? "text-profit" : "text-loss")}>
                      {up ? "▲" : "▼"} {up ? "+" : ""}{eq.change_pct.toFixed(2)}%
                    </p>
                  </div>

                  <p className="text-sm leading-relaxed text-white/70 bg-white/4 border border-white/8 rounded-xl p-3.5">
                    {data.message}
                  </p>
                </motion.div>
              )}

              {/* ── Step 1 : movers ── */}
              {step === 1 && movers.length > 0 && (
                <motion.div key="movers" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
                  <h3 className="text-lg font-bold mb-1">{fr ? "Ce qui a bougé" : "What moved"}</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    {fr ? "Positions et favoris, du plus grand mouvement au plus petit." : "Positions and favorites, biggest move first."}
                  </p>
                  <div className="space-y-2 flex-1">
                    {movers.map((m, i) => {
                      const info = getAssetInfo(m.symbol);
                      const gain = m.pct >= 0;
                      return (
                        <motion.div key={m.symbol + m.kind}
                          initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.09 }}
                          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/4 border border-white/8">
                          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                            gain ? "bg-profit/12" : "bg-loss/12")}>
                            {m.kind === "position" ? <TrendingUp className={cn("w-4 h-4", gain ? "text-profit" : "text-loss")} />
                                                   : <Star className={cn("w-4 h-4", gain ? "text-profit" : "text-loss")} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold font-mono">{m.symbol}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {info.name} · {m.kind === "position" ? (fr ? "position" : "position") : (fr ? "favori" : "favorite")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={cn("text-sm font-bold tabular-nums", gain ? "text-profit" : "text-loss")}>
                              {gain ? "+" : ""}{m.pct.toFixed(2)}%
                            </p>
                            {m.kind === "position" && Math.abs(m.extra) >= 0.01 && (
                              <p className={cn("text-[11px] tabular-nums", m.extra >= 0 ? "text-profit/80" : "text-loss/80")}>
                                {m.extra >= 0 ? "+" : ""}{formatCurrency(m.extra)} P&L
                              </p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ── Final : best/worst + CTA ── */}
              {step === totalSteps - 1 && step !== 0 && (
                <motion.div key="outro" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
                  <h3 className="text-lg font-bold mb-4">{fr ? "Les extrêmes" : "The extremes"}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-auto">
                    {data.best && (
                      <div className="p-4 rounded-2xl bg-profit/8 border border-profit/25">
                        <div className="flex items-center gap-1.5 text-xs text-profit font-semibold mb-2"><Trophy className="w-3.5 h-3.5" />{fr ? "Meilleur" : "Best"}</div>
                        <p className="font-bold font-mono">{data.best.symbol}</p>
                        <p className="text-profit font-bold tabular-nums">+{data.best.pct.toFixed(2)}%</p>
                      </div>
                    )}
                    {data.worst && (
                      <div className="p-4 rounded-2xl bg-loss/8 border border-loss/25">
                        <div className="flex items-center gap-1.5 text-xs text-loss font-semibold mb-2"><TrendingDown className="w-3.5 h-3.5" />{fr ? "Plus faible" : "Weakest"}</div>
                        <p className="font-bold font-mono">{data.worst.symbol}</p>
                        <p className="text-loss font-bold tabular-nums">{data.worst.pct.toFixed(2)}%</p>
                      </div>
                    )}
                    {!data.best && !data.worst && (
                      <div className="sm:col-span-2 text-center text-sm text-muted-foreground py-4">
                        {fr ? "Mouvements modérés — journée calme sur vos actifs." : "Modest moves — a calm day on your assets."}
                      </div>
                    )}
                  </div>
                  <Link href="/analysis" onClick={onClose}
                    className="mt-4 btn-primary flex items-center justify-center gap-2 text-sm">
                    {fr ? "Analyser un actif" : "Analyze an asset"}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Footer nav ── */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/8">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <button key={i} onClick={() => setStep(i)}
                    className={cn("h-1.5 rounded-full transition-all", i === step ? "w-6 bg-[hsl(var(--gold))]" : "w-1.5 bg-white/20 hover:bg-white/40")} />
                ))}
              </div>
              {step < totalSteps - 1 ? (
                <button onClick={next} className="btn-primary flex items-center gap-2 text-sm px-5 py-2">
                  {fr ? "Suivant" : "Next"} <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={onClose} className="btn-secondary text-sm px-5 py-2">
                  {fr ? "C'est parti" : "Let's go"}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
