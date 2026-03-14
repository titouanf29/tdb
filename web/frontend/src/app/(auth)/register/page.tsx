"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, TrendingUp, Loader2, Check, Mail } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { resendVerification } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const passwordRequirements = [
    { label: "Au moins 6 caracteres", met: formData.password.length >= 6 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (formData.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caracteres");
      return;
    }

    if (!acceptedTerms) {
      setError("Vous devez accepter les conditions d'utilisation");
      return;
    }

    setIsLoading(true);

    try {
      const result = await register(
        formData.email,
        formData.password,
        formData.username,
        formData.username
      );
      if (result.requires_verification) {
        setPendingEmail(result.email || formData.email);
      } else {
        window.location.href = "/";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    setResendLoading(true);
    setResendSuccess(false);
    try {
      await resendVerification(pendingEmail);
      setResendSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du renvoi");
    } finally {
      setResendLoading(false);
    }
  };
  };

  // ── Email verification pending screen ───────────────────────────────────
  if (pendingEmail) {
    return (
      <div className="w-full max-w-md animate-fade-in">
        <div className="glass-card p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/20 mb-6">
            <Mail className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Vérifiez votre email</h1>
          <p className="text-muted-foreground mb-1">Un lien de confirmation a été envoyé à</p>
          <p className="font-semibold text-primary mb-6">{pendingEmail}</p>
          <p className="text-sm text-muted-foreground mb-6">
            Cliquez sur le lien dans l&apos;email pour activer votre compte.
            Vérifiez aussi vos spams si vous ne le trouvez pas.
          </p>
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
              {error}
            </div>
          )}
          {resendSuccess && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm mb-4">
              Email renvoyé ! Vérifiez votre boîte mail.
            </div>
          )}
          <button
            onClick={handleResend}
            disabled={resendLoading}
            className="w-full py-3 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {resendLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Renvoyer l&apos;email
          </button>
          <p className="text-center text-sm text-muted-foreground mt-4">
            <a href="/login" className="text-primary hover:underline">Retour à la connexion</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="glass-card p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-4">
            <TrendingUp className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">
            Rejoignez <span className="gradient-text">CaptenTDB</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Creez votre compte et apprenez le trading
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Nom d&apos;utilisateur
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              placeholder="Votre pseudo"
              required
              minLength={3}
              maxLength={30}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              placeholder="votre@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors pr-12"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {/* Password requirements */}
            <div className="mt-2 space-y-1">
              {passwordRequirements.map((req, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 text-xs ${
                    req.met ? "text-green-400" : "text-muted-foreground"
                  }`}
                >
                  <Check
                    className={`w-3 h-3 ${req.met ? "opacity-100" : "opacity-30"}`}
                  />
                  {req.label}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          {/* Terms acceptance */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground">
                J'accepte les{" "}
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="text-primary hover:underline"
                >
                  conditions d'utilisation
                </button>
                , la politique de confidentialite et le disclaimer financier.
              </span>
            </label>

            {/* Legal notice */}
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <p className="text-xs text-yellow-400/90">
                  Ce site est a but educatif uniquement. CaptenTDB ne fournit pas de conseils financiers.
                  Les utilisateurs sont responsables de leurs propres decisions d'investissement.
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !acceptedTerms}
            className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creation du compte...
              </>
            ) : (
              "Creer mon compte"
            )}
          </button>
        </form>

        {/* Terms Modal */}
        {showTerms && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <div className="bg-background border border-white/10 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-bold">Conditions d'utilisation - CaptenTDB</h2>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4 text-sm text-muted-foreground">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">1. Disclaimer Financier</h3>
                  <p>
                    CaptenTDB est une plateforme educative. Les informations, analyses et outils fournis
                    sont destines uniquement a des fins d'apprentissage et ne constituent en aucun cas des
                    conseils financiers, d'investissement ou de trading.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">2. Responsabilite de l'utilisateur</h3>
                  <p>
                    L'utilisateur est seul responsable de ses decisions d'investissement. Toute operation
                    realisee sur les marches financiers reels comporte des risques de perte en capital.
                    CaptenTDB ne saurait etre tenu responsable des pertes financieres.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">3. Paper Trading</h3>
                  <p>
                    Le portefeuille virtuel utilise de l'argent fictif. Les performances realisees en
                    paper trading ne garantissent pas les memes resultats sur les marches reels.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">4. Regles de la communaute</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Respecter les autres membres de la communaute</li>
                    <li>Ne pas partager de fausses informations ou de manipulation</li>
                    <li>Ne pas faire de spam ou de publicite non autorisee</li>
                    <li>Signaler tout comportement problematique aux administrateurs</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">5. Donnees personnelles</h3>
                  <p>
                    Vos donnees personnelles sont utilisees uniquement pour le fonctionnement de la
                    plateforme. Nous ne vendons pas vos donnees a des tiers.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">6. Contact</h3>
                  <p>
                    Pour toute question, utilisez la section "Communaute" puis "Contacter Admin".
                  </p>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs">
                    Fait par <span className="text-primary font-semibold">CaptenQwark</span> - CaptenTDB
                  </p>
                </div>
              </div>
              <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                <button
                  onClick={() => setShowTerms(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Fermer
                </button>
                <button
                  onClick={() => {
                    setAcceptedTerms(true);
                    setShowTerms(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors"
                >
                  Accepter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Login link */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Deja un compte ?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Se connecter
          </Link>
        </p>

        {/* Bonus info */}
        <div className="mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <p className="text-sm text-green-400 text-center">
            Bonus de bienvenue : <strong>$10,000</strong> en argent virtuel !
          </p>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground mt-4">
        Paper Trading uniquement - Aucun risque financier reel
        <br />
        <span className="text-primary">CaptenTDB</span> par CaptenQwark
      </p>
    </div>
  );
}
