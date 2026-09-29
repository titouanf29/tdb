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
  enCours = true,
}: {
  state: SweepState;
  /** Ce que le serveur est en train de faire, dans ses mots. */
  phase: string;
  kept: number;
  elapsed: number;
  /** Faux une fois le scan arrêté : le faisceau s'éteint. */
  enCours?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  const total = state.symbols.length;
  const traites = state.done.size;
  const pct = total ? (traites / total) * 100 : 0;

  // Quand chaque actif a été vu pour la première fois : sert à le faire
  // briller un instant. Gardé hors de l'état React, il n'a rien à re-rendre.
  const vus = useRef(new Map<string, number>());
  const debut = useRef(performance.now());

  // La grille s'adapte à la largeur disponible ; le nombre de colonnes est
  // recalculé à chaque image (c'est une division) pendant l'animation.
  const dessiner = useMemo(
    () => (canvas: HTMLCanvasElement, maintenant: number) => {
      const parent = canvas.parentElement;
      if (!parent) return false;
      const w = parent.clientWidth;
      const cols = Math.max(1, Math.floor((w + GAP) / (CELL + GAP)));
      const rows = Math.ceil(total / cols) || 1;
      const h = rows * (CELL + GAP) - GAP;

      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return false;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Les couleurs viennent des jetons : une pastille codée en dur
      // resterait claire en mode sombre.
      const css = getComputedStyle(document.documentElement);
      const attente = css.getPropertyValue("--cap-surface-2").trim() || "#E0E6EE";
      const vu = css.getPropertyValue("--cap-ink-4").trim() || "rgba(11,23,38,0.47)";
      const retenu = css.getPropertyValue("--cap-up").trim() || "#097241";
      const ocean = css.getPropertyValue("--cap-ocean").trim() || "#1B5E7A";

      const carre = (x: number, y: number, c: number) => {
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(x, y, c, c, 2.5);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, c, c);
        }
      };

      // Vrai tant qu'il reste quelque chose à animer (éclat ou faisceau).
      let bouge = false;
      state.symbols.forEach((sym, i) => {
        const etat = state.done.get(sym);
        const x = (i % cols) * (CELL + GAP);
        const y = Math.floor(i / cols) * (CELL + GAP);
        if (etat !== undefined && !vus.current.has(sym)) vus.current.set(sym, maintenant);
        // L'âge depuis l'allumage : une pastille qui vient d'être scorée
        // grossit un peu et s'éclaire, puis se pose.
        const age = etat === undefined || reduce ? Infinity : maintenant - (vus.current.get(sym) ?? 0);
        const k = age < 420 ? 1 - age / 420 : 0;
        if (k > 0) bouge = true;

        ctx.globalAlpha = 1;
        ctx.fillStyle = etat === undefined ? attente : etat ? retenu : vu;
        const c = CELL + k * 3;
        carre(x - (c - CELL) / 2, y - (c - CELL) / 2, c);

        if (k > 0) {
          // L'éclat : de la couleur de l'océan pour un actif vu, un halo vert
          // plus large et plus long pour un actif retenu.
          ctx.globalAlpha = etat ? 0.35 * k : 0.45 * k;
          ctx.fillStyle = etat ? retenu : ocean;
          const halo = CELL + (etat ? 10 : 5) * (1 - k * 0.3);
          carre(x - (halo - CELL) / 2, y - (halo - CELL) / 2, halo);
        }
      });
      ctx.globalAlpha = 1;

      // Le faisceau : une bande de lumière qui balaie la grille, tant que le
      // scan tourne. Il dit « ça travaille » même entre deux réponses du
      // serveur, sans rien inventer sur l'avancement.
      if (!reduce && enCours && traites < total) {
        const periode = 2400;
        const t = ((maintenant - debut.current) % periode) / periode;
        const bx = -120 + t * (w + 240);
        const g = ctx.createLinearGradient(bx - 90, 0, bx + 30, 0);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(0.75, "rgba(120,170,200,0.22)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(bx - 90, 0, 120, h);
        bouge = true;
      }
      return bouge;
    },
    [state, total, traites, reduce, enCours]
  );

  // Une boucle d'images seulement tant qu'il y a quelque chose qui bouge
  // (un éclat, ou le faisceau pendant le scan) ; sinon un seul dessin.
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    let raf = 0;
    const image = (t: number) => {
      if (dessiner(c, t)) raf = requestAnimationFrame(image);
    };
    raf = requestAnimationFrame(image);
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(image); });
    if (c.parentElement) ro.observe(c.parentElement);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [dessiner]);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
        <Text size="small" tone="ink" as="span">{phase}</Text>
        <Text size="caption" as="span">
          <span className="cap-num">{traites}</span> / {total}
          {/* Le compteur des retenues saute un peu à chaque nouvelle (la clé
              remonte l'élément, donc rejoue l'animation). */}
          {kept > 0 && <> · <span key={kept} className="cap-num cap-pop inline-block" style={{ color: "var(--cap-up)" }}>{kept}</span> retenue{kept > 1 ? "s" : ""}</>}
          {elapsed > 0 && <> · {fr(elapsed, 0)} s</>}
        </Text>
      </div>

      <div
        className="mt-2.5 h-[3px] w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--cap-surface-2)" }}
      >
        {/* En scaleX, pas en largeur : la barre avance sans recalculer la
            mise en page à chaque actif traité. */}
        <div
          className="h-full w-full origin-left rounded-full"
          style={{
            transform: `scaleX(${pct / 100})`,
            backgroundColor: "var(--cap-ocean)",
            transition: reduce ? "none" : "transform 320ms cubic-bezier(.22,1,.36,1)",
          }}
        />
      </div>

      <div className="relative mt-4">
        <canvas ref={ref} aria-hidden className="block" />
      </div>
    </div>
  );
}
