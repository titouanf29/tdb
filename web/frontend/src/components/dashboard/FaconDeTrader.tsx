"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { walletAPI, type ConstatObserve, type ProfilObserve } from "@/lib/api";
import { fr } from "@/lib/SettingsContext";
import { Num, Panel, Text } from "@/components/design-system";

/**
 * Ce que la personne fait, à côté de ce qu'elle a dit.
 *
 * Les réglages et le profil sont des intentions. Ce panneau lit les trades
 * eux-mêmes (backend routes/moi.py) : la durée réelle de détention, le risque
 * réellement pris au stop, la manière de sortir. Il ne dit quelque chose
 * qu'à partir de quelques trades fermés, parce qu'avant, il décrirait un
 * hasard et pas une habitude.
 */

const TON: Record<ConstatObserve["ton"], { couleur: string; mot: string }> = {
  attention: { couleur: "var(--cap-ambre)", mot: "À regarder" },
  neutre: { couleur: "var(--cap-ocean)", mot: "À savoir" },
  bien: { couleur: "var(--cap-up)", mot: "Ça tient" },
};

export function FaconDeTrader() {
  const [p, setP] = useState<ProfilObserve | null>(null);
  const [tout, setTout] = useState(false);

  useEffect(() => {
    walletAPI.getProfilObserve().then(setP).catch(() => setP(null));
  }, []);

  if (!p) return null;
  const m = p.mesures;
  const n = p.trades_fermes;

  if (!p.assez) {
    const reste = p.min_trades - n;
    return (
      <Panel
        title="Votre façon de trader"
        hint="Mesurée sur vos trades, comparée à ce que vous avez réglé."
        action={{ label: "Ouvrir un trade", href: "/analysis" }}
      >
        <Text size="small">
          {n === 0
            ? `Après ${p.min_trades} trades fermés, ce panneau dira comment vous tradez vraiment : combien de temps vous gardez une position, ce que vous risquez au stop, comment vous sortez.`
            : `Encore ${reste} trade${reste > 1 ? "s" : ""} fermé${reste > 1 ? "s" : ""} avant un premier constat. En dessous, il décrirait un hasard, pas une habitude.`}
        </Text>
        <div className="mt-4 flex gap-1.5" role="img" aria-label={`${n} trades fermés sur ${p.min_trades}`}>
          {Array.from({ length: p.min_trades }, (_, i) => (
            <span
              key={i}
              className="h-1.5 flex-1 rounded-full"
              style={{ backgroundColor: i < n ? "var(--cap-ambre)" : "var(--cap-surface-2)" }}
            />
          ))}
        </div>
      </Panel>
    );
  }

  const sorties = m.sorties;
  const partObjectif = sorties && n ? sorties.objectif / n : null;
  const figures: Array<{ valeur: string; legende: string; ecart?: boolean }> = [];
  if (m.detention) {
    figures.push({
      valeur: m.detention.mediane_mot,
      legende: `durée typique, horizon ${p.declare.style_mot}`,
      ecart: m.detention.dans_horizon < 0.5,
    });
  }
  if (m.risque_capital_pct != null) {
    figures.push({
      valeur: `${fr(m.risque_capital_pct, 1)} %`,
      legende: `du capital au stop, réglage ${fr(p.declare.risque_pct, 1)} %`,
      ecart: m.risque_capital_pct > p.declare.risque_pct * 1.5,
    });
  }
  if (partObjectif != null) {
    figures.push({ valeur: `${fr(partObjectif * 100, 0)} %`, legende: "des sorties à l'objectif" });
  }
  if (m.sans_stop != null) {
    figures.push({
      valeur: `${fr((1 - m.sans_stop) * 100, 0)} %`,
      legende: "des positions avec un stop",
      ecart: m.sans_stop >= 0.3,
    });
  }

  const visibles = tout ? p.constats : p.constats.slice(0, 2);

  return (
    <Panel
      title="Votre façon de trader"
      hint={`Mesurée sur vos ${n} trades fermés, comparée à vos réglages.`}
      action={{ label: "Voir le wallet", href: "/wallet" }}
    >
      <div className="cap-liste grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
        {figures.map((f) => (
          <div key={f.legende} className="min-w-0">
            <Num className="block text-[1.15rem] font-medium leading-none" tone={f.ecart ? "down" : "ink"}>
              {f.valeur}
            </Num>
            <span className="mt-1.5 block text-[0.76rem] leading-snug" style={{ color: "var(--cap-ink-3)" }}>
              {f.legende}
            </span>
          </div>
        ))}
      </div>

      {p.constats.length > 0 && (
        <ul className="mt-6 flex flex-col gap-5 border-t pt-5" style={{ borderColor: "var(--cap-line)" }}>
          {visibles.map((c) => (
            <li key={c.cle} className="flex gap-3.5">
              <span
                aria-hidden
                className="mt-[0.55rem] h-2 w-2 flex-none rounded-full"
                style={{ backgroundColor: TON[c.ton].couleur }}
              />
              <div className="min-w-0">
                <p className="text-[0.82rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>
                  {TON[c.ton].mot}
                </p>
                <p
                  className="mt-0.5 text-[1.05rem] font-semibold leading-snug"
                  style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}
                >
                  {c.titre}
                </p>
                <Text size="small" className="mt-1.5">{c.phrase}</Text>
                <Text size="small" tone="ink" className="mt-2">{c.conseil}</Text>
                <Link
                  href={c.lien.href}
                  className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-[0.85rem] font-medium underline decoration-[color:var(--cap-ambre)] decoration-2 underline-offset-[5px]"
                  style={{ color: "var(--cap-ink)" }}
                >
                  {c.lien.label}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      {p.constats.length > 2 && (
        <button
          type="button"
          onClick={() => setTout((v) => !v)}
          className="mt-1 min-h-[44px] text-[0.85rem] font-medium"
          style={{ color: "var(--cap-ocean)" }}
        >
          {tout ? "Afficher moins" : `Voir les ${p.constats.length - 2} autres constats`}
        </button>
      )}
    </Panel>
  );
}
