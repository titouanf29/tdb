"use client";

import { motion, useReducedMotion } from "framer-motion";
import { DUR, EASE, Num, Text } from "@/components/design-system";

/**
 * Two pictures of a market's day.
 *
 * "Combien montent, combien baissent" is the first question anyone asks about
 * a market, and the old screen answered it by printing twenty rows and letting
 * the reader count green ones. Counting is not reading. A bar whose green part
 * is two-thirds of its length says the same thing in the time it takes to
 * glance at it, and the figures stay printed underneath for anyone who wants
 * them exactly.
 */

export interface Move {
  symbol: string;
  name: string;
  change: number;
}

/** How much of the market is up, as one bar. */
export function BreadthBar({
  up,
  down,
  flat = 0,
  // 7px, pas 5. Les teintes douces se lisent à 1,64:1 contre la surface : à
  // cinq pixels de haut, la barre devenait un filet qu'il fallait chercher.
  // La hauteur rend la présence sans ramener d'éclat — la mesure a montré que
  // c'est la saturation qui fatigue, pas la surface colorée : le Portefeuille
  // affiche deux fois plus de pixels colorés que cet écran et ne gêne
  // personne, parce qu'ils sont tous doux.
  height = 7,
}: {
  up: number;
  down: number;
  flat?: number;
  height?: number;
}) {
  const total = up + down + flat;
  if (total === 0) return null;
  const pct = (n: number) => (n / total) * 100;

  return (
    <div
      className="flex w-full overflow-hidden rounded-full"
      style={{ height, backgroundColor: "var(--cap-line)" }}
      role="img"
      aria-label={`${up} en hausse, ${down} en baisse`}
    >
      {/* LES TEINTES FRANCHES, ET C'EST UNE CORRECTION. Cette barre était en
          teinte douce pour ne pas faire vibrer la page — cinq aplats pleine
          largeur en vert et rouge vifs, c'était le raisonnement. Mais la
          mesure a montré ce que ça donnait vraiment : 1,67:1 et 1,81:1 sur le
          panneau, et 1,08:1 entre les deux moitiés. Autrement dit une barre
          grise en deux morceaux impossibles à distinguer, alors qu'elle est
          la seule chose que cet écran a à dire sur l'état d'une place.

          La crainte de l'éclat était juste, elle visait la mauvaise cible :
          ce qui fatigue, c'est une grande surface saturée, pas une barre de
          sept pixels de haut. */}
      {up > 0 && <span style={{ width: `${pct(up)}%`, backgroundColor: "var(--cap-up-fill)" }} />}
      {flat > 0 && <span style={{ width: `${pct(flat)}%`, backgroundColor: "var(--cap-line-strong)" }} />}
      {/* LA COULEUR N'EST JAMAIS LE SEUL CANAL. Deux teintes qui se détachent
          toutes deux d'un fond clair ont forcément une luminance voisine —
          c'est de la géométrie, pas un mauvais choix de nuancier — donc une
          personne daltonienne verra deux gris consécutifs. Ce trait dit où
          l'un finit et où l'autre commence, indépendamment de la teinte. */}
      {up > 0 && down > 0 && (
        <span
          aria-hidden
          className="shrink-0"
          style={{ width: 2, backgroundColor: "var(--cap-surface)" }}
        />
      )}
      {down > 0 && <span style={{ width: `${pct(down)}%`, backgroundColor: "var(--cap-down-fill)" }} />}
    </div>
  );
}

/**
 * The day's moves, as bars either side of zero.
 *
 * The previous screen put gainers in one box and losers in another, each with
 * a logo, a name, a symbol and a percentage. Two boxes make the two lists look
 * like two subjects; they are one subject — the spread of the day — and a
 * single axis shows the spread. The longest bar is the biggest move whichever
 * way it went, which is the comparison that was impossible before.
 */
export function MoveBars({
  items,
  onSelect,
}: {
  items: Move[];
  onSelect?: (symbol: string) => void;
}) {
  const reduce = useReducedMotion();
  if (items.length === 0) return null;

  // Scaled to the biggest absolute move on screen, with a 1 % floor so a calm
  // day does not blow a 0.04 % move up into a full-width bar.
  const peak = Math.max(1, ...items.map((m) => Math.abs(m.change)));

  return (
    <div className="space-y-3">
      {items.map((m, i) => {
        const width = (Math.abs(m.change) / peak) * 50;
        const bullish = m.change >= 0;
        const row = (
          <>
            <div className="mb-1 flex items-baseline justify-between gap-4">
              <span className="min-w-0 truncate text-[0.85rem]" style={{ color: "var(--cap-ink)" }}>
                {m.name}
              </span>
              <Num tone={bullish ? "up" : "down"} className="shrink-0 text-[0.82rem]">
                {bullish ? "+" : ""}
                {m.change.toFixed(2)} %
              </Num>
            </div>
            <div className="relative h-[5px] w-full rounded-full" style={{ backgroundColor: "var(--cap-line)" }}>
              {/* Zero. Without the mark, a short bar reads as "small" rather
                  than "close to flat", and the two mean different things.

                  2px at ink-4, not 1px at line-strong: navy at 15 % opacity on
                  a pale track disappeared entirely at this height, which left
                  the caption below pointing at a repère nobody could see. */}
              <span
                aria-hidden
                className="absolute left-1/2 top-[-4px] h-[13px] w-[2px] -translate-x-1/2 rounded-full"
                style={{ backgroundColor: "var(--cap-ink-4)" }}
              />
              <motion.span
                className="absolute top-0 h-full rounded-full"
                style={{
                  backgroundColor: bullish ? "var(--cap-up-fill)" : "var(--cap-down-fill)",
                  left: bullish ? "50%" : undefined,
                  right: bullish ? undefined : "50%",
                }}
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ duration: DUR.slow, delay: i * 0.05, ease: EASE }}
              />
            </div>
          </>
        );

        return onSelect ? (
          <button
            key={m.symbol}
            onClick={() => onSelect(m.symbol)}
            className="-mx-3 block w-full rounded-[9px] px-3 py-1.5 text-left transition-colors hover:bg-[color:var(--cap-surface-2)]"
          >
            {row}
          </button>
        ) : (
          <div key={m.symbol} className="px-0 py-1.5">
            {row}
          </div>
        );
      })}
      <Text size="caption" className="pt-1">
        À gauche du repère : en baisse. À droite : en hausse. La plus longue
        barre est le plus gros mouvement de la journée.
      </Text>
    </div>
  );
}
