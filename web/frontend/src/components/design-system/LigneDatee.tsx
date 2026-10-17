"use client";

import { useEffect, useState } from "react";
import { isMarketOpen } from "@/lib/marketStatus";

/**
 * « Vendredi 17 octobre, 18 h 04. Paris et New York sont fermés, la crypto
 * cote. » La ligne qui ouvre la page, comme la date en tête d'un journal.
 *
 * Calculée dans le navigateur, après le premier rendu : l'heure du serveur
 * n'est pas celle du visiteur, et un texte différent entre les deux casserait
 * l'hydratation. Avant, une ligne neutre tient la place.
 */
export function LigneDatee() {
  const [maintenant, setMaintenant] = useState<Date | null>(null);
  useEffect(() => {
    setMaintenant(new Date());
    const t = setInterval(() => setMaintenant(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!maintenant) return <span>Les marchés, en ce moment.</span>;

  const jour = maintenant.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const heure = maintenant.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", " h ");
  const paris = isMarketOpen("EUROPE");
  const ny = isMarketOpen("USA");
  const places =
    paris && ny ? "Paris et New York cotent"
    : paris ? "Paris cote, New York n'a pas ouvert"
    : ny ? "New York cote, Paris a fermé"
    : "Paris et New York sont fermés";

  return (
    <span>
      <time dateTime={maintenant.toISOString()}>
        {jour.charAt(0).toUpperCase() + jour.slice(1)}, {heure}.
      </time>{" "}
      {places}, la crypto cote{paris || ny ? " aussi" : ""}.
    </span>
  );
}
