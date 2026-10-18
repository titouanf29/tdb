"use client";

import { useState } from "react";
import { BoutonInd, ChoixInd, LectureInd, LienInd, RecommencerInd, nf } from "./ElementsIndicateurs";

/**
 * Le journal de trading, en deux temps. D'abord remplir une fiche (pourquoi
 * j'entre, mon stop, ma taille, le résultat) et la relire : le risque se
 * calcule tout seul. Puis relire une semaine entière et trouver l'erreur qui
 * revient. Rien n'est enregistré.
 */
const champ = "w-full rounded-[10px] px-3 py-2.5 text-[1rem] outline-none focus:ring-2";
const styleChamp = { backgroundColor: "var(--cap-surface)", color: "var(--cap-ink)", boxShadow: "inset 0 0 0 1px var(--cap-line-strong)", ["--tw-ring-color" as string]: "var(--cap-ambre)" };

function Etiquette({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className="mb-1 block text-[0.92rem]" style={{ color: "var(--cap-ink-2)" }}>{children}</label>;
}

export function FicheJournal({ compte = 2000 }: { compte?: number }) {
  const [actif, setActif] = useState("EUR/USD");
  const [sens, setSens] = useState<"achat" | "vente">("achat");
  const [raison, setRaison] = useState("");
  const [stop, setStop] = useState("20");
  const [taille, setTaille] = useState("0,10");
  const [resultat, setResultat] = useState("");
  const [lecon, setLecon] = useState("");
  const [relue, setRelue] = useState(false);

  const num = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));
  const pips = num(stop), lots = num(taille);
  const risque = pips > 0 && lots > 0 ? pips * lots * 10 : null;
  const part = risque != null ? (risque / compte) * 100 : null;
  const manque = [
    !raison.trim() && "la raison d'entrer",
    !(pips > 0) && "le stop",
    !(lots > 0) && "la taille",
    !resultat.trim() && "le résultat",
  ].filter(Boolean) as string[];

  return (
    <div>
      {!relue ? (
        <form onSubmit={(e) => { e.preventDefault(); setRelue(true); }} className="grid gap-3 sm:grid-cols-2">
          <div>
            <Etiquette htmlFor="fj-actif">Actif</Etiquette>
            <input id="fj-actif" className={champ} style={styleChamp} value={actif} onChange={(e) => setActif(e.target.value)} />
          </div>
          <div>
            <span className="mb-1 block text-[0.92rem]" style={{ color: "var(--cap-ink-2)" }}>Sens</span>
            <ChoixInd label="Sens de la position" valeur={sens} onChange={setSens} options={[{ v: "achat", texte: "Achat" }, { v: "vente", texte: "Vente" }]} />
          </div>
          <div className="sm:col-span-2">
            <Etiquette htmlFor="fj-raison">Pourquoi j'entre (mon setup)</Etiquette>
            <textarea id="fj-raison" rows={2} className={champ} style={styleChamp} value={raison} onChange={(e) => setRaison(e.target.value)}
              placeholder="Le prix revient sur le support à 1,0950 et une bougie le rejette." />
          </div>
          <div>
            <Etiquette htmlFor="fj-stop">Mon stop, en pips</Etiquette>
            <input id="fj-stop" inputMode="decimal" className={champ} style={styleChamp} value={stop} onChange={(e) => setStop(e.target.value)} />
          </div>
          <div>
            <Etiquette htmlFor="fj-taille">Ma taille, en lots</Etiquette>
            <input id="fj-taille" inputMode="decimal" className={champ} style={styleChamp} value={taille} onChange={(e) => setTaille(e.target.value)} />
          </div>
          <p className="text-[0.95rem] sm:col-span-2 tabular-nums" aria-live="polite" style={{ color: part != null && part > 1.0001 ? "var(--cap-down)" : "var(--cap-ink-2)" }}>
            {risque != null
              ? <>Risque si le stop est touché : {nf(pips, pips % 1 ? 1 : 0)} pips × {nf(lots, 2)} lot × 10 $ = <b>{nf(risque, risque % 1 ? 2 : 0)} $</b>, soit {nf(part!, 1)} % d'un compte de {nf(compte)}{"\u00a0"}$.{part! > 1.0001 ? " C'est plus que 1 %." : ""}</>
              : "Écrivez le stop et la taille : le risque se calcule tout seul (10 $ par pip pour 1 lot, comme sur l'euro-dollar)."}
          </p>
          <div>
            <Etiquette htmlFor="fj-res">Le résultat</Etiquette>
            <input id="fj-res" className={champ} style={styleChamp} value={resultat} onChange={(e) => setResultat(e.target.value)} placeholder="+40 $, ou −20 $ (stop touché)" />
          </div>
          <div>
            <Etiquette htmlFor="fj-lecon">Ce que j'en retiens (facultatif)</Etiquette>
            <input id="fj-lecon" className={champ} style={styleChamp} value={lecon} onChange={(e) => setLecon(e.target.value)} placeholder="J'ai attendu la clôture : bien." />
          </div>
          <div className="flex justify-end sm:col-span-2">
            <BoutonInd type="submit">Relire ma fiche</BoutonInd>
          </div>
        </form>
      ) : (
        <div>
          <div className="rounded-[12px] px-5 py-4" style={{ backgroundColor: "var(--cap-surface-2)" }}>
            <p className="text-[1.1rem] font-semibold" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
              {sens === "achat" ? "Achat" : "Vente"} {actif || "(actif ?)"}
            </p>
            <dl className="mt-2 grid gap-x-4 gap-y-1.5 text-[0.98rem] sm:grid-cols-[9rem_minmax(0,1fr)]" style={{ color: "var(--cap-ink-2)" }}>
              <dt className="italic" style={{ fontFamily: "var(--cap-font-display)" }}>Pourquoi</dt><dd style={{ color: "var(--cap-ink)" }}>{raison || "rien d'écrit"}</dd>
              <dt className="italic" style={{ fontFamily: "var(--cap-font-display)" }}>Stop</dt><dd style={{ color: "var(--cap-ink)" }}>{pips > 0 ? `${stop} pips` : "rien d'écrit"}</dd>
              <dt className="italic" style={{ fontFamily: "var(--cap-font-display)" }}>Taille</dt><dd style={{ color: "var(--cap-ink)" }}>{lots > 0 ? `${taille} lot${risque != null ? `, ${nf(risque, risque % 1 ? 2 : 0)} $ de risque (${nf(part!, 1)} %)` : ""}` : "rien d'écrit"}</dd>
              <dt className="italic" style={{ fontFamily: "var(--cap-font-display)" }}>Résultat</dt><dd style={{ color: "var(--cap-ink)" }}>{resultat || "rien d'écrit"}</dd>
              {lecon && <><dt className="italic" style={{ fontFamily: "var(--cap-font-display)" }}>À retenir</dt><dd style={{ color: "var(--cap-ink)" }}>{lecon}</dd></>}
            </dl>
          </div>
          <div className="mt-3">
            <LectureInd ton={manque.length === 0 && !(part != null && part > 1.0001) ? "juste" : "faux"}>
              {manque.length > 0 && <p>Il manque {manque.join(", ")}. Une fiche incomplète ne vous apprendra rien dans une semaine : c'est la raison et le stop qui permettent de comprendre une perte.</p>}
              {part != null && part > 1.0001 && <p className={manque.length ? "mt-1.5" : ""}>Le risque dépasse 1 % du compte : en démo, ça ne coûte rien ; c'est justement l'endroit pour prendre la bonne habitude.</p>}
              {manque.length === 0 && !(part != null && part > 1.0001) && <p>Fiche complète, risque sous 1 %. Dans une semaine, en la relisant avec les autres, vous saurez si ce setup vous réussit.</p>}
            </LectureInd>
          </div>
          <div className="mt-2 flex justify-end">
            <LienInd onClick={() => setRelue(false)}>Corriger la fiche</LienInd>
          </div>
        </div>
      )}
      <p className="mt-2 text-[0.85rem]" style={{ color: "var(--cap-ink-3)" }}>Rien n'est enregistré : c'est un exercice.</p>
    </div>
  );
}

