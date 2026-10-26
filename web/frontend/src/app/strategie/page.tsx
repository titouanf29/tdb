"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  favoritesAPI, strategiesAPI,
  type AvisNimbo, type ConditionStrategie, type ReglesStrategie, type ResultatStrategie, type StrategieSauvee,
} from "@/lib/api";
import { CATALOGUE, IDEES, REGLES_VIDES, seuilGain, v, type TypeCondition } from "@/lib/strategie";
import { useAssetSuggestions, ListeSuggestions } from "@/components/app/assetSearch";
import {
  Button, FormError, Heading, LigneDatee, Nimbo, Panel, SegmentedControl, Text,
} from "@/components/design-system";
import { Condition } from "@/components/strategie/Condition";
import { ListeAvis } from "@/components/strategie/ListeAvis";
import { Resultats } from "@/components/strategie/Resultats";
import { Rejeu } from "@/components/strategie/Rejeu";

/**
 * Ma stratégie : la composer avec Nimbo, la tester sur des années de cours,
 * la garder, et la retrouver sur l'analyse de chaque actif.
 *
 * Cinq questions simples, dans l'ordre où un trader se les pose : quelle
 * idée, sur quoi, quand entrer, quand sortir, combien risquer. Nimbo relit la
 * stratégie à chaque changement (le serveur la vérifie : backend
 * _strategie.verifier) et dit ce qui n'a pas de sens, avant même le test.
 */

function Chapitre({ n, titre, question, children }: { n: string; titre: string; question: string; children: React.ReactNode }) {
  return (
    <section className="border-t pt-6" style={{ borderColor: "var(--cap-line-strong)" }}>
      <p data-eyebrow className="mb-1">{n}. {titre}</p>
      <h2 className="text-[1.35rem] font-medium leading-snug" style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}>
        {question}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Curseur({ label, value, min, max, step, onChange, texte }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; texte: string;
}) {
  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-[0.95rem] font-semibold" style={{ color: "var(--cap-ink)" }}>{label}</label>
        <span className="text-[1.1rem] font-semibold" style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}>
          {v(value, 2)}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full" style={{ accentColor: "var(--cap-ambre)" }} />
      <Text size="small" className="mt-1">{texte}</Text>
    </div>
  );
}

