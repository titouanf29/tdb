"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, Settings2, X } from "lucide-react";
import { communityAPI, type UserNotification } from "@/lib/api";
import { DUR, EASE, Text } from "@/components/design-system";

/**
 * Les notifications, dans la nouvelle coque.
 *
 * Elles existaient — la table, les routes, le fil — mais la cloche vivait
 * UNIQUEMENT dans l'ancien en-tête. Tous les écrans refaits, wallet compris,
 * n'en avaient aucune. On écrivait donc des notifications que personne ne
 * pouvait voir : une position fermée par son stop pendant la nuit déposait
 * bien son message, et l'utilisateur ne le croisait jamais.
 *
 * Le rythme est volontairement lent. Ce ne sont pas des messages temps réel :
 * une clôture automatique n'a pas besoin d'arriver à la seconde, et un
 * sondage toutes les trente secondes sur chaque onglet ouvert coûte plus
 * qu'il ne rapporte. L'onglet caché ne sonde pas du tout — un onglet oublié
 * une nuit interrogerait l'API des milliers de fois pour personne.
 */

const PERIODE_MS = 90_000;

function depuis(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const min = ms / 60000;
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${Math.round(min)} min`;
  const h = min / 60;
  if (h < 24) return `il y a ${Math.round(h)} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

export function Notifications() {
  const [items, setItems] = useState<UserNotification[]>([]);
  const [nonLus, setNonLus] = useState(0);
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<HTMLDivElement>(null);

  const charger = useCallback(async () => {
    try {
      const d = await communityAPI.getNotifications();
      setItems(d.notifications || []);
      setNonLus(d.unread_count || 0);
    } catch { /* l'écran garde ce qu'il affiche */ }
  }, []);

  useEffect(() => {
    charger();
    let id: ReturnType<typeof setInterval> | null = null;
    const demarrer = () => {
      if (id) clearInterval(id);
      id = setInterval(() => { if (!document.hidden) charger(); }, PERIODE_MS);
    };
    const visibilite = () => { if (!document.hidden) charger(); };
    demarrer();
    document.addEventListener("visibilitychange", visibilite);
    // Une notification vient d'arriver sur l'appareil (public/sw.js) : la
    // cloche le montre tout de suite, sans attendre son prochain passage.
    const message = (e: MessageEvent) => { if (e.data?.type === "tdb-notification") charger(); };
    navigator.serviceWorker?.addEventListener("message", message);
    return () => {
      if (id) clearInterval(id);
      document.removeEventListener("visibilitychange", visibilite);
      navigator.serviceWorker?.removeEventListener("message", message);
    };
  }, [charger]);

  // À l'ouverture, le fil est relu : ce qu'on voit est l'état du moment.
  useEffect(() => { if (ouvert) charger(); }, [ouvert, charger]);

  // Un clic ailleurs referme : un panneau qui reste ouvert pendant qu'on
  // navigue recouvre ce qu'on essaie de lire.
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (boite.current && !boite.current.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(false); };
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);

  const toutLire = async () => {
    // L'affichage change tout de suite ; l'appel suit. Attendre le serveur
    // pour effacer une pastille donne l'impression d'un bouton mort.
    setNonLus(0);
    setItems((l) => l.map((n) => ({ ...n, is_read: 1 })));
    try { await communityAPI.markAllNotificationsRead(); } catch { /* ignore */ }
  };

  const effacer = async (n: UserNotification) => {
    setItems((l) => l.filter((x) => x.id !== n.id));
    if (!n.is_read) setNonLus((c) => Math.max(0, c - 1));
    try { await communityAPI.deleteNotification(n.id); } catch { charger(); }
  };

  const effacerLues = async () => {
    setItems((l) => l.filter((x) => !x.is_read));
    try { await communityAPI.clearReadNotifications(); } catch { charger(); }
  };

  const lire = async (n: UserNotification) => {
    if (n.is_read) return;
    setNonLus((c) => Math.max(0, c - 1));
    setItems((l) => l.map((x) => (x.id === n.id ? { ...x, is_read: 1 } : x)));
    try { await communityAPI.markNotificationRead(n.id); } catch { /* ignore */ }
  };

  return (
    <div className="relative" ref={boite}>
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-label={nonLus ? `${nonLus} notification${nonLus > 1 ? "s" : ""} non lue${nonLus > 1 ? "s" : ""}` : "Notifications"}
        aria-expanded={ouvert}
        className="relative rounded-[9px] p-2 transition-colors hover:bg-[color:var(--cap-surface-2)]"
        style={{ color: "var(--cap-ink-3)" }}
      >
        <Bell className="h-[18px] w-[18px]" />
        {nonLus > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: DUR.quick, ease: EASE }}
            className="cap-num absolute -right-0.5 -top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full px-1 text-[0.75rem] font-semibold"
            style={{ backgroundColor: "var(--cap-down)", color: "#fff" }}
          >
            {nonLus > 9 ? "9+" : nonLus}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {ouvert && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: DUR.quick, ease: EASE }}
            role="dialog"
            aria-label="Notifications"
            className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[14px]"
            style={{
              backgroundColor: "var(--cap-surface)",
              boxShadow: "0 18px 48px rgba(11,23,38,0.16), inset 0 0 0 1px var(--cap-line)",
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid var(--cap-line)" }}
            >
              <Text size="small" tone="ink" as="span">Notifications</Text>
              <div className="flex items-center gap-1">
                {nonLus > 0 && (
                  <button
                    type="button"
                    onClick={toutLire}
                    className="px-1.5 py-1 text-[0.78rem] transition-colors"
                    style={{ color: "var(--cap-ocean)" }}
                  >
                    Tout marquer comme lu
                  </button>
                )}
                {/* Le contrôle à un geste : ce qu'on reçoit se règle d'ici. */}
                <Link
                  href="/settings?section=notifications"
                  onClick={() => setOuvert(false)}
                  aria-label="Choisir ce que je reçois"
                  title="Choisir ce que je reçois"
                  className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[color:var(--cap-surface-2)]"
                  style={{ color: "var(--cap-ink-3)" }}
                >
                  <Settings2 className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="max-h-[22rem] overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-4 py-6">
                  <Text size="caption">
                    Rien pour le moment. Vous êtes prévenu ici quand un stop ou un objectif
                    ferme une position, quand une alerte de prix se déclenche, ou quand
                    l&apos;équipe vous répond. Vous choisissez quoi dans les{" "}
                    <Link href="/settings?section=notifications" onClick={() => setOuvert(false)} className="cap-lien">réglages</Link>.
                  </Text>
                </div>
              ) : (
                <ul>
                  {items.map((n) => {
                    const corps = (
                      <>
                        <div className="flex items-start gap-2">
                          {!n.is_read && (
                            <span
                              aria-hidden
                              className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: "var(--cap-ocean)" }}
                            />
                          )}
                          <div className={`min-w-0 pr-8 ${n.is_read ? "pl-3.5" : ""}`}>
                            <span
                              className="block text-[0.86rem] font-medium"
                              style={{ color: "var(--cap-ink)" }}
                            >
                              {n.title}
                            </span>
                            <span
                              className="mt-0.5 block text-[0.82rem] leading-[1.45]"
                              style={{ color: "var(--cap-ink-2)" }}
                            >
                              {n.message}
                            </span>
                            <span
                              className="mt-1 block text-[0.75rem]"
                              style={{ color: "var(--cap-ink-3)" }}
                            >
                              {depuis(n.created_at)}
                            </span>
                          </div>
                        </div>
                      </>
                    );
                    return (
                      <li key={n.id} className="relative" style={{ borderTop: "1px solid var(--cap-line)" }}>
                        {n.link ? (
                          <Link
                            href={n.link}
                            onClick={() => { lire(n); setOuvert(false); }}
                            className="block px-4 py-3 transition-colors hover:bg-[color:var(--cap-surface-2)]"
                          >
                            {corps}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => lire(n)}
                            className="block w-full px-4 py-3 text-left transition-colors hover:bg-[color:var(--cap-surface-2)]"
                          >
                            {corps}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => effacer(n)}
                          aria-label={`Effacer : ${n.title}`}
                          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[color:var(--cap-surface-2)]"
                          style={{ color: "var(--cap-ink-4)" }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div
                className="flex items-center justify-between gap-3 px-4 py-2.5"
                style={{ borderTop: "1px solid var(--cap-line)" }}
              >
                {nonLus === 0 ? (
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" style={{ color: "var(--cap-up)" }} />
                    <Text size="caption" as="span">Tout est lu.</Text>
                  </span>
                ) : <span />}
                {items.some((n) => n.is_read) && (
                  <button type="button" onClick={effacerLues} className="cap-lien text-[0.78rem]">
                    Effacer les notifications lues
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
