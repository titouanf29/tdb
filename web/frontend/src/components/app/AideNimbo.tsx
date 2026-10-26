"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Send, X } from "lucide-react";
import { Nimbo, EASE, useMouvementReduit } from "@/components/design-system";
import { AIDE, chercher, suggestions, type ActionAide, type ReponseAide } from "@/lib/aide";
import { aideAPI } from "@/lib/api";
import { lancerVisite } from "@/lib/visite";

/**
 * Nimbo, en bas à droite : l'aide du site.
 *
 * Un clic, et on lui pose une question sur le site (« Comment contacter
 * l'équipe ? », « Comment analyser un actif ? »). Il répond en deux phrases
 * et propose d'y aller, ou de le montrer avec la visite guidée. Les questions
 * proposées changent selon la page. Pour une question sur les marchés ou sur
 * ses données, il renvoie vers l'Assistant ; s'il ne sait pas, il le dit et
 * propose d'écrire à l'équipe.
 *
 * Les réponses sont écrites (lib/aide.ts) : rien ne part sur le réseau, la
 * réponse est immédiate et ne peut pas inventer un écran qui n'existe pas.
 */

type Bulle =
  | { de: "moi"; texte: string }
  | { de: "nimbo"; reponse: ReponseAide }
  | { de: "nimbo"; ia: { texte: string; actions: ActionAide[] } }
  | { de: "nimbo"; attente: true }
  | { de: "nimbo"; inconnu: true; question: string };

/** Le texte d'une bulle, pour donner l'historique à l'IA. */
function texteDe(b: Bulle): string | null {
  if (b.de === "moi") return b.texte;
  if ("reponse" in b) return b.reponse.reponse.join(" ");
  if ("ia" in b) return b.ia.texte;
  return null;
}

const CLE_VUE = "tdb_aide_nimbo_vue";

