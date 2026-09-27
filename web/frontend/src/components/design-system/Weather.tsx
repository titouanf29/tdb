"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { motion } from "framer-motion";
import { SILHOUETTES } from "./CloudLayer";
import { useMouvementReduit } from "./useMouvementReduit";

/**
 * Live weather behind the app.
 *
 * It is not decoration: the sky reports the market. The condition comes from
 * the average move of the assets the user actually follows, so a glance at the
 * background answers "what kind of day is it?" before a single number is read.
 * A backdrop that changed at random would be noise; this one carries the one
 * piece of information every trader checks first anyway.
 *
 *   clear    the followed assets are up strongly      sun, two clouds
 *   fair     mildly up                                sun, light cover
 *   cloudy   flat                                     full cover, slow
 *   overcast down                                     low deck, heavier
 *   heavy    down sharply                             deck closes in, veil
 *
 * The sky only ever drifts. Rain and wind streaks were drawn here at one
 * point and removed: precipitation is the one weather effect that has to move
 * fast to be read as itself, and something moving fast behind a screen people
 * read numbers on is a distraction whatever it represents. A bad day now
 * shows as a lower, darker, slower deck — the same information, told the way
 * the rest of the interface tells things.
 *
 * Everything animates on transform or opacity only, loops seamlessly, and can
 * be switched off — some people want a plain surface to work on, and that is a
 * legitimate preference rather than a fallback.
 */

export type WeatherCondition = "clear" | "fair" | "cloudy" | "overcast" | "heavy";

export const WEATHER_LABEL: Record<WeatherCondition, string> = {
  clear: "Ciel dégagé",
  fair: "Éclaircies",
  cloudy: "Couvert",
  overcast: "Ciel bas",
  heavy: "Ciel lourd",
};

/** Average percentage move → condition. The thresholds are deliberately wide:
 *  the sky should change once or twice a day, not with every tick. */
export function conditionFromChange(avgChangePct: number | null): WeatherCondition {
  if (avgChangePct == null) return "cloudy";
  if (avgChangePct >= 1.2) return "clear";
  if (avgChangePct >= 0.25) return "fair";
  if (avgChangePct > -0.25) return "cloudy";
  if (avgChangePct > -1.2) return "overcast";
  return "heavy";
}

const STORAGE_KEY = "tdb_animations";

/**
 * The ambient-animation switch, remembered per browser. Defaults to on.
 *
 * It governs everything that moves on its own — the weather, the cloud
 * curtain between screens, the entrance reveals. Naming a control "couper les
 * animations" and having it stop only the sky would be a lie told by a
 * button, so the flag is shared and every ambient animation reads it.
 */
export function useAnimationsEnabled(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(true);

  useEffect(() => {
    try {
      setOn(localStorage.getItem(STORAGE_KEY) !== "off");
    } catch {
      /* private mode — keep the default */
    }
  }, []);

  const set = useCallback((v: boolean) => {
    setOn(v);
    try { localStorage.setItem(STORAGE_KEY, v ? "on" : "off"); } catch { /* ignore */ }
  }, []);

  return [on, set];
}

/* ── Pieces ───────────────────────────────────────────────────────────────── */

