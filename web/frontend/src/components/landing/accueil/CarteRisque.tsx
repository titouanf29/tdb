"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * La carte du haut de page : le calcul se fait sous les yeux.
 *
 * Reprise de la carte de Clair (le solde, chaque prélèvement s'en va, il
 * reste le vrai chiffre), avec la question de CaptenTDB : on part de la
 * mise, chaque niveau du plan se pose, et il reste ce qu'on perd au pire.
 * C'est la phrase qu'un visiteur a trouvée « la meilleure de la page » sur
 * l'analyse : « je peux perdre 100 € pour en gagner 300 ».
 *
 * Un exemple fixe et annoncé comme tel. La carte arrive couchée, en
 * perspective, et se redresse pendant qu'on descend ; sur ordinateur elle
 * suit un peu la souris. Mouvement réduit : tout est en place, rien ne bouge.
 */

const MISE = 1000;
const PERTE = 100;
const euros = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eur = (v: number) => `${euros.format(v)} €`;

const LIGNES = [
  { nom: "Entrée", valeur: "60,00 €", ton: "ink" },
  { nom: "Stop, décidé avant d'entrer", valeur: "54,00 € · −10 %", ton: "down" },
  { nom: "Objectif", valeur: "78,00 € · +30 %", ton: "up" },
] as const;

const attendre = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

export function CarteRisque() {
  const scene = useRef<HTMLDivElement>(null);
  const carte = useRef<HTMLDivElement>(null);
  const [montant, setMontant] = useState(PERTE);
  const [fini, setFini] = useState(true);
  const [comptees, setComptees] = useState<number>(LIGNES.length);
  const [rejouable, setRejouable] = useState(false);
  const tour = useRef(0);

  const animer = useCallback(async () => {
    const id = ++tour.current;
    const vivant = () => id === tour.current;
    setFini(false); setRejouable(false); setComptees(0); setMontant(MISE);
    await attendre(700);
    for (let i = 1; i <= LIGNES.length; i++) {
      if (!vivant()) return;
      setComptees(i);
      // Le stop posé, la mise devient ce qu'on risque vraiment : elle fond.
      if (i === 2) {
        const debut = performance.now();
        await new Promise<void>((fin) => {
          const pas = (t: number) => {
            if (!vivant()) return fin();
            const k = Math.min(1, (t - debut) / 1100);
            setMontant(MISE + (PERTE - MISE) * (1 - Math.pow(1 - k, 3)));
            if (k < 1) requestAnimationFrame(pas); else fin();
          };
          requestAnimationFrame(pas);
        });
      }
      await attendre(520);
    }
    if (!vivant()) return;
    setMontant(PERTE); setFini(true); setRejouable(true);
  }, []);

  // Le calcul part quand la carte est sous les yeux (au téléphone, elle est
  // sous le titre), une seule fois ; ensuite, « Rejouer ».
  useEffect(() => {
    const el = carte.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let parti = false;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !parti) { parti = true; obs.disconnect(); animer(); }
    }, { threshold: 0.45 });
    obs.observe(el);
    return () => { obs.disconnect(); tour.current++; };
  }, [animer]);

  // Le redressement au défilement, et la souris sur grand écran.
  useEffect(() => {
    const el = scene.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const majDefilement = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const h = window.innerHeight;
      const cp = Math.min(1, Math.max(0, (h - r.top) / (h * 0.75)));
      el.style.setProperty("--cp", cp.toFixed(3));
    };
    const surDefilement = () => { if (!raf) raf = requestAnimationFrame(majDefilement); };
    const souris = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      el.style.setProperty("--mx", ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
      el.style.setProperty("--my", ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
    };
    majDefilement();
    window.addEventListener("scroll", surDefilement, { passive: true });
    window.addEventListener("resize", surDefilement);
    window.addEventListener("pointermove", souris, { passive: true });
    return () => {
      window.removeEventListener("scroll", surDefilement);
      window.removeEventListener("resize", surDefilement);
      window.removeEventListener("pointermove", souris);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const stopPose = comptees >= 2;
  return (
    <figure className="acc-carte-figure acc-monte-loin">
      <div className="acc-carte-scene" ref={scene}>
        <div className={`acc-carte${fini ? "" : " is-calcul"}`} ref={carte}>
          <p className="sr-only">
            Exemple : vous achetez TotalEnergies pour 1 000 € à 60 €, avec un stop à 54 € et un objectif à 78 €.
            Si le stop est touché, vous perdez au plus 100 €. Vous visez 300 €, soit 1 pour 3.
          </p>
          <div aria-hidden>
            <p className="acc-carte-titre">TotalEnergies, un achat</p>
            <p className="acc-carte-label">{stopPose ? "Si ça tourne mal, vous perdez au plus" : "Vous misez"}</p>
            <p className={`acc-carte-montant${stopPose ? " is-risque" : ""}`}>{eur(montant)}</p>
            <ul className="acc-carte-lignes">
              {LIGNES.map((l, i) => (
                <li key={l.nom} className={i < comptees ? "is-in" : ""} data-ton={l.ton}>
                  <span>{l.nom}</span><b>{l.valeur}</b>
                </li>
              ))}
            </ul>
            {/* Le plan sur une ligne : où l'on sort, où l'on est, où l'on vise. */}
            <div className={`acc-plan${comptees >= LIGNES.length ? " is-in" : ""}`}>
              <div className="acc-plan-barre"><i className="acc-plan-perte" /><i className="acc-plan-gain" /><i className="acc-plan-point" /></div>
              <div className="acc-plan-legende"><span>Stop</span><span>Entrée</span><span>Objectif</span></div>
            </div>
            <div className="acc-carte-pied">
              <span>Ce que vous visez</span>
              <strong>{eur(300)} · 1 pour 3</strong>
            </div>
          </div>
          <button type="button" className="acc-rejouer" onClick={animer} hidden={!rejouable}>Rejouer le calcul</button>
        </div>
      </div>
      <figcaption>Un exemple, frais non compris. Dans votre espace, ce sont les vrais cours.</figcaption>
    </figure>
  );
}
