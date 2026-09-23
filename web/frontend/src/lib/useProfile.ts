"use client";

import { useCallback, useEffect, useState } from "react";
import { profileAPI, type ProfilePreferences } from "@/lib/api";

/**
 * Le profil, chargé une fois et mis en cache dans le navigateur.
 *
 * Plusieurs écrans le lisent au premier rendu pour décider ce qu'ils
 * ouvrent — les Marchés choisissent leur place, le Parcours son rythme. Un
 * aller-retour réseau avant chaque décision ferait clignoter l'écran :
 * ouverture sur le défaut, puis saut sur la préférence une seconde plus
 * tard, ce qui est plus désagréable que pas de personnalisation du tout.
 *
 * Le cache local sert donc de réponse immédiate, et le serveur reste la
 * source de vérité : il écrase le cache dès qu'il répond.
 */

const CACHE_KEY = "tdb_profile_prefs";
const EMPTY: ProfilePreferences = {
  goal: null, markets: [], weekly_time: null,
  mise_eur: null, perte_max_pct: null, disponibilite: null,
  reaction: null, lecture: null, connait: [], intentions_at: null,
};

function readCache(): ProfilePreferences {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return EMPTY;
    const v = JSON.parse(raw) as ProfilePreferences;
    return {
      ...EMPTY,
      goal: v.goal ?? null,
      markets: Array.isArray(v.markets) ? v.markets : [],
      weekly_time: v.weekly_time ?? null,
      // Les intentions : elles entrent dans des calculs sur l'argent de
      // quelqu'un, donc un cache abîmé doit rendre « pas de réponse » et non
      // une valeur approchante.
      mise_eur: typeof v.mise_eur === "number" ? v.mise_eur : null,
      perte_max_pct: typeof v.perte_max_pct === "number" ? v.perte_max_pct : null,
      disponibilite: v.disponibilite ?? null,
      reaction: v.reaction ?? null,
      lecture: v.lecture ?? null,
      connait: Array.isArray(v.connait) ? v.connait : [],
      intentions_at: v.intentions_at ?? null,
    };
  } catch {
    return EMPTY;
  }
}

function writeCache(p: ProfilePreferences) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function useProfile(): {
  profile: ProfilePreferences;
  /** False tant que le serveur n'a pas répondu — le cache est déjà servi. */
  loaded: boolean;
  save: (patch: Partial<ProfilePreferences>) => Promise<void>;
} {
  const [profile, setProfile] = useState<ProfilePreferences>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProfile(readCache());
    let cancelled = false;
    profileAPI.get()
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
        writeCache(p);
      })
      .catch(() => { /* le cache fait foi en attendant */ })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  const save = useCallback(async (patch: Partial<ProfilePreferences>) => {
    // Optimiste puis réconcilié : l'écran répond tout de suite, et la
    // réponse du serveur — qui valide et dédoublonne — fait autorité.
    setProfile((prev) => ({ ...prev, ...patch }));
    const fresh = await profileAPI.update(patch);
    setProfile(fresh);
    writeCache(fresh);
  }, []);

  return { profile, loaded, save };
}
