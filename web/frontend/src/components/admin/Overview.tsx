"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Check, Loader2 } from "lucide-react";
import {
  adminAPI,
  type AdminAIHealth, type AdminAssetRequest, type AdminDashboard,
} from "@/lib/api";
import { fr } from "@/lib/SettingsContext";
import { DUR, EASE, Metric, Num, Panel, Text } from "@/components/design-system";

/**
 * La vue d'ensemble : ce qui demande une action, puis ce qui va bien.
 *
 * L'ancien tableau de bord alignait huit compteurs — utilisateurs, trades,
 * volume, messages IA, favoris… Des chiffres qu'on regarde une fois et qui ne
 * disent jamais quoi faire. Un administrateur n'ouvre pas son écran pour
 * savoir combien de favoris existent ; il l'ouvre pour savoir S'IL Y A
 * QUELQUE CHOSE À FAIRE.
 *
 * D'où l'inversion : les alertes d'abord, et elles ne s'affichent QUE
 * lorsqu'elles sont vraies. Une liste d'alertes toujours visible, dont la
 * plupart sont vertes, se parcourt en diagonale au bout de trois jours — et
 * ce jour-là on rate la seule qui comptait.
 *
 * Chaque alerte est tirée d'une donnée réelle, jamais d'un seuil décoratif :
 * un ticket sans réponse est un ticket sans réponse, le mode maintenance est
 * lu dans les réglages, et l'état de l'IA vient d'un appel qui interroge
 * vraiment les fournisseurs.
 */

export interface Alerte {
  cle: string;
  gravite: "urgent" | "attention";
  titre: string;
  detail: string;
  vers?: string;
}

function construireAlertes(
  d: AdminDashboard | null,
  reglages: Record<string, string>,
  demandes: AdminAssetRequest[],
  ia: AdminAIHealth | null
): Alerte[] {
  const out: Alerte[] = [];

  // Le mode maintenance, en premier : c'est le seul réglage qui coupe le site
  // pour tout le monde, et le seul qu'on oublie d'avoir activé.
  if (reglages["maintenance_mode"] === "true") {
    out.push({
      cle: "maintenance",
      gravite: "urgent",
      titre: "Le site est en maintenance",
      detail: "Les utilisateurs non administrateurs sont bloqués. Rien ne le rappelle ailleurs qu'ici.",
      vers: "operations",
    });
  }

  if (ia && !ia.ok) {
    const sansCle = ia.providers.every((p) => !p.key);
    out.push({
      cle: "ia",
      gravite: "urgent",
      titre: sansCle ? "Aucun fournisseur d'IA n'est configuré" : "L'IA ne répond plus",
      detail: sansCle
        ? "L'assistant, l'analyse commentée et la préparation hebdomadaire sont hors service."
        : ia.providers.map((p) => `${p.provider} : ${p.detail}`).join(" · "),
      vers: "operations",
    });
  }

  const sansReponse = d?.stats.tickets?.awaiting_response ?? 0;
  if (sansReponse > 0) {
    out.push({
      cle: "tickets",
      gravite: sansReponse > 3 ? "urgent" : "attention",
      titre: `${sansReponse} ticket${sansReponse > 1 ? "s" : ""} attend${sansReponse > 1 ? "ent" : ""} une réponse`,
      detail: "Un utilisateur a écrit et personne n'a encore répondu.",
      vers: "support",
    });
  }

  const enAttente = demandes.filter((r) => r.status === "pending").length;
  if (enAttente > 0) {
    out.push({
      cle: "actifs",
      gravite: "attention",
      titre: `${enAttente} demande${enAttente > 1 ? "s" : ""} d'actif en attente`,
      detail: "Des utilisateurs réclament un actif absent de l'univers.",
      vers: "support",
    });
  }

  if (reglages["registration_enabled"] === "false") {
    out.push({
      cle: "inscriptions",
      gravite: "attention",
      titre: "Les inscriptions sont fermées",
      detail: "Aucun nouveau compte ne peut être créé.",
      vers: "operations",
    });
  }

  return out;
}

