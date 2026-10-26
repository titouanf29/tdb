"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  adminAPI, type AdminBroadcast, type AdminChangelog,
} from "@/lib/api";
import {
  Button, EmptyState, Field, FormError, Panel, SegmentedControl, Text, TextInput,
} from "@/components/design-system";

/**
 * Ce qu'on dit aux utilisateurs.
 *
 * Deux canaux qui se ressemblent et ne servent pas à la même chose, d'où leur
 * réunion ici et leur séparation par un sélecteur :
 *
 *   – L'ANNONCE s'affiche en bandeau, tout de suite, pour tout le monde.
 *     C'est du temporaire : une maintenance prévue, un incident en cours ;
 *   – LA NOTE DE VERSION s'empile dans un historique qu'on consulte. C'est du
 *     permanent : ce qui a changé, et quand.
 *
 * Les confondre donne soit des bandeaux qui racontent l'histoire du produit —
 * et qu'on finit par ne plus lire —, soit des changements que personne ne
 * découvre jamais.
 */

function quand(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function Comms() {
  const [canal, setCanal] = useState<"annonce" | "version">("annonce");
  const [annonces, setAnnonces] = useState<AdminBroadcast[]>([]);
  const [versions, setVersions] = useState<AdminChangelog[]>([]);
  const [erreur, setErreur] = useState("");
  const [occupe, setOccupe] = useState(false);

  const [titreAnnonce, setTitreAnnonce] = useState("");
  const [msg, setMsg] = useState("");
  const [type, setType] = useState("info");
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
  const [version, setVersion] = useState("");

  const charger = useCallback(async () => {
    const [a, v] = await Promise.allSettled([
      adminAPI.getBroadcasts(),
      adminAPI.getChangelogs(),
    ]);
    if (a.status === "fulfilled") setAnnonces(a.value.broadcasts || []);
    if (v.status === "fulfilled") setVersions(v.value.changelogs || []);
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const publier = async () => {
    setOccupe(true); setErreur("");
    try {
      if (canal === "annonce") {
        if (!msg.trim()) throw new Error("Écrivez le message à afficher.");
        await adminAPI.sendBroadcast(titreAnnonce.trim() || "Information", msg.trim(), type);
        setTitreAnnonce(""); setMsg("");
      } else {
        if (!titre.trim() || !contenu.trim()) throw new Error("Un titre et un contenu sont nécessaires.");
        await adminAPI.createChangelog(titre.trim(), contenu.trim(), version.trim() || undefined);
        setTitre(""); setContenu(""); setVersion("");
      }
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Publication impossible.");
    } finally {
      setOccupe(false);
    }
  };

  const supprimer = async (id: number) => {
    try {
      if (canal === "annonce") await adminAPI.deleteBroadcast(id);
      else await adminAPI.deleteChangelog(id);
      await charger();
    } catch { /* la liste se recharge au prochain passage */ }
  };

  const liste = canal === "annonce" ? annonces : versions;

  return (
    <div className="space-y-8">
      <Panel
        title="Publier"
        hint={canal === "annonce"
          ? "Un bandeau visible immédiatement par tous. Pour le temporaire : maintenance, incident."
          : "Une note qui s'ajoute à l'historique des versions. Pour le permanent : ce qui a changé."}
        aside={
          <SegmentedControl
            size="sm"
            options={[
              { value: "annonce", label: "Annonce" },
              { value: "version", label: "Note de version" },
            ]}
            value={canal}
            onChange={(v) => { setCanal(v as typeof canal); setErreur(""); }}
            aria-label="Canal"
          />
        }
      >
        {canal === "annonce" ? (
          <div className="space-y-4">
            <Field label="Titre (facultatif)">
              <TextInput value={titreAnnonce} onChange={setTitreAnnonce} placeholder="Maintenance" />
            </Field>
            <Field label="Message">
              <TextInput value={msg} onChange={setMsg} placeholder="Maintenance prévue ce soir de 22 h à 23 h." />
            </Field>
            <div>
              <Text size="caption" className="mb-2">Ton</Text>
              <SegmentedControl
                size="sm"
                options={[
                  { value: "info", label: "Information" },
                  { value: "warning", label: "Avertissement" },
                  { value: "success", label: "Bonne nouvelle" },
                ]}
                value={type}
                onChange={setType}
                aria-label="Ton de l'annonce"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Titre">
              <TextInput value={titre} onChange={setTitre} placeholder="Le scanner accepte maintenant plusieurs zones" />
            </Field>
            <Field label="Contenu">
              <TextInput value={contenu} onChange={setContenu} placeholder="Ce qui change, en quelques phrases." />
            </Field>
            <Field label="Version (facultatif)">
              <TextInput value={version} onChange={setVersion} placeholder="1.4.0" />
            </Field>
          </div>
        )}

        {erreur && <div className="mt-4"><FormError>{erreur}</FormError></div>}

        <div className="mt-5">
          <Button size="md" onClick={publier} disabled={occupe}>
            {occupe ? "Publication…" : canal === "annonce" ? "Diffuser l'annonce" : "Publier la note"}
          </Button>
        </div>
      </Panel>

      <Panel title={canal === "annonce" ? "Annonces diffusées" : "Notes publiées"}>
        {liste.length === 0 ? (
          <EmptyState
            title={canal === "annonce" ? "Aucune annonce" : "Aucune note"}
            description="Rien n'a encore été publié sur ce canal."
          />
        ) : (
          <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
            {liste.map((item) => {
              const estAnnonce = "message" in item;
              return (
                <li key={item.id} className="flex items-start justify-between gap-5 py-3.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <span className="block text-[0.9rem]" style={{ color: "var(--cap-ink)" }}>
                      {estAnnonce
                        ? (item as AdminBroadcast).message
                        : (item as AdminChangelog).title}
                    </span>
                    {!estAnnonce && (
                      <span className="mt-0.5 block text-[0.84rem] leading-[1.5]" style={{ color: "var(--cap-ink-2)" }}>
                        {(item as AdminChangelog).content}
                      </span>
                    )}
                    <Text size="caption" className="mt-1">
                      {quand(item.created_at)}
                      {!estAnnonce && (item as AdminChangelog).version
                        ? ` · version ${(item as AdminChangelog).version}`
                        : ""}
                    </Text>
                  </div>
                  <button
                    type="button"
                    onClick={() => supprimer(item.id)}
                    aria-label="Supprimer"
                    className="shrink-0 rounded-[8px] p-1.5 transition-colors hover:bg-[color:var(--cap-surface-2)]"
                    style={{ color: "var(--cap-ink-3)" }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
