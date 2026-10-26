"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { CHAPITRES, FICHES, ORDRE, fiche } from "@/lib/cours/catalogue";
import { DISPONIBLES } from "@/lib/cours/lecons";
import { Button, SegmentedControl, Text } from "@/components/design-system";
import { MODULE_SERIE, cleLecon } from "./LeconVue";

/**
 * Le sommaire de la série, comme une table des matières : par chapitres (l'ordre
 * où l'on progresse) ou dans l'ordre des vidéos (le numéro entendu sur TikTok).
 */

const ROMAINS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

export function Sommaire({ faites }: { faites?: Set<string> }) {
  const [vue, setVue] = useState<"chapitres" | "videos">("chapitres");
  const fait = (n: number) => faites?.has(`${MODULE_SERIE}/${cleLecon(n)}`) ?? false;
  const prochaine = faites ? ORDRE.find((n) => DISPONIBLES.has(n) && !fait(n)) : undefined;
  const nbFaites = faites ? ORDRE.filter(fait).length : 0;

  const Ligne = ({ n, rang }: { n: number; rang: string }) => {
    const f = fiche(n)!;
    const dispo = DISPONIBLES.has(n);
    const contenu = (
      <>
        <span className="w-9 flex-none text-[1.2rem] italic leading-tight" style={{ color: "var(--cap-amber-ink)", fontFamily: "var(--cap-font-display)" }}>{rang}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="text-[1.08rem] font-semibold leading-snug" style={{ color: dispo ? "var(--cap-ink)" : "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>{f.court}</span>
            <span aria-hidden className="hidden flex-1 -translate-y-[0.2em] border-b-[1.5px] border-dotted sm:block" style={{ borderColor: "var(--cap-line-strong)" }} />
            <span className="flex-none text-[0.86rem]" style={{ color: "var(--cap-ink-3)" }}>{dispo ? f.duree : "bientôt"}</span>
          </span>
          <span className="mt-0.5 block text-[0.93rem] leading-snug" style={{ color: "var(--cap-ink-3)" }}>{f.resume}</span>
        </span>
        <span aria-hidden className="mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full"
          style={{ backgroundColor: fait(n) ? "var(--cap-up)" : "transparent", boxShadow: fait(n) ? "none" : "inset 0 0 0 1px var(--cap-line-strong)" }}>
          {fait(n) && <Check className="h-3.5 w-3.5 text-white" />}
        </span>
        <span className="sr-only">{fait(n) ? "Terminée" : ""}</span>
      </>
    );
    return dispo ? (
      <li>
        <Link href={`/lecon/${n}`} className="-mx-3 flex items-start gap-3 rounded-[10px] px-3 py-3 transition-colors hover:bg-[color:var(--cap-surface-2)]">{contenu}</Link>
      </li>
    ) : (
      <li className="-mx-3 flex items-start gap-3 px-3 py-3 opacity-70">{contenu}</li>
    );
  };

  return (
    <div>
      {prochaine && (
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5 rounded-[16px] p-5 sm:p-6" style={{ backgroundColor: "var(--cap-surface)", boxShadow: "inset 0 0 0 1px var(--cap-line-strong)" }}>
          <div className="min-w-0">
            <p className="text-[0.95rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>
              {nbFaites === 0 ? "Commencer ici" : `Reprendre, ${nbFaites} leçon${nbFaites > 1 ? "s" : ""} sur ${FICHES.length} terminée${nbFaites > 1 ? "s" : ""}`}
            </p>
            <p className="mt-1 text-[1.5rem] font-medium leading-tight" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
              {fiche(prochaine)!.titre}
            </p>
          </div>
          <Button href={`/lecon/${prochaine}`} size="md">{nbFaites === 0 ? "Commencer" : "Reprendre"} <ArrowRight className="h-4 w-4" /></Button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <Text size="small" className="max-w-[36rem]">
          Les leçons sont rangées dans l&apos;ordre où l&apos;on progresse, chapitre après chapitre ; rien n&apos;est verrouillé. Vous cherchez la leçon d&apos;une vidéo ? Passez à l&apos;ordre des vidéos.
        </Text>
        <SegmentedControl size="sm" aria-label="Classement des leçons" value={vue} onChange={setVue}
          options={[{ value: "chapitres", label: "Par chapitres" }, { value: "videos", label: "Dans l'ordre des vidéos" }]} />
      </div>

      {vue === "chapitres" ? (
        <ol className="space-y-12">
          {CHAPITRES.map((c, k) => {
            const nb = faites ? c.lecons.filter(fait).length : null;
            return (
              <li key={c.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-3" style={{ borderColor: "var(--cap-line-strong)" }}>
                  <h2 className="text-[1.65rem] font-medium leading-tight" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
                    <span className="mr-3 italic" style={{ color: "var(--cap-amber-ink)" }}>{ROMAINS[k]}.</span>{c.titre}
                  </h2>
                  {nb != null && <span className="text-[0.88rem]" style={{ color: nb === c.lecons.length ? "var(--cap-up)" : "var(--cap-ink-3)" }}>{nb === c.lecons.length ? "Terminé" : `${nb} sur ${c.lecons.length}`}</span>}
                </div>
                <p className="mt-2 text-[0.98rem]" style={{ color: "var(--cap-ink-2)" }}>{c.resume}</p>
                <ul className="mt-2 [&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
                  {c.lecons.map((n, j) => <Ligne key={n} n={n} rang={String(j + 1)} />)}
                </ul>
              </li>
            );
          })}
        </ol>
      ) : (
        <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
          {FICHES.map((f) => <Ligne key={f.numero} n={f.numero} rang={String(f.numero)} />)}
        </ul>
      )}
    </div>
  );
}
