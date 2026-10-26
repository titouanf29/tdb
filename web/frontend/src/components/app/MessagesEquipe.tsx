"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { equipeAPI, type AnnonceEquipe, type NouveauteEquipe } from "@/lib/api";
import { EASE, useMouvementReduit } from "@/components/design-system";

/**
 * Les messages de l'équipe, dans la nouvelle interface.
 *
 * Les annonces et les nouveautés envoyées depuis l'administration ne
 * s'affichaient que dans l'ancien cadre, que plus personne ne voit : l'équipe
 * ne pouvait plus dire « nouvelle leçon cette semaine ». Un seul message à la
 * fois, le plus récent d'abord : une nouveauté pas encore lue (marquée lue sur
 * le serveur, elle ne revient sur aucun appareil), sinon une annonce de moins
 * de 30 jours pas encore masquée sur ce navigateur.
 */

const MASQUEES = "tdb_annonces_masquees";
const FRAICHEUR = 30 * 86_400_000;

type Message =
  | { genre: "nouveaute"; n: NouveauteEquipe }
  | { genre: "annonce"; a: AnnonceEquipe };

function lireMasquees(uid: number): number[] {
  try { return JSON.parse(localStorage.getItem(`${MASQUEES}_${uid}`) || "[]"); } catch { return []; }
}

export function MessagesEquipe() {
  const { user } = useAuth();
  const reduit = useMouvementReduit();
  const [message, setMessage] = useState<Message | null>(null);
  const [deplie, setDeplie] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let fini = false;
    (async () => {
      const n = await equipeAPI.nouveaute().then((r) => r.changelog).catch(() => null);
      if (fini) return;
      if (n) { setMessage({ genre: "nouveaute", n }); return; }
      const masquees = lireMasquees(user.id);
      const liste = await equipeAPI.annonces().then((r) => r.broadcasts || []).catch(() => []);
      const a = liste.find((x) => !masquees.includes(x.id) && Date.now() - new Date(x.created_at).getTime() < FRAICHEUR);
      if (!fini && a) setMessage({ genre: "annonce", a });
    })();
    return () => { fini = true; };
  }, [user?.id]);

  if (!message || !user) return null;

  const fermer = () => {
    if (message.genre === "nouveaute") equipeAPI.nouveauteLue(message.n.id).catch(() => {});
    else {
      try { localStorage.setItem(`${MASQUEES}_${user.id}`, JSON.stringify([...lireMasquees(user.id), message.a.id].slice(-50))); } catch { /* */ }
    }
    setMessage(null);
  };

  const titre = message.genre === "nouveaute" ? message.n.title : message.a.title;
  const texte = message.genre === "nouveaute" ? message.n.content : message.a.message;
  const etiquette = message.genre === "nouveaute"
    ? `Nouveau sur CaptenTDB${message.n.version ? `, version ${message.n.version}` : ""}`
    : message.a.type === "warning" ? "À savoir" : message.a.type === "success" ? "Bonne nouvelle" : "Un mot de l'équipe";
  const long = texte.length > 260;
  const trait = message.genre === "annonce" && message.a.type === "warning" ? "var(--cap-down)" : "var(--cap-ambre)";

  return (
    <motion.section
      aria-labelledby="message-equipe"
      initial={reduit ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="relative z-10 mb-5 rounded-[14px] px-5 py-4"
      style={{ backgroundColor: "var(--cap-surface)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}
    >
      <button type="button" onClick={fermer} aria-label="Masquer ce message"
        className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[color:var(--cap-surface-2)]"
        style={{ color: "var(--cap-ink-3)" }}>
        <X className="h-4 w-4" />
      </button>
      <p className="flex items-center gap-2 pr-10 text-[0.92rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>
        <span aria-hidden className="h-[2px] w-5 rounded-full" style={{ backgroundColor: trait }} />
        {etiquette}
      </p>
      <h2 id="message-equipe" className="mt-1.5 pr-8 text-[1.12rem] font-semibold leading-snug"
        style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
        {titre}
      </h2>
      <p className="mt-1.5 max-w-[46rem] whitespace-pre-line text-[0.92rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>
        {long && !deplie ? texte.slice(0, 240).trimEnd() + "…" : texte}
      </p>
      <div className="mt-2 flex flex-wrap gap-x-5 text-[0.88rem]">
        {long && (
          <button type="button" onClick={() => setDeplie((v) => !v)} className="cap-lien">
            {deplie ? "Réduire" : "Lire la suite"}
          </button>
        )}
        <button type="button" onClick={fermer} className="cap-lien">Compris</button>
      </div>
    </motion.section>
  );
}
