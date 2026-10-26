"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { fmt, type Bougie } from "@/lib/cours/marche";
import { GraphiqueEcole, type Niveau } from "../GraphiqueEcole";

/**
 * Tracer soi-même : on clique sur le graphique pour poser un niveau (un
 * support, une résistance), puis on compare avec la correction. On apprend
 * plus en se trompant une fois qu'en lisant trois fois la bonne réponse.
 */
export function TraceNiveau({ bougies, solutions, max = 2, expliquer }: {
  bougies: Bougie[];
  solutions: { prix: number; tolerance: number; label: string }[];
  max?: number;
  /** Le mot de la correction. */
  expliquer: string;
}) {
  const [poses, setPoses] = useState<number[]>([]);
  const [verifie, setVerifie] = useState(false);

  const trouves = solutions.map((s) => poses.some((p) => Math.abs(p - s.prix) <= s.tolerance));
  const justes = trouves.filter(Boolean).length;
  const niveaux: Niveau[] = [
    ...poses.map((p, i) => ({ prix: p, label: `Votre niveau ${i + 1}`, couleur: "var(--cap-ink)", pointille: false, epaisseur: 2 })),
    ...(verifie ? solutions.map((s) => ({ prix: s.prix, zone: s.tolerance * 2, label: s.label, couleur: "var(--cap-up)" })) : []),
  ];

  return (
    <div>
      <GraphiqueEcole bougies={bougies} niveaux={niveaux} sansSurvol
        onClic={verifie ? undefined : (prix) => setPoses((ps) => (ps.length >= max ? [...ps.slice(1), prix] : [...ps, prix]))}
        ariaLabel="Graphique d'exercice : cliquez pour poser un niveau" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1 text-[0.98rem]" style={{ color: "var(--cap-ink-2)" }} aria-live="polite">
          {!verifie
            ? poses.length === 0
              ? "Cliquez sur le graphique, à la hauteur où vous voyez le niveau."
              : `Niveau posé à ${poses.map((p) => fmt(p)).join(" et ")}. Cliquez ailleurs pour le déplacer.`
            : justes === solutions.length
              ? `Bien vu : ${justes === 1 ? "votre niveau tombe" : "vos niveaux tombent"} dans la zone. ${expliquer}`
              : `${justes} sur ${solutions.length}. La zone juste est en vert. ${expliquer}`}
        </p>
        <div className="flex items-center gap-2">
          {(poses.length > 0 || verifie) && (
            <button type="button" onClick={() => { setPoses([]); setVerifie(false); }} aria-label="Recommencer"
              className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-[color:var(--cap-surface-2)]">
              <RotateCcw size={17} />
            </button>
          )}
          {!verifie && (
            <button type="button" disabled={poses.length === 0} onClick={() => setVerifie(true)}
              className="inline-flex h-11 items-center gap-2 rounded-[10px] px-4 text-[0.95rem] font-semibold disabled:opacity-40"
              style={{ backgroundColor: "var(--cap-ink)", color: "var(--cap-on-inverse)" }}>
              <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--cap-ambre)" }} />
              Voir la correction
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
