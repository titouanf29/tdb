"use client";

import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";
import { Panel, Text } from "@/components/design-system";

/**
 * Les dernières erreurs du serveur, depuis son dernier démarrage. L'équipe
 * est prévenue d'elle-même quand elles s'enchaînent (cinq en dix minutes) ;
 * ici, on voit lesquelles, sur quelle route, et quand.
 */
export function ErreursRecentes() {
  const [liste, setListe] = useState<Awaited<ReturnType<typeof adminAPI.erreurs>> | null>(null);
  useEffect(() => { adminAPI.erreurs().then(setListe).catch(() => setListe([])); }, []);

  return (
    <Panel title="Erreurs du serveur"
      hint="Les cinquante dernières depuis le dernier démarrage. Vous êtes prévenu dès que cinq tombent en dix minutes.">
      {liste === null ? (
        <Text size="small">Chargement…</Text>
      ) : liste.length === 0 ? (
        <Text size="small" tone="ink">Aucune erreur depuis le dernier démarrage du serveur.</Text>
      ) : (
        <ul className="divide-y" style={{ borderColor: "var(--cap-line)" }}>
          {liste.map((e, i) => (
            <li key={i} className="py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="font-semibold" style={{ color: "var(--cap-ink)" }}>{e.route}</span>
                <span className="cap-num text-[0.85rem]" style={{ color: "var(--cap-ink-3)" }}>
                  {new Date(e.a).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}
                </span>
              </div>
              <div className="mt-0.5 text-[0.88rem]" style={{ color: "var(--cap-down)" }}>{e.erreur}</div>
              {e.detail && <div className="mt-0.5 break-words text-[0.85rem]" style={{ color: "var(--cap-ink-2)" }}>{e.detail}</div>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
