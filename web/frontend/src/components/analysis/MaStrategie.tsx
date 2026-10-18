"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { strategiesAPI, type SignalStrategie } from "@/lib/api";
import { Button, Nimbo, Panel, Text } from "@/components/design-system";

/**
 * La stratégie de l'utilisateur, appliquée à l'actif qu'il regarde.
 *
 * Nimbo dit, condition par condition, ce qui est réuni aujourd'hui. Si tout
 * l'est, il propose l'ordre fictif avec le stop et l'objectif de LA
 * stratégie (pas les siens), et il dit s'il est d'accord. Sans stratégie
 * active, une ligne invite à en composer une.
 */
export function MaStrategie({ symbol, assetPrice, nimboPropose, nimboSens }: {
  symbol: string;
  assetPrice: (v: number) => string;
  /** Ce que Nimbo propose de son côté sur cet actif, pour dire s'ils sont d'accord. */
  nimboPropose: boolean;
  nimboSens: "long" | "short" | null;
}) {
  const [d, setD] = useState<SignalStrategie | null>(null);
  useEffect(() => {
    let vivant = true;
    setD(null);
    strategiesAPI.signal(symbol).then((r) => { if (vivant) setD(r); }).catch(() => { if (vivant) setD({ strategie: null }); });
    return () => { vivant = false; };
  }, [symbol]);

  if (!d) return null;
  if (!d.strategie) {
    return (
      <Text size="small">
        Vous avez vos propres règles ?{" "}
        <Link href="/strategie" className="cap-lien">Composez votre stratégie avec Nimbo</Link> : il vous dira ici si elle se
        déclenche sur chaque actif.
      </Text>
    );
  }
  const s = d.signal;
  const st = d.strategie;
  if (!s?.possible) {
    return (
      <Panel title={`Votre stratégie « ${st.nom} »`}>
        <Text size="small">{s?.raison ?? "Impossible de l'appliquer à cet actif."}</Text>
      </Panel>
    );
  }
  const plan = s.plan;
  const sens = plan?.direction === "SHORT" ? "short" : "long";
  const accord = s.reunies && nimboPropose && nimboSens === sens;
  const href = plan
    ? `/trading?symbol=${encodeURIComponent(symbol)}&direction=${plan.direction}&sl=${plan.stop}&tp=${plan.objectif}&from=strategie`
    : "/trading";
  const horsTest = st.testee_sur && st.testee_sur.length > 0 && !st.testee_sur.includes(symbol);

  return (
    <Panel
      title={`Votre stratégie « ${st.nom} »`}
      hint={horsTest ? `Testée sur ${st.testee_sur!.join(", ")} : sur cet actif, elle n'a pas encore été mise à l'épreuve.` : undefined}
      action={{ label: "Modifier ma stratégie", href: "/strategie" }}
    >
      <div className="flex items-start gap-3">
        <Nimbo humeur={s.reunies ? "cap" : "reflechit"} taille={56} label="" className="-my-1 flex-none" />
        <div className="min-w-0">
          <p className="text-[1.1rem] font-semibold leading-snug" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
            {s.reunies
              ? `Elle se déclenche : ${sens === "long" ? "acheter" : "vendre à découvert"} ${symbol}.`
              : `Pas aujourd'hui : il manque ${s.manquantes} condition${(s.manquantes ?? 0) > 1 ? "s" : ""}.`}
          </p>
          {s.reunies && (
            <Text size="small" className="mt-1">
              {accord
                ? "Et je suis d'accord : de mon côté aussi, je propose cette position."
                : nimboPropose
                  ? "De mon côté, je propose plutôt l'autre sens : regardez les deux raisonnements avant de choisir."
                  : "De mon côté, je ne propose rien sur cet actif en ce moment : c'est votre règle qui parle, pas la mienne."}
            </Text>
          )}
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {(s.conditions ?? []).map((c, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[0.95rem]" style={{ color: c.ok ? "var(--cap-ink)" : "var(--cap-ink-3)" }}>
            <span aria-hidden className="mt-[0.15rem] flex h-5 w-5 flex-none items-center justify-center rounded-full text-[0.75rem] font-bold"
              style={{ backgroundColor: c.ok ? "var(--cap-up)" : "var(--cap-surface-2)", color: c.ok ? "#fff" : "var(--cap-ink-3)" }}>
              {c.ok ? "✓" : "·"}
            </span>
            <span>
              {c.texte.charAt(0).toUpperCase() + c.texte.slice(1)}
              {c.valeur != null ? ` (aujourd'hui : ${c.valeur})` : ""}
              <span className="sr-only">{c.ok ? " : réunie" : " : pas réunie"}</span>
            </span>
          </li>
        ))}
      </ul>

      {s.reunies && plan && (
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Text size="small" tone="ink">
            Selon vos règles : stop à {assetPrice(plan.stop)}, objectif à {assetPrice(plan.objectif)}, vous risquez 1 pour viser{" "}
            {plan.rr.toLocaleString("fr-FR")}.
          </Text>
          <Button href={href} size="md">Prendre position selon ma stratégie</Button>
        </div>
      )}
    </Panel>
  );
}
