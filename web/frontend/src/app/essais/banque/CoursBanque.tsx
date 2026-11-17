"use client";

import { useEffect, useState } from "react";

/** Les cours réels, en ligne, comme le bandeau d'une salle des marchés. */
const MARCHES = [
  { s: "^FCHI", nom: "CAC 40", d: 2 },
  { s: "^STOXX50E", nom: "Euro Stoxx 50", d: 2 },
  { s: "^GSPC", nom: "S&P 500", d: 2 },
  { s: "GC=F", nom: "Or", d: 2 },
  { s: "EURUSD=X", nom: "EUR / USD", d: 4 },
  { s: "BTC-USD", nom: "Bitcoin", d: 0 },
];

const nombre = (v: number, d: number) =>
  v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }).replace("-", "−");

export function CoursBanque() {
  const [cours, setCours] = useState<Record<string, { price: number; change: number }> | null>(null);
  useEffect(() => {
    fetch(`/api/market/prices?symbols=${MARCHES.map((m) => encodeURIComponent(m.s)).join(",")}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.prices && setCours(d.prices))
      .catch(() => {});
  }, []);
  return (
    <div className="bq-cours" aria-label="Cours de marché">
      {MARCHES.map((m) => {
        const c = cours?.[m.s];
        return (
          <div key={m.s}>
            <span className="bq-cours-nom">{m.nom}</span>
            <span className="bq-cours-prix">{c ? nombre(c.price, m.d) : "—"}</span>
            <span className={`bq-cours-var ${c && c.change < 0 ? "is-baisse" : "is-hausse"}`}>
              {c ? `${c.change > 0 ? "+" : ""}${nombre(c.change, 2)} %` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
