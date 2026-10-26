"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { verificationAPI } from "@/lib/api";
import { setToken, setUser } from "@/lib/auth";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { Button, CaptenLogo, Field, FormError, Text, TextInput } from "@/components/design-system";

/**
 * La confirmation de l'adresse e-mail, depuis le lien reçu à l'inscription.
 *
 * Cette page se contentait de renvoyer vers l'espace, sans rien confirmer :
 * cliquer sur le lien n'avait aucun effet. Elle confirme maintenant l'adresse,
 * le dit, et propose un nouveau lien quand celui-ci a expiré ou déjà servi.
 */
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <Confirmer />
    </Suspense>
  );
}

type Etat = "verification" | "faite" | "invalide";

function Confirmer() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [etat, setEtat] = useState<Etat>("verification");
  const [raison, setRaison] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const fait = useRef(false);

  useEffect(() => {
    // Un seul appel : le lien ne sert qu'une fois (le double rendu du mode
    // strict de React l'aurait consommé, puis déclaré invalide).
    if (fait.current) return;
    fait.current = true;
    if (!token) { setEtat("invalide"); return; }
    verificationAPI.confirmer(token)
      .then((r) => {
        // Le lien prouve que l'adresse est la bonne : la session s'ouvre.
        setToken(r.access_token);
        setUser({ ...r.user, email_verified: true });
        setEtat("faite");
      })
      .catch((e) => { setRaison(e instanceof Error ? e.message : ""); setEtat("invalide"); });
  }, [token]);

  const renvoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(""); setMessage("");
    const adresse = email.trim();
    if (!adresse) { setErreur("Indiquez l'adresse e-mail de votre compte."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(adresse)) { setErreur("Cette adresse e-mail n'est pas valide (exemple : vous@exemple.com)."); return; }
    setEnvoi(true);
    try {
      setMessage((await verificationAPI.renvoyer(adresse)).message);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "La demande n'a pas pu partir. Réessayez.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <AuthScreen
      eyebrow="Confirmation de l'adresse"
      title={<>Un clic, et votre adresse est confirmée.</>}
      lead="Elle sert à vous reconnecter et à récupérer votre mot de passe si vous l'oubliez. Rien d'autre : pas de newsletter, pas de publicité, et elle n'est jamais vendue ni cédée."
      points={[
        "Votre espace est déjà ouvert, avec vos 10 000 € fictifs",
        "Le lien reçu reste valable 24 heures",
        "Un lien perdu ou expiré se redemande ici",
      ]}
    >
      <div className="hidden lg:block">
        <CaptenLogo size={22} className="text-[color:var(--cap-ink)]" />
      </div>

      <h2 className="mt-0 text-[1.35rem] font-semibold tracking-[-0.01em] lg:mt-7"
        style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}>
        {etat === "faite" ? "Adresse confirmée" : etat === "invalide" ? "Ce lien ne fonctionne plus" : "Confirmation de votre adresse"}
      </h2>

      {etat === "verification" && (
        <div className="mt-7 flex items-center gap-2" style={{ color: "var(--cap-ink-3)" }}>
          <Loader2 className="h-4 w-4 animate-spin" />
          <Text size="small" as="span">Confirmation en cours…</Text>
        </div>
      )}

      {etat === "faite" && (
        <div className="mt-7 space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--cap-up)" }} aria-hidden />
            <Text size="small" tone="ink">
              Merci : votre adresse est confirmée. Si vous oubliez un jour votre mot de passe, c&apos;est là que
              nous enverrons le lien pour en choisir un nouveau.
            </Text>
          </div>
          {/* Un rechargement complet : l'espace relit le compte, et le bandeau de rappel disparaît. */}
          <Button onClick={() => window.location.assign("/dashboard")} size="lg" className="w-full">Ouvrir mon espace</Button>
        </div>
      )}

      {etat === "invalide" && (
        <div className="mt-7 space-y-4">
          <Text size="small">
            {raison || "Ce lien n'est plus valable : il a expiré (il dure 24 heures), il a déjà servi, ou un lien plus récent a été envoyé."}{" "}
            Si votre adresse est déjà confirmée, il n&apos;y a rien à faire.
          </Text>
          {message ? (
            <div className="flex items-start gap-3 rounded-[12px] p-3.5" style={{ backgroundColor: "var(--cap-bg)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}>
              <MailCheck className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--cap-ocean)" }} aria-hidden />
              <p className="text-[0.92rem]" style={{ color: "var(--cap-ink)" }} role="status">{message}</p>
            </div>
          ) : (
            <form onSubmit={renvoyer} className="space-y-4" noValidate>
              {erreur && <FormError>{erreur}</FormError>}
              <Field label="Adresse e-mail du compte" htmlFor="ve-email">
                <TextInput id="ve-email" type="email" value={email} onChange={setEmail}
                  placeholder="vous@exemple.com" autoComplete="email" required />
              </Field>
              <Button type="submit" size="lg" disabled={envoi} className="w-full">
                {envoi ? (<><Loader2 className="h-4 w-4 animate-spin" />Envoi…</>) : "Recevoir un nouveau lien"}
              </Button>
            </form>
          )}
          <Text size="caption" className="text-center">
            <Link href="/login" className="underline underline-offset-2">Se connecter</Link>
          </Text>
        </div>
      )}
    </AuthScreen>
  );
}
