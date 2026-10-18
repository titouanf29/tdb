import type { Metadata } from "next";
import { FICHES, fiche } from "@/lib/cours/catalogue";
import { LeconChargee } from "./LeconChargee";

export function generateStaticParams() {
  return FICHES.map((f) => ({ numero: String(f.numero) }));
}

export function generateMetadata({ params }: { params: { numero: string } }): Metadata {
  const f = fiche(Number(params.numero));
  if (!f) return { title: "Leçon introuvable | CaptenTDB" };
  return {
    title: `Leçon ${f.numero} : ${f.titre} | CaptenTDB`,
    description: f.resume,
  };
}

export default function Page({ params }: { params: { numero: string } }) {
  return <LeconChargee numero={Number(params.numero)} />;
}
