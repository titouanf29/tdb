"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, ChevronDown, Crown, Minus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { premiumAPI, type PremiumFeatures, type PremiumLimits, type PremiumStatus } from "@/lib/api";
import { usePremium } from "@/lib/PremiumContext";
import { PHRASE_OFFRE_FERMEE } from "@/lib/legal";
import {
  Button, Checkbox, DUR, EASE, Heading, Nimbo, Panel, Reveal, Text,
} from "@/components/design-system";

/**
 * Premium — l'offre, et la gestion de l'abonnement.
 *
 * L'ÉTAT DE L'OFFRE VIENT DU SERVEUR (backend api/legal.py). Elle n'ouvre
 * que quand l'éditeur est immatriculé ET que tout ce qu'une vente exige est
 * en place (identité, SIREN, médiateur, Stripe). D'ici là, la page décrit le
 * niveau d'accès sans rien vendre. Avec une clé Stripe de test, un
 * administrateur peut essayer tout le parcours avec les cartes de test.
 *
 * Ce qu'un abonné doit pouvoir faire SANS écrire à personne, parce que la loi
 * l'exige ou parce que c'est la moindre des choses :
 *   · résilier en trois clics (art. L.215-1-1 du code de la consommation) —
 *     page Premium, « Résilier », « Confirmer » ;
 *   · se rétracter dans les 14 jours, remboursé en entier ;
 *   · changer de carte et télécharger ses factures (portail Stripe).
 *
 * LES CHIFFRES DU COMPARATIF VIENNENT DU SERVEUR qui les fait respecter. Il
 * n'y figure que ce qui est vraiment limité ET visible quelque part sur le
 * site : une ligne « backtest » ou « calendrier sur 30 jours » promettait des
 * écrans qui n'existent plus.
 */

const LIGNES: {
  nom: string;
  lire: (l: PremiumLimits) => number | boolean;
  unite?: (v: number) => string;
}[] = [
  { nom: "Scans du marché", lire: (l) => l.scanner_scans_per_day, unite: (v) => `${v} par jour` },
  { nom: "Questions à l'assistant", lire: (l) => l.ai_messages_per_day, unite: (v) => `${v} par jour` },
  { nom: "Positions ouvertes en même temps", lire: (l) => l.max_positions },
  { nom: "Actifs suivis", lire: (l) => l.max_favorites },
];

const euros = (c: number) => (c % 100 === 0 ? `${c / 100} €` : `${(c / 100).toFixed(2).replace(".", ",")} €`);
const jour = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";

const QUESTIONS_ABONNEMENT: { q: string; r: React.ReactNode }[] = [
  {
    q: "Comment résilier ?",
    r: "Ici même : « Résilier mon abonnement », puis « Confirmer ». L'accès reste ouvert jusqu'à la fin du mois déjà payé, et plus rien n'est prélevé ensuite. Vous pouvez changer d'avis jusqu'à cette date.",
  },
  {
    q: "Et si je change d'avis juste après avoir payé ?",
    r: "Pendant 14 jours après la souscription, « Me rétracter » arrête l'abonnement et vous rembourse en entier, sans justification.",
  },
  {
    q: "Où sont mes factures ?",
    r: "Dans « Gérer le paiement et les factures » : c'est le portail de Stripe, notre prestataire de paiement. Vous y changez aussi de carte. CaptenTDB ne voit jamais votre numéro de carte.",
  },
];

const QUESTIONS: { q: string; r: React.ReactNode }[] = [
  {
    q: "L'argent du wallet est-il réel ?",
    r: "Non. CaptenTDB est un simulateur : le solde, les positions et les résultats sont fictifs. Rien de ce qui se passe ici ne touche un compte bancaire ou un compte-titres.",
  },
  {
    q: "Les analyses sont-elles des conseils en investissement ?",
    r: (
      <>
        Non, et ce n&apos;est pas une précaution de style : CaptenTDB n&apos;est pas un
        prestataire de services d&apos;investissement et n&apos;est agréé par aucun
        régulateur. Tout ce que le site produit est éducatif. Le détail est dans les{" "}
        <Link href="/mentions-legales" className="underline underline-offset-2" style={{ color: "var(--cap-ocean)" }}>
          mentions légales
        </Link>.
      </>
    ),
  },
  {
    q: "Que se passe-t-il si je dépasse une limite ?",
    r: "Rien ne se casse : l'action est refusée avec un message qui dit laquelle, et le compteur repart le lendemain pour ce qui se compte par jour.",
  },
  {
    q: "Mes données sont-elles revendues ?",
    r: (
      <>
        Non. Aucun traceur publicitaire, aucun outil de mesure d&apos;audience, aucune
        revente. Ce qui est collecté et pourquoi est listé dans la{" "}
        <Link href="/politique-de-confidentialite" className="underline underline-offset-2" style={{ color: "var(--cap-ocean)" }}>
          politique de confidentialité
        </Link>.
      </>
    ),
  },
];

