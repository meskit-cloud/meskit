import { describe, it, expect, beforeEach } from "vitest";
import { useUiStore, selectActiveMode, selectChatPanelOpen } from "./ui-store";

const INITIAL_STATE = {
  activeMode: "build" as const,
  chatPanelOpen: true,
  selectedLineId: null,
  selectedLineName: null,
  selectedWorkstationId: null,
  selectedWorkstationName: null,
  selectedPartNumberId: null,
  selectedPartNumberName: null,
  selectedRouteId: null,
  selectedRouteName: null,
  selectedProductionOrderId: null,
  selectedProductionOrderNumber: null,
};

beforeEach(() => {
  useUiStore.setState({ ...INITIAL_STATE });
});

// --- Initial state ---

describe("initial state", () => {
  it("activeMode is 'build'", () => {
    expect(useUiStore.getState().activeMode).toBe("build");
  });

  it("chatPanelOpen is true", () => {
    expect(useUiStore.getState().chatPanelOpen).toBe(true);
  });

  it("all selections are null", () => {
    const s = useUiStore.getState();
    expect(s.selectedLineId).toBeNull();
    expect(s.selectedWorkstationId).toBeNull();
    expect(s.selectedPartNumberId).toBeNull();
    expect(s.selectedRouteId).toBeNull();
    expect(s.selectedProductionOrderId).toBeNull();
  });
});

// --- setActiveMode ---

describe("setActiveMode", () => {
  it.each(["build", "configure", "run", "monitor"] as const)(
    "sets activeMode to '%s'",
    (mode) => {
      useUiStore.getState().setActiveMode(mode);
      expect(useUiStore.getState().activeMode).toBe(mode);
    },
  );
});

// --- toggleChatPanel ---

describe("toggleChatPanel", () => {
  it("flips true → false", () => {
    useUiStore.setState({ chatPanelOpen: true });
    useUiStore.getState().toggleChatPanel();
    expect(useUiStore.getState().chatPanelOpen).toBe(false);
  });

  it("flips false → true", () => {
    useUiStore.setState({ chatPanelOpen: false });
    useUiStore.getState().toggleChatPanel();
    expect(useUiStore.getState().chatPanelOpen).toBe(true);
  });

  it("double toggle returns to original state", () => {
    useUiStore.getState().toggleChatPanel();
    useUiStore.getState().toggleChatPanel();
    expect(useUiStore.getState().chatPanelOpen).toBe(true);
  });
});

// --- setChatPanelOpen ---

describe("setChatPanelOpen", () => {
  it("sets chatPanelOpen to false", () => {
    useUiStore.getState().setChatPanelOpen(false);
    expect(useUiStore.getState().chatPanelOpen).toBe(false);
  });

  it("sets chatPanelOpen to true", () => {
    useUiStore.setState({ chatPanelOpen: false });
    useUiStore.getState().setChatPanelOpen(true);
    expect(useUiStore.getState().chatPanelOpen).toBe(true);
  });
});

// --- selectLine ---

describe("selectLine", () => {
  it("sets selectedLineId and selectedLineName", () => {
    useUiStore.getState().selectLine("line-1", "Line A");
    const s = useUiStore.getState();
    expect(s.selectedLineId).toBe("line-1");
    expect(s.selectedLineName).toBe("Line A");
  });

  it("clears workstation selection when a new line is selected", () => {
    useUiStore.setState({
      selectedWorkstationId: "ws-1",
      selectedWorkstationName: "WS-1",
    });
    useUiStore.getState().selectLine("line-2", "Line B");
    const s = useUiStore.getState();
    expect(s.selectedWorkstationId).toBeNull();
    expect(s.selectedWorkstationName).toBeNull();
  });

  it("sets name to null when name is not provided", () => {
    useUiStore.getState().selectLine("line-1");
    expect(useUiStore.getState().selectedLineName).toBeNull();
  });

  it("deselects the line when called with null", () => {
    useUiStore.setState({ selectedLineId: "line-1", selectedLineName: "Line A" });
    useUiStore.getState().selectLine(null);
    expect(useUiStore.getState().selectedLineId).toBeNull();
    expect(useUiStore.getState().selectedLineName).toBeNull();
  });

  it("does NOT clear part number or route when selecting a line", () => {
    useUiStore.setState({ selectedPartNumberId: "pn-1", selectedRouteId: "r-1" });
    useUiStore.getState().selectLine("line-1");
    expect(useUiStore.getState().selectedPartNumberId).toBe("pn-1");
    expect(useUiStore.getState().selectedRouteId).toBe("r-1");
  });
});

// --- selectWorkstation ---

