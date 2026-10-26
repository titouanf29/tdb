"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

/**
 * La porte de chaque page d'actif : passer de la lecture à la pratique. Un
 * visiteur crée son compte, quelqu'un de connecté ouvre l'analyse complète
 * du même actif (horizon, plan, stop et objectif).
 */
export function AppelActif({ symbole, nom }: { symbole: string; nom: string }) {
  const { isAuthenticated } = useAuth();
  const analyse = `/analysis?symbol=${encodeURIComponent(symbole)}`;
  return (
    <section className="mt-12 rounded-[16px] px-5 py-6 sm:px-7" style={{ backgroundColor: "var(--cap-navy)", color: "#E8EDF1" }}
      aria-labelledby="appel-titre">
      <h2 id="appel-titre" className="text-[1.4rem] font-bold">
        {isAuthenticated ? `L'analyse complète de ${nom}` : `Entraînez-vous sur ${nom}, sans risquer un euro`}
      </h2>
      <p className="mt-2 max-w-[38rem] text-[1rem] leading-relaxed" style={{ color: "rgba(232,237,241,0.82)" }}>
        {isAuthenticated
          ? "Votre horizon, votre risque, le plan de Nimbo avec son stop et son objectif, et le graphique commenté."
          : "10 000 € fictifs, les vrais cours, et Nimbo pour vous expliquer chaque décision : l'analyse complète, le plan, le stop et l'objectif. Gratuit, sans carte bancaire."}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Link href={isAuthenticated ? analyse : "/register"}
          className="inline-flex h-11 items-center gap-2.5 rounded-[12px] px-5 text-[0.98rem] font-semibold"
          style={{ backgroundColor: "#F6F2EA", color: "var(--cap-navy)" }}>
          <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--cap-ambre)" }} />
          {isAuthenticated ? `Ouvrir l'analyse de ${nom}` : "Créer mon compte gratuit"}
          <ArrowRight size={16} aria-hidden style={{ color: "#b57610" }} />
        </Link>
        {!isAuthenticated && (
          <Link href="/cours" className="text-[0.95rem] underline decoration-[color:var(--cap-ambre)] underline-offset-[5px]">
            Apprendre d&apos;abord, avec les leçons gratuites
          </Link>
        )}
      </div>
    </section>
  );
}
