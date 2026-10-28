"use client";

import { useEffect, useState } from "react";
import { adminAPI, type Entonnoir, type Retention as Donnees, type TauxRetention } from "@/lib/api";
import { EmptyState, Panel, Text } from "@/components/design-system";

/**
 * Qui revient. La section que l'administration n'avait pas : sans elle, on ne
 * pouvait ni voir où les gens décrochent, ni vérifier qu'une amélioration
 * marche. Les définitions sont celles de backend/api/services/retention.py,
 * rappelées sous chaque chiffre ; chaque taux montre son effectif.
 */

function pct(t: TauxRetention) {
  return t.taux == null ? "—" : `${t.taux.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

function Chiffre({ titre, t, definition }: { titre: string; t: TauxRetention; definition: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border-t pt-3" style={{ borderColor: "var(--cap-line)" }}>
      <span className="text-[0.9rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>{titre}</span>
      <span className="cap-num text-[1.9rem] font-medium leading-none" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>{pct(t)}</span>
      <span className="cap-num text-[0.82rem]" style={{ color: "var(--cap-ink-2)" }}>
        {t.total ? `${t.oui} sur ${t.total}` : "Pas encore assez de recul"}
      </span>
      <span className="text-[0.8rem] leading-snug" style={{ color: "var(--cap-ink-3)" }}>{definition}</span>
    </div>
  );
}

/**
 * L'ENTONNOIR : où les inscrits s'arrêtent. Chaque étape en part des inscrits
 * (les retours, en part de ceux dont le délai est écoulé), et le plus gros
 * décrochage d'une étape à la suivante est nommé en clair : c'est là qu'il
 * faut travailler.
 */
function PanneauEntonnoir({ e, semaines }: Readonly<{ e: Entonnoir; semaines: Donnees["entonnoir_semaines"] }>) {
  const etapes = [{ cle: "inscrits", libelle: "Inscription", oui: e.inscrits, total: e.inscrits, taux: e.inscrits ? 100 : null }, ...e.etapes];
  let pire: { de: string; a: string; perte: number } | null = null;
  for (let i = 1; i < etapes.length; i++) {
    const a = etapes[i - 1].taux, b = etapes[i].taux;
    if (a != null && b != null && (!pire || a - b > pire.perte)) pire = { de: etapes[i - 1].libelle, a: etapes[i].libelle, perte: a - b };
  }
  const fr = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  return (
    <Panel title="Où les inscrits s'arrêtent"
      hint="Chaque étape en part des inscrits. Les retours ne comptent que ceux dont le délai est écoulé.">
      {e.inscrits === 0 ? (
        <Text size="small">Pas encore d&apos;inscrit depuis le début de la mesure.</Text>
      ) : (
        <>
          <ol className="space-y-3">
            {etapes.map((x) => (
              <li key={x.cle} className="grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_auto] items-center gap-3">
                <span className="text-[0.9rem]" style={{ color: "var(--cap-ink)" }}>{x.libelle}</span>
                <span className="h-3 overflow-hidden rounded-full" style={{ backgroundColor: "var(--cap-surface-2)" }}>
                  <span className="block h-full rounded-full" style={{ width: `${x.taux ?? 0}%`, backgroundColor: "var(--cap-ocean)" }} />
                </span>
                <span className="cap-num w-[7.5rem] text-right text-[0.88rem]" style={{ color: "var(--cap-ink-2)" }}>
                  {x.taux == null ? "pas de recul" : `${fr(x.taux)} % · ${x.oui}/${x.total}`}
                </span>
              </li>
            ))}
          </ol>
          {pire && pire.perte > 0 && (
            <p className="mt-5 border-l-2 pl-3 text-[0.95rem]" style={{ borderColor: "var(--cap-ambre)", color: "var(--cap-ink)" }}>
              Le plus gros décrochage : entre « {pire.de} » et « {pire.a} », {fr(pire.perte)} points perdus.
            </p>
          )}
          {semaines.length > 1 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[34rem] text-[0.86rem]">
                <thead>
                  <tr style={{ color: "var(--cap-ink-2)" }}>
                    <th className="py-2 pr-3 text-left font-semibold">Inscrits la semaine du</th>
                    <th className="py-2 pr-3 text-left font-semibold">Inscrits</th>
                    {e.etapes.map((x) => <th key={x.cle} className="py-2 pr-3 text-left font-semibold">{x.libelle}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {semaines.map((s) => (
                    <tr key={s.debut} className="border-t" style={{ borderColor: "var(--cap-line)" }}>
                      <td className="py-2 pr-3" style={{ color: "var(--cap-ink-2)" }}>
                        {new Date(s.debut + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </td>
                      <td className="cap-num py-2 pr-3">{s.inscrits}</td>
                      {s.etapes.map((x) => (
                        <td key={x.cle} className="cap-num py-2 pr-3">{x.taux == null ? "–" : `${fr(x.taux)} %`}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

export function Retention() {
  const [d, setD] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => { adminAPI.retention().then(setD).catch(() => setErreur(true)); }, []);

  if (erreur) return <Panel><EmptyState title="Chiffres indisponibles" description="La rétention n'a pas pu être calculée. Réessayez dans un instant." /></Panel>;
  if (!d) return <Panel><Text size="small">Calcul en cours…</Text></Panel>;

  const debut = d.debut_mesure
    ? new Date(d.debut_mesure).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const max = Math.max(1, ...d.semaines.map((s) => Math.max(s.inscriptions, s.actifs)));

  return (
    <div className="space-y-6">
      <Panel
        title="Qui revient"
        hint={debut
          ? `Mesuré depuis le ${debut}. Seuls les inscrits arrivés depuis entrent dans les taux : ${d.cohorte} personne${d.cohorte > 1 ? "s" : ""}.`
          : "La mesure commence avec le premier geste noté après la mise en ligne."}
      >
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          <Chiffre titre="Activation" t={d.activation} definition="Une analyse et une position dans les 24 heures suivant l'inscription." />
          <Chiffre titre="Retour à J1" t={d.j1} definition="Revenus le lendemain de l'inscription." />
          <Chiffre titre="Retour à J7" t={d.j7} definition="Revenus entre le 6e et le 8e jour." />
          <Chiffre titre="Retour à J30" t={d.j30} definition="Revenus entre le 28e et le 32e jour." />
        </div>
      </Panel>

      {d.entonnoir && <PanneauEntonnoir e={d.entonnoir} semaines={d.entonnoir_semaines ?? []} />}

      <Panel title="Cette semaine" hint="Les 7 derniers jours, tous comptes confondus.">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <span className="text-[0.9rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>Semaines actives</span>
            <span className="cap-num text-[1.9rem] font-medium leading-none" style={{ fontFamily: "var(--cap-font-display)" }}>{d.semaines_actives}</span>
            <span className="text-[0.8rem]" style={{ color: "var(--cap-ink-3)" }}>Au moins une analyse ou une leçon. Le chiffre à faire monter.</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[0.9rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>Venus sur le site</span>
            <span className="cap-num text-[1.9rem] font-medium leading-none" style={{ fontFamily: "var(--cap-font-display)" }}>{d.venus_7j}</span>
            <span className="text-[0.8rem]" style={{ color: "var(--cap-ink-3)" }}>Au moins un geste noté.</span>
          </div>
          <Chiffre titre="Notifications activées" t={d.notifications} definition="Parmi ceux venus cette semaine, avec au moins un appareil abonné." />
        </div>
      </Panel>

      <Panel title="Les huit dernières semaines" hint="Inscriptions et personnes venues, du lundi au dimanche.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-[0.88rem]">
            <thead>
              <tr style={{ color: "var(--cap-ink-3)" }}>
                <th className="py-2 text-left font-normal italic" style={{ fontFamily: "var(--cap-font-display)" }}>Semaine du</th>
                <th className="py-2 text-left font-normal italic" style={{ fontFamily: "var(--cap-font-display)" }}>Inscriptions</th>
                <th className="py-2 text-left font-normal italic" style={{ fontFamily: "var(--cap-font-display)" }}>Venus</th>
              </tr>
            </thead>
            <tbody>
              {d.semaines.map((s) => (
                <tr key={s.debut} className="border-t" style={{ borderColor: "var(--cap-line)" }}>
                  <td className="py-2 pr-4" style={{ color: "var(--cap-ink-2)" }}>
                    {new Date(s.debut + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </td>
                  {[s.inscriptions, s.actifs].map((v, i) => (
                    <td key={i} className="py-2 pr-4">
                      <span className="flex items-center gap-2">
                        <span aria-hidden className="h-2 rounded-full" style={{ width: `${Math.max(2, (v / max) * 9)}rem`, backgroundColor: i ? "var(--cap-ocean)" : "var(--cap-ink-3)", opacity: v ? 1 : 0.25 }} />
                        <span className="cap-num" style={{ color: "var(--cap-ink)" }}>{v}</span>
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
