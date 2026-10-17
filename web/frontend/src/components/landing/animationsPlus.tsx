"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { Nimbo, type NimboHumeur } from "@/components/design-system";
import { useEffetsActifs } from "./effets";

/* Toutes ces animations se taisent quand les effets sont coupés (réglage du
   site ou « réduire les animations » du système) : l'état final s'affiche
   directement. */

/** Un texte qui s'écrit lettre à lettre, comme si Nimbo le tapait. */
export function Machine({ texte, delai = 0, vitesse = 28, className, onFini }: {
  texte: string; delai?: number; vitesse?: number; className?: string; onFini?: () => void;
}) {
  const actifs = useEffetsActifs();
  const [n, setN] = useState(actifs ? 0 : texte.length);
  useEffect(() => {
    if (!actifs) { setN(texte.length); return; }
    setN(0);
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const pas = () => {
      i += 1; setN(i);
      if (i < texte.length) t = setTimeout(pas, vitesse + (texte[i - 1] === " " ? 10 : 0));
      else onFini?.();
    };
    t = setTimeout(pas, delai * 1000);
    return () => clearTimeout(t);
  }, [texte, actifs, delai, vitesse, onFini]);
  return (
    <span className={className}>
      <span className="sr-only">{texte}</span>
      <span aria-hidden>{texte.slice(0, n)}</span>
      {actifs && n < texte.length && <span aria-hidden className="cap-curseur">▍</span>}
      <style dangerouslySetInnerHTML={{ __html: `@keyframes cap-clin{50%{opacity:0}}.cap-curseur{animation:cap-clin .8s steps(1) infinite;margin-left:1px;color:var(--cap-ocean)}` }} />
    </span>
  );
}

/** Un nombre qui compte jusqu'à sa valeur quand il entre à l'écran : « 800+ », « 10 000 € ». */
export function Compteur({ valeur, className }: { valeur: string; className?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const vu = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const actifs = useEffetsActifs();
  const m = valeur.match(/^(\D*)(\d(?:[\d\s ]*\d)?)(.*)$/);
  const cible = m ? parseInt(m[2].replace(/\D/g, ""), 10) : NaN;
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!vu || !actifs || !Number.isFinite(cible)) return;
    const debut = performance.now(), duree = 1600;
    let raf = 0;
    const f = (t: number) => {
      const p = Math.min(1, (t - debut) / duree);
      setV(Math.round(cible * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [vu, actifs, cible]);
  if (!m || !Number.isFinite(cible) || !actifs) return <span ref={ref} className={className}>{valeur}</span>;
  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{valeur}</span>
      <span aria-hidden>{m[1]}{(vu ? v : 0).toLocaleString("fr-FR")}{m[3]}</span>
    </span>
  );
}

/** Une lueur douce qui suit la souris dans le ciel du haut de page. */
export function LueurSouris() {
  const actifs = useEffetsActifs();
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!actifs) return;
    const el = ref.current?.parentElement;
    if (!el) return;
    let raf = 0;
    const bouge = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        ref.current?.style.setProperty("--x", `${e.clientX - r.left}px`);
        ref.current?.style.setProperty("--y", `${e.clientY - r.top}px`);
        if (ref.current) ref.current.style.opacity = "1";
      });
    };
    el.addEventListener("pointermove", bouge);
    return () => { el.removeEventListener("pointermove", bouge); cancelAnimationFrame(raf); };
  }, [actifs]);
  if (!actifs) return null;
  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-700"
      style={{
        opacity: 0,
        background: "radial-gradient(520px circle at var(--x, 50%) var(--y, 30%), rgba(255,255,255,0.75), rgba(255,255,255,0) 60%)",
        mixBlendMode: "soft-light",
      }} />
  );
}

