"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { DUR, EASE, Text } from "@/components/design-system";

/**
 * Les schémas des leçons.
 *
 * Une leçon qui explique l'anatomie d'un chandelier japonais en prose seule
 * demande au lecteur de dessiner la figure dans sa tête à partir de quatre
 * définitions. C'est exactement le travail qu'une image fait à sa place, et
 * c'est le travail le plus utile qu'elle puisse faire ici : ces leçons
 * décrivent des formes — un corps, une mèche, un palier, un rapport de
 * distances. Les décrire sans les montrer est un choix par défaut, pas un
 * choix.
 *
 * Trois règles, qui expliquent pourquoi ce sont des SVG écrits à la main
 * plutôt que des images :
 *
 *   1. ils suivent les jetons de couleur, donc le thème clair comme le thème
 *      sombre, et la palette calmée s'y applique sans retouche ;
 *   2. ils pèsent quelques centaines d'octets et restent nets à toute taille,
 *      là où une capture d'écran se pixellise et vieillit dès que l'interface
 *      bouge ;
 *   3. ils sont légendés dans le DOM, donc lisibles par un lecteur d'écran —
 *      une image de chandelier sans texte n'apprend rien à qui ne la voit pas.
 *
 * Chaque schéma ne montre qu'une idée. Un schéma qui montre tout est un
 * schéma qu'on ne lit pas.
 */

const W = 560;
const H = 260;

function Frame({
  children,
  caption,
  label,
}: {
  children: React.ReactNode;
  caption: string;
  label: string;
}) {
  return (
    /* La largeur est portée par <figure> et non par le cadre : la légende
       décrit le dessin, elle doit donc s'aligner dessus plutôt que courir sur
       toute la largeur du panneau. */
    <figure className="mx-auto my-6 w-full max-w-[600px]">
      {/* Borné et centré. Sur un panneau large, un viewBox de 560x260 étiré
          sur onze cents pixels devient un bandeau : les traits s'amincissent,
          le texte reste à sa taille, et l'œil ne relie plus une annotation à
          ce qu'elle désigne. Un schéma a une taille de lecture. */}
      <div
        className="w-full overflow-hidden rounded-[12px] p-4"
        style={{ backgroundColor: "var(--cap-bg)" }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label={label}
          style={{ maxHeight: 280 }}
        >
          {children}
        </svg>
      </div>
      <figcaption>
        <Text size="caption" className="mt-2.5">{caption}</Text>
      </figcaption>
    </figure>
  );
}

/** Un chandelier, dessiné à partir de ses quatre prix. */
function Candle({
  x,
  open,
  close,
  high,
  low,
  width = 34,
}: {
  x: number;
  open: number;
  close: number;
  high: number;
  low: number;
  width?: number;
}) {
  const up = close < open; // en coordonnées SVG, y augmente vers le bas
  const colour = up ? "var(--cap-up)" : "var(--cap-down)";
  const top = Math.min(open, close);
  const height = Math.max(2, Math.abs(close - open));
  return (
    <g>
      <line x1={x} x2={x} y1={high} y2={low} stroke={colour} strokeWidth="2" />
      <rect
        x={x - width / 2}
        y={top}
        width={width}
        height={height}
        fill={up ? "var(--cap-up-soft)" : "var(--cap-down-soft)"}
        stroke={colour}
        strokeWidth="2"
        rx="2"
      />
    </g>
  );
}

function Tag({ x, y, children, anchor = "start" }: {
  x: number; y: number; children: string; anchor?: "start" | "middle" | "end";
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize="12"
      fill="var(--cap-ink-2)"
      style={{ fontFamily: "var(--cap-font-text)" }}
    >
      {children}
    </text>
  );
}

function Leader({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--cap-ink-4)" strokeWidth="1" strokeDasharray="3 3" />
  );
}

/* ── 1. L'anatomie d'un chandelier ──────────────────────────────────────── */

