import Link from "next/link";
import { Shield, ExternalLink } from "lucide-react";
import { LegalNav, LegalSectionTitle, InfoBox, Dl } from "@/components/legal/LegalNav";

export const metadata = {
  title: "Politique de confidentialité, CaptenTDB",
  description: "Politique de confidentialité de CaptenTDB, conforme au RGPD (Règlement UE 2016/679) et à la loi Informatique et Libertés.",
};

const TOC = [
  { id: "responsable", label: "Responsable du traitement" },
  { id: "donnees", label: "Données collectées" },
  { id: "finalites", label: "Finalités & bases légales" },
  { id: "sous-traitants", label: "Sous-traitants & transferts hors UE" },
  { id: "cookies", label: "Cookies & stockage local" },
  { id: "droits", label: "Vos droits RGPD" },
  { id: "securite", label: "Sécurité" },
  { id: "automatise", label: "Traitement automatisé (IA)" },
  { id: "mineurs", label: "Mineurs" },
  { id: "violations", label: "Violations de données" },
  { id: "modifications", label: "Mises à jour" },
];

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="cap-legal space-y-6">
      <LegalNav current="/politique-de-confidentialite" />

      {/* Header */}
      <div className="glass-card p-8 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold">RGPD Art. 13-22</span>
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold">Loi Informatique & Libertés</span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-muted-foreground text-xs">Version 1.1</span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-muted-foreground text-xs">Mai 2026</span>
            </div>
            <h1 className="text-2xl font-bold">Politique de confidentialité</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Règlement (UE) 2016/679 du 27 avril 2016 (RGPD), Loi n°78-17 du 6 janvier 1978 modifiée
            </p>
          </div>
        </div>
      </div>

      {/* TOC */}
      <div className="glass-card p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sommaire</p>
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

        {/* 1. Responsable */}
        <section id="responsable" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="1" id="responsable-title" title="Responsable du traitement" />
          <p className="text-muted-foreground">
            Au sens de l'article 4(7) du RGPD, le responsable du traitement des données à caractère personnel collectées via CaptenTDB est :
          </p>
          <Dl items={[
            { label: "Identité", value: "CaptenQwark (personne physique)" },
            { label: "Qualité", value: "Éditeur du site, projet indépendant non commercial" },
            { label: "Pays", value: "France" },
            { label: "Contact RGPD", value: <span>Plateforme → section « Communauté » → « Contacter Admin »</span> },
          ]} />
          <InfoBox variant="info">
            <strong>DPO (Délégué à la Protection des Données) :</strong> La désignation d'un DPO n'est pas obligatoire pour une personne physique traitant des données à des fins non commerciales de faible envergure. Aucun DPO n'est formellement désigné pour CaptenTDB. Le responsable du traitement assume directement les obligations du RGPD.
          </InfoBox>
        </section>

        {/* 2. Données collectées */}
        <section id="donnees" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="2" id="donnees-title" title="Données collectées" />
          <p className="text-muted-foreground">Nous collectons uniquement les données strictement nécessaires au fonctionnement du service :</p>

          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-white/5 space-y-2">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-primary/20 text-primary text-xs flex items-center justify-center">A</span>
                Données d'identification (obligatoires à l'inscription)
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Adresse e-mail (identifiant unique, vérifiée par confirmation)</li>
                <li>Nom d'utilisateur / pseudonyme</li>
                <li>Prénom et nom de famille <em>(facultatifs)</em></li>
                <li>Mot de passe, stocké exclusivement sous forme hachée (bcrypt), jamais en clair</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-white/5 space-y-2">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-green-500/20 text-xs flex items-center justify-center" style={{ color: "var(--cap-up)" }}>B</span>
                Données générées par l'utilisation du service
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Historique des ordres et positions de paper trading (achats/ventes virtuels)</li>
                <li>Portefeuille virtuel (solde en argent fictif)</li>
                <li>Listes de favoris (symboles boursiers sauvegardés)</li>
                <li>Historique des conversations avec l'assistant IA</li>
                <li>Alertes de prix configurées</li>
                <li>Préférences et paramètres d'affichage</li>
                <li>Messages publiés dans la section Communauté</li>
                <li>Messages échangés dans les tickets de support</li>
                <li>Notifications reçues (réponses support)</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-white/5 space-y-2">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-neon-purple/20 text-neon-purple text-xs flex items-center justify-center">C</span>
                Données techniques de connexion
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Date et heure de la dernière connexion</li>
                <li>Statut du compte (actif, vérifié)</li>
                <li>Données d'abonnement Premium le cas échéant (identifiant client Stripe anonymisé, dates)</li>
              </ul>
            </div>
          </div>

          <InfoBox variant="success">
            CaptenTDB ne collecte pas votre adresse IP, votre navigateur ou votre localisation à des fins de profilage. Aucun outil d'analytics ou de tracking comportemental n'est utilisé.
          </InfoBox>
        </section>

        {/* 3. Finalités */}
        <section id="finalites" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="3" id="finalites-title" title="Finalités du traitement & bases légales" />
          <InfoBox variant="success">
            <strong className="text-foreground">Votre adresse e-mail ne sert qu'à votre compte.</strong> Nous vous écrivons seulement pour confirmer l'adresse à l'inscription, vous envoyer un lien si vous oubliez votre mot de passe, et le reçu d'un abonnement Premium. Aucune newsletter, aucune prospection commerciale, aucune publicité : votre adresse n'est jamais vendue ni cédée. Elle passe seulement par notre prestataire d'envoi (Brevo), qui la traite pour notre compte et pour ces seuls messages.
          </InfoBox>
          <p className="text-muted-foreground">Conformément à l'article 6 du RGPD, chaque traitement repose sur une base légale identifiée :</p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-xs min-w-[500px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left p-3 text-foreground font-semibold">Finalité</th>
                  <th className="text-left p-3 text-foreground font-semibold">Base légale (Art. 6 RGPD)</th>
                  <th className="text-left p-3 text-foreground font-semibold">Durée de conservation</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground divide-y divide-white/5">
                {[
                  ["Création et gestion du compte utilisateur", "Exécution du contrat (§1.b)", "Durée de vie du compte + 30 jours après suppression"],
                  ["Fourniture des fonctionnalités (paper trading, favoris, alertes)", "Exécution du contrat (§1.b)", "Durée de vie du compte"],
                  ["Historique des conversations IA", "Exécution du contrat (§1.b)", "90 jours glissants (purge automatique)"],
                  ["Vérification de l'adresse e-mail", "Exécution du contrat (§1.b)", "Token : 24h, E-mail : durée du compte"],
                  ["Gestion de l'abonnement Premium & facturation", "Exécution du contrat (§1.b)", "Durée de l'abonnement + 10 ans (obligations comptables)"],
                  ["Sécurité, détection des abus et de la fraude", "Intérêt légitime (§1.f)", "1 an"],
                  ["Envoi de notifications de la plateforme", "Consentement ou intérêt légitime (§1.f)", "Durée du compte"],
                  ["Amélioration du service (données agrégées, anonymisées)", "Intérêt légitime (§1.f)", "Données anonymisées : indéfiniment"],
                  ["Gestion des tickets de support utilisateur", "Exécution du contrat (§1.b)", "Durée du compte + 1 an après fermeture du ticket"],
                  ["Notifications utilisateur (réponses tickets)", "Intérêt légitime (§1.f)", "90 jours ou jusqu'à lecture"],
                ].map(([f, b, d]) => (
                  <tr key={f}>
                    <td className="p-3">{f}</td>
                    <td className="p-3 text-primary">{b}</td>
                    <td className="p-3">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. Sous-traitants & transferts */}
        <section id="sous-traitants" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="4" id="sous-traitants-title" title="Sous-traitants & transferts hors UE" />
          <p className="text-muted-foreground font-semibold text-foreground">Nous ne vendons, ne louons et ne cédons jamais vos données personnelles à des tiers à des fins commerciales.</p>
          <p className="text-muted-foreground">Vos données peuvent être transmises aux seuls sous-traitants techniques listés ci-dessous, dans le cadre strict de la fourniture du service :</p>

          <div className="space-y-3">
            {[
              {
                name: "Railway Corp.",
                role: "Hébergement serveurs & base de données",
                country: "États-Unis 🇺🇸",
                data: "Toutes les données utilisateur (stockées dans la base de données)",
                guarantee: "Standard Contractual Clauses (SCC/CCT) UE-USA, Data Processing Agreement",
              },
              {
                name: "Groq, Inc.",
                role: "Moteur IA de l'assistant et de l'aide de Nimbo (API Llama), quand le site est configuré sur Groq",
                country: "États-Unis 🇺🇸",
                data: "Contenu de vos messages envoyés à l'assistant IA (transmis à l'API pour générer une réponse, non conservés par Groq selon leur politique)",
                guarantee: "Standard Contractual Clauses (SCC/CCT), Privacy Policy Groq",
              },
              {
                name: "Mistral AI SAS",
                role: "Moteur IA de l'assistant et de l'aide de Nimbo, quand le site est configuré sur Mistral (un seul des deux fournisseurs est utilisé)",
                country: "France 🇫🇷",
                data: "Contenu de vos messages envoyés à l'assistant ou à Nimbo, transmis à l'API pour générer une réponse",
                guarantee: "Société de droit français, données traitées dans l'Union européenne, Mistral AI Privacy Policy",
              },
              {
                name: "Stripe, Inc.",
                role: "Traitement des paiements Premium",
                country: "États-Unis 🇺🇸",
                data: "E-mail, identifiant client Stripe, Les données bancaires sont traitées directement par Stripe, jamais par CaptenTDB",
                guarantee: "Certifié PCI-DSS Level 1, SCC UE-USA, Stripe Privacy Policy",
              },
              {
                name: "TradingView, Inc.",
                role: "Graphique « Complet » de la page Analyse, seulement si vous choisissez de le charger",
                country: "États-Unis 🇺🇸",
                data: "Adresse IP et symbole consulté, transmis à TradingView au chargement de son graphique. Rien n'est transmis tant que vous n'avez pas cliqué sur « Charger le graphique TradingView » ; le graphique « Commenté » ne sort pas du site",
                guarantee: "Cadre isolé (sandbox), sans accès aux données du site ; chargement sur votre demande, retenu dans votre navigateur ; TradingView Privacy Policy",
              },
              {
                name: "Brevo (Sendinblue SAS)",
                role: "Envoi des e-mails du compte (confirmation de l'adresse, mot de passe oublié, reçu Premium)",
                country: "France 🇫🇷",
                data: "Adresse e-mail, pseudo, et le contenu de ces seuls messages. Aucune liste de diffusion, aucune newsletter",
                guarantee: "Société de droit français, données hébergées dans l'Union européenne, accord de sous-traitance (DPA) Brevo",
              },
            ].map(({ name, role, country, data, guarantee }) => (
              <div key={name} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{name}</span>
                  <span className="text-xs text-muted-foreground">{country}</span>
                </div>
                <p className="text-xs text-muted-foreground"><span className="text-foreground">Rôle :</span> {role}</p>
                <p className="text-xs text-muted-foreground"><span className="text-foreground">Données transmises :</span> {data}</p>
                <p className="text-xs text-muted-foreground"><span className="text-foreground">Garantie RGPD :</span> {guarantee}</p>
              </div>
            ))}
          </div>

          <InfoBox variant="info">
            <strong>Transferts hors UE (Art. 46 RGPD) :</strong> Railway, Groq, Stripe et TradingView sont établis aux États-Unis. Ces transferts sont encadrés par les Clauses Contractuelles Types (CCT) adoptées par la Commission européenne, conformément à l'article 46§2.c du RGPD.
          </InfoBox>
        </section>

        {/* 5. Cookies */}
        <section id="cookies" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="5" id="cookies-title" title="Cookies & stockage local" />
          <p className="text-muted-foreground">
            CaptenTDB dépose un seul cookie, celui qui garde votre session ouverte. Le reste (vos préférences d'affichage, ce que vous avez déjà vu) est gardé dans le <strong className="text-foreground">stockage local</strong> de votre navigateur et ne quitte pas votre appareil.
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-xs min-w-[400px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left p-3 text-foreground font-semibold">Nom / Clé</th>
                  <th className="text-left p-3 text-foreground font-semibold">Contenu</th>
                  <th className="text-left p-3 text-foreground font-semibold">Durée</th>
                  <th className="text-left p-3 text-foreground font-semibold">Nécessaire</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground divide-y divide-white/5">
                <tr>
                  <td className="p-3 font-mono">tdb_sess (cookie)</td>
                  <td className="p-3">Votre session de connexion. Illisible par les scripts de la page (httpOnly), jamais envoyé à un autre site (SameSite=Lax), seulement en HTTPS.</td>
                  <td className="p-3">1 heure, ou 30 jours avec « rester connecté »</td>
                  <td className="p-3" style={{ color: "var(--cap-up)" }}>✓ Oui</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono">auth_token</td>
                  <td className="p-3">Token JWT d'authentification (signé, non chiffré)</td>
                  <td className="p-3">Jusqu'à déconnexion</td>
                  <td className="p-3" style={{ color: "var(--cap-up)" }}>✓ Oui</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono">theme / settings</td>
                  <td className="p-3">Préférences d'affichage (thème, langue)</td>
                  <td className="p-3">Persistant</td>
                  <td className="p-3" style={{ color: "var(--cap-up)" }}>✓ Oui</td>
                </tr>
              </tbody>
            </table>
          </div>
          <InfoBox variant="success">
            Aucun cookie publicitaire, aucune mesure d'audience, aucun traceur tiers (Google Analytics, Meta Pixel, Hotjar, etc.) : les polices sont servies par le site lui-même et le paiement se fait sur la page de Stripe. Le cookie de session et le stockage local servent uniquement à faire fonctionner le service que vous demandez ; ils sont exemptés de consentement (article 82 de la loi Informatique et Libertés, lignes directrices de la CNIL du 17 septembre 2020). C'est pourquoi le site n'affiche pas de bandeau cookies.
          </InfoBox>
        </section>

        {/* 6. Droits */}
        <section id="droits" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="6" id="droits-title" title="Vos droits sur vos données (RGPD Art. 15-22)" />
          <p className="text-muted-foreground">Conformément au chapitre III du RGPD, vous bénéficiez des droits suivants :</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { art: "Art. 15", right: "Droit d'accès", desc: "Obtenir confirmation que nous traitons vos données et en recevoir une copie complète." },
              { art: "Art. 16", right: "Droit de rectification", desc: "Corriger des données inexactes ou incomplètes vous concernant." },
              { art: "Art. 17", right: "Droit à l'effacement", desc: "Demander la suppression de vos données (« droit à l'oubli »). Disponible directement via Paramètres → Supprimer mon compte." },
              { art: "Art. 18", right: "Droit à la limitation", desc: "Suspendre le traitement de vos données dans certains cas (contestation, opposition en cours, etc.)." },
              { art: "Art. 20", right: "Droit à la portabilité", desc: "Recevoir vos données dans un format structuré, couramment utilisé et lisible par machine." },
              { art: "Art. 21", right: "Droit d'opposition", desc: "Vous opposer à un traitement fondé sur l'intérêt légitime ou à tout moment pour le marketing." },
            ].map(({ art, right, desc }) => (
              <div key={art} className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-xs font-mono">{art}</span>
                  <span className="font-semibold text-foreground text-sm">{right}</span>
                </div>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <p className="font-semibold text-foreground text-sm">Comment exercer vos droits ?</p>
            <p className="text-muted-foreground text-xs">
              Envoyez votre demande via la plateforme : section « Communauté » → « Contacter Admin ». Précisez le droit exercé et joignez tout élément permettant de vérifier votre identité. Nous vous répondrons dans un délai maximum de <strong className="text-foreground">30 jours</strong> (délai extensible à 90 jours pour les demandes complexes, avec notification motivée).
            </p>
          </div>

          <InfoBox variant="warning">
            <strong>Droit de réclamation auprès de la CNIL :</strong> Si vous estimez que le traitement de vos données ne respecte pas le RGPD, vous avez le droit d'introduire une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL), <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">cnil.fr <ExternalLink className="w-3 h-3" /></a>, ou de toute autre autorité de contrôle européenne compétente (Art. 77 RGPD).
          </InfoBox>
        </section>

        {/* 7. Sécurité */}
        <section id="securite" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="7" id="securite-title" title="Sécurité des données" />
          <p className="text-muted-foreground">
            Nous mettons en œuvre les mesures techniques et organisationnelles suivantes pour protéger vos données personnelles contre tout accès non autorisé, perte, altération ou divulgation (Art. 32 RGPD) :
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: "Chiffrement des mots de passe", desc: "Algorithme bcrypt avec salt, les mots de passe ne sont jamais stockés en clair et sont non réversibles." },
              { title: "Chiffrement des communications", desc: "Toutes les communications entre votre navigateur et nos serveurs sont chiffrées via HTTPS/TLS 1.3." },
              { title: "Authentification par JWT", desc: "Tokens signés à durée de vie limitée, invalidés à la déconnexion." },
              { title: "Accès restreint", desc: "Accès à la base de données limité au serveur applicatif uniquement (pas d'exposition directe)." },
            ].map(({ title, desc }) => (
              <div key={title} className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="font-semibold text-foreground text-sm mb-1">🔒 {title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 8. Traitement automatisé */}
        <section id="automatise" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="8" id="automatise-title" title="Traitement automatisé & assistant IA" />
          <p className="text-muted-foreground">
            L'assistant IA de CaptenTDB utilise l'API Groq (modèle Llama) pour générer des réponses à vos messages. Ce traitement est soumis aux dispositions de l'article 22 du RGPD relatif aux décisions automatisées.
          </p>
          <InfoBox variant="info">
            <strong>Art. 22 RGPD, Décisions automatisées :</strong> L'assistant IA de CaptenTDB est un outil éducatif et conversationnel. Il ne produit aucune décision automatisée ayant un effet juridique ou significatif sur vous (pas de scoring, pas d'évaluation de solvabilité, pas de décision d'accès au service). Il génère des réponses textuelles à but informatif uniquement. L'article 22 dans son sens restrictif ne s'applique donc pas.
          </InfoBox>
          <p className="text-muted-foreground">
            Le contenu de vos messages est transmis à l'API Groq (Groq Inc., USA) pour traitement. Groq déclare ne pas utiliser les données de l'API pour entraîner ses modèles selon sa politique de confidentialité. Ces données sont couvertes par les garanties mentionnées à l'article 4 (SCC).
          </p>
        </section>

        {/* 9. Mineurs */}
        <section id="mineurs" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="9" id="mineurs-title" title="Personnes mineures" />
          <p className="text-muted-foreground">
            CaptenTDB est strictement réservé aux personnes physiques âgées d'au moins <strong className="text-foreground">18 ans</strong>, en raison de la nature financière du contenu éducatif proposé. Cette limite d'âge est confirmée lors de l'inscription.
          </p>
          <p className="text-muted-foreground">
            Nous ne collectons pas sciemment de données personnelles concernant des mineurs. Si vous êtes parent ou tuteur légal d'un mineur ayant créé un compte sur CaptenTDB, veuillez nous contacter immédiatement afin que nous procédions à la suppression de toutes ses données dans les meilleurs délais.
          </p>
        </section>

        {/* 10. Violations */}
        <section id="violations" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="10" id="violations-title" title="Violations de données personnelles" />
          <p className="text-muted-foreground">
            En cas de violation de données personnelles susceptible d'engendrer un risque pour vos droits et libertés, nous nous engageons à :
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Notifier la CNIL dans un délai de <strong className="text-foreground">72 heures</strong> après en avoir pris connaissance (Art. 33 RGPD)</li>
            <li>Vous en informer dans les meilleurs délais si la violation est susceptible d'engendrer un risque élevé pour vos droits (Art. 34 RGPD)</li>
            <li>Documenter l'incident et les mesures correctives prises</li>
          </ul>
        </section>

        {/* 11. Modifications */}
        <section id="modifications" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="11" id="modifications-title" title="Mises à jour de la politique" />
          <p className="text-muted-foreground">
            La présente politique peut être modifiée pour refléter des évolutions légales, réglementaires ou techniques. En cas de modification substantielle affectant vos droits, vous en serez informé via une notification sur la plateforme au moins 15 jours avant l'entrée en vigueur des nouvelles dispositions.
          </p>
          <p className="text-muted-foreground">
            La date de dernière mise à jour figure en haut de cette page. L'utilisation continue du service après notification vaut acceptation des nouvelles dispositions.
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-white/10">
            <span>Version 1.1, Dernière mise à jour : mai 2026</span>
            <a href="#" className="hover:text-primary transition-colors">↑ Haut de page</a>
          </div>
        </section>

      </div>

      {/* Footer navigation */}
      <div className="flex flex-wrap gap-4 justify-center text-xs text-muted-foreground pt-4 border-t border-white/10">
        <Link href="/mentions-legales" className="hover:text-primary hover:underline">Mentions légales</Link>
        <span>·</span>
        <Link href="/cgu" className="hover:text-primary hover:underline">Conditions générales d'utilisation</Link>
        <span>·</span>
        <Link href="/" className="hover:text-primary hover:underline">Retour à l'accueil</Link>
      </div>
    </div>
  );
}
