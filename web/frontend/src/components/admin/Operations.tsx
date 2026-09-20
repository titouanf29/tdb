"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import { adminAPI, type AdminAIHealth, type AdminAuditEntry } from "@/lib/api";
import { Button, Panel, Text } from "@/components/design-system";

/**
 * L'exploitation : les interrupteurs, l'état des services, et qui a fait quoi.
 *
 * Les trois vivaient dans des endroits différents — les réglages dans un
 * onglet, l'état de l'IA nulle part, le journal d'audit dans un composant
 * écrit mais jamais affiché. Ils répondent pourtant à la même question : le
 * service tourne-t-il, et qu'est-ce qu'on lui a fait.
 *
 * LES DEUX INTERRUPTEURS SONT SÉPARÉS DU RESTE parce qu'ils ne se comparent à
 * rien : couper les inscriptions gêne les nouveaux venus, couper le site les
 * bloque tous. Les mettre dans une grille de réglages parmi vingt autres,
 * c'est en faire des cases à cocher — et une case à cocher se clique par
 * mégarde.
 */

function Interrupteur({
  titre,
  detail,
  actif,
  dangereux,
  occupe,
  onToggle,
}: {
  titre: string;
  detail: string;
  actif: boolean;
  dangereux?: boolean;
  occupe: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[0.95rem] font-medium" style={{ color: "var(--cap-ink)" }}>
            {titre}
          </span>
          <span
            className="rounded-[6px] px-1.5 py-0.5 text-[0.7rem]"
            style={{
              backgroundColor: actif
                ? dangereux ? "var(--cap-down-soft)" : "var(--cap-up-soft)"
                : "var(--cap-surface-2)",
              color: "var(--cap-ink)",
            }}
          >
            {actif ? "activé" : "désactivé"}
          </span>
        </div>
        <Text size="caption" className="mt-1 max-w-[42rem]">{detail}</Text>
      </div>
      <Button
        variant={actif && dangereux ? "primary" : "secondary"}
        size="md"
        onClick={onToggle}
        disabled={occupe}
      >
        {occupe ? "…" : actif ? "Désactiver" : "Activer"}
      </Button>
    </div>
  );
}

export function Operations({
  reglages,
  onReglage,
}: {
  reglages: Record<string, string>;
  onReglage: (cle: string, valeur: string) => Promise<void>;
}) {
  const [occupe, setOccupe] = useState<string | null>(null);
  const [ia, setIa] = useState<AdminAIHealth | null>(null);
  const [sonde, setSonde] = useState(false);
  const [audit, setAudit] = useState<AdminAuditEntry[]>([]);

  const sonder = useCallback(async () => {
    setSonde(true);
    try { setIa(await adminAPI.getAIHealth()); }
    catch { setIa(null); }
    finally { setSonde(false); }
  }, []);

  useEffect(() => {
    sonder();
    adminAPI.getAuditLog(1, 40).then((d) => setAudit(d.logs || [])).catch(() => setAudit([]));
  }, [sonder]);

  const basculer = async (cle: string) => {
    setOccupe(cle);
    try { await onReglage(cle, reglages[cle] === "true" ? "false" : "true"); }
    finally { setOccupe(null); }
  };

  return (
    <div className="space-y-8">
      <Panel
        title="Interrupteurs"
        hint="Deux réglages seulement, parce que ce sont les deux qui changent ce que voient les utilisateurs."
      >
        <div className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
          <Interrupteur
            titre="Mode maintenance"
            detail="Bloque le site pour tous sauf les administrateurs. À activer pendant un déploiement, et surtout à ne pas oublier ensuite — rien d'autre que cet écran ne le rappelle."
            actif={reglages["maintenance_mode"] === "true"}
            dangereux
            occupe={occupe === "maintenance_mode"}
            onToggle={() => basculer("maintenance_mode")}
          />
          <Interrupteur
            titre="Inscriptions ouvertes"
            detail="Quand c'est désactivé, plus aucun compte ne peut être créé. Les comptes existants ne sont pas touchés."
            actif={reglages["registration_enabled"] !== "false"}
            occupe={occupe === "registration_enabled"}
            onToggle={() => basculer("registration_enabled")}
          />
        </div>
      </Panel>

      {/* L'état de l'IA. Il n'existait nulle part, et c'est précisément le
          service dont la panne est invisible : l'assistant répond « je ne suis
          pas disponible », et rien ne remonte. */}
      <Panel
        title="Fournisseurs d'IA"
        hint="Chacun est réellement interrogé — une clé posée ne prouve pas qu'un service répond."
        aside={
          <button
            type="button"
            onClick={sonder}
            disabled={sonde}
            className="flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 transition-colors hover:bg-[color:var(--cap-surface-2)] disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${sonde ? "animate-spin" : ""}`}
                       style={{ color: "var(--cap-ink-3)" }} />
            <Text size="caption" as="span">{sonde ? "Test…" : "Retester"}</Text>
          </button>
        }
      >
        {!ia ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--cap-ink-3)" }} />
            <Text size="caption" as="span">Interrogation des fournisseurs…</Text>
          </div>
        ) : (
          <>
            <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
              {ia.providers.map((p) => (
                <li key={p.provider} className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {p.ok
                        ? <Check className="h-3.5 w-3.5" style={{ color: "var(--cap-up)" }} />
                        : <X className="h-3.5 w-3.5" style={{ color: p.key ? "var(--cap-down)" : "var(--cap-ink-4)" }} />}
                      <span className="text-[0.92rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                        {p.provider}
                      </span>
                      {p.provider === ia.serving && (
                        <span className="rounded-[6px] px-1.5 py-0.5 text-[0.7rem]"
                              style={{ backgroundColor: "var(--cap-up-soft)", color: "var(--cap-ink)" }}>
                          en service
                        </span>
                      )}
                    </div>
                    <Text size="caption" className="mt-1">{p.detail}</Text>
                  </div>
                  {p.model && (
                    <span className="cap-num text-[0.8rem]" style={{ color: "var(--cap-ink-3)" }}>
                      {p.model}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {!ia.ok && (
              <Text size="small" className="mt-4">
                Tant qu&apos;aucun fournisseur ne répond, l&apos;assistant, l&apos;analyse
                commentée et la préparation hebdomadaire restent hors service.
              </Text>
            )}
          </>
        )}
      </Panel>

      {/* Le journal d'audit : écrit, et jamais affiché jusqu'ici. */}
      <Panel
        title="Journal des actions"
        hint="Ce que les administrateurs ont fait, du plus récent au plus ancien."
      >
        {audit.length === 0 ? (
          <Text size="caption">Aucune action enregistrée.</Text>
        ) : (
          <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
            {audit.map((l) => (
              <li key={l.id} className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <span className="text-[0.88rem]" style={{ color: "var(--cap-ink)" }}>
                    {l.action}
                  </span>
                  {l.details && (
                    <span className="ml-2 text-[0.82rem]" style={{ color: "var(--cap-ink-2)" }}>
                      {l.details}
                    </span>
                  )}
                </div>
                <Text size="caption" as="span">
                  {l.admin_email ?? `#${l.admin_id}`} · {quand(l.created_at)}
                </Text>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function quand(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
    + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
