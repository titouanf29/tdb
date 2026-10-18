// Fichier écrit par gen-index.mjs : ne pas le modifier à la main.
import type { LeconSerie } from "../types";

export const CHARGEURS: Record<number, () => Promise<{ default: LeconSerie }>> = {
  2: () => import("./02"),
  4: () => import("./04"),
  5: () => import("./05"),
  6: () => import("./06"),
  8: () => import("./08"),
  12: () => import("./12"),
  13: () => import("./13"),
  23: () => import("./23"),
  24: () => import("./24"),
  33: () => import("./33"),
};

export const DISPONIBLES = new Set<number>(Object.keys(CHARGEURS).map(Number));
