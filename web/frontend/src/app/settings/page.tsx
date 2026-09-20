"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Loader2, LogOut, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import {
  useSettings, type AccentColor, type Currency, type RecapFrequency,
} from "@/lib/SettingsContext";
import { TRADING_STYLES, TRADING_STYLE_IDS, type TradingStyleId } from "@/lib/tradingStyle";
import { accountAPI, alertsAPI, type PriceAlert } from "@/lib/api";
import type { TradingLevel } from "@/lib/auth";
import {
  Button, CloudCurtain, EmptyState, Field, FormError, Heading, Modal, Num,
  Panel, SegmentedControl, Text, TextInput, WeatherBackdrop, useAnimationsEnabled,
} from "@/components/design-system";
import { Choice, Toggle, type Option } from "@/components/settings/Choice";
import { useCapTheme, type CapTheme } from "@/lib/capTheme";
import { useProfile } from "@/lib/useProfile";
import { GOALS, MARKETS, TIMES } from "@/lib/profileQuestions";

/**
 * Les paramètres — cinq sections, et chaque réglage dit ce qu'il change.
 *
 * L'ancien écran faisait 944 lignes réparties en cinq onglets, sombre, et
 * affichait des choix muets : « Modéré », « Agressif », « Très agressif », sans
 * dire ce que le mot déclenchait. Un réglage dont on ne voit pas l'effet n'est
 * pas un réglage — l'utilisateur clique, ne constate rien, et n'y revient pas.
 *
 * Deux règles ici, et elles s'appliquent à chaque ligne de l'écran :
 *
 *   1. chaque option porte une conséquence réelle, vérifiable dans le code.
 *      Le style de trading change l'horizon du graphique, la distance du stop
 *      et le poids des fondamentaux ; le niveau réordonne le Parcours et règle
 *      le détail par défaut de l'Analyse et des Marchés. Ce sont ces
 *      phrases-là qui sont écrites, pas des adjectifs ;
 *   2. rien n'affiche « enregistré » avant que le serveur l'ait confirmé.
 *      saveSettings écrit de façon optimiste PUIS réconcilie, et rejette en
 *      cas d'échec ; l'écran attend donc la promesse au lieu de la lancer.
 *
 * Le thème et la couleur d'accent restent proposés parce que huit écrans ne
 * sont pas encore reconstruits et les lisent vraiment. C'est dit à l'endroit
 * où ils sont proposés, plutôt que de laisser croire qu'ils agissent partout.
 */

type Section = "profil" | "experience" | "trading" | "notifications" | "apparence";

const SECTIONS: { value: Section; label: string }[] = [
  { value: "profil", label: "Mon profil" },
  { value: "experience", label: "Mon expérience" },
  { value: "trading", label: "Trading" },
  { value: "notifications", label: "Notifications" },
  { value: "apparence", label: "Apparence" },
];

export default function SettingsPage() {
  return (
    <Suspense fallback={<CloudCurtain active label="Chargement des paramètres" />}>
      <SettingsScreen />
    </Suspense>
  );
}

function SettingsScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const [animOn] = useAnimationsEnabled();

  const raw = params.get("section");
  const section: Section =
    SECTIONS.some((s) => s.value === raw) ? (raw as Section) : "profil";

  const go = (s: Section) => router.replace(`/settings?section=${s}`, { scroll: false });

  return (
    <>
      <WeatherBackdrop condition="cloudy" enabled={animOn} />

      <div className="relative space-y-6">
        <header className="pt-2">
          <Heading level={1}>Paramètres</Heading>
          <Text className="mt-2.5 max-w-[36rem]">
            Chaque réglage indique ce qu&apos;il change. Tout est enregistré sur
            votre compte et vous suit d&apos;un appareil à l&apos;autre.
          </Text>
        </header>

        {/* Un seul contrôle de navigation, qui défile horizontalement sur
            mobile plutôt que de se replier en menu déroulant : cinq entrées
            visibles valent mieux qu'une liste cachée derrière un clic. */}
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <SegmentedControl
            size="sm"
            options={SECTIONS}
            value={section}
            onChange={go}
            aria-label="Section des paramètres"
          />
        </div>

        {section === "profil" && <ProfileSection />}
        {section === "experience" && <ExperienceSection />}
        {section === "trading" && <TradingSection />}
        {section === "notifications" && <NotificationsSection />}
        {section === "apparence" && <AppearanceSection />}
      </div>
    </>
  );
}

