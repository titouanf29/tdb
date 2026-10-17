"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Send, Trash2 } from "lucide-react";
import { aiAPI, type AILimitStatus, type ChatMessage } from "@/lib/api";
import {
  CaptenMark, Heading, Markdown, Panel, Text, WeatherBackdrop, useAnimationsEnabled,
} from "@/components/design-system";

/**
 * The assistant.
 *
 * A conversation, and nothing arranged around it. The previous screen framed
 * the thread in a card, inside a panel, inside a page, and spent the width on
 * a sidebar of suggestions — which left the messages themselves in a narrow
 * column with the smallest type on the page. A chat is the content, not a
 * widget in a layout.
 *
 * The suggestions stay, but only while the thread is empty. A prompt library
 * is useful when you do not know what to ask and noise once you do.
 */

/** Phrased as questions someone would actually type, not as feature names. */
const STARTERS = [
  "Explique-moi le RSI comme si je débutais.",
  "Pourquoi mon analyse dit HAUSSIER alors que le prix baisse ?",
  "Comment je choisis la taille de ma position ?",
  "Qu'est-ce qu'un bon rapport risque / rendement ?",
];

/**
 * Preserved verbatim from the previous screen: the portfolio sends a position
 * through sessionStorage and expects this exact wording back. Changing the
 * shape here would silently break that hand-off.
 */
function buildPositionMessage(pos: Record<string, unknown>): string {
  const n = (v: unknown) => (typeof v === "number" ? v : Number(v));
  const direction = pos.position_type === "long" ? "LONG" : "SHORT";
  const pnl = pos.unrealized_pnl != null
    ? `${n(pos.unrealized_pnl) >= 0 ? "+" : ""}${n(pos.unrealized_pnl).toFixed(2)} ${pos.currency}`
    : null;
  const pnlPct = pos.pnl_percent != null
    ? `${n(pos.pnl_percent) >= 0 ? "+" : ""}${n(pos.pnl_percent).toFixed(2)}%`
    : null;

  return [
    "Voici ma position en cours, analyse-la et donne-moi tes recommandations précises :",
    "",
    `Actif : ${pos.symbol} (${direction})`,
    `Prix d'entrée : ${pos.entry_price} ${pos.currency}`,
    pos.current_price ? `Prix actuel : ${pos.current_price} ${pos.currency}` : null,
    pnl && pnlPct ? `PnL non réalisé : ${pnl} (${pnlPct})` : null,
    n(pos.leverage) > 1 ? `Levier : x${pos.leverage}` : null,
    pos.quantity ? `Quantité : ${pos.quantity}` : null,
    pos.stop_loss ? `Stop Loss : ${pos.stop_loss} ${pos.currency}` : null,
    pos.take_profit ? `Take Profit : ${pos.take_profit} ${pos.currency}` : null,
    pos.days_held != null ? `Jours détenus : ${pos.days_held}` : null,
    pos.notes ? `Notes : ${pos.notes}` : null,
    "",
    "Est-ce que je dois tenir cette position, ajuster mon SL/TP, ou sortir ?",
  ].filter((l) => l !== null).join("\n");
}

/**
 * Ce qu'on met dans la bulle quand la réponse n'arrive pas.
 *
 * Le serveur renvoie désormais une phrase française complète pour toutes les
 * pannes d'IA. Une phrase se suffit et s'affiche telle quelle. Tout le reste
 * — une erreur réseau brute, un corps de réponse d'un fournisseur — n'est pas
 * une information pour l'utilisateur : il reçoit une phrase, et le détail
 * part dans la console pour qui débogue.
 */
function assistantError(err: unknown): string {
  const raw = err instanceof Error ? err.message.trim() : "";
  if (raw) console.error("[assistant]", raw);

  // Une phrase : commence par une majuscule, finit par une ponctuation, et
  // ne transporte ni accolade ni code de statut.
  const isSentence =
    raw.length > 0 &&
    raw.length < 200 &&
    /^[A-ZÀ-Þ]/.test(raw) &&
    /[.!?]$/.test(raw) &&
    !/[{}<>]|https?:\/\//.test(raw);

  return isSentence ? raw : "Je n'ai pas pu répondre. Réessayez dans un instant.";
}

