import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CaptenTDB — Connexion",
  description: "Connectez-vous à votre espace CaptenTDB",
};

/**
 * Deliberately a pass-through.
 *
 * It used to paint three blurred blobs behind the form — the exact glow the
 * rebuild set out to remove. The auth screens now carry their own composition
 * (AuthShell above them adds only the maintenance strip), so there is nothing
 * left for this layer to do but hold the metadata.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
