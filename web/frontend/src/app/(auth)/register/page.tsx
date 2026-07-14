"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Check, AlertTriangle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useLanguage } from "@/lib/LanguageContext";
import { TDBLogo } from "@/components/ui/TDBLogo";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { t, lang } = useLanguage();
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

  const passwordRequirements = [
    { label: t("register_password") + " ≥ 6", met: formData.password.length >= 6 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError(lang === "en" ? "Passwords do not match" : "Les mots de passe ne correspondent pas");
      return;
    }

    if (formData.password.length < 6) {
      setError(lang === "en" ? "Password must be at least 6 characters" : "Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (!acceptedTerms) {
      setError(lang === "en" ? "You must accept the terms of service" : "Vous devez accepter les conditions d'utilisation");
      return;
    }

    setIsLoading(true);

    try {
      await register(
        formData.email,
        formData.password,
        formData.username,
        formData.username
      );
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_generic"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-fade-in">
      {/* Back to landing + language toggle */}
      <div className="mb-4 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {t("register_back")}
        </Link>
        <LanguageToggle variant="compact" />
      </div>

      <div className="glass-card p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <TDBLogo size={64} />
          </div>
          <h1 className="text-2xl font-bold">
            {t("register_title")} <span className="gradient-text-gold">CaptenTDB</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("register_subtitle")}
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
              {t("register_username")}
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              placeholder={t("register_username_ph")}
              required
              minLength={3}
              maxLength={30}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t("register_email")}</label>
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
              {t("register_password")}
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
              {t("register_confirm")}
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
                {t("register_terms_text")}{" "}
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="text-primary hover:underline"
                >
                  {t("register_terms_cgu")}
                </button>
                {t("register_terms_and")}{" "}
                <a href="/politique-de-confidentialite" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {t("register_terms_privacy")}
                </a>
                {" "}{t("register_terms_age")} <strong>18 ans</strong>.
              </span>
            </label>

            {/* Legal notice */}
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <p className="text-xs text-yellow-400/90">
                  {t("register_disclaimer")}
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
                {t("register_loading")}
              </>
            ) : (
              t("register_button")
            )}
          </button>
        </form>

        {/* Terms Modal */}
        {showTerms && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <div className="bg-background border border-white/10 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-bold">Conditions d&apos;utilisation - CaptenTDB</h2>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4 text-sm text-muted-foreground">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">1. Disclaimer Financier</h3>
                  <p>CaptenTDB est une plateforme éducative. Les informations, analyses et outils fournis sont destinés uniquement à des fins d&apos;apprentissage et ne constituent en aucun cas des conseils financiers, d&apos;investissement ou de trading.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">2. Responsabilité de l&apos;utilisateur</h3>
                  <p>L&apos;utilisateur est seul responsable de ses décisions d&apos;investissement. Toute opération réalisée sur les marchés financiers réels comporte des risques de perte en capital.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">3. Paper Trading</h3>
                  <p>Le portefeuille virtuel utilise de l&apos;argent fictif. Les performances réalisées en paper trading ne garantissent pas les mêmes résultats sur les marchés réels.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">4. Règles de la communauté</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Respecter les autres membres de la communauté</li>
                    <li>Ne pas partager de fausses informations ou de manipulation</li>
                    <li>Ne pas faire de spam ou de publicité non autorisée</li>
                    <li>Signaler tout comportement problématique aux administrateurs</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">5. Données personnelles</h3>
                  <p>Vos données personnelles sont utilisées uniquement pour le fonctionnement de la plateforme. Nous ne vendons pas vos données à des tiers.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">6. Conditions d&apos;accès</h3>
                  <p>L&apos;accès au service est réservé aux personnes de <strong className="text-foreground">18 ans minimum</strong>. Un seul compte par personne est autorisé.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">7. Données personnelles (RGPD)</h3>
                  <p>Vos données sont traitées conformément au RGPD. Vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression. Consultez notre{" "}
                    <a href="/politique-de-confidentialite" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">politique de confidentialité complète</a>.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">8. Contact</h3>
                  <p>Pour toute question ou exercice de vos droits RGPD, utilisez la section &quot;Communauté&quot; → &quot;Contacter Admin&quot;.</p>
                </div>
                <div className="pt-4 border-t border-white/10 space-y-2">
                  <p className="text-xs">Fait par <span className="text-primary font-semibold">CaptenQwark</span> - CaptenTDB</p>
                  <div className="flex gap-3 text-xs">
                    <a href="/cgu" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">CGU complètes</a>
                    <span>·</span>
                    <a href="/mentions-legales" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Mentions légales</a>
                    <span>·</span>
                    <a href="/politique-de-confidentialite" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Politique de confidentialité</a>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                <button
                  onClick={() => setShowTerms(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  {t("close")}
                </button>
                <button
                  onClick={() => {
                    setAcceptedTerms(true);
                    setShowTerms(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors"
                >
                  {t("confirm")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Login link */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("register_has_account")}{" "}
          <Link href="/login" className="text-primary hover:underline">
            {t("register_login")}
          </Link>
        </p>

        {/* Bonus info */}
        <div className="mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <p className="text-sm text-green-400 text-center">
            {t("register_bonus")} <strong>$10,000</strong> {t("register_bonus_sub")}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground mt-4 space-y-1">
        <p>{t("footer_paper")}</p>
        <p><span className="text-primary">CaptenTDB</span> {t("footer_by")}</p>
        <div className="flex gap-3 justify-center pt-1">
          <a href="/cgu" className="hover:text-primary hover:underline">CGU</a>
          <span>·</span>
          <a href="/politique-de-confidentialite" className="hover:text-primary hover:underline">Confidentialité</a>
          <span>·</span>
          <a href="/mentions-legales" className="hover:text-primary hover:underline">Mentions légales</a>
        </div>
      </div>
    </div>
  );
}