export function CandleAnatomy() {
  return (
    <Frame
      label="Un chandelier haussier et un chandelier baissier, avec leurs quatre prix annotés"
      caption="Une bougie résume toute une période en quatre prix. Le corps va de l'ouverture à la clôture ; les mèches marquent les extrêmes atteints entre les deux."
    >
      {/* Haussier, entièrement annoté. Les deux séries d'étiquettes partent
          vers la droite : placées en vis-à-vis, elles se rejoignaient au
          centre et « Clôture Ouverture » se lisait comme une seule ligne. */}
      <Candle x={70} open={180} close={95} high={58} low={212} />
      <Leader x1={70} y1={58} x2={128} y2={58} />
      <Tag x={134} y={62}>Plus haut</Tag>
      <Leader x1={88} y1={95} x2={128} y2={95} />
      <Tag x={134} y={99}>Clôture</Tag>
      <Leader x1={88} y1={180} x2={128} y2={180} />
      <Tag x={134} y={184}>Ouverture</Tag>
      <Leader x1={70} y1={212} x2={128} y2={212} />
      <Tag x={134} y={216}>Plus bas</Tag>
      <Tag x={70} y={244} anchor="middle">Hausse</Tag>

      {/* Baissier : seuls l'ouverture et la clôture s'inversent, donc seules
          elles sont rappelées. Répéter les quatre serait du bruit. */}
      <Candle x={330} open={95} close={180} high={58} low={212} />
      <Leader x1={348} y1={95} x2={388} y2={95} />
      <Tag x={394} y={99}>Ouverture</Tag>
      <Leader x1={348} y1={180} x2={388} y2={180} />
      <Tag x={394} y={184}>Clôture</Tag>
      <Tag x={330} y={244} anchor="middle">Baisse</Tag>
    </Frame>
  );
}

/* ── 2. Support et résistance ───────────────────────────────────────────── */

export function SupportResistance() {
  const reduce = useReducedMotion();
  // Un prix qui bute deux fois en haut et rebondit deux fois en bas.
  const d =
    "M 30 150 L 80 90 L 120 130 L 170 88 L 215 140 L 260 195 L 305 150 L 350 198 L 395 120 L 450 92 L 510 140";
  return (
    <Frame
      label="Une courbe de prix qui bute deux fois sur une résistance et rebondit deux fois sur un support"
      caption="Un support est un plancher où les acheteurs reviennent ; une résistance, un plafond où les vendeurs reprennent la main. Ce sont des zones observées, pas des garanties : elles cèdent régulièrement."
    >
      <line x1="20" y1="90" x2="540" y2="90" stroke="var(--cap-down)" strokeWidth="1.5" strokeDasharray="6 4" />
      <Tag x={540} y={82} anchor="end">Résistance</Tag>
      <line x1="20" y1="196" x2="540" y2="196" stroke="var(--cap-up)" strokeWidth="1.5" strokeDasharray="6 4" />
      <Tag x={540} y={214} anchor="end">Support</Tag>

      <motion.path
        d={d}
        fill="none"
        stroke="var(--cap-ocean)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: DUR.draw, ease: EASE }}
      />
      {/* Les points de contact, qui sont ce qui définit le niveau. */}
      {[[170, 88], [450, 92]].map(([cx, cy], i) => (
        <circle key={`r${i}`} cx={cx} cy={cy} r="4" fill="var(--cap-down)" />
      ))}
      {[[260, 195], [350, 198]].map(([cx, cy], i) => (
        <circle key={`s${i}`} cx={cx} cy={cy} r="4" fill="var(--cap-up)" />
      ))}
    </Frame>
  );
}

/* ── 3. Le rapport risque / rendement ───────────────────────────────────── */

