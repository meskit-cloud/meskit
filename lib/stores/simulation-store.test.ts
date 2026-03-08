import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SPEED_MS, useSimulationStore } from "./simulation-store";

// fetch is mocked globally in tests/setup.ts

const INITIAL_STATE = {
  status: "idle",
  speed: "1x",
  scenario: "steady_state",
  tickCount: 0,
  isTickInProgress: false,
} as const;

function resetStore() {
  useSimulationStore.setState({ ...INITIAL_STATE });
}

function makeFetchResponse(): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => "",
  } as Response;
}

function getRequestBody(callIndex = 0) {
  const [, init] = vi.mocked(global.fetch).mock.calls[callIndex]!;
  return JSON.parse((init as RequestInit).body as string);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  resetStore();
});

afterEach(() => {
  // Clear the module-level clock before restoring real timers
  useSimulationStore.getState().reset();
  vi.useRealTimers();
});

// --- SPEED_MS constants ---

describe("SPEED_MS", () => {
  it("1x = 2000ms", () => expect(SPEED_MS["1x"]).toBe(2000));
  it("2x = 1000ms", () => expect(SPEED_MS["2x"]).toBe(1000));
  it("5x = 400ms", () => expect(SPEED_MS["5x"]).toBe(400));
  it("10x = 200ms", () => expect(SPEED_MS["10x"]).toBe(200));

  it("speeds are in descending order (faster = lower ms)", () => {
    expect(SPEED_MS["1x"]).toBeGreaterThan(SPEED_MS["2x"]);
    expect(SPEED_MS["2x"]).toBeGreaterThan(SPEED_MS["5x"]);
    expect(SPEED_MS["5x"]).toBeGreaterThan(SPEED_MS["10x"]);
  });
});

// --- Initial state ---

describe("initial state", () => {
  it("starts idle", () => {
    expect(useSimulationStore.getState().status).toBe("idle");
  });

  it("starts at 1x speed", () => {
    expect(useSimulationStore.getState().speed).toBe("1x");
  });

  it("starts with steady_state scenario", () => {
    expect(useSimulationStore.getState().scenario).toBe("steady_state");
  });

  it("starts with tickCount = 0", () => {
    expect(useSimulationStore.getState().tickCount).toBe(0);
  });

  it("starts with isTickInProgress = false", () => {
    expect(useSimulationStore.getState().isTickInProgress).toBe(false);
  });
});

// --- State transitions ---

describe("start()", () => {
  it("transitions status from idle to running", () => {
    useSimulationStore.getState().start();
    expect(useSimulationStore.getState().status).toBe("running");
  });

  it("resets tickCount to 0", () => {
    useSimulationStore.setState({ tickCount: 42 });
    useSimulationStore.getState().start();
    expect(useSimulationStore.getState().tickCount).toBe(0);
  });

  it("uses the provided scenario", () => {
    useSimulationStore.getState().start("machine_breakdown");
    expect(useSimulationStore.getState().scenario).toBe("machine_breakdown");
  });

  it("keeps current scenario when none provided", () => {
    useSimulationStore.setState({ scenario: "ramp_up" });
    useSimulationStore.getState().start();
    expect(useSimulationStore.getState().scenario).toBe("ramp_up");
  });

  it("uses the provided speed", () => {
    useSimulationStore.getState().start(undefined, "5x");
    expect(useSimulationStore.getState().speed).toBe("5x");
  });

  it("keeps current speed when none provided", () => {
    useSimulationStore.setState({ speed: "2x" });
    useSimulationStore.getState().start();
    expect(useSimulationStore.getState().speed).toBe("2x");
  });
});

describe("pause()", () => {
  it("transitions status from running to paused", () => {
    useSimulationStore.getState().start();
    useSimulationStore.getState().pause();
    expect(useSimulationStore.getState().status).toBe("paused");
  });

  it("does not reset tickCount", () => {
    useSimulationStore.getState().start();
    useSimulationStore.setState({ tickCount: 5 });
    useSimulationStore.getState().pause();
    expect(useSimulationStore.getState().tickCount).toBe(5);
  });
});

describe("resume()", () => {
  it("transitions status from paused to running", () => {
    useSimulationStore.getState().start();
    useSimulationStore.getState().pause();
    useSimulationStore.getState().resume();
    expect(useSimulationStore.getState().status).toBe("running");
  });

  it("preserves tickCount when resuming", () => {
    useSimulationStore.getState().start();
    useSimulationStore.setState({ tickCount: 10 });
    useSimulationStore.getState().pause();
    useSimulationStore.getState().resume();
    expect(useSimulationStore.getState().tickCount).toBe(10);
  });
});

describe("reset()", () => {
  it("transitions status to idle from running", () => {
    useSimulationStore.getState().start();
    useSimulationStore.getState().reset();
    expect(useSimulationStore.getState().status).toBe("idle");
  });

  it("transitions status to idle from paused", () => {
    useSimulationStore.getState().start();
    useSimulationStore.getState().pause();
    useSimulationStore.getState().reset();
    expect(useSimulationStore.getState().status).toBe("idle");
  });

  it("resets tickCount to 0", () => {
    useSimulationStore.getState().start();
    useSimulationStore.setState({ tickCount: 15 });
    useSimulationStore.getState().reset();
    expect(useSimulationStore.getState().tickCount).toBe(0);
  });

  it("resets isTickInProgress to false", () => {
    useSimulationStore.setState({ isTickInProgress: true });
    useSimulationStore.getState().reset();
    expect(useSimulationStore.getState().isTickInProgress).toBe(false);
  });
});

