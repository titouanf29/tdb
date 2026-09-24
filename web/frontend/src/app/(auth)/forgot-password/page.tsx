"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { passwordResetAPI } from "@/lib/api";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { Button, CaptenLogo, Field, FormError, Text, TextInput } from "@/components/design-system";

/**
 * Mot de passe oublié — la demande de lien.
 *
 * La réponse est LA MÊME que l'adresse corresponde à un compte ou non : le
 * serveur le garantit, et l'écran ne doit pas le trahir non plus. D'où une
 * confirmation au conditionnel (« si un compte existe… »), qui peut sembler
 * prudente à l'excès mais qui empêche ce formulaire de servir à vérifier qui
 * est inscrit.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErreur("Indiquez l'adresse e-mail de votre compte.");
      return;
    }
    setEnvoi(true);
    try {
      const r = await passwordResetAPI.request(email.trim());
      setMessage(r.message);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "La demande n'a pas pu partir. Réessayez.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <AuthScreen
      eyebrow="Mot de passe oublié"
      title={<>Ça arrive. On vous renvoie un accès.</>}
      lead="Indiquez l'adresse de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe. Vos positions, votre historique et votre journal ne bougent pas."
      points={[
        "Un lien valable une heure, utilisable une seule fois",
        "Toutes vos sessions ouvertes seront déconnectées",
        "Rien n'est perdu sur votre compte",
      ]}
      footer={
        <Text size="small" className="text-center">
          Vous l&apos;avez retrouvé ?{" "}
          <Link href="/login" className="font-medium underline underline-offset-2"
                style={{ color: "var(--cap-ocean)" }}>
            Se connecter
          </Link>
        </Text>
      }
    >
      <div className="hidden lg:block">
        <CaptenLogo size={22} className="text-[color:var(--cap-ink)]" />
      </div>

      <h2
        className="mt-0 text-[1.35rem] font-semibold tracking-[-0.02em] lg:mt-7"
        style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}
      >
        Réinitialiser le mot de passe
      </h2>

      {message ? (
        <div className="mt-7 rounded-[12px] px-4 py-4"
             style={{ boxShadow: "inset 0 0 0 1px var(--cap-line)", backgroundColor: "var(--cap-surface-2)" }}>
          <div className="flex items-start gap-3">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--cap-ocean)" }} aria-hidden />
            <div>
              <p className="text-[0.92rem]" style={{ color: "var(--cap-ink)" }}>{message}</p>
              <Text size="caption" className="mt-2">
                Rien reçu après quelques minutes ? Vérifiez l&apos;adresse saisie —{" "}
                <strong>{email.trim()}</strong> —{" "}
                <button type="button" onClick={() => setMessage(null)}
                        className="underline underline-offset-2" style={{ color: "var(--cap-ocean)" }}>
                  ou recommencez
                </button>.
              </Text>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={envoyer} className="mt-7 space-y-5" noValidate>
          {erreur && <FormError>{erreur}</FormError>}
          <Field label="Adresse e-mail du compte" htmlFor="fp-email">
            <TextInput
              id="fp-email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="vous@exemple.com"
              autoComplete="email"
              required
              invalid={!!erreur}
            />
          </Field>
          <Button type="submit" size="lg" disabled={envoi} className="w-full">
            {envoi ? (<><Loader2 className="h-4 w-4 animate-spin" />Envoi…</>) : "Recevoir un lien"}
          </Button>
        </form>
      )}
    </AuthScreen>
  );
}