export function RiskReward() {
  const gid = `rr-${useId().replace(/:/g, "")}`;
  return (
    <Frame
      label="L'entrée, le stop en dessous et l'objectif au-dessus, avec les distances comparées"
      caption="Le rapport compare ce que vous risquez à ce que vous visez. À 1 pour 2, vous pouvez vous tromper deux fois sur trois et rester à l'équilibre — c'est ce calcul, pas le taux de réussite, qui décide du résultat."
    >
      <defs>
        <marker id={`${gid}-a`} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--cap-ink-3)" />
        </marker>
      </defs>

      {/* Les trois niveaux */}
      <line x1="40" y1="60" x2="430" y2="60" stroke="var(--cap-up)" strokeWidth="1.5" strokeDasharray="6 4" />
      <Tag x={440} y={64}>Objectif</Tag>
      <line x1="40" y1="150" x2="430" y2="150" stroke="var(--cap-ocean)" strokeWidth="2" />
      <Tag x={440} y={154}>Entrée</Tag>
      <line x1="40" y1="195" x2="430" y2="195" stroke="var(--cap-down)" strokeWidth="1.5" strokeDasharray="6 4" />
      <Tag x={440} y={199}>Stop</Tag>

      {/* Les deux distances, à la même échelle — c'est là tout le propos, et
          c'est justement pourquoi elles sont en teinte franche : ces deux
          rectangles n'ont ni contour ni légende, la couleur est leur seule
          façon de dire lequel est le gain et lequel est le risque. */}
      <rect x="80" y="60" width="30" height="90" fill="var(--cap-up-fill)" rx="3" />
      <rect x="80" y="150" width="30" height="45" fill="var(--cap-down-fill)" rx="3" />

      <line x1="150" y1="150" x2="150" y2="64" stroke="var(--cap-ink-3)" strokeWidth="1" markerEnd={`url(#${gid}-a)`} />
      <Tag x={158} y={108}>Gain visé : 2</Tag>
      <line x1="150" y1="150" x2="150" y2="193" stroke="var(--cap-ink-3)" strokeWidth="1" markerEnd={`url(#${gid}-a)`} />
      <Tag x={158} y={178}>Risque : 1</Tag>

      <Tag x={40} y={238}>Rapport de 1 pour 2</Tag>
    </Frame>
  );
}

/* ── 4. Les types d'ordres ──────────────────────────────────────────────── */

export function OrderTypes() {
  return (
    <Frame
      label="Un ordre au marché exécuté au prix courant, un ordre limité en attente sous le prix"
      caption="L'ordre au marché achète tout de suite, au prix disponible. L'ordre limité attend votre prix — et n'est jamais exécuté si le marché ne vient pas le chercher."
    >
      <line x1="30" y1="120" x2="530" y2="120" stroke="var(--cap-line-strong)" strokeWidth="1" />
      <Tag x={30} y={40}>Prix du marché</Tag>
      <circle cx="270" cy="120" r="6" fill="var(--cap-ocean)" />
      <Leader x1={270} y1={60} x2={270} y2={112} />
      <Tag x={270} y={56} anchor="middle">120,00 €</Tag>

      {/* Au marché : exécuté ici, tout de suite */}
      <rect x="60" y="150" width="180" height="62" rx="10" fill="var(--cap-up-soft)" />
      <text x="150" y="176" textAnchor="middle" fontSize="13" fill="var(--cap-ink)" style={{ fontFamily: "var(--cap-font-text)", fontWeight: 600 }}>
        Au marché
      </text>
      <text x="150" y="196" textAnchor="middle" fontSize="11.5" fill="var(--cap-ink-2)" style={{ fontFamily: "var(--cap-font-text)" }}>
        Exécuté à 120,00 €
      </text>
      <Leader x1={150} y1={150} x2={264} y2={122} />

      {/* Limité : en attente plus bas */}
      <rect x="320" y="150" width="190" height="62" rx="10" fill="var(--cap-surface-2)" />
      <text x="415" y="176" textAnchor="middle" fontSize="13" fill="var(--cap-ink)" style={{ fontFamily: "var(--cap-font-text)", fontWeight: 600 }}>
        Limité à 115,00 €
      </text>
      <text x="415" y="196" textAnchor="middle" fontSize="11.5" fill="var(--cap-ink-2)" style={{ fontFamily: "var(--cap-font-text)" }}>
        En attente — rien n&apos;est acheté
      </text>
      <line x1="320" y1="181" x2="276" y2="140" stroke="var(--cap-ink-4)" strokeWidth="1" strokeDasharray="3 3" />
    </Frame>
  );
}

/* ── 5. La taille de position ───────────────────────────────────────────── */