export function AideNimbo() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const reduit = useMouvementReduit();
  const [ouvert, setOuvert] = useState(false);
  const [fil, setFil] = useState<Bulle[]>([]);
  const [saisie, setSaisie] = useState("");
  const [indice, setIndice] = useState(false);
  const fin = useRef<HTMLDivElement>(null);
  const champ = useRef<HTMLInputElement>(null);

  // Une seule fois : une petite bulle signale que Nimbo répond aux questions.
  useEffect(() => {
    let vu = true;
    try { vu = localStorage.getItem(CLE_VUE) === "1"; } catch { /* navigation privée */ }
    if (vu) return;
    const t = setTimeout(() => setIndice(true), 6000);
    const t2 = setTimeout(() => setIndice(false), 16000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (!ouvert) return;
    setIndice(false);
    try { localStorage.setItem(CLE_VUE, "1"); } catch { /* navigation privée */ }
    setTimeout(() => champ.current?.focus({ preventScroll: true }), 120);
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(false); };
    window.addEventListener("keydown", echap);
    return () => window.removeEventListener("keydown", echap);
  }, [ouvert]);

  useEffect(() => { fin.current?.scrollIntoView({ block: "end", behavior: reduit ? "auto" : "smooth" }); }, [fil, reduit]);

  // Changer de page referme le panneau : la réponse a mené où il fallait.
  useEffect(() => { setOuvert(false); }, [pathname]);

  const [enCours, setEnCours] = useState(false);

  /**
   * Une question proposée a sa réponse écrite, immédiate. Une question tapée
   * part à l'IA, qui la lit avec le guide du site, la page et les derniers
   * échanges (backend routes/aide.py). Si l'IA ne répond pas, Nimbo revient
   * aux réponses écrites, rapprochées par mots-clés.
   */
  const demander = async (texte: string, connue?: ReponseAide) => {
    const q = texte.trim();
    if (!q || enCours) return;
    setSaisie("");
    if (connue) {
      setFil((f) => [...f, { de: "moi", texte: q }, { de: "nimbo", reponse: connue }]);
      return;
    }
    const historique = fil.map((b) => ({ role: b.de, texte: texteDe(b) }))
      .filter((h): h is { role: "moi" | "nimbo"; texte: string } => !!h.texte).slice(-6);
    setFil((f) => [...f, { de: "moi", texte: q }, { de: "nimbo", attente: true }]);
    setEnCours(true);
    let bulle: Bulle;
    try {
      const r = await aideAPI.question(q, pathname, historique);
      if (r.reponse) {
        const actions: ActionAide[] = r.destinations.map((d) =>
          d.visite ? { libelle: d.libelle, visite: d.visite } : { libelle: d.libelle, lien: d.lien || "/dashboard" });
        bulle = { de: "nimbo", ia: { texte: r.reponse, actions } };
      } else {
        const loc = chercher(q);
        bulle = loc ? { de: "nimbo", reponse: loc } : { de: "nimbo", inconnu: true, question: q };
      }
    } catch {
      const loc = chercher(q);
      bulle = loc ? { de: "nimbo", reponse: loc } : { de: "nimbo", inconnu: true, question: q };
    } finally {
      setEnCours(false);
    }
    setFil((f) => [...f.filter((b) => !("attente" in b)), bulle]);
  };

  const agir = (a: ActionAide) => {
    setOuvert(false);
    if ("visite" in a) setTimeout(() => lancerVisite(a.visite), 300);
    else router.push(a.lien);
  };

  // Sur téléphone, ces pages ont leur propre zone de saisie en bas d'écran :
  // le bouton recouvrirait « Envoyer ». Il y reste sur ordinateur.
  const saisieEnBas = ["/community", "/support", "/assistant"].some((p) => pathname.startsWith(p));
  const proposees = suggestions(pathname);
  const dejaPosees = new Set(fil.filter((b): b is { de: "nimbo"; reponse: ReponseAide } => "reponse" in b).map((b) => b.reponse.id));
  const ensuite = [...proposees, ...AIDE].filter((a, i, l) => !dejaPosees.has(a.id) && l.findIndex((x) => x.id === a.id) === i).slice(0, 3);

  return (
    <>
      {/* Le bouton : Nimbo lui-même, au-dessus de la barre du bas sur téléphone. */}
      <div className={`fixed bottom-[calc(4.6rem+env(safe-area-inset-bottom,0px))] right-4 z-40 flex-col items-end gap-2 lg:bottom-6 lg:right-6 ${saisieEnBas ? "hidden lg:flex" : "flex"}`}
        data-aide-nimbo>
        <AnimatePresence>
          {indice && !ouvert && (
            <motion.button type="button" onClick={() => setOuvert(true)}
              initial={reduit ? false : { opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduit ? undefined : { opacity: 0, y: 4 }} transition={{ duration: 0.35, ease: EASE }}
              className="rounded-[14px] px-3.5 py-2 text-left text-[0.88rem]"
              style={{ backgroundColor: "var(--cap-surface)", color: "var(--cap-ink)", boxShadow: "inset 0 0 0 1px var(--cap-line), 0 10px 30px rgba(11,23,38,0.16)" }}>
              Une question sur le site ? Je vous réponds.
            </motion.button>
          )}
        </AnimatePresence>
        <button type="button" onClick={() => setOuvert((v) => !v)} aria-expanded={ouvert} aria-controls="aide-nimbo"
          aria-label={ouvert ? "Fermer l'aide" : "Poser une question à Nimbo sur le site"}
          className="flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:scale-105"
          style={{ backgroundColor: "var(--cap-surface)", boxShadow: "inset 0 0 0 1px var(--cap-line), 0 10px 28px rgba(11,23,38,0.18)" }}>
          {ouvert ? <X className="h-5 w-5" style={{ color: "var(--cap-ink-2)" }} /> : <Nimbo humeur="salue" taille={44} label="" />}
        </button>
      </div>

      <AnimatePresence>
        {ouvert && (
          <motion.section
            id="aide-nimbo"
            role="dialog"
            aria-label="Aide du site"
            initial={reduit ? false : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduit ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="cap fixed inset-x-3 bottom-[calc(9rem+env(safe-area-inset-bottom,0px))] z-[55] flex max-h-[min(34rem,calc(100dvh-11rem))] flex-col overflow-hidden rounded-[18px] sm:inset-x-auto sm:right-6 sm:w-[23rem] lg:bottom-24"
            style={{ backgroundColor: "var(--cap-surface)",
              boxShadow: "inset 0 0 0 1px var(--cap-line), 0 20px 50px rgba(11,23,38,0.25)" }}
          >
            <header className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: "var(--cap-line)" }}>
              <Nimbo humeur="content" taille={36} label="" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[1rem] font-semibold leading-tight" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
                  Une question sur le site ?
                </p>
                <p className="text-[0.78rem]" style={{ color: "var(--cap-ink-3)" }}>Je vous dis où aller, et je peux vous le montrer.</p>
              </div>
              <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-[color:var(--cap-surface-2)]" style={{ color: "var(--cap-ink-3)" }}>
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
              <BulleNimbo>Bonjour. Posez-moi votre question sur le site, avec vos mots, ou choisissez-en une.</BulleNimbo>
              {fil.length === 0 && <Puces liste={proposees} onChoisir={(r) => demander(r.question, r)} />}

              {fil.map((b, i) => b.de === "moi" ? (
                <p key={i} className="ml-auto w-fit max-w-[85%] rounded-[14px] rounded-br-[4px] px-3.5 py-2 text-[0.9rem]"
                  style={{ backgroundColor: "var(--cap-navy)", color: "#F2F5F7" }}>{b.texte}</p>
              ) : "attente" in b ? (
                <BulleNimbo key={i}>
                  <span className="inline-flex items-center gap-1.5" aria-label="Nimbo réfléchit">
                    {[0, 1, 2].map((k) => (
                      <motion.span key={k} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--cap-ink-3)" }}
                        animate={reduit ? undefined : { opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.1, repeat: Infinity, delay: k * 0.18 }} />
                    ))}
                  </span>
                </BulleNimbo>
              ) : "ia" in b ? (
                <div key={i} className="space-y-2">
                  <BulleNimbo>{b.ia.texte.split(/\n+/).map((p, k) => <p key={k} className={k ? "mt-2" : ""}>{p}</p>)}</BulleNimbo>
                  {b.ia.actions.length > 0 && <Actions liste={b.ia.actions} onAgir={agir} />}
                </div>
              ) : "reponse" in b ? (
                <div key={i} className="space-y-2">
                  <BulleNimbo>{b.reponse.reponse.map((p, k) => <p key={k} className={k ? "mt-2" : ""}>{p}</p>)}</BulleNimbo>
                  <Actions liste={b.reponse.actions} onAgir={agir} />
                </div>
              ) : (
                <div key={i} className="space-y-2">
                  <BulleNimbo>
                    <p>Je n&apos;ai pas de réponse toute prête à cette question.</p>
                    <p className="mt-2">Pour une question sur les marchés ou sur vos positions, l&apos;Assistant est fait pour ça. Pour un souci sur le site, l&apos;équipe vous répond.</p>
                  </BulleNimbo>
                  <Actions liste={[{ libelle: "Demander à l'Assistant", lien: "/assistant" }, { libelle: "Écrire à l'équipe", lien: "/support?nouveau=1" }]} onAgir={agir} />
                </div>
              ))}

              {fil.length > 0 && ensuite.length > 0 && (
                <div className="pt-1">
                  <p className="mb-1.5 text-[0.78rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>D&apos;autres questions</p>
                  <Puces liste={ensuite} onChoisir={(r) => demander(r.question, r)} />
                </div>
              )}
              <div ref={fin} />
            </div>

            <form onSubmit={(e) => { e.preventDefault(); demander(saisie); }}
              className="flex items-center gap-2 border-t px-3 py-2.5" style={{ borderColor: "var(--cap-line)" }}>
              <label htmlFor="aide-question" className="sr-only">Votre question</label>
              <input ref={champ} id="aide-question" value={saisie} onChange={(e) => setSaisie(e.target.value)} maxLength={200}
                placeholder="Par exemple : comment je ferme une position ?"
                className="h-10 min-w-0 flex-1 rounded-[10px] px-3 text-[0.92rem] outline-none focus:shadow-[inset_0_0_0_2px_var(--cap-ocean)]"
                style={{ backgroundColor: "var(--cap-bg)", color: "var(--cap-ink)", boxShadow: "inset 0 0 0 1px var(--cap-line-strong)" }} />
              <button type="submit" disabled={!saisie.trim() || enCours} aria-label="Demander"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] disabled:opacity-30"
                style={{ backgroundColor: "var(--cap-navy)", color: "#F2F5F7" }}>
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}

