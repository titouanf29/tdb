"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import type { TradingLevel } from "@/lib/auth";
import {
  Button, FormError, Heading, Modal, Text,
} from "@/components/design-system";

/** Mémorise un refus, pour que la question ne revienne pas à chaque page. */
export const DISMISSED_KEY = "tdb_welcome_dismissed";

/**
 * La première question qu'on pose à quelqu'un qui arrive.
 *
 * L'ancienne version faisait 493 lignes, était bilingue, sombre, et promettait
 * des choses en termes marketing — « accès prioritaire à la section
 * Apprendre », « parcours guidé pas à pas », cinq puces par niveau. Sur un
 * fond noir avec des dégradés émeraude, posée par-dessus la nouvelle interface
 * claire, elle était aussi la seule chose que voyait un nouvel inscrit.
 *
 * Celle-ci tient en deux écrans et ne promet que ce qui est vrai et
 * vérifiable, parce que le niveau choisi a des effets réels et précis :
 *
 *   * il ordonne les modules du Parcours ;
 *   * il fixe le niveau de détail par défaut de l'Analyse et des Marchés ;
 *   * il décide si les explications accompagnent les chiffres.
 *
 * Trois lignes par niveau, pas cinq, et chacune correspond à du code. Rien
 * n'est verrouillé : c'est dit explicitement, parce qu'un débutant qui croit
 * s'être enfermé dans une version bridée du produit ne choisira jamais
 * « débutant » — et se retrouvera devant une interface trop dense pour lui.
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

export function WelcomeDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { setTradingLevel } = useAuth();
  const [step, setStep] = useState<"choose" | "done">("choose");
  const [chosen, setChosen] = useState<LevelDef | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = async (def: LevelDef) => {
    setError("");
    setBusy(true);
    try {
      // Le serveur d'abord. L'ancienne version basculait aussi côté serveur
      // en premier — c'est la bonne façon, et elle est conservée : afficher
      // « c'est enregistré » sur un appel qui a échoué est la seule chose
      // qu'un écran de réglages ne doit jamais faire.
      await setTradingLevel(def.id);
      setChosen(def);
      setStep("done");
    } catch {
      setError("Impossible d'enregistrer votre choix. Réessayez dans un instant.");
    } finally {
      setBusy(false);
    }
  };

  /**
   * Sortir sans choisir est permis, et c'est un choix assumé.
   *
   * La première version rendait onClose inopérant tant qu'aucun niveau
   * n'était retenu, pour garantir la réponse. Résultat : une croix affichée
   * en haut à droite qui ne faisait rien. Un bouton mort est pire que pas de
   * bouton, et enfermer quelqu'un dans une fenêtre dès sa première minute
   * n'est pas la première impression qu'on veut laisser.
   *
   * Sans réponse, le site se comporte comme pour un débutant — le réglage le
   * plus explicatif, donc le moins risqué. Le refus est mémorisé pour que la
   * question ne revienne pas à chaque chargement : elle reste disponible dans
   * les paramètres, qui est l'endroit où l'on va quand on la cherche.
   */
  const close = () => {
    try { localStorage.setItem(DISMISSED_KEY, "1"); } catch { /* navigation privée */ }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Bienvenue"
      closeLabel="Plus tard"
      className="max-w-xl"
    >
      {step === "choose" ? (
        <>
          <Heading level={2}>Où en êtes-vous ?</Heading>
          <Text size="small" className="mt-2.5">
            La réponse règle le niveau de détail de l&apos;ensemble du site.
            Elle se change à tout moment dans les paramètres, et rien n&apos;est
            verrouillé : vous verrez toujours les mêmes chiffres, simplement
            présentés autrement.
          </Text>

          {error && <div className="mt-4"><FormError>{error}</FormError></div>}

          <div className="mt-6 space-y-2.5">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                onClick={() => pick(l)}
                disabled={busy}
                className="w-full rounded-[12px] p-4 text-left transition-colors hover:bg-[color:var(--cap-surface-2)] disabled:opacity-50"
                style={{ boxShadow: "inset 0 0 0 1px var(--cap-line-strong)" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[0.98rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                    {l.label}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0" style={{ color: "var(--cap-ink-4)" }} />
                </div>
                <span className="mt-1 block text-[0.83rem]" style={{ color: "var(--cap-ink-3)" }}>
                  {l.tagline}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <Heading level={2}>C&apos;est réglé.</Heading>
          <Text size="small" className="mt-2.5">
            Voici concrètement ce qui change pour vous :
          </Text>

          <ul className="mt-5 space-y-3">
            {chosen?.effects.map((e, i) => (
              <li key={i} className="flex gap-3">
                <Check className="mt-[0.2em] h-4 w-4 shrink-0" style={{ color: "var(--cap-up)" }} />
                <Text size="small" as="span">{e}</Text>
              </li>
            ))}
          </ul>

          <Text size="caption" className="mt-5">
            Modifiable à tout moment dans les paramètres.
          </Text>

          <div className="mt-7 flex flex-wrap gap-2.5">
            <Button
              size="md"
              onClick={() => {
                close();
                router.push("/learn");
              }}
            >
              Ouvrir le Parcours
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="md" onClick={close}>
              Explorer par moi-même
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
