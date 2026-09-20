"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Clock } from "lucide-react";
import { learnAPI, missionsAPI, type LessonRecord, type UserProgress } from "@/lib/api";
import { LEARN_MODULES, type Lesson, type Module } from "@/lib/learnContent";
import { useUserLevel } from "@/hooks/useUserLevel";
import { useProfile } from "@/lib/useProfile";
import {
  Button, CloudCurtain, Heading, Num, Panel, Progress, Text,
  WeatherBackdrop, useAnimationsEnabled,
} from "@/components/design-system";
import { LessonBody } from "@/components/learn/LessonBody";
import { LessonDiagram } from "@/components/learn/Diagrams";
import { Quiz } from "@/components/learn/Quiz";

/**
 * Le Parcours — la formation, réécrite comme un chemin plutôt qu'un catalogue.
 *
 * L'ancien écran faisait 2 623 lignes pour quatre onglets (modules, parcours,
 * fiches, styles) et une vingtaine de widgets interactifs écrits sur mesure.
 * Tout y était atteignable et rien n'y était ordonné : huit modules à plat,
 * aucune idée d'où l'on en est, et le bouton le plus utile de la page — celui
 * qui reprend là où on s'est arrêté — n'existait pas.
 *
 * Ici il y a une seule idée : vous êtes quelque part sur un chemin, et voici
 * la prochaine étape. Le catalogue reste entier — huit modules, vingt-trois
 * leçons, vingt-neuf questions — mais il est rangé dans cet ordre.
 *
 * Trois choses qui ne sont pas des détails :
 *
 *   * la progression est désormais sur le serveur. Elle vivait dans
 *     localStorage alors que l'XP, le niveau et les badges étaient déjà
 *     stockés côté serveur : changer d'appareil remettait le parcours à zéro
 *     tout en gardant les points. Ce qu'un navigateur détient encore est
 *     repris une fois, au premier chargement ;
 *   * une leçon est adressable — /learn?lecon=module/lecon. C'est ce qui
 *     permet à l'Analyse de renvoyer « RSI » vers la leçon qui l'explique,
 *     au lieu de laisser l'utilisateur chercher dans un catalogue ;
 *   * l'ordre dépend du niveau déclaré, mais rien n'est verrouillé. Un
 *     débutant curieux peut lire une leçon avancée ; elle est simplement
 *     rangée après.
 */

type Records = Record<string, LessonRecord>;

const LEGACY_KEY = "tdb_learn_progress";
const IMPORT_FLAG = "tdb_learn_imported";

const LEVEL_LABEL: Record<Module["level"], string> = {
  beginner: "Fondations",
  intermediate: "Approfondissement",
  advanced: "Avancé",
  all: "Tous niveaux",
};

/** Ordre des modules : le niveau de l'utilisateur d'abord, sans rien masquer. */
function orderModules(level: string): Module[] {
  const rank: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2, all: 0 };
  const mine = rank[level] ?? 0;
  return [...LEARN_MODULES].sort((a, b) => {
    // Distance au niveau déclaré : ce qui correspond vient en premier, ce qui
    // est plus simple ensuite, ce qui est plus dur en dernier.
    const da = Math.abs((rank[a.level] ?? 0) - mine) + (rank[a.level] ?? 0) * 0.1;
    const db = Math.abs((rank[b.level] ?? 0) - mine) + (rank[b.level] ?? 0) * 0.1;
    return da - db;
  });
}

export default function LearnPage() {
  return (
    <Suspense fallback={<CloudCurtain active label="Chargement du parcours" />}>
      <LearnScreen />
    </Suspense>
  );
}

function LearnScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const level = useUserLevel();
  const { profile } = useProfile();
  const [animOn] = useAnimationsEnabled();

  const [records, setRecords] = useState<Records>({});
  const [xp, setXp] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const openKey = params.get("lecon");

  const modules = useMemo(() => orderModules(level.level), [level.level]);

  /* ── Chargement, et reprise de l'ancien localStorage ───────────────────── */

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // La reprise se fait une seule fois par navigateur, avant la lecture,
      // pour que le premier rendu montre déjà le parcours complet plutôt que
      // de le voir se remplir sous les yeux de l'utilisateur.
      try {
        if (localStorage.getItem(IMPORT_FLAG) !== "done") {
          const raw = localStorage.getItem(LEGACY_KEY);
          if (raw) {
            const old = JSON.parse(raw) as {
              completedLessons?: string[];
              quizScores?: Record<string, number>;
            };
            if (old?.completedLessons?.length) {
              await learnAPI.importLocal(old.completedLessons, old.quizScores || {});
            }
          }
          localStorage.setItem(IMPORT_FLAG, "done");
        }
      } catch {
        // Navigation privée, quota, JSON corrompu : la reprise est un bonus,
        // jamais une condition pour afficher la page.
      }

      const [lessons, progress] = await Promise.allSettled([
        learnAPI.lessons(),
        missionsAPI.progress(),
      ]);
      if (cancelled) return;
      if (lessons.status === "fulfilled") setRecords(lessons.value.lessons || {});
      if (progress.status === "fulfilled") setXp(progress.value);
      setLoading(false);
    };

    run();
    return () => { cancelled = true; };
  }, []);

  /* ── Dérivés ───────────────────────────────────────────────────────────── */

  const allLessons = useMemo(
    () => modules.flatMap((m) => m.lessons.map((l) => ({ module: m, lesson: l }))),
    [modules]
  );
  const total = allLessons.length;
  const done = allLessons.filter(({ module, lesson }) => records[`${module.id}/${lesson.id}`]).length;

  /** La prochaine leçon non faite, dans l'ordre du parcours. */
  const next = allLessons.find(({ module, lesson }) => !records[`${module.id}/${lesson.id}`]);

  /** Ce qu'il reste à faire dans le module où l'on se trouve. */
  const remainingInModule = next
    ? next.module.lessons.filter((l) => !records[`${next.module.id}/${l.id}`]).length
    : 0;

  const open = useMemo(() => {
    if (!openKey) return null;
    const [mid, lid] = openKey.split("/");
    const module = LEARN_MODULES.find((m) => m.id === mid);
    const lesson = module?.lessons.find((l) => l.id === lid);
    return module && lesson ? { module, lesson } : null;
  }, [openKey]);

  const goTo = useCallback(
    (key: string | null) => {
      router.replace(key ? `/learn?lecon=${encodeURIComponent(key)}` : "/learn", { scroll: true });
    },
    [router]
  );

  const markDone = useCallback(
    async (module: Module, lesson: Lesson, quizScore?: number) => {
      const key = `${module.id}/${lesson.id}`;
      // Optimiste : la coche apparaît tout de suite. Une leçon lue dont la
      // case met deux secondes à se cocher donne l'impression de n'avoir pas
      // été enregistrée, et l'utilisateur reclique.
      setRecords((r) => ({
        ...r,
        [key]: {
          quiz_score: quizScore ?? r[key]?.quiz_score ?? null,
          completed_at: r[key]?.completed_at ?? new Date().toISOString(),
        },
      }));
      try {
        await learnAPI.complete(module.id, lesson.id, quizScore);
        missionsAPI.progress().then(setXp).catch(() => {});
      } catch {
        // L'enregistrement a échoué : on retire la coche plutôt que de
        // laisser croire à une progression qui n'existe pas côté serveur.
        setRecords((r) => {
          const n = { ...r };
          delete n[key];
          return n;
        });
      }
    },
    []
  );

  if (loading) return <CloudCurtain active label="Chargement du parcours" />;

  if (open) {
    return (
      <LessonView
        module={open.module}
        lesson={open.lesson}
        record={records[`${open.module.id}/${open.lesson.id}`]}
        onBack={() => goTo(null)}
        onDone={(score) => markDone(open.module, open.lesson, score)}
        nextKey={nextAfter(modules, open.module, open.lesson)}
        onNext={(k) => goTo(k)}
        animOn={animOn}
      />
    );
  }

  return (
    <>
      <WeatherBackdrop condition="fair" enabled={animOn} />

      <div className="relative space-y-6">
        <header className="pt-2">
          <Heading level={1}>Parcours</Heading>
          <Text className="mt-2.5 max-w-[36rem]">
            {done === 0
              ? "Vingt-trois leçons, de ce qu'est un marché jusqu'à la gestion du risque. Rien n'est verrouillé : l'ordre est une suggestion, pas une barrière."
              : done === total
                ? "Vous avez terminé le parcours. Les leçons restent disponibles — relire une leçon après avoir tradé n'est pas la même lecture."
                : `${done} leçon${done > 1 ? "s" : ""} sur ${total}. ${xp ? `Niveau ${xp.level}, ${xp.xp} XP.` : ""}`}
          </Text>
        </header>

        {/* ── Le bouton le plus utile de la page ─────────────────────────── */}
        {next && (
          <Panel
            title={done === 0 ? "Commencer ici" : "Reprendre"}
            hint={pacing(profile.weekly_time, next.module.title, remainingInModule)}
          >
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div className="min-w-0">
                <Heading level={3}>{next.lesson.title}</Heading>
                <div className="mt-2 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" style={{ color: "var(--cap-ink-4)" }} />
                  <Text size="caption" as="span">
                    {next.lesson.duration}
                    {next.lesson.quiz?.length ? ` · ${next.lesson.quiz.length} question${next.lesson.quiz.length > 1 ? "s" : ""}` : ""}
                  </Text>
                </div>
              </div>
              <Button size="md" onClick={() => goTo(`${next.module.id}/${next.lesson.id}`)}>
                {done === 0 ? "Commencer" : "Reprendre"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {done > 0 && (
              <div className="mt-6">
                <Progress value={done} max={total} label="Progression du parcours" showValue={false} />
                <Text size="caption" className="mt-2">
                  {done} sur {total}
                </Text>
              </div>
            )}
          </Panel>
        )}

        {/* ── Les modules ────────────────────────────────────────────────── */}
        {modules.map((m) => {
          const mDone = m.lessons.filter((l) => records[`${m.id}/${l.id}`]).length;
          return (
            <Panel
              key={m.id}
              title={m.title}
              hint={m.description}
              aside={
                <span className="text-[0.76rem] whitespace-nowrap" style={{ color: "var(--cap-ink-3)" }}>
                  {mDone === m.lessons.length ? "Terminé" : `${mDone} / ${m.lessons.length}`}
                </span>
              }
            >
              <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
                {m.lessons.map((l) => {
                  const rec = records[`${m.id}/${l.id}`];
                  return (
                    <li key={l.id}>
                      <button
                        onClick={() => goTo(`${m.id}/${l.id}`)}
                        className="-mx-3 flex w-full items-center gap-3.5 rounded-[9px] px-3 py-3.5 text-left transition-colors hover:bg-[color:var(--cap-surface-2)]"
                      >
                        <span
                          aria-hidden
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: rec ? "var(--cap-up-soft)" : "transparent",
                            boxShadow: rec ? "none" : "inset 0 0 0 1px var(--cap-line-strong)",
                          }}
                        >
                          {rec && <Check className="h-3.5 w-3.5" style={{ color: "var(--cap-up)" }} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.93rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                            {l.title}
                          </span>
                          <span className="mt-0.5 block text-[0.78rem]" style={{ color: "var(--cap-ink-3)" }}>
                            {l.duration}
                            {rec?.quiz_score != null && ` · quiz ${rec.quiz_score} %`}
                          </span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0" style={{ color: "var(--cap-ink-4)" }} />
                      </button>
                    </li>
                  );
                })}
              </ul>

              <Text size="caption" className="mt-4">
                {LEVEL_LABEL[m.level]}
              </Text>
            </Panel>
          );
        })}

        <Panel title="À côté du parcours" hint="Deux compléments, utiles à des moments différents.">
          <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
            <li>
              <Link
                href="/learn/glossaire"
                className="-mx-3 flex items-center justify-between gap-4 rounded-[9px] px-3 py-3.5 transition-colors hover:bg-[color:var(--cap-surface-2)]"
              >
                <span>
                  <span className="block text-[0.93rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                    Glossaire
                  </span>
                  <span className="mt-0.5 block text-[0.78rem]" style={{ color: "var(--cap-ink-3)" }}>
                    Chaque terme défini en une phrase — pour le mot croisé en cours de lecture.
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" style={{ color: "var(--cap-ink-4)" }} />
              </Link>
            </li>
            <li>
              <Link
                href="/learn/missions"
                className="-mx-3 flex items-center justify-between gap-4 rounded-[9px] px-3 py-3.5 transition-colors hover:bg-[color:var(--cap-surface-2)]"
              >
                <span>
                  <span className="block text-[0.93rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                    Missions
                  </span>
                  <span className="mt-0.5 block text-[0.78rem]" style={{ color: "var(--cap-ink-3)" }}>
                    Des objectifs courts pour mettre en pratique ce que vous venez de lire.
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" style={{ color: "var(--cap-ink-4)" }} />
              </Link>
            </li>
          </ul>
        </Panel>
      </div>
    </>
  );
}

