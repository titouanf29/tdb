"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, animate, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button, EASE, useMouvementReduit } from "@/components/design-system";

/**
 * Le site présenté en quatre chapitres, chacun avec une petite scène animée.
 *
 * La liste de quatre lignes disait ce que fait le site ; elle ne le montrait
 * pas. Chaque chapitre joue maintenant en quelques secondes ce que l'on fera
 * sur l'écran correspondant : le graphique se trace et le verdict tombe, les
 * 10 000 € arrivent sur le compte, les leçons se cochent, la stratégie se
 * rejoue sur cinq ans. Les scènes sont des exemples dessinés, pas des
 * données : elles le disent.
 */

const CHAPITRES = [
  { num: "I", titre: "Lire un actif", ou: "Analyse", texte: "Choisissez un actif : je donne mon verdict et sa raison en une phrase, puis le détail si vous le voulez.", Scene: SceneLire },
  { num: "II", titre: "S'entraîner sans risque", ou: "Wallet", texte: "10 000 € fictifs pour prendre de vraies positions sur les vrais cours, chacune avec son stop et son objectif.", Scene: SceneWallet },
  { num: "III", titre: "Apprendre", ou: "Parcours", texte: "Des leçons courtes, des exercices sur de vrais graphiques et des missions, du premier ordre aux stratégies.", Scene: SceneApprendre },
  { num: "IV", titre: "Tester ses idées", ou: "Ma stratégie", texte: "Écrivez vos règles : je les relis, puis vous les rejouez sur des années de cours passés.", Scene: SceneTester },
];

