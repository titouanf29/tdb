"use client";

import { AlertTriangle, Info, SlidersHorizontal } from "lucide-react";
import { Button, Num, Panel, Text } from "@/components/design-system";
import type { BlocPersonnel } from "@/lib/api";

/**
 * Ce que ce plan veut dire pour la personne qui le lit.
 *
 * Le panneau n'apparaît QUE si elle a répondu à quelque chose. Tant qu'elle
 * n'a rien dit, l'écran ne prétend pas la connaître : il propose de le
 * demander, en une ligne, et s'arrête là.
 *
 * Chaque ligne affichée est un calcul, pas un conseil de forme générale — la
 * mise convertie en parts et en euros risqués, le stop du plan comparé à la
 * perte annoncée, la durée du mouvement comparée au moment où la personne
 * peut réellement regarder. C'est la condition pour que « personnalisé » ne
 * soit pas un mot posé sur un texte identique pour tout le monde.
 */
export function PourVous({
  bloc,
  onOuvrirQuestions,
  onChangerHorizon,
  devise,
}: {
  bloc?: BlocPersonnel;
  onOuvrirQuestions: () => void;
  onChangerHorizon?: (id: string) => void;
  /** Le formateur de sommes de l'écran, pour que 21 € s'écrive comme ailleurs. */
  devise: (v: number) => string;
}) {
  // ── Rien de répondu : une invitation, pas un encadré vide ────────────────
  if (!bloc) {
    return (
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-[16rem] flex-1">
            <span
              className="text-[0.75rem] uppercase tracking-[0.14em]"
              style={{ color: "var(--cap-ink-3)" }}
            >
              Pour vous
            </span>
            <Text size="small" className="mt-2">
              Cette analyse est calculée sur votre horizon, mais elle ne sait rien de ce que
              vous engagez, de ce que vous acceptez de perdre, ni du moment où vous pouvez
              regarder un écran. Cinq questions et elle le saura.
            </Text>
          </div>
          <Button variant="secondary" size="md" onClick={onOuvrirQuestions}>
            <SlidersHorizontal className="h-4 w-4" />
            Adapter à ma façon de faire
          </Button>
        </div>
      </Panel>
    );
  }

  const { taille, constats } = bloc;

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          className="text-[0.75rem] uppercase tracking-[0.14em]"
          style={{ color: "var(--cap-ink-3)" }}
        >
          Pour vous
        </span>
        <button
          type="button"
          onClick={onOuvrirQuestions}
          className="rounded-[9px] text-[0.82rem] underline underline-offset-4"
          style={{ color: "var(--cap-ink-3)" }}
        >
          Modifier mes réponses
        </button>
      </div>

      {/* ── Le plan en euros ─────────────────────────────────────────────── */}
      {taille && (
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
          <Chiffre label="Vous engagez" valeur={devise(taille.mise_eur)} />
          <Chiffre
            label="Vous risquez"
            valeur={devise(taille.risque_eur)}
            appoint={taille.risque_pct != null
              ? `${taille.risque_pct.toLocaleString("fr-FR")} % de la mise`
              : undefined}
            tone="down"
          />
          {taille.gain_eur != null && (
            <Chiffre
              label="Vous visez"
              valeur={devise(taille.gain_eur)}
              appoint={taille.gain_pct != null
                ? `${taille.gain_pct.toLocaleString("fr-FR")} % de la mise`
                : undefined}
              tone="up"
            />
          )}
          <Chiffre
            label="Soit"
            valeur={`${taille.parts.toLocaleString("fr-FR", { maximumFractionDigits: 4 })}`}
            appoint="part(s) au cours actuel"
          />
        </div>
      )}

      {/* ── Ce qui ne colle pas avec ce que vous avez dit ─────────────────── */}
      {constats.length > 0 && (
        <div className="mt-5 flex flex-col gap-3">
          {constats.map((c) => {
            const alerte = c.ton === "attention";
            const Icone = alerte ? AlertTriangle : Info;
            return (
              <div
                key={c.cle}
                className="rounded-[12px] px-4 py-3.5"
                style={{
                  backgroundColor: alerte
                    ? "rgba(229, 168, 58, 0.07)"
                    : "rgba(21, 94, 117, 0.06)",
                  boxShadow: `inset 0 0 0 1px ${alerte
                    ? "rgba(229, 168, 58, 0.28)"
                    : "rgba(21, 94, 117, 0.22)"}`,
                }}
              >
                <div className="flex items-start gap-2.5">
                  <Icone
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: alerte ? "var(--cap-amber-ink)" : "var(--cap-ocean)" }}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="text-[0.9rem] font-semibold" style={{ color: "var(--cap-ink)" }}>
                      {c.titre}
                    </p>
                    <Text size="small" className="mt-1">{c.texte}</Text>
                    {/* Un constat qui laisse la personne sans geste à faire est
                        un reproche. Quand un autre horizon règle la
                        contradiction, le bouton l'applique. */}
                    {c.suggerer_horizon && onChangerHorizon && (
                      <button
                        type="button"
                        onClick={() => onChangerHorizon(c.suggerer_horizon!)}
                        className="mt-2.5 rounded-[9px] px-3 py-1.5 text-[0.83rem] transition-colors"
                        style={{
                          color: "var(--cap-ink)",
                          boxShadow: "inset 0 0 0 1px var(--cap-line)",
                        }}
                      >
                        Passer en {HORIZON_MOT[c.suggerer_horizon] ?? c.suggerer_horizon}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!taille && constats.length === 0 && (
        <Text size="small" className="mt-3">
          Rien à signaler entre ce plan et ce que vous avez indiqué. Les indicateurs que vous
          n&apos;avez pas cochés restent expliqués plus bas.
        </Text>
      )}
    </Panel>
  );
}

const HORIZON_MOT: Record<string, string> = {
  scalp: "scalping",
  day: "day trading",
  swing: "swing",
  long: "long terme",
};

function Chiffre({
  label,
  valeur,
  appoint,
  tone = "ink",
}: {
  label: string;
  valeur: string;
  appoint?: string;
  tone?: "ink" | "up" | "down";
}) {
  return (
    <div>
      <span className="block text-[0.75rem]" style={{ color: "var(--cap-ink-3)" }}>{label}</span>
      <Num tone={tone} className="mt-0.5 block text-[1.02rem]">{valeur}</Num>
      {appoint && (
        <span className="mt-0.5 block text-[0.75rem]" style={{ color: "var(--cap-ink-3)" }}>
          {appoint}
        </span>
      )}
    </div>
  );
}
