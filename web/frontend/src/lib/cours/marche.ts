/**
 * Des cours fabriqués pour enseigner.
 *
 * Un vrai graphique montre rarement, au bon moment, exactement ce qu'une leçon
 * explique : trois rebonds nets sur un support, un double sommet propre, une
 * fausse cassure. Ici, on décrit le dessin par quelques points d'ancrage (une
 * bougie, un prix, et si le plus bas ou le plus haut doit le toucher), et le
 * générateur trace un cours crédible qui passe par ces points, avec du bruit
 * reproductible : la même graine donne toujours le même graphique, sur le
 * serveur comme dans le navigateur.
 */

export interface Bougie { o: number; h: number; l: number; c: number; v: number }

/** [index de la bougie, prix de clôture visé, ce qui doit toucher ce prix exactement]. */
export type Ancre = [number, number, ("bas" | "haut")?];

/** Un générateur pseudo-aléatoire déterministe (mulberry32). */
export function hasard(graine: number) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function serie(ancres: Ancre[], { graine = 7, bruit = 0.006, meche = 0.5, volume = 1000 } = {}): Bougie[] {
  const tri = [...ancres].sort((a, b) => a[0] - b[0]);
  const n = tri[tri.length - 1][0] + 1;
  const r = hasard(graine);
  const gauss = () => (r() + r() + r() - 1.5) * 1.15;
  const base: number[] = [];
  for (let k = 0; k < tri.length - 1; k++) {
    const [i0, p0] = tri[k];
    const [i1, p1] = tri[k + 1];
    for (let i = i0; i < i1; i++) base[i] = p0 + ((p1 - p0) * (i - i0)) / (i1 - i0);
  }
  base[n - 1] = tri[tri.length - 1][1];
  // Le bruit s'éteint près des ancres : le cours passe vraiment par elles.
  const dist = (i: number) => Math.min(...tri.map(([j]) => Math.abs(i - j)));
  const closes = base.map((p, i) => p * (1 + gauss() * bruit * Math.min(1, dist(i) / 3)));
  const out: Bougie[] = closes.map((c, i) => {
    const o = i === 0 ? c * (1 - bruit * 0.5) : closes[i - 1] * (1 + gauss() * bruit * 0.15);
    const amp = Math.abs(c) * bruit * meche;
    const h = Math.max(o, c) + Math.abs(gauss()) * amp + amp * 0.2;
    const l = Math.min(o, c) - Math.abs(gauss()) * amp - amp * 0.2;
    return { o, h, l, c, v: Math.round(volume * (0.6 + r() * 0.8)) };
  });
  // Les touches exactes : le plus bas (ou le plus haut) de la bougie d'ancre
  // est le prix voulu, et les voisines ne passent pas au-delà.
  for (const [i, p, t] of tri) {
    if (!t) continue;
    for (let j = Math.max(0, i - 2); j <= Math.min(n - 1, i + 2); j++) {
      const b = out[j];
      if (t === "bas") {
        if (j === i) { b.l = p; b.o = Math.max(b.o, p); b.c = Math.max(b.c, p); }
        else if (b.l < p) { b.l = p + Math.abs(p) * bruit * 0.3; b.o = Math.max(b.o, b.l); b.c = Math.max(b.c, b.l); }
      } else {
        if (j === i) { b.h = p; b.o = Math.min(b.o, p); b.c = Math.min(b.c, p); }
        else if (b.h > p) { b.h = p - Math.abs(p) * bruit * 0.3; b.o = Math.min(b.o, b.h); b.c = Math.min(b.c, b.h); }
      }
      b.h = Math.max(b.h, b.o, b.c);
      b.l = Math.min(b.l, b.o, b.c);
    }
  }
  return out;
}

// ── Les indicateurs, calculés comme partout sur le site ────────────────────

export function sma(x: number[], n: number): (number | null)[] {
  let s = 0;
  return x.map((v, i) => {
    s += v;
    if (i >= n) s -= x[i - n];
    return i >= n - 1 ? s / n : null;
  });
}

export function ema(x: number[], n: number): (number | null)[] {
  const k = 2 / (n + 1);
  let e: number | null = null;
  return x.map((v, i) => {
    e = e == null ? v : v * k + e * (1 - k);
    return i >= n - 1 ? e : null;
  });
}

export function rsi(x: number[], n = 14): (number | null)[] {
  let g = 0, p = 0;
  return x.map((v, i) => {
    if (i === 0) return null;
    const d = v - x[i - 1];
    const up = Math.max(d, 0), dn = Math.max(-d, 0);
    if (i <= n) { g += up / n; p += dn / n; return i === n ? 100 - 100 / (1 + g / (p || 1e-9)) : null; }
    g = (g * (n - 1) + up) / n;
    p = (p * (n - 1) + dn) / n;
    return 100 - 100 / (1 + g / (p || 1e-9));
  });
}

export function macd(x: number[], rapide = 12, lente = 26, signal = 9) {
  const r = ema(x, rapide), l = ema(x, lente);
  const m = x.map((_, i) => (r[i] != null && l[i] != null ? r[i]! - l[i]! : null));
  const debut = m.findIndex((v) => v != null);
  const s: (number | null)[] = m.map(() => null);
  if (debut >= 0) {
    const e = ema(m.slice(debut).map((v) => v!), signal);
    e.forEach((v, i) => { s[debut + i] = v; });
  }
  return { macd: m, signal: s, histo: m.map((v, i) => (v != null && s[i] != null ? v - s[i]! : null)) };
}

export function bollinger(x: number[], n = 20, k = 2) {
  const m = sma(x, n);
  const ecart = x.map((_, i) => {
    if (i < n - 1) return null;
    const f = x.slice(i - n + 1, i + 1);
    const moy = m[i]!;
    return Math.sqrt(f.reduce((a, v) => a + (v - moy) ** 2, 0) / n);
  });
  return {
    milieu: m,
    haut: m.map((v, i) => (v != null && ecart[i] != null ? v + k * ecart[i]! : null)),
    bas: m.map((v, i) => (v != null && ecart[i] != null ? v - k * ecart[i]! : null)),
  };
}

// ── Les mots ───────────────────────────────────────────────────────────────

export function fmt(x: number, d?: number): string {
  const a = Math.abs(x);
  const dd = d ?? (a >= 1000 ? 0 : a >= 100 ? 1 : a >= 10 ? 2 : a >= 1 ? 4 : 5);
  return x.toLocaleString("fr-FR", { minimumFractionDigits: dd, maximumFractionDigits: dd });
}
