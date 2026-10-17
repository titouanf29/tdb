"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { analysisAPI, type ScanIntent } from "@/lib/api";
import { DUR, EASE, Text } from "@/components/design-system";

/**
 * Dire ce qu'on cherche, en français.
 *
 *   « J'ai 4 h devant moi, trouve-moi un trade en long ou short »
 *   « J'aimerais une opportunité sur 4 semaines »
 *
 * Ces deux phrases ne parlent pas de la même durée — l'une dit combien de
 * temps on peut surveiller, l'autre combien de temps on veut porter — et
 * c'est le serveur qui fait la différence (voir _intent.py).
 *
 * CE QUI A ÉTÉ COMPRIS EST AFFICHÉ, PAS APPLIQUÉ EN SILENCE. L'écran montre
 * ligne par ligne ce qu'il a lu, et les réglages restent modifiables à la
 * main juste en dessous. Un réglage posé sans qu'on sache d'où il sort est
 * pire qu'un réglage qu'on aurait mis soi-même : on ne peut ni le vérifier
 * ni le reprendre. C'est aussi ce qui rend la boîte honnête quand elle ne
 * comprend rien — elle le dit, au lieu de lancer un scan au hasard.
 *
 * La lecture est déclenchée à la frappe, avec un délai : analyser à chaque
 * caractère ferait clignoter l'interprétation pendant qu'on écrit encore.
 */

const EXEMPLES = [
  "J'ai 4 h devant moi, un trade en long ou short",
  "Une opportunité sur 4 semaines en Europe et aux US",
  "Du short sur la crypto cette semaine",
  "Les meilleures configurations sur 3 mois",
];

export function IntentBox({
  onApply,
}: {
  /** Appelé quand l'utilisateur valide ce qui a été compris. */
  onApply: (intent: ScanIntent) => void;
}) {
  const [texte, setTexte] = useState("");
  const [lu, setLu] = useState<ScanIntent | null>(null);
  const [applique, setApplique] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lire = useCallback((q: string) => {
    if (!q.trim()) { setLu(null); return; }
    analysisAPI.readScanIntent(q).then(setLu).catch(() => setLu(null));
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    setApplique(false);
    timer.current = setTimeout(() => lire(texte), 450);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [texte, lire]);

  const valider = () => {
    if (!lu?.recognised) return;
    onApply(lu);
    setApplique(true);
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4" style={{ color: "var(--cap-amber)" }} />
        <Text size="small" tone="ink" as="span">Dites ce que vous cherchez</Text>
      </div>

      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); valider(); }
        }}
        rows={2}
        maxLength={400}
        placeholder="J'ai 4 h devant moi, trouve-moi un trade en long ou short…"
        className="mt-2.5 w-full resize-y rounded-[10px] px-3.5 py-3 text-[0.9rem] leading-[1.5] outline-none"
        style={{
          backgroundColor: "var(--cap-surface)",
          color: "var(--cap-ink)",
          boxShadow: "inset 0 0 0 1px var(--cap-line)",
        }}
      />

      {/* Les exemples, tant que le champ est vide. Une boîte de texte libre
          sans exemple ne dit pas ce qu'elle sait lire. */}
      {!texte && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {EXEMPLES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setTexte(e)}
              className="rounded-[8px] px-2.5 py-1.5 text-[0.78rem] transition-colors hover:bg-[color:var(--cap-surface-2)]"
              style={{ color: "var(--cap-ink-3)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence initial={false}>
        {texte.trim() && lu && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: DUR.base, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="pt-3">
              {lu.recognised ? (
                <>
                  <Text size="caption">Ce que je comprends</Text>
                  <ul className="mt-1.5 space-y-1">
                    {lu.understood.map((u, i) => (
                      <motion.li
                        key={u}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: DUR.quick, ease: EASE, delay: i * 0.06 }}
                        className="text-[0.86rem]"
                        style={{ color: "var(--cap-ink-2)" }}
                      >
                        {u}
                      </motion.li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={valider}
                    disabled={applique}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[0.85rem] transition-colors disabled:opacity-60"
                    style={{
                      backgroundColor: applique ? "var(--cap-surface-2)" : "var(--cap-ink)",
                      color: applique ? "var(--cap-ink-2)" : "var(--cap-surface)",
                    }}
                  >
                    {applique ? <><Check className="h-3.5 w-3.5" /> Appliqué</> : "Appliquer ces réglages"}
                  </button>
                </>
              ) : (
                <Text size="small">
                  Je n&apos;ai rien reconnu dans cette phrase. Précisez une durée
                  (« sur 3 semaines »), un sens (« long », « short ») ou une zone
                  (« Europe », « crypto »), ou réglez directement ci-dessous.
                </Text>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
