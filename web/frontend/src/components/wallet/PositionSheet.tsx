"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Position } from "@/lib/api";
import { Button, Drawer, Heading, Num, Text } from "@/components/design-system";

/**
 * La fiche d'une position — tout ce qui la concerne, en un endroit.
 *
 * La ligne de la liste ne peut montrer que trois chiffres sans devenir
 * illisible. Le reste — la distance au stop, le rapport gain/risque
 * effectif, depuis quand la position est ouverte, ce qu'elle vaut
 * maintenant — existait dans les données et n'était nulle part.
 *
 * L'ordre suit ce qu'on veut savoir dans cet ordre : où j'en suis, où ça
 * s'arrête, depuis quand, et quoi faire. Les actions sont en bas parce
 * qu'on décide après avoir lu, pas avant.
 *
 * Une règle tenue partout : aucune valeur dérivée n'est affichée quand la
 * donnée manque. Un « — » est une information ; un zéro inventé n'en est
 * pas une.
 */

function Line({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="flex items-start justify-between gap-5 py-3">
      <div className="min-w-0">
        <span className="block text-[0.88rem]" style={{ color: "var(--cap-ink-2)" }}>
          {label}
        </span>
        {hint && (
          <span className="mt-0.5 block text-[0.78rem]" style={{ color: "var(--cap-ink-3)" }}>
            {hint}
          </span>
        )}
      </div>
      <div className="shrink-0 text-right">
        {typeof value === "string" || typeof value === "number" ? (
          <Num tone={tone} className="text-[0.95rem]">{value}</Num>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

/** Un pourcentage à la française : 12.3 -> « 12,3 ». toFixed rend un point,
 *  et c'est le piège qui revient à chaque nouveau chiffre affiché. */
const pc = (v: number) =>
  Math.abs(v).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** « il y a 3 jours », « il y a 4 h ». */
function since(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const min = ms / 60000;
  if (min < 60) return `il y a ${Math.round(min)} min`;
  const h = min / 60;
  if (h < 48) return `il y a ${Math.round(h)} h`;
  return `il y a ${Math.round(h / 24)} jours`;
}

export function PositionSheet({
  position: p,
  onClose,
  onEditLevels,
  onClosePosition,
  money,
}: {
  position: Position | null;
  onClose: () => void;
  onEditLevels: (p: Position) => void;
  onClosePosition: (p: Position) => void;
  money: (v: number) => string;
}) {
  if (!p) return <Drawer open={false} onClose={onClose}><span /></Drawer>;

  const long = p.direction === "LONG";
  const price = p.current_price ?? null;
  const pnl = p.unrealized_pnl ?? null;
  const pct = p.pnl_percent ?? null;

  // Distance aux niveaux, en pourcentage du cours : « le stop est à 1,2 % »
  // se compare d'un actif à l'autre, « le stop est à 4 € » non.
  const dist = (level?: number | null) =>
    level != null && price ? ((level - price) / price) * 100 : null;
  const dStop = dist(p.stop_loss);
  const dTarget = dist(p.take_profit);

  // Le rapport réellement en jeu depuis l'entrée, qui n'est pas celui que
  // l'analyse avait suggéré si les niveaux ont été modifiés depuis.
  const risk = p.stop_loss != null ? Math.abs(p.entry_price - p.stop_loss) : null;
  const reward = p.take_profit != null ? Math.abs(p.take_profit - p.entry_price) : null;
  const rr = risk && reward && risk > 0 ? reward / risk : null;

  return (
    <Drawer open onClose={onClose} title={`Position ${p.symbol}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Heading level={3}>{p.symbol}</Heading>
          <Text size="caption" className="mt-1">
            {long ? "Achat" : "Vente à découvert"}
            {p.leverage > 1 ? ` · levier ×${p.leverage}` : ""} · ouverte {since(p.created_at)}
          </Text>
        </div>
        {pnl != null && (
          <div className="shrink-0 text-right">
            <Num tone={pnl >= 0 ? "up" : "down"} className="block text-[1.3rem]">
              {pnl >= 0 ? "+" : ""}{money(pnl)}
            </Num>
            {pct != null && (
              <Num tone={pnl >= 0 ? "up" : "down"} className="block text-[0.85rem]">
                {pct >= 0 ? "+" : ""}
                {pct.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %
              </Num>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 [&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
        <Line label="Somme engagée" value={money(p.amount)} />
        <Line
          label="Prix d'entrée"
          value={money(p.entry_price)}
          hint={`${p.quantity.toLocaleString("fr-FR", { maximumFractionDigits: 6 })} unités`}
        />
        <Line
          label="Cours actuel"
          value={price != null ? money(price) : "—"}
          hint={price == null ? "Cours indisponible pour cet actif" : undefined}
          tone={price != null && pnl != null ? (pnl >= 0 ? "up" : "down") : undefined}
        />
        <Line
          label="Valeur de la position"
          value={pnl != null ? money(p.amount + pnl) : "—"}
          hint="Ce que vous récupérez en clôturant maintenant"
        />
      </div>

      <div className="mt-6">
        <Text size="caption">Le plan</Text>
        <div className="mt-1 [&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
          <Line
            label="Stop"
            value={p.stop_loss != null ? money(p.stop_loss) : "Aucun"}
            hint={
              p.stop_loss == null
                ? "Sans stop, rien n'arrête la perte automatiquement."
                : dStop != null
                  ? `${pc(dStop)} % ${dStop < 0 ? "sous le" : "au-dessus du"} cours`
                  : undefined
            }
            tone={p.stop_loss != null ? "down" : undefined}
          />
          <Line
            label="Objectif"
            value={p.take_profit != null ? money(p.take_profit) : "Aucun"}
            hint={
              dTarget != null
                ? `${pc(dTarget)} % ${dTarget > 0 ? "au-dessus du" : "sous le"} cours`
                : undefined
            }
            tone={p.take_profit != null ? "up" : undefined}
          />
          <Line
            label="Rapport gain / risque"
            value={rr != null ? `1 : ${rr.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}` : "—"}
            hint={
              rr == null
                ? "Il faut un stop ET un objectif pour le calculer."
                : rr < 1
                  ? "Vous risquez plus que ce que vous visez."
                  : undefined
            }
          />
        </div>
      </div>

      {/* Ce que le simulateur fera tout seul. Une position à stop posé se
          ferme sans intervention, et l'utilisateur doit le savoir avant de
          fermer l'onglet. */}
      {(p.stop_loss != null || p.take_profit != null) && (
        <Text size="caption" className="mt-5">
          {p.stop_loss != null && p.take_profit != null
            ? "La position se clôture d'elle-même dès que l'un des deux niveaux est atteint."
            : p.stop_loss != null
              ? "La position se clôture d'elle-même si le stop est atteint."
              : "La position se clôture d'elle-même si l'objectif est atteint."}
        </Text>
      )}

      <div className="mt-7 flex flex-wrap gap-2.5">
        <Button size="md" onClick={() => onClosePosition(p)}>Clôturer</Button>
        <Button variant="secondary" size="md" onClick={() => onEditLevels(p)}>
          Modifier les niveaux
        </Button>
      </div>

      <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--cap-line)" }}>
        <Link
          href={`/analysis?symbol=${encodeURIComponent(p.symbol)}`}
          className="inline-flex items-center gap-1.5 text-[0.85rem]"
          style={{ color: "var(--cap-ocean)" }}
        >
          Revoir l&apos;analyse de {p.symbol}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Drawer>
  );
}
