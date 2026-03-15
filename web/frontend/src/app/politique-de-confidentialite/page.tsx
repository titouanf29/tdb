import Link from "next/link";
import { Shield } from "lucide-react";

export const metadata = {
  title: "Politique de confidentialité - CaptenTDB",
};

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
          <Shield className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Politique de confidentialité</h1>
        <p className="text-muted-foreground text-sm">
          Conformément au Règlement (UE) 2016/679 du 27 avril 2016 (RGPD) et à la loi Informatique et Libertés n°78-17 du 6 janvier 1978
        </p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed">

        {/* Responsable de traitement */}
        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">1. Responsable du traitement</h2>
          <p className="text-muted-foreground">
            Le responsable du traitement des données personnelles collectées sur CaptenTDB est :
          </p>
          <ul className="space-y-1 text-muted-foreground pl-4">
            <li><span className="text-foreground font-medium">Identité :</span> CaptenQwark (projet indépendant)</li>
            <li><span className="text-foreground font-medium">Contact :</span> Via la section « Communauté » → « Contacter Admin »</li>
          </ul>
        </section>

        {/* Données collectées */}
        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">2. Données collectées</h2>
          <p className="text-muted-foreground mb-3">Nous collectons les catégories de données suivantes :</p>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-1">Données d'identification (obligatoires à l'inscription)</h3>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Adresse e-mail</li>
                <li>Nom d'utilisateur (pseudonyme)</li>
                <li>Prénom et nom (facultatifs)</li>
                <li>Mot de passe (stocké sous forme hachée, non lisible)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-1">Données d'utilisation</h3>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Historique des trades virtuels (paper trading)</li>
                <li>Listes de favoris (symboles boursiers)</li>
                <li>Historique des conversations avec l'assistant IA</li>
                <li>Paramètres et préférences de l'interface</li>
                <li>Alertes de prix configurées</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-1">Données techniques</h3>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Token d'authentification JWT (stocké côté client)</li>
                <li>Date et heure de la dernière connexion</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Finalités */}
        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">3. Finalités du traitement</h2>
          <p className="text-muted-foreground mb-2">Vos données sont traitées pour les finalités suivantes :</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-2 text-foreground font-semibold">Finalité</th>
                  <th className="text-left p-2 text-foreground font-semibold">Base légale</th>
                  <th className="text-left p-2 text-foreground font-semibold">Durée de conservation</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-white/5">
                  <td className="p-2">Gestion du compte utilisateur</td>
                  <td className="p-2">Exécution du contrat (CGU)</td>
                  <td className="p-2">Durée du compte + 30 jours</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="p-2">Fonctionnement du paper trading</td>
                  <td className="p-2">Exécution du contrat (CGU)</td>
                  <td className="p-2">Durée du compte</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="p-2">Historique conversations IA</td>
                  <td className="p-2">Exécution du contrat (CGU)</td>
                  <td className="p-2">90 jours glissants</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="p-2">Gestion de l'abonnement Premium</td>
                  <td className="p-2">Exécution du contrat</td>
                  <td className="p-2">Durée de l'abonnement + obligations légales</td>
                </tr>
                <tr>
                  <td className="p-2">Sécurité et lutte contre la fraude</td>
                  <td className="p-2">Intérêt légitime</td>
                  <td className="p-2">1 an</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Partage des données */}
        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">4. Partage des données</h2>
          <p className="text-muted-foreground">
            <strong className="text-foreground">Nous ne vendons pas vos données personnelles à des tiers.</strong>
          </p>
          <p className="text-muted-foreground">
            Vos données peuvent être partagées uniquement avec les sous-traitants techniques strictement nécessaires au fonctionnement du service :
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li><span className="text-foreground font-medium">Railway Corp.</span> — hébergement de l'application et de la base de données</li>
            <li><span className="text-foreground font-medium">Groq Inc.</span> — traitement des messages envoyés à l'assistant IA (vos messages sont transmis à l'API Groq pour générer une réponse)</li>
            <li><span className="text-foreground font-medium">Stripe Inc.</span> — traitement des paiements pour l'abonnement Premium (uniquement si vous souscrivez)</li>
          </ul>
          <p className="text-muted-foreground text-xs">
            Ces sous-traitants sont soumis à des obligations contractuelles de confidentialité.
          </p>
        </section>

        {/* Cookies */}
        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">5. Cookies et traceurs</h2>
          <p className="text-muted-foreground">
            CaptenTDB utilise <strong className="text-foreground">uniquement des cookies techniques strictement nécessaires</strong> :
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li><strong className="text-foreground">Token d'authentification</strong> (localStorage) : maintient votre session de connexion. Durée : jusqu'à déconnexion.</li>
            <li><strong className="text-foreground">Préférences d'affichage</strong> (localStorage) : thème, paramètres interface.</li>
          </ul>
          <p className="text-muted-foreground">
            Aucun cookie publicitaire, aucun cookie de traçage tiers (Google Analytics, Facebook Pixel, etc.) n'est utilisé.
          </p>
        </section>

        {/* Vos droits */}
        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">6. Vos droits (RGPD Art. 15 à 22)</h2>
          <p className="text-muted-foreground mb-2">Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles :</p>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex gap-2"><span className="text-foreground font-medium min-w-[120px]">Droit d'accès</span> Obtenir une copie de vos données (Art. 15)</li>
            <li className="flex gap-2"><span className="text-foreground font-medium min-w-[120px]">Rectification</span> Corriger des données inexactes (Art. 16)</li>
            <li className="flex gap-2"><span className="text-foreground font-medium min-w-[120px]">Effacement</span> Supprimer votre compte et vos données (Art. 17) — via Paramètres → Supprimer mon compte</li>
            <li className="flex gap-2"><span className="text-foreground font-medium min-w-[120px]">Portabilité</span> Exporter vos données dans un format structuré (Art. 20)</li>
            <li className="flex gap-2"><span className="text-foreground font-medium min-w-[120px]">Opposition</span> S'opposer à un traitement fondé sur l'intérêt légitime (Art. 21)</li>
            <li className="flex gap-2"><span className="text-foreground font-medium min-w-[120px]">Limitation</span> Limiter le traitement dans certains cas (Art. 18)</li>
          </ul>
          <p className="text-muted-foreground">
            Pour exercer vos droits, contactez-nous via la section « Communauté » → « Contacter Admin ». Nous répondrons dans un délai maximum de <strong className="text-foreground">30 jours</strong>.
          </p>
          <p className="text-muted-foreground">
            Vous disposez également du droit d'introduire une réclamation auprès de la{" "}
            <strong className="text-foreground">CNIL</strong> (Commission Nationale de l'Informatique et des Libertés) si vous estimez que le traitement de vos données ne respecte pas le RGPD.
          </p>
        </section>

        {/* Sécurité */}
        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">7. Sécurité des données</h2>
          <p className="text-muted-foreground">
            Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Mots de passe hashés avec bcrypt (non stockés en clair)</li>
            <li>Communications chiffrées via HTTPS/TLS</li>
            <li>Authentification par tokens JWT à durée limitée</li>
            <li>Accès à la base de données restreint</li>
          </ul>
        </section>

        {/* Mineurs */}
        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">8. Personnes mineures</h2>
          <p className="text-muted-foreground">
            CaptenTDB est réservé aux personnes âgées d'au moins <strong className="text-foreground">18 ans</strong>. Nous ne collectons pas sciemment de données personnelles concernant des mineurs. Si vous êtes le parent ou tuteur d'un mineur ayant créé un compte, veuillez nous contacter pour supprimer ses données.
          </p>
        </section>

        {/* Modifications */}
        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">9. Modifications de la présente politique</h2>
          <p className="text-muted-foreground">
            Cette politique peut être mise à jour pour refléter des évolutions légales ou techniques. En cas de modification substantielle, vous en serez informé via une notification sur la plateforme.
          </p>
          <p className="text-muted-foreground text-xs">
            Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </p>
        </section>

      </div>

      {/* Footer links */}
      <div className="flex flex-wrap gap-4 justify-center text-xs text-muted-foreground pt-4 border-t border-white/10">
        <Link href="/mentions-legales" className="hover:text-primary hover:underline">Mentions légales</Link>
        <Link href="/cgu" className="hover:text-primary hover:underline">Conditions d'utilisation</Link>
        <Link href="/" className="hover:text-primary hover:underline">Retour à l'accueil</Link>
      </div>
    </div>
  );
}
