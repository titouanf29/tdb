"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CloudOff, Globe2, RefreshCw, Sun } from "lucide-react";
import { Intention } from "@/components/dashboard/Intention";
import { lundiAPreparer, weekendOuvert } from "@/lib/semaine";
import { useAuth } from "@/lib/AuthContext";
import { fr, useSettings, convertCurrency } from "@/lib/SettingsContext";
import { useTradingStyle } from "@/lib/tradingStyle";
import {
  dailyIntentAPI, favoritesAPI, journalAPI, walletAPI,
  type DailyIntentResult, type Favorite, type Position,
  type TradingStats, type WalletBalance,
} from "@/lib/api";
import {
  Button, CloudCurtain, DataList, DataRow, EmptyState, Heading, MotsApp, Nimbo, Num, Panel,
  Reveal, Text, Waypoint, WeatherBackdrop, WEATHER_LABEL,
  conditionFromChange, useAnimationsEnabled,
} from "@/components/design-system";
import { NuageImage } from "@/components/design-system/NuageImage";
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
  // Le solde compte jusqu'à sa valeur à l'arrivée, puis suit ses mises à jour.
  const equityAffichee = useCompteur(equity, animOn);
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
            <div className="flex items-center gap-4">
            {/* Nimbo suit le ciel de l'accueil, qui suit les actifs suivis :
                il salue sous un ciel dégagé, reste serein quand c'est couvert,
                devient prudent quand le ciel est bas. */}
            <Nimbo
              humeur={condition === "clear" || condition === "fair" ? "salue"
                : condition === "cloudy" ? "content" : "prudent"}
              taille={72}
              className="hidden sm:inline-flex"
            />
            <div>
              <Heading level={1}>
                <MotsApp texte={`${greeting}${first ? `, ${first}` : ""}.`} delai={0.4} />
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
                  className="-my-2 flex min-h-[44px] items-center gap-1.5 px-1 text-[0.8rem] transition-colors hover:text-[color:var(--cap-ink)] disabled:opacity-50"
                  style={{ color: "var(--cap-ink-3)" }}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                  Actualiser
                </button>
              }
              action={{ label: "Ouvrir le wallet", href: "/wallet" }}
            >
              <Num className="text-[clamp(1.9rem,4vw,2.5rem)] font-medium leading-none">
                {money(equityAffichee)}
              </Num>
              <Text size="caption" className="mt-2">Valeur totale</Text>

              <div
                className="cap-liste mt-5 grid grid-cols-3 gap-4 border-t pt-4"
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

        {/* ── 4 bis. L'intention du jour et la semaine qui vient ─────────
            Deux panneaux que la refonte avait laissés derrière elle. Celui de
            l'intention fermait une boucle ouverte : l'accueil LISAIT déjà
            l'intention pour composer sa recommandation, mais plus aucun écran
            ne permettait de l'écrire — elle était donc toujours vide. Celui
            de la semaine affichait un briefing que le serveur continuait de
            générer chaque dimanche pour personne.

            Les deux s'effacent quand ils n'ont rien à dire : la préparation
            hebdomadaire hors de sa fenêtre, l'intention avant sa réponse si
            le serveur ne répond pas. */}
        <Reveal delay={0.14}>
          {/* L'ancien panneau « La semaine qui vient » a été remplacé par la
              préparation du week-end : ses niveaux et ses rendez-vous étaient
              écrits par un modèle de langage, sans source. */}
          <Intention />
        </Reveal>

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
              <div className="cap-liste mt-4 flex flex-wrap gap-2">
                {["Lire un graphique", "Tendance et momentum", "Dimensionner une position"].map((c) => (
                  <span
                    key={c}
                    className="cap-puce rounded-[9px] px-2.5 py-1.5 text-[0.8rem]"
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

/**
 * Un nombre qui va jusqu'à sa valeur au lieu d'y sauter : de zéro à
 * l'arrivée, puis de l'ancienne valeur à la nouvelle quand elle change.
 * Animations coupées ou mouvement réduit : la valeur, tout de suite.
 */
function useCompteur(cible: number, actif: boolean): number {
  const [v, setV] = useState(actif ? 0 : cible);
  const depuis = useRef(0);
  useEffect(() => {
    const reduit = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!actif || reduit) { setV(cible); depuis.current = cible; return; }
    const debut = performance.now(), a = depuis.current, duree = 1100;
    let raf = 0;
    const pas = (t: number) => {
      const k = Math.min(1, (t - debut) / duree);
      const val = a + (cible - a) * (1 - Math.pow(1 - k, 3));
      setV(val); depuis.current = val;
      if (k < 1) raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [cible, actif]);
  return v;
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
    /* `flex-wrap` et `whitespace-nowrap` vont ensemble : sur 390 px, les deux
       boutons et la météo ne tiennent pas sur une ligne, et sans consigne le
       navigateur coupait À L'INTÉRIEUR des libellés — « Les / marchés ».
       Un libellé de bouton ne se coupe pas ; c'est la rangée qui passe à la
       ligne. */
    <div className="flex flex-wrap items-center gap-2">
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
        className="flex items-center gap-2 whitespace-nowrap rounded-[10px] px-3 py-2 text-[0.82rem] transition-colors hover:bg-[color:var(--cap-surface-2)]"
        style={{ color: "var(--cap-ink-2)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}
      >
        <Globe2 className="h-3.5 w-3.5" />
        Les marchés
      </Link>
      <button
        onClick={() => onChange(!on)}
        className="flex items-center gap-2 whitespace-nowrap rounded-[10px] px-3 py-2 text-[0.82rem] transition-colors hover:bg-[color:var(--cap-surface-2)]"
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

    /* Le nom, jamais le code. « Analysez CL=F » demandait au lecteur de
       savoir que CL=F est le brut WTI — c'est-à-dire de connaître la
       nomenclature Yahoo. Le serveur rend maintenant le nom avec les favoris
       et les positions ; le code reste pour l'URL, où il est à sa place. */
    const nommer = (o: { symbol: string; name?: string }) => o.name || o.symbol;

    /* LE WEEK-END, UNE AUTRE QUESTION. « Il fait −1,47 % aujourd'hui » parle
       d'une séance qui n'existe pas : marchés fermés, la seule chose utile est
       de préparer lundi. La carte ouvre alors l'espace dédié, qui n'est
       accessible que d'ici. */
    if (weekendOuvert()) {
      const sansStop = positions.filter((p) => p.stop_loss == null && p.instrument !== "turbo").length;
      const crypto = positions.filter((p) => /-(USD|EUR)$/.test(p.symbol)).length;
      const corps =
        sansStop > 0
          ? `${sansStop} de vos positions ${sansStop > 1 ? "restent" : "reste"} sans stop pendant le week-end. On commence par là, puis votre semaine, l'agenda macro et l'actualité de vos actifs.`
          : positions.length > 0
            ? `Vous gardez ${positions.length} position${positions.length > 1 ? "s" : ""} ce week-end${crypto ? `, dont ${crypto} en crypto qui continue${crypto > 1 ? "nt" : ""} de coter` : ""}. Votre semaine, l'agenda macro et l'actualité de vos actifs, au même endroit.`
            : favorites.length > 0
              ? `Ce qu'ont fait vos ${favorites.length} actifs suivis, les annonces économiques qui arrivent et l'actualité qui les touche.`
              : "Votre semaine, les annonces économiques qui arrivent et l'actualité des marchés, pendant qu'aucune séance ne vous presse.";
      return {
        eyebrow: "Le week-end",
        title: `Préparez la semaine du ${lundiAPreparer()}.`,
        body: corps,
        cta: "Ouvrir la préparation",
        href: "/semaine",
      };
    }

    if (positions.length > 0) {
      /* CELLE QUI MÉRITE LE REGARD, PAS LA PREMIÈRE DE LA LISTE.
         L'écran pointait `positions[0]` — l'ordre de création — et disait la
         même phrase tous les jours. Une position qui approche son stop et une
         position tranquille ne demandent pas la même attention.

         L'urgence se mesure : la distance au stop ou à l'objectif, en part du
         chemin parcouru depuis l'entrée. À 80 % du chemin, la question n'est
         plus « est-ce que le scénario tient » mais « qu'est-ce que je fais
         maintenant ». */
      const chemin = (p: Position) => {
        const prix = p.current_price;
        if (prix == null || !p.entry_price) return null;
        const cible = p.direction === "LONG" ? p.take_profit : p.stop_loss;
        const inverse = p.direction === "LONG" ? p.stop_loss : p.take_profit;
        const bornes = [cible, inverse].filter((v): v is number => v != null);
        if (!bornes.length) return null;
        // La borne la plus proche, et la part du trajet déjà faite vers elle.
        let meilleur: { vers: "stop" | "objectif"; part: number } | null = null;
        for (const b of bornes) {
          const total = Math.abs(b - p.entry_price);
          if (total <= 0) continue;
          const fait = Math.abs(prix - p.entry_price);
          const bonSens = (prix - p.entry_price) * (b - p.entry_price) > 0;
          if (!bonSens) continue;
          const part = Math.min(1, fait / total);
          const vers = b === p.take_profit ? "objectif" : "stop";
          if (!meilleur || part > meilleur.part) meilleur = { vers, part };
        }
        return meilleur;
      };

      const classees = positions
        .map((p) => ({ p, c: chemin(p) }))
        .sort((a, b) => (b.c?.part ?? -1) - (a.c?.part ?? -1));
      const { p, c } = classees[0];
      const pct = p.pnl_percent;

      const corps =
        c && c.part >= 0.7
          ? `Le cours a parcouru ${Math.round(c.part * 100)} % de la distance qui sépare votre entrée de votre ${c.vers}. C'est le moment de décider, pas de subir.`
          : pct != null && Math.abs(pct) >= 3
            ? `Elle est à ${pct >= 0 ? "+" : ""}${fr(pct, 1)} % depuis l'entrée. Vérifiez que le scénario tient encore, et que le stop est toujours au bon endroit.`
            : "Rien d'urgent dessus aujourd'hui. Relisez quand même le scénario d'entrée : c'est ce qui vous dira quand sortir.";

      return {
        eyebrow: "Votre prochaine étape",
        title: `Revoyez votre position sur ${nommer(p)}.`,
        body: corps,
        cta: "Ouvrir le wallet",
        // /trading sert à OUVRIR une position. Envoyer quelqu'un y relire
        // celles qu'il a déjà lui proposait d'en acheter une autre.
        href: "/wallet",
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
      /* CELUI QUI A BOUGÉ, PAS LE PREMIER AJOUTÉ.
         « Vous le suivez déjà — voyez ce que le moteur en dit » ne donnait
         aucune raison de cliquer AUJOURD'HUI plutôt qu'hier, et désignait
         toujours le même actif. La variation du jour en donne une, et elle
         change toute seule d'un matin à l'autre. */
      const lisibles = favorites.filter((f) => !f.error && Number.isFinite(f.change));
      const bouge = [...lisibles].sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];
      const f = bouge ?? favorites[0];
      const v = bouge?.change;

      const corps =
        v != null && Math.abs(v) >= 1.5
          ? `Il fait ${v >= 0 ? "+" : ""}${fr(v, 2)} % aujourd'hui — le plus gros mouvement parmi vos actifs suivis. Voyez si le moteur y lit quelque chose.`
          : v != null && Math.abs(v) >= 0.4
            ? `Il fait ${v >= 0 ? "+" : ""}${fr(v, 2)} % aujourd'hui. Voyez ce que le moteur en dit, et surtout pourquoi.`
            : "Séance calme sur vos actifs suivis. C'est le bon moment pour lire une analyse sans avoir de décision à prendre dans la foulée.";

      return {
        eyebrow: "Votre prochaine étape",
        title: `Analysez ${nommer(f)}.`,
        body: corps,
        cta: "Voir l'analyse",
        href: `/analysis?symbol=${encodeURIComponent(f.symbol)}`,
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
      {/* Le ciel, vu de nuit : deux nuages qui passent en transparence et un
          reflet qui balaie la carte de temps en temps. Décor pur, derrière le
          texte, en CSS (AnimationsApp). */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="cap-carte-nuage absolute left-0 top-[-12%] w-[46%] opacity-[0.07]" style={{ ["--t" as string]: "52s" }}>
          <NuageImage forme={0} flou={5} style={{ width: "100%" }} />
        </div>
        <div className="cap-carte-nuage absolute left-0 bottom-[-22%] w-[34%] opacity-[0.05]" style={{ ["--t" as string]: "68s", ["--d" as string]: "-30s" }}>
          <NuageImage forme={2} retourne flou={5} style={{ width: "100%" }} />
        </div>
        <div className="cap-carte-reflet absolute inset-y-0 left-0 w-1/3"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)" }} />
      </div>

      <div className="relative flex items-center gap-2.5">
        <span className="relative inline-flex">
          <span aria-hidden className="cap-app-onde absolute inset-0 rounded-full" style={{ boxShadow: "0 0 0 1.5px var(--cap-amber)" }} />
          <Waypoint size={11} tone="amber" />
        </span>
        <span
          className="text-[0.75rem] font-medium uppercase tracking-[0.15em]"
          style={{ color: "rgba(232,237,241,0.62)" }}
        >
          {suggestion.eyebrow}
        </span>
      </div>

      {/* Inverted on purpose: one dark block on a light page is what makes the
          single recommendation impossible to scroll past. */}
      <h2
        className="relative mt-3.5 max-w-[30rem] text-[clamp(1.35rem,2.6vw,1.9rem)] font-semibold leading-[1.15] tracking-[-0.02em]"
        style={{ fontFamily: "var(--cap-font-display)" }}
      >
        {suggestion.title}
      </h2>
      <p
        className="relative mt-3 max-w-[34rem] text-[0.92rem] leading-[1.6]"
        style={{ color: "rgba(232,237,241,0.72)" }}
      >
        {suggestion.body}
      </p>

      <div className="relative mt-6">
        <Link
          href={suggestion.href}
          className="inline-flex h-11 items-center gap-2 rounded-[10px] px-5 text-[0.925rem] font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#F2F5F7", color: "var(--cap-navy)" }}
        >
          {suggestion.cta}
          <ArrowRight className="cap-fleche h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
