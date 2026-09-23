import type { Analysis } from "@/lib/api";
// LA VIRGULE DÉCIMALE, PAS LE POINT.
//
// Ce fichier est celui qui écrit les phrases de l'écran d'analyse, et il les
// écrivait avec `toFixed` : « ce plan a perdu 0.06 R », « volume 1.5× la
// moyenne », « une résistance est à 2.3 % au-dessus ». Dans une interface
// française c'est une faute, et c'est précisément pour elle que `fr()` existe.
import { fr } from "@/lib/SettingsContext";

/**
 * Turning an analysis into sentences.
 *
 * This is the product's actual promise — "des données financières complexes
 * en décisions compréhensibles" — so it lives in one place rather than being
 * scattered through the screen as ternaries. Every line here is derived from
 * a number the engine computed; nothing is invented, and nothing is softened.
 *
 * The rules, in order of importance:
 *
 *   1. Say the direction, then why, then what would make it wrong.
 *   2. Never state more confidence than the data supports. When the sample is
 *      thin or the bars are stale, that IS the headline.
 *   3. Name the disagreement when factors disagree. A verdict that hides its
 *      own contradiction is how a user ends up asking "pourquoi il dit de
 *      vendre alors que l'EMA dit l'inverse".
 */

export interface Reason {
  text: string;
  tone: "up" | "down" | "neutral" | "warn";
}

const FACTOR_LABELS: Record<string, string> = {
  trend: "la tendance",
  momentum: "le momentum",
  flow: "les flux",
  oscillators: "les oscillateurs",
  volume: "le volume",
};

/** Direction as a word people use, from the engine's own trend string. */
export function directionLabel(a: Analysis): { text: string; tone: "up" | "down" | "neutral" } {
  const t = (a.trend || "").toUpperCase();
  if (t.includes("BULL") || t.includes("HAUSS")) return { text: "Haussier", tone: "up" };
  if (t.includes("BEAR") || t.includes("BAISS")) return { text: "Baissier", tone: "down" };
  return { text: "Neutre", tone: "neutral" };
}

/**
 * The "why", in three to five sentences.
 *
 * Ordered by what a reader needs first: the blockers that make the setup
 * untradeable, then the factors that agree, then the ones that do not, then
 * the risk to watch.
 */