export default function StrategiePage() {
  const [regles, setRegles] = useState<ReglesStrategie>(REGLES_VIDES);
  const [idee, setIdee] = useState<string | null>(null);
  const [avis, setAvis] = useState<AvisNimbo[]>([]);
  const [bloquante, setBloquante] = useState(true);
  const [resultat, setResultat] = useState<ResultatStrategie | null>(null);
  const [teste, setTeste] = useState<string>("");
  const [enTest, setEnTest] = useState(false);
  const [sauvees, setSauvees] = useState<StrategieSauvee[]>([]);
  const [enCours, setEnCours] = useState<number | null>(null);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [recherche, setRecherche] = useState("");
  const sugg = useAssetSuggestions(recherche);
  const resultatsRef = useRef<HTMLDivElement | null>(null);

  const charger = useCallback(async () => {
    try { setSauvees((await strategiesAPI.lister()).strategies); } catch { /* hors ligne */ }
  }, []);
  useEffect(() => { charger(); }, [charger]);

  // Nimbo relit la stratégie à chaque changement, après une courte pause.
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const r = await strategiesAPI.verifier(regles);
        setAvis(r.avis); setBloquante(r.bloquante);
      } catch { /* la relecture reviendra au prochain changement */ }
    }, 350);
    return () => clearTimeout(t);
  }, [regles]);

  const maj = (p: Partial<ReglesStrategie>) => setRegles((r) => ({ ...r, ...p }));
  const choisirIdee = (cle: string) => {
    const i = IDEES.find((x) => x.cle === cle)!;
    setIdee(cle);
    maj({ conditions: i.conditions, stop_atr: i.stop_atr, objectif_r: i.objectif_r, duree_max: i.duree_max,
          nom: regles.nom === REGLES_VIDES.nom ? i.titre : regles.nom });
  };
  const ajouterActif = (s: string) => {
    const sym = s.trim().toUpperCase();
    if (!sym || regles.actifs.includes(sym) || regles.actifs.length >= 5) return;
    maj({ actifs: [...regles.actifs, sym] }); setRecherche(""); sugg.vider();
  };
  const ajouterFavoris = async () => {
    try {
      const f = (await favoritesAPI.getFavorites()).favorites.map((x) => x.symbol);
      maj({ actifs: Array.from(new Set([...regles.actifs, ...f])).slice(0, 5) });
    } catch { /* pas de favoris */ }
  };

  const tester = async () => {
    setEnTest(true); setErreur(""); setMessage("");
    try {
      const r = await strategiesAPI.backtest(regles);
      setAvis(r.avis); setBloquante(r.bloquante);
      setResultat(r.resultat);
      setTeste(JSON.stringify(regles));
      setTimeout(() => resultatsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le test a échoué.");
    } finally { setEnTest(false); }
  };

  const sauver = async (activer: boolean) => {
    setErreur(""); setMessage("");
    try {
      const resume = resultat && teste === JSON.stringify(regles)
        ? { r_moyen: resultat.stats.r_moyen, trades: resultat.stats.trades, capital_final_pct: resultat.stats.capital_final_pct }
        : undefined;
      const { strategie } = await strategiesAPI.sauvegarder({ ...regles, _test: resume }, enCours ?? undefined);
      setEnCours(strategie.id);
      if (activer && !strategie.active) await strategiesAPI.activer(strategie.id);
      await charger();
      setMessage(activer ? "Stratégie enregistrée et activée : Nimbo l'appliquera sur l'analyse de chaque actif, et vous serez prévenu quand elle se déclenche sur un de ses actifs ou de vos favoris."
                         : "Stratégie enregistrée.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    }
  };

  const ouvrir = (s: StrategieSauvee) => {
    setRegles(s.regles); setEnCours(s.id); setIdee("zero"); setResultat(null); setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const R = regles.objectif_r;
  const testable = !bloquante && !enTest;
  const resultatPerime = resultat && teste !== JSON.stringify(regles);
  // Le rejeu porte sur la stratégie telle qu'elle a été testée, pas sur les retouches d'après.
  const reglesTestees = useMemo<ReglesStrategie | null>(() => (teste ? JSON.parse(teste) : null), [teste]);
  const actifsTestes = useMemo(() => (resultat?.par_actif ?? []).filter((a) => !a.erreur && a.trades > 0).map((a) => a.symbol), [resultat]);

  return (
    <div className="relative space-y-8">
      <header className="pt-2">
        <p className="cap-dateline mb-4 text-[0.92rem]"><LigneDatee /></p>
        <Heading level={1}>Ma stratégie</Heading>
        <Text className="mt-2.5 max-w-[42rem]">
          Composez vos règles avec Nimbo, testez-les sur des années de vrais cours, puis gardez-les : sur l&apos;analyse de
          chaque actif, Nimbo vous dira si elles se déclenchent.
        </Text>
      </header>

      {sauvees.length > 0 && (
        <Panel title="Vos stratégies" hint="Celle qui est active est appliquée par Nimbo sur la page d'analyse, et je vous préviens quand elle se déclenche sur un de ses actifs ou de vos favoris.">
          <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
            {sauvees.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
                <div className="min-w-0">
                  <span className="text-[1.02rem] font-semibold" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
                    {s.nom}
                  </span>
                  {s.active && <span className="ml-2 text-[0.82rem] italic" style={{ color: "var(--cap-amber-ink)", fontFamily: "var(--cap-font-display)" }}>active</span>}
                  <span className="block text-[0.82rem]" style={{ color: "var(--cap-ink-3)" }}>
                    {s.regles.conditions.length} condition{s.regles.conditions.length > 1 ? "s" : ""}
                    {s.dernier_test?.trades != null
                      ? `, testée : ${s.dernier_test.trades} trades, ${(s.dernier_test.r_moyen ?? 0) >= 0 ? "+" : ""}${v(s.dernier_test.r_moyen ?? 0, 2)} R par trade`
                      : ", pas encore testée"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3">
                  <Button size="sm" variant="secondary" onClick={() => ouvrir(s)}>Modifier</Button>
                  <Button size="sm" variant="secondary" onClick={async () => { await strategiesAPI.activer(s.id); charger(); }}>
                    {s.active ? "Désactiver" : "Activer"}
                  </Button>
                  <Button size="sm" variant="quiet" onClick={async () => {
                    if (!confirm(`Supprimer « ${s.nom} » ?`)) return;
                    await strategiesAPI.supprimer(s.id);
                    if (enCours === s.id) { setEnCours(null); }
                    charger();
                  }}>Supprimer</Button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        {/* ── Les cinq questions ─────────────────────────────────────── */}
        <div className="space-y-8">
          <Chapitre n="I" titre="L'idée" question="Que voulez-vous attraper ?">
            <div className="grid gap-3 sm:grid-cols-2">
              {IDEES.map((i) => {
                const choisie = idee === i.cle;
                return (
                  <button key={i.cle} type="button" onClick={() => choisirIdee(i.cle)} aria-pressed={choisie}
                    className="rounded-[14px] p-4 text-left transition-colors"
                    style={{ backgroundColor: choisie ? "color-mix(in srgb, var(--cap-ambre) 10%, var(--cap-surface))" : "var(--cap-surface)",
                             boxShadow: `inset 0 0 0 ${choisie ? 2 : 1}px ${choisie ? "var(--cap-ambre)" : "var(--cap-line)"}` }}>
                    <span className="block text-[1.05rem] font-semibold" style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}>{i.titre}</span>
                    <span className="mt-1 block text-[0.88rem]" style={{ color: "var(--cap-ink-2)" }}>{i.phrase}</span>
                  </button>
                );
              })}
            </div>
            {idee && (
              <div className="mt-4 flex items-start gap-3">
                <Nimbo humeur="content" taille={48} label="" className="-my-1 flex-none" />
                <Text size="small" tone="ink">{IDEES.find((i) => i.cle === idee)?.nimbo}</Text>
              </div>
            )}
          </Chapitre>

          <Chapitre n="II" titre="Les actifs" question="Sur quels actifs la tester ?">
            <div className="flex flex-wrap items-center gap-2">
              {regles.actifs.map((a) => (
                <span key={a} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.9rem]"
                  style={{ backgroundColor: "var(--cap-surface-2)", color: "var(--cap-ink)" }}>
                  {a}
                  <button type="button" aria-label={`Retirer ${a}`} onClick={() => maj({ actifs: regles.actifs.filter((x) => x !== a) })}
                    style={{ color: "var(--cap-ink-3)" }}>×</button>
                </span>
              ))}
            </div>
            {regles.actifs.length < 5 && (
              <div className="relative mt-3 flex flex-wrap items-end gap-3">
                <input value={recherche} onChange={(e) => setRecherche(e.target.value)} onKeyDown={(e) => {
                  sugg.touche(e);
                  if (e.key === "Enter") { e.preventDefault(); ajouterActif(sugg.choisi?.symbol ?? recherche); }
                }} placeholder="Apple, LVMH, bitcoin…" aria-label="Ajouter un actif"
                  className="cap-champ-ligne h-11 min-w-[14rem] flex-1 bg-transparent px-0.5 text-[1.1rem] outline-none"
                  style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }} />
                <Button size="sm" variant="secondary" onClick={ajouterFavoris}>Ajouter mes favoris</Button>
                <AnimatePresence>
                  {sugg.ouvert && recherche.trim().length >= 2 && (
                    <ListeSuggestions requete={recherche} hits={sugg.hits} actif={sugg.actif} cherche={sugg.cherche}
                      onSurvol={sugg.setActif} onChoisir={ajouterActif}
                      className="absolute left-0 top-[calc(100%+6px)] z-40 w-[22rem] overflow-hidden p-1.5" />
                  )}
                </AnimatePresence>
              </div>
            )}
            <Text size="caption" className="mt-2">Jusqu&apos;à 5 actifs. Plus il y en a, plus le test compte de trades, et plus il est fiable.</Text>
          </Chapitre>

          <Chapitre n="III" titre="L'entrée" question="Quand entrer ?">
            <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-3">
              <SegmentedControl size="sm" aria-label="Sens" value={regles.sens}
                options={[{ value: "achat", label: "J'achète" }, { value: "vente", label: "Je vends à découvert" }]}
                onChange={(sens) => maj({ sens: sens as ReglesStrategie["sens"] })} />
              <SegmentedControl size="sm" aria-label="Unité" value={regles.unite}
                options={[{ value: "1d", label: "Bougies d'un jour" }, { value: "1wk", label: "Bougies d'une semaine" }]}
                onChange={(unite) => maj({ unite: unite as ReglesStrategie["unite"] })} />
            </div>
            {regles.conditions.length > 0 ? (
              <ul>
                {regles.conditions.map((c, i) => (
                  <Condition key={`${i}-${c.type}`} c={c} index={i}
                    onChange={(n) => maj({ conditions: regles.conditions.map((x, j) => (j === i ? n : x)) })}
                    onRetirer={() => maj({ conditions: regles.conditions.filter((_, j) => j !== i) })} />
                ))}
              </ul>
            ) : (
              <Text size="small">Aucune condition pour l&apos;instant. Choisissez une idée au-dessus, ou ajoutez une brique.</Text>
            )}
            <details className="mt-3">
              <summary className="cursor-pointer text-[0.92rem] font-semibold underline decoration-[color:var(--cap-ambre)] decoration-2 underline-offset-[6px]"
                style={{ color: "var(--cap-ink)" }}>Ajouter une condition</summary>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {(Object.keys(CATALOGUE) as TypeCondition[]).map((t) => (
                  <li key={t}>
                    <button type="button" className="w-full rounded-[12px] p-3 text-left text-[0.9rem]"
                      style={{ boxShadow: "inset 0 0 0 1px var(--cap-line)", color: "var(--cap-ink)" }}
                      onClick={() => maj({ conditions: [...regles.conditions, CATALOGUE[t].defaut as ConditionStrategie] })}>
                      {CATALOGUE[t].titre}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          </Chapitre>

          <Chapitre n="IV" titre="La sortie" question="Quand sortir ?">
            <Curseur label="Stop, en volatilités (ATR)" value={regles.stop_atr} min={0.5} max={5} step={0.25}
              onChange={(stop_atr) => maj({ stop_atr })}
              texte={`Le stop se place à ${v(regles.stop_atr, 2)} fois la variation habituelle d'une ${regles.unite === "1d" ? "séance" : "semaine"} sous le prix d'entrée. Trop près, le bruit du marché le touche ; trop loin, chaque perte coûte plus.`} />
            <Curseur label="Objectif, en multiple du risque" value={R} min={0.5} max={6} step={0.25}
              onChange={(objectif_r) => maj({ objectif_r })}
              texte={`Vous visez ${v(R, 2)} fois ce que vous risquez. Pour ne pas perdre d'argent, il faudra avoir raison au moins ${seuilGain(R)} fois sur 100.`} />
            <Curseur label={`Durée maximale, en ${regles.unite === "1d" ? "séances" : "semaines"}`} value={regles.duree_max} min={2} max={60} step={1}
              onChange={(duree_max) => maj({ duree_max })}
              texte={`Si ni le stop ni l'objectif ne sont touchés après ${regles.duree_max} ${regles.unite === "1d" ? "séances" : "semaines"}, la position est fermée au cours du moment.`} />
          </Chapitre>

          <Chapitre n="V" titre="Le risque" question="Combien risquer par trade ?">
            <Curseur label="Part du capital perdue si le stop est touché, en %" value={regles.risque_pct} min={0.25} max={5} step={0.25}
              onChange={(risque_pct) => maj({ risque_pct })}
              texte={`Sur 10 000 €, un stop touché coûte ${v(regles.risque_pct * 100, 0)} €. Dix pertes d'affilée, ce qui arrive à toute stratégie, retirent environ ${v(100 * (1 - (1 - regles.risque_pct / 100) ** 10), 0)} % du compte.`} />
            <div className="mt-2">
              <label className="text-[0.95rem] font-semibold" style={{ color: "var(--cap-ink)" }} htmlFor="nom-strat">Son nom</label>
              <input id="nom-strat" value={regles.nom} maxLength={60} onChange={(e) => maj({ nom: e.target.value })}
                className="cap-champ-ligne mt-1 h-11 w-full bg-transparent px-0.5 text-[1.15rem] outline-none"
                style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }} />
            </div>
          </Chapitre>
        </div>

        {/* ── Nimbo relit, en direct ─────────────────────────────────── */}
        <aside className="lg:sticky lg:top-28">
          <Panel>
            <div className="flex items-start gap-3">
              <Nimbo humeur={bloquante ? "reflechit" : avis.some((a) => a.niveau === "attention") ? "prudent" : "content"}
                taille={64} label="" className="-my-1 flex-none" />
              <div className="min-w-0">
                <p className="text-[0.9rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>Nimbo relit votre stratégie</p>
                <p className="text-[1.1rem] font-semibold leading-snug" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
                  {bloquante ? "Il reste quelque chose à corriger." : avis.length ? "Testable, avec quelques remarques." : "Rien à redire, on peut tester."}
                </p>
              </div>
            </div>
            <div className="mt-4"><ListeAvis avis={avis} vide="Je ne vois pas d'erreur dans ces règles." /></div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button size="md" onClick={tester} disabled={!testable}>{enTest ? "Test en cours…" : "Tester sur les années passées"}</Button>
            </div>
            {regles.conditions.some((c) => c.type === "score_nimbo") && (
              <Text size="caption" className="mt-2">Avec mon score dans les règles, le test prend quelques secondes de plus.</Text>
            )}
            {erreur && <div className="mt-3"><FormError>{erreur}</FormError></div>}
          </Panel>
        </aside>
      </div>

      {resultat && (
        <div ref={resultatsRef} className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4 border-t pt-6" style={{ borderColor: "var(--cap-line-strong)" }}>
            <div>
              <p data-eyebrow className="mb-1">Le test</p>
              <Heading level={2}>{regles.nom}, sur les années passées</Heading>
              {resultatPerime && <Text size="small" className="mt-1">Vous avez modifié la stratégie depuis ce test : relancez-le pour voir l&apos;effet.</Text>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="md" variant="secondary" onClick={() => sauver(false)} disabled={bloquante}>Enregistrer</Button>
              <Button size="md" onClick={() => sauver(true)} disabled={bloquante}>Enregistrer et activer</Button>
            </div>
          </div>
          {message && <Text size="small" tone="up">{message}</Text>}
          <Resultats r={resultat} risque={regles.risque_pct}
            rejeu={reglesTestees && actifsTestes.length > 0 ? <Rejeu regles={reglesTestees} actifs={actifsTestes} /> : null} />
        </div>
      )}
    </div>
  );
}
