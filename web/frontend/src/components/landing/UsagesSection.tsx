"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Atmosphere, Container, Eyebrow, Heading, Nimbo, Num, Section, Text, DUR, EASE,
} from "@/components/design-system";
import { Reveal, useEffetsActifs } from "./effets";
import { MotsAuScroll } from "./animations";
import { DEMO_ASSETS, type DemoAsset } from "./demoData";

/**
 * Section 2 — ce qu'on fait ici, montré écran par écran.
 *
 * La page expliquait le problème (trop de données) avant de dire ce que le
 * site permet de faire ; un visiteur qui arrive ne sait pas encore s'il est
 * sur un journal, un courtier ou un cours. Ici, cinq usages, dans l'ordre où
 * on les rencontre, et pour chacun l'écran tel qu'il est sur le site : la
 * liste des analyses, une proposition de Nimbo, un ordre, le journal, une
 * alerte. Le panneau avance seul toutes les six secondes et s'arrête sous la
 * souris ; un clic sur un usage le montre tout de suite.
 *
 * Les analyses du jour sont réelles (route /api/demo, les mêmes actifs que la
 * démo). Les quatre autres écrans sont des exemples, et le disent.
 */

const USAGES = [
  { titre: "Analyser n'importe quel actif", texte: "Actions, indices, crypto, or, devises : 800 valeurs dans votre espace, et 31 analyses publiques chaque jour. Pour chacune, la direction, un score sur 100, et les raisons du moteur, en français." },
  { titre: "Suivre les propositions de Nimbo", texte: "Quand un signal est net, Nimbo propose une position avec son stop et son objectif, et dit pourquoi. Sinon, il dit d'attendre." },
  { titre: "Prendre position avec 10 000 €", texte: "Un ordre se passe comme chez un courtier, mais l'argent est fictif. Stop et objectif se posent avant d'entrer." },
  { titre: "Tenir son journal", texte: "Chaque position fermée est relue : ce qui était prévu, ce qui s'est passé, et ce qu'on en retient." },
  { titre: "Être prévenu", texte: "Une alerte quand un prix est atteint, ou quand Nimbo propose un achat sur un de vos favoris. Sur téléphone aussi." },
];

const CADENCE = 6000;

const CSS = `@keyframes cap-usage-barre{from{width:0}to{width:100%}}
.cap-usage-barre{height:2px;background:var(--cap-line);position:relative}
.cap-usage-barre i{display:block;height:100%;width:0;background:var(--cap-ambre)}
.cap-usages[data-anim="1"] li[data-on="1"] .cap-usage-barre i{animation:cap-usage-barre ${CADENCE}ms linear forwards}
.cap-usages[data-pause="1"] li[data-on="1"] .cap-usage-barre i{animation-play-state:paused}
.cap-usages li:not([data-on="1"]) .cap-usage-barre i{width:0}
.cap-usage-texte{display:block;overflow:hidden;max-height:0;opacity:0;transition:max-height .45s cubic-bezier(.2,.7,.2,1),opacity .4s,margin .45s}
li[data-on="1"] .cap-usage-texte{max-height:9rem;opacity:1;margin-top:.35rem}
.anim-off .cap-usage-texte,.anim-off li[data-on="1"] .cap-usage-barre i{transition:none;animation:none}
@media (prefers-reduced-motion: reduce){.cap-usage-texte{transition:none}.cap-usages li[data-on="1"] .cap-usage-barre i{animation:none;width:100%}}`;

function tonDirection(d: string): string {
  if (d === "Haussier") return "var(--cap-up)";
  if (d === "Baissier") return "var(--cap-down)";
  return "var(--cap-ink-2)";
}

/* ── Les cinq écrans ─────────────────────────────────────────────────── */

function Tete({ titre, aside }: Readonly<{ titre: string; aside: string }>) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-3" style={{ borderColor: "var(--cap-line)" }}>
      <span className="text-[1.05rem] font-semibold" style={{ color: "var(--cap-ink)" }}>{titre}</span>
      <Text size="caption" as="span">{aside}</Text>
    </div>
  );
}

function Note({ children }: Readonly<{ children: React.ReactNode }>) {
  return <Text size="caption" className="mt-4">{children}</Text>;
}

