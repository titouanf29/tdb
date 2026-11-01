"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { communityAPI, type UserNotification } from "@/lib/api";

/**
 * Le point du matin, relu sur l'accueil.
 *
 * Il part à 8 h 45 dans la cloche et sur les appareils abonnés (backend
 * services/point_du_matin.py). Ceux qui n'ont pas accepté les notifications
 * sur leur appareil, ou qui arrivent plus tard, le retrouvent ici, sous la
 * ligne datée, le jour même seulement : c'est un rendez-vous, pas une
 * archive.
 */
export function PointDuMatin() {
  const [note, setNote] = useState<UserNotification | null>(null);

  useEffect(() => {
    const aujourdhui = new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
    communityAPI.getNotifications()
      .then((r) => {
        const n = (r.notifications ?? []).find(
          (x) => x.type === "matin"
            && new Date(x.created_at).toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" }) === aujourdhui,
        );
        setNote(n ?? null);
      })
      .catch(() => {});
  }, []);

  if (!note) return null;
  return (
    <p className="mt-3 max-w-[42rem] text-[0.95rem] leading-[1.6]" style={{ color: "var(--cap-ink-2)" }}>
      <span className="font-semibold" style={{ color: "var(--cap-amber-ink)" }}>Ce matin.</span>{" "}
      {note.message}{" "}
      <Link href="/settings?section=notifications" className="cap-lien whitespace-nowrap text-[0.85rem]">
        Régler
      </Link>
    </p>
  );
}
