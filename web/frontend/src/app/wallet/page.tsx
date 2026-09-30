"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import {
  walletAPI,
  type Position, type SymbolSummary, type TradingStats, type WalletBalance,
} from "@/lib/api";
import { fr, useSettings, convertCurrency, useFormatAssetPrice } from "@/lib/SettingsContext";
import {
  Button, CloudCurtain, EmptyState, Field, FormError, Heading, LiveNum, Modal, Num,
  Panel, SegmentedControl, Text, TextInput, WeatherBackdrop,
  conditionFromChange, useAnimationsEnabled,
} from "@/components/design-system";
import { PositionSheet } from "@/components/wallet/PositionSheet";
import { JournalPrompt } from "@/components/wallet/JournalPrompt";
import { SymbolReview } from "@/components/wallet/SymbolReview";
import { ClosedSheet } from "@/components/wallet/ClosedSheet";
import { draftFromPosition, type JournalDraft } from "@/lib/journalDraft";
import { RefreshTimer, useAutoRefresh } from "@/components/app/RefreshTimer";
import { useTradingStyle } from "@/lib/tradingStyle";

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
  const [sheet, setSheet] = useState<Position | null>(null);
  const [journal, setJournal] = useState<JournalDraft | null>(null);
  const [bySymbol, setBySymbol] = useState<SymbolSummary[]>([]);
  /* Un trade clôturé a sa propre fiche : la fiche des positions ouvertes
     répond à « qu'est-ce que je fais maintenant », celle-ci à la seule
     question qui fasse progresser — « qu'est-ce que j'ai fait ». */
  const [closedSheet, setClosedSheet] = useState<Position | null>(null);
  const [funding, setFunding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [fundAmount, setFundAmount] = useState("1000");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [b, s, o, h, y] = await Promise.allSettled([
      walletAPI.getBalance(),
      walletAPI.getStats(),
      walletAPI.getPositions("open"),
      walletAPI.getHistory(30),
      walletAPI.getHistoryBySymbol(),
    ]);
    if (b.status === "fulfilled") setBalance(b.value);
    if (s.status === "fulfilled") setStats(s.value);
    if (o.status === "fulfilled") setOpen(o.value.positions || []);
    if (h.status === "fulfilled") setHistory(h.value.history || []);
    /* Le bilan par actif porte sur TOUS les trades clôturés, pas sur les
       trente que la liste affiche : un cumul calculé sur un échantillon
       tronqué serait faux, et faux sans le dire. Il est agrégé côté serveur. */
    if (y.status === "fulfilled") setBySymbol(y.value.by_symbol || []);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  /* La cadence suit l'horizon déclaré, elle n'est plus la même pour tout le
     monde. Trente secondes fixes étaient à la fois trop lentes et trop
     rapides : un scalpeur voyait le graphique bouger pendant que le cours de
     sa position restait figé une demi-minute à côté, et un investisseur long
     terme faisait interroger le fournisseur deux fois par minute pour une
     ligne qu'il regarde une fois par semaine.

     Cinq secondes en scalping ne coûtent rien en amont : le backend met les
     cotations en cache quelques secondes, donc la cadence de l'écran est
     découplée du débit vers le fournisseur (voir _prices.py).

     Le compteur ne tourne que sur l'onglet des positions ouvertes — un
     historique figé n'a rien à rafraîchir. */
  const style = useTradingStyle();
  const { remaining, busy: refreshing, paused, refreshNow } = useAutoRefresh(
    load,
    style.refreshSeconds,
    tab === "open"
  );

  /* La fiche suit les données : après un rafraîchissement, elle doit montrer
     le nouveau cours, pas celui du clic. Et si la position s'est clôturée
     d'elle-même sur un niveau, la fiche se ferme plutôt que d'afficher une
     position qui n'existe plus. */
  useEffect(() => {
    if (!sheet) return;
    const fresh = open.find((p) => p.id === sheet.id);
    if (!fresh) setSheet(null);
    else if (fresh !== sheet) setSheet(fresh);
  }, [open, sheet]);

  const money = useCallback(
    (v: number) =>
      convertCurrency(v, "EUR", settings.currency, eurUsd).toLocaleString("fr-FR", {
        style: "currency",
        currency: settings.currency,
        maximumFractionDigits: 2,
      }),
    [settings.currency, eurUsd]
  );

  /* Les cours n'ont pas la même précision que les sommes. Sur un actif à
     0,34 €, deux décimales affichaient « entrée 0,34 € » et « cours 0,34 € »
     à côté d'un résultat non nul : les deux nombres différaient à la
     quatrième décimale. */
  const assetPrice = useFormatAssetPrice();

  /* La clôture enchaîne sur la proposition de journal.
     C'est le seul moment où l'utilisateur sait encore POURQUOI il était
     entré ; une demi-heure plus tard, la réponse est perdue et le journal
     reste vide — c'est ce qui lui arrivait. Le brouillon est construit à
     partir de la position qu'on vient de fermer, donc AVANT le rechargement
     qui la fera disparaître de la liste. */
  const doClose = async () => {
    if (!closing) return;
    const closed = closing;
    setBusy(true);
    setError("");
    try {
      const res = await walletAPI.closePosition(closed.id);
      setClosing(null);
      const exit = res.exit_price ?? closed.current_price ?? closed.entry_price;
      const pnl = res.realized_pnl ?? closed.unrealized_pnl ?? 0;
      /* Le bilan vient du SERVEUR quand il l'envoie. C'est le même que celui
         écrit d'office au journal quand un stop se déclenche sans personne :
         deux jugements différents du même trade selon qu'on était devant
         l'écran ou non serait la pire des incohérences ici. La version locale
         ne sert plus que de filet si la réponse n'en porte pas. */
      setJournal(
        res.review
          ? {
              ...draftFromPosition(closed, exit, pnl, style),
              advice: res.review.advice,
              pre_trade_notes: res.review.pre_trade_notes,
              post_trade_notes: res.review.post_trade_notes,
              result: res.review.result,
              risk_reward: res.review.risk_reward,
              exit_price: res.review.exit_price,
              pnl: res.review.pnl,
            }
          : draftFromPosition(closed, exit, pnl, style)
      );
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

  /**
   * Créditer, ou retirer avec un montant négatif.
   *
   * Le retrait manquait, et son absence avait une conséquence concrète : un
   * solde qui avait dérapé ne pouvait aller que vers le haut. La seule sortie
   * était « Recommencer », qui archive aussi tout l'historique — une réponse
   * bien trop large à « j'ai 200 € de trop ».
   */
  const addFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    // La virgule décimale est ce qu'un clavier français produit, et
    // `Number("−200,5")` rend NaN. L'espace est ce que produit un
    // copier-coller depuis l'écran.
    const amt = Number(fundAmount.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(amt) || amt === 0) return setError("Indiquez un montant.");
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

  /** Le capital de départ, sans rien archiver. C'est la version douce de
   *  « Recommencer » : le compteur revient, l'historique reste. */
  const retourAuDepart = async () => {
    setBusy(true);
    setError("");
    try {
      await walletAPI.setBalance();
      setFunding(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opération impossible.");
    } finally {
      setBusy(false);
    }
  };

  /**
   * Repartir du capital de départ.
   *
   * Le simulateur autorise à engager tout le solde sur une position, levier
   * compris — comportement d'un compte à marge, et qui COMPOSE : au levier
   * ×10, une suite de gains à +5 % multiplie le solde par 1,5 à chaque trade,
   * donc trente-quatre trades suffisent à passer de 10 000 € à neuf
   * milliards. Passé ce point, plus un nombre de l'application n'est lisible,
   * et rien côté utilisateur ne permettait de revenir en arrière.
   */
  const resetSimulation = async () => {
    setBusy(true);
    setError("");
    try {
      await walletAPI.resetSimulation();
      setResetting(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remise à zéro impossible.");
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
            <Heading level={1}>Wallet — simulation</Heading>
            <Text className="mt-2.5 max-w-[36rem]">
              Votre compte d&apos;entraînement. Tout y est virtuel — c&apos;est
              exactement ce qui permet de se tromper utilement. À ne pas
              confondre avec le Portefeuille réel, qui est un registre de vos
              placements hors du site.
            </Text>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => { setResetting(true); setError(""); }}
            className="rounded-[9px] px-3 py-2 text-[0.85rem] transition-colors"
            style={{ color: "var(--cap-ink-3)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}
          >
            Recommencer
          </button>
          <Button variant="secondary" size="md" onClick={() => { setFunding(true); setError(""); }}>
            <Plus className="h-4 w-4" />
            Ajuster le solde
          </Button>
          </div>
        </header>

        <Panel title="Votre compte">
          <div className="flex flex-wrap items-end gap-x-12 gap-y-7">
            {/* Les trois chiffres vivants du compte. Ils défilent d'une valeur
                à l'autre au lieu d'être remplacés : c'est le seul endroit de
                l'écran où l'on voit son argent bouger, autant que ça se voie. */}
            <div>
              <LiveNum
                value={equity}
                format={money}
                className="text-[clamp(1.9rem,4vw,2.5rem)] font-medium leading-none"
              />
              <Text size="caption" className="mt-2">Valeur totale</Text>
            </div>
            <div>
              <LiveNum
                value={balance?.balance ?? 0}
                format={money}
                className="text-[1.4rem] font-medium leading-none"
              />
              <Text size="caption" className="mt-2">Disponible</Text>
            </div>
            <div>
              <LiveNum
                value={balance?.total_pnl ?? 0}
                format={(v) => `${v >= 0 ? "+" : ""}${money(v)}`}
                tone={(balance?.total_pnl ?? 0) >= 0 ? "up" : "down"}
                className="text-[1.4rem] font-medium leading-none"
              />
              {/* « Résultat total » était faux, et le bilan par actif l'a
                  rendu visible : ce chiffre est le gain LATENT des positions
                  encore ouvertes, et il s'affichait en vert à côté d'un
                  historique intégralement perdant. Un lecteur y lisait son
                  résultat global. */}
              <Text size="caption" className="mt-2">Latent sur vos positions</Text>
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
          hint={list.length === 0 ? undefined
            : tab === "open"
              ? "Cliquez sur un actif pour la fiche complète de la position."
              : "Cliquez sur un trade pour son récap et sa note de journal."}
          aside={
            <div className="flex items-center gap-2">
              {tab === "open" && (
                <RefreshTimer
                  remaining={remaining}
                  busy={refreshing}
                  paused={paused}
                  onRefresh={refreshNow}
                  hint={`Cadence ${style.label.fr} — toutes les ${style.refreshSeconds} s. Elle suit votre horizon de trading, modifiable dans Réglages.`}
                />
              )}
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
            </div>
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
                        {/* Le symbole ouvre la fiche de la position, pas
                            l'analyse de l'actif : depuis le wallet, la
                            question est « où en est CETTE position », pas
                            « que vaut cet actif ». Le lien vers l'analyse
                            est dans la fiche. */}
                        <button
                          onClick={() => (p.status === "closed" ? setClosedSheet(p) : setSheet(p))}
                          className="text-[0.98rem] font-medium transition-colors hover:underline"
                          style={{ color: "var(--cap-ink)" }}
                        >
                          {p.symbol}
                        </button>
                        <span
                          className="rounded-[6px] px-1.5 py-0.5 text-[0.7rem]"
                          style={{ backgroundColor: "var(--cap-surface-2)", color: "var(--cap-ink-3)" }}
                        >
                          {p.instrument === "turbo"
                            ? `Turbo ${p.direction === "LONG" ? "long" : "short"} ×${fr(p.levier_actuel ?? p.leverage, 1)}`
                            : <>{p.direction === "LONG" ? "Achat" : "Vente"}{p.leverage > 1 ? ` ×${p.leverage}` : ""}</>}
                        </span>
                      </div>
                      <Text size="caption" className="mt-1">
                        {p.instrument === "turbo" && p.unites
                          ? <>{p.unites} titres à {fr(p.prix_unitaire ?? 0, (p.prix_unitaire ?? 0) < 1 ? 3 : 2)} €
                              {p.status !== "closed" && p.prix_titre_actuel != null && <> (maintenant {fr(p.prix_titre_actuel, p.prix_titre_actuel < 1 ? 3 : 2)} €)</>}
                              {" · "}barrière {assetPrice(p.barriere ?? 0, p.symbol)}
                              {p.status !== "closed" && p.distance_barriere_pct != null && <> à {fr(p.distance_barriere_pct, 1)} %</>}
                              {" · "}</>
                          : null}
                        {money(p.amount)} · entrée {assetPrice(p.entry_price, p.symbol)}
                        {p.frais_payes ? ` · frais ${money(p.frais_payes)}` : ""}
                        {p.status === "closed" ? "" : p.stop_loss ? ` · stop ${assetPrice(p.stop_loss, p.symbol)}` : ""}
                        {p.status === "closed" ? "" : p.take_profit ? ` · objectif ${assetPrice(p.take_profit, p.symbol)}` : ""}
                      </Text>
                    </div>

                    <div className="flex items-center gap-5">
                      {/* Trois états, pas deux. Une position qui n'a pas bougé
                          et une position dont on n'a pas le cours affichaient
                          exactement la même chose — « 0,00 € · 0,0 % » — et
                          l'utilisateur ne pouvait pas savoir laquelle il
                          regardait. Le troisième état le dit. */}
                      <div className="text-right">
                        {/* UN TRADE CLÔTURÉ A UN RÉSULTAT, PAS UNE VARIATION.
                            L'historique affichait ces lignes avec la logique
                            des positions ouvertes : il lisait unrealized_pnl,
                            qui est nul une fois la position fermée. Résultat,
                            chaque trade passé se montrait avec son plan
                            d'origine — « stop 0,35210 · objectif 0,38662 » —
                            et AUCUN résultat. L'historique ne disait donc pas
                            la seule chose qu'on lui demande. */}
                        {p.status === "closed" ? (
                          <>
                            {p.realized_pnl != null ? (
                              <Num
                                tone={p.realized_pnl > 0 ? "up" : p.realized_pnl < 0 ? "down" : "ink"}
                                className="block text-[0.95rem]"
                              >
                                {p.realized_pnl >= 0 ? "+" : ""}{money(p.realized_pnl)}
                                {p.amount
                                  ? ` · ${p.realized_pnl >= 0 ? "+" : ""}${fr((p.realized_pnl / p.amount) * 100, 1)} %`
                                  : ""}
                              </Num>
                            ) : (
                              <Text size="caption" as="span" className="block">Résultat inconnu</Text>
                            )}
                            {p.exit_price != null && (
                              <Text size="caption" as="span" className="mt-0.5 block">
                                sortie {assetPrice(p.exit_price, p.symbol)}
                              </Text>
                            )}
                          </>
                        ) : p.price_available === false ? (
                          <>
                            <Text size="caption" as="span" className="block">
                              Cours indisponible
                            </Text>
                            <Text size="caption" as="span" className="mt-0.5 block">
                              entrée {assetPrice(p.entry_price, p.symbol)}
                            </Text>
                          </>
                        ) : (
                          <>
                            {p.current_price != null && (
                              <LiveNum
                                value={p.current_price}
                                format={(v: number) => assetPrice(v, p.symbol)}
                                className="block text-[0.92rem]"
                              />
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
                                <LiveNum
                                  value={p.unrealized_pnl}
                                  /* Le pourcentage est RECALCULÉ depuis la
                                     valeur en cours de défilement, pas lu sur
                                     la réponse : sinon l'euro défile pendant
                                     que le pourcentage a déjà sauté, et les
                                     deux ne se correspondent plus pendant une
                                     demi-seconde.
                                     Virgule décimale : toFixed rend « 50.0 »,
                                     qui n'est pas du français. */
                                  format={(v) => {
                                    const pct = p.amount ? (v / p.amount) * 100 : null;
                                    return (
                                      `${v >= 0 ? "+" : ""}${money(v)}` +
                                      (pct != null
                                        ? ` · ${pct >= 0 ? "+" : ""}${pct.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
                                        : "")
                                    );
                                  }}
                                  tone={p.unrealized_pnl >= 0 ? "up" : "down"}
                                  className="mt-0.5 block text-[0.82rem]"
                                />
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

        {/* Le bilan n'a rien à dire de positions encore ouvertes : il ne
            s'affiche que sous l'historique. */}
        {tab === "closed" && <SymbolReview rows={bySymbol} money={money} />}
      </div>

      {/* ── Close ──────────────────────────────────────────────────────── */}
      <ClosedSheet
        position={closedSheet}
        onClose={() => setClosedSheet(null)}
        money={money}
        price={(v: number) => assetPrice(v, closedSheet?.symbol)}
      />

      <JournalPrompt
        draft={journal}
        onClose={() => setJournal(null)}
        formatMoney={money}
      />

      <PositionSheet
        position={sheet}
        onClose={() => setSheet(null)}
        onEditLevels={(p) => {
          setSheet(null);
          setEditing(p);
          setSl(p.stop_loss?.toString() ?? "");
          setTp(p.take_profit?.toString() ?? "");
          setError("");
        }}
        onClosePosition={(p) => { setSheet(null); setClosing(p); setError(""); }}
        money={money}
        price={(v: number) => assetPrice(v, sheet?.symbol)}
      />

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

      {/* ── Recommencer la simulation ──────────────────────────────────── */}
      <Modal open={resetting} onClose={() => setResetting(false)} title="Recommencer">
        <Heading level={3}>Recommencer la simulation</Heading>
        <Text size="small" className="mt-2">
          Le solde repart du capital de départ et vos positions en cours sont
          refermées. Vos trades passés ne sont pas supprimés : ils sortent des
          écrans et des statistiques, parce que leurs montants n&apos;ont plus
          de rapport avec le nouveau compte. Le journal, lui, n&apos;est pas
          touché — vos notes restent.
        </Text>
        {error && <div className="mt-4"><FormError>{error}</FormError></div>}
        <div className="mt-6 flex gap-2">
          <Button size="md" disabled={busy} onClick={resetSimulation} className="flex-1">
            {busy ? "Remise à zéro…" : "Recommencer"}
          </Button>
          <Button variant="secondary" size="md" onClick={() => setResetting(false)}>
            Annuler
          </Button>
        </div>
      </Modal>

      {/* ── Add funds ──────────────────────────────────────────────────── */}
      <Modal open={funding} onClose={() => setFunding(false)} title="Ajuster le solde">
        <Heading level={3}>Ajuster le solde</Heading>
        <Text size="small" className="mt-2">
          De l&apos;argent virtuel, pour continuer à s&apos;entraîner. Cela
          n&apos;a aucun effet en dehors de la plateforme.{" "}
          <strong>Un montant négatif retire</strong> — « −500 » enlève 500 €.
        </Text>
        <form onSubmit={addFunds} className="mt-6 space-y-4" noValidate>
          {error && <FormError>{error}</FormError>}
          <Field label="Montant" htmlFor="w-amt" hint="Positif pour créditer, négatif pour retirer.">
            <TextInput id="w-amt" value={fundAmount} onChange={setFundAmount} placeholder="1000 ou -500" />
          </Field>
          {/* Les quatre gestes qu'on fait réellement, pour ne pas avoir à
              taper un nombre qu'on connaît déjà. */}
          <div className="flex flex-wrap gap-1.5">
            {["1000", "-1000", "10000", "-10000"].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => { setFundAmount(v); setError(""); }}
                className="rounded-[9px] px-2.5 py-1.5 text-[0.82rem] transition-colors"
                style={{ color: "var(--cap-ink-2)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}
              >
                {v.startsWith("-") ? `−${v.slice(1)} €` : `+${v} €`}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="md" disabled={busy} className="flex-1">
              {busy ? "Enregistrement…" : "Appliquer"}
            </Button>
            <Button variant="secondary" size="md" onClick={() => setFunding(false)}>
              Annuler
            </Button>
          </div>
        </form>

        {/* LA VERSION DOUCE DE « RECOMMENCER ».
            Remettre le compteur à sa place sans archiver l'historique : c'est
            ce dont on a besoin quand le solde a dérapé mais que les trades
            passés valent encore la peine d'être relus. */}
        <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--cap-line)" }}>
          <button
            type="button"
            onClick={retourAuDepart}
            disabled={busy}
            className="text-[0.85rem] underline underline-offset-4 disabled:opacity-40"
            style={{ color: "var(--cap-ink-2)" }}
          >
            Remettre le solde au capital de départ
          </button>
          <Text size="caption" className="mt-1.5">
            Les positions en cours et l&apos;historique ne bougent pas — seul le solde
            revient à son point de départ.
          </Text>
        </div>
      </Modal>
    </>
  );
}
