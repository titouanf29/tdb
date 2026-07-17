"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, RefreshCw, Send, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { dailyIntentAPI, DailyIntentResult } from "@/lib/api";

const INTENT_EXAMPLES_FR = [
  "Setup day trading crypto avec 20 € virtuels",
  "Que surveiller la semaine prochaine ?",
  "Je veux apprendre à lire le RSI",
];
const INTENT_EXAMPLES_EN = [
  "Day trading crypto setup with $20 virtual",
  "What should I watch next week?",
  "I want to learn how to read RSI",
];

export function DailyIntentWidget({ lang }: { lang: string }) {
  const fr = lang !== "en";
  const [data, setData] = useState<DailyIntentResult | null>(null);
  const [input, setInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    dailyIntentAPI.get().then(setData).catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  const send = async (text: string) => {
    const intent = text.trim();
    if (intent.length < 5 || isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    try {
      const res = await dailyIntentAPI.set(intent);
      setData(res);
      setEditing(false);
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : fr ? "Erreur — réessayez" : "Error — try again");
    } finally {
      setIsSubmitting(false);
    }
  };
  const submit = () => send(input);

  if (isLoading) return <div className="glass-card h-24 animate-pulse" />;

  const exchanges = data?.exchanges ?? [];
  const hasAnswer = exchanges.length > 0 && !editing;
  const last = exchanges[exchanges.length - 1];
  const examples = fr ? INTENT_EXAMPLES_FR : INTENT_EXAMPLES_EN;

  return (
    <div className="glass-card p-5 relative overflow-hidden" data-module-id="daily-intent">
      <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
        style={{ background: "radial-gradient(circle at 100% 0%, hsl(var(--gold)/0.10) 0%, transparent 65%)" }} />
      <div className="relative">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-xl bg-[hsl(var(--gold)/0.15)] border border-[hsl(var(--gold)/0.25)] flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-[hsl(var(--gold))]" />
          </div>
          <h2 className="font-semibold">{fr ? "Votre intention du jour" : "Your intent for today"}</h2>
          {hasAnswer && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                {fr ? `${data?.remaining} échange${(data?.remaining ?? 0) > 1 ? "s" : ""} restant${(data?.remaining ?? 0) > 1 ? "s" : ""}` : `${data?.remaining} left`}
              </span>
              <button
                onClick={async () => {
                  if (isSubmitting) return;
                  setIsSubmitting(true);
                  try { setData(await dailyIntentAPI.reset()); setInput(""); setError(""); }
                  catch { /* ignore */ }
                  finally { setIsSubmitting(false); }
                }}
                title={fr ? "Effacer la conversation et repartir de zéro (le budget du jour reste décompté)" : "Clear the conversation and start over (daily budget stays spent)"}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-lg hover:bg-white/8 border border-white/8 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                {fr ? "Revenir à zéro" : "Start over"}
              </button>
            </div>
          )}
        </div>

        {!hasAnswer ? (
          <>
            <p className="text-sm text-muted-foreground mb-3">
              {fr
                ? "Dites ce que vous cherchez aujourd'hui — l'IA vous guide vers le bon outil et des actifs prometteurs."
                : "Say what you're after today — the AI points you to the right tool and promising assets."}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                maxLength={500}
                placeholder={fr
                  ? "Ex : aujourd'hui je cherche un setup day trading pour tester un actif avec 20 €…"
                  : "E.g.: today I'm looking for a day trading setup to test an asset with $20…"}
                className="input flex-1 text-sm"
                disabled={isSubmitting}
              />
              <button onClick={submit} disabled={isSubmitting || input.trim().length < 5}
                className="btn-primary flex items-center justify-center gap-2 text-sm disabled:opacity-50 whitespace-nowrap">
                {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isSubmitting ? (fr ? "Analyse…" : "Thinking…") : (fr ? "Demander" : "Ask")}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2.5">
              {examples.map((ex) => (
                <button key={ex} onClick={() => setInput(ex)}
                  className="text-xs px-2.5 py-1 rounded-full bg-white/4 hover:bg-white/8 border border-white/8 text-muted-foreground hover:text-foreground transition-all">
                  {ex}
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-loss mt-2">{error}</p>}
          </>
        ) : (
          <div className="space-y-3">
            {/* Conversation thread */}
            {exchanges.map((ex, i) => (
              <div key={i} className="space-y-1.5">
                <p className="text-xs text-muted-foreground italic">« {ex.message} »</p>
                <p className="text-sm leading-relaxed">{ex.response}</p>
              </div>
            ))}

            {(last?.assets?.length ?? 0) > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {fr ? "Actifs prometteurs pour votre demande" : "Promising assets for your request"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {last.assets.map((a) => (
                    <Link key={a.symbol} href={a.href}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/4 hover:bg-white/8 border border-white/8 hover:border-primary/30 transition-all group">
                      <div>
                        <p className="text-sm font-bold font-mono group-hover:text-primary transition-colors">{a.symbol}</p>
                        <p className="text-[11px] text-muted-foreground">{a.name}</p>
                      </div>
                      <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full border",
                        a.score >= 60 ? "bg-profit/10 border-profit/25 text-profit" :
                        a.score >= 40 ? "bg-warning/10 border-warning/25 text-warning" :
                                        "bg-loss/10 border-loss/25 text-loss")}>
                        {a.score}/100 · {a.signal}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {(last?.suggestions?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {last.suggestions.map((s) => (
                  <Link key={s.href + s.label} href={s.href}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/12 hover:bg-primary/20 border border-primary/25 text-primary text-sm font-semibold transition-all">
                    {s.label}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                ))}
              </div>
            )}

            {/* Clarifying question with clickable options */}
            {data?.question && (data?.remaining ?? 0) > 0 && (
              <div className="pt-1">
                <p className="text-sm text-muted-foreground mb-2">{data.question.text}</p>
                <div className="flex flex-wrap gap-2">
                  {data.question.options.map((opt) => (
                    <button key={opt} onClick={() => send(opt)} disabled={isSubmitting}
                      className="px-3.5 py-2 rounded-xl bg-[hsl(var(--gold)/0.10)] hover:bg-[hsl(var(--gold)/0.18)] border border-[hsl(var(--gold)/0.30)] text-sm font-semibold transition-all disabled:opacity-50">
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Free-text reply */}
            {(data?.remaining ?? 0) > 0 && (
              <div className="flex gap-2 pt-1">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                  maxLength={500}
                  placeholder={fr ? "Répondre ou préciser…" : "Reply or refine…"}
                  className="input flex-1 text-sm"
                  disabled={isSubmitting}
                />
                <button onClick={submit} disabled={isSubmitting || input.trim().length < 5}
                  className="btn-secondary flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            )}
            {error && <p className="text-xs text-loss">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

