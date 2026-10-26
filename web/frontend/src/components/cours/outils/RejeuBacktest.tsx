"use client";

import { useMemo, useState } from "react";
import { fmt, type Bougie } from "@/lib/cours/marche";
import { GraphiqueEcole, type Marque, type Niveau } from "../GraphiqueEcole";
import { BoutonTenir, ChiffreTenir, LienTenir, ResultatTenir, dollars } from "./ElementsTenir";

/**
 * Un mini-backtest, bougie par bougie : la suite est cachée, les règles sont
 * écrites avant, et l'on avance comme en direct. À chaque setup, on achète ;
 * le stop et l'objectif font le reste, et le tableau se remplit, frais
 * compris. Soulever le masque pour regarder la suite est possible… mais le
 * backtest ne vaut alors plus rien.
 *
 * Les règles (sur l'euro-dollar, 0,10 lot, 1 pip = 1 $) : une bougie touche
 * la zone (son plus bas descend au haut de la zone ou dessous) et clôture
 * au-dessus ; achat à sa clôture ; stop `stop` pips plus bas, objectif `obj`
 * pips plus haut ; une seule position à la fois ; `frais` $ par position.
 */

type Position = { i: number; entree: number; stop: number; obj: number; sortie?: number; prixSortie?: number; pips?: number };

