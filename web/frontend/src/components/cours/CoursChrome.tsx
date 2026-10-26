"use client";

import Link from "next/link";
import { CaptenLogo } from "@/components/design-system";

/**
 * Le cadre des leçons pour un visiteur sans compte : le logo, les leçons, et
 * deux portes (se connecter, créer un compte). C'est souvent la première page
 * du site qu'il voit, en venant d'une vidéo.
 */
export function CoursChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="cap relative min-h-screen">
      <header className="sticky top-0 z-30 border-b backdrop-blur" style={{ borderColor: "var(--cap-line)", backgroundColor: "color-mix(in srgb, var(--cap-bg) 88%, transparent)" }}>
        <div className="mx-auto flex h-16 max-w-[82rem] items-center justify-between gap-4 px-4 sm:px-8">
          <Link href="/" aria-label="CaptenTDB, accueil"><CaptenLogo size={22} /></Link>
          <nav className="flex items-center gap-4 text-[0.95rem] sm:gap-6">
            <Link href="/cours" className="hidden sm:inline" style={{ color: "var(--cap-ink-2)" }}>Toutes les leçons</Link>
            <Link href="/login" style={{ color: "var(--cap-ink-2)" }}>Se connecter</Link>
            <Link href="/register" className="inline-flex h-10 items-center gap-2 rounded-[10px] px-4 font-semibold" style={{ backgroundColor: "var(--cap-ink)", color: "var(--cap-on-inverse)" }}>
              <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--cap-ambre)" }} />
              Créer un compte
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[82rem] px-4 sm:px-8">{children}</main>
      <footer className="mx-auto mt-10 flex max-w-[82rem] flex-wrap gap-x-6 gap-y-2 border-t px-4 py-8 text-[0.88rem] sm:px-8" style={{ borderColor: "var(--cap-line)", color: "var(--cap-ink-3)" }}>
        <span>CaptenTDB, une école de trading en argent fictif. Rien ici n&apos;est un conseil en investissement.</span>
        <Link href="/mentions-legales" className="hover:underline">Mentions légales</Link>
        <Link href="/politique-de-confidentialite" className="hover:underline">Confidentialité</Link>
      </footer>
    </div>
  );
}
