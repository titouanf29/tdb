"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { nimboSuiviAPI, type BilanHorizon, type PropositionSuivie, type SuiviNimbo, type SurDix } from "@/lib/api";
import { fr } from "@/lib/SettingsContext";
import { formatCours } from "@/lib/devise";
import { Eyebrow, Heading, Nimbo, Panel, Text, WeatherBackdrop, useAnimationsEnabled } from "@/components/design-system";

/**
 * Le bilan de Nimbo : ce que ses VRAIES propositions sont devenues.
 *
 * « Sur 10 achats comparables » vient d'un rejeu sur le passé. Ici, chaque
 * proposition faite à l'écran a été notée au moment où elle l'a été, puis
 * suivie jusqu'à l'objectif, au stop ou à l'échéance (backend
 * nimbo_suivi.py). Les deux rangées de points se lisent côte à côte : la
 * promesse, et ce qui s'est passé.
 */

const NOM_STATUT: Record<PropositionSuivie["statut"], string> = {
  en_cours: "En cours",
  objectif: "Objectif atteint",
  stop: "Stop touché",
  echeance: "Sorti à l'échéance",
};
const COULEUR_STATUT: Record<PropositionSuivie["statut"], string> = {
  en_cours: "var(--cap-ink-3)",
  objectif: "var(--cap-up)",
  stop: "var(--cap-down)",
  echeance: "var(--cap-ink-2)",
};
const HORIZON: Record<string, string> = { "1d": "Swing", "3d": "Swing long", "1w": "Long terme" };

export default function BilanNimboPage() {
  const [animOn] = useAnimationsEnabled();
  const [d, setD] = useState<SuiviNimbo | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    nimboSuiviAPI.get().then(setD).catch(() => setErreur(true));
  }, []);

  return (
    <>
      <WeatherBackdrop condition="clear" enabled={animOn} />
      <div className="relative space-y-6">
        <Link href="/analysis" className="inline-flex items-center gap-1.5 pt-2 text-[0.85rem] hover:underline"
          style={{ color: "var(--cap-ink-2)" }}>
          <ArrowLeft size={14} aria-hidden /> Analyse
        </Link>

        <header className="flex items-start gap-4">
          <Nimbo humeur="reflechit" taille={88} className="-ml-2 hidden sm:inline-flex" />
          <div className="max-w-[40rem]">
            <Eyebrow>Le bilan de Nimbo</Eyebrow>
            <Heading level={1} className="mt-2">Ce que mes propositions sont devenues.</Heading>
            <Text className="mt-3">
              Chaque position que je propose est notée au moment où je la propose, puis suivie jusqu&apos;à
              l&apos;objectif, au stop ou à l&apos;échéance — avec les mêmes règles que le rejeu qui me sert à
              dire « sur 10 achats comparables » : frais compris, et le stop compté en premier quand une même
              séance touche les deux.
            </Text>
          </div>
        </header>

        {erreur ? (
          <Panel><Text tone="down">Le bilan n&apos;a pas pu être chargé. Réessayez dans un instant.</Text></Panel>
        ) : !d ? (
          <div className="flex items-center gap-3 py-12">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--cap-ink-3)" }} />
            <Text>On vérifie où en est chaque proposition…</Text>
          </div>
        ) : d.total === 0 ? (
          <Panel>
            <Text>
              Aucune proposition suivie pour l&apos;instant : le suivi commence avec la première position que je
              propose sur une page d&apos;analyse.
            </Text>
          </Panel>
        ) : (
          <>
            {d.horizons.map((h) => <Horizon key={h.cle} h={h} />)}
            <Dernieres liste={d.dernieres} />
          </>
        )}
      </div>
    </>
  );
}

