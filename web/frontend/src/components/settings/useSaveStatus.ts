"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SaveStatus } from "./SaveState";

export interface SaveStatusHandle {
  status: SaveStatus;
  error: string | null;
  /** Runs `fn`, driving idle → saving → saved | error. Never throws. */
  run: (fn: () => Promise<unknown>) => Promise<boolean>;
  reset: () => void;
}

/**
 * Drives one section's save lifecycle. The "saved" badge is only set AFTER the
 * promise resolves, and auto-clears after 2 s (the single legitimate setTimeout
 * on the settings screen — it clears a badge, it does not simulate work).
 */
export function useSaveStatus(): SaveStatusHandle {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus("idle");
    setError(null);
  }, []);

  const run = useCallback(async (fn: () => Promise<unknown>): Promise<boolean> => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setError(null);
    setStatus("saving");
    try {
      await fn();
      if (!mountedRef.current) return true;
      setStatus("saved");
      timerRef.current = setTimeout(() => {
        if (mountedRef.current) setStatus("idle");
      }, 2000);
      return true;
    } catch (e) {
      if (!mountedRef.current) return false;
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
      return false;
    }
  }, []);

  return { status, error, run, reset };
}
