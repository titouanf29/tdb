"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Flag, Heart, Loader2, Reply, Send, Trash2, X } from "lucide-react";
import { communityAPI, type CommunityMessage, type DefiSemaine } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { usePremium } from "@/lib/PremiumContext";
import {
  Button, EmptyState, Field, FormError, Heading, Modal, Nimbo, Panel, Text,
  TextInput, WeatherBackdrop, useAnimationsEnabled,
} from "@/components/design-system";

/**
 * La Communauté.
 *
 * Un fil, le plus récent en bas, comme toute discussion. Il ne contenait que
 * les messages des membres : vide, il affichait « Personne n'a encore écrit »
 * et faisait fuir. Il porte maintenant aussi :
 *
 *   · la note du jour de Nimbo, chaque matin de semaine (ce qui a bougé, les
 *     annonces du jour), écrite par des règles à partir des vrais chiffres ;
 *   · les mots de l'équipe (nouveautés, annonces) ;
 *   · les analyses partagées depuis la page d'un actif.
 *
 * À côté, le défi de la semaine et son classement, sur la discipline et
 * jamais sur les gains. Répondre à un message ou l'aimer prévient son auteur ;
 * chaque message peut être signalé à l'équipe.
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
  const [sendError, setSendError] = useState("");
  const [defi, setDefi] = useState<DefiSemaine | null>(null);

  const [contactOpen, setContactOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [sentTicket, setSentTicket] = useState<number | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);

  const load = useCallback(async () => {
    const [m, o] = await Promise.allSettled([communityAPI.getMessages(50), communityAPI.getOnlineCount()]);
    if (m.status === "fulfilled") setMessages(m.value.messages || []);
    if (o.status === "fulfilled") setOnline(o.value.online_count);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
    communityAPI.defi().then(setDefi).catch(() => {});
    const iv = setInterval(load, POLL_MS);
    return () => clearInterval(iv);
  }, [load]);

  // Ne suivre le fil que si l'on est déjà en bas : ramener quelqu'un en bas
  // pendant qu'il relit plus haut est ce qu'un fil fait de plus agaçant.
  useEffect(() => {
    if (atBottom.current) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError("");
    try {
      await communityAPI.sendMessage(text, replyTo?.id);
      setInput("");
      setReplyTo(null);
      atBottom.current = true;
      await load();
    } catch (err) {
      // Le message reste dans la case : rien n'est perdu, et on dit pourquoi.
      setSendError(err instanceof Error ? err.message : "Envoi impossible. Réessayez dans un instant.");
    } finally {
      setSending(false);
    }
  };

  const like = async (m: CommunityMessage) => {
    setMessages((list) => list.map((x) =>
      x.id === m.id ? { ...x, user_liked: !x.user_liked, likes: x.likes + (x.user_liked ? -1 : 1) } : x));
    try { await communityAPI.likeMessage(m.id); } catch { await load(); }
  };

  const remove = async (m: CommunityMessage) => {
    const before = messages;
    setMessages((l) => l.filter((x) => x.id !== m.id));
    try { await communityAPI.deleteMessage(m.id); } catch { setMessages(before); }
  };

  const signaler = async (m: CommunityMessage) => {
    setMessages((l) => l.map((x) => (x.id === m.id ? { ...x, signale_par_moi: true } : x)));
    try {
      const r = await communityAPI.signaler(m.id);
      if (r.masque) setMessages((l) => l.filter((x) => x.id !== m.id));
    } catch { await load(); }
  };

  const contact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return setError("Sujet et message sont requis.");
    setBusy(true);
    setError("");
    try {
      const r = await communityAPI.contactAdmin(subject.trim(), body.trim());
      setSentTicket(r.ticket_id ?? null);
      setSent(true);
      setSubject("");
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  };

  const moi = Number(user?.id);

  return (
    <>
      <WeatherBackdrop condition="fair" enabled={animOn} />

      <div className="relative space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4 pt-2">
          <div>
            <Heading level={1}>Communauté</Heading>
            <Text className="mt-2.5 max-w-[36rem]">
              {online != null ? `${online} membre${online > 1 ? "s" : ""} en ligne. ` : ""}
              Les analyses partagées ici sont des avis, pas des conseils.
            </Text>
          </div>
          <Button variant="secondary" size="md" onClick={() => { setContactOpen(true); setSent(false); setError(""); }}>
            Contacter l&apos;équipe
          </Button>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:items-start">
          <div className="order-2 flex min-w-0 flex-col gap-3 lg:order-1">
            <Panel>
              <div
                className="max-h-[62vh] overflow-y-auto pr-1"
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
                    title="Le fil démarre"
                    description="Chaque matin de semaine, Nimbo y publie la note du jour. Posez une question, ou partagez une analyse depuis la page d'un actif."
                  />
                ) : (
                  <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
                    {messages.map((m) => (
                      <Publication
                        key={m.id}
                        m={m}
                        parent={messages.find((x) => x.id === m.reply_to)}
                        mine={m.user_id === moi}
                        canDelete={isAdmin || m.user_id === moi}
                        onLike={() => like(m)}
                        onReply={() => setReplyTo(m)}
                        onDelete={() => remove(m)}
                        onReport={() => signaler(m)}
                      />
                    ))}
                    <div ref={endRef} />
                  </ul>
                )}
              </div>
            </Panel>

            <div
              className="sticky bottom-24 z-10 p-2 lg:bottom-4"
              style={{ borderRadius: "var(--cap-r-lg)", backgroundColor: "var(--cap-surface)", boxShadow: "inset 0 0 0 1px var(--cap-line), var(--cap-shadow)" }}
            >
              {sendError && <div className="mb-1.5"><FormError>{sendError}</FormError></div>}
              {replyTo && (
                <div className="mb-1 flex items-center justify-between gap-3 rounded-[10px] px-3 py-2" style={{ backgroundColor: "var(--cap-surface-2)" }}>
                  <Text size="caption" as="span" className="truncate">
                    En réponse à <strong style={{ color: "var(--cap-ink)" }}>{auteur(replyTo)}</strong> : {replyTo.content.slice(0, 60)}
                  </Text>
                  <button onClick={() => setReplyTo(null)} aria-label="Annuler la réponse" className="shrink-0 rounded-[7px] p-1" style={{ color: "var(--cap-ink-3)" }}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <form onSubmit={send} className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => { setInput(e.target.value); if (sendError) setSendError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(e); } }}
                  rows={1}
                  maxLength={1000}
                  placeholder={replyTo ? "Votre réponse…" : "Une question, un avis, un bonjour…"}
                  aria-label="Votre message"
                  className="max-h-32 min-h-[2.75rem] flex-1 resize-none bg-transparent px-3 py-3 text-[0.95rem] outline-none placeholder:text-[color:var(--cap-ink-4)]"
                  style={{ color: "var(--cap-ink)" }}
                />
                <button type="submit" disabled={sending || !input.trim()} aria-label="Envoyer"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] transition-opacity hover:opacity-90 disabled:opacity-30"
                  style={{ backgroundColor: "var(--cap-navy)", color: "#F2F5F7" }}>
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>

          <div className="order-1 lg:order-2 lg:sticky lg:top-24">
            {defi && <DefiPanel d={defi} onChange={setDefi} />}
          </div>
        </div>
      </div>

      <Modal open={contactOpen} onClose={() => setContactOpen(false)} title="Contacter l'équipe">
        <Heading level={3} as="h2">Contacter l&apos;équipe</Heading>
        {sent ? (
          <>
            <Text size="small" className="mt-2">
              Message envoyé. La réponse de l&apos;équipe s&apos;affichera dans « Mes demandes », et une
              notification vous préviendra.
            </Text>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button size="md" href={sentTicket ? `/support?ticket=${sentTicket}` : "/support"}>Voir la conversation</Button>
              <Button variant="secondary" size="md" onClick={() => setContactOpen(false)}>Fermer</Button>
            </div>
          </>
        ) : (
          <form onSubmit={contact} className="mt-6 space-y-4" noValidate>
            {error && <FormError>{error}</FormError>}
            <Field label="Sujet" htmlFor="c-subject">
              <TextInput id="c-subject" value={subject} onChange={setSubject} placeholder="Un bug, une question…" required />
            </Field>
            <Field label="Message" htmlFor="c-body">
              <textarea id="c-body" value={body} onChange={(e) => setBody(e.target.value)} rows={5}
                className="w-full resize-y rounded-[12px] px-3.5 py-3 text-[0.95rem] outline-none placeholder:text-[color:var(--cap-ink-3)]"
                style={{ backgroundColor: "var(--cap-bg)", color: "var(--cap-ink)", boxShadow: "inset 0 0 0 1px var(--cap-line-strong)" }}
                placeholder="Décrivez ce qui se passe…" required />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" size="md" disabled={busy} className="flex-1">{busy ? "Envoi…" : "Envoyer"}</Button>
              <Button variant="secondary" size="md" onClick={() => setContactOpen(false)}>Annuler</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

function auteur(m: CommunityMessage) {
  return m.genre === "note" ? "Nimbo" : m.username || "Un membre";
}

function heure(iso: string) {
  const d = new Date(iso);
  const auj = new Date().toDateString() === d.toDateString();
  return auj
    ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) + ", " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

const pct = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
const ton = (v: number) => (v > 0 ? "var(--cap-up)" : v < 0 ? "var(--cap-down)" : "var(--cap-ink-3)");

/* ── Une publication du fil ──────────────────────────────────────────── */

