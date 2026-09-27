"use client";

import { useEffect, useState } from "react";
import { SILHOUETTES } from "./CloudLayer";

/**
 * Un nuage, pré-dessiné en image.
 *
 * POURQUOI UNE IMAGE. Un nuage est un dessin vectoriel adouci par un flou
 * gaussien. Dessiné directement dans la page, ce flou est recalculé par le
 * navigateur à chaque image dès que le nuage grossit, se déplace ou change
 * d'opacité — mesuré sur la page de présentation : 43 % des images au-delà
 * de 25 ms au défilement, des pics à 350 ms à l'ouverture. Une fois converti
 * en image, le nuage est peint une seule fois ; ensuite on ne fait que le
 * déplacer, le grossir ou l'estomper, ce que le processeur graphique fait
 * sans rien redessiner.
 *
 * Les couleurs viennent du thème (variables --cap-cloud-*) : une image ne
 * lit pas les variables CSS, elles sont donc relues au montage et injectées.
 */

export interface Teinte { light: string; mid: string; shade: string }

const CLAIR: Teinte = { light: "#FDFDFE", mid: "#E2E9F1", shade: "#BCC9DA" };

/** Les couleurs de nuage du thème courant, lues après le premier rendu. */
export function useTeinteNuage(): Teinte {
  const [t, setT] = useState<Teinte>(CLAIR);
  useEffect(() => {
    const lire = () => {
      const s = getComputedStyle(document.querySelector(".cap") ?? document.documentElement);
      const v = (n: string, d: string) => s.getPropertyValue(n).trim() || d;
      setT({ light: v("--cap-cloud-light", CLAIR.light), mid: v("--cap-cloud-mid", CLAIR.mid), shade: v("--cap-cloud-shade", CLAIR.shade) });
    };
    lire();
    const obs = new MutationObserver(lire);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
    return () => obs.disconnect();
  }, []);
  return t;
}

// Marge autour du nuage pour que le flou ne soit jamais coupé : le nuage
// occupe la boîte 200 × 100, l'image fait 260 × 160.
const M = 30;
const cache = new Map<string, string>();

export function nuageUrl(forme: number, t: Teinte, flou = 2.4, retourne = false): string {
  const cle = `${forme}|${flou}|${retourne}|${t.light}|${t.mid}|${t.shade}`;
  const deja = cache.get(cle);
  if (deja) return deja;
  const { lobes, base } = SILHOUETTES[forme % SILHOUETTES.length];
  const formes =
    `<ellipse cx="${base[0]}" cy="${base[1]}" rx="${base[2]}" ry="${base[3]}"/>` +
    lobes.map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`).join("");
  const miroir = retourne ? ` transform="translate(200,0) scale(-1,1)"` : "";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-M} ${-M} ${200 + 2 * M} ${100 + 2 * M}" width="${(200 + 2 * M) * 2}" height="${(100 + 2 * M) * 2}">` +
    `<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="${t.light}"/><stop offset="46%" stop-color="${t.light}"/>` +
    `<stop offset="74%" stop-color="${t.mid}"/><stop offset="100%" stop-color="${t.shade}"/></linearGradient>` +
    `<filter id="s" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${flou}"/></filter></defs>` +
    `<g filter="url(#s)" fill="url(#f)"${miroir}>${formes}</g></svg>`;
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  cache.set(cle, url);
  return url;
}

/* ── La version bitmap ─────────────────────────────────────────────────
 *
 * Même en image, un SVG est redessiné à sa taille d'affichage : un nuage de
 * deux écrans de large recalcule son flou sur deux écrans. On le dessine
 * donc UNE fois dans une petite toile (520 × 320), et c'est cette toile, en
 * PNG, qui est affichée : l'agrandir ne coûte rien à la carte graphique, et
 * un nuage flou ne perd rien à être agrandi. */
const bitmaps = new Map<string, string>();
const enCours = new Map<string, Promise<string>>();

function versBitmap(svgUrl: string): Promise<string> {
  const deja = bitmaps.get(svgUrl);
  if (deja) return Promise.resolve(deja);
  const attente = enCours.get(svgUrl);
  if (attente) return attente;
  const p = new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = (200 + 2 * M) * 2; c.height = (100 + 2 * M) * 2;
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob((b) => {
          const url = b ? URL.createObjectURL(b) : svgUrl;
          bitmaps.set(svgUrl, url); resolve(url);
        }, "image/png");
      } catch { resolve(svgUrl); }
    };
    img.onerror = () => resolve(svgUrl);
    img.src = svgUrl;
  });
  enCours.set(svgUrl, p);
  return p;
}

function useNuageBitmap(svgUrl: string): string {
  const [url, setUrl] = useState(() => bitmaps.get(svgUrl) ?? svgUrl);
  useEffect(() => {
    let vivant = true;
    versBitmap(svgUrl).then((u) => { if (vivant) setUrl(u); });
    return () => { vivant = false; };
  }, [svgUrl]);
  return url;
}

/**
 * Le nuage dans une boîte au format 2:1 (celle de la silhouette). L'image,
 * plus grande pour loger le flou, déborde de la boîte sans la déformer.
 */
export function NuageImage({ forme = 0, retourne, flou = 2.4, className, style }: {
  forme?: number; retourne?: boolean; flou?: number; className?: string; style?: React.CSSProperties;
}) {
  const t = useTeinteNuage();
  const src = useNuageBitmap(nuageUrl(forme, t, flou, retourne));
  return (
    <div aria-hidden className={className} style={{ position: "relative", aspectRatio: "2 / 1", ...style, height: undefined }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" draggable={false} decoding="async"
        style={{ position: "absolute", left: `${-(M / 200) * 100}%`, top: `${-(M / 100) * 100}%`,
                 width: `${((200 + 2 * M) / 200) * 100}%`, height: `${((100 + 2 * M) / 100) * 100}%`,
                 maxWidth: "none", pointerEvents: "none", userSelect: "none" }} />
    </div>
  );
}
