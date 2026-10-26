"use client";

import { useEffect, useState } from "react";
import { Bouton, Choix, Chiffre, Curseur, Lien, Verdict, euros, nb, useCalme, useDefilement } from "./ElementsOrdres";

/**
 * Leçon 36. Le tableau de bord d'un compte de 1 000 €, levier 30 : on règle la
 * taille, puis on fait reculer le prix. On voit, chiffre par chiffre, la marge
 * bloquée, la marge libre qui fond, le niveau de marge, l'appel de marge à
 * 100 % puis la clôture forcée à 50 %. Avec un stop, la perte s'arrête bien
 * avant.
 */

const COMPTE = 1000, LEVIER = 30, PAS = 101; // de 0 à -10 %, par pas de 0,1 %

export function etatCompte(position: number, recul: number, stop: boolean) {
  const marge = position / LEVIER;
  const valeurA = (r: number) => COMPTE - position * r;
  const rCloture = (COMPTE - marge / 2) / position; // le recul où le niveau tombe à 50 %
  const rAppel = (COMPTE - marge) / position;
  if (stop && recul >= 0.01 && rCloture > 0.01) {
    const v = valeurA(0.01);
    return { ferme: "stop" as const, marge: 0, valeur: v, libre: v, niveau: null as number | null, perte: COMPTE - v, rAppel, rCloture, margeOuverte: marge, niveauAvant: (v / marge) * 100 };
  }
  if (recul >= rCloture) {
    const v = valeurA(rCloture);
    return { ferme: "courtier" as const, marge: 0, valeur: v, libre: v, niveau: null, perte: COMPTE - v, rAppel, rCloture, margeOuverte: marge, niveauAvant: 50 };
  }
  const v = valeurA(recul);
  return { ferme: null, marge, valeur: v, libre: v - marge, niveau: (v / marge) * 100, perte: COMPTE - v, rAppel, rCloture, margeOuverte: marge, niveauAvant: (v / marge) * 100 };
}

