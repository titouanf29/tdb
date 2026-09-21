import Link from "next/link";
import { ShoppingCart, ExternalLink } from "lucide-react";
import { LegalNav, LegalSectionTitle, InfoBox, Dl } from "@/components/legal/LegalNav";
import { OFFRE_PAYANTE_OUVERTE } from "@/lib/legal";

export const metadata = {
  title: "Conditions Générales de Vente — CaptenTDB",
  description: "Conditions générales de vente de l'abonnement Premium CaptenTDB, conformément au code de la consommation français.",
};

const TOC = [
  { id: "objet", label: "Objet" },
  { id: "vendeur", label: "Vendeur" },
  { id: "produit", label: "Produit & prix" },
  { id: "commande", label: "Modalités de commande" },
  { id: "paiement", label: "Paiement" },
  { id: "retractation", label: "Droit de rétractation" },
  { id: "sav", label: "Service après-vente" },
  { id: "droit", label: "Droit applicable" },
];

export default function CgvPage() {
  return (
    <div className="cap-legal space-y-6">
      <LegalNav current="/cgv" />

      {/* Header */}
      <div className="glass-card p-8 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold">Code de la consommation</span>
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold">Dir. 2011/83/UE</span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-muted-foreground text-xs">Version 1.0</span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-muted-foreground text-xs">Mai 2026</span>
            </div>
            <h1 className="text-2xl font-bold">Conditions Générales de Vente</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Abonnement Premium CaptenTDB — Conformément aux articles L.111-1 et suivants du code de la consommation
            </p>
          </div>
        </div>
      </div>

      {/* DES CGV SANS VENTE DÉCRIVENT UN CONTRAT QUI N'EXISTE PAS.
          Laisser ce document tel quel laissait croire qu'un abonnement à 5 €
          était en vigueur, avec son droit de rétractation et son médiateur —
          sur un site qui n'encaisse rien. Le texte reste publié, parce qu'il
          servira, mais il est daté de ce qu'il est : un document à venir. */}
      {!OFFRE_PAYANTE_OUVERTE && (
        <div className="glass-card p-6">
          <InfoBox variant="warning">
            <p className="font-semibold">Ces conditions ne sont pas encore en vigueur.</p>
            <p className="mt-1">
              Aucune offre payante n'est ouverte à ce jour : CaptenTDB est édité à titre non
              professionnel, le service est entièrement gratuit et aucun paiement n'est perçu.
              Le présent document est publié à titre d'information et ne s'appliquera qu'à
              compter de l'ouverture effective d'un abonnement, qui sera annoncée sur le site.
            </p>
          </InfoBox>
        </div>
      )}

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

        {/* 1. Objet */}
        <section id="objet" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="1" id="objet-title" title="Objet" />
          <p className="text-muted-foreground">
            Les présentes Conditions Générales de Vente (CGV) régissent exclusivement les ventes de l'abonnement Premium proposé sur la plateforme CaptenTDB accessible à l'adresse <strong className="text-foreground">captentdb.fr</strong>.
          </p>
          <p className="text-muted-foreground">
            Elles complètent les <Link href="/cgu" className="text-primary hover:underline">Conditions Générales d'Utilisation (CGU)</Link> et s'appliquent à tout achat de l'abonnement Premium par un utilisateur (ci-après « le Client »).
          </p>
          <InfoBox variant="info">
            Les présentes CGV sont conformes aux dispositions du code de la consommation, notamment aux articles L.111-1 (information précontractuelle), L.221-18 (droit de rétractation) et L.611-1 (médiation). Pour les conditions complètes d'utilisation du service, veuillez consulter les <Link href="/cgu" className="text-primary hover:underline font-medium">CGU</Link>.
          </InfoBox>
        </section>

        {/* 2. Vendeur */}
        <section id="vendeur" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="2" id="vendeur-title" title="Vendeur" />
          <p className="text-muted-foreground">Le vendeur est :</p>
          <Dl items={[
            { label: "Identité", value: "CaptenQwark (personne physique)" },
            { label: "Statut", value: "Éditeur indépendant — agissant en qualité de « professionnel » au sens de l'article L.217-1 du code de la consommation" },
            { label: "Pays", value: "France" },
            { label: "Contact", value: <span>Via la plateforme : section « Communauté » → « Contacter Admin »</span> },
          ]} />
          <p className="text-muted-foreground text-xs">
            Pour toutes les informations légales complètes, consultez les <Link href="/mentions-legales" className="text-primary hover:underline">Mentions légales</Link>.
          </p>
        </section>

        {/* 3. Produit & prix */}
        <section id="produit" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="3" id="produit-title" title="Produit & prix" />
          <p className="text-muted-foreground">
            Le produit vendu est l'abonnement Premium à la plateforme CaptenTDB, donnant accès à des fonctionnalités avancées décrites sur la <Link href="/premium" className="text-primary hover:underline">page Premium</Link>.
          </p>
          <Dl items={[
            { label: "Désignation", value: "Abonnement Premium CaptenTDB" },
            { label: "Nature", value: "Service numérique — accès étendu aux fonctionnalités de la plateforme éducative" },
            { label: "Prix TTC", value: "5,00 € par mois (toutes taxes comprises)" },
            { label: "TVA", value: "Applicable selon la réglementation en vigueur" },
            { label: "Durée", value: "Abonnement mensuel — renouvelé automatiquement chaque mois" },
          ]} />
          <InfoBox variant="info">
            Conformément à l'article L.111-1 du code de la consommation, les caractéristiques essentielles du service et son prix TTC sont affichés sur la page Premium avant toute souscription. Voir également <Link href="/cgu#premium" className="text-primary hover:underline">CGU Article 7 — Abonnement Premium</Link>.
          </InfoBox>
        </section>

        {/* 4. Modalités de commande */}
        <section id="commande" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="4" id="commande-title" title="Modalités de commande" />
          <div className="space-y-3 text-muted-foreground">
            <p>
              <strong className="text-foreground">4.1 Processus de souscription.</strong> La souscription à l'abonnement Premium s'effectue en plusieurs étapes :
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 text-muted-foreground">
              <li>Le Client dispose d'un compte actif et vérifié sur CaptenTDB</li>
              <li>Le Client accède à la page Premium et envoie une demande de souscription via le formulaire de contact</li>
              <li>L'équipe CaptenTDB examine la demande et contacte le Client pour procéder au paiement via Stripe</li>
              <li>Après confirmation du paiement, l'accès Premium est activé sous 24-48h</li>
            </ol>
            <p>
              <strong className="text-foreground">4.2 Confirmation.</strong> Un email de confirmation est envoyé au Client lors de l'activation de son abonnement Premium.
            </p>
            <p>
              <strong className="text-foreground">4.3 Acceptation des CGU.</strong> La souscription implique l'acceptation des présentes CGV ainsi que des <Link href="/cgu" className="text-primary hover:underline">CGU</Link> et de la <Link href="/politique-de-confidentialite" className="text-primary hover:underline">Politique de confidentialité</Link>.
            </p>
          </div>
        </section>

        {/* 5. Paiement */}
        <section id="paiement" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="5" id="paiement-title" title="Paiement" />
          <div className="space-y-3 text-muted-foreground">
            <p>
              <strong className="text-foreground">5.1 Prestataire de paiement.</strong> Les paiements sont traités par <strong className="text-foreground">Stripe, Inc.</strong>, prestataire de services de paiement certifié PCI-DSS Level 1. CaptenTDB n'a jamais accès aux coordonnées bancaires complètes du Client.
            </p>
            <p>
              <strong className="text-foreground">5.2 Moyens de paiement acceptés.</strong> CB, Visa, Mastercard et autres moyens acceptés par Stripe.
            </p>
            <p>
              <strong className="text-foreground">5.3 Renouvellement.</strong> L'abonnement est renouvelé automatiquement chaque mois à la date anniversaire de souscription. Le Client sera préalablement informé de tout renouvellement.
            </p>
            <p>
              <strong className="text-foreground">5.4 Modification tarifaire.</strong> Tout changement de tarif sera notifié au moins 30 jours à l'avance. La poursuite de l'abonnement après ce délai vaut acceptation du nouveau tarif. Voir <Link href="/cgu#premium" className="text-primary hover:underline">CGU Art. 7.5</Link>.
            </p>
          </div>
          <Dl items={[
            { label: "Prestataire", value: "Stripe, Inc. (PCI-DSS Level 1)" },
            { label: "Moyens acceptés", value: "CB, Visa, Mastercard" },
            { label: "Sécurité", value: "Coordonnées bancaires jamais accessibles à CaptenTDB" },
          ]} />
        </section>

        {/* 6. Droit de rétractation */}
        <section id="retractation" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="6" id="retractation-title" title="Droit de rétractation" />
          <InfoBox variant="warning">
            <div className="space-y-2">
              <p className="font-semibold">Information obligatoire — Art. L.221-18 du code de la consommation</p>
              <p>Vous disposez d'un délai de <strong>14 jours calendaires</strong> à compter de la date de souscription pour exercer votre droit de rétractation sans avoir à justifier de motifs ni à payer de pénalités.</p>
            </div>
          </InfoBox>
          <div className="space-y-3 text-muted-foreground">
            <p>
              <strong className="text-foreground">6.1 Exercice du droit.</strong> Pour exercer votre droit de rétractation, vous devez notifier votre décision avant l'expiration du délai de 14 jours via la plateforme (section « Communauté » → « Contacter Admin »), en indiquant clairement votre décision et vos coordonnées.
            </p>
            <p>
              <strong className="text-foreground">6.2 Formulaire de rétractation (modèle, non obligatoire).</strong>
            </p>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs">
              « À l'attention de l'éditeur de CaptenTDB (contact via la plateforme) — Je/Nous [*] vous notifie/notifions par la présente ma/notre [*] rétractation du contrat portant sur la prestation de services ci-dessous — Commandé(e) le [*]/reçu(e) le [*] — Nom du/des consommateur(s) — Adresse du/des consommateur(s) — Date [*] — [Signature du/des consommateur(s) uniquement en cas de notification du présent formulaire sur papier] »
            </div>
            <p>
              <strong className="text-foreground">6.3 Dérogation pour service numérique fourni immédiatement.</strong> Conformément à l'article L.221-28 12° du code de la consommation, si vous avez expressément consenti à l'exécution immédiate du service et renoncé à votre droit de rétractation lors de la souscription, vous ne pourrez pas exercer ce droit pour la période déjà consommée.
            </p>
            <p>
              <strong className="text-foreground">6.4 Remboursement.</strong> En l'absence de dérogation valable, le remboursement sera effectué dans les 14 jours suivant la notification de rétractation, par le même moyen de paiement que celui utilisé pour la transaction initiale.
            </p>
          </div>
          <p className="text-muted-foreground text-xs">
            Pour les informations complètes sur le droit de rétractation, consultez <Link href="/cgu#retractation" className="text-primary hover:underline">CGU Article 8 — Droit de rétractation</Link>.
          </p>
        </section>

        {/* 7. Service après-vente */}
        <section id="sav" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="7" id="sav-title" title="Service après-vente" />
          <div className="space-y-3 text-muted-foreground">
            <p>
              <strong className="text-foreground">7.1 Support.</strong> Le service de support est disponible pour les abonnés Premium via la plateforme (section « Communauté » → « Contacter Admin »). Nous nous engageons à répondre dans un délai raisonnable.
            </p>
            <p>
              <strong className="text-foreground">7.2 Résiliation.</strong> L'abonnement peut être résilié à tout moment en contactant le support. La résiliation prend effet à la fin de la période mensuelle en cours, sans remboursement prorata sauf disposition légale contraire.
            </p>
            <p>
              <strong className="text-foreground">7.3 Médiation de la consommation.</strong> En cas de litige non résolu avec le service client, le Client peut recourir gratuitement à un médiateur de la consommation. CaptenTDB adhère au dispositif de médiation de l'ANM Conso :
            </p>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-sm">
              <p className="font-semibold text-foreground">ANM Conso — 62 rue Tiquetonne, 75002 Paris</p>
              <a href="https://www.anm-conso.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs mt-1">
                www.anm-conso.com <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p>
              Plateforme européenne de règlement en ligne des litiges (RLL) :{" "}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                ec.europa.eu/consumers/odr <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </section>

        {/* 8. Droit applicable */}
        <section id="droit" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="8" id="droit-title" title="Droit applicable" />
          <p className="text-muted-foreground">
            Les présentes CGV sont soumises au droit français. Elles sont rédigées en langue française. En cas de litige, et à défaut de résolution amiable ou par médiation, les tribunaux français seront compétents, sous réserve des règles impératives de protection des consommateurs applicables dans le pays de résidence de l'utilisateur au sein de l'Union européenne.
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-white/10">
            <span>Version 1.0 — Dernière mise à jour : mai 2026</span>
            <a href="#" className="hover:text-primary transition-colors">↑ Haut de page</a>
          </div>
        </section>

      </div>

      {/* Footer navigation */}
      <div className="flex flex-wrap gap-4 justify-center text-xs text-muted-foreground pt-4 border-t border-white/10">
        <Link href="/cgu" className="hover:text-primary hover:underline">Conditions générales d'utilisation</Link>
        <span>·</span>
        <Link href="/mentions-legales" className="hover:text-primary hover:underline">Mentions légales</Link>
        <span>·</span>
        <Link href="/politique-de-confidentialite" className="hover:text-primary hover:underline">Politique de confidentialité</Link>
        <span>·</span>
        <Link href="/" className="hover:text-primary hover:underline">Retour à l'accueil</Link>
      </div>
    </div>
  );
}