/**
 * Ce que le panneau « Reprendre » propose, selon le temps annoncé.
 *
 * C'est le second effet de la question sur le temps disponible. Quelqu'un qui
 * a répondu « quelques minutes par jour » ne se voit jamais proposer un
 * module entier : une suggestion hors de portée n'est pas une suggestion,
 * c'est un rappel de ce qu'on n'a pas fait. Sans réponse, on s'en tient au
 * nom du module, comme avant.
 */
function pacing(weeklyTime: string | null, moduleTitle: string, remaining: number): string {
  if (weeklyTime === "court") return `${moduleTitle} · une leçon, et vous vous arrêtez là`;
  if (weeklyTime === "moyen" && remaining > 1) {
    return `${moduleTitle} · ${remaining} leçons pour finir ce module`;
  }
  if (weeklyTime === "long" && remaining > 1) {
    return `${moduleTitle} · ${remaining} leçons restantes, de quoi boucler le module aujourd'hui`;
  }
  return moduleTitle;
}

/** La leçon suivante dans l'ordre du parcours, ou null à la fin. */
function nextAfter(modules: Module[], module: Module, lesson: Lesson): string | null {
  const flat = modules.flatMap((m) => m.lessons.map((l) => `${m.id}/${l.id}`));
  const i = flat.indexOf(`${module.id}/${lesson.id}`);
  return i >= 0 && i < flat.length - 1 ? flat[i + 1] : null;
}

