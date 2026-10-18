"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Choix, Chiffre, Curseur, Recommencer, Verdict, dollars, nb, signe, useCalme } from "./ElementsOrdres";

/**
 * Leçon 17. Deux outils : le convertisseur, qui fait avancer le prix pip par
 * pip ou pipette par pipette en montrant quel chiffre bouge ; et le calcul de
 * la valeur d'un pip selon la taille de la position, sur l'euro-dollar et sur
 * l'or.
 */

type Paire = "eurusd" | "usdjpy";
const PAIRES: Record<Paire, { t: string; depart: number; dec: number }> = {
  eurusd: { t: "Euro-dollar", depart: 110000, dec: 5 },
  usdjpy: { t: "Dollar-yen", depart: 150000, dec: 3 },
};

/** Le prix, en pipettes entières, écrit chiffre par chiffre. */
function Chiffres({ pipettes, dec }: { pipettes: number; dec: number }) {
  const calme = useCalme();
  const txt = (pipettes / 10 ** dec).toFixed(dec);
  const [ent, frac] = txt.split(".");
  return (
    <p className="tabular-nums leading-none" style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }} aria-hidden>
      <span className="text-[2.6rem] sm:text-[3.2rem]">{ent},</span>
      {frac.split("").map((c, j) => {
        const pip = j === dec - 2;
        const pipette = j === dec - 1;
        return (
          <span key={j} className="relative inline-block"
            style={{
              fontSize: pipette ? "1.7rem" : undefined,
              color: pipette ? "var(--cap-ink-3)" : "var(--cap-ink)",
              verticalAlign: pipette ? "super" : undefined,
              transition: calme ? undefined : "color .3s ease",
            }}>
            <motion.span key={c} className={`inline-block ${pipette ? "" : "text-[2.6rem] sm:text-[3.2rem]"}`}
              initial={calme ? false : { y: -10, opacity: 0.2 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.25 }}>{c}</motion.span>
            {pip && <span className="absolute inset-x-0 -bottom-1.5 h-[3px] rounded-full" style={{ backgroundColor: "var(--cap-ambre)" }} />}
          </span>
        );
      })}
    </p>
  );
}

function Pas({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label}
      className="min-h-11 min-w-[5.5rem] rounded-[10px] px-3 text-[0.95rem] font-semibold transition-colors hover:bg-[color:var(--cap-surface-2)]"
      style={{ color: "var(--cap-ink)", boxShadow: "inset 0 0 0 1px var(--cap-line-strong)" }}>
      {children}
    </button>
  );
}

export function ConvertisseurPip() {
  const [paire, setPaire] = useState<Paire>("eurusd");
  const [ecart, setEcart] = useState(0); // en pipettes
  const P = PAIRES[paire];
  const prix = P.depart + ecart;
  const pips = ecart / 10;
  const ecrit = (v: number) => nb(v / 10 ** P.dec, P.dec);

  return (
    <div>
      <Choix label="La paire" valeur={paire} onChange={(v) => { setPaire(v); setEcart(0); }}
        options={[{ v: "eurusd", t: "Euro-dollar" }, { v: "usdjpy", t: "Dollar-yen" }]} />
      <div className="mt-5 flex flex-col items-center">
        <Chiffres pipettes={prix} dec={P.dec} />
        <p className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[0.9rem]" style={{ color: "var(--cap-ink-3)" }}>
          <span><span className="mr-1.5 inline-block h-[3px] w-4 rounded-full align-middle" style={{ backgroundColor: "var(--cap-ambre)" }} />le chiffre du pip ({paire === "eurusd" ? "4e" : "2e"} après la virgule)</span>
          <span>en petit : la pipette</span>
        </p>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Pas label="Baisser d'un pip" onClick={() => setEcart(ecart - 10)}>−1 pip</Pas>
        <Pas label="Baisser d'une pipette" onClick={() => setEcart(ecart - 1)}>−1 pipette</Pas>
        <Pas label="Monter d'une pipette" onClick={() => setEcart(ecart + 1)}>+1 pipette</Pas>
        <Pas label="Monter d'un pip" onClick={() => setEcart(ecart + 10)}>+1 pip</Pas>
        <Pas label="Monter de dix pips" onClick={() => setEcart(ecart + 100)}>+10 pips</Pas>
      </div>
      <Verdict>
        {ecart === 0
          ? <>Le prix est à <b>{ecrit(prix)}</b>. Faites-le bouger et regardez quel chiffre change.</>
          : <>De {ecrit(P.depart)} à <b>{ecrit(prix)}</b> : le prix a bougé de <b>{signe(pips, Number.isInteger(pips) ? 0 : 1)} pip{Math.abs(pips) >= 2 ? "s" : ""}</b>, soit {nb(Math.abs(ecart))} pipette{Math.abs(ecart) > 1 ? "s" : ""}. {paire === "eurusd" ? "Sur l'euro-dollar, un pip vaut 0,0001." : "Sur le dollar-yen, un pip vaut 0,01."}</>}
      </Verdict>
      {ecart !== 0 && <div className="mt-1"><Recommencer onClick={() => setEcart(0)} label="Revenir au départ" /></div>}
    </div>
  );
}

