"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Panel, Text } from "@/components/design-system";

/**
 * The guided start.
 *
 * Four steps, each one click away, each ticking itself off from the account's
 * real state rather than from a box the user had to remember to check. It
 * disappears entirely once all four are done — a checklist that stays on
 * screen after it is finished becomes furniture, and furniture is what a
 * beginner has to learn to ignore.
 *
 * The order is the order the product teaches in: look before you act, act
 * small, then re-read what you did.
 */
export function FirstSteps({
  analysed,
  hasFavorite,
  hasPosition,
  hasJournal,
}: {
  analysed: boolean;
  hasFavorite: boolean;
  hasPosition: boolean;
  hasJournal: boolean;
}) {
  const steps = [
    {
      done: analysed,
      label: "Lire une analyse en entier",
      hint: "Le verdict, puis la raison du verdict.",
      href: "/analysis?symbol=AAPL",
    },
    {
      done: hasFavorite,
      label: "Suivre un premier actif",
      hint: "Il apparaîtra sur cet écran chaque jour.",
      href: "/analysis",
    },
    {
      done: hasPosition,
      label: "Ouvrir une position virtuelle",
      hint: "Avec un stop décidé avant d'entrer.",
      href: "/trading",
    },
    {
      done: hasJournal,
      label: "Relire une décision",
      hint: "C'est là que l'apprentissage a lieu.",
      href: "/journal",
    },
  ];

  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;

  return (
    <Panel
      title="Vos premiers pas"
      hint="Quatre gestes pour prendre la main. Rien d'obligatoire."
      aside={
        <span className="cap-num text-[0.82rem]" style={{ color: "var(--cap-ink-3)" }}>
          {done} / {steps.length}
        </span>
      }
    >
      {/* L'avancée, en une barre qui se remplit. */}
      <div aria-hidden className="-mt-1 mb-3 h-[3px] overflow-hidden rounded-full" style={{ backgroundColor: "var(--cap-line)" }}>
        <div className="cap-barre h-full rounded-full"
          style={{ backgroundColor: "var(--cap-ocean)", transform: `scaleX(${done / steps.length})` }} />
      </div>
      <ol className="cap-liste space-y-1">
        {steps.map((s) => (
          <li key={s.label}>
            <Link
              href={s.href}
              className="-mx-2 flex items-start gap-3 rounded-[10px] px-2 py-2.5 transition-colors hover:bg-[color:var(--cap-surface-2)]"
            >
              <span
                aria-hidden
                className="mt-[1px] flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundColor: s.done ? "var(--cap-ocean)" : "transparent",
                  boxShadow: s.done ? "none" : "inset 0 0 0 1.5px var(--cap-line-strong)",
                }}
              >
                {s.done && <Check className="cap-pop h-3 w-3 text-white" strokeWidth={3} style={{ ["--d" as string]: ".35s" }} />}
              </span>
              <span className="min-w-0">
                <span
                  className="block text-[0.9rem] font-medium"
                  style={{
                    color: s.done ? "var(--cap-ink-3)" : "var(--cap-ink)",
                    textDecoration: s.done ? "line-through" : undefined,
                  }}
                >
                  {s.label}
                </span>
                {!s.done && (
                  <Text size="caption" as="span" className="mt-0.5 block">
                    {s.hint}
                  </Text>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
