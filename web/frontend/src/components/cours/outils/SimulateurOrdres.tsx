"use client";

import { useEffect, useMemo, useState } from "react";
import { hasard } from "@/lib/cours/marche";
import { Bouton, Choix, Curseur, Chiffre, dollars, nb, signe, ton, useDefilement, useLargeur } from "./ElementsOrdres";

/**
 * Le simulateur d'ordres de la leçon 14. On place un ordre sur l'euro-dollar
 * (au marché, buy limit ou buy stop), avec son stop loss et son take profit,
 * puis on lance le prix sur un trajet. Le journal dit ce qui se déclenche, à
 * quel prix, et pourquoi : un ordre limite passe à son prix ou mieux, un ordre
 * stop part au marché et peut glisser, un ordre que le prix ne vient jamais
 * chercher reste en attente.
 */

type TypeOrdre = "marche" | "limit" | "stop";
type NomTrajet = "recul" | "cassure" | "calme" | "chute" | "fausse";

const N = 48;
const TRAJETS: Record<NomTrajet, { t: string; ancres: [number, number][]; sauts: number[] }> = {
  recul: { t: "Recul puis hausse", ancres: [[0, 0], [14, -26], [22, -18], [34, 30], [47, 48]], sauts: [] },
  cassure: { t: "Cassure rapide", ancres: [[0, 0], [10, 6], [18, -4], [28, 17], [29, 27], [40, 52], [47, 66]], sauts: [29] },
  calme: { t: "Marché calme", ancres: [[0, 0], [8, 10], [16, -11], [24, 9], [32, -12], [40, 11], [47, 2]], sauts: [] },
  chute: { t: "Chute", ancres: [[0, 0], [8, 4], [18, -14], [19, -27], [30, -48], [40, -62], [47, -70]], sauts: [19] },
  fausse: { t: "Fausse cassure", ancres: [[0, 0], [12, 14], [20, 26], [24, 22], [34, -6], [47, -24]], sauts: [] },
};

/** Le trajet, en pips autour de 1,1000 : un pip entier par minute, du bruit loin des ancres. */
function trajet(nom: NomTrajet): number[] {
  const { ancres } = TRAJETS[nom];
  const r = hasard(nom.length * 97 + ancres.length);
  const out: number[] = [];
  for (let i = 0; i < N; i++) {
    const k = ancres.findIndex(([j]) => j >= i);
    const [i1, p1] = ancres[k];
    const [i0, p0] = ancres[Math.max(0, k - 1)];
    const base = i1 === i0 ? p1 : p0 + ((p1 - p0) * (i - i0)) / (i1 - i0);
    const loin = Math.min(...ancres.map(([j]) => Math.abs(i - j)));
    out.push(Math.round(base + (r() - 0.5) * 4 * Math.min(1, loin / 2)));
  }
  return out;
}

const prix = (p: number) => nb(1.1 + p / 10000, 4);

interface Evenement { i: number; texte: string; couleur?: string }

function simuler(type: TypeOrdre, niveau: number, slD: number, tpD: number, nom: NomTrajet) {
  const ch = trajet(nom);
  const sauts = new Set(TRAJETS[nom].sauts);
  const nomOrdre = type === "limit" ? "buy limit" : "buy stop";
  const entreeVisee = type === "marche" ? ch[0] + 1 : niveau;
  const sl = entreeVisee - slD;
  const tp = entreeVisee + tpD;
  const ev: Evenement[] = [];
  let entree: { i: number; p: number } | null = null;
  let sortie: { i: number; p: number; quoi: "sl" | "tp" } | null = null;

  if (type === "marche") {
    entree = { i: 0, p: entreeVisee };
    ev.push({ i: 0, texte: `Ordre au marché : acheté tout de suite à ${prix(entreeVisee)}, l'ask. Le prix affiché était ${prix(ch[0])} : ce pip d'écart, c'est le spread (leçon « Le spread »).` });
  } else {
    ev.push({ i: 0, texte: `Ordre placé : ${nomOrdre} à ${prix(niveau)}. Il attend : c'est un ordre en attente (pending order).` });
  }
  for (let i = 1; i < N; i++) {
    const cur = ch[i];
    const saut = sauts.has(i);
    if (!entree) {
      if (type === "limit" && cur <= niveau) {
        const p = saut ? cur : niveau;
        entree = { i, p };
        ev.push({ i, couleur: "var(--cap-ink)", texte: p === niveau
          ? `Buy limit exécuté à ${prix(p)} : le prix est descendu jusqu'à votre prix.`
          : `Buy limit exécuté à ${prix(p)}, ${nb(niveau - p)} pips sous votre prix : le prix a sauté par-dessus, et un ordre limite passe à votre prix ou mieux.` });
      } else if (type === "stop" && cur >= niveau) {
        const p = saut ? cur : niveau;
        entree = { i, p };
        ev.push({ i, couleur: "var(--cap-ink)", texte: p === niveau
          ? `Buy stop déclenché : le prix a touché ${prix(niveau)}, l'ordre part au marché et achète à ${prix(p)}.`
          : `Buy stop déclenché à ${prix(niveau)}, mais le prix est passé d'un coup : l'ordre part au marché et achète à ${prix(p)}, ${nb(p - niveau)} pips plus haut. C'est le slippage.` });
      }
      continue;
    }
    if (entree.i === i) continue;
    if (cur <= sl) {
      const p = saut ? cur : sl;
      sortie = { i, p, quoi: "sl" };
      ev.push({ i, couleur: "var(--cap-down)", texte: `Stop loss touché à ${prix(sl)} : votre sell stop vend${p !== sl ? ` au marché, à ${prix(p)} (slippage)` : ""}. Perte de ${nb(entree.p - p)} pips. Le take profit est annulé.` });
      break;
    }
    if (cur >= tp) {
      const p = saut ? cur : tp;
      sortie = { i, p, quoi: "tp" };
      ev.push({ i, couleur: "var(--cap-up)", texte: `Take profit atteint à ${prix(tp)} : votre sell limit vend. Gain de ${nb(p - entree.p)} pips. Le stop loss est annulé.` });
      break;
    }
  }
  return { ch, sauts, ev, entree, sortie, sl, tp, entreeVisee, nomOrdre };
}

