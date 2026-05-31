import Link from "next/link";
import { Scale, AlertTriangle, ExternalLink } from "lucide-react";
import { LegalNav, LegalSectionTitle, InfoBox, Dl } from "@/components/legal/LegalNav";

export const metadata = {
  title: "Mentions légales — CaptenTDB",
  description: "Mentions légales de CaptenTDB conformément à la loi LCEN n°2004-575 du 21 juin 2004.",
};

const TOC = [
  { id: "editeur", label: "Éditeur du site" },
  { id: "hebergement", label: "Hébergement" },
  { id: "directeur", label: "Directeur de la publication" },
  { id: "nature", label: "Nature du service & avertissement" },
  { id: "pi", label: "Propriété intellectuelle" },
  { id: "liens", label: "Liens hypertextes" },
  { id: "donnees", label: "Données personnelles" },
  { id: "cookies", label: "Cookies & traceurs" },
  { id: "responsabilite", label: "Limitation de responsabilité" },
  { id: "mediation", label: "Médiation de la consommation" },
  { id: "cgv", label: "Conditions de vente" },
  { id: "droit", label: "Droit applicable" },
];

export default function MentionsLegalesPage() {
  return (
    <div className="space-y-6">
      <LegalNav current="/mentions-legales" />

      {/* Header */}
      <div className="glass-card p-8 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
            <Scale className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold">LCEN Art. 6</span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-muted-foreground text-xs">Version 1.1</span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-muted-foreground text-xs">Mai 2026</span>
            </div>
            <h1 className="text-2xl font-bold">Mentions légales</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Conformément à la loi n°2004-575 du 21 juin 2004 pour la Confiance dans l'Économie Numérique (LCEN)
            </p>
          </div>
        </div>
      </div>

      {/* Table of contents */}
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

        {/* 1. Éditeur */}
        <section id="editeur" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="1" id="editeur-title" title="Éditeur du site" />
          <p className="text-muted-foreground">Le site internet <strong className="text-foreground">CaptenTDB</strong> est édité à titre personnel par :</p>
          <Dl items={[
            { label: "Identité", value: "CaptenQwark" },
            { label: "Statut", value: "Personne physique — éditeur indépendant" },
            { label: "Pays", value: "France" },
            { label: "Contact", value: <span>Via la plateforme : section « Communauté » → « Contacter Admin »</span> },
          ]} />
          <p className="text-xs text-muted-foreground">
            En proposant un abonnement payant, l'éditeur agit en qualité de « professionnel » au sens de l'article L.217-1 du code de la consommation pour les relations avec ses utilisateurs abonnés.
          </p>
        </section>

        {/* 2. Hébergement */}
        <section id="hebergement" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="2" id="hebergement-title" title="Hébergement" />
          <p className="text-muted-foreground">L'infrastructure de CaptenTDB (serveurs applicatifs et base de données) est hébergée par :</p>
          <Dl items={[
            { label: "Société", value: "Railway Corp." },
            { label: "Adresse", value: "548 Market St, PMB 68956, San Francisco, CA 94104, États-Unis" },
            { label: "Site web", value: <a href="https://railway.app" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">railway.app <ExternalLink className="w-3 h-3" /></a> },
          ]} />
          <InfoBox variant="info">
            Railway Corp. est soumis au GDPR via les clauses contractuelles types (CCT/SCC) de la Commission européenne pour les transferts de données hors UE.
          </InfoBox>
        </section>

        {/* 3. Directeur de publication */}
        <section id="directeur" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="3" id="directeur-title" title="Directeur de la publication" />
          <p className="text-muted-foreground">
            Le directeur de la publication au sens de l'article 6 III 1° de la LCEN est <strong className="text-foreground">CaptenQwark</strong>, en sa qualité d'éditeur du site.
          </p>
        </section>

        {/* 4. Nature du service */}
        <section id="nature" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="4" id="nature-title" title="Nature du service & avertissement réglementaire" />
          <p className="text-muted-foreground">
            CaptenTDB est une <strong className="text-foreground">plateforme éducative de paper trading</strong> (trading sur portefeuille virtuel avec argent fictif). Le service est proposé à titre gratuit avec une option d'abonnement Premium.
          </p>
          <InfoBox variant="warning">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Avertissement réglementaire (AMF / MIF 2)</p>
                <p>CaptenTDB <strong>n'est pas un prestataire de services d'investissement (PSI)</strong>. Ce site n'est pas agréé ni enregistré auprès de l'Autorité des Marchés Financiers (AMF) ou de tout autre régulateur financier européen. Aucune des informations, analyses, signaux ou réponses de l'assistant IA ne constitue un conseil en investissement, une recommandation d'achat ou de vente de valeurs mobilières, ni un service d'investissement au sens de la Directive 2014/65/UE (MIF 2) ou du code monétaire et financier.</p>
                <p className="mt-1">Toutes les données et analyses sont fournies à titre informatif et éducatif uniquement. L'utilisateur reste seul responsable de ses décisions d'investissement sur les marchés réels.</p>
              </div>
            </div>
          </InfoBox>
        </section>

        {/* 5. Propriété intellectuelle */}
        <section id="pi" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="5" id="pi-title" title="Propriété intellectuelle" />
          <p className="text-muted-foreground">
            L'ensemble des éléments constituant le site CaptenTDB — notamment l'interface graphique, le code source, les textes, la logique applicative, le nom et le logo — sont la propriété exclusive de CaptenQwark et sont protégés par le droit de la propriété intellectuelle (code de la propriété intellectuelle, articles L.111-1 et suivants).
          </p>
          <p className="text-muted-foreground">
            Toute reproduction, représentation, modification, adaptation, traduction ou exploitation, totale ou partielle, par quelque procédé que ce soit, sans l'autorisation préalable et écrite de CaptenQwark, est strictement interdite et constituerait une contrefaçon sanctionnée par les articles L.335-2 et suivants du code de la propriété intellectuelle.
          </p>
          <p className="text-muted-foreground">
            Les données de marchés financiers sont issues de fournisseurs tiers (Yahoo Finance, etc.) et soumises à leurs propres conditions d'utilisation. CaptenTDB ne revendique aucun droit de propriété sur ces données.
          </p>
        </section>

        {/* 6. Liens hypertextes */}
        <section id="liens" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="6" id="liens-title" title="Liens hypertextes" />
          <p className="text-muted-foreground">
            CaptenTDB peut contenir des liens vers des sites tiers (fournisseurs de données, documentation, etc.). Ces liens sont fournis à titre indicatif. CaptenTDB n'exerce aucun contrôle sur le contenu de ces sites tiers et ne peut être tenu responsable de leur contenu, de leur politique de confidentialité ou de leurs pratiques.
          </p>
          <p className="text-muted-foreground">
            La création de liens vers les pages du site CaptenTDB est autorisée sous réserve que le lien s'ouvre dans une nouvelle fenêtre et ne soit pas présenté de manière trompeuse.
          </p>
        </section>

        {/* 7. Données personnelles */}
        <section id="donnees" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="7" id="donnees-title" title="Données personnelles" />
          <p className="text-muted-foreground">
            Conformément au Règlement (UE) 2016/679 du 27 avril 2016 relatif à la protection des données (RGPD) et à la loi Informatique et Libertés n°78-17 du 6 janvier 1978 modifiée, les utilisateurs disposent de droits sur leurs données personnelles (accès, rectification, effacement, portabilité, opposition, limitation).
          </p>
          <p className="text-muted-foreground">
            Pour toute information complète sur le traitement de vos données, consultez notre{" "}
            <Link href="/politique-de-confidentialite" className="text-primary hover:underline font-medium">
              Politique de confidentialité
            </Link>.
          </p>
        </section>

        {/* 8. Cookies */}
        <section id="cookies" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="8" id="cookies-title" title="Cookies & traceurs" />
          <p className="text-muted-foreground">
            CaptenTDB utilise uniquement des <strong className="text-foreground">cookies techniques strictement nécessaires</strong> au fonctionnement du service : maintien de session d'authentification (token JWT en localStorage) et préférences d'affichage.
          </p>
          <InfoBox variant="success">
            Aucun cookie publicitaire, aucun outil de tracking tiers (Google Analytics, Facebook Pixel, etc.) n'est utilisé sur ce site. Aucun consentement préalable n'est donc requis au titre de la directive ePrivacy (CNIL, délibération n°2020-092).
          </InfoBox>
        </section>

        {/* 9. Limitation de responsabilité */}
        <section id="responsabilite" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="9" id="responsabilite-title" title="Limitation de responsabilité" />
          <p className="text-muted-foreground">
            CaptenTDB s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur le site. Toutefois, l'éditeur ne peut être tenu responsable des erreurs, omissions, ou de l'absence de disponibilité des informations.
          </p>
          <p className="text-muted-foreground">
            En aucun cas CaptenTDB ne saurait être tenu responsable de dommages directs ou indirects, matériels ou immatériels, résultant de :
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Décisions d'investissement prises par l'utilisateur sur les marchés financiers réels</li>
            <li>L'inexactitude ou l'indisponibilité de données de marchés issues de fournisseurs tiers</li>
            <li>Une interruption ou indisponibilité du service</li>
            <li>L'utilisation du service non conforme aux CGU</li>
            <li>Des erreurs ou biais dans les réponses générées par l'assistant IA</li>
          </ul>
          <p className="text-muted-foreground">
            L'éditeur se réserve le droit de modifier, suspendre ou interrompre l'accès au service à tout moment, sans préavis et sans responsabilité.
          </p>
        </section>

        {/* 10. Médiation */}
        <section id="mediation" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="10" id="mediation-title" title="Médiation de la consommation" />
          <InfoBox variant="info">
            <p className="mb-2">Conformément aux articles L.611-1 et suivants et L.616-1 du code de la consommation, tout consommateur a le droit de recourir gratuitement à un médiateur de la consommation en vue de la résolution amiable du litige qui l'oppose à un professionnel.</p>
            <p className="mb-2">CaptenTDB adhère au dispositif de médiation de l'ANM Conso (Association Nationale des Médiateurs) :</p>
            <p className="mb-2 font-semibold">ANM Conso — 62 rue Tiquetonne, 75002 Paris<br />
            <a href="https://www.anm-conso.com" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">www.anm-conso.com <ExternalLink className="w-3 h-3" /></a></p>
            <p>En cas d'échec de la médiation, l'utilisateur peut saisir la plateforme européenne de règlement en ligne des litiges (RLL) :{" "}
            <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">ec.europa.eu/consumers/odr <ExternalLink className="w-3 h-3" /></a></p>
          </InfoBox>
        </section>

        {/* 11. CGV */}
        <section id="cgv" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="11" id="cgv-title" title="Conditions générales de vente (résumé)" />
          <p className="text-muted-foreground">
            Pour toute souscription à l'abonnement Premium, les conditions complètes de vente sont
            détaillées dans les <Link href="/cgu#premium" className="text-primary hover:underline">CGU (Article 7 — Abonnement Premium)</Link> et{" "}
            <Link href="/cgu#retractation" className="text-primary hover:underline">CGU (Article 8 — Droit de rétractation)</Link>.
          </p>
          <Dl items={[
            { label: "Prix", value: "5,00 € TTC / mois" },
            { label: "Paiement", value: "Via Stripe, Inc. (PCI-DSS Level 1) — CB, Visa, Mastercard" },
            { label: "Exécution", value: "Accès Premium activé sous 24-48h après validation de la demande par l'équipe" },
            { label: "Durée", value: "Abonnement mensuel renouvelable — résiliable à tout moment" },
            { label: "Rétractation", value: "14 jours calendaires à compter de l'activation (L.221-18 code consommation)" },
          ]} />
        </section>

        {/* 12. Droit applicable */}
        <section id="droit" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="12" id="droit-title" title="Droit applicable & juridiction compétente" />
          <p className="text-muted-foreground">
            Les présentes mentions légales sont régies par le droit français. En cas de litige relatif à l'interprétation ou à l'exécution des présentes mentions légales, et à défaut de résolution amiable, les tribunaux français seront seuls compétents.
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-white/10">
            <span>Version 1.1 — Dernière mise à jour : mai 2026</span>
            <a href="#" className="hover:text-primary transition-colors">↑ Haut de page</a>
          </div>
        </section>

      </div>

      {/* Footer navigation */}
      <div className="flex flex-wrap gap-4 justify-center text-xs text-muted-foreground pt-4 border-t border-white/10">
        <Link href="/cgu" className="hover:text-primary hover:underline">Conditions générales d'utilisation</Link>
        <span>·</span>
        <Link href="/politique-de-confidentialite" className="hover:text-primary hover:underline">Politique de confidentialité</Link>
        <span>·</span>
        <Link href="/" className="hover:text-primary hover:underline">Retour à l'accueil</Link>
      </div>
    </div>
  );
}
