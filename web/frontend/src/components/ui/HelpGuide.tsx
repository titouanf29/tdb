"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HelpSection {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}

interface HelpGuideProps {
  title: string;
  intro?: string;
  sections: HelpSection[];
  tip?: string;
  /** Size of the trigger button */
  size?: "sm" | "md";
  className?: string;
}

export function HelpGuide({ title, intro, sections, tip, size = "md", className }: HelpGuideProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "rounded-full text-muted-foreground hover:text-primary transition-colors",
          size === "sm" ? "p-0.5" : "p-1",
          className
        )}
        title={`Aide — ${title}`}
        type="button"
      >
        <HelpCircle className={size === "sm" ? "w-4 h-4" : "w-5 h-5"} />
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative glass-card w-full max-w-lg p-6 space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  {title}
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Intro */}
              {intro && (
                <p className="text-sm text-muted-foreground leading-relaxed">{intro}</p>
              )}

              {/* Sections */}
              <div className="space-y-2.5">
                {sections.map(({ icon: Icon, title: t, desc }) => (
                  <div key={t} className="flex gap-3 p-3 bg-white/5 rounded-xl">
                    {Icon && (
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{t}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tip */}
              {tip && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 leading-relaxed">
                  💡 {tip}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
