"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/design-system";
import { ListeSuggestions, useAssetSuggestions } from "@/components/app/assetSearch";

/**
 * La question du site, en grand, en haut de l'espace.
 *
 * Analyser un actif est le geste principal de CaptenTDB ; il était rangé dans
 * un menu et dans une tuile parmi cinq. Ici, il est la première chose qu'on
 * voit en arrivant : on tape un nom, la liste propose, l'analyse s'ouvre.
 * Juste dessous, les actifs suivis (ou quatre exemples), en un clic.
 */
const EXEMPLES: [string, string][] = [["Apple", "AAPL"], ["Bitcoin", "BTC-USD"], ["LVMH", "MC.PA"], ["L'or", "GC=F"]];

export function RechercheActif({ favoris }: Readonly<{ favoris: { symbol: string; name?: string | null }[] }>) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const s = useAssetSuggestions(q);
  const aller = (sym: string) => router.push(`/analysis?symbol=${encodeURIComponent(sym)}`);
  const raccourcis: [string, string][] = favoris.length
    ? favoris.slice(0, 5).map((f) => [f.name || f.symbol, f.symbol])
    : EXEMPLES;

  return (
    <section data-panneau="surface" className="relative z-10 p-6 sm:p-8" aria-labelledby="recherche-actif">
      <label id="recherche-actif" htmlFor="recherche-actif-champ" className="block text-[1.15rem] font-semibold sm:text-[1.3rem]" style={{ color: "var(--cap-ink)" }}>
        Quel actif voulez-vous comprendre&nbsp;?
      </label>
      <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); if (s.choisi) aller(s.choisi.symbol); }} onKeyDown={s.touche}>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-0 top-1/2 h-6 w-6 -translate-y-1/2" style={{ color: "var(--cap-ink-3)" }} aria-hidden />
          <input id="recherche-actif-champ" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off"
            placeholder="Apple, bitcoin, LVMH, l'or…"
            className="h-16 w-full bg-transparent pl-9 text-[1.45rem] outline-none transition-[border-color] sm:text-[1.7rem]"
            style={{ color: "var(--cap-ink)", borderBottom: "2px solid var(--cap-ambre)" }} />
          {s.ouvert && (
            <ListeSuggestions hits={s.hits} actif={s.actif} cherche={s.cherche} requete={q} onSurvol={s.setActif}
              onChoisir={aller} className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden" />
          )}
        </div>
        <Button type="submit" size="lg">Analyser</Button>
      </form>
      <div className="mt-5 flex flex-wrap items-center gap-2 text-[0.92rem]">
        <span style={{ color: "var(--cap-ink-3)" }}>{favoris.length ? "Vos actifs :" : "Ou directement :"}</span>
        {raccourcis.map(([n, sym]) => (
          <Link key={sym} href={`/analysis?symbol=${encodeURIComponent(sym)}`} className="cap-puce rounded-full px-3.5 py-1.5"
            style={{ backgroundColor: "var(--cap-surface-2)", color: "var(--cap-ink)" }}>{n}</Link>
        ))}
      </div>
    </section>
  );
}