export default function PremiumPage() {
  return (
    <Suspense fallback={null}>
      <PremiumContenu />
    </Suspense>
  );
}

function PremiumContenu() {
  const params = useSearchParams();
  const { refresh } = usePremium();
  const [statut, setStatut] = useState<PremiumStatus | null>(null);
  const [features, setFeatures] = useState<PremiumFeatures | null>(null);
  const [charge, setCharge] = useState(true);
  const bienvenue = params.get("bienvenue") === "1";

  const relire = useCallback(async () => {
    const s = await premiumAPI.getStatus().catch(() => null);
    if (s) setStatut(s);
    refresh?.();
    return s;
  }, [refresh]);

  useEffect(() => {
    Promise.allSettled([relire(), premiumAPI.getFeatures().then(setFeatures)]).finally(() => setCharge(false));
  }, [relire]);

  /* Au retour de Stripe, l'activation arrive par le webhook, parfois
     quelques secondes APRÈS la redirection : on relit l'état jusqu'à la voir
     plutôt que d'afficher « vous n'êtes pas Premium » à quelqu'un qui vient
     de payer. */
  useEffect(() => {
    if (!bienvenue) return;
    let n = 0;
    const t = setInterval(async () => {
      n += 1;
      const s = await relire();
      if (s?.abonnement?.en_cours || n >= 10) clearInterval(t);
    }, 2000);
    return () => clearInterval(t);
  }, [bienvenue, relire]);

  const offre = statut?.offre;
  const abo = statut?.abonnement;
  const ouverte = !!offre?.ouverte;
  const peutPayer = ouverte || !!offre?.essai_admin;
  const comparer = ouverte || !!offre?.essai_admin;

  return (
    <div className="flex flex-col gap-8">
      <Reveal>
        <header className="pt-2">
          <Heading level={1}>Premium</Heading>
          <Text className="mt-2.5 max-w-[42rem]">
            Un niveau d&apos;accès, pas un autre produit. Les mêmes écrans, les mêmes
            analyses — sans les limites que le compte gratuit impose sur ce qui coûte
            cher à calculer.
          </Text>
        </header>
      </Reveal>

      {bienvenue && (
        <Reveal>
          <Panel>
            <div className="flex items-center gap-3">
              <Nimbo humeur="fete" taille={64} className="-my-1 shrink-0" />
              <div>
                <Text tone="ink">
                  {abo?.en_cours ? "Bienvenue en Premium — votre abonnement est actif." : "Paiement reçu, j'active votre accès…"}
                </Text>
                <Text size="caption" className="mt-1">
                  Un e-mail de confirmation vous a été envoyé, avec les conditions et le droit de rétractation.
                </Text>
              </div>
            </div>
          </Panel>
        </Reveal>
      )}

      <Reveal delay={0.04}>
        {charge ? (
          <Panel><Text size="small">Lecture de votre accès…</Text></Panel>
        ) : abo?.en_cours ? (
          <GestionAbonnement statut={statut!} relire={relire} />
        ) : statut?.is_premium && !offre?.essai_admin ? (
          <Panel>
            <div className="flex items-start gap-3.5">
              <Crown className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--cap-amber)" }} />
              <div>
                <Text size="small" tone="ink">
                  {statut.is_admin
                    ? "Votre compte est administrateur : tous les accès Premium sont ouverts."
                    : "Votre compte dispose de l'accès Premium."}
                </Text>
                <Text size="caption" className="mt-1">Les limites ci-dessous ne s&apos;appliquent donc pas à vous.</Text>
              </div>
            </div>
          </Panel>
        ) : peutPayer && offre ? (
          <Offre prixCentimes={offre.prix_centimes} essai={!ouverte} />
        ) : (
          <Panel>
            <Text size="small" tone="ink">L&apos;abonnement n&apos;est pas ouvert</Text>
            <Text size="small" className="mt-1.5">{PHRASE_OFFRE_FERMEE}</Text>
          </Panel>
        )}
      </Reveal>

      <Reveal delay={0.08}>
        <Panel
          title={comparer ? "Ce qui change, ligne par ligne" : "Ce que l'accès Premium ouvrira"}
          hint={
            comparer
              ? "Les chiffres sont lus sur le serveur qui les fait respecter — pas recopiés ici."
              : "Tant que l'abonnement n'est pas ouvert, ces limites ne s'appliquent à personne : tous les comptes ont l'accès complet."
          }
        >
          {charge ? (
            <Text size="small">Lecture des limites…</Text>
          ) : !features ? (
            <Text size="small">
              Les limites n&apos;ont pas pu être lues. Elles restent celles appliquées
              par le moteur, qui vous préviendra si vous en atteignez une.
            </Text>
          ) : (
            <Comparatif
              features={offre?.essai_admin && !ouverte && features.free_ouverture ? { ...features, free: features.free_ouverture } : features}
              colonneUnique={!comparer}
            />
          )}
        </Panel>
      </Reveal>

      <Reveal delay={0.12}>
        <Panel title="Les questions qui reviennent">
          <div className="flex flex-col gap-1">
            {(peutPayer || abo ? [...QUESTIONS_ABONNEMENT, ...QUESTIONS] : QUESTIONS).map((x) => <Question key={x.q} {...x} />)}
          </div>
        </Panel>
      </Reveal>

      <Reveal delay={0.16}>
        <Text size="caption" tone="faint" className="text-center">
          <Link href="/mentions-legales" className="underline underline-offset-2">Mentions légales</Link>
          {" · "}
          <Link href="/cgu" className="underline underline-offset-2">CGU</Link>
          {" · "}
          <Link href="/cgv" className="underline underline-offset-2">CGV</Link>
          {" · "}
          <Link href="/politique-de-confidentialite" className="underline underline-offset-2">Confidentialité</Link>
        </Text>
      </Reveal>
    </div>
  );
}

