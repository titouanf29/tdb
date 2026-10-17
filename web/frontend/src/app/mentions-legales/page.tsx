import Link from "next/link";
import { Scale, AlertTriangle, ExternalLink } from "lucide-react";
import { LegalNav, LegalSectionTitle, InfoBox, Dl } from "@/components/legal/LegalNav";
import { HEBERGEUR } from "@/lib/legal";
import { lireEditeur, prixTexte } from "@/lib/legal-serveur";

export const metadata = {
  title: "Mentions légales, CaptenTDB",
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

// Relues sur le serveur toutes les cinq minutes (api/legal.py).
export const revalidate = 300;

export default async function MentionsLegalesPage() {
  const e = await lireEditeur();
  const EST_PROFESSIONNEL = e.statut !== "non_immatricule";
  const EDITEUR = { nomPublic: e.nom_public, identite: e.identite, statut: e.statut, adresse: e.adresse,
    siren: e.siren, rcs: e.rcs, tvaIntracom: e.tva_intracom, email: e.email, telephone: e.telephone, pays: e.pays };
  return (
    <div className="cap-legal space-y-6">
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
          {/* CETTE SECTION SUIT LE STATUT RÉEL DE L'ÉDITEUR, PAS UN MODÈLE.
              Elle annonçait un éditeur « personne physique » sans adresse ni
              SIREN, le régime de l'éditeur NON professionnel, et affirmait
              juste en dessous qu'il agissait « en qualité de professionnel »
              du fait de l'abonnement payant. Les deux ne peuvent pas être
              vrais ensemble. Voir lib/legal.ts. */}
          {EST_PROFESSIONNEL ? (
            <>
              <p className="text-muted-foreground">Le site internet <strong className="text-foreground">CaptenTDB</strong> est édité par :</p>
              <Dl items={[
                { label: "Identité", value: EDITEUR.identite || EDITEUR.nomPublic },
                { label: "Statut", value: EDITEUR.statut === "societe" ? "Société" : "Entrepreneur individuel (micro-entreprise)" },
                { label: "Adresse", value: EDITEUR.adresse },
                { label: "SIREN", value: EDITEUR.siren },
                ...(EDITEUR.rcs ? [{ label: "RCS", value: EDITEUR.rcs }] : []),
                { label: "TVA", value: EDITEUR.tvaIntracom || "TVA non applicable, art. 293 B du CGI (franchise en base)" },
                { label: "E-mail", value: EDITEUR.email ? <a href={`mailto:${EDITEUR.email}`} className="text-primary hover:underline">{EDITEUR.email}</a> : "—" },
                { label: "Téléphone", value: EDITEUR.telephone },
                { label: "Pays", value: EDITEUR.pays },
              ]} />
              <p className="text-xs text-muted-foreground">
                L'éditeur agit en qualité de professionnel au sens du code de la consommation dans ses relations avec les abonnés Premium.
              </p>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">Le site internet <strong className="text-foreground">CaptenTDB</strong> est édité à titre <strong className="text-foreground">non professionnel</strong> par une personne physique :</p>
              <Dl items={[
                { label: "Éditeur", value: EDITEUR.nomPublic },
                { label: "Statut", value: "Personne physique, édition à titre non professionnel" },
                { label: "Pays", value: EDITEUR.pays },
                { label: "Contact", value: <span>Via la plateforme : section « Communauté » → « Contacter Admin »</span> },
              ]} />
              <InfoBox variant="info">
                <p>
                  Conformément à l'<strong>article 6 III 2° de la LCEN</strong>, une personne physique qui édite un site à titre non professionnel peut n'indiquer publiquement que le nom sous lequel elle s'exprime, à la condition d'avoir communiqué ses nom, prénom, domicile et numéro de téléphone à l'hébergeur, qui est tenu au secret professionnel sur ces éléments. Ces informations ont été transmises à l'hébergeur désigné à la section 2.
                </p>
                <p className="mt-2">
                  Le service est fourni <strong>gratuitement</strong>. Aucun abonnement payant n'est proposé et aucun paiement n'est perçu : l'éditeur n'agit donc pas en qualité de professionnel au sens du code de la consommation. Le jour où une offre payante sera ouverte, l'éditeur devra être immatriculé et la présente section publiera son identité complète, son adresse, son numéro SIREN et ses coordonnées directes.
                </p>
              </InfoBox>
            </>
          )}
        </section>

        {/* 2. Hébergement */}
        <section id="hebergement" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="2" id="hebergement-title" title="Hébergement" />
          <p className="text-muted-foreground">L'infrastructure de CaptenTDB (serveurs applicatifs et base de données) est hébergée par :</p>
          <Dl items={[
            { label: "Société", value: HEBERGEUR.societe },
            { label: "Adresse", value: HEBERGEUR.adresse },
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
            Le directeur de la publication au sens de l'article 6 III de la LCEN est <strong className="text-foreground">{EST_PROFESSIONNEL ? (EDITEUR.identite || EDITEUR.nomPublic) : EDITEUR.nomPublic}</strong>, en sa qualité d'éditeur du site.
          </p>
        </section>

        {/* 4. Nature du service */}
        <section id="nature" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="4" id="nature-title" title="Nature du service & avertissement réglementaire" />
          <p className="text-muted-foreground">
            CaptenTDB est une <strong className="text-foreground">plateforme éducative de paper trading</strong> (trading sur portefeuille virtuel avec argent fictif).{" "}
            {EST_PROFESSIONNEL
              ? "Le service est proposé à titre gratuit avec une option d'abonnement Premium."
              : "Le service est proposé intégralement à titre gratuit : aucun abonnement payant n'est ouvert et aucun paiement n'est perçu."}
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
            L'ensemble des éléments constituant le site CaptenTDB, notamment l'interface graphique, le code source, les textes, la logique applicative, le nom et le logo, sont la propriété exclusive de CaptenQwark et sont protégés par le droit de la propriété intellectuelle (code de la propriété intellectuelle, articles L.111-1 et suivants).
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
          {/* Aucune adhésion n'est affirmée tant qu'elle n'a pas été prise : la
              version précédente annonçait l'ANM Conso sans contrat. Et la
              plateforme européenne de règlement en ligne des litiges a fermé
              le 20 juillet 2025 : elle n'est plus citée. */}
          <InfoBox variant="info">
            <p className="mb-2">Conformément aux articles L.611-1 et suivants du code de la consommation, tout consommateur a le droit de recourir gratuitement à un médiateur de la consommation en vue de la résolution amiable d'un litige qui l'oppose à un professionnel.</p>
            {!EST_PROFESSIONNEL ? (
              <p>Sans objet à ce jour : le site est édité à titre non professionnel et ne vend rien.</p>
            ) : e.mediateur.nom ? (
              <p className="font-semibold">{e.mediateur.nom}{e.mediateur.adresse ? `, ${e.mediateur.adresse}` : ""}
                {e.mediateur.site && (<><br /><a href={e.mediateur.site} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1 font-normal">{e.mediateur.site.replace(/^https?:\/\//, "")} <ExternalLink className="w-3 h-3" /></a></>)}
              </p>
            ) : (
              <p>Le médiateur de la consommation sera indiqué ici avant l'ouverture de toute vente.</p>
            )}
          </InfoBox>
        </section>

        {/* 11. CGV */}
        <section id="cgv" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="11" id="cgv-title" title="Conditions générales de vente (résumé)" />
          {/* Un résumé des conditions de vente sur un site qui ne vend rien
              décrit une opération qui n'existe pas, et fait croire à un
              abonnement en vigueur. Il reparaît avec l'offre. */}
          {EST_PROFESSIONNEL ? (
            <>
              <p className="text-muted-foreground">
                L'abonnement Premium est régi par les{" "}
                <Link href="/cgv" className="text-primary hover:underline">conditions générales de vente</Link>.
              </p>
              <Dl items={[
                { label: "Prix", value: `${prixTexte(e.prix_centimes)} TTC / mois, ${e.tva_intracom ? "TVA incluse" : e.mention_tva}` },
                { label: "Paiement", value: "Par carte, via Stripe (PCI-DSS), la carte n'est jamais vue par l'éditeur" },
                { label: "Accès", value: "Immédiat, dès la confirmation du paiement" },
                { label: "Durée", value: "Mensuelle, sans engagement, résiliable en trois clics depuis la page Premium" },
                { label: "Rétractation", value: "14 jours après la souscription, remboursement intégral" },
              ]} />
            </>
          ) : (
            <p className="text-muted-foreground">
              Aucune vente n'est réalisée sur ce site : le service est gratuit, aucun abonnement
              payant n'est proposé et aucune donnée bancaire n'est collectée. Les{" "}
              <Link href="/cgv" className="text-primary hover:underline">conditions générales de vente</Link>{" "}
              sont publiées à titre d'information et n'entreront en vigueur qu'à l'ouverture
              éventuelle d'une offre payante.
            </p>
          )}
        </section>

        {/* 12. Droit applicable */}
        <section id="droit" className="glass-card p-6 space-y-4 scroll-mt-6">
          <LegalSectionTitle num="12" id="droit-title" title="Droit applicable & juridiction compétente" />
          <p className="text-muted-foreground">
            Les présentes mentions légales sont régies par le droit français. En cas de litige relatif à l'interprétation ou à l'exécution des présentes mentions légales, et à défaut de résolution amiable, les tribunaux français seront seuls compétents.
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-white/10">
            <span>Version 1.1, Dernière mise à jour : mai 2026</span>
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
