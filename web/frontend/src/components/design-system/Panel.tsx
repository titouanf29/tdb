"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A compartment: one titled box holding one subject.
 *
 * The landing page could separate ideas with space alone, because the reader
 * moves through it once, top to bottom. A workspace is scanned, not read — the
 * eye jumps to the thing it came for — and a jump needs edges to land on. So
 * inside the app, sections become panels: a title, an optional aside on the
 * right, the content, and an optional link out at the bottom.
 *
 * The same four slots every time. Predictable furniture is what makes a tool
 * feel learned after one visit instead of five.
 */
export function Panel({
  title,
  hint,
  aside,
  children,
  action,
  tone = "surface",
  className,
  repliable,
  ouvertParDefaut = false,
}: {
  title?: string;
  /** One line under the title. Says what the panel is for, when it is not obvious. */
  hint?: string;
  /** Top-right slot: a control, a figure, a timestamp. */
  aside?: React.ReactNode;
  children: React.ReactNode;
  action?: { label: string; href: string };
  tone?: "surface" | "quiet";
  className?: string;
  /** Un identifiant rend le panneau repliable : l'en-tête devient un bouton,
   *  le contenu ne s'affiche qu'une fois ouvert, et le choix est retenu
   *  (par navigateur) d'une visite à l'autre. */
  repliable?: string;
  ouvertParDefaut?: boolean;
}) {
  // LES COMPLÉMENTS SE DÉPLIENT, ILS NE S'IMPOSENT PAS. Une page d'analyse
  // qui montre tout d'un coup noie le verdict sous la presse, le climat et
  // les banques centrales. Les blocs secondaires se replient ; leur titre et
  // leur phrase restent visibles, pour qu'on sache ce qu'il y a dedans.
  const [ouvert, setOuvert] = useState(ouvertParDefaut);
  const idContenu = useId();
  const cle = repliable ? `tdb_pli_${repliable}` : null;
  useEffect(() => {
    if (!cle) return;
    try {
      const v = localStorage.getItem(cle);
      if (v != null) setOuvert(v === "1");
    } catch { /* navigation privée : on garde le défaut */ }
  }, [cle]);
  const basculer = () => {
    setOuvert((o) => {
      try { if (cle) localStorage.setItem(cle, o ? "0" : "1"); } catch { /* ignore */ }
      return !o;
    });
  };
  const visible = !repliable || ouvert;

  const titre = (title || aside) && (
    <>
      <div className="min-w-0">
        {title && (
          <h2
            className="text-[1.02rem] font-semibold tracking-[-0.015em]"
            style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}
          >
            {title}
          </h2>
        )}
        {hint && (
          <p className="mt-1 text-[0.8rem] leading-snug" style={{ color: "var(--cap-ink-3)" }}>
            {hint}
          </p>
        )}
      </div>
      {(aside || repliable) && (
        <div className="flex shrink-0 items-center gap-3">
          {aside}
          {repliable && (
            <ChevronDown
              aria-hidden
              className="h-4 w-4 transition-transform duration-300"
              style={{ color: "var(--cap-ink-3)", transform: ouvert ? "rotate(180deg)" : "none" }}
            />
          )}
        </div>
      )}
    </>
  );

  return (
    <section
      className={cn("flex flex-col overflow-hidden", className)}
      style={{
        borderRadius: "var(--cap-r-xl)",
        backgroundColor: tone === "quiet" ? "transparent" : "var(--cap-surface)",
        boxShadow:
          tone === "quiet"
            ? "inset 0 0 0 1px var(--cap-line)"
            : "inset 0 0 0 1px var(--cap-line), var(--cap-shadow)",
      }}
    >
      {(title || aside) && (repliable ? (
        <button
          type="button"
          onClick={basculer}
          aria-expanded={ouvert}
          aria-controls={idContenu}
          className={cn(
            "flex min-h-[44px] w-full items-start justify-between gap-4 px-5 text-left transition-colors hover:bg-[color:var(--cap-surface-2)] sm:px-6",
            visible ? "pt-5 sm:pt-6" : "py-5 sm:py-6",
          )}
        >
          {titre}
        </button>
      ) : (
        <header className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
          {titre}
        </header>
      ))}

      {visible && (
        <div id={idContenu} className={cn("flex-1 px-5 py-5 sm:px-6 sm:py-6", repliable && "cap-apparait")}>
          {children}
        </div>
      )}

      {visible && action && (
        <Link
          href={action.href}
          className="flex items-center justify-between gap-2 border-t px-5 py-3.5 text-[0.85rem] transition-colors hover:bg-[color:var(--cap-surface-2)] sm:px-6"
          style={{ borderColor: "var(--cap-line)", color: "var(--cap-ocean)" }}
        >
          {action.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </section>
  );
}
