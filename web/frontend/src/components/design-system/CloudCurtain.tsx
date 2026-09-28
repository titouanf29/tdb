"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { lireTeinte, nuageSrc, type Teinte } from "./NuageImage";

/**
 * Weather closing over the screen while something loads, then parting.
 *
 * A spinner says "wait". This says "the sky is being read" — and it is the
 * same sky as the landing page, so moving from the public site into the app
 * feels like walking through one building rather than two.
 *
 * UN SEUL RIDEAU POUR TOUTE L'APPLICATION. Plusieurs choses le demandent :
 * le changement de page (AppChrome), le chargement de l'écran, un Suspense.
 * Quand chacune dessinait le sien, ils s'empilaient — deux libellés l'un sur
 * l'autre, deux rangées de nuages décalées, l'un qui s'ouvrait pendant que
 * l'autre se fermait. Désormais chaque <CloudCurtain active> ne fait que
 * « tenir » l'unique rideau, posé hors de React ; il se ferme à la première
 * demande et ne s'ouvre que lorsque plus personne ne le tient.
 *
 * Les moitiés bougent par transitions CSS, pas par animations figées : si le
 * chargement finit pendant que le rideau se ferme, il repart d'où il en est,
 * sans saut. Tout reste en transform et opacity, sur des nuages pré-rendus.
 * Mouvement réduit ou animations coupées : un simple fondu.
 */

const CSS_RIDEAU = `.cap-rideau{position:fixed;inset:0;z-index:70;pointer-events:none;overflow:hidden;transition:opacity .25s ease}
.cap-rideau-moitie{position:absolute;left:0;right:0;height:50.5%;background:var(--cap-cloud-mid);will-change:transform;
  transition:transform .5s cubic-bezier(.16,1,.3,1)}
.cap-rideau-haut{top:0}.cap-rideau-bas{bottom:0}
.cap-rideau-frange{position:absolute;left:-6%;right:-6%;display:flex}
.cap-rideau-haut .cap-rideau-frange{top:100%;align-items:flex-start;margin-top:-7vh}
.cap-rideau-bas .cap-rideau-frange{bottom:100%;align-items:flex-end;margin-bottom:-7vh}
.cap-rideau-n{position:relative;flex-shrink:0;width:24%;aspect-ratio:2/1;margin-left:-5%}
.cap-rideau-n img{position:absolute;left:-15%;top:-30%;width:130%;height:160%;max-width:none}
.cap-rideau-lueur{position:absolute;left:50%;top:50%;width:70vmax;height:40vmax;border-radius:50%;
  transform:translate(-50%,-50%);background:radial-gradient(closest-side,var(--cap-cloud-light),transparent);transition:opacity .35s ease}
.cap-rideau-mot{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  font-size:.82rem;letter-spacing:.06em;color:var(--cap-ink-3);transition:opacity .3s ease}
.cap-rideau[data-etat="loin"] .cap-rideau-haut,.cap-rideau[data-etat="ouvre"] .cap-rideau-haut{transform:translate3d(0,-122%,0)}
.cap-rideau[data-etat="loin"] .cap-rideau-bas,.cap-rideau[data-etat="ouvre"] .cap-rideau-bas{transform:translate3d(0,122%,0)}
.cap-rideau[data-etat="ouvre"] .cap-rideau-moitie{transition-duration:.85s;transition-timing-function:cubic-bezier(.65,0,.35,1)}
.cap-rideau[data-etat="loin"] .cap-rideau-mot,.cap-rideau[data-etat="ouvre"] .cap-rideau-mot,
.cap-rideau[data-etat="loin"] .cap-rideau-lueur,.cap-rideau[data-etat="ouvre"] .cap-rideau-lueur{opacity:0}
.cap-rideau[data-etat="ferme"] .cap-rideau-mot{transition-delay:.45s}
.cap-rideau[data-etat="ferme"] .cap-rideau-lueur{opacity:.7}
.cap-rideau[data-calme="1"] .cap-rideau-frange{display:none}
.cap-rideau[data-calme="1"] .cap-rideau-moitie{transform:none !important;transition:none}
.cap-rideau[data-calme="1"][data-etat="loin"],.cap-rideau[data-calme="1"][data-etat="ouvre"]{opacity:0}`;

const HAUT = [0, 2, 1, 3, 0, 2, 1];
const BAS = [2, 1, 3, 0, 2, 1, 3];

