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

  // Chaque problème est dit sous son champ, en clair, avec les MÊMES règles
  // que le serveur. Avant, la page annonçait « 6 caractères » quand le serveur
  // en voulait 8 avec un chiffre, et un pseudo avec un espace était refusé
  // par un message illisible : l'inscription paraissait cassée.
  const [touches, setTouches] = useState<Record<string, boolean>>({});
  const [essaye, setEssaye] = useState(false);
  const vu = (champ: string) => essaye || touches[champ];
  const toucher = (champ: string) => setTouches((t) => ({ ...t, [champ]: true }));

  const pseudo = username.trim().replace(/\s+/g, " ");
  const erreurPseudo =
    !pseudo ? "Choisissez un pseudo."
    : pseudo.length < 3 ? "Trop court : 3 caractères au moins."
    : pseudo.length > 30 ? "Trop long : 30 caractères au plus."
    : !/^[A-Za-zÀ-ÿ0-9_.\- ]+$/.test(pseudo) ? "Le pseudo ne peut contenir que des lettres, des chiffres, des espaces et les signes . - _"
    : "";
  const adresse = email.trim();
  const erreurEmail =
    !adresse ? "Indiquez votre adresse e-mail."
    : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(adresse) ? "Cette adresse e-mail n'est pas valide (exemple : vous@exemple.com)."
    : "";
  const erreurMdp =
    !password ? "Choisissez un mot de passe."
    : password.length < 8 ? `Trop court : 8 caractères au moins (encore ${8 - password.length}).`
    : !/[A-Za-z]/.test(password) ? "Ajoutez au moins une lettre."
    : !/\d/.test(password) ? "Ajoutez au moins un chiffre."
    : new TextEncoder().encode(password).length > 72 ? "Trop long : raccourcissez-le un peu."
    : "";
  const erreurConfirm =
    !confirm ? "Retapez le mot de passe."
    : confirm !== password ? "Les deux mots de passe ne correspondent pas."
    : "";
  // Le mot de passe se juge dès qu'on tape : on voit tout de suite ce qui manque.
  const montreMdp = password.length > 0 || essaye;
  const montreConfirm = confirm.length > 0 || essaye;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEssaye(true);

    const premiere = [
      ["reg-username", "Le pseudo", erreurPseudo], ["reg-email", "L'adresse e-mail", erreurEmail],
      ["reg-password", "Le mot de passe", erreurMdp], ["reg-confirm", "La confirmation", erreurConfirm],
    ].find(([, , m]) => m);
    if (premiere) {
      setError(`${premiere[1]} : ${premiere[2].charAt(0).toLowerCase()}${premiere[2].slice(1)}`);
      document.getElementById(premiere[0])?.focus();
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
      await register(adresse, password, pseudo, pseudo);
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
      title={<>Ici, vous allez apprendre à trader sans risquer un euro.</>}
      lead="Vous recevez 10 000 € fictifs et les vrais cours du marché. Nimbo, votre guide, vous explique chaque décision avant que vous la preniez, puis vous aide à comprendre ce qui s'est passé."
      points={[
        "Plus de 800 actifs : actions, crypto, indices, matières premières",
        "Des analyses expliquées, au niveau de détail que vous choisissez",
        "Vos propres stratégies, testées sur des années de cours",
        "Des cours, un journal et des missions pour progresser à votre rythme",
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

        <Field label="Nom d'utilisateur" htmlFor="reg-username"
          hint="3 à 30 caractères : lettres, chiffres, espaces, . - _"
          error={vu("pseudo") && erreurPseudo ? erreurPseudo : undefined}>
          <TextInput
            id="reg-username"
            value={username}
            onChange={setUsername}
            onBlur={() => toucher("pseudo")}
            placeholder="votre pseudo"
            autoComplete="username"
            required
            invalid={!!(vu("pseudo") && erreurPseudo)}
          />
        </Field>

        <Field label="Adresse e-mail" htmlFor="reg-email"
          hint="Elle ne sert qu'à votre compte : pas de newsletter, pas de publicité, jamais vendue ni cédée."
          error={vu("email") && erreurEmail ? erreurEmail : undefined}>
          <TextInput
            id="reg-email"
            type="email"
            value={email}
            onChange={setEmail}
            onBlur={() => toucher("email")}
            placeholder="vous@exemple.com"
            autoComplete="email"
            required
            invalid={!!(vu("email") && erreurEmail)}
          />
        </Field>

        <Field
          label="Mot de passe"
          htmlFor="reg-password"
          hint="8 caractères au moins, avec une lettre et un chiffre"
          error={montreMdp && erreurMdp ? erreurMdp : undefined}
        >
          <TextInput
            id="reg-password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete="new-password"
            required
            invalid={!!(montreMdp && erreurMdp)}
          />
        </Field>

        <Field
          label="Confirmer le mot de passe"
          htmlFor="reg-confirm"
          error={montreConfirm && erreurConfirm ? erreurConfirm : undefined}
        >
          <TextInput
            id="reg-confirm"
            type="password"
            value={confirm}
            onChange={setConfirm}
            placeholder="••••••••"
            autoComplete="new-password"
            required
            invalid={!!(montreConfirm && erreurConfirm)}
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
