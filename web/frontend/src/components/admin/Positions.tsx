"use client";

import { useCallback, useEffect, useState } from "react";
import { adminAPI, type AdminPosition } from "@/lib/api";
import { fr } from "@/lib/SettingsContext";
import {
  Button, EmptyState, FormError, Modal, Num, Panel, SegmentedControl, Text,
} from "@/components/design-system";

/**
 * Les positions de tous les utilisateurs.
 *
 * Le composant existait, la route aussi — et rien ne les reliait : l'écran
 * d'administration définissait ce bloc, le compilait, et ne l'affichait
 * jamais. Cent trente-huit lignes livrées à chaque déploiement et
 * inatteignables.
 *
 * Ce qu'on y fait vraiment : repérer une position aberrante — un levier
 * démesuré, une somme qui n'a pas de sens, un actif qui ne devrait pas être
 * tradable — et la fermer. C'est une action de dernier recours sur le compte
 * de quelqu'un d'autre, donc elle demande une confirmation qui nomme ce
 * qu'elle va faire, pas un « êtes-vous sûr ».
 */

export function Positions({ money }: { money: (v: number) => string }) {
  const [statut, setStatut] = useState<"open" | "closed" | "all">("open");
  const [rows, setRows] = useState<AdminPosition[]>([]);
  const [total, setTotal] = useState(0);
  const [charge, setCharge] = useState(true);
  const [aFermer, setAFermer] = useState<AdminPosition | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    setCharge(true);
    try {
      const d = await adminAPI.getPositions(statut, 1, 50);
      setRows(d.positions || []);
      setTotal(d.total || 0);
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setCharge(false);
    }
  }, [statut]);

  useEffect(() => { charger(); }, [charger]);

  const fermer = async () => {
    if (!aFermer) return;
    setOccupe(true);
    setErreur("");
    try {
      await adminAPI.forceClosePosition(aFermer.id);
      setAFermer(null);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Clôture impossible.");
    } finally {
      setOccupe(false);
    }
  };

  return (
    <>
      <Panel
        title="Positions"
        hint="Toutes les positions du site, tous comptes confondus."
        aside={
          <div className="flex items-center gap-3">
            <Text size="caption" as="span">{fr(total, 0)} au total</Text>
            <SegmentedControl
              size="sm"
              options={[
                { value: "open", label: "Ouvertes" },
                { value: "closed", label: "Clôturées" },
                { value: "all", label: "Toutes" },
              ]}
              value={statut}
              onChange={(v) => setStatut(v as typeof statut)}
              aria-label="Statut"
            />
          </div>
        }
      >
        {charge ? (
          <Text size="caption">Chargement…</Text>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Aucune position"
            description={statut === "open"
              ? "Personne n'a de position ouverte en ce moment."
              : "Rien à afficher pour ce filtre."}
          />
        ) : (
          <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
            {rows.map((p) => {
              const levierFort = (p.leverage ?? 1) >= 10;
              return (
                <li key={p.id} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 py-3.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[0.95rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                        {p.symbol}
                      </span>
                      <span className="rounded-[6px] px-1.5 py-0.5 text-[0.7rem]"
                            style={{ backgroundColor: "var(--cap-surface-2)", color: "var(--cap-ink-3)" }}>
                        {p.direction === "LONG" ? "Achat" : "Vente"}
                      </span>
                      {/* Le levier n'est signalé que lorsqu'il est extrême :
                          l'afficher sur chaque ligne le rendrait invisible. */}
                      {levierFort && (
                        <span className="rounded-[6px] px-1.5 py-0.5 text-[0.7rem]"
                              style={{ backgroundColor: "var(--cap-down-soft)", color: "var(--cap-ink)" }}>
                          levier ×{p.leverage}
                        </span>
                      )}
                    </div>
                    <Text size="caption" className="mt-1">
                      {p.username || p.email || `compte #${p.user_id}`} · {money(p.amount)} engagés
                      {!levierFort && (p.leverage ?? 1) > 1 ? ` · levier ×${p.leverage}` : ""}
                      {" · entrée "}{fr(p.entry_price, p.entry_price >= 100 ? 2 : 5)}
                    </Text>
                  </div>

                  <div className="flex items-center gap-4">
                    {p.status === "closed" ? (
                      <Num tone={(p.realized_pnl ?? 0) >= 0 ? "up" : "down"} className="text-[0.9rem]">
                        {p.realized_pnl != null
                          ? `${p.realized_pnl >= 0 ? "+" : ""}${money(p.realized_pnl)}`
                          : "—"}
                      </Num>
                    ) : (
                      <Button variant="quiet" size="sm" onClick={() => { setAFermer(p); setErreur(""); }}>
                        Forcer la clôture
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Modal open={!!aFermer} onClose={() => setAFermer(null)} title="Forcer la clôture">
        {aFermer && (
          <>
            {/* La confirmation nomme ce qui va se passer et sur quel compte.
                « Êtes-vous sûr ? » ne fait que demander de recliquer. */}
            <Text size="small" tone="ink">
              La position {aFermer.symbol} de{" "}
              {aFermer.username || aFermer.email || `#${aFermer.user_id}`} sera fermée
              au cours actuel, et le résultat crédité à son compte. L&apos;utilisateur
              n&apos;en sera pas averti.
            </Text>
            <Text size="caption" className="mt-2">
              {money(aFermer.amount)} engagés
              {(aFermer.leverage ?? 1) > 1 ? ` avec un levier ×${aFermer.leverage}` : ""}.
            </Text>
            {erreur && <div className="mt-3"><FormError>{erreur}</FormError></div>}
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button size="md" onClick={fermer} disabled={occupe}>
                {occupe ? "Clôture…" : "Clôturer cette position"}
              </Button>
              <Button variant="quiet" size="md" onClick={() => setAFermer(null)} disabled={occupe}>
                Annuler
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
