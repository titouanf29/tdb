"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { dailyIntentAPI, type DailyIntentResult } from "@/lib/api";
import { Button, Markdown, Panel, Text } from "@/components/design-system";

/**
 * Ce que vous voulez faire aujourd'hui, et la réponse du moteur.
 *
 * UNE BOUCLE OUVERTE. L'accueil lisait déjà l'intention du jour — elle nourrit
 * la recommandation « une seule chose à faire » en haut de page — mais aucun
 * écran ne permettait plus de l'ÉCRIRE. Le composant qui le faisait a été
 * laissé de côté pendant la refonte : la route serveur répondait, l'accueil
 * consommait la réponse, et l'utilisateur n'avait aucun moyen de la produire.
 * La recommandation était donc calculée sur une intention toujours vide.
 *
 * Reconstruit court. L'ancienne version faisait 213 lignes avec ses exemples
 * animés et son fil de discussion ; l'accueil n'a pas besoin d'un second
 * assistant — il a besoin d'une phrase et de ce qu'elle déclenche.
 */
export function Intention() {
  const [data, setData] = useState<DailyIntentResult | null>(null);
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [charge, setCharge] = useState(true);

  useEffect(() => {
    dailyIntentAPI.get()
      .then(setData)
      .catch(() => {})
      .finally(() => setCharge(false));
  }, []);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    const intention = texte.trim();
    if (intention.length < 5 || envoi) return;
    setEnvoi(true);
    setErreur("");
    try {
      setData(await dailyIntentAPI.set(intention));
      setTexte("");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "L'envoi a échoué — réessayez.");
    } finally {
      setEnvoi(false);
    }
  };

  const reprendre = async () => {
    try { setData(await dailyIntentAPI.reset()); } catch { /* on garde l'état */ }
  };

  if (charge) return null;

  const reponse = data?.response;
  const actifs = data?.assets ?? [];
  const liens = data?.suggestions ?? [];

  return (
    <Panel
      title="Votre intention du jour"
      hint={
        reponse
          ? "Ce que vous avez demandé ce matin, et ce que le moteur en a fait."
          : "Dites ce que vous cherchez à faire aujourd'hui. L'accueil s'ajuste dessus."
      }
      aside={
        reponse ? (
          <button
            onClick={reprendre}
            className="flex items-center gap-1.5 text-[0.8rem] transition-colors hover:text-[color:var(--cap-ink)]"
            style={{ color: "var(--cap-ink-3)" }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Recommencer
          </button>
        ) : undefined
      }
    >
      {reponse ? (
        <>
          <Text size="small" tone="ink">« {data?.intent} »</Text>
          <div className="mt-3">
            <Markdown>{reponse}</Markdown>
          </div>

          {actifs.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {actifs.slice(0, 6).map((a) => (
                <Link
                  key={a.symbol}
                  href={`/analysis?symbol=${encodeURIComponent(a.symbol)}`}
                  className="rounded-[9px] px-2.5 py-1.5 text-[0.82rem] transition-colors hover:bg-[color:var(--cap-surface-3)]"
                  style={{ backgroundColor: "var(--cap-surface-2)", color: "var(--cap-ink-2)" }}
                >
                  {a.symbol}
                </Link>
              ))}
            </div>
          )}

          {liens.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
              {liens.slice(0, 3).map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="inline-flex items-center gap-1 text-[0.82rem] transition-colors"
                  style={{ color: "var(--cap-ocean)" }}
                >
                  {s.label}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <form onSubmit={envoyer} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Sparkles
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: "var(--cap-amber)" }}
            />
            <input
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              placeholder="Je veux comprendre le RSI · Que surveiller cette semaine ?"
              aria-label="Votre intention du jour"
              maxLength={200}
              className="h-11 w-full rounded-[11px] pl-10 pr-3.5 text-[0.9rem] outline-none placeholder:text-[color:var(--cap-ink-4)]"
              style={{
                backgroundColor: "var(--cap-bg)",
                color: "var(--cap-ink)",
                boxShadow: "inset 0 0 0 1px var(--cap-line-strong)",
              }}
            />
          </div>
          <Button type="submit" size="md" disabled={envoi || texte.trim().length < 5}>
            {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer"}
          </Button>
        </form>
      )}

      {erreur && <Text size="caption" tone="down" className="mt-2">{erreur}</Text>}
      {data && data.remaining >= 0 && !reponse && (
        <Text size="caption" tone="faint" className="mt-2.5">
          {data.remaining} {data.remaining > 1 ? "demandes restantes" : "demande restante"} aujourd&apos;hui.
        </Text>
      )}
    </Panel>
  );
}
