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
 * Deux moitiés opaques, bordées de nuages, se rejoignent au milieu ; quand le
 * chargement finit, elles s'écartent vers le haut et vers le bas et laissent
 * voir l'écran prêt.
 *
 * L'OUVERTURE SURVIT AU RIDEAU. Les écrans l'emploient ainsi :
 * `if (loading) return <CloudCurtain active />` — le rideau est donc retiré
 * de l'arbre à la seconde où les données arrivent, et son animation de
 * sortie ne jouait jamais : la page apparaissait d'un coup. À son retrait,
 * il pose à sa place une copie hors de React (même dessin, même position),
 * qui joue l'ouverture puis se supprime. Posée avant l'affichage de l'image
 * suivante (useLayoutEffect), elle ne laisse passer aucun flash.
 *
 * Tout ne bouge qu'en transform et opacity, avec des nuages pré-rendus : le
 * rideau précédent refaisait un flou SVG sur douze nuages à chaque image.
 * Under prefers-reduced-motion (ou animations coupées) it becomes a plain
 * fade of the same colour.
 */

const CSS_RIDEAU = `.cap-rideau{position:fixed;inset:0;z-index:70;pointer-events:none;overflow:hidden}
.cap-rideau-moitie{position:absolute;left:0;right:0;height:50%;background:var(--cap-cloud-mid);will-change:transform}
.cap-rideau-haut{top:0}.cap-rideau-bas{bottom:0}
.cap-rideau-frange{position:absolute;left:-6%;right:-6%;display:flex}
.cap-rideau-haut .cap-rideau-frange{top:100%;align-items:flex-start;margin-top:-7vh}
.cap-rideau-bas .cap-rideau-frange{bottom:100%;align-items:flex-end;margin-bottom:-7vh}
.cap-rideau-n{position:relative;flex-shrink:0;width:24%;aspect-ratio:2/1;margin-left:-5%}
.cap-rideau-n img{position:absolute;left:-15%;top:-30%;width:130%;height:160%;max-width:none}
.cap-rideau-lueur{position:absolute;left:50%;top:50%;width:70vmax;height:40vmax;border-radius:50%;
  transform:translate(-50%,-50%);background:radial-gradient(closest-side,var(--cap-cloud-light),transparent);opacity:.7}
.cap-rideau-mot{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  font-size:.82rem;letter-spacing:.06em;color:var(--cap-ink-3);animation:cap-rideau-mot .3s ease .5s both}
@keyframes cap-rideau-mot{from{opacity:0}to{opacity:1}}
@keyframes cap-rideau-haut-in{from{transform:translate3d(0,-115%,0)}to{transform:none}}
@keyframes cap-rideau-bas-in{from{transform:translate3d(0,115%,0)}to{transform:none}}
@keyframes cap-rideau-haut-out{from{transform:none}to{transform:translate3d(0,-122%,0) scale(1.06)}}
@keyframes cap-rideau-bas-out{from{transform:none}to{transform:translate3d(0,122%,0) scale(1.06)}}
@keyframes cap-rideau-fondu{from{opacity:1}to{opacity:0}}
.cap-rideau[data-etat="ferme"] .cap-rideau-haut{animation:cap-rideau-haut-in .55s cubic-bezier(.16,1,.3,1) both}
.cap-rideau[data-etat="ferme"] .cap-rideau-bas{animation:cap-rideau-bas-in .55s cubic-bezier(.16,1,.3,1) both}
.cap-rideau[data-etat="ouvre"] .cap-rideau-haut{animation:cap-rideau-haut-out .9s cubic-bezier(.65,0,.35,1) both}
.cap-rideau[data-etat="ouvre"] .cap-rideau-bas{animation:cap-rideau-bas-out .9s cubic-bezier(.65,0,.35,1) both}
.cap-rideau[data-etat="ouvre"] .cap-rideau-lueur,.cap-rideau[data-etat="ouvre"] .cap-rideau-mot{animation:cap-rideau-fondu .35s ease both}
.cap-rideau[data-calme="1"] .cap-rideau-frange{display:none}
.cap-rideau[data-calme="1"][data-etat="ferme"] .cap-rideau-moitie{animation:cap-rideau-mot .25s ease both}
.cap-rideau[data-calme="1"][data-etat="ouvre"]{animation:cap-rideau-fondu .25s ease both}
.cap-rideau[data-calme="1"][data-etat="ouvre"] .cap-rideau-moitie{animation:none}`;

