// Fichier écrit par gen-index.mjs : ne pas le modifier à la main.
import type { LeconSerie } from "../types";

export const CHARGEURS: Record<number, () => Promise<{ default: LeconSerie }>> = {
  33: () => import("./33"),
};

export const DISPONIBLES = new Set<number>(Object.keys(CHARGEURS).map(Number));
