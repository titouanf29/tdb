import Link from "next/link";
import { FileText, AlertTriangle } from "lucide-react";
import { LegalNav, LegalSectionTitle, InfoBox, Dl } from "@/components/legal/LegalNav";
import { lireEditeur } from "@/lib/legal-serveur";

export const metadata = {
  title: "Conditions Générales d'Utilisation — CaptenTDB",
  description: "CGU de CaptenTDB — Conditions générales d'utilisation de la plateforme éducative de paper trading.",
};

const TOC = [
  { id: "acceptation", label: "Acceptation & champ d'application" },
  { id: "service", label: "Description du service" },
  { id: "acces", label: "Conditions d'accès & inscription" },
  { id: "disclaimer", label: "Avertissement financier (AMF/MIF2)" },
  { id: "obligations", label: "Obligations de l'utilisateur" },
  { id: "compte", label: "Compte utilisateur" },
  { id: "premium", label: "Abonnement Premium" },
  { id: "retractation", label: "Droit de rétractation" },
  { id: "pi", label: "Propriété intellectuelle" },
  { id: "responsabilite", label: "Responsabilité & garanties" },
  { id: "disponibilite", label: "Disponibilité du service" },
  { id: "donnees", label: "Données personnelles" },
  { id: "force-majeure", label: "Force majeure" },
  { id: "dispositions", label: "Dispositions générales" },
  { id: "modifications", label: "Modifications des CGU" },
  { id: "droit", label: "Droit applicable & médiation" },
];

// Relues sur le serveur toutes les cinq minutes (api/legal.py).
export const revalidate = 300;

