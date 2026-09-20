"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Text } from "@/components/design-system";

/**
 * Le rafraîchissement automatique, et son compte à rebours.
 *
 * Une page qui affiche un prix sans dire quand il a été lu laisse
 * l'utilisateur deviner s'il regarde le marché ou une photo. Le compte à
 * rebours répond à la question avant qu'elle soit posée.
 *
 * Deux garde-fous qui comptent plus que l'affichage :
 *
 *   1. RIEN NE TOURNE QUAND L'ONGLET N'EST PAS REGARDÉ. document.hidden
 *      suspend la boucle. Sans cela, un onglet oublié pendant la nuit
 *      continue d'interroger l'API des milliers de fois pour personne — et
 *      notre fournisseur de cours est limité en débit ;
 *   2. LE COMPTE À REBOURS NE MENT PAS. Il se remet à zéro quand la requête
 *      REVIENT, pas quand elle part. Un compteur qui repart à l'envoi
 *      afficherait « actualisé il y a 2 s » pendant qu'une requête de cinq
 *      secondes est encore en vol.
 */
export function useAutoRefresh(
  refresh: () => Promise<void>,
  seconds: number,
  enabled = true
) {
  const [remaining, setRemaining] = useState(seconds);
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  const run = useCallback(async () => {
    setBusy(true);
    try {
      await refreshRef.current();
    } catch {
      /* l'écran garde ce qu'il affiche ; le prochain tour réessaiera */
    } finally {
      setBusy(false);
      setRemaining(seconds);
    }
  }, [seconds]);

  // L'onglet caché suspend tout, et le retour déclenche une lecture immédiate :
  // revenir sur un onglet pour y trouver un prix vieux d'une heure est pire
  // que pas de rafraîchissement du tout.
  useEffect(() => {
    const onVisibility = () => {
      const hidden = document.hidden;
      setPaused(hidden);
      if (!hidden) run();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [run]);

  useEffect(() => {
    if (!enabled || paused) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { run(); return seconds; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [enabled, paused, run, seconds]);

  return { remaining, busy, paused, refreshNow: run };
}

export function RefreshTimer({
  remaining,
  busy,
  paused,
  onRefresh,
}: {
  remaining: number;
  busy: boolean;
  paused: boolean;
  onRefresh: () => void;
}) {
  return (
    <button
      onClick={onRefresh}
      disabled={busy}
      aria-label="Actualiser les cours maintenant"
      className="flex items-center gap-2 rounded-[9px] px-2.5 py-1.5 transition-colors hover:bg-[color:var(--cap-surface-2)] disabled:opacity-60"
    >
      <RefreshCw
        className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`}
        style={{ color: "var(--cap-ink-3)" }}
      />
      <Text size="caption" as="span">
        {busy ? "Actualisation…" : paused ? "En pause" : `Dans ${remaining} s`}
      </Text>
    </button>
  );
}
