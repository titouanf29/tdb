"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CloudOff, Globe2, RefreshCw, Sun } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useSettings, convertCurrency } from "@/lib/SettingsContext";
import { useTradingStyle } from "@/lib/tradingStyle";
import {
  dailyIntentAPI, favoritesAPI, journalAPI, walletAPI,
  type DailyIntentResult, type Favorite, type Position,
  type TradingStats, type WalletBalance,
} from "@/lib/api";
import {
  Button, CloudCurtain, DataList, DataRow, EmptyState, Heading, Num, Panel,
  Reveal, Text, Waypoint, WeatherBackdrop, WEATHER_LABEL,
  conditionFromChange, useAnimationsEnabled,
} from "@/components/design-system";
import { FirstSteps } from "@/components/app/FirstSteps";
import { useProfile } from "@/lib/useProfile";

/**
 * The signed-in home screen.
 *
 * It answers four questions in order and nothing else: where am I, what should
 * I do next, where does my money stand, what am I watching. Each one is a
 * panel, because a workspace is scanned rather than read and the eye needs
 * edges to land on.
 *
 * The version before this showed eleven widgets at once — wallet, win rate,
 * news, favourites, P&L, scanner, market status, an AI panel, trades,
 * indicators. Everything was available and nothing was recommended, which is
 * the same as having no dashboard: the user had to do the prioritising the
 * product exists to do for them.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const { settings, eurUsd } = useSettings();
  const style = useTradingStyle();
  const [animOn, setAnimOn] = useAnimationsEnabled();
  const { profile } = useProfile();

  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [intent, setIntent] = useState<DailyIntentResult | null>(null);
  const [journalCount, setJournalCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    // allSettled, not all: one endpoint being down must not blank the screen.
    const [b, s, p, f, i, j] = await Promise.allSettled([
      walletAPI.getBalance(),
      walletAPI.getStats(),
      walletAPI.getPositions("open"),
      favoritesAPI.getFavorites(),
      dailyIntentAPI.get(),
      journalAPI.list(),
    ]);
    if (b.status === "fulfilled") setBalance(b.value);
    if (s.status === "fulfilled") setStats(s.value);
    if (p.status === "fulfilled") setPositions(p.value.positions || []);
    if (f.status === "fulfilled") setFavorites(f.value.favorites || []);
    if (i.status === "fulfilled") setIntent(i.value);
    if (j.status === "fulfilled") {
      const entries = (j.value as unknown as { entries?: unknown[] })?.entries;
      setJournalCount(Array.isArray(entries) ? entries.length : 0);
    }
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
  // Against the starting stake, which is what "how am I doing" means — not
  // against today's equity, which would flatter a losing account.
  const pnlPct = equity - pnl !== 0 ? (pnl / (equity - pnl)) * 100 : 0;

  // The sky reads the assets this user follows, so it says something about
  // their day rather than about the market in general.
  const avgChange = useMemo(() => {
    if (favorites.length === 0) return null;
    return favorites.reduce((a, f) => a + (f.change ?? 0), 0) / favorites.length;
  }, [favorites]);
  const condition = conditionFromChange(avgChange);

  const first = user?.first_name || user?.username || "";
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 6) return "Bonne nuit";
    if (h < 13) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  }, []);

  if (loading) return <CloudCurtain active label="Préparation de votre espace" />;

  // L'objectif déclaré, et la phrase qui dit ce qu'il a changé. Une
  // personnalisation silencieuse ne se distingue pas d'une absence de
  // personnalisation : l'utilisateur doit pouvoir constater qu'on l'a écouté.
  const goal = profile.goal;
  const goalLine =
    goal === "comprendre" ? "Le parcours est placé en premier, comme vous l'avez demandé."
    : goal === "suivre" ? "Vos actifs suivis passent avant le reste."
    : goal === "tester" ? "Portefeuille et positions en tête."
    : "";

  return (
    <>
      <WeatherBackdrop condition={condition} enabled={animOn} />

      {/* flex-col plutôt que le flux normal : `order` n'agit que dans un
          conteneur flex ou grid, et c'est lui qui réalise la personnalisation. */}
      <div className="relative flex flex-col gap-8">
        {/* ── 1. Where you are ─────────────────────────────────────────── */}
        <Reveal>
          <header className="flex flex-wrap items-end justify-between gap-5 pt-2">
            <div>
              <Heading level={1}>
                {greeting}{first ? `, ${first}` : ""}.
              </Heading>
              <Text className="mt-2.5 max-w-[38rem]">
                Espace réglé pour{" "}
                <Link
                  href="/settings"
                  className="underline decoration-[color:var(--cap-ink-4)] underline-offset-2 transition-colors hover:text-[color:var(--cap-ink)]"
                >
                  {style.label.fr.toLowerCase()}
                </Link>
                {" "}— horizon {style.horizon.fr.toLowerCase()}.
                {goalLine && ` ${goalLine}`}
              </Text>
            </div>

            <WeatherToggle
              on={animOn}
              onChange={setAnimOn}
              label={WEATHER_LABEL[condition]}
              hasData={avgChange != null}
            />
          </header>
        </Reveal>

        {/* ── 2. One thing to do ───────────────────────────────────────── */}
        <Reveal delay={0.04}>
          <NextStep intent={intent} positions={positions} favorites={favorites} />
        </Reveal>

        {/* ── 3 & 4. L'argent et la veille — dans l'ordre de l'objectif ──
            L'objectif déclaré au premier lancement réordonne réellement cette
            page. Poser la question et ne rien changer derrière, c'est le
            reproche qu'on nous faisait : « comprendre » fait remonter le
            parcours, « suivre » fait remonter les actifs suivis, « tester »
            garde le portefeuille en tête. Ce n'est pas un thème, c'est
            l'ordre dans lequel les choses arrivent sous les yeux. */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Reveal delay={0.08} className={goal === "suivre" ? "order-2" : "order-1"}>
            {/* CE PANNEAU LIT LE WALLET, PAS LE PORTEFEUILLE. Il s'intitulait
                « Votre portefeuille » et son lien menait à /portfolio — les
                placements réels saisis à la main — alors que le solde, le
                résultat et les positions affichés viennent tous de
                walletAPI, c'est-à-dire du compte d'entraînement.
                « Voir le détail » ouvrait donc un autre compte que celui
                qu'on venait de lire. C'est la confusion Wallet / Portefeuille
                sous sa forme la plus coûteuse : sur l'écran d'accueil, et
                sur un chiffre d'argent. */}
            <Panel
              title="Votre wallet — simulation"
              className="h-full"
              aside={
                <button
                  onClick={refresh}
                  disabled={refreshing}
                  className="flex items-center gap-1.5 text-[0.8rem] transition-colors hover:text-[color:var(--cap-ink)] disabled:opacity-50"
                  style={{ color: "var(--cap-ink-3)" }}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                  Actualiser
                </button>
              }
              action={{ label: "Ouvrir le wallet", href: "/wallet" }}
            >
              <Num className="text-[clamp(1.9rem,4vw,2.5rem)] font-medium leading-none">
                {money(equity)}
              </Num>
              <Text size="caption" className="mt-2">Valeur totale</Text>

              <div
                className="mt-5 grid grid-cols-3 gap-4 border-t pt-4"
                style={{ borderColor: "var(--cap-line)" }}
              >
                <Figure
                  value={`${pnl >= 0 ? "+" : ""}${money(pnl)}`}
                  label={`${pnl >= 0 ? "+" : ""}${pnlPct.toFixed(1)} %`}
                  tone={pnl >= 0 ? "up" : "down"}
                />
                <Figure
                  value={String(positions.length)}
                  label={positions.length > 1 ? "positions" : "position"}
                />
                <Figure
                  value={stats && stats.total_trades > 0 ? `${stats.win_rate.toFixed(0)} %` : "—"}
                  label={
                    stats && stats.total_trades > 0
                      ? `sur ${stats.total_trades} trades`
                      : "aucun trade"
                  }
                />
              </div>

              {positions.length > 0 && (
                <div className="mt-5 border-t pt-2" style={{ borderColor: "var(--cap-line)" }}>
                  <DataList>
                    {positions.slice(0, 3).map((p) => (
                      <DataRow
                        key={p.id}
                        // Une position OUVERTE se consulte dans le wallet.
                        // Elle menait à /trading, l'écran qui sert à en
                        // ouvrir une nouvelle : cliquer sur ce qu'on possède
                        // déjà proposait d'acheter autre chose.
                        href="/wallet"
                        label={p.symbol}
                        sub={`${p.direction === "LONG" ? "Achat" : "Vente"} · ${money(p.amount)}`}
                        change={
                          p.unrealized_pnl != null && p.amount
                            ? (p.unrealized_pnl / p.amount) * 100
                            : null
                        }
                      />
                    ))}
                  </DataList>
                </div>
              )}
            </Panel>
          </Reveal>

          <Reveal delay={0.12} className={goal === "suivre" ? "order-1" : "order-2"}>
            <Panel
              title="Vos actifs"
              hint={favorites.length > 0 ? "Variation depuis la clôture précédente." : undefined}
              className="h-full"
              action={favorites.length > 0 ? { label: "Tous les favoris", href: "/favorites" } : undefined}
            >
              {favorites.length === 0 ? (
                <EmptyState
                  title="Aucun actif suivi"
                  description="Ajoutez ceux que vous voulez garder à l'œil — ils apparaîtront ici chaque jour."
                  action={{ label: "Chercher un actif", href: "/analysis" }}
                />
              ) : (
                <DataList>
                  {favorites.slice(0, 6).map((f) => (
                    <DataRow
                      key={f.symbol}
                      href={`/analysis?symbol=${encodeURIComponent(f.symbol)}`}
                      label={f.symbol}
                      value={money(f.price)}
                      change={f.change}
                    />
                  ))}
                </DataList>
              )}
            </Panel>
          </Reveal>
        </div>

        {/* ── 5. Le démarrage guidé et le parcours ─────────────────────── */}
        <Reveal delay={0.16} className={goal === "comprendre" ? "order-first" : ""}>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <FirstSteps
              analysed={favorites.length > 0 || positions.length > 0 || journalCount > 0}
              hasFavorite={favorites.length > 0}
              hasPosition={positions.length > 0 || (stats?.total_trades ?? 0) > 0}
              hasJournal={journalCount > 0}
            />
            <Panel
              title="Continuer le parcours"
              hint="Court, concret, et toujours reprenable là où vous l'avez laissé."
              action={{ label: "Ouvrir le parcours", href: "/learn" }}
            >
              <Text size="small">
                Les bases, puis les indicateurs, puis la gestion du risque —
                dans cet ordre, parce que chacun n&apos;a de sens qu&apos;avec
                le précédent.
              </Text>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Lire un graphique", "Tendance et momentum", "Dimensionner une position"].map((c) => (
                  <span
                    key={c}
                    className="rounded-[9px] px-2.5 py-1.5 text-[0.8rem]"
                    style={{ backgroundColor: "var(--cap-surface-2)", color: "var(--cap-ink-2)" }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </Panel>
          </div>
        </Reveal>
      </div>
    </>
  );
}

