"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Choix, Curseur, Etiquette, heureTexte, Lien, maintenantParis, useAnimer } from "./ElementsMarches";

/**
 * L'horloge des sessions : une journée de 24 heures, heure de Paris, avec les
 * trois grandes places du forex en anneaux. On choisit une heure, un jour,
 * l'hiver ou l'été (ou l'heure réelle), et l'outil dit ce qu'on peut attendre
 * du marché à ce moment-là.
 *
 * Les sessions sont décrites dans l'heure locale de chaque ville (Tokyo 9 h à
 * 18 h, Londres 8 h à 17 h, New York 8 h à 17 h), puis converties en heure de
 * Paris : les changements d'heure (et les semaines où l'Europe et les
 * États-Unis ne sont pas d'accord) se calculent tout seuls.
 */

type Jour = "semaine" | "vendredi" | "samedi" | "dimanche";
type Saison = "hiver" | "ete";

function sessions(P: number, N: number) {
  return {
    tokyo: [P, 9 + P] as [number, number],
    londres: [9, 18] as [number, number],
    newYork: [8 - N + P, 17 - N + P] as [number, number],
    fermeture: 17 - N + P,
  };
}

function forexOuvert(jour: Jour, h: number, fermeture: number) {
  if (jour === "samedi") return false;
  if (jour === "dimanche") return h >= fermeture;
  if (jour === "vendredi") return h < fermeture;
  return true;
}

const dans = (h: number, [a, b]: [number, number]) => h >= a && h < b;

function attente(jour: Jour, h: number, s: ReturnType<typeof sessions>): { titre: string; texte: string; niveau: number } {
  const { tokyo, londres, newYork, fermeture } = s;
  const wallStreet = heureTexte(newYork[0] + 1.5);
  if (jour === "samedi") return { titre: "Le forex est fermé", niveau: 0, texte: "Le samedi, personne ne cote les devises : pas de prix, pas de trade. Seules les cryptos continuent. Ce qui se passe dans le monde ce week-end se verra à la réouverture." };
  if (jour === "dimanche" && h < fermeture) return { titre: "Encore fermé", niveau: 0, texte: `Le forex rouvre dimanche vers ${heureTexte(fermeture)}, heure de Paris, quand l'Asie-Pacifique (Sydney, Wellington) commence sa semaine.` };
  if (jour === "vendredi" && h >= fermeture) return { titre: "La semaine est finie", niveau: 0, texte: `New York a fermé vers ${heureTexte(fermeture)} : le forex aussi, jusqu'à dimanche soir. Une position gardée tout le week-end ne peut pas être coupée avant la réouverture.` };
  if (jour === "dimanche") return { titre: "La réouverture", niveau: 1, texte: "Peu de monde est déjà là : les spreads sont souvent larges, et le prix peut repartir d'un autre niveau que vendredi soir (un écart, ou gap), si une nouvelle est tombée pendant le week-end." };
  const vendredi = jour === "vendredi" ? " Le vendredi, beaucoup ferment leurs positions avant le week-end : le mouvement peut s'essouffler plus tôt." : "";

  if (h >= fermeture || h < tokyo[0]) return { titre: "Le creux entre deux journées", niveau: 1, texte: "New York vient de fermer et Tokyo n'a pas encore ouvert. C'est le moment le plus creux : peu d'ordres, peu de liquidité, et le spread grandit souvent. C'est aussi l'heure où le courtier compte les frais de nuit (le swap)." };
  if (dans(h, londres) && dans(h, newYork)) {
    if (h >= 14.25 && h < 15) return { titre: "14 h 30 : les chiffres américains", niveau: 4, texte: `Londres et New York sont ouverts ensemble, et c'est l'heure des grands chiffres américains (l'emploi, l'inflation). Le prix peut sauter de plusieurs dizaines de pips en une minute, et le spread s'élargir : c'est la leçon 13.${vendredi}` };
    return { titre: "Le chevauchement", niveau: 4, texte: `Londres et New York travaillent en même temps : le plus de monde, le plus de liquidité, et souvent les plus grands mouvements de la journée. Wall Street ouvre à ${wallStreet}.${vendredi}` };
  }
  if (dans(h, tokyo) && dans(h, londres)) return { titre: "Londres ouvre", niveau: 3, texte: "La plus grande place du forex arrive pendant que Tokyo finit sa journée. Le volume grimpe d'un coup, et le prix sort souvent du petit couloir de la nuit." };
  if (dans(h, tokyo)) return { titre: "La session asiatique", niveau: 2, texte: "Tokyo travaille, l'Europe dort. Le yen et le dollar australien bougent davantage ; pour l'euro-dollar, c'est souvent calme, dans un couloir étroit." };
  if (dans(h, londres)) return { titre: "La matinée de Londres", niveau: 3, texte: "L'Europe est au travail : beaucoup d'échanges, des chiffres européens (souvent vers 10 h), des mouvements plus nets que la nuit." };
  if (h < fermeture - 2) return { titre: "New York, seule", niveau: 2, texte: `Londres a fermé à 18 h : l'activité retombe peu à peu. Les actions américaines cotent encore jusqu'à ${heureTexte(newYork[0] + 8)}.${vendredi}` };
  return { titre: "Le marché s'endort", niveau: 1, texte: `Les traders américains finissent leur journée : moins d'ordres, et un spread qui commence à grandir. New York ferme vers ${heureTexte(fermeture)}.${vendredi}` };
}

