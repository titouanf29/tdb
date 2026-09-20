"use client";

import { useMemo } from "react";
import type { SymbolSummary } from "@/lib/api";
import { fr } from "@/lib/SettingsContext";
import { LiveNum, Num, Panel, Text } from "@/components/design-system";

/**
 * Le bilan de chaque actif, sous l'historique.
 *
 * L'historique est une suite de lignes classées par date. On y voit ce qu'on
 * a fait ; on n'y voit jamais SUR QUOI on gagne et sur quoi on perd. C'est
 * pourtant la seule question que l'historique peut réellement trancher, et
 * elle ne se lit sur aucune ligne prise isolément : quinze trades sur le même
 * actif dont le cumul est négatif est un fait, pas une impression.
 *
 * L'ordre est celui du serveur — du plus coûteux au plus rentable. C'est
 * délibérément l'inverse d'un palmarès : ce qu'il faut regarder en premier
 * est ce qui perd. Un classement par gains décroissants flatte et n'apprend
 * rien.
 *
 * La barre horizontale donne le poids relatif de chaque actif dans le
 * résultat. Un chiffre isolé ne dit pas si −42 € est l'essentiel des pertes
 * ou une goutte d'eau ; la longueur, si.
 */

function duration(min: number | null): string {
  if (min == null) return "—";
  if (min < 60) return `${Math.round(min)} min`;
  if (min < 1440) return `${Math.round(min / 60)} h`;
  return `${Math.round(min / 1440)} j`;
}

export function SymbolReview({
  rows,
  money,
}: {
  rows: SymbolSummary[];
  money: (v: number) => string;
}) {
  // L'échelle des barres se prend sur la plus grosse valeur ABSOLUE : sinon
  // une perte de 200 € et un gain de 8 € se dessinent à la même longueur.
  const max = useMemo(
    () => Math.max(1, ...rows.map((r) => Math.abs(r.pnl))),
    [rows]
  );

  if (rows.length === 0) return null;

  const perdants = rows.filter((r) => r.pnl < 0).length;

  return (
    <Panel
      title="Bilan par actif"
      hint={
        perdants > 0
          ? perdants > 1
            ? `${perdants} actifs vous coûtent de l'argent — ils sont en haut.`
            : "Un actif vous coûte de l'argent — il est en haut."
          : "Chaque actif que vous avez tradé, du moins rentable au plus rentable."
      }
    >
      <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
        {rows.map((r) => {
          const gain = r.pnl >= 0;
          const largeur = (Math.abs(r.pnl) / max) * 100;
          return (
            <li key={r.symbol} className="py-3.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
                <span
                  className="text-[0.95rem] font-medium"
                  style={{ color: "var(--cap-ink)" }}
                >
                  {r.symbol}
                </span>
                <LiveNum
                  value={r.pnl}
                  format={(v) => `${v >= 0 ? "+" : ""}${money(v)}`}
                  tone={gain ? "up" : "down"}
                  className="text-[0.95rem]"
                />
              </div>

              {/* Le poids réel de cet actif dans le résultat. */}
              <div
                className="mt-2 h-[3px] w-full overflow-hidden rounded-full"
                style={{ backgroundColor: "var(--cap-surface-2)" }}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: `${largeur}%`,
                    backgroundColor: gain ? "var(--cap-up)" : "var(--cap-down)",
                  }}
                />
              </div>

              <Text size="caption" className="mt-2">
                {r.trades} trade{r.trades > 1 ? "s" : ""}
                {r.win_rate != null ? ` · ${fr(r.win_rate, 0)} % de réussite` : ""}
                {r.return_pct != null ? ` · ${fr(r.return_pct, 1)} % du capital engagé` : ""}
                {r.avg_held_minutes != null ? ` · ${duration(r.avg_held_minutes)} en moyenne` : ""}
              </Text>

              {/* Le détail qui explique le cumul : un gros gagnant qui masque
                  une série de perdants se voit ici, et nulle part ailleurs. */}
              {r.trades > 1 && (r.best != null || r.worst != null) && (
                <Text size="caption" className="mt-0.5">
                  {r.best != null && (
                    <>
                      meilleur <Num tone="up">+{money(r.best)}</Num>
                    </>
                  )}
                  {r.best != null && r.worst != null && " · "}
                  {r.worst != null && (
                    <>
                      pire <Num tone="down">{money(r.worst)}</Num>
                    </>
                  )}
                  {r.short > 0 && ` · ${r.long} achat${r.long > 1 ? "s" : ""}, ${r.short} vente${r.short > 1 ? "s" : ""}`}
                </Text>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
