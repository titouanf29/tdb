"use client";

import { useEffect, useRef, useState } from "react";
import { fmt, type Bougie } from "@/lib/cours/marche";
import { GraphiqueEcole, type Niveau, type Zone } from "../GraphiqueEcole";
import { Bouton, BoutonLien, Choix, Ligne, Lignes, Verdict, nb, usd, useCalme } from "./ElementsRisque";

/**
 * Poser son plan avant d'entrer : l'entrée est le dernier prix, l'élève pose
 * le stop puis l'objectif d'un clic sur le graphique, et lit le ratio
 * risque / rendement. Puis il fait avancer le temps pour voir lequel des deux
 * le prix touche en premier.
 */
export function PlanDuTrade({ bougies, entree, creux, proposition, pas = 1 }: {
  bougies: Bougie[];
  /** La bougie où l'on achète (à sa clôture). */
  entree: number;
  /** Le prix du dernier creux, sous lequel l'idée devient fausse. */
  creux: number;
  proposition: { stop: number; objectif: number };
  /** L'arrondi des prix posés. */
  pas?: number;
}) {
  const reduce = useCalme();
  const prixEntree = bougies[entree].c;
  const fin = bougies.length - 1;
  const [mode, setMode] = useState<"stop" | "objectif">("stop");
  const [stop, setStop] = useState<number | null>(null);
  const [objectif, setObjectif] = useState<number | null>(null);
  const [vuProposition, setVuProposition] = useState(false);
  const [jusqua, setJusqua] = useState(entree);
  const anim = useRef(0);

  const termine = jusqua > entree;
  const arrondir = (p: number) => Math.round(p / pas) * pas;

  const poser = (p: number) => {
    if (termine) return;
    const v = arrondir(p);
    if (mode === "stop") { setStop(v); if (objectif == null) setMode("objectif"); }
    else { setObjectif(v); if (stop == null) setMode("stop"); }
  };

  useEffect(() => () => cancelAnimationFrame(anim.current), []);

  const avancer = () => {
    if (reduce) { setJusqua(fin); return; }
    const t0 = performance.now();
    const duree = 1600;
    const pasAnim = (t: number) => {
      const f = Math.min(1, (t - t0) / duree);
      setJusqua(Math.round(entree + (fin - entree) * f));
      if (f < 1) anim.current = requestAnimationFrame(pasAnim);
    };
    anim.current = requestAnimationFrame(pasAnim);
  };

  const recommencer = () => {
    cancelAnimationFrame(anim.current);
    setStop(null); setObjectif(null); setMode("stop"); setVuProposition(false); setJusqua(entree);
  };

  // Ce que le prix touche en premier, une fois le temps écoulé.
  let issue: { type: "stop" | "objectif" | "ouvert"; i: number } = { type: "ouvert", i: fin };
  if (stop != null && objectif != null) {
    for (let i = entree + 1; i <= fin; i++) {
      if (bougies[i].l <= stop) { issue = { type: "stop", i }; break; }
      if (bougies[i].h >= objectif) { issue = { type: "objectif", i }; break; }
    }
  }

  const risque = stop != null ? prixEntree - stop : null;
  const gain = objectif != null ? objectif - prixEntree : null;
  const ratio = risque && gain && risque > 0 && gain > 0 ? gain / risque : null;

  const niveaux: Niveau[] = [
    { prix: prixEntree, label: `Entrée ${fmt(prixEntree, 0)}`, couleur: "var(--cap-ink)", pointille: false },
    ...(stop != null ? [{ prix: stop, label: `Votre stop ${fmt(stop, 0)}`, couleur: "var(--cap-down)", pointille: false, epaisseur: 2 }] : []),
    ...(objectif != null ? [{ prix: objectif, label: `Votre objectif ${fmt(objectif, 0)}`, couleur: "var(--cap-up)", pointille: false, epaisseur: 2 }] : []),
    ...(vuProposition ? [
      { prix: proposition.stop, label: "Stop proposé", couleur: "var(--cap-down)" },
      { prix: proposition.objectif, label: "Objectif proposé", couleur: "var(--cap-up)" },
    ] : []),
  ];
  const zones: Zone[] = [];
  if (stop != null && stop < prixEntree) zones.push({ i0: entree, i1: fin, p0: stop, p1: prixEntree, couleur: "var(--cap-down)" });
  if (objectif != null && objectif > prixEntree) zones.push({ i0: entree, i1: fin, p0: prixEntree, p1: objectif, couleur: "var(--cap-up)" });

  // Le commentaire du plan.
  let avis = "";
  let ton: "neutre" | "bien" | "mal" = "neutre";
  if (stop == null && objectif == null) avis = "Choisissez « Le stop », puis touchez le graphique à la hauteur où vous le placeriez.";
  else if (stop != null && stop >= prixEntree) { avis = "Pour un achat, le stop se place sous le prix d'entrée : c'est là que le prix irait si vous aviez tort."; ton = "mal"; }
  else if (objectif != null && objectif <= prixEntree) { avis = "Pour un achat, l'objectif se place au-dessus de l'entrée : c'est là que vous encaissez le gain."; ton = "mal"; }
  else if (stop != null && stop > creux) { avis = `Votre stop est au-dessus du dernier creux (${fmt(creux, 0)}). Le prix peut redescendre jusque-là sans que votre idée soit fausse : un stop si serré risque d'être touché pour rien. Placez-le un peu sous le creux.`; ton = "mal"; }
  else if (stop != null && creux - stop > 40 * pas) { avis = `Votre stop est loin sous le creux (${usd(creux - stop)} plus bas). Il protège, mais chaque perte coûtera plus que nécessaire : le bon endroit est juste sous le creux.`; ton = "neutre"; }
  else if (objectif == null) { avis = "Bien placé : juste sous le dernier creux, là où l'idée devient fausse. Posez maintenant l'objectif."; ton = "bien"; }
  else if (stop == null) avis = "Posez maintenant le stop : sans lui, rien ne limite la perte.";
  else if (ratio != null && ratio < 1) { avis = `Vous visez moins que ce que vous risquez (1 pour ${nb(ratio, 1)}). Il faudrait avoir raison plus d'une fois sur deux pour ne pas perdre.`; ton = "mal"; }
  else if (ratio != null) { avis = `Un plan complet : vous risquez ${usd(risque!)} par once pour en viser ${usd(gain!)}, un ratio de 1 pour ${nb(ratio, 1)}. Un seul gain vaut ${nb(ratio, 1)} ${ratio < 2 ? "perte" : "pertes"}.`; ton = "bien"; }

  let suite = "";
  if (termine && jusqua === fin && stop != null && objectif != null) {
    if (issue.type === "stop") suite = `Le prix est redescendu à ${fmt(bougies[issue.i].l, 0)} et a touché votre stop : perte de ${usd(risque!)} par once, celle que vous aviez décidée. ${stop > creux ? "Votre stop était au-dessus du creux : le prix a respiré, puis il est monté sans vous." : ""}`;
    else if (issue.type === "objectif") suite = `Le prix a atteint votre objectif : gain de ${usd(gain!)} par once. Ici, ça a marché. Ça ne marche pas à chaque fois : c'est pour ça que le stop existe, et que le ratio compte.`;
    else suite = "Ni le stop ni l'objectif n'ont été touchés : la position est toujours ouverte. Un objectif trop lointain peut ne jamais être atteint.";
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <Choix label="Ce que vous posez" valeur={mode} onChange={setMode}
          options={[{ v: "stop", texte: "Le stop" }, { v: "objectif", texte: "L'objectif" }]} />
        <p className="pb-2 text-[0.92rem]" style={{ color: "var(--cap-ink-3)" }}>Achat à {fmt(prixEntree, 0)} $, sur l'or</p>
      </div>
      <GraphiqueEcole apparition={false} hauteur={300} bougies={bougies} jusqua={jusqua} niveaux={niveaux} zones={zones} sansSurvol
        marques={[{ i: entree, type: "achat" }]}
        onClic={termine ? undefined : (p) => poser(p)}
        ariaLabel="Graphique de l'or : touchez pour poser votre stop, puis votre objectif" />

      <div className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
        <Lignes>
          <Ligne label="Risque (entrée moins stop)" valeur={risque != null && risque > 0 ? `${usd(risque)} par once` : "à poser"} />
          <Ligne label="Gain visé (objectif moins entrée)" valeur={gain != null && gain > 0 ? `${usd(gain)} par once` : "à poser"} />
          <Ligne label="Ratio risque / rendement" fort valeur={ratio != null ? `1 pour ${nb(ratio, 1)}` : "?"} />
        </Lignes>
        <div>
          <Verdict ton={ton}>{avis}</Verdict>
          {suite && <Verdict ton={issue.type === "objectif" ? "bien" : issue.type === "stop" ? "mal" : "neutre"}>{suite}</Verdict>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {!termine && <Bouton onClick={avancer} disabled={ratio == null}>Voir la suite du prix</Bouton>}
        {!vuProposition && <BoutonLien onClick={() => setVuProposition(true)}>Voir le plan proposé</BoutonLien>}
        {(stop != null || objectif != null || termine) && <BoutonLien onClick={recommencer}>Recommencer</BoutonLien>}
      </div>
      {vuProposition && (
        <p className="mt-2 text-[0.95rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>
          Le plan proposé : le stop à {fmt(proposition.stop, 0)}, juste sous le creux de {fmt(creux, 0)} ; l'objectif à {fmt(proposition.objectif, 0)}, le dernier sommet.
          Risque {usd(prixEntree - proposition.stop)}, gain visé {usd(proposition.objectif - prixEntree)} : 1 pour {nb((proposition.objectif - prixEntree) / (prixEntree - proposition.stop), 1)}.
        </p>
      )}
    </div>
  );
}
