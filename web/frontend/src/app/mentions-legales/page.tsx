import Link from "next/link";
import { Scale } from "lucide-react";

export const metadata = {
  title: "Mentions légales - CaptenTDB",
};

export default function MentionsLegalesPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
          <Scale className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Mentions légales</h1>
        <p className="text-muted-foreground text-sm">Conformément à la loi n°2004-575 du 21 juin 2004 pour la Confiance dans l'Économie Numérique (LCEN)</p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed">

        {/* Éditeur */}
        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">1. Éditeur du site</h2>
          <p className="text-muted-foreground">
            Le site <strong className="text-foreground">CaptenTDB</strong> est édité à titre personnel par :
          </p>
          <ul className="space-y-1 text-muted-foreground pl-4">
            <li><span className="text-foreground font-medium">Auteur :</span> CaptenQwark</li>
            <li><span className="text-foreground font-medium">Statut :</span> Projet indépendant, non commercial</li>
            <li><span className="text-foreground font-medium">Contact :</span> Via la section « Communauté » → « Contacter Admin »</li>
          </ul>
        </section>

        {/* Hébergement */}
        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">2. Hébergement</h2>
          <p className="text-muted-foreground">
            Le site est hébergé par la société :
          </p>
          <ul className="space-y-1 text-muted-foreground pl-4">
            <li><span className="text-foreground font-medium">Société :</span> Railway Corp.</li>
            <li><span className="text-foreground font-medium">Adresse :</span> 548 Market St, PMB 68956, San Francisco, CA 94104, USA</li>
            <li><span className="text-foreground font-medium">Site web :</span> railway.app</li>
          </ul>
        </section>

        {/* Nature du service */}
        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">3. Nature du service</h2>
          <p className="text-muted-foreground">
            CaptenTDB est une <strong className="text-foreground">plateforme éducative de paper trading</strong>. Le service est fourni à titre gratuit (avec option Premium) dans un but exclusivement pédagogique.
          </p>
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-yellow-400 text-xs font-medium">
              ⚠️ CaptenTDB n'est pas un prestataire de services d'investissement. Le site n'est pas enregistré auprès de l'Autorité des Marchés Financiers (AMF) et ne fournit aucun conseil en investissement au sens de la Directive MIF 2. Toutes les données et analyses proposées sont à titre informatif et éducatif uniquement.
            </p>
          </div>
        </section>

        {/* Propriété intellectuelle */}
        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">4. Propriété intellectuelle</h2>
          <p className="text-muted-foreground">
            L'ensemble du contenu du site CaptenTDB (textes, graphiques, interface, code source) est la propriété exclusive de CaptenQwark. Toute reproduction, représentation, modification ou exploitation sans autorisation préalable est interdite.
          </p>
          <p className="text-muted-foreground">
            Les données de marchés financiers sont fournies par des services tiers (Yahoo Finance, etc.) et sont soumises aux conditions d'utilisation de ces fournisseurs.
          </p>
        </section>

        {/* Données personnelles */}
        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">5. Données personnelles</h2>
          <p className="text-muted-foreground">
            Conformément au Règlement (UE) 2016/679 (RGPD), vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité de vos données. Consultez notre{" "}
            <Link href="/politique-de-confidentialite" className="text-primary hover:underline">
              Politique de confidentialité
            </Link>{" "}
            pour plus d'informations.
          </p>
        </section>

        {/* Cookies */}
        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">6. Cookies</h2>
          <p className="text-muted-foreground">
            CaptenTDB utilise uniquement des cookies techniques nécessaires au fonctionnement du service (authentification par token JWT, préférences d'affichage). Aucun cookie publicitaire ou de traçage tiers n'est utilisé.
          </p>
        </section>

        {/* Responsabilité */}
        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">7. Limitation de responsabilité</h2>
          <p className="text-muted-foreground">
            CaptenTDB ne peut être tenu responsable des dommages directs ou indirects résultant de l'utilisation du site, d'une interruption de service, ou de décisions d'investissement prises par l'utilisateur sur la base des informations fournies.
          </p>
          <p className="text-muted-foreground">
            L'éditeur se réserve le droit de modifier, suspendre ou interrompre l'accès au service à tout moment sans préavis.
          </p>
        </section>

        {/* Droit applicable */}
        <section className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">8. Droit applicable</h2>
          <p className="text-muted-foreground">
            Les présentes mentions légales sont soumises au droit français. En cas de litige, les tribunaux français seront seuls compétents.
          </p>
          <p className="text-muted-foreground text-xs">
            Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </p>
        </section>

      </div>

      {/* Footer links */}
      <div className="flex flex-wrap gap-4 justify-center text-xs text-muted-foreground pt-4 border-t border-white/10">
        <Link href="/cgu" className="hover:text-primary hover:underline">Conditions d'utilisation</Link>
        <Link href="/politique-de-confidentialite" className="hover:text-primary hover:underline">Politique de confidentialité</Link>
        <Link href="/" className="hover:text-primary hover:underline">Retour à l'accueil</Link>
      </div>
    </div>
  );
}
