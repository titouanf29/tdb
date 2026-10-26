"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown, Compass, Globe2, Home, LineChart, LogOut, Menu, Search, Settings, Shield,
  Wallet, X,
} from "lucide-react";
import { Notifications } from "./Notifications";
import { ReussiteNimbo } from "./ReussiteNimbo";
import { BandeauVerification } from "./BandeauVerification";
import { MessagesEquipe } from "./MessagesEquipe";
import { VisiteGuidee } from "./VisiteGuidee";
import { AideNimbo } from "./AideNimbo";
import { EVT_OUVRIR, lancerVisite } from "@/lib/visite";
import { missionsAPI } from "@/lib/api";
import { useSignalDepart } from "./DepuisDerniereVisite";
import { useAuth } from "@/lib/AuthContext";
import { usePremium } from "@/lib/PremiumContext";
import {
  AnimationsApp, CaptenLogo, CloudCurtain, DUR, EASE, useAnimationsEnabled, useRouteCurtain,
} from "@/components/design-system";
import { ListeSuggestions, useAssetSuggestions, useFermetureExterieure } from "./assetSearch";
import { AREAS, MOBILE_TABS, areaForPath, type NavArea } from "./nav";
import { cn } from "@/lib/utils";

/**
 * The shell of the signed-in app.
 *
 * Not a left rail. A rail spends 240px of every screen restating a list that
 * does not change, and it is the single strongest "this is a dashboard
 * template" signal there is. Here the width goes to the work instead:
 *
 *   * a top bar with five areas — what you are doing, not which file you want;
 *   * a contextual second row listing only the screens of the area you are in,
 *     so depth is available without being permanently on display;
 *   * a bottom tab bar on a phone, where a hamburger would hide everything
 *     behind an extra tap.
 *
 * Asset search sits in the bar rather than on a page: looking something up is
 * the most frequent thing anyone does here, and it should never cost a
 * navigation.
 */
/**
 * La visite du jour, pour les missions et la série de jours d'affilée.
 *
 * Elle vivait dans l'ancien AuthShell : une visite arrivée directement sur une
 * leçon n'était pas comptée. La clé est propre à chaque compte (deux comptes
 * sur un même navigateur se bloquaient l'un l'autre), et les deux signaux
 * partent l'un APRÈS l'autre : envoyés ensemble, ils lisaient le même total de
 * points et le second écrasait le premier.
 */
function useVisiteDuJour() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user?.id) return;
    // Le jour à Paris, comme le serveur (backend api/temps.py), pas en UTC.
    const jour = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date());
    const cle = `tdb_visite_du_jour_${user.id}`;
    try {
      if (localStorage.getItem(cle) === jour) return;
      localStorage.setItem(cle, jour);
    } catch { /* navigation privée : on signale quand même */ }
    missionsAPI.recordAction("daily_login")
      .then(() => missionsAPI.recordAction("login"))
      .catch(() => {});
  }, [user?.id]);
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  useVisiteDuJour();
  const { user } = useAuth();
  useSignalDepart(!!user);
  const pathname = usePathname();
  const area = areaForPath(pathname);
  const curtain = useRouteCurtain(pathname ?? "");
  const [anim] = useAnimationsEnabled();

  return (
    <div className="cap relative min-h-screen">
      <AnimationsApp />
      <CloudCurtain active={curtain && anim} />
      <TopBar area={area} />
      {/* La marge du bas suit la barre ET l'indicateur d'accueil : le
          dernier élément d'une page doit pouvoir remonter au-dessus des
          deux. Les marges latérales s'élargissent en paysage sur un iPhone à
          encoche, où la page bord à bord passerait sinon dessous. */}
      <main
        className="cap-app-main mx-auto w-full max-w-[82rem] pt-6 [--pad-x:1.25rem] sm:[--pad-x:2rem] lg:!pb-16"
        style={{
          paddingBottom: "calc(7rem + env(safe-area-inset-bottom, 0px))",
          // La marge habituelle (20 px, 32 px dès 640 px) OU l'encoche, la
          // plus grande des deux. En style direct seul, elle écrasait la
          // marge plus large de l'ordinateur.
          paddingLeft: "max(var(--pad-x), env(safe-area-inset-left, 0px))",
          paddingRight: "max(var(--pad-x), env(safe-area-inset-right, 0px))",
        }}
      >
        <BandeauVerification />
        <MessagesEquipe />
        {children}
      </main>
      <MobileTabs />
      <ReussiteNimbo />
      <AideNimbo />
      <VisiteGuidee />
    </div>
  );
}

