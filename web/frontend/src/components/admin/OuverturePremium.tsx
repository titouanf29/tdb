"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, RefreshCw, X } from "lucide-react";
import { legalAPI, type OuverturePremium as Etat } from "@/lib/api";
import { Panel, Text } from "@/components/design-system";

/**
 * L'ouverture du Premium : ce qui manque avant de pouvoir encaisser.
 *
 * Le serveur n'ouvre la vente que quand chaque ligne est cochée (backend
 * api/legal.py). Cet écran dit laquelle manque et quelle variable poser —
 * le jour de l'immatriculation, on suit la liste de haut en bas, et la
 * vente s'ouvre d'elle-même quand la dernière passe au vert.
 *
 * Le guide complet, avec la configuration Stripe pas à pas, est dans
 * web/docs/ouvrir-le-premium.md.
 */
export function OuverturePremium() {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [charge, setCharge] = useState(false);
  const [copie, setCopie] = useState(false);

  const lire = useCallback(async () => {
    setCharge(true);
    try { setEtat(await legalAPI.ouverture()); } catch { setEtat(null); } finally { setCharge(false); }
  }, []);
  useEffect(() => { lire(); }, [lire]);

  const faits = etat?.liste.filter((i) => i.ok).length ?? 0;
  const total = etat?.liste.length ?? 0;

  return (
    <Panel
      title="Ouverture du Premium"
      hint={
        !etat ? "Lecture de l'état…"
          : etat.ouverte ? "Ouvert : la vente est active, au public."
            : etat.mode_test ? "Mode test Stripe : seuls les administrateurs peuvent essayer le paiement (page Premium)."
              : "Fermé : tous les comptes ont l'accès complet gratuitement. La vente s'ouvre quand toute la liste est verte."
      }
      aside={
        <button type="button" onClick={lire} disabled={charge}
          className="flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 hover:bg-[color:var(--cap-surface-2)] disabled:opacity-60">
          <RefreshCw className={`h-3.5 w-3.5 ${charge ? "animate-spin" : ""}`} style={{ color: "var(--cap-ink-3)" }} />
          <Text size="caption" as="span">Relire</Text>
        </button>
      }
    >
      {!etat ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--cap-ink-3)" }} />
          <Text size="caption" as="span">Lecture…</Text>
        </div>
      ) : (
        <>
          <div aria-hidden className="mb-4 h-[4px] overflow-hidden rounded-full" style={{ backgroundColor: "var(--cap-line)" }}>
            <div className="h-full rounded-full" style={{ width: `${total ? (faits / total) * 100 : 0}%`,
              backgroundColor: etat.ouverte ? "var(--cap-up)" : "var(--cap-ocean)" }} />
          </div>
          <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
            {etat.liste.map((i) => (
              <li key={i.cle} className="flex items-start gap-3 py-2.5">
                {i.ok
                  ? <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--cap-up)" }} aria-label="fait" />
                  : <X className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--cap-down)" }} aria-label="à faire" />}
                <div className="min-w-0">
                  <span className="text-[0.9rem] font-medium" style={{ color: i.ok ? "var(--cap-ink-3)" : "var(--cap-ink)" }}>{i.libelle}</span>
                  {!i.ok && <Text size="caption" className="mt-0.5">{i.comment}</Text>}
                </div>
              </li>
            ))}
          </ul>

          {etat.stripe && (
            <Text size="caption" className="mt-3">
              {etat.stripe.joignable
                ? `Stripe répond : prix ${((etat.stripe.montant_centimes ?? 0) / 100).toLocaleString("fr-FR")} ${(etat.stripe.devise ?? "").toUpperCase()} par ${etat.stripe.intervalle === "month" ? "mois" : etat.stripe.intervalle}${etat.stripe.actif ? "" : " (inactif)"}.`
                : `Stripe ne répond pas : ${etat.stripe.erreur}`}
            </Text>
          )}

          <div className="mt-4 rounded-[12px] p-3.5" style={{ boxShadow: "inset 0 0 0 1px var(--cap-line)" }}>
            <Text size="caption" as="p">Webhook à déclarer dans Stripe (Développeurs → Webhooks) :</Text>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate text-[0.82rem]" style={{ color: "var(--cap-ink)" }}>{etat.webhook_url}</code>
              <button type="button" aria-label="Copier l'adresse du webhook"
                onClick={() => { navigator.clipboard?.writeText(etat.webhook_url); setCopie(true); setTimeout(() => setCopie(false), 1500); }}
                className="flex h-9 w-9 items-center justify-center rounded-[8px] hover:bg-[color:var(--cap-surface-2)]">
                {copie ? <Check className="h-4 w-4" style={{ color: "var(--cap-up)" }} /> : <Copy className="h-4 w-4" style={{ color: "var(--cap-ink-3)" }} />}
              </button>
            </div>
            <Text size="caption" className="mt-1.5">Événements : {etat.evenements_webhook.join(", ")}.</Text>
          </div>
        </>
      )}
    </Panel>
  );
}
