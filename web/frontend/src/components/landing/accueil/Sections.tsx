import Link from "next/link";
import { Button, LigneDatee, Nimbo } from "@/components/design-system";
import { BordNuages } from "./BordNuages";
import { CarteRisque } from "./CarteRisque";

/**
 * L'accueil, dans l'ordre où il se lit.
 *
 * La page suit le plan de l'accueil de Clair, qui a fait ses preuves :
 *   1. la question que la personne se pose, et la réponse calculée sous ses yeux ;
 *   2. « Ça vous parle ? » : le problème, en trois moments de la semaine ;
 *   3. trois gestes, montrés avec de vraies captures de l'application ;
 *   4. qui est derrière, et tout ce que le site ne prend pas ;
 *   5. les questions ;
 *   6. le dernier mot.
 * Elle remplace neuf sections et quinze écrans de téléphone : un visiteur
 * décrochait au septième. On ne dit pas tout ici ; le reste est à un clic.
 *
 * Deux fonds seulement, pleins : le ciel (et la feuille claire posée dessus)
 * et la nuit. Les bords des feuilles sont des nuages.
 */

const PAPIER = "var(--acc-papier)";
const PAPIER_OMBRE = "var(--acc-papier-ombre)";
const NUIT_BORD = "var(--acc-nuit-bord)";

/* ── 1. La question ─────────────────────────────────────────────────────── */

export function Accroche() {
  return (
    <section className="acc-hero" id="depart">
      <div className="acc-wrap acc-hero-grille">
        <div className="acc-hero-texte">
          <p className="cap-dateline acc-monte text-[0.92rem]"><LigneDatee /></p>
          <h1 className="acc-monte">
            <span>Si ça baisse,</span> <span>vous perdez</span> <em><span>combien&nbsp;?</span></em>
          </h1>
          <p className="acc-chapeau acc-monte">
            CaptenTDB vous fait choisir la sortie avant d&apos;entrer. Sur les vrais cours, avec 10&nbsp;000&nbsp;€
            fictifs, et Nimbo qui explique chaque chiffre.
          </p>
          <div className="acc-cta acc-monte">
            <Button href="/register" size="lg">Créer mon espace</Button>
            <Link href="/login" className="acc-lien-second">J&apos;ai déjà un compte</Link>
          </div>
          <p className="acc-note acc-monte">Gratuit, sans carte bancaire. L&apos;argent est fictif, les cours sont réels.</p>
        </div>
        <CarteRisque />
      </div>
    </section>
  );
}

/* ── 2. Ça vous parle ? ─────────────────────────────────────────────────── */

/** Une petite courbe : la semaine d'un achat sans plan. */
function Courbe({ points, ton }: Readonly<{ points: number[]; ton: "up" | "down" }>) {
  const w = 240, h = 56, n = points.length - 1;
  const lo = Math.min(...points), hi = Math.max(...points);
  const pts = points.map((v, i) => `${(i / n) * w},${h - 4 - ((v - lo) / (hi - lo || 1)) * (h - 8)}`).join(" ");
  return (
    <svg className="acc-courbe" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden focusable="false">
      <polyline points={pts} fill="none" stroke={ton === "up" ? "var(--cap-up)" : "var(--cap-down)"} strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
    </svg>
  );
}

const MOMENTS = [
  {
    quand: "Lundi", chiffre: "+40 % promis", bas: false, ton: "up" as const,
    points: [10, 11, 10.6, 11.8, 12.4, 12.1, 13.2],
    texte: "Une vidéo promet +40 % sur une crypto. Vous achetez, sans plan.",
  },
  {
    quand: "Mercredi", etiquettes: ["Pas de stop", "Pas d'objectif"], ton: "down" as const,
    points: [13.2, 12.9, 13.1, 12.4, 12.6, 12.1, 12.15],
    texte: "Elle a perdu 8 %. Vous attendez qu'elle remonte.",
  },
  {
    quand: "Vendredi", chiffre: "−27 %", bas: true, ton: "down" as const,
    points: [12.1, 11.6, 11.8, 10.9, 10.2, 10.4, 9.6],
    texte: "Elle a perdu 27 %. Vous ne savez plus quand sortir.",
  },
];

