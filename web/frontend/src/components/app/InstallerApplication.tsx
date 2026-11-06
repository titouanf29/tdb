"use client";

import { useEffect, useState } from "react";
import { Smartphone, X } from "lucide-react";
import { Button, Nimbo, Text } from "@/components/design-system";
import { missionsAPI } from "@/lib/api";
import { dejaInstalle, estIos, installationPossible, installer, surChangement } from "@/lib/installation";

const CLE = "tdb_installation_vue";
const SERIE_MIN = 3;

/**
 * L'invitation à installer le site sur le téléphone, au troisième jour
 * d'affilée : le moment où une habitude commence. Pas avant, pour ne pas
 * demander une place sur l'écran d'accueil à quelqu'un qui découvre ; jamais
 * quand la page tourne déjà comme une application ; une fois refusée, plus
 * jamais.
 */
export function InstallerApplication() {
  const [serie, setSerie] = useState(0);
  const [possible, setPossible] = useState(false);
  const [ios, setIos] = useState(false);
  const [cachee, setCachee] = useState(true);
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    if (dejaInstalle()) return;
    try { setCachee(localStorage.getItem(CLE) === "1"); } catch { setCachee(false); }
    setIos(estIos());
    setPossible(installationPossible());
    missionsAPI.aujourdhui().then((d) => setSerie(d.serie)).catch(() => {});
    return surChangement(() => setPossible(installationPossible()));
  }, []);

  const fermer = () => {
    setCachee(true);
    try { localStorage.setItem(CLE, "1"); } catch { /* navigation privée */ }
  };
  const lancer = async () => {
    setOccupe(true);
    try {
      const r = await installer();
      if (r !== "indisponible") fermer();
    } finally { setOccupe(false); }
  };

  if (cachee || serie < SERIE_MIN || (!possible && !ios)) return null;

  return (
    <div className="cap-apparait flex items-start gap-3 rounded-[var(--cap-r-lg)] p-4"
      style={{ backgroundColor: "color-mix(in srgb, var(--cap-ocean) 7%, var(--cap-surface))", boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--cap-ocean) 25%, transparent)" }}>
      <Nimbo humeur="cap" taille={56} className="-my-1 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[0.98rem] font-semibold" style={{ color: "var(--cap-ink)" }}>
          {serie} jours d&apos;affilée. Gardez CaptenTDB sur votre écran d&apos;accueil.
        </p>
        <Text size="small" className="mt-1">
          {ios && !possible
            ? "Sur iPhone : appuyez sur Partager, puis « Sur l'écran d'accueil ». Le site s'ouvre alors comme une application, et peut vous prévenir."
            : "Il s'ouvre comme une application, en un geste, sans la barre du navigateur. Rien d'autre n'est installé."}
        </Text>
        {possible && (
          <div className="mt-3">
            <Button size="md" onClick={lancer} disabled={occupe}>
              <Smartphone className="h-4 w-4" /> {occupe ? "…" : "Installer"}
            </Button>
          </div>
        )}
      </div>
      <button type="button" onClick={fermer} aria-label="Ne plus proposer"
        className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-[color:var(--cap-surface-2)]">
        <X className="h-4 w-4" style={{ color: "var(--cap-ink-3)" }} />
      </button>
    </div>
  );
}
