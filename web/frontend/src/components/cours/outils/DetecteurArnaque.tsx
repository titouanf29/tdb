"use client";

import { useState } from "react";
import { BoutonTenir, ChoixTenir, LienTenir, ResultatTenir, useAnimeTenir } from "./ElementsTenir";

/**
 * Le détecteur d'arnaque : des messages inventés (aucune marque, aucune
 * personne réelle), dont un honnête. On touche les phrases suspectes, on
 * rend son verdict, et la correction allume chaque signal avec son
 * explication. Le cadran passe du vert au rouge à chaque signal.
 */

type Signal = "garanti" | "preuve" | "urgence" | "prive" | "codes" | "recuperation";
const NOMS: Record<Signal, string> = {
  garanti: "Gain garanti",
  preuve: "Fausse preuve",
  urgence: "Urgence",
  prive: "Inconnu en privé",
  codes: "Vos codes",
  recuperation: "Récupération promise",
};
type Phrase = { t: string; s?: Signal; pourquoi?: string };
type Message = { cadre: string; de: string; phrases: Phrase[]; arnaque: boolean; bilan: string };

const MESSAGES: Message[] = [
  {
    cadre: "Une publicité vue sur un réseau social",
    de: "Un compte « trader millionnaire »",
    arnaque: true,
    phrases: [
      { t: "Gagnez 10 % par semaine, garanti, avec ma méthode.", s: "garanti", pourquoi: "En trading, rien n'est garanti, même pour les professionnels. Et 10 % par semaine, ce serait plus de 140 fois la mise en un an." },
      { t: "Regardez mon compte : +18 450 $ ce mois-ci.", s: "preuve", pourquoi: "Une capture d'écran se truque en une minute, ou vient d'un compte démo. Ce n'est pas une preuve." },
      { t: "Et ma nouvelle voiture, payée en trois semaines.", s: "preuve", pourquoi: "Une voiture de luxe se loue à la journée. Elle prouve seulement qu'on veut vous impressionner." },
      { t: "Ma formation explique tout, pas à pas." },
      { t: "Plus que 3 places, l'offre se termine ce soir à minuit.", s: "urgence", pourquoi: "On vous presse pour que vous ne preniez pas le temps de vérifier. Une vraie formation sera encore là demain." },
    ],
    bilan: "Quatre signaux sur cinq phrases : gains garantis, fausses preuves, urgence. C'est une arnaque.",
  },
  {
    cadre: "Un message privé",
    de: "Un inconnu, après votre commentaire sous une vidéo",
    arnaque: true,
    phrases: [
      { t: "Bonjour, j'ai vu que vous vous intéressiez au trading.", s: "prive", pourquoi: "Un inconnu qui vous écrit en privé pour parler argent : c'est le point de départ de beaucoup d'arnaques. Un vrai professionnel ne démarche pas ainsi." },
      { t: "Je gère l'argent de plusieurs personnes : je trade pour vous, vous n'avez rien à faire.", s: "prive", pourquoi: "Placer l'argent des autres demande un agrément officiel. Celui qui le propose en message privé n'en a presque jamais." },
      { t: "Avec 500 €, vous pouvez en avoir 5 000 dans deux mois.", s: "garanti", pourquoi: "Dix fois la mise en deux mois : une promesse impossible à tenir, faite pour que vous ne réfléchissiez plus." },
      { t: "Envoyez-moi juste vos identifiants pour que je lance le robot.", s: "codes", pourquoi: "Vos codes, c'est votre argent. Personne d'honnête ne vous les demande, jamais." },
    ],
    bilan: "Un inconnu en privé, une promesse impossible, et vos codes : c'est une arnaque.",
  },
  {
    cadre: "Un message dans un forum de débutants",
    de: "Un autre élève",
    arnaque: false,
    phrases: [
      { t: "J'ai backtesté mon idée sur 60 positions, frais compris." },
      { t: "Résultat : elle perd un peu, alors je la retravaille." },
      { t: "Je teste la nouvelle version en démo avant d'y mettre un euro." },
      { t: "La semaine dernière, j'ai eu cinq pertes de suite : rien n'est garanti." },
    ],
    bilan: "Aucun signal : des tests, des pertes avouées, la démo, rien à vendre, aucune promesse. C'est à ça que ressemble le vrai trading : lent, et honnête.",
  },
  {
    cadre: "Une invitation dans un groupe de discussion",
    de: "Un groupe « VIP signaux »",
    arnaque: true,
    phrases: [
      { t: "Rejoignez notre groupe privé de signaux de trading." },
      { t: "92 % de trades gagnants depuis trois ans, preuves à l'appui.", s: "preuve", pourquoi: "Un chiffre que personne ne peut vérifier n'est pas une preuve. Les « preuves » de ces groupes sont des captures choisies." },
      { t: "Confiez-nous votre capital : nous le doublons en 30 jours.", s: "garanti", pourquoi: "Doubler en un mois, promis d'avance : aucune méthode honnête ne peut promettre ça." },
      { t: "Inscriptions réservées aux 50 premiers, ce week-end seulement.", s: "urgence", pourquoi: "Encore l'urgence : vous empêcher de vérifier." },
    ],
    bilan: "Fausse preuve, gain garanti, urgence : c'est une arnaque, et souvent une pyramide de Ponzi.",
  },
  {
    cadre: "Un courriel, quelques semaines après une perte",
    de: "Un « cabinet de récupération »",
    arnaque: true,
    phrases: [
      { t: "Vous avez perdu de l'argent avec un faux courtier ?", s: "prive", pourquoi: "Ils vous écrivent alors que vous n'avez rien demandé : ce sont parfois les mêmes escrocs, qui ont gardé la liste de leurs victimes." },
      { t: "Nous récupérons vos fonds, avec 97 % de réussite.", s: "recuperation", pourquoi: "Promettre de récupérer l'argent perdu, c'est souvent la deuxième arnaque. Personne ne peut garantir de le récupérer : portez plainte, prévenez votre banque, et ne payez personne." },
      { t: "Il suffit de régler 490 € de frais de dossier pour débloquer la procédure.", s: "recuperation", pourquoi: "Payer d'avance pour récupérer de l'argent : vous perdez une deuxième fois." },
      { t: "Répondez sous 24 heures, sinon votre dossier sera clos.", s: "urgence", pourquoi: "L'urgence, toujours, pour que vous ne vérifiiez pas." },
    ],
    bilan: "La deuxième arnaque, celle qui vise les victimes de la première : récupération promise contre paiement, urgence. Ne payez jamais.",
  },
];

