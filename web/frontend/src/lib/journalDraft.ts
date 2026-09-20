import type { Position } from "@/lib/api";
import type { TradingStyleProfile } from "@/lib/tradingStyle";

/**
 * Ce qu'on propose d'écrire dans le journal quand un trade vient d'être clos.
 *
 * Le journal existait, et restait vide. C'est le sort de tous les journaux de
 * trading : au moment où l'on pourrait écrire, on vient de clôturer et on n'a
 * aucune envie de ressaisir huit champs qu'on a déjà sous les yeux. Le site
 * connaît pourtant tout — symbole, sens, entrée, sortie, quantité, levier,
 * stop, objectif, durée, résultat. La seule chose à écrire, c'est ce que le
 * site ne peut pas savoir : ce que l'on pensait.
 *
 * LE CONSEIL EST TIRÉ DU TRADE, PAS D'UNE LISTE. « Respectez votre plan » ne
 * vaut rien, et l'utilisateur le sait. Chaque remarque ci-dessous ne
 * s'affiche que si le trade la justifie, elle cite les chiffres du trade, et
 * elle se tait quand il n'y a rien à dire — un journal qui trouve un reproche
 * à chaque trade se fait ignorer aussi vite qu'un journal vide.
 *
 * L'ordre suit la gravité : ce qui a coûté de l'argent d'abord.
 */

export interface JournalDraft {
  symbol: string;
  direction: "LONG" | "SHORT";
  entry_price: number;
  exit_price: number;
  quantity: number;
  pnl: number;
  result: "win" | "loss" | "breakeven";
  risk_reward: number | null;
  entry_time: string;
  exit_time: string;
  timeframe: string;
  /** Les faits, déjà rédigés. L'utilisateur complète, il ne ressaisit pas. */
  pre_trade_notes: string;
  /** Le conseil, plus une amorce de phrase à compléter. */
  post_trade_notes: string;
  /** Les remarques seules, pour les afficher en évidence dans le dialogue. */
  advice: string[];
}

/** Combien de temps la position est restée ouverte, en minutes. */
function heldMinutes(p: Position, closedAt: Date): number {
  const opened = new Date(p.created_at).getTime();
  if (!Number.isFinite(opened)) return 0;
  return Math.max(0, (closedAt.getTime() - opened) / 60000);
}

function humanDuration(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  if (min < 1440) return `${Math.round(min / 60)} h`;
  return `${Math.round(min / 1440)} jours`;
}

/**
 * Les remarques que CE trade justifie. Aucune n'est inconditionnelle.
 */
function buildAdvice(
  p: Position,
  exitPrice: number,
  pnl: number,
  style: TradingStyleProfile,
  minutes: number
): string[] {
  const out: string[] = [];
  const long = p.direction === "LONG";
  const risk = p.stop_loss != null ? Math.abs(p.entry_price - p.stop_loss) : null;
  const reward = p.take_profit != null ? Math.abs(p.take_profit - p.entry_price) : null;
  const rr = risk && reward && risk > 0 ? reward / risk : null;
  const moved = Math.abs(exitPrice - p.entry_price);

  // 1. Pas de stop. C'est le seul défaut qui peut coûter le capital entier.
  if (p.stop_loss == null) {
    out.push(
      pnl < 0
        ? "Aucun stop n'était posé. Cette perte n'avait pas de plancher : elle s'est arrêtée parce que vous avez clôturé, pas parce qu'une limite l'a arrêtée."
        : "Aucun stop n'était posé. Ça s'est bien terminé cette fois, mais le résultat ne doit rien au plan — il doit tout au marché."
    );
  }

  // 2. Un rapport qui ne paie pas, quel que soit le résultat.
  if (rr != null && rr < 1) {
    out.push(
      `Le rapport gain / risque était de 1 : ${rr.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}. ` +
        "Vous risquiez plus que vous ne visiez : il faut avoir raison bien plus d'une fois sur deux pour que ça paie."
    );
  }

  // 3. Sorti avant l'objectif alors que le trade gagnait.
  if (pnl > 0 && p.take_profit != null && reward != null && moved < reward * 0.6) {
    out.push(
      `Vous avez clôturé à ${fmtShort(exitPrice)} alors que l'objectif était à ${fmtShort(p.take_profit)} — ` +
        `environ ${Math.round((moved / reward) * 100)} % du chemin. Couper tôt sur les gagnants et tenir les perdants est le schéma qui vide un compte lentement.`
    );
  }

  // 4. Sorti au-delà du stop : la perte a dépassé ce qui était accepté.
  if (pnl < 0 && p.stop_loss != null) {
    const past = long ? exitPrice < p.stop_loss : exitPrice > p.stop_loss;
    if (past) {
      out.push(
        `La sortie (${fmtShort(exitPrice)}) est au-delà du stop prévu (${fmtShort(p.stop_loss)}). ` +
          "La perte a dépassé ce que vous aviez accepté au départ."
      );
    }
  }

  // 5. Le levier, seulement quand il a réellement pesé.
  if (p.leverage > 1 && pnl < 0) {
    const sans = pnl / p.leverage;
    out.push(
      `Le levier ×${p.leverage} a transformé ${fmtMoney(sans)} de variation en ${fmtMoney(pnl)}. ` +
        "Sans levier, la même erreur de lecture coûtait ce premier montant."
    );
  }

  // 6. La durée, confrontée à l'horizon DÉCLARÉ. C'est là que le style de
  //    trading cesse d'être une étiquette : tenir trois jours en scalping
  //    n'est pas du scalping, c'est un trade qu'on n'a pas su couper.
  const attendu = expectedMinutes(style.id);
  if (attendu && minutes > attendu * 4) {
    out.push(
      `Position tenue ${humanDuration(minutes)}, pour un horizon « ${style.label.fr} » (${style.horizon.fr}). ` +
        "Une position qui déborde largement de son horizon n'est plus celle que vous aviez prévue."
    );
  }

  // 7. Rien à redire : on le dit aussi, plutôt que d'inventer un reproche.
  if (out.length === 0) {
    out.push(
      pnl >= 0
        ? "Rien à redire sur l'exécution : niveaux posés, sortie cohérente avec le plan. Notez ce qui vous a fait entrer — c'est cette partie-là qui se répète."
        : "L'exécution a suivi le plan ; c'est le plan qui n'a pas fonctionné. Une perte dans les règles est le coût normal du métier, pas une erreur."
    );
  }
  return out;
}

