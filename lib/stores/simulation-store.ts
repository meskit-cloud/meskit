import { create } from "zustand";
import type { SimulationScenario } from "@/lib/agents/simulator";

// --- Types ---

export type SimulationStatus = "idle" | "running" | "paused";
export type SimulationSpeed = "1x" | "2x" | "5x" | "10x";

export const SPEED_MS: Record<SimulationSpeed, number> = {
  "1x": 2000,
  "2x": 1000,
  "5x": 400,
  "10x": 200,
};

// --- State ---

interface SimulationState {
  status: SimulationStatus;
  speed: SimulationSpeed;
  scenario: SimulationScenario;
  tickCount: number;
  isTickInProgress: boolean;
}

// --- Actions ---

interface SimulationActions {
  start: (scenario?: SimulationScenario, speed?: SimulationSpeed) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  setSpeed: (speed: SimulationSpeed) => void;
  setScenario: (scenario: SimulationScenario) => void;
}

type SimulationStore = SimulationState & SimulationActions;

// --- Module-level clock (not in Zustand state to avoid serialization) ---

let clockInterval: ReturnType<typeof setInterval> | null = null;

function clearClock() {
  if (clockInterval) {
    clearInterval(clockInterval);
    clockInterval = null;
  }
}

function startClock(speed: SimulationSpeed) {
  clearClock();
  clockInterval = setInterval(() => {
    const store = useSimulationStore.getState();
    if (store.status !== "running" || store.isTickInProgress) return;

    useSimulationStore.setState({ isTickInProgress: true });

    const { scenario, tickCount } = store;
    fetch("/api/simulation/tick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario, tickNumber: tickCount }),
    })
      .then(() => {
        useSimulationStore.setState((s) => ({
          tickCount: s.tickCount + 1,
          isTickInProgress: false,
        }));
      })
      .catch(() => {
        useSimulationStore.setState({ isTickInProgress: false });
      });
  }, SPEED_MS[speed]);
}

// --- Store ---

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  status: "idle",
  speed: "1x",
  scenario: "steady_state",
  tickCount: 0,
  isTickInProgress: false,

  start: (scenario, speed) => {
    const newScenario = scenario ?? get().scenario;
    const newSpeed = speed ?? get().speed;
    set({ status: "running", scenario: newScenario, speed: newSpeed, tickCount: 0 });
    fetch("/api/simulation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", scenario: newScenario, speed: newSpeed }),
    }).catch(() => {});
    startClock(newSpeed);
  },

  pause: () => {
    clearClock();
    set({ status: "paused" });
    fetch("/api/simulation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pause" }),
    }).catch(() => {});
  },

  resume: () => {
    const { speed } = get();
    set({ status: "running" });
    startClock(speed);
  },

  reset: () => {
    clearClock();
    set({ status: "idle", tickCount: 0, isTickInProgress: false });
    fetch("/api/simulation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    }).catch(() => {});
  },

  setSpeed: (speed) => {
    set({ speed });
    if (get().status === "running") {
      startClock(speed);
    }
  },

  setScenario: (scenario) => set({ scenario }),
}));