type Actif = "eurusd" | "or";
const TAILLES = [1, 0.1, 0.01];
const NOMS: Record<number, string> = { 1: "Lot standard (1)", 0.1: "Mini-lot (0,10)", 0.01: "Micro-lot (0,01)" };

const part = (perte: number) => {
  const pc = (perte / 2000) * 100;
  return pc > 100 ? `${nb(pc)} % du compte : plus que le compte entier` : `${nb(pc)} % du compte`;
};

export function ValeurPip() {
  const [actif, setActif] = useState<Actif>("eurusd");
  const [taille, setTaille] = useState(0.1);
  const [mvt, setMvt] = useState(20);
  const calme = useCalme();
  const parUnite = (t: number) => (actif === "eurusd" ? 10 * t : 100 * t); // $ par pip, ou $ par dollar de l'or
  const total = (t: number) => parUnite(t) * mvt;
  const unite = actif === "eurusd" ? "pip" : "dollar";
  const contenu = (t: number) => (actif === "eurusd" ? `${nb(100000 * t)} €` : `${nb(100 * t)} once${100 * t > 1 ? "s" : ""}`);
  const maxTotal = total(1);

  return (
    <div>
      <div className="flex flex-wrap gap-x-8 gap-y-2">
        <Choix label="L'actif" valeur={actif} onChange={(v) => { setActif(v); setMvt(20); }}
          options={[{ v: "eurusd", t: "Euro-dollar" }, { v: "or", t: "Or" }]} />
        <Choix label="La taille" valeur={taille} onChange={setTaille} petit
          options={TAILLES.map((t) => ({ v: t, t: t === 1 ? "1 lot" : `${nb(t, 2)} lot` }))} />
      </div>
      <div className="mt-2">
        <Curseur label={actif === "eurusd" ? "Le mouvement du prix" : "Le mouvement de l'or"} min={1} max={100} step={1} valeur={mvt} onChange={setMvt}
          affiche={actif === "eurusd" ? `${nb(mvt)} pip${mvt > 1 ? "s" : ""}` : `${nb(mvt)} $ (de 4 000 à ${nb(4000 + mvt)} $)`} />
      </div>
      <div className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-3" aria-live="polite">
        <Chiffre label="Votre position" valeur={contenu(taille)} note={actif === "eurusd" ? "de la première monnaie, l'euro" : "un lot d'or : 100 onces, le plus souvent"} />
        <Chiffre label={`Valeur d'un ${unite}`} valeur={dollars(parUnite(taille), parUnite(taille) < 1 ? 2 : 0)} />
        <Chiffre grand label={`Pour ${nb(mvt)} ${unite}${mvt > 1 ? "s" : ""} de mouvement`} valeur={dollars(total(taille), total(taille) < 10 && !Number.isInteger(total(taille)) ? 2 : 0)} couleur="var(--cap-amber-ink)" />
      </div>

      <div className="mt-5 space-y-2.5">
        <p className="text-[0.88rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>Le même mouvement, trois tailles</p>
        {TAILLES.map((t) => {
          const v = total(t);
          return (
            <div key={t} className="grid grid-cols-[8.5rem_1fr_auto] items-center gap-3 text-[0.95rem]">
              <span style={{ color: t === taille ? "var(--cap-ink)" : "var(--cap-ink-3)", fontWeight: t === taille ? 650 : 400 }}>{NOMS[t]}</span>
              <span className="h-3 overflow-hidden rounded-full" style={{ backgroundColor: "var(--cap-surface-2)" }}>
                <span className="block h-full rounded-full" style={{ width: `${Math.max(0.6, (v / maxTotal) * 100)}%`, backgroundColor: t === taille ? "var(--cap-ink)" : "var(--cap-ink-4)", transition: calme ? undefined : "width .4s ease" }} />
              </span>
              <b className="tabular-nums" style={{ color: "var(--cap-ink)" }}>{dollars(v, v < 10 && !Number.isInteger(v) ? 2 : 0)}</b>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[0.95rem]" style={{ color: "var(--cap-ink-2)" }}>
        {actif === "eurusd"
          ? `Sur un compte de 2 000 $, ${nb(mvt)} pips contre vous avec 1 lot, c'est ${part(total(1))}. Avec 0,01 lot, ${nb((total(0.01) / 2000) * 100, 1)} %.`
          : `Sur un compte de 2 000 $, ${nb(mvt)} $ de baisse de l'or avec 1 lot, c'est ${part(total(1))}. Avec 0,01 lot, ${nb((total(0.01) / 2000) * 100, 1)} %.`}
      </p>
    </div>
  );
}
