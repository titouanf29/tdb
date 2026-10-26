"use client";

import { useEffect, useState } from "react";
import { marketAPI, type FiguresMesure, type StatFigure } from "@/lib/api";
import { fr } from "@/lib/SettingsContext";

/**
 * Ce que nos propres données disent d'une figure — dans le cours.
 *
 * LES CHIFFRES SONT LUS SUR LE SERVEUR, pas recopiés dans le texte de la
 * leçon. Le graphique de l'Analyse et ce cours citent ainsi exactement la
 * même mesure ; si elle est relancée demain, le cours se met à jour tout
 * seul au lieu de continuer d'affirmer l'ancien résultat.
 */

let cache: Promise<FiguresMesure> | null = null;
function charger(): Promise<FiguresMesure> {
  if (!cache) {
    cache = marketAPI.getFiguresMesure().catch((e) => { cache = null; throw e; });
  }
  return cache;
}

const NOMS: Record<string, string> = {
  double_sommet: "Double sommet", double_creux: "Double creux",
  ete: "Épaule-tête-épaule", ete_inversee: "ETE inversée",
  triangle_ascendant: "Triangle ascendant", triangle_descendant: "Triangle descendant",
  triangle_symetrique: "Triangle symétrique",
  drapeau_haussier: "Drapeau haussier", drapeau_baissier: "Drapeau baissier",
};
const HAUSSIERES = new Set(["double_creux", "ete_inversee", "triangle_ascendant", "drapeau_haussier"]);

const VERDICT: Record<StatFigure["verdict"], { mot: string; couleur: string }> = {
  favorable: { mot: "Mieux que le hasard", couleur: "var(--cap-up)" },
  defavorable: { mot: "Moins bien que le hasard", couleur: "var(--cap-down)" },
  neutre: { mot: "Pas mieux que le hasard", couleur: "var(--cap-ink-2)" },
  trop_peu: { mot: "Trop peu de cas", couleur: "var(--cap-ink-3)" },
};

const signe = (v: number | null) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fr(v, 1)}`);

function useMesure() {
  const [m, setM] = useState<FiguresMesure | null>(null);
  const [erreur, setErreur] = useState(false);
  useEffect(() => {
    let vivant = true;
    charger().then((d) => vivant && setM(d)).catch(() => vivant && setErreur(true));
    return () => { vivant = false; };
  }, []);
  return { m, erreur };
}

function Cadre({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-2 rounded-[14px] p-4" style={{ boxShadow: "inset 0 0 0 1px var(--cap-line)" }}>
      {children}
    </div>
  );
}

export function MesureFigure({ cle }: { cle: string }) {
  const { m, erreur } = useMesure();
  if (erreur) return <Cadre><p className="text-[0.85rem]" style={{ color: "var(--cap-ink-3)" }}>La mesure n&apos;a pas pu être chargée.</p></Cadre>;
  if (!m) return <Cadre><p className="text-[0.85rem]" style={{ color: "var(--cap-ink-3)" }}>Chargement de la mesure…</p></Cadre>;

  if (cle === "tableau") return <Tableau m={m} />;
  const st = m.statistiques[cle];
  if (!st) return null;

  const base = HAUSSIERES.has(cle) ? m.methode.base_hausse_20 : 100 - m.methode.base_hausse_20;
  const v = VERDICT[st.verdict];
  return (
    <Cadre>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[0.75rem] uppercase tracking-[0.14em]" style={{ color: "var(--cap-ink-3)" }}>
          Ce que disent nos données
        </span>
        <span className="rounded-[6px] px-2 py-0.5 text-[0.75rem] font-medium"
              style={{ color: v.couleur, boxShadow: "inset 0 0 0 1px var(--cap-line)" }}>
          {v.mot}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <Chiffre titre="Cas mesurés" valeur={String(st.n)} />
        <Chiffre titre="Dans le sens annoncé" valeur={`${fr(st.sens_20, 1)} %`}
                 note={`hasard : ${fr(base, 1)} %`} />
        <Chiffre titre="Écart au hasard" valeur={`${signe(st.ecart)} pt`}
                 note={`marge ±${fr(2 * st.erreur_type, 1)}`} />
        <Chiffre titre="Deux périodes" valeur={`${signe(st.ecart_A)} / ${signe(st.ecart_B)}`}
                 note="doit tenir sur les deux" />
      </dl>
      <p className="mt-3 text-[0.85rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>
        Objectif théorique atteint avant l&apos;invalidation dans <strong>{fr(st.objectif, 1)} %</strong> des
        cas ; invalidée d&apos;abord dans <strong>{fr(st.invalide, 1)} %</strong>.
      </p>
    </Cadre>
  );
}

function Chiffre({ titre, valeur, note }: { titre: string; valeur: string; note?: string }) {
  return (
    <div>
      <dt className="text-[0.75rem]" style={{ color: "var(--cap-ink-3)" }}>{titre}</dt>
      <dd className="mt-0.5 text-[1rem] font-semibold tabular-nums" style={{ color: "var(--cap-ink)" }}>{valeur}</dd>
      {note && <dd className="text-[0.75rem]" style={{ color: "var(--cap-ink-3)" }}>{note}</dd>}
    </div>
  );
}

function Tableau({ m }: { m: FiguresMesure }) {
  const lignes = Object.entries(m.statistiques).sort((a, b) => b[1].n - a[1].n);
  return (
    <Cadre>
      <p className="text-[0.75rem] uppercase tracking-[0.14em]" style={{ color: "var(--cap-ink-3)" }}>
        {m.methode.figures.toLocaleString("fr-FR")} figures · {m.methode.panel} actifs · {m.methode.annees} ans
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[30rem] text-left text-[0.84rem]">
          <thead>
            <tr style={{ color: "var(--cap-ink-3)" }}>
              {/* Le verdict juste après le nom : sur un téléphone, le tableau
                  défile, et la colonne qui répond à la question ne doit pas
                  être celle qu'il faut aller chercher. */}
              <th className="py-1.5 pr-3 font-medium">Figure</th>
              <th className="py-1.5 pr-3 font-medium">Verdict</th>
              <th className="py-1.5 pr-3 text-right font-medium">Écart au hasard</th>
              <th className="py-1.5 pr-3 text-right font-medium">Objectif atteint</th>
              <th className="py-1.5 text-right font-medium">Cas</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map(([cle, st]) => (
              <tr key={cle} className="border-t" style={{ borderColor: "var(--cap-line)" }}>
                <td className="py-1.5 pr-3" style={{ color: "var(--cap-ink)" }}>{NOMS[cle] ?? cle}</td>
                <td className="py-1.5 pr-3" style={{ color: VERDICT[st.verdict].couleur }}>{VERDICT[st.verdict].mot}</td>
                <td className="whitespace-nowrap py-1.5 pr-3 text-right tabular-nums">
                  {signe(st.ecart)} <span style={{ color: "var(--cap-ink-3)" }}>±{fr(2 * st.erreur_type, 1)}</span>
                </td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{fr(st.objectif, 1)} %</td>
                <td className="py-1.5 text-right tabular-nums">{st.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[0.8rem] leading-relaxed" style={{ color: "var(--cap-ink-3)" }}>{m.methode.note}</p>
    </Cadre>
  );
}
