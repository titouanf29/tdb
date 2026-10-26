"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button, Nimbo, EASE, useMouvementReduit } from "@/components/design-system";
import {
  EVT_OUVRIR, EVT_VISITE, VISITES, ecrireVisite, lireVisite, type EtatVisite,
} from "@/lib/visite";

/**
 * Le guide pas à pas, sur les vrais écrans.
 *
 * L'écran s'assombrit, l'élément dont on parle reste éclairé avec un anneau
 * ambre, et Nimbo explique dans une bulle posée à côté. D'une étape à l'autre
 * la lumière GLISSE jusqu'à la cible suivante, au lieu de sauter : l'œil suit
 * le mouvement et comprend où il va. Quand la cible est sur une autre page,
 * le guide y emmène et attend qu'elle soit affichée.
 *
 * L'élément éclairé reste cliquable : quelqu'un qui clique de lui-même sur
 * « Mes demandes » pendant la visite y arrive, et la visite suit. Le reste de
 * l'écran est bloqué, pour qu'un clic à côté ne perde pas la personne.
 */

type Rect = { top: number; left: number; width: number; height: number };

const MARGE = 8;
const ATTENTE_MAX = 15_000;

function cheminDe(route: string) { return route.split("?")[0]; }

function surLaRoute(route: string) {
  const [chemin, requete] = route.split("?");
  if (window.location.pathname !== chemin) return false;
  if (!requete) return true;
  const voulu = new URLSearchParams(requete);
  const actuel = new URLSearchParams(window.location.search);
  return Array.from(voulu.entries()).every(([k, v]) => actuel.get(k) === v);
}

/** La première cible affichée, parmi celles de l'étape. */
function trouver(cibles: string[]): HTMLElement | null {
  for (const c of cibles) {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(`[data-visite="${c}"]`))) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden") return el;
    }
  }
  return null;
}

