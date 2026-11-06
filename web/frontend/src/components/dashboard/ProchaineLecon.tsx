"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { EVT_PROGRESSION, learnAPI, type LessonRecord } from "@/lib/api";
import { LEARN_MODULES } from "@/lib/learnContent";
import { MODULE_SERIE, ORDRE, chapitreDe, cleLecon, fiche } from "@/lib/cours/catalogue";
import { Panel, Text } from "@/components/design-system";
import { ilYA } from "@/lib/quand";

/**
 * « Continuer à apprendre » : la prochaine leçon par son nom, sa durée, et
 * ce qui est déjà fait.
 *
 * Le panneau disait la même chose à tout le monde, chaque jour : « les bases,
 * puis les indicateurs, puis la gestion du risque », avec trois étiquettes
 * décoratives. Une visiteuse fatiguée, le soir, voulait lire « Vous avez lu
 * la leçon 1. Ce soir : la leçon 2, 10 minutes. » C'est ce qu'il dit
 * maintenant, pour les deux fils d'apprentissage du site : le parcours
 * (leçons courtes, avec quiz) et la série (les leçons des vidéos).
 */

interface Piste {
  nom: string;
  faites: number;
  total: number;
  prochaine: { titre: string; contexte: string; duree: string; href: string } | null;
}

function pistes(records: Record<string, LessonRecord>): Piste[] {
  const parcours = LEARN_MODULES.flatMap((m) => m.lessons.map((l) => ({ m, l, cle: `${m.id}/${l.id}` })));
  const pFaites = parcours.filter((x) => records[x.cle]);
  const pNext = parcours.find((x) => !records[x.cle]);

  const serie = ORDRE.map((n) => ({ n, cle: `${MODULE_SERIE}/${cleLecon(n)}` }));
  const sFaites = serie.filter((x) => records[x.cle]);
  const sNext = serie.find((x) => !records[x.cle]);
  const sFiche = sNext ? fiche(sNext.n) : undefined;

  return [
    {
      nom: "Le parcours",
      faites: pFaites.length,
      total: parcours.length,
      prochaine: pNext
        ? { titre: pNext.l.title, contexte: pNext.m.title, duree: pNext.l.duration, href: `/learn?lecon=${encodeURIComponent(pNext.cle)}` }
        : null,
    },
    {
      nom: "Les leçons de la série",
      faites: sFaites.length,
      total: serie.length,
      prochaine: sNext && sFiche
        ? { titre: sFiche.titre, contexte: chapitreDe(sNext.n)?.titre ?? "", duree: sFiche.duree, href: `/lecon/${sNext.n}` }
        : null,
    },
  ];
}

/** La dernière leçon terminée, toutes pistes confondues, et quand. */
function derniere(records: Record<string, LessonRecord>): { titre: string; quand: string } | null {
  let meilleure: { cle: string; date: string } | null = null;
  for (const [cle, r] of Object.entries(records)) {
    if (r?.completed_at && (!meilleure || r.completed_at > meilleure.date)) meilleure = { cle, date: r.completed_at };
  }
  if (!meilleure) return null;
  const [mod, lid] = meilleure.cle.split("/");
  let titre: string | undefined;
  if (mod === MODULE_SERIE) {
    titre = fiche(Number(lid.replace("lecon-", "")))?.court;
  } else {
    titre = LEARN_MODULES.find((m) => m.id === mod)?.lessons.find((l) => l.id === lid)?.title;
  }
  if (!titre) return null;
  return { titre, quand: ilYA(meilleure.date) };
}

export function ProchaineLecon() {
  const [records, setRecords] = useState<Record<string, LessonRecord> | null>(null);
  const [erreur, setErreur] = useState(false);

  const lire = useCallback(() => {
    learnAPI.lessons().then((r) => setRecords(r.lessons || {})).catch(() => setErreur(true));
  }, []);

  useEffect(() => {
    lire();
    window.addEventListener(EVT_PROGRESSION, lire);
    return () => window.removeEventListener(EVT_PROGRESSION, lire);
  }, [lire]);

  const liste = records ? pistes(records) : [];
  const toutFait = liste.length > 0 && liste.every((p) => !p.prochaine);
  const der = records ? derniere(records) : null;
  const rien = records && Object.keys(records).length === 0;
  let hint = "Repris à la leçon près, sur tous vos appareils.";
  if (rien) hint = "Des leçons courtes, à lire dans l'ordre. La première prend quatre minutes.";
  else if (der) hint = `Dernière leçon terminée : « ${der.titre} », ${der.quand}.`;

  return (
    <Panel
      title="Continuer à apprendre"
      hint={hint}
      action={{ label: "Tout le parcours", href: "/learn" }}
    >
      {erreur && (
        <Text size="small">Les bases, puis les indicateurs, puis la gestion du risque, dans cet ordre. Reprenez là où vous en étiez depuis le parcours.</Text>
      )}
      {records && toutFait && (
        <Text size="small">Tout est lu, des deux côtés. Les leçons restent là pour être relues avant un trade qui hésite.</Text>
      )}
      {records && !toutFait && (
        <ul className="cap-liste">
          {liste.map((p) => (
            <li key={p.nom} className="border-b py-2.5 last:border-b-0" style={{ borderColor: "var(--cap-line)" }}>
              {p.prochaine ? (
                <Link href={p.prochaine.href} className="group flex items-center gap-3 transition-colors hover:text-[color:var(--cap-ocean)]">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.78rem] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--cap-ink-3)" }}>
                      {p.nom} · {p.faites} sur {p.total}
                    </span>
                    <span className="mt-0.5 block text-[0.95rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                      {p.prochaine.titre}
                    </span>
                    <Text size="caption">{p.prochaine.contexte ? `${p.prochaine.contexte} · ` : ""}{p.prochaine.duree}</Text>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" style={{ color: "var(--cap-amber-ink)" }} />
                </Link>
              ) : (
                <span className="flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.78rem] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--cap-ink-3)" }}>{p.nom}</span>
                    <span className="mt-0.5 block text-[0.95rem] font-medium" style={{ color: "var(--cap-ink)" }}>Terminé, {p.total} leçons sur {p.total}.</span>
                  </span>
                  <Check className="h-4 w-4 shrink-0" style={{ color: "var(--cap-up)" }} />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
