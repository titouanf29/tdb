"use client";

import { useState } from "react";
import { Choix, Chiffre, Curseur, Verdict, dollars, nb, signe, ton, useCalme, useLargeur } from "./ElementsOrdres";

/**
 * Leçon 15. Le même trade sur l'or (1 once à 4 000 $), à l'achat ou à la
 * vente : on fait bouger le prix et l'on voit le gain ou la perte, le stop
 * loss et le take profit qui changent de côté. Puis, sans stop, ce que coûte
 * un prix extrême : borné à l'achat, sans limite à la vente.
 */

const ENTREE = 4000;

export function SimulateurLongShort() {
  const [sens, setSens] = useState<"long" | "short">("long");
  const [p, setP] = useState(ENTREE);
  const [risque, setRisque] = useState(20);
  const calme = useCalme();
  const { ref, w } = useLargeur(560);

  const s = sens === "long" ? 1 : -1;
  const sl = ENTREE - s * risque;
  const tp = ENTREE + s * risque * 2;
  const res = s * (p - ENTREE);
  const stopTouche = s * (p - sl) <= 0;
  const objectifTouche = s * (p - tp) >= 0;

  // L'échelle verticale : de 3 900 à 4 100.
  const H = 300, lo = 3900, hi = 4100;
  const y = (v: number) => 14 + (1 - (v - lo) / (hi - lo)) * (H - 28);
  const G = 8, D = 64, xL = G, xR = w - D;
  const trans = calme ? undefined : "transform 0.5s cubic-bezier(.2,.8,.2,1), opacity 0.4s ease";
  const ligne = (v: number, label: string, c: string, dessous?: boolean) => (
    <g style={{ transform: `translateY(${y(v)}px)`, transition: trans }}>
      <line x1={xL} x2={xR} y1={0} y2={0} stroke={c} strokeWidth={1.6} strokeDasharray="6 4" />
      <text x={xL + 6} y={dessous ? 16 : -6} fontSize="12.5" fontWeight="700" fill={c} stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">{label}</text>
      <text x={xR + 6} y={4} fontSize="11.5" fill="var(--cap-ink-3)">{nb(v)}</text>
    </g>
  );
  const yGainHaut = sens === "long" ? y(hi) : y(ENTREE);
  const yGainBas = sens === "long" ? y(ENTREE) : y(lo);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
        <Choix label="Votre sens" valeur={sens} onChange={setSens}
          options={[{ v: "long", t: "Acheter (long)" }, { v: "short", t: "Vendre (short)" }]} />
      </div>
      <div className="mt-2 grid gap-x-6 sm:grid-cols-2">
        <Curseur label="Le prix de l'or maintenant" min={3900} max={4100} step={1} valeur={p} onChange={setP} affiche={`${nb(p)} $`} />
        <Curseur label="Distance du stop loss" min={10} max={40} step={5} valeur={risque} onChange={setRisque} affiche={`${nb(risque)} $ (objectif : ${nb(risque * 2)} $)`} />
      </div>

      <div ref={ref} className="mt-3 w-full">
        <svg viewBox={`0 0 ${w} ${H}`} width="100%" height={H} className="block" role="img"
          aria-label={`Position ${sens === "long" ? "acheteuse" : "vendeuse"} ouverte à 4 000 dollars. Stop loss à ${nb(sl)}, take profit à ${nb(tp)}, prix actuel ${nb(p)}.`}>
          <rect x={xL} width={xR - xL} y={yGainHaut} height={yGainBas - yGainHaut} fill="var(--cap-up)" opacity="0.07" style={{ transition: calme ? undefined : "all 0.5s ease" }} />
          <rect x={xL} width={xR - xL} y={sens === "long" ? y(ENTREE) : y(hi)} height={sens === "long" ? y(lo) - y(ENTREE) : y(ENTREE) - y(hi)} fill="var(--cap-down)" opacity="0.07" style={{ transition: calme ? undefined : "all 0.5s ease" }} />
          <text x={xR - 8} y={yGainHaut + 18} textAnchor="end" fontSize="12" fontStyle="italic" fill="var(--cap-up)">{sens === "long" ? "plus haut : gain" : "plus bas : gain"}</text>
          <text x={xR - 8} y={(sens === "long" ? y(lo) : y(hi) + 26) - 8} textAnchor="end" fontSize="12" fontStyle="italic" fill="var(--cap-down)">{sens === "long" ? "plus bas : perte" : "plus haut : perte"}</text>
          <g style={{ transform: `translateY(${y(p)}px)`, transition: calme ? undefined : "transform 0.12s linear" }}>
            <line x1={xL} x2={xR} y1={0} y2={0} stroke="var(--cap-ambre)" strokeWidth={2} />
            <circle cx={(xL + xR) / 2} cy={0} r={6} fill="var(--cap-ambre)" stroke="var(--cap-surface)" strokeWidth={2} />
            <text x={xR + 6} y={4} fontSize="12" fontWeight="700" fill="var(--cap-amber-ink)">{nb(p)}</text>
          </g>
          {ligne(tp, `Take profit ${nb(tp)}`, "var(--cap-up)", sens === "short")}
          {ligne(ENTREE, sens === "long" ? "Achat à 4 000" : "Vente à 4 000", "var(--cap-ink)")}
          {ligne(sl, `Stop loss ${nb(sl)}`, "var(--cap-down)", sens === "long")}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-10 gap-y-2">
        <Chiffre grand label="Gain ou perte (1 once)" valeur={`${signe(res)} $`} couleur={ton(res)} />
        <Chiffre label="Votre idée" valeur={sens === "long" ? "le prix va monter" : "le prix va baisser"} />
      </div>
      <Verdict couleur={stopTouche ? "var(--cap-down)" : objectifTouche ? "var(--cap-up)" : undefined}>
        {stopTouche
          ? <>Le prix est passé {sens === "long" ? "sous" : "au-dessus de"} votre stop loss : la position aurait été fermée à <b>{dollars(sl)}</b>, avec une perte de <b>{dollars(risque)}</b>. Sans stop, vous en seriez à {signe(res)} $.</>
          : objectifTouche
            ? <>Le prix a atteint votre take profit : la position aurait été fermée à <b>{dollars(tp)}</b>, avec un gain de <b>{dollars(risque * 2)}</b>.</>
            : res === 0
              ? <>Le prix n'a pas bougé. Faites-le monter, puis baisser, et changez de sens : {sens === "long" ? "à l'achat, vous gagnez quand ça monte" : "à la vente, vous gagnez quand ça baisse"}.</>
              : <>{sens === "long" ? "Long" : "Short"}, et le prix {p > ENTREE ? "monte" : "baisse"} de {nb(Math.abs(p - ENTREE))} $ : vous êtes <b>{res > 0 ? "en gain" : "en perte"}</b> de {nb(Math.abs(res))} $. {sens === "short" ? "Pour un short, tout s'inverse." : ""}</>}
      </Verdict>
    </div>
  );
}