const HAUT = [0, 2, 1, 3, 0, 2, 1];
const BAS = [2, 1, 3, 0, 2, 1, 3];

/** Le dessin du rideau, en HTML : le même pour la version React et pour la
 *  copie qui joue l'ouverture. */
function dessin(teinte: Teinte, label: string): string {
  const frange = (formes: number[], inverse: boolean) => formes.map((f, i) =>
    `<div class="cap-rideau-n" style="margin-${inverse ? "top" : "bottom"}:${-(i % 3) * 1.5}vh">` +
    `<img alt="" src="${nuageSrc(f, 3.5, teinte)}" style="transform:${inverse ? "scaleY(-1)" : ""}${i % 2 ? " scaleX(-1)" : ""}"></div>`).join("");
  const echap = label.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
  return `<div class="cap-rideau-moitie cap-rideau-haut"><div class="cap-rideau-frange">${frange(HAUT, true)}</div></div>` +
    `<div class="cap-rideau-moitie cap-rideau-bas"><div class="cap-rideau-frange">${frange(BAS, false)}</div></div>` +
    `<div class="cap-rideau-lueur"></div><div class="cap-rideau-mot">${echap}</div>`;
}

function calme(): boolean {
  try {
    return localStorage.getItem("tdb_animations") === "off" || matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch { return false; }
}

// La dernière copie posée. Si un autre rideau prend le relais dans la même
// mise à jour (un Suspense qui cède la place au chargement de l'écran), la
// copie est retirée avant d'être vue et le nouveau rideau reste fermé, sans
// rejouer son arrivée : un seul rideau, qui ne s'ouvre qu'une fois.
let derniere: { el: HTMLElement; t: number } | null = null;

/** Pose la copie qui s'ouvre, puis la retire. */
function ouvrir(teinte: Teinte, label: string) {
  if (typeof document === "undefined") return;
  if (!document.getElementById("cap-rideau-css")) {
    const st = document.createElement("style");
    st.id = "cap-rideau-css"; st.textContent = CSS_RIDEAU; document.head.appendChild(st);
  }
  const el = document.createElement("div");
  el.className = "cap-rideau";
  el.setAttribute("aria-hidden", "true");
  el.dataset.etat = "ouvre";
  el.dataset.calme = calme() ? "1" : "0";
  el.innerHTML = dessin(teinte, label);
  // Sur la page : le rideau suit le thème, qui est posé sur .cap.
  (document.querySelector(".cap") ?? document.body).appendChild(el);
  derniere = { el, t: performance.now() };
  window.setTimeout(() => el.remove(), 1000);
}

export function CloudCurtain({
  active,
  label = "Chargement",
}: {
  active: boolean;
  label?: string;
}) {
  const [teinte, setTeinte] = useState<Teinte>("clair");
  const [calmeOk, setCalme] = useState(false);
  const etat = useRef({ active, teinte, label });
  etat.current = { active, teinte, label };

  useEffect(() => { setTeinte(lireTeinte()); setCalme(calme()); }, []);

  const boite = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (active && derniere && performance.now() - derniere.t < 120) {
      derniere.el.remove(); derniere = null;
      boite.current?.setAttribute("data-etat", "tenu");
    }
  }, [active]);

  // Passage de actif à inactif : l'ouverture.
  const avant = useRef(active);
  useLayoutEffect(() => {
    if (avant.current && !active) ouvrir(teinte, label);
    avant.current = active;
  }, [active, teinte, label]);
  // Retrait pendant qu'il était actif : l'ouverture aussi.
  useLayoutEffect(() => () => {
    const e = etat.current;
    if (e.active) ouvrir(e.teinte, e.label);
  }, []);

  if (!active) return null;
  return (
    <div role="status" aria-live="polite" aria-label={label}>
      <style id="cap-rideau-css-r" dangerouslySetInnerHTML={{ __html: CSS_RIDEAU }} />
      <div ref={boite} className="cap-rideau" data-etat="ferme" data-calme={calmeOk ? "1" : "0"}
        dangerouslySetInnerHTML={{ __html: dessin(teinte, label) }} />
    </div>
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
