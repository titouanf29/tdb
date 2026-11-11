"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  favoritesAPI, missionsAPI, walletAPI,
  type Aujourdhui, type CourbeWallet, type Favorite, type Position, type TradingStats, type WalletBalance,
} from "@/lib/api";
import { fr, useSettings, convertCurrency } from "@/lib/SettingsContext";
import { useAuth } from "@/lib/AuthContext";
import { Eyebrow, Heading, LigneDatee, Num, Panel, Text, WeatherBackdrop, useAnimationsEnabled } from "@/components/design-system";
import { ArrowRight } from "lucide-react";
import { getAssetName } from "@/lib/assetInfo";
import { ActionsRapides, Anneau, Tuile } from "@/components/dashboard/Tuiles";

/**
 * ESSAI : « tableau de bord vitré », adapté à la charte.
 *
 * Une vidéo montrait un tableau de bord en verre dépoli : tuiles qui se
 * soulèvent au survol, courbes miniatures sous les chiffres, une grande tuile
 * d'accent avec un anneau de progression, une rangée d'actions rapides. Ce
 * qui en est repris ici : le relief au survol, les courbes miniatures,
 * l'anneau, la rangée d'actions. Ce qui n'est pas repris : le verre sous le
 * texte (la charte veut des panneaux opaques, pour lire), la couleur corail
 * en aplat (l'ambre ne sert qu'à marquer), les icônes dans des carrés.
 *
 * Page d'essai, hors menu : /essais/tableau. Elle lit les vrais chiffres du
 * compte connecté.
 */

