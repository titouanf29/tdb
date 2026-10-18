"use client";

import { useState } from "react";
import { fmt } from "@/lib/cours/marche";
import { ChiffreSignal, ChoixSignal, CurseurSignal, nf, useLargeurSignal } from "./ElementsSignaux";

/**
 * Où sortir ? Le mouvement de l'euro-dollar, de 1,1000 à 1,1200, prolongé à
 * 127,2 % et 161,8 % de sa hauteur. On règle son entrée et son stop, et l'outil
 * compte le risque, les deux objectifs, la taille de position pour risquer
 * 20 $ (1 % de 2 000 $), et ce que donnent trois suites possibles quand on sort
 * la moitié au premier objectif.
 */
const CREUX = 1.1, SOMMET = 1.12;
const HAUT = SOMMET - CREUX;
const T1 = CREUX + 1.272 * HAUT;
const T2 = CREUX + 1.618 * HAUT;
const PIP = 10000;
const RISQUE_MAX = 20;

export function ExtensionsFibonacci() {
  const [entree, setEntree] = useState(1.108);
  const [stop, setStop] = useState(1.104);
  const [suite, setSuite] = useState(1);
  const { ref, w } = useLargeurSignal(560);

  const risque = Math.round((entree - stop) * PIP);
  const o1 = Math.round((T1 - entree) * PIP * 10) / 10;
  const o2 = Math.round((T2 - entree) * PIP * 10) / 10;
  const lot = risque > 0 ? Math.floor((RISQUE_MAX / (risque * 10)) * 100) / 100 : 0;
  const perte = lot * 10 * risque;
  const moitie = Math.floor((lot * 100) / 2) / 100;
  const reste = Math.round((lot - moitie) * 100) / 100;
  const g1 = moitie * 10 * o1;
  const resultat = suite === 0 ? -perte : suite === 1 ? g1 : g1 + reste * 10 * o2;

  // Le dessin
  const H = w < 480 ? 280 : 320;
  const lo = 1.0975, hi = 1.1345;
  const y = (p: number) => 12 + (1 - (p - lo) / (hi - lo)) * (H - 24);
  const G = 8, D = w < 480 ? 104 : 150;
  const iw = w - G - D;
  const X = (f: number) => G + f * iw;
  const xe = 0.56;
  const lignes: { p: number; t: string; c: string; fort?: boolean }[] = [
    { p: T2, t: `161,8 % : ${fmt(T2, 4)}`, c: "var(--cap-up)", fort: true },
    { p: T1, t: `127,2 % : ${fmt(T1, 4)}`, c: "var(--cap-up)", fort: true },
    { p: SOMMET, t: `100 % : ${fmt(SOMMET, 4)}`, c: "var(--cap-ink-3)" },
    { p: entree, t: `Entrée ${fmt(entree, 4)}`, c: "var(--cap-ink)", fort: true },
    { p: stop, t: `Stop ${fmt(stop, 4)}`, c: "var(--cap-down)", fort: true },
    { p: CREUX, t: `0 % : ${fmt(CREUX, 4)}`, c: "var(--cap-ink-3)" },
  ];
  // Des étiquettes qui ne se chevauchent pas : on les écarte de haut en bas.
  const places: number[] = [];
  lignes.forEach((l, k) => {
    let yy = y(l.p) + 4;
    if (k > 0 && yy - places[k - 1] < 15) yy = places[k - 1] + 15;
    places.push(yy);
  });

  return (
    <div>
      <div ref={ref} className="w-full">
        <svg viewBox={`0 0 ${w} ${H}`} width="100%" height={H} role="img"
          aria-label={`Le mouvement de 1,1000 à 1,1200, entrée à ${fmt(entree, 4)}, stop à ${fmt(stop, 4)}, objectifs à ${fmt(T1, 4)} et ${fmt(T2, 4)}`}>
          <rect x={X(xe)} width={X(1) - X(xe)} y={y(T1)} height={y(entree) - y(T1)} fill="var(--cap-up)" opacity="0.1" />
          <rect x={X(xe)} width={X(1) - X(xe)} y={y(entree)} height={Math.max(0, y(stop) - y(entree))} fill="var(--cap-down)" opacity="0.14" />
          {lignes.map((l, k) => (
            <g key={k}>
              <line x1={G} x2={X(1)} y1={y(l.p)} y2={y(l.p)} stroke={l.c} strokeWidth={l.fort ? 1.5 : 1} strokeDasharray={l.fort ? undefined : "5 4"} />
              <text x={X(1) + 6} y={places[k]} fontSize="11.5" fontWeight={l.fort ? 700 : 500} fill={l.c}>{l.t}</text>
            </g>
          ))}
          {/* Le chemin : creux, sommet, retour à l'entrée, puis la suite possible */}
          <path d={`M${X(0.04)},${y(CREUX)} L${X(0.36)},${y(SOMMET)} L${X(xe)},${y(entree)}`} fill="none" stroke="var(--cap-ink)" strokeWidth="2.4" strokeLinejoin="round" />
          <path d={`M${X(xe)},${y(entree)} L${X(0.78)},${y(T1)} L${X(0.97)},${y(T2)}`} fill="none" stroke="var(--cap-ink-3)" strokeWidth="2" strokeDasharray="6 5" />
          <circle cx={X(0.04)} cy={y(CREUX)} r="4.5" fill="var(--cap-ink)" />
          <circle cx={X(0.36)} cy={y(SOMMET)} r="4.5" fill="var(--cap-ink)" />
          <circle cx={X(xe)} cy={y(entree)} r="5.5" fill="var(--cap-ambre)" stroke="var(--cap-surface)" strokeWidth="1.5" />
          <text x={X(0.04) + 8} y={y(CREUX) + 16} fontSize="12" fontWeight="600" fill="var(--cap-ink-2)">Creux</text>
          <text x={X(0.36)} y={y(SOMMET) - 9} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--cap-ink-2)">Sommet</text>
          <text x={X(0.78) - 8} y={y(T1) - 8} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--cap-up)">Objectif 1</text>
          <text x={X(0.97) - 8} y={y(T2) - 8} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--cap-up)">Objectif 2</text>
        </svg>
      </div>

      <div className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
        <CurseurSignal label="Votre entrée" valeur={Math.round(entree * PIP)} min={11070} max={11110}
          onChange={(v) => { setEntree(v / PIP); if (Math.round(stop * PIP) > v - 5) setStop((v - 5) / PIP); }} ecrire={(v) => fmt(v / PIP, 4)} aide="Dans la zone 50 à 61,8 % : de 1,1076 à 1,1100." />
        <CurseurSignal label="Votre stop" valeur={Math.round(stop * PIP)} min={11000} max={Math.round(entree * PIP) - 5}
          onChange={(v) => setStop(v / PIP)} ecrire={(v) => fmt(v / PIP, 4)} couleur="var(--cap-down)" aide="Sous la zone, sous la mèche du signal." />
      </div>

      <div className="mt-4 grid gap-x-8 sm:grid-cols-2">
        <div>
          <ChiffreSignal label="Vous risquez" valeur={`${risque} pips`} couleur="var(--cap-down)" />
          <ChiffreSignal label="Objectif 1 (127,2 %)" valeur={`${nf(o1, 0)} pips`} couleur="var(--cap-up)" />
          <ChiffreSignal label="Objectif 2 (161,8 %)" valeur={`${nf(o2, 0)} pips`} couleur="var(--cap-up)" />
          <ChiffreSignal label="Objectif 1 ÷ risque" valeur={<span style={{ color: "var(--cap-amber-ink)" }}>{nf(o1 / risque, 1)} fois</span>} fort />
        </div>
        <div>
          <ChiffreSignal label="Taille pour risquer 20 $ au plus" valeur={lot >= 0.01 ? `${nf(lot, 2)} lot` : "trop petite"} />
          <ChiffreSignal label="Perte si le stop est touché" valeur={`${nf(perte, 2)} $`} couleur="var(--cap-down)" />
          <ChiffreSignal label="Sortie au premier objectif" valeur={`${nf(moitie, 2)} lot`} />
          <ChiffreSignal label="Reste, stop remonté à l'entrée" valeur={`${nf(reste, 2)} lot`} />
        </div>
      </div>

      <p className="mt-4 text-[0.98rem] font-semibold" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>Et ensuite ?</p>
      <ChoixSignal label="La suite du trade" options={["Le stop est touché d'abord", "Objectif 1, puis retour à l'entrée", "Objectif 1, puis objectif 2"]} valeur={suite} onChange={setSuite} />
      <p aria-live="polite" className="mt-2 text-[0.98rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>
        {lot < 0.01
          ? "Avec un stop aussi large, même 0,01 lot risque plus de 20 $ : rapprochez le stop, ou passez votre tour."
          : suite === 0
            ? <>Le prix casse la zone et touche votre stop : <b style={{ color: "var(--cap-down)" }}>−{nf(perte, 2)} $</b>, la petite perte prévue à l'avance.</>
            : suite === 1
              ? <>Vous sortez {nf(moitie, 2)} lot à l'objectif 1 : <b style={{ color: "var(--cap-up)" }}>+{nf(g1, 2)} $</b>. Le prix revient ensuite à votre entrée : le reste sort à zéro, protégé par le stop remonté. Total : <b style={{ color: "var(--cap-up)" }}>+{nf(resultat, 2)} $</b>.</>
              : <>Vous sortez {nf(moitie, 2)} lot à l'objectif 1 (+{nf(g1, 2)} $), puis {nf(reste, 2)} lot à l'objectif 2 (+{nf(reste * 10 * o2, 2)} $). Total : <b style={{ color: "var(--cap-up)" }}>+{nf(resultat, 2)} $</b>. Le cas le plus beau, et pas le plus fréquent.</>}
        {" "}<span style={{ color: "var(--cap-ink-3)" }}>Un lot d'euro-dollar vaut 10 $ par pip ; les plateformes n'acceptent que des centièmes de lot, d'où une « moitié » arrondie.</span>
      </p>
    </div>
  );
}
