"use client";

import { ConnexionInscription } from "@/components/auth/ConnexionInscription";

/** La connexion : la carte à volet coulissant, ouverte sur ce formulaire. */
export default function LoginPage() {
  return <ConnexionInscription initial="login" />;
}
