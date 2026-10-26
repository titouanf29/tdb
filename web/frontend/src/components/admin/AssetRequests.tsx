"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { adminAPI, type ActifAjoute, type AdminAssetRequest } from "@/lib/api";
import {
  Button, DUR, EASE, EmptyState, Field, FormError, Panel, Text, TextInput,
} from "@/components/design-system";

/**
 * Les actifs que les utilisateurs réclament, et ceux qu'on ajoute.
 *
 * Une demande se traite en étapes, parce qu'un nom ne suffit presque jamais :
 * « Soitec », c'est SOI.PA à Paris, et c'est au client qu'on le demande quand
 * on doute.
 *
 *   1. Demander une précision : la question part dans « Mes demandes » du
 *      client, qui y répond ; l'échange se lit ici, dans la ligne.
 *   2. Accepter : la demande passe « en cours d'ajout ».
 *   3. Ajouté : le symbole Yahoo, le nom et le marché exacts. Le serveur
 *      vérifie que le symbole renvoie un cours, ajoute l'actif au site, et
 *      prévient le client.
 *
 * Un actif demandé ailleurs (par e-mail, de vive voix) s'ajoute directement,
 * avec le formulaire du bas.
 */

const ETAT: Record<string, { mot: string; couleur: string }> = {
  pending: { mot: "Nouvelle", couleur: "var(--cap-ambre)" },
  info_requested: { mot: "Précision demandée", couleur: "var(--cap-ocean)" },
  accepted: { mot: "Acceptée, à ajouter", couleur: "var(--cap-up)" },
  added: { mot: "Ajoutée", couleur: "var(--cap-ink-3)" },
  approved: { mot: "Ajoutée", couleur: "var(--cap-ink-3)" },
  rejected: { mot: "Refusée", couleur: "var(--cap-ink-3)" },
};
const OUVERTS = ["pending", "info_requested", "accepted"];

const MARCHES = [
  { value: "", label: "Déduit du symbole" },
  { value: "EUROPE", label: "Europe" },
  { value: "USA", label: "États-Unis" },
  { value: "ASIA", label: "Asie" },
  { value: "CRYPTO", label: "Crypto" },
  { value: "COMMODITIES", label: "Matières premières" },
];

const champ = {
  backgroundColor: "var(--cap-bg)",
  color: "var(--cap-ink)",
  boxShadow: "inset 0 0 0 1px var(--cap-line-strong)",
} as const;

