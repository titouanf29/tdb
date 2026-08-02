"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { TDBLogo } from "@/components/ui/TDBLogo";

interface MaintenanceScreenProps {
  message: string;
  endTime?: string;
  startedAt?: string;
  lang: "fr" | "en";
}

/* Lines are revealed one after another, so the last one carries the payload.
   Order matters: the reassuring facts land before the bad news. */
const BOOT_LINES = {
  fr: [
    { label: "moteur d'analyse", value: "EN VEILLE", tone: "muted" },
    { label: "portefeuilles & positions", value: "INTACTS", tone: "ok" },
    { label: "historique & journal", value: "INTACTS", tone: "ok" },
    { label: "accès public", value: "SUSPENDU", tone: "warn" },
  ],
  en: [
    { label: "analysis engine", value: "STANDBY", tone: "muted" },
    { label: "portfolios & positions", value: "INTACT", tone: "ok" },
    { label: "history & journal", value: "INTACT", tone: "ok" },
    { label: "public access", value: "SUSPENDED", tone: "warn" },
  ],
} as const;

const TIPS = {
  fr: [
    "Un stop-loss défini avant l'entrée vaut mieux que dix bonnes intentions après.",
    "Le RSI ne dit pas « achète ». Il dit « ce mouvement s'essouffle ». Ce n'est pas pareil.",
    "Risquer 1 % par position, c'est pouvoir se tromper 20 fois de suite et rester en jeu.",
    "Un actif peut rester survendu bien plus longtemps que votre patience ne tient.",
    "Le volume valide la cassure. Sans volume, c'est une rumeur.",
    "Sur CaptenTDB, tout est simulé : c'est exactement l'endroit où se tromper.",
  ],
  en: [
    "A stop-loss set before you enter beats ten good intentions after.",
    "RSI never says \"buy\". It says \"this move is running out of breath\". Not the same thing.",
    "Risking 1% per position means you can be wrong 20 times in a row and still be playing.",
    "An asset can stay oversold far longer than your patience will hold.",
    "Volume validates the breakout. Without volume, it's a rumour.",
    "On CaptenTDB everything is simulated — this is exactly where you should get it wrong.",
  ],
} as const;

/** Monospace counter where only the digits that actually changed animate.
 *  Groups are labelled — "41:27" on its own is unreadable (hours? minutes?). */