export function buildReasons(a: Analysis): Reason[] {
  const out: Reason[] = [];

  // 1. Anything that makes the verdict unusable comes before the verdict.
  a.tradeability?.blockers?.forEach((b) => out.push({ text: b, tone: "warn" }));

  // 1 bis. LES AVERTISSEMENTS, QUE PERSONNE N'AFFICHAIT.
  //
  // Le moteur les compose avec soin — « Volatilité élevée pour cet actif,
  // réduisez la taille de position », « Facteurs en désaccord (34 %) »,
  // « Confiance des données à 62 % » — et aucun écran du site ne les lisait.
  // Ils partaient dans la réponse HTTP et s'arrêtaient là.
  //
  // C'est ce qui rendait l'edge historique inerte : le seuil d'alerte
  // n'avait aucune sortie, donc tout ce qui n'allait pas jusqu'au blocage ne
  // se voyait nulle part. Un avertissement qui n'atteint pas le lecteur ne
  // se distingue pas d'un avertissement qu'on n'a pas écrit.
  a.tradeability?.warnings?.forEach((w) => out.push({ text: w, tone: "warn" }));

  if (a.data_quality?.stale) {
    out.push({
      text: "La dernière bougie est ancienne — le marché est probablement fermé, et les niveaux datent de la dernière séance.",
      tone: "warn",
    });
  }

  // 2. Les signaux que le moteur a NOMMÉS, quand il y en a.
  //
  // Ils étaient calculés et jetés : « Prix > EMA200 (zone dorée) »,
  // « Confirmé par la tendance 1wk haussière », « Volume élevé (2.0x la
  // moyenne) » — déjà en français, déjà précis, déjà chiffrés. Pendant ce
  // temps cette fonction redérivait des formulations plus faibles à partir
  // des directions de facteurs. Le moteur sait mieux que nous pourquoi il a
  // conclu ; on affiche ce qu'il dit, et la dérivation reste en repli pour
  // les actifs où il ne renvoie rien.
  const named = a.conviction;
  if (named && (named.bullish_signals?.length || named.bearish_signals?.length)) {
    named.bullish_signals?.slice(0, 4).forEach((t) => out.push({ text: t, tone: "up" }));
    named.bearish_signals?.slice(0, 3).forEach((t) => out.push({ text: t, tone: "down" }));
    if (named.bullish_signals?.length && named.bearish_signals?.length) {
      out.push({
        text: "Des signaux vont dans les deux sens — c'est ce qui limite la confiance du verdict.",
        tone: "warn",
      });
    }
    return out.slice(0, 8);
  }

  // 2 bis. Sans signaux nommés : les facteurs, séparés en ce qui s'accorde et
  // ce qui diverge.
  const dirs = a.factor_directions ?? {};
  const entries = Object.entries(dirs).filter(([, v]) => Number.isFinite(v));
  const agreeing = entries.filter(([, v]) => Math.abs(v) >= 0.25);
  const bullish = agreeing.filter(([, v]) => v > 0).map(([k]) => FACTOR_LABELS[k] ?? k);
  const bearish = agreeing.filter(([, v]) => v < 0).map(([k]) => FACTOR_LABELS[k] ?? k);

  if (bullish.length) {
    out.push({ text: `${capitalise(list(bullish))} ${agrees(bullish)} à la hausse.`, tone: "up" });
  }
  if (bearish.length) {
    out.push({ text: `${capitalise(list(bearish))} ${agrees(bearish)} à la baisse.`, tone: "down" });
  }
  // The contradiction gets its own line, named.
  if (bullish.length && bearish.length) {
    out.push({
      text: "Les facteurs se contredisent — c'est ce qui limite la confiance du verdict.",
      tone: "warn",
    });
  }

  // 3. Volume, said only when it is actually notable.
  const vr = a.indicators?.volume_ratio;
  if (typeof vr === "number" && vr >= 1.3) {
    out.push({ text: `Volume ${fr(vr, 1)}× la moyenne — le mouvement est confirmé par les échanges.`, tone: "up" });
  } else if (typeof vr === "number" && vr <= 0.6) {
    out.push({ text: `Volume à ${fr(vr, 1)}× la moyenne — peu d'échanges derrière ce mouvement.`, tone: "warn" });
  }

  // 4. Volatility, relative to this asset's own history rather than absolute.
  const vol = a.volatility_context;
  if (vol?.regime === "EXTREME" || vol?.regime === "HIGH") {
    out.push({
      text: vol.percentile != null
        ? `Volatilité au ${Math.round(vol.percentile)}ᵉ percentile de son historique — les écarts seront larges.`
        : "Volatilité élevée pour cet actif — les écarts seront larges.",
      tone: "warn",
    });
  }

  // 5. The nearest level, which is what actually stops a move.
  const px = a.price?.current;
  const res = a.levels?.resistance;
  const sup = a.levels?.support;
  if (px && res && sup) {
    const toRes = ((res - px) / px) * 100;
    const toSup = ((px - sup) / px) * 100;
    if (toRes >= 0 && toRes < 3) {
      out.push({ text: `Une résistance est à ${fr(toRes, 1)} % au-dessus — c'est le point de vigilance.`, tone: "warn" });
    } else if (toSup >= 0 && toSup < 3) {
      out.push({ text: `Un support est à ${fr(toSup, 1)} % en dessous — c'est le niveau à surveiller.`, tone: "neutral" });
    }
  }

  // 6. The market this asset lives in.
  const ctx = a.market_context;
  if (ctx && ctx.regime !== "UNKNOWN") {
    const reg = ctx.regime === "BULL" ? "haussier" : ctx.regime === "BEAR" ? "baissier" : "neutre";
    const rs = ctx.relative_strength;
    if (rs != null && Math.abs(rs) >= 5) {
      out.push({
        text: `${rs > 0 ? "Surperforme" : "Sous-performe"} ${ctx.benchmark} de ${fr(Math.abs(rs), 1)} points sur 20 périodes, dans un marché ${reg}.`,
        tone: rs > 0 ? "up" : "down",
      });
    } else if (ctx.regime !== "NEUTRAL") {
      out.push({ text: `Le marché de référence (${ctx.benchmark}) est ${reg}.`, tone: ctx.regime === "BULL" ? "up" : "down" });
    }
  }

  return out.slice(0, 6);
}

/**
 * What the engine's own backtest says about this score on this asset.
 *
 * Returned as a sentence rather than a number, and it refuses to claim
 * anything below the sample threshold — a 12-trade hit rate read as fact is
 * worse than no figure at all.
 */
