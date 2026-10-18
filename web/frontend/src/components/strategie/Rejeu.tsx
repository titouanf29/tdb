"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Pause, Play, RotateCcw } from "lucide-react";
import { strategiesAPI, type FilmStrategie, type ReglesStrategie } from "@/lib/api";
import {
  bilan, compact, dateCourte, dateLongue, nombre, pluriel, preparer, prix, recit, rLatent, signe,
  type Evenement,
} from "@/lib/rejeu";
import { Checkbox, FormError, Nimbo, Panel, SegmentedControl, Text, type NimboHumeur } from "@/components/design-system";
import { GraphiqueRejeu } from "./GraphiqueRejeu";

/**
 * Le test, rejoué bougie par bougie.
 *
 * Les chiffres d'un backtest disent ce qui s'est passé ; le rejeu montre
 * COMMENT : on avance dans le temps sans voir la suite, Nimbo dit à chaque
 * clôture ce que la stratégie regarde, pourquoi elle entre, et comment le
 * trade finit. Le mode pari demande, à chaque entrée, comment on pense que
 * ça va finir : la meilleure façon de sentir qu'on ne le sait pas, et donc
 * pourquoi le stop compte.
 */

type Issue = "objectif" | "stop" | "durée";
const VITESSES = [
  { value: "3", label: "×1" }, { value: "6", label: "×2" }, { value: "12", label: "×4" },
  { value: "30", label: "×10" }, { value: "80", label: "×25" },
];

