"use client";

import { formatCours } from "@/lib/devise";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { favoritesAPI, type Favorite } from "@/lib/api";
import { NotificationsAppareil } from "@/components/app/NotificationsAppareil";
import { fr, useSettings, convertCurrency } from "@/lib/SettingsContext";
import {
  Button, CloudCurtain, EmptyState, Field, FormError, Heading, Modal, Num,
  Panel, SegmentedControl, Text, TextInput, WeatherBackdrop,
  conditionFromChange, useAnimationsEnabled,
} from "@/components/design-system";

/**
 * The assets you follow.
 *
 * One list, sorted the way a watchlist is actually read — biggest mover
 * first — and one filter. The old screen offered a grid of cards with a star,
 * two trend icons and a refresh button per tile, which made eight assets look
 * like a dashboard of their own. A watchlist is a column you run your eye
 * down; anything that breaks the column slows that down.
 */

type SortKey = "move" | "alpha";

export default function FavoritesPage() {
  const { settings, eurUsd } = useSettings();
  const [animOn] = useAnimationsEnabled();

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState<SortKey>("move");

  const [adding, setAdding] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await favoritesAPI.getFavorites();
      setFavorites(d.favorites || []);
    } catch {
      /* the list simply stays as it was */
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

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;
    setError("");
    setBusy(true);
    try {
      await favoritesAPI.addFavorite(sym);
      setSymbol("");
      setAdding(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'ajouter cet actif.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (sym: string) => {
    setRemoving(sym);
    // Optimistic: the row goes immediately and comes back if the call fails.
    // A watchlist you have to wait on to prune is a watchlist you stop pruning.
    const before = favorites;
    setFavorites((f) => f.filter((x) => x.symbol !== sym));
    try {
      await favoritesAPI.removeFavorite(sym);
    } catch {
      setFavorites(before);
    } finally {
      setRemoving(null);
    }
  };

  const money = useCallback(
    (v: number) =>
      convertCurrency(v, "EUR", settings.currency, eurUsd).toLocaleString("fr-FR", {
        style: "currency",
        currency: settings.currency,
        maximumFractionDigits: 2,
      }),
    [settings.currency, eurUsd]
  );

  const sorted = useMemo(() => {
    const list = [...favorites];
    if (sort === "alpha") return list.sort((a, b) => a.symbol.localeCompare(b.symbol));
    return list.sort((a, b) => (b.change ?? 0) - (a.change ?? 0));
  }, [favorites, sort]);

  const avgChange = favorites.length
    ? favorites.reduce((a, f) => a + (f.change ?? 0), 0) / favorites.length
    : null;

  const up = favorites.filter((f) => (f.change ?? 0) > 0).length;
  const down = favorites.filter((f) => (f.change ?? 0) < 0).length;

  if (loading) return <CloudCurtain active label="Chargement de vos favoris" />;

  return (
    <>
      <WeatherBackdrop condition={conditionFromChange(avgChange)} enabled={animOn} />

      <div className="relative space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-5 pt-2">
          <div>
            <Heading level={1}>Vos actifs</Heading>
            <Text className="mt-2.5 max-w-[34rem]">
              {favorites.length === 0
                ? "Les actifs que vous suivez apparaîtront ici, avec leur variation du jour."
                : `${favorites.length} actif${favorites.length > 1 ? "s" : ""} suivi${favorites.length > 1 ? "s" : ""} — ${up} en hausse, ${down} en baisse.`}
            </Text>
          </div>
          <Button onClick={() => setAdding(true)} size="md">
            <Plus className="h-4 w-4" />
            Suivre un actif
          </Button>
        </header>

        {favorites.length > 0 && <NotificationsAppareil forme="invitation" />}

        <Panel
          title="Liste de suivi"
          hint={favorites.length > 0 ? "Variation depuis la clôture précédente." : undefined}
          aside={
            favorites.length > 0 ? (
              <div className="flex items-center gap-3">
                <SegmentedControl
                  size="sm"
                  options={[
                    { value: "move", label: "Mouvement" },
                    { value: "alpha", label: "A → Z" },
                  ]}
                  value={sort}
                  onChange={setSort}
                  aria-label="Tri"
                />
                <button
                  onClick={refresh}
                  disabled={refreshing}
                  aria-label="Actualiser"
                  className="rounded-[9px] p-2 transition-colors hover:bg-[color:var(--cap-surface-2)] disabled:opacity-50"
                  style={{ color: "var(--cap-ink-3)" }}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </button>
              </div>
            ) : undefined
          }
        >
          {favorites.length === 0 ? (
            <EmptyState
              title="Aucun actif suivi"
              description="Ajoutez une action, une crypto ou un indice — vous le retrouverez ici et sur votre accueil."
              action={{ label: "Suivre un actif", onClick: () => setAdding(true) }}
            />
          ) : (
            <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
              {sorted.map((f) => (
                <li key={f.symbol} className="group flex items-center gap-3 py-3">
                  <Link
                    href={`/analysis?symbol=${encodeURIComponent(f.symbol)}`}
                    className="-mx-3 flex min-w-0 flex-1 items-center justify-between gap-4 rounded-[9px] px-3 py-1 transition-colors hover:bg-[color:var(--cap-surface-2)]"
                  >
                    <span className="min-w-0">
                      <span
                        className="block truncate text-[0.95rem] font-medium"
                        style={{ color: "var(--cap-ink)" }}
                      >
                        {f.symbol}
                      </span>
                      <span className="mt-0.5 block text-[0.78rem]" style={{ color: "var(--cap-ink-3)" }}>
                        Voir l&apos;analyse
                      </span>
                    </span>
                    <span className="flex shrink-0 items-baseline gap-5">
                      <Num className="text-[0.95rem]">{formatCours(f.price, f.symbol)}</Num>
                      <Num
                        tone={(f.change ?? 0) >= 0 ? "up" : "down"}
                        className="w-[4.5rem] text-right text-[0.9rem]"
                      >
                        {(f.change ?? 0) >= 0 ? "+" : ""}
                        {fr(f.change ?? 0, 2)} %
                      </Num>
                    </span>
                  </Link>
                  <button
                    onClick={() => remove(f.symbol)}
                    disabled={removing === f.symbol}
                    aria-label={`Ne plus suivre ${f.symbol}`}
                    // Visible on hover on a pointer device, always present for
                    // keyboard and touch — a destructive action hidden behind
                    // hover is unreachable on a phone.
                    className="shrink-0 rounded-[9px] p-2 opacity-100 transition-colors hover:bg-[color:var(--cap-surface-2)] disabled:opacity-40 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                    style={{ color: "var(--cap-ink-4)" }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Suivre un actif">
        <Heading level={3}>Suivre un actif</Heading>
        <Text size="small" className="mt-2">
          Entrez son symbole — AAPL pour Apple, BTC-USD pour Bitcoin, MC.PA pour
          LVMH.
        </Text>

        <form onSubmit={add} className="mt-6 space-y-4" noValidate>
          {error && <FormError>{error}</FormError>}
          <Field label="Symbole" htmlFor="fav-symbol">
            <TextInput
              id="fav-symbol"
              value={symbol}
              onChange={setSymbol}
              placeholder="AAPL"
              required
              invalid={!!error}
            />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" size="md" disabled={busy} className="flex-1">
              {busy ? "Ajout…" : "Ajouter"}
            </Button>
            <Button variant="secondary" size="md" onClick={() => setAdding(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