function Points({ s, label }: { s: SurDix; label: string }) {
  const couleurs = [
    ...Array(s.objectif).fill("var(--cap-up)"),
    ...Array(s.stop).fill("var(--cap-down)"),
    ...Array(s.echeance).fill("var(--cap-ink-4)"),
  ];
  return (
    <div className="flex gap-1.5" role="img"
      aria-label={`${label} : ${s.objectif} objectifs, ${s.stop} stops, ${s.echeance} échéances sur dix`}>
      {couleurs.map((c, i) => <span key={i} className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: c }} />)}
    </div>
  );
}

function Horizon({ h }: { h: BilanHorizon }) {
  const peu = h.closes < 30;
  return (
    <Panel title={`En ${h.libelle}`} hint={`${h.closes} proposition${h.closes > 1 ? "s" : ""} terminée${h.closes > 1 ? "s" : ""}, ${h.en_cours} en cours.`}>
      {h.closes === 0 ? (
        <Text size="small">Rien de terminé encore : une proposition dure jusqu&apos;à son objectif, son stop ou son échéance.</Text>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Text size="caption" as="p">En vrai, ramené à 10</Text>
            <div className="mt-2">{h.sur_dix && <Points s={h.sur_dix} label="En vrai" />}</div>
            <Text size="small" className="mt-2">
              <strong>{h.compte.objectif}</strong> objectif{h.compte.objectif > 1 ? "s" : ""},{" "}
              <strong>{h.compte.stop}</strong> stop{h.compte.stop > 1 ? "s" : ""},{" "}
              <strong>{h.compte.echeance}</strong> à l&apos;échéance
              {h.r_moyen != null && <> — {h.r_moyen >= 0 ? "+" : "−"}{fr(Math.abs(h.r_moyen), 2)} R par trade en moyenne</>}
              {h.r_erreur != null && <> (± {fr(h.r_erreur, 2)})</>}.
            </Text>
          </div>
          {h.attendu && (
            <div>
              <Text size="caption" as="p">Ce que le rejeu annonçait</Text>
              <div className="mt-2"><Points s={h.attendu.sur_dix} label="Annoncé" /></div>
              <Text size="small" className="mt-2">
                {h.attendu.sur_dix.objectif} objectifs, {h.attendu.sur_dix.stop} stops, {h.attendu.sur_dix.echeance} à
                l&apos;échéance — +{fr(h.attendu.r_moyen, 2)} R par trade.
              </Text>
            </div>
          )}
        </div>
      )}
      {h.closes > 0 && peu && (
        <Text size="caption" className="mt-4">
          Moins de 30 propositions terminées : à ce stade, l&apos;écart avec le rejeu dit surtout le hasard. Le chiffre
          devient lisible avec le nombre.
        </Text>
      )}
    </Panel>
  );
}

function Dernieres({ liste }: { liste: PropositionSuivie[] }) {
  return (
    <Panel title="Les dernières propositions" hint="Cours d'entrée au moment de la proposition, stop et objectif proposés.">
      <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
        {liste.map((p) => (
          <li key={`${p.symbol}-${p.timeframe}-${p.cree_le}`} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <Link href={`/analysis?symbol=${encodeURIComponent(p.symbol)}`} className="font-semibold hover:underline"
                style={{ color: "var(--cap-ink)" }}>{p.symbol}</Link>
              <span className="ml-2 text-[0.82rem]" style={{ color: "var(--cap-ink-3)" }}>
                {p.direction === "SHORT" ? "Vente" : "Achat"} · {HORIZON[p.timeframe] ?? p.timeframe} ·{" "}
                {new Date(p.cree_le).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              </span>
              <Text size="caption" as="p" className="mt-0.5">
                Entrée {formatCours(p.entree, p.symbol)} · stop {formatCours(p.stop, p.symbol)} · objectif {formatCours(p.objectif, p.symbol)}
              </Text>
            </div>
            <span className="text-[0.88rem] font-medium" style={{ color: COULEUR_STATUT[p.statut] }}>
              {NOM_STATUT[p.statut]}
              {p.r != null && <span className="cap-num ml-2">{p.r >= 0 ? "+" : "−"}{fr(Math.abs(p.r), 2)} R</span>}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
