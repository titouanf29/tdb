"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LogOut, Search, Settings, Shield } from "lucide-react";
import { Notifications } from "./Notifications";
import { useAuth } from "@/lib/AuthContext";
import { usePremium } from "@/lib/PremiumContext";
import {
  CaptenLogo, CloudCurtain, DUR, EASE, useAnimationsEnabled, useRouteCurtain,
} from "@/components/design-system";
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
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const area = areaForPath(pathname);
  const curtain = useRouteCurtain(pathname ?? "");
  const [anim] = useAnimationsEnabled();

  return (
    <div className="cap relative min-h-screen">
      <CloudCurtain active={curtain && anim} />
      <TopBar area={area} />
      <main className="mx-auto w-full max-w-[82rem] px-5 pb-28 pt-6 sm:px-8 lg:pb-16">
        {children}
      </main>
      <MobileTabs />
    </div>
  );
}

/* ── Top bar ──────────────────────────────────────────────────────────────── */

function TopBar({ area }: { area?: NavArea }) {
  const pathname = usePathname();
  const { isAdmin } = usePremium();
  const [open, setOpen] = useState<string | null>(null);

  const items = (area?.items ?? []).filter((i) => !i.adminOnly || isAdmin);

  return (
    <header
      className="sticky top-0 z-40"
      style={{ backgroundColor: "var(--cap-bg)" }}
    >
      <div className="mx-auto w-full max-w-[82rem] px-5 sm:px-8">
        <div className="flex h-16 items-center gap-6">
          <Link href="/dashboard" aria-label="CaptenTDB" style={{ color: "var(--cap-ink)" }}>
            <CaptenLogo size={21} className="hidden sm:inline-flex" />
            <CaptenLogo size={21} showName={false} className="sm:hidden" />
          </Link>

          {/* Areas. Hidden on a phone, where the bottom bar does this job. */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Sections">
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
                  className="relative whitespace-nowrap rounded-[9px] px-3 py-1.5 text-[0.875rem] transition-colors"
                  style={{ color: active ? "var(--cap-ink)" : "var(--cap-ink-3)" }}
                >
                  {active && (
                    <motion.span
                      layoutId="chrome-sub"
                      className="absolute inset-0 rounded-[9px]"
                      style={{ backgroundColor: "var(--cap-surface)" }}
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
        className="rounded-[9px] px-3 py-2 text-[0.9rem] transition-colors hover:bg-[color:var(--cap-surface-2)]"
        style={{ color: current ? "var(--cap-ink)" : "var(--cap-ink-2)" }}
      >
        {area.label}
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
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

function AssetSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd/Ctrl-K focuses it from anywhere. The keystroke people already try.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim().toUpperCase();
    if (!q) return;
    setValue("");
    inputRef.current?.blur();
    router.push(`/analysis?symbol=${encodeURIComponent(q)}`);
  };

  return (
    <form onSubmit={submit} className="relative hidden sm:block">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
        style={{ color: "var(--cap-ink-4)" }}
      />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Rechercher un actif"
        aria-label="Rechercher un actif"
        className="h-10 w-[11rem] rounded-[10px] pl-9 pr-3 text-[0.875rem] outline-none transition-[width,box-shadow] duration-200 focus:w-[15rem] placeholder:text-[color:var(--cap-ink-4)]"
        style={{
          backgroundColor: "var(--cap-surface)",
          color: "var(--cap-ink)",
          boxShadow: "inset 0 0 0 1px var(--cap-line)",
        }}
      />
    </form>
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

function MobileTabs() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
      style={{
        backgroundColor: "var(--cap-surface)",
        boxShadow: "0 -1px 0 var(--cap-line)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      aria-label="Navigation"
    >
      <div className="flex">
        {MOBILE_TABS.map((tab) => {
          const active = pathname === tab.href || pathname?.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 py-3 text-[0.72rem]",
                "transition-colors"
              )}
              style={{ color: active ? "var(--cap-ink)" : "var(--cap-ink-3)" }}
            >
              {active && (
                <motion.span
                  layoutId="chrome-tab"
                  className="absolute inset-x-4 top-0 h-[2px]"
                  style={{ backgroundColor: "var(--cap-ocean)" }}
                  transition={{ duration: DUR.quick, ease: EASE }}
                />
              )}
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
