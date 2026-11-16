"use client";

import { useEffect } from "react";

/**
 * Ce qui bouge sur l'accueil, en un seul script, comme le home.js de Clair :
 *  · les blocs apparaissent quand ils arrivent à l'écran, les voisins l'un
 *    après l'autre ;
 *  · le fil des trois gestes se remplit pendant qu'on descend ;
 *  · les bords de nuages glissent doucement au défilement ;
 *  · au téléphone, la barre d'action arrive quand le bouton du haut est sorti.
 *
 * Sans script, tout est lisible : la classe `acc-js` n'active que les états
 * de départ. Mouvement réduit : tout est en place d'emblée.
 */
export function Mouvements() {
  useEffect(() => {
    const racine = document.documentElement;
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    racine.classList.add("acc-js");

    const blocs = [...document.querySelectorAll<HTMLElement>(".acc-reveal")];
    let obs: IntersectionObserver | null = null;
    if (reduit || !("IntersectionObserver" in window)) {
      blocs.forEach((b) => b.classList.add("is-in"));
    } else {
      blocs.forEach((b) => {
        const freres = [...(b.parentElement?.children ?? [])].filter((x) => x.classList.contains("acc-reveal"));
        b.style.setProperty("--d", `${Math.min(freres.indexOf(b), 4) * 0.09}s`);
      });
      obs = new IntersectionObserver((entrees) => {
        entrees.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("is-in");
          obs?.unobserve(e.target);
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
      blocs.forEach((b) => obs?.observe(b));
    }

    const fil = document.querySelector<HTMLElement>(".acc-fil");
    const haut = document.querySelector<HTMLElement>(".acc-hero");
    const bords = [...document.querySelectorAll<HTMLElement>(".acc-bord")];
    const dock = document.querySelector<HTMLElement>(".acc-dock");
    const boutonHaut = document.querySelector<HTMLElement>(".acc-hero .acc-cta");
    const fin = document.querySelector<HTMLElement>(".acc-final");
    let raf = 0;
    const maj = () => {
      raf = 0;
      const h = window.innerHeight;
      if (haut && !reduit) {
        // 0 tant que le haut de page est entier à l'écran, 1 quand il en est sorti.
        const r = haut.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height * 0.9)));
        haut.style.setProperty("--hp", p.toFixed(3));
      }
      if (fil && !reduit) {
        const r = fil.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (h * 0.62 - r.top) / r.height));
        fil.style.setProperty("--tp", p.toFixed(3));
      }
      if (!reduit) {
        for (const b of bords) {
          const r = b.getBoundingClientRect();
          if (r.bottom < -100 || r.top > h + 100) continue;
          b.style.setProperty("--sc", ((r.top - h / 2) / h).toFixed(3));
        }
      }
      if (dock && boutonHaut) {
        const sorti = boutonHaut.getBoundingClientRect().bottom < 0;
        const finVue = fin ? fin.getBoundingClientRect().top < h * 0.8 : false;
        dock.classList.toggle("is-on", sorti && !finVue);
      }
    };
    const demander = () => { if (!raf) raf = requestAnimationFrame(maj); };
    maj();
    window.addEventListener("scroll", demander, { passive: true });
    window.addEventListener("resize", demander);
    return () => {
      obs?.disconnect();
      window.removeEventListener("scroll", demander);
      window.removeEventListener("resize", demander);
      if (raf) cancelAnimationFrame(raf);
      racine.classList.remove("acc-js");
    };
  }, []);
  return null;
}
