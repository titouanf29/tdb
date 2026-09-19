"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  portfolioAPI,
  type CreatePositionData, type PortfolioSummary, type RealPosition,
} from "@/lib/api";
import { useSettings, convertCurrency } from "@/lib/SettingsContext";
import {
  Button, Checkbox, CloudCurtain, EmptyState, Field, FormError, Heading, Modal,
  Num, Panel, SegmentedControl, Text, TextInput, WeatherBackdrop,
  conditionFromChange, useAnimationsEnabled,
} from "@/components/design-system";

/**
 * The real portfolio — positions actually held at a broker.
 *
 * Distinct from the Wallet, which is the paper-trading account. This one is a
 * record the user keeps themselves, so the screen's job is bookkeeping rather
 * than execution: enter what you hold, see what it is worth, close it when you
 * sell.
 *
 * Three panels in the order the question is asked: what is it worth, what is
 * open, what is finished. The previous version put the create form, the
 * allocation chart, the summary tiles and both lists on one screen at once —
 * 1 385 lines in which the most common action, "how am I doing", competed with
 * a data-entry form.
 */

type Tab = "open" | "closed";

const EMPTY_FORM: CreatePositionData = {
  symbol: "",
  position_type: "long",
  quantity: 0,
  entry_price: 0,
  entry_date: new Date().toISOString().slice(0, 10),
  leverage: 1,
};