export function Rejeu({ regles, actifs }: { regles: ReglesStrategie; actifs: string[] }) {
  const [symbol, setSymbol] = useState(actifs[0] ?? "");
  const [f, setF] = useState<FilmStrategie | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [i, setI] = useState(0);
  const [lecture, setLecture] = useState(false);
  const [vitesse, setVitesse] = useState("6");
  const [fenetre, setFenetre] = useState("2");
  const [arretTrades, setArretTrades] = useState(true);
  const [pari, setPari] = useState(false);
  const [paris, setParis] = useState<Record<number, Issue | "passe">>({});
  const [survol, setSurvol] = useState<number | null>(null);
  const [largeur, setLargeur] = useState(800);
  const cache = useRef(new Map<string, FilmStrategie>());
  const boite = useRef<HTMLDivElement | null>(null);
  const iRef = useRef(0);
  iRef.current = i;

  const cleRegles = JSON.stringify(regles);
  useEffect(() => { cache.current.clear(); }, [cleRegles]);
  useEffect(() => { if (!actifs.includes(symbol)) setSymbol(actifs[0] ?? ""); }, [actifs, symbol]);

  useEffect(() => {
    if (!symbol) return;
    let vivant = true;
    const cle = `${symbol}|${cleRegles}`;
    const pret = (d: FilmStrategie) => {
      setF(d); setI(d.debut ?? 0); setLecture(false); setParis({}); setSurvol(null);
    };
    const deja = cache.current.get(cle);
    if (deja) { pret(deja); return; }
    setChargement(true); setErreur(""); setF(null);
    strategiesAPI.film(regles, symbol)
      .then((d) => {
        if (!vivant) return;
        if (d.erreur) { setErreur(d.erreur); return; }
        cache.current.set(cle, d);
        pret(d);
      })
      .catch((e) => { if (vivant) setErreur(e instanceof Error ? e.message : "Le rejeu n'a pas pu être préparé."); })
      .finally(() => { if (vivant) setChargement(false); });
    return () => { vivant = false; };
    // `regles` est représenté par sa clé.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, cleRegles]);

  useEffect(() => {
    const el = boite.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargeur(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [f]);

  const rj = useMemo(() => (f ? preparer(f) : null), [f]);
  const n = f?.dates.length ?? 0;
  const hebdo = f?.unite === "semaine";
  const FENETRES = hebdo
    ? [{ value: "1", label: "1 an", b: 52 }, { value: "2", label: "2 ans", b: 104 }, { value: "3", label: "5 ans", b: 260 }]
    : [{ value: "1", label: "3 mois", b: 63 }, { value: "2", label: "6 mois", b: 126 }, { value: "3", label: "1 an", b: 252 }];
  const nbFenetre = FENETRES.find((x) => x.value === fenetre)?.b ?? 126;

  // Une entrée sans pari bloque la lecture en mode pari.
  const entreeIci = useCallback((k: number) => f?.trades.findIndex((t) => t.i_e === k) ?? -1, [f]);
  const attendPari = pari && f != null && entreeIci(i) >= 0 && paris[entreeIci(i)] == null;

  const aller = useCallback((k: number) => {
    if (!f) return;
    setI(Math.max(f.debut, Math.min(n - 1, k)));
  }, [f, n]);

  const avancer = useCallback((pas: number) => {
    if (!f || !rj) return;
    const cur = iRef.current;
    if (pari) {
      const k = f.trades.findIndex((t) => t.i_e === cur);
      if (k >= 0 && paris[k] == null) { setLecture(false); return; }
    }
    let cible = Math.min(n - 1, cur + pas);
    if (arretTrades || pari) {
      const a = rj.arrets.find((e) => e > cur && e <= cible);
      if (a != null) { cible = a; setLecture(false); }
    }
    if (cible >= n - 1) setLecture(false);
    setI(cible);
  }, [f, rj, n, pari, paris, arretTrades]);

  useEffect(() => {
    if (!lecture) return;
    let raf = 0, dernier = performance.now(), cumul = 0;
    const v = Number(vitesse);
    const tic = (t: number) => {
      cumul += ((t - dernier) / 1000) * v;
      dernier = t;
      const pas = Math.floor(cumul);
      if (pas > 0) { cumul -= pas; avancer(pas); }
      raf = requestAnimationFrame(tic);
    };
    raf = requestAnimationFrame(tic);
    return () => cancelAnimationFrame(raf);
  }, [lecture, vitesse, avancer]);

  const entreePrec = () => { if (!f) return; const t = [...f.trades].reverse().find((t) => t.i_e < i); aller(t ? t.i_e : f.debut); setLecture(false); };
  const entreeSuiv = () => { if (!f) return; const t = f.trades.find((t) => t.i_e > i); if (t) { aller(t.i_e); setLecture(false); } };
  const basculer = () => {
    if (!f) return;
    if (i >= n - 1) { setI(f.debut); setLecture(true); return; }
    if (attendPari) return;
    setLecture((l) => !l);
  };

  const clavier = (e: React.KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    if (e.key === " ") { e.preventDefault(); basculer(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); setLecture(false); if (e.shiftKey) entreeSuiv(); else avancer(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); setLecture(false); if (e.shiftKey) entreePrec(); else aller(i - 1); }
  };

  const titre = "Rejouer le test, bougie par bougie";
  const etat = f && rj ? (
    <Etat f={f} rj={rj} i={i} regles={regles} pari={pari} paris={paris}
      onParier={(k, v) => setParis((p) => ({ ...p, [k]: v }))}
      onPremier={() => { const t = f.trades[0]; if (t) aller(t.i_e); }} />
  ) : null;
  if (!actifs.length) return null;

  return (
    <Panel
      title={titre}
      hint="Vous avancez dans le temps sans voir la suite, comme celui qui trade. Nimbo dit à chaque clôture ce que la stratégie regarde et ce qu'elle fait."
    >
      {actifs.length > 1 && (
        <SegmentedControl size="sm" aria-label="Actif rejoué" className="mb-4"
          options={actifs.map((a) => ({ value: a, label: a }))} value={symbol} onChange={setSymbol} />
      )}
      {erreur && <FormError>{erreur}</FormError>}
      {chargement && (
        <div className="flex items-center gap-3 py-10">
          <Nimbo humeur="reflechit" taille={48} label="" />
          <Text size="small">Je prépare les cours de {symbol} et je recalcule chaque condition, jour après jour…</Text>
        </div>
      )}

      {f && rj && !chargement && (
        <div onKeyDown={clavier} className="outline-none">
          <Entete f={f} k={survol ?? i} survol={survol != null} capital={rj.capital[i]} />

          {/* Ce que dit Nimbo d'abord, en grand : c'est ce qu'on lit. */}
          <div className="mt-4 rounded-[14px] p-4 sm:p-5" style={{ backgroundColor: "var(--cap-surface-2)" }}>{etat}</div>

          <Section titre="Le graphique" aide="Il s'arrête au jour rejoué : la suite, hachurée, reste cachée.">
            <div ref={boite} className="w-full">
              <GraphiqueRejeu f={f} rj={rj} i={i} fenetre={nbFenetre} largeur={largeur} survol={survol} onSurvol={setSurvol} />
            </div>
            <Legende f={f} />
            <Commandes
              lecture={lecture} fin={i >= n - 1} bloque={attendPari}
              onBasculer={basculer}
              onDebut={() => { setLecture(false); aller(f.debut); }}
              onPrec={() => { setLecture(false); aller(i - 1); }}
              onSuiv={() => { setLecture(false); avancer(1); }}
              onEntreePrec={entreePrec} onEntreeSuiv={entreeSuiv}
            />
            <Frise f={f} rj={rj} i={i} onAller={(k) => { setLecture(false); aller(k); }} />
          </Section>

          <Section titre="Réglages">
            <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
              <div>
                <span className="mb-1 block text-[0.85rem]" style={{ color: "var(--cap-ink-2)" }}>Vitesse</span>
                <SegmentedControl size="sm" aria-label="Vitesse de lecture" options={VITESSES} value={vitesse} onChange={setVitesse} />
              </div>
              <div>
                <span className="mb-1 block text-[0.85rem]" style={{ color: "var(--cap-ink-2)" }}>Période affichée</span>
                <SegmentedControl size="sm" aria-label="Période affichée" options={FENETRES.map(({ value, label }) => ({ value, label }))} value={fenetre} onChange={setFenetre} />
              </div>
              <div className="flex flex-col gap-2.5 pt-1">
                <Checkbox checked={arretTrades} onChange={setArretTrades}>
                  <span className="text-[0.95rem]">M&apos;arrêter à chaque entrée et sortie</span>
                </Checkbox>
                <Checkbox checked={pari} onChange={(v) => { setPari(v); if (v) setArretTrades(true); }}>
                  <span className="text-[0.95rem]">Deviner l&apos;issue de chaque trade</span>
                </Checkbox>
              </div>
            </div>
            <Text size="small" className="mt-3 hidden sm:block">
              Au clavier : espace pour lire ou mettre en pause, flèches pour avancer ou reculer d&apos;une {f.unite}, Maj et flèche pour sauter d&apos;un trade à l&apos;autre.
            </Text>
          </Section>

          <div className="grid gap-x-10 md:grid-cols-2">
            <Section titre="Vos conditions ce jour-là">
              <Conditions f={f} i={i} />
            </Section>
            <Section titre="Le résultat jusqu'ici">
              <Score f={f} rj={rj} i={i} pari={pari} paris={paris} />
            </Section>
          </div>
          <Fil f={f} rj={rj} i={i} regles={regles} onAller={(k) => { setLecture(false); aller(k); }} />
        </div>
      )}
    </Panel>
  );
}

/** Une partie du rejeu, avec son titre : pour se repérer d'un coup d'œil. */
function Section({ titre, aide, children }: { titre: string; aide?: string; children: React.ReactNode }) {
  return (
    <section className="mt-7 border-t pt-5" style={{ borderColor: "var(--cap-line-strong)" }}>
      <h3 className="text-[1.15rem] font-semibold leading-tight" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>{titre}</h3>
      {aide && <p className="mt-1 text-[0.92rem]" style={{ color: "var(--cap-ink-3)" }}>{aide}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

// ── L'en-tête : la date du jour rejoué ─────────────────────────────────────

function Entete({ f, k, survol, capital }: { f: FilmStrategie; k: number; survol: boolean; capital: number }) {
  const o = f.o[k], h = f.h[k], l = f.l[k], c = f.c[k];
  const prev = f.c[k - 1];
  const var_ = c != null && prev ? (c / prev - 1) * 100 : null;
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="min-w-0">
        <p className="text-[0.95rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>
          {survol ? "Sous votre souris" : `${f.symbol}, à la clôture du`}
        </p>
        <p className="text-[clamp(1.25rem,2.4vw,1.6rem)] font-medium leading-tight first-letter:uppercase"
          style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }} aria-live="off">
          {dateLongue(f.dates[k], !f.unite.startsWith("sem"))}
        </p>
        <p className="mt-1 text-[0.92rem] tabular-nums" style={{ color: "var(--cap-ink-2)" }}>
          ouverture {prix(o)}, plus haut {prix(h)}, plus bas {prix(l)}, clôture <b style={{ color: "var(--cap-ink)" }}>{prix(c)}</b>
          {var_ != null && <span style={{ color: var_ >= 0 ? "var(--cap-up)" : "var(--cap-down)" }}> ({signe(var_, 2)} %)</span>}
        </p>
      </div>
      <div className="text-right">
        <span className="block text-[0.88rem]" style={{ color: "var(--cap-ink-3)" }}>Votre capital (100 au départ)</span>
        <span className="text-[1.9rem] font-medium tabular-nums leading-none"
          style={{ fontFamily: "var(--cap-font-display)", color: Math.abs(capital - 100) < 0.05 ? "var(--cap-ink)" : capital > 100 ? "var(--cap-up)" : "var(--cap-down)" }}>
          {nombre(capital, 1)}
        </span>
      </div>
    </div>
  );
}

function Legende({ f }: { f: FilmStrategie }) {
  const couleurs = ["var(--cap-ocean)", "var(--cap-cyan)", "var(--cap-ink-3)", "var(--cap-amber-ink)"];
  return (
    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[0.9rem]" style={{ color: "var(--cap-ink-2)" }}>
      {f.superpositions.map((s, k) => (
        <span key={s.cle} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-[2px] w-4" style={{ backgroundColor: couleurs[k % couleurs.length] }} />{s.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-2.5 w-4" style={{ backgroundColor: "var(--cap-up-fill)", opacity: 0.25 }} />vers l&apos;objectif
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-2.5 w-4" style={{ backgroundColor: "var(--cap-down-fill)", opacity: 0.25 }} />vers le stop
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-2 w-[3px]" style={{ backgroundColor: "var(--cap-ambre)" }} />une entrée
      </span>
    </div>
  );
}

// ── Les commandes ──────────────────────────────────────────────────────────

function Bouton({ label, court, onClick, children, disabled }: { label: string; court: string; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-[10px] px-2 py-1 transition-colors hover:bg-[color:var(--cap-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
      style={{ color: "var(--cap-ink)" }}>
      {children}
      <span aria-hidden className="hidden text-[0.75rem] leading-none sm:block" style={{ color: "var(--cap-ink-3)" }}>{court}</span>
    </button>
  );
}

function Commandes({ lecture, fin, bloque, onBasculer, onDebut, onPrec, onSuiv, onEntreePrec, onEntreeSuiv }: {
  lecture: boolean; fin: boolean; bloque: boolean;
  onBasculer: () => void; onDebut: () => void; onPrec: () => void; onSuiv: () => void;
  onEntreePrec: () => void; onEntreeSuiv: () => void;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-1">
      <Bouton label="Revenir au début" court="Début" onClick={onDebut}><RotateCcw size={18} /></Bouton>
      <Bouton label="Trade précédent" court="Trade préc." onClick={onEntreePrec}><ChevronsLeft size={20} /></Bouton>
      <Bouton label="Bougie précédente" court="Reculer" onClick={onPrec}><ChevronLeft size={20} /></Bouton>
      <button type="button" onClick={onBasculer} disabled={bloque}
        className="mx-1 inline-flex h-12 min-w-[6.75rem] items-center justify-center gap-2 rounded-[10px] px-3.5 text-[1rem] font-semibold sm:mx-3 sm:min-w-[9rem] sm:px-5 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
        style={{ backgroundColor: "var(--cap-ink)", color: "var(--cap-on-inverse)" }}>
        <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--cap-ambre)" }} />
        {lecture ? <Pause size={16} /> : <Play size={16} />}
        {bloque ? "Pariez d'abord" : lecture ? "Pause" : fin ? "Rejouer" : "Lecture"}
      </button>
      <Bouton label="Bougie suivante" court="Avancer" onClick={onSuiv} disabled={fin}><ChevronRight size={20} /></Bouton>
      <Bouton label="Trade suivant" court="Trade suiv." onClick={onEntreeSuiv} disabled={fin}><ChevronsRight size={20} /></Bouton>
    </div>
  );
}

/** La frise de toute la période : le passé rempli, les trades déjà vus, un curseur pour s'y déplacer. */
function Frise({ f, rj, i, onAller }: { f: FilmStrategie; rj: ReturnType<typeof preparer>; i: number; onAller: (k: number) => void }) {
  const n = f.dates.length;
  const pct = (k: number) => ((k - f.debut) / Math.max(1, n - 1 - f.debut)) * 100;
  const annees = useMemo(() => {
    const out: { k: number; a: string }[] = [];
    let prev = "";
    for (let k = f.debut; k < n; k++) {
      const a = f.dates[k].slice(0, 4);
      if (a !== prev) { if (prev) out.push({ k, a }); prev = a; }
    }
    return out;
  }, [f, n]);
  return (
    <div className="mt-4">
      <div className="relative h-5" aria-hidden>
        <div className="absolute inset-x-0 top-2 h-1 rounded-full" style={{ backgroundColor: "var(--cap-surface-2)" }} />
        <div className="absolute left-0 top-2 h-1 rounded-full" style={{ width: `${pct(i)}%`, backgroundColor: "var(--cap-ink-4)" }} />
        {f.trades.filter((t) => t.i_s <= i).map((t) => (
          <span key={t.i_e} className="absolute top-0.5 h-4 w-[3px] -translate-x-1/2 rounded-sm"
            style={{ left: `${pct(t.i_e)}%`, backgroundColor: t.r >= 0 ? "var(--cap-up)" : "var(--cap-down)" }} />
        ))}
        {rj.ouvert[i] >= 0 && (
          <span className="absolute top-0.5 h-4 w-[3px] -translate-x-1/2 rounded-sm" style={{ left: `${pct(f.trades[rj.ouvert[i]].i_e)}%`, backgroundColor: "var(--cap-ambre)" }} />
        )}
      </div>
      <input type="range" min={f.debut} max={n - 1} value={i} onChange={(e) => onAller(Number(e.target.value))}
        aria-label="Se déplacer dans le temps" aria-valuetext={dateLongue(f.dates[i])}
        className="w-full cursor-pointer" style={{ accentColor: "var(--cap-ink)" }} />
      <div className="relative h-5 text-[0.82rem]" style={{ color: "var(--cap-ink-3)" }} aria-hidden>
        <span className="absolute left-0">{dateCourte(f.dates[f.debut])}</span>
        {annees.filter((_, k) => annees.length <= 6 || k % 2 === 0).map(({ k, a }) => (
          <span key={a} className="absolute hidden -translate-x-1/2 sm:inline" style={{ left: `${pct(k)}%` }}>{a}</span>
        ))}
        <span className="absolute right-0">{dateCourte(f.dates[n - 1])}</span>
      </div>
    </div>
  );
}

// ── Ce que dit Nimbo, au jour rejoué ───────────────────────────────────────

function valeurCondition(f: FilmStrategie, cle: string | null, k: number): string | null {
  if (!cle) return null;
  const s = f.superpositions.find((x) => x.cle === cle);
  if (s) {
    const v = s.valeurs[k];
    return v == null ? null : `${s.label.toLowerCase()} à ${prix(v)}, cours à ${prix(f.c[k])}`;
  }
  for (const p of f.panneaux) {
    const x = p.series.find((y) => y.cle === cle);
    if (x) {
      const v = x.valeurs[k];
      if (v == null) return null;
      if (p.type === "volume") {
        const seuil = p.series[1]?.valeurs[k];
        return `volume ${compact(v)}${seuil != null ? `, seuil ${compact(seuil)}` : ""}`;
      }
      return `${x.label} à ${nombre(v, p.type === "rsi" ? 1 : 2)}`;
    }
  }
  return null;
}

function Etat({ f, rj, i, regles, pari, paris, onParier, onPremier }: {
  f: FilmStrategie; rj: ReturnType<typeof preparer>; i: number; regles: ReglesStrategie;
  pari: boolean; paris: Record<number, Issue | "passe">;
  onParier: (k: number, v: Issue | "passe") => void; onPremier: () => void;
}) {
  const ici = rj.evenements.filter((e) => e.i === i);
  const k = rj.ouvert[i];
  const t = k >= 0 ? f.trades[k] : null;
  const achat = f.sens === "achat";
  const cours = f.c[i];
  const calculables = f.conditions.filter((c) => c.masque);
  const reunies = calculables.filter((c) => c.masque![i] === "1").length;
  const sortie = ici.find((e) => e.type === "sortie");
  const entree = ici.find((e) => e.type === "entree");

  let humeur: NimboHumeur = "reflechit";
  if (entree) humeur = "pointe";
  else if (sortie && sortie.type === "sortie") humeur = sortie.trade.r > 0 ? "content" : "prudent";
  else if (t) humeur = "cap";

  const debut = i === f.debut && !ici.length;
  return (
    <div>
      <div className="flex items-start gap-3">
        <Nimbo humeur={humeur} taille={64} label="" className="-mt-1 flex-none" />
        <div className="min-w-0 space-y-2" aria-live="polite">
          {debut && (
            <p className="text-[1.05rem] leading-snug sm:text-[1.12rem]" style={{ color: "var(--cap-ink)" }}>
              Appuyez sur Lecture : j&apos;avance une {f.unite} après l&apos;autre et je vous dis ce que votre stratégie voit.
              {f.trades.length > 0 && (
                <> Ou <button type="button" className="cap-lien" onClick={onPremier}>allez au premier trade</button>.</>
              )}
            </p>
          )}
          {ici.map((e, n) => (
            <p key={n} className="text-[1.05rem] leading-snug sm:text-[1.12rem]" style={{ color: "var(--cap-ink)", fontFamily: e.type === "refus" ? undefined : "var(--cap-font-display)" }}>
              {recit(e, f, regles)}
            </p>
          ))}
          {!debut && !ici.length && t && cours != null && (
            <p className="text-[1.05rem] leading-snug sm:text-[1.12rem]" style={{ color: "var(--cap-ink)" }}>
              En position depuis {pluriel(f.unite, i - t.i_e)}. Le trade vaut {signe(rLatent(t, cours, achat), 2)} R pour l&apos;instant ;
              sortie forcée dans {pluriel(f.unite, Math.max(0, t.i_e + f.duree_max - i))} si rien n&apos;est touché.
            </p>
          )}
          {!debut && !ici.length && !t && (
            <p className="text-[1.05rem] leading-snug sm:text-[1.12rem]" style={{ color: "var(--cap-ink)" }}>
              {calculables.length === 0
                ? "J'attends que mon score atteigne votre seuil."
                : reunies === calculables.length
                  ? (calculables.length < f.conditions.length ? "Vos conditions sont réunies : reste mon score." : "Vos conditions sont réunies ce jour-là.")
                  : `À l'affût : ${reunies} condition${reunies > 1 ? "s" : ""} sur ${calculables.length} réunie${reunies > 1 ? "s" : ""}.`}
            </p>
          )}
          {t && !entree && rj.toutes[i] === 1 && (
            <Text size="small">Vos conditions sont réunies, mais une position est déjà ouverte : une seule à la fois.</Text>
          )}
        </div>
      </div>

      {t && cours != null && <Jauge stop={t.stop} entree={t.entree} objectif={t.objectif} cours={cours} />}

      {pari && entree && entree.type === "entree" && (
        <Pari k={entree.n} choix={paris[entree.n]} onParier={onParier} />
      )}
      {pari && sortie && sortie.type === "sortie" && paris[sortie.n] && paris[sortie.n] !== "passe" && (
        <p className="mt-3 text-[0.9rem]" style={{ color: paris[sortie.n] === sortie.trade.issue ? "var(--cap-up)" : "var(--cap-down)" }}>
          {paris[sortie.n] === sortie.trade.issue ? "Bien vu : c'est ce que vous aviez prédit." : `Vous pensiez ${libelle(paris[sortie.n] as Issue)} : raté.`}
        </p>
      )}

    </div>
  );
}

function Conditions({ f, i }: { f: FilmStrategie; i: number }) {
  return (
      <ul className="flex flex-col gap-3">
        {f.conditions.map((c, n) => {
          const ok = c.masque ? c.masque[i] === "1" : null;
          const val = valeurCondition(f, c.valeur, i);
          return (
            <li key={n} className="flex items-start gap-2.5 text-[0.98rem]" style={{ color: ok ? "var(--cap-ink)" : "var(--cap-ink-3)" }}>
              <span aria-hidden className="mt-[0.1rem] flex h-5 w-5 flex-none items-center justify-center rounded-full text-[0.72rem] font-bold"
                style={{ backgroundColor: ok ? "var(--cap-up)" : "var(--cap-surface-2)", color: ok ? "#fff" : "var(--cap-ink-3)" }}>
                {ok ? "✓" : ok === null ? "?" : "·"}
              </span>
              <span className="min-w-0">
                {c.texte.charAt(0).toUpperCase() + c.texte.slice(1)}
                <span className="sr-only">{ok ? " : réunie" : ok === null ? " : vérifiée seulement quand le reste l'est" : " : pas réunie"}</span>
                {val && <span className="block text-[0.86rem] tabular-nums" style={{ color: "var(--cap-ink-3)" }}>{val}</span>}
              </span>
            </li>
          );
        })}
      </ul>
  );
}

function libelle(v: Issue) {
  return v === "objectif" ? "à l'objectif" : v === "stop" ? "au stop" : "à la durée maximale";
}

function Pari({ k, choix, onParier }: { k: number; choix?: Issue | "passe"; onParier: (k: number, v: Issue | "passe") => void }) {
  if (choix) {
    return (
      <p className="mt-3 text-[0.88rem]" style={{ color: "var(--cap-ink-3)" }}>
        {choix === "passe" ? "Pas de pari sur ce trade." : `Votre pari : il finit ${libelle(choix)}. Lancez la lecture pour voir.`}
      </p>
    );
  }
  return (
    <div className="mt-4 rounded-[12px] border p-3.5" style={{ borderColor: "var(--cap-ambre)" }}>
      <p className="text-[0.95rem] font-medium" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
        À votre avis, ce trade finit comment ?
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {(["objectif", "stop", "durée"] as Issue[]).map((v) => (
          <button key={v} type="button" onClick={() => onParier(k, v)}
            className="h-10 rounded-[8px] border px-3 text-[0.86rem] font-medium transition-colors hover:bg-[color:var(--cap-surface-2)] focus-visible:outline focus-visible:outline-2"
            style={{ borderColor: "var(--cap-line-strong)", color: "var(--cap-ink)" }}>
            {v === "objectif" ? "À l'objectif" : v === "stop" ? "Au stop" : "Ni l'un ni l'autre"}
          </button>
        ))}
        <button type="button" onClick={() => onParier(k, "passe")} className="cap-lien h-10 px-1 text-[0.86rem]">Passer</button>
      </div>
    </div>
  );
}

/** Où en est le cours entre le stop et l'objectif. */
function Jauge({ stop, entree, objectif, cours }: { stop: number; entree: number; objectif: number; cours: number }) {
  const lo = Math.min(stop, objectif), hi = Math.max(stop, objectif);
  const p = (v: number) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo || 1)) * 100));
  const versHaut = objectif > stop;
  const gauche = versHaut ? "var(--cap-down-fill)" : "var(--cap-up-fill)";
  const droite = versHaut ? "var(--cap-up-fill)" : "var(--cap-down-fill)";
  return (
    <div className="mt-4" aria-label={`Cours à ${prix(cours)}, entre le stop à ${prix(stop)} et l'objectif à ${prix(objectif)}`} role="img">
      <div className="relative h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${gauche} 0%, ${gauche} ${p(entree)}%, ${droite} ${p(entree)}%, ${droite} 100%)`, opacity: 0.35 }} />
      <div className="relative -mt-2 h-2">
        <span className="absolute top-[-3px] h-[14px] w-[2px] -translate-x-1/2" style={{ left: `${p(entree)}%`, backgroundColor: "var(--cap-ink-3)" }} />
        <span className="absolute top-[-4px] h-4 w-4 -translate-x-1/2 rounded-full border-2 transition-[left] duration-200"
          style={{ left: `${p(cours)}%`, backgroundColor: "var(--cap-ink)", borderColor: "var(--cap-surface)" }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[0.74rem] tabular-nums" style={{ color: "var(--cap-ink-3)" }}>
        <span>{versHaut ? `stop ${prix(stop)}` : `objectif ${prix(objectif)}`}</span>
        <span>entrée {prix(entree)}</span>
        <span>{versHaut ? `objectif ${prix(objectif)}` : `stop ${prix(stop)}`}</span>
      </div>
    </div>
  );
}

// ── Le score en direct ─────────────────────────────────────────────────────

function Score({ f, rj, i, pari, paris }: { f: FilmStrategie; rj: ReturnType<typeof preparer>; i: number; pari: boolean; paris: Record<number, Issue | "passe"> }) {
  const b = bilan(f, i);
  const cap = rj.capital[i] - 100;
  const cons = rj.conserve[i] - 100;
  const pariés = f.trades.map((t, k) => ({ t, k })).filter(({ t, k }) => t.i_s <= i && paris[k] && paris[k] !== "passe");
  const justes = pariés.filter(({ t, k }) => paris[k] === t.issue).length;
  return (
    <div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[1rem] sm:grid-cols-3">
        <Ligne dt="Trades fermés" dd={String(b.trades)} />
        <Ligne dt="Gagnants" dd={b.taux == null ? "—" : `${nombre(b.taux, 0)} %`} />
        <Ligne dt="Total" dd={`${signe(b.rTotal, 1)} R`} ton={b.rTotal >= 0 ? "up" : "down"} />
        <Ligne dt="Pire recul" dd={`${nombre(rj.recul[i], 1)} %`} ton={rj.recul[i] < 0 ? "down" : undefined} />
        <Ligne dt="La stratégie" dd={`${signe(cap, 1)} %`} ton={cap >= 0 ? "up" : "down"} />
        {f.sens === "achat" && <Ligne dt="Acheter et garder" dd={`${signe(cons, 1)} %`} />}
      </dl>
      <Courbe f={f} rj={rj} i={i} />
      <p className="mt-1 flex flex-wrap gap-x-5 text-[0.85rem]" style={{ color: "var(--cap-ink-3)" }}>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block h-[2px] w-4" style={{ backgroundColor: "var(--cap-ink-2)" }} />la stratégie</span>
        {f.sens === "achat" && <span className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block w-4 border-t border-dashed" style={{ borderColor: "var(--cap-ink-4)" }} />acheter et garder</span>}
      </p>
      {pari && pariés.length > 0 && (
        <Text size="small" className="mt-2">
          Vos paris : {justes} juste{justes > 1 ? "s" : ""} sur {pariés.length}.
          {pariés.length >= 5 && justes / pariés.length < 0.6 ? " Personne ne devine bien mieux qu'une fois sur deux : c'est pour ça que le stop compte plus que l'intuition." : ""}
        </Text>
      )}
    </div>
  );
}

function Ligne({ dt, dd, ton }: { dt: string; dd: string; ton?: "up" | "down" }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.84rem]" style={{ color: "var(--cap-ink-3)" }}>{dt}</dt>
      <dd className="font-semibold tabular-nums" style={{ color: ton === "up" ? "var(--cap-up)" : ton === "down" ? "var(--cap-down)" : "var(--cap-ink)" }}>{dd}</dd>
    </div>
  );
}

/** Le capital face à l'achat-conservation, qui avancent ensemble avec le rejeu. */
function Courbe({ f, rj, i }: { f: FilmStrategie; rj: ReturnType<typeof preparer>; i: number }) {
  const W = 300, H = 84, P = 4;
  const n = f.dates.length;
  const a = f.debut;
  const vals: number[] = [];
  for (let k = a; k < n; k++) { vals.push(rj.capital[k]); if (f.sens === "achat") vals.push(rj.conserve[k]); }
  // L'échelle couvre toute la période, pour que la courbe ne saute pas pendant la lecture.
  const min = Math.min(100, ...vals), max = Math.max(100, ...vals);
  const x = (k: number) => P + ((k - a) / Math.max(1, n - 1 - a)) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - min) / (max - min || 1)) * (H - 2 * P);
  const chemin = (s: number[]) => {
    let d = "";
    const pas = Math.max(1, Math.floor((i - a) / 300));
    for (let k = a; k <= i; k += pas) d += `${d ? "L" : "M"}${x(k).toFixed(1)},${y(s[k]).toFixed(1)}`;
    return d + `L${x(i).toFixed(1)},${y(s[i]).toFixed(1)}`;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-4 h-24 w-full" role="img" aria-label="Le capital de la stratégie face à l'achat-conservation">
      <line x1={P} x2={W - P} y1={y(100)} y2={y(100)} stroke="var(--cap-line-strong)" strokeDasharray="3 3" />
      {f.sens === "achat" && <path d={chemin(rj.conserve)} fill="none" stroke="var(--cap-ink-4)" strokeWidth="1.2" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />}
      <path d={chemin(rj.capital)} fill="none" stroke={rj.capital[i] >= 100 ? "var(--cap-up)" : "var(--cap-down)"} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ── Le fil des événements ──────────────────────────────────────────────────

function Fil({ f, rj, i, regles, onAller }: { f: FilmStrategie; rj: ReturnType<typeof preparer>; i: number; regles: ReglesStrategie; onAller: (k: number) => void }) {
  const passes: Evenement[] = rj.evenements.filter((e) => e.i < i).slice(-6).reverse();
  if (!passes.length) return null;
  return (
    <Section titre="Ce qui s'est passé avant">
      <ol className="grid gap-x-8 gap-y-3.5 md:grid-cols-2">
        {passes.map((e, n) => (
          <li key={`${e.type}${e.i}${n}`}>
            <button type="button" onClick={() => onAller(e.i)}
              className="group block w-full text-left focus-visible:outline focus-visible:outline-2">
              <span className="block text-[0.85rem] tabular-nums" style={{ color: "var(--cap-ink-3)" }}>
                {dateLongue(f.dates[e.i])}
                {e.type === "sortie" && (
                  <b className="ml-1.5" style={{ color: e.trade.r >= 0 ? "var(--cap-up)" : "var(--cap-down)" }}>{signe(e.trade.r, 2)} R</b>
                )}
              </span>
              <span className="line-clamp-2 text-[0.95rem] leading-snug group-hover:underline" style={{ color: "var(--cap-ink-2)" }}>
                {recit(e, f, regles)}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </Section>
  );
}