export function SimulateurOrdres() {
  const [type, setType] = useState<TypeOrdre>("limit");
  const [ecart, setEcart] = useState(20);
  const [slD, setSlD] = useState(20);
  const [tpD, setTpD] = useState(40);
  const [nom, setNom] = useState<NomTrajet>("recul");
  const niveau = type === "limit" ? -ecart : ecart;
  const sim = useMemo(() => simuler(type, niveau, slD, tpD, nom), [type, niveau, slD, tpD, nom]);
  const { k, setK, lancer, arreter, enCours } = useDefilement(N, 95);
  useEffect(() => { arreter(); setK(0); }, [type, ecart, slD, tpD, nom, arreter, setK]);

  const { ref, w } = useLargeur();
  const H = w < 520 ? 250 : 290;
  const G = 6, D = 58;
  const vals = [...sim.ch, sim.sl, sim.tp, sim.entreeVisee];
  const lo = Math.min(...vals) - 6, hi = Math.max(...vals) + 6;
  const x = (i: number) => G + (i / (N - 1)) * (w - G - D);
  const y = (p: number) => 10 + (1 - (p - lo) / (hi - lo)) * (H - 20);

  const visibles = sim.ev.filter((e) => e.i <= k);
  const ouvert = sim.entree && sim.entree.i <= k && !(sim.sortie && sim.sortie.i <= k);
  const ferme = sim.sortie && sim.sortie.i <= k;
  const fin = k >= N - 1;
  const cur = sim.ch[Math.min(k, N - 1)];
  const resultat = sim.entree && sim.entree.i <= k ? (ferme ? sim.sortie!.p : cur) - sim.entree.p : null;

  const lignes: { p: number; label: string; c: string; plein?: boolean }[] = [
    ...(type !== "marche" ? [{ p: sim.entreeVisee, label: sim.entree && sim.entree.i <= k ? `Entrée prévue ${prix(sim.entreeVisee)}` : `${type === "limit" ? "Buy limit" : "Buy stop"} ${prix(sim.entreeVisee)}`, c: "var(--cap-ink)" }] : [{ p: sim.entreeVisee, label: `Achat au marché ${prix(sim.entreeVisee)}`, c: "var(--cap-ink)" }]),
    { p: sim.sl, label: `Stop loss ${prix(sim.sl)}`, c: "var(--cap-down)" },
    { p: sim.tp, label: `Take profit ${prix(sim.tp)}`, c: "var(--cap-up)" },
  ];
  let d = "";
  for (let i = 0; i <= Math.min(k, N - 1); i++) d += `${i ? "L" : "M"}${x(i).toFixed(1)},${y(sim.ch[i]).toFixed(1)}`;

  return (
    <div>
      <Choix label="Votre ordre d'achat" valeur={type} onChange={setType}
        options={[{ v: "marche", t: "Au marché" }, { v: "limit", t: "Buy limit" }, { v: "stop", t: "Buy stop" }]} />
      <div className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-3">
        {type !== "marche" ? (
          <Curseur label={type === "limit" ? "Buy limit" : "Buy stop"} min={5} max={40} step={1} valeur={ecart} onChange={setEcart}
            affiche={`${prix(niveau)}, ${nb(ecart)} pips ${type === "limit" ? "dessous" : "dessus"}`} />
        ) : (
          <p className="self-center text-[0.95rem]" style={{ color: "var(--cap-ink-2)" }}>Au marché : pas de prix à choisir, l'achat passe tout de suite.</p>
        )}
        <Curseur label="Stop loss" min={10} max={40} step={1} valeur={slD} onChange={setSlD} affiche={`${nb(slD)} pips sous l'entrée`} />
        <Curseur label="Take profit" min={10} max={60} step={1} valeur={tpD} onChange={setTpD} affiche={`${nb(tpD)} pips au-dessus`} />
      </div>
      <div className="mt-2">
        <Choix label="Le trajet du prix" valeur={nom} onChange={setNom} petit
          options={(Object.keys(TRAJETS) as NomTrajet[]).map((v) => ({ v, t: TRAJETS[v].t }))} />
      </div>

      <div ref={ref} className="mt-4 w-full">
        <svg viewBox={`0 0 ${w} ${H}`} width="100%" height={H} role="img" className="block"
          aria-label={`Le prix de l'euro-dollar sur le trajet « ${TRAJETS[nom].t} », avec votre ordre, votre stop loss et votre take profit`}>
          {lignes.map((l, j) => (
            <g key={j} opacity={ferme && j > 0 ? 0.45 : 1}>
              <line x1={G} x2={w - D} y1={y(l.p)} y2={y(l.p)} stroke={l.c} strokeWidth={1.5} strokeDasharray="6 4" />
              <text x={G + 4} y={y(l.p) + (j === 1 ? 15 : -6)} fontSize="12" fontWeight="700" fill={l.c} stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">{l.label}</text>
            </g>
          ))}
          <line x1={G} x2={w - D} y1={y(0)} y2={y(0)} stroke="var(--cap-line-strong)" />
          <text x={w - D + 6} y={y(0) + 4} fontSize="11.5" fill="var(--cap-ink-3)">1,1000</text>
          {Array.from(new Set([sim.sl, sim.tp, sim.entreeVisee])).filter((p) => Math.abs(p) > 2).map((p) => <text key={p} x={w - D + 6} y={y(p) + 4} fontSize="11.5" fill="var(--cap-ink-3)">{prix(p)}</text>)}
          <path d={d} fill="none" stroke="var(--cap-ink)" strokeWidth="2" strokeLinejoin="round" />
          {Array.from(sim.sauts).filter((i) => i <= k).map((i) => (
            <text key={i} x={x(i)} y={y(Math.max(sim.ch[i], sim.ch[i - 1])) - 10} textAnchor="middle" fontSize="11.5" fontStyle="italic" fill="var(--cap-ink-3)">saut</text>
          ))}
          {sim.entree && sim.entree.i <= k && (
            <path d={`M${x(sim.entree.i)},${y(sim.entree.p) + 5} l6,10 h-12 z`} fill="var(--cap-up)" />
          )}
          {ferme && (
            <circle cx={x(sim.sortie!.i)} cy={y(sim.sortie!.p)} r="5.5" fill={sim.sortie!.quoi === "tp" ? "var(--cap-up)" : "var(--cap-down)"} stroke="var(--cap-surface)" strokeWidth="2" />
          )}
          <circle cx={x(k)} cy={y(cur)} r="4.5" fill="var(--cap-ambre)" stroke="var(--cap-surface)" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <Chiffre label={`Prix, minute ${k}`} valeur={prix(cur)} />
          <Chiffre label={ferme ? "Résultat, position fermée" : ouvert ? "Résultat en cours" : "Position"}
            valeur={resultat == null ? (fin ? "jamais ouverte" : "en attente") : `${signe(resultat)} pips`}
            couleur={resultat == null ? "var(--cap-ink-3)" : ton(resultat)}
            note={resultat == null ? undefined : `${signe(resultat, 0)} $ avec 0,10 lot`} />
        </div>
        <Bouton onClick={lancer} disabled={enCours}>{k === 0 ? "Lancer le prix" : enCours ? "Le prix avance…" : "Relancer"}</Bouton>
      </div>

      <div className="mt-4">
        <p className="text-[0.88rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>Le journal</p>
        <ol className="mt-1 space-y-1.5" aria-live="polite">
          {visibles.map((e, j) => (
            <li key={j} className="flex gap-3 text-[0.97rem] leading-snug" style={{ color: "var(--cap-ink-2)" }}>
              <span className="w-14 flex-none tabular-nums" style={{ color: "var(--cap-ink-3)" }}>min. {e.i}</span>
              <span style={{ color: e.couleur ?? "var(--cap-ink-2)" }}>{e.texte}</span>
            </li>
          ))}
          {fin && !ferme && (
            <li className="flex gap-3 text-[0.97rem] leading-snug" style={{ color: "var(--cap-ink)" }}>
              <span className="w-14 flex-none tabular-nums" style={{ color: "var(--cap-ink-3)" }}>fin</span>
              <span>{!sim.entree
                ? `Le prix n'est jamais ${type === "limit" ? "descendu" : "monté"} à ${prix(sim.entreeVisee)} : l'ordre n'est pas passé. Il attend toujours, et vous n'avez rien gagné ni perdu.`
                : `La position est toujours ouverte : ${signe(resultat ?? 0)} pips pour l'instant. Le stop loss et le take profit attendent.`}</span>
            </li>
          )}
        </ol>
        {k === 0 && <p className="mt-2 text-[0.92rem]" style={{ color: "var(--cap-ink-3)" }}>Lancez le prix, puis changez de trajet ou d'ordre et comparez. {dollars(1)} par pip : c'est la valeur d'un pip avec 0,10 lot (leçon « Le pip et le lot »).</p>}
      </div>
    </div>
  );
}