export default function PortfolioPage() {
  const { settings, eurUsd } = useSettings();
  const [animOn] = useAnimationsEnabled();

  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [open, setOpen] = useState<RealPosition[]>([]);
  const [closed, setClosed] = useState<RealPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("open");

  const [form, setForm] = useState<CreatePositionData>(EMPTY_FORM);
  const [editing, setEditing] = useState<RealPosition | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [closingPos, setClosingPos] = useState<RealPosition | null>(null);
  const [exitPrice, setExitPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [s, o, c] = await Promise.allSettled([
      portfolioAPI.getSummary(),
      portfolioAPI.getPositions("open"),
      portfolioAPI.getPositions("closed"),
    ]);
    if (s.status === "fulfilled") setSummary(s.value);
    if (o.status === "fulfilled") setOpen(o.value.positions || []);
    if (c.status === "fulfilled") setClosed(c.value.positions || []);
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

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setFormOpen(true);
  };

  const startEdit = (p: RealPosition) => {
    setEditing(p);
    setForm({
      symbol: p.symbol,
      position_type: p.position_type,
      quantity: p.quantity,
      entry_price: p.entry_price,
      entry_date: p.entry_date?.slice(0, 10) ?? EMPTY_FORM.entry_date,
      leverage: p.leverage ?? 1,
      broker: p.broker,
      notes: p.notes,
    });
    setError("");
    setFormOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.symbol.trim()) return setError("Indiquez un symbole.");
    if (form.quantity <= 0) return setError("La quantité doit être supérieure à zéro.");
    if (form.entry_price <= 0) return setError("Le prix d'entrée doit être supérieur à zéro.");

    setBusy(true);
    setError("");
    try {
      const payload = { ...form, symbol: form.symbol.trim().toUpperCase() };
      if (editing) await portfolioAPI.updatePosition(editing.id, payload);
      else await portfolioAPI.createPosition(payload);
      setFormOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };

  const close = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingPos) return;
    const px = Number(exitPrice);
    if (!px || px <= 0) return setError("Indiquez le prix de sortie.");
    setBusy(true);
    setError("");
    try {
      await portfolioAPI.closePosition(closingPos.id, px);
      setClosingPos(null);
      setExitPrice("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clôture impossible.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: RealPosition) => {
    // Optimistic, with rollback. Deleting a line the user can see is safe to
    // show immediately; getting it wrong puts the line back.
    const before = { open, closed };
    setOpen((l) => l.filter((x) => x.id !== p.id));
    setClosed((l) => l.filter((x) => x.id !== p.id));
    try {
      await portfolioAPI.deletePosition(p.id);
      await load();
    } catch {
      setOpen(before.open);
      setClosed(before.closed);
    }
  };

  const avgChange = useMemo(() => {
    if (open.length === 0) return null;
    return open.reduce((a, p) => a + (p.pnl_percent ?? 0), 0) / open.length;
  }, [open]);

  if (loading) return <CloudCurtain active label="Chargement de votre portefeuille" />;

  const list = tab === "open" ? open : closed;

  return (
    <>
      <WeatherBackdrop condition={conditionFromChange(avgChange)} enabled={animOn} />

      <div className="relative space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-5 pt-2">
          <div>
            <Heading level={1}>Portefeuille</Heading>
            <Text className="mt-2.5 max-w-[36rem]">
              Vos positions réelles, celles que vous détenez chez votre courtier.
              Rien n&apos;est exécuté ici — c&apos;est un registre que vous
              tenez.
            </Text>
          </div>
          <Button onClick={startCreate} size="md">
            <Plus className="h-4 w-4" />
            Ajouter une position
          </Button>
        </header>

        {summary && (
          <Panel title="Où ça en est">
            <div className="flex flex-wrap items-end gap-x-12 gap-y-7">
              <div>
                <Num className="text-[clamp(1.9rem,4vw,2.5rem)] font-medium leading-none">
                  {money(summary.total_current_value)}
                </Num>
                <Text size="caption" className="mt-2">Valeur actuelle</Text>
              </div>
              <div>
                <Num
                  tone={summary.unrealized_pnl >= 0 ? "up" : "down"}
                  className="text-[1.4rem] font-medium leading-none"
                >
                  {summary.unrealized_pnl >= 0 ? "+" : ""}{money(summary.unrealized_pnl)}
                </Num>
                <Text size="caption" className="mt-2">
                  Latent · {summary.unrealized_pnl_pct >= 0 ? "+" : ""}
                  {summary.unrealized_pnl_pct.toFixed(1)} %
                </Text>
              </div>
              <div>
                <Num
                  tone={summary.realized_pnl >= 0 ? "up" : "down"}
                  className="text-[1.4rem] font-medium leading-none"
                >
                  {summary.realized_pnl >= 0 ? "+" : ""}{money(summary.realized_pnl)}
                </Num>
                <Text size="caption" className="mt-2">Réalisé</Text>
              </div>
              <div>
                <Num className="text-[1.4rem] font-medium leading-none">
                  {money(summary.total_invested)}
                </Num>
                <Text size="caption" className="mt-2">Investi</Text>
              </div>
            </div>

            {(summary.best_position || summary.worst_position) && (
              <div
                className="mt-6 flex flex-wrap gap-x-10 gap-y-3 border-t pt-5"
                style={{ borderColor: "var(--cap-line)" }}
              >
                {summary.best_position && (
                  <Text size="small" as="span">
                    Meilleure : <strong style={{ color: "var(--cap-ink)" }}>{summary.best_position.symbol}</strong>{" "}
                    <Num tone="up">+{summary.best_position.pnl_percent.toFixed(1)} %</Num>
                  </Text>
                )}
                {summary.worst_position && (
                  <Text size="small" as="span">
                    Moins bonne : <strong style={{ color: "var(--cap-ink)" }}>{summary.worst_position.symbol}</strong>{" "}
                    <Num tone="down">{summary.worst_position.pnl_percent.toFixed(1)} %</Num>
                  </Text>
                )}
              </div>
            )}
          </Panel>
        )}

        <Panel
          title="Vos positions"
          aside={
            <SegmentedControl
              size="sm"
              options={[
                { value: "open", label: `Ouvertes${open.length ? ` (${open.length})` : ""}` },
                { value: "closed", label: `Fermées${closed.length ? ` (${closed.length})` : ""}` },
              ]}
              value={tab}
              onChange={setTab}
              aria-label="Statut"
            />
          }
        >
          {list.length === 0 ? (
            <EmptyState
              title={tab === "open" ? "Aucune position ouverte" : "Aucune position fermée"}
              description={
                tab === "open"
                  ? "Ajoutez ce que vous détenez pour suivre sa valeur et sa performance."
                  : "Les positions que vous clôturez apparaîtront ici avec leur résultat."
              }
              action={tab === "open" ? { label: "Ajouter une position", onClick: startCreate } : undefined}
            />
          ) : (
            <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
              {list.map((p) => (
                <PositionRow
                  key={p.id}
                  position={p}
                  money={money}
                  onEdit={() => startEdit(p)}
                  onClose={() => { setClosingPos(p); setExitPrice(String(p.current_price ?? "")); setError(""); }}
                  onDelete={() => remove(p)}
                />
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ── Create / edit ──────────────────────────────────────────────── */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Position">
        <Heading level={3}>{editing ? `Modifier ${editing.symbol}` : "Ajouter une position"}</Heading>
        <Text size="small" className="mt-2">
          Ce que vous avez acheté, à quel prix, et quand.
        </Text>

        <form onSubmit={save} className="mt-6 space-y-4" noValidate>
          {error && <FormError>{error}</FormError>}

          <Field label="Symbole" htmlFor="pf-symbol">
            <TextInput
              id="pf-symbol"
              value={form.symbol}
              onChange={(v) => setForm({ ...form, symbol: v.toUpperCase() })}
              placeholder="AAPL"
              required
            />
          </Field>

          <div>
            <span className="mb-1.5 block text-[0.85rem] font-medium" style={{ color: "var(--cap-ink)" }}>
              Sens
            </span>
            <SegmentedControl
              options={[
                { value: "long", label: "Achat" },
                { value: "short", label: "Vente" },
              ]}
              value={form.position_type}
              onChange={(v) => setForm({ ...form, position_type: v })}
              aria-label="Sens"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quantité" htmlFor="pf-qty">
              <TextInput
                id="pf-qty"
                value={form.quantity ? String(form.quantity) : ""}
                onChange={(v) => setForm({ ...form, quantity: Number(v) || 0 })}
                placeholder="10"
                required
              />
            </Field>
            <Field label="Prix d'entrée" htmlFor="pf-entry">
              <TextInput
                id="pf-entry"
                value={form.entry_price ? String(form.entry_price) : ""}
                onChange={(v) => setForm({ ...form, entry_price: Number(v) || 0 })}
                placeholder="245.18"
                required
              />
            </Field>
          </div>

          <Field label="Date d'entrée" htmlFor="pf-date">
            <TextInput
              id="pf-date"
              value={form.entry_date}
              onChange={(v) => setForm({ ...form, entry_date: v })}
              placeholder="2026-01-15"
            />
          </Field>

          <Field label="Courtier" htmlFor="pf-broker" hint="Facultatif.">
            <TextInput
              id="pf-broker"
              value={form.broker ?? ""}
              onChange={(v) => setForm({ ...form, broker: v })}
              placeholder="Trade Republic"
            />
          </Field>

          <div className="flex gap-2 pt-1">
            <Button type="submit" size="md" disabled={busy} className="flex-1">
              {busy ? "Enregistrement…" : editing ? "Enregistrer" : "Ajouter"}
            </Button>
            <Button variant="secondary" size="md" onClick={() => setFormOpen(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Close ──────────────────────────────────────────────────────── */}
      <Modal open={!!closingPos} onClose={() => setClosingPos(null)} title="Clôturer">
        <Heading level={3}>Clôturer {closingPos?.symbol}</Heading>
        <Text size="small" className="mt-2">
          À quel prix avez-vous vendu ? Le résultat sera calculé à partir de là.
        </Text>

        <form onSubmit={close} className="mt-6 space-y-4" noValidate>
          {error && <FormError>{error}</FormError>}
          <Field label="Prix de sortie" htmlFor="pf-exit">
            <TextInput
              id="pf-exit"
              value={exitPrice}
              onChange={setExitPrice}
              placeholder="0.00"
              required
            />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" size="md" disabled={busy} className="flex-1">
              {busy ? "Clôture…" : "Clôturer"}
            </Button>
            <Button variant="secondary" size="md" onClick={() => setClosingPos(null)}>
              Annuler
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function PositionRow({
  position: p,
  money,
  onEdit,
  onClose,
  onDelete,
}: {
  position: RealPosition;
  money: (v: number) => string;
  onEdit: () => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const isOpen = p.status === "open";
  const pnl = isOpen ? p.unrealized_pnl : (p.exit_price != null
    ? (p.exit_price - p.entry_price) * p.quantity * (p.position_type === "long" ? 1 : -1)
    : null);
  const pct = isOpen ? p.pnl_percent : (p.exit_price != null && p.entry_price
    ? ((p.exit_price - p.entry_price) / p.entry_price) * 100 * (p.position_type === "long" ? 1 : -1)
    : null);

  return (
    <li className="py-4 first:pt-0 last:pb-0">
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
              {p.position_type === "long" ? "Achat" : "Vente"}
            </span>
          </div>
          <Text size="caption" className="mt-1">
            {p.quantity} × {money(p.entry_price)}
            {p.broker ? ` · ${p.broker}` : ""}
            {p.days_held != null ? ` · ${p.days_held} j` : ""}
          </Text>
        </div>

        <div className="flex items-center gap-5">
          <div className="text-right">
            {isOpen && p.current_price != null && (
              <Num className="block text-[0.92rem]">{money(p.current_price)}</Num>
            )}
            {!isOpen && p.exit_price != null && (
              <Num className="block text-[0.92rem]">{money(p.exit_price)}</Num>
            )}
            {pnl != null && (
              <Num tone={pnl >= 0 ? "up" : "down"} className="mt-0.5 block text-[0.82rem]">
                {pnl >= 0 ? "+" : ""}{money(pnl)}
                {pct != null && ` · ${pct >= 0 ? "+" : ""}${pct.toFixed(1)} %`}
              </Num>
            )}
          </div>

          <div className="flex items-center gap-1">
            {isOpen && (
              <Button variant="secondary" size="sm" onClick={onClose}>
                Clôturer
              </Button>
            )}
            <button
              onClick={onEdit}
              aria-label={`Modifier ${p.symbol}`}
              className="rounded-[9px] p-2 transition-colors hover:bg-[color:var(--cap-surface-2)]"
              style={{ color: "var(--cap-ink-4)" }}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              aria-label={`Supprimer ${p.symbol}`}
              className="rounded-[9px] p-2 transition-colors hover:bg-[color:var(--cap-surface-2)]"
              style={{ color: "var(--cap-ink-4)" }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
