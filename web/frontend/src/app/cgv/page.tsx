import Link from "next/link";
import { ShoppingCart, ExternalLink } from "lucide-react";
import { LegalNav, LegalSectionTitle, InfoBox, Dl } from "@/components/legal/LegalNav";
import { lireEditeur, ligneVendeur, prixTexte } from "@/lib/legal-serveur";

export const metadata = {
  title: "Conditions Générales de Vente, CaptenTDB",
  description: "Conditions générales de vente de l'abonnement Premium CaptenTDB, conformément au code de la consommation français.",
};

// Relues sur le serveur toutes les cinq minutes : l'identité du vendeur, le
// prix et le médiateur viennent des variables d'environnement (api/legal.py).
export const revalidate = 300;

const TOC = [
  { id: "objet", label: "Objet" },
  { id: "vendeur", label: "Vendeur" },
  { id: "produit", label: "Service & prix" },
  { id: "commande", label: "Commande" },
  { id: "paiement", label: "Paiement & renouvellement" },
  { id: "retractation", label: "Droit de rétractation" },
  { id: "resiliation", label: "Résiliation" },
  { id: "reclamations", label: "Réclamations & médiation" },
  { id: "donnees", label: "Données personnelles" },
  { id: "droit", label: "Droit applicable" },
];

/**
 * LES CGV DE L'ABONNEMENT, ÉCRITES POUR LE PARCOURS RÉEL.
 *
 * La version 1 décrivait un parcours qui n'existe plus (formulaire de
 * contact, activation « sous 24-48 h » par l'équipe), une résiliation « en
 * contactant le support » — interdite depuis la résiliation en trois clics
 * (art. L.215-1-1) —, une adhésion à un médiateur qui n'avait jamais été
 * prise, et la plateforme européenne de règlement en ligne des litiges,
 * fermée le 20 juillet 2025. Celle-ci suit ce que le site fait vraiment.
 */