export function TableauMarge() {
  const [position, setPosition] = useState(10000);
  const [reculPc, setReculPc] = useState(0); // en dixièmes de %
  const [stop, setStop] = useState<"sans" | "avec">("sans");
  const calme = useCalme();
  const { k, setK, lancer, arreter, enCours } = useDefilement(PAS, 70);
  const [joue, setJoue] = useState(false);
  useEffect(() => { if (joue) setReculPc(k); }, [k, joue]);
  useEffect(() => { if (!enCours) setJoue(false); }, [enCours]);

  const recul = reculPc / 1000;
  const e = etatCompte(position, recul, stop === "avec");
  const trans = calme ? undefined : "width .25s ease, left .25s ease";
  const pc = (v: number) => `${Math.max(0, Math.min(100, (v / COMPTE) * 100))}%`;
  const niveauAff = e.niveau == null ? "aucune position" : `${nb(e.niveau)} %`;
  const appel = e.niveau != null && e.niveau <= 100;

  const changer = (f: () => void) => { arreter(); setJoue(false); f(); };

  return (
    <div>
      <div className="grid gap-x-8 sm:grid-cols-2">
        <Curseur label="La taille de votre position" min={1000} max={30000} step={1000} valeur={position}
          onChange={(v) => changer(() => { setPosition(v); setReculPc(0); })}
          affiche={`${euros(position)}${position === 30000 ? " (tout le levier)" : ""}`} />
        <Curseur label="Le prix va contre vous" min={0} max={100} step={1} valeur={reculPc}
          onChange={(v) => changer(() => setReculPc(v))} affiche={reculPc === 0 ? "pas encore" : `−${nb(reculPc / 10, 1)} %`} />
      </div>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <Choix label="Votre protection" valeur={stop} onChange={(v) => changer(() => setStop(v))}
          options={[{ v: "sans", t: "Sans stop" }, { v: "avec", t: "Un stop à 1 % sous l'entrée" }]} />
        <div className="flex flex-wrap items-center gap-x-3">
          {reculPc > 0 && !enCours && <Lien onClick={() => changer(() => setReculPc(0))}>Revenir au départ</Lien>}
          <Bouton disabled={enCours} onClick={() => { setJoue(true); setReculPc(0); setK(0); lancer(); }}>{enCours ? "Le prix recule…" : "Faire reculer le prix"}</Bouton>
        </div>
      </div>

      {/* Le compte, en une barre : la marge bloquée, la marge libre, la perte. */}
      <div className="mt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-[0.88rem]" style={{ color: "var(--cap-ink-3)" }}>
          <span className="italic" style={{ fontFamily: "var(--cap-font-display)" }}>Votre compte de 1 000 €</span>
          <span className="flex flex-wrap gap-x-4">
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ backgroundColor: "var(--cap-ink)" }} />marge bloquée</span>
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ backgroundColor: "var(--cap-ocean)" }} />marge libre</span>
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ backgroundColor: "var(--cap-down-fill)", opacity: 0.55 }} />perdu</span>
          </span>
        </div>
        <div className="relative mt-1.5 h-9 overflow-hidden rounded-[8px]" style={{ backgroundColor: "var(--cap-surface-2)" }}>
          <span className="absolute inset-y-0 left-0" style={{ width: pc(Math.min(e.valeur, e.marge)), backgroundColor: "var(--cap-ink)", transition: trans }} />
          <span className="absolute inset-y-0" style={{ left: pc(Math.min(e.valeur, e.marge)), width: pc(Math.max(0, e.libre)), backgroundColor: "var(--cap-ocean)", transition: trans }} />
          <span className="absolute inset-y-0" style={{ left: pc(e.valeur), width: pc(e.perte), backgroundColor: "var(--cap-down-fill)", opacity: 0.55, transition: trans }} />
        </div>
      </div>

      {/* Le niveau de marge, sur une règle de 0 à 300 %. */}
      <div className="mt-5">
        <p className="text-[0.88rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>Le niveau de marge : la valeur du compte ÷ la marge bloquée</p>
        <div className="relative mt-6 h-2.5 rounded-full" style={{ backgroundColor: "var(--cap-surface-2)" }}>
          {[{ v: 50, t: "50 % : clôture forcée", c: "var(--cap-down)" }, { v: 100, t: "100 % : appel de marge", c: "var(--cap-amber-ink)" }].map((m) => (
            <span key={m.v} className="absolute -top-1 bottom-[-4px] w-[2px]" style={{ left: `${(m.v / 320) * 100}%`, backgroundColor: m.c }}>
              <span className={`absolute left-0 whitespace-nowrap text-[0.8rem] font-semibold ${m.v === 50 ? "top-[38px]" : "top-4"}`} style={{ color: m.c }}>{m.t}</span>
            </span>
          ))}
          {e.niveau != null && (
            <span className="absolute -top-[22px] -translate-x-1/2 text-[0.82rem] font-semibold tabular-nums" style={{ left: `${Math.min(100, (e.niveau / 320) * 100)}%`, color: "var(--cap-ink)", transition: calme ? undefined : "left .25s ease" }}>
              {nb(e.niveau)} %
              <span className="absolute left-1/2 top-[19px] h-3.5 w-3.5 -translate-x-1/2 rounded-full" style={{ backgroundColor: "var(--cap-ambre)", boxShadow: "0 0 0 2px var(--cap-surface)" }} />
            </span>
          )}
        </div>
        <div className="h-12" />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4" aria-live="polite">
        <Chiffre label="Valeur du compte" valeur={euros(e.valeur)} note={e.perte > 0.5 ? `−${euros(e.perte)} de perte` : "rien de perdu"} />
        <Chiffre label="Marge bloquée" valeur={euros(e.marge)} note={e.ferme ? "position fermée" : `${euros(position)} ÷ 30`} />
        <Chiffre label="Marge libre" valeur={euros(e.libre)} couleur={e.libre <= 0.5 && !e.ferme ? "var(--cap-down)" : undefined} note="ce qui encaisse les pertes" />
        <Chiffre label="Niveau de marge" valeur={niveauAff} couleur={appel ? "var(--cap-down)" : undefined} />
      </div>

      <Verdict couleur={e.ferme === "courtier" || appel ? "var(--cap-down)" : e.ferme === "stop" ? "var(--cap-up)" : undefined}>
        {e.ferme === "stop"
          ? <>Votre <b>stop</b> a fermé la position à 1 % sous l'entrée : <b>{euros(e.perte)}</b> de perte, et il vous reste {euros(e.valeur)}. Au moment de la sortie, le niveau de marge était encore à {nb(e.niveauAvant)} %, loin de l'appel de marge.</>
          : e.ferme === "courtier"
            ? <><b>Clôture forcée.</b> À {nb(e.rCloture * 100, 1)} % de recul, le niveau de marge est tombé à 50 % : le courtier a fermé la position tout seul. Perte : <b>{euros(e.perte)}</b>. Il vous reste {euros(e.valeur)}, et la leçon.</>
            : appel
              ? <><b>Appel de marge.</b> {position === 30000 && recul === 0 ? "Avec tout le levier, la marge prend tout le compte dès l'ouverture : la marge libre est à zéro, le niveau à 100 %. Le moindre recul, et vous êtes dessous." : `Plus de marge libre : vous ne pouvez plus rien ouvrir. Encore ${nb((e.rCloture - recul) * 100, 1)} % de recul, et ce sera la clôture forcée.`}</>
              : recul === 0
                ? <>Position ouverte : la plateforme bloque <b>{euros(e.marge)}</b> de marge, il reste <b>{euros(e.libre)}</b> de marge libre. Niveau de marge : {nb(e.niveau ?? 0)} %. L'appel de marge viendrait à {nb(e.rAppel * 100, 1)} % de recul, la clôture forcée à {nb(e.rCloture * 100, 1)} %.</>
                : <>Le prix a reculé de {nb(recul * 100, 1)} % : la perte de {euros(e.perte)} est prise sur la <b>marge libre</b>, qui fond à {euros(e.libre)}. La marge bloquée, elle, ne bouge pas.</>}
      </Verdict>
    </div>
  );
}
