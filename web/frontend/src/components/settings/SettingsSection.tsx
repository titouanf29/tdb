"use client";

import { ReactNode } from "react";
import { SaveState, SaveStatus } from "./SaveState";

interface Props {
  title: string;
  description?: ReactNode;
  status?: SaveStatus;
  error?: string | null;
  onRetry?: () => void;
  children: ReactNode;
}

/** Section heading + its SaveState. Every savable block on /settings uses this. */
export function SettingsSection({
  title, description, status = "idle", error, onRetry, children,
}: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold font-display">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
          )}
        </div>
        <SaveState status={status} error={error} onRetry={onRetry} className="shrink-0 pt-0.5" />
      </div>
      {children}
    </section>
  );
}
