"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import type { Bloc } from "@/lib/cours/types";
import { Nimbo, useMouvementReduit } from "@/components/design-system";
import { GraphiqueEcole, type ConfigGraphique } from "./GraphiqueEcole";

/** Le texte d'une leçon, écrit par nous : quelques balises de mise en valeur seulement. */
export function Html({ html, className, as = "p" }: { html: string; className?: string; as?: "p" | "span" | "div" }) {
  const T = as;
  return <T className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

function Encart({ etiquette, couleur, children }: { etiquette: string; couleur: string; children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-[14px] border-l-[3px] px-5 py-4" style={{ borderColor: couleur, backgroundColor: "var(--cap-surface-2)" }}>
      <p className="mb-1.5 text-[0.9rem] italic" style={{ color: couleur, fontFamily: "var(--cap-font-display)" }}>{etiquette}</p>
      <div className="cours-texte text-[1rem] leading-relaxed" style={{ color: "var(--cap-ink)" }}>{children}</div>
    </div>
  );
}

/** Un graphique qui avance d'étape en étape. Quand seule la partie visible change, le temps défile. */
export function Scenes({ titre, scenes }: { titre?: string; scenes: { legende: string; cfg: ConfigGraphique }[] }) {
  const [k, setK] = useState(0);
  const reduce = useMouvementReduit();
  const s = scenes[k];
  const cible = s.cfg.jusqua ?? s.cfg.bougies.length - 1;
  const [jusqua, setJusqua] = useState(cible);
  const prec = useRef(cible);

  useEffect(() => {
    const depart = prec.current;
    prec.current = cible;
    if (reduce || cible <= depart) { setJusqua(cible); return; }
    let raf = 0;
    const t0 = performance.now();
    const duree = Math.min(1400, 40 * (cible - depart));
    const pas = (t: number) => {
      const f = Math.min(1, (t - t0) / duree);
      setJusqua(Math.round(depart + (cible - depart) * f));
      if (f < 1) raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [cible, reduce]);

  return (
    <figure className="my-7">
      {titre && <figcaption className="mb-2 text-[1.05rem] font-semibold" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>{titre}</figcaption>}
      <div className="rounded-[14px] p-3 sm:p-4" style={{ backgroundColor: "var(--cap-surface)", boxShadow: "inset 0 0 0 1px var(--cap-line-strong)" }}>
        <GraphiqueEcole {...s.cfg} jusqua={jusqua} />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="min-w-0 flex-1 text-[1rem] leading-snug" style={{ color: "var(--cap-ink)" }} aria-live="polite">
            <span className="mr-2 italic" style={{ color: "#c98a1e", fontFamily: "var(--cap-font-display)" }}>{k + 1}/{scenes.length}</span>
            <span dangerouslySetInnerHTML={{ __html: s.legende }} />
          </p>
          <div className="flex flex-none items-center justify-end gap-1">
            <button type="button" onClick={() => setK(Math.max(0, k - 1))} disabled={k === 0} aria-label="Étape précédente"
              className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-[color:var(--cap-surface-2)] disabled:opacity-30">
              <ArrowLeft size={18} />
            </button>
            {k < scenes.length - 1 ? (
              <button type="button" onClick={() => setK(k + 1)}
                className="inline-flex h-11 items-center gap-2 rounded-[10px] px-4 text-[0.95rem] font-semibold"
                style={{ backgroundColor: "var(--cap-ink)", color: "var(--cap-on-inverse)" }}>
                <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--cap-ambre)" }} />
                Étape suivante <ArrowRight size={16} />
              </button>
            ) : (
              <button type="button" onClick={() => setK(0)}
                className="inline-flex h-11 items-center gap-2 rounded-[10px] px-4 text-[0.95rem] font-medium transition-colors hover:bg-[color:var(--cap-surface-2)]"
                style={{ color: "var(--cap-ink)", boxShadow: "inset 0 0 0 1px var(--cap-line-strong)" }}>
                <RotateCcw size={15} /> Revoir
              </button>
            )}
          </div>
        </div>
      </div>
    </figure>
  );
}

export function Blocs({ blocs }: { blocs: Bloc[] }) {
  return (
    <>
      {blocs.map((b, i) => {
        switch (b.t) {
          case "p":
            return <Html key={i} html={b.html} className="cours-texte my-4 text-[1.05rem] leading-[1.75]" />;
          case "h":
            return <h3 key={i} className="mb-2 mt-9 text-[1.35rem] font-semibold leading-tight" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>{b.texte}</h3>;
          case "liste": {
            const L = b.numerotee ? "ol" : "ul";
            return (
              <L key={i} className={`cours-texte my-4 space-y-2 pl-6 text-[1.05rem] leading-relaxed ${b.numerotee ? "list-decimal" : "list-disc"}`}>
                {b.items.map((it, j) => <li key={j} dangerouslySetInnerHTML={{ __html: it }} />)}
              </L>
            );
          }
          case "exemple":
            return <Encart key={i} etiquette={b.titre ?? "Un exemple chiffré"} couleur="var(--cap-ocean)"><Html html={b.html} as="div" /></Encart>;
          case "piege":
            return <Encart key={i} etiquette="Le piège" couleur="var(--cap-down)"><Html html={b.html} as="div" /></Encart>;
          case "nimbo":
            return (
              <div key={i} className="my-6 flex items-start gap-3">
                <Nimbo humeur={b.humeur ?? "pointe"} taille={56} label="" className="-mt-1 flex-none" />
                <p className="cours-texte rounded-[14px] px-4 py-3 text-[1rem] leading-relaxed" style={{ backgroundColor: "var(--cap-surface-2)", color: "var(--cap-ink)" }}
                  dangerouslySetInnerHTML={{ __html: b.texte }} />
              </div>
            );
          case "graphique":
            return (
              <figure key={i} className="my-7">
                <div className="rounded-[14px] p-3 sm:p-4" style={{ backgroundColor: "var(--cap-surface)", boxShadow: "inset 0 0 0 1px var(--cap-line-strong)" }}>
                  <GraphiqueEcole {...b.cfg} />
                </div>
                {b.legende && <figcaption className="mt-2 text-[0.95rem]" style={{ color: "var(--cap-ink-3)" }} dangerouslySetInnerHTML={{ __html: b.legende }} />}
              </figure>
            );
          case "scenes":
            return <Scenes key={i} titre={b.titre} scenes={b.scenes} />;
          case "outil":
            return (
              <section key={i} className="my-8 rounded-[16px] p-4 sm:p-6" style={{ backgroundColor: "var(--cap-surface)", boxShadow: "inset 0 0 0 1px var(--cap-line-strong)" }}>
                <p data-eyebrow className="mb-1">À vous</p>
                <h4 className="text-[1.2rem] font-semibold leading-tight" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>{b.titre}</h4>
                {b.consigne && <p className="mt-1.5 text-[0.98rem]" style={{ color: "var(--cap-ink-2)" }} dangerouslySetInnerHTML={{ __html: b.consigne }} />}
                <div className="mt-4">{b.el}</div>
              </section>
            );
          case "tableau":
            return (
              <figure key={i} className="my-6 overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-[0.97rem]">
                  <thead>
                    <tr>{b.entetes.map((e, j) => <th key={j} className="border-b-2 px-3 py-2 text-left font-semibold" style={{ borderColor: "var(--cap-line-strong)", color: "var(--cap-ink)" }}>{e}</th>)}</tr>
                  </thead>
                  <tbody>
                    {b.lignes.map((l, j) => (
                      <tr key={j}>{l.map((c, m) => <td key={m} className="border-b px-3 py-2.5 align-top" style={{ borderColor: "var(--cap-line)", color: "var(--cap-ink-2)" }} dangerouslySetInnerHTML={{ __html: c }} />)}</tr>
                    ))}
                  </tbody>
                </table>
                {b.legende && <figcaption className="mt-2 text-[0.92rem]" style={{ color: "var(--cap-ink-3)" }}>{b.legende}</figcaption>}
              </figure>
            );
          case "qr":
            return (
              <dl key={i} className="cap-qr my-6">
                {b.items.map((it, j) => (
                  <div key={j} className="cap-qr-item">
                    <dt>{it.q}</dt>
                    <dd dangerouslySetInnerHTML={{ __html: it.r }} />
                  </div>
                ))}
              </dl>
            );
          default:
            return null;
        }
      })}
    </>
  );
}