/**
 * Ce que l'historique de CET actif dit du plan proposé.
 *
 * La phrase citée ici est celle du SENS proposé, pas la moyenne des deux.
 * Le replay prend l'achat au-dessus de 60 et la vente sous 40 : mesuré sur
 * BTC-USD, l'espérance globale ressortait à -0,004 R — c'est-à-dire « rien à
 * signaler » — alors que l'achat perdait 0,185 R et la vente en gagnait
 * 0,145. Les deux lectures existaient, aucune n'était rendue.
 *
 * Et la conclusion a changé de nature. Elle se terminait par « le verdict
 * reste ce qu'il est, mais l'historique ne le soutient pas » : le moteur
 * constatait que le plan avait perdu de l'argent sur cet actif, puis
 * annonçait qu'il n'en tirait aucune conséquence. Il en tire désormais une —
 * une alerte, ou un blocage quand l'effet dépasse nettement son imprécision —
 * et cette phrase dit laquelle plutôt que de s'en excuser.
 */
export function edgeSentence(a: Analysis): { text: string; tone: "up" | "down" | "warn" } | null {
  const global = a.historical_edge;
  if (!global || !global.n_trades) return null;

  // La mesure du sens proposé quand elle existe ; sinon la globale, que le
  // backend a déjà repliée dedans en marquant `base: "globale"`.
  const e = a.edge_direction ?? {
    base: "globale" as const,
    sens: null,
    n_trades: global.n_trades,
    expectancy_net_r: global.expectancy_net_r,
    se_r: null,
    win_rate: global.win_rate,
    fiable: global.enough_samples,
  };

  const portee =
    e.base === "directionnelle"
      ? e.sens === "short" ? "à la vente" : "à l'achat"
      : "les deux sens confondus";

  if (!e.fiable) {
    return {
      text: `Seulement ${e.n_trades} trades comparables dans l'historique (${portee}) — trop peu pour en tirer une statistique.`,
      tone: "warn",
    };
  }

  const exp = e.expectancy_net_r;
  if (exp == null) return null;

  if (exp < 0) {
    const bloquant = (a.tradeability?.blockers ?? []).some((b) => b.startsWith("Ce plan a déjà perdu"));
    return {
      text:
        `Sur ${e.n_trades} trades comparables ${portee}, ce plan a perdu ` +
        `${fr(Math.abs(exp), 2)} R en moyenne sur cet actif. ` +
        (bloquant
          ? "L'écart est trop net pour venir du hasard : le plan est signalé comme à éviter au-dessus."
          : "Pas assez net pour conclure, assez pour réduire la taille de position."),
      tone: "down",
    };
  }
  return {
    text: `Sur ${e.n_trades} trades comparables ${portee}, ce plan a rapporté ${fr(exp, 2)} R en moyenne${e.win_rate != null ? ` (${fr(e.win_rate, 0)} % de réussite)` : ""}.`,
    tone: "up",
  };
}

/** The scenario, said plainly and always with its basis. */
export function scenarioSentence(a: Analysis): string | null {
  const s = a.historical_edge?.scenario;
  if (!s || !s.enough) return null;
  const what =
    s.most_likely === "target" ? "l'objectif est atteint"
    : s.most_likely === "stop" ? "le stop est touché"
    : "la position expire sans toucher ni l'un ni l'autre";
  const basis = s.basis === "conditional" && s.regime
    ? `dans un marché ${s.regime === "BULL" ? "haussier" : s.regime === "BEAR" ? "baissier" : "neutre"}`
    : "toutes conditions confondues";
  return `Le plus probable : ${what} (${Math.round(s.most_likely_pct)} % des cas ${basis}, sur ${s.n_trades} trades).`;
}

/* ── helpers ──────────────────────────────────────────────────────────────── */

function list(items: string[]): string {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

/**
 * Verb and participle, agreed in number.
 *
 * Every factor label here is masculine in French ("le momentum", "les flux"),
 * so only the number varies. Writing "la tendance est orientés" once was
 * enough to show that a sentence assembled from fragments has to agree like
 * any other sentence — a grammar mistake in the one line the product exists
 * to produce undermines everything above it.
 */
function agrees(items: string[]): string {
  return items.length > 1 ? "sont orientés" : "est orienté";
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
