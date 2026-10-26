"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Ce que l'assistant écrit, rendu lisible.
 *
 * Le modèle répond en markdown — gras, titres, listes, tableaux. Le panneau
 * d'analyse affichait cette chaîne TELLE QUELLE, dans un simple <Text> : les
 * astérisques, les dièses et les barres verticales des tableaux sortaient en
 * caractères littéraux, et comme le HTML écrase les retours à la ligne, tout
 * arrivait en un seul pavé. « |------------|------------|» au milieu d'une
 * phrase, ce n'est pas un défaut de style, c'est du texte non rendu.
 *
 * La page Assistant, elle, rendait bien le markdown mais n'avait aucun style
 * de tableau ni de titre : un tableau y apparaissait comme des mots collés.
 * Les deux écrans partagent donc ce composant.
 *
 * Les choix de mise en forme visent la densité SANS l'entassement :
 *
 *   – les titres restent petits. Un ### dans une réponse de dix lignes n'est
 *     pas un titre de page, c'est une étiquette ; le rendre gros ferait
 *     perdre plus de place que la structure n'en fait gagner ;
 *   – les tableaux gardent une hauteur de ligne serrée, des filets fins
 *     plutôt que des bordures, et des chiffres alignés en chasse fixe : un
 *     tableau de niveaux se lit en colonne ou ne se lit pas ;
 *   – un tableau trop large défile horizontalement au lieu de déborder du
 *     panneau ou d'écraser ses colonnes ;
 *   – le séparateur (---) devient un filet discret, pas une barre noire.
 */
export function Markdown({
  children,
  className,
  tone = "muted",
}: {
  children: string;
  className?: string;
  tone?: "ink" | "muted";
}) {
  return (
    <div
      className={cn(
        "cap-md min-w-0 text-[0.9rem] leading-[1.62]",
        className
      )}
      style={{ color: tone === "ink" ? "var(--cap-ink)" : "var(--cap-ink-2)" }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Le conteneur qui défile : sans lui, un tableau de cinq colonnes
          // écrase le panneau au lieu de se laisser faire défiler.
          table: ({ children }) => (
            <div className="cap-md-table">
              <table>{children}</table>
            </div>
          ),
          // Les liens de l'assistant s'ouvrent ailleurs : on ne quitte pas
          // son analyse en cours pour un lien.
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
