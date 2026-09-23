"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  journalAPI,
  type JournalEntry, type JournalEntryCreate, type JournalStats,
} from "@/lib/api";
import { useSettings, convertCurrency } from "@/lib/SettingsContext";
import {
  Button, CloudCurtain, EmptyState, Field, FormError, Heading, Modal, Num,
  Panel, SegmentedControl, Text, TextInput, WeatherBackdrop,
  useAnimationsEnabled,
} from "@/components/design-system";

/**
 * The trading journal.
 *
 * The point of this screen is the two note fields, not the numbers. What you
 * expected before entering, and what actually happened — the gap between them
 * is where the learning is, and it is the only thing a P&L column cannot tell
 * you.
 *
 * So the form asks for the plan first and the outcome second, in that order,
 * and an entry reads as two paragraphs with a result attached rather than as a
 * row of fields.
 */

type Filter = "all" | "win" | "loss";

const EMPTY: JournalEntryCreate = {
  symbol: "",
  direction: "LONG",
  pre_trade_notes: "",
  post_trade_notes: "",
};

export default function JournalPage() {
  const { settings, eurUsd } = useSettings();
  const [animOn] = useAnimationsEnabled();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [stats, setStats] = useState<JournalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const [form, setForm] = useState<JournalEntryCreate>(EMPTY);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (f: Filter) => {
    const [e, s] = await Promise.allSettled([
      journalAPI.list(f === "all" ? undefined : { result: f }),
      journalAPI.getStats(),
    ]);
    if (e.status === "fulfilled") setEntries(e.value.entries || []);
    if (s.status === "fulfilled") setStats(s.value);
  }, []);

  useEffect(() => {
    load(filter).finally(() => setLoading(false));
  }, [load, filter]);

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
    setForm(EMPTY);
    setError("");
    setFormOpen(true);
  };

  const startEdit = (e: JournalEntry) => {
    setEditing(e);
    setForm({
      symbol: e.symbol,
      direction: e.direction,
      setup: e.setup,
      entry_price: e.entry_price,
      exit_price: e.exit_price,
      result: e.result,
      pnl: e.pnl,
      risk_reward: e.risk_reward,
      pre_trade_notes: e.pre_trade_notes ?? "",
      post_trade_notes: e.post_trade_notes ?? "",
    });
    setError("");
    setFormOpen(true);
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.symbol.trim()) return setError("Indiquez un actif.");
    setBusy(true);
    setError("");
    try {
      const payload = { ...form, symbol: form.symbol.trim().toUpperCase() };
      if (editing) await journalAPI.update(editing.id, payload);
      else await journalAPI.create(payload);
      setFormOpen(false);
      await load(filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (e: JournalEntry) => {
    const before = entries;
    setEntries((l) => l.filter((x) => x.id !== e.id));
    try {
      await journalAPI.delete(e.id);
      await load(filter);
    } catch {
      setEntries(before);
    }
  };

  if (loading) return <CloudCurtain active label="Chargement de votre journal" />;

  return (
    <>
      <WeatherBackdrop condition="cloudy" enabled={animOn} />

      <div className="relative space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-5 pt-2">
          <div>
            <Heading level={1}>Journal</Heading>
            <Text className="mt-2.5 max-w-[36rem]">
              Ce que vous attendiez avant d&apos;entrer, et ce qui s&apos;est
              réellement passé. L&apos;écart entre les deux est là où on
              apprend.
            </Text>
          </div>
          <Button onClick={startCreate} size="md">
            <Plus className="h-4 w-4" />
            Nouvelle entrée
          </Button>
        </header>

        {stats && stats.total > 0 && (
          <Panel title="Ce que disent vos trades">
            <div className="flex flex-wrap items-end gap-x-12 gap-y-7">
              <div>
                <Num className="text-[1.8rem] font-medium leading-none">
                  {stats.win_rate.toFixed(0)} %
                </Num>
                <Text size="caption" className="mt-2">
                  de réussite sur {stats.total} entrées
                </Text>
              </div>
              <div>
                <Num
                  tone={stats.total_pnl >= 0 ? "up" : "down"}
                  className="text-[1.4rem] font-medium leading-none"
                >
                  {stats.total_pnl >= 0 ? "+" : ""}{money(stats.total_pnl)}
                </Num>
                <Text size="caption" className="mt-2">Résultat cumulé</Text>
              </div>
              <div>
                <Num className="text-[1.4rem] font-medium leading-none">
                  {stats.avg_rr ? stats.avg_rr.toFixed(2) : "—"}
                </Num>
                <Text size="caption" className="mt-2">Risque / rendement moyen</Text>
              </div>
              <div>
                <Num className="text-[1.4rem] font-medium leading-none">
                  {stats.wins} / {stats.losses}
                </Num>
                <Text size="caption" className="mt-2">gagnants / perdants</Text>
              </div>
            </div>
          </Panel>
        )}

        <Panel
          title="Vos entrées"
          aside={
            <SegmentedControl
              size="sm"
              options={[
                { value: "all", label: "Toutes" },
                { value: "win", label: "Gagnantes" },
                { value: "loss", label: "Perdantes" },
              ]}
              value={filter}
              onChange={setFilter}
              aria-label="Filtre"
            />
          }
        >
          {entries.length === 0 ? (
            <EmptyState
              title="Aucune entrée"
              description="Notez une décision — même une que vous n'avez pas prise. Ce sont souvent les plus instructives."
              action={{ label: "Nouvelle entrée", onClick: startCreate }}
            />
          ) : (
            <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
              {entries.map((e) => (
                <EntryRow
                  key={e.id}
                  entry={e}
                  money={money}
                  onEdit={() => startEdit(e)}
                  onDelete={() => remove(e)}
                />
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Entrée de journal">
        <Heading level={3}>{editing ? `Modifier ${editing.symbol}` : "Nouvelle entrée"}</Heading>

        <form onSubmit={save} className="mt-6 space-y-4" noValidate>
          {error && <FormError>{error}</FormError>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Actif" htmlFor="j-symbol">
              <TextInput
                id="j-symbol"
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
                  { value: "LONG", label: "Achat" },
                  { value: "SHORT", label: "Vente" },
                ]}
                value={form.direction}
                onChange={(v) => setForm({ ...form, direction: v })}
                aria-label="Sens"
              />
            </div>
          </div>

          {/* The plan comes first, because that is the order it happened in. */}
          <Field
            label="Avant d'entrer"
            htmlFor="j-pre"
            hint="Qu'attendiez-vous, et pourquoi ?"
          >
            <textarea
              id="j-pre"
              value={form.pre_trade_notes ?? ""}
              onChange={(ev) => setForm({ ...form, pre_trade_notes: ev.target.value })}
              rows={3}
              className="w-full resize-y rounded-[12px] px-3.5 py-3 text-[0.95rem] outline-none placeholder:text-[color:var(--cap-ink-3)]"
              style={{
                backgroundColor: "var(--cap-bg)",
                color: "var(--cap-ink)",
                boxShadow: "inset 0 0 0 1px var(--cap-line-strong)",
              }}
              placeholder="Tendance haussière confirmée, stop sous le dernier creux…"
            />
          </Field>

          <Field
            label="Après coup"
            htmlFor="j-post"
            hint="Ce qui s'est passé, et ce que vous en retenez."
          >
            <textarea
              id="j-post"
              value={form.post_trade_notes ?? ""}
              onChange={(ev) => setForm({ ...form, post_trade_notes: ev.target.value })}
              rows={3}
              className="w-full resize-y rounded-[12px] px-3.5 py-3 text-[0.95rem] outline-none placeholder:text-[color:var(--cap-ink-3)]"
              style={{
                backgroundColor: "var(--cap-bg)",
                color: "var(--cap-ink)",
                boxShadow: "inset 0 0 0 1px var(--cap-line-strong)",
              }}
              placeholder="Sorti trop tôt par peur, le scénario s'est réalisé ensuite…"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Entrée" htmlFor="j-in">
              <TextInput
                id="j-in"
                value={form.entry_price ? String(form.entry_price) : ""}
                onChange={(v) => setForm({ ...form, entry_price: Number(v) || undefined })}
                placeholder="0.00"
              />
            </Field>
            <Field label="Sortie" htmlFor="j-out">
              <TextInput
                id="j-out"
                value={form.exit_price ? String(form.exit_price) : ""}
                onChange={(v) => setForm({ ...form, exit_price: Number(v) || undefined })}
                placeholder="0.00"
              />
            </Field>
            <Field label="Résultat" htmlFor="j-pnl">
              <TextInput
                id="j-pnl"
                value={form.pnl != null ? String(form.pnl) : ""}
                onChange={(v) => setForm({ ...form, pnl: v === "" ? undefined : Number(v) })}
                placeholder="0.00"
              />
            </Field>
          </div>

          <div>
            <span className="mb-1.5 block text-[0.85rem] font-medium" style={{ color: "var(--cap-ink)" }}>
              Issue
            </span>
            <SegmentedControl
              options={[
                { value: "win", label: "Gagnant" },
                { value: "breakeven", label: "Neutre" },
                { value: "loss", label: "Perdant" },
              ]}
              value={form.result ?? "breakeven"}
              onChange={(v) => setForm({ ...form, result: v })}
              aria-label="Issue"
            />
          </div>

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
    </>
  );
}

/** « 22 sept. 2026 à 14:35 » — la date telle qu'on la dit, pas un ISO. */
function dateHeure(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleString("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/** Combien de temps la position a été tenue — la question que pose un journal. */
function duree(debut?: string, fin?: string): string {
  if (!debut || !fin) return "";
  const ms = new Date(fin).getTime() - new Date(debut).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return min % 60 ? `${h} h ${min % 60} min` : `${h} h`;
  const j = Math.floor(h / 24);
  return h % 24 ? `${j} j ${h % 24} h` : `${j} j`;
}

/* Ce qui a fermé la position. La clôture automatique range « stop » ou
   « objectif » dans le champ setup ; le dire explicitement évite de confondre
   une sortie décidée avec une sortie subie. */
function origine(setup?: string): string {
  if (setup === "stop") return "fermé automatiquement sur le stop";
  if (setup === "objectif") return "fermé automatiquement sur l'objectif";
  return "";
}

function EntryRow({
  entry: e,
  money,
  onEdit,
  onDelete,
}: {
  entry: JournalEntry;
  money: (v: number) => string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tone = e.result === "win" ? "up" : e.result === "loss" ? "down" : "muted";
  const label = e.result === "win" ? "Gagnant" : e.result === "loss" ? "Perdant" : "Neutre";

  return (
    <li className="py-5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="flex items-center gap-2.5">
          <span className="text-[0.98rem] font-medium" style={{ color: "var(--cap-ink)" }}>
            {e.symbol}
          </span>
          <span
            className="rounded-[6px] px-1.5 py-0.5 text-[0.7rem]"
            style={{ backgroundColor: "var(--cap-surface-2)", color: "var(--cap-ink-3)" }}
          >
            {e.direction === "LONG" ? "Achat" : "Vente"}
          </span>
          {e.result && (
            <Num tone={tone} className="text-[0.8rem]">
              {label}
              {e.pnl != null && ` · ${e.pnl >= 0 ? "+" : ""}${money(e.pnl)}`}
            </Num>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            aria-label={`Modifier l'entrée ${e.symbol}`}
            className="rounded-[9px] p-2 transition-colors hover:bg-[color:var(--cap-surface-2)]"
            style={{ color: "var(--cap-ink-4)" }}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            aria-label={`Supprimer l'entrée ${e.symbol}`}
            className="rounded-[9px] p-2 transition-colors hover:bg-[color:var(--cap-surface-2)]"
            style={{ color: "var(--cap-ink-4)" }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* QUAND. Un journal de trading sans date n'est pas un journal : on ne
          peut ni retrouver la séance, ni relire un trade « celui de mardi »,
          ni voir combien de temps une position a été tenue. Les deux horodatages
          étaient enregistrés depuis le début — la clôture automatique écrit
          `exit_time` à la seconde où le stop est touché — et aucun écran ne
          les affichait.

          La fin d'abord : c'est elle qu'on cherche quand on relit. */}
      {(e.exit_time || e.entry_time) && (
        <Text size="caption" tone="faint" className="mt-2">
          {e.exit_time && `Clôturé le ${dateHeure(e.exit_time)}`}
          {e.exit_time && e.entry_time && " · "}
          {e.entry_time && `ouvert le ${dateHeure(e.entry_time)}`}
          {duree(e.entry_time, e.exit_time) && ` · tenu ${duree(e.entry_time, e.exit_time)}`}
          {origine(e.setup) && ` · ${origine(e.setup)}`}
        </Text>
      )}

      {/* The two notes, labelled, because which one you are reading matters. */}
      {(e.pre_trade_notes || e.post_trade_notes) && (
        <div className="mt-3 space-y-3">
          {e.pre_trade_notes && <Note label="Avant" text={e.pre_trade_notes} />}
          {e.post_trade_notes && <Note label="Après" text={e.post_trade_notes} />}
        </div>
      )}
    </li>
  );
}

function Note({ label, text }: { label: string; text: string }) {
  return (
    <div className="border-l-2 pl-3" style={{ borderColor: "var(--cap-line-strong)" }}>
      <span
        className="block text-[0.7rem] uppercase tracking-[0.12em]"
        style={{ color: "var(--cap-ink-4)" }}
      >
        {label}
      </span>
      <Text size="small" className="mt-1 whitespace-pre-wrap">{text}</Text>
    </div>
  );
}
