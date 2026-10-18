"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/lib/useProfile";
import { GOALS, MARKETS, TIMES } from "@/lib/profileQuestions";
import type { TradingLevel } from "@/lib/auth";
import {
  Button, FormError, Heading, Modal, Nimbo, Text, DUR, EASE, useMouvementReduit,
} from "@/components/design-system";

/** Mémorise un refus, pour que la question ne revienne pas à chaque page. */
export const DISMISSED_KEY = "tdb_welcome_dismissed";

/**
 * L'accueil d'un inscrit : Nimbo se présente, dit en quatre lignes comment
 * marche le site, puis pose quatre questions pour l'adapter. On peut partir
 * découvrir seul à chaque étape, sans rien perdre : les questions restent
 * dans les paramètres.
 *
 * Quatre questions, et un engagement : chacune change quelque chose.
 *
 * L'ancien dialogue faisait 493 lignes, était sombre, bilingue, et promettait
 * en termes commerciaux — « accès prioritaire à la section Apprendre »,
 * « parcours guidé pas à pas ». La première version reconstruite n'en posait
 * plus qu'une, le niveau, ce qui était honnête mais court : le site en savait
 * trop peu pour s'adapter à qui que ce soit.
 *
 * Celle-ci en pose quatre, et chaque option affiche sous elle la conséquence
 * réelle de ce choix — pas un avantage, une conséquence. C'est la contrainte
 * qui a décidé des questions retenues : une question dont la réponse ne
 * change rien coûte du temps à l'inscription, ressemble à du fichage, et
 * déçoit quand l'utilisateur constate que rien n'a bougé. Trois autres
 * questions ont été écartées pour cette raison.
 *
 * Chaque étape s'enregistre en la quittant. Abandonner au milieu garde donc
 * ce qui a été répondu, plutôt que de tout perdre — un formulaire qui punit
 * l'interruption est un formulaire qu'on n'ouvre pas deux fois.
 */

interface LevelDef {
  id: TradingLevel;
  label: string;
  tagline: string;
  effects: string[];
}

const LEVELS: LevelDef[] = [
  {
    id: "beginner",
    label: "Je débute",
    tagline: "Je n'ai jamais passé d'ordre, ou presque.",
    effects: [
      "Chaque chiffre arrive avec une phrase qui dit ce qu'il signifie",
      "Le Parcours commence par les fondations : marchés, ordres, risque",
      "L'Analyse s'ouvre sur le verdict et la raison, pas sur les indicateurs",
    ],
  },
  {
    id: "intermediate",
    label: "Je m'y connais un peu",
    tagline: "Je lis un graphique et je sais ce qu'est un stop.",
    effects: [
      "Les facteurs derrière le verdict sont affichés d'emblée",
      "Le Parcours démarre sur la psychologie et les stratégies",
      "Les Marchés montrent les mouvements du jour et le tri par variation",
    ],
  },
  {
    id: "expert",
    label: "Je trade déjà",
    tagline: "Je veux les données, pas les explications.",
    effects: [
      "Les indicateurs bruts et l'edge historique sont dépliés par défaut",
      "Volume, devise et fréquence d'actualisation accessibles directement",
      "Aucune infobulle, aucun coach",
    ],
  },
];

type Step = "nimbo" | "visite" | "level" | "goal" | "markets" | "time" | "done";
const QUESTIONS: Step[] = ["level", "goal", "markets", "time"];

/** Comment marche le site, en quatre parties, comme une table des matières. */
const VISITE = [
  { titre: "Lire", ou: "Analyse", texte: "Choisissez un actif : je donne mon verdict et sa raison en une phrase, puis le détail si vous le voulez." },
  { titre: "S'entraîner", ou: "Wallet", texte: "10 000 € fictifs pour prendre de vraies positions sur les vrais cours, chacune avec son stop et son objectif." },
  { titre: "Apprendre", ou: "Parcours", texte: "Des cours courts, des exercices sur de vrais graphiques et des missions, du premier ordre aux stratégies." },
  { titre: "Tester ses idées", ou: "Ma stratégie", texte: "Écrivez vos propres règles : je les relis, puis vous les rejouez sur des années de cours passés." },
];

