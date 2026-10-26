"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { GraphiqueEcole, type ConfigGraphique } from "../GraphiqueEcole";
import { BoutonSignal, ChoixSignal, RecommencerSignal, RetourSignal, useCalmeSignal } from "./ElementsSignaux";

/**
 * Décider, puis voir la suite. Le graphique s'arrête au moment où il faut
 * choisir (`jusqua`), comme sur une vraie plateforme : on ne connaît pas le
 * futur. On choisit, puis le temps avance et la correction explique. Plusieurs
 * cas à la suite, et le compte des bonnes réponses à la fin.
 */
export interface CasDecision {
  titre: string;
  /** Le graphique au moment du choix : `jusqua` cache la suite. */
  cfg: ConfigGraphique;
  /** Ce qui s'ajoute ou change quand la suite se dévoile (niveaux, marques…). */
  apres?: Partial<ConfigGraphique>;
  choix: string[];
  bon: number;
  /** La correction (html : <b>, <span class="mot">). */
  explication: string;
}

export function GrapheDecision({ cas, question }: { cas: CasDecision[]; question: string }) {
  const [k, setK] = useState(0);
  const [choix, setChoix] = useState<number | null>(null);
  const [vu, setVu] = useState(false);
  const [bons, setBons] = useState<boolean[]>([]);
  const reduce = useCalmeSignal();
  const c = cas[k];
  const fin = c.cfg.bougies.length - 1;
  const depart = c.cfg.jusqua ?? fin;
  const [jusqua, setJusqua] = useState(depart);
  const raf = useRef(0);

  // Nouveau cas : on revient au moment du choix.
  useEffect(() => { setJusqua(depart); }, [k, depart]);

  // La suite se dévoile bougie après bougie.
  useEffect(() => {
    if (!vu) return;
    if (reduce) { setJusqua(fin); return; }
    const t0 = performance.now();
    const duree = Math.min(1600, 45 * (fin - depart));
    const pas = (t: number) => {
      const f = Math.min(1, (t - t0) / duree);
      setJusqua(Math.round(depart + (fin - depart) * f));
      if (f < 1) raf.current = requestAnimationFrame(pas);
    };
    raf.current = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf.current);
  }, [vu, reduce, fin, depart]);

  const valider = () => {
    if (choix == null) return;
    setVu(true);
    setBons((b) => { const n = [...b]; n[k] = choix === c.bon; return n; });
  };
  const suivant = () => { setK(k + 1); setChoix(null); setVu(false); };
  const recommencer = () => { setK(0); setChoix(null); setVu(false); setBons([]); };
  const dernier = k === cas.length - 1;
  const score = bons.filter(Boolean).length;

  const cfg: ConfigGraphique = vu ? { ...c.cfg, ...(c.apres ?? {}), jusqua } : { ...c.cfg, jusqua };

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-[1rem] font-semibold" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>{c.titre}</p>
        <p className="flex-none text-[0.9rem] italic tabular-nums" style={{ color: "var(--cap-amber-ink)", fontFamily: "var(--cap-font-display)" }}>
          {k + 1}/{cas.length}
        </p>
      </div>
      <GraphiqueEcole {...cfg} sansSurvol={!vu || cfg.sansSurvol} ariaLabel={`${c.titre} : ${vu ? "la suite est dévoilée" : "le graphique s'arrête au moment du choix"}`} />
      <p className="mt-3 text-[0.98rem]" style={{ color: "var(--cap-ink)" }}>{question}</p>
      <div className="mt-1">
        <ChoixSignal label={question} options={c.choix} valeur={choix} onChange={setChoix} disabled={vu}
          etat={vu ? (j) => (j === c.bon ? "juste" : j === choix ? "faux" : null) : undefined} />
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {vu ? (
          <RetourSignal ton={choix === c.bon ? "juste" : "faux"} className="flex-1">
            <span dangerouslySetInnerHTML={{ __html: c.explication }} />
            {dernier && <><br /><b style={{ color: "var(--cap-ink)" }}>Votre score : {score} sur {cas.length}.</b></>}
          </RetourSignal>
        ) : (
          <RetourSignal className="flex-1">{choix == null ? "Choisissez une réponse, puis dévoilez la suite." : "Prêt ? Le temps va avancer."}</RetourSignal>
        )}
        <div className="flex flex-none items-center justify-end gap-1">
          {(vu || k > 0) && <RecommencerSignal onClick={recommencer} label="Recommencer depuis le premier cas" />}
          {!vu && <BoutonSignal onClick={valider} disabled={choix == null}>Voir la suite</BoutonSignal>}
          {vu && !dernier && <BoutonSignal onClick={suivant}>Cas suivant <ArrowRight size={16} /></BoutonSignal>}
        </div>
      </div>
    </div>
  );
}
