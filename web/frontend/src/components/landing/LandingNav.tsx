"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button, CaptenLogo, Container, DUR, EASE } from "@/components/design-system";

/**
 * The header.
 *
 * Transparent over the hero, then a plain surface with a hairline once the
 * page scrolls — the change tells you that you have left the top, which is the
 * only job it has. No blur, no floating pill.
 */

const LINKS = [
  { href: "#probleme", label: "Le problème" },
  { href: "#fonctionnement", label: "Fonctionnement" },
  { href: "#demo", label: "Démo" },
  { href: "#apprendre", label: "Apprendre" },
];

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

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow] duration-300"
      style={{
        backgroundColor: scrolled ? "var(--cap-bg)" : "transparent",
        boxShadow: scrolled ? "0 1px 0 var(--cap-line)" : "none",
      }}
    >
      <Container width="wide">
        <div className="flex h-[4.5rem] items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="CaptenTDB, accueil">
            <CaptenLogo size={22} />
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Navigation principale">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-[0.9rem] transition-colors duration-200 hover:text-[color:var(--cap-ink)]"
                style={{ color: "var(--cap-ink-2)" }}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Button href="/login" variant="quiet" size="sm">Connexion</Button>
            <Button href="/register" size="sm">Commencer</Button>
          </div>

          <button
            className="-mr-2 p-2 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            style={{ color: "var(--cap-ink)" }}
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
            style={{ overflow: "hidden", backgroundColor: "var(--cap-bg)", boxShadow: "0 1px 0 var(--cap-line)" }}
          >
            <Container width="wide">
              <nav className="flex flex-col py-4" aria-label="Navigation mobile">
                {LINKS.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="border-b py-3.5 text-[0.95rem]"
                    style={{ borderColor: "var(--cap-line)", color: "var(--cap-ink)" }}
                  >
                    {l.label}
                  </a>
                ))}
                <div className="flex gap-2 pt-5">
                  <Button href="/login" variant="secondary" size="md" className="flex-1">Connexion</Button>
                  <Button href="/register" size="md" className="flex-1">Commencer</Button>
                </div>
              </nav>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
