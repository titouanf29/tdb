"use client";

import { Check } from "lucide-react";
import { Text } from "@/components/design-system";

/**
 * Un réglage, et ce qu'il change.
 *
 * L'ancien écran proposait « Modéré », « Agressif », « Très agressif » sans
 * dire ce que le mot déclenchait. Un réglage dont on ne voit pas l'effet n'est
 * pas un réglage, c'est un pari : l'utilisateur clique, ne constate rien, et
 * ne revient plus. Chaque option porte donc une ligne qui décrit une
 * conséquence réelle, et ces lignes sont tenues d'être vraies — quand le code
 * ne fait rien de la valeur, l'option n'a pas sa place ici.
 */

export interface Option<T extends string> {
  value: T;
  label: string;
  /** Ce que ce choix change, concrètement. */
  detail: string;
}

export function Choice<T extends string>({
  options,
  value,
  onChange,
  disabled,
  name,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  /** Pour le groupe radio — l'accessibilité, pas la décoration. */
  name: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="space-y-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className="flex w-full items-start gap-3 rounded-[12px] p-3.5 text-left transition-colors disabled:opacity-50"
            style={{
              backgroundColor: active ? "var(--cap-surface-2)" : "transparent",
              boxShadow: active
                ? "inset 0 0 0 1px var(--cap-ocean)"
                : "inset 0 0 0 1px var(--cap-line)",
            }}
          >
            <span
              aria-hidden
              className="mt-[0.15em] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: active ? "var(--cap-ocean)" : "transparent",
                boxShadow: active ? "none" : "inset 0 0 0 1px var(--cap-line-strong)",
              }}
            >
              {active && <Check className="h-3 w-3" style={{ color: "var(--cap-surface)" }} />}
            </span>
            <span className="min-w-0">
              <span className="block text-[0.93rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                {o.label}
              </span>
              <span className="mt-0.5 block text-[0.8rem] leading-snug" style={{ color: "var(--cap-ink-3)" }}>
                {o.detail}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Un interrupteur, avec son explication à gauche.
 *
 * Le libellé dit ce qui se passe quand c'est actif, jamais « activer ceci » :
 * un interrupteur intitulé « Notifications » ne dit pas si l'état courant est
 * l'envoi ou le silence.
 */
export function Toggle({
  label,
  detail,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-5 py-1">
      <div className="min-w-0">
        <span className="block text-[0.93rem] font-medium" style={{ color: "var(--cap-ink)" }}>
          {label}
        </span>
        <Text size="caption" className="mt-1">{detail}</Text>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50"
        style={{
          backgroundColor: checked ? "var(--cap-ocean)" : "var(--cap-surface-3)",
        }}
      >
        <span
          className="absolute top-[3px] h-[18px] w-[18px] rounded-full transition-[left] duration-200"
          style={{
            left: checked ? "calc(100% - 21px)" : "3px",
            backgroundColor: "var(--cap-surface)",
          }}
        />
      </button>
    </div>
  );
}
