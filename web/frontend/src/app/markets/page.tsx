"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, RefreshCw, Search, Star } from "lucide-react";
import { marketAPI, favoritesAPI, type Asset, type Market } from "@/lib/api";
import { MARKET_SYMBOLS } from "@/lib/marketSymbols";
import { getAssetInfo } from "@/lib/assetInfo";
import { authHeaders } from "@/lib/auth";
import { isMarketOpen, getMarketHoursDisplay, getTimeUntilChange } from "@/lib/marketStatus";
import { useFormatPrice, useSettings } from "@/lib/SettingsContext";
import { usePremium } from "@/lib/PremiumContext";
import { useUserLevel } from "@/hooks/useUserLevel";
import { formatVolume } from "@/lib/utils";
import {
  Button, CloudCurtain, EmptyState, Heading, Num, Panel, SegmentedControl,
  Text, WeatherBackdrop, conditionFromChange, useAnimationsEnabled,
} from "@/components/design-system";
import { BreadthBar, MoveBars, type Move } from "@/components/markets/Breadth";

/**
 * The markets screen — the state of the world, before any single asset.
 *
 * The old screen opened on a six-column table of twenty rows and a pair of
 * boxes full of logos. That is a data dump: it shows everything and ranks
 * nothing, so the reader has to do the ranking, which is the part they came
 * here to have done for them.
 *
 * This one answers three questions in order, one per compartment:
 *
 *   1. Où ça bouge ?      the six places, each with its breadth in one bar
 *   2. Quel temps ?       the selected market's day, in a sentence and bars
 *   3. Quoi précisément ? the list, only then, and only as wide as needed
 *
 * The level chooses how much of that is shown. It is not a paywall and not a
 * "mode débutant" that hides the truth — every level sees the same figures.
 * What changes is how many of them arrive at once, and whether they come with
 * a sentence explaining what they mean.
 */

type Depth = "discover" | "intermediate" | "advanced";

const DEPTHS: { value: Depth; label: string }[] = [
  { value: "discover", label: "Découverte" },
  { value: "intermediate", label: "Intermédiaire" },
  { value: "advanced", label: "Avancé" },
];

const PAGE_SIZE = 20;

const FREE_INTERVALS = [
  { value: "0", label: "Manuel" },
  { value: "600000", label: "10 min" },
  { value: "1800000", label: "30 min" },
];
const PREMIUM_INTERVALS = [
  { value: "0", label: "Manuel" },
  { value: "60000", label: "1 min" },
  { value: "300000", label: "5 min" },
  { value: "1800000", label: "30 min" },
];

/** What each place is, in the words of someone who does not work in finance. */
const PLACE_BLURB: Record<string, string> = {
  USA: "Wall Street — les plus grandes capitalisations mondiales.",
  EUROPE: "Paris, Francfort, Londres et les grandes valeurs européennes.",
  ASIA: "Tokyo, Hong Kong, Séoul.",
  CRYPTO: "Ouvert en permanence, week-ends compris.",
  FOREX: "Les paires de devises, cotées en continu du dimanche soir au vendredi.",
  COMMODITIES: "Or, argent, pétrole, gaz et matières agricoles.",
};

interface Pulse {
  up: number;
  down: number;
  flat: number;
  avg: number;
  moves: Move[];
}

type SortKey = "rank" | "move" | "alpha";

