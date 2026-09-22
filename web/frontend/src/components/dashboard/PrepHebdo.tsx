"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { weeklyPrepAPI, type WeeklyBriefing } from "@/lib/api";
import { DUR, EASE, Panel, Text } from "@/components/design-system";

/**
 * La préparation de la semaine.
 *
 * Elle est générée tous les dimanches, mise en cache jusqu'à l'ouverture de
 * lundi, puis masquée jusqu'au dimanche suivant — et elle dispose d'un écran
 * d'administration pour la relire, la corriger et décider de son envoi. Tout
 * ce dispositif tournait pour un widget qu'aucun écran n'importait plus
 * depuis la refonte : le serveur produisait chaque semaine un briefing que
 * personne ne pouvait lire.
 *
 * Le composant d'origine faisait 685 lignes et dépliait l'intégralité du
 * briefing sur l'accueil. Ici il tient dans un panneau : le cadrage macro,
 * les quelques valeurs à surveiller, les rendez-vous de la semaine — et le
 * reste derrière un bouton. L'accueil répond à « qu'est-ce que je fais
 * aujourd'hui », pas à « raconte-moi la semaine ».
 *
 * IL DISPARAÎT QUAND IL N'A RIEN À DIRE. Le serveur répond `visible: false`
 * hors de sa fenêtre ; un panneau vide le reste du temps apprendrait à ne
 * plus le regarder.
 */

const TENDANCE: Record<string, { mot: string; couleur: string }> = {
  bullish: { mot: "orientation haussière", couleur: "var(--cap-up)" },
  bearish: { mot: "orientation baissière", couleur: "var(--cap-down)" },
  neutral: { mot: "sans direction nette", couleur: "var(--cap-ink-3)" },
};

export function PrepHebdo() {
  const [briefing, setBriefing] = useState<WeeklyBriefing | null>(null);
  const [deplie, setDeplie] = useState(false);

  useEffect(() => {
    let vivant = true;
    weeklyPrepAPI.status()
      .then((s) => {
        if (!s.visible || !vivant) return null;
        return weeklyPrepAPI.get();
      })
      .then((d) => { if (d && vivant) setBriefing(d.briefing); })
      .catch(() => {});
    return () => { vivant = false; };
  }, []);

  if (!briefing) return null;

  const t = TENDANCE[briefing.macro?.trend ?? "neutral"] ?? TENDANCE.neutral;
  const surveiller = (briefing.watchlist ?? []).slice(0, 4);
  const evenements = (briefing.events ?? []).slice(0, 3);

  return (
    <Panel
      title="La semaine qui vient"
      hint={briefing.week}
      aside={<CalendarDays size={15} aria-hidden style={{ color: "var(--cap-ink-4)" }} />}
    >
      <Text size="small" tone="ink">
        <span style={{ color: t.couleur }}>{t.mot}</span>
        {" — "}
        {briefing.macro?.summary}
      </Text>

      {surveiller.length > 0 && (
        <div className="mt-4">
          <Text size="caption" tone="faint" className="mb-2">À surveiller</Text>
          <div className="flex flex-wrap gap-1.5">
            {surveiller.map((w) => (
              <Link
                key={w.symbol}
                href={`/analysis?symbol=${encodeURIComponent(w.symbol)}`}
                title={w.why}
                className="rounded-[9px] px-2.5 py-1.5 text-[0.82rem] transition-colors hover:bg-[color:var(--cap-surface-3)]"
                style={{ backgroundColor: "var(--cap-surface-2)", color: "var(--cap-ink-2)" }}
              >
                {w.symbol}
              </Link>
            ))}
          </div>
        </div>
      )}

      {evenements.length > 0 && (
        <div className="mt-4">
          <Text size="caption" tone="faint" className="mb-1.5">Les rendez-vous</Text>
          <ul className="space-y-1">
            {evenements.map((e, i) => (
              <li key={i}>
                <Text size="caption" as="span">
                  {e.day} {e.time} · {e.event}
                  {e.country ? ` (${e.country})` : ""}
                </Text>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(briefing.macro?.key_points?.length || briefing.conclusion) && (
        <>
          <button
            type="button"
            onClick={() => setDeplie((v) => !v)}
            aria-expanded={deplie}
            className="mt-4 inline-flex items-center gap-1.5 text-[0.82rem] transition-colors"
            style={{ color: "var(--cap-ocean)" }}
          >
            <ChevronDown
              className="h-3.5 w-3.5 transition-transform duration-200"
              style={{ transform: deplie ? "rotate(180deg)" : undefined }}
            />
            {deplie ? "Replier" : "Le détail de la semaine"}
          </button>

          <AnimatePresence initial={false}>
            {deplie && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: DUR.base, ease: EASE }}
                style={{ overflow: "hidden" }}
              >
                <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--cap-line)" }}>
                  {(briefing.macro?.key_points ?? []).map((k, i) => (
                    <div key={i} className="flex gap-2.5">
                      <span
                        aria-hidden
                        className="mt-[0.55rem] h-px w-3 shrink-0"
                        style={{ backgroundColor: "var(--cap-ocean)" }}
                      />
                      <Text size="small" as="span" className="mb-1.5">{k}</Text>
                    </div>
                  ))}
                  {briefing.conclusion && (
                    <Text size="small" tone="ink" className="mt-2">{briefing.conclusion}</Text>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </Panel>
  );
}
