"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Wrench, ChevronDown } from "lucide-react";
import { useChatStore, type ChatMessage } from "@/lib/stores/chat-store";
import { useUiStore } from "@/lib/stores/ui-store";

const topicOptions = [
  { key: "operator_assistant" as const, label: "Production" },
  { key: "planner" as const, label: "Planning" },
] as const;

export function ChatPanel() {
  const [input, setInput] = useState("");
  const [topicMenuOpen, setTopicMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    activeAgent,
    setActiveAgent,
    messages,
    isStreaming,
    addMessage,
    appendToLastMessage,
    addToolCallToLastMessage,
    setStreaming,
  } = useChatStore();
  const {
    activeMode,
    selectedLineId,
    selectedLineName,
    selectedWorkstationId,
    selectedWorkstationName,
    selectedPartNumberId,
    selectedPartNumberName,
    selectedRouteId,
    selectedRouteName,
    selectedProductionOrderId,
    selectedProductionOrderNumber,
  } = useUiStore();
  const chatPanelOpen = useUiStore((s) => s.chatPanelOpen);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isStreaming) {
      inputRef.current?.focus();
    }
  }, [isStreaming]);

  if (!chatPanelOpen) return null;

  async function handleSend() {
    if (!input.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    addMessage(userMessage);
    setInput("");

    // Create assistant message placeholder
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };
    addMessage(assistantMessage);
    setStreaming(true);

    try {
      const allMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages,
          agent: activeAgent,
          context: {
            activeMode,
            selectedLineId,
            selectedLineName,
            selectedWorkstationId,
            selectedWorkstationName,
            selectedPartNumberId,
            selectedPartNumberName,
            selectedRouteId,
            selectedRouteName,
            selectedProductionOrderId,
            selectedProductionOrderNumber,
            activeProductionRun: null,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        appendToLastMessage(err.error || "Something went wrong");
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7);
          } else if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));

            switch (currentEvent) {
              case "text":
                appendToLastMessage(data.text);
                break;
              case "tool_call":
                addToolCallToLastMessage({
                  name: data.name,
                  input: data.input,
                });
                break;
              case "tool_result":
                // Update last tool call with result
                addToolCallToLastMessage({
                  name: data.name,
                  input: {},
                  result: data.result,
                });
                break;
              case "error":
                appendToLastMessage(`\n\nError: ${data.error}`);
                break;
            }
          }
        }
      }
    } catch {
      appendToLastMessage("Failed to connect to MESkit");
    } finally {
      setStreaming(false);
    }
  }

  const currentTopicLabel =
    topicOptions.find((a) => a.key === activeAgent)?.label ?? "Production";

  return (
    <aside className="w-80 bg-bg-surface border-l border-border flex flex-col shrink-0">
      {/* Header + topic selector */}
      <div className="px-3 py-2 border-b border-border relative">
        <div className="flex items-center gap-2 text-sm font-medium text-agent mb-1">
          <Bot size={16} />
          <span>Ask MESkit</span>
        </div>
        <button
          onClick={() => setTopicMenuOpen(!topicMenuOpen)}
          className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors w-full"
        >
          <span>Ask about: {currentTopicLabel}</span>
          <ChevronDown size={12} className="ml-auto" />
        </button>

        {topicMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-bg-surface border border-border rounded-b-lg shadow-lg z-10">
            {topicOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => {
                  setActiveAgent(option.key);
                  setTopicMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-bg-app transition-colors ${
                  activeAgent === option.key
                    ? "text-agent font-medium"
                    : "text-text-secondary"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-text-secondary text-xs mt-8">
            <Bot size={24} className="mx-auto mb-2 text-agent" />
            <p>Ask anything about your shop floor.</p>
            <p className="mt-1 text-text-secondary/60">
              &quot;Create a line called Assembly&quot;
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="px-3 py-2 border-t border-border flex gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your shop floor..."
          disabled={isStreaming}
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg-app text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-agent/30 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="p-2 rounded-lg bg-agent text-white hover:bg-agent/90 disabled:opacity-50 transition-colors"
        >
          <Send size={16} />
        </button>
      </form>
    </aside>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-agent/10 flex items-center justify-center shrink-0 mt-0.5">
          <Bot size={14} className="text-agent" />
        </div>
      )}

      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-accent text-white"
            : "bg-bg-app text-text-primary"
        }`}
      >
        {message.content && (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.toolCalls.map((tc, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-xs opacity-70"
              >
                <Wrench size={12} />
                <span className="font-mono">{tc.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
          <User size={14} className="text-accent" />
        </div>
      )}
    </div>
  );
}
