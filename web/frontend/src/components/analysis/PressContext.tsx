"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Loader2, Newspaper } from "lucide-react";
import { intelAPI, type IntelContext, type IntelEvenement } from "@/lib/api";
import { DUR, EASE, Panel, Text } from "@/components/design-system";

/**
 * Ce que la presse dit de cet actif — la façade du moteur d'intelligence.
 *
 * LE PANNEAU S'AFFICHE TOUJOURS, même quand le moteur n'a rien trouvé, et
 * c'est une décision de fond. Un module qui n'apparaît que lorsqu'il a quelque
 * chose à dire laisse croire, le reste du temps, que la presse n'est pas lue.
 * L'utilisateur doit savoir que l'analyse en tient compte — y compris quand la
 * réponse est « rien ne relie cet actif à l'actualité du moment ». Un silence
 * qu'on sait mesuré vaut une information ; un silence dont on ignore la portée
 * n'en vaut aucune.
 *
 * D'où le bandeau du bas, qui dit ce qui a été lu : soixante-dix articles de
 * six rédactions, trois dossiers suivis. Sans ce chiffre, « rien à signaler »
 * pourrait tout aussi bien vouloir dire « le service est en panne ».
 *
 * LE MÉCANISME EST REPLIÉ PAR DÉFAUT. Chaque événement se lit en deux lignes ;
 * la chaîne de raisonnement complète, l'horizon et les réserves attendent un
 * clic. C'est la demande explicite faite sur l'assistant — « bien voir les
 * informations sans que ça prenne trop de place » — et elle vaut ici : un
 * écran d'analyse a déjà un graphique, un verdict et un plan de risque.
 */

/* Le niveau de certitude, dit en français et sans jargon. L'échelle interne
   est en anglais parce qu'elle vient du cahier des charges ; elle n'a aucune
   raison de remonter jusqu'à l'écran. */
const NIVEAUX: Record<string, { mot: string; ton: "up" | "down" | "faint" | "muted" }> = {
  CONFIRMED: { mot: "Confirmé", ton: "up" },
  PROBABLE: { mot: "Probable", ton: "muted" },
  POSSIBLE: { mot: "Possible", ton: "muted" },
  UNCERTAIN: { mot: "Incertain", ton: "faint" },
  DISPUTED: { mot: "Contesté", ton: "down" },
  FALSE: { mot: "Démenti", ton: "down" },
};

/* Le panier d'actifs par lequel l'événement atteint celui qu'on regarde.
   Les clés viennent du moteur, en majuscules et sans accents ; les afficher
   telles quelles donnait « touche cet actif via energie ». */
const CIBLES: Record<string, string> = {
  PETROLE: "le pétrole",
  ENERGIE: "le secteur de l'énergie",
  OR: "l'or et les valeurs refuges",
  TRANSPORT: "le transport et la logistique",
  BANQUES: "les banques",
  TECH: "la technologie",
  IMMOBILIER: "l'immobilier",
};

function ageEnMots(heures: number): string {
  if (heures < 1) return "il y a moins d'une heure";
  if (heures < 24) return `il y a ${Math.round(heures)} h`;
  const jours = Math.round(heures / 24);
  return jours <= 1 ? "hier" : `il y a ${jours} jours`;
}

function luEnMots(iso: string | null): string {
  if (!iso) return "";
  const min = (Date.now() - new Date(iso).getTime()) / 60000;
  if (!Number.isFinite(min) || min < 0) return "";
  if (min < 2) return "à l'instant";
  if (min < 60) return `il y a ${Math.round(min)} min`;
  return `il y a ${Math.round(min / 60)} h`;
}

