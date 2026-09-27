"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ExternalLink, Landmark, Loader2 } from "lucide-react";
import {
  macroAPI,
  type AnnonceMacro, type FicheMacro, type ImpactMacro,
} from "@/lib/api";
import { fr } from "@/lib/SettingsContext";
import {
  Checkbox, Eyebrow, Heading, Num, Panel, SegmentedControl, Text, WeatherBackdrop, useAnimationsEnabled,
} from "@/components/design-system";

/**
 * L'agenda macro.
 *
 * Deux questions, deux vues. L'agenda répond à « qu'est-ce qui arrive, et
 * est-ce que ça me concerne ? » ; la fiche d'une annonce à « qu'est-ce qui a
 * été décidé, comment le marché l'a lu, et qu'est-ce que ça change pour
 * chacun de mes actifs ? ». La fiche s'ouvre aussi depuis une notification
 * (/macro?e=46).
 */

export default function MacroPage() {
  return (
    <Suspense fallback={null}>
      <Macro />
    </Suspense>
  );
}

function Macro() {
  const params = useSearchParams();
  const [animOn] = useAnimationsEnabled();
  const e = Number(params.get("e")) || null;
  return (
    <>
      <WeatherBackdrop condition="cloudy" enabled={animOn} />
      <div className="relative space-y-6">{e ? <Fiche id={e} /> : <Agenda />}</div>
    </>
  );
}

/* ── Petits éléments partagés ──────────────────────────────────────────── */

const PAYS_DRAPEAU: Record<string, string> = { USD: "us", EUR: "eu", GBP: "gb", JPY: "jp", CHF: "ch", CAD: "ca", AUD: "au", NZD: "nz", CNY: "cn" };

/** Un drapeau en SVG (flag-icons), jamais en emoji : rendu identique partout. */
function Drapeau({ pays, nom }: { pays: string; nom?: string }) {
  const code = PAYS_DRAPEAU[pays];
  if (!code) return null;
  return <span className={`fi fi-${code} mr-1.5 rounded-[2px] align-[-1px]`} role="img" aria-label={nom ?? pays} />;
}


function Pastille({ children, ton = "neutre" }: { children: React.ReactNode; ton?: "neutre" | "haut" | "bas" | "fort" | "info" }) {
  const couleurs = {
    neutre: { bg: "var(--cap-surface-2)", fg: "var(--cap-ink-2)" },
    haut: { bg: "rgba(23,138,88,0.10)", fg: "var(--cap-up)" },
    bas: { bg: "rgba(196,52,52,0.10)", fg: "var(--cap-down)" },
    fort: { bg: "rgba(196,52,52,0.10)", fg: "var(--cap-down)" },
    info: { bg: "rgba(36,99,135,0.10)", fg: "var(--cap-ocean)" },
  }[ton];
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-[6px] px-1.5 py-0.5 text-[0.75rem] font-medium"
      style={{ backgroundColor: couleurs.bg, color: couleurs.fg }}>
      {children}
    </span>
  );
}

function dans(quand: string): string {
  const ms = new Date(quand).getTime() - Date.now();
  if (ms <= 0) return "";
  const h = ms / 3_600_000;
  if (h < 1) return `dans ${Math.max(1, Math.round(ms / 60_000))} min`;
  if (h < 24) return `dans ${Math.round(h)} h`;
  const j = Math.round(h / 24);
  return `dans ${j} jour${j > 1 ? "s" : ""}`;
}

function Statut({ a }: { a: AnnonceMacro }) {
  if (a.statut === "publie") return <Pastille ton="info">Publié</Pastille>;
  if (a.statut === "en_cours") return <Pastille ton="fort">En cours de lecture</Pastille>;
  const d = dans(a.quand);
  if (d) return <Pastille>{d}</Pastille>;
  // Passée depuis plus de douze heures sans lecture : un discours, ou une
  // annonce que le moteur n'a pas pu lire. « En attente » serait faux.
  return Date.now() - new Date(a.quand).getTime() > 12 * 3_600_000
    ? <Pastille>Passé</Pastille>
    : <Pastille>En attente du résultat</Pastille>;
}