/* ── L'en-tête qui s'efface ───────────────────────────────────────────────── */

/**
 * Sur téléphone, l'en-tête s'efface quand on descend et revient dès qu'on
 * remonte — le comportement des applications natives et de Safari lui-même.
 *
 * Mesuré sur un iPhone 13 : l'en-tête occupait en permanence 108 px sur 664,
 * la barre du bas 56 ; il restait 500 px pour lire. En descendant, on n'a
 * besoin ni du logo ni de la recherche : on lit. Dès qu'on remonte — le geste
 * qui dit « je cherche autre chose » — il revient.
 *
 * Trois garde-fous :
 *   · un seuil de quelques pixels, pour qu'un tremblement du doigt ne le
 *     fasse pas clignoter ;
 *   · il reste affiché près du haut de la page, et tant que quelque chose à
 *     l'intérieur a le focus (la recherche en cours de saisie, un menu) ;
 *   · le rebond élastique d'iOS en bas de page produit une fausse
 *     « remontée » : on l'ignore, sinon l'en-tête réapparaîtrait chaque fois
 *     qu'on atteint la fin d'une page.
 * Sur ordinateur, rien ne change : l'en-tête reste, la place ne manque pas.
 */
function useEnteteMasquee(ref: React.RefObject<HTMLElement | null>): boolean {
  const pathname = usePathname();
  const [masquee, setMasquee] = useState(false);

  useEffect(() => { setMasquee(false); }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    let dernier = window.scrollY;
    let attente = false;

    const maj = () => {
      attente = false;
      const y = window.scrollY;
      const bas = window.innerHeight + y >= document.documentElement.scrollHeight - 4;
      if (!mq.matches || y < 72 || ref.current?.contains(document.activeElement)) {
        setMasquee(false);
        dernier = y;
        return;
      }
      const d = y - dernier;
      if (Math.abs(d) < 8) return;
      if (d > 0) setMasquee(true);
      else if (!bas) setMasquee(false);
      dernier = y;
    };
    const auDefilement = () => {
      if (attente) return;
      attente = true;
      requestAnimationFrame(maj);
    };
    window.addEventListener("scroll", auDefilement, { passive: true });
    mq.addEventListener("change", maj);
    // Le focus qui entre dans l'en-tête (la loupe, un menu) le fait revenir.
    const auFocus = () => { if (ref.current?.contains(document.activeElement)) setMasquee(false); };
    document.addEventListener("focusin", auFocus);
    return () => {
      window.removeEventListener("scroll", auDefilement);
      mq.removeEventListener("change", maj);
      document.removeEventListener("focusin", auFocus);
    };
  }, [ref]);

  return masquee;
}

/* ── Top bar ──────────────────────────────────────────────────────────────── */

