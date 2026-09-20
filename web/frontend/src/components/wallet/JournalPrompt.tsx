"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Lightbulb } from "lucide-react";
import { journalAPI } from "@/lib/api";
import type { JournalDraft } from "@/lib/journalDraft";
import { Button, Drawer, FormError, Heading, Num, Text } from "@/components/design-system";

/**
 * Le moment où l'on a quelque chose à écrire.
 *
 * Il arrive une fois par trade et dure trente secondes : juste après la
 * clôture, pendant qu'on sait encore pourquoi on est entré. Passé ce
 * moment-là, on ne s'en souvient plus, et le journal reste vide — c'est ce
 * qui lui arrivait ici.
 *
 * Trois choix, dont deux sans effort : enregistrer tel quel, compléter, ou
 * passer. Le brouillon est déjà rempli de tout ce que le site sait ; ce que
 * l'utilisateur ajoute est la seule chose qu'il est le seul à connaître.
 *
 * Le conseil est affiché AVANT le formulaire et séparément, parce qu'il se
 * lit même par quelqu'un qui va cliquer « Plus tard ». C'est le seul retour
 * que le site donne sur une décision passée ; le perdre dans un champ de
 * texte reviendrait à ne pas le donner.
 */
export function JournalPrompt({
  draft,
  onClose,
  formatMoney,
}: {
  draft: JournalDraft | null;
  onClose: () => void;
  formatMoney: (v: number) => string;
}) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Le brouillon change à chaque clôture : le champ doit suivre, pas garder
  // les notes du trade précédent.
  useEffect(() => {
    if (draft) {
      setNotes(draft.post_trade_notes);
      setSaved(false);
      setError("");
    }
  }, [draft]);

  if (!draft) return <Drawer open={false} onClose={onClose}><span /></Drawer>;

  const win = draft.pnl > 0;

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await journalAPI.create({
        symbol: draft.symbol,
        direction: draft.direction,
        timeframe: draft.timeframe,
        entry_time: draft.entry_time,
        exit_time: draft.exit_time,
        entry_price: draft.entry_price,
        exit_price: draft.exit_price,
        quantity: draft.quantity,
        risk_reward: draft.risk_reward ?? undefined,
        result: draft.result,
        pnl: draft.pnl,
        pre_trade_notes: draft.pre_trade_notes,
        post_trade_notes: notes,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open onClose={onClose} title="Position clôturée">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Heading level={3}>{draft.symbol}</Heading>
          <Text size="caption" className="mt-1">
            {draft.direction === "LONG" ? "Achat" : "Vente à découvert"} clôturé
          </Text>
        </div>
        <Num tone={win ? "up" : draft.pnl < 0 ? "down" : "ink"} className="shrink-0 text-[1.3rem]">
          {draft.pnl >= 0 ? "+" : ""}{formatMoney(draft.pnl)}
        </Num>
      </div>

      {/* Le retour sur le trade. Visible sans rien cliquer. */}
      <div
        className="mt-6 rounded-[12px] p-4"
        style={{ backgroundColor: "var(--cap-surface-2)" }}
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4" style={{ color: "var(--cap-amber)" }} />
          <span className="text-[0.72rem] uppercase tracking-[0.14em]" style={{ color: "var(--cap-ink-3)" }}>
            Ce que dit ce trade
          </span>
        </div>
        <ul className="mt-2.5 space-y-2">
          {draft.advice.map((a, i) => (
            <li key={i} className="text-[0.88rem] leading-[1.55]" style={{ color: "var(--cap-ink-2)" }}>
              {a}
            </li>
          ))}
        </ul>
      </div>

      {saved ? (
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4" style={{ color: "var(--cap-up)" }} />
            <Text size="small" tone="ink" as="span">Noté dans votre journal.</Text>
          </div>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button size="md" href="/journal">
              Voir le journal
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="md" onClick={onClose}>Fermer</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <label
              htmlFor="journal-notes"
              className="block text-[0.88rem]"
              style={{ color: "var(--cap-ink-2)" }}
            >
              Votre note
            </label>
            <Text size="caption" className="mt-1">
              Tout le reste — prix, quantité, durée, résultat, niveaux — est déjà rempli.
            </Text>
            <textarea
              id="journal-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={9}
              className="mt-2.5 w-full resize-y rounded-[10px] px-3.5 py-3 text-[0.88rem] leading-[1.55] outline-none"
              style={{
                backgroundColor: "var(--cap-surface)",
                color: "var(--cap-ink)",
                boxShadow: "inset 0 0 0 1px var(--cap-line)",
              }}
            />
          </div>

          {error && <div className="mt-3"><FormError>{error}</FormError></div>}

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button size="md" onClick={save} disabled={busy}>
              {busy ? "Enregistrement…" : "Noter dans le journal"}
            </Button>
            <Button variant="quiet" size="md" onClick={onClose} disabled={busy}>
              Plus tard
            </Button>
          </div>

          <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--cap-line)" }}>
            <Link
              href="/journal"
              className="inline-flex items-center gap-1.5 text-[0.85rem]"
              style={{ color: "var(--cap-ocean)" }}
            >
              Voir tous mes trades notés
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </>
      )}
    </Drawer>
  );
}
