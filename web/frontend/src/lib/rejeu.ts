import type { FilmStrategie, ReglesStrategie, TradeFilm } from "@/lib/api";

/**
 * Le rejeu d'un test, calculé une fois pour toutes les bougies : ce qui se
 * passe à chaque date (entrées, sorties, refus), le capital jour après jour,
 * l'achat-conservation en face. L'écran n'a plus qu'à lire la case du jour.
 */

export type Evenement =
  | { i: number; type: "entree"; n: number; trade: TradeFilm }
  | { i: number; type: "sortie"; n: number; trade: TradeFilm }
  | { i: number; type: "refus"; score: number | null };

export interface Rejeu {
  evenements: Evenement[];
  /** Index des bougies où quelque chose arrive : les arrêts de la lecture. */
  arrets: number[];
  /** Le capital (100 au départ) à la clôture de chaque bougie, position ouverte comprise. */
  capital: number[];
  /** Acheter au début et garder, en base 100. */
  conserve: number[];
  /** Le pire recul depuis un sommet, en %, jusqu'à chaque bougie. */
  recul: number[];
  /** Le trade ouvert à chaque bougie (index dans film.trades), ou -1. */
  ouvert: Int32Array;
  /** Toutes les conditions calculables vraies, bougie par bougie. */
  toutes: Uint8Array;
}

export function preparer(f: FilmStrategie): Rejeu {
  const n = f.dates.length;
  const rp = f.risque_pct / 100;
  const achat = f.sens === "achat";
  const ouvert = new Int32Array(n).fill(-1);
  f.trades.forEach((t, k) => { for (let i = t.i_e; i < t.i_s; i++) ouvert[i] = k; });

  const evenements: Evenement[] = [];
  f.trades.forEach((t, k) => {
    evenements.push({ i: t.i_e, type: "entree", n: k, trade: t });
    evenements.push({ i: t.i_s, type: "sortie", n: k, trade: t });
  });
  f.refus.forEach((r) => evenements.push({ i: r.i, type: "refus", score: r.score }));
  // À la même date, une sortie précède l'entrée suivante.
  const ordre = { sortie: 0, refus: 1, entree: 2 };
  evenements.sort((a, b) => a.i - b.i || ordre[a.type] - ordre[b.type]);
  const arrets = Array.from(new Set(evenements.map((e) => e.i))).sort((a, b) => a - b);

  const capital = new Array<number>(n).fill(100);
  const conserve = new Array<number>(n).fill(100);
  const recul = new Array<number>(n).fill(0);
  const sorties = new Map<number, TradeFilm>();
  f.trades.forEach((t) => sorties.set(t.i_s, t));
  const c0 = f.c[f.debut] ?? 1;
  let ferme = 1, pic = 1, pire = 0;
  for (let i = 0; i < n; i++) {
    const s = sorties.get(i);
    if (s && i >= f.debut) ferme *= 1 + rp * s.r;
    let val = ferme;
    const k = ouvert[i];
    const ci = f.c[i];
    if (k >= 0 && ci != null) {
      const t = f.trades[k];
      val = ferme * (1 + rp * rLatent(t, ci, achat));
    }
    capital[i] = val * 100;
    conserve[i] = i < f.debut || ci == null ? 100 : (ci / c0) * 100;
    if (i >= f.debut) {
      pic = Math.max(pic, val);
      pire = Math.min(pire, val / pic - 1);
    }
    recul[i] = pire * 100;
  }

  const toutes = new Uint8Array(n);
  const masques = f.conditions.map((c) => c.masque).filter((m): m is string => !!m);
  for (let i = 0; i < n; i++) toutes[i] = masques.length && masques.every((m) => m[i] === "1") ? 1 : 0;

  return { evenements, arrets, capital, conserve, recul, ouvert, toutes };
}

export function rLatent(t: TradeFilm, cours: number, achat: boolean): number {
  const risque = Math.abs(t.entree - t.stop) || 1;
  return (achat ? cours - t.entree : t.entree - cours) / risque;
}