// ── Le dessin ──────────────────────────────────────────────────────────────

const C = 150;
const pt = (h: number, r: number) => {
  const a = ((h / 24) * 360 - 90) * (Math.PI / 180);
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};
function arc(h0: number, h1: number, r: number) {
  const [x0, y0] = pt(h0, r);
  const [x1, y1] = pt(h1, r);
  const grand = h1 - h0 > 12 ? 1 : 0;
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${grand} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
}

const ANNEAUX = [
  { cle: "tokyo", nom: "Tokyo", r: 124, tz: 9 },
  { cle: "londres", nom: "Londres", r: 105, tz: -1 },
  { cle: "newYork", nom: "New York", r: 86, tz: 0 },
] as const;

const NIVEAUX = ["Fermé", "Très calme", "Calme", "Actif", "Très agité"];

export function HorlogeSessions() {
  const [heure, setHeure] = useState(15);
  const [jour, setJour] = useState<Jour>("semaine");
  const [saison, setSaison] = useState<Saison>("hiver");
  const [reel, setReel] = useState<{ P: number; N: number } | null>(null);

  const P = reel ? reel.P : saison === "hiver" ? 1 : 2;
  const N = reel ? reel.N : saison === "hiver" ? -5 : -4;
  const s = sessions(P, N);
  const ouvert = forexOuvert(jour, heure, s.fermeture);
  const a = attente(jour, heure, s);
  const decale = P - N === 5;

  const lireMaintenant = () => {
    const m = maintenantParis();
    setReel({ P: m.P, N: m.N });
    setSaison(m.P === 2 ? "ete" : "hiver");
    setJour(m.jour <= 3 ? "semaine" : m.jour === 4 ? "vendredi" : m.jour === 5 ? "samedi" : "dimanche");
    setHeure(Math.floor(m.heure * 4) / 4);
  };
  useEffect(() => {
    if (!reel) return;
    const t = setInterval(lireMaintenant, 30000);
    return () => clearInterval(t);
  }, [reel]);

  const manuel = <T,>(f: (v: T) => void) => (v: T) => { setReel(null); f(v); };

  const actif = (cle: (typeof ANNEAUX)[number]["cle"]) => ouvert && dans(heure, s[cle]);
  const chev: [number, number] = [Math.max(s.londres[0], s.newYork[0]), Math.min(s.londres[1], s.newYork[1])];
  const animer = useAnimer();

  const clicCadran = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 300 - C;
    const y = ((e.clientY - r.top) / r.height) * 300 - C;
    if (Math.hypot(x, y) < 40) return;
    const ang = (Math.atan2(y, x) * 180) / Math.PI + 90;
    setReel(null);
    setHeure((Math.round((((ang + 360) % 360) / 360) * 96) % 96) / 4);
  };

  const heureVille = (tz: number) => {
    const decal = tz === 9 ? 9 - P : tz === -1 ? -1 : N - P;
    return heureTexte(heure + decal);
  };

  return (
    <div>
      <div className="grid items-start gap-5 sm:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[300px]">
          <svg viewBox="0 0 300 300" className="block w-full cursor-pointer" onClick={clicCadran}
            role="img" aria-label={`Horloge des sessions, ${heureTexte(heure)} à Paris`}>
            {/* Les heures */}
            {Array.from({ length: 24 }, (_, k) => {
              const [x0, y0] = pt(k, 64);
              const [x1, y1] = pt(k, k % 6 === 0 ? 72 : 68);
              return <line key={k} x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--cap-line-strong)" strokeWidth={k % 6 === 0 ? 1.6 : 1} />;
            })}
            {[0, 3, 6, 9, 12, 15, 18, 21].map((k) => {
              const [x, y] = pt(k, 53);
              return <text key={k} x={x} y={y + 4} textAnchor="middle" fontSize="11" fill="var(--cap-ink-3)">{k}</text>;
            })}
            {/* Les anneaux */}
            {ANNEAUX.map((an) => (
              <g key={an.cle}>
                <circle cx={C} cy={C} r={an.r} fill="none" stroke="var(--cap-line)" strokeWidth="12" />
                <path d={arc(s[an.cle][0], s[an.cle][1], an.r)} fill="none" strokeWidth="12" strokeLinecap="round"
                  stroke={actif(an.cle) ? "var(--cap-ocean)" : "var(--cap-ink-4)"} opacity={jour === "samedi" ? 0.35 : actif(an.cle) ? 1 : 0.55}
                  style={{ transition: animer ? "stroke .3s ease, opacity .3s ease" : undefined }} />
              </g>
            ))}
            {/* Le chevauchement */}
            <path d={arc(chev[0], chev[1], 140)} fill="none" stroke="var(--cap-ambre)" strokeWidth="3.5" strokeLinecap="round" />
            {/* L'aiguille */}
            <g style={{ transform: `rotate(${(heure / 24) * 360}deg)`, transformOrigin: "150px 150px", transition: animer ? "transform .45s cubic-bezier(.3,.7,.3,1)" : undefined }}>
              <line x1={C} y1={C - 74} x2={C} y2={C - 146} stroke="var(--cap-ink)" strokeWidth="2" strokeLinecap="round" />
              <circle cx={C} cy={C - 146} r="4.5" fill="var(--cap-ambre)" stroke="var(--cap-surface)" strokeWidth="1.5" />
            </g>
            {/* Le centre */}
            <text x={C} y={C - 2} textAnchor="middle" fontSize="24" fontWeight="600" fill="var(--cap-ink)" style={{ fontFamily: "var(--cap-font-display)" }}>{heureTexte(heure)}</text>
            <text x={C} y={C + 17} textAnchor="middle" fontSize="11.5" fill="var(--cap-ink-3)">à Paris</text>
          </svg>
          <p className="mt-1 text-center text-[0.84rem]" style={{ color: "var(--cap-ink-3)" }}>Touchez le cadran pour choisir une heure.</p>
        </div>

        <div className="min-w-0">
          <ul className="space-y-1.5">
            {ANNEAUX.map((an) => (
              <li key={an.cle} className="flex items-baseline gap-2.5 text-[0.97rem]">
                <span aria-hidden className="inline-block h-2.5 w-5 flex-none translate-y-[-1px] rounded-full"
                  style={{ backgroundColor: actif(an.cle) ? "var(--cap-ocean)" : "var(--cap-ink-4)", opacity: actif(an.cle) ? 1 : 0.55 }} />
                <span className="min-w-0">
                  <b style={{ color: "var(--cap-ink)" }}>{an.nom}</b>
                  <span style={{ color: "var(--cap-ink-2)" }}> : {heureTexte(s[an.cle][0])} à {heureTexte(s[an.cle][1])} à Paris</span>
                  <span style={{ color: "var(--cap-ink-3)" }}> (là-bas, il est {heureVille(an.tz)}){actif(an.cle) ? ", ouverte" : ""}</span>
                </span>
              </li>
            ))}
            <li className="flex items-baseline gap-2.5 text-[0.97rem]">
              <span aria-hidden className="inline-block h-[3px] w-5 flex-none translate-y-[-3px] rounded-full" style={{ backgroundColor: "var(--cap-ambre)" }} />
              <span style={{ color: "var(--cap-ink-2)" }}>Le chevauchement de Londres et New York : {heureTexte(chev[0])} à {heureTexte(chev[1])}</span>
            </li>
          </ul>

          <div className="mt-4 rounded-[12px] px-4 py-3" style={{ backgroundColor: "var(--cap-surface-2)" }} aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[1.08rem] font-semibold" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>{a.titre}</p>
              <span className="flex items-center gap-2 text-[0.85rem]" style={{ color: "var(--cap-ink-3)" }}>
                <span className="flex items-end gap-[3px]" aria-hidden>
                  {[1, 2, 3, 4].map((k) => (
                    <span key={k} className="w-[5px] rounded-sm" style={{ height: 5 + k * 3, backgroundColor: k <= a.niveau ? "var(--cap-ink)" : "var(--cap-line-strong)" }} />
                  ))}
                </span>
                {NIVEAUX[a.niveau]}
              </span>
            </div>
            <p className="mt-1.5 text-[0.98rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>{a.texte}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <Curseur label="L'heure à Paris" min={0} max={23.75} step={0.25} valeur={heure} onChange={manuel(setHeure)} affiche={heureTexte(heure)} />
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Choix label="Le jour" valeur={jour} onChange={manuel(setJour)} petit
            options={[{ v: "semaine", t: "Lundi à jeudi" }, { v: "vendredi", t: "Vendredi" }, { v: "samedi", t: "Samedi" }, { v: "dimanche", t: "Dimanche" }]} />
          <Choix label="L'heure de Paris" valeur={reel ? null : saison} onChange={manuel(setSaison)} petit
            options={[{ v: "hiver", t: "Hiver" }, { v: "ete", t: "Été" }]} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4">
          <Lien onClick={lireMaintenant}><Clock size={15} aria-hidden /> L&apos;heure réelle</Lien>
          {reel && <Etiquette ambre>Heure réelle de Paris, mise à jour toutes les 30 secondes.</Etiquette>}
        </div>
        {reel && decale && (
          <p className="text-[0.95rem]" style={{ color: "var(--cap-ink-2)" }}>
            En ce moment, l&apos;Europe et les États-Unis n&apos;ont pas changé d&apos;heure le même jour : pour Paris, New York ouvre et ferme <b>une heure plus tôt</b> que d&apos;habitude.
          </p>
        )}
      </div>
    </div>
  );
}
