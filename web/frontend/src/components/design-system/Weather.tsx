"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NuageImage } from "./NuageImage";
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

  // Toutes les copies du réglage restent d'accord : couper les animations
  // depuis l'accueil prévient aussi l'en-tête, le rideau, les apparitions —
  // sans attendre un rechargement. La classe « anim-off » sur <html> permet
  // aux animations purement CSS de s'arrêter elles aussi.
  useEffect(() => {
    const lire = () => {
      let v = true;
      try { v = localStorage.getItem(STORAGE_KEY) !== "off"; } catch { /* private mode, keep the default */ }
      setOn(v);
      // Le réglage de l'appareil compte aussi : la page d'accueil pose déjà
      // la classe dans ce cas, il ne faut pas la retirer.
      const reduit = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      document.documentElement.classList.toggle("anim-off", !v || !!reduit);
    };
    lire();
    window.addEventListener("tdb-animations", lire);
    return () => window.removeEventListener("tdb-animations", lire);
  }, []);

  const set = useCallback((v: boolean) => {
    try { localStorage.setItem(STORAGE_KEY, v ? "on" : "off"); } catch { /* ignore */ }
    setOn(v);
    window.dispatchEvent(new Event("tdb-animations"));
  }, []);

  return [on, set];
}

/* ── Pieces ───────────────────────────────────────────────────────────────── */

/**
 * Un nuage qui traverse l'écran.
 *
 * C'était un SVG flouté (deux flous gaussiens, dégradés, découpes) déplacé
 * par framer-motion : le navigateur refaisait le flou à chaque image, sur
 * six ou sept nuages grands comme la moitié de l'écran. C'est maintenant une
 * image déjà floutée (voir NuageImage) qui glisse en CSS, sur la carte
 * graphique. Deux étages : l'extérieur suit le défilement de la page à la
 * vitesse de sa profondeur (les grands nuages, plus proches, bougent plus),
 * l'intérieur traverse l'écran.
 */
function DriftingCloud({
  shape, top, width, duration, delay, opacity, flip,
}: {
  shape: number; top: string; width: number; duration: number; delay: number; opacity: number; flip?: boolean;
}) {
  return (
    <div aria-hidden className="cap-meteo-prof absolute left-0" style={{ top, width: `${width}vw`, ["--prof" as string]: (width / 70 * 0.22).toFixed(3) }}>
      <div className="cap-meteo-nuage" style={{ opacity, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}>
        <NuageImage forme={shape} retourne={flip} flou={shape === 2 ? 3.5 : 2.4} style={{ width: "100%" }} />
      </div>
    </div>
  );
}

const CSS_METEO = `@keyframes cap-meteo{from{transform:translate3d(-45vw,0,0)}to{transform:translate3d(115vw,0,0)}}
.cap-meteo-nuage{animation-name:cap-meteo;animation-timing-function:linear;animation-iteration-count:infinite;will-change:transform}
.cap-meteo-prof{transform:translate3d(0,calc(var(--sy,0) * var(--prof) * -1px),0)}
@keyframes cap-meteo-in{from{opacity:0}to{opacity:1}}
@keyframes cap-meteo-out{from{opacity:1}to{opacity:0}}
.cap-meteo-couche{animation:cap-meteo-in 1.6s ease both}
.cap-meteo-couche[data-sort="1"]{animation:cap-meteo-out 1.6s ease both}`;

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
  const ref = useRef<HTMLDivElement>(null);

  // Quand la météo change, l'ancien ciel s'efface pendant que le nouveau
  // arrive : un fondu enchaîné, pas une coupure.
  const [couches, setCouches] = useState<{ c: WeatherCondition; n: number; sort: boolean }[]>([{ c: condition, n: 0, sort: false }]);
  useEffect(() => {
    setCouches((cs) => {
      const der = cs[cs.length - 1];
      if (der.c === condition) return cs;
      return [...cs.filter((x) => !x.sort).map((x) => ({ ...x, sort: true })), { c: condition, n: der.n + 1, sort: false }];
    });
    const t = setTimeout(() => setCouches((cs) => cs.filter((x) => !x.sort)), 1700);
    return () => clearTimeout(t);
  }, [condition]);

  // Parallaxe : une seule écriture (--sy) par image de défilement.
  useEffect(() => {
    if (!enabled || reduce) return;
    let raf = 0;
    const lire = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => ref.current?.style.setProperty("--sy", String(Math.round(window.scrollY))));
    };
    lire();
    window.addEventListener("scroll", lire, { passive: true });
    return () => { window.removeEventListener("scroll", lire); cancelAnimationFrame(raf); };
  }, [enabled, reduce]);

  // Off, or reduced motion: nothing at all. A still sky would be a decoration
  // with no information in it, which is the thing this component is not.
  if (!enabled || reduce) return null;

  // Base crossing time, in seconds, for the full width plus its margins.
  // It was 150, which works out at about 18 px/s — slow enough that the sky
  // read as a still image. At 52 a cloud crosses in under a minute: clearly
  // moving, still calm.
  const base = 52;

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ opacity: 0.95 }}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS_METEO }} />
      {couches.map(({ c, n, sort }) => {
        const preset = PRESETS[c];
        return (
          <div key={n} className="cap-meteo-couche absolute inset-0" data-sort={sort ? "1" : "0"}>
            {preset.sun > 0 && <Sun strength={preset.sun} />}
            {preset.veil ? <Veil strength={preset.veil} /> : null}
            {preset.clouds.map((cl, i) => (
              <DriftingCloud
                key={i}
                shape={cl.shape}
                top={cl.top}
                width={cl.w}
                opacity={cl.o}
                flip={cl.flip}
                duration={(base / preset.speed) * (1 + (i % 3) * 0.26)}
                // Le décalage de départ, pris dans une table dispersée plutôt
                // que calculé en rampe : avec un pas régulier, les nuages
                // restaient en file et laissaient la moitié du ciel vide.
                delay={-(base / preset.speed) * PHASES[i % PHASES.length]}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
