"use client";

import { ConnexionInscription } from "@/components/auth/ConnexionInscription";

/** L'inscription : la carte à volet coulissant, ouverte sur ce formulaire. */
export default function RegisterPage() {
  return <ConnexionInscription initial="signup" />;
}