export function Presentation({ onFin, onRetour, onSeul }: { onFin: () => void; onRetour: () => void; onSeul: () => void }) {
  const [i, setI] = useState(0);
  const reduit = useMouvementReduit();
  const c = CHAPITRES[i];
  const dernier = i === CHAPITRES.length - 1;

  return (
    <div>
      <p className="flex items-center gap-2 pr-10 text-[0.85rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>
        <span aria-hidden className="h-px w-4" style={{ backgroundColor: "var(--cap-ambre)" }} />
        Le site en quatre chapitres
      </p>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={i}
          initial={reduit ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduit ? undefined : { opacity: 0, x: -24 }}
          transition={{ duration: 0.38, ease: EASE }}
        >
          <div
            className="mt-4 overflow-hidden rounded-[14px]"
            style={{ backgroundColor: "var(--cap-bg)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}
          >
            <c.Scene reduit={reduit} />
          </div>
          <div className="mt-5 grid grid-cols-[2.4rem_minmax(0,1fr)] gap-x-1.5">
            <span aria-hidden className="text-[1.3rem] italic leading-tight" style={{ color: "var(--cap-amber-ink)", fontFamily: "var(--cap-font-display)" }}>{c.num}</span>
            <div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-[1.25rem] font-semibold leading-tight" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>{c.titre}</h2>
                <span aria-hidden className="flex-1 -translate-y-[0.2em] border-b-[1.5px] border-dotted" style={{ borderColor: "var(--cap-line-strong)" }} />
                <span className="text-[0.82rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>{c.ou}</span>
              </div>
              <p className="mt-1.5 text-[0.93rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>{c.texte}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-5 flex items-center justify-center gap-2" role="tablist" aria-label="Chapitres">
        {CHAPITRES.map((ch, n) => (
          <button key={ch.num} type="button" role="tab" aria-selected={n === i} aria-label={`Chapitre ${ch.num} : ${ch.titre}`}
            onClick={() => setI(n)} className="flex h-6 items-center px-0.5">
            <span className="block h-[3px] rounded-full transition-all duration-300"
              style={{ width: n === i ? 28 : 12, backgroundColor: n === i ? "var(--cap-ambre)" : "var(--cap-line-strong)" }} />
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => (i === 0 ? onRetour() : setI(i - 1))}
          className="flex min-h-[44px] items-center gap-1.5 text-[0.84rem]" style={{ color: "var(--cap-ink-3)" }}>
          <ArrowLeft className="h-3.5 w-3.5" /> Retour
        </button>
        <div className="flex items-center gap-4">
        <button type="button" onClick={onSeul} className="cap-lien text-[0.86rem]">Passer</button>
        <Button size="md" onClick={() => (dernier ? onFin() : setI(i + 1))}>
          {dernier ? "Adapter le site à moi" : "Chapitre suivant"}
          <ArrowRight className="h-4 w-4" />
        </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Les scènes ──────────────────────────────────────────────────────────── */

const W = 480;
const H = 176;
const LEGENDE = { fill: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)", fontStyle: "italic", fontSize: 12 } as const;

function Exemple() {
  return <text x={W - 14} y={H - 10} textAnchor="end" style={{ ...LEGENDE, fontSize: 10.5 }}>exemple</text>;
}

function trace(reduit: boolean, delai = 0, duree = 1.8) {
  return {
    initial: reduit ? false as const : { pathLength: 0 },
    animate: { pathLength: 1 },
    transition: { duration: reduit ? 0 : duree, delay: reduit ? 0 : delai, ease: [0.45, 0, 0.25, 1] as const },
  };
}

function apparait(reduit: boolean, delai: number, y = 6) {
  return {
    initial: reduit ? false as const : { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduit ? 0 : 0.5, delay: reduit ? 0 : delai, ease: EASE },
  };
}

/** Un graphique qui se trace, puis le verdict de Nimbo. */
function SceneLire({ reduit }: { reduit: boolean }) {
  const pts = [[24, 128], [70, 118], [104, 132], [146, 104], [182, 112], [222, 86], [262, 96], [300, 70], [338, 78], [378, 52], [414, 58]];
  const d = pts.map(([x, y], n) => `${n ? "L" : "M"}${x},${y}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Un graphique se trace, puis le verdict apparaît">
      {[48, 88, 128].map((y) => <line key={y} x1={16} x2={W - 16} y1={y} y2={y} stroke="var(--cap-line)" strokeWidth={1} />)}
      <motion.path d={`${d} L${lx},150 L24,150 Z`} fill="var(--cap-ocean)"
        initial={reduit ? false : { opacity: 0 }} animate={{ opacity: 0.08 }} transition={{ duration: reduit ? 0 : 1, delay: reduit ? 0 : 1.6 }} />
      <motion.path d={d} fill="none" stroke="var(--cap-ocean)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" {...trace(reduit, 0.2)} />
      <motion.circle cx={lx} cy={ly} r={5} fill="var(--cap-ambre)"
        initial={reduit ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ duration: reduit ? 0 : 0.45, delay: reduit ? 0 : 2 }}
        style={{ transformBox: "fill-box", transformOrigin: "center" }} />
      <motion.g {...apparait(reduit, 2.2)}>
        <text x={24} y={30} style={{ fill: "var(--cap-ink)", fontFamily: "var(--cap-font-display)", fontSize: 17, fontWeight: 600 }}>Verdict : plutôt haussier</text>
      </motion.g>
      <motion.g {...apparait(reduit, 2.6)}>
        <text x={24} y={H - 10} style={LEGENDE}>Les plus hauts montent, et le cours reste au-dessus de sa moyenne.</text>
      </motion.g>
    </svg>
  );
}

/** Les 10 000 € arrivent, puis une position avec son stop et son objectif. */
function SceneWallet({ reduit }: { reduit: boolean }) {
  const [montant, setMontant] = useState(reduit ? 10000 : 0);
  useEffect(() => {
    if (reduit) { setMontant(10000); return; }
    const a = animate(0, 10000, { duration: 1.6, delay: 0.2, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setMontant(v) });
    return () => a.stop();
  }, [reduit]);
  const texte = `${Math.round(montant / 10) * 10}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="10 000 euros fictifs, puis une position avec son stop et son objectif">
      <text x={24} y={30} style={LEGENDE}>Votre compte d&apos;entraînement</text>
      <text x={24} y={72} style={{ fill: "var(--cap-ink)", fontFamily: "var(--cap-font-display)", fontSize: 36, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
        {texte} €
      </text>
      <motion.g {...apparait(reduit, 1.9, 10)}>
        <text x={24} y={112} style={{ fill: "var(--cap-ink)", fontSize: 13.5, fontWeight: 600 }}>Apple, achat</text>
        <text x={W - 24} y={112} textAnchor="end" style={{ fill: "var(--cap-up)", fontSize: 13.5, fontWeight: 600 }}>+1,8 %</text>
        <line x1={24} x2={W - 24} y1={134} y2={134} stroke="var(--cap-line-strong)" strokeWidth={3} strokeLinecap="round" />
        <motion.line x1={150} y1={134} y2={134} stroke="var(--cap-up)" strokeWidth={3} strokeLinecap="round"
          initial={reduit ? false : { x2: 150 }} animate={{ x2: 300 }} transition={{ duration: reduit ? 0 : 1.2, delay: reduit ? 0 : 2.4, ease: EASE }} />
        <line x1={60} x2={60} y1={126} y2={142} stroke="var(--cap-down)" strokeWidth={2} />
        <line x1={W - 60} x2={W - 60} y1={126} y2={142} stroke="var(--cap-up)" strokeWidth={2} />
        <motion.circle cy={134} r={6} fill="var(--cap-ambre)" stroke="var(--cap-surface)" strokeWidth={2}
          initial={reduit ? false : { cx: 150 }} animate={{ cx: 300 }} transition={{ duration: reduit ? 0 : 1.2, delay: reduit ? 0 : 2.4, ease: EASE }} />
        <text x={60} y={160} textAnchor="middle" style={{ ...LEGENDE, fontSize: 11 }}>stop</text>
        <text x={W - 60} y={160} textAnchor="middle" style={{ ...LEGENDE, fontSize: 11 }}>objectif</text>
      </motion.g>
    </svg>
  );
}

/** Trois leçons qui se remplissent et se cochent, l'une après l'autre. */
function SceneApprendre({ reduit }: { reduit: boolean }) {
  const lecons = ["Lire un graphique", "Passer un ordre", "Placer un stop"];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Trois leçons se complètent l'une après l'autre">
      <text x={24} y={28} style={LEGENDE}>Le parcours, une leçon après l&apos;autre</text>
      {lecons.map((l, n) => {
        const y = 58 + n * 40;
        const delai = 0.3 + n * 0.9;
        return (
          <g key={l}>
            <text x={24} y={y} style={{ fill: "var(--cap-ink)", fontSize: 13.5, fontWeight: 500 }}>{l}</text>
            <line x1={24} x2={W - 64} y1={y + 12} y2={y + 12} stroke="var(--cap-line-strong)" strokeWidth={4} strokeLinecap="round" />
            <motion.line x1={24} x2={W - 64} y1={y + 12} y2={y + 12} stroke="var(--cap-ocean)" strokeWidth={4} strokeLinecap="round"
              {...trace(reduit, delai, 0.8)} />
            <motion.g initial={reduit ? false : { scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: reduit ? 0 : 0.4, delay: reduit ? 0 : delai + 0.8, ease: EASE }}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}>
              <circle cx={W - 38} cy={y + 4} r={11} fill="var(--cap-up)" />
              <path d={`M${W - 43},${y + 4} l4,4 l7,-8`} fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            </motion.g>
          </g>
        );
      })}
    </svg>
  );
}

/** Une stratégie rejouée sur cinq ans : la courbe du capital se trace. */
function SceneTester({ reduit }: { reduit: boolean }) {
  const pts = [[24, 130], [60, 124], [92, 132], [124, 116], [160, 120], [196, 100], [228, 108], [262, 92], [300, 98], [336, 76], [372, 84], [410, 62], [452, 54]];
  const d = pts.map(([x, y], n) => `${n ? "L" : "M"}${x},${y}`).join(" ");
  const annees = ["2021", "2022", "2023", "2024", "2025"];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Une stratégie rejouée sur cinq ans de cours">
      <text x={24} y={28} style={LEGENDE}>Vos règles, rejouées sur cinq ans de cours</text>
      <line x1={24} x2={W - 24} y1={130} y2={130} stroke="var(--cap-line-strong)" strokeWidth={1} strokeDasharray="3 4" />
      {annees.map((a, n) => (
        <text key={a} x={24 + n * ((W - 48) / 4)} y={152} textAnchor={n === 0 ? "start" : n === 4 ? "end" : "middle"}
          style={{ fill: "var(--cap-ink-4)", fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{a}</text>
      ))}
      <motion.path d={d} fill="none" stroke="var(--cap-up)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" {...trace(reduit, 0.3, 2.2)} />
      <motion.g {...apparait(reduit, 2.4)}>
        <text x={W - 24} y={46} textAnchor="end" style={{ fill: "var(--cap-ink)", fontFamily: "var(--cap-font-display)", fontSize: 15, fontWeight: 600 }}>48 trades, gain moyen +0,6 R</text>
      </motion.g>
      <Exemple />
    </svg>
  );
}
