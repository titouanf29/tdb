import Link from "next/link";
import { Scale, Shield, FileText, ShoppingCart, Home, ChevronRight } from "lucide-react";

/**
 * Les quatre primitives des pages légales.
 *
 * Tout le reste de ces documents passe par le pont CSS `.cap-legal`, qui
 * redéfinit les variables de l'ancien thème : mille lignes de texte juridique
 * basculent sans être touchées. Ces quatre-là sont écrites en clair parce
 * qu'elles portent des choix qu'aucune équivalence automatique ne pouvait
 * faire — la hiérarchie du sommaire, la nature d'un encadré, l'alignement
 * d'une liste de définitions.
 */

const pages = [
  { href: "/mentions-legales", label: "Mentions légales", icon: Scale },
  { href: "/politique-de-confidentialite", label: "Confidentialité", icon: Shield },
  { href: "/cgu", label: "CGU", icon: FileText },
  { href: "/cgv", label: "CGV", icon: ShoppingCart },
];

export function LegalNav({ current }: { current: "/mentions-legales" | "/politique-de-confidentialite" | "/cgu" | "/cgv" }) {
  return (
    <div className="mb-8 space-y-4">
      <div
        className="flex items-center gap-1.5 text-[0.76rem]"
        style={{ color: "var(--cap-ink-3)" }}
      >
        <Link href="/" className="flex items-center gap-1 transition-colors hover:text-[color:var(--cap-ink)]">
          <Home className="h-3 w-3" />
          Accueil
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span>Pages légales</span>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span style={{ color: "var(--cap-ink)" }}>{pages.find((p) => p.href === current)?.label}</span>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Documents légaux">
        {pages.map(({ href, label, icon: Icon }) => {
          const active = href === current;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="inline-flex items-center gap-2 rounded-[10px] px-3.5 py-2 text-[0.85rem] transition-colors"
              style={
                active
                  ? { backgroundColor: "var(--cap-ink)", color: "var(--cap-surface)" }
                  : { backgroundColor: "var(--cap-surface-2)", color: "var(--cap-ink-2)" }
              }
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function LegalSectionTitle({ num, title, id }: { num: string; title: string; id: string }) {
  return (
    <h2
      id={id}
      className="flex scroll-mt-6 items-center gap-3 text-[1.02rem] font-semibold"
      style={{ color: "var(--cap-ink)" }}
    >
      {/* Le numéro dans une pastille pleine : ces documents se parcourent en
          sautant d'une section à l'autre depuis le sommaire, et un repère
          qu'on retrouve d'un coup d'œil vaut mieux qu'un titre de plus. */}
      <span
        className="flex h-7 w-7 flex-none items-center justify-center rounded-[9px] text-[0.72rem] font-semibold tabular-nums"
        style={{ backgroundColor: "var(--cap-surface-2)", color: "var(--cap-ink-2)" }}
      >
        {num}
      </span>
      {title}
    </h2>
  );
}

export function InfoBox({
  children,
  variant = "info",
}: {
  children: React.ReactNode;
  variant?: "info" | "warning" | "success" | "danger";
}) {
  /* Fond très dilué, filet plus franc, encre normale. Le texte d'un encadré
     légal se lit en entier — le colorer entièrement, comme le faisait la
     version sombre, le rendait pénible sur les paragraphes longs. */
  const teinte = {
    info: "21, 94, 117",
    warning: "229, 168, 58",
    success: "9, 114, 65",
    danger: "197, 27, 15",
  }[variant];

  return (
    <div
      className="rounded-[12px] px-4 py-3.5 text-[0.82rem] leading-relaxed"
      style={{
        backgroundColor: `rgba(${teinte}, 0.07)`,
        boxShadow: `inset 0 0 0 1px rgba(${teinte}, 0.28)`,
        color: "var(--cap-ink-2)",
      }}
    >
      {children}
    </div>
  );
}

export function Dl({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="space-y-2">
      {items.map(({ label, value }) => (
        <div key={label} className="flex flex-col gap-0.5 text-[0.9rem] sm:flex-row sm:gap-3">
          <dt
            className="min-w-[160px] shrink-0 font-medium"
            style={{ color: "var(--cap-ink)" }}
          >
            {label}
          </dt>
          <dd style={{ color: "var(--cap-ink-2)" }}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