function BulleNimbo({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-fit max-w-[92%] rounded-[14px] rounded-bl-[4px] px-3.5 py-2.5 text-[0.9rem] leading-relaxed"
      style={{ backgroundColor: "var(--cap-surface-2)", color: "var(--cap-ink)" }}>
      {children}
    </div>
  );
}

function Puces({ liste, onChoisir }: { liste: ReponseAide[]; onChoisir: (r: ReponseAide) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {liste.map((r) => (
        <button key={r.id} type="button" onClick={() => onChoisir(r)}
          className="rounded-[10px] px-3 py-1.5 text-left text-[0.84rem] transition-colors hover:bg-[color:var(--cap-surface-2)]"
          style={{ color: "var(--cap-ink)", boxShadow: "inset 0 0 0 1px var(--cap-line-strong)" }}>
          {r.question}
        </button>
      ))}
    </div>
  );
}

function Actions({ liste, onAgir }: { liste: ActionAide[]; onAgir: (a: ActionAide) => void }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 pl-1">
      {liste.map((a) => (
        <button key={a.libelle} type="button" onClick={() => onAgir(a)}
          className="inline-flex min-h-[36px] items-center gap-1.5 text-[0.88rem] font-medium underline decoration-[color:var(--cap-ambre)] decoration-2 underline-offset-[5px]"
          style={{ color: "var(--cap-ink)" }}>
          {a.libelle} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      ))}
    </div>
  );
}
