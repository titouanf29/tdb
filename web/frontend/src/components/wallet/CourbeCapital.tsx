"use client";

import { useId, useMemo } from "react";
import Link from "next/link";
import { Panel, Text } from "@/components/design-system";
import { fr } from "@/lib/SettingsContext";
import type { CourbeWallet, SurDix } from "@/lib/api";

/**
 * Le résultat cumulé, trade après trade, et comment ces trades se sont
 * terminés — comparé aux « 10 achats » de Nimbo.
 *
 * Le pourcentage de trades gagnants seul est trompeur : avec un objectif à
 * trois fois le stop, on gagne en ayant raison une fois sur trois. La courbe
 * dit ce que les décisions ont rapporté ; les points disent COMMENT — et la
 * comparaison avec Nimbo dit si l'on coupe ses gains trop tôt (beaucoup de
 * sorties à la main en petit gain) ou si l'on laisse filer ses pertes.
 */

function Points({ s, label }: { s: SurDix; label: string }) {
  const couleurs = [
    ...Array(s.objectif).fill("var(--cap-up)"),
    ...Array(s.stop).fill("var(--cap-down)"),
    ...Array(s.echeance).fill("var(--cap-ink-4)"),
  ];
  return (
    <div className="flex gap-1.5" role="img"
      aria-label={`${label} : ${s.objectif} objectifs, ${s.stop} stops, ${s.echeance} autres sorties sur dix`}>
      {couleurs.map((c, i) => <span key={i} className="h-3 w-3 rounded-full" style={{ backgroundColor: c }} />)}
    </div>
  );
}

export function CourbeCapital({ c, money }: { c: CourbeWallet; money: (v: number) => string }) {
  const gid = `cc-${useId().replace(/:/g, "")}`;
  const W = 900, H = 200, PAD = 8;

  const dessin = useMemo(() => {
    const vals = [0, ...c.points.map((p) => p.cumul)];
    const min = Math.min(...vals), max = Math.max(...vals);
    const span = max - min || 1;
    const x = (i: number) => PAD + (i / Math.max(1, vals.length - 1)) * (W - 2 * PAD);
    const y = (v: number) => PAD + (1 - (v - min) / span) * (H - 2 * PAD);
    const d = vals.map((v, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
    return { d, x, y, vals, zero: y(0) };
  }, [c.points]);

  const fin = c.points[c.points.length - 1]?.cumul ?? 0;
  const couleur = fin >= 0 ? "var(--cap-up)" : "var(--cap-down)";
  const pctCapital = c.capital_depart ? (fin / c.capital_depart) * 100 : null;
  const manuelles = c.issues.manuelle;

  return (
    <Panel
      title="Votre courbe"
      hint="Le résultat cumulé de vos trades clôturés, frais compris, sans les dépôts ni les remises à zéro du solde."
    >
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
        <span className="cap-num text-[1.6rem] font-semibold leading-none" style={{ color: couleur }}>
          {fin >= 0 ? "+" : ""}{money(fin)}
        </span>
        {pctCapital != null && (
          <Text size="small" as="span">
            soit {pctCapital >= 0 ? "+" : "−"}{fr(Math.abs(pctCapital), 1)} % du capital de départ, sur {c.trades} trade{c.trades > 1 ? "s" : ""}
          </Text>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 h-auto w-full" role="img"
        aria-label={`Résultat cumulé : ${fin >= 0 ? "+" : ""}${money(fin)} sur ${c.trades} trades`}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={couleur} stopOpacity="0.18" />
            <stop offset="100%" stopColor={couleur} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={PAD} x2={W - PAD} y1={dessin.zero} y2={dessin.zero} stroke="var(--cap-line-strong)" strokeDasharray="4 4" />
        <path d={`${dessin.d} L ${dessin.x(dessin.vals.length - 1)} ${dessin.zero} L ${PAD} ${dessin.zero} Z`} fill={`url(#${gid})`} />
        <path d={dessin.d} fill="none" stroke={couleur} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {c.points.map((p, i) => (
          <circle key={i} cx={dessin.x(i + 1)} cy={dessin.y(p.cumul)} r={c.points.length > 40 ? 0 : 3}
            fill={p.issue === "objectif" ? "var(--cap-up)" : p.issue === "stop" ? "var(--cap-down)" : "var(--cap-ink-3)"}>
            <title>{`${p.symbol} : ${p.pnl >= 0 ? "+" : ""}${money(p.pnl)}`}</title>
          </circle>
        ))}
      </svg>

      <div className="mt-5 grid gap-5 border-t pt-5 sm:grid-cols-2" style={{ borderColor: "var(--cap-line)" }}>
        <div>
          <Text size="caption" as="p">Vos trades, ramenés à 10</Text>
          <div className="mt-2">{c.sur_dix && <Points s={c.sur_dix} label="Vos trades" />}</div>
          <Text size="small" className="mt-2">
            <strong>{c.issues.objectif}</strong> à l&apos;objectif, <strong>{c.issues.stop}</strong> au stop,{" "}
            <strong>{manuelles}</strong> fermé{manuelles > 1 ? "s" : ""} à la main
            {c.r_moyen != null && <>, {c.r_moyen >= 0 ? "+" : "−"}{fr(Math.abs(c.r_moyen), 2)} R par trade
              {c.trades_avec_stop < c.trades && <> (sur les {c.trades_avec_stop} avec un stop)</>}</>}.
          </Text>
        </div>
        <div>
          <Text size="caption" as="p">Ce que Nimbo annonce sur 10 achats</Text>
          <div className="mt-2"><Points s={c.nimbo.sur_dix} label="Nimbo" /></div>
          <Text size="small" className="mt-2">
            {c.nimbo.sur_dix.objectif} à l&apos;objectif, {c.nimbo.sur_dix.stop} au stop, {c.nimbo.sur_dix.echeance} à
            l&apos;échéance ({c.nimbo.echeance_seances} séances), +{fr(c.nimbo.r_moyen, 2)} R par trade.{" "}
            <Link href="/nimbo" className="underline underline-offset-2" style={{ color: "var(--cap-ocean)" }}>
              Son bilan réel
            </Link>
          </Text>
        </div>
      </div>
      {c.trades >= 5 && manuelles / c.trades > 0.5 && (
        <Text size="small" tone="ink" className="mt-4">
          Plus de la moitié de vos trades sont fermés à la main, avant le stop ou l&apos;objectif. Le plan de Nimbo gagne
          parce que ses gains vont loin ; les couper tôt retire justement ce qui paie.
        </Text>
      )}
      {c.trades < 10 && (
        <Text size="caption" className="mt-3">
          Moins de 10 trades : la comparaison dit surtout le hasard pour l&apos;instant.
        </Text>
      )}
    </Panel>
  );
}
