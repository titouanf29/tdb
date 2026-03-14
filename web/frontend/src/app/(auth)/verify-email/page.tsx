"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { TrendingUp, Loader2, CheckCircle, XCircle, Mail } from "lucide-react";
import { setToken, setUser, resendVerification } from "@/lib/auth";

type Status = "loading" | "success" | "error" | "no-token";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>(token ? "loading" : "no-token");
  const [errorMsg, setErrorMsg] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok) {
          setErrorMsg(data.detail || "Lien invalide ou expiré");
          setStatus("error");
          return;
        }

        // Store token & user, then redirect
        setToken(data.access_token);
        setUser(data.user);
        setStatus("success");
        setTimeout(() => { window.location.href = "/"; }, 2000);
      } catch {
        setErrorMsg("Erreur réseau. Veuillez réessayer.");
        setStatus("error");
      }
    })();
  }, [token]);

  const handleResend = async () => {
    if (!resendEmail) return;
    setResendLoading(true);
    try {
      await resendVerification(resendEmail);
      setResendSuccess(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur lors du renvoi");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="glass-card p-8 text-center">

        {/* Logo */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-6">
          <TrendingUp className="w-8 h-8 text-primary" />
        </div>

        {/* Loading */}
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Vérification en cours…</h1>
            <p className="text-muted-foreground text-sm">Activation de votre compte.</p>
          </>
        )}

        {/* Success */}
        {status === "success" && (
          <>
            <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Email vérifié !</h1>
            <p className="text-muted-foreground text-sm mb-4">
              Votre compte est activé. Redirection en cours…
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Accéder à mon espace
            </Link>
          </>
        )}

        {/* Error */}
        {status === "error" && (
          <>
            <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Lien invalide</h1>
            <p className="text-muted-foreground text-sm mb-6">{errorMsg}</p>

            {resendSuccess ? (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm mb-4">
                Email renvoyé ! Vérifiez votre boîte mail.
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Recevoir un nouveau lien :</p>
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-sm"
                />
                <button
                  onClick={handleResend}
                  disabled={resendLoading || !resendEmail}
                  className="w-full py-3 px-4 rounded-xl bg-primary text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-primary/90"
                >
                  {resendLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  Renvoyer le lien
                </button>
              </div>
            )}
            <p className="mt-4 text-sm text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline">
                Retour à la connexion
              </Link>
            </p>
          </>
        )}

        {/* No token */}
        {status === "no-token" && (
          <>
            <Mail className="w-14 h-14 text-primary mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Vérification email</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Utilisez le lien envoyé par email pour vérifier votre adresse.
            </p>
            <Link href="/login" className="text-primary hover:underline text-sm">
              Retour à la connexion
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