function Publication({ m, parent, mine, canDelete, onLike, onReply, onDelete, onReport }: {
  m: CommunityMessage; parent?: CommunityMessage; mine: boolean; canDelete: boolean;
  onLike: () => void; onReply: () => void; onDelete: () => void; onReport: () => void;
}) {
  const [confirme, setConfirme] = useState(false);
  const d = m.donnees || {};

  return (
    <li className="group py-4">
      <div className="flex items-center gap-2.5">
        {m.genre === "note" && <Nimbo humeur="content" taille={30} label="" className="-my-1 shrink-0" />}
        <span className="text-[0.9rem] font-semibold" style={{ color: mine ? "var(--cap-ocean)" : "var(--cap-ink)" }}>{auteur(m)}</span>
        {(m.is_admin || m.genre === "equipe") && m.genre !== "note" && (
          <span className="rounded-[5px] px-1.5 py-0.5 text-[0.72rem]" style={{ backgroundColor: "var(--cap-navy)", color: "#E8EDF1" }}>Équipe</span>
        )}
        {m.genre === "partage" && <span className="text-[0.82rem]" style={{ color: "var(--cap-ink-3)" }}>a partagé une analyse</span>}
        <span className="cap-num text-[0.75rem]" style={{ color: "var(--cap-ink-3)" }}>{heure(m.created_at)}</span>
      </div>

      {parent && (
        <div className="mt-1.5 border-l-2 pl-2.5" style={{ borderColor: "var(--cap-line-strong)" }}>
          <Text size="caption" as="span" className="line-clamp-2">{auteur(parent)} : {parent.content}</Text>
        </div>
      )}

      {m.genre === "note" && (
        <p className="mt-2 text-[0.92rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>
          {d.titre || "La note du jour"}
        </p>
      )}
      {m.genre === "equipe" && d.titre && (
        <p className="mt-1.5 text-[1rem] font-semibold" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>{d.titre}</p>
      )}

      {m.genre === "partage" && d.symbol && (
        <Link href={`/analysis?symbol=${encodeURIComponent(d.symbol)}`}
          className="mt-2 flex items-center justify-between gap-4 rounded-[12px] px-4 py-3 transition-colors hover:bg-[color:var(--cap-surface-2)]"
          style={{ boxShadow: "inset 0 0 0 1px var(--cap-line-strong)" }}>
          <span className="min-w-0">
            <span className="block text-[1rem] font-semibold" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
              {d.nom} <span className="text-[0.8rem] font-normal" style={{ color: "var(--cap-ink-3)" }}>{d.symbol}</span>
            </span>
            {d.verdict && <span className="block text-[0.88rem]" style={{ color: "var(--cap-ink-2)" }}>{d.verdict}</span>}
          </span>
          <span className="flex shrink-0 items-center gap-3">
            {d.score != null && <span className="cap-num text-[1.15rem]" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>{d.score}<span className="text-[0.75rem]" style={{ color: "var(--cap-ink-3)" }}> / 100</span></span>}
            <ArrowRight className="h-4 w-4" style={{ color: "var(--cap-ink-4)" }} aria-label="Voir l'analyse" />
          </span>
        </Link>
      )}

      {m.content && (
        <Text size="small" tone="ink" className="mt-1.5 whitespace-pre-wrap">{m.content}</Text>
      )}

      {m.genre === "note" && (d.marches?.length ?? 0) > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.82rem]">
          {d.marches!.map((x) => (
            <span key={x.nom} style={{ color: "var(--cap-ink-2)" }}>
              {x.nom.replace(/^(le |la |l'|les )/, "").replace(/^./, (c) => c.toUpperCase())}{" "}
              <span className="cap-num" style={{ color: ton(x.variation) }}>{pct(x.variation)}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-1.5 flex items-center gap-1">
        <button onClick={onLike} aria-label={m.user_liked ? "Retirer le j'aime" : "J'aime"}
          className="flex min-h-[32px] items-center gap-1.5 rounded-[7px] px-2 py-1 text-[0.75rem] transition-colors hover:bg-[color:var(--cap-surface-2)]"
          style={{ color: m.user_liked ? "var(--cap-ocean)" : "var(--cap-ink-4)" }}>
          <Heart className="h-3.5 w-3.5" fill={m.user_liked ? "currentColor" : "none"} />
          {m.likes > 0 && m.likes}
        </button>
        <button onClick={onReply} aria-label="Répondre"
          className="flex min-h-[32px] items-center gap-1.5 rounded-[7px] px-2 py-1 text-[0.75rem] transition-colors hover:bg-[color:var(--cap-surface-2)]"
          style={{ color: "var(--cap-ink-4)" }}>
          <Reply className="h-3.5 w-3.5" /> <span className="sr-only sm:not-sr-only">Répondre</span>
        </button>
        {canDelete && (
          <button onClick={onDelete} aria-label="Supprimer"
            className="rounded-[7px] px-2 py-1 transition-colors hover:bg-[color:var(--cap-surface-2)] lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
            style={{ color: "var(--cap-ink-4)" }}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        {!mine && m.genre !== "note" && (
          m.signale_par_moi ? (
            <span className="px-2 text-[0.75rem]" style={{ color: "var(--cap-ink-3)" }}>Signalé à l&apos;équipe</span>
          ) : confirme ? (
            <span className="flex items-center gap-2 px-1 text-[0.78rem]" style={{ color: "var(--cap-ink-2)" }}>
              Signaler à l&apos;équipe ?
              <button className="cap-lien" onClick={() => { setConfirme(false); onReport(); }}>Signaler</button>
              <button className="cap-lien" onClick={() => setConfirme(false)}>Annuler</button>
            </span>
          ) : (
            <button onClick={() => setConfirme(true)} aria-label="Signaler ce message"
              className="rounded-[7px] px-2 py-1 transition-colors hover:bg-[color:var(--cap-surface-2)] lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
              style={{ color: "var(--cap-ink-4)" }}>
              <Flag className="h-3.5 w-3.5" />
            </button>
          )
        )}
      </div>
    </li>
  );
}

/* ── Le défi de la semaine ───────────────────────────────────────────── */

function DefiPanel({ d, onChange }: { d: DefiSemaine; onChange: (d: DefiSemaine) => void }) {
  const [occupe, setOccupe] = useState(false);
  const basculer = async () => {
    setOccupe(true);
    try { onChange(await communityAPI.participerAuDefi()); } finally { setOccupe(false); }
  };
  const pctBarre = Math.round((d.ma_progression / d.defi.cible) * 100);
  const fin = new Date(d.fin + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <section aria-labelledby="defi-titre" className="relative z-10 rounded-[16px] px-5 py-5"
      style={{ backgroundColor: "var(--cap-surface)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}>
      <p className="flex items-center gap-2 text-[0.95rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>
        <span aria-hidden className="h-[2px] w-5 rounded-full" style={{ backgroundColor: "var(--cap-ambre)" }} />
        Le défi de la semaine
      </p>
      <h2 id="defi-titre" className="mt-2 text-[1.3rem] font-semibold leading-snug" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
        {d.defi.titre}
      </h2>
      <p className="mt-1 text-[0.92rem]" style={{ color: "var(--cap-ink-2)" }}>{d.defi.texte}</p>

      <div className="mt-4 flex items-center gap-3">
        <span className="relative h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "var(--cap-line)" }}
          role="progressbar" aria-valuenow={d.ma_progression} aria-valuemin={0} aria-valuemax={d.defi.cible}
          aria-label={`${d.ma_progression} sur ${d.defi.cible} ${d.defi.unite}`}>
          <span className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
            style={{ width: `${pctBarre}%`, backgroundColor: d.reussi ? "var(--cap-up)" : "var(--cap-ocean)" }} />
        </span>
        <span className="cap-num shrink-0 text-[0.88rem]" style={{ color: "var(--cap-ink)" }}>
          {d.reussi ? "Réussi" : `${d.ma_progression} sur ${d.defi.cible} ${d.defi.unite}`}
        </span>
      </div>
      <p className="mt-2 text-[0.8rem]" style={{ color: "var(--cap-ink-3)" }}>Jusqu&apos;au {fin}.</p>

      <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--cap-line)" }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[0.95rem] font-semibold" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>Le classement</p>
          <span className="text-[0.8rem]" style={{ color: "var(--cap-ink-3)" }}>
            {d.participants} participant{d.participants > 1 ? "s" : ""}
          </span>
        </div>
        {d.classement.length > 0 ? (
          <ol className="mt-2">
            {d.classement.map((c, i) => (
              <li key={i} className="flex items-center gap-3 py-1.5 text-[0.9rem]"
                style={{ color: c.moi ? "var(--cap-ocean)" : "var(--cap-ink)", fontWeight: c.moi ? 600 : 400 }}>
                <span className="cap-num w-5 shrink-0 text-right italic" style={{ color: "var(--cap-amber-ink)", fontFamily: "var(--cap-font-display)" }}>{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{c.pseudo}{c.moi ? " (vous)" : ""}</span>
                <span className="cap-num shrink-0 text-[0.85rem]" style={{ color: "var(--cap-ink-2)" }}>{c.progression} / {d.defi.cible}</span>
                {c.reussi ? <Check className="h-4 w-4 shrink-0" style={{ color: "var(--cap-up)" }} aria-label="réussi" /> : <span className="w-4 shrink-0" />}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-[0.85rem]" style={{ color: "var(--cap-ink-3)" }}>Personne n&apos;y participe encore cette semaine : soyez le premier.</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button size="sm" variant={d.participe ? "secondary" : "primary"} onClick={basculer} disabled={occupe}>
            {d.participe ? "Quitter le classement" : "Participer au classement"}
          </Button>
        </div>
        <p className="mt-2 text-[0.78rem] leading-snug" style={{ color: "var(--cap-ink-3)" }}>
          Le classement porte sur la discipline, jamais sur les gains. Seul votre pseudo apparaît.
        </p>
      </div>
    </section>
  );
}
