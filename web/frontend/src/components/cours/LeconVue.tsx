"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { learnAPI } from "@/lib/api";
import { chapitreDe, fiche, voisines } from "@/lib/cours/catalogue";
import type { LeconSerie } from "@/lib/cours/types";
import { Button, Text } from "@/components/design-system";
import { Quiz } from "@/components/learn/Quiz";
import { Blocs } from "./Blocs";
import { lier, nommer, place } from "@/lib/cours/liens";

const ROMAINS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

/**
 * Une leçon de la série, en entier : l'accroche de la vidéo, les parties, les
 * mots des traders, ce qu'il faut retenir, le quiz, et de quoi pratiquer sur
 * le site. Lisible sans compte : c'est la page où arrive un visiteur venu de
 * la vidéo. Avec un compte, la leçon terminée est gardée.
 */

export const MODULE_SERIE = "serie";
export const cleLecon = (n: number) => `lecon-${n}`;

export function LeconVue({ lecon }: { lecon: LeconSerie }) {
  const f = fiche(lecon.numero)!;
  const ch = chapitreDe(lecon.numero);
  const { avant, apres } = voisines(lecon.numero);
  // Le numéro de la vidéo reste dans l'adresse ; à l'écran, la place dans le chapitre.
  const pl = place(lecon.numero);
  const quiz = lecon.quiz.map((q) => ({ ...q, question: nommer(q.question), options: q.options.map(nommer), explanation: nommer(q.explanation) }));
  const { isAuthenticated } = useAuth();
  const [faite, setFaite] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    learnAPI.lessons().then((r) => {
      const rec = r.lessons[`${MODULE_SERIE}/${cleLecon(lecon.numero)}`];
      if (rec) { setFaite(true); setScore(rec.quiz_score); }
    }).catch(() => {});
  }, [isAuthenticated, lecon.numero]);

  const terminer = (s?: number) => {
    if (s != null) setScore(s);
    if (!isAuthenticated) return;
    learnAPI.complete(MODULE_SERIE, cleLecon(lecon.numero), s).then(() => setFaite(true)).catch(() => {});
  };

  const plusieurs = lecon.parties.length > 1;
  const ancres = [
    ...lecon.parties.map((p, i) => ({ id: `partie-${i + 1}`, titre: p.titre || "La leçon" })),
    { id: "mots", titre: "Les mots des traders" },
    { id: "retenir", titre: "À retenir" },
    { id: "quiz", titre: "Vérifier" },
  ];

  return (
    <article className="mx-auto w-full max-w-[1120px] px-4 pb-24 pt-6 sm:px-6">
      <nav className="mb-6 text-[0.92rem]" aria-label="Fil d'Ariane">
        <Link href="/learn" className="cap-lien">Apprendre</Link>
        {ch && <span style={{ color: "var(--cap-ink-3)" }}> › {ch.titre}</span>}
      </nav>

      <header className="max-w-[760px]">
        <p className="text-[1rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>
          {pl ? <>Chapitre <span style={{ color: "#c98a1e" }}>{ROMAINS[pl.chapitre]}</span>, leçon {pl.rang} sur {pl.total}, </> : null}{f.duree} de lecture
          {faite && <span style={{ color: "var(--cap-up)" }}>, terminée{score != null ? `, quiz ${score} %` : ""}</span>}
        </p>
        <h1 className="mt-1 text-[clamp(1.9rem,4.4vw,2.9rem)] font-medium leading-[1.08]" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)", letterSpacing: "-0.01em" }}>
          {f.titre}
        </h1>
        <p className="mt-4 text-[1.2rem] italic leading-snug" style={{ color: "var(--cap-ink-2)", fontFamily: "var(--cap-font-display)" }}>{nommer(lecon.accroche)}</p>
        <p className="mt-3 text-[1.05rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>{nommer(lecon.promesse)}</p>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,760px)_minmax(0,1fr)]">
        <div className="min-w-0">
          {lecon.parties.map((p, i) => (
            <section key={i} id={`partie-${i + 1}`} className="scroll-mt-28">
              {plusieurs && (
                <h2 className="mb-2 mt-12 border-t pt-8 text-[1.75rem] font-medium leading-tight first:mt-0" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)", borderColor: "var(--cap-line-strong)" }}>
                  <span className="mr-3 italic" style={{ color: "#c98a1e" }}>{["I", "II", "III", "IV", "V"][i]}.</span>{p.titre}
                </h2>
              )}
              <Blocs blocs={p.blocs} />
            </section>
          ))}

          <section id="mots" className="mt-14 scroll-mt-28 border-t pt-8" style={{ borderColor: "var(--cap-line-strong)" }}>
            <h2 className="text-[1.6rem] font-medium" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>Les mots des traders</h2>
            <Text size="small" className="mt-1">Ceux que vous entendrez partout, en français et en anglais.</Text>
            <dl className="mt-5 [&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
              {lecon.mots.map((m) => (
                <div key={m.terme} className="grid gap-x-6 gap-y-1 py-3 sm:grid-cols-[13rem_minmax(0,1fr)]">
                  <dt>
                    <span className="text-[1.05rem] font-semibold" style={{ color: "var(--cap-ink)" }}>{m.terme}</span>
                    {m.en && <span className="block text-[0.92rem] italic" style={{ color: "var(--cap-ink-3)" }}>{m.en}</span>}
                  </dt>
                  <dd className="text-[1rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>{nommer(m.def)}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section id="retenir" className="mt-14 scroll-mt-28 rounded-[16px] p-5 sm:p-7" style={{ backgroundColor: "var(--cap-surface-2)" }}>
            <h2 className="text-[1.6rem] font-medium" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>À retenir</h2>
            <ul className="mt-4 space-y-3">
              {lecon.retenir.map((r, i) => (
                <li key={i} className="flex gap-3 text-[1.05rem] leading-relaxed" style={{ color: "var(--cap-ink)" }}>
                  <Check className="mt-[0.3em] h-4 w-4 flex-none" style={{ color: "var(--cap-up)" }} />
                  <span dangerouslySetInnerHTML={{ __html: lier(r) }} />
                </li>
              ))}
            </ul>
          </section>

          <section id="quiz" className="mt-14 scroll-mt-28">
            <h2 className="text-[1.6rem] font-medium" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>Vérifier que c&apos;est clair</h2>
            <Text size="small" className="mt-1 mb-5">
              {lecon.quiz.length} questions. L&apos;explication s&apos;affiche dès votre réponse, juste ou fausse.
              {!isAuthenticated && " Avec un compte gratuit, votre progression est gardée."}
            </Text>
            <Quiz questions={quiz} onDone={(s) => terminer(s)} />
          </section>

          {lecon.pratique && lecon.pratique.length > 0 && (
            <section className="mt-14 border-t pt-8" style={{ borderColor: "var(--cap-line-strong)" }}>
              <h2 className="text-[1.6rem] font-medium" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>Mettre en pratique</h2>
              <ul className="mt-4 space-y-4">
                {lecon.pratique.map((p) => (
                  <li key={p.href} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="min-w-0 flex-1 text-[1.02rem]" style={{ color: "var(--cap-ink-2)" }}>{nommer(p.texte)}</span>
                    <Button href={isAuthenticated ? p.href : "/register"} size="md">{isAuthenticated ? p.bouton : "Créer un compte gratuit"}</Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <nav className="mt-14 grid gap-4 border-t pt-6 sm:grid-cols-2" style={{ borderColor: "var(--cap-line-strong)" }} aria-label="Leçons voisines">
            {avant ? (
              <Link href={`/lecon/${avant.numero}`} className="group rounded-[14px] p-4 transition-colors hover:bg-[color:var(--cap-surface-2)]">
                <span className="flex items-center gap-1.5 text-[0.88rem]" style={{ color: "var(--cap-ink-3)" }}><ArrowLeft size={14} /> Avant</span>
                <span className="mt-1 block text-[1.08rem] font-semibold" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>{avant.court}</span>
              </Link>
            ) : <span />}
            {apres && (
              <Link href={`/lecon/${apres.numero}`} className="group rounded-[14px] p-4 text-right transition-colors hover:bg-[color:var(--cap-surface-2)]">
                <span className="flex items-center justify-end gap-1.5 text-[0.88rem]" style={{ color: "var(--cap-ink-3)" }}>Ensuite <ArrowRight size={14} /></span>
                <span className="mt-1 block text-[1.08rem] font-semibold" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>{apres.court}</span>
              </Link>
            )}
          </nav>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <p className="text-[0.95rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>Dans cette leçon</p>
            <ol className="mt-3 space-y-2 border-l pl-4" style={{ borderColor: "var(--cap-line-strong)" }}>
              {ancres.map((a) => (
                <li key={a.id}><a href={`#${a.id}`} className="text-[0.95rem] leading-snug hover:underline" style={{ color: "var(--cap-ink-2)" }}>{a.titre}</a></li>
              ))}
            </ol>
            {!isAuthenticated && (
              <div className="mt-8 rounded-[14px] p-4" style={{ backgroundColor: "var(--cap-surface-2)" }}>
                <p className="text-[0.98rem]" style={{ color: "var(--cap-ink)" }}>
                  Passez à la pratique avec 10 000 € fictifs, sur les vrais cours, avec Nimbo pour vous guider.
                </p>
                <Button href="/register" size="md" className="mt-3">Créer un compte gratuit</Button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}
