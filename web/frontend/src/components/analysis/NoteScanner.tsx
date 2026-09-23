"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radar } from "lucide-react";
import { Panel, Text } from "@/components/design-system";
import { fraicheur, lireNote, type NoteScan } from "@/lib/scanNote";

/**
 * Pourquoi le scanner a retenu cet actif, et avec quel plan.
 *
 * Le trajet scanner → analyse perdait tout. Le scanner classe, explique,
 * calcule un niveau d'entrée et une invalidation ; le lien vers l'analyse
 * ouvrait une page qui ne savait pas d'où l'on venait et refaisait son
 * raisonnement de zéro. L'utilisateur devait retenir de tête le rang, le
 * niveau d'entrée et le stop pendant le trajet entre deux écrans.
 *
 * TROIS NOMBRES, ET L'ORDRE COMPTE. On entre, on vise, on renonce. La
 * dernière colonne est celle qu'on oublie et c'est celle qui coûte : elle est
 * donc écrite au même rang que les deux autres, pas en note de bas de page.
 *
 * LE RAPPORT GAIN/RISQUE EST AFFICHÉ MÊME QUAND IL EST MAUVAIS. Un plan qui
 * rémunère mal le risque est une information ; la masquer reviendrait à ne
 * montrer que les plans flatteurs, ce qui est exactement ce qu'un outil
 * d'apprentissage ne doit pas faire.
 *
 * Le panneau disparaît quand la note a plus de six heures : un plan calculé
 * sur une autre séance n'est plus un plan, c'est un souvenir.
 */
export function NoteScanner({
  symbol,
  format,
}: {
  symbol: string;
  /** Le formateur de prix de l'écran : un cours n'a pas la précision d'une somme. */
  format: (v: number) => string;
}) {
  const [note, setNote] = useState<NoteScan | null>(null);

  // Au montage seulement : sessionStorage n'existe pas au rendu serveur.
  useEffect(() => { setNote(lireNote(symbol)); }, [symbol]);

  if (!note) return null;

  const { item, rang, total, at } = note;
  const plan = item.plan;
  const couleur =
    item.sens === "long" ? "var(--cap-up)"
    : item.sens === "short" ? "var(--cap-down)"
    : "var(--cap-ink-3)";

  return (
    <Panel
      title="Ce que le scanner a vu"
      hint={`Repéré ${fraicheur(at)} · ${rang}ᵉ sur ${total} retenus · balayage en ${note.timeframe}`}
      aside={<Radar size={15} aria-hidden style={{ color: "var(--cap-ink-4)" }} />}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Text size="small" tone="ink" as="span">
          Note du scanner : <span className="cap-num">{item.score}</span> / 100
        </Text>
        <span className="text-[0.76rem]" style={{ color: couleur }}>
          {item.setup}
          {item.sens === "long" ? " · plutôt à l'achat"
            : item.sens === "short" ? " · plutôt à la vente"
            : " · sans sens tranché"}
        </span>
      </div>

      {item.headline && (
        <Text size="small" className="mt-2.5">{item.headline}</Text>
      )}

      {plan ? (
        <>
          {/* Le plan, en trois colonnes. Un tableau plutôt qu'une phrase :
              ce sont trois nombres qu'on compare du regard avant d'agir. */}
          <div
            className="mt-4 grid grid-cols-3 gap-x-3 rounded-[12px] px-4 py-3.5"
            style={{ backgroundColor: "var(--cap-bg)" }}
          >
            <Colonne
              titre="Entrer"
              valeur={format(plan.entree)}
              detail={plan.entree_condition}
            />
            <Colonne
              titre="Viser"
              valeur={format(plan.objectif)}
              detail="objectif"
              couleur="var(--cap-up)"
            />
            <Colonne
              titre="Renoncer"
              valeur={format(plan.invalidation)}
              detail="le scénario tombe"
              couleur="var(--cap-down)"
            />
          </div>

          <Text size="caption" className="mt-2.5">
            {plan.rapport != null && (
              <>Rapport gain / risque de 1 : {plan.rapport.toLocaleString("fr-FR")}. </>
            )}
            {plan.verdict} {plan.commentaire}
          </Text>
        </>
      ) : (
        <Text size="caption" className="mt-3">
          Le scanner n&apos;a pas pu construire de plan sur cet actif : la structure de
          prix ne donne pas de support et de résistance exploitables sur la période.
        </Text>
      )}

      {item.sens_phrase && (
        <Text size="small" className="mt-3">{item.sens_phrase}</Text>
      )}

      <Text size="caption" tone="faint" className="mt-3">
        Ces niveaux viennent du balayage, pas de l&apos;analyse ci-dessous — les deux
        se lisent ensemble et peuvent diverger.{" "}
        <Link href="/scanner" className="underline underline-offset-2" style={{ color: "var(--cap-ocean)" }}>
          Revenir au scan
        </Link>
      </Text>
    </Panel>
  );
}

function Colonne({
  titre,
  valeur,
  detail,
  couleur,
}: {
  titre: string;
  valeur: string;
  detail: string;
  couleur?: string;
}) {
  return (
    <div className="min-w-0">
      <Text size="caption" tone="faint" as="span" className="block">{titre}</Text>
      <span
        className="cap-num mt-0.5 block text-[0.95rem]"
        style={{ color: couleur ?? "var(--cap-ink)" }}
      >
        {valeur}
      </span>
      <Text size="caption" tone="faint" as="span" className="mt-0.5 block leading-snug">
        {detail}
      </Text>
    </div>
  );
}
