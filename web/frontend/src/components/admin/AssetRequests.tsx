"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { adminAPI, type AdminAssetRequest } from "@/lib/api";
import { Button, DUR, EASE, EmptyState, FormError, Panel, Text } from "@/components/design-system";

/**
 * Les actifs que les utilisateurs réclament.
 *
 * Section écrite et jamais affichée, comme trois autres. C'est pourtant le
 * seul canal par lequel on apprend ce qui MANQUE au site : un utilisateur qui
 * cherche un actif absent et prend la peine de le demander vient de signaler
 * un trou dans l'univers, gratuitement.
 *
 * Les demandes en attente passent devant, et seules celles-là portent des
 * boutons : une demande déjà traitée n'a plus d'action possible, et lui
 * laisser des boutons grisés fait hésiter pour rien.
 */

const ETAT_LABEL: Record<string, string> = {
  pending: "en attente",
  approved: "acceptée",
  rejected: "refusée",
};

export function AssetRequests() {
  const [rows, setRows] = useState<AdminAssetRequest[]>([]);
  const [charge, setCharge] = useState(true);
  const [occupe, setOccupe] = useState<number | null>(null);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    setCharge(true);
    try { setRows((await adminAPI.getAssetRequests()).requests || []); }
    catch { setRows([]); }
    finally { setCharge(false); }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const agir = async (r: AdminAssetRequest, action: "approve" | "reject") => {
    setOccupe(r.id);
    setErreur("");
    try {
      await adminAPI.assetRequestAction(r.id, action);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setOccupe(null);
    }
  };

  // En attente d'abord ; le reste, du plus récent au plus ancien.
  const triees = [...rows].sort((a, b) => {
    if ((a.status === "pending") !== (b.status === "pending")) return a.status === "pending" ? -1 : 1;
    return (b.created_at || "").localeCompare(a.created_at || "");
  });
  const enAttente = rows.filter((r) => r.status === "pending").length;

  return (
    <Panel
      title="Demandes d'actifs"
      hint="Ce que les utilisateurs cherchent et ne trouvent pas, le seul canal qui dit ce qui manque à l'univers."
      aside={enAttente > 0
        ? <Text size="caption" as="span">{enAttente} en attente</Text>
        : undefined}
    >
      {erreur && <div className="mb-4"><FormError>{erreur}</FormError></div>}

      {charge ? (
        <Text size="caption">Chargement…</Text>
      ) : triees.length === 0 ? (
        <EmptyState
          title="Aucune demande"
          description="Personne n'a réclamé d'actif absent. C'est soit que l'univers suffit, soit que le formulaire est trop bien caché."
        />
      ) : (
        <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
          <AnimatePresence initial={false}>
            {triees.map((r, i) => (
              <motion.li
                key={r.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DUR.base, ease: EASE, delay: Math.min(i, 5) * 0.04 }}
                className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2.5 py-3.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="cap-num text-[0.95rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                      {r.symbol}
                    </span>
                    {r.asset_name && (
                      <span className="text-[0.85rem]" style={{ color: "var(--cap-ink-2)" }}>{r.asset_name}</span>
                    )}
                    {r.status !== "pending" && (
                      <span
                        className="rounded-[6px] px-1.5 py-0.5 text-[0.7rem]"
                        style={{
                          backgroundColor: r.status === "approved" ? "var(--cap-up-soft)" : "var(--cap-surface-2)",
                          color: "var(--cap-ink)",
                        }}
                      >
                        {ETAT_LABEL[r.status] ?? r.status}
                      </span>
                    )}
                  </div>
                  {r.reason && (
                    <Text size="small" className="mt-1 max-w-[44rem]">« {r.reason} »</Text>
                  )}
                  <Text size="caption" className="mt-1">
                    {r.username || r.email || `compte #${r.user_id}`}
                    {r.admin_notes ? `, note : ${r.admin_notes}` : ""}
                  </Text>
                </div>

                {/* Les boutons n'existent que tant qu'il y a quelque chose à
                    décider. */}
                {r.status === "pending" && (
                  <div className="flex shrink-0 items-center gap-2">
                    <Button size="sm" onClick={() => agir(r, "approve")} disabled={occupe === r.id}>
                      <Check className="h-3.5 w-3.5" />
                      Accepter
                    </Button>
                    <Button variant="quiet" size="sm" onClick={() => agir(r, "reject")} disabled={occupe === r.id}>
                      <X className="h-3.5 w-3.5" />
                      Refuser
                    </Button>
                  </div>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Panel>
  );
}
