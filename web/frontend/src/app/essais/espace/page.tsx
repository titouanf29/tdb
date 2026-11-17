"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronDown, Home, LineChart, Search, Wallet } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button, CaptenLogo, Heading, LigneDatee, Text } from "@/components/design-system";
import { ListeSuggestions, useAssetSuggestions } from "@/components/app/assetSearch";

/**
 * ESSAI : un espace plus simple, dans le style actuel.
 *
 * Deux changements, à valider avant de toucher au vrai site :
 *  1. le menu ramené à quatre entrées qui disent ce qu'on vient faire
 *     (Accueil, Analyser, Mon argent, Apprendre), au lieu de cinq rubriques et
 *     d'une vingtaine de pages ;
 *  2. un grand champ en haut de l'accueil : « Quel actif voulez-vous
 *     comprendre ? », l'action principale du site, sans rien chercher.
 * Le reste de l'accueil ne change pas. Page hors menu : /essais/espace.
 */

const MENU = [
  { id: "accueil", label: "Accueil", icone: Home, pages: [] as [string, string][] },
  { id: "analyser", label: "Analyser", icone: LineChart, pages: [["Un actif", "Le verdict, le plan, et pourquoi"], ["Le scanner", "Les occasions du moment"], ["Les marchés", "Ce qui monte, ce qui baisse"], ["L'agenda", "Fed, BCE, résultats"], ["Ma stratégie", "Vos règles, testées sur des années"], ["Le bilan de Nimbo", "Ce que ses propositions ont donné"]] as [string, string][] },
  { id: "argent", label: "Mon argent", icone: Wallet, pages: [["Mon wallet", "Solde, positions, résultats"], ["Acheter ou vendre", "Ouvrir une position"], ["Mon journal", "Mes décisions, relues"], ["Mes favoris", "Les actifs que je suis"], ["Mes vrais placements", "Le carnet de mes lignes réelles"]] as [string, string][] },
  { id: "apprendre", label: "Apprendre", icone: BookOpen, pages: [["Les leçons", "Pas à pas, du début"], ["Les missions", "De petits objectifs"], ["Le glossaire", "Chaque mot, en une phrase"], ["Poser une question", "L'assistant répond"]] as [string, string][] },
];

