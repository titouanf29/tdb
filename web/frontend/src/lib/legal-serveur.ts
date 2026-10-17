import type { EditeurPublic } from "./api";

/**
 * L'éditeur tel que le SERVEUR le déclare (backend api/legal.py, variables
 * d'environnement EDITEUR_*), lu par les pages légales au rendu.
 *
 * Une seule source : les mentions légales, les CGV et l'ouverture de la
 * vente lisent les mêmes variables. Avant, l'identité était écrite ici et le
 * statut ailleurs — le jour de l'immatriculation, il aurait fallu les
 * changer à deux endroits, et un oubli publiait des CGV sans vendeur.
 *
 * Relu toutes les cinq minutes. Si le serveur ne répond pas, la réponse par
 * défaut est la plus restrictive : éditeur non professionnel, rien en vente.
 */
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const EDITEUR_PAR_DEFAUT: EditeurPublic = {
  statut: "non_immatricule",
  nom_public: "CaptenQwark",
  identite: "",
  adresse: "",
  email: "",
  telephone: "",
  siren: "",
  rcs: "",
  tva_intracom: "",
  mention_tva: "TVA non applicable, art. 293 B du CGI",
  mediateur: { nom: "", adresse: "", site: "" },
  pays: "France",
  offre_ouverte: false,
  prix_centimes: 500,
  cgv_version: "2.0",
};

export async function lireEditeur(): Promise<EditeurPublic> {
  try {
    const r = await fetch(`${API}/api/legal/editeur`, { next: { revalidate: 300 } });
    if (!r.ok) return EDITEUR_PAR_DEFAUT;
    return { ...EDITEUR_PAR_DEFAUT, ...(await r.json()) };
  } catch {
    return EDITEUR_PAR_DEFAUT;
  }
}

export function prixTexte(centimes: number): string {
  return centimes % 100 === 0
    ? `${centimes / 100},00 €`
    : `${(centimes / 100).toFixed(2).replace(".", ",")} €`;
}

/** « Prénom Nom EI — adresse — SIREN … » : la ligne qui désigne le vendeur. */
export function ligneVendeur(e: EditeurPublic): string {
  return [e.identite || e.nom_public, e.adresse, e.siren ? `SIREN ${e.siren}` : ""].filter(Boolean).join(", ");
}
