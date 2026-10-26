"use client";

import { useState } from "react";
import Link from "next/link";
import { Share2 } from "lucide-react";
import { Button, FormError } from "@/components/design-system";
import { communityAPI } from "@/lib/api";

/**
 * « Partager dans la Communauté » : une carte (l'actif, l'avis de Nimbo, le
 * score, un lien vers l'analyse) et, si on veut, une phrase. Un message qui
 * part d'une analyse a un sujet ; c'est ce qui manquait au fil pour vivre.
 */
export function PartagerAnalyse({ symbol, nom, verdict, score }: {
  symbol: string; nom: string; verdict: string; score: number | null;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  const [fait, setFait] = useState(false);

  const publier = async (e: React.FormEvent) => {
    e.preventDefault();
    setOccupe(true); setErreur("");
    try {
      await communityAPI.partager({ symbol, nom, verdict, score, commentaire: texte.trim() });
      setFait(true); setTexte("");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Le partage a échoué. Réessayez dans un instant.");
    } finally { setOccupe(false); }
  };

  if (fait) {
    return (
      <p className="mt-3 text-[0.9rem]" role="status" style={{ color: "var(--cap-ink-2)" }}>
        Publié dans la Communauté. <Link href="/community" className="cap-lien">Voir le fil</Link>
      </p>
    );
  }

  return (
    <div className="mt-2">
      <button type="button" onClick={() => setOuvert((v) => !v)} aria-expanded={ouvert}
        className="inline-flex min-h-[44px] items-center gap-2 text-[0.95rem] font-medium underline decoration-[color:var(--cap-ambre)] decoration-2 underline-offset-[6px]"
        style={{ color: "var(--cap-ink)" }}>
        <Share2 className="h-4 w-4" aria-hidden style={{ color: "var(--cap-ocean)" }} />
        Partager dans la Communauté
      </button>
      {ouvert && (
        <form onSubmit={publier} className="mt-2 flex flex-col gap-2.5" noValidate>
          <label className="flex flex-col gap-1 text-[0.85rem]" style={{ color: "var(--cap-ink-2)" }}>
            Votre avis (facultatif)
            <textarea id={`partage-${symbol}`} value={texte} onChange={(e) => setTexte(e.target.value)} rows={2} maxLength={500}
              placeholder={`Ce que vous pensez de ${nom}, ce que vous attendez…`}
              className="w-full resize-y rounded-[10px] px-3 py-2.5 text-[0.95rem] outline-none focus:shadow-[inset_0_0_0_2px_var(--cap-ocean)]"
              style={{ backgroundColor: "var(--cap-bg)", color: "var(--cap-ink)", boxShadow: "inset 0 0 0 1px var(--cap-line-strong)" }} />
          </label>
          <p className="text-[0.8rem]" style={{ color: "var(--cap-ink-3)" }}>
            La carte montre {nom}, « {verdict} »{score != null ? `, le score de ${score} sur 100` : ""} et un lien vers l&apos;analyse. Votre pseudo est affiché.
          </p>
          {erreur && <FormError>{erreur}</FormError>}
          <div><Button type="submit" size="md" disabled={occupe}>{occupe ? "Publication…" : "Publier"}</Button></div>
        </form>
      )}
    </div>
  );
}
