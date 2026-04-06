"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Lang = "fr" | "en";

// ── Translations ──────────────────────────────────────────────────────────────

const translations = {
  fr: {
    // Nav
    nav_dashboard:    "Dashboard",
    nav_markets:      "Marchés",
    nav_analysis:     "Analyse",
    nav_scanner:      "Scanner",
    nav_portfolio:    "Portefeuille",
    nav_positions:    "Positions",
    nav_wallet:       "Wallet",
    nav_journal:      "Journal",
    nav_favorites:    "Favoris",
    nav_assistant:    "Assistant IA",
    nav_tools:        "Outils",
    nav_learn:        "Formation",
    nav_community:    "Communauté",
    // Auth
    login_title:      "Connexion",
    login_email:      "Email",
    login_password:   "Mot de passe",
    login_remember:   "Rester connecté",
    login_button:     "Se connecter",
    login_no_account: "Pas encore de compte ?",
    login_register:   "Créer un compte",
    register_title:   "Créer un compte",
    register_username:"Nom d'utilisateur",
    register_firstname:"Prénom",
    register_button:  "Créer mon compte",
    register_has_account: "Déjà un compte ?",
    register_login:   "Se connecter",
    // Common
    loading:          "Chargement…",
    error_generic:    "Une erreur est survenue. Veuillez réessayer.",
    save:             "Enregistrer",
    cancel:           "Annuler",
    delete:           "Supprimer",
    edit:             "Modifier",
    add:              "Ajouter",
    search:           "Rechercher",
    confirm:          "Confirmer",
    close:            "Fermer",
    // Settings
    settings_language:"Langue",
    settings_theme:   "Thème",
    settings_currency:"Devise",
    // Trading
    trade_open:       "Ouvrir une position",
    trade_buy:        "Acheter",
    trade_sell:       "Vendre",
    trade_long:       "Long",
    trade_short:      "Short",
    trade_amount:     "Montant",
    trade_leverage:   "Levier",
    // Journal
    journal_new:      "Nouveau trade",
    journal_empty:    "Votre journal est vide",
    journal_add_first:"Ajouter mon premier trade",
    // Dashboard
    dash_welcome:     "Tableau de bord",
    dash_subtitle:    "Suivez vos actifs, restez informé, tradez mieux.",
    // Weekly prep
    weekly_title:     "Préparation de marché",
    weekly_sentiment: "Sentiment global",
    weekly_bullish:   "Haussier",
    weekly_bearish:   "Baissier",
    weekly_neutral:   "Neutre",
  },
  en: {
    // Nav
    nav_dashboard:    "Dashboard",
    nav_markets:      "Markets",
    nav_analysis:     "Analysis",
    nav_scanner:      "Scanner",
    nav_portfolio:    "Portfolio",
    nav_positions:    "Positions",
    nav_wallet:       "Wallet",
    nav_journal:      "Journal",
    nav_favorites:    "Favorites",
    nav_assistant:    "AI Assistant",
    nav_tools:        "Tools",
    nav_learn:        "Learn",
    nav_community:    "Community",
    // Auth
    login_title:      "Sign in",
    login_email:      "Email",
    login_password:   "Password",
    login_remember:   "Remember me",
    login_button:     "Sign in",
    login_no_account: "No account yet?",
    login_register:   "Create account",
    register_title:   "Create an account",
    register_username:"Username",
    register_firstname:"First name",
    register_button:  "Create my account",
    register_has_account: "Already have an account?",
    register_login:   "Sign in",
    // Common
    loading:          "Loading…",
    error_generic:    "An error occurred. Please try again.",
    save:             "Save",
    cancel:           "Cancel",
    delete:           "Delete",
    edit:             "Edit",
    add:              "Add",
    search:           "Search",
    confirm:          "Confirm",
    close:            "Close",
    // Settings
    settings_language:"Language",
    settings_theme:   "Theme",
    settings_currency:"Currency",
    // Trading
    trade_open:       "Open a position",
    trade_buy:        "Buy",
    trade_sell:       "Sell",
    trade_long:       "Long",
    trade_short:      "Short",
    trade_amount:     "Amount",
    trade_leverage:   "Leverage",
    // Journal
    journal_new:      "New trade",
    journal_empty:    "Your journal is empty",
    journal_add_first:"Add my first trade",
    // Dashboard
    dash_welcome:     "Dashboard",
    dash_subtitle:    "Track your assets, stay informed, trade better.",
    // Weekly prep
    weekly_title:     "Market Preparation",
    weekly_sentiment: "Global sentiment",
    weekly_bullish:   "Bullish",
    weekly_bearish:   "Bearish",
    weekly_neutral:   "Neutral",
  },
} as const;

export type TranslationKey = keyof typeof translations.fr;

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "fr",
  setLang: () => {},
  t: (key) => translations.fr[key],
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    const stored = localStorage.getItem("tdb_lang") as Lang | null;
    if (stored === "fr" || stored === "en") setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("tdb_lang", l);
  };

  const t = (key: TranslationKey): string =>
    (translations[lang] as Record<string, string>)[key] ??
    (translations.fr as Record<string, string>)[key] ??
    key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
