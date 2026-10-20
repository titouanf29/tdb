import type { Metadata } from "next";
import { fiche } from "@/lib/cours/catalogue";
import { LeconChargee } from "./LeconChargee";

// Next 15 : les paramètres d'une page rendue sur le serveur arrivent en promesse.
type Props = { params: Promise<{ numero: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { numero } = await params;
  const f = fiche(Number(numero));
  if (!f) return { title: "Leçon introuvable | CaptenTDB" };
  return {
    title: `Leçon ${f.numero} : ${f.titre} | CaptenTDB`,
    description: f.resume,
  };
}

export default async function Page({ params }: Props) {
  const { numero } = await params;
  return <LeconChargee numero={Number(numero)} />;
}
