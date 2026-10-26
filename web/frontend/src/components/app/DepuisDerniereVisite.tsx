"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { welcomeBackAPI, type RecapRetour } from "@/lib/api";
import { useSettings } from "@/lib/SettingsContext";
import { EASE, useMouvementReduit } from "@/components/design-system";

/**
 * « Depuis votre dernière visite » : la récompense de chaque retour.
 *
 * Le serveur savait raconter l'absence, aucun écran ne le lui demandait.
 * L'accueil s'ouvre maintenant, après une vraie absence, sur ce qui s'est
 * passé : ce que le marché a fait aux positions, celles qui ont été fermées,
 * les notifications arrivées entre-temps, les favoris qui ont bougé, et la
 * série de jours d'affilée. Rien n'apparaît quand il n'y a rien à dire.
 *
 * Le rythme suit le réglage « Récapitulatif de retour » : à chaque visite
 * (après 30 minutes d'absence), une fois par jour, une fois par semaine, ou
 * jamais.
 */

const ECART: Record<string, number | null> = { always: 30, daily: 12 * 60, weekly: 7 * 24 * 60, off: null };

function eur(v: number, signe = true) {
  const t = Math.abs(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${v < 0 ? "−" : signe && v > 0 ? "+" : ""}${t} €`;
}
function pct(v: number) {
  const t = Math.abs(v).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${v < 0 ? "−" : "+"}${t} %`;
}
const ton = (v: number) => (v > 0 ? "var(--cap-up)" : v < 0 ? "var(--cap-down)" : "var(--cap-ink-3)");

export function DepuisDerniereVisite() {
  const { settings, isLoaded } = useSettings();
  const reduit = useMouvementReduit();
  const [recap, setRecap] = useState<RecapRetour | null>(null);
  const [ferme, setFerme] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    const ecart = ECART[settings.recapFrequency] ?? 30;
    if (ecart == null) return;
    welcomeBackAPI.get(ecart).then((r) => { if (r.has_summary) setRecap(r); }).catch(() => {});
  }, [isLoaded, settings.recapFrequency]);

  if (!recap || ferme) return null;

  const lignes: { cle: string; libelle: React.ReactNode; valeur?: React.ReactNode; href?: string | null }[] = [];
  for (const f of recap.fermees ?? []) {
    lignes.push({ cle: `f-${f.symbol}-${f.realized_pnl}`, libelle: <>{f.nom}<span style={{ color: "var(--cap-ink-3)" }}>, position fermée</span></>,
      valeur: <span style={{ color: ton(f.realized_pnl) }}>{eur(f.realized_pnl)}</span>, href: "/journal" });
  }
  for (const p of recap.positions ?? []) {
    lignes.push({ cle: `p-${p.symbol}`, libelle: p.nom,
      valeur: <span style={{ color: ton(p.pnl_delta) }}>{eur(p.pnl_delta)}</span>, href: "/wallet" });
  }
  for (const n of recap.notifications ?? []) {
    lignes.push({ cle: `n-${n.id}`, libelle: n.title, href: n.link });
  }
  const reste = (recap.notifications_total ?? 0) - (recap.notifications?.length ?? 0);

  const apparition = (i: number) => (reduit ? {} : {
    initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay: 0.25 + i * 0.07, ease: EASE },
  });

  return (
    <motion.section
      aria-labelledby="recap-titre"
      initial={reduit ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="relative z-10 rounded-[16px] px-5 py-5 sm:px-6"
      style={{ backgroundColor: "var(--cap-surface)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}
    >
      <button type="button" onClick={() => setFerme(true)} aria-label="Masquer le récapitulatif"
        className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[color:var(--cap-surface-2)]"
        style={{ color: "var(--cap-ink-3)" }}>
        <X className="h-4 w-4" />
      </button>

      <p className="flex items-center gap-2 pr-10 text-[0.95rem] italic"
        style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>
        <span aria-hidden className="h-[2px] w-5 rounded-full" style={{ backgroundColor: "var(--cap-ambre)" }} />
        Depuis votre dernière visite, il y a {recap.away_label}
      </p>
      <h2 id="recap-titre" className="mt-2 pr-8 text-[clamp(1.15rem,2.2vw,1.45rem)] font-semibold leading-snug"
        style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
        {recap.titre}
      </h2>

      {lignes.length > 0 && (
        <ul className="mt-4">
          {lignes.slice(0, 6).map((l, i) => {
            const contenu = (
              <span className="flex items-baseline gap-2">
                <span className="min-w-0 truncate text-[0.93rem]" style={{ color: "var(--cap-ink)" }}>{l.libelle}</span>
                {l.valeur && (
                  <>
                    <span aria-hidden className="min-w-4 flex-1 -translate-y-[0.2em] border-b-[1.5px] border-dotted" style={{ borderColor: "var(--cap-line-strong)" }} />
                    <span className="cap-num shrink-0 text-[0.93rem] font-medium">{l.valeur}</span>
                  </>
                )}
              </span>
            );
            return (
              <motion.li key={l.cle} {...apparition(i)} className="border-t py-2.5" style={{ borderColor: "var(--cap-line)" }}>
                {l.href ? (
                  <Link href={l.href} className="block rounded-[8px] transition-colors hover:text-[color:var(--cap-ocean)]">{contenu}</Link>
                ) : contenu}
              </motion.li>
            );
          })}
        </ul>
      )}
      {reste > 0 && (
        <p className="mt-1 text-[0.85rem]" style={{ color: "var(--cap-ink-3)" }}>
          Et {reste} autre{reste > 1 ? "s" : ""} notification{reste > 1 ? "s" : ""}, dans la cloche en haut de l&apos;écran.
        </p>
      )}

      {((recap.favorites?.length ?? 0) > 0 || (recap.serie ?? 0) > 1) && (
        <motion.div {...apparition(lignes.length)} className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-[0.9rem]">
          {(recap.favorites ?? []).map((f) => (
            <Link key={f.symbol} href={`/analysis?symbol=${encodeURIComponent(f.symbol)}`}
              className="inline-flex items-baseline gap-1.5 underline decoration-[color:var(--cap-line-strong)] underline-offset-[5px] transition-colors hover:decoration-[color:var(--cap-ambre)]"
              style={{ color: "var(--cap-ink)" }}>
              {f.nom} <span className="cap-num" style={{ color: ton(f.pct) }}>{pct(f.pct)}</span>
            </Link>
          ))}
          {(recap.serie ?? 0) > 1 && (
            <span style={{ color: "var(--cap-ink-2)" }}>
              <span className="cap-chiffre">{recap.serie} jours</span> d&apos;affilée sur CaptenTDB
            </span>
          )}
        </motion.div>
      )}
    </motion.section>
  );
}

/**
 * Quand on quitte le site (onglet caché, fermé, téléphone verrouillé), l'état
 * du compte devient la base de la prochaine visite. Au plus une fois toutes
 * les dix minutes : passer d'un onglet à l'autre ne doit pas solliciter le
 * serveur à chaque fois.
 */
export function useSignalDepart(actif: boolean) {
  useEffect(() => {
    if (!actif) return;
    const CLE = "tdb_dernier_depart";
    const partir = (e: Event) => {
      if (e.type !== "pagehide" && document.visibilityState !== "hidden") return;
      try {
        const avant = Number(localStorage.getItem(CLE) || 0);
        if (Date.now() - avant < 10 * 60_000) return;
        localStorage.setItem(CLE, String(Date.now()));
      } catch { /* navigation privée : on signale quand même */ }
      welcomeBackAPI.activite();
    };
    document.addEventListener("visibilitychange", partir);
    window.addEventListener("pagehide", partir);
    return () => {
      document.removeEventListener("visibilitychange", partir);
      window.removeEventListener("pagehide", partir);
    };
  }, [actif]);
}