export function VisiteGuidee() {
  const router = useRouter();
  const pathname = usePathname();
  const reduit = useMouvementReduit();
  const [etat, setEtat] = useState<EtatVisite | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [statut, setStatut] = useState<"cherche" | "trouve" | "absent">("cherche");
  const [vue, setVue] = useState({ l: 1280, h: 800 });
  const cible = useRef<HTMLElement | null>(null);
  const pageDuPas = useRef<string | null>(null);
  const bulle = useRef<HTMLDivElement>(null);
  const suivantRef = useRef<HTMLButtonElement>(null);
  const [hBulle, setHBulle] = useState(230);

  const visite = etat ? VISITES[etat.id] : null;
  const pas = visite && etat ? visite.etapes[etat.etape] : null;
  const dernier = !!visite && !!etat && etat.etape === visite.etapes.length - 1;
  const mobile = vue.l < 640;

  // L'état vit hors du composant : un bouton n'importe où lance la visite.
  useEffect(() => {
    setEtat(lireVisite());
    const ecoute = (e: Event) => setEtat((e as CustomEvent<EtatVisite | null>).detail);
    window.addEventListener(EVT_VISITE, ecoute);
    const taille = () => setVue({ l: window.innerWidth, h: window.innerHeight });
    taille();
    window.addEventListener("resize", taille);
    return () => {
      window.removeEventListener(EVT_VISITE, ecoute);
      window.removeEventListener("resize", taille);
    };
  }, []);

  const aller = useCallback((n: number) => {
    if (!etat || !visite) return;
    if (n < 0 || n >= visite.etapes.length) return;
    ecrireVisite({ id: etat.id, etape: n });
  }, [etat, visite]);

  const quitter = useCallback(() => {
    window.dispatchEvent(new CustomEvent(EVT_OUVRIR, { detail: null }));
    ecrireVisite(null);
  }, []);

  const terminer = useCallback(() => {
    const suite = pas?.suite;
    try { if (etat) localStorage.setItem(`tdb_visite_faite_${etat.id}`, "1"); } catch { /* navigation privée */ }
    quitter();
    if (suite) router.push(suite.href);
  }, [pas, etat, quitter, router]);

  // Une étape commence : aller sur sa page, ouvrir ce qu'il faut, chercher la cible.
  useEffect(() => {
    if (!pas) return;
    cible.current = null;
    pageDuPas.current = null;
    setStatut("cherche");
    setRect(null);

    if (pas.route && !surLaRoute(pas.route)) {
      window.dispatchEvent(new CustomEvent(EVT_OUVRIR, { detail: null }));
      router.push(pas.route);
    }
    const ouvrir = setTimeout(() => {
      window.dispatchEvent(new CustomEvent(EVT_OUVRIR, { detail: pas.ouvrir ?? null }));
    }, pas.route ? 250 : 0);

    const debut = Date.now();
    const chercher = setInterval(() => {
      if (pas.route && !surLaRoute(pas.route)) {
        if (Date.now() - debut > ATTENTE_MAX) { clearInterval(chercher); setStatut("absent"); }
        return;
      }
      const el = trouver(pas.cibles);
      if (el) {
        clearInterval(chercher);
        cible.current = el;
        pageDuPas.current = window.location.pathname;
        const r = el.getBoundingClientRect();
        const haute = r.height > window.innerHeight * 0.55;
        const dehors = r.top < 72 || r.bottom > window.innerHeight - 72;
        // Les éléments de l'en-tête et de la barre du bas sont toujours à l'écran.
        const fixe = !!el.closest("header, nav");
        if (!fixe && (dehors || haute)) {
          el.scrollIntoView({ block: haute ? "start" : "center", behavior: reduit ? "auto" : "smooth" });
        }
        setStatut("trouve");
      } else if (Date.now() - debut > ATTENTE_MAX) {
        clearInterval(chercher);
        setStatut("absent");
      }
    }, 150);
    return () => { clearTimeout(ouvrir); clearInterval(chercher); };
  }, [pas, router, reduit]);

  // La lumière suit la cible : défilement, en-tête qui s'efface, menu qui s'ouvre.
  useEffect(() => {
    if (statut !== "trouve") return;
    let id = 0;
    const suivre = () => {
      const el = cible.current;
      if (el && el.isConnected) {
        const r = el.getBoundingClientRect();
        setRect((p) => {
          const n = { top: r.top - MARGE, left: r.left - MARGE, width: r.width + MARGE * 2, height: r.height + MARGE * 2 };
          if (p && Math.abs(p.top - n.top) < 0.5 && Math.abs(p.left - n.left) < 0.5
            && Math.abs(p.width - n.width) < 0.5 && Math.abs(p.height - n.height) < 0.5) return p;
          return n;
        });
      } else if (pas) {
        // La cible a été remplacée (un rendu, un chargement) : on la retrouve.
        const autre = trouver(pas.cibles);
        if (autre) cible.current = autre;
      }
      id = requestAnimationFrame(suivre);
    };
    id = requestAnimationFrame(suivre);
    return () => cancelAnimationFrame(id);
  }, [statut, pas]);

  // Changer de page pendant la visite : l'étape suivante, ou on s'arrête là.
  useEffect(() => {
    if (!etat || !visite || !pathname) return;
    const suivant = visite.etapes[etat.etape + 1];
    if (suivant?.route && cheminDe(suivant.route) === pathname && pageDuPas.current && pageDuPas.current !== pathname) {
      aller(etat.etape + 1);
      return;
    }
    if (pageDuPas.current && pageDuPas.current !== pathname) quitter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Le clavier : Échap pour sortir, les flèches pour avancer et reculer.
  useEffect(() => {
    if (!etat) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); quitter(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); if (dernier) terminer(); else aller(etat.etape + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); aller(etat.etape - 1); }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [etat, dernier, aller, quitter, terminer]);

  useLayoutEffect(() => {
    if (!bulle.current) return;
    const ro = new ResizeObserver(() => bulle.current && setHBulle(bulle.current.offsetHeight));
    ro.observe(bulle.current);
    return () => ro.disconnect();
  });

  useEffect(() => {
    if (statut !== "cherche") suivantRef.current?.focus({ preventScroll: true });
  }, [statut, etat?.etape]);

  if (!etat || !visite || !pas) return null;

  // Où poser la bulle : à côté de la cible, sans la couvrir.
  const largeur = mobile ? vue.l - 32 : 368;
  let pos: { top: number; left: number };
  if (!rect || statut !== "trouve") {
    pos = { top: Math.max(16, (vue.h - hBulle) / 2), left: (vue.l - largeur) / 2 };
  } else if (mobile) {
    const enHaut = rect.top + rect.height / 2 > vue.h / 2;
    pos = { top: enHaut ? 16 : vue.h - hBulle - 84, left: 16 };
  } else {
    const dessous = rect.top + rect.height + 14;
    const dessus = rect.top - hBulle - 14;
    const top = dessous + hBulle < vue.h - 16 ? dessous : dessus > 16 ? dessus : vue.h - hBulle - 24;
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - largeur / 2), vue.l - largeur - 16);
    pos = { top, left };
  }

  const ressort = reduit ? { duration: 0 } : { type: "spring" as const, stiffness: 150, damping: 24, mass: 0.9 };
  const trou = statut === "trouve" && rect;
  const texte = mobile && pas.texteMobile ? pas.texteMobile : pas.texte;
  const total = visite.etapes.length;

  return (
    <div
      className="fixed inset-0 z-[80]"
      // Le menu ouvert pour l'étape se ferme sur un clic « ailleurs » : la
      // bulle n'est pas un ailleurs.
      onMouseDown={(e) => e.stopPropagation()}
      aria-live="polite"
    >
      {/* Le voile, en quatre bandes autour de la cible, qui reste cliquable. */}
      {trou ? (
        <>
          <div className="absolute inset-x-0 top-0" style={{ height: Math.max(0, rect.top) }} />
          <div className="absolute inset-x-0 bottom-0" style={{ top: rect.top + rect.height }} />
          <div className="absolute left-0" style={{ top: rect.top, height: rect.height, width: Math.max(0, rect.left) }} />
          <div className="absolute right-0" style={{ top: rect.top, height: rect.height, left: rect.left + rect.width }} />
        </>
      ) : (
        <div className="absolute inset-0" />
      )}

      {/* La lumière : une découpe dans le voile, qui glisse d'une cible à l'autre. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute"
        initial={false}
        animate={trou
          ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height, borderRadius: 14 }
          : { top: vue.h / 2, left: vue.l / 2, width: 0, height: 0, borderRadius: 999 }}
        transition={ressort}
        style={{ boxShadow: "0 0 0 200vmax rgba(11, 23, 38, 0.56)" }}
      >
        {trou && <span className="vg-anneau absolute inset-0 rounded-[inherit]" />}
      </motion.div>

      <motion.div
        ref={bulle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vg-titre"
        className="absolute"
        initial={false}
        animate={{ top: pos.top, left: pos.left }}
        transition={ressort}
        style={{ width: largeur }}
      >
        <div
          className="cap rounded-[18px] p-5"
          style={{
            backgroundColor: "var(--cap-surface)",
            boxShadow: "inset 0 0 0 1px var(--cap-line), 0 18px 48px rgba(11, 23, 38, 0.28)",
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${etat.id}-${etat.etape}`}
              initial={reduit ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduit ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.32, ease: EASE }}
            >
              <div className="flex items-start gap-3">
                <Nimbo humeur={dernier ? "content" : etat.etape === 0 ? "salue" : "pointe"} taille={46} label="" className="-ml-1 -mt-1 flex-none" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 whitespace-nowrap text-[0.8rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>
                    <span aria-hidden className="h-px w-4" style={{ backgroundColor: "var(--cap-ambre)" }} />
                    Étape {etat.etape + 1} sur {total}
                  </p>
                  <h2 id="vg-titre" className="mt-1 text-[1.18rem] font-semibold leading-snug"
                    style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
                    {pas.titre}
                  </h2>
                </div>
                <button type="button" onClick={quitter} aria-label="Quitter la visite"
                  className="-mr-2 -mt-2 flex h-9 w-9 flex-none items-center justify-center rounded-full transition-colors hover:bg-[color:var(--cap-surface-2)]"
                  style={{ color: "var(--cap-ink-3)" }}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-[0.93rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>{texte}</p>
              {statut === "cherche" && (
                <p className="mt-2 text-[0.8rem] italic" style={{ color: "var(--cap-ink-3)" }}>Un instant, la page se charge…</p>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-4 flex items-center gap-1.5" aria-hidden>
            {visite.etapes.map((_, i) => (
              <span key={i} className="h-[3px] flex-1 rounded-full transition-colors duration-300"
                style={{ backgroundColor: i <= etat.etape ? "var(--cap-ocean)" : "var(--cap-line-strong)" }} />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {etat.etape > 0 ? (
              <button type="button" onClick={() => aller(etat.etape - 1)}
                className="flex min-h-[44px] items-center gap-1.5 text-[0.86rem]" style={{ color: "var(--cap-ink-3)" }}>
                <ArrowLeft className="h-3.5 w-3.5" /> Retour
              </button>
            ) : (
              <button type="button" onClick={quitter} className="cap-lien min-h-[44px] text-[0.86rem]">Passer</button>
            )}
            {dernier && pas.suite ? (
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => { try { localStorage.setItem(`tdb_visite_faite_${etat.id}`, "1"); } catch { /* */ } quitter(); }}
                  className="cap-lien text-[0.86rem]">Terminer</button>
                <SuivantBouton refBouton={suivantRef} onClick={terminer} label={pas.suite.label} />
              </div>
            ) : (
              <SuivantBouton refBouton={suivantRef} onClick={dernier ? terminer : () => aller(etat.etape + 1)}
                label={dernier ? "Compris" : "Suivant"} />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/** Le bouton principal du site, avec une référence pour y mettre le focus. */
function SuivantBouton({ onClick, label, refBouton }: { onClick: () => void; label: string; refBouton: React.RefObject<HTMLButtonElement | null> }) {
  return (
    <span ref={(n) => { refBouton.current = (n?.querySelector("button") as HTMLButtonElement) ?? null; }}>
      <Button size="md" onClick={onClick}>
        {label}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </span>
  );
}
