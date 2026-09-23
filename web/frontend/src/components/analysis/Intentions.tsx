"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button, Modal, Progress, Text } from "@/components/design-system";
import { type ProfilePreferences } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Cinq questions, et le droit de n'en répondre aucune.
 *
 * POURQUOI CES QUESTIONS-LÀ. Un questionnaire de préférences qui ne change
 * rien est une collecte de données déguisée en attention. La règle appliquée
 * ici est donc stricte : chaque question doit produire un NOMBRE ou une
 * COMPARAISON dans l'analyse, sans quoi elle n'a rien à faire dans ce
 * dialogue.
 *
 *   la mise          → la taille de position et l'argent réellement risqué,
 *                      en euros, sous le plan
 *   la perte admise  → comparée à la distance au stop que ce plan impose
 *   la disponibilité → comparée à la durée du mouvement attendu : une fenêtre
 *                      de 40 minutes pour quelqu'un qui regarde le soir n'est
 *                      pas un trade serré, c'est un trade qu'il ne verra pas
 *   la réaction      → confrontée au plan : couper à la première baisse avec
 *                      un stop à 17 % signifie qu'on sortira avant, à un prix
 *                      dont le backtest ne dit rien
 *   la lecture       → la profondeur d'ouverture de l'écran
 *   les indicateurs  → ceux qu'on connaît ne sont plus expliqués
 *
 * CE QUE ÇA NE FAIT PAS. Aucune réponse ne déplace le verdict. Quelqu'un de
 * prudent ne doit pas lire « vendre » là où le marché dit « acheter » : ce
 * serait remplacer une mesure par une flatterie. Les réponses changent ce
 * qu'on montre, ce qu'on explique et ce dont on avertit.
 */

type Cle = "mise_eur" | "perte_max_pct" | "disponibilite" | "reaction" | "lecture" | "connait";

interface Choix {
  valeur: string | number;
  label: string;
  /** La conséquence, dite à la personne pendant qu'elle choisit. */
  suite?: string;
}

interface Question {
  cle: Cle;
  titre: string;
  /** Pourquoi on demande. Une question sur l'argent sans justification est
   *  une question de trop. */
  pourquoi: string;
  choix: Choix[];
  /** Un champ libre en plus des propositions (la mise). */
  libre?: { unite: string; placeholder: string };
  multiple?: boolean;
}

const QUESTIONS: Question[] = [
  {
    cle: "mise_eur",
    titre: "Combien engagez-vous sur une position ?",
    pourquoi:
      "Pour traduire le plan en euros. « Stop à 327,22 $ » ne vous dit pas ce que vous perdez ; « 21 € sur les 500 € engagés », si.",
    choix: [
      { valeur: 100, label: "100 €" },
      { valeur: 500, label: "500 €" },
      { valeur: 1000, label: "1 000 €" },
      { valeur: 5000, label: "5 000 €" },
      { valeur: 0, label: "Je préfère ne pas le dire", suite: "Le plan restera en prix, sans traduction en euros." },
    ],
    libre: { unite: "€", placeholder: "Un autre montant" },
  },
  {
    cle: "perte_max_pct",
    titre: "Quelle perte acceptez-vous sur une position ?",
    pourquoi:
      "Pour la comparer à ce que le stop du plan exige réellement. Quand le plan demande plus que votre limite, vous devez le savoir avant d'ouvrir, pas après.",
    choix: [
      { valeur: 2, label: "2 %", suite: "Serré. Beaucoup de plans dépasseront cette limite." },
      { valeur: 5, label: "5 %" },
      { valeur: 10, label: "10 %" },
      { valeur: 20, label: "20 % ou plus", suite: "Large. Peu de plans vous alerteront." },
    ],
  },
  {
    cle: "disponibilite",
    titre: "Quand pouvez-vous vraiment regarder les marchés ?",
    pourquoi:
      "Pour vérifier que le mouvement attendu dure plus longtemps que l'intervalle entre deux de vos passages. Sinon l'objectif comme le stop sont franchis sans vous.",
    choix: [
      { valeur: "continu", label: "En continu, devant l'écran" },
      { valeur: "quotidien", label: "Quelques fois par jour" },
      { valeur: "soir", label: "Le soir seulement" },
      { valeur: "weekend", label: "Le week-end" },
    ],
  },
  {
    cle: "reaction",
    titre: "Votre position perd 15 %. Vous faites quoi ?",
    pourquoi:
      "Un plan n'existe que s'il est tenu. Répondez ce que vous FAITES, pas ce qu'il faudrait faire — c'est le seul moyen que l'écran vous signale un plan que vous ne jouerez pas.",
    choix: [
      { valeur: "coupe", label: "Je coupe" },
      { valeur: "attend", label: "J'attends que ça remonte" },
      { valeur: "renforce", label: "Je renforce" },
      { valeur: "inconnu", label: "Je ne sais pas encore" },
    ],
  },
  {
    cle: "lecture",
    titre: "Qu'attendez-vous de l'écran d'analyse ?",
    pourquoi: "Pour l'ouvrir au bon niveau plutôt que de vous faire redescendre à chaque actif.",
    choix: [
      { valeur: "verdict", label: "Le verdict, c'est tout" },
      { valeur: "raisons", label: "Le verdict et les raisons" },
      { valeur: "detail", label: "Tout le détail, indicateur par indicateur" },
    ],
  },
  {
    cle: "connait",
    titre: "Lesquels connaissez-vous déjà ?",
    pourquoi:
      "Ceux que vous cochez ne seront plus expliqués — l'écran garde la place pour ce qu'ils disent aujourd'hui, sur cet actif.",
    multiple: true,
    choix: [
      { valeur: "rsi", label: "RSI" },
      { valeur: "macd", label: "MACD" },
      { valeur: "ema", label: "Moyennes mobiles" },
      { valeur: "bollinger", label: "Bandes de Bollinger" },
      { valeur: "adx", label: "ADX" },
      { valeur: "atr", label: "ATR" },
      { valeur: "volume", label: "Volume" },
    ],
  },
];