/** « mercredi 28 octobre » → « Mercredi 28 octobre » : la majuscule au seul premier mot. */
const phrase = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Les seuls actifs que l'annonce touche. */
const touches = (l: ImpactMacro[]) => l.filter((x) => x.sens_si_restrictive !== 0);

const fleche = (s: number) => (s > 0 ? "↑" : s < 0 ? "↓" : "→");

/* ── L'agenda ──────────────────────────────────────────────────────────── */

function Agenda() {
  const [importance, setImportance] = useState<"High" | "Medium">("High");
  const [toutes, setToutes] = useState(false);
  const [data, setData] = useState<{ evenements: AnnonceMacro[]; devises: string[] | null } | null>(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    let vivant = true;
    setData(null);
    macroAPI.agenda({ jours: 90, passe: 7, importance, toutes })
      .then((d) => { if (vivant) setData(d); })
      .catch((e) => { if (vivant) setErreur(e instanceof Error ? e.message : "Agenda indisponible."); });
    return () => { vivant = false; };
  }, [importance, toutes]);

  const jours = useMemo(() => {
    const g: { cle: string; titre: string; passe: boolean; items: AnnonceMacro[] }[] = [];
    for (const e of data?.evenements ?? []) {
      const cle = e.date_longue;
      let x = g.find((j) => j.cle === cle);
      if (!x) {
        x = { cle, titre: e.date_longue, passe: new Date(e.quand).getTime() < Date.now() - 12 * 3_600_000, items: [] };
        g.push(x);
      }
      x.items.push(e);
    }
    return g;
  }, [data]);

  return (
    <>
      <header className="max-w-[42rem] pt-2">
        <Eyebrow>Analyser</Eyebrow>
        <Heading level={1} className="mt-3">Agenda macro</Heading>
        <Text className="mt-3">
          Les décisions des banques centrales et les chiffres qui font bouger les marchés. Pour chacun :
          ce que c&apos;est, ce qui a été annoncé, comment le marché l&apos;a lu — et ce que ça change pour
          vos actifs, qui ne réagissent pas tous dans le même sens.
        </Text>
      </header>

      <div className="flex flex-wrap items-center gap-4">
        <SegmentedControl
          size="sm"
          options={[{ value: "High", label: "Les plus importantes" }, { value: "Medium", label: "Toutes" }]}
          value={importance}
          onChange={(v) => setImportance(v as "High" | "Medium")}
          aria-label="Importance"
        />
        <Checkbox checked={toutes} onChange={setToutes}>Toutes les devises</Checkbox>
        {data?.devises && !toutes && (
          <Text size="caption" as="span">Vos marchés : {data.devises.join(", ")}</Text>
        )}
      </div>

      {erreur ? (
        <Panel><Text tone="down">{erreur}</Text></Panel>
      ) : !data ? (
        <div className="flex items-center gap-3 py-10">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--cap-ink-3)" }} />
          <Text>Lecture des calendriers officiels…</Text>
        </div>
      ) : jours.length === 0 ? (
        <Panel><Text size="small">Aucune annonce sur la période.</Text></Panel>
      ) : (
        <div className="space-y-5">
          {jours.map((j) => (
            <section key={j.cle}>
              <Text size="caption" tone="faint" className="mb-2">{phrase(j.titre)}</Text>
              <ul className="space-y-2.5">
                {j.items.map((a) => <LigneAnnonce key={a.id} a={a} />)}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Text size="caption" tone="faint">
        Sources : calendriers officiels de la Réserve fédérale et de la BCE, calendrier économique ForexFactory
        (statistiques, publié chaque semaine). Heures de Paris.
      </Text>
    </>
  );
}

function LigneAnnonce({ a }: { a: AnnonceMacro }) {
  return (
    <li>
      <Link
        href={`/macro?e=${a.id}`}
        className="block rounded-[14px] p-4 transition-colors hover:bg-[color:var(--cap-surface-2)]"
        style={{ backgroundColor: "var(--cap-surface)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}
      >
        <div className="flex items-start gap-3">
          <Num tone="muted" className="w-[3rem] shrink-0 pt-[2px] text-[0.82rem]">{a.heure}</Num>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[0.95rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                <Drapeau pays={a.pays} nom={a.pays_nom} />{a.titre}
              </span>
              {a.importance === "forte" && <Pastille ton="fort">Importance forte</Pastille>}
              {a.officiel && <Pastille>Date officielle</Pastille>}
              <Statut a={a} />
            </div>
            {a.resume ? (
              <Text size="small" className="mt-1.5 line-clamp-2">{a.resume}</Text>
            ) : (a.prevision || a.precedent) ? (
              <Text size="caption" className="mt-1">
                {a.prevision && <>attendu {a.prevision}</>}{a.prevision && a.precedent && " · "}
                {a.precedent && <>précédent {a.precedent}</>}
              </Text>
            ) : null}
            {a.vos_actifs && a.vos_actifs.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Text size="caption" as="span">{a.lecture ? "Pour vos actifs :" : "Si la surprise est ferme :"}</Text>
                {a.vos_actifs.map((v) => {
                  const s = v.sens_effectif ?? v.sens_si_restrictive;
                  return (
                    <Pastille key={v.symbole} ton={s > 0 ? "haut" : "bas"}>
                      {v.nom} {fleche(s)}
                    </Pastille>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

/* ── La fiche d'une annonce ────────────────────────────────────────────── */

function Fiche({ id }: { id: number }) {
  const router = useRouter();
  const [f, setF] = useState<FicheMacro | null>(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    let vivant = true;
    macroAPI.evenement(id)
      .then((d) => { if (vivant) setF(d); })
      .catch((e) => { if (vivant) setErreur(e instanceof Error ? e.message : "Annonce introuvable."); });
    return () => { vivant = false; };
  }, [id]);

  const retour = (
    <button onClick={() => router.push("/macro")}
      className="inline-flex items-center gap-1.5 pt-2 text-[0.85rem] hover:underline" style={{ color: "var(--cap-ink-2)" }}>
      <ArrowLeft size={14} aria-hidden /> Agenda macro
    </button>
  );

  if (erreur) return <>{retour}<Panel><Text tone="down">{erreur}</Text></Panel></>;
  if (!f) {
    return (
      <>
        {retour}
        <div className="flex items-center gap-3 py-10">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--cap-ink-3)" }} />
          <Text>Calcul de l&apos;effet sur chaque actif…</Text>
        </div>
      </>
    );
  }

  const r = f.resultat;
  const dec = r?.officiel?.decision;

  return (
    <>
      {retour}
      <header className="max-w-[44rem]">
        <Eyebrow>{f.pays_nom}{f.famille_nom && f.famille_nom !== f.titre ? ` · ${f.famille_nom}` : ""}</Eyebrow>
        <Heading level={1} className="mt-3"><Drapeau pays={f.pays} nom={f.pays_nom} />{f.titre}</Heading>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Text size="small" tone="ink" as="span">{phrase(f.date_longue)} · {f.heure} (Paris)</Text>
          {f.importance === "forte" && <Pastille ton="fort">Importance forte</Pastille>}
          {f.officiel && <Pastille>Date officielle · {f.source}</Pastille>}
          <Statut a={f} />
        </div>
      </header>

      <Panel title="Ce que c'est">
        {f.explication && <Text size="small" tone="ink">{f.explication}</Text>}
        {f.pourquoi && f.pourquoi !== f.explication && <Text size="small" className="mt-2">{f.pourquoi}</Text>}
        {f.note && <Text size="small" className="mt-2">{f.note}</Text>}
        {f.restrictive && (
          <Text size="small" className="mt-2">
            On parle de surprise <b>ferme</b> quand : {f.restrictive}. L&apos;inverse est une surprise <b>souple</b>.
          </Text>
        )}
        {(f.prevision || f.precedent) && (
          <div className="mt-3 flex flex-wrap gap-5">
            {f.prevision && <div><Text size="caption" as="span" className="block">Attendu (consensus)</Text><Num className="text-[1.05rem]">{f.prevision}</Num></div>}
            {f.precedent && <div><Text size="caption" as="span" className="block">Précédent</Text><Num className="text-[1.05rem]">{f.precedent}</Num></div>}
          </div>
        )}
      </Panel>

      {r ? (
        <Panel
          title={r.definitif ? "Ce qui a été annoncé" : "Ce qui a été annoncé — lecture provisoire"}
          hint={r.definitif ? undefined : "La première heure après l'annonce : la lecture se précise toutes les cinq minutes."}
          aside={<Landmark size={15} aria-hidden style={{ color: "var(--cap-ink-4)" }} />}
        >
          <Text tone="ink">{r.resume}</Text>

          {dec && (
            <div className="mt-4 flex flex-wrap gap-5">
              <div>
                <Text size="caption" as="span" className="block">Décision</Text>
                <Num className="text-[1.05rem]">
                  {dec.action === "hausse" ? "Hausse" : dec.action === "baisse" ? "Baisse" : "Maintien"}
                  {dec.ampleur_pb ? ` de ${dec.ampleur_pb} pb` : ""}
                </Num>
              </div>
              {dec.niveau && <div><Text size="caption" as="span" className="block">Nouveau niveau</Text><Num className="text-[1.05rem]">{dec.niveau}</Num></div>}
              {dec.vote && <div><Text size="caption" as="span" className="block">Vote</Text><Num className="text-[1.05rem]">{dec.vote}</Num></div>}
            </div>
          )}

          {r.resume_communique && (
            <div className="mt-4 rounded-[12px] p-4" style={{ boxShadow: "inset 0 0 0 1px var(--cap-line)" }}>
              <Text size="caption" tone="faint">Le communiqué, résumé en français par l&apos;IA à partir de son seul texte</Text>
              <Text size="small" className="mt-1.5">{r.resume_communique}</Text>
            </div>
          )}
          {r.officiel?.url && (
            <a href={r.officiel.url} target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-[0.82rem] underline underline-offset-2" style={{ color: "var(--cap-ocean)" }}>
              Lire le communiqué officiel <ExternalLink size={12} aria-hidden />
            </a>
          )}

          {r.reaction.length > 0 && (
            <div className="mt-5">
              <Text size="caption" tone="faint" className="mb-2">La réaction des marchés dans l&apos;heure qui a suivi</Text>
              <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
                {r.reaction.map((x) => (
                  <li key={x.symbole} className="flex items-baseline justify-between gap-3 py-2">
                    <Text size="small" tone="ink" as="span">{x.nom}</Text>
                    <Num tone={x.variation > 0 ? "up" : x.variation < 0 ? "down" : "muted"} className="shrink-0 text-[0.88rem]">
                      {x.variation > 0 ? "+" : x.variation < 0 ? "−" : ""}{fr(Math.abs(x.variation), x.unite === "pb" ? 0 : 2)} {x.unite === "pb" ? "pb" : "%"}
                    </Num>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {r.presse.length > 0 && (
            <div className="mt-5">
              <Text size="caption" tone="faint" className="mb-2">Dans la presse</Text>
              <ul className="space-y-1.5">
                {r.presse.map((p, i) => (
                  <li key={i}>
                    <a href={p.lien} target="_blank" rel="noopener noreferrer" className="text-[0.88rem] hover:underline" style={{ color: "var(--cap-ink)" }}>
                      {p.titre}
                    </a>
                    <Text size="caption" as="span"> · {p.source}</Text>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      ) : (
        <Panel title="Le résultat">
          <Text size="small">
            {f.statut === "a_venir" && dans(f.quand)
              ? `L'annonce est ${dans(f.quand)}. `
              : "L'annonce est passée ; sa lecture n'est pas encore disponible. "}
            Quelques minutes après sa publication, cette page affichera la décision
            {f.officiel ? " lue dans le communiqué officiel" : ""}, la réaction mesurée des marchés, et
            l&apos;effet sur chacun des actifs ci-dessous.
          </Text>
        </Panel>
      )}

      {f.banque && (
        <>
          {/* Un actif sans effet attendu n'a rien à faire ici : une ligne
              « pas d'effet net » sous un titre « plus ferme qu'attendu » laisse
              croire qu'il se passe quelque chose. On ne montre que ce que
              l'annonce touche. */}
          {f.impacts_vous.length === 0 ? (
            <Panel title="Ce que ça change pour vos actifs">
              <Text size="small">
                Vous n&apos;avez ni position ouverte ni favori. Ajoutez des actifs en favori pour voir ici ce que
                chaque annonce leur fait.
              </Text>
            </Panel>
          ) : touches(f.impacts_vous).length > 0 && (
            <Panel
              title="Ce que ça change pour vos actifs"
              hint={f.lecture != null
                ? "Selon la lecture du marché, et ce que l'historique dit de chaque actif."
                : "Le sens dépend de la surprise : plus ferme ou plus souple qu'attendu."}
            >
              <ListeImpacts impacts={touches(f.impacts_vous)} lecture={f.lecture} />
            </Panel>
          )}

          {touches(f.impacts_reference).length > 0 && (
            <Panel title="Et pour le reste du marché" hint="Tous les actifs ne réagissent pas dans le même sens.">
              <ListeImpacts impacts={touches(f.impacts_reference)} lecture={f.lecture} />
            </Panel>
          )}

          <Methode thermometre={f.thermometre} />
        </>
      )}
    </>
  );
}

function ListeImpacts({ impacts, lecture }: { impacts: ImpactMacro[]; lecture: number | null }) {
  return (
    <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
      {impacts.map((x) => <LigneImpact key={x.symbole} x={x} lecture={lecture} />)}
    </ul>
  );
}

function LigneImpact({ x, lecture }: { x: ImpactMacro; lecture: number | null }) {
  const [ouvert, setOuvert] = useState(false);
  const s = x.sens_si_restrictive;
  const m = x.mesure;
  const fiab =
    x.source === "mesure" ? { mot: "Mesuré · fiable", ton: "info" as const }
      : x.conforte ? { mot: "Mécanisme conforté par l'historique", ton: "neutre" as const }
          : x.source === "mecanisme" ? { mot: "Mécanisme, non vérifié", ton: "neutre" as const }
            : { mot: "Pas d'effet net", ton: "neutre" as const };

  let badge: React.ReactNode;
  if (!s) badge = <Pastille>Pas d&apos;effet net</Pastille>;
  else if (lecture) {
    const e = s * lecture;
    badge = <Pastille ton={e > 0 ? "haut" : "bas"}>{e > 0 ? "Plutôt favorable" : "Plutôt défavorable"} {fleche(e)}</Pastille>;
  } else {
    badge = (
      <span className="flex flex-wrap gap-1">
        <Pastille ton={s > 0 ? "haut" : "bas"}>si ferme {fleche(s)}</Pastille>
        <Pastille ton={s > 0 ? "bas" : "haut"}>si souple {fleche(-s)}</Pastille>
      </span>
    );
  }

  const aDetail = m && (m.fiabilite === "fiable" || m.fiabilite === "indicatif" || m.fiabilite === "non_mesurable") && m.n;

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5">
        <div className="min-w-0">
          <Link href={`/analysis?symbol=${encodeURIComponent(x.symbole)}`} className="text-[0.92rem] font-medium hover:underline" style={{ color: "var(--cap-ink)" }}>
            {x.nom}
          </Link>
          {x.position && <Text size="caption" as="span"> · position {x.position === "LONG" ? "à l'achat" : "à la vente"}</Text>}
        </div>
        {badge}
      </div>
      <Text size="small" className="mt-1">{x.phrase}</Text>
      {s !== 0 && x.pourquoi && x.source !== "mesure" && <Text size="caption" className="mt-1">Pourquoi : {x.pourquoi}</Text>}
      {s !== 0 && x.pourquoi && x.source === "mesure" && x.contredit_mecanisme && <Text size="caption" className="mt-1">Ce que prévoyait le raisonnement : {x.pourquoi}</Text>}
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <Pastille ton={fiab.ton}>{fiab.mot}</Pastille>
        {x.mesure_par_procuration && <Text size="caption" as="span">sensibilité mesurée les jours de décision de la banque centrale</Text>}
        {aDetail && (
          <button onClick={() => setOuvert(!ouvert)} className="text-[0.78rem] underline underline-offset-2" style={{ color: "var(--cap-ocean)" }}>
            {ouvert ? "Masquer la mesure" : "Voir la mesure"}
          </button>
        )}
      </div>
      {ouvert && m && m.n ? (
        <div className="mt-2 grid grid-cols-2 gap-3 rounded-[10px] p-3 sm:grid-cols-4" style={{ backgroundColor: "var(--cap-surface-2)" }}>
          <Chiffre label="Décisions étudiées" valeur={String(m.n)} />
          {m.moyenne_durs != null && <Chiffre label={`Jours fermes (${m.n_durs})`} valeur={`${m.moyenne_durs > 0 ? "+" : ""}${fr(m.moyenne_durs, 2)} %`} ton={m.moyenne_durs} />}
          {m.moyenne_doux != null && <Chiffre label={`Jours souples (${m.n_doux})`} valeur={`${m.moyenne_doux > 0 ? "+" : ""}${fr(m.moyenne_doux, 2)} %`} ton={m.moyenne_doux} />}
          {m.amplification != null && <Chiffre label="Mouvement vs jour normal" valeur={`×${fr(m.amplification, 2)}`} />}
          {m.t != null && <Chiffre label="Solidité (t)" valeur={fr(m.t, 1)} />}
          {m.regularite != null && <Chiffre label="Régularité" valeur={`${m.regularite} %`} />}
          {m.decalage_jours ? <Text size="caption" className="col-span-2 sm:col-span-4">Réagit le jour de Bourse suivant : son marché est fermé au moment de l&apos;annonce.</Text> : null}
        </div>
      ) : null}
    </li>
  );
}

function Chiffre({ label, valeur, ton }: { label: string; valeur: string; ton?: number }) {
  return (
    <div>
      <Text size="caption" as="span" className="block">{label}</Text>
      <Num tone={ton == null ? "ink" : ton > 0 ? "up" : ton < 0 ? "down" : "ink"} className="text-[0.92rem]">{valeur}</Num>
    </div>
  );
}

function Methode({ thermometre }: { thermometre: string | null }) {
  return (
    <Panel title="Comment c'est calculé">
      <Text size="small">
        Deux couches. Le <b>mécanisme</b> dit comment une surprise se transmet à chaque famille d&apos;actifs
        (taux, devise, secteur). La <b>mesure</b> vérifie, actif par actif, ce qui s&apos;est réellement passé
        lors de chaque décision depuis 2021 pour la Fed et 2022 pour la BCE. Le marché y dit lui-même si une
        décision a surpris : on suit {thermometre ?? "un thermomètre de marché"} le jour de l&apos;annonce —
        s&apos;il monte, la décision a été lue comme plus ferme qu&apos;attendu.
      </Text>
      <Text size="small" className="mt-2">
        Une mesure n&apos;est dite <b>fiable</b> que si elle est statistiquement solide (t ≥ 2 sur au moins vingt
        décisions). Quand elle contredit le mécanisme, c&apos;est elle qui l&apos;emporte, et c&apos;est dit.
        Ce sont des tendances passées, pas une promesse : une décision peut surprendre autrement.
      </Text>
      <Link href="/analysis" className="mt-3 inline-flex items-center gap-1 text-[0.82rem] underline underline-offset-2" style={{ color: "var(--cap-ocean)" }}>
        Analyser un actif <ArrowUpRight size={12} aria-hidden />
      </Link>
    </Panel>
  );
}
