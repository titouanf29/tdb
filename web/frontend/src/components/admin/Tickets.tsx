"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import {
  adminAPI, type AdminTicket, type AdminTicketDetail,
} from "@/lib/api";
import {
  Button, Drawer, EmptyState, FormError, Heading, Panel, SegmentedControl, Text,
} from "@/components/design-system";

/**
 * Le support.
 *
 * Une seule chose compte dans cette liste : QUI ATTEND UNE RÉPONSE. Un ticket
 * auquel on vient de répondre ne demande rien ; un ticket dont le dernier
 * message vient de l'utilisateur, si. Le tri et la pastille suivent cette
 * distinction plutôt que la date, qui mélange les deux.
 *
 * La conversation s'ouvre dans un tiroir parce qu'on lit et qu'on répond sans
 * perdre la liste : sur dix tickets à traiter, revenir en arrière neuf fois
 * est neuf allers-retours de trop.
 */

function quand(iso?: string): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const min = ms / 60000;
  if (min < 60) return `il y a ${Math.round(min)} min`;
  const h = min / 60;
  if (h < 48) return `il y a ${Math.round(h)} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

export function Tickets() {
  const [statut, setStatut] = useState<"open" | "closed" | "all">("open");
  const [rows, setRows] = useState<AdminTicket[]>([]);
  const [charge, setCharge] = useState(true);
  const [ouvert, setOuvert] = useState<AdminTicket | null>(null);

  const charger = useCallback(async () => {
    setCharge(true);
    try { setRows((await adminAPI.getTickets(statut, 1, 50)).tickets || []); }
    catch { setRows([]); }
    finally { setCharge(false); }
  }, [statut]);

  useEffect(() => { charger(); }, [charger]);

  // Ceux qui attendent une réponse passent devant, quelle que soit leur date :
  // c'est la seule urgence de cet écran.
  const triees = [...rows].sort((a, b) => {
    const aA = a.last_from_admin === false, bA = b.last_from_admin === false;
    if (aA !== bA) return aA ? -1 : 1;
    return (b.updated_at || "").localeCompare(a.updated_at || "");
  });
  const enAttente = rows.filter((t) => t.last_from_admin === false).length;

  return (
    <>
      <Panel
        title="Tickets"
        hint={enAttente > 0
          ? `${enAttente} attend${enAttente > 1 ? "ent" : ""} une réponse — ils sont en haut.`
          : "Personne n'attend de réponse."}
        aside={
          <SegmentedControl
            size="sm"
            options={[
              { value: "open", label: "Ouverts" },
              { value: "closed", label: "Fermés" },
              { value: "all", label: "Tous" },
            ]}
            value={statut}
            onChange={(v) => setStatut(v as typeof statut)}
            aria-label="Statut des tickets"
          />
        }
      >
        {charge ? (
          <Text size="caption">Chargement…</Text>
        ) : triees.length === 0 ? (
          <EmptyState
            title="Aucun ticket"
            description={statut === "open" ? "Rien d'ouvert en ce moment." : "Rien à afficher."}
          />
        ) : (
          <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
            {triees.map((t) => {
              const attend = t.last_from_admin === false;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setOuvert(t)}
                    className="flex w-full flex-wrap items-start justify-between gap-x-5 gap-y-1 py-3.5 text-left transition-colors hover:bg-[color:var(--cap-surface-2)]"
                  >
                    <span className="flex min-w-0 flex-1 items-start gap-2.5">
                      <span
                        aria-hidden
                        className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: attend ? "var(--cap-down)" : "transparent" }}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[0.92rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                          {t.subject}
                        </span>
                        {t.last_message && (
                          <span className="mt-0.5 block truncate text-[0.82rem]" style={{ color: "var(--cap-ink-2)" }}>
                            {t.last_message}
                          </span>
                        )}
                        <span className="mt-0.5 block text-[0.76rem]" style={{ color: "var(--cap-ink-3)" }}>
                          {t.username || t.email || `#${t.user_id}`} · {quand(t.updated_at)}
                          {t.status === "closed" ? " · fermé" : ""}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <TicketSheet ticket={ouvert} onClose={() => setOuvert(null)} onChanged={charger} />
    </>
  );
}