export default async function CguPage() {
  const e = await lireEditeur();
  const OFFRE_PAYANTE_OUVERTE = e.offre_ouverte;
  return (
    <div className="cap-legal space-y-6">
      <LegalNav current="/cgu" />

      {/* Header */}
      <div className="glass-card p-8 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
            <FileText className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold">Droit français</span>
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold">Dir. 2011/83/UE</span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-muted-foreground text-xs">Version 1.1</span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-muted-foreground text-xs">Mai 2026</span>
            </div>
            <h1 className="text-2xl font-bold">Conditions Générales d'Utilisation</h1>
            <p className="text-sm text-muted-foreground mt-1">
              En utilisant CaptenTDB, vous acceptez pleinement et sans réserve les présentes CGU.
            </p>
          </div>
        </div>
      </div>

      {/* Avertissement AMF.
          Il était écrit en `text-yellow-300/80`, hérité du thème sombre : sur
          le fond clair, le paragraphe le plus important de la page se lisait
          en jaune pâle sur beige. Il passe par l'encadré du pont légal, dont
          l'encre est celle du texte courant — la couleur reste sur le filet
          et sur le titre, là où elle signale sans empêcher de lire. */}
      <InfoBox variant="warning">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--cap-amber-ink)" }} />
          <div className="space-y-1">
            <p className="font-semibold" style={{ color: "var(--cap-ink)" }}>
              Avertissement réglementaire — Lecture obligatoire
            </p>
            <p>
              CaptenTDB est une <strong>plateforme éducative de paper trading</strong> (argent virtuel uniquement). Elle n'est pas agréée par l'AMF. Aucune information sur ce site ne constitue un conseil en investissement au sens de la Directive MIF 2 (2014/65/UE) ou du code monétaire et financier. Le trading sur les marchés réels comporte un risque de perte en capital.
            </p>
          </div>
        </div>
      </InfoBox>

      {/* TOC */}
      <div className="glass-card p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sommaire — {TOC.length} articles</p>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {TOC.map(({ id, label }, i) => (
            <li key={id}>
              <a href={`#${id}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors py-0.5">
                <span className="text-primary/50 text-xs w-5 text-right shrink-0">{i + 1}.</span>
                {label}
              </a>
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-5 text-sm leading-relaxed">

        {/* 1. Acceptation */}
        <section id="acceptation" className="glass-card p-6 space-y-3 scroll-mt-6">
          <LegalSectionTitle num="1" id="acceptation-title" title="Acceptation & champ d'application" />
          <p className="text-muted-foreground">
            Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'accès et l'utilisation de la plateforme CaptenTDB (ci-après « le Service ») éditée par CaptenQwark (ci-après « l'Éditeur »).
          </p>
          <p className="text-muted-foreground">
            L'utilisation du Service, que ce soit à titre gratuit ou dans le cadre d'un abonnement Premium, implique l'acceptation pleine, entière et sans réserve des présentes CGU, ainsi que de la <Link href="/politique-de-confidentialite" className="text-primary hover:underline">Politique de confidentialité</Link> et des <Link href="/mentions-legales" className="text-primary hover:underline">Mentions légales</Link>.
          </p>
          <p className="text-muted-foreground">
            Si vous n'acceptez pas ces conditions dans leur intégralité, vous devez cesser immédiatement d'utiliser le Service.
          </p>
        </section>

        {/* 2. Service */}
        <section id="service" className="glass-card p-6 space-y-3 scroll-mt-6">
          <LegalSectionTitle num="2" id="service-title" title="Description du service" />
          <p className="text-muted-foreground">CaptenTDB est une plateforme en ligne à vocation éducative proposant :</p>
          <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
            <li><strong className="text-foreground">Paper trading :</strong> simulation de trades sur un portefeuille virtuel crédité de 10 000 $ fictifs à l'inscription, sans aucun argent réel</li>
            <li><strong className="text-foreground">Analyse technique & fondamentale :</strong> graphiques, indicateurs, scanner de marchés, points pivots, backtesting — à titre éducatif</li>
            <li><strong className="text-foreground">Assistant IA :</strong> chatbot pédagogique spécialisé en trading, propulsé par l'API Groq (modèle Llama) — ne fournit pas de conseils financiers</li>
            <li><strong className="text-foreground">Outils complémentaires :</strong> calendrier économique, analyse géopolitique, alertes de prix, palmares, communauté</li>
            <li><strong className="text-foreground">Option Premium :</strong> fonctionnalités avancées (limites étendues, outils Pro) en échange d'un abonnement mensuel</li>
          </ul>
          <InfoBox variant="info">
            L'ensemble de ces fonctionnalités est fourni <strong>exclusivement à des fins d'apprentissage et de simulation</strong>. Aucune opération sur des marchés financiers réels n'est possible via CaptenTDB.
          </InfoBox>
        </section>

        {/* 3. Accès */}
        <section id="acces" className="glass-card p-6 space-y-3 scroll-mt-6">
          <LegalSectionTitle num="3" id="acces-title" title="Conditions d'accès & inscription" />
          <div className="space-y-3 text-muted-foreground">
            <p><strong className="text-foreground">3.1 Âge minimum.</strong> L'accès au Service est strictement réservé aux personnes physiques âgées d'au moins <strong className="text-foreground">18 ans</strong>. En créant un compte, l'utilisateur déclare sur l'honneur être majeur. L'Éditeur se réserve le droit de supprimer tout compte dont l'utilisateur serait mineur.</p>
            <p><strong className="text-foreground">3.2 Inscription.</strong> L'accès aux fonctionnalités du Service nécessite la création d'un compte. L'utilisateur s'engage à fournir des informations exactes, complètes et à les maintenir à jour. Un seul compte par personne physique est autorisé.</p>
            <p><strong className="text-foreground">3.3 Identifiants.</strong> L'utilisateur est seul responsable de la confidentialité de son adresse e-mail, de son mot de passe et de l'ensemble des actions effectuées depuis son compte. Toute utilisation non autorisée du compte doit être immédiatement signalée à l'Éditeur.</p>
            <p><strong className="text-foreground">3.4 Vérification e-mail.</strong> Un lien de vérification est envoyé à l'adresse e-mail fournie. L'activation du compte requiert la validation de ce lien dans les 24 heures.</p>
          </div>
        </section>

        {/* 4. Disclaimer financier */}
        <section id="disclaimer" className="glass-card p-6 space-y-3 scroll-mt-6">
          <LegalSectionTitle num="4" id="disclaimer-title" title="Avertissement financier (AMF / MIF 2)" />
          <div className="space-y-3 text-muted-foreground">
            <p>
              <strong className="text-foreground">4.1 Pas de conseil en investissement.</strong> Les informations, analyses, signaux, données de marchés et réponses de l'assistant IA fournis par CaptenTDB sont exclusivement à titre informatif et éducatif. Ils ne constituent en aucun cas des conseils en investissement, des recommandations personnalisées d'achat ou de vente de valeurs mobilières, des services d'investissement ou des services auxiliaires au sens de la Directive 2014/65/UE (MIF 2) et des articles L.321-1 et suivants du code monétaire et financier.
            </p>
            <p>
              <strong className="text-foreground">4.2 Absence d'agrément.</strong> CaptenTDB n'est ni agréé ni enregistré auprès de l'Autorité des Marchés Financiers (AMF), de l'Autorité de Contrôle Prudentiel et de Résolution (ACPR) ou de tout autre régulateur financier européen. L'Éditeur n'est pas un prestataire de services d'investissement (PSI) au sens réglementaire.
            </p>
            <p>
              <strong className="text-foreground">4.3 Risque financier.</strong> Le trading et l'investissement sur les marchés financiers réels comportent un risque substantiel de perte partielle ou totale du capital investi. Les performances réalisées en paper trading sur CaptenTDB ne préjugent en aucun cas de résultats équivalents sur les marchés réels.
            </p>
            <p>
              <strong className="text-foreground">4.4 Responsabilité de l'utilisateur.</strong> L'utilisateur reste seul responsable de ses décisions d'investissement sur les marchés réels. L'Éditeur ne saurait être tenu responsable des pertes financières résultant de décisions prises sur la base des informations disponibles sur CaptenTDB.
            </p>
            <p>
              <strong className="text-foreground">4.5 Exactitude des données.</strong> Les données de marchés sont issues de fournisseurs tiers (Yahoo Finance, etc.) et peuvent comporter des délais ou des inexactitudes. CaptenTDB ne garantit pas leur exactitude, leur exhaustivité ou leur disponibilité en temps réel.
            </p>
          </div>
        </section>

        {/* 5. Obligations */}
        <section id="obligations" className="glass-card p-6 space-y-3 scroll-mt-6">
          <LegalSectionTitle num="5" id="obligations-title" title="Obligations de l'utilisateur" />
          <p className="text-muted-foreground">L'utilisateur s'engage à utiliser le Service de manière loyale, licite et conformément à sa destination éducative. À ce titre, il s'interdit notamment de :</p>
          <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
            <li>Utiliser le Service à des fins commerciales, de démarchage ou de publicité sans autorisation préalable écrite</li>
            <li>Partager de fausses informations, des analyses trompeuses ou tout contenu susceptible d'induire d'autres utilisateurs en erreur sur les marchés financiers</li>
            <li>Tenter d'accéder de manière non autorisée aux systèmes informatiques de CaptenTDB (attaques, injections, scraping abusif, etc.)</li>
            <li>Harceler, menacer ou tenir des propos discriminatoires, haineux, violents ou à caractère sexuel envers d'autres utilisateurs</li>
            <li>Créer plusieurs comptes pour contourner des restrictions (suspension, limite quotidienne, etc.)</li>
            <li>Reproduire, copier, vendre ou exploiter tout ou partie du Service sans autorisation</li>
            <li>Publier des contenus illicites (contrefaçon, données personnelles de tiers, etc.)</li>
            <li>Utiliser des bots ou scripts automatisés de manière abusive</li>
          </ul>
          <p className="text-muted-foreground">
            Tout manquement aux présentes obligations peut entraîner la suspension ou la suppression définitive du compte, sans préavis ni indemnité.
          </p>
        </section>

        {/* 6. Compte */}
        <section id="compte" className="glass-card p-6 space-y-3 scroll-mt-6">
          <LegalSectionTitle num="6" id="compte-title" title="Compte utilisateur — suspension & suppression" />
          <div className="space-y-3 text-muted-foreground">
            <p>
              <strong className="text-foreground">6.1 Suspension.</strong> L'Éditeur se réserve le droit de suspendre temporairement ou définitivement tout compte en cas de violation des présentes CGU, de comportement frauduleux, d'atteinte au bon fonctionnement du Service ou d'atteinte aux droits de tiers, sans préavis et sans indemnité.
            </p>
            <p>
              <strong className="text-foreground">6.2 Inactivité.</strong> Les comptes n'ayant enregistré aucune connexion pendant une période supérieure à <strong className="text-foreground">12 mois consécutifs</strong> pourront être désactivés après notification par e-mail à 30 jours.
            </p>
            <p>
              <strong className="text-foreground">6.3 Suppression à l'initiative de l'utilisateur.</strong> L'utilisateur peut supprimer son compte à tout moment depuis la page Paramètres. Cette suppression est irréversible et entraîne l'effacement définitif de toutes ses données dans un délai de 30 jours, sous réserve des obligations légales de conservation (données de facturation, etc.).
            </p>
          </div>
        </section>

        {/* 7. Premium */}
        <section id="premium" className="glass-card p-6 space-y-3 scroll-mt-6">
          <LegalSectionTitle num="7" id="premium-title" title="Abonnement Premium" />
          {/* Les articles 7 et 8 décrivent un abonnement et un droit de
              rétractation. Tant qu'aucune offre n'est ouverte, ils décrivent
              une situation qui n'existe pas — on le dit ici plutôt que de les
              retirer, parce qu'ils s'appliqueront tels quels le jour venu. */}
          {!OFFRE_PAYANTE_OUVERTE && (
            <InfoBox variant="warning">
              Aucun abonnement payant n'est ouvert à ce jour : le service est entièrement gratuit
              et aucun paiement n'est perçu. Le présent article et le suivant ne s'appliqueront
              qu'à compter de l'ouverture effective d'une offre payante.
            </InfoBox>
          )}
          {/* UNE SEULE SOURCE POUR LA VENTE : LES CGV. Ces deux articles
              doublaient les CGV — et les contredisaient (résiliation « via le
              support », rétractation avec renonciation à cocher). Ils
              renvoient désormais aux CGV, qui suivent le parcours réel. */}
          <p className="text-muted-foreground">
            L&apos;abonnement Premium, payant, relève les limites d&apos;usage du compte gratuit. Sa souscription,
            son prix, son paiement, sa résiliation (en trois clics depuis la page Premium) et le droit de
            rétractation sont régis par les{" "}
            <Link href="/cgv" className="text-primary hover:underline">conditions générales de vente</Link>, qui
            prévalent sur les présentes CGU pour tout ce qui concerne l&apos;abonnement.
          </p>
        </section>

        {/* 8. Rétractation */}
        <section id="retractation" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="8" id="retractation-title" title="Droit de rétractation" />
          <p className="text-muted-foreground">
            Le Client dispose de 14 jours à compter de la souscription pour se rétracter, remboursé en entier :
            voir l&apos;<Link href="/cgv#retractation" className="text-primary hover:underline">article 6 des CGV</Link>,
            qui précise les modalités et contient le modèle de formulaire.
          </p>
        </section>

        {/* 9. PI */}
        <section id="pi" className="glass-card p-6 space-y-3 scroll-mt-6">
          <LegalSectionTitle num="9" id="pi-title" title="Propriété intellectuelle" />
          <div className="space-y-3 text-muted-foreground">
            <p>
              <strong className="text-foreground">9.1 Droits de l'Éditeur.</strong> L'ensemble des éléments du Service — interface graphique, code source, logique applicative, textes, bases de données, marques et logos — sont protégés par le droit de la propriété intellectuelle et sont la propriété exclusive de CaptenQwark. Toute reproduction ou utilisation non autorisée est constitutive de contrefaçon (art. L.335-2 CPI).
            </p>
            <p>
              <strong className="text-foreground">9.2 Droits de l'utilisateur.</strong> L'utilisateur conserve la propriété des contenus qu'il publie sur la plateforme (messages communauté, etc.). En publiant ces contenus, il accorde à l'Éditeur une licence non exclusive, mondiale, gratuite et pour la durée de protection légale, nécessaire à leur affichage et distribution dans le cadre du Service.
            </p>
            <p>
              <strong className="text-foreground">9.3 Données de marchés.</strong> Les données financières sont issues de fournisseurs tiers (Yahoo Finance, etc.) soumis à leurs propres droits. L'utilisateur ne peut extraire ou réutiliser ces données hors du cadre du Service.
            </p>
          </div>
        </section>

        {/* 10. Responsabilité */}
        <section id="responsabilite" className="glass-card p-6 space-y-3 scroll-mt-6">
          <LegalSectionTitle num="10" id="responsabilite-title" title="Responsabilité & garanties" />
          <div className="space-y-3 text-muted-foreground">
            <p>
              <strong className="text-foreground">10.1 Absence de garantie.</strong> Le Service est fourni « en l'état » (as is), sans garantie d'aucune sorte, expresse ou implicite, notamment quant à l'exactitude des données, la continuité du service ou l'adéquation à un usage particulier.
            </p>
            <p>
              <strong className="text-foreground">10.2 Limitation de responsabilité.</strong> Dans toute la mesure permise par la loi applicable, la responsabilité de l'Éditeur ne pourra être engagée pour : les décisions d'investissement de l'utilisateur sur les marchés réels ; les erreurs ou biais dans les réponses de l'assistant IA ; les inexactitudes dans les données de marchés tierces ; les interruptions de service liées à l'infrastructure d'hébergement ou aux API tierces.
            </p>
            <p>
              <strong className="text-foreground">10.3 Responsabilité de l'utilisateur.</strong> L'utilisateur est seul responsable de l'utilisation qu'il fait du Service et des informations qu'il y publie. Il garantit l'Éditeur contre tout recours de tiers résultant de son utilisation du Service.
            </p>
          </div>
        </section>

        {/* 11. Disponibilité */}
        <section id="disponibilite" className="glass-card p-6 space-y-3 scroll-mt-6">
          <LegalSectionTitle num="11" id="disponibilite-title" title="Disponibilité du service" />
          <p className="text-muted-foreground">
            L'Éditeur s'efforce de maintenir le Service accessible 24h/24 et 7j/7, sans toutefois s'engager sur un niveau de disponibilité garanti (SLA). Des interruptions peuvent survenir pour raisons de maintenance, mises à jour, incidents techniques ou cas de force majeure. L'Éditeur informera les utilisateurs des maintenances planifiées dans la mesure du possible via les notifications de la plateforme.
          </p>
          <p className="text-muted-foreground">
            L'Éditeur se réserve le droit de modifier, suspendre ou interrompre définitivement tout ou partie du Service, à tout moment et sans engagement de continuité, sous réserve d'un préavis raisonnable pour les abonnés Premium.
          </p>
        </section>

        {/* 12. Données personnelles */}
        <section id="donnees" className="glass-card p-6 space-y-3 scroll-mt-6">
          <LegalSectionTitle num="12" id="donnees-title" title="Données personnelles" />
          <p className="text-muted-foreground">
            Le traitement de vos données personnelles dans le cadre du Service est décrit en détail dans notre{" "}
            <Link href="/politique-de-confidentialite" className="text-primary hover:underline font-medium">
              Politique de confidentialité
            </Link>
            , conforme au Règlement (UE) 2016/679 (RGPD) et à la loi Informatique et Libertés n°78-17 du 6 janvier 1978.
          </p>
        </section>

        {/* 13. Force majeure */}
        <section id="force-majeure" className="glass-card p-6 space-y-3 scroll-mt-6">
          <LegalSectionTitle num="13" id="force-majeure-title" title="Force majeure" />
          <p className="text-muted-foreground">
            L'Éditeur ne pourra être tenu responsable de l'inexécution de tout ou partie de ses obligations au titre des présentes CGU lorsque cette inexécution résulte d'un événement constitutif de force majeure au sens de l'article 1218 du code civil, notamment : catastrophes naturelles, pannes d'infrastructures internet, défaillances des fournisseurs de services tiers (hébergeur, fournisseurs de données, API IA), cyberattaques d'envergure ou actes gouvernementaux.
          </p>
          <p className="text-muted-foreground">
            L'Éditeur informera l'utilisateur dans les meilleurs délais et s'efforcera de rétablir le Service dès que possible.
          </p>
        </section>

        {/* 14. Dispositions générales */}
        <section id="dispositions" className="glass-card p-6 space-y-3 scroll-mt-6">
          <LegalSectionTitle num="14" id="dispositions-title" title="Dispositions générales" />
          <div className="space-y-3 text-muted-foreground">
            <p>
              <strong className="text-foreground">14.1 Divisibilité (Severability).</strong> Si l'une quelconque des stipulations des présentes CGU est déclarée nulle ou sans effet par une juridiction compétente, les autres stipulations demeureront en vigueur et de plein effet.
            </p>
            <p>
              <strong className="text-foreground">14.2 Absence de renonciation.</strong> Le fait pour l'Éditeur de ne pas se prévaloir d'un manquement de l'utilisateur à l'une quelconque des obligations visées par les présentes CGU ne saurait être interprété comme une renonciation à s'en prévaloir à l'avenir.
            </p>
            <p>
              <strong className="text-foreground">14.3 Intégralité de l'accord.</strong> Les présentes CGU, la Politique de confidentialité et les Mentions légales constituent l'intégralité de l'accord entre l'Éditeur et l'utilisateur et remplacent tout accord antérieur.
            </p>
            <p>
              <strong className="text-foreground">14.4 Cession.</strong> L'utilisateur ne peut céder tout ou partie de ses droits ou obligations au titre des présentes CGU à un tiers sans l'accord préalable et écrit de l'Éditeur.
            </p>
          </div>
        </section>

        {/* 15. Modifications */}
        <section id="modifications" className="glass-card p-6 space-y-3 scroll-mt-6">
          <LegalSectionTitle num="15" id="modifications-title" title="Modifications des CGU" />
          <p className="text-muted-foreground">
            L'Éditeur se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de toute modification substantielle par notification sur la plateforme au moins <strong className="text-foreground">15 jours</strong> avant l'entrée en vigueur des nouvelles conditions. La poursuite de l'utilisation du Service après ce délai vaut acceptation des nouvelles CGU.
          </p>
          <p className="text-muted-foreground">
            En cas de refus des nouvelles conditions, l'utilisateur peut supprimer son compte avant la date d'entrée en vigueur.
          </p>
        </section>

        {/* 16. Droit applicable */}
        <section id="droit" className="glass-card p-6 space-y-3 scroll-mt-6">
          <LegalSectionTitle num="16" id="droit-title" title="Droit applicable & résolution des litiges" />
          <div className="space-y-3 text-muted-foreground">
            <p>
              <strong className="text-foreground">16.1 Droit applicable.</strong> Les présentes CGU sont soumises au droit français. Elles sont rédigées en langue française. En cas de traduction, la version française fait foi.
            </p>
            <p>
              <strong className="text-foreground">16.2 Résolution amiable.</strong> En cas de litige entre l'utilisateur et l'Éditeur, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire, en contactant l'Éditeur via la plateforme.
            </p>
            <p>
              <strong className="text-foreground">16.3 Médiation de la consommation.</strong> Le consommateur abonné peut recourir gratuitement à un médiateur de la consommation (art. L.611-1 et suivants du code de la consommation){e.mediateur.nom ? ` : ${e.mediateur.nom}${e.mediateur.site ? ` (${e.mediateur.site.replace(/^https?:\/\//, "")})` : ""}.` : " ; ses coordonnées figurent dans les CGV."}
            </p>
            <p>
              <strong className="text-foreground">16.4 Juridiction compétente.</strong> À défaut de résolution amiable ou par médiation, tout litige relatif à la validité, l'interprétation ou l'exécution des présentes CGU sera soumis aux juridictions françaises compétentes, sous réserve des règles impératives de protection des consommateurs applicable dans le pays de résidence de l'utilisateur au sein de l'Union européenne.
            </p>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-white/10">
            <span>Version 1.1 — Dernière mise à jour : mai 2026</span>
            <a href="#" className="hover:text-primary transition-colors">↑ Haut de page</a>
          </div>
        </section>

      </div>

      {/* Footer navigation */}
      <div className="flex flex-wrap gap-4 justify-center text-xs text-muted-foreground pt-4 border-t border-white/10">
        <Link href="/mentions-legales" className="hover:text-primary hover:underline">Mentions légales</Link>
        <span>·</span>
        <Link href="/politique-de-confidentialite" className="hover:text-primary hover:underline">Politique de confidentialité</Link>
        <span>·</span>
        <Link href="/" className="hover:text-primary hover:underline">Retour à l'accueil</Link>
      </div>
    </div>
  );
}
