"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronLeft,
  Clock,
  Star,
  Trophy,
  Zap,
  Lock,
  X,
  Check,
  RefreshCw,
  TrendingUp,
  BarChart2,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import {
  LEARN_MODULES,
  getLevelBadge,
  type Module,
  type Lesson,
  type QuizQuestion,
} from "@/lib/learnContent";

// ─── Progress stored in localStorage ──────────────────────────────────────────
const STORAGE_KEY = "tdb_learn_progress";

type Progress = {
  completedLessons: string[]; // "moduleId/lessonId"
  quizScores: Record<string, number>; // "moduleId/lessonId" -> score %
};

function loadProgress(): Progress {
  if (typeof window === "undefined") return { completedLessons: [], quizScores: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { completedLessons: [], quizScores: {} };
  } catch {
    return { completedLessons: [], quizScores: {} };
  }
}

function saveProgress(p: Progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function LearnPage() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Progress>({ completedLessons: [], quizScores: {} });
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const markLessonComplete = (moduleId: string, lessonId: string) => {
    const key = `${moduleId}/${lessonId}`;
    if (progress.completedLessons.includes(key)) return;
    const updated = { ...progress, completedLessons: [...progress.completedLessons, key] };
    setProgress(updated);
    saveProgress(updated);
  };

  const saveQuizScore = (moduleId: string, lessonId: string, score: number) => {
    const key = `${moduleId}/${lessonId}`;
    const updated = { ...progress, quizScores: { ...progress.quizScores, [key]: score } };
    setProgress(updated);
    saveProgress(updated);
  };

  const totalLessons = LEARN_MODULES.reduce((acc, m) => acc + m.lessons.length, 0);
  const completedCount = progress.completedLessons.length;
  const overallPercent = Math.round((completedCount / totalLessons) * 100);

  const userLevel = user?.trading_level;

  if (activeLesson && activeModule) {
    return (
      <LessonView
        module={activeModule}
        lesson={activeLesson}
        progress={progress}
        onComplete={() => markLessonComplete(activeModule.id, activeLesson.id)}
        onSaveQuiz={(score) => saveQuizScore(activeModule.id, activeLesson.id, score)}
        onBack={() => setActiveLesson(null)}
      />
    );
  }

  if (activeModule) {
    return (
      <ModuleView
        module={activeModule}
        progress={progress}
        onSelectLesson={setActiveLesson}
        onBack={() => setActiveModule(null)}
      />
    );
  }

  // ── Module list / home ──
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            Formation Trading
          </h1>
          <p className="text-muted-foreground mt-1">
            Apprends les bases et les techniques du trading, à ton rythme.
          </p>
        </div>
        {userLevel && (
          <div className={cn("px-3 py-1.5 rounded-full text-sm font-medium border", getLevelBadge(userLevel).color)}>
            Niveau : {getLevelBadge(userLevel).label}
          </div>
        )}
      </div>

      {/* Overall progress */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="font-semibold">Progression globale</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {completedCount} / {totalLessons} leçons
          </span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overallPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full"
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Débutant</span>
          <span className="font-medium text-primary">{overallPercent}%</span>
          <span>Expert</span>
        </div>
      </div>

      {/* Beginner banner */}
      {(!userLevel || userLevel === "beginner") && completedCount === 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border border-emerald-500/30">
          <div className="flex items-start gap-3">
            <Star className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-400 mb-1">Commençons par le début !</p>
              <p className="text-sm text-white/70">
                On te recommande de commencer par{" "}
                <button
                  onClick={() => setActiveModule(LEARN_MODULES[0])}
                  className="text-emerald-400 underline hover:no-underline"
                >
                  Les bases du trading
                </button>
                . Chaque leçon prend moins de 10 minutes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modules grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LEARN_MODULES.map((module, idx) => {
          const moduleLessons = module.lessons.length;
          const completedInModule = module.lessons.filter((l) =>
            progress.completedLessons.includes(`${module.id}/${l.id}`)
          ).length;
          const modulePercent = Math.round((completedInModule / moduleLessons) * 100);
          const isLocked = userLevel === "expert" ? false
            : module.level === "advanced" && userLevel === "beginner" && completedInModule === 0;

          return (
            <motion.button
              key={module.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07 }}
              onClick={() => !isLocked && setActiveModule(module)}
              disabled={isLocked}
              className={cn(
                "text-left p-5 rounded-xl border bg-gradient-to-br transition-all group",
                module.color,
                isLocked
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:scale-[1.02] hover:shadow-lg cursor-pointer"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{module.icon}</span>
                <div className="flex items-center gap-2">
                  {isLocked ? (
                    <Lock className="w-4 h-4 text-white/40" />
                  ) : modulePercent === 100 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : null}
                  <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", getLevelBadge(module.level).color)}>
                    {getLevelBadge(module.level).label}
                  </div>
                </div>
              </div>

              <h3 className="font-bold text-lg mb-1">{module.title}</h3>
              <p className="text-sm text-white/60 leading-snug mb-4">{module.description}</p>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-white/50">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {moduleLessons} leçons
                  </span>
                  <span>{completedInModule}/{moduleLessons} complétées</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/40 rounded-full transition-all duration-500"
                    style={{ width: `${modulePercent}%` }}
                  />
                </div>
              </div>

              {!isLocked && (
                <div className="mt-3 flex items-center gap-1 text-xs text-white/40 group-hover:text-white/60 transition-colors">
                  <span>{modulePercent === 100 ? "Revoir le module" : modulePercent > 0 ? "Continuer" : "Commencer"}</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Module view (list of lessons) ──────────────────────────────────────────
function ModuleView({
  module,
  progress,
  onSelectLesson,
  onBack,
}: {
  module: Module;
  progress: Progress;
  onSelectLesson: (l: Lesson) => void;
  onBack: () => void;
}) {
  const completedInModule = module.lessons.filter((l) =>
    progress.completedLessons.includes(`${module.id}/${l.id}`)
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Retour aux modules
      </button>

      <div className={cn("p-6 rounded-xl border bg-gradient-to-br", module.color)}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-4xl">{module.icon}</span>
          <div>
            <h1 className="text-xl font-bold">{module.title}</h1>
            <p className="text-sm text-white/60">{completedInModule} / {module.lessons.length} leçons complétées</p>
          </div>
        </div>
        <p className="text-sm text-white/70">{module.description}</p>
      </div>

      <div className="space-y-3">
        {module.lessons.map((lesson, idx) => {
          const key = `${module.id}/${lesson.id}`;
          const isCompleted = progress.completedLessons.includes(key);
          const quizScore = progress.quizScores[key];

          return (
            <motion.button
              key={lesson.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onSelectLesson(lesson)}
              className="w-full text-left p-5 glass-card hover:border-primary/40 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2",
                  isCompleted
                    ? "bg-emerald-500/20 border-emerald-500/50"
                    : "bg-white/5 border-white/20"
                )}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <span className="text-sm font-bold text-white/50">{idx + 1}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{lesson.title}</p>
                    {lesson.quiz && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary">
                        Quiz inclus
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {lesson.duration}
                    </span>
                    {quizScore !== undefined && (
                      <span className={cn(
                        "flex items-center gap-1",
                        quizScore >= 80 ? "text-emerald-400" : quizScore >= 50 ? "text-yellow-400" : "text-red-400"
                      )}>
                        <Award className="w-3 h-3" />
                        Quiz : {quizScore}%
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-primary transition-colors shrink-0" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Lesson view ─────────────────────────────────────────────────────────────
function LessonView({
  module,
  lesson,
  progress,
  onComplete,
  onSaveQuiz,
  onBack,
}: {
  module: Module;
  lesson: Lesson;
  progress: Progress;
  onComplete: () => void;
  onSaveQuiz: (score: number) => void;
  onBack: () => void;
}) {
  const key = `${module.id}/${lesson.id}`;
  const isCompleted = progress.completedLessons.includes(key);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizDone, setQuizDone] = useState(false);

  const handleReadingDone = () => {
    if (!isCompleted) onComplete();
    if (lesson.quiz && !quizDone) {
      setShowQuiz(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        {module.title}
      </button>

      {/* Lesson header */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
              <span className="text-lg">{module.icon}</span>
              <span>{module.title}</span>
            </div>
            <h1 className="text-xl font-bold">{lesson.title}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {lesson.duration}
            </span>
            {isCompleted && (
              <div className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                Complétée
              </div>
            )}
          </div>
        </div>

        {/* Key points */}
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 mb-4">
          <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Points clés
          </p>
          <ul className="space-y-1.5">
            {lesson.keyPoints.map((point, i) => (
              <li key={i} className="text-sm text-white/80 flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-sm max-w-none">
          {lesson.content.split("\n\n").map((paragraph, i) => {
            if (!paragraph.trim()) return null;
            // Detect bullet list
            if (paragraph.trim().startsWith("•")) {
              const items = paragraph.split("\n").filter((l) => l.trim().startsWith("•"));
              return (
                <ul key={i} className="list-none space-y-1.5 mb-4">
                  {items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-white/80">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/40 mt-1.5 shrink-0" />
                      <span
                        dangerouslySetInnerHTML={{
                          __html: item.replace("• ", "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                        }}
                      />
                    </li>
                  ))}
                </ul>
              );
            }
            // Parse bold inline **text**
            const html = paragraph
              .replace(/\*\*(.*?)\*\*/g, "<strong class='text-white'>$1</strong>")
              .replace(/\n/g, "<br/>");
            return (
              <p
                key={i}
                className="text-white/75 leading-relaxed mb-4"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          })}
        </div>

        {/* CTA */}
        {!showQuiz && (
          <button
            onClick={handleReadingDone}
            className="mt-4 w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            {lesson.quiz ? (
              <>
                <Award className="w-4 h-4" />
                {quizDone ? "Revoir le quiz" : "J'ai compris, passer au quiz !"}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Marquer comme lu
              </>
            )}
          </button>
        )}
      </div>

      {/* Quiz */}
      <AnimatePresence>
        {showQuiz && lesson.quiz && (
          <QuizSection
            questions={lesson.quiz}
            existingScore={progress.quizScores[key]}
            onComplete={(score) => {
              onSaveQuiz(score);
              setQuizDone(true);
            }}
            onClose={() => setShowQuiz(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Quiz section ─────────────────────────────────────────────────────────────
function QuizSection({
  questions,
  existingScore,
  onComplete,
  onClose,
}: {
  questions: QuizQuestion[];
  existingScore?: number;
  onComplete: (score: number) => void;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(questions.map(() => null));
  const [showResult, setShowResult] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const q = questions[current];
  const answered = answers[current] !== null;
  const isCorrect = answers[current] === q.correct;

  const handleAnswer = (optIdx: number) => {
    if (answered) return;
    const updated = [...answers];
    updated[current] = optIdx;
    setAnswers(updated);
    setShowExplanation(true);
  };

  const handleNext = () => {
    setShowExplanation(false);
    if (current < questions.length - 1) {
      setCurrent(current + 1);
    } else {
      const correct = answers.filter((a, i) => a === questions[i].correct).length;
      const score = Math.round((correct / questions.length) * 100);
      onComplete(score);
      setShowResult(true);
    }
  };

  const handleRestart = () => {
    setCurrent(0);
    setAnswers(questions.map(() => null));
    setShowResult(false);
    setShowExplanation(false);
  };

  if (showResult) {
    const correct = answers.filter((a, i) => a === questions[i].correct).length;
    const score = Math.round((correct / questions.length) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 text-center"
      >
        <div className={cn(
          "w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-4xl",
          score >= 80 ? "bg-emerald-500/20" : score >= 50 ? "bg-yellow-500/20" : "bg-red-500/20"
        )}>
          {score >= 80 ? "🏆" : score >= 50 ? "📚" : "💪"}
        </div>
        <h3 className="text-xl font-bold mb-2">Quiz terminé !</h3>
        <p className="text-4xl font-black mb-2" style={{
          color: score >= 80 ? "#4ade80" : score >= 50 ? "#facc15" : "#f87171"
        }}>
          {score}%
        </p>
        <p className="text-muted-foreground mb-1">
          {correct} / {questions.length} bonnes réponses
        </p>
        <p className="text-sm text-white/60 mb-6">
          {score >= 80
            ? "Excellent ! Vous maîtrisez ce contenu."
            : score >= 50
            ? "Pas mal ! Revoir les points que vous avez manqués."
            : "Continuez à apprendre, relisez la leçon avant de retenter."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Recommencer
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 transition-colors text-sm text-white"
          >
            <Check className="w-4 h-4" />
            Terminer
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      {/* Quiz header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          Quiz — Question {current + 1} / {questions.length}
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/10 rounded-full mb-5">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${((current) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <p className="font-medium text-lg mb-4">{q.question}</p>

      {/* Options */}
      <div className="space-y-3 mb-4">
        {q.options.map((option, i) => {
          const isSelected = answers[current] === i;
          const isCorrectOption = i === q.correct;
          let style = "bg-white/5 border-white/15 hover:bg-white/10";
          if (answered) {
            if (isCorrectOption) style = "bg-emerald-500/20 border-emerald-500/50";
            else if (isSelected && !isCorrectOption) style = "bg-red-500/20 border-red-500/50";
            else style = "bg-white/5 border-white/10 opacity-50";
          }

          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={answered}
              className={cn(
                "w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3",
                style,
                answered ? "cursor-default" : "cursor-pointer"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold",
                answered && isCorrectOption
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : answered && isSelected && !isCorrectOption
                  ? "bg-red-500 border-red-500 text-white"
                  : "border-white/30 text-white/50"
              )}>
                {answered
                  ? isCorrectOption ? <Check className="w-3 h-3" /> : isSelected ? <X className="w-3 h-3" /> : String.fromCharCode(65 + i)
                  : String.fromCharCode(65 + i)}
              </div>
              <span className="text-sm">{option}</span>
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      <AnimatePresence>
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={cn(
              "p-4 rounded-xl mb-4 border",
              isCorrect ? "bg-emerald-500/10 border-emerald-500/30" : "bg-orange-500/10 border-orange-500/30"
            )}>
              <p className={cn("text-sm font-medium mb-1", isCorrect ? "text-emerald-400" : "text-orange-400")}>
                {isCorrect ? "✓ Bonne réponse !" : "✗ Pas tout à fait..."}
              </p>
              <p className="text-sm text-white/70">{q.explanation}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {answered && (
        <button
          onClick={handleNext}
          className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-colors flex items-center justify-center gap-2"
        >
          {current < questions.length - 1 ? (
            <>Question suivante <ChevronRight className="w-4 h-4" /></>
          ) : (
            <>Voir les résultats <Trophy className="w-4 h-4" /></>
          )}
        </button>
      )}
    </motion.div>
  );
}
