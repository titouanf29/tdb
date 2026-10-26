"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, Lightbulb } from "lucide-react";
import { journalAPI, type JournalEntry, type Position } from "@/lib/api";
import { fr } from "@/lib/SettingsContext";
import { Button, Drawer, Heading, Num, Text } from "@/components/design-system";

/**
 * La fiche d'un trade terminé.
 *
 * Les positions ouvertes avaient la leur ; les trades passés n'avaient rien.
 * Or c'est sur eux qu'on apprend : une position ouverte pose la question
 * « qu'est-ce que je fais maintenant », un trade clôturé pose la seule qui
 * fasse progresser — « qu'est-ce que j'ai fait, et est-ce que je le referais ».
 *
 * La fiche répond aux deux moitiés de cette question :
 *
 *   – LES FAITS, que la mémoire déforme en premier : entrée, sortie, durée,
 *     plan initial, et par quoi la position s'est fermée ;
 *   – LA NOTE DE JOURNAL correspondante, si elle existe. Quand un stop s'est
 *     déclenché, elle a été écrite d'office ; on la retrouve d'ici plutôt que
 *     de fouiller le journal en croisant les dates.
 *
 * Quand aucune note n'existe — un trade clôturé à la main dont on a passé la
 * proposition — le bouton mène au journal pour l'écrire. Un trade sans trace
 * est une leçon perdue, et c'est le seul endroit où on s'en rend compte.
 */

function duree(ouvert?: string, ferme?: string | null): string {
  if (!ouvert || !ferme) return "—";
  const a = new Date(ouvert).getTime();
  const b = new Date(ferme).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return "—";
  const min = (b - a) / 60000;
  if (min < 60) return `${Math.round(min)} min`;
  if (min < 1440) return `${Math.round(min / 60)} h`;
  return `${Math.round(min / 1440)} jours`;
}

function quand(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    + " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function Line({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-5 py-3">
      <div className="min-w-0">
        <span className="block text-[0.88rem]" style={{ color: "var(--cap-ink-2)" }}>{label}</span>
        {hint && (
          <span className="mt-0.5 block text-[0.78rem]" style={{ color: "var(--cap-ink-3)" }}>{hint}</span>
        )}
      </div>
      <div className="shrink-0 text-right">
        {typeof value === "string" ? <Num className="text-[0.95rem]">{value}</Num> : value}
      </div>
    </div>
  );
}

