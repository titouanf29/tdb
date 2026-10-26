"use client";

import type { AvisNimbo } from "@/lib/api";
import { Text } from "@/components/design-system";

const TON: Record<AvisNimbo["niveau"], { couleur: string; mot: string }> = {
  erreur: { couleur: "var(--cap-down)", mot: "À corriger" },
  attention: { couleur: "var(--cap-ambre)", mot: "Attention" },
  conseil: { couleur: "var(--cap-ocean)", mot: "Conseil" },
  bien: { couleur: "var(--cap-up)", mot: "Bon signe" },
};

/** Ce que Nimbo relève, du plus grave au plus léger. */
export function ListeAvis({ avis, vide }: { avis: AvisNimbo[]; vide?: string }) {
  if (!avis.length) {
    return <Text size="small">{vide ?? "Rien à redire."}</Text>;
  }
  const ordre = { erreur: 0, attention: 1, conseil: 2, bien: 3 };
  return (
    <ul className="flex flex-col gap-3.5">
      {[...avis].sort((a, b) => ordre[a.niveau] - ordre[b.niveau]).map((a) => (
        <li key={a.cle} className="flex gap-3">
          <span aria-hidden className="mt-[0.55rem] h-2 w-2 flex-none rounded-full" style={{ backgroundColor: TON[a.niveau].couleur }} />
          <div className="min-w-0">
            <p className="text-[0.82rem] italic" style={{ color: TON[a.niveau].couleur, fontFamily: "var(--cap-font-display)" }}>
              {TON[a.niveau].mot}
            </p>
            <Text size="small" tone="ink">{a.texte}</Text>
          </div>
        </li>
      ))}
    </ul>
  );
}
