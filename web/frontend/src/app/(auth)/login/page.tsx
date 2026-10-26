"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { Button, CaptenLogo, Checkbox, Field, FormError, Text, TextInput } from "@/components/design-system";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Un champ vide ou une adresse mal écrite se dit avant l'envoi, sous le
  // champ : le serveur ne répondait que « adresse e-mail pas valide ».
  const [essaye, setEssaye] = useState(false);
  const adresse = email.trim();
  const erreurEmail = !adresse ? "Indiquez votre adresse e-mail."
    : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(adresse) ? "Cette adresse e-mail n'est pas valide (exemple : vous@exemple.com)."
    : "";
  const erreurMdp = !password ? "Indiquez votre mot de passe." : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEssaye(true);
    if (erreurEmail || erreurMdp) {
      document.getElementById(erreurEmail ? "login-email" : "login-password")?.focus();
      return;
    }
    setIsLoading(true);
    try {
      await login(adresse, password, rememberMe);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_generic"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScreen
      eyebrow="Connexion"
      title={<>Reprenez où vous en étiez.</>}
      lead="Vos positions, votre historique et vos analyses vous attendent, exactement dans l'état où vous les avez laissés."
      points={[
        "Portefeuille virtuel et positions ouvertes",
        "Journal de vos décisions passées",
        "Analyses et actifs suivis",
      ]}
      footer={
        <Text size="small" className="text-center">
          Pas encore de compte ?{" "}
          <Link
            href="/register"
            className="font-medium underline underline-offset-2 transition-colors hover:text-[color:var(--cap-ink)]"
            style={{ color: "var(--cap-ocean)" }}
          >
            Créer un compte
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
        Se connecter
      </h2>

      <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
        {error && <FormError>{error}</FormError>}

        <Field label="Adresse e-mail" htmlFor="login-email" error={essaye && erreurEmail ? erreurEmail : undefined}>
          <TextInput
            id="login-email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="vous@exemple.com"
            autoComplete="email"
            required
            invalid={!!error || !!(essaye && erreurEmail)}
          />
        </Field>

        <Field label="Mot de passe" htmlFor="login-password" error={essaye && erreurMdp ? erreurMdp : undefined}>
          <TextInput
            id="login-password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            invalid={!!error || !!(essaye && erreurMdp)}
          />
        </Field>

        {/* Sous le champ du mot de passe, là où on le cherche quand on
            vient de se tromper. Il manquait : le site n'avait AUCUN moyen de
            récupérer un compte dont on avait oublié le mot de passe. */}
        <div className="-mt-2 flex justify-end">
          <Link
            href="/forgot-password"
            className="inline-flex min-h-[44px] items-center text-[0.84rem] underline underline-offset-2 transition-colors hover:text-[color:var(--cap-ink)]"
            style={{ color: "var(--cap-ocean)" }}
          >
            Mot de passe oublié ?
          </Link>
        </div>

        <Checkbox checked={rememberMe} onChange={setRememberMe}>
          Rester connecté sur cet appareil
        </Checkbox>

        <Button type="submit" size="lg" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connexion…
            </>
          ) : (
            "Se connecter"
          )}
        </Button>
      </form>
    </AuthScreen>
  );
}
