"use client";

import { useEffect, useMemo, useState } from "react";
import { pontAPI, type PontTiktok as Etat } from "@/lib/api";
import { LEARN_MODULES } from "@/lib/learnContent";
import { COUVERTURE } from "@/lib/pontTiktok";
import { EmptyState, Panel, Text } from "@/components/design-system";

/**
 * Apprendre face au TikTok : chaque leçon de la série, ce que le Studio en dit
 * (publiée, programmée, prête, à écrire) et ce qui lui répond sur le site.
 * Une leçon publiée sans rien dans Apprendre vient en tête : c'est là qu'un
 * visiteur venu de la vidéo ne trouve pas ce qu'il cherche.
 */

const TITRES: Record<string, string> = Object.fromEntries(
  LEARN_MODULES.flatMap((m) => m.lessons.map((l) => [l.id, l.title])),
);

function dateCourte(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso.length <= 16 ? `${iso}:00` : iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function PontTiktok() {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [erreur, setErreur] = useState("");
  useEffect(() => {
    pontAPI.tiktok().then(setEtat).catch((e) => setErreur(e instanceof Error ? e.message : "Lecture impossible."));
  }, []);

  const lignes = useMemo(() => {
    if (!etat) return [];
    const parNumero = new Map<number, Etat["videos"]>();
    for (const v of etat.videos) {
      if (v.numero == null) continue;
      parNumero.set(v.numero, [...(parNumero.get(v.numero) ?? []), v]);
    }
    const numeros = Array.from(new Set([...etat.plan.map((p) => p.numero), ...Array.from(parNumero.keys())])).sort((a, b) => a - b);
    return numeros.map((n) => {
      const vids = parNumero.get(n) ?? [];
      const plan = etat.plan.find((p) => p.numero === n);
      const publiees = vids.filter((v) => v.statut === "publiee");
      const prog = vids.filter((v) => v.statut === "programmee");
      const statut = publiees.length ? "publiee" : prog.length ? "programmee" : vids.length ? "prete" : "a_ecrire";
      const date = publiees[0]?.date ?? prog[0]?.date ?? null;
      const cv = COUVERTURE[n];
      const manque = !cv ? "rien" : cv.niveau === "partielle" ? "partielle" : "ok";
      return { n, titre: plan?.titre || vids[0]?.titre || `Leçon ${n}`, statut, date, cv, manque, parties: vids.length };
    });
  }, [etat]);

  const ordre = (l: (typeof lignes)[number]) =>
    (l.statut === "publiee" ? 0 : l.statut === "programmee" ? 1 : 2) * 10 + (l.manque === "rien" ? 0 : l.manque === "partielle" ? 1 : 2);
  const triees = [...lignes].sort((a, b) => ordre(a) - ordre(b) || a.n - b.n);
  const publiees = lignes.filter((l) => l.statut === "publiee");
  const aEcrire = publiees.filter((l) => l.manque !== "ok");

  return (
    <Panel title="Apprendre et le TikTok"
      hint="Les leçons de la série, ce que le Studio dit de leur publication, et ce qui leur répond dans l'onglet Apprendre. Aucun chiffre TikTok n'est repris sur le site.">
      {erreur && <Text size="small" tone="down">{erreur}</Text>}
      {etat && !etat.configure && (
        <Text size="small" className="mb-4">
          Le pont est fermé : ajoutez une clé PONT_TIKTOK_CLE (au moins 24 caractères) dans les variables de Railway, et la
          même dans les réglages de CaptenTDB Studio.
        </Text>
      )}
      {etat && etat.configure && !etat.maj && (
        <EmptyState title="Rien reçu du Studio pour l'instant" description="Dès que le Studio aura envoyé la série, les leçons apparaîtront ici." />
      )}
      {etat && etat.maj && (
        <>
          <p className="text-[0.95rem]" style={{ color: "var(--cap-ink-2)" }}>
            <b style={{ color: "var(--cap-ink)" }}>{publiees.length}</b> leçon{publiees.length > 1 ? "s" : ""} publiée{publiees.length > 1 ? "s" : ""} sur TikTok ;{" "}
            <b style={{ color: aEcrire.length ? "var(--cap-down)" : "var(--cap-up)" }}>{aEcrire.length}</b> sans leçon complète dans Apprendre.
            <span className="ml-2 text-[0.82rem]" style={{ color: "var(--cap-ink-4)" }}>
              Reçu du Studio le {new Date(etat.maj).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
            </span>
          </p>
          <ul className="mt-4 [&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
            {triees.map((l) => (
              <li key={l.n} className="grid gap-x-4 gap-y-1 py-2.5 sm:grid-cols-[3rem_minmax(0,1fr)_10rem_minmax(0,16rem)]">
                <span className="text-[1rem] italic" style={{ color: "#c98a1e", fontFamily: "var(--cap-font-display)" }}>{l.n}</span>
                <span className="min-w-0 text-[0.95rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                  {l.titre}{l.parties > 1 && !/partie/i.test(l.titre) ? ` (${l.parties} parties)` : ""}
                </span>
                <span className="text-[0.86rem]" style={{ color: l.statut === "publiee" ? "var(--cap-ink)" : "var(--cap-ink-3)" }}>
                  {l.statut === "publiee" ? `Publiée${l.date ? ` le ${dateCourte(l.date)}` : ""}`
                    : l.statut === "programmee" ? `Prévue le ${dateCourte(l.date)}`
                    : l.statut === "prete" ? "Prête, pas programmée" : "À tourner"}
                </span>
                <span className="text-[0.86rem]" style={{ color: l.manque === "ok" ? "var(--cap-up)" : l.manque === "partielle" ? "var(--cap-amber-ink)" : l.statut === "publiee" ? "var(--cap-down)" : "var(--cap-ink-3)" }}>
                  {l.manque === "rien" ? "Rien dans Apprendre"
                    : `${l.manque === "ok" ? "Couverte" : "En partie"} : ${l.cv!.lecons.map((id) => TITRES[id] ?? id).join(", ") || "—"}${l.cv!.note ? ` (${l.cv!.note})` : ""}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
