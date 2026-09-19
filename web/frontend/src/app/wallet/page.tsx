"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import {
  walletAPI,
  type Position, type TradingStats, type WalletBalance,
} from "@/lib/api";
import { useSettings, convertCurrency } from "@/lib/SettingsContext";
import {
  Button, CloudCurtain, EmptyState, Field, FormError, Heading, Modal, Num,
  Panel, SegmentedControl, Text, TextInput, WeatherBackdrop,
  conditionFromChange, useAnimationsEnabled,
} from "@/components/design-system";

/**
 * The paper-trading account.
 *
 * Everything here is virtual, and the screen says so once rather than
 * apologising for it on every line. Three questions, three panels: how much do
 * I have, what is running, what happened.
 *
 * Editing a stop on an open position is the one action that belongs here
 * rather than on the trading screen — it is a correction to something already
 * live, not a new decision.
 */

type Tab = "open" | "closed";

export default function WalletPage() {
  const { settings, eurUsd } = useSettings();
  const [animOn] = useAnimationsEnabled();

  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [open, setOpen] = useState<Position[]>([]);
  const [history, setHistory] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("open");

  const [closing, setClosing] = useState<Position | null>(null);
  const [editing, setEditing] = useState<Position | null>(null);
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [funding, setFunding] = useState(false);
  const [fundAmount, setFundAmount] = useState("1000");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [b, s, o, h] = await Promise.allSettled([
      walletAPI.getBalance(),
      walletAPI.getStats(),
      walletAPI.getPositions("open"),
      walletAPI.getHistory(30),
    ]);
    if (b.status === "fulfilled") setBalance(b.value);
    if (s.status === "fulfilled") setStats(s.value);
    if (o.status === "fulfilled") setOpen(o.value.positions || []);
    if (h.status === "fulfilled") setHistory(h.value.history || []);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const money = useCallback(
    (v: number) =>
      convertCurrency(v, "EUR", settings.currency, eurUsd).toLocaleString("fr-FR", {
        style: "currency",
        currency: settings.currency,
        maximumFractionDigits: 2,
      }),
    [settings.currency, eurUsd]
  );

  const doClose = async () => {
    if (!closing) return;
    setBusy(true);
    setError("");
    try {
      await walletAPI.closePosition(closing.id);
      setClosing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clôture impossible.");
    } finally {
      setBusy(false);
    }
  };

  const saveLevels = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      await walletAPI.updatePosition(editing.id, {
        stop_loss: sl === "" ? null : Number(sl),
        take_profit: tp === "" ? null : Number(tp),
      });
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Modification impossible.");
    } finally {
      setBusy(false);
    }
  };

  const addFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(fundAmount);
    if (!amt || amt <= 0) return setError("Indiquez un montant.");
    setBusy(true);
    setError("");
    try {
      await walletAPI.addFunds(amt);
      setFunding(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opération impossible.");
    } finally {
      setBusy(false);
    }
  };

  const equity = balance ? (balance.total_equity ?? balance.balance + balance.positions_value) : 0;
  const avgChange = useMemo(() => {
    if (open.length === 0) return null;
    return open.reduce(
      (a, p) => a + (p.unrealized_pnl != null && p.amount ? (p.unrealized_pnl / p.amount) * 100 : 0),
      0
    ) / open.length;
  }, [open]);

  if (loading) return <CloudCurtain active label="Chargement de votre compte" />;

  const list = tab === "open" ? open : history;

  return (
    <>
      <WeatherBackdrop condition={conditionFromChange(avgChange)} enabled={animOn} />

      <div className="relative space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-5 pt-2">
          <div>
            <Heading level={1}>Wallet</Heading>
            <Text className="mt-2.5 max-w-[36rem]">
              Votre compte d&apos;entraînement. Tout y est virtuel — c&apos;est
              exactement ce qui permet de se tromper utilement.
            </Text>
          </div>
          <Button variant="secondary" size="md" onClick={() => { setFunding(true); setError(""); }}>
            <Plus className="h-4 w-4" />
            Recréditer
          </Button>
        </header>

        <Panel title="Votre compte">
          <div className="flex flex-wrap items-end gap-x-12 gap-y-7">
            <div>
              <Num className="text-[clamp(1.9rem,4vw,2.5rem)] font-medium leading-none">
                {money(equity)}
              </Num>
              <Text size="caption" className="mt-2">Valeur totale</Text>
            </div>
            <div>
              <Num className="text-[1.4rem] font-medium leading-none">
                {money(balance?.balance ?? 0)}
              </Num>
              <Text size="caption" className="mt-2">Disponible</Text>
            </div>
            <div>
              <Num
                tone={(balance?.total_pnl ?? 0) >= 0 ? "up" : "down"}
                className="text-[1.4rem] font-medium leading-none"
              >
                {(balance?.total_pnl ?? 0) >= 0 ? "+" : ""}{money(balance?.total_pnl ?? 0)}
              </Num>
              <Text size="caption" className="mt-2">Résultat total</Text>
            </div>
            {stats && stats.total_trades > 0 && (
              <div>
                <Num className="text-[1.4rem] font-medium leading-none">
                  {stats.win_rate.toFixed(0)} %
                </Num>
                <Text size="caption" className="mt-2">
                  de réussite sur {stats.total_trades} trades
                </Text>
              </div>
            )}
          </div>

          {stats && stats.total_trades > 0 && (
            <div
              className="mt-6 flex flex-wrap gap-x-10 gap-y-3 border-t pt-5"
              style={{ borderColor: "var(--cap-line)" }}
            >
              <Text size="small" as="span">
                Meilleur trade <Num tone="up">+{money(stats.best_trade)}</Num>
              </Text>
              <Text size="small" as="span">
                Pire trade <Num tone="down">{money(stats.worst_trade)}</Num>
              </Text>
              <Text size="small" as="span">
                Moyenne{" "}
                <Num tone={stats.avg_pnl >= 0 ? "up" : "down"}>
                  {stats.avg_pnl >= 0 ? "+" : ""}{money(stats.avg_pnl)}
                </Num>
              </Text>
            </div>
          )}
        </Panel>

        <Panel
          title="Vos positions"
          aside={
            <SegmentedControl
              size="sm"
              options={[
                { value: "open", label: `En cours${open.length ? ` (${open.length})` : ""}` },
                { value: "closed", label: "Historique" },
              ]}
              value={tab}
              onChange={setTab}
              aria-label="Statut"
            />
          }
          action={tab === "open" ? { label: "Ouvrir une position", href: "/trading" } : undefined}
        >
          {list.length === 0 ? (
            <EmptyState
              title={tab === "open" ? "Aucune position en cours" : "Aucun trade passé"}
              description={
                tab === "open"
                  ? "Ouvrez une position pour tester un scénario sans rien risquer."
                  : "Vos trades clôturés apparaîtront ici avec leur résultat."
              }
              action={tab === "open" ? { label: "Ouvrir une position", href: "/trading" } : undefined}
            />
          ) : (
            <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
              {list.map((p) => (
                <li key={p.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <Link
                          href={`/analysis?symbol=${encodeURIComponent(p.symbol)}`}
                          className="text-[0.98rem] font-medium transition-colors hover:underline"
                          style={{ color: "var(--cap-ink)" }}
                        >
                          {p.symbol}
                        </Link>
                        <span
                          className="rounded-[6px] px-1.5 py-0.5 text-[0.7rem]"
                          style={{ backgroundColor: "var(--cap-surface-2)", color: "var(--cap-ink-3)" }}
                        >
                          {p.direction === "LONG" ? "Achat" : "Vente"}
                          {p.leverage > 1 ? ` ×${p.leverage}` : ""}
                        </span>
                      </div>
                      <Text size="caption" className="mt-1">
                        {money(p.amount)} · entrée {money(p.entry_price)}
                        {p.stop_loss ? ` · stop ${money(p.stop_loss)}` : ""}
                        {p.take_profit ? ` · objectif ${money(p.take_profit)}` : ""}
                      </Text>
                    </div>

                    <div className="flex items-center gap-5">
                      {/* Trois états, pas deux. Une position qui n'a pas bougé
                          et une position dont on n'a pas le cours affichaient
                          exactement la même chose — « 0,00 € · 0,0 % » — et
                          l'utilisateur ne pouvait pas savoir laquelle il
                          regardait. Le troisième état le dit. */}
                      <div className="text-right">
                        {p.price_available === false ? (
                          <>
                            <Text size="caption" as="span" className="block">
                              Cours indisponible
                            </Text>
                            <Text size="caption" as="span" className="mt-0.5 block">
                              entrée {money(p.entry_price)}
                            </Text>
                          </>
                        ) : (
                          <>
                            {p.current_price != null && (
                              <Num className="block text-[0.92rem]">{money(p.current_price)}</Num>
                            )}
                            {p.unrealized_pnl != null && (
                              p.unrealized_pnl === 0 ? (
                                // Et, quand l'actif a bougé dans la séance, on
                                // le dit. C'est la réponse à « aucune
                                // variation » : le marché a bien bougé, mais
                                // l'entrée s'est faite au cours du moment, donc
                                // la position part de zéro. Sans cette ligne,
                                // le zéro ressemble à une panne.
                                <Text size="caption" as="span" className="mt-0.5 block">
                                  Inchangé depuis l&apos;entrée
                                  {p.day_change_percent != null && p.day_change_percent !== 0
                                    ? ` · séance ${p.day_change_percent > 0 ? "+" : ""}${p.day_change_percent.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
                                    : ""}
                                </Text>
                              ) : (
                                <Num
                                  tone={p.unrealized_pnl >= 0 ? "up" : "down"}
                                  className="mt-0.5 block text-[0.82rem]"
                                >
                                  {p.unrealized_pnl >= 0 ? "+" : ""}{money(p.unrealized_pnl)}
                                  {/* Virgule décimale : toFixed rend « 50.0 »,
                                      qui n'est pas du français. */}
                                  {p.pnl_percent != null
                                    ? ` · ${p.pnl_percent >= 0 ? "+" : ""}${p.pnl_percent.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
                                    : ""}
                                </Num>
                              )
                            )}
                          </>
                        )}
                      </div>

                      {tab === "open" && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="quiet"
                            size="sm"
                            onClick={() => {
                              setEditing(p);
                              setSl(p.stop_loss?.toString() ?? "");
                              setTp(p.take_profit?.toString() ?? "");
                              setError("");
                            }}
                          >
                            Niveaux
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => { setClosing(p); setError(""); }}>
                            Clôturer
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ── Close ──────────────────────────────────────────────────────── */}
      <Modal open={!!closing} onClose={() => setClosing(null)} title="Clôturer">
        <Heading level={3}>Clôturer {closing?.symbol} ?</Heading>
        <Text size="small" className="mt-2">
          La position sera fermée au prix du marché et le résultat crédité sur
          votre solde.
        </Text>
        {closing?.unrealized_pnl != null && (
          <div className="mt-4">
            <Num
              tone={closing.unrealized_pnl >= 0 ? "up" : "down"}
              className="text-[1.4rem] font-medium"
            >
              {closing.unrealized_pnl >= 0 ? "+" : ""}{money(closing.unrealized_pnl)}
            </Num>
            <Text size="caption" className="mt-1">Résultat estimé</Text>
          </div>
        )}
        {error && <div className="mt-4"><FormError>{error}</FormError></div>}
        <div className="mt-6 flex gap-2">
          <Button size="md" onClick={doClose} disabled={busy} className="flex-1">
            {busy ? "Clôture…" : "Clôturer"}
          </Button>
          <Button variant="secondary" size="md" onClick={() => setClosing(null)}>
            Annuler
          </Button>
        </div>
      </Modal>

      {/* ── Levels ─────────────────────────────────────────────────────── */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Niveaux">
        <Heading level={3}>Niveaux de {editing?.symbol}</Heading>
        <Text size="small" className="mt-2">
          Laissez vide pour retirer un niveau.
        </Text>
        <form onSubmit={saveLevels} className="mt-6 space-y-4" noValidate>
          {error && <FormError>{error}</FormError>}
          <Field label="Stop de protection" htmlFor="w-sl">
            <TextInput id="w-sl" value={sl} onChange={setSl} placeholder="0.00" />
          </Field>
          <Field label="Objectif de gain" htmlFor="w-tp">
            <TextInput id="w-tp" value={tp} onChange={setTp} placeholder="0.00" />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" size="md" disabled={busy} className="flex-1">
              {busy ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button variant="secondary" size="md" onClick={() => setEditing(null)}>
              Annuler
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Add funds ──────────────────────────────────────────────────── */}
      <Modal open={funding} onClose={() => setFunding(false)} title="Recréditer">
        <Heading level={3}>Recréditer le compte</Heading>
        <Text size="small" className="mt-2">
          De l&apos;argent virtuel, pour continuer à s&apos;entraîner. Cela
          n&apos;a aucun effet en dehors de la plateforme.
        </Text>
        <form onSubmit={addFunds} className="mt-6 space-y-4" noValidate>
          {error && <FormError>{error}</FormError>}
          <Field label="Montant" htmlFor="w-amt">
            <TextInput id="w-amt" value={fundAmount} onChange={setFundAmount} placeholder="1000" />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" size="md" disabled={busy} className="flex-1">
              {busy ? "Ajout…" : "Ajouter"}
            </Button>
            <Button variant="secondary" size="md" onClick={() => setFunding(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