/* ── Bits ─────────────────────────────────────────────────────────────────── */

function Figure({
  value,
  label,
  tone = "ink",
}: {
  value: string;
  label: string;
  tone?: "ink" | "up" | "down";
}) {
  return (
    <div className="min-w-0">
      <Num tone={tone} className="block truncate text-[1.05rem] font-medium leading-none">
        {value}
      </Num>
      <span className="mt-1.5 block truncate text-[0.76rem]" style={{ color: "var(--cap-ink-3)" }}>
        {label}
      </span>
    </div>
  );
}

/**
 * The ambient-animation switch.
 *
 * It names the weather before offering to stop it, because a background
 * nobody can interpret is just movement. And it lives on the screen rather
 * than in a settings page three navigations away: someone who finds it
 * distracting should be able to end it the moment they notice.
 */
function WeatherToggle({
  on,
  onChange,
  label,
  hasData,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hasData: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {on && (
        <span
          className="flex items-center gap-1.5 text-[0.82rem]"
          style={{ color: "var(--cap-ink-2)" }}
          title={
            hasData
              ? "Le ciel reflète la tendance moyenne de vos actifs suivis."
              : "Suivez des actifs pour que le ciel reflète leur tendance."
          }
        >
          <Sun className="h-3.5 w-3.5" />
          {label}
        </span>
      )}
      {/* L'ENTRÉE DIRECTE VERS LES MARCHÉS. L'accueil parlait déjà du climat
          des marchés — c'est ce que le ciel raconte — mais aucun lien ne
          menait à l'écran qui l'explique : il fallait ouvrir le menu
          « Analyser » et descendre au troisième élément. Le mettre ici le
          place à côté de la seule chose de cette page qui parle de l'état
          général, plutôt que dans un menu dédié à l'étude d'une valeur. */}
      <Link
        href="/markets"
        className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-[0.82rem] transition-colors hover:bg-[color:var(--cap-surface-2)]"
        style={{ color: "var(--cap-ink-2)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}
      >
        <Globe2 className="h-3.5 w-3.5" />
        Les marchés
      </Link>
      <button
        onClick={() => onChange(!on)}
        className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-[0.82rem] transition-colors hover:bg-[color:var(--cap-surface-2)]"
        style={{ color: "var(--cap-ink-2)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}
      >
        {on ? <CloudOff className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
        {on ? "Couper les animations" : "Réactiver les animations"}
      </button>
    </div>
  );
}

/* ── The recommendation ───────────────────────────────────────────────────── */

/**
 * Exactly one suggestion, chosen from what the account actually is.
 *
 * It must be doable in one click and must change as the account changes: an
 * empty account gets "pick something to look at", one with open positions gets
 * pointed at them, an established one gets the engine's pick of the day. A
 * recommendation that says the same thing every morning stops being read by
 * the third one.
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
    const picked = (intent as unknown as { assets?: { symbol: string }[] })?.assets?.[0];

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
        body: "Vous le suivez déjà — voyez ce que le moteur en dit, et pourquoi.",
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
      className="relative overflow-hidden p-6 sm:p-8"
      style={{
        borderRadius: "var(--cap-r-xl)",
        backgroundColor: "var(--cap-navy)",
        color: "#E8EDF1",
      }}
    >
      <div className="flex items-center gap-2.5">
        <Waypoint size={11} tone="amber" />
        <span
          className="text-[0.72rem] font-medium uppercase tracking-[0.15em]"
          style={{ color: "rgba(232,237,241,0.62)" }}
        >
          {suggestion.eyebrow}
        </span>
      </div>

      {/* Inverted on purpose: one dark block on a light page is what makes the
          single recommendation impossible to scroll past. */}
      <h2
        className="mt-3.5 max-w-[30rem] text-[clamp(1.35rem,2.6vw,1.9rem)] font-semibold leading-[1.15] tracking-[-0.02em]"
        style={{ fontFamily: "var(--cap-font-display)" }}
      >
        {suggestion.title}
      </h2>
      <p
        className="mt-3 max-w-[34rem] text-[0.92rem] leading-[1.6]"
        style={{ color: "rgba(232,237,241,0.72)" }}
      >
        {suggestion.body}
      </p>

      <div className="mt-6">
        <Link
          href={suggestion.href}
          className="inline-flex h-11 items-center gap-2 rounded-[10px] px-5 text-[0.925rem] font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#F2F5F7", color: "var(--cap-navy)" }}
        >
          {suggestion.cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
