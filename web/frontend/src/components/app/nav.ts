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
      { href: "/portfolio", label: "Portefeuille", blurb: "Valeur, performance, répartition" },
      { href: "/trading", label: "Positions", blurb: "Ce qui est ouvert, et comment ça se passe" },
      { href: "/wallet", label: "Wallet", blurb: "Solde, dépôts et historique" },
      { href: "/journal", label: "Journal", blurb: "Vos décisions, relues après coup" },
      { href: "/favorites", label: "Favoris", blurb: "Les actifs que vous suivez" },
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
      { href: "/gold", label: "Gold Hub", blurb: "Le suivi dédié à l'or", adminOnly: true },
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
      { href: "/tools", label: "Outils", blurb: "Calculateurs de position, de risque et de conversion" },
    ],
  },
  {
    id: "communaute",
    label: "Communauté",
    href: "/community",
    items: [
      { href: "/community", label: "Communauté", blurb: "Ce que font et disent les autres membres" },
    ],
  },
];

/** The five destinations that get a tab on a phone, in thumb order. */
export const MOBILE_TABS = [
  { href: "/dashboard", label: "Accueil" },
  { href: "/analysis", label: "Analyser" },
  { href: "/portfolio", label: "Portefeuille" },
  { href: "/learn", label: "Parcours" },
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
  "/favorites",
  "/learn/glossaire",
  "/learn/missions",
  "/assistant",
  "/trading",
  "/portfolio",
  "/wallet",
  "/journal",
  "/community",
  "/analysis",
  "/markets",
  "/scanner",
  "/learn",
  "/settings",
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