type Reponses = Partial<Record<Cle, string | number | string[]>>;

export function Intentions({
  open,
  onClose,
  profil,
  enregistrer: enregistrerProfil,
  onEnregistre,
}: {
  open: boolean;
  onClose: () => void;
  profil: ProfilePreferences | null;
  /** L'écriture passe par `useProfile`, qui tient aussi le cache local :
   *  deux chemins d'écriture vers la même préférence, c'est deux états qui
   *  finissent par diverger. */
  enregistrer: (patch: Partial<ProfilePreferences>) => Promise<void>;
  /** Appelé après une écriture réussie, pour relancer l'analyse. */
  onEnregistre: () => void;
}) {
  const [etape, setEtape] = useState(0);
  const [reponses, setReponses] = useState<Reponses>({});
  const [libre, setLibre] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  // Repartir des réponses déjà données : un questionnaire rouvert doit
  // montrer ce qu'on avait dit, sinon on ne peut pas se corriger sans tout
  // ressaisir.
  useEffect(() => {
    if (!open) return;
    setEtape(0);
    setErreur("");
    setLibre(profil?.mise_eur ? String(profil.mise_eur) : "");
    setReponses({
      mise_eur: profil?.mise_eur ?? undefined,
      perte_max_pct: profil?.perte_max_pct ?? undefined,
      disponibilite: profil?.disponibilite ?? undefined,
      reaction: profil?.reaction ?? undefined,
      lecture: profil?.lecture ?? undefined,
      connait: profil?.connait ?? [],
    });
  }, [open, profil]);

  const q = QUESTIONS[etape];
  const derniere = etape === QUESTIONS.length - 1;

  const choisir = useCallback((v: string | number) => {
    setReponses((r) => {
      if (!q.multiple) return { ...r, [q.cle]: v };
      const actuel = (r[q.cle] as string[]) ?? [];
      const s = String(v);
      return {
        ...r,
        [q.cle]: actuel.includes(s) ? actuel.filter((x) => x !== s) : [...actuel, s],
      };
    });
    if (q.libre) setLibre("");
  }, [q]);

  const estChoisi = (v: string | number) => {
    const r = reponses[q.cle];
    if (q.multiple) return ((r as string[]) ?? []).includes(String(v));
    return r === v;
  };

  const enregistrer = useCallback(async () => {
    setEnvoi(true);
    setErreur("");
    try {
      // `0` efface la mise côté serveur — « je préfère ne pas le dire » doit
      // rester disponible après avoir répondu une première fois.
      const mise = libre.trim()
        ? Math.round(Number(libre.replace(",", ".")))
        : (reponses.mise_eur as number | undefined);
      await enregistrerProfil({
        mise_eur: Number.isFinite(mise as number) ? (mise as number) : undefined,
        perte_max_pct: reponses.perte_max_pct as number | undefined,
        disponibilite: reponses.disponibilite as string | undefined,
        reaction: reponses.reaction as string | undefined,
        lecture: reponses.lecture as string | undefined,
        connait: (reponses.connait as string[]) ?? [],
      });
      onEnregistre();
      onClose();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setEnvoi(false);
    }
  }, [libre, reponses, enregistrerProfil, onEnregistre, onClose]);

  const suite = q.choix.find((c) => estChoisi(c.valeur))?.suite;

  return (
    <Modal open={open} onClose={onClose} title="Votre façon de faire" className="max-w-xl">
      <div className="pr-8">
        <Text size="caption" as="span">
          Question {etape + 1} sur {QUESTIONS.length}
        </Text>
        <div className="mt-2">
          <Progress value={etape + 1} max={QUESTIONS.length} showValue={false} />
        </div>
      </div>

      <h2
        className="mt-5 text-[1.18rem] font-semibold leading-snug"
        style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}
      >
        {q.titre}
      </h2>
      <Text size="caption" className="mt-1.5">{q.pourquoi}</Text>

      <div className={cn("mt-4 grid gap-2", q.multiple ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1")}>
        {q.choix.map((c) => {
          const actif = estChoisi(c.valeur);
          return (
            <button
              key={String(c.valeur)}
              type="button"
              onClick={() => choisir(c.valeur)}
              aria-pressed={actif}
              className="flex min-h-[48px] items-center justify-between gap-3 rounded-[11px] px-3.5 py-2.5 text-left text-[0.92rem] transition-colors"
              style={{
                color: "var(--cap-ink)",
                backgroundColor: actif ? "var(--cap-surface-2)" : "transparent",
                boxShadow: `inset 0 0 0 1px ${actif ? "var(--cap-ocean)" : "var(--cap-line)"}`,
              }}
            >
              <span>{c.label}</span>
              {actif && <Check className="h-4 w-4 shrink-0" style={{ color: "var(--cap-ocean)" }} />}
            </button>
          );
        })}
      </div>

      {q.libre && (
        <div className="mt-2.5 flex items-center gap-2">
          <input
            value={libre}
            onChange={(e) => {
              setLibre(e.target.value.replace(/[^\d.,]/g, ""));
              setReponses((r) => ({ ...r, mise_eur: undefined }));
            }}
            inputMode="decimal"
            placeholder={q.libre.placeholder}
            aria-label={q.libre.placeholder}
            className="h-11 w-full rounded-[11px] px-3.5 text-[0.92rem] outline-none placeholder:text-[color:var(--cap-ink-4)]"
            style={{
              backgroundColor: "var(--cap-bg)",
              color: "var(--cap-ink)",
              boxShadow: "inset 0 0 0 1px var(--cap-line)",
            }}
          />
          <Text size="caption" as="span">{q.libre.unite}</Text>
        </div>
      )}

      {suite && <Text size="caption" className="mt-2.5">{suite}</Text>}
      {erreur && <Text size="caption" className="mt-2.5" tone="down">{erreur}</Text>}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => (etape === 0 ? onClose() : setEtape((e) => e - 1))}
          className="rounded-[9px] px-2 py-1.5 text-[0.85rem] underline underline-offset-4"
          style={{ color: "var(--cap-ink-3)" }}
        >
          {etape === 0 ? "Plus tard" : "Retour"}
        </button>
        <div className="flex items-center gap-2">
          {/* Passer une question est un droit, pas un échec : une intention
              qu'on ne veut pas donner vaut mieux qu'une réponse inventée, qui
              produirait ensuite des constats faux sur l'argent de quelqu'un. */}
          {!derniere && (
            <button
              type="button"
              onClick={() => setEtape((e) => e + 1)}
              className="rounded-[9px] px-3 py-2 text-[0.88rem]"
              style={{ color: "var(--cap-ink-3)" }}
            >
              Passer
            </button>
          )}
          <Button
            onClick={derniere ? enregistrer : () => setEtape((e) => e + 1)}
            disabled={envoi}
          >
            {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : derniere ? "Enregistrer" : "Suivant"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
