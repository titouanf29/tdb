"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { aiAPI, type Analysis } from "@/lib/api";
import {
  Button, DUR, EASE, Panel, Markdown, Nimbo, Text } from "@/components/design-system";

/**
 * Poser une question sur CETTE analyse.
 *
 * L'ancien écran d'analyse avait un fil de discussion ; en le reconstruisant
 * je l'ai perdu, et l'endpoint est resté branché à rien. Il revient ici, avec
 * une différence qui compte : les questions proposées sont dérivées de
 * l'analyse ouverte.
 *
 * C'est tout l'intérêt. « Posez votre question » devant un champ vide ne sert
 * personne : quelqu'un qui débute ne sait pas quoi demander, et c'est
 * précisément pourquoi il a besoin d'aide. Une contradiction entre le verdict
 * et un indicateur, un edge historique négatif, un stop très proche — ce sont
 * les questions que l'écran lui-même soulève, et ce sont celles qu'on offre.
 *
 * Le contexte envoyé est un résumé compact rédigé ici plutôt que le JSON brut
 * de l'analyse : deux cent vingt-deux champs noieraient la question, et la
 * moitié n'a aucun sens pour un modèle de langue.
 */

function contextOf(a: Analysis, assetPrice: (v: number) => string): string {
  const lines = [
    `Actif : ${a.company?.name ?? a.symbol} (${a.symbol}), unité ${a.timeframe}`,
    `Prix : ${assetPrice(a.price.current)} (${a.price.change >= 0 ? "+" : ""}${a.price.change.toFixed(2)} % sur la séance)`,
    `Score du profil : ${Math.round(a.profile_score?.total ?? a.score.total)}/100 — tendance lue : ${a.trend}`,
    `Niveaux : support ${assetPrice(a.levels.support)}, résistance ${assetPrice(a.levels.resistance)}`,
    a.risk?.suggested_sl != null
      ? `Plan : stop ${assetPrice(a.risk.suggested_sl)}, objectif ${assetPrice(a.risk.suggested_tp)}, rapport ${a.risk.risk_reward?.toFixed(2)}`
      : "",
    a.indicators?.rsi ? `RSI ${a.indicators.rsi.value.toFixed(1)}` : "",
    a.indicators?.macd ? `MACD histogramme ${a.indicators.macd.histogram.toFixed(4)}` : "",
    a.indicators?.adx ? `ADX ${a.indicators.adx.value.toFixed(1)}` : "",
    a.indicators?.volume_ratio != null ? `Volume ${a.indicators.volume_ratio.toFixed(1)}x la moyenne` : "",
    a.conviction?.bullish_signals?.length
      ? `Signaux haussiers : ${a.conviction.bullish_signals.join(" ; ")}`
      : "",
    a.conviction?.bearish_signals?.length
      ? `Signaux baissiers : ${a.conviction.bearish_signals.join(" ; ")}`
      : "",
    a.historical_edge?.enough_samples && a.historical_edge.expectancy_net_r != null
      ? `Historique : ${a.historical_edge.expectancy_net_r.toFixed(2)} R en moyenne sur ${a.historical_edge.n_trades} trades comparables`
      : "",
    a.trade_window?.label_optimal ? `Durée typique estimée : ${a.trade_window.label_optimal}` : "",
    a.market_context?.benchmark ? `Marché de référence ${a.market_context.benchmark}, régime ${a.market_context.regime}` : "",
  ];
  return lines.filter(Boolean).join("\n");
}

/** Les questions que CETTE analyse soulève, dans l'ordre de ce qui gêne. */
function suggestions(a: Analysis): string[] {
  const out: string[] = [];
  const bull = a.conviction?.bullish_signals?.length ?? 0;
  const bear = a.conviction?.bearish_signals?.length ?? 0;

  if (bull && bear) {
    out.push("Des signaux se contredisent ici — lequel devrais-je écouter ?");
  }
  if (a.historical_edge?.enough_samples && (a.historical_edge.expectancy_net_r ?? 0) < 0) {
    out.push("Pourquoi suivre ce verdict si l'historique ne le soutient pas ?");
  }
  if (a.risk?.suggested_sl != null && a.price?.current) {
    const d = Math.abs((a.price.current - a.risk.suggested_sl) / a.price.current) * 100;
    if (d < 1.5) out.push(`Le stop est à ${d.toFixed(1)} % du prix — n'est-ce pas trop serré ?`);
  }
  if (a.tradeability?.blockers?.length) {
    out.push("Qu'est-ce qui rend ce setup inexploitable en l'état ?");
  }
  out.push("Explique-moi ce verdict comme si je débutais.");
  out.push("Quel serait le principal risque sur cette position ?");
  return out.slice(0, 4);
}

type Msg = { role: "user" | "assistant"; content: string };