function Entete({ ouvert, setOuvert }: Readonly<{ ouvert: string | null; setOuvert: (v: string | null) => void }>) {
  return (
    <header className="sticky top-0 z-30" style={{ backgroundColor: "var(--cap-bg)", boxShadow: "0 1px 0 var(--cap-line)" }}>
      <div className="mx-auto flex h-16 max-w-[82rem] items-center gap-6 px-5 sm:px-8">
        <CaptenLogo size={22} />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Menu proposé">
          {MENU.map((m) => (
            <div key={m.id} className="relative">
              <button type="button" onClick={() => setOuvert(ouvert === m.id ? null : m.id)}
                className="flex items-center gap-1.5 rounded-[9px] px-3.5 py-2 text-[0.98rem] transition-colors hover:bg-[color:var(--cap-surface-2)]"
                style={{ color: m.id === "accueil" ? "var(--cap-ink)" : "var(--cap-ink-2)", fontWeight: m.id === "accueil" ? 600 : 500 }}>
                {m.label}
                {m.pages.length > 0 && <ChevronDown className="h-3.5 w-3.5" style={{ transform: ouvert === m.id ? "rotate(180deg)" : undefined }} />}
              </button>
              {ouvert === m.id && m.pages.length > 0 && (
                <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[19rem] p-1.5"
                  style={{ borderRadius: "var(--cap-r-lg)", backgroundColor: "var(--cap-surface)", boxShadow: "inset 0 0 0 1px var(--cap-line), var(--cap-shadow-lg)" }}>
                  {m.pages.map(([t, d]) => (
                    <div key={t} className="rounded-[10px] px-3 py-2.5 hover:bg-[color:var(--cap-surface-2)]">
                      <div className="text-[0.95rem] font-medium" style={{ color: "var(--cap-ink)" }}>{t}</div>
                      <div className="mt-0.5 text-[0.85rem]" style={{ color: "var(--cap-ink-3)" }}>{d}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full text-[0.85rem] font-semibold" style={{ backgroundColor: "var(--cap-ink)", color: "var(--cap-on-inverse)" }}>Y</span>
        </div>
      </div>
    </header>
  );
}

function GrandeRecherche() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const s = useAssetSuggestions(q);
  const aller = (sym: string) => router.push(`/analysis?symbol=${encodeURIComponent(sym)}`);
  return (
    <section className="cap-apparait rounded-[var(--cap-r-xl)] p-6 sm:p-9" style={{ backgroundColor: "var(--cap-surface)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}>
      <label htmlFor="ess-recherche" className="block text-[1.15rem] font-semibold sm:text-[1.35rem]" style={{ color: "var(--cap-ink)" }}>
        Quel actif voulez-vous comprendre&nbsp;?
      </label>
      <form className="relative mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (s.choisi) aller(s.choisi.symbol); }} onKeyDown={s.touche}>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-0 top-1/2 h-6 w-6 -translate-y-1/2" style={{ color: "var(--cap-ink-3)" }} aria-hidden />
          <input id="ess-recherche" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off"
            placeholder="Apple, bitcoin, LVMH, l'or…"
            className="h-16 w-full bg-transparent pl-9 text-[1.5rem] outline-none sm:text-[1.8rem]"
            style={{ color: "var(--cap-ink)", borderBottom: "2px solid var(--cap-ambre)" }} />
          {s.ouvert && (
            <ListeSuggestions hits={s.hits} actif={s.actif} cherche={s.cherche} requete={q} onSurvol={s.setActif}
              onChoisir={aller} className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden" />
          )}
        </div>
        <Button type="submit" size="lg" className="sm:self-end">Analyser</Button>
      </form>
      <div className="mt-5 flex flex-wrap items-center gap-2 text-[0.92rem]">
        <span style={{ color: "var(--cap-ink-3)" }}>Ou directement :</span>
        {[["Apple", "AAPL"], ["Bitcoin", "BTC-USD"], ["LVMH", "MC.PA"], ["L'or", "GC=F"]].map(([n, sym]) => (
          <Link key={sym} href={`/analysis?symbol=${encodeURIComponent(sym)}`} className="cap-puce rounded-full px-3.5 py-1.5"
            style={{ backgroundColor: "var(--cap-surface-2)", color: "var(--cap-ink)" }}>{n}</Link>
        ))}
      </div>
    </section>
  );
}

/** La barre du bas au téléphone : les mêmes quatre entrées. */
function OngletsTelephone() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden" aria-label="Onglets proposés"
      style={{ backgroundColor: "var(--cap-bg)", boxShadow: "0 -1px 0 var(--cap-line)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex">
        {MENU.map((m, i) => (
          <span key={m.id} className="flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 text-[0.8rem]"
            style={{ color: i === 0 ? "var(--cap-ink)" : "var(--cap-ink-3)", fontWeight: i === 0 ? 600 : 500 }}>
            <m.icone className="h-[22px] w-[22px]" aria-hidden />
            {m.label}
          </span>
        ))}
      </div>
    </nav>
  );
}

export default function EssaiEspace() {
  const { user } = useAuth();
  const [ouvert, setOuvert] = useState<string | null>(null);
  const prenom = user?.username ?? "";
  // Posée directement dans <body> : par-dessus la barre actuelle du site, pour comparer honnêtement.
  const [monte, setMonte] = useState(false);
  useEffect(() => { setMonte(true); }, []);
  if (!monte) return null;
  return createPortal(
    <div className="cap fixed inset-0 z-[200] overflow-y-auto" style={{ backgroundColor: "var(--cap-bg)", color: "var(--cap-ink)" }}>
      <style>{`.ess-couche{position:absolute;inset:64px 0 auto;height:min(460px,62vh);background:url(/ciel/couche-jour.webp) center 40%/cover no-repeat;pointer-events:none;animation:ess-vol 60s ease-in-out infinite alternate;transform-origin:50% 40%}
.ess-couche::after{content:"";position:absolute;inset:auto 0 0;height:45%;background:linear-gradient(transparent,var(--cap-bg))}
@media (max-width:640px){.ess-couche{background-image:url(/ciel/couche-jour-tel.webp);height:380px}}
@keyframes ess-vol{to{transform:scale(1.05)}}
@media (prefers-reduced-motion:reduce){.ess-couche{animation:none}}
.anim-off .ess-couche{animation:none}`}</style>
      <Entete ouvert={ouvert} setOuvert={setOuvert} />
      {/* LA COUCHE DE NUAGES, VUE D'AVION. Des nuages calmes et réalistes, en plein
          jour, à la place des nuages dessinés : le rêve reste, le ton devient
          sérieux. L'image est calculée une fois (scripts/generer-couche-nuages.py).
          Le texte se pose sur la partie de ciel uni, la recherche sur un panneau opaque. */}
      <div className="ess-couche" aria-hidden />
      <main className="relative mx-auto max-w-[82rem] px-5 pb-32 pt-8 sm:px-8">
        <p className="cap-dateline mb-4 text-[0.92rem]"><LigneDatee /></p>
        <Heading level={1}>Bonjour{prenom ? `, ${prenom}` : ""}.</Heading>
        <div className="mt-10 sm:mt-24"><GrandeRecherche /></div>

        {/* Le menu déplié, pour le voir d'un coup d'œil. */}
        <section className="mt-10">
          <Text size="small">Le menu proposé, déplié : quatre entrées, et ce qu&apos;on trouve dans chacune.</Text>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MENU.filter((m) => m.pages.length).map((m) => (
              <div key={m.id} className="rounded-[var(--cap-r-lg)] p-5" style={{ backgroundColor: "var(--cap-surface)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}>
                <div className="flex items-center gap-2 text-[1.1rem] font-semibold"><m.icone className="h-5 w-5" aria-hidden />{m.label}</div>
                <ul className="mt-3 space-y-2.5">
                  {m.pages.map(([t, d]) => (
                    <li key={t}><div className="font-medium">{t}</div><div className="text-[0.88rem]" style={{ color: "var(--cap-ink-3)" }}>{d}</div></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Text size="caption" className="mt-3">La communauté, les demandes au support et les paramètres passent dans le menu du profil (la pastille Y).</Text>
        </section>
      </main>
      <OngletsTelephone />
    </div>,
    document.body,
  );
}
