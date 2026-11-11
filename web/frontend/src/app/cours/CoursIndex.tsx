"use client";

import { useEffect, useState } from "react";
import { Sommaire } from "@/components/cours/Sommaire";
import { Text } from "@/components/design-system";
import { useAuth } from "@/lib/AuthContext";
import { learnAPI } from "@/lib/api";

export function CoursIndex() {
  const { isAuthenticated } = useAuth();
  // Les leçons terminées, pour que les coches soient les mêmes ici que sur le
  // parcours : une lectrice a cru avoir tout perdu en tombant sur /cours.
  const [faites, setFaites] = useState<Set<string> | undefined>(undefined);
  useEffect(() => {
    if (!isAuthenticated) { setFaites(undefined); return; }
    learnAPI.lessons().then((r) => setFaites(new Set(Object.keys(r.lessons || {})))).catch(() => {});
  }, [isAuthenticated]);

  return (
    <div className="mx-auto w-full max-w-[880px] pb-24 pt-6">
      <p className="text-[1rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>La série CaptenTDB</p>
      <h1 className="mt-1 text-[clamp(2rem,4.6vw,3rem)] font-medium leading-[1.08]" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
        Apprendre le trading, une leçon après l&apos;autre
      </h1>
      <Text className="mt-4 max-w-[40rem]">
        Chaque vidéo de la série a sa leçon complète ici : les explications en détail, des exemples chiffrés, des graphiques à
        manipuler et un quiz pour vérifier.{isAuthenticated ? " Vos leçons terminées sont cochées." : " Gratuit, sans compte."}
      </Text>
      <div className="mt-10"><Sommaire faites={faites} /></div>
    </div>
  );
}
