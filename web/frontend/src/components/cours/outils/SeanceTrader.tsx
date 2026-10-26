"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BoutonTenir, ChiffreTenir, ChoixTenir, LienTenir, ResultatTenir, dollars, nombre, useAnimeTenir } from "./ElementsTenir";

/**
 * Une séance de trading, en quatre moments où l'émotion pousse à sortir du
 * plan : le FOMO, le bon trade qui perd, la revanche, l'ennui. On décide, la
 * séance répond honnêtement, et le journal se remplit au fur et à mesure.
 * Compte de 2 000 $, 1 % de risque (20 $), 0,10 lot sur l'euro-dollar
 * (1 pip = 1 $), un spread de 1 pip (1 $ par trade).
 */

type Choix = {
  texte: string;
  /** Gain ou perte, spread compris. */
  resultat: number;
  trades: number;
  conforme: boolean;
  fait: string;
  ressenti: string;
  commentaire: string;
};
type Moment = { heure: string; situation: (perdu: boolean) => string; choix: Choix[] };

const MOMENTS: Moment[] = [
  {
    heure: "9 h 10",
    situation: () => "L'euro-dollar vient de monter de 40 pips en dix minutes, sans vous. Sur les réseaux, tout le monde en parle. Votre plan dit : acheter seulement sur un retour au support, avec un stop de 20 pips.",
    choix: [
      { texte: "J'achète tout de suite, avant qu'il soit trop tard.", resultat: -26, trades: 1, conforme: false, fait: "Acheté en pleine envolée, sans stop", ressenti: "Peur de rater le train (FOMO)", commentaire: "Vous achetez presque au sommet. Le prix redescend de 25 pips, vous paniquez et coupez : −25 $, plus 1 $ de spread. C'est le FOMO : sauter dans le train sans plan, juste avant qu'il ralentisse." },
      { texte: "Je le laisse partir. J'attends mon setup.", resultat: 0, trades: 0, conforme: true, fait: "Rien : pas de setup", ressenti: "Un peu de frustration", commentaire: "C'est frustrant de regarder un train partir. Mais un train parti, on le laisse partir : il y en aura d'autres. Et celui-ci redescend justement de 25 pips dans l'heure." },
    ],
  },
  {
    heure: "10 h 30",
    situation: () => "Le prix revient sur le support et une bougie le rejette : c'est exactement votre setup. Votre plan : acheter, stop 20 pips plus bas (20 $), objectif 40 pips plus haut.",
    choix: [
      { texte: "Je prends le trade, comme prévu, avec le stop.", resultat: -21, trades: 1, conforme: true, fait: "Setup du plan, stop à 20 pips : stop touché", ressenti: "Déçu, mais calme", commentaire: "Le stop est touché : −20 $, plus 1 $ de spread. C'est pourtant un bon trade : il suivait le plan, et la perte est celle que vous aviez décidée. Un bon trade peut perdre ; ce qui compte, c'est la somme de beaucoup de trades." },
      { texte: "Je le prends, mais sans stop, pour ne pas être sorti trop tôt.", resultat: -46, trades: 1, conforme: false, fait: "Setup du plan, mais sans stop", ressenti: "Espoir, puis angoisse", commentaire: "Le prix casse le support et descend de 45 pips avant que vous ne coupiez : −45 $, plus 1 $ de spread. Plus du double de la perte prévue, pour le même trade." },
      { texte: "Je n'ose pas : et si je perdais ?", resultat: 0, trades: 0, conforme: false, fait: "Setup du plan, non pris", ressenti: "Peur de perdre", commentaire: "Cette fois, l'hésitation vous évite une perte. Mais un plan qu'on suit seulement quand on le sent n'est plus un plan : la prochaine fois, ce sera peut-être le trade gagnant qui manque." },
    ],
  },
  {
    heure: "10 h 45",
    situation: (perdu) => perdu
      ? "Vous êtes dans le rouge sur la journée. Le prix repart, et une petite voix dit : « reprends un trade, trois fois plus gros (0,30 lot), et tu effaces tout »."
      : "Vous n'avez rien gagné ce matin, et le prix bouge sans vous. Une petite voix dit : « prends un gros trade (0,30 lot), tu as assez attendu ».",
    choix: [
      { texte: "Je reprends tout de suite, en 0,30 lot.", resultat: -63, trades: 1, conforme: false, fait: "Trade hors plan, 0,30 lot", ressenti: "Colère, envie de se refaire", commentaire: "Aucun setup, et trois fois la taille : 1 pip vaut maintenant 3 $. Le prix recule de 20 pips : −60 $, plus 3 $ de spread. C'est le revenge trading : vous suivez votre colère, pas votre plan, et la perte grandit." },
      { texte: "Je coupe l'écran dix minutes et j'écris dans mon journal.", resultat: 0, trades: 0, conforme: true, fait: "Pause, journal écrit", ressenti: "Agacé, puis plus calme", commentaire: "La colère retombe en quelques minutes, une perte ne se rattrape pas en une seule position. Après une perte, la règle la plus simple : une pause, jamais un trade plus gros." },
    ],
  },
  {
    heure: "14 h 00",
    situation: () => "Rien ne se passe depuis deux heures. Le marché est calme, aucun setup en vue. Vous vous ennuyez.",
    choix: [
      { texte: "Je prends quelques petits trades pour m'occuper.", resultat: -26, trades: 6, conforme: false, fait: "6 petits trades sans setup", ressenti: "Ennui, puis fatigue", commentaire: "Six trades sans raison : trois petits gains, trois petites pertes, à peu près rien… sauf le spread, payé six fois (6 $), et deux erreurs de fatigue : −26 $ au total. C'est l'overtrading : chaque trade coûte, et la fatigue fait faire des erreurs." },
      { texte: "Je ferme la plateforme : pas de setup, pas de trade.", resultat: 0, trades: 0, conforme: true, fait: "Plateforme fermée", ressenti: "Soulagé", commentaire: "Ne rien faire est une décision de trader. Le marché sera encore là demain, avec d'autres setups." },
    ],
  },
];

