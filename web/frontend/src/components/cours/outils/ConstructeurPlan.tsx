"use client";

import { useState } from "react";
import { BoutonInd, LectureInd, LienInd, nf, transitionInd, useCalmeInd } from "./ElementsIndicateurs";

/**
 * Le constructeur de plan : six questions, des exemples à choisir ou votre
 * propre texte. Le plan s'écrit au fur et à mesure, avec la checklist à
 * relire avant chaque position. On le copie ou on l'imprime : rien n'est
 * enregistré.
 */
type Q = { id: string; titre: string; aide: string; exemples: string[] };

const QUESTIONS: Q[] = [
  { id: "quoi", titre: "Sur quoi, et quand ?", aide: "Un ou deux marchés, des heures fixes. Pas tout, tout le temps.",
    exemples: ["L'euro-dollar (EUR/USD), de 14 h à 17 h, heure de Paris", "L'or (XAU/USD), de 9 h à 12 h, heure de Paris", "Le DAX, de 9 h à 11 h, heure de Paris"] },
  { id: "setup", titre: "Mon setup : la situation qui me fait entrer", aide: "Précise au point qu'un autre pourrait la reconnaître.",
    exemples: ["Le prix revient sur un support, et une bougie le rejette (longue mèche basse)", "Le prix casse une résistance, revient dessus, et repart (pullback, leçon 31)", "En tendance haussière, le prix revient sur sa moyenne 20 et rebondit"] },
  { id: "stop", titre: "Mon stop : là où mon idée devient fausse", aide: "Un endroit sur le graphique, pas un montant.",
    exemples: ["Juste sous le support, sous la mèche de rejet", "Juste sous l'ancienne résistance devenue support", "Sous le dernier creux"] },
  { id: "risque", titre: "Combien je risque", aide: "Le montant perdu si le stop est touché. 1 % du compte au plus.", exemples: [] },
  { id: "sortie", titre: "Où je sors avec un gain", aide: "Votre take profit, décidé avant d'entrer.",
    exemples: ["Sur le dernier sommet", "Sur la prochaine résistance", "À deux fois mon risque"] },
  { id: "jamais", titre: "Ce que je ne fais jamais", aide: "Les erreurs qui coûtent cher, interdites d'avance.",
    exemples: ["Entrer juste avant une annonce forte (leçon 13)", "Reculer mon stop", "Rentrer tout de suite pour me refaire après une perte", "Entrer le vendredi soir"] },
];

const champ = "w-full rounded-[10px] px-3 py-2.5 text-[1rem] outline-none focus:ring-2";
const styleChamp = { backgroundColor: "var(--cap-surface)", color: "var(--cap-ink)", boxShadow: "inset 0 0 0 1px var(--cap-line-strong)", ["--tw-ring-color" as string]: "var(--cap-ambre)" };

