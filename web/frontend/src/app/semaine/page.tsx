"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CalendarDays, Loader2, Newspaper, Sparkles } from "lucide-react";
import {
  semaineAPI, APIError,
  type ActifSemaine, type EvenementMacro, type PreparationSemaine,
} from "@/lib/api";
import { fr, useSettings, convertCurrency, useFormatAssetPrice } from "@/lib/SettingsContext";
import {
  Eyebrow, Heading, Metric, Num, Panel, Text, WeatherBackdrop, useAnimationsEnabled,
} from "@/components/design-system";

/**
 * La préparation de la semaine.
 *
 * Ouverte du vendredi soir au lundi 9 h, et seulement depuis l'accueil : ce
 * n'est pas une rubrique de plus dans le menu, c'est ce que l'accueil propose
 * quand il n'y a plus de séance à commenter.
 *
 * L'ordre suit la question qu'on se pose le dimanche : qu'est-ce que je dois
 * faire avant lundi (en premier, parce que c'est ce qui peut coûter), comment
 * s'est passée ma semaine, où en sont mes actifs, ce qui arrive, ce qui se dit.
 */

const signe = (v: number, d = 2) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fr(Math.abs(v), d)} %`;
const ton = (v?: number | null) => (v == null ? "muted" : v > 0 ? "up" : v < 0 ? "down" : "muted") as "up" | "down" | "muted";

function dateLongue(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
  });
}

export default function SemainePage() {
  const [animOn] = useAnimationsEnabled();
  const [data, setData] = useState<PreparationSemaine | null>(null);
  const [ferme, setFerme] = useState<string | null>(null);
  const [erreur, setErreur] = useState("");
  const [synthese, setSynthese] = useState<string | null>(null);
  const [syntheseEnCours, setSyntheseEnCours] = useState(true);

  useEffect(() => {
    let vivant = true;
    semaineAPI.get()
      .then((d) => {
        if (!vivant) return;
        setData(d);
        semaineAPI.synthese()
          .then((s) => { if (vivant) setSynthese(s.texte); })
          .catch(() => {})
          .finally(() => { if (vivant) setSyntheseEnCours(false); });
      })
      .catch(async (e) => {
        if (!vivant) return;
        if (e instanceof APIError && e.status === 403) {
          const f = await semaineAPI.fenetre().catch(() => null);
          setFerme(f?.prochaine_ouverture ?? "");
        } else {
          setErreur(e instanceof Error ? e.message : "La préparation n'a pas pu être chargée.");
        }
      });
    return () => { vivant = false; };
  }, []);

  return (
    <>
      <WeatherBackdrop condition="clear" enabled={animOn} />
      <div className="relative space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 pt-2 text-[0.85rem] transition-colors hover:underline"
          style={{ color: "var(--cap-ink-2)" }}
        >
          <ArrowLeft size={14} aria-hidden /> Accueil
        </Link>

        {ferme !== null ? (
          <Ferme prochaine={ferme} />
        ) : erreur ? (
          <Panel><Text tone="down">{erreur}</Text></Panel>
        ) : !data ? (
          <Chargement />
        ) : (
          <Contenu d={data} synthese={synthese} syntheseEnCours={syntheseEnCours} />
        )}
      </div>
    </>
  );
}

function Chargement() {
  return (
    <div className="flex items-center gap-3 py-16">
      <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--cap-ink-3)" }} />
      <Text>On rassemble votre semaine, vos actifs, l&apos;agenda et l&apos;actualité…</Text>
    </div>
  );
}

function Ferme({ prochaine }: { prochaine: string }) {
  return (
    <header className="max-w-[36rem] py-6">
      <Eyebrow>Préparation de la semaine</Eyebrow>
      <Heading level={1} className="mt-3">Cet espace ouvre le week-end.</Heading>
      <Text className="mt-3">
        Il est là quand les marchés sont fermés, du vendredi soir après la clôture de Wall Street
        jusqu&apos;au lundi 9 h. En semaine, l&apos;accueil vous dit quoi regarder au jour le jour.
      </Text>
      {prochaine && (
        <Text size="small" className="mt-3">Prochaine ouverture : {dateLongue(prochaine)}.</Text>
      )}
    </header>
  );
}

function Contenu({ d, synthese, syntheseEnCours }: {
  d: PreparationSemaine; synthese: string | null; syntheseEnCours: boolean;
}) {
  const { settings, eurUsd } = useSettings();
  const money = (v: number) =>
    convertCurrency(v, "EUR", settings.currency, eurUsd).toLocaleString("fr-FR", {
      style: "currency", currency: settings.currency, maximumFractionDigits: 2,
    });
  const s = d.semaine;

  return (
    <>
      <header className="max-w-[40rem]">
        <Eyebrow>Préparation · {d.fenetre.libelle}</Eyebrow>
        <Heading level={1} className="mt-3">Avant lundi 9 h.</Heading>
        <Text className="mt-3">
          Les marchés sont fermés : c&apos;est le seul moment où l&apos;on peut regarder sa semaine
          sans avoir de décision à prendre dans la minute. Tout ce qui suit vient de votre compte,
          des cours de clôture et de l&apos;actualité suivie par le moteur.
        </Text>
      </header>

      {(synthese || syntheseEnCours) && (
        <section
          className="p-5 sm:p-6"
          style={{ borderRadius: "var(--cap-r-xl)", backgroundColor: "var(--cap-navy)", color: "#E8EDF1" }}
        >
          <div className="flex items-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.15em]"
            style={{ color: "rgba(232,237,241,0.62)" }}>
            <Sparkles size={13} aria-hidden /> Le mot du week-end
          </div>
          {synthese ? (
            <>
              <p className="mt-3 max-w-[46rem] text-[0.98rem] leading-[1.65]">{synthese}</p>
              <p className="mt-3 text-[0.75rem]" style={{ color: "rgba(232,237,241,0.55)" }}>
                Rédigé par l&apos;IA à partir des seuls éléments de cette page — aucun chiffre ajouté.
              </p>
            </>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-[0.9rem]" style={{ color: "rgba(232,237,241,0.7)" }}>
              <Loader2 className="h-4 w-4 animate-spin" /> Rédaction en cours…
            </p>
          )}
        </section>
      )}

      {/* ── Ce qu'il faut penser ─────────────────────────────────────────── */}
      {d.a_penser.length > 0 && (
        <Panel title="À penser avant lundi" hint="Tiré de vos positions, de votre semaine et de votre profil.">
          <ul className="space-y-3">
            {d.a_penser.map((p, i) => (
              <li
                key={i}
                className="rounded-[12px] p-4"
                style={{
                  boxShadow: `inset 3px 0 0 ${p.niveau === "important" ? "var(--cap-down)" : "var(--cap-ocean)"}, inset 0 0 0 1px var(--cap-line)`,
                }}
              >
                <Text size="small" tone="ink" className="font-medium">{p.titre}</Text>
                <Text size="small" className="mt-1">{p.texte}</Text>
                {p.lien && (
                  <Link href={p.lien} className="mt-2 inline-flex items-center gap-1 text-[0.82rem] underline underline-offset-2"
                    style={{ color: "var(--cap-ocean)" }}>
                    {p.lien === "/wallet" ? "Ouvrir le wallet" : p.lien === "/journal" ? "Ouvrir le journal"
                      : p.lien === "/learn" ? "Ouvrir le parcours" : "Préparer une analyse"}
                    <ArrowUpRight size={12} aria-hidden />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ── Votre semaine ──────────────────────────────────────────────── */}
        <Panel title="Votre semaine" hint="Les trades clôturés depuis lundi dernier, dans le simulateur.">
          {s.trades === 0 ? (
            <Text size="small">Aucun trade clôturé cette semaine.</Text>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Metric size="sm" label="Trades clôturés" value={s.trades} />
                <Metric size="sm" label="Résultat net" value={`${s.resultat > 0 ? "+" : ""}${money(s.resultat)}`}
                  tone={s.resultat > 0 ? "up" : s.resultat < 0 ? "down" : "ink"} />
                <Metric size="sm" label="Gagnants" value={s.taux_reussite != null ? `${s.gagnants} · ${s.taux_reussite} %` : s.gagnants} />
              </div>
              <div className="mt-4 space-y-1.5">
                {s.meilleur && <Text size="small">Meilleur trade : {s.meilleur.nom}, <Num tone="up">+{money(s.meilleur.resultat)}</Num></Text>}
                {s.pire && <Text size="small">Pire trade : {s.pire.nom}, <Num tone="down">{money(s.pire.resultat)}</Num></Text>}
                {s.frais > 0 && <Text size="small">Frais de courtage payés : {money(s.frais)}</Text>}
                <Text size="small">Notes au journal cette semaine : {s.journal}</Text>
              </div>
            </>
          )}

          {d.positions.length > 0 && (
            <div className="mt-5">
              <Text size="caption" tone="faint" className="mb-2">Gardées pendant le week-end</Text>
              <ul className="space-y-2">
                {d.positions.map((p, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3">
                    <Text size="small" tone="ink" as="span">
                      {p.nom}{" "}
                      <span style={{ color: "var(--cap-ink-3)" }}>
                        · {p.instrument === "turbo" ? "turbo " : ""}{p.sens === "LONG" ? "achat" : "vente"}
                        {p.stop == null && p.instrument !== "turbo" ? " · sans stop" : ""}
                        {p.crypto ? " · cote ce week-end" : ""}
                      </span>
                    </Text>
                    {p.semaine_pct != null && <Num tone={ton(p.semaine_pct)} className="shrink-0 text-[0.85rem]">{signe(p.semaine_pct)}</Num>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {s.solde != null && (
            <Text size="caption" className="mt-4">Solde disponible : {money(s.solde)}</Text>
          )}
        </Panel>

        {/* ── Les actifs ─────────────────────────────────────────────────── */}
        <Panel title="Vos actifs sur la semaine" hint="Clôture de vendredi comparée à celle d'avant lundi.">
          {d.actifs.suivis.length === 0 ? (
            <Text size="small">
              Vous ne suivez encore aucun actif. Ajoutez-en en favori : ils apparaîtront ici chaque week-end.
            </Text>
          ) : (
            <TableActifs actifs={d.actifs.suivis} />
          )}
          {d.actifs.reperes.length > 0 && (
            <div className="mt-5">
              <Text size="caption" tone="faint" className="mb-2">Les repères de vos marchés</Text>
              <TableActifs actifs={d.actifs.reperes} compact />
            </div>
          )}
        </Panel>
      </div>

      {/* ── L'agenda ───────────────────────────────────────────────────────── */}
      <Panel
        title="L'agenda macro de la semaine"
        hint={`Les annonces économiques qui concernent vos marchés (${d.agenda.devises.join(", ")}). Heures de Paris.`}
        aside={<CalendarDays size={15} aria-hidden style={{ color: "var(--cap-ink-4)" }} />}
      >
        {d.agenda.a_venir.length > 0 ? (
          <Agenda evenements={d.agenda.a_venir} />
        ) : (
          <>
            {d.agenda.note && <Text size="small">{d.agenda.note}</Text>}
            {d.agenda.semaine_ecoulee.length > 0 && (
              <div className="mt-5">
                <Text size="caption" tone="faint" className="mb-2">Ce qui a été publié cette semaine</Text>
                <Agenda evenements={d.agenda.semaine_ecoulee} />
              </div>
            )}
          </>
        )}
        <Text size="caption" tone="faint" className="mt-4">Source : calendrier économique {d.agenda.source}.</Text>
      </Panel>

      {/* ── L'actualité ────────────────────────────────────────────────────── */}
      <Panel
        title="L'actualité de la semaine"
        hint="Les sujets suivis par le moteur de presse, en commençant par ceux qui touchent vos actifs."
        aside={<Newspaper size={15} aria-hidden style={{ color: "var(--cap-ink-4)" }} />}
      >
        {d.actualite.vos_actifs.length > 0 && (
          <ul className="mb-5 space-y-3">
            {d.actualite.vos_actifs.map((a) => (
              <li key={a.symbole} className="rounded-[12px] p-4" style={{ boxShadow: "inset 0 0 0 1px var(--cap-line)" }}>
                <div className="flex items-baseline justify-between gap-3">
                  <Text size="small" tone="ink" className="font-medium">{a.nom}</Text>
                  <Text size="caption" as="span" tone={a.sens > 0 ? "up" : a.sens < 0 ? "down" : "faint"}>
                    {a.sens > 0 ? "plutôt favorable" : a.sens < 0 ? "plutôt défavorable" : "sens incertain"}
                  </Text>
                </div>
                <Text size="small" className="mt-1">{a.resume}</Text>
                <Text size="caption" className="mt-2">« {a.titre_fr || a.titre} »</Text>
                {a.a_surveiller && <Text size="caption" className="mt-1">À surveiller : {a.a_surveiller}.</Text>}
                <Link href={`/analysis?symbol=${encodeURIComponent(a.symbole)}`}
                  className="mt-2 inline-flex items-center gap-1 text-[0.82rem] underline underline-offset-2"
                  style={{ color: "var(--cap-ocean)" }}>
                  Voir l&apos;analyse <ArrowUpRight size={12} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {d.actualite.sujets.length === 0 ? (
          <Text size="small">Le moteur n&apos;a relevé aucun sujet de marché cette semaine.</Text>
        ) : (
          <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
            {d.actualite.sujets.map((n, i) => (
              <li key={i} className="py-3 first:pt-0 last:pb-0">
                <Text size="small" tone="ink">{n.titre_fr || n.titre}</Text>
                <Text size="caption" className="mt-1">
                  {n.voix} source{n.voix > 1 ? "s" : ""}
                  {n.voix <= 1 ? " — à confirmer" : ""}
                  {n.vos_actifs.length > 0 && <> · touche {n.vos_actifs.map((a) => a.nom).join(", ")}</>}
                </Text>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

function TableActifs({ actifs, compact }: { actifs: ActifSemaine[]; compact?: boolean }) {
  const assetPrice = useFormatAssetPrice();
  return (
    <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
      {actifs.map((a) => (
        <li key={a.symbole} className={`flex items-center justify-between gap-3 ${compact ? "py-2" : "py-2.5"}`}>
          <div className="min-w-0">
            <Link href={`/analysis?symbol=${encodeURIComponent(a.symbole)}`}
              className="block truncate text-[0.9rem] hover:underline" style={{ color: "var(--cap-ink)" }}>
              {a.nom}
            </Link>
            {!compact && a.disponible && a.bas != null && a.haut != null && (
              <Text size="caption" as="span" className="block">
                semaine entre {assetPrice(a.bas)} et {assetPrice(a.haut)}
              </Text>
            )}
          </div>
          {a.disponible && a.semaine_pct != null ? (
            <div className="shrink-0 text-right">
              <Num tone={ton(a.semaine_pct)} className="block text-[0.9rem]">{signe(a.semaine_pct)}</Num>
              {!compact && a.mois_pct != null && (
                <Text size="caption" as="span" className="block">sur un mois {signe(a.mois_pct, 1)}</Text>
              )}
            </div>
          ) : (
            <Text size="caption" as="span">cours indisponible</Text>
          )}
        </li>
      ))}
    </ul>
  );
}

function Agenda({ evenements }: { evenements: EvenementMacro[] }) {
  const jours: { jour: string; items: EvenementMacro[] }[] = [];
  for (const e of evenements) {
    const g = jours.find((j) => j.jour === e.jour);
    if (g) g.items.push(e);
    else jours.push({ jour: e.jour, items: [e] });
  }
  return (
    <div className="space-y-4">
      {jours.map((j) => (
        <div key={j.jour}>
          <Text size="caption" tone="faint" className="mb-1.5 capitalize">{j.jour}</Text>
          <ul className="space-y-2">
            {j.items.map((e, i) => (
              <li key={i} className="flex gap-3">
                <Num tone="muted" className="w-[3.2rem] shrink-0 pt-[1px] text-[0.8rem]">{e.heure}</Num>
                <div className="min-w-0">
                  <Text size="small" tone="ink">
                    {e.importance === "forte" && (
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                        style={{ backgroundColor: "var(--cap-down)" }} aria-label="importance forte" />
                    )}
                    {e.titre} <span style={{ color: "var(--cap-ink-3)" }}>· {e.pays_nom}</span>
                  </Text>
                  {(e.prevision || e.precedent) && (
                    <Text size="caption" className="mt-0.5">
                      {e.prevision && <>attendu {e.prevision}</>}
                      {e.prevision && e.precedent && " · "}
                      {e.precedent && <>précédent {e.precedent}</>}
                    </Text>
                  )}
                  {e.pourquoi && e.importance === "forte" && <Text size="caption" className="mt-0.5">{e.pourquoi}</Text>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
