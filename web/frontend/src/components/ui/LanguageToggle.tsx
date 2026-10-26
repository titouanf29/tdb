"use client";

import { useLanguage, Lang } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";

// Des drapeaux SVG (flag-icons, chargée par le layout), pas des emoji : un
// emoji dépend de la police du système — Windows affiche « GB » en lettres.
const FLAGS: Record<Lang, string> = { fr: "fi fi-fr", en: "fi fi-gb" };
const LABELS: Record<Lang, string> = { fr: "FR", en: "EN" };

interface Props {
  /** "pill" shows both options side by side, "compact" shows a single button toggling */
  variant?: "pill" | "compact";
  className?: string;
}

export function LanguageToggle({ variant = "pill", className }: Props) {
  const { lang, setLang } = useLanguage();

  if (variant === "compact") {
    const next: Lang = lang === "fr" ? "en" : "fr";
    return (
      <button
        onClick={() => setLang(next)}
        className={cn(
          "flex min-h-[44px] items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-colors",
          className
        )}
        title={`Switch to ${next === "en" ? "English" : "Français"}`}
      >
        <span className={cn(FLAGS[lang], "rounded-[2px]")} aria-hidden />
        <span className="text-xs">{LABELS[lang]}</span>
      </button>
    );
  }

  return (
    <div className={cn("flex items-center rounded-xl bg-white/5 border border-white/10 p-1 gap-1", className)}>
      {(["fr", "en"] as Lang[]).map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
            lang === l
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-white/10"
          )}
        >
          <span className={cn(FLAGS[l], "rounded-[2px]")} aria-hidden />
          <span>{LABELS[l]}</span>
        </button>
      ))}
    </div>
  );
}
