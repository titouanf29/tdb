"use client";

/**
 * Les animations de l'application, en CSS.
 *
 * Une seule feuille, posée par l'enveloppe de l'application (AppChrome), et
 * des classes que les écrans ajoutent. Tout est en transform et opacity, joue
 * une fois à l'apparition (les animations CSS ne rejouent pas quand React
 * met à jour), et s'arrête net sous « animations coupées » (classe anim-off
 * sur <html>) ou si l'appareil demande moins de mouvement.
 */
const DELAIS = Array.from({ length: 12 }, (_, i) => `.cap-liste>*:nth-child(${i + 1}){animation-delay:${(0.04 + i * 0.045).toFixed(3)}s}`).join("");

export const CSS_APP = `@keyframes cap-app-monte{from{opacity:0;transform:translate3d(0,10px,0)}to{opacity:1;transform:none}}
.cap-liste>*{animation:cap-app-monte .5s cubic-bezier(.22,1,.36,1) both}
${DELAIS}.cap-liste>*:nth-child(n+13){animation-delay:.6s}
@keyframes cap-app-mot{from{opacity:0;transform:translate3d(0,.4em,0)}to{opacity:1;transform:none}}
.cap-app-mot{display:inline-block;animation:cap-app-mot .75s cubic-bezier(.16,1,.3,1) both;animation-delay:var(--d,0s)}
.cap-chevron{opacity:0;transform:translate3d(-4px,0,0);transition:opacity .2s ease,transform .25s cubic-bezier(.22,1,.36,1)}
a:hover .cap-chevron,a:focus-visible .cap-chevron{opacity:1;transform:none}
.cap-fleche{transition:transform .25s cubic-bezier(.22,1,.36,1)}
a:hover .cap-fleche,button:hover .cap-fleche{transform:translate3d(3px,0,0)}
.cap-puce{transition:transform .25s cubic-bezier(.22,1,.36,1),box-shadow .25s,background-color .25s}
.cap-puce:hover{transform:translate3d(0,-2px,0);box-shadow:0 6px 16px -10px rgba(11,23,38,.35)}
@keyframes cap-app-pop{0%{transform:scale(.3);opacity:0}60%{transform:scale(1.18);opacity:1}100%{transform:none;opacity:1}}
.cap-pop{animation:cap-app-pop .5s cubic-bezier(.34,1.56,.64,1) both;animation-delay:var(--d,0s)}
@keyframes cap-app-barre{from{transform:scaleX(0)}}
.cap-barre{transform-origin:0 50%;transition:transform 1s cubic-bezier(.22,1,.36,1);animation:cap-app-barre 1.1s cubic-bezier(.22,1,.36,1) .3s both}
.cap-app-main h1{animation:cap-app-monte .6s cubic-bezier(.22,1,.36,1) both}
@keyframes cap-app-derive{from{transform:translate3d(-40%,0,0)}to{transform:translate3d(140%,0,0)}}
.cap-carte-nuage{animation:cap-app-derive var(--t,46s) linear infinite;animation-delay:var(--d,0s)}
@keyframes cap-app-reflet{0%,62%{transform:translate3d(-130%,0,0) skewX(-18deg)}100%{transform:translate3d(330%,0,0) skewX(-18deg)}}
.cap-carte-reflet{animation:cap-app-reflet 7.5s cubic-bezier(.45,0,.2,1) 1.2s infinite}
@keyframes cap-app-onde{0%{transform:scale(.6);opacity:.65}100%{transform:scale(2.6);opacity:0}}
.cap-app-onde{animation:cap-app-onde 2.4s cubic-bezier(.2,.6,.3,1) infinite}
.anim-off .cap-liste>*,.anim-off .cap-app-mot,.anim-off .cap-pop,.anim-off .cap-carte-nuage,.anim-off .cap-barre,.anim-off .cap-app-main h1{animation:none}
.anim-off .cap-carte-reflet,.anim-off .cap-app-onde{display:none}
.anim-off .cap-barre,.anim-off .cap-puce{transition:none}
@media (prefers-reduced-motion: reduce){
  .cap-liste>*,.cap-app-mot,.cap-pop,.cap-carte-nuage,.cap-barre,.cap-app-main h1{animation:none}
  .cap-carte-reflet,.cap-app-onde{display:none}
  .cap-barre,.cap-puce,.cap-chevron,.cap-fleche{transition:none}
}`;

export function AnimationsApp() {
  return <style dangerouslySetInnerHTML={{ __html: CSS_APP }} />;
}

/** Un titre dont les mots montent l'un après l'autre. */
export function MotsApp({ texte, delai = 0 }: { texte: string; delai?: number }) {
  const mots = texte.split(" ");
  return (
    <>
      {mots.map((m, i) => (
        <span key={i}>
          <span className="cap-app-mot" style={{ ["--d" as string]: `${(delai + i * 0.07).toFixed(2)}s` }}>{m}</span>
          {i < mots.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}
