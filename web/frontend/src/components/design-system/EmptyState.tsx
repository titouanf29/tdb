"use client";

import { Button } from "./Button";
import { Nimbo, type NimboHumeur } from "./Nimbo";
import { Heading, Text } from "./Text";

/**
 * Nothing here yet — said as a sentence, with the next step attached.
 *
 * An empty screen is a moment of doubt ("is it broken? am I lost?"), so it
 * gets a plain explanation and exactly one thing to do. No illustration of a
 * sad box.
 */
export function EmptyState({
  title,
  description,
  action,
  humeur = "dort",
}: {
  title: string;
  /** L'humeur de Nimbo : il dort par défaut — il n'y a encore rien ici. */
  humeur?: NimboHumeur;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <div className="mx-auto max-w-sm py-14 text-center">
      {/* Nimbo tient compagnie à l'écran vide. Décoratif : le titre et la
          phrase disent déjà tout. */}
      <Nimbo humeur={humeur} taille={104} className="mx-auto mb-4" />

      <Heading level={3}>{title}</Heading>
      {description && (
        <Text size="small" className="mx-auto mt-2">
          {description}
        </Text>
      )}
      {action && (
        <div className="mt-6">
          <Button href={action.href} onClick={action.onClick} variant="secondary" size="md">
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