describe("selectWorkstation", () => {
  it("sets selectedWorkstationId and selectedWorkstationName", () => {
    useUiStore.getState().selectWorkstation("ws-1", "Assembly");
    const s = useUiStore.getState();
    expect(s.selectedWorkstationId).toBe("ws-1");
    expect(s.selectedWorkstationName).toBe("Assembly");
  });

  it("does NOT clear the selected line", () => {
    useUiStore.setState({ selectedLineId: "line-1" });
    useUiStore.getState().selectWorkstation("ws-1", "WS");
    expect(useUiStore.getState().selectedLineId).toBe("line-1");
  });
});

// --- selectPartNumber ---

describe("selectPartNumber", () => {
  it("sets selectedPartNumberId and name", () => {
    useUiStore.getState().selectPartNumber("pn-1", "Widget A");
    expect(useUiStore.getState().selectedPartNumberId).toBe("pn-1");
    expect(useUiStore.getState().selectedPartNumberName).toBe("Widget A");
  });

  it("clears route selection when a new part number is selected", () => {
    useUiStore.setState({ selectedRouteId: "r-1", selectedRouteName: "Main Route" });
    useUiStore.getState().selectPartNumber("pn-2", "Widget B");
    expect(useUiStore.getState().selectedRouteId).toBeNull();
    expect(useUiStore.getState().selectedRouteName).toBeNull();
  });

  it("does NOT clear line or workstation when selecting a part number", () => {
    useUiStore.setState({ selectedLineId: "line-1", selectedWorkstationId: "ws-1" });
    useUiStore.getState().selectPartNumber("pn-1");
    expect(useUiStore.getState().selectedLineId).toBe("line-1");
    expect(useUiStore.getState().selectedWorkstationId).toBe("ws-1");
  });
});

// --- selectRoute ---

describe("selectRoute", () => {
  it("sets selectedRouteId and name", () => {
    useUiStore.getState().selectRoute("r-1", "Main Route");
    expect(useUiStore.getState().selectedRouteId).toBe("r-1");
    expect(useUiStore.getState().selectedRouteName).toBe("Main Route");
  });

  it("does NOT clear part number when selecting a route", () => {
    useUiStore.setState({ selectedPartNumberId: "pn-1" });
    useUiStore.getState().selectRoute("r-1");
    expect(useUiStore.getState().selectedPartNumberId).toBe("pn-1");
  });
});

// --- selectProductionOrder ---

describe("selectProductionOrder", () => {
  it("sets selectedProductionOrderId and orderNumber", () => {
    useUiStore.getState().selectProductionOrder("order-1", "PO-0001");
    expect(useUiStore.getState().selectedProductionOrderId).toBe("order-1");
    expect(useUiStore.getState().selectedProductionOrderNumber).toBe("PO-0001");
  });

  it("deselects when called with null", () => {
    useUiStore.setState({ selectedProductionOrderId: "order-1" });
    useUiStore.getState().selectProductionOrder(null);
    expect(useUiStore.getState().selectedProductionOrderId).toBeNull();
  });
});

// --- clearSelections ---

describe("clearSelections", () => {
  it("resets all selection fields to null", () => {
    useUiStore.setState({
      selectedLineId: "line-1",
      selectedLineName: "Line A",
      selectedWorkstationId: "ws-1",
      selectedWorkstationName: "WS-A",
      selectedPartNumberId: "pn-1",
      selectedPartNumberName: "Widget",
      selectedRouteId: "r-1",
      selectedRouteName: "Route",
      selectedProductionOrderId: "order-1",
      selectedProductionOrderNumber: "PO-0001",
    });

    useUiStore.getState().clearSelections();

    const s = useUiStore.getState();
    expect(s.selectedLineId).toBeNull();
    expect(s.selectedLineName).toBeNull();
    expect(s.selectedWorkstationId).toBeNull();
    expect(s.selectedWorkstationName).toBeNull();
    expect(s.selectedPartNumberId).toBeNull();
    expect(s.selectedPartNumberName).toBeNull();
    expect(s.selectedRouteId).toBeNull();
    expect(s.selectedRouteName).toBeNull();
    expect(s.selectedProductionOrderId).toBeNull();
    expect(s.selectedProductionOrderNumber).toBeNull();
  });

  it("does NOT reset activeMode or chatPanelOpen", () => {
    useUiStore.setState({ activeMode: "run", chatPanelOpen: false });
    useUiStore.getState().clearSelections();
    expect(useUiStore.getState().activeMode).toBe("run");
    expect(useUiStore.getState().chatPanelOpen).toBe(false);
  });
});

// --- Selectors ---

describe("selectors", () => {
  it("selectActiveMode returns the current mode", () => {
    useUiStore.setState({ activeMode: "monitor" });
    expect(selectActiveMode(useUiStore.getState())).toBe("monitor");
  });

  it("selectChatPanelOpen returns the panel state", () => {
    useUiStore.setState({ chatPanelOpen: false });
    expect(selectChatPanelOpen(useUiStore.getState())).toBe(false);
  });
});