function FlipCounter({
  groups,
  still,
}: {
  groups: { digits: string; label: string }[];
  still: boolean;
}) {
  return (
    <div className="flex items-start justify-center gap-1 sm:gap-2">
      {groups.map((group, gi) => (
        <div key={group.label} className="flex items-start">
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex gap-[3px]">
              {group.digits.split("").map((char, di) => (
                <span
                  key={`${group.label}-${di}`}
                  className="relative w-[clamp(28px,7vw,44px)] h-[clamp(46px,11vw,66px)] overflow-hidden border border-primary/20 bg-primary/[0.06]"
                >
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      key={char}
                      initial={still ? false : { y: "-100%", opacity: 0 }}
                      animate={{ y: "0%", opacity: 1 }}
                      exit={still ? { opacity: 0 } : { y: "100%", opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0 flex items-center justify-center font-mono font-bold tabular-nums text-[clamp(24px,6vw,38px)] text-primary"
                    >
                      {char}
                    </motion.span>
                  </AnimatePresence>
                </span>
              ))}
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
              {group.label}
            </span>
          </div>
          {gi < groups.length - 1 && (
            <span className="flex h-[clamp(46px,11vw,66px)] items-center px-0.5 font-mono text-lg text-primary/40">
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function MaintenanceScreen({ message, endTime, startedAt, lang }: MaintenanceScreenProps) {
  const reduce = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());
  const [tip, setTip] = useState(0);
  // First paint must not animate every digit in from nowhere.
  const firstTick = useRef(true);

  useEffect(() => {
    const t = setInterval(() => {
      firstTick.current = false;
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTip((i) => (i + 1) % TIPS[lang].length), 7000);
    return () => clearInterval(t);
  }, [lang]);

  const endMs   = endTime ? new Date(endTime).getTime() : null;
  const startMs = startedAt ? new Date(startedAt).getTime() : null;

  const remaining = endMs ? Math.max(0, endMs - now) : null;

  const clock = useMemo(() => {
    if (remaining == null) return null;
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    const p = (n: number) => String(n).padStart(2, "0");
    const L = lang === "en"
      ? { h: "hrs", m: "min", s: "sec" }
      : { h: "h",   m: "min", s: "sec" };
    const groups = [
      { digits: p(m), label: L.m },
      { digits: p(s), label: L.s },
    ];
    if (h > 0) groups.unshift({ digits: p(h), label: L.h });
    return groups;
  }, [remaining, lang]);

  // A real bar or none at all — a decorative one that fills on a loop is a lie.
  const pct =
    endMs && startMs && endMs > startMs
      ? Math.min(100, Math.max(0, ((now - startMs) / (endMs - startMs)) * 100))
      : null;

  const t = {
    fr: {
      title: "Maintenance en cours",
      status: "MAINTENANCE",
      back: "Retour estimé dans",
      soon: "Retour imminent",
      progress: "Progression",
      auto: "Cette page se réactualise toute seule — rien à faire.",
      tipLabel: "En attendant",
      safe: "Vos positions, votre solde et votre historique sont intacts.",
    },
    en: {
      title: "Maintenance in progress",
      status: "MAINTENANCE",
      back: "Estimated back in",
      soon: "Back any moment now",
      progress: "Progress",
      auto: "This page refreshes itself — nothing to do.",
      tipLabel: "Meanwhile",
      safe: "Your positions, balance and history are untouched.",
    },
  }[lang];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background flex items-center justify-center p-4 sm:p-6">
      {/* Grid + vignette: same backdrop language as the rest of the terminal */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary)/0.055) 1px, transparent 1px)," +
            "linear-gradient(90deg, hsl(var(--primary)/0.055) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 0%, hsl(var(--primary)/0.10), transparent 70%)",
        }}
      />
      {/* Scanline — the one moving element that sells "machine at work" */}
      {!reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-40"
          style={{
            background:
              "linear-gradient(180deg, transparent, hsl(var(--primary)/0.05), transparent)",
          }}
          animate={{ top: ["-10%", "110%"] }}
          transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-xl"
      >
        {/* ── Terminal frame ─────────────────────────────────────────────── */}
        <div className="border border-primary/25 bg-card/95 backdrop-blur-sm">
          {/* Title bar */}
          <div className="flex items-center gap-3 border-b border-primary/20 bg-primary/[0.05] px-3 py-2">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 bg-loss/70" />
              <span className="w-2 h-2 bg-primary/70" />
              <span className="w-2 h-2 bg-profit/60" />
            </div>
            <span className="font-mono text-[11px] tracking-wide text-muted-foreground truncate">
              captentdb.fr<span className="hidden sm:inline"> — system status</span>
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              <motion.span
                className="w-1.5 h-1.5 bg-primary"
                animate={reduce ? {} : { opacity: [1, 0.25, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-primary">
                {t.status}
              </span>
            </span>
          </div>

          <div className="px-5 py-6 sm:px-7 sm:py-8 space-y-7">
            {/* Logo + title */}
            <div className="flex items-center gap-3">
              <motion.div
                animate={reduce ? {} : { y: [0, -3, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <TDBLogo size={40} />
              </motion.div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold font-display leading-tight">
                  {t.title}
                </h1>
                <p className="font-mono text-[11px] text-muted-foreground">
                  Capten<span className="text-primary">TDB</span> · captentdb.fr
                </p>
              </div>
            </div>

            {/* Admin message */}
            <p className="border-l-2 border-primary/40 pl-3 text-sm leading-relaxed text-foreground/85">
              {message}
            </p>

            {/* Boot log */}
            <div className="space-y-1.5">
              {BOOT_LINES[lang].map((line, i) => (
                <motion.div
                  key={line.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.18, duration: 0.35 }}
                  className="flex items-baseline gap-2 font-mono text-[11px] sm:text-xs"
                >
                  <span className="text-primary/50">›</span>
                  <span className="text-muted-foreground">{line.label}</span>
                  <span className="flex-1 border-b border-dotted border-border translate-y-[-3px]" />
                  <span
                    className={
                      line.tone === "ok"
                        ? "text-profit"
                        : line.tone === "warn"
                        ? "text-primary"
                        : "text-muted-foreground/70"
                    }
                  >
                    {line.value}
                  </span>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 + BOOT_LINES[lang].length * 0.18 }}
                className="flex items-start gap-2 pt-1 font-mono text-[11px] sm:text-xs text-muted-foreground"
              >
                <span className="text-primary/50">$</span>
                {/* Cursor lives inside the text flow, so it stays glued to the
                    last word instead of drifting to the right edge on wrap. */}
                <span>
                  {t.safe}{" "}
                  <motion.span
                    className="inline-block w-[7px] h-[11px] translate-y-[1px] bg-primary/80"
                    animate={reduce ? {} : { opacity: [1, 0, 1] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                  />
                </span>
              </motion.div>
            </div>

            {/* Countdown */}
            {clock && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.4 }}
                className="space-y-3"
              >
                <p className="text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {remaining && remaining > 0 ? t.back : t.soon}
                </p>
                <FlipCounter groups={clock} still={firstTick.current || !!reduce} />
              </motion.div>
            )}

            {/* Real progress bar — only when we can actually compute one */}
            {pct != null && (
              <div className="space-y-1.5">
                <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>{t.progress}</span>
                  <span className="text-primary tabular-nums">{Math.round(pct)}%</span>
                </div>
                <div className="h-[6px] bg-primary/10 overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            )}

            {/* Indeterminate scanner when there is no announced end time */}
            {pct == null && (
              <div className="relative h-[6px] overflow-hidden bg-primary/10">
                <motion.div
                  className="absolute inset-y-0 w-1/3 bg-primary/70"
                  animate={reduce ? { opacity: [0.4, 1, 0.4] } : { left: ["-35%", "100%"] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            )}
          </div>

          {/* Rotating tip strip */}
          <div className="border-t border-primary/20 bg-primary/[0.035] px-5 py-3 sm:px-7">
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary/70">
              {t.tipLabel}
            </p>
            <div className="relative h-12 sm:h-9 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={tip}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 text-xs leading-relaxed text-muted-foreground"
                >
                  {TIPS[lang][tip]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center font-mono text-[10px] text-muted-foreground/60">
          {t.auto}
        </p>
      </motion.div>
    </div>
  );
}
