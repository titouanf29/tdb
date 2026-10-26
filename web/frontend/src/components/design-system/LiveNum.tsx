"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { useAnimationsEnabled } from "./Weather";
import { useMouvementReduit } from "./useMouvementReduit";

/**
 * Un chiffre qui se met à jour tout seul, et qui le montre.
 *
 * Le problème n'était pas la fraîcheur de la donnée mais la manière dont elle
 * arrivait : l'écran restait figé trente secondes, puis un nombre en
 * remplaçait un autre d'un coup. Rien ne disait que quelque chose venait de
 * changer, ni dans quel sens — l'œil, qui ne regardait pas cette ligne-là à
 * cet instant, le ratait simplement.
 *
 * Deux mouvements, qui répondent à deux questions différentes :
 *
 *   – LES CHIFFRES DÉFILENT de l'ancienne valeur à la nouvelle, en un demi-
 *     seconde. C'est ce qui remplace le saut : on voit le cours se déplacer,
 *     donc on voit qu'il vit.
 *   – UN CADRE COLORÉ s'allume puis s'éteint, vert si c'est monté, rouge si
 *     c'est descendu. C'est ce qui attrape le regard ailleurs sur l'écran, et
 *     le sens est lisible avant même d'avoir lu le nombre. Un cadre et non un
 *     fond teinté : la mesure de contraste est dans capten.css.
 *
 * Le cadre est volontairement une couche séparée, remontée à chaque
 * battement : une animation CSS relancée sur le même élément ne redémarre pas
 * si sa valeur n'a pas changé, et deux hausses d'affilée n'auraient donc
 * clignoté qu'une fois.
 *
 * Rien ne bouge si l'utilisateur a coupé les animations ou demandé un
 * mouvement réduit au niveau du système — la valeur est alors simplement
 * remplacée, ce qui reste correct.
 */

const TWEEN_MS = 480;

export function LiveNum({
  value,
  format,
  tone = "ink",
  className,
  placeholder = "—",
}: {
  /** null = donnée absente. Un « — » est une information ; un zéro inventé non. */
  value: number | null | undefined;
  /** Le formatage reste au parent : lui seul sait si c'est un prix ou une somme. */
  format: (v: number) => string;
  tone?: "ink" | "muted" | "up" | "down" | "accent";
  className?: string;
  placeholder?: string;
}) {
  const reduce = useMouvementReduit();
  const [animOn] = useAnimationsEnabled();
  const moving = !reduce && animOn;

  const [shown, setShown] = useState<number | null>(value ?? null);
  const [pulse, setPulse] = useState(0);
  const [dir, setDir] = useState<"up" | "down">("up");

  // La valeur RÉELLEMENT affichée, pas la dernière cible : si un second
  // rafraîchissement tombe pendant le défilement, le suivant doit repartir
  // d'où les chiffres en sont, sinon il saute — exactement ce qu'on corrige.
  const shownRef = useRef<number | null>(value ?? null);
  const seenRef = useRef(false);

  useEffect(() => {
    if (value == null || !Number.isFinite(value)) {
      shownRef.current = null;
      setShown(null);
      return;
    }

    const from = shownRef.current;

    // La première valeur s'affiche, elle ne surgit pas de zéro : au chargement
    // d'une page, tous les chiffres qui comptent en même temps font une
    // machine à sous, pas une information.
    if (from == null || !seenRef.current) {
      seenRef.current = true;
      shownRef.current = value;
      setShown(value);
      return;
    }
    if (from === value) return;

    if (!moving) {
      shownRef.current = value;
      setShown(value);
      return;
    }

    setDir(value > from ? "up" : "down");
    setPulse((n) => n + 1);

    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / TWEEN_MS);
      // Décélération : rapide au départ, posée à l'arrivée.
      const v = from + (value - from) * (1 - Math.pow(1 - t, 3));
      shownRef.current = t < 1 ? v : value;
      setShown(shownRef.current);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, moving]);

  const color = {
    ink: "var(--cap-ink)",
    muted: "var(--cap-ink-2)",
    up: "var(--cap-up)",
    down: "var(--cap-down)",
    accent: "var(--cap-ocean)",
  }[tone];

  return (
    <span className={cn("cap-num relative inline-block", className)} style={{ color }}>
      {pulse > 0 && moving && (
        <span
          key={pulse}
          aria-hidden
          className="cap-tick"
          style={
            {
              "--cap-tick-tone": dir === "up" ? "var(--cap-up)" : "var(--cap-down)",
            } as React.CSSProperties
          }
        />
      )}
      <span className="relative">{shown == null ? placeholder : format(shown)}</span>
    </span>
  );
}
