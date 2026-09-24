"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { passwordResetAPI } from "@/lib/api";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { Button, CaptenLogo, Field, FormError, Text, TextInput } from "@/components/design-system";

/**
 * Le nouveau mot de passe, depuis le lien reçu par e-mail.
 *
 * Le lien est vérifié AVANT la saisie : découvrir qu'il a expiré après avoir
 * tapé deux fois un mot de passe est la frustration à éviter. La règle est
 * affichée pendant qu'on tape, point par point, plutôt que de refuser après
 * coup — la même règle que le serveur (8 caractères, une lettre, un chiffre).
 */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <Reinitialiser />
    </Suspense>
  );
}

type Etat = "verification" | "invalide" | "saisie" | "fait";

function Reinitialiser() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [etat, setEtat] = useState<Etat>("verification");
  const [mdp, setMdp] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (!token) { setEtat("invalide"); return; }
    passwordResetAPI.check(token)
      .then((r) => setEtat(r.valid ? "saisie" : "invalide"))
      .catch(() => setEtat("invalide"));
  }, [token]);

  const regles = [
    { ok: mdp.length >= 8, texte: "8 caractères au moins" },
    { ok: /[A-Za-z]/.test(mdp), texte: "une lettre" },
    { ok: /\d/.test(mdp), texte: "un chiffre" },
  ];
  const conforme = regles.every((r) => r.ok);
  const identiques = mdp.length > 0 && mdp === confirmation;

  const valider = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur("");
    if (!conforme) { setErreur("Le mot de passe ne respecte pas encore la règle ci-dessous."); return; }
    if (!identiques) { setErreur("Les deux saisies ne sont pas identiques."); return; }
    setEnvoi(true);
    try {
      await passwordResetAPI.reset(token, mdp);
      setEtat("fait");
    } catch (err) {
      const m = err instanceof Error ? err.message : "";
      // Un lien devenu invalide entre la vérification et l'envoi (expiré,
      // ou utilisé depuis un autre onglet) : on bascule sur l'écran dédié.
      if (/plus valable/.test(m)) setEtat("invalide");
      else setErreur(m || "Le changement n'a pas pu être enregistré. Réessayez.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <AuthScreen
      eyebrow="Nouveau mot de passe"
      title={<>Un nouveau mot de passe, et vous revoilà.</>}
      lead="Choisissez-le maintenant. Toutes les sessions ouvertes sur votre compte seront déconnectées : si quelqu'un d'autre l'utilisait, il en sort."
      points={[
        "8 caractères au moins, avec une lettre et un chiffre",
        "Vos positions et votre historique restent intacts",
        "Le lien ne servira plus après ce changement",
      ]}
    >
      <div className="hidden lg:block">
        <CaptenLogo size={22} className="text-[color:var(--cap-ink)]" />
      </div>

      <h2
        className="mt-0 text-[1.35rem] font-semibold tracking-[-0.02em] lg:mt-7"
        style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}
      >
        {etat === "fait" ? "Mot de passe changé" : "Choisir un nouveau mot de passe"}
      </h2>

      {etat === "verification" && (
        <div className="mt-7 flex items-center gap-2" style={{ color: "var(--cap-ink-3)" }}>
          <Loader2 className="h-4 w-4 animate-spin" />
          <Text size="small" as="span">Vérification du lien…</Text>
        </div>
      )}

      {etat === "invalide" && (
        <div className="mt-7 space-y-4">
          <Text size="small">
            Ce lien n&apos;est plus valable : il a expiré (il ne dure qu&apos;une heure), il a déjà servi,
            ou un lien plus récent a été demandé depuis. Seul le dernier e-mail reçu fonctionne.
          </Text>
          <Button href="/forgot-password" size="lg" className="w-full">Demander un nouveau lien</Button>
        </div>
      )}

      {etat === "saisie" && (
        <form onSubmit={valider} className="mt-7 space-y-5" noValidate>
          {erreur && <FormError>{erreur}</FormError>}
          <Field label="Nouveau mot de passe" htmlFor="rp-mdp">
            <TextInput id="rp-mdp" type="password" value={mdp} onChange={setMdp}
                       placeholder="••••••••" autoComplete="new-password" required />
          </Field>
          <ul className="-mt-2 flex flex-wrap gap-x-4 gap-y-1" aria-label="Règle du mot de passe">
            {regles.map((r) => (
              <li key={r.texte} className="flex items-center gap-1.5 text-[0.78rem]"
                  style={{ color: r.ok ? "var(--cap-up)" : "var(--cap-ink-3)" }}>
                <span aria-hidden>{r.ok ? "✓" : "○"}</span>{r.texte}
              </li>
            ))}
          </ul>
          <Field label="Confirmer" htmlFor="rp-conf">
            <TextInput id="rp-conf" type="password" value={confirmation} onChange={setConfirmation}
                       placeholder="••••••••" autoComplete="new-password" required
                       invalid={confirmation.length > 0 && !identiques} />
          </Field>
          <Button type="submit" size="lg" disabled={envoi} className="w-full">
            {envoi ? (<><Loader2 className="h-4 w-4 animate-spin" />Enregistrement…</>) : "Enregistrer le mot de passe"}
          </Button>
        </form>
      )}

      {etat === "fait" && (
        <div className="mt-7 space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--cap-up)" }} aria-hidden />
            <Text size="small">
              C&apos;est fait. Vos autres sessions ont été déconnectées ; connectez-vous avec le nouveau
              mot de passe.
            </Text>
          </div>
          <Button href="/login" size="lg" className="w-full">Se connecter</Button>
          <Text size="caption" className="text-center">
            <Link href="/" className="underline underline-offset-2">Retour à l&apos;accueil</Link>
          </Text>
        </div>
      )}
    </AuthScreen>
  );
}
