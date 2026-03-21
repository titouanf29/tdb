import { Metadata } from 'next';
import { SectionIntro } from '@/components/section-intro';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: 'Politique de confidentialité et gestion des données personnelles TDB.',
};

export default function ConfidentialitePage() {
  return (
    <main className="container page-stack">
      <SectionIntro
        eyebrow="Légal"
        title="Politique de confidentialité"
        text="Comment TDB collecte, utilise et protège vos données personnelles."
      />

      <section className="panel" style={{ marginTop: '1rem', padding: '2rem', lineHeight: '1.8' }}>

        <h2 style={{ marginBottom: '0.5rem' }}>1. Responsable du traitement</h2>
        <p>
          Le responsable du traitement des données est le projet <strong>TDB – Trading Dashboard Bot</strong>.<br />
          Contact : <a href={`mailto:${siteConfig.contactEmail}`} style={{ color: 'var(--accent)' }}>
            {siteConfig.contactEmail}
          </a>
        </p>

        <h2 style={{ margin: '1.5rem 0 0.5rem' }}>2. Données collectées</h2>
        <p>Dans le cadre de l'utilisation du service, TDB peut collecter les données suivantes :</p>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>Adresse e-mail et nom d'utilisateur (lors de l'inscription sur le site web)</li>
          <li>Identifiant Telegram (lors de l'utilisation du bot Telegram)</li>
          <li>Données de trading simulé (positions, portefeuille virtuel, historique)</li>
          <li>Données de navigation anonymisées (pages visitées, clics sur les CTA) à des fins d'amélioration du produit</li>
        </ul>

        <h2 style={{ margin: '1.5rem 0 0.5rem' }}>3. Finalités du traitement</h2>
        <p>Les données sont traitées pour :</p>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>Fournir le service d'analyse de marché et de paper trading</li>
          <li>Personnaliser l'expérience utilisateur (préférences, alertes)</li>
          <li>Améliorer les fonctionnalités du bot et du site via des statistiques agrégées</li>
          <li>Envoyer des notifications liées à votre activité (si activées)</li>
        </ul>

        <h2 style={{ margin: '1.5rem 0 0.5rem' }}>4. Base légale</h2>
        <p>
          Le traitement est fondé sur l'<strong>exécution du contrat</strong> (fourniture du service) et le
          <strong> consentement</strong> de l'utilisateur pour les données de navigation et les notifications.
        </p>

        <h2 style={{ margin: '1.5rem 0 0.5rem' }}>5. Durée de conservation</h2>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>Données de compte : conservées pendant la durée d'activité du compte + 1 an après suppression</li>
          <li>Données de trading simulé : conservées pendant la durée d'activité du compte</li>
          <li>Données de navigation : conservées maximum 13 mois</li>
        </ul>

        <h2 style={{ margin: '1.5rem 0 0.5rem' }}>6. Partage des données</h2>
        <p>
          TDB ne vend, ne loue et ne cède aucune donnée personnelle à des tiers.
          Les données peuvent être partagées uniquement avec des sous-traitants techniques nécessaires
          au fonctionnement du service (hébergement, analytics) et liés par des clauses de confidentialité.
        </p>

        <h2 style={{ margin: '1.5rem 0 0.5rem' }}>7. Vos droits (RGPD)</h2>
        <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :</p>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
          <li><strong>Droit de rectification</strong> : corriger des données inexactes</li>
          <li><strong>Droit à l'effacement</strong> : demander la suppression de vos données</li>
          <li><strong>Droit d'opposition</strong> : vous opposer à certains traitements</li>
          <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format lisible</li>
        </ul>
        <p style={{ marginTop: '0.5rem' }}>
          Pour exercer ces droits, contactez-nous à :{' '}
          <a href={`mailto:${siteConfig.contactEmail}`} style={{ color: 'var(--accent)' }}>
            {siteConfig.contactEmail}
          </a>
        </p>

        <h2 style={{ margin: '1.5rem 0 0.5rem' }}>8. Cookies et traceurs</h2>
        <p>
          Le site utilise des traceurs anonymisés (Google Analytics) uniquement à des fins statistiques
          internes. Aucun cookie publicitaire ou de profilage tiers n'est utilisé.
          Vous pouvez désactiver ces traceurs dans les paramètres de votre navigateur.
        </p>

        <h2 style={{ margin: '1.5rem 0 0.5rem' }}>9. Sécurité</h2>
        <p>
          TDB met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos
          données contre tout accès non autorisé, perte ou altération (chiffrement des mots de passe,
          HTTPS, contrôle d'accès).
        </p>

        <h2 style={{ margin: '1.5rem 0 0.5rem' }}>10. Réclamations</h2>
        <p>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation
          auprès de la <strong>CNIL</strong> (Commission Nationale de l'Informatique et des Libertés) :{' '}
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
            www.cnil.fr
          </a>
        </p>

        <p style={{ marginTop: '2rem', opacity: 0.6, fontSize: '0.85rem' }}>
          Dernière mise à jour : mars 2025
        </p>
      </section>
    </main>
  );
}
