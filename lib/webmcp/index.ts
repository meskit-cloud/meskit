// Barrel export for the WebMCP adapter module.

export { executeWebMCPAction } from "./adapter";
export { buildCatalog, getActionsForPage } from "./catalog";
export { isActionAllowed, getActionsForMode } from "./scope";
export type {
  WebMCPAction,
  WebMCPMode,
  WebMCPExecuteResult,
  WebMCPCatalog,
} from "./types";
