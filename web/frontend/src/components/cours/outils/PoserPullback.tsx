"use client";

import { useEffect, useRef, useState } from "react";
import { fmt, type Bougie } from "@/lib/cours/marche";
import { GraphiqueEcole, type Niveau } from "../GraphiqueEcole";
import { BoutonSignal, ChiffreSignal, ChoixSignal, RecommencerSignal, RetourSignal, nf, useCalmeSignal } from "./ElementsSignaux";

/**
 * Poser son trade sur un pullback : on choisit ce qu'on place (entrée, stop,
 * objectif), on clique à la bonne hauteur sur le graphique, l'outil compte le
 * risque, l'objectif et la taille pour risquer 20 $. Puis la correction, et
 * la suite du graphique : qui a été touché d'abord, le stop ou l'objectif ?
 */
const PIP = 10000;
type Quoi = 0 | 1 | 2;
const NOMS = ["Entrée", "Stop", "Objectif"];

export function PoserPullback({ bougies, jusqua, niveau, sommet }: {
  bougies: Bougie[];
  /** La bougie du rebond : le graphique s'arrête là. */
  jusqua: number;
  /** Le niveau cassé, devenu plancher. */
  niveau: number;
  /** Le dernier sommet, avant le retour. */
  sommet: number;
}) {
  const calme = useCalmeSignal();
  const [quoi, setQuoi] = useState<Quoi>(0);
  const [p, setP] = useState<(number | null)[]>([null, null, null]);
  const [verifie, setVerifie] = useState(false);
  const [fin, setFin] = useState(jusqua);
  const raf = useRef(0);
  const n = bougies.length;
  const rebond = bougies[jusqua];
  const meche = rebond.l;

  useEffect(() => {
    if (!verifie) { setFin(jusqua); return; }
    if (calme) { setFin(n - 1); return; }
    const t0 = performance.now();
    const pas = (t: number) => {
      const f = Math.min(1, (t - t0) / 1500);
      setFin(Math.round(jusqua + (n - 1 - jusqua) * f));
      if (f < 1) raf.current = requestAnimationFrame(pas);
    };
    raf.current = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf.current);
  }, [verifie, calme, jusqua, n]);

  const clic = (prix: number) => {
    if (verifie) return;
    const arrondi = Math.round(prix * PIP) / PIP;
    const np = [...p];
    np[quoi] = arrondi;
    setP(np);
    const suivant = np.findIndex((v) => v == null);
    if (suivant >= 0) setQuoi(suivant as Quoi);
  };

  const [e, s, o] = p;
  const risque = e != null && s != null ? Math.round((e - s) * PIP) : null;
  const vise = e != null && o != null ? Math.round((o - e) * PIP) : null;
  const rapport = risque && vise && risque > 0 ? vise / risque : null;
  const lot = risque && risque > 0 ? Math.floor((20 / (risque * 10)) * 100) / 100 : null;

  const niveaux: Niveau[] = [{ prix: niveau, zone: 0.0006, label: `Niveau cassé ${fmt(niveau, 4)}`, couleur: "var(--cap-ink-3)" }];
  if (e != null) niveaux.push({ prix: e, label: `Entrée ${fmt(e, 4)}`, couleur: "var(--cap-ink)", pointille: false, epaisseur: 2 });
  if (s != null) niveaux.push({ prix: s, label: `Stop ${fmt(s, 4)}`, couleur: "var(--cap-down)", pointille: false, epaisseur: 2 });
  if (o != null) niveaux.push({ prix: o, label: `Objectif ${fmt(o, 4)}`, couleur: "var(--cap-up)", pointille: false, epaisseur: 2 });

  // La correction, point par point.
  const notes: { ok: boolean; t: string }[] = [];
  if (e != null && s != null && o != null) {
    notes.push(e < meche
      ? { ok: false, t: `L'entrée est sous la mèche du rebond (${fmt(meche, 4)}) : le prix n'y est même pas allé.` }
      : e > rebond.c + 0.001
        ? { ok: false, t: `L'entrée est loin au-dessus de la clôture du rebond (${fmt(rebond.c, 4)}) : vous courez après le prix, et votre stop s'éloigne.` }
        : { ok: true, t: `Entrée près de la clôture du rebond (${fmt(rebond.c, 4)}) : bien.` });
    notes.push(s >= e
      ? { ok: false, t: "Le stop doit être sous l'entrée, pour un achat." }
      : s >= meche
        ? { ok: false, t: `Le stop est au-dessus de la pointe de la mèche (${fmt(meche, 4)}) : la moindre nouvelle mèche vous sortirait.` }
        : s < niveau - 0.003
          ? { ok: false, t: "Le stop est très loin sous le niveau : vous risquez beaucoup de pips pour rien." }
          : { ok: true, t: `Stop sous le niveau et sous la mèche du rebond (${fmt(meche, 4)}) : bien.` });
    notes.push(rapport == null || o <= e
      ? { ok: false, t: "L'objectif doit être au-dessus de l'entrée." }
      : rapport < 2
        ? { ok: false, t: `L'objectif ne vaut que ${nf(rapport, 1)} fois le risque. Visez au moins deux fois : le dernier sommet (${fmt(sommet, 4)}) était un bon candidat.` }
        : { ok: true, t: `Objectif à ${nf(rapport, 1)} fois le risque : bien.` });
  }
  const tout = notes.length === 3 && notes.every((x) => x.ok);

  // Ce qui s'est passé ensuite.
  let issue: string | null = null;
  if (verifie && e != null && s != null && o != null && s < e && o > e) {
    for (let i = jusqua + 1; i < n; i++) {
      if (bougies[i].l <= s) { issue = `Le stop a été touché d'abord, à la bougie ${i + 1} : −${risque} pips.`; break; }
      if (bougies[i].h >= o) { issue = `L'objectif a été atteint à la bougie ${i + 1} : +${vise} pips.`; break; }
    }
    if (!issue) issue = "Ni le stop ni l'objectif n'ont été touchés sur ce graphique : le trade serait toujours ouvert.";
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[0.94rem]" style={{ color: "var(--cap-ink-2)" }}>Vous placez :</span>
        <ChoixSignal label="Ce que vous placez" options={NOMS.map((x, k) => (p[k] != null ? `${x} ✓` : x))} valeur={quoi} onChange={(k) => setQuoi(k as Quoi)} disabled={verifie} />
      </div>
      <GraphiqueEcole bougies={bougies} jusqua={fin} niveaux={niveaux} surligne={[jusqua]} apparition={false} sansSurvol={!verifie}
        onClic={verifie ? undefined : clic} ariaLabel="Graphique du pullback : cliquez pour placer l'entrée, le stop et l'objectif" />
      <div className="mt-3 grid gap-x-8 sm:grid-cols-2">
        <div>
          <ChiffreSignal label="Risque, de l'entrée au stop" valeur={risque != null ? `${risque} pips` : "à placer"} couleur="var(--cap-down)" />
          <ChiffreSignal label="Objectif, de l'entrée à la cible" valeur={vise != null ? `${vise} pips` : "à placer"} couleur="var(--cap-up)" />
        </div>
        <div>
          <ChiffreSignal label="Objectif ÷ risque" valeur={rapport != null && rapport > 0 ? <span style={{ color: "var(--cap-amber-ink)" }}>{nf(rapport, 1)} fois</span> : "?"} fort />
          <ChiffreSignal label="Taille pour risquer 20 $" valeur={lot != null && lot >= 0.01 ? `${nf(lot, 2)} lot` : "?"} />
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {!verifie ? (
            <RetourSignal>
              {p.every((v) => v == null)
                ? `Le prix a cassé ${fmt(niveau, 4)}, il est revenu dessus, et la bougie encadrée vient de rebondir. Placez votre entrée, puis votre stop, puis votre objectif, en cliquant sur le graphique.`
                : p.some((v) => v == null)
                  ? `Cliquez pour placer : ${NOMS[quoi].toLowerCase()}. Vous pouvez reprendre un point en le choisissant au-dessus du graphique.`
                  : "Tout est placé. Vérifiez votre plan, puis regardez la suite."}
            </RetourSignal>
          ) : (
            <div aria-live="polite">
              <p className="text-[0.98rem] font-semibold" style={{ color: tout ? "var(--cap-up)" : "var(--cap-ink)" }}>{tout ? "Un plan propre." : "La correction :"}</p>
              <ul className="mt-1 space-y-1 text-[0.96rem]" style={{ color: "var(--cap-ink-2)" }}>
                {notes.map((x, k) => (
                  <li key={k}><b style={{ color: x.ok ? "var(--cap-up)" : "var(--cap-down)" }}>{x.ok ? "Oui." : "Non."}</b> {x.t}</li>
                ))}
              </ul>
              {issue && <p className="mt-2 text-[0.98rem]" style={{ color: "var(--cap-ink)" }}><b>La suite :</b> {issue} Un bon plan peut perdre, un mauvais peut gagner : ce qui compte, c'est de répéter le bon.</p>}
            </div>
          )}
        </div>
        <div className="flex flex-none items-center justify-end gap-1">
          {(p.some((v) => v != null) || verifie) && <RecommencerSignal onClick={() => { setP([null, null, null]); setQuoi(0); setVerifie(false); }} />}
          {!verifie && <BoutonSignal disabled={p.some((v) => v == null)} onClick={() => setVerifie(true)}>Vérifier et voir la suite</BoutonSignal>}
        </div>
      </div>
    </div>
  );
}