function DriftingCloud({
  shape,
  top,
  width,
  duration,
  delay,
  opacity,
  flip,
}: {
  shape: number;
  top: string;
  width: number;
  duration: number;
  delay: number;
  opacity: number;
  flip?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const { lobes, base } = SILHOUETTES[shape];

  return (
    <motion.svg
      viewBox="0 0 200 100"
      aria-hidden
      className="absolute"
      style={{ top, width: `${width}vw`, height: "auto", opacity, overflow: "visible" }}
      initial={{ x: "-40vw" }}
      animate={{ x: "115vw" }}
      transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
    >
      <defs>
        {/* La masse éclairée. Quatre arrêts, et le plus important est le
            troisième : c'est là que la lumière bascule vers l'ombre, et un
            cumulus se reconnaît à la netteté de ce basculement. Un dégradé
            régulier du haut vers le bas donne une bulle, pas un nuage. */}
        <linearGradient id={`${id}-f`} x1="0.15" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="var(--cap-sky-1)" />
          <stop offset="38%" stopColor="var(--cap-sky-2)" />
          <stop offset="66%" stopColor="var(--cap-sky-3)" />
          <stop offset="100%" stopColor="var(--cap-sky-4)" />
        </linearGradient>

        {/* Le ventre : une seconde passe, plus sombre, décalée vers le bas et
            écrêtée par la silhouette. C'est elle qui donne l'épaisseur — une
            masse sans dessous est une tache. */}
        <linearGradient id={`${id}-b`} x1="0" y1="0.42" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--cap-sky-4)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--cap-sky-4)" stopOpacity="0.85" />
        </linearGradient>

        {/* La couronne : le point où le soleil frappe. Décentré vers le haut à
            gauche, comme la lumière du reste de la page. */}
        <radialGradient id={`${id}-h`} cx="0.36" cy="0.26" r="0.52">
          <stop offset="0%" stopColor="var(--cap-sky-1)" stopOpacity="0.95" />
          <stop offset="100%" stopColor="var(--cap-sky-1)" stopOpacity="0" />
        </radialGradient>

        {/* Deux flous, pas un. Le contour reste lisible pendant que l'intérieur
            se fond : appliquer le même flou partout dissolvait la forme, et
            c'est ce qui rendait les nuages invisibles. */}
        <filter id={`${id}-soft`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        <filter id={`${id}-wide`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4.5" />
        </filter>

        {/* La silhouette, définie une fois et réutilisée par chaque passe. */}
        <g id={`${id}-shape`}>
          <ellipse cx={base[0]} cy={base[1]} rx={base[2]} ry={base[3]} />
          {lobes.map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} />
          ))}
        </g>
        <clipPath id={`${id}-clip`}>
          <use href={`#${id}-shape`} />
        </clipPath>
      </defs>

      <g transform={flip ? "translate(200,0) scale(-1,1)" : undefined}>
        {/* 1. Le halo, très flou : l'air autour de la masse. */}
        <use
          href={`#${id}-shape`}
          fill="var(--cap-sky-2)"
          filter={`url(#${id}-wide)`}
          opacity="0.5"
        />
        {/* 2. Le corps. */}
        <use href={`#${id}-shape`} fill={`url(#${id}-f)`} filter={`url(#${id}-soft)`} />
        {/* 3. L'ombre du dessous, écrêtée par la forme. */}
        <g clipPath={`url(#${id}-clip)`}>
          <rect x="0" y="0" width="200" height="100" fill={`url(#${id}-b)`} />
          {/* Les lobes redessinés à l'intérieur : leurs bords créent le
              modelé qui distingue un cumulus d'une masse lisse. */}
          {lobes.map(([cx, cy, r], i) => (
            <circle
              key={`m${i}`}
              cx={cx}
              cy={cy + r * 0.16}
              r={r * 0.92}
              fill="var(--cap-sky-1)"
              opacity="0.16"
            />
          ))}
        </g>
        {/* 4. La couronne éclairée, par-dessus tout. */}
        <g clipPath={`url(#${id}-clip)`}>
          <rect x="0" y="0" width="200" height="100" fill={`url(#${id}-h)`} />
        </g>
      </g>
    </motion.svg>
  );
}

/** Light from the top right. Never a drawn disc — a warm wash reads as sun
 *  without turning the page into a weather app icon. */
function Sun({ strength }: { strength: number }) {
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        backgroundImage:
          `radial-gradient(42% 34% at 88% 2%, rgba(var(--cap-sun-core), ${0.1 * strength}), transparent 68%),` +
          `radial-gradient(70% 50% at 84% -6%, rgba(var(--cap-sun-halo), ${0.14 * strength}), transparent 72%)`,
      }}
    />
  );
}

/**
 * A heavy sky, without a drop of rain.
 *
 * Still — it does not animate at all. What makes a day read as grim is the
 * light going flat, and that is a wash, not a movement. The clouds keep
 * drifting over it, so the sky is alive; the weight is just the air.
 */
function Veil({ strength }: { strength: number }) {
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        backgroundImage:
          `linear-gradient(180deg, rgba(var(--cap-veil-rgb), ${0.07 * strength}) 0%, rgba(var(--cap-veil-rgb), ${0.02 * strength}) 46%, transparent 78%),` +
          `radial-gradient(64% 40% at 22% -4%, rgba(var(--cap-veil-tint), ${0.06 * strength}), transparent 70%)`,
      }}
    />
  );
}

/* ── The backdrop ─────────────────────────────────────────────────────────── */

/** Sept positions de départ réparties dans le cycle, jamais consécutives. */
const PHASES = [0.04, 0.61, 0.28, 0.87, 0.45, 0.15, 0.73];

const PRESETS: Record<
  WeatherCondition,
  {
    sun: number;
    veil?: number;
    speed: number;
    clouds: { shape: number; top: string; w: number; o: number; flip?: boolean }[];
  }
