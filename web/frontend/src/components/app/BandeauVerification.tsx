"use client";

import { useEffect, useState } from "react";
import { MailCheck, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { verificationAPI } from "@/lib/api";

const CLE = "tdb_bandeau_verif_ferme";

/**
 * Le rappel, tant que l'adresse e-mail n'est pas confirmée. L'espace marche
 * sans : c'est la récupération du mot de passe qui en dépend, et c'est ce
 * que le bandeau dit. Il se ferme pour la session, et disparaît pour de bon
 * une fois l'adresse confirmée.
 */
export function BandeauVerification() {
  const { user } = useAuth();
  const [ferme, setFerme] = useState(true);
  const [etat, setEtat] = useState<"" | "envoi" | "envoye" | "erreur">("");

  useEffect(() => {
    try { setFerme(sessionStorage.getItem(CLE) === "1"); } catch { setFerme(false); }
  }, []);

  if (!user || user.email_verified !== false || ferme || !user.email) return null;

  const renvoyer = async () => {
    setEtat("envoi");
    try { await verificationAPI.renvoyer(user.email!); setEtat("envoye"); } catch { setEtat("erreur"); }
  };
  const fermer = () => {
    setFerme(true);
    try { sessionStorage.setItem(CLE, "1"); } catch { /* navigation privée */ }
  };

  return (
    <div className="relative z-10 mb-5 flex items-start gap-3 rounded-[14px] px-4 py-3"
      style={{ backgroundColor: "var(--cap-surface)", boxShadow: "inset 0 0 0 1px var(--cap-line-strong)" }} role="status">
      <MailCheck className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--cap-ocean)" }} aria-hidden />
      <p className="min-w-0 flex-1 text-[0.92rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>
        <b style={{ color: "var(--cap-ink)" }}>Confirmez votre adresse e-mail.</b>{" "}
        {etat === "envoye"
          ? <>Un nouveau lien vient de partir vers <b style={{ color: "var(--cap-ink)" }}>{user.email}</b>. Regardez aussi dans les indésirables.</>
          : <>Nous avons envoyé un lien à <b style={{ color: "var(--cap-ink)" }}>{user.email}</b> : il permettra de récupérer votre mot de passe si vous l&apos;oubliez.{" "}</>}
        {etat !== "envoye" && (
          <button type="button" onClick={renvoyer} disabled={etat === "envoi"} className="cap-lien whitespace-nowrap disabled:opacity-50">
            {etat === "envoi" ? "Envoi…" : etat === "erreur" ? "Réessayer l'envoi" : "Renvoyer l'e-mail"}
          </button>
        )}
      </p>
      <button type="button" onClick={fermer} aria-label="Masquer ce rappel"
        className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[color:var(--cap-surface-2)]"
        style={{ color: "var(--cap-ink-3)" }}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
