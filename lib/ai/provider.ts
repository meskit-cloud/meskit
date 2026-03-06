import type { LanguageModel } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";

type Provider = "google" | "openai" | "anthropic" | "openrouter";

const DEFAULT_MODELS: Record<Provider, string> = {
  google: "gemini-2.0-flash",
  openai: "gpt-4o",
  anthropic: "claude-sonnet-4-20250514",
  openrouter: "qwen/qwen3.5-flash-02-23",
};

export function getModel(): LanguageModel {
  const provider = (process.env.LLM_PROVIDER || "google") as Provider;
  const modelId = process.env.LLM_MODEL || DEFAULT_MODELS[provider];

  switch (provider) {
    case "google": {
      const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
      });
      return google(modelId);
    }
    case "openai": {
      const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      return openai(modelId);
    }
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      return anthropic(modelId);
    }
    case "openrouter": {
      const openrouter = createOpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
      });
      return openrouter.chat(modelId);
    }
    default:
      throw new Error(`Unknown LLM_PROVIDER: ${provider}. Use "google", "openai", "anthropic", or "openrouter".`);
  }
}
