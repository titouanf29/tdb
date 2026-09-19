"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { SILHOUETTES } from "./CloudLayer";

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
 *   windy    down                                     faster drift, streaks
 *   rain     down sharply                             fine rain, dark cover
 *
 * Everything animates on transform or opacity only, loops seamlessly, and can
 * be switched off — some people want a plain surface to work on, and that is a
 * legitimate preference rather than a fallback.
 */

export type WeatherCondition = "clear" | "fair" | "cloudy" | "windy" | "rain";

export const WEATHER_LABEL: Record<WeatherCondition, string> = {
  clear: "Ciel dégagé",
  fair: "Éclaircies",
  cloudy: "Couvert",
  windy: "Vent",
  rain: "Pluie",
};

/** Average percentage move → condition. The thresholds are deliberately wide:
 *  the sky should change once or twice a day, not with every tick. */
export function conditionFromChange(avgChangePct: number | null): WeatherCondition {
  if (avgChangePct == null) return "cloudy";
  if (avgChangePct >= 1.2) return "clear";
  if (avgChangePct >= 0.25) return "fair";
  if (avgChangePct > -0.25) return "cloudy";
  if (avgChangePct > -1.2) return "windy";
  return "rain";
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
        {/* The app's own cloud palette, deeper than the landing page's.
            Measured against the workspace background, the marketing tones
            moved the luminance by one to four points out of 255 — the sky was
            technically drawn and visually absent. The crown stays soft; the
            body carries the contrast. */}
        <linearGradient id={`${id}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FCFDFE" />
          <stop offset="46%" stopColor="#DDE5EE" />
          <stop offset="78%" stopColor="#C2D0E0" />
          <stop offset="100%" stopColor="#AABDD3" />
        </linearGradient>
        {/* Less blur than the hero's: at this size a softer edge just dissolved
            the silhouette back into the page. */}
        <filter id={`${id}-s`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.7" />
        </filter>
      </defs>
      <g
        filter={`url(#${id}-s)`}
        fill={`url(#${id}-f)`}
        transform={flip ? "translate(200,0) scale(-1,1)" : undefined}
      >
        <ellipse cx={base[0]} cy={base[1]} rx={base[2]} ry={base[3]} />
        {lobes.map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} />
        ))}
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
          `radial-gradient(42% 34% at 88% 2%, rgba(229,168,58,${0.1 * strength}), transparent 68%),` +
          `radial-gradient(70% 50% at 84% -6%, rgba(255,236,196,${0.14 * strength}), transparent 72%)`,
      }}
    />
  );
}

/** Fine diagonal rain. Two layers at different speeds so it has depth, built
 *  from a repeating gradient rather than hundreds of elements. */
function Rain() {
  return (
    <>
      {[
        { dur: 0.75, o: 0.2, size: "3px 22px" },
        { dur: 1.15, o: 0.14, size: "4px 30px" },
      ].map((l, i) => (
        <motion.div
          key={i}
          aria-hidden
          className="absolute inset-[-20%]"
          style={{
            opacity: l.o,
            backgroundImage:
              "repeating-linear-gradient(105deg, var(--cap-ocean) 0 1px, transparent 1px 9px)",
            backgroundSize: l.size,
          }}
          animate={{ y: ["0%", "14%"], x: ["0%", "-3%"] }}
          transition={{ duration: l.dur, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </>
  );
}

/** Horizontal streaks. Wind is felt through what it moves, so this is a few
 *  fast hairlines rather than an effect of its own. */
function Wind() {
  return (
    <>
      {[
        { top: "22%", w: 34, dur: 5.5, delay: 0 },
        { top: "48%", w: 22, dur: 4.2, delay: 1.4 },
        { top: "71%", w: 28, dur: 6.4, delay: 2.6 },
      ].map((s, i) => (
        <motion.div
          key={i}
          aria-hidden
          className="absolute h-px"
          style={{
            top: s.top,
            width: `${s.w}vw`,
            background:
              "linear-gradient(90deg, transparent, var(--cap-ink-4), transparent)",
            opacity: 0.6,
          }}
          initial={{ x: "-40vw" }}
          animate={{ x: "120vw" }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </>
  );
}

/* ── The backdrop ─────────────────────────────────────────────────────────── */

const PRESETS: Record<
  WeatherCondition,
  { sun: number; speed: number; clouds: { shape: number; top: string; w: number; o: number; flip?: boolean }[] }
> = {
  clear: {
    sun: 1, speed: 1,
    clouds: [
      { shape: 3, top: "2%",  w: 40, o: 0.85 },
      { shape: 0, top: "46%", w: 32, o: 0.7, flip: true },
      { shape: 2, top: "74%", w: 28, o: 0.6 },
    ],
  },
  fair: {
    sun: 0.6, speed: 1,
    clouds: [
      { shape: 0, top: "-2%", w: 48, o: 0.95 },
      { shape: 2, top: "30%", w: 38, o: 0.8, flip: true },
      { shape: 3, top: "58%", w: 32, o: 0.68 },
      { shape: 1, top: "80%", w: 28, o: 0.58, flip: true },
    ],
  },
  cloudy: {
    sun: 0, speed: 1.25,
    clouds: [
      { shape: 1, top: "-8%", w: 58, o: 1 },
      { shape: 2, top: "14%", w: 50, o: 0.9, flip: true },
      { shape: 0, top: "40%", w: 44, o: 0.8 },
      { shape: 3, top: "62%", w: 38, o: 0.7, flip: true },
      { shape: 2, top: "82%", w: 34, o: 0.6 },
    ],
  },
  windy: {
    sun: 0, speed: 0.45,
    clouds: [
      { shape: 2, top: "-6%", w: 60, o: 1 },
      { shape: 1, top: "20%", w: 52, o: 0.88, flip: true },
      { shape: 2, top: "48%", w: 46, o: 0.76 },
      { shape: 0, top: "74%", w: 38, o: 0.64, flip: true },
    ],
  },
  rain: {
    sun: 0, speed: 0.7,
    clouds: [
      { shape: 1, top: "-12%", w: 66, o: 1 },
      { shape: 2, top: "6%",   w: 58, o: 0.92, flip: true },
      { shape: 0, top: "28%",  w: 50, o: 0.8 },
      { shape: 3, top: "52%",  w: 42, o: 0.66, flip: true },
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
  const reduce = useReducedMotion();
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
      {preset.clouds.map((c, i) => (
        <DriftingCloud
          key={`${condition}-${i}`}
          shape={c.shape}
          top={c.top}
          width={c.w}
          opacity={c.o}
          flip={c.flip}
          duration={(base / preset.speed) * (1 + i * 0.22)}
          // Negative delay starts each cloud partway across, so the sky is
          // already populated on arrival instead of filling up from the left.
          delay={-(base / preset.speed) * (0.17 + i * 0.23)}
        />
      ))}
      {condition === "windy" && <Wind />}
      {condition === "rain" && <Rain />}
    </div>
  );
}
