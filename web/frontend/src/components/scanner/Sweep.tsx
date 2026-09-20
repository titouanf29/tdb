"use client";

import { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { Text } from "@/components/design-system";
import { fr } from "@/lib/SettingsContext";

/**
 * Le balayage, pendant qu'il a lieu.
 *
 * Un scan de l'univers entier demande plusieurs minutes. Un sablier pendant
 * ce temps-là ne dit pas si quelque chose travaille — et c'est la raison pour
 * laquelle le scan est diffusé au fil de l'eau côté serveur.
 *
 * Ce qui est dessiné ici est donc l'ÉTAT RÉEL et rien d'autre : une pastille
 * par actif de l'univers, qui s'allume quand cet actif a été scoré, verte
 * quand il est retenu. La progression n'est pas une barre calibrée sur une
 * durée devinée — elle compte des actifs réellement traités.
 *
 * Le rendu passe par un canvas plutôt que par 819 éléments du DOM. Mesuré sur
 * un univers complet, la version DOM faisait tomber le rafraîchissement à
 * quelques images par seconde pendant que le flux arrivait : l'animation
 * censée montrer la fluidité du travail était ce qui la détruisait.
 *
 * Rien ne clignote si l'utilisateur a demandé un mouvement réduit : la grille
 * se remplit alors sans transition, ce qui reste parfaitement lisible.
 */

const CELL = 9;   // côté d'une pastille, en pixels CSS
const GAP = 3;

export interface SweepState {
  /** Tous les symboles de l'univers, dans l'ordre où le serveur les a annoncés. */
  symbols: string[];
  /** Ceux qui ont été scorés, et s'ils ont été retenus. */
  done: Map<string, boolean>;
}

export function Sweep({
  state,
  phase,
  kept,
  elapsed,
}: {
  state: SweepState;
  /** Ce que le serveur est en train de faire, dans ses mots. */
  phase: string;
  kept: number;
  elapsed: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  const total = state.symbols.length;
  const traites = state.done.size;
  const pct = total ? (traites / total) * 100 : 0;

  // La grille s'adapte à la largeur disponible ; le nombre de colonnes est
  // recalculé au redimensionnement par l'effet ci-dessous.
  const dessiner = useMemo(
    () => (canvas: HTMLCanvasElement) => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const cols = Math.max(1, Math.floor((w + GAP) / (CELL + GAP)));
      const rows = Math.ceil(total / cols) || 1;
      const h = rows * (CELL + GAP) - GAP;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Les couleurs viennent des jetons : une pastille codée en dur
      // resterait claire en mode sombre.
      const css = getComputedStyle(document.documentElement);
      const attente = css.getPropertyValue("--cap-surface-2").trim() || "#E0E6EE";
      const vu = css.getPropertyValue("--cap-ink-4").trim() || "rgba(11,23,38,0.47)";
      const retenu = css.getPropertyValue("--cap-up").trim() || "#097241";

      state.symbols.forEach((sym, i) => {
        const etat = state.done.get(sym);
        ctx.fillStyle = etat === undefined ? attente : etat ? retenu : vu;
        const x = (i % cols) * (CELL + GAP);
        const y = Math.floor(i / cols) * (CELL + GAP);
        // Un carré arrondi de 9 px : roundRect existe partout où tourne une
        // version de Chrome ou Safari des trois dernières années, et le repli
        // rectangulaire reste lisible ailleurs.
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(x, y, CELL, CELL, 2.5);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, CELL, CELL);
        }
      });
    },
    [state, total]
  );

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    dessiner(c);
    const ro = new ResizeObserver(() => dessiner(c));
    if (c.parentElement) ro.observe(c.parentElement);
    return () => ro.disconnect();
  }, [dessiner]);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
        <Text size="small" tone="ink" as="span">{phase}</Text>
        <Text size="caption" as="span">
          <span className="cap-num">{traites}</span> / {total}
          {kept > 0 && <> · <span className="cap-num">{kept}</span> retenue{kept > 1 ? "s" : ""}</>}
          {elapsed > 0 && <> · {fr(elapsed, 0)} s</>}
        </Text>
      </div>

      <div
        className="mt-2.5 h-[3px] w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--cap-surface-2)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: "var(--cap-ocean)",
            transition: reduce ? "none" : "width 260ms linear",
          }}
        />
      </div>

      <div className="relative mt-4">
        <canvas ref={ref} aria-hidden className="block" />
      </div>
    </div>
  );
}
