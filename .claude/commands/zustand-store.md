# Zustand Store Generator

Generate a Zustand store for MESkit's ephemeral UI state.

## Input

$ARGUMENTS — store domain (e.g., "simulation state")

## Instructions

Parse the store domain from the input. Generate a store file at:

```
lib/stores/{domain}-store.ts
```

Convert the domain name to kebab-case for the filename.

### Architecture Rule

Zustand manages **ephemeral UI state only**. All manufacturing data lives in Supabase. The frontend subscribes to Supabase Realtime channels and updates Zustand stores reactively.

Do NOT put manufacturing data (units, lines, machines, quality events) in Zustand stores. Instead, store UI concerns like selections, panel visibility, filter states, and chat history.

### Store Implementation Pattern

```typescript
// lib/stores/{domain}-store.ts
import { create } from "zustand";

// --- State ---

interface {Domain}State {
  // State fields with explicit types
}

// --- Actions ---

interface {Domain}Actions {
  // Action methods
}

type {Domain}Store = {Domain}State & {Domain}Actions;

// --- Store ---

export const use{Domain}Store = create<{Domain}Store>((set, get) => ({
  // Initial state
  // ...

  // Actions
  // ...
}));

// --- Selectors ---

export const select{Thing} = (state: {Domain}Store) => state.{thing};
```

### Known Store Domains

Generate stores matching these domains from the PRD when the input matches:

**Mode Store** — `lib/stores/mode-store.ts`
- Tracks active sidebar mode (Build / Configure / Run / Monitor)
- Tracks selected entities (line, workstation, part number, route)
```typescript
interface ModeState {
  activeMode: "build" | "configure" | "run" | "monitor";
  selectedLineId: string | null;
  selectedWorkstationId: string | null;
  selectedPartNumberId: string | null;
  selectedRouteId: string | null;
}
interface ModeActions {
  setActiveMode: (mode: ModeState["activeMode"]) => void;
  selectLine: (id: string | null) => void;
  selectWorkstation: (id: string | null) => void;
  selectPartNumber: (id: string | null) => void;
  selectRoute: (id: string | null) => void;
  clearSelections: () => void;
}
```

**Chat Store** — `lib/stores/chat-store.ts`
- Chat panel state, message history, active agent
```typescript
interface ChatState {
  isOpen: boolean;
  activeAgent: "operator_assistant" | "quality_analyst" | "planner";
  messages: ChatMessage[];
  isStreaming: boolean;
  conversationId: string | null;
}
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  timestamp: string;
}
interface ChatActions {
  togglePanel: () => void;
  setActiveAgent: (agent: ChatState["activeAgent"]) => void;
  addMessage: (message: ChatMessage) => void;
  setStreaming: (streaming: boolean) => void;
  clearMessages: () => void;
  setConversationId: (id: string | null) => void;
}
```

**Panel Store** — `lib/stores/panel-store.ts`
- UI panel visibility and layout
```typescript
interface PanelState {
  chatPanelOpen: boolean;
  tickerExpanded: boolean;
  detailPanelOpen: boolean;
  detailPanelContent: "unit" | "machine" | "workstation" | null;
}
interface PanelActions {
  toggleChatPanel: () => void;
  toggleTicker: () => void;
  openDetailPanel: (content: PanelState["detailPanelContent"]) => void;
  closeDetailPanel: () => void;
}
```

**Simulation Store** — `lib/stores/simulation-store.ts`
- Auto-run engine state
```typescript
interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  autoRun: boolean;
  cycleIntervalMs: number;
  yieldRate: number;
  unitCount: number;
  completedCount: number;
  scrappedCount: number;
}
interface SimulationActions {
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  toggleAutoRun: () => void;
  setCycleInterval: (ms: number) => void;
  setYieldRate: (rate: number) => void;
  incrementCompleted: () => void;
  incrementScrapped: () => void;
  reset: () => void;
}
```

### Conventions

- One store per domain — don't combine unrelated state
- Export the hook as `use{Domain}Store`
- Export selector functions for derived state (e.g., `selectIsSimulationActive`)
- Actions use `set` for simple state updates, `get` when reading current state
- No async operations in stores — async lives in the tool layer
- Keep stores small and focused — if a store grows beyond ~15 fields, split it

If the domain matches a known store above, generate it exactly. If it's a new domain, follow the same conventions and note that manufacturing data should stay in Supabase.
