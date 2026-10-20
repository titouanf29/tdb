"use client";

import { createContext, useContext } from "react";

/**
 * Le jeton de la politique de contenu (CSP), tiré à chaque page par le
 * middleware. Un script écrit dans la page ne s'exécute que s'il le porte :
 * un script injecté par un attaquant ne le connaît pas.
 */
const ContexteNonce = createContext<string | undefined>(undefined);

export function NonceProvider({ nonce, children }: { nonce?: string; children: React.ReactNode }) {
  return <ContexteNonce.Provider value={nonce}>{children}</ContexteNonce.Provider>;
}

export const useNonce = () => useContext(ContexteNonce);
