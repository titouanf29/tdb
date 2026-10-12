"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button, Nimbo, Panel, Text, type NimboHumeur } from "@/components/design-system";
import { nimboSuiviAPI } from "@/lib/api";
import { annoncerReussite } from "@/lib/reussite";
import { gesteFait, noterGeste } from "@/lib/parcours";

/**
 * Le premier parcours, guidé par Nimbo : UNE étape à la fois.
 *
 * Une liste de quatre cases laissait le débutant choisir par où commencer —
 * et il ne savait pas. Ici Nimbo dit la prochaine chose à faire, avec un seul
 * bouton, dans l'ordre où le site enseigne : regarder avant d'agir (une
 * analyse, jusqu'à ma proposition), agir petit (une position virtuelle, par
 * mon bouton « Prendre position »), puis suivre ce qu'on a fait (la fiche de
 * la position). Les étapes se cochent d'elles-mêmes, sur l'état réel.
 *
 * Pour la première analyse, Nimbo choisit un actif sur lequel il propose
 * VRAIMENT une position aujourd'hui (son dernier suivi), quand il y en a
 * une : la démonstration montre alors le site au complet, proposition
 * comprise.
 */

const REPLI = "MC.PA";

export function ParcoursNimbo({ aUnePosition }: { aUnePosition: boolean }) {
  const [pret, setPret] = useState(false);
  const [analyse, setAnalyse] = useState(false);
  const [suivi, setSuivi] = useState(false);
  const [termine, setTermine] = useState(true);
  const [actif, setActif] = useState<string>(REPLI);

  useEffect(() => {
    setAnalyse(gesteFait("analyse"));
    setSuivi(gesteFait("suivi"));
    setTermine(gesteFait("termine"));
    setPret(true);
    nimboSuiviAPI.get()
      .then((d) => {
        const p = d.dernieres.find((x) => x.statut === "en_cours" && x.timeframe === "1d" && x.direction !== "SHORT");
        if (p) setActif(p.symbol);
      })
      .catch(() => {});
  }, []);

  const etapes = [
    { fait: analyse || aUnePosition, titre: "Analyser un actif avec moi" },
    { fait: aUnePosition, titre: "Prendre une première position virtuelle" },
    { fait: suivi, titre: "La suivre" },
  ];
  const n = etapes.filter((e) => e.fait).length;
  const courante = etapes.findIndex((e) => !e.fait);

  // Tout est fait : Nimbo le fête une fois, puis le parcours s'efface.
  useEffect(() => {
    if (!pret || termine || n < etapes.length) return;
    noterGeste("termine");
    setTermine(true);
    annoncerReussite({ titre: "Premier parcours terminé", detail: "Vous savez lire, décider et suivre. La suite est dans le parcours." });
  }, [pret, termine, n, etapes.length]);

  if (!pret || termine || courante < 0) return null;

  const scene: { humeur: NimboHumeur; dit: string; detail: string; bouton: string; href: string }[] = [
    {
      humeur: "salue",
      dit: "Commençons par lire un actif ensemble.",
      detail: `Je vous emmène sur ${actif === REPLI ? "LVMH" : actif}. Lisez le verdict, puis descendez jusqu'à mon avis : je dis si je propose une position, et pourquoi.`,
      bouton: "Analyser avec Nimbo",
      href: `/analysis?symbol=${encodeURIComponent(actif)}`,
    },
    {
      humeur: "cap",
      dit: "Maintenant, une première position — en argent virtuel.",
      detail: "Sur une analyse où je propose d'entrer, appuyez sur « Prendre position » : l'ordre s'ouvre avec mon stop et mon objectif, vous n'avez qu'à valider. Se tromper ici ne coûte rien.",
      bouton: "Trouver une proposition",
      href: `/analysis?symbol=${encodeURIComponent(actif)}`,
    },
    {
      humeur: "pointe",
      dit: "Dernière étape : suivre ce que vous avez fait.",
      detail: "Dans votre wallet, touchez votre position : sa fiche montre où en est le cours entre le stop et l'objectif, et ce que je ferais maintenant.",
      bouton: "Suivre ma position",
      href: "/wallet",
    },
  ];
  const s = scene[courante];

  return (
    <Panel
      title="Votre premier parcours"
      hint="Trois gestes, guidés par Nimbo. Rien d'obligatoire."
      aside={<span className="cap-num text-[0.82rem]" style={{ color: "var(--cap-ink-3)" }}>{n} / {etapes.length}</span>}
    >
      <ol className="mb-4 flex gap-1.5" aria-label="Avancée du parcours">
        {etapes.map((e, i) => (
          <li key={e.titre} className="h-[4px] flex-1 rounded-full" aria-label={`${e.titre} : ${e.fait ? "fait" : i === courante ? "en cours" : "à venir"}`}
            style={{ backgroundColor: e.fait ? "var(--cap-ocean)" : i === courante ? "color-mix(in srgb, var(--cap-ocean) 35%, var(--cap-line))" : "var(--cap-line)" }} />
        ))}
      </ol>

      <div className="flex items-start gap-3">
        <Nimbo humeur={s.humeur} taille={72} className="-my-1 -ml-1 shrink-0" />
        <div className="min-w-0">
          <p className="text-[1rem] font-semibold leading-snug" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
            {s.dit}
          </p>
          <Text size="small" className="mt-1.5">{s.detail}</Text>
          <Button href={s.href} size="md" className="mt-3">
            {s.bouton} <ArrowRight className="cap-fleche h-4 w-4" />
          </Button>
        </div>
      </div>

      <ul className="mt-4 space-y-1 border-t pt-3" style={{ borderColor: "var(--cap-line)" }}>
        {etapes.map((e, i) => (
          <li key={e.titre} className="flex items-center gap-2 text-[0.85rem]"
            style={{ color: e.fait ? "var(--cap-ink-3)" : i === courante ? "var(--cap-ink)" : "var(--cap-ink-3)" }}>
            <span aria-hidden className="flex h-4 w-4 items-center justify-center rounded-full"
              style={{ backgroundColor: e.fait ? "var(--cap-ocean)" : "transparent", boxShadow: e.fait ? "none" : "inset 0 0 0 1.5px var(--cap-line-strong)" }}>
              {e.fait && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
            </span>
            <span style={{ textDecoration: e.fait ? "line-through" : undefined, fontWeight: i === courante ? 600 : 400 }}>{e.titre}</span>
          </li>
        ))}
      </ul>
      <Text size="caption" className="mt-3">
        Ensuite : suivre des favoris pour que je vous prévienne,{" "}
        <Link href="/journal" className="underline underline-offset-2">relire vos décisions</Link> dans le journal.
      </Text>
    </Panel>
  );
}
