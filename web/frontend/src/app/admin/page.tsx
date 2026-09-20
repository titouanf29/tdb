"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity, BookOpen, LayoutGrid, LifeBuoy, Megaphone, Users as UsersIcon,
} from "lucide-react";
import { adminAPI, type AdminDashboard } from "@/lib/api";
import { convertCurrency, useSettings } from "@/lib/SettingsContext";
import {
  CloudCurtain, DUR, EASE, EmptyState, Heading, Text, WeatherBackdrop,
  useAnimationsEnabled,
} from "@/components/design-system";
import { Overview } from "@/components/admin/Overview";
import { Users } from "@/components/admin/Users";
import { Positions } from "@/components/admin/Positions";
import { AssetRequests } from "@/components/admin/AssetRequests";
import { Comms } from "@/components/admin/Comms";
import { Operations } from "@/components/admin/Operations";
import { Tickets } from "@/components/admin/Tickets";

/**
 * L'administration.
 *
 * L'écran précédent faisait 3 476 lignes et définissait quatorze blocs pour
 * en afficher sept. Quatre sections entières — les positions de tous les
 * comptes, les demandes d'actifs, le journal d'audit, les statistiques —
 * étaient écrites, compilées et livrées à chaque déploiement sans qu'aucun
 * chemin ne permette d'y arriver. Les routes existaient pourtant côté
 * serveur : c'est le câblage qui manquait, pas la fonctionnalité.
 *
 * Deux principes pour la refonte :
 *
 *   1. ON OUVRE CET ÉCRAN POUR SAVOIR S'IL Y A QUELQUE CHOSE À FAIRE. Pas
 *      pour compter les favoris. La vue d'ensemble commence donc par ce qui
 *      demande une action, tiré de données réelles, et se tait quand il n'y a
 *      rien ;
 *   2. LES SECTIONS SONT DES ENDROITS, PAS DES ONGLETS. Un rail à gauche,
 *      parce qu'on y revient plusieurs fois dans une même session et qu'une
 *      rangée d'onglets qui déborde se relit à chaque fois.
 */

type Section = "overview" | "users" | "support" | "positions" | "comms" | "operations";

const SECTIONS: { id: Section; label: string; icon: typeof LayoutGrid }[] = [
  { id: "overview", label: "Vue d'ensemble", icon: LayoutGrid },
  { id: "users", label: "Comptes", icon: UsersIcon },
  { id: "support", label: "Support", icon: LifeBuoy },
  { id: "positions", label: "Positions", icon: Activity },
  { id: "comms", label: "Communication", icon: Megaphone },
  { id: "operations", label: "Exploitation", icon: BookOpen },
];

export default function AdminPage() {
  const router = useRouter();
  const [animOn] = useAnimationsEnabled();
  const { settings, eurUsd } = useSettings();

  const [autorise, setAutorise] = useState<boolean | null>(null);
  const [section, setSection] = useState<Section>("overview");
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [reglages, setReglages] = useState<Record<string, string>>({});

  const money = useCallback(
    (v: number) =>
      convertCurrency(v, "EUR", settings.currency, eurUsd).toLocaleString("fr-FR", {
        style: "currency",
        currency: settings.currency,
        maximumFractionDigits: 2,
      }),
    [settings.currency, eurUsd]
  );

  const chargerReglages = useCallback(async () => {
    try {
      const d = await adminAPI.getSettings();
      const m: Record<string, string> = {};
      for (const s of d.settings || []) m[s.key] = s.value;
      setReglages(m);
    } catch { /* on garde ce qu'on a */ }
  }, []);

  useEffect(() => {
    adminAPI.checkAdmin()
      .then((r) => {
        setAutorise(r.is_admin);
        // Un non-administrateur n'a rien à voir ici, pas même l'ossature de
        // l'écran : on le renvoie plutôt que de lui montrer des panneaux vides.
        if (!r.is_admin) router.replace("/dashboard");
      })
      .catch(() => { setAutorise(false); router.replace("/dashboard"); });
  }, [router]);

  useEffect(() => {
    if (!autorise) return;
    adminAPI.getDashboard().then(setDashboard).catch(() => setDashboard(null));
    chargerReglages();
  }, [autorise, chargerReglages]);

  const poserReglage = useCallback(async (cle: string, valeur: string) => {
    await adminAPI.updateSetting(cle, valeur);
    // On relit plutôt que de supposer : un réglage refusé côté serveur
    // laisserait sinon l'écran afficher un état qui n'existe pas.
    await chargerReglages();
  }, [chargerReglages]);

  const enAttente = dashboard?.stats.tickets?.awaiting_response ?? 0;

  const contenu = useMemo(() => {
    switch (section) {
      case "overview":
        return <Overview dashboard={dashboard} reglages={reglages} onGo={(s) => setSection(s as Section)} />;
      case "users":
        return <Users money={money} />;
      case "support":
        return (
          <div className="space-y-8">
            <Tickets />
            <AssetRequests />
          </div>
        );
      case "positions":
        return <Positions money={money} />;
      case "comms":
        return <Comms />;
      case "operations":
        return <Operations reglages={reglages} onReglage={poserReglage} />;
      default:
        return <EmptyState title="Section inconnue" description="" />;
    }
  }, [section, dashboard, reglages, money, poserReglage]);

  if (autorise === null) return <CloudCurtain active label="Vérification des droits" />;
  if (!autorise) return null;

  return (
    <>
      <WeatherBackdrop condition="fair" enabled={animOn} />

      <div className="relative space-y-7">
        <header className="pt-2">
          <Heading level={1}>Administration</Heading>
          <Text className="mt-2.5 max-w-[38rem]">
            {dashboard?.admin_email ? `Connecté en tant que ${dashboard.admin_email}.` : ""}
          </Text>
        </header>

        <div className="flex flex-col gap-7 lg:flex-row">
          {/* Le rail. Horizontal et déroulant sur mobile, vertical dès qu'il y
              a de la place : on revient plusieurs fois à la même section dans
              une session, une rangée d'onglets qui déborde se relit à chaque
              fois. */}
          <nav
            aria-label="Sections"
            className="-mx-1 flex gap-1 overflow-x-auto pb-1 no-scrollbar lg:mx-0 lg:w-[13.5rem] lg:shrink-0 lg:flex-col lg:overflow-visible lg:pb-0"
          >
            {SECTIONS.map((s) => {
              const actif = section === s.id;
              const Icone = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  aria-current={actif ? "page" : undefined}
                  className="flex shrink-0 items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[0.9rem] transition-colors lg:w-full"
                  style={{
                    backgroundColor: actif ? "var(--cap-surface)" : "transparent",
                    color: actif ? "var(--cap-ink)" : "var(--cap-ink-2)",
                    boxShadow: actif ? "inset 0 0 0 1px var(--cap-line)" : "none",
                  }}
                >
                  <Icone className="h-4 w-4 shrink-0"
                         style={{ color: actif ? "var(--cap-ocean)" : "var(--cap-ink-3)" }} />
                  <span className="whitespace-nowrap">{s.label}</span>
                  {/* Le compteur des tickets sans réponse suit l'onglet :
                      c'est la seule section dont l'urgence se mesure. */}
                  {s.id === "support" && enAttente > 0 && (
                    <span
                      className="cap-num ml-auto grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[0.66rem] font-semibold"
                      style={{ backgroundColor: "var(--cap-down)", color: "#fff" }}
                    >
                      {enAttente}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={section}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: DUR.quick, ease: EASE }}
              >
                {contenu}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