export function RejeuBacktest({ bougies, zoneBas, zoneHaut, depart = 5, stop = 20, obj = 40, frais = 1 }: {
  bougies: Bougie[]; zoneBas: number; zoneHaut: number; depart?: number; stop?: number; obj?: number; frais?: number;
}) {
  const P = 0.0001;
  const n = bougies.length;
  const [t, setT] = useState(depart);
  const [positions, setPositions] = useState<Position[]>([]);
  const [manques, setManques] = useState<number[]>([]);
  const [horsRegle, setHorsRegle] = useState(0);
  const [triche, setTriche] = useState(false);
  const [coin, setCoin] = useState(false);
  const [message, setMessage] = useState("Lisez les règles, puis avancez bougie par bougie. Quand une bougie remplit la règle d'entrée, achetez.");
  const [fini, setFini] = useState(false);

  const estSetup = (i: number) => bougies[i].l <= zoneHaut && bougies[i].c > zoneHaut;
  const ouverte = positions.find((p) => p.sortie == null);

  /** Fait passer une bougie : la position ouverte touche-t-elle son stop ou son objectif ? */
  const avancer = (pas: number) => {
    let tt = t, ps = positions.map((p) => ({ ...p })), mq = [...manques], msg = "";
    for (let k = 0; k < pas && tt < n - 1; k++) {
      // La bougie qu'on quitte était un setup laissé passer ?
      if (!ps.some((p) => p.sortie == null) && estSetup(tt) && !ps.some((p) => p.i === tt || p.sortie === tt) && !mq.includes(tt)) {
        mq.push(tt);
        msg = `La bougie ${tt + 1} remplissait la règle d'entrée, et vous l'avez laissée passer. Dans un backtest, chaque setup compte, les bons comme les mauvais.`;
      }
      tt++;
      const b = bougies[tt];
      const o = ps.find((p) => p.sortie == null);
      if (o) {
        // Stop et objectif dans la même bougie : on compte le stop, par prudence.
        if (b.l <= o.stop) { o.sortie = tt; o.prixSortie = o.stop; o.pips = -stop; msg = `Bougie ${tt + 1} : le stop est touché, −${stop} pips.`; break; }
        if (b.h >= o.obj) { o.sortie = tt; o.prixSortie = o.obj; o.pips = obj; msg = `Bougie ${tt + 1} : l'objectif est atteint, +${obj} pips.`; break; }
      }
    }
    setT(tt); setPositions(ps); setManques(mq);
    if (tt >= n - 1) { setFini(true); msg = msg || "Vous êtes au bout de la période."; }
    setMessage(msg || `Bougie ${tt + 1}, clôture à ${fmt(bougies[tt].c, 4)}.`);
  };

  const acheter = () => {
    if (ouverte) return;
    if (positions.some((p) => p.sortie === t)) {
      setMessage("Une position vient de se fermer sur cette bougie : la règle se lit à partir de la suivante.");
      return;
    }
    if (!estSetup(t)) {
      setHorsRegle((h) => h + 1);
      const b = bougies[t];
      setMessage(b.l > zoneHaut
        ? `Pas de setup : la bougie ${t + 1} n'a pas touché la zone (son plus bas est à ${fmt(b.l, 4)}). Vos règles disent d'attendre.`
        : `Pas de setup : la bougie ${t + 1} a touché la zone mais clôture dessous (${fmt(b.c, 4)}). Vos règles disent d'attendre.`);
      return;
    }
    const e = bougies[t].c;
    setPositions((ps) => [...ps, { i: t, entree: e, stop: e - stop * P, obj: e + obj * P }]);
    setMessage(`Achat à ${fmt(e, 4)}. Stop à ${fmt(e - stop * P, 4)}, objectif à ${fmt(e + obj * P, 4)}. Avancez : la règle décide de la sortie, pas vous.`);
  };

  const fermees = positions.filter((p) => p.sortie != null);
  const brut = fermees.reduce((a, p) => a + (p.pips ?? 0), 0);
  const fraisTot = fermees.length * frais;
  const gagnantes = fermees.filter((p) => (p.pips ?? 0) > 0).length;

  const niveaux: Niveau[] = useMemo(() => {
    const nv: Niveau[] = [{ prix: (zoneBas + zoneHaut) / 2, zone: zoneHaut - zoneBas, label: "Zone de support", couleur: "var(--cap-up)" }];
    if (ouverte) {
      nv.push({ prix: ouverte.obj, label: `Objectif +${obj} pips`, couleur: "var(--cap-up)", pointille: false, epaisseur: 1.2 });
      nv.push({ prix: ouverte.stop, label: `Stop −${stop} pips`, couleur: "var(--cap-down)", pointille: false, epaisseur: 1.2 });
    }
    return nv;
  }, [ouverte, zoneBas, zoneHaut, obj, stop]);
  const marques: Marque[] = positions.flatMap((p) => {
    const m: Marque[] = [{ i: p.i, type: "achat", prix: p.entree }];
    if (p.sortie != null) m.push({ i: p.sortie, type: p.pips! > 0 ? "point" : "croix", prix: p.prixSortie });
    return m;
  });

  const recommencer = () => {
    setT(depart); setPositions([]); setManques([]); setHorsRegle(0); setTriche(false); setCoin(false); setFini(false);
    setMessage("Lisez les règles, puis avancez bougie par bougie. Quand une bougie remplit la règle d'entrée, achetez.");
  };

  return (
    <div>
      <div className="mb-3 rounded-[12px] px-4 py-3 text-[0.93rem] leading-relaxed" style={{ backgroundColor: "var(--cap-surface-2)", color: "var(--cap-ink-2)" }}>
        <p className="mb-1 italic" style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-amber-ink)" }}>Mes règles, écrites avant de regarder</p>
        <ol className="list-decimal space-y-0.5 pl-5">
          <li><b style={{ color: "var(--cap-ink)" }}>Setup</b> : une bougie touche la zone de support ({fmt(zoneBas, 4)} à {fmt(zoneHaut, 4)}) et <b style={{ color: "var(--cap-ink)" }}>clôture au-dessus de {fmt(zoneHaut, 4)}</b>. J'achète à sa clôture.</li>
          <li><b style={{ color: "var(--cap-ink)" }}>Stop</b> : {stop} pips sous l'entrée. <b style={{ color: "var(--cap-ink)" }}>Sortie</b> : {obj} pips au-dessus.</li>
          <li><b style={{ color: "var(--cap-ink)" }}>Risque</b> : 0,10 lot, soit {stop} $ par position (1 % de 2 000 $). Une seule position à la fois. Frais : {frais} $ par position.</li>
        </ol>
      </div>

      <GraphiqueEcole bougies={bougies} jusqua={coin ? undefined : t} niveaux={niveaux} marques={marques} unite="heure" apparition={false}
        ariaLabel={`Rejeu de l'euro-dollar, bougie ${t + 1} sur ${n}`} />

      <ResultatTenir className="mt-3 min-h-[3rem]">
        {triche && <b style={{ color: "var(--cap-down)" }}>Vous avez regardé la suite. </b>}
        {message}
      </ResultatTenir>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <BoutonTenir onClick={() => avancer(1)} disabled={fini}>Une bougie de plus</BoutonTenir>
        <button type="button" onClick={acheter} disabled={fini || !!ouverte}
          className="inline-flex min-h-11 items-center rounded-[10px] px-4 text-[0.95rem] font-semibold disabled:opacity-40"
          style={{ color: "var(--cap-up)", boxShadow: "inset 0 0 0 1.5px var(--cap-up)" }}>
          Acheter (setup)
        </button>
        <LienTenir onClick={() => avancer(5)} disabled={fini}>Cinq bougies</LienTenir>
        <LienTenir onClick={() => { setCoin((c) => !c); if (!coin) setTriche(true); }} disabled={fini}>
          {coin ? "Remettre le masque" : "Soulever le masque"}
        </LienTenir>
      </div>

      {positions.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-[0.92rem] tabular-nums">
            <thead>
              <tr>{["N°", "Entrée", "Sortie", "Pips", "Résultat", "Frais", "Net"].map((h) => (
                <th key={h} className="border-b-2 px-2 py-1.5 text-left font-semibold" style={{ borderColor: "var(--cap-line-strong)", color: "var(--cap-ink)" }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {positions.map((p, k) => {
                const net = p.pips != null ? p.pips - frais : null;
                const td = "border-b px-2 py-2";
                const s = { borderColor: "var(--cap-line)", color: "var(--cap-ink-2)" };
                return (
                  <tr key={k}>
                    <td className={td} style={s}>{k + 1}</td>
                    <td className={td} style={s}>{fmt(p.entree, 4)} <span style={{ color: "var(--cap-ink-3)" }}>(b. {p.i + 1})</span></td>
                    <td className={td} style={s}>{p.prixSortie != null ? `${fmt(p.prixSortie, 4)} ${p.pips! > 0 ? "objectif" : "stop"}` : "en cours"}</td>
                    <td className={td} style={s}>{p.pips != null ? `${p.pips > 0 ? "+" : "−"}${Math.abs(p.pips)}` : ""}</td>
                    <td className={td} style={{ ...s, color: p.pips == null ? s.color : p.pips > 0 ? "var(--cap-up)" : "var(--cap-down)" }}>{p.pips != null ? dollars(p.pips) : ""}</td>
                    <td className={td} style={s}>{p.pips != null ? dollars(-frais) : ""}</td>
                    <td className={td} style={{ ...s, color: net == null ? s.color : net > 0 ? "var(--cap-up)" : "var(--cap-down)", fontWeight: 600 }}>{net != null ? dollars(net) : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {fini && (
        <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--cap-line-strong)" }}>
          <p className="mb-3 text-[1.1rem] font-semibold" style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}>Le bilan</p>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <ChiffreTenir valeur={String(fermees.length)} legende={`positions (${gagnantes} gagnante${gagnantes > 1 ? "s" : ""})`} />
            <ChiffreTenir valeur={dollars(brut)} legende="avant frais" />
            <ChiffreTenir valeur={dollars(-fraisTot)} legende="de frais" />
            <ChiffreTenir valeur={dollars(brut - fraisTot)} legende="net, frais compris" couleur={brut - fraisTot < 0 ? "var(--cap-down)" : undefined} />
          </div>
          <ResultatTenir className="mt-3">
            {triche ? (
              <p><b style={{ color: "var(--cap-down)" }}>Ce backtest ne vaut rien</b> : vous avez soulevé le masque. Même sans le vouloir, savoir la suite change vos décisions, et le résultat devient trop beau. Recommencez sans regarder.</p>
            ) : (
              <p>
                {manques.length > 0 && <>Vous avez laissé passer {manques.length} setup{manques.length > 1 ? "s" : ""} : un backtest honnête les prend tous. </>}
                {horsRegle > 0 && <>Vous avez voulu acheter {horsRegle} fois hors des règles. </>}
                {fermees.length > 0
                  ? <>Surtout, <b style={{ color: "var(--cap-ink)" }}>{fermees.length} positions, c'est beaucoup trop peu</b> pour juger une idée : avec si peu, un coup de chance ressemble à une méthode. Il en faudrait au moins cinquante, sur des périodes calmes et agitées. La courbe ci-dessous montre ce qui peut arriver ensuite.</>
                  : <>Aucune position : relisez la règle d'entrée et recommencez.</>}
              </p>
            )}
          </ResultatTenir>
        </div>
      )}
      {(t > depart || fini) && <div className="mt-2"><LienTenir onClick={recommencer}>Recommencer depuis le début</LienTenir></div>}
    </div>
  );
}