/** Durée typique d'un trade pour cet horizon, en minutes. */
function expectedMinutes(id: string): number | null {
  return { scalp: 15, day: 240, swing: 7 * 1440, long: null as never }[id as "scalp"] ?? null;
}

/* Deux formateurs locaux, volontairement indépendants des réglages de devise :
   ce texte part dans la base du journal et doit rester lisible tel quel, même
   si l'utilisateur change de devise d'affichage ensuite. */
function fmtShort(v: number): string {
  const d = Math.abs(v) >= 100 ? 2 : Math.abs(v) >= 1 ? 3 : 5;
  return v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtMoney(v: number): string {
  return `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export function draftFromPosition(
  p: Position,
  exitPrice: number,
  pnl: number,
  style: TradingStyleProfile
): JournalDraft {
  const closedAt = new Date();
  const minutes = heldMinutes(p, closedAt);
  const long = p.direction === "LONG";

  const risk = p.stop_loss != null ? Math.abs(p.entry_price - p.stop_loss) : null;
  const reward = p.take_profit != null ? Math.abs(p.take_profit - p.entry_price) : null;
  const rr = risk && reward && risk > 0 ? Number((reward / risk).toFixed(2)) : null;

  const advice = buildAdvice(p, exitPrice, pnl, style, minutes);

  // Les faits, écrits pour être relus dans six mois : ce sont ceux que la
  // mémoire déforme en premier.
  const pre = [
    `${p.symbol} · ${long ? "achat" : "vente à découvert"}${p.leverage > 1 ? ` · levier ×${p.leverage}` : ""}`,
    `Entrée à ${fmtShort(p.entry_price)}, sortie à ${fmtShort(exitPrice)} après ${humanDuration(minutes)}.`,
    p.stop_loss != null || p.take_profit != null
      ? `Plan : stop ${p.stop_loss != null ? fmtShort(p.stop_loss) : "aucun"}, objectif ${p.take_profit != null ? fmtShort(p.take_profit) : "aucun"}${rr != null ? `, rapport 1 : ${rr.toLocaleString("fr-FR")}` : ""}.`
      : "Aucun niveau n'était posé au départ.",
    `Résultat : ${pnl >= 0 ? "+" : ""}${fmtMoney(pnl)} sur ${fmtMoney(p.amount)} engagés.`,
    "",
    "Pourquoi suis-je entré ? ",
  ].join("\n");

  const post = [
    ...advice.map((a) => `• ${a}`),
    "",
    "Ce que je referais pareil : ",
    "Ce que je changerais : ",
  ].join("\n");

  return {
    symbol: p.symbol,
    direction: p.direction === "SHORT" ? "SHORT" : "LONG",
    entry_price: p.entry_price,
    exit_price: exitPrice,
    quantity: p.quantity,
    pnl: Number(pnl.toFixed(2)),
    result: pnl > 0 ? "win" : pnl < 0 ? "loss" : "breakeven",
    risk_reward: rr,
    entry_time: p.created_at,
    exit_time: closedAt.toISOString(),
    timeframe: style.defaultTimeframe,
    pre_trade_notes: pre,
    post_trade_notes: post,
    advice,
  };
}
