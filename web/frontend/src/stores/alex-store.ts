import { create } from "zustand";

export type TourId = "analyze-asset";

export type AlexAction =
  | { type: "multiple-choice"; options: { label: string; value: string }[]; onSelect: (value: string) => { valid: boolean; message: string } }
  | { type: "navigate"; href: string; label: string }
  | { type: "none" };

export type StepValidation = {
  type: "element-clicked" | "element-visible" | "custom";
  selector?: string;
  customCheck?: () => boolean;
  successMessage: string;
  errorMessage: string;
  autoAdvance?: boolean;
};

export type TourStep = {
  id: string;
  message: string;
  action?: AlexAction;
  spotlight?: string;
  validation?: StepValidation;
  hint?: string;
  hintDelay?: number;
};

type AlexState = {
  isOpen: boolean;
  isMinimized: boolean;
  activeTour: TourId | null;
  currentStep: number;
  totalSteps: number;
  currentMessage: string;
  currentAction: AlexAction | null;
  validationState: "idle" | "success" | "error";
  validationMessage: string | null;
  hoverMode: boolean;
  hoveredModule: string | null;
  // sub-view (menu / analyse / tip / markets)
  view: "menu" | "analyse" | "tip" | "markets";
  guideStep: number;
  // actions
  openPanel: () => void;
  closePanel: () => void;
  setView: (v: "menu" | "analyse" | "tip" | "markets") => void;
  setGuideStep: (s: number) => void;
  startTour: (tourId: TourId) => void;
  nextStep: () => void;
  previousStep: () => void;
  endTour: () => void;
  setValidation: (state: "success" | "error" | "idle", msg?: string) => void;
  enableHoverMode: () => void;
  disableHoverMode: () => void;
  setHoveredModule: (moduleId: string | null) => void;
  setMessage: (msg: string, action?: AlexAction) => void;
};

export const useAlexStore = create<AlexState>((set, get) => ({
  isOpen: false,
  isMinimized: false,
  activeTour: null,
  currentStep: 0,
  totalSteps: 0,
  currentMessage: "",
  currentAction: null,
  validationState: "idle",
  validationMessage: null,
  hoverMode: false,
  hoveredModule: null,
  view: "menu",
  guideStep: 0,

  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),
  setView: (v) => set({ view: v }),
  setGuideStep: (s) => set({ guideStep: s }),

  startTour: (tourId) => {
    // Import tours lazily to avoid circular deps
    import("@/lib/alex/tours").then(({ TOURS }) => {
      const tour = TOURS[tourId];
      if (!tour) return;
      set({
        activeTour: tourId,
        currentStep: 0,
        totalSteps: tour.steps.length,
        isOpen: true,
        currentMessage: tour.steps[0].message,
        currentAction: tour.steps[0].action ?? null,
        validationState: "idle",
        validationMessage: null,
      });
    });
  },

  nextStep: () => {
    const { activeTour, currentStep } = get();
    if (!activeTour) return;
    import("@/lib/alex/tours").then(({ TOURS }) => {
      const tour = TOURS[activeTour];
      const next = currentStep + 1;
      if (next >= tour.steps.length) {
        get().endTour();
        return;
      }
      set({
        currentStep: next,
        currentMessage: tour.steps[next].message,
        currentAction: tour.steps[next].action ?? null,
        validationState: "idle",
        validationMessage: null,
      });
    });
  },

  previousStep: () => {
    const { activeTour, currentStep } = get();
    if (!activeTour || currentStep === 0) return;
    import("@/lib/alex/tours").then(({ TOURS }) => {
      const tour = TOURS[activeTour];
      const prev = currentStep - 1;
      set({
        currentStep: prev,
        currentMessage: tour.steps[prev].message,
        currentAction: tour.steps[prev].action ?? null,
        validationState: "idle",
        validationMessage: null,
      });
    });
  },

  endTour: () =>
    set({
      activeTour: null,
      currentStep: 0,
      totalSteps: 0,
      validationState: "idle",
      validationMessage: null,
      currentMessage: "",
      currentAction: null,
    }),

  setValidation: (state, msg) =>
    set({ validationState: state, validationMessage: msg ?? null }),

  enableHoverMode: () => set({ hoverMode: true, currentMessage: "", hoveredModule: null }),
  disableHoverMode: () => set({ hoverMode: false, currentMessage: "", hoveredModule: null }),
  setHoveredModule: (moduleId) => set({ hoveredModule: moduleId }),
  setMessage: (msg, action) =>
    set({ currentMessage: msg, currentAction: action ?? null }),
}));