export function PressContext({
  symbol,
  variationPct,
  volumeRatio,
  volatiliteJour,
}: {
  symbol: string;
  /** La variation de la séance, telle que l'analyse l'a déjà mesurée. */
  variationPct?: number;
  volumeRatio?: number;
  /** L'amplitude typique d'une séance, qui sert de seuil de réaction. */
  volatiliteJour?: number;
}) {
  const [data, setData] = useState<IntelContext | null>(null);
  const [erreur, setErreur] = useState(false);
  const reduit = useReducedMotion();

  useEffect(() => {
    let vivant = true;
    setData(null);
    setErreur(false);
    intelAPI
      .forSymbol(symbol, { variationPct, volumeRatio, volatiliteJour })
      .then((d) => { if (vivant) setData(d); })
      .catch(() => { if (vivant) setErreur(true); });
    return () => { vivant = false; };
    // Le contexte ne se recharge pas à chaque tick de prix : les flux bougent
    // toutes les quelques minutes, le prix toutes les secondes. Il suit
    // l'actif, pas la cotation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const veille = data?.veille;

  return (
    <Panel
      title="Ce que dit la presse"
      hint="Les faits de l'actualité reliés à cet actif par un mécanisme économique nommé — et ce que le marché en a fait."
      aside={
        <span className="flex items-center gap-1.5">
          <Newspaper size={15} aria-hidden style={{ color: "var(--cap-ink-4)" }} />
          {!data && !erreur && (
            <Loader2 size={14} className="animate-spin" aria-hidden
                     style={{ color: "var(--cap-ink-4)" }} />
          )}
        </span>
      }
    >
      {erreur ? (
        <Text size="small">
          La lecture de la presse est momentanément indisponible. Le reste de
          l&apos;analyse n&apos;en dépend pas.
        </Text>
      ) : !data ? (
        <Text size="small">Lecture des flux de presse…</Text>
      ) : (
        <>
          {/* Le résumé du moteur ne s'affiche que lorsqu'il a trouvé quelque
              chose. Sinon il doublait la phrase d'en dessous : « rien ne se
              rattache à cet actif », puis « rien de tel dans l'actualité ».
              Deux façons de dire la même absence, ce qui la fait paraître
              plus grave qu'elle ne l'est. */}
          {(data.couvert || data.indisponible) && (
            <Text size="small" tone="ink">{data.resume}</Text>
          )}

          {data.couvert ? (
            <div className="mt-4 flex flex-col gap-2.5">
              {/* Plusieurs événements empruntent souvent le MÊME canal —
                  quatre faits différents qui atteignent une compagnie
                  aérienne par le coût du carburant. Répéter la même phrase
                  d'effet quatre fois donnait quatre cartes qui se lisaient
                  comme un copier-coller, et noyait ce qui les distingue : le
                  fait, sa certitude, son âge. L'effet est donc dit à sa
                  première apparition. */}
              {data.evenements.map((e, i) => (
                <Evenement
                  key={`${e.titre}-${i}`}
                  e={e}
                  reduit={!!reduit}
                  repetition={data.evenements
                    .slice(0, i)
                    .some((p) => p.cible === e.cible && p.sens === e.sens)}
                  dansLeResume={i === 0}
                />
              ))}
            </div>
          ) : data.surveille.length > 0 ? (
            /* Le moteur n'a rien trouvé, mais il sait sur QUOI il n'a rien
               trouvé. Le dire transforme une absence en information. */
            <Text size="small" tone="ink">
              Pour cet actif, le moteur surveille {liste(data.surveille)}. Rien
              de tel dans l&apos;actualité en ce moment.
            </Text>
          ) : (
            <Text size="small" tone="ink">
              Cet actif n&apos;est rattaché à aucun des thèmes que le moteur
              sait relier à un marché — chocs pétroliers, politique monétaire,
              barrières douanières, conflits. Son analyse reste technique et
              fondamentale.
            </Text>
          )}

          {veille && veille.articles > 0 && (
            <div
              className="mt-4 border-t pt-3"
              style={{ borderColor: "var(--cap-line)" }}
            >
              <Text size="caption" tone="faint">
                {veille.articles} articles de {veille.redactions} rédactions lus{" "}
                {luEnMots(veille.lu_a)} · {veille.dossiers}{" "}
                {veille.dossiers > 1 ? "dossiers suivis" : "dossier suivi"} dans
                l&apos;ensemble des marchés. Un événement n&apos;est retenu que
                si un mécanisme connu le relie à un actif.
              </Text>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

function Evenement({
  e,
  reduit,
  repetition,
  dansLeResume,
}: {
  e: IntelEvenement;
  reduit: boolean;
  /** Un événement plus haut atteint déjà cet actif par le même canal. */
  repetition: boolean;
  /** Le résumé en tête de panneau a déjà expliqué ce rattachement. */
  dansLeResume: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const niveau = NIVEAUX[e.niveau] ?? { mot: e.niveau, ton: "faint" as const };
  const sensMot = e.conteste
    ? "effet contesté"
    : e.sens > 0 ? "plutôt favorable"
    : e.sens < 0 ? "plutôt défavorable"
    : "sans sens tranché";
  const sensCouleur = e.conteste || e.sens === 0
    ? "var(--cap-ink-3)"
    : e.sens > 0 ? "var(--cap-up)" : "var(--cap-down)";

  return (
    <div
      className="overflow-hidden"
      style={{
        borderRadius: "var(--cap-r-md)",
        backgroundColor: "var(--cap-bg)",
      }}
    >
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        className="flex w-full items-start gap-3 px-3.5 py-3 text-left"
      >
        {/* Le trait de sens plutôt qu'une pastille pleine : sur un fond clair,
            un aplat saturé de cette taille passe sous le seuil de contraste
            dès qu'on y pose du texte à côté. */}
        <span
          aria-hidden
          className="mt-[0.3rem] h-9 w-[3px] shrink-0 rounded-full"
          style={{
            backgroundColor:
              e.conteste || e.sens === 0 ? "var(--cap-ink-4)"
              : e.sens > 0 ? "var(--cap-up)" : "var(--cap-down)",
          }}
        />
        <span className="min-w-0 flex-1">
          <Text size="small" tone="ink" as="span" className="block">
            {e.titre}
          </Text>
          {/* L'IMPACT EST VISIBLE SANS OUVRIR. Replié, ce bloc disait
              seulement « plutôt favorable » : le lecteur devait cliquer pour
              savoir pourquoi, et ce pourquoi est la seule raison d'être du
              panneau. La chaîne de raisonnement, elle, peut rester derrière
              un clic — c'est le détail, pas la conclusion. */}
          <Text size="caption" as="span" className="mt-1 block">
            <span style={{ color: sensCouleur }}>{sensMot}</span>
            {e.effet && !repetition && (
              <span style={{ color: "var(--cap-ink-2)" }}> — {e.effet}</span>
            )}
            {repetition && (
              <span style={{ color: "var(--cap-ink-3)" }}>
                {" "}— par le même canal
              </span>
            )}
          </Text>
          <Text size="caption" tone="faint" as="span" className="mt-0.5 block">
            {niveau.mot.toLowerCase()}
            {" · "}
            {e.voix > 1 ? `${e.voix} rédactions indépendantes` : "une seule rédaction"}
            {e.age_heures >= 1 && ` · ${ageEnMots(e.age_heures)}`}
          </Text>
        </span>
        <ChevronDown
          size={15}
          aria-hidden
          className="mt-[0.35rem] shrink-0 transition-transform"
          style={{
            color: "var(--cap-ink-4)",
            transform: ouvert ? "rotate(180deg)" : "none",
          }}
        />
      </button>

      <AnimatePresence initial={false}>
        {ouvert && (
          <motion.div
            initial={reduit ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduit ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: DUR.base, ease: EASE }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="border-t px-3.5 pb-3.5 pt-3"
              style={{ borderColor: "var(--cap-line)" }}
            >
              {/* Ce qui rattache CET actif au panier exposé. Sans cette
                  ligne, le lecteur doit deviner pourquoi une histoire de
                  détroit maritime concerne l'action qu'il regarde. */}
              {e.pourquoi && !dansLeResume && (
                <Text size="caption" className="mb-3">
                  Il est concerné parce {queOuQu(e.pourquoi)}.
                </Text>
              )}
              {repetition && e.effet && (
                <Text size="caption" className="mb-3">
                  Effet sur cet actif : {e.effet}.
                </Text>
              )}

              {/* LE MÉCANISME, PAS UNE ÉTIQUETTE. « Sentiment : négatif »
                  n'explique rien et ne se conteste pas. Une chaîne se lit,
                  se discute, et tombe si l'un de ses maillons ne tient pas —
                  c'est ce qui la rend utile à quelqu'un qui apprend. */}
              <Text size="caption" tone="faint" className="mb-1.5">
                Par quel chemin cela atteint cet actif
              </Text>
              <ol className="flex flex-col gap-1">
                {e.mecanisme.map((etape, i) => (
                  <li key={i} className="flex items-baseline gap-2">
                    <Text size="caption" tone="faint" as="span"
                          className="shrink-0 tabular-nums">
                      {i + 1}.
                    </Text>
                    <Text size="caption" as="span">{etape}</Text>
                  </li>
                ))}
              </ol>

              <Text size="caption" tone="faint" className="mt-2.5">
                {e.qualite_mecanisme} · {e.horizon} · atteint cet actif par{" "}
                {CIBLES[e.cible] ?? e.cible.toLowerCase()}
              </Text>

              {/* De quoi contredire ce qu'on vient de lire. C'est ce qui
                  sépare un panneau d'analyse d'un oracle : la chaîne annonce
                  un effet, cette ligne dit où aller vérifier qu'il se
                  produit — ou constater qu'il ne se produit pas. */}
              {e.a_surveiller && (
                <Text size="caption" className="mt-2">
                  À surveiller pour vérifier : {e.a_surveiller}.
                </Text>
              )}

              {e.reserve && (
                <Text size="caption" className="mt-2">⚠ {e.reserve}</Text>
              )}

              {/* La confrontation au prix : la seule couche du moteur qui se
                  laisse contredire par un fait observable. */}
              {e.marche && e.marche.etat !== "sans attente" && (
                <div
                  className="mt-3 rounded-[10px] px-3 py-2.5"
                  style={{ backgroundColor: "var(--cap-surface)" }}
                >
                  <Text size="caption" tone="ink">{e.marche.phrase}</Text>
                  {e.marche.lectures.map((l, i) => (
                    <Text key={i} size="caption" className="mt-1">— {l}</Text>
                  ))}
                </div>
              )}

              {e.changements.length > 0 && (
                <Text size="caption" tone="faint" className="mt-2">
                  Depuis la dernière lecture : {e.changements.join(" · ")}
                </Text>
              )}

              {e.raisons.length > 0 && (
                <Text size="caption" tone="faint" className="mt-2">
                  Niveau de certitude « {niveau.mot.toLowerCase()} » :{" "}
                  {e.raisons.join(", ")}.
                </Text>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** « parce qu'il tire… » mais « parce que c'est une banque ». */
function queOuQu(phrase: string): string {
  return /^[aeiouyâàéèêëîïôöûù]/i.test(phrase) ? `qu'${phrase}` : `que ${phrase}`;
}

function liste(mots: string[]): string {
  if (mots.length === 1) return mots[0];
  return `${mots.slice(0, -1).join(", ")} et ${mots[mots.length - 1]}`;
}
