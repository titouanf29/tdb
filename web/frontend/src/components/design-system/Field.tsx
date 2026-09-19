"use client";

import { useId, useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Form controls.
 *
 * Inputs are the one place where a border earns its keep: a field has to look
 * like somewhere you can type before you have typed in it. So they carry a
 * hairline, a surface a shade off the page, and a focus ring in ocean — and
 * nothing else. No floating labels, no icons inside the box.
 *
 * Errors attach to the field rather than piling up at the top of the form, and
 * are wired with aria-describedby so a screen reader reads the message with
 * the input instead of separately.
 */

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[0.85rem] font-medium"
        style={{ color: "var(--cap-ink)" }}
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[0.8rem]" style={{ color: "var(--cap-down)" }}>
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[0.8rem]" style={{ color: "var(--cap-ink-3)" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  invalid,
  describedBy,
  className,
}: {
  id?: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
}) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="relative">
      <input
        id={id}
        type={isPassword && reveal ? "text" : type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(
          "h-12 w-full px-3.5 text-[0.95rem] outline-none transition-[box-shadow,background-color] duration-200",
          "placeholder:text-[color:var(--cap-ink-3)]",
          isPassword && "pr-12",
          className
        )}
        style={{
          borderRadius: "var(--cap-r-md)",
          backgroundColor: "var(--cap-bg)",
          color: "var(--cap-ink)",
          boxShadow: `inset 0 0 0 1px ${invalid ? "var(--cap-down)" : "var(--cap-line-strong)"}`,
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow =
            "inset 0 0 0 1px var(--cap-ocean), 0 0 0 3px rgba(21,94,117,0.12)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = `inset 0 0 0 1px ${
            invalid ? "var(--cap-down)" : "var(--cap-line-strong)"
          }`;
        }}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          aria-label={reveal ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-[8px] p-2 transition-colors hover:bg-[color:var(--cap-surface-2)]"
          style={{ color: "var(--cap-ink-3)" }}
        >
          {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  children,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-3", className)}>
      {/* The native input stays in the tree — visually hidden, not replaced —
          so keyboard, form validation and assistive tech all keep working. */}
      <span className="relative mt-[2px] flex shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <label
          htmlFor={id}
          className="flex h-[18px] w-[18px] cursor-pointer items-center justify-center transition-colors duration-150 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--cap-ocean)]"
          style={{
            borderRadius: "5px",
            backgroundColor: checked ? "var(--cap-ocean)" : "var(--cap-bg)",
            boxShadow: `inset 0 0 0 1px ${checked ? "var(--cap-ocean)" : "var(--cap-line-strong)"}`,
          }}
        >
          {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
        </label>
      </span>
      <label htmlFor={id} className="cursor-pointer text-[0.85rem] leading-[1.5]" style={{ color: "var(--cap-ink-2)" }}>
        {children}
      </label>
    </div>
  );
}

/** A message that belongs to the whole form, not to one field. */
export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="px-3.5 py-3 text-[0.85rem]"
      style={{
        borderRadius: "var(--cap-r-md)",
        // Accordé au jeton --cap-down (#9F4B41). C'était encore l'ancien
        // rouge #C94A4A écrit en dur, oublié au changement de palette : le
        // seul endroit du site où la couleur d'erreur ne suivait plus les
        // autres rouges.
        backgroundColor: "rgba(159,75,65,0.07)",
        boxShadow: "inset 0 0 0 1px rgba(159,75,65,0.22)",
        color: "var(--cap-down)",
      }}
    >
      {children}
    </div>
  );
}
