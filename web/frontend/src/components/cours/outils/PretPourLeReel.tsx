"use client";

import { useState } from "react";
import { ChoixInd, LectureInd, RecommencerInd } from "./ElementsIndicateurs";

/**
 * « Suis-je prêt pour le réel ? » Six questions honnêtes. Une seule réponse
 * qui cloche suffit à dire : pas encore. Et si tout est bon, la première
 * taille : 0,01 lot.
 */
const QUESTIONS = [
  { q: "J'ai un plan de trading écrit (leçon « Le plan de trading »).", bon: true, pourquoi: "Sans plan écrit, il n'y a rien à suivre, donc rien à vérifier." },
  { q: "Je l'ai suivi sur chaque position, sans exception, depuis plusieurs semaines.", bon: true, pourquoi: "Suivre son plan quand c'est facile ne prouve rien : il faut des semaines, pertes comprises." },
  { q: "Chaque position est dans mon journal, et je le relis chaque semaine.", bon: true, pourquoi: "Le journal est la seule preuve que vous suivez vraiment votre plan." },
  { q: "Je passe un ordre, je pose un stop et je calcule ma taille sans hésiter.", bon: true, pourquoi: "En réel, une erreur de bouton coûte de l'argent : la plateforme doit être une habitude." },
  { q: "J'ai envie de passer au réel parce que je viens de faire un très bon trade.", bon: false, pourquoi: "Un bon trade est souvent de la chance. C'est la régularité qui compte, pas un coup." },
  { q: "L'argent que je mettrais, je peux me permettre de le perdre.", bon: true, pourquoi: "La plupart des particuliers perdent de l'argent sur les CFD. N'y mettez jamais l'argent du loyer." },
];

export function PretPourLeReel() {
  const [rep, setRep] = useState<("oui" | "non" | null)[]>(QUESTIONS.map(() => null));
  const fini = rep.every((r) => r != null);
  const ratees = QUESTIONS.map((q, i) => (rep[i] != null && (rep[i] === "oui") !== q.bon ? i : -1)).filter((i) => i >= 0);

  return (
    <div>
      <ol className="space-y-3">
        {QUESTIONS.map((q, i) => (
          <li key={i} className="flex flex-col gap-1 border-b pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4" style={{ borderColor: "var(--cap-line)" }}>
            <p className="text-[0.98rem]" style={{ color: "var(--cap-ink)" }}><span className="mr-1.5 italic" style={{ color: "var(--cap-amber-ink)", fontFamily: "var(--cap-font-display)" }}>{i + 1}.</span>{q.q}</p>
            <div className="flex-none">
              <ChoixInd label={q.q} valeur={rep[i]} onChange={(v) => setRep((r) => r.map((x, j) => (j === i ? v : x)))}
                options={[{ v: "oui" as const, texte: "Oui" }, { v: "non" as const, texte: "Non" }]} />
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4">
        <LectureInd ton={!fini ? "neutre" : ratees.length ? "faux" : "juste"}>
          {!fini && <p>Répondez aux six questions, honnêtement : personne ne voit vos réponses.</p>}
          {fini && ratees.length > 0 && (
            <>
              <p><b style={{ color: "var(--cap-ink)" }}>Pas encore.</b> Restez en démo, ce n'est pas du temps perdu : c'est là que vos erreurs ne coûtent rien.</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5">
                {ratees.map((i) => <li key={i}>{QUESTIONS[i].pourquoi}</li>)}
              </ul>
            </>
          )}
          {fini && ratees.length === 0 && (
            <p>
              <b style={{ color: "var(--cap-ink)" }}>Vous pouvez essayer le réel, en commençant petit.</b> Par exemple 0,01 lot : avec un stop de 20 pips sur l'euro-dollar, 2 $ de risque,
              soit 0,1 % d'un compte de 2 000 $. Jamais plus de 1 %. Gardez le même plan et le même journal : seules les émotions changent, et rien n'est garanti.
            </p>
          )}
        </LectureInd>
      </div>
      {rep.some((r) => r != null) && <div className="mt-2 flex justify-end"><RecommencerInd onClick={() => setRep(QUESTIONS.map(() => null))} /></div>}
    </div>
  );
}
