"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { ALL_TERMS, type TooltipDefinition } from "@/lib/glossary";
import { useUserLevel, type VocabularyMode } from "@/hooks/useUserLevel";
import {
  EmptyState, Heading, Panel, SegmentedControl, Text, WeatherBackdrop,
  useAnimationsEnabled,
} from "@/components/design-system";

/**
 * Every term, defined at the depth you ask for.
 *
 * The same three levels as the analysis screen — simple, standard,
 * technical — because a glossary that only speaks one register is useless to
 * half its readers: a beginner bounces off the technical wording and an
 * experienced reader finds the simple one patronising. The default follows
 * the account's level, and is switchable per visit.
 *
 * Alphabetical, one column, no cards. A glossary is consulted, not browsed:
 * you arrive knowing the word you want, so search and order matter and
 * presentation does not.
 */

type Entry = [string, TooltipDefinition];

const LEVELS: { value: VocabularyMode; label: string }[] = [
  { value: "simple", label: "Simple" },
  { value: "standard", label: "Standard" },
  { value: "technical", label: "Technique" },
];

/** Strip accents and case so "volatilite" finds "Volatilité". */
const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function GlossairePage() {
  const { vocabularyMode } = useUserLevel();
  const [animOn] = useAnimationsEnabled();
  const [mode, setMode] = useState<VocabularyMode>(vocabularyMode);
  const [query, setQuery] = useState("");

  const entries = useMemo(() => {
    const all = Object.entries(ALL_TERMS).sort(([a], [b]) => a.localeCompare(b, "fr"));
    const q = fold(query.trim());
    if (!q) return all;
    return all.filter(
      ([term, def]) => fold(term).includes(q) || fold(def[mode] ?? "").includes(q)
    );
  }, [query, mode]);

  // Grouped by first letter, so the list has landmarks rather than being one
  // unbroken run of sixty entries.
  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>();
    entries.forEach((e) => {
      const letter = e[0].charAt(0).toUpperCase();
      map.set(letter, [...(map.get(letter) ?? []), e]);
    });
    // Array.from rather than a spread: the build targets ES5 iteration, where
    // spreading a Map iterator needs downlevelIteration.
    return Array.from(map.entries());
  }, [entries]);

  return (
    <>
      <WeatherBackdrop condition="fair" enabled={animOn} />

      <div className="relative space-y-8">
        <header className="pt-2">
          <Heading level={1}>Glossaire</Heading>
          <Text className="mt-2.5 max-w-[36rem]">
            {Object.keys(ALL_TERMS).length} termes, définis au niveau de détail
            que vous choisissez. Aucun n&apos;est supposé connu.
          </Text>
        </header>

        <Panel
          title="Chercher un terme"
          aside={
            <SegmentedControl
              size="sm"
              options={LEVELS}
              value={mode}
              onChange={setMode}
              aria-label="Niveau de détail"
            />
          }
        >
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: "var(--cap-ink-4)" }}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="RSI, volatilité, levier…"
              aria-label="Chercher un terme"
              className="h-12 w-full rounded-[12px] pl-10 pr-3.5 text-[0.95rem] outline-none placeholder:text-[color:var(--cap-ink-4)]"
              style={{
                backgroundColor: "var(--cap-bg)",
                color: "var(--cap-ink)",
                boxShadow: "inset 0 0 0 1px var(--cap-line-strong)",
              }}
            />
          </div>
        </Panel>

        {entries.length === 0 ? (
          <Panel>
            <EmptyState
              title="Aucun terme ne correspond"
              description="Essayez le nom d'un indicateur, d'un type d'ordre ou d'une notion de risque."
              action={{ label: "Tout afficher", onClick: () => setQuery("") }}
            />
          </Panel>
        ) : (
          <div className="space-y-5">
            {groups.map(([letter, items]) => (
              <Panel key={letter} title={letter}>
                <dl className="[&>*+*]:mt-0 [&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
                  {items.map(([term, def]: Entry) => (
                    <div key={term} className="py-4 first:pt-0 last:pb-0">
                      <dt
                        className="text-[0.98rem] font-semibold"
                        style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}
                      >
                        {term}
                      </dt>
                      <dd className="mt-1.5">
                        <Text size="small">{def[mode]}</Text>
                        {def.example && (
                          <p
                            className="mt-2 border-l-2 pl-3 text-[0.82rem] leading-relaxed"
                            style={{ borderColor: "var(--cap-line-strong)", color: "var(--cap-ink-3)" }}
                          >
                            {def.example}
                          </p>
                        )}
                        {def.learnLink && (
                          <Link
                            href={def.learnLink}
                            className="mt-2.5 inline-flex items-center gap-1.5 text-[0.82rem] transition-colors hover:text-[color:var(--cap-ink)]"
                            style={{ color: "var(--cap-ocean)" }}
                          >
                            En savoir plus
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Panel>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
