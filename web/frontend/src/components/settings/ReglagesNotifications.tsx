"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, FormError, Panel, Text } from "@/components/design-system";
import { notificationsAPI, pushAPI, type AppareilPush, type PreferencesNotif } from "@/lib/api";
import { etatPush, type EtatPush } from "@/lib/push";

/** Un appareil vient d'être abonné ou désabonné (NotificationsAppareil). */
export const EVT_PUSH = "tdb:push-change";

/**
 * Ce que l'on reçoit, et où : le contrôle des notifications.
 *
 * Une ligne par sorte de notification, deux interrupteurs : dans le site (la
 * cloche) et sur vos appareils (la notification du téléphone ou de
 * l'ordinateur, même site fermé). Les deux sont indépendants : on peut
 * vouloir lire les annonces économiques dans le site sans que le téléphone
 * vibre pour elles. Chaque changement s'enregistre aussitôt, et le serveur
 * l'applique à la notification suivante (services/notifications.py).
 */
export function PreferencesNotifications() {
  const [prefs, setPrefs] = useState<PreferencesNotif | null>(null);
  const [erreur, setErreur] = useState("");
  const [enregistre, setEnregistre] = useState(false);
  const [appareil, setAppareil] = useState<EtatPush | null>(null);

  useEffect(() => {
    notificationsAPI.preferences().then(setPrefs).catch(() => setErreur("Vos choix n'ont pas pu être chargés. Rechargez la page."));
    const lire = () => etatPush().then(setAppareil).catch(() => setAppareil("indisponible"));
    lire();
    window.addEventListener(EVT_PUSH, lire);
    return () => window.removeEventListener(EVT_PUSH, lire);
  }, []);

  const enregistrer = useCallback(async (suivant: PreferencesNotif, avant: PreferencesNotif) => {
    setPrefs(suivant);
    setErreur("");
    setEnregistre(false);
    try {
      setPrefs(await notificationsAPI.enregistrer(suivant));
      setEnregistre(true);
    } catch {
      setPrefs(avant);
      setErreur("Enregistrement impossible. Votre choix précédent est conservé.");
    }
  }, []);

  if (!prefs) {
    return <Panel title="Ce que vous recevez">{erreur ? <FormError>{erreur}</FormError> : <Text size="small">Chargement…</Text>}</Panel>;
  }

  const changer = (id: string, canal: "site" | "appareil", v: boolean) =>
    enregistrer({ ...prefs, categories: prefs.categories.map((c) => (c.id === id ? { ...c, [canal]: v } : c)) }, prefs);
  const toutCouper = () =>
    enregistrer({ ...prefs, categories: prefs.categories.map((c) => ({ ...c, appareil: false })) }, prefs);
  const appareilsMuets = prefs.categories.every((c) => !c.appareil);

  return (
    <>
    <Panel
      title="Ce que vous recevez"
      hint="Dans le site : la cloche, en haut de l'écran. Sur vos appareils : une notification sur le téléphone ou l'ordinateur, même site fermé."
    >
      {erreur && <div className="mb-4"><FormError>{erreur}</FormError></div>}
      {appareil && appareil !== "actif" && appareil !== "non_configure" && (
        <Text size="caption" className="mb-4">
          Cet appareil ne reçoit pas encore de notifications : activez-les plus haut pour que la colonne
          « Sur vos appareils » s&apos;applique ici.
        </Text>
      )}

      <div className="hidden grid-cols-[minmax(0,1fr)_7rem_7rem] items-end gap-x-4 pb-2 sm:grid">
        <span />
        <span className="text-center text-[0.8rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>Dans le site</span>
        <span className="text-center text-[0.8rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>Sur vos appareils</span>
      </div>

      <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
        {prefs.categories.map((c) => (
          <li key={c.id} className="grid gap-x-4 gap-y-3 py-3.5 sm:grid-cols-[minmax(0,1fr)_7rem_7rem] sm:items-center">
            <div className="min-w-0">
              <span className="block text-[0.93rem] font-medium" style={{ color: "var(--cap-ink)" }}>{c.label}</span>
              <Text size="caption" className="mt-0.5">{c.detail}</Text>
            </div>
            <div className="flex gap-6 sm:contents">
              <Interrupteur
                legende="Dans le site"
                label={`${c.label}, dans le site`}
                checked={c.site}
                disabled={c.site_verrouille}
                onChange={(v) => changer(c.id, "site", v)}
              />
              <Interrupteur
                legende="Sur vos appareils"
                label={`${c.label}, sur vos appareils`}
                checked={c.appareil}
                onChange={(v) => changer(c.id, "appareil", v)}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Text size="caption" as="span" aria-live="polite">{enregistre ? "Enregistré : la prochaine notification suit ces choix." : ""}</Text>
        {!appareilsMuets && (
          <button type="button" onClick={toutCouper} className="cap-lien text-[0.86rem]">
            Couper toutes les notifications sur mes appareils
          </button>
        )}
      </div>
    </Panel>
    <HeuresCalmes calme={prefs.calme} onChange={(calme) => enregistrer({ ...prefs, calme }, prefs)} />
    </>
  );
}

const HEURES = Array.from({ length: 24 }, (_, h) => h);

/** Les heures calmes : les appareils se taisent, la cloche garde tout. */
function HeuresCalmes({ calme, onChange }: { calme: PreferencesNotif["calme"]; onChange: (c: PreferencesNotif["calme"]) => void }) {
  const enregistrer = onChange;
  const champ = {
    backgroundColor: "var(--cap-surface)", color: "var(--cap-ink)", boxShadow: "inset 0 0 0 1px var(--cap-line-strong)",
  };

  return (
    <Panel title="Heures calmes" hint="Pendant ces heures, rien ne sonne sur vos appareils. Les notifications vous attendent dans le site.">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-[0.93rem]" style={{ color: "var(--cap-ink)" }}>
          <span>De</span>
          <select aria-label="Début des heures calmes" value={calme.debut} disabled={!calme.actif}
            onChange={(e) => enregistrer({ ...calme, debut: Number(e.target.value) })}
            className="h-10 rounded-[10px] px-2.5 text-[0.93rem] disabled:opacity-50" style={champ}>
            {HEURES.map((h) => <option key={h} value={h}>{h} h</option>)}
          </select>
          <span>à</span>
          <select aria-label="Fin des heures calmes" value={calme.fin} disabled={!calme.actif}
            onChange={(e) => enregistrer({ ...calme, fin: Number(e.target.value) })}
            className="h-10 rounded-[10px] px-2.5 text-[0.93rem] disabled:opacity-50" style={champ}>
            {HEURES.map((h) => <option key={h} value={h}>{h} h</option>)}
          </select>
          <span style={{ color: "var(--cap-ink-3)" }}>(heure de Paris)</span>
        </div>
        <Interrupteur legende="Heures calmes actives" label="Activer les heures calmes" checked={calme.actif}
          onChange={(v) => enregistrer({ ...calme, actif: v })} />
      </div>
    </Panel>
  );
}

function quand(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    + (Date.now() - d.getTime() < 86_400_000 ? ` à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "");
}

/**
 * Les appareils qui reçoivent les notifications de ce compte. Un téléphone
 * perdu, vendu ou prêté se retire d'ici, sans avoir à l'avoir sous la main.
 */
export function MesAppareils() {
  const [liste, setListe] = useState<AppareilPush[] | null>(null);
  const [retrait, setRetrait] = useState<number | null>(null);

  const charger = useCallback(() => {
    pushAPI.appareils().then((d) => setListe(d.appareils || [])).catch(() => setListe([]));
  }, []);
  useEffect(() => {
    charger();
    window.addEventListener(EVT_PUSH, charger);
    return () => window.removeEventListener(EVT_PUSH, charger);
  }, [charger]);

  if (!liste || liste.length === 0) return null;

  const retirer = async (id: number) => {
    setRetrait(id);
    try { await pushAPI.retirerAppareil(id); setListe((l) => (l || []).filter((a) => a.id !== id)); }
    finally { setRetrait(null); }
  };

  return (
    <Panel title="Vos appareils" hint="Ceux qui reçoivent les notifications de ce compte. Se déconnecter d'un appareil le retire aussi.">
      <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
        {liste.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
            <div className="min-w-0">
              <span className="block text-[0.93rem] font-medium" style={{ color: "var(--cap-ink)" }}>{a.nom}</span>
              <Text size="caption" className="mt-0.5">
                Depuis le {quand(a.depuis)}.{" "}
                {a.dernier_envoi ? `Dernière notification reçue le ${quand(a.dernier_envoi)}.` : "Aucune notification reçue pour l'instant."}
                {a.echecs > 0 && ` ${a.echecs} envoi${a.echecs > 1 ? "s" : ""} refusé${a.echecs > 1 ? "s" : ""} récemment : si rien n'arrive, réactivez les notifications sur cet appareil.`}
              </Text>
            </div>
            <Button size="sm" variant="secondary" onClick={() => retirer(a.id)} disabled={retrait === a.id}>
              {retrait === a.id ? "Retrait…" : "Retirer"}
            </Button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** L'interrupteur du site, avec sa légende visible sur téléphone. */
function Interrupteur({ legende, label, checked, onChange, disabled }: {
  legende: string; label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <label className="flex min-h-[44px] items-center gap-2.5 sm:justify-center">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundColor: checked ? "var(--cap-ocean)" : "var(--cap-surface-3)" }}
      >
        <span
          className="absolute top-[3px] h-[18px] w-[18px] rounded-full transition-[left] duration-200"
          style={{ left: checked ? "calc(100% - 21px)" : "3px", backgroundColor: "var(--cap-surface)" }}
        />
      </button>
      {legende && <span className="text-[0.82rem] sm:hidden" style={{ color: "var(--cap-ink-3)" }}>{legende}</span>}
    </label>
  );
}