export default async function CgvPage() {
  const e = await lireEditeur();
  const pro = e.statut !== "non_immatricule";
  const prix = prixTexte(e.prix_centimes);
  const contact = e.email
    ? <a href={`mailto:${e.email}`} className="text-primary hover:underline">{e.email}</a>
    : <span>via la plateforme (section « Communauté » → « Contacter Admin »)</span>;

  return (
    <div className="cap-legal space-y-6">
      <LegalNav current="/cgv" />

      <div className="glass-card p-8 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold">Code de la consommation</span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-muted-foreground text-xs">Version {e.cgv_version}</span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-muted-foreground text-xs">Octobre 2026</span>
            </div>
            <h1 className="text-2xl font-bold">Conditions Générales de Vente</h1>
            <p className="text-sm text-muted-foreground mt-1">Abonnement Premium CaptenTDB</p>
          </div>
        </div>
      </div>

      {!e.offre_ouverte && (
        <div className="glass-card p-6">
          <InfoBox variant="warning">
            <p className="font-semibold">Ces conditions ne sont pas encore en vigueur.</p>
            <p className="mt-1">
              Aucune offre payante n&apos;est ouverte à ce jour : le service est entièrement gratuit et aucun
              paiement n&apos;est perçu. Le présent document est publié à titre d&apos;information et ne
              s&apos;appliquera qu&apos;à compter de l&apos;ouverture effective de l&apos;abonnement.
            </p>
          </InfoBox>
        </div>
      )}

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

        <section id="objet" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="1" id="objet-title" title="Objet" />
          <p className="text-muted-foreground">
            Les présentes conditions générales de vente (CGV) régissent la vente de l&apos;abonnement Premium du
            site <strong className="text-foreground">captentdb.fr</strong> à toute personne physique agissant à
            des fins non professionnelles (ci-après « le Client »). Elles complètent les{" "}
            <Link href="/cgu" className="text-primary hover:underline">conditions générales d&apos;utilisation</Link>,
            qui régissent l&apos;usage du site lui-même.
          </p>
          <p className="text-muted-foreground">
            Le Client les accepte en cochant la case prévue avant le paiement ; la date de cette acceptation et
            la version acceptée sont conservées. La version applicable est celle en vigueur au jour de la
            souscription.
          </p>
        </section>

        <section id="vendeur" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="2" id="vendeur-title" title="Vendeur" />
          {pro ? (
            <Dl items={[
              { label: "Vendeur", value: e.identite || e.nom_public },
              { label: "Statut", value: e.statut === "societe" ? "Société" : "Entrepreneur individuel (micro-entreprise)" },
              { label: "Adresse", value: e.adresse || "—" },
              { label: "SIREN", value: e.siren || "—" },
              ...(e.rcs ? [{ label: "RCS", value: e.rcs }] : []),
              { label: "TVA", value: e.tva_intracom || e.mention_tva },
              { label: "E-mail", value: contact },
              ...(e.telephone ? [{ label: "Téléphone", value: e.telephone }] : []),
            ]} />
          ) : (
            <p className="text-muted-foreground">
              Le vendeur sera l&apos;éditeur du site une fois immatriculé ; son identité complète, son adresse,
              son numéro SIREN et ses coordonnées figureront ici et dans les{" "}
              <Link href="/mentions-legales" className="text-primary hover:underline">mentions légales</Link> avant
              toute vente.
            </p>
          )}
        </section>

        <section id="produit" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="3" id="produit-title" title="Service & prix" />
          <p className="text-muted-foreground">
            L&apos;abonnement Premium est un service numérique : il relève les limites d&apos;usage du compte
            gratuit (nombre de scans du marché et de questions à l&apos;assistant par jour, nombre de positions
            virtuelles ouvertes, nombre d&apos;actifs suivis), telles que décrites sur la{" "}
            <Link href="/premium" className="text-primary hover:underline">page Premium</Link> au moment de la
            souscription. CaptenTDB est un simulateur éducatif : l&apos;abonnement ne donne accès à aucun
            service d&apos;investissement, à aucun conseil personnalisé et à aucun marché réel.
          </p>
          <Dl items={[
            { label: "Prix", value: `${prix} TTC par mois` },
            { label: "TVA", value: e.tva_intracom ? "TVA incluse au taux en vigueur" : e.mention_tva },
            { label: "Durée", value: "Mensuelle, renouvelée automatiquement, sans engagement de durée" },
            { label: "Accès", value: "Immédiat, dès la confirmation du paiement" },
          ]} />
          <p className="text-muted-foreground">
            Toute modification du prix est annoncée au moins 30 jours à l&apos;avance par e-mail et sur le site ;
            elle ne s&apos;applique qu&apos;aux renouvellements qui suivent ce délai, et le Client peut résilier
            avant qu&apos;elle ne prenne effet.
          </p>
        </section>

        <section id="commande" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="4" id="commande-title" title="Commande" />
          <ol className="list-decimal pl-5 space-y-1.5 text-muted-foreground">
            <li>Le Client, connecté à son compte, ouvre la page Premium, qui présente le service, le prix et les présentes conditions.</li>
            <li>Il coche la case d&apos;acceptation des CGV, puis valide sa commande par le bouton « S&apos;abonner, payer {prix} par mois », qui emporte obligation de paiement.</li>
            <li>Il saisit ses informations de paiement sur la page sécurisée de Stripe et confirme.</li>
            <li>L&apos;accès Premium est activé dès la confirmation du paiement. Une confirmation du contrat, reprenant ses conditions et le formulaire de rétractation, est envoyée par e-mail.</li>
          </ol>
        </section>

        <section id="paiement" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="5" id="paiement-title" title="Paiement & renouvellement" />
          <div className="space-y-3 text-muted-foreground">
            <p>
              Le paiement est traité par <strong className="text-foreground">Stripe</strong> (Stripe Payments
              Europe Ltd.), prestataire de services de paiement certifié PCI-DSS. Le vendeur n&apos;a jamais
              accès au numéro de carte.
            </p>
            <p>
              Le premier mois est payé à la souscription, puis chaque mois à la date anniversaire, jusqu&apos;à
              résiliation. Une facture est émise à chaque paiement ; le Client la retrouve dans « Gérer le
              paiement et les factures » sur la page Premium.
            </p>
            <p>
              En cas d&apos;échec d&apos;un paiement, Stripe présente de nouveau la carte pendant quelques jours
              et le Client en est prévenu ; s&apos;il n&apos;aboutit pas, l&apos;abonnement prend fin, sans
              autre frais.
            </p>
          </div>
        </section>

        <section id="retractation" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="6" id="retractation-title" title="Droit de rétractation" />
          <InfoBox variant="warning">
            <p className="font-semibold">14 jours pour changer d&apos;avis, remboursement intégral</p>
            <p className="mt-1">
              Le Client dispose de 14 jours à compter de la souscription pour se rétracter, sans avoir à se
              justifier (art. L.221-18 du code de la consommation). Le vendeur lui rembourse alors la
              <strong> totalité</strong> des sommes versées, sans retenir la part du mois déjà utilisée,
              dans un délai de 14 jours, par le moyen de paiement utilisé.
            </p>
          </InfoBox>
          <div className="space-y-3 text-muted-foreground">
            <p>
              <strong className="text-foreground">Comment.</strong> Par le bouton « Me rétracter » de la page
              Premium, qui arrête l&apos;abonnement et lance le remboursement immédiatement ; ou par toute
              déclaration dénuée d&apos;ambiguïté adressée au vendeur ({contact}), par exemple au moyen du
              modèle ci-dessous.
            </p>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs">
              « À l&apos;attention de {ligneVendeur(e)}{e.email ? ` (${e.email})` : ""}, Je vous notifie par la
              présente ma rétractation du contrat portant sur l&apos;abonnement CaptenTDB Premium, souscrit le
              [date]. Nom du consommateur, adresse e-mail du compte, date. »
            </div>
          </div>
        </section>

        <section id="resiliation" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="7" id="resiliation-title" title="Résiliation" />
          <div className="space-y-3 text-muted-foreground">
            <p>
              Le Client résilie à tout moment, en trois clics, depuis la page Premium : « Résilier mon
              abonnement », puis « Confirmer la résiliation » (art. L.215-1-1 du code de la consommation). Un
              e-mail ou un écrit au vendeur produit le même effet.
            </p>
            <p>
              La résiliation prend effet à la fin du mois en cours, déjà payé : l&apos;accès Premium reste ouvert
              jusque-là et plus aucun paiement n&apos;est prélevé ensuite. Le Client peut revenir sur sa
              décision jusqu&apos;à cette date (« Garder mon abonnement »). Hors rétractation, le mois entamé
              n&apos;est pas remboursé.
            </p>
            <p>
              La suppression du compte met fin à l&apos;abonnement. Le vendeur peut résilier en cas de
              manquement grave aux CGU, après en avoir informé le Client ; le mois en cours est alors
              remboursé au prorata.
            </p>
          </div>
        </section>

        <section id="reclamations" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="8" id="reclamations-title" title="Réclamations & médiation" />
          <div className="space-y-3 text-muted-foreground">
            <p>Toute réclamation est à adresser au vendeur : {contact}.</p>
            <p>
              À défaut de solution dans un délai raisonnable, et au plus tôt après une réclamation écrite, le
              Client peut recourir gratuitement à un médiateur de la consommation (art. L.612-1 du code de la
              consommation) :
            </p>
            {e.mediateur.nom ? (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-sm">
                <p className="font-semibold text-foreground">{e.mediateur.nom}{e.mediateur.adresse ? `, ${e.mediateur.adresse}` : ""}</p>
                {e.mediateur.site && (
                  <a href={e.mediateur.site} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs mt-1">
                    {e.mediateur.site.replace(/^https?:\/\//, "")} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ) : (
              <p className="text-xs">
                Le médiateur sera désigné ici avant l&apos;ouverture de toute vente.
              </p>
            )}
          </div>
        </section>

        <section id="donnees" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="9" id="donnees-title" title="Données personnelles" />
          <p className="text-muted-foreground">
            Les données nécessaires à l&apos;abonnement (identifiant client et d&apos;abonnement Stripe, dates,
            statut, factures) sont traitées pour l&apos;exécution du contrat et conservées le temps exigé par
            les obligations comptables (dix ans pour les pièces justificatives). Le détail figure dans la{" "}
            <Link href="/politique-de-confidentialite" className="text-primary hover:underline">politique de confidentialité</Link>.
          </p>
        </section>

        <section id="droit" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="10" id="droit-title" title="Droit applicable" />
          <p className="text-muted-foreground">
            Les présentes CGV sont soumises au droit français et rédigées en français. À défaut de résolution
            amiable ou par médiation, le litige relève des juridictions françaises compétentes, sans préjudice
            des règles protectrices du pays de résidence du consommateur au sein de l&apos;Union européenne.
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-white/10">
            <span>Version {e.cgv_version}, octobre 2026</span>
            <a href="#" className="hover:text-primary transition-colors">↑ Haut de page</a>
          </div>
        </section>
      </div>

      <div className="flex flex-wrap gap-4 justify-center text-xs text-muted-foreground pt-4 border-t border-white/10">
        <Link href="/cgu" className="hover:text-primary hover:underline">Conditions générales d&apos;utilisation</Link>
        <span>·</span>
        <Link href="/mentions-legales" className="hover:text-primary hover:underline">Mentions légales</Link>
        <span>·</span>
        <Link href="/politique-de-confidentialite" className="hover:text-primary hover:underline">Politique de confidentialité</Link>
        <span>·</span>
        <Link href="/" className="hover:text-primary hover:underline">Retour à l&apos;accueil</Link>
      </div>
    </div>
  );
}
