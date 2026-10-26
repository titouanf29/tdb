// Régénère index.ts à partir des fichiers NN.tsx présents : node src/lib/cours/lecons/gen-index.mjs
import { readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const ici = dirname(fileURLToPath(import.meta.url));
const nums = readdirSync(ici).map((f) => f.match(/^(\d\d)\.tsx$/)?.[1]).filter(Boolean).sort();
const lignes = nums.map((n) => `  ${Number(n)}: () => import("./${n}"),`).join("\n");
writeFileSync(join(ici, "index.ts"), `// Fichier écrit par gen-index.mjs : ne pas le modifier à la main.
import type { LeconSerie } from "../types";

export const CHARGEURS: Record<number, () => Promise<{ default: LeconSerie }>> = {
${lignes}
};

export const DISPONIBLES = new Set<number>(Object.keys(CHARGEURS).map(Number));
`);
console.log(nums.length, "leçons");
