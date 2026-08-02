"use client";

import { ReactNode, useEffect, useId, useRef } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  closeLabel: string;
  destructive?: boolean;
}

/** Shared dialog chrome: backdrop, escape-to-close, focus trap entry point. */
export function ModalShell({ title, onClose, children, closeLabel, destructive }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    // Move focus into the dialog so keyboard users are not stranded behind it,
    // and restore it to whatever opened the dialog on close.
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("input, button")?.focus();
    // Lock the background scroll — without this the page scrolls behind the
    // dialog on mobile.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      // Click-outside-to-close, like every other modal in the app. Guarded on
      // the target so a click inside the panel never bubbles up as a dismiss.
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="w-full max-w-md glass-card rounded-2xl overflow-hidden"
        style={{ background: "hsl(var(--card))" }}
      >
        <div className={cn(
          "flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10",
          destructive && "bg-loss/10"
        )}>
          <h2 id={titleId} className={cn("text-base font-semibold font-display", destructive && "text-loss")}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </motion.div>
    </div>
  );
}