export function SeanceTrader() {
  const anime = useAnimeTenir();
  const [reponses, setReponses] = useState<number[]>([]);
  const etape = reponses.length;
  const choisis = reponses.map((r, i) => MOMENTS[i].choix[r]);
  const total = choisis.reduce((a, c) => a + c.resultat, 0);
  const trades = choisis.reduce((a, c) => a + c.trades, 0);
  const conformes = choisis.filter((c) => c.conforme).length;
  const [vu, setVu] = useState(true);
  const fini = etape >= MOMENTS.length && vu;
  const dernier = choisis[choisis.length - 1];

  const choisir = (j: number) => { setReponses((r) => [...r, j]); setVu(false); };

  return (
    <div>
      <div className="flex flex-wrap gap-x-8 gap-y-3 border-b pb-3" style={{ borderColor: "var(--cap-line)" }}>
        <ChiffreTenir valeur={`${nombre(2000 + total)} $`} legende="Votre compte (départ 2 000 $)" />
        <ChiffreTenir valeur={dollars(total)} legende="La séance" couleur={total < 0 ? "var(--cap-down)" : undefined} />
        <ChiffreTenir valeur={String(trades)} legende={trades > 1 ? "Trades" : "Trade"} />
      </div>

      <div className="mt-4" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {!vu && dernier ? (
            <motion.div key={`c${etape}`} initial={anime ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} exit={anime ? { opacity: 0, y: -8 } : undefined} transition={{ duration: 0.25 }}>
              <p className="text-[0.95rem] italic" style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-amber-ink)" }}>{MOMENTS[etape - 1].heure}, ce qui se passe</p>
              <p className="mt-1 text-[1rem] leading-relaxed" style={{ color: "var(--cap-ink)" }}>
                <b style={{ color: dernier.resultat < 0 ? "var(--cap-down)" : "var(--cap-ink)" }}>{dernier.resultat === 0 ? "0 $." : `${dollars(dernier.resultat)}.`}</b>{" "}{dernier.commentaire}
              </p>
              <p className="mt-2 text-[0.92rem]" style={{ color: dernier.conforme ? "var(--cap-up)" : "var(--cap-down)" }}>
                {dernier.conforme ? "Conforme au plan." : "Hors du plan."}
              </p>
              <div className="mt-3">
                <BoutonTenir onClick={() => setVu(true)}>{etape < MOMENTS.length ? "Continuer la séance" : "Fin de la séance"}</BoutonTenir>
              </div>
            </motion.div>
          ) : !fini ? (
            <motion.div key={`m${etape}`} initial={anime ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} exit={anime ? { opacity: 0, y: -8 } : undefined} transition={{ duration: 0.25 }}>
              <p className="text-[0.95rem] italic" style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-amber-ink)" }}>{MOMENTS[etape].heure} ({etape + 1} sur {MOMENTS.length})</p>
              <p className="mt-1 text-[1rem] leading-relaxed" style={{ color: "var(--cap-ink)" }}>{MOMENTS[etape].situation(total < 0)}</p>
              <div role="group" aria-label="Votre décision" className="mt-3 grid gap-2">
                {MOMENTS[etape].choix.map((c, j) => <ChoixTenir key={j} onClick={() => choisir(j)}>{c.texte}</ChoixTenir>)}
              </div>
            </motion.div>
          ) : (
            <motion.div key="fin" initial={anime ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              <ResultatTenir>
                <p className="text-[1.1rem] font-semibold" style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}>
                  {conformes === MOMENTS.length ? "Une séance tenue de bout en bout." : `${conformes} décision${conformes > 1 ? "s" : ""} sur ${MOMENTS.length} conforme${conformes > 1 ? "s" : ""} au plan.`}
                </p>
                <p className="mt-1">
                  {conformes === MOMENTS.length
                    ? "Une seule perte, de 21 $, celle que le plan avait prévue : c'est une bonne séance, même dans le rouge. Le résultat d'un jour ne juge pas un trader ; sa discipline, si."
                    : `La séance finit à ${dollars(total)}. Une séance où l'on suit tout le plan finit ici à −21 $ : tout le reste vient des émotions. Relisez la colonne « ressenti » : c'est elle qui explique les pertes.`}
                </p>
              </ResultatTenir>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {choisis.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[1rem] font-semibold" style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}>Le journal de la séance</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-[0.92rem]">
              <thead>
                <tr>{["Heure", "Ce que j'ai fait", "Ce que j'ai ressenti", "Résultat"].map((h) => (
                  <th key={h} className="border-b-2 px-2 py-1.5 text-left font-semibold" style={{ borderColor: "var(--cap-line-strong)", color: "var(--cap-ink)" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {choisis.map((c, i) => (
                  <motion.tr key={i} initial={anime ? { opacity: 0, x: -10 } : false} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                    <td className="whitespace-nowrap border-b px-2 py-2 align-top" style={{ borderColor: "var(--cap-line)", color: "var(--cap-ink-3)" }}>{MOMENTS[i].heure}</td>
                    <td className="border-b px-2 py-2 align-top" style={{ borderColor: "var(--cap-line)", color: "var(--cap-ink-2)" }}>{c.fait}</td>
                    <td className="border-b px-2 py-2 align-top italic" style={{ borderColor: "var(--cap-line)", color: "var(--cap-ink-2)" }}>{c.ressenti}</td>
                    <td className="border-b px-2 py-2 align-top tabular-nums" style={{ borderColor: "var(--cap-line)", color: c.resultat < 0 ? "var(--cap-down)" : "var(--cap-ink-2)" }}>{c.resultat === 0 ? "0 $" : dollars(c.resultat)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {etape > 0 && (
        <div className="mt-2">
          <LienTenir onClick={() => { setReponses([]); setVu(true); }}>Recommencer la séance</LienTenir>
        </div>
      )}
    </div>
  );
}
