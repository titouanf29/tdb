"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { Button, CaptenLogo, Checkbox, Field, FormError, Num, Text, TextInput } from "@/components/design-system";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { t, lang } = useLanguage();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Validation happens per field, so the message sits next to the thing that
  // is wrong instead of at the top of the form.
  const tooShort = password.length > 0 && password.length < 6;
  const mismatch = confirm.length > 0 && confirm !== password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError(lang === "en"
        ? "Password must be at least 6 characters"
        : "Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (password !== confirm) {
      setError(lang === "en"
        ? "Passwords do not match"
        : "Les mots de passe ne correspondent pas");
      return;
    }
    if (!accepted) {
      setError(lang === "en"
        ? "You must accept the terms of service"
        : "Vous devez accepter les conditions d'utilisation");
      return;
    }

    setIsLoading(true);
    try {
      await register(email, password, username, username);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_generic"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScreen
      eyebrow="Créer un compte"
      title={<>Commencez avec 10 000 € qui ne sont pas les vôtres.</>}
      lead="Un espace d'entraînement complet : vous prenez de vraies décisions sur de vrais marchés, sans qu'un euro ne soit en jeu."
      points={[
        "800+ actifs — actions, crypto, indices, matières premières",
        "Analyse expliquée, au niveau de détail que vous choisissez",
        "Journal, formation et missions pour progresser",
      ]}
      footer={
        <Text size="small" className="text-center">
          Vous avez déjà un compte ?{" "}
          <Link
            href="/login"
            className="font-medium underline underline-offset-2 transition-colors hover:text-[color:var(--cap-ink)]"
            style={{ color: "var(--cap-ocean)" }}
          >
            Se connecter
          </Link>
        </Text>
      }
    >
      <div className="hidden lg:block">
        <CaptenLogo size={22} className="text-[color:var(--cap-ink)]" />
      </div>

      <h2
        className="mt-0 text-[1.35rem] font-semibold tracking-[-0.01em] lg:mt-7"
        style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}
      >
        Créer mon espace
      </h2>

      <div
        // flex-wrap with a nowrap amount: at 390px the figure was breaking
        // between "10 000" and "€", which is the one thing a price must never do.
        className="mt-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-3.5 py-3"
        style={{
          borderRadius: "var(--cap-r-md)",
          backgroundColor: "var(--cap-bg)",
          boxShadow: "inset 0 0 0 1px var(--cap-line)",
        }}
      >
        <Num className="whitespace-nowrap text-[1.05rem] font-medium">10 000 €</Num>
        <span className="text-[0.82rem]" style={{ color: "var(--cap-ink-3)" }}>
          virtuels, crédités à l&apos;ouverture
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        {error && <FormError>{error}</FormError>}

        <Field label="Nom d'utilisateur" htmlFor="reg-username">
          <TextInput
            id="reg-username"
            value={username}
            onChange={setUsername}
            placeholder="votre pseudo"
            autoComplete="username"
            required
          />
        </Field>

        <Field label="Adresse e-mail" htmlFor="reg-email">
          <TextInput
            id="reg-email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="vous@exemple.com"
            autoComplete="email"
            required
          />
        </Field>

        <Field
          label="Mot de passe"
          htmlFor="reg-password"
          hint="6 caractères minimum"
          error={tooShort ? "Trop court — 6 caractères minimum." : undefined}
        >
          <TextInput
            id="reg-password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete="new-password"
            required
            invalid={tooShort}
          />
        </Field>

        <Field
          label="Confirmer le mot de passe"
          htmlFor="reg-confirm"
          error={mismatch ? "Les deux mots de passe diffèrent." : undefined}
        >
          <TextInput
            id="reg-confirm"
            type="password"
            value={confirm}
            onChange={setConfirm}
            placeholder="••••••••"
            autoComplete="new-password"
            required
            invalid={mismatch}
          />
        </Field>

        <Checkbox checked={accepted} onChange={setAccepted}>
          J&apos;accepte les{" "}
          <Link href="/cgu" className="underline underline-offset-2" style={{ color: "var(--cap-ocean)" }}>
            conditions d&apos;utilisation
          </Link>{" "}
          et la{" "}
          <Link
            href="/politique-de-confidentialite"
            className="underline underline-offset-2"
            style={{ color: "var(--cap-ocean)" }}
          >
            politique de confidentialité
          </Link>
          , et je confirme avoir au moins 18 ans.
        </Checkbox>

        <Button type="submit" size="lg" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Création…
            </>
          ) : (
            "Créer mon compte"
          )}
        </Button>

        <Text size="caption" tone="faint">
          CaptenTDB est une plateforme éducative. Aucune somme réelle ne
          transite par le site et aucun conseil en investissement n&apos;est
          fourni.
        </Text>
      </form>
    </AuthScreen>
  );
}
