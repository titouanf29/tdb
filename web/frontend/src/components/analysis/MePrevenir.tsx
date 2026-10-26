"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { BellPlus, X } from "lucide-react";
import { Button, EASE, FormError, Text, useMouvementReduit } from "@/components/design-system";
import { alertsAPI, type PriceAlert } from "@/lib/api";
import { etatPush } from "@/lib/push";

/**
 * « Me prévenir à un prix », sous l'avis de Nimbo.
 *
 * Le serveur surveillait déjà les alertes toutes les trois minutes, même site
 * fermé, et la notification était prête : il manquait le bouton pour en
 * créer une. C'est le geste le plus simple pour se donner un rendez-vous avec
 * un actif, au lieu d'attendre de repasser par hasard.
 *
 * Les prix proposés sont ceux que l'analyse vient de montrer (l'objectif, le
 * stop, la résistance, le support), et le sens se déduit tout seul : un prix
 * au-dessus du cours actuel prévient quand il est atteint en montant, un prix
 * en dessous, en descendant. Une alerte qui se déclencherait tout de suite
 * n'est donc jamais créée par erreur.
 */

export interface PrixRepere { libelle: string; prix: number }

function lirePrix(texte: string): number | null {
  const n = Number(texte.replace(/[\s  ]/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function MePrevenir({ symbol, nom, cours, assetPrice, reperes }: {
  symbol: string;
  nom: string;
  cours: number;
  assetPrice: (v: number) => string;
  reperes: PrixRepere[];
}) {
  const reduit = useMouvementReduit();
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [note, setNote] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  const [cree, setCree] = useState<PriceAlert | null>(null);
  const [miennes, setMiennes] = useState<PriceAlert[]>([]);
  const [pushActif, setPushActif] = useState(true);

  const charger = useCallback(() => {
    alertsAPI.list()
      .then((d) => setMiennes((d.alerts || []).filter((a) => a.symbol === symbol && a.status === "active")))
      .catch(() => {});
  }, [symbol]);

  useEffect(() => { charger(); setCree(null); setSaisie(""); setNote(""); setErreur(""); }, [charger]);
  useEffect(() => {
    if (ouvert) etatPush().then((e) => setPushActif(e === "actif" || e === "non_configure")).catch(() => {});
  }, [ouvert]);

  const prix = lirePrix(saisie);
  const sens: "above" | "below" | null = prix == null || !cours ? null : prix > cours ? "above" : prix < cours ? "below" : null;
  const ecart = prix != null && cours ? ((prix - cours) / cours) * 100 : null;
  // Un même prix n'est proposé qu'une fois : l'objectif est souvent posé
  // pile sur la résistance, et deux boutons identiques font douter.
  const choix = reperes
    .filter((r) => r.prix > 0 && Math.abs(r.prix - cours) / cours > 0.0005)
    .filter((r, i, l) => l.findIndex((x) => assetPrice(x.prix) === assetPrice(r.prix)) === i);

  const creer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur("");
    if (prix == null) return setErreur("Indiquez un prix, par exemple " + assetPrice(cours * 1.02) + ".");
    if (!sens) return setErreur("Ce prix est le cours actuel : choisissez un prix au-dessus ou en dessous.");
    setOccupe(true);
    try {
      const a = await alertsAPI.create(symbol, sens, prix, note.trim());
      setCree(a);
      setSaisie(""); setNote("");
      charger();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "L'alerte n'a pas pu être créée. Réessayez dans un instant.");
    } finally { setOccupe(false); }
  };

  const supprimer = async (a: PriceAlert) => {
    setMiennes((l) => l.filter((x) => x.id !== a.id));
    try { await alertsAPI.remove(a.id); } catch { charger(); }
  };

  const sensTexte = (d: "above" | "below") => (d === "above" ? "au-dessus de" : "en dessous de");
  const champ = {
    backgroundColor: "var(--cap-bg)", color: "var(--cap-ink)", boxShadow: "inset 0 0 0 1px var(--cap-line-strong)",
  };

  return (
    <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--cap-line)" }}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={() => setOuvert((v) => !v)}
          aria-expanded={ouvert}
          aria-controls="me-prevenir"
          className="inline-flex min-h-[44px] items-center gap-2 text-[0.95rem] font-medium underline decoration-[color:var(--cap-ambre)] decoration-2 underline-offset-[6px]"
          style={{ color: "var(--cap-ink)" }}
        >
          <BellPlus className="h-4 w-4" aria-hidden style={{ color: "var(--cap-ocean)" }} />
          Me prévenir à un prix
        </button>
        {miennes.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label={`Vos alertes sur ${nom}`}>
            {miennes.map((a) => (
              <li key={a.id} className="inline-flex items-center gap-1 rounded-full py-1 pl-3 pr-1 text-[0.82rem]"
                style={{ backgroundColor: "var(--cap-surface-2)", color: "var(--cap-ink-2)" }}>
                {a.direction === "above" ? "Au-dessus de" : "En dessous de"} <span className="cap-num" style={{ color: "var(--cap-ink)" }}>{assetPrice(a.target)}</span>
                <button type="button" onClick={() => supprimer(a)} aria-label={`Supprimer l'alerte ${sensTexte(a.direction)} ${assetPrice(a.target)}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-[color:var(--cap-surface-3)]">
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AnimatePresence initial={false}>
        {ouvert && (
          <motion.div
            id="me-prevenir"
            initial={reduit ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduit ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="overflow-hidden"
          >
            {cree ? (
              <div className="mt-3 rounded-[12px] px-4 py-3.5" style={{ backgroundColor: "var(--cap-surface-2)" }} role="status">
                <p className="text-[0.95rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                  C&apos;est noté : je vous préviens quand {nom} passera {sensTexte(cree.direction)} {assetPrice(cree.target)}.
                </p>
                <Text size="small" className="mt-1">
                  Je vérifie le cours toutes les trois minutes, même quand le site est fermé.
                  {!pushActif && <> Pour être prévenu sur votre téléphone, <Link href="/settings?section=notifications" className="cap-lien">activez les notifications</Link>.</>}
                </Text>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[0.88rem]">
                  <button type="button" onClick={() => setCree(null)} className="cap-lien">Créer une autre alerte</button>
                  <Link href="/settings?section=notifications" className="cap-lien">Gérer mes alertes</Link>
                </div>
              </div>
            ) : (
              <form onSubmit={creer} className="mt-3 flex flex-col gap-3" noValidate>
                {choix.length > 0 && (
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Prix proposés">
                    {choix.map((r) => {
                      const actif = prix != null && Math.abs(prix - r.prix) < 1e-9;
                      return (
                        <button key={r.libelle} type="button"
                          onClick={() => setSaisie(String(Number(r.prix.toPrecision(8))).replace(".", ","))}
                          aria-pressed={actif}
                          className="rounded-[10px] px-3 py-2 text-left text-[0.85rem] transition-colors"
                          style={{
                            backgroundColor: actif ? "var(--cap-surface-2)" : "transparent",
                            boxShadow: `inset 0 0 0 1px ${actif ? "var(--cap-ocean)" : "var(--cap-line-strong)"}`,
                            color: "var(--cap-ink)",
                          }}>
                          <span style={{ color: "var(--cap-ink-3)" }}>{r.libelle}</span>{" "}
                          <span className="cap-num font-medium">{assetPrice(r.prix)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="flex min-w-0 flex-col gap-1 text-[0.85rem]" style={{ color: "var(--cap-ink-2)" }}>
                    Prix
                    <input
                      id={`alerte-prix-${symbol}`}
                      inputMode="decimal"
                      value={saisie}
                      onChange={(e) => setSaisie(e.target.value)}
                      placeholder={assetPrice(cours).replace(/[^\d,.\s ]/g, "").trim()}
                      className="h-11 w-full rounded-[10px] px-3 sm:w-40 text-[0.95rem] outline-none focus:shadow-[inset_0_0_0_2px_var(--cap-ocean)]"
                      style={champ}
                    />
                  </label>
                  <label className="flex min-w-0 flex-1 flex-col gap-1 text-[0.85rem]" style={{ color: "var(--cap-ink-2)" }}>
                    Pourquoi (facultatif)
                    <input
                      id={`alerte-note-${symbol}`}
                      value={note}
                      maxLength={140}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Cassure de la résistance, entrée possible…"
                      className="h-11 w-full min-w-0 rounded-[10px] px-3 text-[0.95rem] outline-none focus:shadow-[inset_0_0_0_2px_var(--cap-ocean)]"
                      style={champ}
                    />
                  </label>
                  <Button type="submit" size="md" disabled={occupe} className="w-full sm:w-auto">{occupe ? "Création…" : "Créer l'alerte"}</Button>
                </div>
                <p className="text-[0.82rem] leading-relaxed" style={{ color: "var(--cap-ink-3)" }} aria-live="polite">
                  {sens && ecart != null
                    ? <>Je vous préviendrai quand {nom} passera {sensTexte(sens)} {assetPrice(prix!)}, à {Math.abs(ecart).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} % {ecart > 0 ? "au-dessus" : "en dessous"} du cours actuel ({assetPrice(cours)}).</>
                    : <>Choisissez un prix proposé ou tapez le vôtre. Le cours actuel est de {assetPrice(cours)}.</>}
                </p>
                {erreur && <FormError>{erreur}</FormError>}
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
