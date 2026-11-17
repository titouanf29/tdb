import type { Metadata } from "next";
import Link from "next/link";
import "./banque.css";
import { CoursBanque } from "./CoursBanque";

/**
 * ESSAI : l'accueil dans l'allure d'une banque d'investissement.
 *
 * Demande : garder le ciel (le rêve de l'argent) mais lui donner le sérieux
 * de l'argent, « ultra stylé, banque d'investissement ». D'où : la nuit au
 * lieu du ciel pastel, des nuages réalistes éclairés par le couchant (un
 * filtre de turbulence, pas des nuages dessinés), une typographie grande et
 * fine, des filets d'or champagne, des angles droits, et les chiffres posés
 * comme dans un rapport annuel. Aucune mascotte en haut de page.
 *
 * Page hors menu, non référencée : /essais/banque.
 */
export const metadata: Metadata = { title: "Essai : CaptenTDB, version banque d'investissement", robots: { index: false, follow: false } };

/** Le ciel : une mer de nuages au couchant, vue d'avion (rendu calculé, scripts/generer-ciel-nuit.py). */
function Ciel() {
  return <div className="bq-ciel" aria-hidden />;
}

const CHIFFRES: [string, string][] = [
  ["10 000 €", "de capital fictif à l'ouverture"],
  ["800", "valeurs suivies, sur les vrais cours"],
  ["0 €", "de commission, aucun courtier derrière"],
  ["37", "leçons, lisibles sans compte"],
];

export default function EssaiBanque() {
  return (
    <div className="bq">
      <header className="bq-entete">
        <Link href="/" className="bq-marque">Capten<span>TDB</span></Link>
        <nav aria-label="Navigation principale">
          <a href="#methode">Méthode</a>
          <a href="#resultats">Résultats</a>
          <Link href="/cours">Leçons</Link>
          <Link href="/login" className="bq-connexion">Connexion</Link>
        </nav>
      </header>

      <section className="bq-hero">
        <Ciel />
        <div className="bq-hero-texte">
          <p className="bq-sur-titre"><span />École de trading, argent fictif</p>
          <h1>Apprenez à risquer<br />avant de risquer.</h1>
          <p className="bq-chapeau">
            Les vrais marchés, une méthode, et un capital fictif de 10 000 €. Chaque position commence par la
            question qui compte : où sortir si le marché vous donne tort.
          </p>
          <div className="bq-actions">
            <Link href="/register" className="bq-bouton">Ouvrir mon espace</Link>
            <a href="#methode" className="bq-lien">Découvrir la méthode</a>
          </div>
        </div>
        <dl className="bq-chiffres">
          {CHIFFRES.map(([n, t]) => (
            <div key={t}><dt>{n}</dt><dd>{t}</dd></div>
          ))}
        </dl>
      </section>

      <CoursBanque />

      <section className="bq-section" id="methode">
        <div className="bq-col-titre">
          <p className="bq-sur-titre"><span />La méthode</p>
          <h2>Trois décisions,<br />toujours dans cet ordre.</h2>
        </div>
        <ol className="bq-etapes">
          <li><span>01</span><h3>Lire</h3><p>Un actif, un verdict sur 100 et ses raisons, en français. Quand rien n&apos;est net, le verdict le dit.</p></li>
          <li><span>02</span><h3>Borner</h3><p>Le stop et l&apos;objectif se posent avant d&apos;entrer. La perte maximale est connue, au centime.</p></li>
          <li><span>03</span><h3>Relire</h3><p>Chaque position fermée revient au journal : ce qui était prévu, ce qui s&apos;est passé, ce qu&apos;on en retient.</p></li>
        </ol>
      </section>

      <section className="bq-section bq-section-claire" id="resultats">
        <div className="bq-col-titre">
          <p className="bq-sur-titre"><span />Résultats mesurés</p>
          <h2>Ce que disent<br />les chiffres.</h2>
          <p className="bq-texte">Le trading fait perdre de l&apos;argent à la plupart de ceux qui s&apos;y lancent. Nous publions ce que nous mesurons, y compris ce qui ne marche pas.</p>
        </div>
        <table className="bq-tableau">
          <thead><tr><th scope="col">Mesure</th><th scope="col">Résultat</th><th scope="col">Source</th></tr></thead>
          <tbody>
            <tr><td>Particuliers en perte sur le forex et les CFD, 2009 à 2012</td><td className="bq-num">89 %</td><td>AMF, octobre 2014</td></tr>
            <tr><td>Actifs où les ventes à découvert du moteur ont perdu, sur 5 ans</td><td className="bq-num">36 sur 40</td><td>CaptenTDB, frais inclus</td></tr>
            <tr><td>Propositions de Nimbo suivies jusqu&apos;au stop, à l&apos;objectif ou à l&apos;échéance</td><td className="bq-num">Toutes</td><td>Bilan dans votre espace</td></tr>
          </tbody>
        </table>
      </section>

      <section className="bq-final">
        <Ciel />
        <div className="bq-final-texte">
          <h2>Le marché ne pardonne pas l&apos;improvisation.<br />Entraînez-vous ici.</h2>
          <Link href="/register" className="bq-bouton">Ouvrir mon espace</Link>
          <p className="bq-mention">Gratuit, sans carte bancaire. CaptenTDB est un outil éducatif, pas un conseil en investissement.</p>
        </div>
      </section>
    </div>
  );
}
