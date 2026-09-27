"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, Loader2, Reply, Send, Trash2, X } from "lucide-react";
import { communityAPI, type CommunityMessage } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { usePremium } from "@/lib/PremiumContext";
import {
  Button, EmptyState, Field, FormError, Heading, Modal, Panel, Text,
  TextInput, WeatherBackdrop, useAnimationsEnabled,
} from "@/components/design-system";

/**
 * The community room.
 *
 * One thread, newest at the bottom, the way every chat anyone has used
 * behaves. The previous screen wrapped it in tabs, a sidebar of online
 * members and a support-ticket panel, which meant the conversation — the only
 * reason to be here — occupied about a third of the page.
 *
 * Contacting the team stays available, but as a dialog rather than a
 * permanent column: it is something you do once, not something you read.
 */

const POLL_MS = 20_000;

export default function CommunityPage() {
  const { user } = useAuth();
  const { isAdmin } = usePremium();
  const [animOn] = useAnimationsEnabled();

  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [online, setOnline] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<CommunityMessage | null>(null);
  const [sending, setSending] = useState(false);

  const [contactOpen, setContactOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);

  const load = useCallback(async () => {
    const [m, o] = await Promise.allSettled([
      communityAPI.getMessages(50),
      communityAPI.getOnlineCount(),
    ]);
    if (m.status === "fulfilled") setMessages(m.value.messages || []);
    if (o.status === "fulfilled") setOnline(o.value.online_count);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
    const iv = setInterval(load, POLL_MS);
    return () => clearInterval(iv);
  }, [load]);

  // Only follow the thread when the reader is already at the bottom. Yanking
  // someone back down while they are reading older messages is the single
  // most irritating thing a chat can do.
  useEffect(() => {
    if (atBottom.current) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await communityAPI.sendMessage(text, replyTo?.id);
      setInput("");
      setReplyTo(null);
      atBottom.current = true;
      await load();
    } catch {
      /* the message stays in the box so nothing is lost */
    } finally {
      setSending(false);
    }
  };

  const like = async (m: CommunityMessage) => {
    // Optimistic: a like that waits on the network feels broken.
    setMessages((list) =>
      list.map((x) =>
        x.id === m.id
          ? { ...x, user_liked: !x.user_liked, likes: x.likes + (x.user_liked ? -1 : 1) }
          : x
      )
    );
    try { await communityAPI.likeMessage(m.id); } catch { await load(); }
  };

  const remove = async (m: CommunityMessage) => {
    const before = messages;
    setMessages((l) => l.filter((x) => x.id !== m.id));
    try { await communityAPI.deleteMessage(m.id); } catch { setMessages(before); }
  };

  const contact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return setError("Sujet et message sont requis.");
    setBusy(true);
    setError("");
    try {
      await communityAPI.contactAdmin(subject.trim(), body.trim());
      setSent(true);
      setSubject("");
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <WeatherBackdrop condition="fair" enabled={animOn} />

      <div className="relative flex min-h-[calc(100vh-11rem)] flex-col space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4 pt-2">
          <div>
            <Heading level={1}>Communauté</Heading>
            <Text className="mt-2.5 max-w-[34rem]">
              {online != null
                ? `${online} membre${online > 1 ? "s" : ""} en ligne. `
                : ""}
              Les analyses partagées ici sont des avis, pas des conseils.
            </Text>
          </div>
          <Button
            variant="secondary"
            size="md"
            onClick={() => { setContactOpen(true); setSent(false); setError(""); }}
          >
            Contacter l&apos;équipe
          </Button>
        </header>

        <Panel
          className="flex-1"
          // The reader's position decides whether new messages scroll into
          // view, so the panel has to know where they are.
        >
          <div
            className="max-h-[58vh] overflow-y-auto"
            onScroll={(e) => {
              const el = e.currentTarget;
              atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            }}
          >
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--cap-ink-4)" }} />
              </div>
            ) : messages.length === 0 ? (
              <EmptyState
                title="Personne n'a encore écrit"
                description="Posez une question, partagez une analyse, ou dites simplement bonjour."
              />
            ) : (
              <ul className="space-y-5">
                {messages.map((m) => (
                  <MessageRow
                    key={m.id}
                    message={m}
                    replyTarget={messages.find((x) => x.id === m.reply_to)}
                    mine={m.user_id === Number(user?.id)}
                    canDelete={isAdmin || m.user_id === Number(user?.id)}
                    onLike={() => like(m)}
                    onReply={() => setReplyTo(m)}
                    onDelete={() => remove(m)}
                  />
                ))}
                <div ref={endRef} />
              </ul>
            )}
          </div>
        </Panel>

        <div
          className="sticky bottom-24 p-2 lg:bottom-4"
          style={{
            borderRadius: "var(--cap-r-lg)",
            backgroundColor: "var(--cap-surface)",
            boxShadow: "inset 0 0 0 1px var(--cap-line), var(--cap-shadow)",
          }}
        >
          {replyTo && (
            <div
              className="mb-1 flex items-center justify-between gap-3 rounded-[10px] px-3 py-2"
              style={{ backgroundColor: "var(--cap-surface-2)" }}
            >
              <Text size="caption" as="span" className="truncate">
                En réponse à <strong style={{ color: "var(--cap-ink)" }}>{replyTo.username}</strong> :{" "}
                {replyTo.content.slice(0, 60)}
              </Text>
              <button
                onClick={() => setReplyTo(null)}
                aria-label="Annuler la réponse"
                className="shrink-0 rounded-[7px] p-1"
                style={{ color: "var(--cap-ink-3)" }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <form onSubmit={send} className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); }
              }}
              rows={1}
              placeholder="Votre message…"
              aria-label="Votre message"
              className="max-h-32 min-h-[2.75rem] flex-1 resize-none bg-transparent px-3 py-3 text-[0.95rem] outline-none placeholder:text-[color:var(--cap-ink-4)]"
              style={{ color: "var(--cap-ink)" }}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Envoyer"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] transition-opacity hover:opacity-90 disabled:opacity-30"
              style={{ backgroundColor: "var(--cap-navy)", color: "#F2F5F7" }}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      <Modal open={contactOpen} onClose={() => setContactOpen(false)} title="Contacter l'équipe">
        <Heading level={3}>Contacter l&apos;équipe</Heading>
        {sent ? (
          <>
            <Text size="small" className="mt-2">
              Message envoyé. Vous recevrez une réponse dans votre espace.
            </Text>
            <div className="mt-6">
              <Button size="md" onClick={() => setContactOpen(false)}>Fermer</Button>
            </div>
          </>
        ) : (
          <form onSubmit={contact} className="mt-6 space-y-4" noValidate>
            {error && <FormError>{error}</FormError>}
            <Field label="Sujet" htmlFor="c-subject">
              <TextInput id="c-subject" value={subject} onChange={setSubject} placeholder="Un bug, une question…" required />
            </Field>
            <Field label="Message" htmlFor="c-body">
              <textarea
                id="c-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                className="w-full resize-y rounded-[12px] px-3.5 py-3 text-[0.95rem] outline-none placeholder:text-[color:var(--cap-ink-3)]"
                style={{
                  backgroundColor: "var(--cap-bg)",
                  color: "var(--cap-ink)",
                  boxShadow: "inset 0 0 0 1px var(--cap-line-strong)",
                }}
                placeholder="Décrivez ce qui se passe…"
                required
              />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" size="md" disabled={busy} className="flex-1">
                {busy ? "Envoi…" : "Envoyer"}
              </Button>
              <Button variant="secondary" size="md" onClick={() => setContactOpen(false)}>
                Annuler
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

function MessageRow({
  message: m,
  replyTarget,
  mine,
  canDelete,
  onLike,
  onReply,
  onDelete,
}: {
  message: CommunityMessage;
  replyTarget?: CommunityMessage;
  mine: boolean;
  canDelete: boolean;
  onLike: () => void;
  onReply: () => void;
  onDelete: () => void;
}) {
  const time = new Date(m.created_at).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <li className="group">
      <div className="flex items-baseline gap-2.5">
        <span
          className="text-[0.9rem] font-semibold"
          style={{ color: mine ? "var(--cap-ocean)" : "var(--cap-ink)" }}
        >
          {m.username}
        </span>
        {m.is_admin && (
          <span
            className="rounded-[5px] px-1.5 py-0.5 text-[0.75rem]"
            style={{ backgroundColor: "var(--cap-navy)", color: "#E8EDF1" }}
          >
            Équipe
          </span>
        )}
        <span className="cap-num text-[0.75rem]" style={{ color: "var(--cap-ink-3)" }}>
          {time}
        </span>
      </div>

      {replyTarget && (
        <div
          className="mt-1.5 border-l-2 pl-2.5"
          style={{ borderColor: "var(--cap-line-strong)" }}
        >
          <Text size="caption" as="span" className="line-clamp-2">
            {replyTarget.username} : {replyTarget.content}
          </Text>
        </div>
      )}

      <Text size="small" tone="ink" className="mt-1 whitespace-pre-wrap">
        {m.content}
      </Text>

      <div className="mt-1.5 flex items-center gap-1">
        <button
          onClick={onLike}
          aria-label={m.user_liked ? "Retirer le j'aime" : "J'aime"}
          className="flex items-center gap-1.5 rounded-[7px] px-2 py-1 text-[0.75rem] transition-colors hover:bg-[color:var(--cap-surface-2)]"
          style={{ color: m.user_liked ? "var(--cap-ocean)" : "var(--cap-ink-4)" }}
        >
          <Heart className="h-3.5 w-3.5" fill={m.user_liked ? "currentColor" : "none"} />
          {m.likes > 0 && m.likes}
        </button>
        <button
          onClick={onReply}
          aria-label="Répondre"
          className="rounded-[7px] px-2 py-1 transition-colors hover:bg-[color:var(--cap-surface-2)] lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
          style={{ color: "var(--cap-ink-4)" }}
        >
          <Reply className="h-3.5 w-3.5" />
        </button>
        {canDelete && (
          <button
            onClick={onDelete}
            aria-label="Supprimer"
            className="rounded-[7px] px-2 py-1 transition-colors hover:bg-[color:var(--cap-surface-2)] lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
            style={{ color: "var(--cap-ink-4)" }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </li>
  );
}