export default function AssistantPage() {
  const searchParams = useSearchParams();
  const asset = searchParams.get("asset");
  const [animOn] = useAnimationsEnabled();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [limit, setLimit] = useState<AILimitStatus | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // The position hand-off. Read once, on mount, and cleared so a later visit
  // does not resurrect a stale position.
  useEffect(() => {
    if (!asset) return;
    let text = `Analyse ma position sur ${asset} et donne-moi tes recommandations.`;
    try {
      const raw = sessionStorage.getItem("ai_position_context");
      if (raw) {
        const pos = JSON.parse(raw);
        if (pos.symbol === asset) {
          text = buildPositionMessage(pos);
          sessionStorage.removeItem("ai_position_context");
        }
      }
    } catch {
      /* malformed payload — the generic question still works */
    }
    setInput(text);
  }, [asset]);

  useEffect(() => {
    Promise.allSettled([aiAPI.getHistory(20), aiAPI.getLimit()])
      .then(([h, l]) => {
        if (h.status === "fulfilled") setMessages(h.value.messages || []);
        if (l.status === "fulfilled") setLimit(l.value);
      })
      .finally(() => setLoadingHistory(false));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);
    const now = new Date().toISOString();
    setMessages((m) => [...m, { role: "user", content: msg, created_at: now }]);
    try {
      const res = await aiAPI.chat(msg);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: res.response, created_at: new Date().toISOString() },
      ]);
      aiAPI.getLimit().then(setLimit).catch(() => {});
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          /* Le message du serveur est une phrase française complète, il se
             suffit. Le préfixe le recopiait derrière « Je n'ai pas pu
             répondre : », ce qui a donné à l'utilisateur la ligne
             « Je n'ai pas pu répondre : Erreur IA (404): {"error":{...}} »,
             le JSON brut du fournisseur, dans la bulle de l'assistant.
             On ne préfixe donc que ce qui ne se lit pas comme une phrase. */
          content: assistantError(err),
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
      taRef.current?.focus();
    }
  }, [input, sending]);

  const clear = async () => {
    setMessages([]);
    try { await aiAPI.clearHistory(); } catch { /* the view is already empty */ }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Enter sends, Shift+Enter breaks the line. The convention every chat
    // uses, and the one people's fingers already expect.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const blocked = limit ? !limit.can_send : false;

  return (
    <>
      <WeatherBackdrop condition="fair" enabled={animOn} />

      <div className="relative flex min-h-[calc(100vh-11rem)] flex-col space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4 pt-2">
          <div>
            <Heading level={1}>Assistant</Heading>
            <Text className="mt-2.5 max-w-[34rem]">
              Posez une question en français. Il répond à partir de vos données
              et de ce que le moteur a calculé.
            </Text>
          </div>
          <div className="flex items-center gap-3">
            {/* Seulement quand il y a une limite : sans limite (offre fermée, ou
                Premium), le serveur répond -1 et l'écran affichait « -1 / -1 ». */}
            {limit && !limit.is_premium && limit.daily_limit >= 0 && (
              <Text size="caption" as="span">
                {limit.remaining} / {limit.daily_limit} messages aujourd&apos;hui
              </Text>
            )}
            {messages.length > 0 && (
              <button
                onClick={clear}
                className="flex items-center gap-1.5 rounded-[9px] px-3 py-2 text-[0.82rem] transition-colors hover:bg-[color:var(--cap-surface-2)]"
                style={{ color: "var(--cap-ink-3)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Effacer
              </button>
            )}
          </div>
        </header>

        <Panel className="flex-1">
          {loadingHistory ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--cap-ink-4)" }} />
            </div>
          ) : messages.length === 0 ? (
            <div className="py-6">
              <Text size="small">Pour commencer, une de ces questions :</Text>
              <ul className="mt-4 space-y-2">
                {STARTERS.map((s) => (
                  <li key={s}>
                    <button
                      onClick={() => send(s)}
                      className="w-full rounded-[10px] px-3.5 py-3 text-left text-[0.9rem] transition-colors hover:bg-[color:var(--cap-surface-2)]"
                      style={{ color: "var(--cap-ink)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m, i) => (
                <Message key={`${m.created_at}-${i}`} message={m} />
              ))}
              {sending && (
                <div className="flex items-center gap-2.5">
                  <CaptenMark size={18} />
                  <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "var(--cap-ink-4)" }} />
                  <Text size="caption" as="span">Réflexion…</Text>
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </Panel>

        <div
          className="sticky bottom-24 flex items-end gap-2 p-2 lg:bottom-4"
          style={{
            borderRadius: "var(--cap-r-lg)",
            backgroundColor: "var(--cap-surface)",
            boxShadow: "inset 0 0 0 1px var(--cap-line), var(--cap-shadow)",
          }}
        >
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            disabled={blocked}
            placeholder={blocked ? "Limite quotidienne atteinte" : "Votre question…"}
            aria-label="Votre question"
            className="max-h-40 min-h-[2.75rem] flex-1 resize-none bg-transparent px-3 py-3 text-[0.95rem] outline-none placeholder:text-[color:var(--cap-ink-4)] disabled:opacity-60"
            style={{ color: "var(--cap-ink)" }}
          />
          <button
            onClick={() => send()}
            disabled={sending || blocked || !input.trim()}
            aria-label="Envoyer"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] transition-opacity hover:opacity-90 disabled:opacity-30"
            style={{ backgroundColor: "var(--cap-navy)", color: "#F2F5F7" }}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}

function Message({ message: m }: { message: ChatMessage }) {
  const isUser = m.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[85%] whitespace-pre-wrap px-4 py-3 text-[0.92rem] leading-[1.55]"
          style={{
            borderRadius: "var(--cap-r-lg)",
            backgroundColor: "var(--cap-surface-2)",
            color: "var(--cap-ink)",
          }}
        >
          {m.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <CaptenMark size={18} className="mt-1 shrink-0" />
      {/* The answer gets the full measure and no bubble: it is the part worth
          reading, and a tinted box around prose only makes it harder. */}
      {/* Le markdown était rendu ici, mais sans aucun style de tableau ni de
          titre : un tableau de niveaux arrivait en mots collés, un ### en
          paragraphe comme les autres. Les deux écrans partagent désormais le
          même rendu. */}
      <Markdown className="min-w-0 flex-1 text-[0.92rem] leading-[1.65]">
        {m.content}
      </Markdown>
    </div>
  );
}
