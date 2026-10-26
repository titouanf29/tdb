"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { missionsAPI, type Mission, type UserProgress } from "@/lib/api";
import {
  CloudCurtain, EmptyState, Heading, Num, Panel, Progress, SegmentedControl,
  Text, WeatherBackdrop, useAnimationsEnabled,
} from "@/components/design-system";

/**
 * Missions — short objectives that turn reading into practice.
 *
 * Deliberately not gamified into a points arcade. The XP and the level are
 * shown once, at the top, as a statement of where you are; the missions
 * themselves are phrased as things worth doing, not as rewards worth
 * collecting. A learning product that makes the badge more attractive than the
 * skill has taught the wrong thing.
 *
 * Active first, then not started, completed last and collapsed to one line.
 * What you could do now is the only part that needs room.
 */

type Filter = "todo" | "done" | "all";

export default function MissionsPage() {
  const [animOn] = useAnimationsEnabled();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("todo");

  useEffect(() => {
    Promise.allSettled([missionsAPI.list(), missionsAPI.progress()])
      .then(([m, p]) => {
        if (m.status === "fulfilled") setMissions(m.value.missions || []);
        if (p.status === "fulfilled") setProgress(p.value);
      })
      .finally(() => setLoading(false));
  }, []);

  const shown = useMemo(() => {
    const rank = (m: Mission) =>
      m.status === "active" ? 0 : m.status === "not_started" ? 1 : 2;
    const list = missions.filter((m) =>
      filter === "all" ? true
      : filter === "done" ? m.status === "completed"
      : m.status !== "completed"
    );
    return list.sort((a, b) => rank(a) - rank(b) || b.xp - a.xp);
  }, [missions, filter]);

  const done = missions.filter((m) => m.status === "completed").length;

  if (loading) return <CloudCurtain active label="Chargement de vos missions" />;

  return (
    <>
      <WeatherBackdrop condition="fair" enabled={animOn} />

      <div className="relative space-y-8">
        <header className="pt-2">
          <Heading level={1}>Missions</Heading>
          <Text className="mt-2.5 max-w-[36rem]">
            Des objectifs courts, faits pour être terminés en une séance. Rien
            n&apos;est obligatoire, rien n&apos;expire.
          </Text>
        </header>

        {progress && (
          <Panel title="Où vous en êtes">
            <div className="flex flex-wrap items-end gap-x-12 gap-y-6">
              <div>
                <Num className="text-[1.9rem] font-medium leading-none">
                  Niveau {progress.level}
                </Num>
                <Text size="caption" className="mt-2">
                  {progress.xp} points d&apos;expérience
                </Text>
              </div>
              <div>
                <Num className="text-[1.3rem] font-medium leading-none">
                  {done} / {missions.length}
                </Num>
                <Text size="caption" className="mt-2">missions terminées</Text>
              </div>
              {progress.streak_days > 0 && (
                <div>
                  <Num className="text-[1.3rem] font-medium leading-none">
                    {progress.streak_days} j
                  </Num>
                  <Text size="caption" className="mt-2">jours consécutifs</Text>
                </div>
              )}
            </div>

            {progress.xp_for_next_level > 0 && (
              <div className="mt-6 max-w-[26rem]">
                <Progress
                  value={progress.xp_in_current_level}
                  max={progress.xp_for_next_level}
                  label={`Vers le niveau ${progress.level + 1}`}
                  showValue={false}
                />
                <Text size="caption" className="mt-2">
                  {progress.xp_for_next_level - progress.xp_in_current_level} points
                  restants
                </Text>
              </div>
            )}
          </Panel>
        )}

        <Panel
          title="Vos missions"
          aside={
            <SegmentedControl
              size="sm"
              options={[
                { value: "todo", label: "À faire" },
                { value: "done", label: "Terminées" },
                { value: "all", label: "Toutes" },
              ]}
              value={filter}
              onChange={setFilter}
              aria-label="Filtre"
            />
          }
        >
          {shown.length === 0 ? (
            <EmptyState
              title={filter === "done" ? "Aucune mission terminée" : "Rien à faire pour l'instant"}
              description={
                filter === "done"
                  ? "Elles apparaîtront ici au fur et à mesure."
                  : "Vous avez terminé tout ce qui était disponible. Revenez demain."
              }
            />
          ) : (
            <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
              {shown.map((m) => (
                <MissionRow key={m.id} mission={m} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function MissionRow({ mission: m }: { mission: Mission }) {
  const completed = m.status === "completed";
  const pct = m.target > 0 ? Math.min(100, (m.progress / m.target) * 100) : 0;

  return (
    <li className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
      <span
        aria-hidden
        className="mt-[3px] flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor: completed ? "var(--cap-ocean)" : "transparent",
          boxShadow: completed ? "none" : "inset 0 0 0 1.5px var(--cap-line-strong)",
        }}
      >
        {completed && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-4">
          <span
            className="text-[0.95rem] font-medium"
            style={{
              color: completed ? "var(--cap-ink-3)" : "var(--cap-ink)",
              textDecoration: completed ? "line-through" : undefined,
            }}
          >
            {m.title}
          </span>
          <Num tone="muted" className="shrink-0 text-[0.8rem]">
            +{m.xp}
          </Num>
        </div>

        {!completed && (
          <>
            <Text size="caption" className="mt-1">{m.description}</Text>
            {/* Only when there is something to show: a bar stuck at zero
                tells you nothing you did not already know from the tick. */}
            {m.target > 1 && m.progress > 0 && (
              <div className="mt-3 max-w-[18rem]">
                <Progress value={pct} label={`${m.progress} / ${m.target}`} showValue={false} />
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
}
