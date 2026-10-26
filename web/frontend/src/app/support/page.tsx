"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  communityAPI, marketAPI, type AssetRequest, type SupportTicket, type TicketMessage,
} from "@/lib/api";
import {
  Button, EmptyState, Field, FormError, Heading, Panel, Text, TextInput,
} from "@/components/design-system";

/**
 * Mes demandes : les échanges avec l'équipe.
 *
 * Le formulaire « Contacter l'équipe » envoyait bien le message, et l'équipe
 * répondait, mais aucun écran ne montrait la réponse : la notification menait
 * à /support, qui n'existait pas. La conversation est ici, dans l'ordre, avec
 * de quoi répondre et de quoi ouvrir une nouvelle demande.
 */

function quand(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).replace(":", " h ");
}

const zone = {
  backgroundColor: "var(--cap-bg)",
  color: "var(--cap-ink)",
  boxShadow: "inset 0 0 0 1px var(--cap-line-strong)",
} as const;

const ETAPE: Record<string, string> = {
  pending: "Reçue, l'équipe va l'étudier",
  info_requested: "L'équipe vous pose une question",
  accepted: "Acceptée, en cours d'ajout",
  added: "Ajoutée au site",
  approved: "Ajoutée au site",
  rejected: "Non retenue",
};

/** Demander un actif absent, et suivre où en est chaque demande. */
function ActifsDemandes({ initial }: { initial: string }) {
  const [liste, setListe] = useState<AssetRequest[] | null>(null);
  const [nom, setNom] = useState(initial);
  const [pourquoi, setPourquoi] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  const [envoye, setEnvoye] = useState(false);

  const charger = useCallback(async () => {
    try { setListe((await marketAPI.getMyAssetRequests()).requests || []); } catch { setListe([]); }
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;
    setOccupe(true); setErreur(""); setEnvoye(false);
    try {
      await marketAPI.requestAsset({ symbol: nom.trim(), asset_name: nom.trim(), reason: pourquoi.trim() || undefined });
      setNom(""); setPourquoi(""); setEnvoye(true);
      await charger();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Envoi impossible.");
    } finally { setOccupe(false); }
  };

  return (
    <Panel
      title="Demander un actif"
      hint="Une action, une crypto, un indice absent du site : donnez son nom ou son symbole, l'équipe l'ajoute et vous prévient."
    >
      <form onSubmit={envoyer} className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-start" noValidate>
        <Field label="Nom ou symbole" htmlFor="a-nom" hint="Ex. Soitec, ou SOI.PA">
          <TextInput id="a-nom" value={nom} onChange={setNom} placeholder="Soitec" required />
        </Field>
        <Field label="Pourquoi (facultatif)" htmlFor="a-pq">
          <TextInput id="a-pq" value={pourquoi} onChange={setPourquoi} placeholder="Je le suis depuis longtemps…" />
        </Field>
        <div className="sm:pt-[1.85rem]"><Button type="submit" size="md" disabled={occupe || !nom.trim()}>{occupe ? "Envoi…" : "Demander"}</Button></div>
      </form>
      {erreur && <div className="mt-3"><FormError>{erreur}</FormError></div>}
      {envoye && <Text size="small" tone="up" className="mt-3">Demande envoyée. Vous serez prévenu dès que l&apos;actif est ajouté.</Text>}

      {liste && liste.length > 0 && (
        <ul className="mt-6 border-t pt-2 [&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]" style={{ borderColor: "var(--cap-line)" }}>
          {liste.map((r) => {
            const ajoute = r.status === "added" || r.status === "approved";
            const sym = r.symbole_final || r.symbol;
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                <div className="min-w-0">
                  <span className="text-[0.95rem] font-semibold" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
                    {r.asset_name || r.symbol}
                  </span>
                  <span className="ml-2 text-[0.85rem]" style={{ color: "var(--cap-ink-2)" }}>
                    {ETAPE[r.status] ?? r.status}
                    {r.status === "rejected" && r.admin_notes ? ` : ${r.admin_notes}` : ""}
                  </span>
                </div>
                {ajoute ? (
                  <Button href={`/analysis?symbol=${encodeURIComponent(sym)}`} variant="secondary" size="sm">Analyser {sym}</Button>
                ) : r.ticket_id ? (
                  <Button href={`/support?ticket=${r.ticket_id}`} variant="secondary" size="sm">Répondre à l&apos;équipe</Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function Support() {
  const router = useRouter();
  const params = useSearchParams();
  const choisi = Number(params.get("ticket")) || null;
  const actifDemande = params.get("actif") || "";

  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [fil, setFil] = useState<{ ticket: SupportTicket; messages: TicketMessage[] } | null>(null);
  const [reponse, setReponse] = useState("");
  // `?nouveau=1` ouvre directement le formulaire : c'est là que la visite
  // « Contacter le support » et l'avis de l'accueil mènent.
  const [nouveau, setNouveau] = useState(params.get("nouveau") === "1");
  const [sujet, setSujet] = useState("");
  const [corps, setCorps] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  const fin = useRef<HTMLDivElement | null>(null);

  const chargerListe = useCallback(async () => {
    try { setTickets((await communityAPI.getMyTickets()).tickets || []); }
    catch { setTickets([]); }
  }, []);

  const chargerFil = useCallback(async (id: number) => {
    try { setFil(await communityAPI.getTicketMessages(id)); }
    catch (e) { setFil(null); setErreur(e instanceof Error ? e.message : "Conversation introuvable."); }
  }, []);

  useEffect(() => { chargerListe(); }, [chargerListe]);

  // Sans ticket dans l'adresse, la demande la plus récente s'ouvre.
  useEffect(() => {
    if (choisi) { setNouveau(false); chargerFil(choisi); }
    else if (tickets && tickets.length > 0 && !actifDemande) router.replace(`/support?ticket=${tickets[0].id}`);
  }, [choisi, tickets, chargerFil, router, actifDemande]);

  // Les réponses de l'équipe arrivent sans recharger la page.
  useEffect(() => {
    if (!choisi) return;
    const t = setInterval(() => { chargerFil(choisi); chargerListe(); }, 20_000);
    return () => clearInterval(t);
  }, [choisi, chargerFil, chargerListe]);

  useEffect(() => { fin.current?.scrollIntoView({ block: "nearest" }); }, [fil?.messages.length]);

  const repondre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!choisi || !reponse.trim()) return;
    setOccupe(true); setErreur("");
    try {
      await communityAPI.replyToTicket(choisi, reponse.trim());
      setReponse("");
      await Promise.all([chargerFil(choisi), chargerListe()]);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Envoi impossible.");
    } finally { setOccupe(false); }
  };

  const creer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sujet.trim() || !corps.trim()) return setErreur("Sujet et message sont requis.");
    setOccupe(true); setErreur("");
    try {
      const r = await communityAPI.contactAdmin(sujet.trim(), corps.trim());
      setSujet(""); setCorps(""); setNouveau(false);
      await chargerListe();
      if (r.ticket_id) router.replace(`/support?ticket=${r.ticket_id}`);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Envoi impossible.");
    } finally { setOccupe(false); }
  };

  const ferme = fil?.ticket.status === "closed";

  return (
    <div className="relative flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4 pt-2">
        <div>
          <Heading level={1}>Mes demandes</Heading>
          <Text className="mt-2.5 max-w-[36rem]">
            Vos échanges avec l&apos;équipe. Une réponse vous est signalée par une notification, et
            elle s&apos;affiche ici.
          </Text>
        </div>
        <Button size="md" onClick={() => { setNouveau(true); setErreur(""); }}>Nouvelle demande</Button>
      </header>

      {erreur && <FormError>{erreur}</FormError>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.6fr)]">
        <Panel title="Vos demandes">
          {tickets == null ? (
            <Text size="caption">Chargement…</Text>
          ) : tickets.length === 0 ? (
            <Text size="small">Aucune demande pour l&apos;instant.</Text>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {tickets.map((t) => {
                const actif = t.id === choisi && !nouveau;
                const attente = Boolean(t.last_from_admin) && t.status === "open";
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => router.replace(`/support?ticket=${t.id}`)}
                      className="w-full rounded-[10px] px-2 py-3 text-left transition-colors hover:bg-[color:var(--cap-surface-2)]"
                      style={{ backgroundColor: actif ? "var(--cap-surface-2)" : undefined }}
                    >
                      <span className="flex items-center gap-2">
                        {attente && <span aria-label="Nouvelle réponse" className="h-2 w-2 flex-none rounded-full" style={{ backgroundColor: "var(--cap-ambre)" }} />}
                        <span className="truncate text-[0.95rem] font-semibold" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
                          {t.subject}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-[0.8rem]" style={{ color: "var(--cap-ink-3)" }}>
                        {t.status === "closed" ? "Fermée" : attente ? "L'équipe a répondu" : "En attente de réponse"}
                        {", "}{quand(t.updated_at)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {nouveau || (tickets && tickets.length === 0) ? (
          <div data-visite="support-nouvelle">
          <Panel title="Nouvelle demande" hint="Un bug, une question, une idée : l'équipe lit chaque message et vous répond ici.">
            <form onSubmit={creer} className="space-y-4" noValidate>
              <Field label="Sujet" htmlFor="s-sujet">
                <TextInput id="s-sujet" value={sujet} onChange={setSujet} placeholder="Un bug, une question…" required />
              </Field>
              <Field label="Message" htmlFor="s-corps">
                <textarea id="s-corps" value={corps} onChange={(e) => setCorps(e.target.value)} rows={6}
                  className="w-full resize-y rounded-[12px] px-3.5 py-3 text-[0.95rem] outline-none placeholder:text-[color:var(--cap-ink-3)]"
                  style={zone} placeholder="Décrivez ce qui se passe…" required />
              </Field>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" size="md" disabled={occupe}>{occupe ? "Envoi…" : "Envoyer"}</Button>
                {tickets && tickets.length > 0 && (
                  <Button variant="secondary" size="md" onClick={() => setNouveau(false)}>Annuler</Button>
                )}
              </div>
            </form>
          </Panel>
          </div>
        ) : !fil ? (
          <Panel><EmptyState title="Choisissez une demande" description="La conversation s'affichera ici." /></Panel>
        ) : (
          <Panel title={fil.ticket.subject} hint={`Ouverte le ${quand(fil.ticket.created_at)}${ferme ? ", fermée par l'équipe" : ""}.`}>
            <ol className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
              {fil.messages.map((m) => {
                const equipe = Boolean(m.is_admin);
                return (
                  <li key={m.id} className={equipe ? "self-start" : "self-end"} style={{ maxWidth: "min(36rem, 92%)" }}>
                    <p className={`text-[0.8rem] ${equipe ? "" : "text-right"}`} style={{ color: "var(--cap-ink-3)" }}>
                      <span style={{ fontFamily: "var(--cap-font-display)", fontStyle: "italic", color: equipe ? "var(--cap-amber-ink)" : "var(--cap-ink-2)" }}>
                        {equipe ? "L'équipe CaptenTDB" : "Vous"}
                      </span>
                      {", "}{quand(m.created_at)}
                    </p>
                    <div
                      className="mt-1 whitespace-pre-wrap rounded-[14px] px-4 py-3 text-[0.95rem] leading-[1.6]"
                      style={equipe
                        ? { backgroundColor: "var(--cap-surface)", color: "var(--cap-ink)", boxShadow: "inset 3px 0 0 var(--cap-ambre), inset 0 0 0 1px var(--cap-line)" }
                        : { backgroundColor: "var(--cap-surface-2)", color: "var(--cap-ink)" }}
                    >
                      {m.message}
                    </div>
                  </li>
                );
              })}
              <div ref={fin} />
            </ol>

            {ferme ? (
              <Text size="small" className="mt-6">
                Cette demande est fermée. Pour donner suite, ouvrez une nouvelle demande.
              </Text>
            ) : (
              <form onSubmit={repondre} className="mt-6 space-y-3" noValidate>
                <label htmlFor="s-reponse" className="sr-only">Votre réponse</label>
                <textarea id="s-reponse" value={reponse} onChange={(e) => setReponse(e.target.value)} rows={3}
                  className="w-full resize-y rounded-[12px] px-3.5 py-3 text-[0.95rem] outline-none placeholder:text-[color:var(--cap-ink-3)]"
                  style={zone} placeholder="Votre réponse…" />
                <Button type="submit" size="md" disabled={occupe || !reponse.trim()}>
                  {occupe ? "Envoi…" : "Répondre"}
                </Button>
              </form>
            )}
          </Panel>
        )}
      </div>

      <ActifsDemandes initial={actifDemande} />
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={null}>
      <Support />
    </Suspense>
  );
}
