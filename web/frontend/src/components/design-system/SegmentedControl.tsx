"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import { cn } from "@/lib/utils";
import { DUR, EASE } from "./motion";
import { useMouvementReduit } from "./useMouvementReduit";

/**
 * A row of mutually exclusive choices.
 *
 * Pas de bac gris à pastilles, la tenue par défaut des kits d'interface :
 * les options sont des mots, et un trait ambre glisse sous celle qui est
 * choisie, comme sous les liens de la page de présentation.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
}) {
  const layoutId = useId();
  const reduce = useMouvementReduit();

  const pad = size === "sm" ? "px-2 h-9 text-[0.85rem]" : "px-2.5 h-11 text-[0.93rem]";

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("inline-flex flex-wrap gap-x-3 border-b", className)}
      style={{ borderColor: "var(--cap-line)" }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            // `type="button"`, ET C'EST TOUT LE CORRECTIF.
            //
            // Sans type, un <button> vaut `type="submit"`. Ce contrôle sert à
            // CHOISIR, jamais à valider — mais placé dans un <form>, chacune
            // de ses options envoyait le formulaire. Sur l'écran d'ordre,
            // cliquer « Vente » pour passer en vente OUVRAIT la position :
            // constaté dans le navigateur, un POST /wallet/positions/open
            // partait au clic, avec le montant et le levier par défaut, et
            // l'écran sautait à la confirmation sans qu'on ait pu régler quoi
            // que ce soit. Vu de l'utilisateur, « la vente ne marche pas ».
            //
            // Le composant est utilisé dans sept écrans qui contiennent un
            // formulaire, donc le défaut se corrige ici, pas au cas par cas.
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative transition-colors duration-200 hover:text-[color:var(--cap-ink)]",
              pad
            )}
            style={{ color: active ? "var(--cap-ink)" : "var(--cap-ink-3)", fontWeight: active ? 600 : 500 }}
          >
            {active && (
              <motion.span
                layoutId={reduce ? undefined : `seg-${layoutId}`}
                className="absolute inset-x-1.5 -bottom-px h-[2px] rounded-full"
                style={{ backgroundColor: "var(--cap-ambre)" }}
                transition={{ duration: DUR.quick, ease: EASE }}
              />
            )}
            <span className="relative z-10 whitespace-nowrap">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
