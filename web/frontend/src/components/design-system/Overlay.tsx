"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DUR, EASE } from "./motion";
import { useMouvementReduit } from "./useMouvementReduit";

/* Shared plumbing: escape to close, and the body does not scroll behind. */
function useDismiss(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
}

function Scrim({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-40"
      style={{ backgroundColor: "rgba(11,23,38,0.34)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: DUR.quick }}
      onClick={onClose}
    />
  );
}

function CloseButton({ onClose, label }: { onClose: () => void; label: string }) {
  return (
    <button
      // Même raison que dans SegmentedControl : fermer n'est pas valider.
      type="button"
      onClick={onClose}
      aria-label={label}
      className="absolute right-4 top-4 rounded-[8px] p-2 transition-colors hover:bg-[color:var(--cap-surface-2)]"
      style={{ color: "var(--cap-ink-3)" }}
    >
      <X className="h-4 w-4" />
    </button>
  );
}

/** Centred dialog. For a decision, not for browsing. */
export function Modal({
  open,
  onClose,
  title,
  children,
  closeLabel = "Fermer",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  closeLabel?: string;
  className?: string;
}) {
  const reduce = useMouvementReduit();
  useDismiss(open, onClose);

  return (
    <AnimatePresence>
      {open && (
        <>
          <Scrim onClose={onClose} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className={cn("relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto p-6 sm:p-8", className)}
              style={{
                borderRadius: "var(--cap-r-xl)",
                backgroundColor: "var(--cap-surface)",
                boxShadow: "0 24px 64px rgba(11,23,38,0.16)",
              }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99 }}
              transition={{ duration: DUR.base, ease: EASE }}
            >
              <CloseButton onClose={onClose} label={closeLabel} />
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Side panel. This is where secondary depth goes — the advanced numbers that
 * should be one gesture away but never on screen by default.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  closeLabel = "Fermer",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  closeLabel?: string;
}) {
  const reduce = useMouvementReduit();
  useDismiss(open, onClose);

  return (
    <AnimatePresence>
      {open && (
        <>
          <Scrim onClose={onClose} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto p-6 sm:p-8"
            style={{
              backgroundColor: "var(--cap-surface)",
              boxShadow: "-24px 0 64px rgba(11,23,38,0.12)",
            }}
            initial={reduce ? { opacity: 0 } : { x: "100%" }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "100%" }}
            transition={{ duration: DUR.base, ease: EASE }}
          >
            <CloseButton onClose={onClose} label={closeLabel} />
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
