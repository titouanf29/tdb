"use client";

import type { ResultatStrategie } from "@/lib/api";
import { v } from "@/lib/strategie";
import { Num, Panel, Text } from "@/components/design-system";
import { ListeAvis } from "./ListeAvis";

/**
 * Le résultat du test, lu dans l'ordre où on se pose les questions : est-ce
 * que ça a gagné, avec quel risque, est-ce que je peux m'y fier, et sur quels
 * trades. La lecture de Nimbo vient en premier : les chiffres seuls ne disent
 * pas si 38 trades suffisent pour conclure.
 */

function Courbe({ points }: { points: NonNullable<ResultatStrategie["stats"]["courbe"]> }) {
  if (points.length < 2) return null;
  const W = 640, H = 180, P = 8;
  const vals = [100, ...points.map((p) => p.capital)];
  const min = Math.min(...vals), max = Math.max(...vals);
  const y = (val: number) => H - P - ((val - min) / (max - min || 1)) * (H - 2 * P);
  const x = (i: number) => P + (i / (vals.length - 1)) * (W - 2 * P);
  const d = vals.map((val, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(val).toFixed(1)}`).join(" ");
  const fin = vals[vals.length - 1];
  const couleur = fin >= 100 ? "var(--cap-up)" : "var(--cap-down)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
      aria-label={`Capital de 100 à ${v(fin)} au fil des ${points.length} trades`}>
      <line x1={P} x2={W - P} y1={y(100)} y2={y(100)} stroke="var(--cap-line-strong)" strokeDasharray="4 4" />
      <path d={`${d} L${x(vals.length - 1)},${H - P} L${x(0)},${H - P} Z`} fill={couleur} opacity="0.08" />
      <path d={d} fill="none" stroke={couleur} strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}

function Chiffre({ valeur, legende, ton }: { valeur: string; legende: string; ton?: "up" | "down" | "ink" }) {
  return (
    <div className="min-w-0">
      <Num className="block text-[1.4rem] font-medium leading-none" tone={ton ?? "ink"}>{valeur}</Num>
      <span className="mt-1.5 block text-[0.78rem] leading-snug" style={{ color: "var(--cap-ink-3)" }}>{legende}</span>
    </div>
  );
}

export function Resultats({ r, risque, rejeu }: { r: ResultatStrategie; risque: number; rejeu?: React.ReactNode }) {
  const s = r.stats;
  const signe = (x?: number) => (x == null ? "—" : `${x >= 0 ? "+" : ""}${v(x, 1)}`);
  return (
    <div className="space-y-5">
      <Panel title="Ce que Nimbo en retient">
        <ListeAvis avis={r.lecture} />
      </Panel>

      {s.trades > 0 && (
        <Panel title="Le résultat" hint={`Avec ${v(risque, 2)} % du capital risqué par trade, frais compris, un trade à la fois par actif.`}>
          <div className="cap-liste grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
            <Chiffre valeur={String(s.trades)} legende="trades" />
            <Chiffre valeur={`${v(s.taux_gagnants ?? 0, 0)} %`} legende="gagnants" />
            <Chiffre valeur={`${signe(s.r_moyen)} R`} legende="par trade, en moyenne" ton={(s.r_moyen ?? 0) >= 0 ? "up" : "down"} />
            <Chiffre valeur={`${signe(s.capital_final_pct)} %`} legende="sur le capital" ton={(s.capital_final_pct ?? 0) >= 0 ? "up" : "down"} />
            <Chiffre valeur={`${v(s.baisse_max_pct ?? 0, 1)} %`} legende="pire recul depuis un sommet" ton="down" />
            {s.achat_conserve_pct != null && <Chiffre valeur={`${signe(s.achat_conserve_pct)} %`} legende="en achetant et gardant" />}
          </div>
          {s.courbe && s.courbe.length > 1 && (
            <div className="mt-6">
              <Text size="caption" className="mb-1">Le capital, trade après trade (100 au départ)</Text>
              <Courbe points={s.courbe} />
            </div>
          )}
          {s.issues && (
            <Text size="small" className="mt-4">
              {s.issues.objectif} trade{s.issues.objectif > 1 ? "s" : ""} ont atteint l&apos;objectif, {s.issues.stop} ont touché
              le stop, {s.issues["durée"]} sont sortis à la durée maximale. Un gain moyen de {signe(s.gain_moyen_r)} R, une perte
              moyenne de {signe(s.perte_moyenne_r)} R.
            </Text>
          )}
        </Panel>
      )}

      {s.trades > 0 && rejeu}

      {r.par_actif.length > 0 && (
        <Panel title="Actif par actif">
          <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
            {r.par_actif.map((a) => (
              <li key={a.symbol} className="flex items-baseline justify-between gap-4 py-2.5">
                <span className="font-semibold" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>{a.symbol}</span>
                <span className="text-[0.88rem]" style={{ color: "var(--cap-ink-3)" }}>
                  {a.erreur ?? `${a.trades} trade${a.trades > 1 ? "s" : ""}`}
                </span>
                <Num className="w-20 text-right" tone={a.r_total >= 0 ? "up" : "down"}>{a.erreur ? "" : `${signe(a.r_total)} R`}</Num>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {r.trades.length > 0 && (
        <Panel title="Les derniers trades" repliable="strategie-trades">
          <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
            {[...r.trades].reverse().slice(0, 25).map((t, i) => (
              <li key={`${t.symbol}-${t.entree_le}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2 text-[0.88rem]">
                <span style={{ color: "var(--cap-ink)" }}>{t.symbol}</span>
                <span style={{ color: "var(--cap-ink-3)" }}>
                  {new Date(t.entree_le).toLocaleDateString("fr-FR")} → {new Date(t.sortie_le).toLocaleDateString("fr-FR")},{" "}
                  {t.issue === "objectif" ? "objectif atteint" : t.issue === "stop" ? "stop touché" : "durée maximale"}
                </span>
                <Num tone={t.r >= 0 ? "up" : "down"}>{signe(t.r)} R</Num>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
