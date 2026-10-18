"use client";

import { Sommaire } from "@/components/cours/Sommaire";
import { Text } from "@/components/design-system";

export function CoursIndex() {
  return (
    <div className="mx-auto w-full max-w-[880px] pb-24 pt-6">
      <p className="text-[1rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>La série CaptenTDB</p>
      <h1 className="mt-1 text-[clamp(2rem,4.6vw,3rem)] font-medium leading-[1.08]" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
        Apprendre le trading, une leçon après l&apos;autre
      </h1>
      <Text className="mt-4 max-w-[40rem]">
        Chaque vidéo de la série a sa leçon complète ici : les explications en détail, des exemples chiffrés, des graphiques à
        manipuler et un quiz pour vérifier. Gratuit, sans compte.
      </Text>
      <div className="mt-10"><Sommaire /></div>
    </div>
  );
}
