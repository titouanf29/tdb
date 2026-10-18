import type { Metadata } from "next";
import { CoursIndex } from "./CoursIndex";

export const metadata: Metadata = {
  title: "Apprendre le trading, leçon par leçon | CaptenTDB",
  description: "Toutes les leçons de la série CaptenTDB : lire un graphique, les ordres, le risque, les indicateurs, les signaux du prix. Gratuites, avec des graphiques à manipuler.",
};

export default function Page() {
  return <CoursIndex />;
}