function ChoixMarche({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-[12px] px-3 text-[0.95rem] outline-none" style={champ}>
      {MARCHES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
    </select>
  );
}

function Ligne({ r, onFait }: { r: AdminAssetRequest; onFait: () => Promise<void> }) {
  const [mode, setMode] = useState<"question" | "ajout" | "refus" | null>(null);
  const [texte, setTexte] = useState("");
  const [symbole, setSymbole] = useState(r.symbol);
  const [nom, setNom] = useState(r.asset_name || "");
  const [marche, setMarche] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  const ouvert = OUVERTS.includes(r.status);
  const etat = ETAT[r.status] ?? { mot: r.status, couleur: "var(--cap-ink-3)" };

  const faire = async (f: () => Promise<unknown>) => {
    setOccupe(true); setErreur("");
    try { await f(); setMode(null); setTexte(""); await onFait(); }
    catch (e) { setErreur(e instanceof Error ? e.message : "Action impossible."); }
    finally { setOccupe(false); }
  };

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-[1rem] font-semibold" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
              {r.asset_name || r.symbol}
            </span>
            <span className="cap-num text-[0.85rem]" style={{ color: "var(--cap-ink-2)" }}>
              {r.symbole_final && r.symbole_final !== r.symbol ? `${r.symbol} → ${r.symbole_final}` : r.symbol}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[0.8rem]" style={{ color: "var(--cap-ink-2)" }}>
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: etat.couleur }} />
              {etat.mot}
            </span>
          </div>
          {r.reason && <Text size="small" className="mt-1 max-w-[44rem]">« {r.reason} »</Text>}
          <Text size="caption" className="mt-1">
            {r.username || r.email || `compte #${r.user_id}`}
            {r.admin_notes ? `, note : ${r.admin_notes}` : ""}
          </Text>
          {/* L'échange de précisions, tant que la demande est en cours. */}
          {r.dernier_message && ouvert && (
            <div className="mt-2 max-w-[44rem] rounded-[10px] px-3 py-2"
              style={{ backgroundColor: r.dernier_de_admin ? "var(--cap-surface-2)" : "color-mix(in srgb, var(--cap-ambre) 12%, var(--cap-surface))" }}>
              <Text size="caption" className="italic">
                {r.dernier_de_admin ? "Votre question, en attente de réponse :" : "Le client a répondu :"}
              </Text>
              <Text size="small" tone="ink" className="mt-0.5 whitespace-pre-wrap">{r.dernier_message}</Text>
            </div>
          )}
        </div>

        {ouvert && (
          <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1">
            <Button variant="secondary" size="sm" onClick={() => setMode(mode === "question" ? null : "question")}>
              Demander une précision
            </Button>
            {r.status !== "accepted" && (
              <Button variant="secondary" size="sm" disabled={occupe}
                onClick={() => faire(() => adminAPI.assetRequestAction(r.id, "approve"))}>
                Accepter
              </Button>
            )}
            <Button size="sm" onClick={() => setMode(mode === "ajout" ? null : "ajout")}>Ajouté</Button>
            <Button variant="quiet" size="sm" onClick={() => setMode(mode === "refus" ? null : "refus")}>Refuser</Button>
          </div>
        )}
      </div>

      {erreur && <div className="mt-3"><FormError>{erreur}</FormError></div>}

      <AnimatePresence initial={false}>
        {mode && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: DUR.base, ease: EASE }} style={{ overflow: "hidden" }}>
            <div className="mt-3 rounded-[14px] p-4" style={{ backgroundColor: "var(--cap-bg)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}>
              {mode === "ajout" ? (
                <form className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => {
                  e.preventDefault();
                  faire(() => adminAPI.assetRequestAdded(r.id, symbole.trim(), nom.trim() || undefined, marche || undefined));
                }}>
                  <Field label="Symbole Yahoo" htmlFor={`s-${r.id}`} hint="Ex. SOI.PA, ARG.PA, PLTR">
                    <TextInput id={`s-${r.id}`} value={symbole} onChange={(v) => setSymbole(v.toUpperCase())} required />
                  </Field>
                  <Field label="Nom affiché" htmlFor={`n-${r.id}`}>
                    <TextInput id={`n-${r.id}`} value={nom} onChange={setNom} placeholder="Soitec" />
                  </Field>
                  <Field label="Marché" htmlFor={`m-${r.id}`}>
                    <ChoixMarche id={`m-${r.id}`} value={marche} onChange={setMarche} />
                  </Field>
                  <div className="sm:col-span-3 flex flex-wrap items-center gap-3">
                    <Button type="submit" size="md" disabled={occupe || !symbole.trim()}>
                      {occupe ? "Vérification du cours…" : "Ajouter et prévenir le client"}
                    </Button>
                    <Text size="caption">Le symbole doit renvoyer un cours, sinon rien n&apos;est ajouté.</Text>
                  </div>
                </form>
              ) : (
                <form className="space-y-3" onSubmit={(e) => {
                  e.preventDefault();
                  if (!texte.trim()) return;
                  faire(() => mode === "question"
                    ? adminAPI.assetRequestQuestion(r.id, texte.trim())
                    : adminAPI.assetRequestAction(r.id, "reject", texte.trim()));
                }}>
                  <label htmlFor={`q-${r.id}`} className="block text-[0.85rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                    {mode === "question" ? "Votre question au client" : "La raison du refus (le client la lira)"}
                  </label>
                  <textarea id={`q-${r.id}`} rows={3} value={texte} onChange={(e) => setTexte(e.target.value)}
                    className="w-full resize-y rounded-[12px] px-3.5 py-3 text-[0.95rem] outline-none" style={champ}
                    placeholder={mode === "question"
                      ? "Bonjour, s'agit-il bien de Soitec coté à Paris (SOI.PA) ?"
                      : "Cet actif n'a pas assez d'échanges pour une analyse fiable."} />
                  <Button type="submit" size="md" disabled={occupe || !texte.trim()}>
                    {mode === "question" ? "Envoyer la question" : "Refuser la demande"}
                  </Button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function AjoutDirect({ onFait }: { onFait: () => Promise<void> }) {
  const [symbole, setSymbole] = useState("");
  const [nom, setNom] = useState("");
  const [marche, setMarche] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  const [ok, setOk] = useState("");
  return (
    <form className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-start" onSubmit={async (e) => {
      e.preventDefault();
      setOccupe(true); setErreur(""); setOk("");
      try {
        const r = await adminAPI.addAssetDirect(symbole.trim(), nom.trim() || undefined, marche || undefined);
        setOk(`${nom.trim() || r.symbol} ajouté (${r.symbol}, cours ${r.prix.toLocaleString("fr-FR")}).`);
        setSymbole(""); setNom(""); setMarche("");
        await onFait();
      } catch (err) { setErreur(err instanceof Error ? err.message : "Ajout impossible."); }
      finally { setOccupe(false); }
    }}>
      <Field label="Symbole Yahoo" htmlFor="ad-s" hint="Ex. SOI.PA pour Soitec">
        <TextInput id="ad-s" value={symbole} onChange={(v) => setSymbole(v.toUpperCase())} required />
      </Field>
      <Field label="Nom affiché" htmlFor="ad-n">
        <TextInput id="ad-n" value={nom} onChange={setNom} placeholder="Soitec" />
      </Field>
      <Field label="Marché" htmlFor="ad-m">
        <ChoixMarche id="ad-m" value={marche} onChange={setMarche} />
      </Field>
<div className="sm:pt-[1.85rem]">      <Button type="submit" size="md" disabled={occupe || !symbole.trim()}>
        {occupe ? "Vérification…" : "Ajouter"}
      </Button></div>
      {erreur && <div className="sm:col-span-4"><FormError>{erreur}</FormError></div>}
      {ok && <Text size="small" tone="up" className="sm:col-span-4">{ok}</Text>}
    </form>
  );
}

export function AssetRequests() {
  const [rows, setRows] = useState<AdminAssetRequest[]>([]);
  const [ajoutes, setAjoutes] = useState<ActifAjoute[]>([]);
  const [charge, setCharge] = useState(true);

  const charger = useCallback(async () => {
    try { setRows((await adminAPI.getAssetRequests()).requests || []); } catch { setRows([]); }
    try { setAjoutes((await adminAPI.getAddedAssets()).actifs || []); } catch { setAjoutes([]); }
    setCharge(false);
  }, []);

  useEffect(() => { charger(); }, [charger]);

  // Ce qui attend une action d'abord ; le reste, du plus récent au plus ancien.
  const triees = [...rows].sort((a, b) => {
    const oa = OUVERTS.includes(a.status), ob = OUVERTS.includes(b.status);
    if (oa !== ob) return oa ? -1 : 1;
    return (b.created_at || "").localeCompare(a.created_at || "");
  });
  const aTraiter = rows.filter((r) => OUVERTS.includes(r.status)).length;

  return (
    <div className="space-y-8">
      <Panel
        title="Demandes d'actifs"
        hint="Demander une précision, accepter, puis « Ajouté » quand l'actif est sur le site : le client est prévenu à chaque étape utile."
        aside={aTraiter > 0 ? <Text size="caption" as="span">{aTraiter} à traiter</Text> : undefined}
      >
        {charge ? (
          <Text size="caption">Chargement…</Text>
        ) : triees.length === 0 ? (
          <EmptyState title="Aucune demande" description="Personne n'a encore réclamé d'actif absent." />
        ) : (
          <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
            {triees.map((r) => <Ligne key={r.id} r={r} onFait={charger} />)}
          </ul>
        )}
      </Panel>

      <Panel
        title="Ajouter un actif"
        hint="Pour un actif demandé hors du site. Le symbole est vérifié auprès des cours avant d'être ajouté."
      >
        <AjoutDirect onFait={charger} />
        {ajoutes.length > 0 && (
          <div className="mt-6 border-t pt-4" style={{ borderColor: "var(--cap-line)" }}>
            <Text size="caption" className="mb-2">Déjà ajoutés depuis l&apos;administration</Text>
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
              {ajoutes.map((a) => (
                <li key={a.symbol} className="text-[0.9rem]" style={{ color: "var(--cap-ink)" }}>
                  {a.nom || a.symbol} <span className="cap-num" style={{ color: "var(--cap-ink-3)" }}>{a.symbol}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
    </div>
  );
}