export function AskAssistant({
  analysis,
  assetPrice,
}: {
  analysis: Analysis;
  assetPrice: (v: number) => string;
}) {
  const reduce = useReducedMotion();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Le fil repart de zéro quand on change d'actif : garder les réponses
  // portant sur Apple au-dessus d'une analyse de Nvidia serait trompeur.
  useEffect(() => {
    setMessages([]);
    setError("");
  }, [analysis.symbol]);

  useEffect(() => {
    if (messages.length) endRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  }, [messages, reduce]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setError("");
    setDraft("");
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: "user", content: q }]);
    setBusy(true);
    try {
      const r = await aiAPI.analysisChat(q, contextOf(analysis, assetPrice), history);
      setMessages((m) => [...m, { role: "assistant", content: r.response }]);
      setRemaining(r.is_premium || r.remaining < 0 ? null : r.remaining);
    } catch (err) {
      // Trois échecs distincts, trois messages distincts. « Une erreur est
      // survenue » laisserait l'utilisateur réessayer indéfiniment une chose
      // qui ne peut pas marcher.
      const msg = err instanceof Error ? err.message : "";
      setError(
        /not configured|503/i.test(msg)
          ? "L'assistant n'est pas disponible sur ce site pour le moment."
          : /limite|429/i.test(msg)
            ? "Vous avez atteint votre nombre de questions pour aujourd'hui."
            : "La réponse n'est pas arrivée. Réessayez dans un instant."
      );
      setMessages((m) => m.slice(0, -1));
    } finally {
      setBusy(false);
    }
  };

  const hints = suggestions(analysis);

  return (
    <Panel
      repliable="assistant"
      title="Demander à l'assistant"
      hint="Il répond à partir des chiffres de cette analyse, pas de généralités."
      aside={
        remaining != null ? (
          <Text size="caption" as="span">{remaining} question{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""}</Text>
        ) : undefined
      }
    >
      {messages.length === 0 && (
        <div className="space-y-2">
          {/* Nimbo montre les questions que l'écran soulève. */}
          <div className="mb-3 flex items-end gap-3">
            <Nimbo humeur="pointe" taille={56} />
            <Text size="small" as="span">Une question sur cette analyse ? Je réponds à partir de ses chiffres — en voici quelques-unes pour commencer.</Text>
          </div>
          {/* Les questions que l'écran soulève, plutôt qu'un champ vide. */}
          {hints.map((h) => (
            <button
              key={h}
              onClick={() => send(h)}
              disabled={busy}
              className="w-full rounded-[10px] px-3.5 py-2.5 text-left text-[0.88rem] transition-colors hover:bg-[color:var(--cap-surface-2)] disabled:opacity-50"
              style={{ color: "var(--cap-ink-2)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}
            >
              {h}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div className="space-y-4">
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DUR.base, ease: EASE }}
              className={m.role === "user" ? "flex justify-end" : "flex items-start gap-2.5"}
            >
              {m.role !== "user" && <Nimbo humeur="content" taille={30} mini className="mt-1" />}
              <div
                className="max-w-[46rem] rounded-[12px] px-4 py-3"
                style={{
                  backgroundColor: m.role === "user" ? "var(--cap-surface-2)" : "var(--cap-bg)",
                }}
              >
                {/* La réponse est du markdown : l'afficher en texte brut
                    faisait sortir les astérisques, les dièses et les barres
                    des tableaux en caractères littéraux, le tout écrasé en un
                    seul pavé par le HTML. La question de l'utilisateur, elle,
                    reste du texte — avec ses retours à la ligne. */}
                {m.role === "user" ? (
                  <Text size="small" tone="ink" className="whitespace-pre-wrap">
                    {m.content}
                  </Text>
                ) : (
                  <Markdown>{m.content}</Markdown>
                )}
              </div>
            </motion.div>
          ))}
          {busy && (
            <div className="flex items-center gap-2">
              <Nimbo humeur="reflechit" taille={40} />
              <Text size="caption" as="span">L&apos;assistant lit l&apos;analyse…</Text>
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      {error && <Text size="small" tone="down" className="mt-4">{error}</Text>}

      <form
        onSubmit={(e) => { e.preventDefault(); send(draft); }}
        className="mt-5 flex items-center gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Une question sur ${analysis.symbol}…`}
          aria-label="Votre question"
          disabled={busy}
          className="h-11 min-w-0 flex-1 rounded-[12px] px-3.5 text-[0.92rem] outline-none placeholder:text-[color:var(--cap-ink-3)]"
          style={{
            backgroundColor: "var(--cap-bg)",
            color: "var(--cap-ink)",
            boxShadow: "inset 0 0 0 1px var(--cap-line-strong)",
          }}
        />
        <Button type="submit" size="md" disabled={busy || !draft.trim()} aria-label="Envoyer">
          <ArrowUp className="h-4 w-4" />
        </Button>
      </form>
    </Panel>
  );
}
