import { create } from "zustand";

// --- Types ---

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: { name: string; input: unknown; result?: unknown }[];
  timestamp: string;
}

// --- State ---

interface ChatState {
  isOpen: boolean;
  activeAgent: "operator_assistant" | "quality_analyst" | "planner";
  messages: ChatMessage[];
  isStreaming: boolean;
  conversationId: string | null;
}

// --- Actions ---

interface ChatActions {
  setActiveAgent: (agent: ChatState["activeAgent"]) => void;
  addMessage: (message: ChatMessage) => void;
  appendToLastMessage: (text: string) => void;
  addToolCallToLastMessage: (toolCall: {
    name: string;
    input: unknown;
    result?: unknown;
  }) => void;
  setStreaming: (streaming: boolean) => void;
  clearMessages: () => void;
  setConversationId: (id: string | null) => void;
}

type ChatStore = ChatState & ChatActions;

// --- Store ---

export const useChatStore = create<ChatStore>((set) => ({
  isOpen: true,
  activeAgent: "operator_assistant",
  messages: [],
  isStreaming: false,
  conversationId: null,

  setActiveAgent: (agent) => set({ activeAgent: agent, messages: [] }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  appendToLastMessage: (text) =>
    set((state) => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (last && last.role === "assistant") {
        messages[messages.length - 1] = {
          ...last,
          content: last.content + text,
        };
      }
      return { messages };
    }),
  addToolCallToLastMessage: (toolCall) =>
    set((state) => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (last && last.role === "assistant") {
        messages[messages.length - 1] = {
          ...last,
          toolCalls: [...(last.toolCalls || []), toolCall],
        };
      }
      return { messages };
    }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  clearMessages: () => set({ messages: [] }),
  setConversationId: (id) => set({ conversationId: id }),
}));
