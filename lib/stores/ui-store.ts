import { create } from "zustand";

// --- State ---

interface UiState {
  activeMode: "build" | "configure" | "run" | "monitor";
  chatPanelOpen: boolean;
  selectedLineId: string | null;
  selectedLineName: string | null;
  selectedWorkstationId: string | null;
  selectedWorkstationName: string | null;
  selectedPartNumberId: string | null;
  selectedPartNumberName: string | null;
  selectedRouteId: string | null;
  selectedRouteName: string | null;
}

// --- Actions ---

interface UiActions {
  setActiveMode: (mode: UiState["activeMode"]) => void;
  toggleChatPanel: () => void;
  setChatPanelOpen: (open: boolean) => void;
  selectLine: (id: string | null, name?: string | null) => void;
  selectWorkstation: (id: string | null, name?: string | null) => void;
  selectPartNumber: (id: string | null, name?: string | null) => void;
  selectRoute: (id: string | null, name?: string | null) => void;
  clearSelections: () => void;
}

type UiStore = UiState & UiActions;

// --- Store ---

export const useUiStore = create<UiStore>((set) => ({
  activeMode: "build",
  chatPanelOpen: true,
  selectedLineId: null,
  selectedLineName: null,
  selectedWorkstationId: null,
  selectedWorkstationName: null,
  selectedPartNumberId: null,
  selectedPartNumberName: null,
  selectedRouteId: null,
  selectedRouteName: null,

  setActiveMode: (mode) => set({ activeMode: mode }),
  toggleChatPanel: () =>
    set((state) => ({ chatPanelOpen: !state.chatPanelOpen })),
  setChatPanelOpen: (open) => set({ chatPanelOpen: open }),
  selectLine: (id, name) =>
    set({
      selectedLineId: id,
      selectedLineName: name ?? null,
      selectedWorkstationId: null,
      selectedWorkstationName: null,
    }),
  selectWorkstation: (id, name) =>
    set({ selectedWorkstationId: id, selectedWorkstationName: name ?? null }),
  selectPartNumber: (id, name) =>
    set({
      selectedPartNumberId: id,
      selectedPartNumberName: name ?? null,
      selectedRouteId: null,
      selectedRouteName: null,
    }),
  selectRoute: (id, name) =>
    set({ selectedRouteId: id, selectedRouteName: name ?? null }),
  clearSelections: () =>
    set({
      selectedLineId: null,
      selectedLineName: null,
      selectedWorkstationId: null,
      selectedWorkstationName: null,
      selectedPartNumberId: null,
      selectedPartNumberName: null,
      selectedRouteId: null,
      selectedRouteName: null,
    }),
}));

// --- Selectors ---

export const selectActiveMode = (state: UiStore) => state.activeMode;
export const selectChatPanelOpen = (state: UiStore) => state.chatPanelOpen;
