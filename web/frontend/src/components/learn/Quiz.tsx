"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, X } from "lucide-react";
import type { QuizQuestion } from "@/lib/learnContent";
import { Button, DUR, EASE, Heading, Num, Text } from "@/components/design-system";

/**
 * Le quiz de fin de leçon.
 *
 * Une question à la fois, et — c'est le point — l'explication s'affiche dès la
 * réponse, juste et fausse. Un quiz qui se contente d'un score à la fin
 * enseigne le score ; celui-ci enseigne la raison, au moment précis où le
 * lecteur a une opinion sur la question et où il va donc retenir la réponse.
 *
 * Aucune pénalité, aucun chronomètre, aucune série à préserver. Une mauvaise
 * réponse dans un module d'apprentissage est un renseignement, pas une faute,
 * et l'enjeu artificiel n'ajoute que de la pression à un public qui vient
 * souvent ici parce qu'il se sent déjà dépassé.
 */
export function Quiz({
  questions,
  onDone,
}: {
  questions: QuizQuestion[];
  /** Score en pourcentage, arrondi. */
  onDone: (score: number) => void;
}) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[index];
  const last = index === questions.length - 1;

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.correct) setCorrect((c) => c + 1);
  };

  const next = () => {
    if (last) {
      // `correct` est déjà à jour : choose() l'a incrémenté et l'utilisateur a
      // dû re-rendre l'écran pour atteindre ce bouton.
      setFinished(true);
      onDone(Math.round((correct / questions.length) * 100));
      return;
    }
    setIndex((n) => n + 1);
    setPicked(null);
  };

  if (finished) {
    const score = Math.round((correct / questions.length) * 100);
    return (
      <div className="text-center">
        <Num tone={score >= 70 ? "up" : "muted"} className="text-[2.4rem]">
          {score} %
        </Num>
        <Heading level={3} className="mt-3">
          {score === 100
            ? "Sans faute."
            : score >= 70
              ? "C'est acquis."
              : "À revoir, et c'est normal."}
        </Heading>
        <Text size="small" className="mx-auto mt-2 max-w-[28rem]">
          {score >= 70
            ? `${correct} bonne${correct > 1 ? "s" : ""} réponse${correct > 1 ? "s" : ""} sur ${questions.length}. La leçon est marquée comme terminée.`
            : `${correct} sur ${questions.length}. La leçon reste marquée comme terminée : relisez-la quand vous voulez, le quiz se refait autant de fois que nécessaire.`}
        </Text>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <Text size="caption" as="span">
          Question {index + 1} sur {questions.length}
        </Text>
      </div>

      <Heading level={4} as="h3">{q.question}</Heading>

      <div className="mt-5 space-y-2">
        {q.options.map((opt, i) => {
          const isAnswer = i === q.correct;
          const isPicked = picked === i;
          const revealed = picked !== null;
          // Une fois répondu, la bonne réponse se montre toujours — y compris
          // quand l'utilisateur s'est trompé. Cacher la solution après une
          // erreur oblige à deviner deux fois.
          const tone = !revealed
            ? "idle"
            : isAnswer
              ? "good"
              : isPicked
                ? "bad"
                : "idle";

          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={revealed}
              className="flex w-full items-center justify-between gap-3 rounded-[10px] px-4 py-3 text-left text-[0.92rem] transition-colors disabled:cursor-default"
              style={{
                color: "var(--cap-ink)",
                backgroundColor:
                  tone === "good" ? "var(--cap-up-soft)"
                  : tone === "bad" ? "var(--cap-down-soft)"
                  : "var(--cap-bg)",
                boxShadow: `inset 0 0 0 1px ${
                  tone === "idle" ? "var(--cap-line-strong)" : "transparent"
                }`,
              }}
            >
              <span>{opt}</span>
              {tone === "good" && <Check className="h-4 w-4 shrink-0" style={{ color: "var(--cap-up)" }} />}
              {tone === "bad" && <X className="h-4 w-4 shrink-0" style={{ color: "var(--cap-down)" }} />}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DUR.base, ease: EASE }}
          className="mt-5"
        >
          <div
            className="rounded-[12px] p-4"
            style={{ backgroundColor: "var(--cap-bg)" }}
          >
            <Text size="small">{q.explanation}</Text>
          </div>
          <div className="mt-4 flex justify-end">
            <Button size="md" onClick={next}>
              {last ? "Voir mon score" : "Question suivante"}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
