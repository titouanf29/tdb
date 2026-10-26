"use client";

import { useCallback, useEffect, useState } from "react";
import { communityAPI, type Signalement } from "@/lib/api";
import { Button, EmptyState, Panel, Text } from "@/components/design-system";

/**
 * Les messages signalés dans la Communauté. Au troisième signalement, un
 * message est masqué en attendant la décision ; ici on le garde (il
 * réapparaît), on le masque, ou on le supprime.
 */
export function Moderation() {
  const [liste, setListe] = useState<Signalement[] | null>(null);
  const [occupe, setOccupe] = useState<number | null>(null);

  const charger = useCallback(() => {
    communityAPI.signalements().then((d) => setListe(d.signalements || [])).catch(() => setListe([]));
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const trancher = async (s: Signalement, action: "garder" | "masquer" | "supprimer") => {
    setOccupe(s.message_id);
    try { await communityAPI.trancher(s.message_id, action); setListe((l) => (l || []).filter((x) => x.message_id !== s.message_id)); }
    finally { setOccupe(null); }
  };

  return (
    <Panel title="Messages signalés" hint="Dans la Communauté. Masqué automatiquement au troisième signalement.">
      {liste === null ? (
        <Text size="caption">Chargement…</Text>
      ) : liste.length === 0 ? (
        <EmptyState title="Aucun signalement en attente" description="Les messages signalés par les membres apparaîtront ici." />
      ) : (
        <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
          {liste.map((s) => (
            <li key={s.message_id} className="py-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-[0.9rem] font-semibold" style={{ color: "var(--cap-ink)" }}>{s.username || "Compte supprimé"}</span>
                <span className="text-[0.8rem]" style={{ color: "var(--cap-ink-3)" }}>{s.email}</span>
                <span className="text-[0.8rem]" style={{ color: s.masque ? "var(--cap-down)" : "var(--cap-ink-3)" }}>
                  {s.nb} signalement{s.nb > 1 ? "s" : ""}{s.masque ? ", masqué en attendant" : ""}
                </span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-[0.92rem]" style={{ color: "var(--cap-ink)" }}>{s.content}</p>
              {s.motifs.length > 0 && (
                <p className="mt-1 text-[0.82rem]" style={{ color: "var(--cap-ink-3)" }}>Motifs : {s.motifs.join(", ")}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => trancher(s, "garder")} disabled={occupe === s.message_id}>Garder</Button>
                <Button size="sm" variant="secondary" onClick={() => trancher(s, "masquer")} disabled={occupe === s.message_id}>Masquer</Button>
                <Button size="sm" variant="quiet" onClick={() => trancher(s, "supprimer")} disabled={occupe === s.message_id}>Supprimer</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