export function ClosedSheet({
  position: p,
  onClose,
  money,
  price,
}: {
  position: Position | null;
  onClose: () => void;
  money: (v: number) => string;
  price: (v: number) => string;
}) {
  const [note, setNote] = useState<JournalEntry | null>(null);
  const [cherche, setCherche] = useState(false);

  /* La note du journal est retrouvée par (symbole, date de sortie) : c'est
     l'appariement le plus fiable dont on dispose, le journal ne portant pas
     l'identifiant de la position. Une tolérance de quelques minutes absorbe
     l'écart entre l'heure de clôture enregistrée et celle de l'écriture. */
  useEffect(() => {
    if (!p) { setNote(null); return; }
    let vivant = true;
    setCherche(true);
    setNote(null);
    journalAPI.list({ symbol: p.symbol })
      .then((d) => {
        if (!vivant) return;
        const ferme = p.closed_at ? new Date(p.closed_at).getTime() : null;
        const trouve = (d.entries || []).find((e) => {
          if (!e.exit_time || !ferme) return false;
          const t = new Date(e.exit_time).getTime();
          return Number.isFinite(t) && Math.abs(t - ferme) < 10 * 60 * 1000;
        });
        setNote(trouve ?? null);
      })
      .catch(() => { if (vivant) setNote(null); })
      .finally(() => { if (vivant) setCherche(false); });
    return () => { vivant = false; };
  }, [p]);

  if (!p) return <Drawer open={false} onClose={onClose}><span /></Drawer>;

  const long = p.direction === "LONG";
  const pnl = p.realized_pnl ?? null;
  const gain = (pnl ?? 0) > 0;
  const pct = pnl != null && p.amount ? (pnl / p.amount) * 100 : null;

  const risk = p.stop_loss != null ? Math.abs(p.entry_price - p.stop_loss) : null;
  const reward = p.take_profit != null ? Math.abs(p.take_profit - p.entry_price) : null;
  const rr = risk && reward && risk > 0 ? reward / risk : null;

  // Par quoi ça s'est terminé. On ne le déduit que d'une coïncidence exacte
  // avec un niveau : un trade clôturé à la main tout près du stop n'est pas
  // un stop touché, et l'affirmer serait réécrire l'histoire.
  const auStop = p.stop_loss != null && p.exit_price != null
    && Math.abs(p.exit_price - p.stop_loss) < Math.max(1e-8, Math.abs(p.stop_loss) * 1e-6);
  const aObjectif = p.take_profit != null && p.exit_price != null
    && Math.abs(p.exit_price - p.take_profit) < Math.max(1e-8, Math.abs(p.take_profit) * 1e-6);

  return (
    <Drawer open onClose={onClose} title={`Trade ${p.symbol}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Heading level={3}>{p.symbol}</Heading>
          <Text size="caption" className="mt-1">
            {long ? "Achat" : "Vente à découvert"}
            {p.leverage > 1 ? ` · levier ×${p.leverage}` : ""} · clôturé {quand(p.closed_at)}
          </Text>
        </div>
        {pnl != null && (
          <div className="shrink-0 text-right">
            <Num tone={gain ? "up" : pnl < 0 ? "down" : "ink"} className="block text-[1.3rem]">
              {pnl >= 0 ? "+" : ""}{money(pnl)}
            </Num>
            {pct != null && (
              <Num tone={gain ? "up" : pnl < 0 ? "down" : "ink"} className="block text-[0.85rem]">
                {pct >= 0 ? "+" : ""}{fr(pct, 1)} %
              </Num>
            )}
          </div>
        )}
      </div>

      {(auStop || aObjectif) && (
        <div
          className="mt-5 rounded-[10px] px-3.5 py-2.5"
          style={{ backgroundColor: "var(--cap-surface-2)" }}
        >
          <Text size="small" as="span">
            {auStop
              ? "Fermée automatiquement sur le stop, la perte s'est arrêtée où vous l'aviez décidée."
              : "Fermée automatiquement sur l'objectif, le plan est allé au bout."}
          </Text>
        </div>
      )}

      <div className="mt-6 [&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
        <Line label="Somme engagée" value={money(p.amount)} />
        <Line
          label="Prix d'entrée"
          value={price(p.entry_price)}
          hint={`${p.quantity.toLocaleString("fr-FR", { maximumFractionDigits: 6 })} unités · ${quand(p.created_at)}`}
        />
        <Line
          label="Prix de sortie"
          value={p.exit_price != null ? price(p.exit_price) : "—"}
          hint={`Position tenue ${duree(p.created_at, p.closed_at)}`}
        />
      </div>

      <div className="mt-6">
        <Text size="caption">Le plan que vous aviez posé</Text>
        <div className="mt-1 [&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
          <Line label="Stop" value={p.stop_loss != null ? price(p.stop_loss) : "Aucun"}
                hint={p.stop_loss == null ? "Rien n'arrêtait la perte automatiquement." : undefined} />
          <Line label="Objectif" value={p.take_profit != null ? price(p.take_profit) : "Aucun"} />
          <Line
            label="Rapport gain / risque"
            value={rr != null ? `1 : ${fr(rr, 2)}` : "—"}
            hint={rr != null && rr < 1 ? "Vous risquiez plus que vous ne visiez." : undefined}
          />
        </div>
      </div>

      {/* La note de journal. C'est elle qui transforme une ligne d'historique
          en quelque chose dont on apprend. */}
      <div className="mt-7 border-t pt-5" style={{ borderColor: "var(--cap-line)" }}>
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" style={{ color: "var(--cap-ink-3)" }} />
          <span className="text-[0.75rem] uppercase tracking-[0.14em]" style={{ color: "var(--cap-ink-3)" }}>
            Votre journal
          </span>
        </div>

        {cherche ? (
          <Text size="caption" className="mt-2.5">Recherche de la note…</Text>
        ) : note ? (
          <>
            <div className="mt-2.5 flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" style={{ color: "var(--cap-up)" }} />
              <Text size="small" as="span" tone="ink">Ce trade est noté.</Text>
            </div>
            {note.post_trade_notes && (
              <div
                className="mt-2.5 rounded-[10px] p-3.5"
                style={{ backgroundColor: "var(--cap-surface-2)" }}
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-3.5 w-3.5" style={{ color: "var(--cap-amber)" }} />
                  <span className="text-[0.75rem] uppercase tracking-[0.14em]" style={{ color: "var(--cap-ink-3)" }}>
                    Ce que disait ce trade
                  </span>
                </div>
                <p
                  className="mt-2 whitespace-pre-wrap text-[0.85rem] leading-[1.55]"
                  style={{ color: "var(--cap-ink-2)" }}
                >
                  {note.post_trade_notes.trim()}
                </p>
              </div>
            )}
            <div className="mt-4">
              <Button size="md" href="/journal">
                Ouvrir le journal
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <Text size="small" className="mt-2.5">
              Aucune note pour ce trade. Un trade sans trace est une leçon perdue,
              c&apos;est en les relisant qu&apos;on repère ce qui se répète.
            </Text>
            <div className="mt-4">
              <Button size="md" href="/journal">
                Le noter maintenant
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--cap-line)" }}>
        <Link
          href={`/analysis?symbol=${encodeURIComponent(p.symbol)}`}
          className="inline-flex items-center gap-1.5 text-[0.85rem]"
          style={{ color: "var(--cap-ocean)" }}
        >
          Où en est {p.symbol} aujourd&apos;hui
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Drawer>
  );
}
