// WebMCP type definitions for browser-based automation

export type WebMCPMode = "build" | "configure" | "run" | "monitor" | "settings";

export interface WebMCPAction {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
  destructive: boolean;
  mode: WebMCPMode;
}

export interface WebMCPExecuteResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface WebMCPCatalog {
  version: string;
  actions: WebMCPAction[];
}
