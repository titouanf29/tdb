"use client";

import { useEffect } from "react";
import { useAlexStore } from "@/stores/alex-store";
import { MODULE_EXPLANATIONS } from "@/lib/alex/module-explanations";
import { useUserLevel } from "@/hooks/useUserLevel";

export function AlexHoverEngine() {
  const { hoverMode, setHoveredModule, setMessage, isOpen } = useAlexStore();
  const { level } = useUserLevel();

  useEffect(() => {
    if (hoverMode) {
      document.body.classList.add("alex-hover-active");
    } else {
      document.body.classList.remove("alex-hover-active");
    }
    return () => document.body.classList.remove("alex-hover-active");
  }, [hoverMode]);

  useEffect(() => {
    if (!hoverMode || !isOpen) return;

    let timeout: ReturnType<typeof setTimeout>;

    const handleMouseMove = (e: MouseEvent) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const moduleEl = (e.target as Element).closest("[data-module-id]");
        const moduleId = moduleEl?.getAttribute("data-module-id") ?? null;
        if (moduleId && MODULE_EXPLANATIONS[moduleId]) {
          setHoveredModule(moduleId);
          const ex = MODULE_EXPLANATIONS[moduleId];
          const text =
            level === "beginner"
              ? ex.simple
              : ex.standard;
          setMessage(`**${ex.title}**\n\n${text}\n\n${ex.tip}`);
        }
      }, 250);
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [hoverMode, isOpen, level]);

  return null;
}
