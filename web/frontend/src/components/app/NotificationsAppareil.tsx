"use client";

import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { Button, Nimbo, Panel, Text } from "@/components/design-system";
import { pushAPI } from "@/lib/api";
import { activerPush, desactiverPush, etatPush, type EtatPush } from "@/lib/push";

const CLE_INVITATION = "tdb_push_invitation_vue";

/**
 * Les notifications sur cet appareil : l'interrupteur des réglages, et
 * l'invitation de Nimbo sur la page des favoris — là où la promesse a un
 * sens (« je vous préviens quand je propose un achat sur l'un d'eux »).
 */
export function NotificationsAppareil({ forme }: { forme: "reglage" | "invitation" }) {
  const [etat, setEtat] = useState<EtatPush | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState("");
  const [cachee, setCachee] = useState(true);

  useEffect(() => {
    etatPush().then(setEtat).catch(() => setEtat("indisponible"));
    try { setCachee(localStorage.getItem(CLE_INVITATION) === "1"); } catch { setCachee(false); }
  }, []);

  const activer = async () => {
    setOccupe(true); setMessage("");
    try { setEtat(await activerPush()); }
    catch { setMessage("L'activation a échoué. Réessayez dans un instant."); }
    finally { setOccupe(false); }
  };
  const desactiver = async () => {
    setOccupe(true);
    try { setEtat(await desactiverPush()); } finally { setOccupe(false); }
  };
  const essayer = async () => {
    setOccupe(true); setMessage("");
    try {
      const r = await pushAPI.essai();
      setMessage(r.envoyees ? "Envoyée — elle arrive dans quelques secondes." : "Aucun appareil n'a accepté la notification.");
    } catch { setMessage("L'envoi a échoué."); }
    finally { setOccupe(false); }
  };
  const fermer = () => {
    setCachee(true);
    try { localStorage.setItem(CLE_INVITATION, "1"); } catch { /* navigation privée */ }
  };

  if (forme === "invitation") {
    if (etat !== "inactif" || cachee) return null;
    return (
      <div className="cap-apparait flex items-start gap-3 rounded-[var(--cap-r-lg)] p-4"
        style={{ backgroundColor: "color-mix(in srgb, var(--cap-ocean) 7%, var(--cap-surface))", boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--cap-ocean) 25%, transparent)" }}>
        <Nimbo humeur="content" taille={56} className="-my-1 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[0.98rem] font-semibold" style={{ color: "var(--cap-ink)" }}>
            Je peux vous prévenir quand je propose un achat sur un de vos favoris.
          </p>
          <Text size="small" className="mt-1">
            Une notification sur ce téléphone ou cet ordinateur, même site fermé. Pas de publicité, pas plus
            d&apos;une par actif et par jour — et vous coupez quand vous voulez dans les réglages.
          </Text>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button size="md" onClick={activer} disabled={occupe}>
              <BellRing className="h-4 w-4" /> {occupe ? "…" : "Me prévenir"}
            </Button>
            {message && <Text size="caption" as="span">{message}</Text>}
          </div>
        </div>
        <button type="button" onClick={fermer} aria-label="Ne plus proposer"
          className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-[color:var(--cap-surface-2)]">
          <X className="h-4 w-4" style={{ color: "var(--cap-ink-3)" }} />
        </button>
      </div>
    );
  }

  const texte: Record<EtatPush, string> = {
    indisponible: "Ce navigateur ne sait pas recevoir de notifications. Sur iPhone, ajoutez d'abord CaptenTDB à l'écran d'accueil (Partager → « Sur l'écran d'accueil »), puis ouvrez-le depuis là.",
    non_configure: "Les notifications ne sont pas encore ouvertes sur le site.",
    refuse: "Vous les avez refusées dans ce navigateur : pour les rétablir, autorisez les notifications pour captentdb.fr dans les réglages du navigateur.",
    inactif: "Désactivées sur cet appareil.",
    actif: "Activées sur cet appareil.",
  };
  return (
    <Panel
      title="Notifications sur cet appareil"
      hint="Quand Nimbo propose un achat sur un de vos favoris, quand un stop ou un objectif ferme une de vos positions, et avant une décision de banque centrale qui les touche."
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Text size="small" className="max-w-[36rem]">{etat ? texte[etat] : "…"}</Text>
        <div className="flex flex-wrap gap-2">
          {etat === "inactif" && <Button size="md" onClick={activer} disabled={occupe}>Activer</Button>}
          {etat === "actif" && (
            <>
              <Button size="md" variant="secondary" onClick={essayer} disabled={occupe}>Envoyer un essai</Button>
              <Button size="md" variant="secondary" onClick={desactiver} disabled={occupe}>Désactiver</Button>
            </>
          )}
        </div>
      </div>
      {message && <Text size="caption" className="mt-3">{message}</Text>}
    </Panel>
  );
}
