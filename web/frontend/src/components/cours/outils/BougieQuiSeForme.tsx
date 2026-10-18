"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { fmt, type Bougie } from "@/lib/cours/marche";
import { BoutonSignal, ChoixSignal, LienSignal, RecommencerSignal, RetourSignal, useLargeurSignal, useCalmeSignal } from "./ElementsSignaux";

/**
 * Une bougie qui se forme sous vos yeux, contre un niveau. Tant qu'elle n'est
 * pas fermée, sa mèche, son corps et même sa couleur peuvent encore changer :
 * c'est tout l'intérêt d'attendre la clôture. On peut agir pendant qu'elle se
 * forme (acheter, vendre), puis on voit ce qu'elle était vraiment à la fin.
 */
export interface ScenarioBougie {
  nom: string;
  /** Les prix successifs pendant la vie de la bougie : le premier est l'ouverture, le dernier la clôture. */
  chemin: number[];
  /** La conclusion si l'on a agi avant la clôture (html). */
  siAction: string;
  /** La conclusion si l'on a attendu (html). */
  sansAction: string;
}

export function BougieQuiSeForme({ avant, niveau, scenarios, action = "Acheter maintenant", minutes = 60, decimales }: {
  avant: Bougie[];
  niveau: { prix: number; label: string; couleur: string };
  scenarios: ScenarioBougie[];
  action?: string;
  /** La durée de la bougie, en minutes (pour l'horloge). */
  minutes?: number;
  decimales?: number;
}) {
  const reduce = useCalmeSignal();
  const { ref, w: W } = useLargeurSignal(560);
  const [s, setS] = useState(0);
  const [t, setT] = useState(0);
  const [joue, setJoue] = useState(false);
  const [acte, setActe] = useState<{ t: number; prix: number } | null>(null);
  const minuterie = useRef<number | null>(null);
  const sc = scenarios[s];
  const nPas = sc.chemin.length - 1;
  const fini = t >= nPas;

  useEffect(() => {
    if (!joue || reduce) return;
    minuterie.current = window.setInterval(() => {
      setT((x) => {
        if (x >= nPas - 1) { setJoue(false); return nPas; }
        return x + 1;
      });
    }, 260);
    return () => { if (minuterie.current) window.clearInterval(minuterie.current); };
  }, [joue, reduce, nPas]);

  const recommencer = (nouveau = s) => { setS(nouveau); setT(0); setJoue(false); setActe(null); };

  // La bougie telle qu'elle est à l'instant t.
  const vu = sc.chemin.slice(0, t + 1);
  const o = vu[0], c = vu[vu.length - 1];
  const h = Math.max(...vu), l = Math.min(...vu);

  // L'échelle couvre tout le chemin : la bougie ne sort jamais du cadre.
  const tous = [...avant.flatMap((b) => [b.h, b.l]), ...sc.chemin, niveau.prix];
  const lo0 = Math.min(...tous), hi0 = Math.max(...tous);
  const pad = (hi0 - lo0) * 0.1;
  const lo = lo0 - pad, hi = hi0 + pad;
  const H = W < 480 ? 250 : 290;
  const D = 70, G = 6;
  const plotW = W - G - D;
  const n = avant.length + 2;
  const slot = plotW / n;
  const x = (i: number) => G + (i + 0.5) * slot;
  const y = (p: number) => 10 + (1 - (p - lo) / (hi - lo)) * (H - 20);
  const corps = Math.max(4, slot * 0.6);
  const ecr = (p: number) => fmt(p, decimales);
  const restant = Math.round(minutes * (1 - t / nPas));
  const iB = avant.length;

  const dessin = (b: { o: number; h: number; l: number; c: number }, i: number, opacite = 1, forte = false) => {
    const col = b.c >= b.o ? "var(--cap-up-fill)" : "var(--cap-down-fill)";
    return (
      <g key={i} opacity={opacite}>
        <line x1={x(i)} x2={x(i)} y1={y(b.h)} y2={y(b.l)} stroke={col} strokeWidth={forte ? 2.4 : 1.2} />
        <rect x={x(i) - (forte ? corps * 0.75 : corps / 2)} width={forte ? corps * 1.5 : corps} y={Math.min(y(b.o), y(b.c))}
          height={Math.max(1.5, Math.abs(y(b.o) - y(b.c)))} fill={col} rx="1.5" />
      </g>
    );
  };

  return (
    <div>
      {scenarios.length > 1 && (
        <div className="mb-2">
          <ChoixSignal label="Choisir la bougie" options={scenarios.map((x) => x.nom)} valeur={s} onChange={(k) => recommencer(k)} />
        </div>
      )}
      <div ref={ref} className="w-full">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" className="block"
          aria-label={`Une bougie de ${minutes} minutes en train de se former, face au niveau ${niveau.label} à ${ecr(niveau.prix)}`}>
          <line x1={G} x2={G + plotW} y1={y(niveau.prix)} y2={y(niveau.prix)} stroke={niveau.couleur} strokeWidth="1.6" strokeDasharray="6 4" />
          <text x={G + 4} y={y(niveau.prix) - 7} fontSize="12" fontWeight="700" fill={niveau.couleur}
            stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">{niveau.label}</text>
          <text x={G + plotW + 6} y={y(niveau.prix) + 4} fontSize="11.5" fill={niveau.couleur} fontWeight="600">{ecr(niveau.prix)}</text>
          {avant.map((b, i) => dessin(b, i, 0.75))}
          {/* La bougie en cours, dans son cadre */}
          <rect x={x(iB + 0.5) - corps * 1.3} width={corps * 2.6} y={6} height={H - 12} rx="6"
            fill="none" stroke="var(--cap-line-strong)" strokeDasharray="3 3" />
          {dessin({ o, h, l, c }, iB + 0.5, 1, true)}
          {/* Le prix en direct */}
          <line x1={x(iB + 0.5) + corps} x2={G + plotW} y1={y(c)} y2={y(c)} stroke="var(--cap-ambre)" strokeWidth="1.2" />
          <rect x={G + plotW + 2} y={y(c) - 9} width={D - 4} height={18} rx="4" fill="var(--cap-surface)" stroke="var(--cap-ambre)" strokeWidth="1.5" />
          <text x={G + plotW + 6} y={y(c) + 4} fontSize="11.5" fontWeight="700" fill="var(--cap-ink)">{ecr(c)}</text>
          {acte && (
            <g>
              <circle cx={x(iB + 0.5) - corps * 1.7} cy={y(acte.prix)} r="5" fill="var(--cap-ink)" stroke="var(--cap-surface)" strokeWidth="1.5" />
              <text x={x(iB + 0.5) - corps * 1.7 - 9} y={y(acte.prix) + 4} textAnchor="end" fontSize="12" fontWeight="700" fill="var(--cap-ink)"
                stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">Vous, à {ecr(acte.prix)}</text>
            </g>
          )}
          <text x={x(iB + 0.5)} y={H - 12} textAnchor="middle" fontSize="12" fontStyle="italic" fill="var(--cap-ink-3)"
            style={{ fontFamily: "var(--cap-font-display)" }}>
            {fini ? "fermée" : t === 0 ? "pas commencée" : `encore ${restant} min`}
          </text>
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!fini && !reduce && (
          <BoutonSignal onClick={() => setJoue(!joue)}>
            {joue ? <><Pause size={15} /> Pause</> : <><Play size={15} /> {t === 0 ? "Lancer la bougie" : "Reprendre"}</>}
          </BoutonSignal>
        )}
        {!fini && reduce && (
          <BoutonSignal onClick={() => setT(Math.min(nPas, t + Math.max(1, Math.round(nPas / 6))))}>
            Avancer de {Math.round(minutes / 6)} min
          </BoutonSignal>
        )}
        {!fini && t > 0 && !acte && (
          <LienSignal onClick={() => setActe({ t, prix: c })}>{action}, à {ecr(c)}</LienSignal>
        )}
        {fini && <RecommencerSignal onClick={() => recommencer()} label="Rejouer cette bougie" />}
      </div>
      <RetourSignal className="mt-2">
        {!fini
          ? acte
            ? `C'est fait : vous avez agi à ${ecr(acte.prix)}, avec encore ${Math.round(minutes * (1 - acte.t / nPas))} minutes avant la clôture. Voyons la fin.`
            : t === 0
              ? "Lancez la bougie. Vous pouvez agir à tout moment, ou attendre qu'elle soit fermée."
              : `Le prix est à ${ecr(c)}, le plus haut à ${ecr(h)}. La bougie n'est pas encore fermée.`
          : <span dangerouslySetInnerHTML={{ __html: `Clôture à <b>${ecr(c)}</b> (plus haut ${ecr(h)}, plus bas ${ecr(l)}). ` + (acte ? sc.siAction : sc.sansAction) }} />}
      </RetourSignal>
    </div>
  );
}