> = {
  /*
   * La répartition compte autant que le dessin.
   *
   * Les masses étaient groupées vers le haut : mesuré, le bandeau supérieur
   * était richement modulé pendant que les marges latérales restaient à 1,16
   * d'écart-type — un aplat pâle et uniforme, exactement ce qui fatigue.
   * Chaque état couvre maintenant toute la hauteur, avec des tailles et des
   * vitesses dépareillées pour que rien ne se lise comme une rangée.
   *
   * Les panneaux sont opaques : le texte n'est jamais posé sur un nuage, sauf
   * le titre de page, qui est grand et à 15:1.
   */
  clear: {
    sun: 1, speed: 1,
    clouds: [
      { shape: 3, top: "0%",  w: 42, o: 0.9 },
      { shape: 0, top: "24%", w: 30, o: 0.62, flip: true },
      { shape: 2, top: "52%", w: 36, o: 0.7 },
      { shape: 1, top: "78%", w: 28, o: 0.6, flip: true },
    ],
  },
  fair: {
    sun: 0.6, speed: 1,
    clouds: [
      { shape: 0, top: "-4%", w: 50, o: 1 },
      { shape: 2, top: "18%", w: 34, o: 0.72, flip: true },
      { shape: 3, top: "38%", w: 42, o: 0.82 },
      { shape: 1, top: "58%", w: 30, o: 0.66, flip: true },
      { shape: 2, top: "76%", w: 38, o: 0.76 },
      { shape: 0, top: "90%", w: 28, o: 0.6, flip: true },
    ],
  },
  cloudy: {
    sun: 0, speed: 1.25,
    clouds: [
      { shape: 1, top: "-10%", w: 60, o: 1 },
      { shape: 2, top: "8%",   w: 44, o: 0.88, flip: true },
      { shape: 0, top: "26%",  w: 52, o: 0.92 },
      { shape: 3, top: "44%",  w: 38, o: 0.78, flip: true },
      { shape: 2, top: "60%",  w: 48, o: 0.86 },
      { shape: 1, top: "76%",  w: 40, o: 0.8, flip: true },
      { shape: 0, top: "90%",  w: 34, o: 0.72 },
    ],
  },
  // Une journée en baisse : le plafond descend et ralentit.
  overcast: {
    sun: 0, veil: 0.55, speed: 0.75,
    clouds: [
      { shape: 2, top: "-8%", w: 64, o: 1 },
      { shape: 1, top: "12%", w: 50, o: 0.9, flip: true },
      { shape: 2, top: "30%", w: 56, o: 0.94 },
      { shape: 0, top: "48%", w: 42, o: 0.82, flip: true },
      { shape: 3, top: "64%", w: 50, o: 0.88 },
      { shape: 1, top: "82%", w: 40, o: 0.78, flip: true },
    ],
  },
  // Une mauvaise journée : masses plus larges, voile complet, dérive la plus
  // lente de toutes.
  heavy: {
    sun: 0, veil: 1, speed: 0.55,
    clouds: [
      { shape: 1, top: "-14%", w: 70, o: 1 },
      { shape: 2, top: "2%",   w: 58, o: 0.95, flip: true },
      { shape: 0, top: "22%",  w: 62, o: 0.92 },
      { shape: 3, top: "42%",  w: 48, o: 0.84, flip: true },
      { shape: 2, top: "60%",  w: 54, o: 0.88 },
      { shape: 0, top: "80%",  w: 44, o: 0.8, flip: true },
    ],
  },
};

export function WeatherBackdrop({
  condition = "cloudy",
  enabled = true,
}: {
  condition?: WeatherCondition;
  enabled?: boolean;
}) {
  const reduce = useMouvementReduit();
  // Off, or reduced motion: nothing at all. A still sky would be a decoration
  // with no information in it, which is the thing this component is not.
  if (!enabled || reduce) return null;

  const preset = PRESETS[condition];
  // Base crossing time, in seconds, for the full width plus its margins.
  // It was 150, which works out at about 18 px/s — slow enough that the sky
  // read as a still image. At 52 a cloud crosses in under a minute: clearly
  // moving, still calm.
  const base = 52;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ opacity: 0.95 }}
    >
      {preset.sun > 0 && <Sun strength={preset.sun} />}
      {preset.veil ? <Veil strength={preset.veil} /> : null}
      {preset.clouds.map((c, i) => (
        <DriftingCloud
          key={`${condition}-${i}`}
          shape={c.shape}
          top={c.top}
          width={c.w}
          opacity={c.o}
          flip={c.flip}
          duration={(base / preset.speed) * (1 + (i % 3) * 0.26)}
          // Le décalage de départ, pris dans une table dispersée plutôt que
          // calculé en rampe.
          //
          // Avec un pas régulier — 0,17 puis 0,40 puis 0,63… — chaque nuage
          // part un peu après le précédent, et comme ils avancent à la même
          // allure ils restent en file. Mesuré à un instant donné : x = 231,
          // 506, 697, 838, 945… une diagonale qui traverse l'écran, laissant
          // la moitié du ciel vide en permanence. La marge gauche restait à
          // 1,16 d'écart-type quoi qu'on fasse sur la taille des masses.
          //
          // Ces sept valeurs couvrent l'intervalle sans se suivre, donc le
          // ciel est occupé sur toute sa largeur à n'importe quel moment.
          delay={-(base / preset.speed) * PHASES[i % PHASES.length]}
        />
      ))}
    </div>
  );
}