describe("setSpeed()", () => {
  it("updates the speed", () => {
    useSimulationStore.getState().setSpeed("10x");
    expect(useSimulationStore.getState().speed).toBe("10x");
  });

  it("updates speed while idle without changing status", () => {
    useSimulationStore.getState().setSpeed("5x");
    expect(useSimulationStore.getState().status).toBe("idle");
    expect(useSimulationStore.getState().speed).toBe("5x");
  });

  it("updates speed while running without changing status", () => {
    useSimulationStore.getState().start();
    useSimulationStore.getState().setSpeed("2x");
    expect(useSimulationStore.getState().status).toBe("running");
    expect(useSimulationStore.getState().speed).toBe("2x");
  });
});

describe("setScenario()", () => {
  it("updates the scenario", () => {
    useSimulationStore.getState().setScenario("quality_crisis");
    expect(useSimulationStore.getState().scenario).toBe("quality_crisis");
  });

  it("does not change status", () => {
    useSimulationStore.getState().setScenario("ramp_up");
    expect(useSimulationStore.getState().status).toBe("idle");
  });
});

describe("server sync and clock behavior", () => {
  it("posts the selected scenario and speed when starting", () => {
    useSimulationStore.getState().start("machine_breakdown", "5x");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/simulation",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(getRequestBody()).toEqual({
      action: "start",
      scenario: "machine_breakdown",
      speed: "5x",
    });
  });

  it("dispatches simulation ticks on the active cadence", async () => {
    useSimulationStore.getState().start("steady_state", "2x");
    vi.mocked(global.fetch).mockClear();

    await vi.advanceTimersByTimeAsync(SPEED_MS["2x"]);

    expect(global.fetch).toHaveBeenCalledOnce();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/simulation/tick",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(getRequestBody()).toEqual({
      scenario: "steady_state",
      tickNumber: 0,
    });
    expect(useSimulationStore.getState().tickCount).toBe(1);
    expect(useSimulationStore.getState().isTickInProgress).toBe(false);
  });

  it("does not overlap tick requests while one is still in flight", async () => {
    useSimulationStore.getState().start();
    vi.mocked(global.fetch).mockClear();

    let resolveTick: (() => void) | undefined;
    vi.mocked(global.fetch).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveTick = () => resolve(makeFetchResponse());
        }),
    );

    await vi.advanceTimersByTimeAsync(SPEED_MS["1x"]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(useSimulationStore.getState().isTickInProgress).toBe(true);

    await vi.advanceTimersByTimeAsync(SPEED_MS["1x"]);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    resolveTick?.();
    await Promise.resolve();

    expect(useSimulationStore.getState().tickCount).toBe(1);
    expect(useSimulationStore.getState().isTickInProgress).toBe(false);
  });

  it("clears the in-flight flag when a tick request fails", async () => {
    useSimulationStore.getState().start();
    vi.mocked(global.fetch).mockClear();
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("network error"));

    await vi.advanceTimersByTimeAsync(SPEED_MS["1x"]);

    expect(useSimulationStore.getState().tickCount).toBe(0);
    expect(useSimulationStore.getState().isTickInProgress).toBe(false);
  });

  it("restarts the clock immediately when speed changes mid-run", async () => {
    useSimulationStore.getState().start();
    vi.mocked(global.fetch).mockClear();

    await vi.advanceTimersByTimeAsync(SPEED_MS["1x"] - 1);
    expect(global.fetch).not.toHaveBeenCalled();

    useSimulationStore.getState().setSpeed("10x");

    await vi.advanceTimersByTimeAsync(SPEED_MS["10x"] - 1);
    expect(global.fetch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(global.fetch).toHaveBeenCalledOnce();
  });

  it("stops dispatching ticks after pause", async () => {
    useSimulationStore.getState().start();
    vi.mocked(global.fetch).mockClear();

    useSimulationStore.getState().pause();

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/simulation",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(getRequestBody()).toEqual({ action: "pause" });

    await vi.advanceTimersByTimeAsync(SPEED_MS["1x"] * 2);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("stops dispatching ticks and resets state after reset", async () => {
    useSimulationStore.getState().start();
    vi.mocked(global.fetch).mockClear();

    useSimulationStore.setState({ tickCount: 3, isTickInProgress: true });
    useSimulationStore.getState().reset();

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/simulation",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(getRequestBody()).toEqual({ action: "reset" });
    expect(useSimulationStore.getState().status).toBe("idle");
    expect(useSimulationStore.getState().tickCount).toBe(0);
    expect(useSimulationStore.getState().isTickInProgress).toBe(false);

    await vi.advanceTimersByTimeAsync(SPEED_MS["1x"] * 2);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

// --- Full lifecycle ---

describe("full lifecycle: idle → running → paused → running → idle", () => {
  it("traverses all states in order without errors", () => {
    const store = useSimulationStore.getState();

    store.start();
    expect(useSimulationStore.getState().status).toBe("running");

    store.pause();
    expect(useSimulationStore.getState().status).toBe("paused");

    useSimulationStore.getState().resume();
    expect(useSimulationStore.getState().status).toBe("running");

    useSimulationStore.getState().reset();
    expect(useSimulationStore.getState().status).toBe("idle");
    expect(useSimulationStore.getState().tickCount).toBe(0);
  });
});