/** Un cours qui vit : il bouge toutes les deux secondes, et clignote en vert ou en rouge. */
export function CoursVivant({ base, className }: { base: number; className?: string }) {
  const actifs = useEffetsActifs();
  const [p, setP] = useState(base);
  const [sens, setSens] = useState<0 | 1 | -1>(0);
  useEffect(() => {
    if (!actifs) return;
    const t = setInterval(() => {
      const v = (Math.random() - 0.45) * 0.0022;
      setP((x) => x * (1 + v));
      setSens(v >= 0 ? 1 : -1);
      setTimeout(() => setSens(0), 700);
    }, 2200);
    return () => clearInterval(t);
  }, [actifs]);
  const couleur = sens === 1 ? "var(--cap-up)" : sens === -1 ? "var(--cap-down)" : "inherit";
  return (
    <span className={className} style={{ color: couleur, transition: "color 600ms ease",
      textShadow: sens ? `0 0 18px color-mix(in srgb, ${couleur} 45%, transparent)` : "none" }}>
      {p.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
    </span>
  );
}

/** Des étoiles qui scintillent, pour le bloc de nuit du portefeuille virtuel. */
export function Etoiles({ nombre = 70 }: { nombre?: number }) {
  const actifs = useEffetsActifs();
  const [points] = useState(() => Array.from({ length: nombre }, () => ({
    x: Math.random() * 100, y: Math.random() * 100, r: Math.random() * 1.6 + 0.6, d: Math.random() * 4, v: 2.5 + Math.random() * 3,
  })));
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `@keyframes cap-scintille{0%,100%{opacity:.15;transform:scale(.7)}50%{opacity:.95;transform:scale(1)}}` }} />
      {points.map((s, i) => (
        <span key={i} className="absolute rounded-full bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.r * 2, height: s.r * 2, opacity: actifs ? undefined : 0.5,
            animation: actifs ? `cap-scintille ${s.v}s ease-in-out ${s.d}s infinite` : undefined }} />
      ))}
    </div>
  );
}

/* ── NIMBO, LE COMPAGNON DE LECTURE ──────────────────────────────────────
   Un petit Nimbo en bas à droite qui suit le visiteur : il change d'humeur
   et dit une phrase à chaque section. Absent du haut de page (Nimbo y est
   déjà) et du bas (le final l'accueille), masqué sur téléphone où l'écran
   est trop étroit, et refermable. */
const BULLES: Record<string, { h: NimboHumeur; t: string }> = {
  probleme: { h: "reflechit", t: "Trop de chiffres ? Je fais le tri pour vous." },
  fonctionnement: { h: "pointe", t: "Toujours dans cet ordre : observer, comprendre, s'entraîner." },
  demo: { h: "content", t: "Essayez : changez d'actif et de niveau de détail." },
  "paper-trading": { h: "cap", t: "10 000 € virtuels. Vous pouvez vous tromper, c'est fait pour." },
  personnalisation: { h: "salue", t: "Je m'adapte à votre niveau, débutant ou pas." },
  apprendre: { h: "content", t: "Un pas après l'autre. Je vous guide." },
  faq: { h: "reflechit", t: "Une question ? La réponse est sûrement ici." },
};

export function NimboCompagnon() {
  const actifs = useEffetsActifs();
  const [section, setSection] = useState<string | null>(null);
  const [ferme, setFerme] = useState(false);
  useEffect(() => {
    const ids = Object.keys(BULLES);
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((entrees) => {
      const visibles = entrees.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visibles[0]) setSection(visibles[0].target.id);
    }, { threshold: [0.25, 0.5] });
    els.forEach((e) => io.observe(e));
    const surHaut = () => { if (window.scrollY < window.innerHeight * 0.6) setSection(null); };
    window.addEventListener("scroll", surHaut, { passive: true });
    const fin = document.getElementById("arrivee");
    const ioFin = new IntersectionObserver(([e]) => { if (e.isIntersecting) setSection(null); }, { threshold: 0.2 });
    if (fin) ioFin.observe(fin);
    return () => { io.disconnect(); ioFin.disconnect(); window.removeEventListener("scroll", surHaut); };
  }, []);
  const b = section ? BULLES[section] : null;
  if (ferme) return null;
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-40 hidden md:block" aria-live="polite">
      <AnimatePresence>
        {b && (
          <motion.div key="compagnon" className="pointer-events-auto flex items-end gap-2"
            initial={actifs ? { opacity: 0, y: 30, scale: 0.8 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}>
            <AnimatePresence mode="wait">
              <motion.div key={section} className="relative mb-12 max-w-[15rem] rounded-[16px] rounded-br-[4px] px-4 py-3 text-[0.88rem] leading-snug"
                initial={actifs ? { opacity: 0, x: 12 } : false} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.3 }}
                style={{ backgroundColor: "var(--cap-surface)", color: "var(--cap-ink)", boxShadow: "0 12px 30px -12px rgba(11,23,38,0.3), inset 0 0 0 1px var(--cap-line)" }}>
                <Machine texte={b.t} vitesse={22} />
                <button type="button" onClick={() => setFerme(true)} aria-label="Masquer Nimbo"
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full text-[0.75rem]"
                  style={{ backgroundColor: "var(--cap-surface)", color: "var(--cap-ink-3)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}>×</button>
              </motion.div>
            </AnimatePresence>
            <motion.div key={`n-${section}`} initial={actifs ? { y: -10 } : false} animate={{ y: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 12 }}>
              <Nimbo humeur={b.h} taille={92} label="Nimbo" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
