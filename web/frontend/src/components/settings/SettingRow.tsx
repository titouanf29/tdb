"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** The `p-4 rounded-xl bg-white/5` row used by the alerts & security tabs. */
export function SettingRow({ title, description, children, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white/5 border border-white/10",
        className
      )}
    >
      <div className="min-w-0">
        <p className="font-medium text-sm">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-3">{children}</div>
    </div>
  );
}
