"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { CaptenLogo, Container, DUR, EASE } from "@/components/design-system";
import { NUIT } from "./nuit";

/**
 * L'en-tête de la page de présentation, sur fond de nuit : transparent sur le
 * haut de page, puis une surface sombre légèrement translucide dès qu'on
 * défile — le changement dit qu'on a quitté le haut, c'est son seul rôle.
 */

const LINKS = [
  { href: "#moteur", label: "Ce qui nous distingue" },
  { href: "#fonctions", label: "Fonctionnalités" },
  { href: "#demo", label: "Démo" },
];

const boutonOr = {
  backgroundColor: NUIT.or, color: "#1A1204", outlineColor: NUIT.or,
} as const;

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const plein = scrolled || open;

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow] duration-300"
      style={{
        backgroundColor: plein ? "rgba(7,17,29,0.88)" : "transparent",
        backdropFilter: plein ? "blur(12px)" : undefined,
        WebkitBackdropFilter: plein ? "blur(12px)" : undefined,
        boxShadow: plein ? `0 1px 0 ${NUIT.ligne}` : "none",
        color: NUIT.texte,
      }}
    >
      <Container width="wide">
        <div className="flex h-[4.5rem] items-center justify-between gap-6">
          <Link href="/" className="-mx-2 flex min-h-[44px] items-center gap-2.5 px-2" aria-label="CaptenTDB, accueil" style={{ color: NUIT.texte }}>
            <CaptenLogo size={22} />
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Navigation principale">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href}
                className="inline-flex min-h-[44px] items-center text-[0.92rem] transition-colors duration-200 hover:text-white"
                style={{ color: NUIT.texte2 }}>
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link href="/login"
              className="inline-flex min-h-[44px] items-center rounded-[10px] px-4 text-[0.92rem] transition-colors hover:bg-white/5"
              style={{ color: NUIT.texte }}>
              Connexion
            </Link>
            <Link href="/register"
              className="inline-flex min-h-[44px] items-center rounded-[10px] px-4 text-[0.92rem] font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={boutonOr}>
              Commencer
            </Link>
          </div>

          <button
            className="-mr-2 flex h-11 w-11 items-center justify-center md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            style={{ color: NUIT.texte }}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </Container>

      <AnimatePresence>
        {open && (
          <motion.div
            className="md:hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: DUR.quick, ease: EASE }}
            style={{ overflow: "hidden" }}
          >
            <Container width="wide">
              <nav className="flex flex-col py-4" aria-label="Navigation mobile">
                {LINKS.map((l) => (
                  <a key={l.href} href={l.href} onClick={() => setOpen(false)}
                    className="border-b py-3.5 text-[1rem]"
                    style={{ borderColor: NUIT.ligne, color: NUIT.texte }}>
                    {l.label}
                  </a>
                ))}
                <div className="flex gap-2 pt-5">
                  <Link href="/login" className="flex min-h-[48px] flex-1 items-center justify-center rounded-[12px] text-[0.95rem]"
                    style={{ color: NUIT.texte, boxShadow: `inset 0 0 0 1px ${NUIT.ligneForte}` }}>Connexion</Link>
                  <Link href="/register" className="flex min-h-[48px] flex-1 items-center justify-center rounded-[12px] text-[0.95rem] font-semibold"
                    style={boutonOr}>Commencer</Link>
                </div>
              </nav>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
