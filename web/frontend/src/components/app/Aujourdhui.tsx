"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { EVT_PROGRESSION, missionsAPI, type Aujourdhui as Donnees } from "@/lib/api";
import { EASE, useMouvementReduit } from "@/components/design-system";

/**
 * « Aujourd'hui » : la série de jours d'affilée et les trois missions du jour,
 * sur l'accueil.
 *
 * La série n'était visible que sur la page Missions, que presque personne
 * n'ouvre : une série qu'on ne voit pas est une série qu'on casse sans s'en
 * rendre compte. Ici, elle est sous les yeux à chaque arrivée, avec les sept
 * derniers jours, et les missions du jour se cochent dès qu'on les fait,
 * ailleurs sur le site (un geste compté relance la lecture).
 */

const JOURS = ["D", "L", "M", "M", "J", "V", "S"];

function phraseSerie(serie: number, toutFait: boolean): string {
  if (serie <= 0) return "Votre série commence aujourd'hui.";
  if (serie === 1) return "Premier jour. Revenez demain pour lancer la série.";
  if (toutFait) return `Journée complète. Revenez demain pour passer à ${serie + 1} jours.`;
  return `Revenez demain pour passer à ${serie + 1} jours d'affilée.`;
}

export function Aujourdhui() {
  const reduit = useMouvementReduit();
  const [d, setD] = useState<Donnees | null>(null);

  const lire = useCallback(() => { missionsAPI.aujourdhui().then(setD).catch(() => {}); }, []);
  useEffect(() => {
    lire();
    // Le signal de la visite du jour part en même temps que cette lecture :
    // une seconde lecture le rattrape. Puis chaque geste compté relit.
    const t = setTimeout(lire, 2500);
    window.addEventListener(EVT_PROGRESSION, lire);
    return () => { clearTimeout(t); window.removeEventListener(EVT_PROGRESSION, lire); };
  }, [lire]);

  if (!d) return null;
  const faites = d.missions.filter((m) => m.fait).length;
  const toutFait = faites === d.missions.length;
  const pct = Math.round((d.xp_niveau / d.xp_par_niveau) * 100);

  return (
    <motion.section
      aria-labelledby="aujourdhui-titre"
      initial={reduit ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="relative z-10 grid gap-x-8 gap-y-6 rounded-[16px] px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
      style={{ backgroundColor: "var(--cap-surface)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}
    >
      {/* La série */}
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[0.95rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>
          <span aria-hidden className="h-[2px] w-5 rounded-full" style={{ backgroundColor: "var(--cap-ambre)" }} />
          <span id="aujourdhui-titre">Aujourd&apos;hui</span>
        </p>
        <p className="mt-2 flex items-baseline gap-2.5">
          <span className="cap-num text-[2.6rem] font-medium leading-none" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
            {d.serie}
          </span>
          <span className="text-[1rem]" style={{ color: "var(--cap-ink)" }}>
            jour{d.serie > 1 ? "s" : ""} d&apos;affilée
          </span>
        </p>
        <ol className="mt-4 flex gap-2" aria-label="Les sept derniers jours">
          {d.semaine.map((j, i) => {
            const date = new Date(j.jour + "T12:00:00Z");
            return (
              <li key={j.jour} className="flex flex-col items-center gap-1.5"
                aria-label={`${date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" })} : ${j.venu ? "venu" : "pas venu"}`}>
                <motion.span
                  initial={reduit ? false : { scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.35, delay: reduit ? 0 : 0.15 + i * 0.06, ease: EASE }}
                  className="flex h-7 w-7 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: j.venu ? "var(--cap-ocean)" : "transparent",
                    boxShadow: j.venu ? "none" : `inset 0 0 0 1.5px ${j.aujourdhui ? "var(--cap-ambre)" : "var(--cap-line-strong)"}`,
                  }}
                >
                  {j.venu && <Check className="h-3.5 w-3.5" style={{ color: "var(--cap-surface)" }} aria-hidden />}
                </motion.span>
                <span className="text-[0.72rem]" style={{ color: j.aujourdhui ? "var(--cap-ink)" : "var(--cap-ink-3)", fontWeight: j.aujourdhui ? 600 : 400 }}>
                  {JOURS[date.getUTCDay()]}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-[0.88rem]" style={{ color: "var(--cap-ink-2)" }}>{phraseSerie(d.serie, toutFait)}</p>
      </div>

      {/* Les missions du jour */}
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[1.05rem] font-semibold" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
            Missions du jour
          </p>
          <span className="cap-num text-[0.85rem]" style={{ color: "var(--cap-ink-3)" }}>{faites} sur {d.missions.length}</span>
        </div>
        <ul className="mt-2">
          {d.missions.map((m) => (
            <li key={m.id} className="border-t" style={{ borderColor: "var(--cap-line)" }}>
              <Link href={m.lien} aria-disabled={m.fait}
                className="group flex min-h-[48px] items-center gap-3 py-2 transition-colors hover:text-[color:var(--cap-ocean)]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors"
                  style={{ backgroundColor: m.fait ? "var(--cap-up)" : "transparent", boxShadow: m.fait ? "none" : "inset 0 0 0 1.5px var(--cap-line-strong)" }}>
                  {m.fait && <Check className="h-3.5 w-3.5" style={{ color: "#fff" }} aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.93rem]" style={{ color: m.fait ? "var(--cap-ink-3)" : "var(--cap-ink)", textDecoration: m.fait ? "line-through" : "none", textDecorationColor: "var(--cap-line-strong)" }}>
                    {m.title}
                  </span>
                  <span className="block text-[0.8rem]" style={{ color: "var(--cap-ink-3)" }}>{m.fait ? "Fait aujourd'hui" : m.description}</span>
                </span>
                <span className="cap-num shrink-0 text-[0.82rem]" style={{ color: m.fait ? "var(--cap-up)" : "var(--cap-ink-3)" }}>+{m.xp}</span>
                {!m.fait && <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: "var(--cap-ink-4)" }} aria-hidden />}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-[0.82rem]" style={{ color: "var(--cap-ink-3)" }}>Niveau {d.niveau}</span>
          <span className="relative h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "var(--cap-line)" }}
            role="progressbar" aria-valuenow={d.xp_niveau} aria-valuemin={0} aria-valuemax={d.xp_par_niveau}
            aria-label={`Niveau ${d.niveau} : ${d.xp_niveau} points sur ${d.xp_par_niveau}`}>
            <motion.span className="absolute inset-y-0 left-0 rounded-full" style={{ backgroundColor: "var(--cap-ocean)" }}
              initial={reduit ? false : { width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, delay: reduit ? 0 : 0.3, ease: EASE }} />
          </span>
          <Link href="/learn/missions" className="cap-lien shrink-0 text-[0.82rem]">Toutes les missions</Link>
        </div>
      </div>
    </motion.section>
  );
}