const SEMAINE = [
  { jour: "Lundi", sens: "Achat", raison: "Rebond sur le support à 1,0950, bougie de rejet", stop: "20 pips", res: 40 },
  { jour: "Mardi", sens: "Achat", raison: "Cassure de 1,1000", stop: "20 pips", res: -20 },
  { jour: "Mardi", sens: "Vente", raison: "Pour me refaire de la perte du matin", stop: "20 pips, reculé à 40", res: -40 },
  { jour: "Mercredi", sens: "Achat", raison: "Rebond sur le support, bougie de rejet", stop: "20 pips", res: 38 },
  { jour: "Jeudi", sens: "Vente", raison: "Ça a trop monté, ça va baisser", stop: "20 pips, reculé à 45", res: -45 },
  { jour: "Vendredi", sens: "Achat", raison: "Rebond sur le support, bougie de rejet", stop: "20 pips", res: 20 },
  { jour: "Vendredi", sens: "Vente", raison: "J'avais raté le mouvement", stop: "20 pips, reculé à 50", res: -50 },
];

export function RelectureJournal() {
  const [rep, setRep] = useState<number | null>(null);
  const total = SEMAINE.reduce((a, l) => a + l.res, 0);
  const signe = (v: number) => (v > 0 ? `+${nf(v)}` : `−${nf(-v)}`);
  const options = [
    { v: 0, texte: "Le rebond sur support ne marche pas." },
    { v: 1, texte: "Je recule mon stop, sur des entrées sans setup." },
    { v: 2, texte: "Je prends trop de positions le mercredi." },
  ];
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[0.93rem]">
          <thead>
            <tr>{["Jour", "Sens", "Pourquoi j'entre", "Stop (0,10 lot)", "Résultat"].map((e) => (
              <th key={e} className="border-b-2 px-2 py-2 text-left font-semibold" style={{ borderColor: "var(--cap-line-strong)", color: "var(--cap-ink)" }}>{e}</th>
            ))}</tr>
          </thead>
          <tbody>
            {SEMAINE.map((l, i) => {
              const marque = rep != null && l.stop.includes("reculé");
              return (
                <tr key={i} style={{ backgroundColor: marque ? "var(--cap-down-soft)" : undefined }}>
                  <td className="border-b px-2 py-2" style={{ borderColor: "var(--cap-line)", color: "var(--cap-ink-2)" }}>{l.jour}</td>
                  <td className="border-b px-2 py-2" style={{ borderColor: "var(--cap-line)", color: "var(--cap-ink-2)" }}>{l.sens}</td>
                  <td className="border-b px-2 py-2" style={{ borderColor: "var(--cap-line)", color: "var(--cap-ink)" }}>{l.raison}</td>
                  <td className="border-b px-2 py-2" style={{ borderColor: "var(--cap-line)", color: "var(--cap-ink-2)" }}>{l.stop}</td>
                  <td className="border-b px-2 py-2 text-right tabular-nums font-semibold" style={{ borderColor: "var(--cap-line)", color: l.res >= 0 ? "var(--cap-up)" : "var(--cap-down)" }}>{signe(l.res)} $</td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={4} className="px-2 py-2 text-right" style={{ color: "var(--cap-ink-2)" }}>La semaine</td>
              <td className="px-2 py-2 text-right font-semibold tabular-nums" style={{ color: total >= 0 ? "var(--cap-up)" : "var(--cap-down)" }}>{signe(total)} $</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mb-1 mt-4 text-[0.98rem]" style={{ color: "var(--cap-ink)" }}>Quelle erreur revient ?</p>
      <ChoixInd colonne label="L'erreur qui revient" valeur={rep} onChange={setRep} options={options} desactive={rep != null}
        etat={(v) => (rep == null ? null : v === 1 ? "juste" : v === rep ? "faux" : null)} />
      {rep != null && (
        <div className="mt-3">
          <LectureInd ton={rep === 1 ? "juste" : "faux"}>
            <p>
              {rep === 1 ? <b style={{ color: "var(--cap-up)" }}>Oui. </b> : <b style={{ color: "var(--cap-down)" }}>Relisez les lignes en rouge. </b>}
              Les trois rebonds sur support rapportent +98 $. Les trois positions sans setup (la revanche, l'avis, la peur de rater) ont toutes un stop reculé : −135 $.
              Avec les stops gardés à 20 pips, elles auraient coûté 20 $ chacune, et la semaine finissait à <b style={{ color: "var(--cap-ink)" }}>+18 $</b> au lieu de <b style={{ color: "var(--cap-ink)" }}>{signe(total)} $</b>.
              Une seule position ne montre rien ; c'est la relecture de la semaine qui fait apparaître l'erreur. La règle à ajouter : « je ne recule jamais mon stop ».
            </p>
          </LectureInd>
          <div className="mt-2 flex justify-end"><RecommencerInd onClick={() => setRep(null)} /></div>
        </div>
      )}
    </div>
  );
}