export function CaVousParle() {
  return (
    <section className="acc-feuille acc-histoire" aria-labelledby="histoire-titre">
      <BordNuages cote="haut" avant={PAPIER} arriere={PAPIER_OMBRE} />
      <div className="acc-wrap acc-histoire-grille">
        <h2 id="histoire-titre" className="acc-histoire-titre acc-reveal">Ça vous parle&nbsp;?</h2>
        <div>
          <ol className="acc-moments">
            {MOMENTS.map((m) => (
              <li key={m.quand} className="acc-moment acc-reveal">
                <div className="acc-moment-tete" aria-hidden>
                  <span className="acc-moment-quand">{m.quand}</span>
                  {m.chiffre && <span className={`acc-moment-chiffre${m.bas ? " is-bas" : ""}`}>{m.chiffre}</span>}
                  {m.etiquettes && (
                    <span className="acc-moment-etiquettes">{m.etiquettes.map((e) => <span key={e}>{e}</span>)}</span>
                  )}
                </div>
                <Courbe points={m.points} ton={m.ton} />
                <p>{m.texte}</p>
              </li>
            ))}
          </ol>
          <p className="acc-reponse acc-reveal">
            CaptenTDB vous fait choisir <em>la sortie</em> avant d&apos;entrer.
            <span>Avec de l&apos;argent fictif : l&apos;erreur ne coûte rien, la leçon reste.</span>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── 3. Trois gestes ────────────────────────────────────────────────────── */

const GESTES = [
  {
    titre: "Vous choisissez un actif",
    texte: "Une entreprise que vous connaissez, une crypto, l'or. Plus de 800 valeurs, sur les vrais cours.",
    img: "/accueil/geste-1.webp", w: 720, h: 690,
    alt: "Capture de CaptenTDB : la recherche d'un actif, « Air Liq » tapé, Air Liquide proposé en premier.",
  },
  {
    titre: "Nimbo chiffre le plan",
    texte: "Où sortir si ça baisse, où viser si ça monte, et ce que vous perdez au pire. S'il vaut mieux attendre, il le dit.",
    img: "/accueil/geste-2.webp", w: 640, h: 860,
    alt: "Capture de CaptenTDB : le plan d'exemple sur Air Liquide, stop à 189,09 €, objectif à 205,69 €, perte au stop 80 €, et la décision de la Fed pendant le trade.",
  },
  {
    titre: "Vous prenez position, en argent fictif",
    texte: "10 000 € virtuels. Le stop et l'objectif sont posés avant d'entrer, et chaque position fermée est relue au journal.",
    img: "/accueil/geste-3.webp", w: 720, h: 710,
    alt: "Capture de CaptenTDB : la position ouverte, 3 725 € d'Air Liquide achetés à 193,24 €, stop à 189,09 €, objectif à 205,69 €.",
  },
];

export function TroisGestes() {
  return (
    <section className="acc-feuille acc-gestes" id="gestes" aria-labelledby="gestes-titre">
      <BordNuages cote="bas" avant={PAPIER} arriere={NUIT_BORD} />
      <div className="acc-wrap">
        <h2 id="gestes-titre" className="acc-reveal">Trois gestes.<br />Dix minutes.</h2>
        <ol className="acc-fil">
          {GESTES.map((g, i) => (
            <li key={g.titre} className="acc-geste acc-reveal">
              <span className="acc-geste-n" aria-hidden>{i + 1}</span>
              <div className="acc-geste-texte">
                <h3>{g.titre}</h3>
                <p>{g.texte}</p>
              </div>
              <figure className="acc-capture">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.img} width={g.w} height={g.h} loading="lazy" decoding="async" alt={g.alt} />
              </figure>
            </li>
          ))}
        </ol>
        <p className="acc-apres-gestes acc-reveal">
          Et pour apprendre : <Link href="/cours">37 leçons gratuites</Link>, à lire sans compte, et{" "}
          <Link href="/actifs">les analyses du jour</Link>.
        </p>
      </div>
    </section>
  );
}

/* ── 4. Qui est derrière ────────────────────────────────────────────────── */

const ZEROS = [
  { quoi: "euro réel en jeu", detail: "Le solde, les positions et les gains sont fictifs." },
  { quoi: "carte bancaire", detail: "Ni pour s'inscrire, ni pour s'entraîner." },
  { quoi: "commission", detail: "Aucun courtier partenaire, aucun lien sponsorisé." },
  { quoi: "publicité", detail: "Votre adresse ne sert qu'à votre compte, jamais vendue." },
];

export function QuiEstDerriere() {
  return (
    <section className="acc-nuit acc-origine" aria-labelledby="origine-titre">
      <div className="acc-wrap acc-origine-grille">
        <div>
          <h2 id="origine-titre" className="acc-reveal">CaptenTDB ne gagne rien sur vos trades.</h2>
          <div className="acc-origine-texte acc-reveal">
            <p>Personne ici ne touche de commission quand vous achetez. Personne ne vous pousse à trader : Nimbo dit aussi quand il vaut mieux attendre.</p>
            <p>Et quand il se trompe, ça se voit. Chacune de ses propositions est suivie jusqu&apos;au bout, et le bilan est dans votre espace.</p>
            <p className="acc-origine-signe">
              <Nimbo humeur="salue" taille={44} label="" className="shrink-0" />
              Un projet indépendant, imaginé et construit en France. Pas une banque, pas un courtier.
            </p>
          </div>
        </div>
        <ul className="acc-zeros">
          {ZEROS.map((z) => (
            <li key={z.quoi} className="acc-reveal">
              <span className="acc-zero" aria-hidden>0</span>
              <div><h3><span className="sr-only">Zéro </span>{z.quoi}</h3><p>{z.detail}</p></div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── 5. Les questions ───────────────────────────────────────────────────── */

const QUESTIONS: { q: string; r: React.ReactNode }[] = [
  { q: "C'est gratuit\u00a0?", r: "Oui pour s'entraîner : analyses, positions virtuelles, journal et leçons. Un abonnement facultatif relève les limites d'usage ; il ne donne pas de meilleurs signaux." },
  { q: "Est-ce que je risque de l'argent réel\u00a0?", r: "Non, jamais. Aucun dépôt n'est possible et aucune carte bancaire n'est demandée. Seuls les cours sont réels." },
  {
    q: "Est-ce un conseil en investissement\u00a0?",
    r: (
      <>
        Non. CaptenTDB est un outil éducatif, pas un prestataire de services d&apos;investissement. Quand Nimbo
        « propose » une position, c&apos;est un exercice chiffré et expliqué. Détails dans les{" "}
        <Link href="/mentions-legales">mentions légales</Link>.
      </>
    ),
  },
  { q: "Faut-il déjà s'y connaître\u00a0?", r: "Non. Le site vous demande votre niveau et règle la quantité d'informations. Un premier parcours vous fait faire une analyse, une position, puis son suivi." },
  { q: "Nimbo a-t-il toujours raison\u00a0?", r: "Non, et il le dit. Sur dix achats comparables, il montre combien ont atteint l'objectif et combien ont touché le stop, mesuré sur des années de données." },
  {
    q: "Que faites-vous de mes données\u00a0?",
    r: (
      <>
        Un seul cookie, celui qui garde votre session. Votre adresse sert à votre compte et à rien d&apos;autre.
        Vous pouvez tout télécharger ou tout supprimer dans les paramètres. Le détail est dans la{" "}
        <Link href="/politique-de-confidentialite">politique de confidentialité</Link>.
      </>
    ),
  },
  { q: "Ça marche sur téléphone\u00a0?", r: "Oui. Le site s'installe sur l'écran d'accueil comme une application, et peut vous prévenir quand Nimbo propose un achat sur un de vos favoris." },
];

export function Questions() {
  return (
    <section className="acc-feuille acc-questions" id="questions" aria-labelledby="questions-titre">
      <BordNuages cote="haut" avant={PAPIER} arriere={PAPIER_OMBRE} />
      <BordNuages cote="bas" avant={PAPIER} arriere={NUIT_BORD} />
      <div className="acc-wrap acc-questions-grille">
        <div className="acc-questions-tete acc-reveal">
          <h2 id="questions-titre">Vos questions.</h2>
          <p>Une autre question&nbsp;? Le contact est dans les <Link href="/mentions-legales">mentions légales</Link>.</p>
        </div>
        {/* Questions et réponses composées, réponses visibles : la charte du site, pas un accordéon. */}
        <dl className="cap-qr acc-reveal">
          {QUESTIONS.map((x) => (
            <div key={x.q} className="cap-qr-item">
              <dt>{x.q}</dt>
              <dd>{x.r}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ── 6. Le dernier mot ──────────────────────────────────────────────────── */

export function DernierMot() {
  return (
    <section className="acc-nuit acc-final" aria-labelledby="final-titre">
      {/* La nuit pend en nuages au-dessus du pied de page. */}
      <BordNuages cote="bas" avant="var(--acc-nuit)" arriere={NUIT_BORD} />
      <div className="acc-wrap">
        <h2 id="final-titre" className="acc-reveal">Cette fois, vous savez où vous sortez.</h2>
        <div className="acc-cta acc-cta-centre acc-reveal">
          <Button href="/register" size="lg">Créer mon espace</Button>
          <Link href="/login" className="acc-lien-second">Se connecter</Link>
        </div>
      </div>
    </section>
  );
}

/** La barre d'action du téléphone : sous le pouce, quand le bouton du haut est sorti. */
export function BarreAction() {
  return (
    <div className="acc-dock">
      <span>Gratuit, argent fictif</span>
      <Button href="/register" size="md">Créer mon espace</Button>
    </div>
  );
}