export default function MarketsPage() {
  const router = useRouter();
  const formatPrice = useFormatPrice();
  const { settings, setCurrency } = useSettings();
  const { isPremium, isAdmin } = usePremium();
  const level = useUserLevel();
  const [animOn] = useAnimationsEnabled();

  // The level sets the starting depth; the control above the list overrides it.
  // Someone who called themselves a beginner six months ago should not have to
  // edit their profile to see a volume column.
  const [depth, setDepth] = useState<Depth>(
    level.level === "expert" ? "advanced" : level.level === "intermediate" ? "intermediate" : "discover"
  );
  const [depthTouched, setDepthTouched] = useState(false);
  useEffect(() => {
    if (depthTouched) return;
    setDepth(
      level.level === "expert" ? "advanced" : level.level === "intermediate" ? "intermediate" : "discover"
    );
  }, [level.level, depthTouched]);

  const [markets, setMarkets] = useState<Market[]>([]);
  const [selected, setSelected] = useState("");
  const [pulse, setPulse] = useState<Record<string, Pulse>>({});
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ symbol: string; name: string; exchange: string }[]>([]);
  const [searching, setSearching] = useState(false);

  const [sort, setSort] = useState<SortKey>("rank");
  const [interval, setIntervalMs] = useState("0");

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervals = isPremium || isAdmin ? PREMIUM_INTERVALS : FREE_INTERVALS;

  /* ── The six places ─────────────────────────────────────────────────────── */

  useEffect(() => {
    marketAPI.getMarkets()
      .then((d) => {
        setMarkets(d.markets);
        if (d.markets.length) setSelected(d.markets[0].key);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    favoritesAPI.getFavorites()
      .then((d) => setFavorites(new Set((d.favorites || []).map((f) => f.symbol))))
      .catch(() => {});
  }, []);

  /**
   * Breadth for every market at once.
   *
   * One request per place rather than one for everything: the endpoint caps at
   * fifty symbols and the six lists total sixty-two, so a single call would
   * silently drop the last market. allSettled, because one slow exchange must
   * not leave the other five blank.
   */
  useEffect(() => {
    let cancelled = false;
    const keys = Object.keys(MARKET_SYMBOLS);

    Promise.allSettled(
      keys.map((k) => marketAPI.getPrices(MARKET_SYMBOLS[k]).then((d) => [k, d.prices] as const))
    ).then((settled) => {
      if (cancelled) return;
      const next: Record<string, Pulse> = {};
      for (const r of settled) {
        if (r.status !== "fulfilled") continue;
        const [key, prices] = r.value;
        const moves: Move[] = [];
        let up = 0, down = 0, flat = 0, sum = 0, n = 0;
        for (const sym of MARKET_SYMBOLS[key]) {
          const p = prices[sym];
          if (!p || typeof p.change !== "number") continue;
          n += 1;
          sum += p.change;
          if (p.change > 0.05) up += 1;
          else if (p.change < -0.05) down += 1;
          else flat += 1;
          const info = getAssetInfo(sym);
          moves.push({ symbol: sym, name: info?.name && info.name !== sym ? info.name : sym, change: p.change });
        }
        if (n === 0) continue;
        moves.sort((a, b) => b.change - a.change);
        next[key] = {
          up, down, flat,
          avg: sum / n,
          // The three best and the three worst — the edges of the day, which
          // is what a spread is made of.
          moves: moves.length > 6 ? [...moves.slice(0, 3), ...moves.slice(-3)] : moves,
        };
      }
      setPulse(next);
    });

    return () => { cancelled = true; };
  }, []);

  /* ── The list for the selected place ────────────────────────────────────── */

  const loadAssets = useCallback(async (key: string) => {
    setLoadingAssets(true);
    setAssets([]);
    try {
      const d = await marketAPI.getAssets(key, PAGE_SIZE, 0);
      setAssets(d.assets);
      setTotal(d.total);
      const symbols = d.assets.map((a) => a.symbol);
      if (symbols.length) {
        const priced = await marketAPI.getPrices(symbols).catch(() => null);
        if (priced) {
          setAssets((prev) =>
            prev.map((a) => {
              const p = priced.prices[a.symbol];
              return p ? { ...a, price: p.price, change: p.change, volume: p.volume } : a;
            })
          );
        }
      }
    } catch {
      /* the panel shows its empty state */
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  useEffect(() => {
    if (selected) loadAssets(selected);
  }, [selected, loadAssets]);

  const refreshPrices = useCallback(async () => {
    if (!assets.length) return;
    setRefreshing(true);
    try {
      const d = await marketAPI.getPrices(assets.map((a) => a.symbol));
      setAssets((prev) =>
        prev.map((a) => {
          const p = d.prices[a.symbol];
          return p ? { ...a, price: p.price, change: p.change, volume: p.volume } : a;
        })
      );
    } catch {
      /* keep what is on screen */
    } finally {
      setRefreshing(false);
    }
  }, [assets]);

  useEffect(() => {
    const ms = Number(interval);
    if (!ms) return;
    const id = setInterval(refreshPrices, ms);
    return () => clearInterval(id);
  }, [interval, refreshPrices]);

  const loadMore = async () => {
    if (loadingMore || assets.length >= total) return;
    setLoadingMore(true);
    try {
      const d = await marketAPI.getAssets(selected, PAGE_SIZE, assets.length);
      setAssets((prev) => [...prev, ...d.assets]);
      const symbols = d.assets.map((a) => a.symbol);
      if (symbols.length) {
        const priced = await marketAPI.getPrices(symbols).catch(() => null);
        if (priced) {
          setAssets((prev) =>
            prev.map((a) => {
              const p = priced.prices[a.symbol];
              return p ? { ...a, price: p.price, change: p.change, volume: p.volume } : a;
            })
          );
        }
      }
    } catch {
      /* nothing is appended */
    } finally {
      setLoadingMore(false);
    }
  };

  /* ── Search ─────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`, {
          headers: authHeaders() as HeadersInit,
        });
        if (res.ok) setResults((await res.json()).results || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query]);

  const toggleFavorite = async (symbol: string) => {
    const has = favorites.has(symbol);
    setFavorites((f) => {
      const n = new Set(f);
      has ? n.delete(symbol) : n.add(symbol);
      return n;
    });
    try {
      has ? await favoritesAPI.removeFavorite(symbol) : await favoritesAPI.addFavorite(symbol);
    } catch {
      setFavorites((f) => {
        const n = new Set(f);
        has ? n.add(symbol) : n.delete(symbol);
        return n;
      });
    }
  };

  /* ── Derived ────────────────────────────────────────────────────────────── */

  const openCount = markets.filter((m) => isMarketOpen(m.key)).length;
  const here = pulse[selected];
  const market = markets.find((m) => m.key === selected);

  const globalAvg = useMemo(() => {
    const vals = Object.values(pulse).map((p) => p.avg);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }, [pulse]);

  const sorted = useMemo(() => {
    const list = [...assets];
    if (sort === "move") return list.sort((a, b) => (b.change ?? 0) - (a.change ?? 0));
    if (sort === "alpha") return list.sort((a, b) => a.symbol.localeCompare(b.symbol));
    return list;
  }, [assets, sort]);

  const searchMode = query.trim().length >= 2;

  if (loading) return <CloudCurtain active label="Chargement des marchés" />;

  return (
    <>
      <WeatherBackdrop condition={conditionFromChange(globalAvg)} enabled={animOn} />

      <div className="relative space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-5 pt-2">
          <div className="min-w-0">
            <Heading level={1}>Marchés</Heading>
            <Text className="mt-2.5 max-w-[36rem]">
              {openCount === 0
                ? "Toutes les places sont fermées pour le moment — les chiffres ci-dessous datent de la dernière séance."
                : `${openCount} place${openCount > 1 ? "s" : ""} ouverte${openCount > 1 ? "s" : ""} sur ${markets.length}.`}{" "}
              {globalAvg == null
                ? "Le climat du jour s'affiche dès que les cours sont chargés."
                : globalAvg > 0.25
                  ? "Dans l'ensemble, ça monte."
                  : globalAvg < -0.25
                    ? "Dans l'ensemble, ça baisse."
                    : "Dans l'ensemble, la journée est calme."}
            </Text>
          </div>
          <SegmentedControl
            size="sm"
            options={DEPTHS}
            value={depth}
            onChange={(d) => { setDepth(d); setDepthTouched(true); }}
            aria-label="Niveau de détail"
          />
        </header>

        {/* ── 1. Où ça bouge ─────────────────────────────────────────────── */}
        <Panel
          title="Les places"
          hint="Chaque barre montre la part des valeurs suivies qui monte et celle qui baisse."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {markets.map((m) => {
              const p = pulse[m.key];
              const open = isMarketOpen(m.key);
              const active = selected === m.key;
              const until = getTimeUntilChange(m.key);
              return (
                <button
                  key={m.key}
                  onClick={() => setSelected(m.key)}
                  aria-pressed={active}
                  className="rounded-[12px] p-4 text-left transition-colors"
                  style={{
                    backgroundColor: active ? "var(--cap-surface-2)" : "transparent",
                    boxShadow: active
                      ? "inset 0 0 0 1px var(--cap-ocean)"
                      : "inset 0 0 0 1px var(--cap-line)",
                  }}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className="min-w-0 truncate text-[0.95rem] font-medium"
                      style={{ color: "var(--cap-ink)" }}
                    >
                      {m.name}
                    </span>
                    {p && (
                      <Num tone={p.avg >= 0 ? "up" : "down"} className="shrink-0 text-[0.85rem]">
                        {p.avg >= 0 ? "+" : ""}
                        {p.avg.toFixed(2)} %
                      </Num>
                    )}
                  </div>

                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: open ? "var(--cap-up)" : "var(--cap-ink-4)" }}
                    />
                    <span className="text-[0.76rem]" style={{ color: "var(--cap-ink-3)" }}>
                      {open ? "Ouvert" : "Fermé"}
                      {until ? ` · ${until}` : ""}
                    </span>
                  </div>

                  <div className="mt-3">
                    {p ? (
                      <BreadthBar up={p.up} down={p.down} flat={p.flat} />
                    ) : (
                      <div className="h-[5px] w-full rounded-full" style={{ backgroundColor: "var(--cap-line)" }} />
                    )}
                  </div>

                  <div className="mt-2 text-[0.75rem]" style={{ color: "var(--cap-ink-3)" }}>
                    {p
                      ? `${p.up} en hausse · ${p.down} en baisse`
                      : `${m.asset_count} actifs`}
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        {/* ── 2. Quel temps il fait sur cette place ──────────────────────── */}
        {market && (
          <Panel
            title={`Le climat — ${market.name}`}
            hint={depth === "discover" ? PLACE_BLURB[market.key] : undefined}
            aside={
              depth !== "discover" ? (
                <span className="text-[0.76rem]" style={{ color: "var(--cap-ink-3)" }}>
                  {getMarketHoursDisplay(market.key)}
                </span>
              ) : undefined
            }
          >
            {!here ? (
              <Text size="small">Cours en cours de chargement…</Text>
            ) : (
              <div className="space-y-5">
                <Text>
                  {here.up > here.down * 1.5
                    ? `La hausse domine : ${here.up} valeurs sur ${here.up + here.down + here.flat} montent.`
                    : here.down > here.up * 1.5
                      ? `La baisse domine : ${here.down} valeurs sur ${here.up + here.down + here.flat} reculent.`
                      : "La séance est partagée — autant de hausses que de baisses, sans direction nette."}{" "}
                  {depth === "discover" &&
                    "Une séance partagée est normale ; c'est quand tout monte ou tout baisse ensemble qu'il se passe quelque chose."}
                </Text>

                {depth !== "discover" && (
                  <MoveBars items={here.moves} onSelect={(s) => router.push(`/analysis?symbol=${s}`)} />
                )}
              </div>
            )}
          </Panel>
        )}

        {/* ── 3. Le détail ───────────────────────────────────────────────── */}
        <Panel
          title={searchMode ? "Résultats de recherche" : "Les actifs"}
          hint={
            searchMode
              ? "Tous marchés confondus. Ouvrez-en un pour voir son analyse."
              : depth === "discover"
                ? "Cliquez sur une ligne pour ouvrir l'analyse complète de l'actif."
                : `${assets.length} sur ${total} chargés · cours Yahoo Finance, ~1 min de différé.`
          }
          aside={
            !searchMode && depth === "advanced" ? (
              <div className="flex items-center gap-2">
                <SegmentedControl
                  size="sm"
                  options={[
                    { value: "EUR", label: "€" },
                    { value: "USD", label: "$" },
                  ]}
                  value={settings.currency}
                  onChange={(c) => setCurrency(c as "EUR" | "USD")}
                  aria-label="Devise"
                />
                <button
                  onClick={refreshPrices}
                  disabled={refreshing}
                  aria-label="Actualiser les cours"
                  className="rounded-[9px] p-2 transition-colors hover:bg-[color:var(--cap-surface-2)] disabled:opacity-50"
                  style={{ color: "var(--cap-ink-3)" }}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </button>
              </div>
            ) : undefined
          }
        >
          <div className="relative">
            {searching ? (
              <Loader2
                className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin"
                style={{ color: "var(--cap-ink-4)" }}
              />
            ) : (
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "var(--cap-ink-4)" }}
              />
            )}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chercher un actif — Apple, BTC, LVMH…"
              aria-label="Chercher un actif"
              className="h-11 w-full rounded-[12px] pl-10 pr-3.5 text-[0.92rem] outline-none placeholder:text-[color:var(--cap-ink-4)]"
              style={{
                backgroundColor: "var(--cap-bg)",
                color: "var(--cap-ink)",
                boxShadow: "inset 0 0 0 1px var(--cap-line-strong)",
              }}
            />
          </div>

          {depth !== "discover" && !searchMode && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <SegmentedControl
                size="sm"
                options={[
                  { value: "rank", label: "Ordre du marché" },
                  { value: "move", label: "Mouvement" },
                  { value: "alpha", label: "A → Z" },
                ]}
                value={sort}
                onChange={setSort}
                aria-label="Tri"
              />
              {depth === "advanced" && (
                <div className="flex items-center gap-2">
                  <Text size="caption" as="span">Actualisation</Text>
                  <SegmentedControl
                    size="sm"
                    options={intervals}
                    value={interval}
                    onChange={setIntervalMs}
                    aria-label="Fréquence d'actualisation"
                  />
                </div>
              )}
            </div>
          )}

          <div className="mt-5">
            {searchMode ? (
              results.length === 0 && !searching ? (
                <EmptyState
                  title="Aucun résultat"
                  description={`Rien ne correspond à « ${query.trim()} ». Essayez le symbole exact — AAPL, BTC-USD, MC.PA.`}
                />
              ) : (
                <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
                  {results.map((r) => (
                    <li key={r.symbol}>
                      <AssetRow
                        symbol={r.symbol}
                        name={r.name}
                        sub={`${r.symbol} · ${r.exchange}`}
                        starred={favorites.has(r.symbol)}
                        onStar={() => toggleFavorite(r.symbol)}
                        onOpen={() => router.push(`/analysis?symbol=${r.symbol}`)}
                      />
                    </li>
                  ))}
                </ul>
              )
            ) : loadingAssets ? (
              <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
                {Array.from({ length: 8 }).map((_, i) => (
                  <li key={i} className="flex items-center justify-between gap-4 py-4">
                    <span
                      className="h-3.5 w-40 rounded"
                      style={{ backgroundColor: "var(--cap-surface-2)" }}
                    />
                    <span
                      className="h-3.5 w-20 rounded"
                      style={{ backgroundColor: "var(--cap-surface-2)" }}
                    />
                  </li>
                ))}
              </ul>
            ) : sorted.length === 0 ? (
              <EmptyState
                title="Aucun actif chargé"
                description="Ce marché n'a rien renvoyé. Réessayez dans un instant, ou choisissez une autre place."
              />
            ) : (
              <>
                <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
                  {sorted.map((a) => {
                    const info = getAssetInfo(a.symbol);
                    const name = a.name || (info?.name ?? a.symbol);
                    return (
                      <li key={a.symbol}>
                        <AssetRow
                          symbol={a.symbol}
                          name={name}
                          sub={
                            depth === "advanced" && !a.error && a.volume
                              ? `${a.symbol} · volume ${formatVolume(a.volume)}`
                              : a.symbol
                          }
                          price={!a.error && a.price ? formatPrice(a.price, a.symbol) : undefined}
                          change={!a.error && a.change !== 0 ? a.change : null}
                          starred={favorites.has(a.symbol)}
                          onStar={() => toggleFavorite(a.symbol)}
                          onOpen={() => router.push(`/analysis?symbol=${a.symbol}`)}
                        />
                      </li>
                    );
                  })}
                </ul>

                {assets.length < total && (
                  <div className="mt-5 flex justify-center">
                    <Button variant="secondary" size="md" onClick={loadMore} disabled={loadingMore}>
                      {loadingMore ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      {loadingMore ? "Chargement…" : `Voir ${Math.min(PAGE_SIZE, total - assets.length)} de plus`}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}

/**
 * One line of the list.
 *
 * The star is a real button beside the row rather than a sixth table column,
 * and it is always visible: the old one appeared on hover, which put it out of
 * reach on every phone and every keyboard.
 */
function AssetRow({
  symbol,
  name,
  sub,
  price,
  change,
  starred,
  onStar,
  onOpen,
}: {
  symbol: string;
  name: string;
  sub: string;
  price?: string;
  change?: number | null;
  starred: boolean;
  onStar: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="group flex items-center gap-2 py-1">
      <button
        onClick={onOpen}
        className="-mx-3 flex min-w-0 flex-1 items-center justify-between gap-4 rounded-[9px] px-3 py-2.5 text-left transition-colors hover:bg-[color:var(--cap-surface-2)]"
      >
        <span className="min-w-0">
          <span className="block truncate text-[0.93rem] font-medium" style={{ color: "var(--cap-ink)" }}>
            {name}
          </span>
          <span className="mt-0.5 block truncate text-[0.78rem]" style={{ color: "var(--cap-ink-3)" }}>
            {sub}
          </span>
        </span>
        <span className="flex shrink-0 items-baseline gap-4 sm:gap-6">
          {price ? (
            <Num className="text-[0.93rem]">{price}</Num>
          ) : (
            <span className="text-[0.8rem]" style={{ color: "var(--cap-ink-4)" }}>
              Voir l&apos;analyse
            </span>
          )}
          {change != null && (
            <Num tone={change >= 0 ? "up" : "down"} className="w-[4.5rem] text-right text-[0.88rem]">
              {change >= 0 ? "+" : ""}
              {change.toFixed(2)} %
            </Num>
          )}
        </span>
      </button>
      <button
        onClick={onStar}
        aria-label={starred ? `Ne plus suivre ${symbol}` : `Suivre ${symbol}`}
        aria-pressed={starred}
        className="shrink-0 rounded-[9px] p-2 transition-colors hover:bg-[color:var(--cap-surface-2)]"
        style={{ color: starred ? "var(--cap-amber)" : "var(--cap-ink-4)" }}
      >
        <Star className="h-4 w-4" fill={starred ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
