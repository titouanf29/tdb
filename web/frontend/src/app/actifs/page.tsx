import type { Metadata } from "next";
import Link from "next/link";
import { listeActifs } from "@/lib/actifs-serveur";

export const metadata: Metadata = {
  title: "Analyses du jour : actions, crypto, indices, matières premières",
  description: "L'analyse du jour d'une trentaine d'actifs (LVMH, Apple, Bitcoin, CAC 40, or…), mise à jour toutes les dix minutes et expliquée simplement. Gratuit, sans compte.",
  alternates: { canonical: "/actifs" },
};

// Calculée à la demande (la liste reste en cache dix minutes) : figée à la
// compilation, elle serait vide si le serveur d'analyse n'était pas joignable
// à ce moment-là.
export const dynamic = "force-dynamic";

// L'ordre des rubriques sur la page.
const ORDRE = ["Actions françaises", "Actions américaines", "Indices", "Cryptomonnaies", "Matières premières", "Devises"];

export default async function Page() {
  const liste = await listeActifs();
  const rubriques = ORDRE.map((c) => ({ c, actifs: liste.filter((a) => a.categorie === c) })).filter((r) => r.actifs.length);

  return (
    <article className="mx-auto max-w-[46rem] py-10 sm:py-14">
      <h1 className="text-[clamp(2rem,6vw,2.9rem)] font-bold leading-[1.08] tracking-[-0.018em]" style={{ color: "var(--cap-ink)" }}>
        Les analyses du jour
      </h1>
      <p className="mt-4 text-[1.1rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>
        Pour chaque actif, la lecture du moteur de CaptenTDB sur les vrais cours : tendance, élan, volumes, support et
        résistance, expliqués simplement. Mis à jour toutes les dix minutes. Une lecture pédagogique, jamais un conseil.
      </p>

      {rubriques.length === 0 ? (
        <p className="mt-8" style={{ color: "var(--cap-ink-2)" }}>La liste est momentanément indisponible. Revenez dans quelques minutes.</p>
      ) : rubriques.map((r) => (
        <section key={r.c} className="mt-10" aria-labelledby={`r-${r.c}`}>
          <h2 id={`r-${r.c}`} className="text-[1.3rem] font-bold" style={{ color: "var(--cap-ink)" }}>{r.c}</h2>
          <ul className="mt-2 grid gap-x-6 sm:grid-cols-2">
            {r.actifs.map((a) => (
              <li key={a.id}>
                <Link href={`/actif/${a.id}`} className="flex min-h-[48px] items-center justify-between gap-3 border-b text-[1.02rem]"
                  style={{ borderColor: "var(--cap-line)", color: "var(--cap-ink)" }}>
                  <span>{a.nom}</span>
                  <span className="text-[0.88rem]" style={{ color: "var(--cap-ink-3)" }}>{a.symbole}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="mt-10 text-[0.9rem] leading-relaxed" style={{ color: "var(--cap-ink-3)" }}>
        Contenu pédagogique, pas un conseil en investissement. Investir comporte un risque de perte en capital.
      </p>
    </article>
  );
}
