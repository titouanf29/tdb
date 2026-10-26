"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import {
  adminAPI, type ActiviteCompte, type AdminUser, type AdminUserDetails,
} from "@/lib/api";
import { fr } from "@/lib/SettingsContext";
import {
  Button, Drawer, EmptyState, Field, FormError, Heading, Num, Panel, Text,
  TextInput,
} from "@/components/design-system";

/**
 * Les comptes, et ce qu'on peut leur faire.
 *
 * La liste tient en une ligne par compte parce que c'est une liste qu'on
 * PARCOURT : on y cherche quelqu'un, on ne l'étudie pas. Tout le détail — les
 * positions, le solde, l'activité — et toutes les actions vivent dans la
 * fiche, qui ne s'ouvre que sur une personne précise.
 *
 * Les actions sont irréversibles ou touchent de l'argent. Aucune n'est à un
 * seul clic : chacune demande une confirmation qui NOMME le compte et dit ce
 * qui va se passer. « Êtes-vous sûr ? » ne fait que demander de recliquer.
 */

function depuis(iso?: string | null): string {
  if (!iso) return "jamais";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const min = ms / 60000;
  if (min < 60) return `il y a ${Math.round(min)} min`;
  const h = min / 60;
  if (h < 48) return `il y a ${Math.round(h)} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

/** Vert vif = connecté aujourd'hui, pâle = cette semaine, gris = dormant. */
function pastille(last?: string | null): string {
  if (!last) return "var(--cap-ink-4)";
  const h = (Date.now() - new Date(last).getTime()) / 3600000;
  if (!Number.isFinite(h)) return "var(--cap-ink-4)";
  if (h < 24) return "var(--cap-up)";
  if (h < 24 * 7) return "var(--cap-up-soft)";
  return "var(--cap-ink-4)";
}

/** La dernière trace de vie : la dernière requête, sinon la dernière connexion. */
const vu = (u: AdminUser) => u.last_active || u.last_login;

export function Users({ money, ouvrirId }: { money: (v: number) => string; ouvrirId?: number | null }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [charge, setCharge] = useState(true);
  const [ouvert, setOuvert] = useState<AdminUser | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const charger = useCallback(async (recherche: string) => {
    setCharge(true);
    try { setRows((await adminAPI.getUsers(1, 50, recherche)).users || []); }
    catch { setRows([]); }
    finally { setCharge(false); }
  }, []);

  // Arrivé depuis une notification (« Nouvelle inscription ») : la fiche
  // du compte s'ouvre directement.
  useEffect(() => {
    if (!ouvrirId) return;
    adminAPI.getUserDetails(ouvrirId).then((d) => setOuvert(d.user)).catch(() => {});
  }, [ouvrirId]);

  useEffect(() => {
    // La recherche part après une pause : interroger à chaque touche
    // enverrait dix requêtes pour un mot de dix lettres.
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => charger(q), 350);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q, charger]);

  return (
    <>
      <Panel
        title="Comptes"
        hint="Cliquez sur un compte pour sa fiche et les actions."
        aside={<Text size="caption" as="span">{fr(rows.length, 0)} affiché{rows.length > 1 ? "s" : ""}</Text>}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: "var(--cap-ink-3)" }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Chercher par e-mail ou nom d'utilisateur…"
            className="w-full rounded-[10px] py-2.5 pl-10 pr-3.5 text-[0.9rem] outline-none"
            style={{
              backgroundColor: "var(--cap-surface-2)",
              color: "var(--cap-ink)",
            }}
          />
        </div>

        <div className="mt-5">
          {charge ? (
            <Text size="caption">Chargement…</Text>
          ) : rows.length === 0 ? (
            <EmptyState
              title={q ? "Aucun compte ne correspond" : "Aucun compte"}
              description={q ? "Essayez une autre orthographe, ou une partie de l'adresse." : ""}
            />
          ) : (
            <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
              {rows.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => setOuvert(u)}
                    className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-1.5 py-3 text-left transition-colors hover:bg-[color:var(--cap-surface-2)]"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: pastille(vu(u)) }} />
                      <span className="min-w-0">
                        <span className="block truncate text-[0.92rem]" style={{ color: "var(--cap-ink)" }}>
                          {u.username || u.email}
                        </span>
                        <span className="block truncate text-[0.78rem]" style={{ color: "var(--cap-ink-3)" }}>
                          {u.username ? u.email : ""}
                          {u.is_active === 0 ? " · suspendu" : ""}
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-5">
                      {u.balance != null && (
                        <Num className="text-[0.85rem]">{money(u.balance)}</Num>
                      )}
                      <Text size="caption" as="span">{depuis(vu(u))}</Text>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      <UserSheet
        user={ouvert}
        onClose={() => setOuvert(null)}
        onChanged={() => charger(q)}
        money={money}
      />
    </>
  );
}

/* ── La fiche d'un compte ──────────────────────────────────────────────── */

function UserSheet({
  user,
  onClose,
  onChanged,
  money,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onChanged: () => void;
  money: (v: number) => string;
}) {
  const [detail, setDetail] = useState<AdminUserDetails | null>(null);
  const [montant, setMontant] = useState("");
  const [confirme, setConfirme] = useState<null | "ban" | "unban" | "reset" | "wallet" | "promote" | "delete">(null);
  // La suppression se confirme en recopiant l'adresse du compte : un clic de
  // trop ne doit pas pouvoir effacer quelqu'un.
  const [saisie, setSaisie] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (!user) { setDetail(null); return; }
    setConfirme(null); setErreur(""); setMontant(""); setSaisie("");
    adminAPI.getUserDetails(user.id).then(setDetail).catch(() => setDetail(null));
  }, [user]);

  if (!user) return <Drawer open={false} onClose={onClose}><span /></Drawer>;

  const actif = user.is_active !== 0;
  // La fiche reçoit les 50 dernières positions, fermées comprises.
  const ouvertes = (detail?.positions ?? []).filter((p) => p.status === "open");

  const agir = async () => {
    if (!confirme) return;
    setOccupe(true); setErreur("");
    try {
      if (confirme === "wallet") {
        const v = Number(montant.replace(",", "."));
        if (!Number.isFinite(v) || v === 0) throw new Error("Indiquez un montant non nul.");
        await adminAPI.adjustWallet(user.id, v, "Ajustement administrateur");
      } else if (confirme === "promote") {
        await adminAPI.promote(user.email);
      } else if (confirme === "delete") {
        if (saisie.trim().toLowerCase() !== (user.email || "").toLowerCase())
          throw new Error("Recopiez exactement l'adresse du compte pour confirmer.");
        await adminAPI.performUserAction(user.id, "delete", "Suppression par l'administration");
        setConfirme(null);
        onChanged();
        onClose();
        return;
      } else {
        await adminAPI.performUserAction(
          user.id,
          confirme === "ban" ? "ban" : confirme === "unban" ? "unban" : "reset_wallet",
          "Action administrateur"
        );
      }
      setConfirme(null);
      onChanged();
      const d = await adminAPI.getUserDetails(user.id);
      setDetail(d);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setOccupe(false);
    }
  };

  const texteConfirmation: Record<string, string> = {
    ban: `${user.email} ne pourra plus se connecter. Ses positions restent ouvertes et son solde intact.`,
    unban: `${user.email} pourra se reconnecter immédiatement.`,
    reset: `Le portefeuille de ${user.email} repart à son solde de départ. Ses positions ouvertes ET son historique sont perdus. C'est irréversible.`,
    wallet: `Le solde de ${user.email} sera ajusté de ${montant || "0"} €. L'opération est tracée dans le journal des actions.`,
    promote: `${user.email} deviendra administrateur : accès complet à cet écran, aux comptes et aux réglages du site.`,
    delete: `Le compte ${user.email} et toutes ses données seront supprimés : positions, wallet, journal, favoris, messages, tickets, notifications. Un abonnement Premium en cours est d'abord annulé chez Stripe. C'est définitif.`,
  };

  return (
    <Drawer open onClose={onClose} title="Compte">
      <Heading level={3}>{user.username || user.email}</Heading>
      <Text size="caption" className="mt-1">
        {user.username ? `${user.email} · ` : ""}inscrit {depuis(user.created_at)} · vu {depuis(vu(user))}
        {!actif ? " · suspendu" : ""}
      </Text>

      <div className="mt-6 flex flex-wrap gap-x-10 gap-y-5">
        <div>
          <Num className="block text-[1.3rem]">{money(detail?.wallet?.balance ?? user.balance ?? 10000)}</Num>
          <Text size="caption" className="mt-1">solde</Text>
        </div>
        <div>
          <Num className="block text-[1.3rem]">{fr(ouvertes.length || user.open_positions || 0, 0)}</Num>
          <Text size="caption" className="mt-1">positions</Text>
        </div>
        <div>
          <Num className="block text-[1.3rem]">{fr(user.favorites_count ?? 0, 0)}</Num>
          <Text size="caption" className="mt-1">favoris</Text>
        </div>
      </div>

      {/* La confirmation remplace les actions : on ne peut pas en déclencher
          une seconde pendant qu'on en confirme une. */}
      {confirme ? (
        <div className="mt-7 rounded-[12px] p-4" style={{ backgroundColor: "var(--cap-surface-2)" }}>
          <Text size="small" tone="ink">{texteConfirmation[confirme]}</Text>
          {confirme === "wallet" && (
            <div className="mt-3">
              <Field label="Montant en euros (négatif pour retirer)">
                <TextInput
                  value={montant}
                  onChange={setMontant}
                  placeholder="par ex. 500 ou -250"
                />
              </Field>
            </div>
          )}
          {confirme === "delete" && (
            <div className="mt-3">
              <Field label={`Recopiez l'adresse du compte : ${user.email}`}>
                <TextInput value={saisie} onChange={setSaisie} placeholder={user.email} />
              </Field>
            </div>
          )}
          {erreur && <div className="mt-3"><FormError>{erreur}</FormError></div>}
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button size="md" onClick={agir}
              disabled={occupe || (confirme === "delete" && saisie.trim().toLowerCase() !== (user.email || "").toLowerCase())}>
              {occupe ? "…" : confirme === "delete" ? "Supprimer définitivement" : "Confirmer"}
            </Button>
            <Button variant="quiet" size="md" onClick={() => setConfirme(null)} disabled={occupe}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-7 flex flex-wrap gap-2.5">
          <Button variant="secondary" size="md" onClick={() => setConfirme("wallet")}>
            Ajuster le solde
          </Button>
          <Button variant="secondary" size="md" onClick={() => setConfirme(actif ? "ban" : "unban")}>
            {actif ? "Suspendre" : "Réactiver"}
          </Button>
          <Button variant="quiet" size="md" onClick={() => setConfirme("reset")}>
            Réinitialiser le portefeuille
          </Button>
          <Button variant="quiet" size="md" onClick={() => setConfirme("promote")}>
            Promouvoir administrateur
          </Button>
          <button
            type="button"
            onClick={() => setConfirme("delete")}
            className="min-h-[44px] px-1.5 text-[0.9rem] font-medium underline decoration-2 underline-offset-[6px]"
            style={{ color: "var(--cap-down)", textDecorationColor: "color-mix(in srgb, var(--cap-down) 40%, transparent)" }}
          >
            Supprimer le compte
          </button>
        </div>
      )}

      <Activite userId={user.id} money={money} />

      {ouvertes.length > 0 && (
        <div className="mt-7 border-t pt-5" style={{ borderColor: "var(--cap-line)" }}>
          <Text size="caption">Positions ouvertes</Text>
          <ul className="mt-2 [&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
            {ouvertes.slice(0, 8).map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-4 py-2">
                <span className="text-[0.88rem]" style={{ color: "var(--cap-ink)" }}>
                  {p.symbol}
                  <span className="ml-2 text-[0.78rem]" style={{ color: "var(--cap-ink-3)" }}>
                    {p.direction === "LONG" ? "achat" : "vente"}
                    {(p.leverage ?? 1) > 1 ? ` ×${p.leverage}` : ""}
                  </span>
                </span>
                <Num className="text-[0.85rem]">{money(p.amount)}</Num>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Drawer>
  );
}

/* ── Ce que fait ce compte ─────────────────────────────────────────────── */

const LIBELLES: Record<string, string> = {
  visite: "visites", analyse: "analyses", lecon: "leçons", scan: "scans",
  assistant: "questions", alerte: "alertes posées", position: "positions",
};

function quand(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) + ", "
    + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * L'activité d'un compte, pour comprendre ce qu'il fait du site : ses
 * habitudes (jours venus, gestes), sa progression (niveau, série, missions,
 * leçons), son trading, et le fil de ses derniers événements. Tout vient du
 * journal des gestes et des tables du site ; rien n'est lu dans ses messages.
 */
function Activite({ userId, money }: { userId: number; money: (v: number) => string }) {
  const [a, setA] = useState<ActiviteCompte | null>(null);
  const [tout, setTout] = useState(false);
  useEffect(() => {
    setA(null); setTout(false);
    adminAPI.getUserActivity(userId).then(setA).catch(() => setA(null));
  }, [userId]);
  if (!a) return null;

  const chiffres: [string, string][] = [
    [fr(a.jours_venus, 0), `jour${a.jours_venus > 1 ? "s" : ""} venu${a.jours_venus > 1 ? "s" : ""}, dont ${fr(a.jours_venus_30j, 0)} ces 30 jours`],
    [`Niveau ${a.niveau}`, `${fr(a.xp, 0)} points, série de ${fr(a.serie, 0)} j`],
    [fr(a.missions, 0), `missions, ${fr(a.lecons, 0)} leçon${a.lecons > 1 ? "s" : ""} terminée${a.lecons > 1 ? "s" : ""}`],
    [fr(a.trades.fermes, 0), `trades fermés, ${fr(a.trades.gagnants, 0)} gagnant${a.trades.gagnants > 1 ? "s" : ""}, ${money(a.trades.resultat)}`],
  ];
  const gestes = Object.entries(a.gestes).filter(([k]) => k !== "inscription" && LIBELLES[k]);

  return (
    <div className="mt-7 border-t pt-5" style={{ borderColor: "var(--cap-line)" }}>
      <Text size="caption">Ce qu&apos;il fait sur le site</Text>
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4">
        {chiffres.map(([v, l]) => (
          <div key={l} className="min-w-0">
            <Num className="block text-[1.05rem]">{v}</Num>
            <span className="mt-0.5 block text-[0.78rem] leading-snug" style={{ color: "var(--cap-ink-3)" }}>{l}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[0.82rem]" style={{ color: "var(--cap-ink-2)" }}>
        {gestes.length
          ? gestes.map(([k, n]) => `${n} jour${n > 1 ? "s" : ""} avec ${LIBELLES[k]}`).join(", ") + "."
          : "Aucun geste noté depuis le début de la mesure."}
        {" "}{a.alertes_actives} alerte{a.alertes_actives > 1 ? "s" : ""} active{a.alertes_actives > 1 ? "s" : ""},{" "}
        {a.appareils ? `notifications activées sur ${a.appareils} appareil${a.appareils > 1 ? "s" : ""}` : "notifications non activées"}.
      </p>

      {a.fil.length > 0 && (
        <>
          <Text size="caption" className="mt-5">Derniers événements</Text>
          <ol className="mt-2">
            {(tout ? a.fil : a.fil.slice(0, 8)).map((f, i) => (
              <li key={i} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 border-t py-2 text-[0.84rem]" style={{ borderColor: "var(--cap-line)" }}>
                <span className="cap-num" style={{ color: "var(--cap-ink-3)" }}>{quand(f.quand)}</span>
                <span style={{ color: f.genre === "cloture" ? "var(--cap-ink)" : "var(--cap-ink-2)" }}>{f.texte}</span>
              </li>
            ))}
          </ol>
          {a.fil.length > 8 && (
            <button type="button" onClick={() => setTout((v) => !v)} className="cap-lien mt-2 text-[0.84rem]">
              {tout ? "Réduire" : `Voir les ${a.fil.length} derniers événements`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
