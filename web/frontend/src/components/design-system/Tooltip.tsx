"use client";

import { useState, useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DUR, EASE } from "./motion";

/**
 * A definition on demand.
 *
 * This product explains things, so a term the reader may not know gets a
 * quiet dotted underline rather than a parenthetical that clutters the
 * sentence for everyone who already knows it. Opens on hover and on focus, so
 * it is reachable from the keyboard.
 */
export function Tooltip({
  children,
  content,
  className,
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className={cn("relative inline-block", className)}>
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="cursor-help border-b border-dotted text-left"
        style={{ borderColor: "var(--cap-ink-4)", color: "inherit" }}
      >
        {children}
      </button>

      <AnimatePresence>
        {open && (
          <motion.span
            id={id}
            role="tooltip"
            className="absolute bottom-[calc(100%+8px)] left-1/2 z-50 w-max max-w-[17rem] -translate-x-1/2 p-3 text-[0.8rem] leading-[1.5]"
            style={{
              borderRadius: "var(--cap-r-sm)",
              backgroundColor: "var(--cap-navy)",
              color: "#E8EDF1",
              boxShadow: "0 12px 32px rgba(11,23,38,0.2)",
            }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: DUR.quick, ease: EASE }}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
