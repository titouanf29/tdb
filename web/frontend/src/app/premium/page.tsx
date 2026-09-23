"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Crown, Minus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { premiumAPI, type PremiumFeatures, type PremiumLimits } from "@/lib/api";
import { usePremium } from "@/lib/PremiumContext";
import { OFFRE_PAYANTE_OUVERTE, PHRASE_OFFRE_FERMEE } from "@/lib/legal";
import {
  Button, DUR, EASE, Heading, Panel, Reveal, Text,
} from "@/components/design-system";

/**
 * Premium — ce que la formule payante changerait, et où elle en est.
 *
 * L'écran précédent faisait 983 lignes sur l'ancien thème sombre : une héro
 * animée, un badge de prix, un tableau comparatif, un argumentaire, dix
 * questions fréquentes, un formulaire de souscription et un fil de discussion
 * avec l'administrateur. Il vendait, et il vendait fort.
 *
 * Or il n'y a rien à vendre : l'éditeur n'est pas immatriculé, donc l'offre
 * est fermée (voir lib/legal.ts). Une page de vente dont tous les boutons
 * sont désactivés est pire qu'une page sobre — elle promet une transaction
 * qui ne peut pas avoir lieu.
 *
 * Elle devient donc ce qu'elle doit être aujourd'hui : la description d'un
 * niveau d'accès, avec l'état de l'offre dit en une phrase. Et le jour de
 * l'immatriculation, un seul drapeau la fait redevenir une page de vente —
 * le prix, le bouton et les mentions précontractuelles reparaissent sans
 * qu'on réécrive quoi que ce soit.
 *
 * LES CHIFFRES VIENNENT DU SERVEUR. Le tableau comparatif les écrivait à la
 * main, et il a fini par mentir : il annonçait « 3 scans/jour » en gratuit
 * quand le moteur en accorde 1. Ils sont maintenant lus sur l'endpoint qui
 * sert aussi à les faire respecter, réglages d'administration compris.
 */

/* Les lignes du comparatif. Chacune sait lire sa valeur dans les limites que
   le serveur renvoie : aucune n'est recopiée ici. */
const LIGNES: {
  nom: string;
  lire: (l: PremiumLimits) => number | boolean;
  unite?: (v: number) => string;
}[] = [
  { nom: "Scans du marché", lire: (l) => l.scanner_scans_per_day, unite: (v) => `${v} par jour` },
  { nom: "Questions à l'assistant", lire: (l) => l.ai_messages_per_day, unite: (v) => `${v} par jour` },
  { nom: "Positions ouvertes en même temps", lire: (l) => l.max_positions },
  { nom: "Actifs suivis", lire: (l) => l.max_favorites },
  { nom: "Backtest d'une stratégie", lire: (l) => l.backtest_enabled },
  { nom: "Lecture géopolitique", lire: (l) => l.geopolitical_enabled },
  { nom: "Points pivots avancés", lire: (l) => l.advanced_pivots },
  { nom: "Alertes de prix", lire: (l) => l.alerts_enabled },
  { nom: "Calendrier économique", lire: (l) => l.economic_calendar_days, unite: (v) => `${v} jours` },
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
  const { isPremium, isAdmin } = usePremium();
  const [features, setFeatures] = useState<PremiumFeatures | null>(null);
  const [charge, setCharge] = useState(true);
  const [paiement, setPaiement] = useState(false);
  const [erreur, setErreur] = useState("");

  /* Le bouton menait à /settings, c'est-à-dire nulle part : il fallait
     ensuite trouver soi-même comment payer. Il ouvre la session Stripe.

     Le refus du serveur est affiché tel quel, et c'est important : quand
     l'offre est fermée, il répond en français « l'abonnement n'est pas
     ouvert » — un message que l'utilisateur peut comprendre, pas un code. */
  const souscrire = async () => {
    setPaiement(true);
    setErreur("");
    try {
      const { url } = await premiumAPI.createCheckout();
      window.location.href = url;
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le paiement n'a pas pu s'ouvrir.");
      setPaiement(false);
    }
  };

  useEffect(() => {
    premiumAPI.getFeatures()
      .then(setFeatures)
      .catch(() => {})
      .finally(() => setCharge(false));
  }, []);

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

      {/* L'état, avant tout le reste. Quelqu'un qui arrive ici veut d'abord
          savoir où il en est : déjà Premium, ou face à une offre fermée. */}
      <Reveal delay={0.04}>
        {isPremium ? (
          <Panel>
            <div className="flex items-start gap-3.5">
              <Crown className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--cap-amber)" }} />
              <div>
                <Text size="small" tone="ink">
                  {isAdmin
                    ? "Votre compte est administrateur : tous les accès Premium sont ouverts."
                    : "Votre compte dispose de l'accès Premium."}
                </Text>
                <Text size="caption" className="mt-1">
                  Les limites ci-dessous ne s&apos;appliquent donc pas à vous.
                </Text>
              </div>
            </div>
          </Panel>
        ) : OFFRE_PAYANTE_OUVERTE ? (
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <Text size="small" tone="ink">5,00 € TTC par mois, résiliable à tout moment.</Text>
                <Text size="caption" className="mt-1">
                  Droit de rétractation de 14 jours · paiement par Stripe ·{" "}
                  <Link href="/cgv" className="underline underline-offset-2" style={{ color: "var(--cap-ocean)" }}>
                    conditions de vente
                  </Link>
                </Text>
              </div>
              <Button size="md" onClick={souscrire} disabled={paiement}>
                {paiement ? "Ouverture du paiement…" : "Souscrire"}
              </Button>
            </div>
            {erreur && <Text size="caption" tone="down" className="mt-3">{erreur}</Text>}
          </Panel>
        ) : (
          <Panel>
            <Text size="small" tone="ink">L&apos;abonnement n&apos;est pas ouvert</Text>
            <Text size="small" className="mt-1.5">{PHRASE_OFFRE_FERMEE}</Text>
          </Panel>
        )}
      </Reveal>

      <Reveal delay={0.08}>
        <Panel
          title={OFFRE_PAYANTE_OUVERTE ? "Ce qui change, ligne par ligne" : "Ce que l'accès Premium ouvrira"}
          hint={
            OFFRE_PAYANTE_OUVERTE
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
            /* DEUX COLONNES IDENTIQUES NE COMPARENT RIEN. L'offre étant
               fermée, le serveur accorde aux comptes gratuits les limites
               Premium : le tableau afficherait donc deux fois la même chose,
               ce qui se lit comme un bug. On montre alors ce que le niveau
               Premium ouvrira, en une seule colonne. */
            <Comparatif features={features} colonneUnique={!OFFRE_PAYANTE_OUVERTE} />
          )}
        </Panel>
      </Reveal>

      <Reveal delay={0.12}>
        <Panel title="Les questions qui reviennent">
          <div className="flex flex-col gap-1">
            {QUESTIONS.map((x) => <Question key={x.q} {...x} />)}
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