/* ── La leçon ───────────────────────────────────────────────────────────── */

function LessonView({
  module,
  lesson,
  record,
  onBack,
  onDone,
  nextKey,
  onNext,
  animOn,
}: {
  module: Module;
  lesson: Lesson;
  record?: LessonRecord;
  onBack: () => void;
  onDone: (score?: number) => void;
  nextKey: string | null;
  onNext: (key: string) => void;
  animOn: boolean;
}) {
  const [quizOpen, setQuizOpen] = useState(false);
  const hasQuiz = !!lesson.quiz?.length;

  // Une leçon rouverte repart en lecture, jamais sur le quiz déjà passé.
  useEffect(() => { setQuizOpen(false); }, [lesson.id]);

  return (
    <>
      <WeatherBackdrop condition="fair" enabled={animOn} />

      <div className="relative space-y-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 pt-2 text-[0.85rem] transition-colors"
          style={{ color: "var(--cap-ocean)" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour au parcours
        </button>

        <header>
          <Text size="caption">{module.title}</Text>
          <Heading level={1} className="mt-1.5">{lesson.title}</Heading>
          <div className="mt-3 flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" style={{ color: "var(--cap-ink-4)" }} />
              <Text size="caption" as="span">{lesson.duration}</Text>
            </span>
            {record && (
              // Deux tons, pas un. « Terminée » est vert parce que c'est un
              // fait acquis ; le score porte le sien. Écrits d'une seule
              // couleur, un quiz raté à 0 % s'affichait en vert.
              <span className="flex items-center gap-1.5">
                <Text size="caption" as="span" tone="up">Terminée</Text>
                {record.quiz_score != null && (
                  <>
                    <Text size="caption" as="span">·</Text>
                    <Text
                      size="caption"
                      as="span"
                      tone={record.quiz_score >= 70 ? "up" : "down"}
                    >
                      quiz {record.quiz_score} %
                    </Text>
                  </>
                )}
              </span>
            )}
          </div>
        </header>

        {/* Les points clés AVANT le texte : ils disent où l'on va. Placés
            après, ils ne sont plus qu'un résumé de ce qu'on vient de lire. */}
        <Panel title="À retenir">
          <ul className="space-y-2.5">
            {lesson.keyPoints.map((p, i) => (
              <li key={i} className="flex gap-3">
                <Num tone="accent" className="shrink-0 text-[0.8rem] leading-relaxed">
                  {String(i + 1).padStart(2, "0")}
                </Num>
                <Text size="small" as="span">{p}</Text>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          {/* Le schéma d'abord, le texte ensuite. Ces leçons décrivent des
              formes — un corps de bougie, un palier, un rapport de distances —
              et voir la forme avant de lire sa description évite d'avoir à la
              reconstruire mentalement à partir de quatre définitions. */}
          <LessonDiagram lessonKey={`${module.id}/${lesson.id}`} />
          <LessonBody content={lesson.content} />
        </Panel>

        <Panel
          title={hasQuiz ? "Vérifier" : "Terminer"}
          hint={
            hasQuiz
              ? `${lesson.quiz!.length} question${lesson.quiz!.length > 1 ? "s" : ""}. L'explication s'affiche à chaque réponse.`
              : undefined
          }
        >
          {hasQuiz && quizOpen ? (
            <Quiz questions={lesson.quiz!} onDone={(score) => onDone(score)} />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              {hasQuiz ? (
                <Button size="md" onClick={() => setQuizOpen(true)}>
                  {record?.quiz_score != null ? "Refaire le quiz" : "Faire le quiz"}
                </Button>
              ) : (
                <Button size="md" onClick={() => onDone()} disabled={!!record}>
                  {record ? "Leçon terminée" : "Marquer comme terminée"}
                </Button>
              )}
              {!record && hasQuiz && (
                <Button variant="secondary" size="md" onClick={() => onDone()}>
                  Marquer sans le quiz
                </Button>
              )}
            </div>
          )}
        </Panel>

        <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
          <Button variant="secondary" size="md" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Le parcours
          </Button>
          {nextKey && (
            <Button size="md" onClick={() => onNext(nextKey)}>
              Leçon suivante
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