/** Les trades fermés jusqu'à la bougie i : de quoi tenir le score en direct. */
export function bilan(f: FilmStrategie, i: number) {
  const faits = f.trades.filter((t) => t.i_s <= i);
  const rs = faits.map((t) => t.r);
  const gagnants = rs.filter((r) => r > 0).length;
  return {
    trades: faits.length,
    gagnants,
    taux: faits.length ? (gagnants / faits.length) * 100 : null,
    rTotal: rs.reduce((a, b) => a + b, 0),
  };
}

// ── Les mots ───────────────────────────────────────────────────────────────

export function prix(x: number | null | undefined): string {
  if (x == null || !Number.isFinite(x)) return "—";
  const a = Math.abs(x);
  const d = a >= 1000 ? 0 : a >= 10 ? 2 : a >= 1 ? 3 : 4;
  return x.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function nombre(x: number, d = 1): string {
  return x.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function signe(x: number, d = 1): string {
  // Arrondi d'abord : pas de « −0,0 ».
  const r = Number(x.toFixed(d));
  if (r === 0) return nombre(0, d);
  return `${r > 0 ? "+" : "−"}${nombre(Math.abs(r), d)}`;
}

export function compact(x: number | null | undefined): string {
  if (x == null || !Number.isFinite(x)) return "—";
  if (Math.abs(x) >= 1e9) return `${nombre(x / 1e9, 1)} Md`;
  if (Math.abs(x) >= 1e6) return `${nombre(x / 1e6, 1)} M`;
  if (Math.abs(x) >= 1e3) return `${nombre(x / 1e3, 0)} k`;
  return nombre(x, 0);
}

export function dateLongue(iso: string, jour = false): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("fr-FR", { weekday: jour ? "long" : undefined, day: "numeric", month: "long", year: "numeric" });
}

export function dateCourte(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
}

export function pluriel(unite: string, k: number): string {
  return `${k} ${unite}${k > 1 ? "s" : ""}`;
}

/** Ce que Nimbo dit à chaque événement, avec les chiffres du trade. */
export function recit(e: Evenement, f: FilmStrategie, regles: ReglesStrategie | null): string {
  const achat = f.sens === "achat";
  if (e.type === "refus") {
    const sc = regles?.conditions.find((c): c is Extract<typeof c, { type: "score_nimbo" }> => c.type === "score_nimbo");
    const min = sc?.min;
    return e.score == null
      ? "Vos conditions sont réunies, mais je n'ai pas pu calculer mon score ce jour-là : pas d'entrée."
      : `Vos conditions sont réunies, mais mon score n'est que de ${e.score}${min != null ? ` : vous demandez au moins ${min}` : ""}. Pas d'entrée.`;
  }
  const t = e.trade;
  if (e.type === "entree") {
    return `Toutes vos conditions sont réunies à la clôture : ${achat ? "j'achète" : "je vends à découvert"} à ${prix(t.entree)}. `
      + `Stop à ${prix(t.stop)}, soit ${nombre(f.stop_atr, 1)} fois la volatilité moyenne ; objectif à ${prix(t.objectif)}, `
      + `${nombre(f.objectif_r, 1)} fois ce que je risque.`;
  }
  const duree = pluriel(f.unite, t.bougies);
  if (t.issue === "objectif") {
    return `Objectif atteint après ${duree} : ${signe(t.r, 2)} R, frais déduits.`;
  }
  if (t.issue === "stop") {
    return `Stop touché après ${duree} : ${signe(t.r, 2)} R.`
      + (t.r < -1.08 ? " Le cours a ouvert au-delà du stop : la perte dépasse le risque prévu. Ça arrive, surtout après une annonce." : " La perte reste celle prévue : c'est le rôle du stop.");
  }
  return `${pluriel(f.unite, f.duree_max)} sans toucher ni le stop ni l'objectif : je sors au cours du jour, ${signe(t.r, 2)} R.`;
}
