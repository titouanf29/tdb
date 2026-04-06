"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Lang = "fr" | "en";

// ── Translations ──────────────────────────────────────────────────────────────

const translations = {
  fr: {
    // ── Nav / Sidebar ──────────────────────────────────────────────────────
    nav_dashboard:        "Dashboard",
    nav_markets:          "Marchés",
    nav_analysis:         "Analyse",
    nav_scanner:          "Scanner",
    nav_portfolio:        "Portefeuille",
    nav_positions:        "Positions",
    nav_wallet:           "Wallet",
    nav_journal:          "Journal",
    nav_favorites:        "Favoris",
    nav_assistant:        "Assistant IA",
    nav_tools:            "Outils",
    nav_learn:            "Formation",
    nav_community:        "Communauté",
    nav_settings:         "Paramètres",
    nav_legal:            "Mentions légales",
    nav_collapse:         "Réduire",
    nav_group_trading:    "Trading",
    nav_group_space:      "Mon espace",
    nav_group_ai:         "IA & Outils",
    nav_group_learn:      "Apprendre",
    nav_group_community:  "Communauté",
    // ── Auth ───────────────────────────────────────────────────────────────
    login_title:          "Connexion",
    login_subtitle:       "Bienvenue sur CaptenTDB",
    login_email:          "Email",
    login_password:       "Mot de passe",
    login_remember:       "Rester connecté",
    login_button:         "Se connecter",
    login_loading:        "Connexion…",
    login_no_account:     "Pas encore de compte ?",
    login_register:       "Créer un compte",
    login_back:           "Retour à la présentation",
    register_title:       "Rejoignez CaptenTDB",
    register_subtitle:    "Créez votre compte et apprenez le trading",
    register_username:    "Nom d'utilisateur",
    register_username_ph: "Votre pseudo",
    register_email:       "Email",
    register_password:    "Mot de passe",
    register_confirm:     "Confirmer le mot de passe",
    register_button:      "Créer mon compte",
    register_loading:     "Création du compte…",
    register_has_account: "Déjà un compte ?",
    register_login:       "Se connecter",
    register_back:        "Retour à la présentation",
    register_terms_text:  "J'ai lu et j'accepte les",
    register_terms_cgu:   "conditions d'utilisation (CGU)",
    register_terms_and:   ", la",
    register_terms_privacy: "politique de confidentialité",
    register_terms_age:   "et le disclaimer financier. Je confirme avoir au moins",
    register_bonus:       "Bonus de bienvenue :",
    register_bonus_sub:   "en argent virtuel !",
    register_disclaimer:  "Ce site est à but éducatif uniquement. CaptenTDB ne fournit pas de conseils financiers.",
    // ── Common ────────────────────────────────────────────────────────────
    loading:              "Chargement…",
    error_generic:        "Une erreur est survenue. Veuillez réessayer.",
    save:                 "Enregistrer",
    cancel:               "Annuler",
    delete:               "Supprimer",
    edit:                 "Modifier",
    add:                  "Ajouter",
    search:               "Rechercher",
    confirm:              "Confirmer",
    close:                "Fermer",
    retry:                "Réessayer",
    refresh:              "Actualiser",
    // ── Settings ──────────────────────────────────────────────────────────
    settings_title:       "Paramètres",
    settings_subtitle:    "Gérez vos préférences et votre compte",
    settings_language:    "Langue / Language",
    settings_theme:       "Thème de l'interface",
    settings_theme_dark:  "Sombre",
    settings_theme_dark_desc: "Mode nuit, idéal pour le trading",
    settings_theme_light: "Clair",
    settings_theme_light_desc: "Mode jour, interface lumineuse",
    settings_currency:    "Devise d'affichage",
    settings_accent:      "Couleur d'accent",
    settings_accent_desc: "Personnalise les boutons, bordures actives et éléments interactifs.",
    settings_tab_profile:  "Profil",
    settings_tab_trading:  "Trading",
    settings_tab_notif:    "Notifications",
    settings_tab_appear:   "Apparence",
    settings_tab_security: "Sécurité",
    settings_save:         "Sauvegarder",
    settings_saved:        "Sauvegardé",
    settings_display_name: "Nom d'affichage",
    settings_level:        "Niveau de trading",
    settings_level_desc:   "Adapte l'interface et les explications à votre niveau.",
    // ── Trading ───────────────────────────────────────────────────────────
    trade_open:           "Ouvrir une position",
    trade_buy:            "Acheter",
    trade_sell:           "Vendre",
    trade_long:           "Long",
    trade_short:          "Short",
    trade_amount:         "Montant",
    trade_leverage:       "Levier",
    trade_loading_price:  "Chargement du prix…",
    // ── Journal ───────────────────────────────────────────────────────────
    journal_title:        "Journal de trading",
    journal_new:          "Nouveau trade",
    journal_empty:        "Votre journal est vide",
    journal_add_first:    "Ajouter mon premier trade",
    journal_stats:        "Statistiques",
    journal_winrate:      "Win rate",
    journal_pnl:          "PnL total",
    journal_avg_rr:       "R:R moyen",
    // ── Dashboard ─────────────────────────────────────────────────────────
    dash_welcome:         "Tableau de bord",
    dash_subtitle:        "Suivez vos actifs, restez informé, tradez mieux.",
    dash_portfolio:       "Portefeuille",
    dash_positions:       "Positions ouvertes",
    dash_no_positions:    "Aucune position ouverte",
    dash_open_trade:      "Ouvrir un trade",
    dash_quick_actions:   "Actions rapides",
    dash_markets:         "Marchés",
    // ── Weekly prep ───────────────────────────────────────────────────────
    weekly_title:         "Préparation de marché",
    weekly_week:          "Semaine",
    weekly_sentiment:     "Sentiment global",
    weekly_bullish:       "Haussier",
    weekly_bearish:       "Baissier",
    weekly_neutral:       "Neutre",
    weekly_markets:       "Analyse par marché",
    weekly_watchlist:     "Actifs à surveiller",
    weekly_events:        "Événements de la semaine",
    weekly_conclusion:    "Synthèse stratégique",
    weekly_key_zones:     "Zones clés",
    weekly_risk:          "Risque",
    weekly_why:           "Pourquoi :",
    weekly_scenario:      "Scénario :",
    weekly_disclaimer:    "Contenu éducatif généré par IA · Pas un conseil financier · Trading = risque de perte en capital",
    weekly_loading:       "Génération de votre préparation de marché…",
    weekly_briefing:      "Briefing hebdomadaire",
    weekly_unavailable:   "Briefing indisponible",
    weekly_fullscreen:    "Plein écran",
    weekly_close_week:    "Fermer pour cette semaine",
    weekly_add_fav:       "Ajouter aux favoris",
    // ── Markets ───────────────────────────────────────────────────────────
    markets_title:        "Marchés",
    markets_subtitle:     "Suivez les marchés en temps réel",
    // ── Footer ────────────────────────────────────────────────────────────
    footer_paper:         "Paper Trading uniquement — Aucun risque financier réel",
    footer_by:            "par CaptenQwark",
  },
  en: {
    // ── Nav / Sidebar ──────────────────────────────────────────────────────
    nav_dashboard:        "Dashboard",
    nav_markets:          "Markets",
    nav_analysis:         "Analysis",
    nav_scanner:          "Scanner",
    nav_portfolio:        "Portfolio",
    nav_positions:        "Positions",
    nav_wallet:           "Wallet",
    nav_journal:          "Journal",
    nav_favorites:        "Favorites",
    nav_assistant:        "AI Assistant",
    nav_tools:            "Tools",
    nav_learn:            "Learn",
    nav_community:        "Community",
    nav_settings:         "Settings",
    nav_legal:            "Legal notice",
    nav_collapse:         "Collapse",
    nav_group_trading:    "Trading",
    nav_group_space:      "My space",
    nav_group_ai:         "AI & Tools",
    nav_group_learn:      "Learn",
    nav_group_community:  "Community",
    // ── Auth ───────────────────────────────────────────────────────────────
    login_title:          "Sign in",
    login_subtitle:       "Welcome to CaptenTDB",
    login_email:          "Email",
    login_password:       "Password",
    login_remember:       "Remember me",
    login_button:         "Sign in",
    login_loading:        "Signing in…",
    login_no_account:     "No account yet?",
    login_register:       "Create account",
    login_back:           "Back to home",
    register_title:       "Join CaptenTDB",
    register_subtitle:    "Create your account and learn trading",
    register_username:    "Username",
    register_username_ph: "Your username",
    register_email:       "Email",
    register_password:    "Password",
    register_confirm:     "Confirm password",
    register_button:      "Create my account",
    register_loading:     "Creating account…",
    register_has_account: "Already have an account?",
    register_login:       "Sign in",
    register_back:        "Back to home",
    register_terms_text:  "I have read and accept the",
    register_terms_cgu:   "terms of service (ToS)",
    register_terms_and:   ", the",
    register_terms_privacy: "privacy policy",
    register_terms_age:   "and financial disclaimer. I confirm I am at least",
    register_bonus:       "Welcome bonus:",
    register_bonus_sub:   "in virtual money!",
    register_disclaimer:  "This site is for educational purposes only. CaptenTDB does not provide financial advice.",
    // ── Common ────────────────────────────────────────────────────────────
    loading:              "Loading…",
    error_generic:        "An error occurred. Please try again.",
    save:                 "Save",
    cancel:               "Cancel",
    delete:               "Delete",
    edit:                 "Edit",
    add:                  "Add",
    search:               "Search",
    confirm:              "Confirm",
    close:                "Close",
    retry:                "Retry",
    refresh:              "Refresh",
    // ── Settings ──────────────────────────────────────────────────────────
    settings_title:       "Settings",
    settings_subtitle:    "Manage your preferences and account",
    settings_language:    "Language",
    settings_theme:       "Interface theme",
    settings_theme_dark:  "Dark",
    settings_theme_dark_desc: "Night mode, ideal for trading",
    settings_theme_light: "Light",
    settings_theme_light_desc: "Day mode, bright interface",
    settings_currency:    "Display currency",
    settings_accent:      "Accent color",
    settings_accent_desc: "Customizes buttons, active borders and interactive elements.",
    settings_tab_profile:  "Profile",
    settings_tab_trading:  "Trading",
    settings_tab_notif:    "Notifications",
    settings_tab_appear:   "Appearance",
    settings_tab_security: "Security",
    settings_save:         "Save",
    settings_saved:        "Saved",
    settings_display_name: "Display name",
    settings_level:        "Trading level",
    settings_level_desc:   "Adapts the interface and explanations to your level.",
    // ── Trading ───────────────────────────────────────────────────────────
    trade_open:           "Open a position",
    trade_buy:            "Buy",
    trade_sell:           "Sell",
    trade_long:           "Long",
    trade_short:          "Short",
    trade_amount:         "Amount",
    trade_leverage:       "Leverage",
    trade_loading_price:  "Loading price…",
    // ── Journal ───────────────────────────────────────────────────────────
    journal_title:        "Trading journal",
    journal_new:          "New trade",
    journal_empty:        "Your journal is empty",
    journal_add_first:    "Add my first trade",
    journal_stats:        "Statistics",
    journal_winrate:      "Win rate",
    journal_pnl:          "Total PnL",
    journal_avg_rr:       "Avg R:R",
    // ── Dashboard ─────────────────────────────────────────────────────────
    dash_welcome:         "Dashboard",
    dash_subtitle:        "Track your assets, stay informed, trade better.",
    dash_portfolio:       "Portfolio",
    dash_positions:       "Open positions",
    dash_no_positions:    "No open positions",
    dash_open_trade:      "Open a trade",
    dash_quick_actions:   "Quick actions",
    dash_markets:         "Markets",
    // ── Weekly prep ───────────────────────────────────────────────────────
    weekly_title:         "Market Preparation",
    weekly_week:          "Week",
    weekly_sentiment:     "Global sentiment",
    weekly_bullish:       "Bullish",
    weekly_bearish:       "Bearish",
    weekly_neutral:       "Neutral",
    weekly_markets:       "Market analysis",
    weekly_watchlist:     "Assets to watch",
    weekly_events:        "Weekly events",
    weekly_conclusion:    "Strategic summary",
    weekly_key_zones:     "Key zones",
    weekly_risk:          "Risk",
    weekly_why:           "Why:",
    weekly_scenario:      "Scenario:",
    weekly_disclaimer:    "AI-generated educational content · Not financial advice · Trading = risk of capital loss",
    weekly_loading:       "Generating your market preparation…",
    weekly_briefing:      "Weekly briefing",
    weekly_unavailable:   "Briefing unavailable",
    weekly_fullscreen:    "Fullscreen",
    weekly_close_week:    "Close for this week",
    weekly_add_fav:       "Add to favorites",
    // ── Markets ───────────────────────────────────────────────────────────
    markets_title:        "Markets",
    markets_subtitle:     "Track markets in real time",
    // ── Footer ────────────────────────────────────────────────────────────
    footer_paper:         "Paper Trading only — No real financial risk",
    footer_by:            "by CaptenQwark",
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
