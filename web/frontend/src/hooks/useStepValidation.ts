"use client";

import { useEffect } from "react";
import { useAlexStore } from "@/stores/alex-store";
import { TOURS } from "@/lib/alex/tours";

export function useStepValidation() {
  const { activeTour, currentStep, validationState, setValidation, nextStep } =
    useAlexStore();

  useEffect(() => {
    if (!activeTour) return;
    const tour = TOURS[activeTour];
    if (!tour) return;
    const step = tour.steps[currentStep];
    const validation = step?.validation;
    if (!validation) return;
    if (validationState !== "idle") return;

    let interval: ReturnType<typeof setInterval> | null = null;

    const check = () => {
      if (typeof window === "undefined") return;
      let passed = false;

      switch (validation.type) {
        case "element-visible": {
          if (!validation.selector) break;
          const el = document.querySelector(validation.selector);
          passed = !!el && el.getBoundingClientRect().width > 0;
          break;
        }
        case "custom": {
          passed = validation.customCheck?.() ?? false;
          break;
        }
        case "element-clicked":
          // handled separately below
          break;
      }

      if (passed) {
        setValidation("success", validation.successMessage);
        if (validation.autoAdvance) {
          setTimeout(() => nextStep(), 1800);
        }
        if (interval) clearInterval(interval);
      }
    };

    if (validation.type === "element-clicked" && validation.selector) {
      const target = document.querySelector(validation.selector);
      if (target) {
        const handleClick = () => {
          setValidation("success", validation.successMessage);
          if (validation.autoAdvance) setTimeout(() => nextStep(), 1800);
        };
        target.addEventListener("click", handleClick);
        return () => target.removeEventListener("click", handleClick);
      }
    } else {
      // Poll for element-visible / custom
      interval = setInterval(check, 600);
      check(); // immediate check
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [activeTour, currentStep, validationState]);
}