/**
 * Le risque sans stop : la perte d'un achat s'arrête quand le prix touche zéro,
 * celle d'une vente grandit tant que le prix monte.
 */
export function RisqueShort() {
  const [p, setP] = useState(6000);
  const { ref, w } = useLargeur(560);
  const H = 260, G = 54, D = 14, max = 12000;
  const x = (v: number) => G + (v / max) * (w - G - D);
  const lo = -8000, hi = 4000;
  const y = (v: number) => 12 + (1 - (v - lo) / (hi - lo)) * (H - 40);
  const long = p - ENTREE, short = ENTREE - p;
  const grads = [-8000, -4000, 0, 4000];

  return (
    <div>
      <Curseur label="Un prix extrême pour l'or" min={0} max={max} step={100} valeur={p} onChange={setP} affiche={`${nb(p)} $`} />
      <div ref={ref} className="mt-2 w-full">
        <svg viewBox={`0 0 ${w} ${H}`} width="100%" height={H} className="block" role="img"
          aria-label="Le gain ou la perte d'un achat et d'une vente à 4 000 dollars, selon le prix de l'or, sans stop loss">
          {grads.map((g) => (
            <g key={g}>
              <line x1={G} x2={w - D} y1={y(g)} y2={y(g)} stroke={g === 0 ? "var(--cap-line-strong)" : "var(--cap-line-chart)"} />
              <text x={G - 6} y={y(g) + 4} textAnchor="end" fontSize="11.5" fill="var(--cap-ink-3)">{signe(g)} $</text>
            </g>
          ))}
          {[0, 4000, 8000, 12000].map((v) => (
            <text key={v} x={x(v)} y={H - 8} textAnchor={v === 0 ? "start" : v === max ? "end" : "middle"} fontSize="11.5" fill="var(--cap-ink-3)">{nb(v)} $</text>
          ))}
          <line x1={x(0)} y1={y(-ENTREE)} x2={x(max)} y2={y(max - ENTREE)} stroke="var(--cap-ocean)" strokeWidth="2.4" clipPath="url(#rs-clip)" />
          <line x1={x(0)} y1={y(ENTREE)} x2={x(max)} y2={y(ENTREE - max)} stroke="var(--cap-ink)" strokeWidth="2.4" strokeDasharray="7 4" clipPath="url(#rs-clip)" />
          <defs><clipPath id="rs-clip"><rect x={G} y={y(hi) - 2} width={w - G - D} height={y(lo) - y(hi) + 4} /></clipPath></defs>
          <circle cx={x(0)} cy={y(-ENTREE)} r="4.5" fill="var(--cap-ocean)" />
          <text x={x(0) + 8} y={y(-ENTREE) + 16} fontSize="12" fontWeight="700" fill="var(--cap-ocean)" stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">Achat : jamais plus de 4 000 $ de perte</text>
          <text x={x(8600) - 8} y={y(ENTREE - 8600) + 18} textAnchor="end" fontSize="12" fontWeight="700" fill="var(--cap-ink)" stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">Vente : la perte continue</text>
          <line x1={x(p)} x2={x(p)} y1={8} y2={H - 26} stroke="var(--cap-ambre)" strokeWidth="2" />
          <circle cx={x(p)} cy={y(Math.min(hi, Math.max(lo, long)))} r="5" fill="var(--cap-ocean)" stroke="var(--cap-surface)" strokeWidth="1.5" />
          {short >= lo && <circle cx={x(p)} cy={y(short)} r="5" fill="var(--cap-ink)" stroke="var(--cap-surface)" strokeWidth="1.5" />}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-10 gap-y-2" aria-live="polite">
        <Chiffre label="Achat (long) à 4 000 $" valeur={`${signe(long)} $`} couleur={ton(long)} />
        <Chiffre label="Vente (short) à 4 000 $" valeur={`${signe(short)} $`} couleur={ton(short)} />
      </div>
      <p className="mt-2 text-[0.95rem]" style={{ color: "var(--cap-ink-2)" }}>
        {p === 0
          ? "Le prix est à zéro : c'est le pire pour l'acheteur, et il ne peut pas descendre plus bas."
          : p > ENTREE * 2
            ? `L'or a plus que doublé : le vendeur perd déjà ${nb(p - ENTREE)} $ sur une seule once, et rien n'arrête la perte tant que le prix monte.`
            : "Poussez le curseur à fond à gauche, puis à fond à droite, et comparez les deux pertes."}
      </p>
    </div>
  );
}