function TopBar({ area }: { area?: NavArea }) {
  const pathname = usePathname();
  const { isAdmin } = usePremium();
  const [open, setOpen] = useState<string | null>(null);

  const items = (area?.items ?? []).filter((i) => !i.adminOnly || isAdmin);
  const entete = useRef<HTMLElement>(null);
  const masquee = useEnteteMasquee(entete);

  // La visite guidée ouvre un menu pour montrer ce qu'il contient.
  useEffect(() => {
    const ouvrir = (e: Event) => {
      if (window.innerWidth < 1024) return;
      setOpen((e as CustomEvent<string | null>).detail);
    };
    window.addEventListener(EVT_OUVRIR, ouvrir);
    return () => window.removeEventListener(EVT_OUVRIR, ouvrir);
  }, []);

  return (
    <header
      ref={entete}
      className="sticky top-0 z-40"
      style={{
        backgroundColor: "var(--cap-bg)",
        // `transform` UNIQUEMENT quand il est masqué : un transform, même
        // nul, fait de l'en-tête le repère des éléments `fixed` qu'il
        // contient — la recherche déployée en plein écran et sa liste de
        // suggestions se seraient alors positionnées par rapport à lui.
        transform: masquee ? "translateY(-100%)" : undefined,
        transition: "transform 240ms cubic-bezier(0.2, 0.7, 0.2, 1)",
        // Sous la barre d'état quand le site est installé sur l'écran
        // d'accueil (iOS) : sans cela le logo passerait sous l'heure.
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div
        className="mx-auto w-full max-w-[82rem] [--pad-x:1.25rem] sm:[--pad-x:2rem]"
        style={{
          paddingLeft: "max(var(--pad-x), env(safe-area-inset-left, 0px))",
          paddingRight: "max(var(--pad-x), env(safe-area-inset-right, 0px))",
        }}
      >
        <div className="flex h-16 items-center gap-6">
          <Link href="/dashboard" aria-label="CaptenTDB" className="-mx-2 inline-flex min-h-[44px] min-w-[44px] items-center px-2" style={{ color: "var(--cap-ink)" }}>
            <CaptenLogo size={21} className="hidden sm:inline-flex" />
            <CaptenLogo size={21} showName={false} className="sm:hidden" />
          </Link>

          {/* Areas. Hidden on a phone, where the bottom bar does this job. */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Sections" data-visite="sections">
            {AREAS.map((a) => (
              <AreaButton
                key={a.id}
                area={a}
                current={area?.id === a.id}
                open={open === a.id}
                onOpen={() => setOpen(open === a.id ? null : a.id)}
                onClose={() => setOpen(null)}
              />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <AssetSearch />
            {/* La cloche vivait uniquement dans l'ancien en-tête : les écrans
                refaits n'en avaient aucune, et les notifications écrites à la
                clôture d'une position n'étaient donc visibles nulle part. */}
            <Notifications />
            {isAdmin && (
              <Link
                href="/admin"
                aria-label="Administration"
                className="hidden rounded-[9px] p-2 transition-colors hover:bg-[color:var(--cap-surface-2)] sm:block"
                style={{ color: "var(--cap-ink-3)" }}
              >
                <Shield className="h-[18px] w-[18px]" />
              </Link>
            )}
            <UserMenu />
          </div>
        </div>

        {/* Contextual row. Only the screens of the area you are in. */}
        {items.length > 1 && (
          <div className="-mx-1 flex gap-1 overflow-x-auto pb-2.5 no-scrollbar">
            {items.map((it) => {
              const active = pathname === it.href;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  aria-current={active ? "page" : undefined}
                  className="relative whitespace-nowrap px-3 py-1.5 text-[0.875rem] transition-colors hover:text-[color:var(--cap-ink)]"
                  style={{ color: active ? "var(--cap-ink)" : "var(--cap-ink-3)", fontWeight: active ? 600 : 400 }}
                >
                  {/* Un trait ambre sous la page où l'on est, comme sur la
                      page de présentation, plutôt qu'une pastille. */}
                  {active && (
                    <motion.span
                      layoutId="chrome-sub"
                      className="absolute inset-x-3 -bottom-[11px] h-[2px] rounded-full"
                      style={{ backgroundColor: "var(--cap-ambre)" }}
                      transition={{ duration: DUR.quick, ease: EASE }}
                    />
                  )}
                  <span className="relative z-10">{it.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <div className="h-px w-full" style={{ backgroundColor: "var(--cap-line)" }} />
    </header>
  );
}

function AreaButton({
  area,
  current,
  open,
  onOpen,
  onClose,
}: {
  area: NavArea;
  current: boolean;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const { isAdmin } = usePremium();
  const ref = useRef<HTMLDivElement>(null);
  const items = area.items.filter((i) => !i.adminOnly || isAdmin);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // One screen in the area: no menu, the label is the link.
  if (items.length === 1) {
    return (
      <Link
        href={items[0].href}
        data-visite={`zone-${area.id}`}
        className="rounded-[9px] px-3 py-2 text-[0.9rem] transition-colors hover:bg-[color:var(--cap-surface-2)]"
        style={{ color: current ? "var(--cap-ink)" : "var(--cap-ink-2)" }}
      >
        {area.label}
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative" data-visite={`zone-${area.id}`}>
      <button
        onClick={onOpen}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 rounded-[9px] px-3 py-2 text-[0.9rem] transition-colors hover:bg-[color:var(--cap-surface-2)]"
        style={{
          color: current ? "var(--cap-ink)" : "var(--cap-ink-2)",
          fontWeight: current ? 600 : 400,
        }}
      >
        {area.label}
        <ChevronDown
          className="h-3.5 w-3.5 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            className="absolute left-0 top-[calc(100%+6px)] z-50 w-[19rem] overflow-hidden p-1.5"
            style={{
              borderRadius: "var(--cap-r-lg)",
              backgroundColor: "var(--cap-surface)",
              boxShadow: "inset 0 0 0 1px var(--cap-line), var(--cap-shadow-lg)",
            }}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: DUR.quick, ease: EASE }}
          >
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                role="menuitem"
                onClick={onClose}
                data-visite={`lien-${it.href}`}
                className="block rounded-[10px] px-3 py-2.5 transition-colors hover:bg-[color:var(--cap-surface-2)]"
              >
                <div className="text-[0.9rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                  {it.label}
                </div>
                {/* The blurb is the point of the menu: a list of nouns makes
                    you guess, a list of purposes does not. */}
                <div className="mt-0.5 text-[0.8rem] leading-snug" style={{ color: "var(--cap-ink-3)" }}>
                  {it.blurb}
                </div>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Asset search ─────────────────────────────────────────────────────────── */

/**
 * La recherche de l'en-tête. Le comportement vit dans `assetSearch.tsx`, parce
 * que l'écran d'analyse a le sien et que les deux avaient dérivé : celui-ci
 * était corrigé, l'autre traitait encore le texte tapé comme un symbole.
 *
 * ELLE N'EST PLUS MASQUÉE SUR TÉLÉPHONE. Le champ était en `hidden sm:block` :
 * sous 640 px, il n'y avait aucune recherche dans l'en-tête, et donc aucune
 * recherche du tout sur les écrans qui n'en portent pas une. Mesuré sur un
 * écran de 390 px — accueil, analyse, scanner : aucun champ. Sur petit écran
 * il prend la forme d'un bouton loupe qui déploie le champ en pleine largeur,
 * parce qu'un champ permanent y mangerait la moitié de la barre.
 */
function AssetSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [deploye, setDeploye] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const s = useAssetSuggestions(value);

  useFermetureExterieure(boxRef, s.ouvert || deploye, () => {
    s.setOuvert(false);
    if (!value.trim()) setDeploye(false);
  });

  // Cmd/Ctrl-K focuses it from anywhere. The keystroke people already try.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setDeploye(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ouvrir = (symbole: string) => {
    setValue("");
    s.vider();
    setDeploye(false);
    inputRef.current?.blur();
    router.push(`/analysis?symbol=${encodeURIComponent(symbole)}`);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // La première proposition, pas le texte brut. C'est tout le correctif.
    if (s.choisi) ouvrir(s.choisi.symbol);
  };

  return (
    <div ref={boxRef} className="relative" data-visite="recherche">
      {/* Le déclencheur du petit écran. */}
      <button
        type="button"
        onClick={() => { setDeploye(true); setTimeout(() => inputRef.current?.focus(), 0); }}
        aria-label="Rechercher un actif"
        className={cn("rounded-[9px] p-2 transition-colors hover:bg-[color:var(--cap-surface-2)] sm:hidden",
                      deploye && "hidden")}
        style={{ color: "var(--cap-ink-3)" }}
      >
        <Search className="h-[18px] w-[18px]" />
      </button>

      <form
        onSubmit={submit}
        className={cn("relative", deploye
          ? "fixed inset-x-4 top-3 z-50 sm:static sm:inset-auto"
          : "hidden sm:block")}
      >
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
          style={{ color: "var(--cap-ink-4)" }}
        />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={s.touche}
          onFocus={() => s.hits.length && s.setOuvert(true)}
          placeholder="Rechercher un actif"
          aria-label="Rechercher un actif"
          role="combobox"
          aria-expanded={s.ouvert}
          aria-autocomplete="list"
          className={cn(
            "h-10 rounded-[10px] pl-9 pr-3 text-[0.875rem] outline-none",
            "transition-[width,box-shadow] duration-200 placeholder:text-[color:var(--cap-ink-4)]",
            deploye ? "w-full sm:w-[11rem] sm:focus:w-[15rem]" : "w-[11rem] focus:w-[15rem]",
          )}
          style={{
            backgroundColor: "var(--cap-surface)",
            color: "var(--cap-ink)",
            boxShadow: "inset 0 0 0 1px var(--cap-line)",
          }}
        />
      </form>

      <AnimatePresence>
        {s.ouvert && value.trim().length >= 2 && (
          <ListeSuggestions
            requete={value}
            hits={s.hits}
            actif={s.actif}
            cherche={s.cherche}
            onSurvol={s.setActif}
            onChoisir={ouvrir}
            className={cn("z-50 overflow-hidden p-1.5",
              deploye
                ? "fixed inset-x-4 top-[3.75rem] sm:absolute sm:inset-auto sm:right-0 sm:top-[calc(100%+6px)] sm:w-[20rem]"
                : "absolute right-0 top-[calc(100%+6px)] w-[20rem]")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── User menu ────────────────────────────────────────────────────────────── */

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const initial = (user?.first_name || user?.username || "?").charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Mon compte"
        className="flex h-9 w-9 items-center justify-center rounded-full text-[0.85rem] font-semibold transition-opacity hover:opacity-85"
        style={{ backgroundColor: "var(--cap-navy)", color: "#F2F5F7" }}
      >
        {initial}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            className="absolute right-0 top-[calc(100%+6px)] z-50 w-56 overflow-hidden p-1.5"
            style={{
              borderRadius: "var(--cap-r-lg)",
              backgroundColor: "var(--cap-surface)",
              boxShadow: "inset 0 0 0 1px var(--cap-line), var(--cap-shadow-lg)",
            }}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: DUR.quick, ease: EASE }}
          >
            <div className="px-3 py-2.5">
              <div className="truncate text-[0.9rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                {user?.first_name || user?.username}
              </div>
              <div className="truncate text-[0.78rem]" style={{ color: "var(--cap-ink-3)" }}>
                {user?.email}
              </div>
            </div>
            <div className="my-1 h-px" style={{ backgroundColor: "var(--cap-line)" }} />
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[0.875rem] transition-colors hover:bg-[color:var(--cap-surface-2)]"
              style={{ color: "var(--cap-ink)" }}
            >
              <Settings className="h-4 w-4" style={{ color: "var(--cap-ink-3)" }} />
              Paramètres
            </Link>
            <button
              role="menuitem"
              onClick={() => { setOpen(false); lancerVisite("decouverte"); }}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-[0.875rem] transition-colors hover:bg-[color:var(--cap-surface-2)]"
              style={{ color: "var(--cap-ink)" }}
            >
              <Compass className="h-4 w-4" style={{ color: "var(--cap-ink-3)" }} />
              Visite guidée du site
            </button>
            <button
              role="menuitem"
              onClick={() => { setOpen(false); logout(); }}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-[0.875rem] transition-colors hover:bg-[color:var(--cap-surface-2)]"
              style={{ color: "var(--cap-ink)" }}
            >
              <LogOut className="h-4 w-4" style={{ color: "var(--cap-ink-3)" }} />
              Se déconnecter
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Mobile tabs ──────────────────────────────────────────────────────────── */

/**
 * La barre du bas, revue après un premier essai sur iPhone.
 *
 * TROIS DÉFAUTS MESURÉS sur un iPhone 13 émulé (390 × 664) :
 *
 *   · chaque onglet faisait 78 × 41 px. Apple demande 44 pt au minimum, et
 *     41 px de haut pour une cible qu'on vise avec le pouce en marchant,
 *     c'est ce qui fait « pas très accessible » ;
 *   · il n'y avait que du texte. Une étiquette de 0,72 rem sans icône est à
 *     la fois plus dure à viser et plus lente à reconnaître ;
 *   · cinq onglets ne couvraient pas le site : neuf écrans, dont le Scanner,
 *     n'étaient atteignables par aucun chemin direct sur téléphone.
 *
 * D'où : quatre destinations fréquentes, un cinquième bouton qui ouvre tout,
 * des cibles de 56 px, et la marge du bas d'iOS ajoutée SOUS les cibles pour
 * que l'indicateur d'accueil ne les recouvre pas.
 */
function MobileTabs() {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const ouvrir = (e: Event) => {
      if (window.innerWidth >= 1024) return;
      setMenu((e as CustomEvent<string | null>).detail != null);
    };
    window.addEventListener(EVT_OUVRIR, ouvrir);
    return () => window.removeEventListener(EVT_OUVRIR, ouvrir);
  }, []);

  const ICONES: Record<string, typeof Home> = {
    "/dashboard": Home,
    "/wallet": Wallet,
    "/markets": Globe2,
    "/analysis": LineChart,
  };

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
        style={{
          // Translucide et flouté : le contenu qui défile se devine dessous,
          // la barre fait partie de l'écran au lieu d'être posée dessus. Le
          // navigateur qui ne connaît pas le flou retombe sur un fond presque
          // opaque, jamais sur un texte illisible.
          backgroundColor: "color-mix(in srgb, var(--cap-surface) 86%, transparent)",
          backdropFilter: "saturate(1.4) blur(14px)",
          WebkitBackdropFilter: "saturate(1.4) blur(14px)",
          boxShadow: "0 -1px 0 var(--cap-line)",
          // JUSQU'AU BORD DE L'ÉCRAN. La page est désormais déclarée bord à
          // bord (`viewport-fit=cover`, voir app/layout.tsx) : le fond de la
          // barre descend sous l'indicateur d'accueil de l'iPhone, comme dans
          // une application native, et cette marge — la hauteur de
          // l'indicateur — repousse les boutons au-dessus de lui. Sans elle,
          // l'indicateur recouvrirait le bas des onglets.
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          paddingLeft: "env(safe-area-inset-left, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
        }}
        aria-label="Navigation"
        data-visite="onglets"
      >
        <div className="flex">
          {MOBILE_TABS.map((tab) => {
            const active = pathname === tab.href || pathname?.startsWith(tab.href + "/");
            const Icone = ICONES[tab.href] ?? Home;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[0.75rem] transition-colors"
                style={{ color: active ? "var(--cap-ink)" : "var(--cap-ink-3)" }}
              >
                {active && (
                  <motion.span
                    layoutId="chrome-tab"
                    className="absolute inset-x-4 top-0 h-[2px]"
                    style={{ backgroundColor: "var(--cap-ambre)" }}
                    transition={{ duration: DUR.quick, ease: EASE }}
                  />
                )}
                <Icone className="h-[19px] w-[19px]" aria-hidden />
                {tab.label}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMenu(true)}
            aria-label="Tout le site"
            aria-expanded={menu}
            data-visite="menu-mobile"
            className="relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[0.75rem] transition-colors"
            style={{ color: menu ? "var(--cap-ink)" : "var(--cap-ink-3)" }}
          >
            <Menu className="h-[19px] w-[19px]" aria-hidden />
            Menu
          </button>
        </div>
      </nav>

      <MenuMobile open={menu} onClose={() => setMenu(false)} />
    </>
  );
}

/**
 * Tout le site, en une feuille.
 *
 * Elle remonte depuis le bas plutôt que de tomber du haut : sur un téléphone
 * tenu d'une main, le pouce atteint le bas de l'écran et pas le sommet — et
 * c'est du bas que vient le geste qui l'a ouverte.
 */
function MenuMobile({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { isAdmin } = usePremium();

  // Fermer en changeant d'écran : sans cela, la feuille reste ouverte
  // par-dessus la page qu'on vient de demander.
  useEffect(() => { onClose(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    // Le fond ne défile pas derrière la feuille.
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = avant;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            style={{ backgroundColor: "rgba(11,23,38,0.42)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.quick }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-label="Tout le site"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto lg:hidden"
            style={{
              backgroundColor: "var(--cap-surface)",
              borderTopLeftRadius: "var(--cap-r-xl)",
              borderTopRightRadius: "var(--cap-r-xl)",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: DUR.base, ease: EASE }}
          >
            <div className="sticky top-0 flex items-center justify-between gap-4 px-5 pb-2 pt-4"
                 style={{ backgroundColor: "var(--cap-surface)" }}>
              <span className="text-[0.75rem] uppercase tracking-[0.14em]"
                    style={{ color: "var(--cap-ink-3)" }}>
                Tout le site
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="-m-2 flex h-11 w-11 items-center justify-center rounded-full"
                style={{ color: "var(--cap-ink-3)" }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {AREAS.map((area) => {
              const items = area.items.filter((i) => !i.adminOnly || isAdmin);
              return (
                <div key={area.id} className="px-5 pb-0.5 pt-2.5">
                  <span className="text-[0.75rem] uppercase tracking-[0.14em]"
                        style={{ color: "var(--cap-ink-4)" }}>
                    {area.label}
                  </span>
                  <div className="mt-1.5 flex flex-col">
                    {items.map((it) => {
                      const active = pathname === it.href;
                      return (
                        <Link
                          key={it.href}
                          href={it.href}
                          onClick={onClose}
                          data-visite={`lien-${it.href}`}
                          className="flex min-h-[52px] flex-col justify-center rounded-[10px] px-3 py-2"
                          style={{ backgroundColor: active ? "var(--cap-surface-2)" : "transparent" }}
                        >
                          <span className="text-[0.95rem]" style={{ color: "var(--cap-ink)" }}>
                            {it.label}
                          </span>
                          {/* Une seule ligne, tronquée.
                              Sur 390 px, une phrase de description passe à deux
                              ou trois lignes et la rangée atteint 110 px : la
                              feuille n'en montre plus que quatre, et le Scanner
                             , celui qu'on est venu chercher, tombe à 900 px
                              du haut. Tronquée, la phrase oriente toujours, et
                              tout tient sans défiler. */}
                          <span
                            className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.78rem] leading-snug"
                            style={{ color: "var(--cap-ink-3)" }}
                          >
                            {it.blurb}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="mt-2 border-t px-5 pt-3" style={{ borderColor: "var(--cap-line)" }}>
              <div className="flex flex-col">
                {[
                  { href: "/settings", label: "Réglages" },
                  { href: "/premium", label: "Premium" },
                  ...(isAdmin ? [{ href: "/admin", label: "Administration" }] : []),
                ].map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={onClose}
                    className="flex min-h-[48px] items-center rounded-[10px] px-3 text-[0.92rem]"
                    style={{ color: "var(--cap-ink-2)" }}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
