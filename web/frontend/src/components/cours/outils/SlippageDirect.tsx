"use client";

import { useEffect, useRef, useState } from "react";
import { fmt } from "@/lib/cours/marche";
import { Bouton, BoutonLien, Choix, Ligne, Lignes, Verdict, nb, usd, useCalme } from "./ElementsRisque";

/**
 * Le slippage en direct. On achète 0,10 lot d'euro-dollar affiché à 1,1000,
 * au calme ou pendant une annonce, au marché ou à cours limité. Entre le clic
 * et l'exécution, le prix bouge : on lit l'écart. Les chiffres sont tirés au
 * hasard, comme sur un vrai marché, et gardés dans un petit historique.
 */
type Marche = "calme" | "annonce";
type Ordre = "marche" | "limite";
type Essai = { marche: Marche; ordre: Ordre; ecart: number; passe: boolean };

const DEMANDE = 1.1;
const TAILLE = 0.1;

function tirer(marche: Marche): number {
  // L'écart en pips entre le prix affiché et le prix du moment où l'ordre arrive.
  if (marche === "calme") {
    const choix = [-0.2, -0.1, 0, 0, 0, 0, 0.1, 0.1, 0.2, 0.3];
    return choix[Math.floor(Math.random() * choix.length)];
  }
  const contre = Math.random() < 0.7;
  const taille = Math.round((0.8 + Math.random() * 8) * 10) / 10;
  return contre ? taille : -Math.min(taille, 2.5);
}

export function SlippageDirect() {
  const calme = useCalme();
  const [marche, setMarche] = useState<Marche>("calme");
  const [ordre, setOrdre] = useState<Ordre>("marche");
  const [envoi, setEnvoi] = useState(false);
  const [dernier, setDernier] = useState<Essai | null>(null);
  const [histo, setHisto] = useState<Essai[]>([]);
  const minuterie = useRef<number | null>(null);
  useEffect(() => () => { if (minuterie.current) clearTimeout(minuterie.current); }, []);

  const acheter = () => {
    const ecart = tirer(marche);
    const passe = ordre === "marche" || ecart <= 0;
    const essai = { marche, ordre, ecart, passe };
    const conclure = () => { setEnvoi(false); setDernier(essai); setHisto((h) => [essai, ...h].slice(0, 6)); };
    if (calme) { conclure(); return; }
    setEnvoi(true); setDernier(null);
    minuterie.current = window.setTimeout(conclure, marche === "annonce" ? 650 : 400);
  };

  const prix = (e: Essai) => fmt(DEMANDE + e.ecart / 10000, 5);
  const ecrireEcart = (p: number) => `${nb(Math.abs(p), 1)} pip${Math.abs(p) >= 2 ? "s" : ""}`;

  let avis = "";
  let ton: "neutre" | "bien" | "mal" = "neutre";
  if (dernier) {
    if (!dernier.passe) { avis = `Le prix est passé à ${prix(dernier)}, au-dessus de votre limite de 1,1000 : l'ordre n'est pas exécuté. Il attend. Il passera si le prix revient à 1,1000 ou plus bas, peut-être jamais.`; }
    else if (dernier.ecart > 0) { avis = `Vous avez demandé 1,1000 et obtenu ${prix(dernier)} : ${ecrireEcart(dernier.ecart)} de slippage contre vous, soit ${usd(dernier.ecart * 10 * TAILLE, 2)} sur 0,10 lot.`; ton = "mal"; }
    else if (dernier.ecart < 0) { avis = `Obtenu ${prix(dernier)}, ${ecrireEcart(dernier.ecart)} mieux que demandé : un slippage en votre faveur, ${usd(-dernier.ecart * 10 * TAILLE, 2)} de gagnés. Ça arrive aussi.`; ton = "bien"; }
    else avis = "Obtenu 1,10000, exactement le prix demandé : pas de slippage.";
  }

  const passes = histo.filter((e) => e.passe);
  const moyen = passes.length ? passes.reduce((a, e) => a + e.ecart, 0) / passes.length : 0;

  return (
    <div>
      <div className="grid gap-x-8 sm:grid-cols-2">
        <Choix label="Le marché" valeur={marche} onChange={(v) => { setMarche(v); setDernier(null); }}
          options={[{ v: "calme", texte: "Au calme" }, { v: "annonce", texte: "Pendant une annonce" }]} />
        <Choix label="Votre ordre" valeur={ordre} onChange={(v) => { setOrdre(v); setDernier(null); }}
          options={[{ v: "marche", texte: "Au marché" }, { v: "limite", texte: "À cours limité, 1,1000" }]} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div>
          <p className="text-[0.88rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>Prix affiché à l'achat</p>
          <p className="text-[2rem] font-semibold leading-tight tabular-nums" style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}>1,1000</p>
        </div>
        <Bouton onClick={acheter} disabled={envoi}>{envoi ? "Ordre envoyé…" : "Acheter 0,10 lot"}</Bouton>
      </div>

      <div className="mt-3 grid gap-x-8 sm:grid-cols-2">
        <Lignes>
          <Ligne label="Prix demandé" valeur="1,10000" />
          <Ligne label="Prix obtenu" fort valeur={envoi ? "…" : dernier ? (dernier.passe ? prix(dernier) : "en attente") : "?"} />
          <Ligne label="Slippage" valeur={dernier && dernier.passe ? `${dernier.ecart > 0 ? "− " : dernier.ecart < 0 ? "+ " : ""}${usd(Math.abs(dernier.ecart) * 10 * TAILLE, 2)}` : "?"}
            couleur={dernier && dernier.passe ? (dernier.ecart > 0 ? "var(--cap-down)" : dernier.ecart < 0 ? "var(--cap-up)" : undefined) : undefined} />
        </Lignes>
        <div>
          {avis ? <Verdict ton={ton}>{avis}</Verdict> : <Verdict>{envoi ? "Entre le clic et l'exécution, il se passe un instant…" : "Cliquez sur « Acheter » plusieurs fois, au calme puis pendant une annonce."}</Verdict>}
        </div>
      </div>

      {histo.length > 0 && (
        <div className="mt-4">
          <p className="text-[0.9rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>Vos derniers ordres</p>
          <ul className="mt-1 grid gap-1 text-[0.9rem] tabular-nums sm:grid-cols-2" style={{ color: "var(--cap-ink-2)" }}>
            {histo.map((e, i) => (
              <li key={histo.length - i}>
                {e.marche === "calme" ? "Calme" : "Annonce"}, {e.ordre === "marche" ? "au marché" : "limité"} :{" "}
                {e.passe
                  ? <span style={{ color: e.ecart > 0 ? "var(--cap-down)" : e.ecart < 0 ? "var(--cap-up)" : "var(--cap-ink)" }}>{e.ecart === 0 ? "0 pip" : `${e.ecart > 0 ? "−" : "+"}${ecrireEcart(e.ecart)}`}</span>
                  : "non exécuté"}
              </li>
            ))}
          </ul>
          {passes.length >= 3 && (
            <p className="mt-2 text-[0.92rem]" style={{ color: "var(--cap-ink-2)" }}>
              En moyenne, sur vos ordres exécutés : {moyen > 0.05 ? `${ecrireEcart(moyen)} contre vous` : moyen < -0.05 ? `${ecrireEcart(moyen)} en votre faveur` : "presque rien"}.
            </p>
          )}
          <div className="mt-1"><BoutonLien onClick={() => { setHisto([]); setDernier(null); }}>Effacer l'historique</BoutonLien></div>
        </div>
      )}
    </div>
  );
}