function dessin(teinte: Teinte): string {
  const frange = (formes: number[], inverse: boolean) => formes.map((f, i) =>
    `<div class="cap-rideau-n" style="margin-${inverse ? "top" : "bottom"}:${-(i % 3) * 1.5}vh">` +
    `<img alt="" decoding="async" src="${nuageSrc(f, 3.5, teinte)}" style="transform:${inverse ? "scaleY(-1)" : ""}${i % 2 ? " scaleX(-1)" : ""}"></div>`).join("");
  return `<div class="cap-rideau-moitie cap-rideau-haut"><div class="cap-rideau-frange">${frange(HAUT, true)}</div></div>` +
    `<div class="cap-rideau-moitie cap-rideau-bas"><div class="cap-rideau-frange">${frange(BAS, false)}</div></div>` +
    `<div class="cap-rideau-lueur"></div><div class="cap-rideau-mot"></div>`;
}

function calme(): boolean {
  try {
    return localStorage.getItem("tdb_animations") === "off" || matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch { return false; }
}

/* ── Le rideau unique ─────────────────────────────────────────────────── */

let el: HTMLDivElement | null = null;
let retrait = 0;
let prochainId = 1;
const tenants = new Map<number, string>();

// Le libellé le plus précis gagne : celui de l'écran (« Chargement de votre
// compte ») plutôt que le générique du changement de page.
function libelle(): string {
  const tous = Array.from(tenants.values());
  return tous.filter((l) => l !== "Chargement").pop() ?? tous.pop() ?? "Chargement";
}

function poser(_label?: string) {
  const label = libelle();
  const mot = el?.querySelector(".cap-rideau-mot");
  if (mot) mot.textContent = label;
  el?.setAttribute("aria-label", label);
}

// Le rideau est posé FERMÉ, sans glisser depuis les bords. Quand il glissait,
// l'écran précédent avait déjà disparu (la route a changé, la page en
// chargement ne rend que lui) : pendant la fermeture on voyait une page vide.
// La transition, c'est l'ouverture sur l'écran prêt.
function tenir(label: string): number {
  const id = prochainId++;
  tenants.set(id, label);
  window.clearTimeout(retrait);
  // Détaché avec sa mise en page (passage du site public à l'application) :
  // on en repose un.
  if (el && !el.isConnected) el = null;
  if (!el) {
    if (!document.getElementById("cap-rideau-css")) {
      const st = document.createElement("style");
      st.id = "cap-rideau-css"; st.textContent = CSS_RIDEAU; document.head.appendChild(st);
    }
    el = document.createElement("div");
    el.className = "cap-rideau";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.dataset.calme = calme() ? "1" : "0";
    el.dataset.etat = "ferme";
    el.innerHTML = dessin(lireTeinte());
    // Dans .cap : le rideau suit le thème, qui y est posé.
    (document.querySelector(".cap") ?? document.body).appendChild(el);
  }
  el.dataset.etat = "ferme";
  poser(label);
  return id;
}

function lacher(id: number) {
  tenants.delete(id);
  // Attendre la fin de la mise à jour : un autre rideau prend souvent le
  // relais dans le même rendu (Suspense → chargement de l'écran).
  queueMicrotask(() => {
    if (!el) return;
    if (tenants.size > 0) { poser(Array.from(tenants.values()).pop() as string); return; }
    el.dataset.etat = "ouvre";
    const parti = el;
    retrait = window.setTimeout(() => { parti.remove(); if (el === parti) el = null; }, 950);
  });
}

export function CloudCurtain({
  active,
  label = "Chargement",
}: {
  active: boolean;
  label?: string;
}) {
  // Premier rendu (serveur, puis hydratation) : un rideau fermé, en HTML, pour
  // qu'aucune page à moitié construite ne soit visible avant l'hydratation.
  // Dès l'hydratation, le rideau unique prend le relais et celui-ci disparaît.
  const [monte, setMonte] = useState(false);
  const id = useRef(0);

  useLayoutEffect(() => {
    setMonte(true);
    if (!active) return;
    id.current = tenir(label);
    return () => lacher(id.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useLayoutEffect(() => {
    if (active && id.current) { tenants.set(id.current, label); poser(label); }
  }, [active, label]);

  if (monte || !active) return null;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS_RIDEAU }} />
      <div className="cap-rideau" data-etat="ferme" role="status" aria-label={label}
        dangerouslySetInnerHTML={{ __html: dessin("clair") }} />
    </>
  );
}

/**
 * Plays the curtain for a moment whenever the route changes.
 *
 * `key` is the caller's pathname; the hook returns whether the curtain should
 * be up. Deliberately brief — a transition that outlasts the navigation turns
 * a fast app into a slow one.
 */
export function useRouteCurtain(key: string, ms = 620): boolean {
  const [active, setActive] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setActive(true);
    const t = setTimeout(() => setActive(false), ms);
    return () => clearTimeout(t);
  }, [key, ms]);

  return active;
}
