// Fichier écrit par gen-index.mjs : ne pas le modifier à la main.
import type { LeconSerie } from "../types";

export const CHARGEURS: Record<number, () => Promise<{ default: LeconSerie }>> = {
  2: () => import("./02"),
  4: () => import("./04"),
  5: () => import("./05"),
  6: () => import("./06"),
  7: () => import("./07"),
  8: () => import("./08"),
  12: () => import("./12"),
  13: () => import("./13"),
  14: () => import("./14"),
  15: () => import("./15"),
  16: () => import("./16"),
  17: () => import("./17"),
  18: () => import("./18"),
  19: () => import("./19"),
  20: () => import("./20"),
  21: () => import("./21"),
  22: () => import("./22"),
  23: () => import("./23"),
  24: () => import("./24"),
  33: () => import("./33"),
  36: () => import("./36"),
};

export const DISPONIBLES = new Set<number>(Object.keys(CHARGEURS).map(Number));
