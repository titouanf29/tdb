"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AREAS } from "./nav";

/**
 * Les transitions entre les pages.
 *
 * La page changeait d'un coup, sous un rideau de nuages qui masquait le
 * changement au lieu de le montrer. Ici, le navigateur garde une image de la
 * page qu'on quitte (API View Transitions) : elle sort pendant que la
 * nouvelle entre, et le sens dit où l'on va. On avance dans le menu, la page
 * glisse vers la gauche ; on revient, elle glisse vers la droite ; ailleurs,
 * un fondu qui monte. L'en-tête et la barre d'onglets ne bougent pas.
 *
 * Le clic sur un lien interne est repris : la navigation part à l'intérieur
 * de la transition, qui se termine quand la nouvelle adresse est affichée
 * (au plus 1,2 s, pour qu'une page lente ne fige pas l'écran). Navigateur
 * sans cette API, mouvement réduit ou animations coupées : rien ne change,
 * le rideau de nuages reste le repli.
 */

/** L'ordre des pages, celui du menu : il donne le sens du glissement. */
const ORDRE: string[] = AREAS.flatMap((a) => (a.items.length ? a.items.map((l) => l.href) : [a.href]));

function rang(chemin: string): number {
  let meilleur = -1, longueur = 0;
  ORDRE.forEach((h, i) => {
    if ((chemin === h || chemin.startsWith(`${h}/`)) && h.length > longueur) { meilleur = i; longueur = h.length; }
  });
  return meilleur;
}

function sens(depuis: string, vers: string): "avant" | "arriere" | "fondu" {
  const a = rang(depuis), b = rang(vers);
  if (a < 0 || b < 0 || a === b) return "fondu";
  return b > a ? "avant" : "arriere";
}

type DocTransition = Document & { startViewTransition?: (cb: () => Promise<void>) => { finished: Promise<void> } };

/** Vrai quand le navigateur sait faire la transition, et que la personne veut du mouvement. */
export function transitionsNatives(): boolean {
  if (typeof document === "undefined") return false;
  if (!(document as DocTransition).startViewTransition) return false;
  if (document.documentElement.classList.contains("anim-off")) return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Un lien que l'on peut reprendre : interne, clic simple, pas de nouvel onglet ni d'ancre seule. */
function lienRepris(e: MouseEvent): URL | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  const a = (e.target as Element | null)?.closest?.("a[href]");
  if (!(a instanceof HTMLAnchorElement)) return null;
  if (a.target && a.target !== "_self") return null;
  if (a.hasAttribute("download") || a.dataset.sansTransition !== undefined) return null;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return null;
  if (url.pathname === location.pathname) return null; // même page : ancre ou paramètres, pas de transition
  return url;
}

const CSS = `
::view-transition-old(root),::view-transition-new(root){animation-duration:.42s;animation-timing-function:cubic-bezier(.22,1,.36,1)}
::view-transition-old(root){animation-name:cap-vt-fond-sort}
::view-transition-new(root){animation-name:cap-vt-fond-entre}
@keyframes cap-vt-fond-sort{to{opacity:0}}
@keyframes cap-vt-fond-entre{from{opacity:0}}
::view-transition-group(cap-page){animation-duration:.46s;animation-timing-function:cubic-bezier(.22,1,.36,1)}
::view-transition-old(cap-page){animation:cap-vt-sort-fondu .26s cubic-bezier(.4,0,1,1) both}
::view-transition-new(cap-page){animation:cap-vt-entre-fondu .5s cubic-bezier(.22,1,.36,1) .06s both}
html[data-vt="avant"]::view-transition-old(cap-page){animation-name:cap-vt-sort-gauche}
html[data-vt="avant"]::view-transition-new(cap-page){animation-name:cap-vt-entre-droite}
html[data-vt="arriere"]::view-transition-old(cap-page){animation-name:cap-vt-sort-droite}
html[data-vt="arriere"]::view-transition-new(cap-page){animation-name:cap-vt-entre-gauche}
@keyframes cap-vt-sort-fondu{to{opacity:0;transform:translate3d(0,-8px,0) scale(.99)}}
@keyframes cap-vt-entre-fondu{from{opacity:0;transform:translate3d(0,18px,0)}}
@keyframes cap-vt-sort-gauche{to{opacity:0;transform:translate3d(-48px,0,0)}}
@keyframes cap-vt-entre-droite{from{opacity:0;transform:translate3d(64px,0,0)}}
@keyframes cap-vt-sort-droite{to{opacity:0;transform:translate3d(48px,0,0)}}
@keyframes cap-vt-entre-gauche{from{opacity:0;transform:translate3d(-64px,0,0)}}
::view-transition-group(cap-entete),::view-transition-group(cap-onglets),::view-transition-group(cap-entete-vitrine){animation-duration:.42s}
::view-transition-old(cap-entete),::view-transition-new(cap-entete),::view-transition-old(cap-onglets),::view-transition-new(cap-onglets){animation:none;mix-blend-mode:normal}
.cap-app-main{view-transition-name:cap-page}
[data-vt-nom="entete"]{view-transition-name:cap-entete}
[data-vt-nom="onglets"]{view-transition-name:cap-onglets}
[data-vt-nom="entete-vitrine"]{view-transition-name:cap-entete-vitrine}
@media (prefers-reduced-motion: reduce){::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation:none!important}}
`;

function oublierSens() { delete document.documentElement.dataset.vt; }

type Attente = { current: { vers: string; fin: () => void } | null };

/** Lance la navigation et rend une promesse tenue quand la nouvelle adresse est affichée (1,2 s au plus). */
function naviguer(attente: Attente, aller: () => void, vers: string): Promise<void> {
  return new Promise<void>((fin) => {
    const garde = window.setTimeout(() => { attente.current = null; fin(); }, 1200);
    const terminer = () => { window.clearTimeout(garde); fin(); };
    attente.current = { vers, fin: terminer };
    aller();
  });
}

export function TransitionsDePage() {
  const router = useRouter();
  const pathname = usePathname();
  const attente = useRef<{ vers: string; fin: () => void } | null>(null);

  // La nouvelle adresse est affichée : la transition peut jouer.
  useEffect(() => {
    const a = attente.current;
    if (a && pathname === a.vers) {
      attente.current = null;
      // Tout de suite : le DOM de la nouvelle page est en place. Pas d'attente
      // d'image (requestAnimationFrame), le navigateur suspend l'affichage tant
      // que la transition n'a pas reçu la nouvelle page.
      a.fin();
    }
  }, [pathname]);

  useEffect(() => {
    const auClic = (e: MouseEvent) => {
      const url = lienRepris(e);
      if (!url || !transitionsNatives()) return;
      e.preventDefault();
      const doc = document as DocTransition;
      document.documentElement.dataset.vt = sens(location.pathname, url.pathname);
      const cible = url.pathname + url.search + url.hash;
      const aller = router.push.bind(router, cible);
      const t = doc.startViewTransition!(naviguer.bind(null, attente, aller, url.pathname));
      t.finished.finally(oublierSens);
    };
    // En phase de capture : avant le gestionnaire du composant Link, qui
    // navigue de lui-même si le clic n'est pas déjà pris en charge.
    document.addEventListener("click", auClic, true);
    return () => document.removeEventListener("click", auClic, true);
  }, [router]);

  return <style dangerouslySetInnerHTML={{ __html: CSS }} />;
}
