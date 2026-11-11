"use client";

import type { Analysis } from "@/lib/api";
import { fr } from "@/lib/SettingsContext";
import { deQuand } from "@/lib/quand";
import { Text } from "@/components/design-system";

/**
 * « Depuis votre lecture d'hier » : le score d'alors et celui d'aujourd'hui,
 * ce qu'a fait le cours, et si Nimbo a changé d'avis.
 *
 * Un visiteur revenait exprès « voir si l'analyse change après la bougie du
 * jour », et devait se souvenir du score de la veille. Le serveur le garde
 * (voir _lectures.py) ; ici on le raconte en une phrase.
 */
type Lecture = NonNullable<Analysis["derniere_lecture"]>;

function phraseScore(d: Lecture, score: number): string | null {
  if (d.score == null) return null;
  const avant = Math.round(d.score);
  return avant === score ? `le score n'a pas bougé (${score})` : `le score est passé de ${avant} à ${score}`;
}

function phraseCours(d: Lecture, cours: number): string | null {
  if (d.prix == null || d.prix <= 0 || cours <= 0) return null;
  const v = ((cours - d.prix) / d.prix) * 100;
  if (Math.abs(v) < 0.05) return "le cours n'a presque pas bougé";
  return `le cours a ${v >= 0 ? "pris" : "perdu"} ${fr(Math.abs(v), 1)} %`;
}

function phraseAvis(d: Lecture, a: Analysis): string {
  const propose = !!a.nimbo?.propose;
  if (propose && !d.propose) return ` Nimbo propose maintenant ${a.nimbo?.sens === "short" ? "une vente" : "un achat"}, il ne proposait rien.`;
  if (!propose && d.propose) return " Nimbo proposait une position, il ne propose plus rien.";
  if (propose && d.propose) return " Nimbo propose toujours une position.";
  return "";
}

export function DepuisLecture({ a, score }: { a: Analysis; score: number }) {
  const d = a.derniere_lecture;
  if (!d) return null;
  const morceaux = [phraseScore(d, score), phraseCours(d, a.price.current)].filter((m): m is string => !!m);
  const avis = phraseAvis(d, a);
  if (morceaux.length === 0 && !avis) return null;
  return (
    <Text size="small" className="mt-2 max-w-[36rem]" tone="ink">
      Depuis votre lecture {deQuand(d.lu_le)} : {morceaux.join(", ")}.{avis}
    </Text>
  );
}
