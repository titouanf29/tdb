"use client";

import { useState } from "react";
import { Choix, Curseur, Ligne, Lignes, Verdict, lots, nb, pct, usd, useCalme } from "./ElementsRisque";

/**
 * Ce que coûte vraiment un trade : le spread, la commission aller-retour, et
 * le swap de chaque nuit (triple le mercredi), comparés au risque du trade.
 * Euro-dollar, compte en dollars : un pip vaut 10 $ par lot.
 */
const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
const COURT = ["Lun.", "Mar.", "Mer.", "Jeu.", "Ven."];
// Swap d'exemple, par lot et par nuit : l'achat paie, la vente reçoit un peu.
const SWAP = { achat: -8, vente: 1.5 };

export function CalculFrais() {
  const calme = useCalme();
  const [taille, setTaille] = useState(0.1);
  const [spread, setSpread] = useState(0.3);
  const [commission, setCommission] = useState(7);
  const [sens, setSens] = useState<"achat" | "vente">("achat");
  const [ouvre, setOuvre] = useState(0);
  const [ferme, setFerme] = useState(3);

  const nuits = Array.from({ length: Math.max(0, ferme - ouvre) }, (_, k) => (ouvre + k === 2 ? 3 : 1));
  const nbNuits = nuits.reduce((a, v) => a + v, 0);
  const coutSpread = spread * 10 * taille;
  const coutCommission = commission * taille;
  const swapNuit = SWAP[sens] * taille;
  const swap = swapNuit * nbNuits;
  const total = coutSpread + coutCommission - swap;
  const risque = 20 * 10 * taille; // un stop à 20 pips
  const part = risque > 0 ? (total / risque) * 100 : 0;
  const signe = (x: number) => (x > 0.004 ? "+ " : x < -0.004 ? "− " : "");

  const choisirOuvre = (j: number) => { setOuvre(j); if (ferme < j) setFerme(j); };
  const choisirFerme = (j: number) => { setFerme(j); if (ouvre > j) setOuvre(j); };

  return (
    <div>
      <div className="grid gap-x-8 sm:grid-cols-2">
        <div>
          <Curseur label="Taille" valeur={taille} texte={lots(taille)} min={0.01} max={1} pas={0.01} onChange={(v) => setTaille(Math.round(v * 100) / 100)} />
          <Curseur label="Spread" valeur={spread} texte={`${nb(spread, 1)} pip`} min={0} max={3} pas={0.1} onChange={(v) => setSpread(Math.round(v * 10) / 10)}
            aide="Payé une fois, à l'entrée (leçon « Le spread »)." />
          <Curseur label="Commission, par lot" valeur={commission} texte={`${nb(commission, 1)} $`} min={0} max={10} pas={0.5} onChange={setCommission}
            aide={`La moitié en entrant, la moitié en sortant : ${usd(commission * taille / 2, 2)} puis ${usd(commission * taille / 2, 2)} sur ${lots(taille)}.`} />
        </div>
        <div>
          <Choix label="Le sens du trade" valeur={sens} onChange={setSens} options={[{ v: "achat", texte: "Achat" }, { v: "vente", texte: "Vente" }]} />
          <p className="mb-2 text-[0.88rem] leading-snug" style={{ color: "var(--cap-ink-3)" }}>
            Swap d'exemple : {sens === "achat" ? `l'achat paie ${usd(8)}` : `la vente reçoit ${usd(1.5, 2)}`} par lot et par nuit, soit {usd(Math.abs(swapNuit), 2)} sur {lots(taille)}. Votre plateforme affiche les vrais, ils changent.
          </p>
          <Choix label="Ouverture" valeur={ouvre} onChange={choisirOuvre} options={COURT.map((t, j) => ({ v: j, texte: t }))} />
          <Choix label="Fermeture" valeur={ferme} onChange={choisirFerme} options={COURT.map((t, j) => ({ v: j, texte: t }))} />
        </div>
      </div>

      {/* La semaine : les nuits payées entre l'ouverture et la fermeture */}
      <div className="mt-4" role="img" aria-label={`${JOURS[ouvre]} à ${JOURS[ferme]} : ${nuits.length} nuit${nuits.length > 1 ? "s" : ""} passée${nuits.length > 1 ? "s" : ""}, ${nbNuits} nuit${nbNuits > 1 ? "s" : ""} de swap`}>
        <div className="grid grid-cols-5 gap-1">
          {COURT.map((t, j) => {
            const dedans = j >= ouvre && j <= ferme;
            const nuit = j >= ouvre && j < ferme;
            return (
              <div key={j} className="relative">
                <div className="rounded-[8px] py-2 text-center text-[0.88rem] font-semibold"
                  style={{
                    backgroundColor: dedans ? "var(--cap-surface-2)" : "transparent",
                    color: dedans ? "var(--cap-ink)" : "var(--cap-ink-4)",
                    boxShadow: dedans ? "none" : "inset 0 0 0 1px var(--cap-line)",
                    transition: calme ? undefined : "background-color .25s ease, color .25s ease",
                  }}>
                  {t}
                </div>
                <p className="mt-1 text-center text-[0.8rem] tabular-nums" style={{ color: nuit ? (j === 2 ? "var(--cap-amber-ink)" : "var(--cap-ink-2)") : "transparent", fontWeight: j === 2 ? 700 : 500 }}>
                  {nuit ? (j === 2 ? "nuit × 3" : "nuit × 1") : "."}
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-1 text-[0.85rem]" style={{ color: "var(--cap-ink-3)" }}>
          Le swap tombe vers 23 h, chaque soir où la position est encore ouverte. Le mercredi, il compte trois fois : le week-end est payé ce jour-là.
        </p>
      </div>

      <div className="mt-3 grid gap-x-8 sm:grid-cols-2">
        <Lignes>
          <Ligne label={`Spread (${nb(spread, 1)} pip × ${usd(10 * taille, 2)})`} valeur={`${signe(-coutSpread)}${usd(coutSpread, 2)}`} />
          <Ligne label="Commission, aller-retour" valeur={`${signe(-coutCommission)}${usd(coutCommission, 2)}`} />
          <Ligne label={`Swap, ${nbNuits} nuit${nbNuits > 1 ? "s" : ""}`} valeur={`${signe(swap)}${usd(Math.abs(swap), 2)}`}
            couleur={swap > 0.004 ? "var(--cap-up)" : undefined} />
          <Ligne label="Frais en tout" fort valeur={total >= 0 ? usd(total, 2) : `gain de ${usd(-total, 2)}`} />
        </Lignes>
        <div>
          <p className="text-[0.9rem]" style={{ color: "var(--cap-ink-2)" }}>Comparés au risque du trade (stop à 20 pips : {usd(risque, 2)})</p>
          <div className="mt-2 h-4 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--cap-surface-2)" }}
            role="img" aria-label={`Les frais font ${pct(Math.max(0, part), 0)} du risque`}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, part))}%`, backgroundColor: "var(--cap-ambre)", transition: calme ? undefined : "width .35s ease" }} />
          </div>
          <Verdict ton={part >= 20 ? "mal" : "neutre"}>
            {total <= 0
              ? `Ici, le swap reçu couvre les autres frais. C'est l'exception : le sens qui reçoit change avec les taux, et un swap positif reste petit.`
              : `${usd(total, 2)} de frais, soit ${pct(part, part < 10 ? 1 : 0)} de votre risque${part >= 24 && part <= 26 ? " : un quart" : ""}. ${swap > 0.004 ? "Ici, le swap reçu compense une partie des frais. C'est l'exception : le sens qui reçoit change avec les taux, et ce qu'il reçoit reste petit." : nbNuits >= 3 ? "Ce sont surtout les nuits qui coûtent : comptez-les avant un trade de plusieurs jours." : nbNuits === 0 ? "Sans nuit, le trade ne paie que le spread et la commission." : "Chaque nuit de plus ajoute son swap."}`}
          </Verdict>
        </div>
      </div>
    </div>
  );
}