export default function EssaiTableau() {
  const { user } = useAuth();
  const { settings, eurUsd } = useSettings();
  const [animOn] = useAnimationsEnabled();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [favoris, setFavoris] = useState<Favorite[]>([]);
  const [courbe, setCourbe] = useState<CourbeWallet | null>(null);
  const [jour, setJour] = useState<Aujourdhui | null>(null);

  useEffect(() => {
    walletAPI.getBalance().then(setBalance).catch(() => {});
    walletAPI.getStats().then(setStats).catch(() => {});
    walletAPI.getPositions("open").then((r) => setPositions(r.positions || [])).catch(() => {});
    favoritesAPI.getFavorites().then((r) => setFavoris(r.favorites || [])).catch(() => {});
    walletAPI.getCourbe().then(setCourbe).catch(() => {});
    missionsAPI.aujourdhui().then(setJour).catch(() => {});
  }, []);

  const money = (v: number) => convertCurrency(v, "EUR", settings.currency, eurUsd)
    .toLocaleString("fr-FR", { style: "currency", currency: settings.currency, maximumFractionDigits: 0 });

  const equity = balance ? (balance.total_equity ?? balance.balance + balance.positions_value) : 0;
  const latent = positions.reduce((a, p) => a + (p.unrealized_pnl ?? 0), 0);
  const engage = positions.reduce((a, p) => a + p.amount, 0);
  const partEngagee = equity > 0 ? Math.min(100, Math.round((engage / equity) * 100)) : 0;
  const sansStop = positions.filter((p) => p.stop_loss == null && p.instrument !== "turbo").length;
  const pointsCapital = useMemo(() => {
    if (!courbe) return [];
    const depart = courbe.capital_depart || 10_000;
    return [depart, ...courbe.points.map((p) => depart + p.cumul)];
  }, [courbe]);
  const missionsFaites = jour ? jour.missions.filter((m) => m.fait).length : 0;
  const first = user?.first_name || user?.username || "";


  return (
    <>
      <WeatherBackdrop condition="fair" enabled={animOn} />
      <div className="relative flex flex-col gap-8">
        <header className="pt-2">
          <p className="cap-dateline mb-4 text-[0.92rem]"><LigneDatee /></p>
          <Eyebrow>Essai, hors menu</Eyebrow>
          <Heading level={1} className="mt-2">Un tableau de bord en relief{first ? `, ${first}` : ""}.</Heading>
          <Text className="mt-2.5 max-w-[42rem]">
            Trois idées reprises d&apos;un tableau de bord « en verre » et traduites dans la charte du site : les chiffres
            en tuiles qui se soulèvent au survol, avec leur courbe ; un anneau pour la part du capital engagée ; une rangée
            d&apos;actions rapides. Les panneaux restent opaques, l&apos;ambre marque, le texte reste lisible.
          </Text>
        </header>

        {/* ── Essai A : les tuiles ─────────────────────────────────────── */}
        <section aria-labelledby="essai-a">
          <h2 id="essai-a" className="mb-3 text-[1.05rem] font-bold" style={{ color: "var(--cap-ink)" }}>A. Les chiffres en tuiles</h2>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tuile sombre titre="Valeur totale" valeur={money(equity)}
              legende={courbe && courbe.trades > 0 ? `${courbe.trades} trade${courbe.trades > 1 ? "s" : ""} fermé${courbe.trades > 1 ? "s" : ""}, trade après trade` : "Le compte de simulation"}
              variation={stats && stats.total_pnl ? { texte: `${stats.total_pnl >= 0 ? "+" : ""}${money(stats.total_pnl)}`, tone: stats.total_pnl >= 0 ? "up" : "down" } : undefined}
              courbe={pointsCapital} href="/wallet" />
            <Tuile titre="Résultat latent" valeur={`${latent >= 0 ? "+" : ""}${money(latent)}`} tone={latent >= 0 ? "up" : "down"}
              legende={positions.length ? `sur ${positions.length} position${positions.length > 1 ? "s" : ""} ouverte${positions.length > 1 ? "s" : ""}` : "aucune position ouverte"}
              courbe={positions.map((p) => p.pnl_percent ?? 0)} href="/wallet" />
            <Tuile titre="Capital engagé" valeur={money(engage)} legende={`${partEngagee} % du compte${sansStop ? `, ${sansStop} sans stop` : ""}`}
              variation={sansStop ? { texte: "stop à poser", tone: "down" } : undefined} href="/wallet" />
            <Tuile titre="Taux de réussite" valeur={stats && stats.total_trades > 0 ? `${fr(stats.win_rate, 0)} %` : "—"}
              legende={stats && stats.total_trades > 0 ? `sur ${stats.total_trades} trade${stats.total_trades > 1 ? "s" : ""} fermé${stats.total_trades > 1 ? "s" : ""}` : "après le premier trade fermé"}
              courbe={courbe ? courbe.points.map((p) => p.pnl) : []} tone="ink" href="/journal" />
          </div>
        </section>

        {/* ── Essai B : la grande tuile avec l'anneau ─────────────────── */}
        <section aria-labelledby="essai-b">
          <h2 id="essai-b" className="mb-3 text-[1.05rem] font-bold" style={{ color: "var(--cap-ink)" }}>B. La grande tuile et son anneau</h2>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="cap-tuile rounded-[var(--cap-r-xl)] p-6 sm:p-8" style={{ backgroundColor: "var(--cap-navy)", color: "#E8EDF1" }}>
              <div className="flex flex-wrap items-center gap-6 sm:gap-10">
                <div className="min-w-0 flex-1">
                  <span className="text-[0.75rem] font-medium uppercase tracking-[0.15em]" style={{ color: "rgba(232,237,241,0.82)" }}>Votre exposition</span>
                  <h3 className="mt-3 max-w-[22rem] text-[clamp(1.35rem,2.6vw,1.9rem)] font-semibold leading-[1.15]" style={{ color: "#F6F2EA" }}>
                    {partEngagee === 0 ? "Rien d'engagé pour l'instant." : `${partEngagee} % de votre capital travaille.`}
                  </h3>
                  <p className="mt-3 max-w-[30rem] text-[0.92rem] leading-[1.6]" style={{ color: "rgba(232,237,241,0.72)" }}>
                    {partEngagee === 0
                      ? "Le reste attend sur le compte. Une première position se prend sur une analyse où Nimbo propose d'entrer."
                      : `${money(engage)} sur ${money(equity)}, répartis sur ${positions.length} position${positions.length > 1 ? "s" : ""}. ${sansStop ? `${sansStop} ${sansStop > 1 ? "n'ont" : "n'a"} pas de stop : c'est la première chose à poser.` : "Chacune a son stop."}`}
                  </p>
                  <div className="mt-5 grid grid-cols-3 gap-4">
                    {[
                      { v: String(positions.length), l: positions.length > 1 ? "positions" : "position" },
                      { v: String(favoris.length), l: favoris.length > 1 ? "actifs suivis" : "actif suivi" },
                      { v: jour ? `${missionsFaites}/${jour.missions.length}` : "—", l: "missions du jour" },
                    ].map((f) => (
                      <div key={f.l}>
                        <span className="cap-num block text-[1.25rem] font-medium leading-none" style={{ color: "#F6F2EA" }}>{f.v}</span>
                        <span className="mt-1 block text-[0.78rem]" style={{ color: "rgba(232,237,241,0.62)" }}>{f.l}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Anneau pct={partEngagee} libelle="engagé" />
              </div>
              <div className="mt-6">
                <Link href="/wallet" className="group inline-flex h-11 items-center gap-2.5 rounded-[12px] px-5 text-[0.925rem] font-semibold transition-transform hover:-translate-y-px"
                  style={{ backgroundColor: "#F6F2EA", color: "var(--cap-navy)" }}>
                  <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--cap-ambre)" }} />
                  Ouvrir le wallet
                  <ArrowRight className="h-4 w-4" style={{ color: "var(--cap-amber-ink)" }} />
                </Link>
              </div>
            </div>

            <Panel title="Vos actifs" hint="Variation depuis la clôture précédente." className="h-full">
              <ul className="cap-liste">
                {favoris.slice(0, 4).map((f) => (
                  <li key={f.symbol} className="cap-tuile -mx-2 rounded-[10px] px-2">
                    <Link href={`/analysis?symbol=${encodeURIComponent(f.symbol)}`} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-[0.925rem] font-medium" style={{ color: "var(--cap-ink)" }}>{f.name || getAssetName(f.symbol)}</span>
                        <span className="block text-[0.8rem]" style={{ color: "var(--cap-ink-3)" }}>{f.symbol}</span>
                      </span>
                      <Num tone={f.change >= 0 ? "up" : "down"} className="shrink-0 text-[0.9rem]">{f.change >= 0 ? "+" : ""}{fr(f.change, 2)} %</Num>
                    </Link>
                  </li>
                ))}
                {favoris.length === 0 && <li><Text size="small">Aucun actif suivi.</Text></li>}
              </ul>
            </Panel>
          </div>
        </section>

        {/* ── Essai C : les actions rapides ───────────────────────────── */}
        <section aria-labelledby="essai-c">
          <h2 id="essai-c" className="mb-3 text-[1.05rem] font-bold" style={{ color: "var(--cap-ink)" }}>C. Les actions rapides</h2>
          <ActionsRapides />
          <Text size="caption" className="mt-3">
            Le relief au survol vient d&apos;une seule règle de style (`.cap-tuile`), coupée quand les animations le sont.
          </Text>
        </section>
      </div>
    </>
  );
}