export function ConstructeurPlan() {
  const [rep, setRep] = useState<Record<string, string>>({});
  const [jamais, setJamais] = useState<string[]>([]);
  const [compte, setCompte] = useState(2000);
  const [pct, setPct] = useState(1);
  const [message, setMessage] = useState("");
  const calme = useCalmeInd();

  const montant = (compte * pct) / 100;
  const risqueTexte = `${nf(pct, pct % 1 ? 1 : 0)} % du compte au plus : ${nf(montant, montant % 1 ? 2 : 0)} $ sur ${nf(compte)} $`;
  const reponses: Record<string, string> = { ...rep, risque: risqueTexte, jamais: [...jamais, ...(rep.jamais ? [rep.jamais] : [])].join(" ; ") };
  const remplies = QUESTIONS.filter((q) => (reponses[q.id] ?? "").trim()).length;

  const texte = [
    "MON PLAN DE TRADING",
    "",
    ...QUESTIONS.map((q, i) => `${i + 1}. ${q.titre}\n   ${(reponses[q.id] ?? "").trim() || "(à écrire)"}`),
    "",
    "AVANT CHAQUE POSITION (trois oui, ou je n'entre pas)",
    `[ ] Le bon marché, à la bonne heure : ${reponses.quoi?.trim() || "(à écrire)"}`,
    `[ ] Mon setup est là : ${reponses.setup?.trim() || "(à écrire)"}`,
    `[ ] Mon stop est posé (${reponses.stop?.trim() || "à écrire"}) et ma taille risque ${nf(montant, montant % 1 ? 2 : 0)} $ au plus`,
    `Et jamais : ${reponses.jamais?.trim() || "(à écrire)"}`,
    "",
    "Je ne change pas ce plan en position. Je le corrige à froid, le week-end.",
  ].join("\n");

  const copier = async () => {
    try { await navigator.clipboard.writeText(texte); setMessage("Plan copié : collez-le dans vos notes."); }
    catch { setMessage("La copie n'a pas marché : sélectionnez le texte du plan à la main."); }
  };
  const imprimer = () => {
    const f = document.createElement("iframe");
    f.style.position = "fixed"; f.style.width = "0"; f.style.height = "0"; f.style.border = "0";
    document.body.appendChild(f);
    const d = f.contentDocument;
    if (!d || !f.contentWindow) { f.remove(); return; }
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    d.open();
    d.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Mon plan de trading</title><style>body{font:15px/1.6 Georgia,serif;margin:2.5cm;color:#111}pre{white-space:pre-wrap;font:inherit}</style></head><body><pre>${esc(texte)}</pre></body></html>`);
    d.close();
    f.contentWindow.focus();
    f.contentWindow.print();
    setTimeout(() => f.remove(), 1000);
  };

  return (
    <div className="grid gap-6">
      <ol className="space-y-5">
        {QUESTIONS.map((q, i) => (
          <li key={q.id}>
            <p className="text-[1.02rem] font-semibold" style={{ color: "var(--cap-ink)" }}>
              <span className="mr-1.5 italic font-medium" style={{ color: "var(--cap-amber-ink)", fontFamily: "var(--cap-font-display)" }}>{i + 1}.</span>{q.titre}
            </p>
            <p className="mb-1.5 text-[0.9rem]" style={{ color: "var(--cap-ink-3)" }}>{q.aide}</p>
            {q.id === "risque" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="cp-compte" className="mb-1 block text-[0.9rem]" style={{ color: "var(--cap-ink-2)" }}>Mon compte ($)</label>
                  <input id="cp-compte" inputMode="numeric" className={champ} style={styleChamp} value={compte}
                    onChange={(e) => setCompte(Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0))} />
                </div>
                <div>
                  <span className="mb-1 block text-[0.9rem]" style={{ color: "var(--cap-ink-2)" }}>Risque par position</span>
                  <div role="radiogroup" aria-label="Risque par position" className="flex gap-1">
                    {[0.5, 1].map((v) => (
                      <button key={v} type="button" role="radio" aria-checked={pct === v} onClick={() => setPct(v)}
                        className="relative min-h-11 rounded-[8px] px-3 text-[0.95rem] transition-colors hover:bg-[color:var(--cap-surface-2)]"
                        style={{ color: pct === v ? "var(--cap-ink)" : "var(--cap-ink-2)", fontWeight: pct === v ? 650 : 500 }}>
                        {nf(v, v % 1 ? 1 : 0)} %
                        <span aria-hidden className="absolute bottom-1 left-3 right-3 h-[2px] rounded-full" style={{ backgroundColor: "var(--cap-ambre)", opacity: pct === v ? 1 : 0 }} />
                      </button>
                    ))}
                  </div>
                </div>
                <p className="col-span-2 text-[0.95rem] tabular-nums" style={{ color: "var(--cap-ink-2)" }} aria-live="polite">
                  Si le stop est touché, je perds <b style={{ color: "var(--cap-ink)" }}>{nf(montant, montant % 1 ? 2 : 0)} $</b>. La taille se calcule à partir de ce montant (leçon 19).
                </p>
              </div>
            ) : (
              <>
                <div className="mb-1.5 flex flex-col items-start">
                  {q.exemples.map((ex) => {
                    const choisi = q.id === "jamais" ? jamais.includes(ex) : rep[q.id] === ex;
                    return (
                      <button key={ex} type="button" aria-pressed={choisi}
                        onClick={() => q.id === "jamais"
                          ? setJamais((j) => (j.includes(ex) ? j.filter((x) => x !== ex) : [...j, ex]))
                          : setRep((r) => ({ ...r, [q.id]: r[q.id] === ex ? "" : ex }))}
                        className="inline-flex min-h-11 items-start gap-2 rounded-[8px] px-2.5 py-2 text-left text-[0.93rem] leading-snug transition-colors hover:bg-[color:var(--cap-surface-2)]"
                        style={{ color: choisi ? "var(--cap-ink)" : "var(--cap-ink-2)", fontWeight: choisi ? 650 : 500 }}>
                        <span aria-hidden className={`mt-[3px] h-3.5 w-3.5 flex-none ${q.id === "jamais" ? "rounded-[3px]" : "rounded-full"}`}
                          style={{ boxShadow: choisi ? "inset 0 0 0 4px var(--cap-ambre)" : "inset 0 0 0 1.5px var(--cap-ink-3)", transition: transitionInd(calme, "box-shadow", 180) }} />
                        {ex}
                      </button>
                    );
                  })}
                </div>
                <label htmlFor={`cp-${q.id}`} className="sr-only">{q.titre}, en vos mots</label>
                <input id={`cp-${q.id}`} className={champ} style={styleChamp}
                  placeholder={q.id === "jamais" ? "Une autre règle, en vos mots" : "Ou en vos mots"}
                  value={q.id === "jamais" ? rep.jamais ?? "" : q.exemples.includes(rep[q.id] ?? "") ? "" : rep[q.id] ?? ""}
                  onChange={(e) => setRep((r) => ({ ...r, [q.id]: e.target.value }))} />
              </>
            )}
          </li>
        ))}
      </ol>

      <div>
        <div className="rounded-[14px] px-5 py-4" style={{ backgroundColor: "var(--cap-surface-2)" }}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[1.15rem] font-semibold" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>Mon plan de trading</p>
            <p className="text-[0.88rem] tabular-nums" style={{ color: "var(--cap-ink-3)" }}>{remplies} / 6</p>
          </div>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--cap-line)" }} aria-hidden>
            <div className="h-full rounded-full" style={{ width: `${(remplies / 6) * 100}%`, backgroundColor: "var(--cap-ambre)", transition: transitionInd(calme, "width", 400) }} />
          </div>
          <ol className="mt-3 space-y-2 text-[0.95rem]">
            {QUESTIONS.map((q, i) => {
              const v = (reponses[q.id] ?? "").trim();
              return (
                <li key={q.id} style={{ color: v ? "var(--cap-ink)" : "var(--cap-ink-3)", opacity: v ? 1 : 0.8, transition: transitionInd(calme, "opacity", 300) }}>
                  <span className="italic" style={{ color: "var(--cap-amber-ink)", fontFamily: "var(--cap-font-display)" }}>{i + 1}. </span>
                  <span style={{ color: "var(--cap-ink-2)" }}>{q.titre} </span>
                  <br /><span className="font-medium">{v || "à écrire"}</span>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-[0.95rem] font-semibold" style={{ color: "var(--cap-ink)" }}>Avant chaque position : trois oui, ou je n'entre pas</p>
          <ul className="mt-1.5 space-y-1.5 text-[0.93rem]" style={{ color: "var(--cap-ink-2)" }}>
            {[
              `Le bon marché, à la bonne heure ?`,
              `Mon setup est là ?`,
              `Mon stop est posé, ma taille risque ${nf(montant, montant % 1 ? 2 : 0)} $ au plus ?`,
            ].map((c) => (
              <li key={c} className="flex items-start gap-2">
                <span aria-hidden className="mt-1 h-3.5 w-3.5 flex-none rounded-[3px]" style={{ boxShadow: "inset 0 0 0 1.5px var(--cap-ink-3)" }} />
                {c}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <BoutonInd onClick={copier}>Copier le plan</BoutonInd>
            <LienInd onClick={imprimer}>Imprimer</LienInd>
          </div>
          {message && <p className="mt-2 text-[0.9rem]" aria-live="polite" style={{ color: "var(--cap-ink-2)" }}>{message}</p>}
          <p className="mt-2 text-[0.85rem]" style={{ color: "var(--cap-ink-3)" }}>Rien n'est enregistré sur le site : copiez-le ou imprimez-le.</p>
        </div>
        {remplies === 6 && (
          <div className="mt-3">
            <LectureInd ton="juste"><p>Six réponses : votre plan existe. Essayez-le en démo (leçon 23), notez chaque position dans votre journal, et relisez-le chaque semaine.</p></LectureInd>
          </div>
        )}
      </div>
    </div>
  );
}