function EcranAnalyses({ actifs, direct }: Readonly<{ actifs: DemoAsset[]; direct: boolean }>) {
  return (
    <div>
      <Tete titre="Les analyses du jour" aside={direct ? "Lecture réelle du moteur" : "Exemple, le temps que le moteur réponde"} />
      <table className="mt-1 w-full border-collapse text-[0.95rem]">
        <tbody>
          {actifs.map((a) => (
            <tr key={a.id} className="border-b" style={{ borderColor: "var(--cap-line)" }}>
              <td className="py-2.5 pr-3 font-semibold" style={{ color: "var(--cap-ink)" }}>{a.name}</td>
              <td className="py-2.5 pr-3">
                <span className="inline-block rounded-full px-2.5 py-0.5 text-[0.82rem] font-semibold"
                  style={{ backgroundColor: "var(--cap-bg)", color: tonDirection(a.direction) }}>
                  {a.direction}
                </span>
              </td>
              <td className="py-2.5 text-right" style={{ color: "var(--cap-ink-3)" }}>
                <Num className="text-[0.88rem]">{a.score} / 100</Num>
                <div className="mt-1.5 ml-auto h-1.5 w-28 overflow-hidden rounded-full" style={{ backgroundColor: "var(--cap-bg)" }}>
                  <div className="h-full rounded-full" style={{ width: `${a.score}%`, backgroundColor: "var(--cap-ocean)" }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Note>Cinq des 31 analyses publiques du jour. Une lecture du marché, pas un conseil.</Note>
    </div>
  );
}

function EcranProposition() {
  return (
    <div>
      <Tete titre="Or, proposition de Nimbo" aside="Exemple" />
      <div className="mt-4 grid grid-cols-[64px_1fr] items-start gap-4">
        <Nimbo humeur="reflechit" taille={64} label="" />
        <Text size="body" tone="ink">
          Je propose un achat sur l&apos;or. La tendance de fond est haussière, le cours vient de revenir sur
          son support et les volumes confirment. Si le stop est touché, j&apos;aurai eu tort, et je le dirai.
        </Text>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[["Entrée", "4 002 $", "var(--cap-ink)"], ["Stop", "3 948 $", "var(--cap-down)"], ["Objectif", "4 110 $", "var(--cap-up)"], ["Risque / rendement", "1 : 2", "var(--cap-ink)"]].map(([k, v, c]) => (
          <div key={k}>
            <dt className="text-[0.82rem]" style={{ color: "var(--cap-ink-3)" }}>{k}</dt>
            <dd className="mt-0.5"><span className="cap-num text-[1.15rem] font-semibold" style={{ color: c }}>{v}</span></dd>
          </div>
        ))}
      </dl>
      <div className="relative mt-5 h-2 rounded-full" style={{ background: "linear-gradient(90deg, var(--cap-down) 0 32%, var(--cap-bg) 32% 36%, var(--cap-up) 36%)" }}>
        <span aria-hidden className="absolute -top-[5px] left-[34%] h-[18px] w-1 rounded-sm" style={{ backgroundColor: "var(--cap-ink)" }} />
      </div>
      <div className="mt-2 flex justify-between"><Text size="caption" as="span">Stop</Text><Text size="caption" as="span">Objectif</Text></div>
      <Note>Chaque proposition est suivie jusqu&apos;au stop ou à l&apos;objectif, et son bilan reste visible.</Note>
    </div>
  );
}

function EcranOrdre() {
  const champ = (k: string, v: string, c = "var(--cap-ink)") => (
    <div key={k}>
      <div className="text-[0.82rem]" style={{ color: "var(--cap-ink-3)" }}>{k}</div>
      <div className="mt-1.5 rounded-[10px] px-3.5 py-2.5 text-[1rem] font-medium"
        style={{ backgroundColor: "var(--cap-surface-2, #fff)", boxShadow: "inset 0 0 0 1px var(--cap-line-strong)", color: c }}>{v}</div>
    </div>
  );
  return (
    <div>
      <Tete titre="Passer un ordre" aside="Solde : 10 000,00 € fictifs" />
      <div className="mt-4 grid grid-cols-2 gap-3.5">
        {champ("Actif", "Or (XAU / USD)")}{champ("Sens", "Achat")}{champ("Montant", "2 000 €")}{champ("Levier", "Aucun")}
        {champ("Stop", "3 948 $", "var(--cap-down)")}{champ("Objectif", "4 110 $", "var(--cap-up)")}
      </div>
      <div className="mt-4 flex min-h-[44px] items-center justify-center gap-2.5 rounded-[12px] text-[0.95rem] font-semibold"
        style={{ backgroundColor: "var(--cap-ink)", color: "var(--cap-on-inverse, #f6f2ea)" }}>
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--cap-ambre)" }} />
        Passer l&apos;ordre, en argent fictif
      </div>
      <Note>Risque sur cet ordre : 27 € fictifs, soit 0,3 % du compte. Le site le calcule avant que vous validiez.</Note>
    </div>
  );
}

function EcranJournal() {
  const lignes: [string, string, string, boolean][] = [
    ["Or, achat", "Objectif atteint en 4 jours. Plan respecté.", "+108 €", true],
    ["Apple, achat", "Stop touché. Entré contre la tendance de fond.", "−41 €", false],
    ["Bitcoin, vente", "Sorti à la main avant l'objectif. À relire.", "+62 €", true],
  ];
  return (
    <div>
      <Tete titre="Journal" aside="Exemple : un mois, 6 positions fermées" />
      <ul className="mt-1">
        {lignes.map(([t, s, r, g]) => (
          <li key={t} className="flex items-start justify-between gap-4 border-b py-3" style={{ borderColor: "var(--cap-line)" }}>
            <span><span className="font-medium" style={{ color: "var(--cap-ink)" }}>{t}</span><Text size="caption">{s}</Text></span>
            <Num tone={g ? "up" : "down"} className="shrink-0 font-semibold">{r}</Num>
          </li>
        ))}
      </ul>
      <div className="mt-4 grid grid-cols-[64px_1fr] items-start gap-4">
        <Nimbo humeur="content" taille={64} label="" />
        <Text size="body" tone="ink">
          Sur vos six positions du mois, les quatre qui ont suivi le plan sont gagnantes. Les deux autres ont été
          fermées à la main. C&apos;est la leçon du mois.
        </Text>
      </div>
    </div>
  );
}

function EcranAlertes() {
  const inter = (on: boolean) => (
    <span aria-hidden className="relative h-[26px] w-[44px] shrink-0 rounded-full"
      style={{ backgroundColor: on ? "var(--cap-ink)" : "var(--cap-line-strong)" }}>
      <span className="absolute top-[3px] h-5 w-5 rounded-full bg-white" style={{ left: on ? 21 : 3 }} />
    </span>
  );
  return (
    <div>
      <Tete titre="Alertes" aside="Exemple : 3 actives" />
      {[["Apple sous 340 $", "Alerte de prix, une fois", true], ["Or, proposition de Nimbo", "Dès qu'un signal est net sur ce favori", true], ["CAC 40 au-dessus de 8 200", "Alerte de prix, une fois", false]].map(([t, s, on]) => (
        <div key={t as string} className="flex items-center justify-between gap-4 border-b py-3.5" style={{ borderColor: "var(--cap-line)" }}>
          <span><span className="font-medium" style={{ color: "var(--cap-ink)" }}>{t}</span><Text size="caption">{s}</Text></span>
          {inter(on as boolean)}
        </div>
      ))}
      <div className="mt-4 grid grid-cols-[28px_1fr] items-start gap-3 rounded-[14px] px-4 py-3.5 text-[0.92rem]"
        style={{ backgroundColor: "var(--cap-ink)", color: "var(--cap-on-inverse, #eef2f5)" }}>
        <Nimbo humeur="pointe" taille={28} label="" />
        <span><span className="block font-semibold text-white">CaptenTDB</span>Apple est passé sous 340 $ (339,50 $). Nimbo reste neutre : le signal n&apos;est pas net.</span>
      </div>
      <Note>Les notifications arrivent sur téléphone quand le site est installé sur l&apos;écran d&apos;accueil.</Note>
    </div>
  );
}

/** L'analyse réelle d'un actif de la démo, ou null si le moteur ne répond pas. */
async function chargerActif(id: string): Promise<DemoAsset | null> {
  try {
    const r = await fetch(`/api/demo/${id}`);
    if (!r.ok) return null;
    const v = (await r.json()) as DemoAsset;
    return v?.id ? v : null;
  } catch {
    return null;
  }
}

/* ── La section ──────────────────────────────────────────────────────── */

export function UsagesSection() {
  const actifs = useEffetsActifs();
  const [on, setOn] = useState(0);
  const [pause, setPause] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [vivants, setVivants] = useState<Record<string, DemoAsset>>({});

  // Le défilement ne part qu'une fois la section à l'écran, et les cours ne
  // sont demandés qu'à ce moment-là (une requête par actif, gardée dix
  // minutes côté serveur).
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { rootMargin: "300px 0px", threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let vivant = true;
    Promise.all(DEMO_ASSETS.map((a) => chargerActif(a.id))).then((liste) => {
      if (!vivant) return;
      const charges = Object.fromEntries(liste.filter((v): v is DemoAsset => v != null).map((v) => [v.id, v]));
      setVivants((x) => ({ ...x, ...charges }));
    });
    return () => { vivant = false; };
  }, [visible]);
  useEffect(() => {
    if (!visible || !actifs || pause) return;
    const t = setTimeout(() => setOn((i) => (i + 1) % USAGES.length), CADENCE);
    return () => clearTimeout(t);
  }, [visible, actifs, pause, on]);

  const liste = DEMO_ASSETS.map((a) => vivants[a.id] ?? a);
  const direct = DEMO_ASSETS.every((a) => vivants[a.id]);
  const ecrans = [
    <EcranAnalyses key="a" actifs={liste} direct={direct} />,
    <EcranProposition key="p" />,
    <EcranOrdre key="o" />,
    <EcranJournal key="j" />,
    <EcranAlertes key="al" />,
  ];

  return (
    <Section id="usages" size="md" tone="raised" className="relative overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <Atmosphere variant="side" />
      <Container width="wide">
        <div className="max-w-[36rem]">
          <Reveal><Eyebrow>Ce qu&apos;on fait ici</Eyebrow></Reveal>
          <Heading level={1} className="mt-5">
            <MotsAuScroll texte="Cinq choses, en argent fictif, sur de vrais cours." />
          </Heading>
          <Reveal delay={0.12}>
            <Text size="lead" className="mt-6">
              Un compte gratuit ouvre tout ce qui suit. À côté, chaque usage tel qu&apos;il apparaît sur le site.
            </Text>
          </Reveal>
        </div>

        <Reveal delay={0.16} className="mt-12">
          <div ref={ref} className="cap-usages grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-16"
            data-anim={visible && actifs ? "1" : "0"} data-pause={pause ? "1" : "0"}
            onPointerEnter={() => setPause(true)} onPointerLeave={() => setPause(false)}>
            <ol className="m-0 list-none p-0" aria-label="Les usages du site">
              {USAGES.map((u, i) => (
                <li key={u.titre} data-on={i === on ? "1" : "0"} className="border-t" style={{ borderColor: "var(--cap-line)" }}>
                  <button type="button" onClick={() => setOn(i)} aria-pressed={i === on}
                    className="grid w-full grid-cols-[2.6rem_1fr] gap-3 py-4 text-left transition-colors duration-300"
                    style={{ color: i === on ? "var(--cap-ink)" : "var(--cap-ink-2)" }}>
                    <span className="text-[1.2rem] font-bold leading-[1.3]" style={{ color: i === on ? "var(--cap-amber-ink)" : "var(--cap-ink-3)" }}>{i + 1}</span>
                    <span className="min-w-0">
                      <span className="block text-[1.1rem] font-bold leading-tight">{u.titre}</span>
                      <span className="cap-usage-texte text-[0.95rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>{u.texte}</span>
                    </span>
                  </button>
                  <span className="cap-usage-barre" aria-hidden><i /></span>
                </li>
              ))}
              <li className="border-t" style={{ borderColor: "var(--cap-line)" }} aria-hidden />
            </ol>

            <div className="min-w-0 self-start rounded-[var(--cap-r-xl)] p-5 sm:p-7"
              style={{ backgroundColor: "var(--cap-surface)", boxShadow: "inset 0 0 0 1px var(--cap-line-strong), 0 1px 2px rgba(11,23,38,.05)" }}
              aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={on}
                  initial={actifs ? { opacity: 0, y: 10 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={actifs ? { opacity: 0, y: -6 } : undefined}
                  transition={{ duration: DUR.base, ease: EASE }}>
                  {ecrans[on]}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
