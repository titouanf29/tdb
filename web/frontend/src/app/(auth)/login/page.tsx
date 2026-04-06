"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, TrendingUp, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useLanguage } from "@/lib/LanguageContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password, rememberMe);
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
          {t("login_back")}
        </Link>
        <LanguageToggle variant="compact" />
      </div>

      <div className="glass-card p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-4">
            <TrendingUp className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">
            {t("login_subtitle")} <span className="gradient-text">CaptenTDB</span>
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">{t("login_email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              placeholder="votre@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t("login_password")}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
          </div>

          {/* Remember me */}
          <label className="flex items-center gap-3 cursor-pointer group select-none">
            <div className="relative">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-5 h-5 rounded-md border border-white/20 bg-white/5 peer-checked:bg-primary peer-checked:border-primary transition-all duration-200 flex items-center justify-center">
                {rememberMe && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm text-foreground group-hover:text-white transition-colors">
              {t("login_remember")}
            </span>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t("login_loading")}
              </>
            ) : (
              t("login_button")
            )}
          </button>
        </form>

        {/* Register link */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("login_no_account")}{" "}
          <Link href="/register" className="text-primary hover:underline">
            {t("login_register")}
          </Link>
        </p>
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
