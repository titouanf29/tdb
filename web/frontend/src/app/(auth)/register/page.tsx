"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, TrendingUp, Loader2, Check } from "lucide-react";
import { register } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

    setIsLoading(true);

    try {
      await register(
        formData.email,
        formData.password,
        formData.username,
        formData.username
      );
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="w-full max-w-md opacity-0">
        <div className="glass-card p-8" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <div className="glass-card p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-4">
            <TrendingUp className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">
            Rejoignez <span className="gradient-text">TDB</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Creez votre compte et commencez a trader
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Nom d'utilisateur
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

          <button
            type="submit"
            disabled={isLoading}
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
      </p>
    </motion.div>
  );
}
