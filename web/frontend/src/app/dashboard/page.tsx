"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useSettings, convertCurrency } from "@/lib/SettingsContext";
import { useTradingStyle } from "@/lib/tradingStyle";
import {
  dailyIntentAPI, favoritesAPI, walletAPI,
  type DailyIntentResult, type Favorite, type Position,
  type TradingStats, type WalletBalance,
} from "@/lib/api";
import {
  Button, CloudCurtain, DataList, DataRow, EmptyState, Heading, Num, Reveal,
  Text, Waypoint,
} from "@/components/design-system";

/**
 * The signed-in home screen.
 *
 * It answers four questions in order, and nothing else:
 *
 *   1. Who am I and how is this space set up?
 *   2. What should I do next? — exactly one recommendation.
 *   3. Where does my money stand? — three figures, not fifteen.
 *   4. What am I watching?
 *
 * The old version showed eleven widgets at once: wallet, win rate, news,
 * favourites, P&L, scanner, market status, an AI panel, trades, indicators.
 * Everything was available and nothing was recommended, which is the same as
 * having no dashboard at all — the user had to do the prioritising the product
 * exists to do for them.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const { settings, eurUsd } = useSettings();
  const style = useTradingStyle();

  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [intent, setIntent] = useState<DailyIntentResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    // allSettled, not all: one endpoint being down must not blank the screen.
    const [b, s, p, f, i] = await Promise.allSettled([
      walletAPI.getBalance(),
      walletAPI.getStats(),
      walletAPI.getPositions("open"),
      favoritesAPI.getFavorites(),
      dailyIntentAPI.get(),
    ]);
    if (b.status === "fulfilled") setBalance(b.value);
    if (s.status === "fulfilled") setStats(s.value);
    if (p.status === "fulfilled") setPositions(p.value.positions || []);
    if (f.status === "fulfilled") setFavorites(f.value.favorites || []);
    if (i.status === "fulfilled") setIntent(i.value);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const money = useCallback(
    (v: number) =>
      convertCurrency(v, "EUR", settings.currency, eurUsd).toLocaleString("fr-FR", {
        style: "currency",
        currency: settings.currency,
        maximumFractionDigits: 0,
      }),
    [settings.currency, eurUsd]
  );

  const equity = balance ? (balance.total_equity ?? balance.balance + balance.positions_value) : 0;
  const pnl = balance?.total_pnl ?? 0;
  // Percentage against the starting stake, which is what "how am I doing"
  // actually means — not against today's equity.
  const pnlPct = equity - pnl !== 0 ? (pnl / (equity - pnl)) * 100 : 0;

  const first = user?.first_name || user?.username || "";
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 6) return "Bonne nuit";
    if (h < 13) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  }, []);

  if (loading) return <CloudCurtain active label="Préparation de votre espace" />;

  return (
    <div className="space-y-14 sm:space-y-20">
      {/* ── 1. Where you are ───────────────────────────────────────────── */}
      <Reveal>
        <header>
          <Heading level={1}>
            {greeting}{first ? `, ${first}` : ""}.
          </Heading>
          <Text size="lead" className="mt-3 max-w-[38rem]">
            Votre espace est réglé pour{" "}
            <Link
              href="/settings"
              className="underline underline-offset-2 decoration-[color:var(--cap-ink-4)] transition-colors hover:text-[color:var(--cap-ink)]"
            >
              {style.label.fr.toLowerCase()}
            </Link>
            {" "}— horizon {style.horizon.fr.toLowerCase()}.
          </Text>
        </header>
      </Reveal>

      {/* ── 2. One thing to do ─────────────────────────────────────────── */}
      <Reveal delay={0.05}>
        <NextStep intent={intent} positions={positions} favorites={favorites} />
      </Reveal>

      {/* ── 3. Where the money stands ──────────────────────────────────── */}
      <Reveal delay={0.1}>
        <section>
          <div className="flex items-baseline justify-between gap-4">
            <Heading level={3} as="h2">Votre portefeuille</Heading>
            <button
              onClick={refresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-[0.82rem] transition-colors hover:text-[color:var(--cap-ink)] disabled:opacity-50"
              style={{ color: "var(--cap-ink-3)" }}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Actualiser
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-end gap-x-14 gap-y-8">
            <div>
              <Num className="text-[clamp(2.1rem,5vw,3rem)] font-medium leading-none">
                {money(equity)}
              </Num>
              <Text size="caption" className="mt-2.5">Valeur totale</Text>
            </div>
            <div>
              <Num
                tone={pnl >= 0 ? "up" : "down"}
                className="text-[1.5rem] font-medium leading-none"
              >
                {pnl >= 0 ? "+" : ""}{money(pnl)}
              </Num>
              <Text size="caption" className="mt-2.5">
                Performance · {pnl >= 0 ? "+" : ""}{pnlPct.toFixed(1)} %
              </Text>
            </div>
            <div>
              <Num className="text-[1.5rem] font-medium leading-none">{positions.length}</Num>
              <Text size="caption" className="mt-2.5">
                {positions.length > 1 ? "Positions ouvertes" : "Position ouverte"}
              </Text>
            </div>
            {stats && stats.total_trades > 0 && (
              <div>
                <Num className="text-[1.5rem] font-medium leading-none">
                  {stats.win_rate.toFixed(0)} %
                </Num>
                <Text size="caption" className="mt-2.5">
                  Réussite sur {stats.total_trades} trades
                </Text>
              </div>
            )}
          </div>

          {positions.length > 0 && (
            <div className="mt-8">
              <DataList>
                {positions.slice(0, 4).map((p) => (
                  <DataRow
                    key={p.id}
                    href="/trading"
                    label={p.symbol}
                    sub={`${p.direction === "LONG" ? "Achat" : "Vente"} · ${money(p.amount)}`}
                    value={p.current_price != null ? money(p.current_price) : "—"}
                    change={
                      p.unrealized_pnl != null && p.amount
                        ? (p.unrealized_pnl / p.amount) * 100
                        : null
                    }
                  />
                ))}
              </DataList>
              {positions.length > 4 && (
                <Link
                  href="/trading"
                  className="mt-4 inline-flex items-center gap-1.5 text-[0.85rem] transition-colors hover:text-[color:var(--cap-ink)]"
                  style={{ color: "var(--cap-ocean)" }}
                >
                  Voir les {positions.length} positions
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          )}
        </section>
      </Reveal>

      {/* ── 4. What you are watching ───────────────────────────────────── */}
      <Reveal delay={0.15}>
        <section>
          <Heading level={3} as="h2">Vos actifs</Heading>
          {favorites.length === 0 ? (
            <EmptyState
              title="Aucun actif suivi"
              description="Ajoutez les actifs que vous voulez garder à l'œil — ils apparaîtront ici avec leur variation du jour."
              action={{ label: "Chercher un actif", href: "/analysis" }}
            />
          ) : (
            <div className="mt-5">
              <DataList>
                {favorites.slice(0, 8).map((f) => (
                  <DataRow
                    key={f.symbol}
                    href={`/analysis?symbol=${encodeURIComponent(f.symbol)}`}
                    label={f.symbol}
                    value={money(f.price)}
                    change={f.change}
                  />
                ))}
              </DataList>
              {favorites.length > 8 && (
                <Link
                  href="/favorites"
                  className="mt-4 inline-flex items-center gap-1.5 text-[0.85rem] transition-colors hover:text-[color:var(--cap-ink)]"
                  style={{ color: "var(--cap-ocean)" }}
                >
                  Voir les {favorites.length} favoris
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          )}
        </section>
      </Reveal>
    </div>
  );
}

/* ── The recommendation ───────────────────────────────────────────────────── */

/**
 * Exactly one suggestion, chosen from what the user's state actually is.
 *
 * The rule is that it must be doable in one click and must change as the
 * account changes: an empty account gets "pick something to look at", an
 * account with open positions gets pointed at them, and an established one
 * gets the engine's pick of the day. A recommendation that says the same thing
 * every morning stops being read by the third one.
 */
function NextStep({
  intent,
  positions,
  favorites,
}: {
  intent: DailyIntentResult | null;
  positions: Position[];
  favorites: Favorite[];
}) {
  const suggestion = useMemo(() => {
    const picked = (intent as unknown as { assets?: { symbol: string; score?: number }[] })?.assets?.[0];

    if (positions.length > 0) {
      const p = positions[0];
      return {
        eyebrow: "Votre prochaine étape",
        title: `Revoyez votre position sur ${p.symbol}.`,
        body: "Vérifiez que le scénario d'entrée tient toujours, et que le stop est encore au bon endroit.",
        cta: "Ouvrir mes positions",
        href: "/trading",
      };
    }
    if (picked?.symbol) {
      return {
        eyebrow: "Votre prochaine étape",
        title: `Analysez ${picked.symbol}.`,
        body: "C'est l'actif que le moteur retient aujourd'hui pour votre profil. Regardez comment il construit son scénario avant de décider quoi que ce soit.",
        cta: "Voir l'analyse",
        href: `/analysis?symbol=${encodeURIComponent(picked.symbol)}`,
      };
    }
    if (favorites.length > 0) {
      return {
        eyebrow: "Votre prochaine étape",
        title: `Analysez ${favorites[0].symbol}.`,
        body: "Vous le suivez déjà — voyez ce que le moteur en dit et pourquoi.",
        cta: "Voir l'analyse",
        href: `/analysis?symbol=${encodeURIComponent(favorites[0].symbol)}`,
      };
    }
    return {
      eyebrow: "Pour commencer",
      title: "Analysez votre premier actif.",
      body: "Choisissez une entreprise que vous connaissez. Comprendre l'analyse compte plus que le choix de l'actif.",
      cta: "Commencer",
      href: "/analysis?symbol=AAPL",
    };
  }, [intent, positions, favorites]);

  return (
    <section
      className="relative overflow-hidden p-6 sm:p-9"
      style={{
        borderRadius: "var(--cap-r-xl)",
        backgroundColor: "var(--cap-surface)",
        boxShadow: "inset 0 0 0 1px var(--cap-line), var(--cap-shadow)",
      }}
    >
      <div className="flex items-center gap-2.5">
        <Waypoint size={11} />
        <span
          className="text-[0.72rem] font-medium uppercase tracking-[0.15em]"
          style={{ color: "var(--cap-ocean)" }}
        >
          {suggestion.eyebrow}
        </span>
      </div>

      <Heading level={2} className="mt-4 max-w-[30rem]">
        {suggestion.title}
      </Heading>
      <Text className="mt-3 max-w-[34rem]">{suggestion.body}</Text>

      <div className="mt-7">
        <Button href={suggestion.href} size="lg">
          {suggestion.cta}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
