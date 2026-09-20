"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { ScanResultItem } from "@/lib/api";
import { fr } from "@/lib/SettingsContext";
import { DUR, EASE, Num, Text } from "@/components/design-system";

/**
 * Une opportunité, telle qu'elle se lit.
 *
 * Le scanner affichait un tableau : symbole, score, RSI, volume, tendance.
 * Des colonnes de chiffres se comparent bien et ne s'expliquent pas — il
 * fallait déjà savoir ce qu'on cherchait pour y trouver quoi que ce soit.
 *
 * Ici chaque opportunité tient en deux phrases, dans cet ordre : ce qui se
 * passe, puis ce qui l'invalide. La seconde compte plus que la première ;
 * c'est elle qui transforme une observation en décision, et c'est elle qui
 * manquait entièrement.
 *
 * Le score reste, en petit et à droite. Il départage à l'intérieur d'une
 * famille ; il n'est pas ce qu'on lit en premier.
 */

const FAMILLE_TON: Record<string, string> = {
  cassure: "var(--cap-up)",
  rebond: "var(--cap-ocean)",
  tendance: "var(--cap-amber)",
};

export function Opportunity({
  item,
  index,
  detailed,
}: {
  item: ScanResultItem;
  /** Rang dans sa famille, pour décaler l'entrée. */
  index: number;
  /** Le niveau déclaré déplie les chiffres bruts. */
  detailed: boolean;
}) {
  const hausse = item.change >= 0;
  const ton = FAMILLE_TON[item.family ?? "tendance"] ?? "var(--cap-ink-3)";

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      /* Le décalage suit le rang, plafonné : au-delà d'une poignée de cartes
         l'escalier devient une attente au lieu d'un mouvement. */
      transition={{ duration: DUR.base, ease: EASE, delay: Math.min(index, 6) * 0.05 }}
      className="py-4 first:pt-0 last:pb-0"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <Link
              href={`/analysis?symbol=${encodeURIComponent(item.symbol)}`}
              className="text-[1rem] font-medium transition-colors hover:underline"
              style={{ color: "var(--cap-ink)" }}
            >
              {item.symbol}
            </Link>
            {item.name && item.name !== item.symbol && (
              <span className="truncate text-[0.82rem]" style={{ color: "var(--cap-ink-3)" }}>
                {item.name}
              </span>
            )}
            <Num tone={hausse ? "up" : "down"} className="text-[0.82rem]">
              {hausse ? "+" : ""}{fr(item.change, 2)} %
            </Num>
          </div>

          {/* Les deux phrases. */}
          {item.headline && (
            <Text size="small" tone="ink" className="mt-2 max-w-[54rem]">
              {item.headline}
            </Text>
          )}
          {item.action && (
            <Text size="small" className="mt-1.5 max-w-[54rem]">
              {item.action}
            </Text>
          )}

          {/* Les chiffres bruts, seulement pour qui les a demandés. Les
              montrer à tout le monde, c'est reconstruire le tableau qu'on
              vient de remplacer. */}
          {detailed && (
            <Text size="caption" className="mt-2">
              RSI {fr(item.rsi, 0)} · volume ×{fr(item.volume_ratio, 1)} · MACD{" "}
              {item.macd_signal === "HAUSSIER" ? "haussier" : "baissier"}
              {item.relative_strength != null
                ? ` · force relative ${item.relative_strength >= 0 ? "+" : ""}${fr(item.relative_strength, 1)}`
                : ""}
              {" · semaine "}{item.change_1w >= 0 ? "+" : ""}{fr(item.change_1w, 1)} %
              {" · mois "}{item.change_1m >= 0 ? "+" : ""}{fr(item.change_1m, 1)} %
            </Text>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="text-right">
            <Num className="block text-[1.05rem]" tone="ink">{item.score}</Num>
            <span className="text-[0.7rem]" style={{ color: ton }}>
              {item.setup ?? item.family ?? ""}
            </span>
          </div>
          <Link
            href={`/analysis?symbol=${encodeURIComponent(item.symbol)}`}
            aria-label={`Analyser ${item.symbol}`}
            className="rounded-[8px] p-1.5 transition-colors hover:bg-[color:var(--cap-surface-2)]"
            style={{ color: "var(--cap-ink-3)" }}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </motion.li>
  );
}
