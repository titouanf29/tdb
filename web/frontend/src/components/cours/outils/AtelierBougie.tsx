"use client";

import { useState } from "react";
import { fmt } from "@/lib/cours/marche";
import { ChoixLire, CurseurLire, FonduLire, useLargeurLire } from "./ElementsLire";

/**
 * L'atelier de bougie : on règle les quatre prix (ouverture, plus haut, plus
 * bas, clôture), toujours cohérents entre eux, et l'outil nomme la bougie et
 * dit ce qu'elle raconte. Le contexte (après une baisse, après une hausse)
 * change le nom de certaines : un marteau après une hausse s'appelle un pendu.
 */

type Contexte = "baisse" | "hausse";
interface Prix { o: number; h: number; l: number; c: number }

const MIN = 3950, MAX = 4050;

export function nommerBougie({ o, h, l, c }: Prix, ctx: Contexte) {
  const R = h - l;
  const corps = Math.abs(c - o);
  const haut = h - Math.max(o, c);
  const bas = Math.min(o, c) - l;
  const verte = c > o;
  const camp = verte ? "les acheteurs" : "les vendeurs";
  if (R < 3) return { nom: "Une bougie sans relief", dit: "Le prix n'a presque pas bougé pendant la période : personne n'a pris la main. Écartez le plus haut et le plus bas pour voir une vraie bougie." };
  if (corps <= 0.1 * R) {
    if (bas >= 0.65 * R) return { nom: "Doji libellule", dit: `L'ouverture et la clôture sont presque égales, tout en haut. Les vendeurs ont poussé le prix jusqu'à ${fmt(l, 0)} $, et les acheteurs ont tout repris. Le marché a hésité, avec un avantage aux acheteurs à la fin.` };
    if (haut >= 0.65 * R) return { nom: "Doji pierre tombale", dit: `L'ouverture et la clôture sont presque égales, tout en bas. Les acheteurs ont poussé jusqu'à ${fmt(h, 0)} $, et les vendeurs ont tout repris. Le marché a hésité, avec un avantage aux vendeurs à la fin.` };
    return { nom: "Doji", dit: "L'ouverture et la clôture sont presque égales : ni les acheteurs ni les vendeurs n'ont gagné. Le marché hésite. Après une longue tendance, cette hésitation mérite l'attention, sans être un signal à elle seule." };
  }
  if (corps <= 0.35 * R && bas >= 2 * corps && haut <= 0.15 * R) {
    return ctx === "baisse"
      ? { nom: "Marteau", dit: `Après une baisse, les vendeurs ont poussé le prix jusqu'à ${fmt(l, 0)} $ (${fmt(Math.min(o, c) - l, 0)} $ sous le corps), puis les acheteurs l'ont ramené près du haut. C'est un rejet du bas : les acheteurs reviennent. Un signal, pas une garantie : attendez la bougie suivante.` }
      : { nom: "Pendu (hanging man)", dit: "La même forme qu'un marteau, mais après une hausse. Pendant la période, les vendeurs ont réussi à faire chuter le prix nettement : la hausse montre une première fatigue. Seul, ce n'est qu'un avertissement." };
  }
  if (corps <= 0.35 * R && haut >= 2 * corps && bas <= 0.15 * R) {
    return ctx === "hausse"
      ? { nom: "Étoile filante (shooting star)", dit: `Après une hausse, les acheteurs ont poussé jusqu'à ${fmt(h, 0)} $, puis les vendeurs ont repoussé le prix tout en bas. C'est un rejet du haut : les vendeurs se réveillent. À confirmer par la bougie suivante.` }
      : { nom: "Marteau inversé", dit: "La forme d'une étoile filante, mais après une baisse : les acheteurs ont tenté une remontée, repoussée pour cette fois. Un premier essai des acheteurs, faible tant qu'il n'est pas confirmé." };
  }
  if (corps >= 0.7 * R) {
    return verte
      ? { nom: "Grande bougie haussière", dit: `Un grand corps vert, presque sans mèches : les acheteurs ont mené du début à la fin, de ${fmt(o, 0)} $ à ${fmt(c, 0)} $. Une période de domination nette.` }
      : { nom: "Grande bougie baissière", dit: `Un grand corps rouge, presque sans mèches : les vendeurs ont mené du début à la fin, de ${fmt(o, 0)} $ à ${fmt(c, 0)} $. Une période de domination nette.` };
  }
  if (corps <= 0.35 * R) {
    return { nom: "Toupie (spinning top)", dit: "Un petit corps et deux mèches : le prix est allé des deux côtés, et personne n'a gardé l'avantage. Une forme d'hésitation, plus faible qu'un doji." };
  }
  return {
    nom: verte ? "Bougie haussière" : "Bougie baissière",
    dit: `Le corps est ${verte ? "vert" : "rouge"} : ${camp} ont gagné la période, de ${fmt(o, 0)} $ à ${fmt(c, 0)} $.${haut > corps * 0.6 ? " La mèche du haut montre que les vendeurs ont repoussé une partie de la hausse." : ""}${bas > corps * 0.6 ? " La mèche du bas montre que les acheteurs ont repoussé une partie de la baisse." : ""} Rien de remarquable : une bougie ordinaire.`,
  };
}

