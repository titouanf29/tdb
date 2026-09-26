"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Landmark } from "lucide-react";
import { macroAPI, type ImpactMacro } from "@/lib/api";
import { fr } from "@/lib/SettingsContext";
import { Panel, Text } from "@/components/design-system";

/**
 * Ce que les banques centrales font à CET actif, et quand elles parlent.
 *
 * Le moteur d'analyse lit le graphique ; il ne sait pas qu'une décision de la
 * Fed tombe dans trois jours, ni que cet actif-là, historiquement, baisse
 * quand elle surprend par sa fermeté. Ce panneau le dit, avec la date, et le
 * sens mesuré — ou le mécanisme, quand la mesure ne tranche pas.
 */

type Donnees = Awaited<ReturnType<typeof macroAPI.actif>>;

export function MacroContext({ symbol }: { symbol: string }) {
  const [d, setD] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    let vivant = true;
    setD(null);
    setErreur(false);
    macroAPI.actif(symbol)
      .then((x) => { if (vivant) setD(x); })
      .catch(() => { if (vivant) setErreur(true); });
    return () => { vivant = false; };
  }, [symbol]);

  // Rien à dire, on ne dit rien : un bloc « la Fed plus ferme qu'attendu —
  // pas d'effet net » annonce un événement qui n'existe pas pour cet actif.
  const concernees = d ? (["FED", "BCE"] as const).filter((b) => d.sensibilites[b]?.sens_si_restrictive) : [];
  // Pas de panneau pendant le chargement non plus : il apparaîtrait pour
  // disparaître aussitôt sur un actif que les banques centrales ne touchent pas.
  if (erreur || !d || (concernees.length === 0 && d.prochaines.length === 0)) return null;

  return (
    <Panel
      title="Banques centrales"
      hint="Comment cet actif réagit aux décisions de la Fed et de la BCE, et quand tombent les prochaines."
      aside={
        <span className="flex items-center gap-1.5">
          <Landmark size={15} aria-hidden style={{ color: "var(--cap-ink-4)" }} />
        </span>
      }
    >
      <>
          <div className="space-y-3">
            {concernees.map((b) => <Sensibilite key={b} banque={b} x={d.sensibilites[b]} />)}
          </div>

          {d.prochaines.length > 0 && (
            <div className="mt-5">
              <Text size="caption" tone="faint" className="mb-2">Les prochaines annonces qui le concernent</Text>
              <ul className="space-y-1.5">
                {d.prochaines.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <Link href={`/macro?e=${p.id}`} className="text-[0.88rem] hover:underline" style={{ color: "var(--cap-ink)" }}>
                      {p.titre}
                    </Link>
                    <Text size="caption" as="span">{p.date_longue.charAt(0).toUpperCase() + p.date_longue.slice(1)} · {p.heure}</Text>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Link href="/macro" className="mt-4 inline-block text-[0.82rem] underline underline-offset-2" style={{ color: "var(--cap-ocean)" }}>
            Tout l&apos;agenda macro
          </Link>
      </>
    </Panel>
  );
}

function Sensibilite({ banque, x }: { banque: "FED" | "BCE"; x: ImpactMacro }) {
  const qui = banque === "FED" ? "La Fed" : "La BCE";
  const s = x.sens_si_restrictive;
  const m = x.mesure;
  const fiable = x.source === "mesure";
  return (
    <div className="rounded-[12px] p-3.5" style={{ boxShadow: "inset 0 0 0 1px var(--cap-line)" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Text size="small" tone="ink" className="font-medium" as="span">{qui} plus ferme qu&apos;attendu</Text>
        <Text size="caption" as="span" tone={s > 0 ? "up" : s < 0 ? "down" : "faint"}>
          {s > 0 ? "plutôt favorable ↑" : s < 0 ? "plutôt défavorable ↓" : "pas d'effet net"}
          {fiable ? " · mesuré" : x.conforte ? " · conforté" : s ? " · mécanisme" : ""}
        </Text>
      </div>
      <Text size="caption" className="mt-1">{x.phrase}</Text>
      {fiable && m?.moyenne_durs != null && m?.moyenne_doux != null && (
        <Text size="caption" className="mt-1">
          Jours de fermeté : {m.moyenne_durs > 0 ? "+" : ""}{fr(m.moyenne_durs, 2)} % en moyenne ({m.n_durs}) ·
          jours de souplesse : {m.moyenne_doux > 0 ? "+" : ""}{fr(m.moyenne_doux, 2)} % ({m.n_doux}).
        </Text>
      )}
    </div>
  );
}