export function PositionSizing() {
  return (
    <Frame
      label="Un capital de 10 000 €, dont 1 % risqué, et la taille de position qui en découle"
      caption="On part du risque, pas de l'envie. 1 % de 10 000 € fait 100 € de perte maximale ; si le stop est à 5 % sous l'entrée, la position vaut 2 000 €. La taille est un résultat, jamais un point de départ."
    >
      {/* Le capital */}
      <rect x="40" y="50" width="480" height="30" rx="6" fill="var(--cap-surface-2)" />
      <rect x="40" y="50" width="4.8" height="30" rx="2" fill="var(--cap-down)" />
      <Tag x={40} y={40}>Capital : 10 000 €</Tag>
      <Tag x={520} y={40} anchor="end">Risque accepté : 1 % = 100 €</Tag>

      {/* La chaîne de déduction, dans l'ordre où on la calcule */}
      {[
        ["1", "Perte maximale", "100 €"],
        ["2", "Distance du stop", "5 %"],
        ["3", "Taille de position", "2 000 €"],
      ].map(([n, label, value], i) => {
        const x = 40 + i * 168;
        return (
          <g key={n}>
            <rect x={x} y="120" width="146" height="74" rx="10" fill="var(--cap-surface)" />
            <text x={x + 14} y="144" fontSize="11" fill="var(--cap-ink-3)" style={{ fontFamily: "var(--cap-font-text)" }}>
              {n}. {label}
            </text>
            <text x={x + 14} y="174" fontSize="19" fill="var(--cap-ink)" style={{ fontFamily: "var(--cap-font-num)" }}>
              {value}
            </text>
            {i < 2 && (
              <text x={x + 156} y="164" fontSize="15" fill="var(--cap-ink-4)" style={{ fontFamily: "var(--cap-font-text)" }}>
                →
              </text>
            )}
          </g>
        );
      })}
    </Frame>
  );
}

/* ── 6. La tendance ─────────────────────────────────────────────────────── */

export function TrendShape() {
  const reduce = useReducedMotion();
  return (
    <Frame
      label="Une tendance haussière faite de sommets et de creux de plus en plus hauts"
      caption="Une tendance haussière n'est pas « ça monte » : c'est une suite de sommets plus hauts ET de creux plus hauts. Le jour où un creux passe sous le précédent, la structure est cassée."
    >
      <motion.path
        d="M 30 210 L 100 140 L 145 175 L 215 105 L 265 145 L 340 70 L 390 110 L 470 50 L 520 85"
        fill="none"
        stroke="var(--cap-up)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: DUR.draw, ease: EASE }}
      />
      {/* Sommets */}
      {[[100, 140], [215, 105], [340, 70], [470, 50]].map(([cx, cy], i) => (
        <g key={`h${i}`}>
          <circle cx={cx} cy={cy} r="4" fill="var(--cap-up)" />
          {i > 0 && (
            <line x1={cx} y1={cy} x2={[100, 215, 340, 470][i - 1]} y2={[140, 105, 70, 50][i - 1]}
              stroke="var(--cap-up)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
          )}
        </g>
      ))}
      <Tag x={470} y={38} anchor="middle">Sommets plus hauts</Tag>
      {/* Creux */}
      {[[145, 175], [265, 145], [390, 110]].map(([cx, cy], i) => (
        <circle key={`l${i}`} cx={cx} cy={cy} r="4" fill="var(--cap-ocean)" />
      ))}
      <Tag x={145} y={198}>Creux plus hauts</Tag>
    </Frame>
  );
}

/* ── L'aiguillage ───────────────────────────────────────────────────────── */

/**
 * Quelle leçon reçoit quel schéma.
 *
 * Aucune leçon n'a de schéma par défaut. Une illustration décorative posée
 * sur une leçon qu'elle n'illustre pas coûte de la place et de la confiance :
 * le lecteur essaie d'y lire quelque chose, n'y trouve rien, et se méfie des
 * suivantes.
 */
const BY_LESSON: Record<string, () => JSX.Element> = {
  "technical-analysis/reading-charts": CandleAnatomy,
  "technical-analysis/support-resistance": SupportResistance,
  "technical-analysis/trend-indicators": TrendShape,
  "risk-management/risk-basics": RiskReward,
  "risk-management/position-sizing": PositionSizing,
  "trading-basics/order-types": OrderTypes,
  "orders-and-markets/market-vs-limit": OrderTypes,
  "trading-styles/trend-following": TrendShape,
};

export function LessonDiagram({ lessonKey }: { lessonKey: string }) {
  const Diagram = BY_LESSON[lessonKey];
  return Diagram ? <Diagram /> : null;
}

