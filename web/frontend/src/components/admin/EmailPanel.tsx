"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Send, X } from "lucide-react";
import { adminAPI, type EmailEtat, type EmailTest } from "@/lib/api";
import { Button, Panel, Text } from "@/components/design-system";

/**
 * L'envoi d'e-mails, vu de l'administration.
 *
 * Un e-mail qui ne part pas ne se voit nulle part : l'envoi se fait en tâche
 * de fond, l'utilisateur reçoit « si un compte existe, un e-mail vient de
 * partir », et l'échec reste dans les journaux de l'hébergeur. Ce panneau dit
 * quelle voie est configurée, et le bouton de test envoie EN DIRECT pour
 * afficher la cause exacte d'un échec — typiquement le SMTP bloqué par
 * Railway sur les forfaits Free, Trial et Hobby.
 */
const NOM: Record<EmailEtat["fournisseur"], string> = {
  brevo: "Brevo (API HTTPS)",
  resend: "Resend (API HTTPS)",
  smtp: "SMTP",
  aucun: "Aucun — aucun e-mail ne part",
};

export function EmailPanel() {
  const [etat, setEtat] = useState<EmailEtat | null>(null);
  const [test, setTest] = useState<EmailTest | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    adminAPI.emailStatus().then(setEtat).catch((e) => setErreur(e instanceof Error ? e.message : "Indisponible"));
  }, []);

  const tester = async () => {
    setEnvoi(true);
    setTest(null);
    setErreur("");
    try {
      const r = await adminAPI.emailTest();
      setTest(r);
      setEtat(r);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le test n'a pas pu être lancé.");
    } finally {
      setEnvoi(false);
    }
  };

  const vars = etat?.variables ?? {};
  const ligne = (nom: string, present: boolean | undefined, note?: string) => (
    <li key={nom} className="flex items-center gap-2 py-1 text-[0.84rem]">
      {present
        ? <Check className="h-3.5 w-3.5" style={{ color: "var(--cap-up)" }} />
        : <X className="h-3.5 w-3.5" style={{ color: "var(--cap-ink-4)" }} />}
      <span className="cap-num" style={{ color: "var(--cap-ink)" }}>{nom}</span>
      {note && <span style={{ color: "var(--cap-ink-3)" }}>— {note}</span>}
    </li>
  );

  return (
    <Panel
      title="Envoi d'e-mails"
      hint="Mot de passe oublié, vérification d'adresse. Le test envoie pour de vrai et affiche la cause d'un échec."
      aside={
        <Button size="sm" variant="secondary" onClick={tester} disabled={envoi || !etat}>
          {envoi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {envoi ? "Envoi…" : "Envoyer un e-mail de test"}
        </Button>
      }
    >
      {erreur && <Text size="small" tone="down">{erreur}</Text>}
      {!etat && !erreur && (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--cap-ink-3)" }} />
          <Text size="caption" as="span">Lecture de la configuration…</Text>
        </div>
      )}

      {etat && (
        <>
          <p className="text-[0.9rem]" style={{ color: "var(--cap-ink-2)" }}>
            Voie utilisée : <strong style={{ color: etat.fournisseur === "aucun" ? "var(--cap-down)" : "var(--cap-ink)" }}>
              {NOM[etat.fournisseur]}
            </strong>
            {etat.expediteur && <> · expéditeur <span className="cap-num">{etat.expediteur}</span></>}
          </p>

          <ul className="mt-3">
            {ligne("BREVO_API_KEY", vars.BREVO_API_KEY, "recommandé sur Railway")}
            {ligne("RESEND_API_KEY", vars.RESEND_API_KEY)}
            {ligne("SMTP_HOST / USER / PASSWORD", vars.SMTP_HOST && vars.SMTP_USER && vars.SMTP_PASSWORD,
                   "bloqué par Railway hors forfait Pro")}
            {ligne("EMAIL_FROM", vars.EMAIL_FROM, "l'expéditeur affiché")}
            {ligne("FRONTEND_URL", vars.FRONTEND_URL && !etat.frontend_url_locale,
                   etat.frontend_url_locale ? `vaut ${etat.frontend_url} — les liens des e-mails ne marcheront pas` : etat.frontend_url)}
          </ul>

          {etat.fournisseur === "smtp" && !test && (
            <Text size="caption" className="mt-3">
              Sur Railway, le SMTP sortant est bloqué sur les forfaits Free, Trial et Hobby. Si le test
              échoue, ajoutez une clé BREVO_API_KEY : elle passe devant le SMTP automatiquement.
            </Text>
          )}

          {test && (
            <div className="mt-4 rounded-[12px] px-4 py-3"
                 style={{ boxShadow: `inset 3px 0 0 ${test.ok ? "var(--cap-up)" : "var(--cap-down)"}, inset 0 0 0 1px var(--cap-line)` }}>
              {test.ok ? (
                <Text size="small">
                  Envoyé à <strong>{test.to}</strong> via {test.voie}. Vérifiez la boîte de réception —
                  et les indésirables, pour un premier envoi.
                </Text>
              ) : (
                <>
                  <Text size="small" tone="down">Échec : {test.erreur}</Text>
                  {test.conseil && <Text size="caption" className="mt-1.5">{test.conseil}</Text>}
                </>
              )}
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