/**
 * L'offre, et la commande. Le bouton dit qu'il engage à payer (art. L.221-14
 * du code de la consommation : « commande avec obligation de paiement » ou
 * une formule équivalente sans ambiguïté), et il reste grisé tant que les CGV
 * ne sont pas acceptées — acceptation que le serveur garde en preuve.
 */
function Offre({ prixCentimes, essai }: { prixCentimes: number; essai: boolean }) {
  const [cgv, setCgv] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  const prix = euros(prixCentimes);

  const souscrire = async () => {
    setOccupe(true);
    setErreur("");
    try {
      const { url } = await premiumAPI.createCheckout(cgv);
      window.location.href = url;
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le paiement n'a pas pu s'ouvrir.");
      setOccupe(false);
    }
  };

  return (
    <Panel>
      {essai && (
        <p className="mb-4 rounded-[10px] px-3 py-2 text-[0.8rem]"
          style={{ backgroundColor: "color-mix(in srgb, var(--cap-amber) 12%, transparent)", color: "var(--cap-ink)" }}>
          Mode test Stripe — visible par les administrateurs seulement. Aucun paiement réel : utilisez la carte
          4242 4242 4242 4242, une date future et n&apos;importe quel code.
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="cap-num text-[2rem] font-semibold leading-none" style={{ color: "var(--cap-ink)" }}>
            {prix}<span className="text-[1rem] font-normal" style={{ color: "var(--cap-ink-3)" }}> TTC par mois</span>
          </p>
          <Text size="small" className="mt-2 max-w-[32rem]">
            Sans engagement : résiliable en trois clics depuis cette page, l&apos;accès reste ouvert jusqu&apos;à la
            fin du mois payé. Rétractation possible pendant 14 jours, remboursée en entier.
          </Text>
        </div>
      </div>
      <Checkbox checked={cgv} onChange={setCgv} className="mt-5">
        <Text size="small" as="span">
          J&apos;ai lu et j&apos;accepte les{" "}
          <Link href="/cgv" target="_blank" className="underline underline-offset-2" style={{ color: "var(--cap-ocean)" }}>
            conditions générales de vente
          </Link>.
        </Text>
      </Checkbox>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Button size="lg" onClick={souscrire} disabled={!cgv || occupe}>
          {occupe ? "Ouverture du paiement…" : `S'abonner — payer ${prix} par mois`}
        </Button>
        <Text size="caption" as="span">Paiement sécurisé par Stripe. Votre carte n&apos;est jamais vue par CaptenTDB.</Text>
      </div>
      {erreur && <Text size="caption" tone="down" className="mt-3">{erreur}</Text>}
    </Panel>
  );
}

/** L'abonnement en cours : où il en est, et tout ce qu'on peut en faire. */
function GestionAbonnement({ statut, relire }: { statut: PremiumStatus; relire: () => Promise<unknown> }) {
  const abo = statut.abonnement!;
  const [confirmer, setConfirmer] = useState<null | "resilier" | "retracter">(null);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");

  const agir = async (f: () => Promise<unknown>, ok: string) => {
    setOccupe(true); setErreur(""); setMessage("");
    try { await f(); setMessage(ok); setConfirmer(null); await relire(); }
    catch (e) { setErreur(e instanceof Error ? e.message : "L'action a échoué. Réessayez."); }
    finally { setOccupe(false); }
  };
  const portail = async () => {
    setOccupe(true); setErreur("");
    try { const { url } = await premiumAPI.portail(); window.location.href = url; }
    catch (e) { setErreur(e instanceof Error ? e.message : "Le portail n'a pas pu s'ouvrir."); setOccupe(false); }
  };

  const etat =
    abo.statut === "annulation_programmee"
      ? { titre: "Résiliation programmée", texte: `Votre accès Premium reste ouvert jusqu'au ${jour(abo.fin_periode)}. Plus rien ne sera prélevé.`, ton: "var(--cap-amber)" }
      : abo.statut === "impaye"
        ? { titre: "Le dernier paiement a échoué", texte: "Stripe va réessayer dans les prochains jours. Mettez à jour votre carte pour garder l'accès.", ton: "var(--cap-down)" }
        : { titre: "Abonnement actif", texte: abo.fin_periode ? `Prochain renouvellement le ${jour(abo.fin_periode)}.` : "Renouvelé automatiquement chaque mois.", ton: "var(--cap-up)" };

  return (
    <Panel title="Votre abonnement">
      <div className="flex items-start gap-3.5">
        <Crown className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--cap-amber)" }} />
        <div className="min-w-0">
          <Text tone="ink"><span style={{ color: etat.ton }}>●</span> {etat.titre}</Text>
          <Text size="small" className="mt-1">{etat.texte}</Text>
          {abo.retractation_possible && abo.retractation_jusquau && (
            <Text size="caption" className="mt-1">
              Vous pouvez encore vous rétracter, remboursé en entier, jusqu&apos;au {jour(abo.retractation_jusquau)}.
            </Text>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2.5">
        {abo.portail && (
          <Button variant="secondary" size="md" onClick={portail} disabled={occupe}>Gérer le paiement et les factures</Button>
        )}
        {abo.statut === "annulation_programmee" ? (
          <Button size="md" onClick={() => agir(premiumAPI.reprendre, "Votre abonnement continue : la résiliation est annulée.")} disabled={occupe}>
            Garder mon abonnement
          </Button>
        ) : (
          <Button variant="secondary" size="md" onClick={() => setConfirmer("resilier")} disabled={occupe}>Résilier mon abonnement</Button>
        )}
        {abo.retractation_possible && (
          <Button variant="secondary" size="md" onClick={() => setConfirmer("retracter")} disabled={occupe}>Me rétracter</Button>
        )}
      </div>

      {confirmer && (
        <div className="mt-4 rounded-[12px] p-4" style={{ boxShadow: "inset 0 0 0 1px var(--cap-line-strong)" }}>
          <Text size="small" tone="ink">
            {confirmer === "resilier"
              ? `Résilier ? Vous gardez l'accès jusqu'au ${jour(abo.fin_periode) || "terme du mois payé"}, puis plus rien n'est prélevé. Vous pourrez revenir sur votre décision d'ici là.`
              : "Se rétracter ? L'abonnement s'arrête tout de suite et vous êtes remboursé en entier, sur la carte utilisée (quelques jours selon la banque)."}
          </Text>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <Button size="md" disabled={occupe}
              onClick={() => confirmer === "resilier"
                ? agir(premiumAPI.resilier, "C'est noté : votre abonnement s'arrêtera à la fin du mois payé.")
                : agir(premiumAPI.retractation, "Rétractation enregistrée : le remboursement est lancé.")}>
              {occupe ? "…" : confirmer === "resilier" ? "Confirmer la résiliation" : "Confirmer la rétractation"}
            </Button>
            <Button variant="secondary" size="md" onClick={() => setConfirmer(null)} disabled={occupe}>Annuler</Button>
          </div>
        </div>
      )}
      {message && <Text size="small" className="mt-3" tone="ink">{message}</Text>}
      {erreur && <Text size="caption" tone="down" className="mt-3">{erreur}</Text>}
    </Panel>
  );
}

function Comparatif({
  features,
  colonneUnique,
}: {
  features: PremiumFeatures;
  colonneUnique?: boolean;
}) {
  /* « Illimité » plutôt que « -1 ». Le serveur code l'absence de limite par
     un nombre négatif, ce qui est commode pour lui et illisible ici. */
  const dire = (v: number | boolean, unite?: (n: number) => string) => {
    if (typeof v === "boolean") return v;
    if (v < 0) return "Sans limite";
    return unite ? unite(v) : String(v);
  };

  const grille = colonneUnique
    ? "grid-cols-[minmax(0,1fr)_7rem] sm:grid-cols-[minmax(0,1fr)_10rem]"
    : "grid-cols-[minmax(0,1fr)_5.5rem_6.5rem] sm:grid-cols-[minmax(0,1fr)_8rem_9rem]";

  return (
    <div>
      <div
        className={`grid ${grille} gap-x-3 pb-2`}
        style={{ borderBottom: "1px solid var(--cap-line)" }}
      >
        <span />
        {!colonneUnique && (
          <Text size="caption" tone="faint" as="span" className="text-center">Gratuit</Text>
        )}
        <Text size="caption" as="span" className="text-center">
          <span style={{ color: "var(--cap-amber)" }}>Premium</span>
        </Text>
      </div>

      {LIGNES.map((l) => {
        const gratuit = dire(l.lire(features.free), l.unite);
        const premium = dire(l.lire(features.premium), l.unite);
        return (
          <div
            key={l.nom}
            className={`grid ${grille} items-center gap-x-3 py-2.5`}
            style={{ borderBottom: "1px solid var(--cap-line)" }}
          >
            <Text size="small" as="span">{l.nom}</Text>
            {!colonneUnique && (
              <span className="text-center"><Valeur v={gratuit} /></span>
            )}
            <span className="text-center"><Valeur v={premium} fort /></span>
          </div>
        );
      })}
    </div>
  );
}

function Valeur({ v, fort }: { v: string | boolean; fort?: boolean }) {
  if (v === true) {
    return <Check className="mx-auto h-4 w-4" style={{ color: "var(--cap-up)" }} aria-label="inclus" />;
  }
  if (v === false) {
    /* Un tiret, pas une croix rouge. Une absence dans la formule gratuite
       n'est pas une erreur, et le rouge est réservé à la direction des
       marchés partout ailleurs sur ce site. */
    return <Minus className="mx-auto h-4 w-4" style={{ color: "var(--cap-ink-4)" }} aria-label="non inclus" />;
  }
  return (
    <Text size="small" as="span" tone={fort ? "ink" : "muted"}>{v}</Text>
  );
}

function Question({ q, r }: { q: string; r: React.ReactNode }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--cap-line)" }}>
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        className="flex w-full items-center justify-between gap-4 py-3 text-left"
      >
        <Text size="small" tone="ink" as="span">{q}</Text>
        <ChevronDown
          className="h-4 w-4 shrink-0 transition-transform duration-200"
          style={{ color: "var(--cap-ink-4)", transform: ouvert ? "rotate(180deg)" : undefined }}
        />
      </button>
      <AnimatePresence initial={false}>
        {ouvert && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DUR.base, ease: EASE }}
            style={{ overflow: "hidden" }}
          >
            <Text size="small" className="pb-3.5">{r}</Text>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
