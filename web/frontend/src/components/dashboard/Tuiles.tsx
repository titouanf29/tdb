"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { walletAPI, type CourbeWallet, type Position, type TradingStats } from "@/lib/api";
import { fr } from "@/lib/SettingsContext";
import { Num } from "@/components/design-system";

/**
 * Les chiffres du compte en tuiles : la valeur totale sur l'encre avec sa
 * courbe, puis le latent, l'engagé et le taux de réussite. Chaque tuile se
 * soulève au survol (règle `.cap-tuile`), geste repris d'un tableau de bord
 * « en verre », sans le verre : les surfaces restent opaques, l'ambre marque.
 */

export function Courbe({ points, tone = "ink" }: { points: number[]; tone?: "ink" | "up" | "down" | "clair" }) {
  if (points.length < 2) return null;
  const min = Math.min(...points), max = Math.max(...points);
  const w = 120, h = 36;
  const d = points.map((v, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = max === min ? h / 2 : h - ((v - min) / (max - min)) * (h - 4) - 2;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  let couleur = "var(--cap-ocean)";
  if (tone === "up") couleur = "var(--cap-up-fill)";
  else if (tone === "down") couleur = "var(--cap-down-fill)";
  else if (tone === "clair") couleur = "rgba(246,242,234,0.85)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" aria-hidden preserveAspectRatio="none">
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={couleur} opacity="0.12" />
      <path d={d} fill="none" stroke={couleur} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Tuile({ titre, valeur, legende, variation, courbe, sombre, tone, href }: {
  titre: string; valeur: string; legende?: string;
  variation?: { texte: string; tone: "up" | "down" | "ink" };
  courbe?: number[]; sombre?: boolean; tone?: "ink" | "up" | "down"; href?: string;
}) {
  let couleurVariation = "var(--cap-ink-2)";
  if (sombre) couleurVariation = "#F6F2EA";
  else if (variation?.tone === "up") couleurVariation = "var(--cap-up)";
  else if (variation?.tone === "down") couleurVariation = "var(--cap-down)";
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[0.85rem] font-semibold" style={{ color: sombre ? "rgba(232,237,241,0.72)" : "var(--cap-ink-3)" }}>{titre}</span>
        {variation && (
          <span className="cap-num inline-flex items-center gap-0.5 text-[0.82rem] font-medium" style={{ color: couleurVariation }}>
            {variation.tone === "up" && <ArrowUpRight className="h-3.5 w-3.5" />}
            {variation.texte}
          </span>
        )}
      </div>
      {sombre
        ? <span className="cap-num mt-3 block text-[clamp(1.5rem,2.6vw,1.9rem)] font-medium leading-none" style={{ color: "#F6F2EA" }}>{valeur}</span>
        : <Num tone={tone ?? "ink"} className="mt-3 block text-[clamp(1.5rem,2.6vw,1.9rem)] font-medium leading-none">{valeur}</Num>}
      {legende && <span className="mt-2 block text-[0.82rem]" style={{ color: sombre ? "rgba(232,237,241,0.66)" : "var(--cap-ink-3)" }}>{legende}</span>}
      {courbe && courbe.length > 1 && <div className="mt-3"><Courbe points={courbe} tone={sombre ? "clair" : tone ?? "ink"} /></div>}
    </>
  );
  const classe = "cap-tuile block rounded-[var(--cap-r-lg)] p-4";
  const style = sombre
    ? { backgroundColor: "var(--cap-navy)", color: "#E8EDF1" }
    : { backgroundColor: "var(--cap-surface-2)", boxShadow: "inset 0 0 0 1px var(--cap-line)" };
  return href ? <Link href={href} className={classe} style={style}>{inner}</Link> : <div className={classe} style={style}>{inner}</div>;
}

/** Les quatre tuiles du compte, à partir de ce que l'accueil a déjà chargé. */
export function TuilesCompte({ equity, stats, positions, money }: {
  equity: number; stats: TradingStats | null; positions: Position[]; money: (v: number) => string;
}) {
  const [courbe, setCourbe] = useState<CourbeWallet | null>(null);
  useEffect(() => { walletAPI.getCourbe().then(setCourbe).catch(() => {}); }, []);

  const latent = positions.reduce((a, p) => a + (p.unrealized_pnl ?? 0), 0);
  const engage = positions.reduce((a, p) => a + p.amount, 0);
  const part = equity > 0 ? Math.min(100, Math.round((engage / equity) * 100)) : 0;
  const sansStop = positions.filter((p) => p.stop_loss == null && p.instrument !== "turbo").length;
  const pointsCapital = useMemo(() => {
    if (!courbe) return [];
    const depart = courbe.capital_depart || 10_000;
    return [depart, ...courbe.points.map((p) => depart + p.cumul)];
  }, [courbe]);
  const n = positions.length;
  const t = stats?.total_trades ?? 0;
  const pl = (k: number, s: string, p: string) => (k > 1 ? p : s);

  return (
    <div className="grid grid-cols-2 gap-3">
      <Tuile sombre titre="Valeur totale" valeur={money(equity)}
        legende={courbe && courbe.trades > 0 ? `${courbe.trades} ${pl(courbe.trades, "trade fermé", "trades fermés")}, trade après trade` : "Le compte de simulation"}
        variation={stats && stats.total_pnl ? { texte: `${stats.total_pnl >= 0 ? "+" : ""}${money(stats.total_pnl)}`, tone: stats.total_pnl >= 0 ? "up" : "down" } : undefined}
        courbe={pointsCapital} href="/wallet" />
      <Tuile titre="Résultat latent" valeur={`${latent >= 0 ? "+" : ""}${money(latent)}`} tone={latent >= 0 ? "up" : "down"}
        legende={n ? `sur ${n} ${pl(n, "position ouverte", "positions ouvertes")}` : "aucune position ouverte"}
        courbe={positions.map((p) => p.pnl_percent ?? 0)} href="/wallet" />
      <Tuile titre="Capital engagé" valeur={money(engage)} legende={`${part} % du compte${sansStop ? `, ${sansStop} sans stop` : ""}`}
        variation={sansStop ? { texte: "stop à poser", tone: "down" } : undefined} href="/wallet" />
      <Tuile titre="Taux de réussite" valeur={stats && t > 0 ? `${fr(stats.win_rate, 0)} %` : "—"}
        legende={stats && t > 0 ? `sur ${t} ${pl(t, "trade fermé", "trades fermés")}` : "après le premier trade fermé"}
        courbe={courbe ? courbe.points.map((p) => p.pnl) : []} href="/journal" />
    </div>
  );
}