export function Overview({
  dashboard,
  reglages,
  onGo,
}: {
  dashboard: AdminDashboard | null;
  reglages: Record<string, string>;
  onGo: (section: string) => void;
}) {
  const [demandes, setDemandes] = useState<AdminAssetRequest[]>([]);
  const [ia, setIa] = useState<AdminAIHealth | null>(null);
  const [sondeIA, setSondeIA] = useState(true);

  useEffect(() => {
    adminAPI.getAssetRequests()
      .then((d) => setDemandes(d.requests || []))
      .catch(() => setDemandes([]));
    // L'état de l'IA coûte un appel réel à chaque fournisseur : on le fait une
    // fois au chargement, pas en boucle.
    adminAPI.getAIHealth()
      .then(setIa)
      .catch(() => setIa(null))
      .finally(() => setSondeIA(false));
  }, []);

  const alertes = useMemo(
    () => construireAlertes(dashboard, reglages, demandes, ia),
    [dashboard, reglages, demandes, ia]
  );

  const s = dashboard?.stats;

  return (
    <div className="space-y-8">
      {/* Ce qui demande une action. Absent quand il n'y a rien : un panneau
          vide qui dit « tout va bien » prend la place de ce qui compte. */}
      {alertes.length > 0 ? (
        <Panel
          title="À traiter"
          hint={`${alertes.length} point${alertes.length > 1 ? "s" : ""} demande${alertes.length > 1 ? "nt" : ""} votre attention.`}
        >
          <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
            {alertes.map((a, i) => (
              <motion.li
                key={a.cle}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DUR.base, ease: EASE, delay: i * 0.05 }}
                className="py-3.5 first:pt-0 last:pb-0"
              >
                <button
                  type="button"
                  onClick={() => a.vers && onGo(a.vers)}
                  className="flex w-full items-start gap-3 text-left"
                >
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: a.gravite === "urgent" ? "var(--cap-down)" : "var(--cap-amber)" }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.92rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                      {a.titre}
                    </span>
                    <span className="mt-0.5 block text-[0.84rem] leading-[1.5]" style={{ color: "var(--cap-ink-2)" }}>
                      {a.detail}
                    </span>
                  </span>
                  {a.vers && (
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0" style={{ color: "var(--cap-ink-3)" }} />
                  )}
                </button>
              </motion.li>
            ))}
          </ul>
        </Panel>
      ) : (
        <Panel>
          <div className="flex items-center gap-2.5">
            {sondeIA ? (
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--cap-ink-3)" }} />
            ) : (
              <Check className="h-4 w-4" style={{ color: "var(--cap-up)" }} />
            )}
            <Text size="small" tone="ink" as="span">
              {sondeIA
                ? "Vérification de l'état du service…"
                : "Rien à traiter : aucun ticket en attente, aucune demande, tous les services répondent."}
            </Text>
          </div>
        </Panel>
      )}

      <Panel title="Le site aujourd'hui">
        <div className="flex flex-wrap gap-x-12 gap-y-7">
          <Metric
            value={fr(s?.users.active_24h ?? 0, 0)}
            label={`actifs sur 24 h · ${fr(s?.users.total ?? 0, 0)} comptes`}
            size="lg"
          />
          <Metric
            value={fr(s?.trading.trades_24h ?? 0, 0)}
            label={`trades sur 24 h · ${fr(s?.trading.open_positions ?? 0, 0)} positions ouvertes`}
          />
          <Metric
            value={fr(s?.ai.messages_24h ?? 0, 0)}
            label="questions à l'IA sur 24 h"
          />
          <Metric
            value={`+${fr(s?.users.new_7d ?? 0, 0)}`}
            label="nouveaux comptes cette semaine"
            tone={(s?.users.new_7d ?? 0) > 0 ? "up" : "ink"}
          />
        </div>
      </Panel>

      <div className="grid gap-8 lg:grid-cols-2">
        <Panel title="Derniers inscrits" hint="Les cinq comptes les plus récents.">
          {(dashboard?.recent_users ?? []).length === 0 ? (
            <Text size="caption">Aucun compte récent.</Text>
          ) : (
            <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
              {(dashboard?.recent_users ?? []).slice(0, 5).map((u) => (
                <li key={u.id} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                  <span className="truncate text-[0.88rem]" style={{ color: "var(--cap-ink)" }}>
                    {u.username || u.email}
                  </span>
                  <Text size="caption" as="span">{depuis(u.created_at)}</Text>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Derniers trades" hint="Ce que font les utilisateurs, en direct.">
          {(dashboard?.recent_trades ?? []).length === 0 ? (
            <Text size="caption">Aucun trade récent.</Text>
          ) : (
            <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
              {(dashboard?.recent_trades ?? []).slice(0, 5).map((t, i) => (
                <li key={i} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                  <span className="truncate text-[0.88rem]" style={{ color: "var(--cap-ink)" }}>
                    {t.symbol}
                    <span className="ml-2 text-[0.78rem]" style={{ color: "var(--cap-ink-3)" }}>
                      {t.direction === "LONG" ? "achat" : "vente"}
                    </span>
                  </span>
                  <Num tone={(t.realized_pnl ?? 0) >= 0 ? "up" : "down"} className="text-[0.85rem]">
                    {t.realized_pnl != null
                      ? `${t.realized_pnl >= 0 ? "+" : ""}${fr(t.realized_pnl, 2)} €`
                      : "en cours"}
                  </Num>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function depuis(iso?: string): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const min = ms / 60000;
  if (min < 60) return `il y a ${Math.round(min)} min`;
  const h = min / 60;
  if (h < 48) return `il y a ${Math.round(h)} h`;
  return `il y a ${Math.round(h / 24)} j`;
}
