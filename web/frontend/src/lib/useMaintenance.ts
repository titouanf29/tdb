"use client";

import { useEffect, useState } from "react";

export interface MaintenanceState {
  /** Maintenance is on AND the caller is not an admin — i.e. lock them out. */
  locked: boolean;
  /** Raw flag, regardless of who is asking. */
  on: boolean;
  message: string;
  endTime?: string;
  startedAt?: string;
  /** The backend recognised the caller's token as an admin. */
  isAdmin: boolean;
  /** False until the first answer arrives — render nothing decisive before it. */
  checked: boolean;
}

const INITIAL: MaintenanceState = {
  locked: false, on: false, message: "", isAdmin: false, checked: false,
};

/**
 * Single source of truth for the maintenance lock.
 *
 * Every public surface has to consult the same endpoint, or the lock has gaps:
 * before this hook existed only the logged-in shell checked, so the landing
 * page, the login form and the signup form stayed fully open — and signup
 * actually worked — while the site was supposedly closed.
 *
 * Fails OPEN on error. A site that locks itself out because /api/status timed
 * out is worse than one that briefly shows itself during an incident.
 */
export function useMaintenance(pollMs = 30000): MaintenanceState {
  const [state, setState] = useState<MaintenanceState>(INITIAL);

  useEffect(() => {
    let alive = true;

    const check = async () => {
      try {
        const { getToken } = await import("@/lib/auth");
        const token = getToken();
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        // The whole render waits on this one call, so it gets its own short
        // deadline rather than the default 25s proxy timeout.
        const r = await fetch("/api/status", { headers, signal: AbortSignal.timeout(4000) });
        if (r.ok && alive) {
          const d = await r.json();
          const on = !!d.maintenance;
          const isAdmin = !!d.is_admin;
          setState({
            locked: on && !isAdmin,
            on,
            message: d.message || "",
            endTime: d.end_time ?? undefined,
            startedAt: d.started_at ?? undefined,
            isAdmin,
            checked: true,
          });
          return;
        }
      } catch {
        /* network/timeout — fall through and fail open */
      }
      if (alive) setState((s) => ({ ...s, checked: true }));
    };

    check();
    const iv = setInterval(check, pollMs);
    return () => { alive = false; clearInterval(iv); };
  }, [pollMs]);

  return state;
}
