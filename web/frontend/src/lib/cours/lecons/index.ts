// Fichier écrit par gen-index.mjs : ne pas le modifier à la main.
import type { LeconSerie } from "../types";

export const CHARGEURS: Record<number, () => Promise<{ default: LeconSerie }>> = {
  4: () => import("./04"),
  6: () => import("./06"),
  8: () => import("./08"),
  23: () => import("./23"),
  24: () => import("./24"),
  33: () => import("./33"),
};

export const DISPONIBLES = new Set<number>(Object.keys(CHARGEURS).map(Number));