function TicketSheet({
  ticket,
  onClose,
  onChanged,
}: {
  ticket: AdminTicket | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<AdminTicketDetail | null>(null);
  const [reponse, setReponse] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  const bas = useRef<HTMLDivElement>(null);

  const recharger = useCallback(async (id: number) => {
    try { setDetail(await adminAPI.getTicketDetail(id)); }
    catch { setDetail(null); }
  }, []);

  useEffect(() => {
    if (!ticket) { setDetail(null); return; }
    setReponse(""); setErreur("");
    recharger(ticket.id);
  }, [ticket, recharger]);

  useEffect(() => {
    bas.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [detail]);

  if (!ticket) return <Drawer open={false} onClose={onClose}><span /></Drawer>;

  const repondre = async () => {
    if (!reponse.trim()) return;
    setOccupe(true); setErreur("");
    try {
      await adminAPI.replyToTicket(ticket.id, reponse.trim());
      setReponse("");
      await recharger(ticket.id);
      onChanged();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setOccupe(false);
    }
  };

  const basculer = async () => {
    setOccupe(true); setErreur("");
    try {
      if (ticket.status === "closed") await adminAPI.reopenTicket(ticket.id);
      else await adminAPI.closeTicket(ticket.id);
      await recharger(ticket.id);
      onChanged();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setOccupe(false);
    }
  };

  return (
    <Drawer open onClose={onClose} title="Ticket">
      <Heading level={3}>{ticket.subject}</Heading>
      <Text size="caption" className="mt-1">
        {ticket.username || ticket.email || `#${ticket.user_id}`} · ouvert {quand(ticket.created_at)}
        {ticket.status === "closed" ? " · fermé" : ""}
      </Text>

      <div className="mt-6 space-y-3">
        {(detail?.messages ?? []).map((m) => (
          <div key={m.id} className={m.is_admin ? "flex justify-end" : ""}>
            <div
              className="max-w-[88%] rounded-[12px] px-3.5 py-2.5"
              style={{
                backgroundColor: m.is_admin ? "var(--cap-surface-2)" : "var(--cap-bg)",
              }}
            >
              <p className="whitespace-pre-wrap text-[0.86rem] leading-[1.5]" style={{ color: "var(--cap-ink)" }}>
                {m.message}
              </p>
              <span className="mt-1 block text-[0.72rem]" style={{ color: "var(--cap-ink-3)" }}>
                {m.is_admin ? "vous" : m.username} · {quand(m.created_at)}
              </span>
            </div>
          </div>
        ))}
        <div ref={bas} />
      </div>

      {erreur && <div className="mt-4"><FormError>{erreur}</FormError></div>}

      <div className="mt-5">
        <textarea
          value={reponse}
          onChange={(e) => setReponse(e.target.value)}
          onKeyDown={(e) => {
            // Entrée envoie, Maj+Entrée saute une ligne : la convention de
            // toutes les messageries, et celle que les doigts attendent.
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); repondre(); }
          }}
          rows={3}
          placeholder="Votre réponse…"
          className="w-full resize-y rounded-[10px] px-3.5 py-3 text-[0.88rem] leading-[1.5] outline-none"
          style={{
            backgroundColor: "var(--cap-surface)",
            color: "var(--cap-ink)",
            boxShadow: "inset 0 0 0 1px var(--cap-line)",
          }}
        />
        <div className="mt-3 flex flex-wrap gap-2.5">
          <Button size="md" onClick={repondre} disabled={occupe || !reponse.trim()}>
            <Send className="h-4 w-4" />
            {occupe ? "Envoi…" : "Répondre"}
          </Button>
          <Button variant="quiet" size="md" onClick={basculer} disabled={occupe}>
            {ticket.status === "closed" ? "Rouvrir" : "Marquer comme résolu"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