export function WelcomeDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { setTradingLevel } = useAuth();
  const { profile, save } = useProfile();

  const [step, setStep] = useState<Step>("nimbo");
  const reduce = useMouvementReduit();
  const [level, setLevel] = useState<LevelDef | null>(null);
  const [markets, setMarkets] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const index = QUESTIONS.indexOf(step);

  /**
   * Sortir à tout moment est permis, et c'est un choix assumé.
   *
   * Une première version rendait la fermeture inopérante tant que rien
   * n'était choisi — une croix affichée qui ne faisait rien. Un bouton mort
   * est pire que pas de bouton, et enfermer quelqu'un dans une fenêtre dès
   * sa première minute n'est pas la bonne première impression. Sans réponse,
   * le site se comporte comme pour un débutant ; le refus est mémorisé et
   * les questions restent dans les paramètres.
   */
  const close = () => {
    try { localStorage.setItem(DISMISSED_KEY, "1"); } catch { /* navigation privée */ }
    onClose();
  };

  const guard = async (fn: () => Promise<void>, next: Step) => {
    setError("");
    setBusy(true);
    try {
      await fn();
      setStep(next);
    } catch {
      setError("Impossible d'enregistrer. Réessayez dans un instant.");
    } finally {
      setBusy(false);
    }
  };

  const pickLevel = (def: LevelDef) =>
    guard(async () => { await setTradingLevel(def.id); setLevel(def); }, "goal");

  const pickGoal = (value: string) => guard(() => save({ goal: value }), "markets");

  const toggleMarket = (value: string) =>
    setMarkets((m) => (m.includes(value) ? m.filter((x) => x !== value) : [...m, value]));

  const submitMarkets = () => guard(() => save({ markets }), "time");

  const pickTime = (value: string) => guard(() => save({ weekly_time: value }), "done");

  return (
    <Modal open={open} onClose={close} title="Bienvenue" closeLabel="Plus tard" className="max-w-xl">
      {/* Où l'on en est. Quatre questions annoncées d'emblée : une série dont
          on ignore la longueur donne l'impression de ne jamais finir. */}
      {index >= 0 && (
        <div className="mb-5 flex items-center gap-1.5" aria-hidden>
          {QUESTIONS.map((s, i) => (
            <span
              key={s}
              className="h-[3px] flex-1 rounded-full transition-colors duration-300"
              style={{
                backgroundColor: i <= index ? "var(--cap-ocean)" : "var(--cap-line-strong)",
              }}
            />
          ))}
        </div>
      )}

      {error && <div className="mb-4"><FormError>{error}</FormError></div>}

      {step === "nimbo" && (
        <>
          <div className="flex items-end gap-4">
            <Nimbo humeur="salue" taille={92} label="Nimbo vous salue" className="-mb-1 -ml-1 flex-none" />
            <Heading level={2}>Bonjour, je suis Nimbo.</Heading>
          </div>
          <Text className="mt-4" tone="ink">
            Je vous accompagne sur CaptenTDB. Je lis les marchés avec vous et je vous explique ce que je vois, avec
            des mots simples. Quand je ne sais pas, je vous le dis.
          </Text>
          <dl className="mt-5 space-y-3.5 border-t pt-4" style={{ borderColor: "var(--cap-line)" }}>
            <div>
              <dt className="text-[0.82rem] italic" style={{ color: "var(--cap-amber-ink)", fontFamily: "var(--cap-font-display)" }}>Ce que je fais</dt>
              <dd className="mt-0.5 text-[0.92rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>
                J&apos;analyse les actifs que vous regardez, je propose parfois une position avec son stop et son objectif,
                et je relis vos stratégies pour y trouver les erreurs.
              </dd>
            </div>
            <div>
              <dt className="text-[0.82rem] italic" style={{ color: "var(--cap-amber-ink)", fontFamily: "var(--cap-font-display)" }}>Ce que je ne fais pas</dt>
              <dd className="mt-0.5 text-[0.92rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>
                Décider à votre place, ni promettre des gains. Ici l&apos;argent est fictif ; ce que vous apprenez, lui, est vrai.
              </dd>
            </div>
          </dl>
          <Suite onSuite={() => setStep("visite")} label="Faire le tour en une minute" onSeul={close} />
        </>
      )}

      {step === "visite" && (
        <>
          <Heading level={2}>Comment ça marche</Heading>
          <Text size="small" className="mt-2">Quatre endroits, dans l&apos;ordre où l&apos;on progresse.</Text>
          <ol className="mt-4">
            {VISITE.map((v, i) => (
              <motion.li key={v.titre}
                initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DUR.base, ease: EASE, delay: reduce ? 0 : 0.12 + i * 0.11 }}
                className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-1.5 border-t py-3" style={{ borderColor: "var(--cap-line)" }}>
                <span aria-hidden className="text-[1.15rem] italic leading-tight" style={{ color: "#c98a1e", fontFamily: "var(--cap-font-display)" }}>{i + 1}</span>
                <span>
                  <span className="flex items-baseline gap-2">
                    <span className="text-[1.08rem] font-semibold leading-tight" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>{v.titre}</span>
                    <span aria-hidden className="flex-1 -translate-y-[0.2em] border-b-[1.5px] border-dotted" style={{ borderColor: "var(--cap-line-strong)" }} />
                    <span className="text-[0.8rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>{v.ou}</span>
                  </span>
                  <span className="mt-1 block text-[0.88rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>{v.texte}</span>
                </span>
              </motion.li>
            ))}
          </ol>
          <Text size="caption" className="mt-2">
            En plus : un assistant pour vos questions, l&apos;agenda des annonces qui font bouger les marchés, et une
            communauté pour comparer vos idées.
          </Text>
          <Suite onSuite={() => setStep("level")} label="Adapter le site à moi" onSeul={close} onRetour={() => setStep("nimbo")} />
        </>
      )}

      {step === "level" && (
        <>
          <Heading level={2}>Où en êtes-vous ?</Heading>
          <Text size="small" className="mt-2.5">
            Quatre questions, une minute, pour que le site s&apos;adapte à vous. Chacune change quelque chose de
            précis, et tout se modifie ensuite dans les paramètres.
          </Text>
          <div className="mt-6 space-y-2.5">
            {LEVELS.map((l) => (
              <Card key={l.id} onClick={() => pickLevel(l)} disabled={busy}
                title={l.label} detail={l.tagline} />
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <Back onClick={() => setStep("visite")} inline />
            <button type="button" onClick={close} className="cap-lien text-[0.88rem]">Je préfère découvrir seul</button>
          </div>
        </>
      )}

      {step === "goal" && (
        <>
          <Heading level={2}>Qu&apos;est-ce qui vous amène ?</Heading>
          <Text size="small" className="mt-2.5">
            Cela décide de ce que votre accueil met en avant.
          </Text>
          <div className="mt-6 space-y-2.5">
            {GOALS.map((g) => (
              <Card key={g.value} onClick={() => pickGoal(g.value)} disabled={busy}
                title={g.label} detail={g.effect} />
            ))}
          </div>
          <Back onClick={() => setStep("level")} />
        </>
      )}

      {step === "markets" && (
        <>
          <Heading level={2}>Qu&apos;est-ce que vous suivez ?</Heading>
          <Text size="small" className="mt-2.5">
            Plusieurs réponses possibles. Le premier de la liste est la place
            que l&apos;écran Marchés ouvrira par défaut.
          </Text>
          <div className="mt-6 space-y-2.5">
            {MARKETS.map((m) => (
              <Card
                key={m.value}
                onClick={() => toggleMarket(m.value)}
                disabled={busy}
                title={m.label}
                detail={m.effect}
                selected={markets.includes(m.value)}
                rank={markets.indexOf(m.value) + 1 || undefined}
              />
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <Back onClick={() => setStep("goal")} inline />
            <Button size="md" onClick={submitMarkets} disabled={busy}>
              {markets.length === 0 ? "Passer" : "Continuer"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {step === "time" && (
        <>
          <Heading level={2}>Combien de temps pouvez-vous y consacrer ?</Heading>
          <Text size="small" className="mt-2.5">
            Cela règle le rythme que le Parcours vous propose. Aucune
            obligation, aucun rappel : c&apos;est une suggestion, pas un
            engagement.
          </Text>
          <div className="mt-6 space-y-2.5">
            {TIMES.map((t) => (
              <Card key={t.value} onClick={() => pickTime(t.value)} disabled={busy}
                title={t.label} detail={t.effect} />
            ))}
          </div>
          <Back onClick={() => setStep("markets")} />
        </>
      )}

      {step === "done" && (
        <>
          <div className="flex items-end gap-3">
            <Nimbo humeur="content" taille={64} label="" className="-mb-1 flex-none" />
            <Heading level={2}>C&apos;est réglé.</Heading>
          </div>
          <Text size="small" className="mt-3">
            Voici concrètement ce qui change pour vous :
          </Text>

          <ul className="mt-4 space-y-2.5">
            {[
              ...(level?.effects ?? []),
              ...(profile.goal
                ? [GOALS.find((g) => g.value === profile.goal)?.effect ?? ""]
                : []),
              ...(profile.markets.length
                ? [`Les Marchés s'ouvrent sur ${MARKETS.find((m) => m.value === profile.markets[0])?.label ?? "votre place"}.`]
                : []),
              ...(profile.weekly_time
                ? [TIMES.find((t) => t.value === profile.weekly_time)?.effect ?? ""]
                : []),
            ]
              .filter(Boolean)
              .map((e, i) => (
                <li key={i} className="flex gap-3">
                  <Check className="mt-[0.2em] h-4 w-4 shrink-0" style={{ color: "var(--cap-up)" }} />
                  <Text size="small" as="span">{e}</Text>
                </li>
              ))}
          </ul>

          <p className="mt-6 text-[1.05rem] font-semibold" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
            Par où voulez-vous commencer ?
          </p>
          <div className="mt-3 space-y-2">
            {departs(profile.goal).map((d) => (
              <Card key={d.href} title={d.titre} detail={d.detail} onClick={() => { close(); router.push(d.href); }} />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={close} className="cap-lien text-[0.9rem]">Explorer par moi-même</button>
            <Text size="caption" as="span">Modifiable dans Paramètres › Mon expérience.</Text>
          </div>
        </>
      )}
    </Modal>
  );
}

/** Les premiers pas proposés, le plus utile d'abord selon ce qui amène la personne. */
function departs(goal: string | null | undefined) {
  const guide = { titre: "Mon premier trade, guidé", detail: "Je vous emmène pas à pas : une analyse, une position virtuelle, puis son suivi.", href: "/dashboard" };
  const cours = { titre: "Le Parcours", detail: "Commencer par les bases : lire un graphique, passer un ordre, gérer le risque.", href: "/learn" };
  const strat = { titre: "Composer une stratégie", detail: "Écrire vos règles avec moi et voir ce qu'elles auraient donné.", href: "/strategie" };
  if (goal === "comprendre") return [cours, guide, strat];
  if (goal === "tester") return [strat, guide, cours];
  return [guide, cours, strat];
}

/* ── Pièces ─────────────────────────────────────────────────────────────── */

function Suite({ onSuite, label, onSeul, onRetour }: { onSuite: () => void; label: string; onSeul: () => void; onRetour?: () => void }) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="flex items-center gap-4">
        {onRetour && <Back onClick={onRetour} inline />}
        <button type="button" onClick={onSeul} className="cap-lien text-[0.9rem]">Je préfère découvrir seul</button>
      </div>
      <Button size="md" onClick={onSuite}>
        {label}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Card({
  title,
  detail,
  onClick,
  disabled,
  selected,
  rank,
}: {
  title: string;
  detail: string;
  onClick: () => void;
  disabled?: boolean;
  selected?: boolean;
  /** Rang du choix, pour les questions à réponses multiples ordonnées. */
  rank?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className="w-full rounded-[12px] p-4 text-left transition-colors hover:bg-[color:var(--cap-surface-2)] disabled:opacity-50"
      style={{
        backgroundColor: selected ? "var(--cap-surface-2)" : "transparent",
        boxShadow: selected
          ? "inset 0 0 0 1px var(--cap-ocean)"
          : "inset 0 0 0 1px var(--cap-line-strong)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.98rem] font-medium" style={{ color: "var(--cap-ink)" }}>
          {title}
        </span>
        {rank ? (
          // Le rang, pas une coche : l'ordre compte ici, et le premier choisi
          // décide de la place ouverte par défaut.
          <span
            className="cap-num shrink-0 rounded-full px-2 py-0.5 text-[0.75rem]"
            style={{ backgroundColor: "var(--cap-ocean)", color: "var(--cap-on-inverse)" }}
          >
            {rank}
          </span>
        ) : (
          <ArrowRight className="h-4 w-4 shrink-0" style={{ color: "var(--cap-ink-4)" }} />
        )}
      </div>
      <span className="mt-1 block text-[0.83rem]" style={{ color: "var(--cap-ink-3)" }}>
        {detail}
      </span>
    </button>
  );
}

function Back({ onClick, inline }: { onClick: () => void; inline?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 text-[0.84rem] transition-colors ${inline ? "" : "mt-6"}`}
      style={{ color: "var(--cap-ink-3)" }}
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Retour
    </button>
  );
}
