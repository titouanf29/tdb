/**
 * The navigation model.
 *
 * Five areas, each a verb or a place, each holding the handful of screens that
 * belong together. A flat list of fifteen links in a rail is a file manager;
 * this asks "what are you doing?" first and only then "which screen?".
 *
 * "Formation" is gone. The word promised homework, and the one thing that must
 * not feel like homework in a product people use to learn is the learning. It
 * is "Parcours" now — the same route metaphor the rest of the identity uses,
 * and a thing you are already on rather than a course you have to start.
 */

export interface NavItem {
  href: string;
  label: string;
  /** One line, shown in the area menu. Says what the screen is for. */
  blurb: string;
  adminOnly?: boolean;
}

export interface NavArea {
  id: string;
  label: string;
  /** The screen the area name itself links to. */
  href: string;
  items: NavItem[];
}

export const AREAS: NavArea[] = [
  {
    id: "espace",
    label: "Mon espace",
    href: "/dashboard",
    items: [
      { href: "/dashboard", label: "Accueil", blurb: "Ce qui mérite votre attention aujourd'hui" },
      // WALLET DEVANT, PORTEFEUILLE DERRIÈRE, et les libellés le disent.
      //
      // Le site est un simulateur : le Wallet est le compte d'entraînement,
      // donc l'écran central. Il arrivait pourtant en quatrième position,
      // derrière un « Portefeuille » qui suit des placements RÉELS saisis à la
      // main — un usage rare, et surtout une autre chose.
      //
      // Deux mots proches pour deux notions opposées, c'est la confusion
      // garantie : « Portefeuille » et « Wallet » sont le même mot dans deux
      // langues. Les libellés portent donc maintenant la distinction, au lieu
      // de compter sur l'utilisateur pour s'en souvenir.
      { href: "/wallet", label: "Wallet de simulation", blurb: "Votre compte d'entraînement : solde, positions, résultats" },
      { href: "/trading", label: "Ouvrir une position", blurb: "Passer un ordre sur le compte d'entraînement" },
      { href: "/journal", label: "Journal", blurb: "Vos décisions, relues après coup" },
      { href: "/favorites", label: "Favoris", blurb: "Les actifs que vous suivez" },
      { href: "/portfolio", label: "Portefeuille réel", blurb: "Vos placements hors du site, saisis à la main" },
    ],
  },
  {
    id: "analyser",
    label: "Analyser",
    href: "/analysis",
    items: [
      { href: "/analysis", label: "Analyse", blurb: "Un actif, un verdict, et pourquoi" },
      { href: "/scanner", label: "Scanner", blurb: "Les opportunités qui vous correspondent" },
      { href: "/markets", label: "Marchés", blurb: "L'état général, par région et par classe" },
      { href: "/macro", label: "Agenda macro", blurb: "Fed, BCE, inflation, emploi : quand, et ce que ça change pour vos actifs" },
    ],
  },
  {
    id: "parcours",
    label: "Parcours",
    href: "/learn",
    items: [
      { href: "/learn", label: "Apprendre", blurb: "Les bases, puis les indicateurs, puis le risque" },
      { href: "/learn/missions", label: "Missions", blurb: "Des objectifs courts pour mettre en pratique" },
      { href: "/learn/glossaire", label: "Glossaire", blurb: "Chaque terme défini, en une phrase" },
    ],
  },
  {
    id: "assistant",
    label: "Assistant",
    href: "/assistant",
    items: [
      { href: "/assistant", label: "Assistant", blurb: "Une question en français, une réponse sur vos données" },
    ],
  },
  {
    id: "communaute",
    label: "Communauté",
    href: "/community",
    items: [
      { href: "/community", label: "Communauté", blurb: "Ce que font et disent les autres membres" },
      { href: "/support", label: "Mes demandes", blurb: "Vos échanges avec l'équipe, et ses réponses" },
    ],
  },
];

/**
 * Les quatre destinations qui méritent un onglet, plus le menu.
 *
 * CINQ ONGLETS NE COUVRAIENT PAS LE SITE. Sur téléphone, la barre du bas
 * était la seule navigation : le menu des sections est masqué sous 1 024 px.
 * Neuf écrans n'étaient donc atteignables par AUCUN chemin direct — Scanner,
 * Journal, Favoris, Ouvrir une position, Portefeuille réel, Assistant,
 * Communauté, Réglages, Premium. On ne tombait dessus qu'en arrivant par
 * hasard dans la bonne zone, où la rangée contextuelle les révélait.
 *
 * C'est ce qu'un premier essai sur iPhone a immédiatement fait apparaître :
 * « je ne peux pas accéder au scanner ».
 *
 * Le cinquième onglet ouvre donc un menu qui liste TOUT. Quatre destinations
 * fréquentes sous le pouce, et le reste à deux gestes — au lieu de zéro
 * chemin.
 */
export const MOBILE_TABS = [
  { href: "/dashboard", label: "Accueil" },
  { href: "/wallet", label: "Wallet" },
  { href: "/markets", label: "Marchés" },
  { href: "/analysis", label: "Analyser" },
] as const;

/**
 * Screens already rebuilt in the new design.
 *
 * The new chrome is light; the screens that have not been migrated are still
 * dark inside. Wrapping those in a light frame would look broken, so the shell
 * is chosen per route and the list grows as screens move over.
 *
 * There is no shortcut here, and it is worth writing down why: the legacy
 * screens carry about 1 600 hard-coded white classes — text-white, bg-white/5,
 * border-white/10. Those are not theme tokens, so flipping the palette would
 * not convert them, it would erase them. Each screen has to be rebuilt, and
 * this list is how the app stays coherent while that happens.
 */
export const MIGRATED_ROUTES = [
  "/dashboard",
  // Hors menu : on n'y entre que depuis l'accueil, le week-end.
  "/semaine",
  "/macro",
  // Hors menu : depuis la proposition de Nimbo (« Et en vrai ? »).
  "/nimbo",
  "/favorites",
  "/learn/glossaire",
  "/learn/missions",
  "/assistant",
  "/trading",
  "/portfolio",
  "/wallet",
  "/journal",
  "/community",
  "/support",
  "/analysis",
  "/markets",
  "/scanner",
  "/learn",
  "/settings",
  "/admin",
  "/premium",
  // Les quatre documents légaux. Ils ne sont pas « migrés » au sens des
  // autres écrans — leur contenu reste écrit dans l'ancien vocabulaire — mais
  // un pont CSS (`.cap-legal`) traduit ce vocabulaire, donc ils rendent le
  // thème clair et doivent recevoir la coque claire comme les autres.
  "/mentions-legales",
  "/politique-de-confidentialite",
  "/cgu",
  "/cgv",
];

export function isMigrated(pathname: string | null): boolean {
  if (!pathname) return false;
  return MIGRATED_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

export function areaForPath(pathname: string | null): NavArea | undefined {
  if (!pathname) return undefined;
  // Longest match wins, so /learn/missions resolves inside Parcours rather
  // than matching the first area that happens to share a prefix.
  let best: { area: NavArea; len: number } | undefined;
  for (const area of AREAS) {
    for (const item of area.items) {
      if (pathname === item.href || pathname.startsWith(item.href + "/")) {
        if (!best || item.href.length > best.len) best = { area, len: item.href.length };
      }
    }
  }
  return best?.area;
}