function Cadran({ valeur, anime }: { valeur: number; anime: boolean }) {
  // valeur de 0 (vert) à 1 (rouge)
  const a = -80 + valeur * 160;
  return (
    <svg viewBox="0 0 120 70" width="120" height="70" aria-hidden>
      <defs>
        <linearGradient id="detect-grad" x1="0" x2="1">
          <stop offset="0" stopColor="var(--cap-up)" />
          <stop offset="0.5" stopColor="var(--cap-ambre)" />
          <stop offset="1" stopColor="var(--cap-down)" />
        </linearGradient>
      </defs>
      <path d="M12,62 A48,48 0 0 1 108,62" fill="none" stroke="url(#detect-grad)" strokeWidth="9" strokeLinecap="round" />
      <g style={{ transform: `rotate(${a}deg)`, transformOrigin: "60px 62px", transition: anime ? "transform .5s cubic-bezier(.3,1.4,.5,1)" : "none" }}>
        <line x1="60" y1="62" x2="60" y2="22" stroke="var(--cap-ink)" strokeWidth="3" strokeLinecap="round" />
      </g>
      <circle cx="60" cy="62" r="5" fill="var(--cap-ink)" />
    </svg>
  );
}

export function DetecteurArnaque() {
  const anime = useAnimeTenir();
  const [k, setK] = useState(0);
  const [touches, setTouches] = useState<Set<number>>(new Set());
  const [verdict, setVerdict] = useState<boolean | null>(null);
  const [score, setScore] = useState<{ verdicts: number; trouves: number; signaux: number; fausses: number }>({ verdicts: 0, trouves: 0, signaux: 0, fausses: 0 });

  if (k >= MESSAGES.length) {
    return (
      <div>
        <ResultatTenir>
          <p className="text-[1.5rem] font-medium" style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}>{score.verdicts} verdicts justes sur {MESSAGES.length}</p>
          <p className="mt-1">Vous avez repéré {score.trouves} signaux sur {score.signaux}{score.fausses > 0 ? `, et soupçonné ${score.fausses} phrase${score.fausses > 1 ? "s" : ""} innocente${score.fausses > 1 ? "s" : ""}` : ""}. Une seule chose compte vraiment : au moindre signal, on ne confie pas un euro avant d'avoir vérifié.</p>
        </ResultatTenir>
        <div className="mt-2"><LienTenir onClick={() => { setK(0); setTouches(new Set()); setVerdict(null); setScore({ verdicts: 0, trouves: 0, signaux: 0, fausses: 0 }); }}>Recommencer</LienTenir></div>
      </div>
    );
  }

  const m = MESSAGES[k];
  const corrige = verdict != null;
  const vrais = m.phrases.map((p, i) => (p.s ? i : -1)).filter((i) => i >= 0);
  const aiguille = corrige ? Math.min(1, vrais.length / 4) : Math.min(1, touches.size / 4);

  const rendre = (v: boolean) => {
    setVerdict(v);
    const trouves = vrais.filter((i) => touches.has(i)).length;
    const fausses = Array.from(touches).filter((i) => !m.phrases[i].s).length;
    setScore((s) => ({ verdicts: s.verdicts + (v === m.arnaque ? 1 : 0), trouves: s.trouves + trouves, signaux: s.signaux + vrais.length, fausses: s.fausses + fausses }));
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.95rem] italic" style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-amber-ink)" }}>Message {k + 1} sur {MESSAGES.length} : {m.cadre.toLowerCase()}</p>
          <p className="mt-0.5 text-[0.9rem]" style={{ color: "var(--cap-ink-3)" }}>De : {m.de}</p>
        </div>
        <div className="flex-none"><Cadran valeur={aiguille} anime={anime} /></div>
      </div>

      <div role="group" aria-label="Touchez les phrases qui vous semblent suspectes" className="mt-2 grid gap-1.5 rounded-[14px] p-2" style={{ backgroundColor: "var(--cap-surface-2)" }}>
        {m.phrases.map((p, i) => {
          const t = touches.has(i);
          const etat = !corrige ? (t ? "choisi" : "neutre") : p.s ? (t ? "juste" : "manque") : t ? "faux" : "neutre";
          return (
            <div key={i}>
              <ChoixTenir etat={etat} presse={t} disabled={corrige}
                onClick={() => setTouches((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })}>
                {p.t}
                {corrige && p.s && (
                  <span className="mt-1 block text-[0.88rem]" style={{ color: "var(--cap-ink-2)" }}>
                    <b style={{ color: "var(--cap-down)" }}>{NOMS[p.s]}{t ? "" : " (pas repéré)"}.</b> {p.pourquoi}
                  </span>
                )}
                {corrige && !p.s && t && <span className="mt-1 block text-[0.88rem]" style={{ color: "var(--cap-ink-2)" }}>Cette phrase-là est innocente.</span>}
              </ChoixTenir>
            </div>
          );
        })}
      </div>

      <ResultatTenir className="mt-3">
        {!corrige
          ? <p>Touchez les phrases suspectes ({touches.size} touchée{touches.size > 1 ? "s" : ""}), puis rendez votre verdict.</p>
          : <p><b style={{ color: verdict === m.arnaque ? "var(--cap-up)" : "var(--cap-down)" }}>{verdict === m.arnaque ? "Bon verdict." : "Mauvais verdict."}</b> {m.bilan}</p>}
      </ResultatTenir>
      <div className="mt-3 flex flex-wrap gap-2">
        {!corrige ? (
          <>
            <BoutonTenir onClick={() => rendre(true)}>C'est une arnaque</BoutonTenir>
            <BoutonTenir onClick={() => rendre(false)}>Ça a l'air honnête</BoutonTenir>
          </>
        ) : (
          <BoutonTenir onClick={() => { setK(k + 1); setTouches(new Set()); setVerdict(null); }}>{k < MESSAGES.length - 1 ? "Message suivant" : "Voir mon score"}</BoutonTenir>
        )}
      </div>
    </div>
  );
}
