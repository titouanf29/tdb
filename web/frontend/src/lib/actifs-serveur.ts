/**
 * Les pages publiques par actif, lues côté serveur (backend routes/demo.py).
 *
 * Une seule source pour la liste : le serveur. Le plan du site, la page
 * d'index et chaque fiche la lisent, avec un cache de dix minutes, comme
 * l'analyse elle-même.
 */
const API = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export interface ActifListe { id: string; nom: string; symbole: string; categorie: string; demo: boolean }

export interface AnalysePublique {
  id: string;
  name: string;
  ticker: string;
  price: string;
  change: number;
  direction: "Haussier" | "Baissier" | "Neutre";
  score: number;
  reasons: string[];
  factors: { label: string; value: number }[];
  risk: string;
  advanced: { label: string; value: string }[];
  series: number[];
  support: number;
  resistance: number;
  verdict: string;
  categorie: string;
  presentation: string;
  performance: Record<"1w" | "1m" | "3m" | "ytd", number | null>;
  moyennes: Record<"ema20" | "ema50" | "ema200", number | null>;
  rsi: number | null;
  tendance_hebdo: string;
  analyse_a: string;
}

export async function listeActifs(): Promise<ActifListe[]> {
  try {
    const r = await fetch(`${API}/api/demo`, { next: { revalidate: 600 } });
    return r.ok ? await r.json() : [];
  } catch {
    return [];
  }
}

/** `null` : actif inconnu. `"indisponible"` : le moteur ne répond pas. */
export async function analyseActif(id: string): Promise<AnalysePublique | null | "indisponible"> {
  try {
    const r = await fetch(`${API}/api/demo/${encodeURIComponent(id)}`, { next: { revalidate: 600 } });
    if (r.status === 404) return null;
    return r.ok ? await r.json() : "indisponible";
  } catch {
    return "indisponible";
  }
}

/** « 2026-10-26T20:59+01:00 » → « lundi 26 octobre, 20 h 59 ». */
export function dateAnalyse(iso: string): string {
  const d = new Date(iso);
  const jour = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
  const [h, m] = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).split(":");
  return `${jour}, ${Number(h)} h ${m}`;
}

export function pourcent(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "n.d.";
  const t = Math.abs(v).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${t} %`;
}
