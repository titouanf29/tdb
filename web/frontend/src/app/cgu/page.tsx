import Link from "next/link";
import { FileText, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Conditions Générales d'Utilisation - CaptenTDB",
};

export default function CguPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
          <FileText className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Conditions Générales d'Utilisation</h1>
        <p className="text-muted-foreground text-sm">Veuillez lire attentivement ces conditions avant d'utiliser CaptenTDB.</p>
      </div>

      {/* AMF Warning Banner */}
      <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-yellow-400 font-semibold mb-1">Avertissement important</p>
          <p className="text-yellow-400/80">
            CaptenTDB est une <strong>plateforme éducative de paper trading uniquement</strong>. Aucune des informations, analyses ou signaux fournis ne constituent des conseils en investissement au sens de la Directive MIF 2. CaptenTDB n'est pas enregistré auprès de l'AMF (Autorité des Marchés Financiers). Le trading et l'investissement sur les marchés réels comportent un risque de perte en capital.
          </p>
        </div>
      </div>

      <div className="space-y-6 text-sm leading-relaxed">

        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">1. Objet et acceptation</h2>
          <p className="text-muted-foreground">
            Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme CaptenTDB accessible à l'adresse captentdb.com (et ses sous-domaines), éditée par CaptenQwark.
          </p>
          <p className="text-muted-foreground">
            L'utilisation du service implique l'acceptation pleine et entière des présentes CGU. Si vous n'acceptez pas ces conditions, vous devez cesser d'utiliser le service.
          </p>
        </section>

        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">2. Description du service</h2>
          <p className="text-muted-foreground">CaptenTDB est une plateforme en ligne proposant :</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Des outils d'<strong className="text-foreground">analyse technique et fondamentale</strong> à titre éducatif</li>
            <li>Un <strong className="text-foreground">portefeuille virtuel de paper trading</strong> avec argent fictif ($10 000 virtuels à l'inscription)</li>
            <li>Un <strong className="text-foreground">assistant IA</strong> spécialisé en trading pédagogique (propulsé par Groq/Llama)</li>
            <li>Un <strong className="text-foreground">scanner de marchés</strong> et des outils d'analyse (calendrier économique, backtesting, etc.)</li>
            <li>Une <strong className="text-foreground">communauté</strong> pour partager et apprendre</li>
          </ul>
          <p className="text-muted-foreground">
            Toutes ces fonctionnalités sont proposées <strong className="text-foreground">à des fins éducatives et pédagogiques exclusivement</strong>.
          </p>
        </section>

        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">3. Conditions d'accès</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>L'accès au service est réservé aux personnes physiques âgées d'au moins <strong className="text-foreground">18 ans</strong>.</li>
            <li>L'inscription est gratuite. Un compte par personne est autorisé.</li>
            <li>L'utilisateur s'engage à fournir des informations exactes lors de l'inscription.</li>
            <li>L'utilisateur est responsable de la confidentialité de ses identifiants de connexion.</li>
          </ul>
        </section>

        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">4. Disclaimer financier (essentiel)</h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              <strong className="text-foreground">4.1 Pas de conseil en investissement.</strong> Les informations, analyses, signaux et outils fournis par CaptenTDB (y compris l'assistant IA) sont fournis à titre informatif et éducatif uniquement. Ils ne constituent pas des conseils en investissement, des recommandations d'achat ou de vente de valeurs mobilières, ni des conseils fiscaux ou juridiques.
            </p>
            <p>
              <strong className="text-foreground">4.2 Risque de perte en capital.</strong> Le trading sur les marchés financiers réels comporte un risque substantiel de perte en capital. Les performances passées ne préjugent pas des performances futures. L'utilisateur est seul responsable de ses décisions d'investissement sur les marchés réels.
            </p>
            <p>
              <strong className="text-foreground">4.3 Paper trading uniquement.</strong> Le portefeuille virtuel utilise de l'argent fictif. Les résultats obtenus en paper trading ne garantissent pas des résultats équivalents sur les marchés réels.
            </p>
            <p>
              <strong className="text-foreground">4.4 Exactitude des données.</strong> CaptenTDB s'efforce de fournir des données de marchés exactes via des sources tierces (Yahoo Finance, etc.), mais ne garantit pas l'exactitude, l'exhaustivité ou la disponibilité en temps réel de ces données.
            </p>
          </div>
        </section>

        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">5. Obligations de l'utilisateur</h2>
          <p className="text-muted-foreground">L'utilisateur s'engage à :</p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>Utiliser le service dans le respect des lois et réglementations en vigueur</li>
            <li>Ne pas tenter de contourner les mesures de sécurité du site</li>
            <li>Ne pas partager de fausses informations susceptibles d'induire d'autres utilisateurs en erreur</li>
            <li>Ne pas utiliser le service à des fins commerciales, publicitaires ou de démarchage sans autorisation</li>
            <li>Respecter les autres membres de la communauté (pas de harcèlement, propos haineux ou discriminatoires)</li>
            <li>Ne pas tenter de manipuler les classements ou les données de la plateforme</li>
            <li>Signaler tout contenu problématique aux administrateurs</li>
          </ul>
        </section>

        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">6. Abonnement Premium</h2>
          <p className="text-muted-foreground">
            <strong className="text-foreground">6.1 Offre Premium.</strong> Un abonnement Premium est proposé au tarif de <strong className="text-foreground">5€ / mois</strong>. Cet abonnement finance les coûts de serveur, de base de données et d'API nécessaires au fonctionnement de la plateforme.
          </p>
          <p className="text-muted-foreground">
            <strong className="text-foreground">6.2 Paiement.</strong> Les paiements sont traités de manière sécurisée par Stripe. CaptenTDB ne stocke pas vos données bancaires.
          </p>
          <p className="text-muted-foreground">
            <strong className="text-foreground">6.3 Résiliation.</strong> L'abonnement Premium peut être résilié à tout moment. La résiliation prend effet à la fin de la période de facturation en cours. Aucun remboursement partiel n'est prévu sauf disposition légale contraire.
          </p>
          <p className="text-muted-foreground">
            <strong className="text-foreground">6.4 Disponibilité.</strong> L'accès aux fonctionnalités Premium est conditionné au bon fonctionnement du service. En cas d'interruption prolongée imputable à CaptenTDB, un remboursement au prorata pourra être envisagé.
          </p>
        </section>

        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">7. Propriété intellectuelle</h2>
          <p className="text-muted-foreground">
            L'ensemble du contenu de CaptenTDB (interface, code, textes, logotypes) est protégé par le droit de la propriété intellectuelle et est la propriété exclusive de CaptenQwark. Toute reproduction ou utilisation sans autorisation préalable et écrite est interdite.
          </p>
          <p className="text-muted-foreground">
            En publiant du contenu sur la plateforme (messages communauté, etc.), l'utilisateur accorde à CaptenTDB une licence non exclusive d'utilisation dans le cadre du service.
          </p>
        </section>

        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">8. Responsabilité et disponibilité</h2>
          <p className="text-muted-foreground">
            <strong className="text-foreground">8.1</strong> CaptenTDB est fourni « en l'état » sans garantie de disponibilité continue. L'éditeur ne peut être tenu responsable d'interruptions de service liées à des maintenances, incidents techniques ou force majeure.
          </p>
          <p className="text-muted-foreground">
            <strong className="text-foreground">8.2</strong> CaptenTDB décline toute responsabilité pour les pertes financières résultant de décisions d'investissement prises par l'utilisateur, même partiellement fondées sur des informations obtenues via la plateforme.
          </p>
          <p className="text-muted-foreground">
            <strong className="text-foreground">8.3</strong> CaptenTDB n'est pas responsable des contenus publiés par les utilisateurs dans la section communauté.
          </p>
        </section>

        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">9. Suspension et résiliation de compte</h2>
          <p className="text-muted-foreground">
            CaptenTDB se réserve le droit de suspendre ou supprimer tout compte en cas de :
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Violation des présentes CGU</li>
            <li>Comportement abusif envers d'autres utilisateurs</li>
            <li>Tentative de manipulation ou d'attaque du système</li>
            <li>Inactivité prolongée (plus de 12 mois sans connexion)</li>
          </ul>
          <p className="text-muted-foreground">
            L'utilisateur peut supprimer son compte à tout moment via la page Paramètres. Cette suppression entraîne l'effacement définitif de toutes ses données dans un délai de 30 jours.
          </p>
        </section>

        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">10. Données personnelles</h2>
          <p className="text-muted-foreground">
            Le traitement de vos données personnelles est décrit dans notre{" "}
            <Link href="/politique-de-confidentialite" className="text-primary hover:underline">
              Politique de confidentialité
            </Link>
            , conforme au RGPD.
          </p>
        </section>

        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">11. Modification des CGU</h2>
          <p className="text-muted-foreground">
            CaptenTDB se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de toute modification substantielle via une notification sur la plateforme. La poursuite de l'utilisation du service après notification vaut acceptation des nouvelles conditions.
          </p>
        </section>

        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">12. Droit applicable et juridiction</h2>
          <p className="text-muted-foreground">
            Les présentes CGU sont soumises au droit français. En cas de litige non résolu à l'amiable, les tribunaux français seront seuls compétents.
          </p>
          <p className="text-muted-foreground text-xs">
            Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </p>
        </section>

      </div>

      {/* Footer links */}
      <div className="flex flex-wrap gap-4 justify-center text-xs text-muted-foreground pt-4 border-t border-white/10">
        <Link href="/mentions-legales" className="hover:text-primary hover:underline">Mentions légales</Link>
        <Link href="/politique-de-confidentialite" className="hover:text-primary hover:underline">Politique de confidentialité</Link>
        <Link href="/" className="hover:text-primary hover:underline">Retour à l'accueil</Link>
      </div>
    </div>
  );
}