/* ── Mon profil ─────────────────────────────────────────────────────────── */

function ProfileSection() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();

  const [name, setName] = useState(user?.first_name || user?.username || "");
  const [savingName, setSavingName] = useState(false);
  const [nameDone, setNameDone] = useState(false);
  const [nameError, setNameError] = useState("");

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdDone, setPwdDone] = useState(false);
  const [pwdError, setPwdError] = useState("");

  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setNameError("Le nom ne peut pas être vide."); return; }
    setNameError("");
    setSavingName(true);
    try {
      await accountAPI.updateProfile(trimmed);
      await refreshUser();
      setNameDone(true);
      setTimeout(() => setNameDone(false), 2500);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) { setPwdError("Le nouveau mot de passe doit faire au moins 8 caractères."); return; }
    setPwdError("");
    setSavingPwd(true);
    try {
      await accountAPI.changePassword(current, next);
      setCurrent("");
      setNext("");
      setPwdDone(true);
      setTimeout(() => setPwdDone(false), 3500);
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : "Changement impossible.");
    } finally {
      setSavingPwd(false);
    }
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const data = await accountAPI.exportData();
      // Téléchargement côté client : les données ne repassent par aucun
      // service tiers, ce qui est le minimum pour un export RGPD.
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `captentdb-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* le bouton reprend son état, rien n'est affirmé */
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Panel title="Identité" hint="Le nom qui apparaît dans la communauté et sur votre profil.">
        <form onSubmit={saveName} className="space-y-4" noValidate>
          {nameError && <FormError>{nameError}</FormError>}
          <Field label="Nom affiché" htmlFor="set-name">
            <TextInput id="set-name" value={name} onChange={setName} invalid={!!nameError} />
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit" size="md" disabled={savingName}>
              {savingName ? "Enregistrement…" : "Enregistrer"}
            </Button>
            {nameDone && <Text size="caption" as="span" tone="up">Enregistré.</Text>}
          </div>
        </form>

        <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--cap-line)" }}>
          <Text size="caption">Adresse e-mail</Text>
          <Text size="small" className="mt-1">
            {user?.email || "—"}
            {user?.email_verified === false && " · non vérifiée"}
          </Text>
          <Text size="caption" className="mt-2">
            L&apos;adresse sert à vous connecter et ne peut pas être changée ici.
          </Text>
        </div>
      </Panel>

      <Panel title="Mot de passe" hint="Huit caractères minimum.">
        <form onSubmit={savePassword} className="space-y-4" noValidate>
          {pwdError && <FormError>{pwdError}</FormError>}
          <Field label="Mot de passe actuel" htmlFor="set-pwd-cur">
            <TextInput id="set-pwd-cur" type="password" value={current} onChange={setCurrent} required />
          </Field>
          <Field label="Nouveau mot de passe" htmlFor="set-pwd-new">
            <TextInput id="set-pwd-new" type="password" value={next} onChange={setNext} required />
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit" size="md" disabled={savingPwd || !current || !next}>
              {savingPwd ? "Changement…" : "Changer le mot de passe"}
            </Button>
            {pwdDone && <Text size="caption" as="span" tone="up">Mot de passe changé.</Text>}
          </div>
        </form>
      </Panel>

      <Panel
        title="Vos données"
        hint="Tout ce que le site détient sur vous, et comment le récupérer ou l'effacer."
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="block text-[0.93rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                Exporter mes données
              </span>
              <Text size="caption" className="mt-1">
                Un fichier JSON : compte, positions, journal, favoris, progression.
              </Text>
            </div>
            <Button variant="secondary" size="md" onClick={exportData} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exporting ? "Préparation…" : "Télécharger"}
            </Button>
          </div>

          <div
            className="flex flex-wrap items-center justify-between gap-4 border-t pt-5"
            style={{ borderColor: "var(--cap-line)" }}
          >
            <div className="min-w-0">
              <span className="block text-[0.93rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                Se déconnecter
              </span>
              <Text size="caption" className="mt-1">Sur cet appareil uniquement.</Text>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={async () => { await logout(); router.push("/login"); }}
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </Button>
          </div>

          <div
            className="flex flex-wrap items-center justify-between gap-4 border-t pt-5"
            style={{ borderColor: "var(--cap-line)" }}
          >
            <div className="min-w-0">
              <span className="block text-[0.93rem] font-medium" style={{ color: "var(--cap-down)" }}>
                Supprimer mon compte
              </span>
              <Text size="caption" className="mt-1">
                Définitif. Positions, journal, progression et favoris sont effacés.
              </Text>
            </div>
            <Button variant="secondary" size="md" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </div>
      </Panel>

      <DeleteAccountModal open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </>
  );
}

function DeleteAccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Le serveur attend ce mot exact. Il est affiché, pas deviné : une
  // confirmation qu'on ne sait pas formuler n'est pas une sécurité, c'est une
  // devinette.
  const WORD = "SUPPRIMER";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await accountAPI.deleteAccount(password, confirm);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Supprimer le compte">
      <Heading level={3}>Supprimer votre compte</Heading>
      <Text size="small" className="mt-2">
        Cette action est définitive et ne peut pas être annulée. Si vous voulez
        seulement garder une trace, exportez vos données avant.
      </Text>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        {error && <FormError>{error}</FormError>}
        <Field label="Votre mot de passe" htmlFor="del-pwd">
          <TextInput id="del-pwd" type="password" value={password} onChange={setPassword} required />
        </Field>
        <Field label={`Tapez ${WORD} pour confirmer`} htmlFor="del-confirm">
          <TextInput id="del-confirm" value={confirm} onChange={setConfirm} placeholder={WORD} required />
        </Field>
        <div className="flex gap-2">
          <Button
            type="submit"
            size="md"
            disabled={busy || confirm !== WORD || !password}
            className="flex-1"
          >
            {busy ? "Suppression…" : "Supprimer définitivement"}
          </Button>
          <Button variant="secondary" size="md" onClick={onClose}>Annuler</Button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Mon expérience ─────────────────────────────────────────────────────── */

const LEVELS: Option<TradingLevel>[] = [
  {
    value: "beginner",
    label: "Je débute",
    detail: "Chaque chiffre vient avec une phrase qui l'explique. L'Analyse s'ouvre sur le verdict, pas sur les indicateurs. Le Parcours commence par les fondations.",
  },
  {
    value: "intermediate",
    label: "Je m'y connais un peu",
    detail: "Les facteurs derrière le verdict sont affichés d'emblée, les Marchés montrent les mouvements du jour et le tri par variation.",
  },
  {
    value: "expert",
    label: "Je trade déjà",
    detail: "Indicateurs bruts et edge historique dépliés par défaut, volume et fréquence d'actualisation accessibles, aucune infobulle.",
  },
];

function ExperienceSection() {
  const { user, setTradingLevel } = useAuth();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Sans niveau déclaré, le site se comporte comme pour un débutant. L'écran
  // le dit plutôt que de laisser une sélection vide qui ne correspond à rien.
  const level = user?.trading_level ?? null;

  const choose = async (v: TradingLevel) => {
    setError("");
    setBusy(true);
    try {
      await setTradingLevel(v);
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } catch {
      setError("Impossible d'enregistrer. Réessayez dans un instant.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <Panel
      title="Votre niveau"
      hint="Il règle la quantité d'information affichée — jamais sa véracité. Tous les niveaux voient les mêmes chiffres."
      aside={done ? <Text size="caption" as="span" tone="up">Enregistré.</Text> : undefined}
    >
      {error && <div className="mb-4"><FormError>{error}</FormError></div>}
      {level == null && (
        <Text size="small" className="mb-4">
          Vous n&apos;avez pas encore répondu. En attendant, le site se comporte
          comme pour un débutant.
        </Text>
      )}
      <Choice
        name="Niveau"
        options={LEVELS}
        value={level ?? "beginner"}
        onChange={choose}
        disabled={busy}
      />
      <Text size="caption" className="mt-4">
        Modifiable autant de fois que vous voulez. Rien n&apos;est verrouillé :
        un débutant peut ouvrir une leçon avancée, elle est simplement rangée
        après.
      </Text>
    </Panel>

    <ProfilePanels />
    </>
  );
}

/**
 * Les trois questions du profil, exactement comme à l'inscription.
 *
 * Mêmes libellés, mêmes conséquences affichées : posées différemment ici, on
 * croirait à deux réglages distincts. Elles sont donc définies une seule fois,
 * dans lib/profileQuestions, et lues aux deux endroits.
 */
function ProfilePanels() {
  const { profile, save } = useProfile();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const patch = async (p: Parameters<typeof save>[0]) => {
    setError("");
    setBusy(true);
    try {
      await save(p);
    } catch {
      setError("Enregistrement impossible. Votre choix précédent est conservé.");
    } finally {
      setBusy(false);
    }
  };

  const toggleMarket = (v: string) => {
    const next = profile.markets.includes(v)
      ? profile.markets.filter((x) => x !== v)
      : [...profile.markets, v];
    patch({ markets: next });
  };

  return (
    <>
      {error && <FormError>{error}</FormError>}

      <Panel
        title="Ce qui vous amène"
        hint="Décide de ce que votre accueil met en avant."
      >
        <Choice
          name="Objectif"
          options={GOALS.map((g) => ({ value: g.value, label: g.label, detail: g.effect }))}
          value={profile.goal ?? ""}
          onChange={(v) => patch({ goal: v })}
          disabled={busy}
        />
      </Panel>

      <Panel
        title="Ce que vous suivez"
        hint="Plusieurs réponses. Le premier de la liste est la place que l'écran Marchés ouvre par défaut."
      >
        <div className="space-y-2">
          {MARKETS.map((m) => {
            const rank = profile.markets.indexOf(m.value) + 1;
            return (
              <button
                key={m.value}
                onClick={() => toggleMarket(m.value)}
                disabled={busy}
                aria-pressed={rank > 0}
                className="flex w-full items-center justify-between gap-3 rounded-[12px] p-3.5 text-left transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: rank > 0 ? "var(--cap-surface-2)" : "transparent",
                  boxShadow: rank > 0
                    ? "inset 0 0 0 1px var(--cap-ocean)"
                    : "inset 0 0 0 1px var(--cap-line)",
                }}
              >
                <span className="min-w-0">
                  <span className="block text-[0.93rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                    {m.label}
                  </span>
                  <span className="mt-0.5 block text-[0.8rem]" style={{ color: "var(--cap-ink-3)" }}>
                    {m.effect}
                  </span>
                </span>
                {rank > 0 && (
                  <span
                    className="cap-num shrink-0 rounded-full px-2 py-0.5 text-[0.72rem]"
                    style={{ backgroundColor: "var(--cap-ocean)", color: "var(--cap-on-inverse)" }}
                  >
                    {rank}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <Text size="caption" className="mt-4">
          {profile.markets.length === 0
            ? "Sans réponse, les Marchés ouvrent sur la première place de la liste."
            : `Les Marchés ouvriront sur ${MARKETS.find((m) => m.value === profile.markets[0])?.label}.`}
        </Text>
      </Panel>

      <Panel
        title="Le temps dont vous disposez"
        hint="Règle le rythme proposé par le Parcours. Aucune obligation, aucun rappel."
      >
        <Choice
          name="Rythme"
          options={TIMES.map((t) => ({ value: t.value, label: t.label, detail: t.effect }))}
          value={profile.weekly_time ?? ""}
          onChange={(v) => patch({ weekly_time: v })}
          disabled={busy}
        />
      </Panel>
    </>
  );
}

/* ── Trading ────────────────────────────────────────────────────────────── */

const RISKS: Option<string>[] = [
  { value: "conservative", label: "Prudent", detail: "Tailles de position réduites, stops serrés. Les suggestions privilégient la préservation du capital." },
  { value: "moderate", label: "Modéré", detail: "L'équilibre par défaut entre risque pris et objectif visé." },
  { value: "aggressive", label: "Agressif", detail: "Positions plus larges, objectifs plus lointains, pertes potentielles plus grandes." },
  { value: "very_aggressive", label: "Très agressif", detail: "Le risque maximal que le simulateur autorise. À réserver au papier." },
];

/** Un nombre écrit à la française : 1.5 → « 1,5 », 1 → « 1 ». */
const fr = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

function TradingSection() {
  const { settings, saveSettings, isLoaded } = useSettings();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState("");

  const save = useCallback(
    async (patch: Parameters<typeof saveSettings>[0], what: string) => {
      setError("");
      setBusy(true);
      try {
        // On attend la promesse. saveSettings écrit de façon optimiste puis
        // réconcilie et REJETTE en cas d'échec : afficher « enregistré » sans
        // l'attendre serait afficher un succès qu'on n'a pas constaté.
        await saveSettings(patch);
        setDone(what);
        setTimeout(() => setDone(null), 2500);
      } catch {
        setError("Enregistrement impossible. Votre choix précédent est conservé.");
      } finally {
        setBusy(false);
      }
    },
    [saveSettings]
  );

  if (!isLoaded) return <Panel><Text size="small">Chargement…</Text></Panel>;

  const styleOptions: Option<TradingStyleId>[] = TRADING_STYLE_IDS.map((id) => {
    const s = TRADING_STYLES[id];
    return {
      value: id,
      label: s.label.fr,
      // Tiré du profil lui-même, donc toujours exact : ce sont les valeurs que
      // l'Analyse utilise réellement pour le graphique et le plan.
      // Virgule décimale : ces valeurs viennent de nombres JavaScript, qui
      // s'écrivent « 0.6 » une fois interpolés. Dans une phrase française,
      // c'est 0,6.
      detail: `${s.horizon.fr} · graphique en ${s.defaultTimeframe} · stop à ${fr(s.atr.sl)}× l'ATR, objectif à ${fr(s.atr.tp)}×${
        s.fundWeight > 0 ? ` · fondamentaux ${Math.round(s.fundWeight * 100)} % du score` : " · fondamentaux ignorés"
      }`,
    };
  });

  return (
    <>
      {error && <FormError>{error}</FormError>}

      <Panel
        title="Votre horizon"
        hint="Il change le graphique de l'Analyse, la distance du stop et de l'objectif, et le poids des fondamentaux dans le score."
        aside={done === "style" ? <Text size="caption" as="span" tone="up">Enregistré.</Text> : undefined}
      >
        <Choice
          name="Style de trading"
          options={styleOptions}
          value={settings.tradingStyle as TradingStyleId}
          onChange={(v) => save({ tradingStyle: v }, "style")}
          disabled={busy}
        />
      </Panel>

      <Panel
        title="Votre appétit pour le risque"
        hint="Utilisé par les calculateurs et par la taille de position suggérée."
        aside={done === "risk" ? <Text size="caption" as="span" tone="up">Enregistré.</Text> : undefined}
      >
        <Choice
          name="Niveau de risque"
          options={RISKS}
          value={settings.riskLevel}
          onChange={(v) => save({ riskLevel: v }, "risk")}
          disabled={busy}
        />
      </Panel>

      <Panel
        title="Levier par défaut"
        hint="Proposé à l'ouverture d'une position. Modifiable à chaque trade."
        aside={done === "lev" ? <Text size="caption" as="span" tone="up">Enregistré.</Text> : undefined}
      >
        <div className="flex flex-wrap items-center gap-4">
          <SegmentedControl
            size="md"
            options={["1", "2", "5", "10"].map((l) => ({ value: l, label: `×${l}` }))}
            value={settings.defaultLeverage}
            onChange={(v) => save({ defaultLeverage: v }, "lev")}
            aria-label="Levier par défaut"
          />
          <Text size="caption" as="span">
            {settings.defaultLeverage === "1"
              ? "Sans levier : vous ne pouvez pas perdre plus que la somme engagée."
              : `Un mouvement de 1 % devient ${settings.defaultLeverage} % — dans les deux sens.`}
          </Text>
        </div>
      </Panel>
    </>
  );
}

/* ── Notifications ──────────────────────────────────────────────────────── */

const RECAPS: Option<RecapFrequency>[] = [
  { value: "always", label: "À chaque visite", detail: "Ce qui a bougé depuis la dernière fois, dès l'ouverture de l'accueil." },
  { value: "daily", label: "Une fois par jour", detail: "Le récapitulatif n'apparaît qu'à la première visite de la journée." },
  { value: "weekly", label: "Une fois par semaine", detail: "Un point hebdomadaire, rien entre-temps." },
  { value: "off", label: "Jamais", detail: "Aucun récapitulatif. L'accueil s'ouvre directement sur vos données." },
];

function NotificationsSection() {
  const { settings, saveSettings, isLoaded } = useSettings();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (patch: Parameters<typeof saveSettings>[0]) => {
    setError("");
    setBusy(true);
    try {
      await saveSettings(patch);
    } catch {
      setError("Enregistrement impossible. Votre choix précédent est conservé.");
    } finally {
      setBusy(false);
    }
  };

  if (!isLoaded) return <Panel><Text size="small">Chargement…</Text></Panel>;

  return (
    <>
      {error && <FormError>{error}</FormError>}

      <Panel title="Alertes de prix">
        <Toggle
          label="M'avertir quand une alerte se déclenche"
          detail="Une notification dans le site dès qu'un actif franchit le seuil que vous avez posé. Aucun e-mail, aucune notification système."
          checked={settings.priceAlertsEnabled}
          onChange={(v) => save({ priceAlertsEnabled: v })}
          disabled={busy}
        />
      </Panel>

      <Panel
        title="Récapitulatif de retour"
        hint="Le résumé de ce qui a bougé pendant votre absence."
      >
        <Choice
          name="Fréquence du récapitulatif"
          options={RECAPS}
          value={settings.recapFrequency}
          onChange={(v) => save({ recapFrequency: v })}
          disabled={busy}
        />
      </Panel>

      <ActiveAlerts />
    </>
  );
}

function ActiveAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[] | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);

  useEffect(() => {
    alertsAPI.list()
      .then((d) => setAlerts(d.alerts || []))
      .catch(() => setAlerts([]));
  }, []);

  const remove = async (id: number) => {
    setRemoving(id);
    const before = alerts;
    setAlerts((a) => (a || []).filter((x) => x.id !== id));
    try {
      await alertsAPI.remove(id);
    } catch {
      setAlerts(before);
    } finally {
      setRemoving(null);
    }
  };

  const active = (alerts || []).filter((a) => a.status === "active");

  return (
    <Panel
      title="Vos alertes"
      hint={active.length > 0 ? "Elles sont vérifiées pendant que le site est ouvert." : undefined}
    >
      {alerts === null ? (
        <Text size="small">Chargement…</Text>
      ) : active.length === 0 ? (
        <EmptyState
          title="Aucune alerte posée"
          description="Depuis l'analyse d'un actif, vous pouvez demander à être prévenu quand il franchit un prix."
        />
      ) : (
        <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
          {active.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-4 py-3.5">
              <div className="min-w-0">
                <span className="block text-[0.93rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                  {a.symbol}
                </span>
                <Text size="caption" className="mt-0.5">
                  {a.direction === "above" ? "Au-dessus de" : "En dessous de"}{" "}
                  <Num className="text-[0.78rem]">{a.target}</Num>
                  {a.note ? ` · ${a.note}` : ""}
                </Text>
              </div>
              <button
                onClick={() => remove(a.id)}
                disabled={removing === a.id}
                aria-label={`Supprimer l'alerte sur ${a.symbol}`}
                className="shrink-0 rounded-[9px] p-2 transition-colors hover:bg-[color:var(--cap-surface-2)] disabled:opacity-40"
                style={{ color: "var(--cap-ink-4)" }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ── Apparence ──────────────────────────────────────────────────────────── */

const ACCENT_LABEL: Record<AccentColor, string> = {
  blue: "Or",
  purple: "Ambre",
  teal: "Jade",
  orange: "Cyan",
  pink: "Magenta",
};

function AppearanceSection() {
  const { settings, saveSettings, isLoaded } = useSettings();
  const [animOn, setAnimOn] = useAnimationsEnabled();
  const { theme: capTheme, resolved, setTheme: setCapTheme } = useCapTheme();
  const [error, setError] = useState("");

  const save = async (patch: Parameters<typeof saveSettings>[0]) => {
    setError("");
    try {
      await saveSettings(patch);
    } catch {
      setError("Enregistrement impossible. Votre choix précédent est conservé.");
    }
  };

  if (!isLoaded) return <Panel><Text size="small">Chargement…</Text></Panel>;

  return (
    <>
      {error && <FormError>{error}</FormError>}

      <Panel
        title="Devise d'affichage"
        hint="Les cours sont convertis au taux du jour. Les indices et les paires de devises restent en valeur nue."
      >
        <SegmentedControl
          size="md"
          options={[
            { value: "EUR", label: "€ Euro" },
            { value: "USD", label: "$ Dollar" },
          ]}
          value={settings.currency}
          onChange={(v) => save({ currency: v as Currency })}
          aria-label="Devise"
        />
      </Panel>

      <Panel
        title="Clair ou sombre"
        hint="Tout le site suit ce réglage. Le mode sombre reprend exactement la même interface, sous un ciel d'avant-orage."
      >
        <SegmentedControl
          size="md"
          options={[
            { value: "light", label: "Clair" },
            { value: "dark", label: "Sombre" },
            { value: "system", label: "Système" },
          ]}
          value={capTheme}
          onChange={(v) => setCapTheme(v as CapTheme)}
          aria-label="Mode d'affichage"
        />
        <Text size="caption" className="mt-4">
          {capTheme === "system"
            ? `Suit le réglage de votre appareil — actuellement ${resolved === "dark" ? "sombre" : "clair"}. Il basculera tout seul si votre système le fait.`
            : "S'applique à l'ensemble du site, y compris aux écrans pas encore reconstruits."}
        </Text>
      </Panel>

      <Panel title="Animations" hint="Le ciel de fond et les transitions entre écrans.">
        <Toggle
          label="Afficher le ciel animé"
          detail="Des nuages traversent l'arrière-plan et la météo suit l'état du marché. Coupez-les si vous préférez une surface calme — l'information reste lisible sans."
          checked={animOn}
          onChange={setAnimOn}
        />
        <Text size="caption" className="mt-4">
          Ce réglage est propre à ce navigateur. Les animations sont de toute
          façon désactivées si votre système demande de réduire le mouvement.
        </Text>
      </Panel>

      {/* La couleur d'accent, et elle seule. Le thème clair/sombre était
          proposé ici une seconde fois, avec les mêmes mots que le contrôle
          ci-dessus : actionner l'un laissait l'autre moitié du site
          inchangée, ce qui se lit comme une bascule cassée. Les deux sont
          désormais pilotés par le seul réglage du haut. */}
      <Panel
        title="Couleur d'accent"
        hint="Ne s'applique qu'aux écrans qui n'ont pas encore reçu la nouvelle interface — Scanner, Outils, Premium et les pages d'administration."
      >
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ACCENT_LABEL) as AccentColor[]).map((c) => (
            <button
              key={c}
              onClick={() => save({ accentColor: c })}
              aria-pressed={settings.accentColor === c}
              className="rounded-[10px] px-3.5 py-2 text-[0.85rem] transition-colors"
              style={{
                color: "var(--cap-ink)",
                backgroundColor:
                  settings.accentColor === c ? "var(--cap-surface-2)" : "transparent",
                boxShadow:
                  settings.accentColor === c
                    ? "inset 0 0 0 1px var(--cap-ocean)"
                    : "inset 0 0 0 1px var(--cap-line)",
              }}
            >
              {ACCENT_LABEL[c]}
            </button>
          ))}
        </div>
      </Panel>
    </>
  );
}
