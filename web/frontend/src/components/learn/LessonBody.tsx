"use client";

import { Fragment, useMemo } from "react";

/**
 * Rendu du texte des leçons.
 *
 * Le contenu du catalogue est écrit dans un format maison, à mi-chemin du
 * markdown : des paragraphes séparés par une ligne vide, du **gras**, et des
 * puces qui commencent par « • ». Un vrai moteur markdown ferait quarante
 * kilo-octets pour interpréter trois règles, et surtout il accepterait du HTML
 * brut — ce qui transformerait un fichier de contenu en surface d'injection.
 *
 * Ici rien n'est interprété comme du balisage : le texte est découpé, et seuls
 * des nœuds React sont produits. Une leçon ne peut donc pas injecter de HTML,
 * quoi qu'elle contienne.
 */

/** Découpe une ligne en segments, en traitant **gras** comme du gras. */
function inline(text: string, keyBase: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={`${keyBase}-${i}`} style={{ color: "var(--cap-ink)", fontWeight: 600 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={`${keyBase}-${i}`}>{part}</Fragment>;
  });
}

export function LessonBody({ content }: { content: string }) {
  const blocks = useMemo(() => {
    // Un bloc = un paragraphe, ou une suite de puces consécutives. Les puces
    // doivent être regroupées : une <ul> par puce donnerait des listes d'un
    // seul élément, que les lecteurs d'écran annoncent une par une.
    const out: { kind: "p" | "ul"; lines: string[] }[] = [];
    for (const para of content.split(/\n{2,}/)) {
      const lines = para.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) continue;

      let buffer: string[] = [];
      let mode: "p" | "ul" | null = null;
      const flush = () => {
        if (buffer.length && mode) out.push({ kind: mode, lines: buffer });
        buffer = [];
      };
      for (const line of lines) {
        const isBullet = line.startsWith("•");
        const next = isBullet ? "ul" : "p";
        if (mode && next !== mode) flush();
        mode = next;
        buffer.push(isBullet ? line.replace(/^•\s*/, "") : line);
      }
      flush();
    }
    return out;
  }, [content]);

  return (
    <div className="space-y-4">
      {blocks.map((b, i) =>
        b.kind === "ul" ? (
          <ul key={i} className="space-y-2 pl-1">
            {b.lines.map((line, j) => (
              <li key={j} className="flex gap-3 text-[0.95rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>
                {/* Un point, pas une puce de liste : la puce native se place
                    mal dès que le texte passe à la ligne. */}
                <span
                  aria-hidden
                  className="mt-[0.6em] h-[3px] w-[3px] shrink-0 rounded-full"
                  style={{ backgroundColor: "var(--cap-ink-4)" }}
                />
                <span>{inline(line, `${i}-${j}`)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p
            key={i}
            className="text-[0.95rem] leading-relaxed"
            style={{ color: "var(--cap-ink-2)" }}
          >
            {b.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(line, `${i}-${j}`)}
              </Fragment>
            ))}
          </p>
        )
      )}
    </div>
  );
}