const MODELES: { nom: string; p: Prix; ctx: Contexte }[] = [
  { nom: "Marteau", p: { o: 4018, h: 4034, l: 3966, c: 4030 }, ctx: "baisse" },
  { nom: "Étoile filante", p: { o: 3986, h: 4038, l: 3970, c: 3974 }, ctx: "hausse" },
  { nom: "Doji", p: { o: 4000, h: 4024, l: 3976, c: 4001 }, ctx: "hausse" },
  { nom: "Toupie", p: { o: 3996, h: 4022, l: 3978, c: 4005 }, ctx: "baisse" },
  { nom: "Grande haussière", p: { o: 3964, h: 4040, l: 3960, c: 4036 }, ctx: "baisse" },
  { nom: "Grande baissière", p: { o: 4036, h: 4040, l: 3961, c: 3965 }, ctx: "hausse" },
];

export function AtelierBougie() {
  const [p, setP] = useState<Prix>({ o: 3985, h: 4030, l: 3975, c: 4020 });
  const [ctx, setCtx] = useState<Contexte>("baisse");
  const [ref, W] = useLargeurLire();

  const regler = (cle: keyof Prix, v: number) => setP((q) => {
    const n = { ...q, [cle]: v };
    if (cle === "o" || cle === "c") { n.h = Math.max(n.h, v); n.l = Math.min(n.l, v); }
    if (cle === "h") { n.o = Math.min(n.o, v); n.c = Math.min(n.c, v); n.l = Math.min(n.l, v); }
    if (cle === "l") { n.o = Math.max(n.o, v); n.c = Math.max(n.c, v); n.h = Math.max(n.h, v); }
    return n;
  });

  const { nom, dit } = nommerBougie(p, ctx);
  const verte = p.c >= p.o;
  const col = verte ? "var(--cap-up-fill)" : "var(--cap-down-fill)";
  const H = 300, haut = 18, bas = H - 18;
  const y = (v: number) => haut + ((MAX - v) / (MAX - MIN)) * (bas - haut);
  const cx = Math.min(W * 0.42, 210);
  const cw = 54;
  const yHautCorps = y(Math.max(p.o, p.c)), yBasCorps = y(Math.min(p.o, p.c));
  const xLab = cx + cw / 2 + 18;
  // Les étiquettes de droite, écartées si les prix sont trop proches.
  const lignes = [
    { v: p.h, t: `Plus haut ${fmt(p.h, 0)}` },
    { v: Math.max(p.o, p.c), t: `${verte ? "Clôture" : "Ouverture"} ${fmt(Math.max(p.o, p.c), 0)}` },
    { v: Math.min(p.o, p.c), t: `${verte ? "Ouverture" : "Clôture"} ${fmt(Math.min(p.o, p.c), 0)}` },
    { v: p.l, t: `Plus bas ${fmt(p.l, 0)}` },
  ];
  const yl: number[] = [];
  lignes.forEach((l, i) => { const v = y(l.v) + 4; yl.push(i === 0 ? v : Math.max(v, yl[i - 1] + 16)); });
  const decal = Math.max(0, yl[3] - (H - 4));
  const accolade = (y0: number, y1: number, t: string) => {
    if (y1 - y0 < 2) return null;
    const x = cx - cw / 2 - 14;
    return (
      <g>
        <path d={`M${x + 6},${y0} h-6 v${y1 - y0} h6`} fill="none" stroke="var(--cap-ink-3)" strokeWidth="1.3" />
        <text x={x - 6} y={(y0 + y1) / 2 + 4} textAnchor="end" fontSize="12.5" fill="var(--cap-ink-2)">{t}</text>
      </g>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.92rem]" style={{ color: "var(--cap-ink-3)" }}>
        <span>Modèles :</span>
        {MODELES.map((m) => (
          <button key={m.nom} type="button" className="cap-lien min-h-11 px-1" onClick={() => { setP(m.p); setCtx(m.ctx); }}>{m.nom}</button>
        ))}
      </div>
      <div className="mt-3 grid gap-5 md:grid-cols-[1fr_1fr]">
        <div ref={ref} className="min-w-0">
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`${nom} : ouverture ${fmt(p.o, 0)}, plus haut ${fmt(p.h, 0)}, plus bas ${fmt(p.l, 0)}, clôture ${fmt(p.c, 0)}`}>
            <line x1={cx} x2={cx} y1={y(p.h)} y2={y(p.l)} stroke={col} strokeWidth="3" />
            <rect x={cx - cw / 2} width={cw} y={yHautCorps} height={Math.max(2, yBasCorps - yHautCorps)} fill={col} rx="3" />
            {accolade(y(p.h), yHautCorps, "Mèche haute")}
            {accolade(yHautCorps, yBasCorps, "Corps")}
            {accolade(yBasCorps, y(p.l), "Mèche basse")}
            {lignes.map((l, i) => (
              <g key={i}>
                <line x1={cx + cw / 2 + 3} x2={xLab - 4} y1={y(l.v)} y2={yl[i] - 4 - decal} stroke="var(--cap-line-strong)" />
                <text x={xLab} y={yl[i] - decal} fontSize="12.5" fontWeight={i === 0 || i === 3 ? 500 : 650} fill="var(--cap-ink)" className="tabular-nums">{l.t}</text>
              </g>
            ))}
          </svg>
        </div>
        <div className="min-w-0 space-y-1">
          <CurseurLire label="Ouverture" valeur={p.o} min={MIN} max={MAX} onChange={(v) => regler("o", v)} ecrire={(v) => `${fmt(v, 0)} $`} />
          <CurseurLire label="Plus haut" valeur={p.h} min={MIN} max={MAX} onChange={(v) => regler("h", v)} ecrire={(v) => `${fmt(v, 0)} $`} />
          <CurseurLire label="Plus bas" valeur={p.l} min={MIN} max={MAX} onChange={(v) => regler("l", v)} ecrire={(v) => `${fmt(v, 0)} $`} />
          <CurseurLire label="Clôture" valeur={p.c} min={MIN} max={MAX} onChange={(v) => regler("c", v)} ecrire={(v) => `${fmt(v, 0)} $`}
            couleur={verte ? "var(--cap-up)" : "var(--cap-down)"} />
          <div className="pt-1">
            <p className="text-[0.92rem]" style={{ color: "var(--cap-ink-2)" }}>Avant cette bougie, le prix :</p>
            <ChoixLire label="Contexte avant la bougie" valeur={ctx} onChange={setCtx}
              options={[{ v: "baisse", texte: "baissait" }, { v: "hausse", texte: "montait" }]} />
          </div>
        </div>
      </div>
      <div aria-live="polite" className="mt-3 border-t pt-3" style={{ borderColor: "var(--cap-line)" }}>
        <FonduLire cle={nom}>
          <p className="text-[1.15rem] font-semibold" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>{nom}</p>
        </FonduLire>
        <p className="mt-1 text-[1rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>{dit}</p>
        <p className="mt-1 text-[0.9rem] tabular-nums" style={{ color: "var(--cap-ink-3)" }}>
          Corps {fmt(Math.abs(p.c - p.o), 0)} $, mèche haute {fmt(p.h - Math.max(p.o, p.c), 0)} $, mèche basse {fmt(Math.min(p.o, p.c) - p.l, 0)} $, amplitude {fmt(p.h - p.l, 0)} $.
        </p>
      </div>
    </div>
  );
}
