import type { TourId, TourStep } from "@/stores/alex-store";

export type Tour = {
  id: TourId;
  title: string;
  steps: TourStep[];
};

export const TOURS: Record<TourId, Tour> = {
  "analyze-asset": {
    id: "analyze-asset",
    title: "Analyser un actif",
    steps: [
      {
        id: "welcome",
        message: "Bienvenue dans le guide d'analyse ! Je vais te montrer comment analyser un actif étape par étape. Tu peux me poser des questions à tout moment 🚀",
      },
      {
        id: "go-to-markets",
        message: "Commençons par les **Marchés**. Clique sur l'onglet Marchés dans la barre de navigation pour voir tous les actifs disponibles.",
        spotlight: "[data-tour='markets']",
        validation: {
          type: "element-visible",
          selector: "[data-module-id='asset-selector']",
          successMessage: "Parfait ! Tu es sur la page d'analyse. Voyons maintenant le graphique principal.",
          errorMessage: "Rends-toi sur la page Marchés via le menu de navigation.",
          autoAdvance: true,
        },
        hint: "Le menu de navigation est sur la gauche de l'écran.",
        hintDelay: 20000,
      },
      {
        id: "choose-asset",
        message: "Choisis un actif qui t'intéresse. Pour commencer, je te recommande **Bitcoin (BTC)**, c'est le plus connu et le plus analysé. Clique sur 'Analyser' à côté de n'importe quel actif.",
        hint: "Cherche le bouton 'Analyser' dans la liste des actifs.",
        hintDelay: 15000,
        validation: {
          type: "element-visible",
          selector: "[data-module-id='main-chart']",
          successMessage: "Excellent ! Tu vois maintenant le graphique principal en chandeliers japonais 🕯️",
          errorMessage: "Clique sur 'Analyser' à côté d'un actif pour ouvrir l'analyse complète.",
          autoAdvance: true,
        },
      },
      {
        id: "read-chart",
        message: "**Le graphique principal** est ta boussole. Chaque bougie = une période (1h, 1 jour...). Bougie **verte** = prix monte. Bougie **rouge** = prix descend. Regarde la tendance générale : monte-t-elle ou descend-t-elle ?",
        spotlight: "[data-module-id='main-chart']",
        action: {
          type: "multiple-choice",
          options: [
            { label: "📈 Tendance haussière (ça monte)", value: "bullish" },
            { label: "📉 Tendance baissière (ça descend)", value: "bearish" },
            { label: "➡️ Tendance latérale (ça oscille)", value: "sideways" },
          ],
          onSelect: (_value) => ({
            valid: true,
            message: `Bonne observation ! Tu lis déjà les graphiques. Quelle que soit la tendance, l'important est de l'identifier avant d'entrer en position 🎯`,
          }),
        },
      },
      {
        id: "read-rsi",
        message: "Maintenant regardons le **RSI** (Relative Strength Index). C'est l'indicateur en bas du graphique qui oscille entre 0 et 100. **Au-dessus de 70** = suracheté (prudence). **En-dessous de 30** = survendu (possible rebond).",
        spotlight: "[data-module-id='rsi-panel']",
        action: {
          type: "multiple-choice",
          options: [
            { label: "RSI > 70 (suracheté)", value: "overbought" },
            { label: "RSI < 30 (survendu)", value: "oversold" },
            { label: "RSI entre 30-70 (neutre)", value: "neutral" },
          ],
          onSelect: (value) => ({
            valid: true,
            message:
              value === "overbought"
                ? "⚠️ Le marché est suracheté. Sois prudent avant d'acheter, attends un retour vers 50-60."
                : value === "oversold"
                ? "💡 Le marché est survendu. Cela peut indiquer un rebond potentiel, mais confirme avec d'autres indicateurs."
                : "✅ Zone neutre. Le RSI n'envoie pas de signal extrême. Cherche d'autres confirmations.",
          }),
        },
      },
      {
        id: "conclusion",
        message: "Félicitations ! 🎉 Tu viens de faire ta **première analyse technique** : graphique en chandeliers, tendance, RSI. C'est la base de tout bon trader. Active le **mode exploration** pour que je t'explique chaque module en passant dessus !",
        action: {
          type: "none",
        },
      },
    ],
  },
};
