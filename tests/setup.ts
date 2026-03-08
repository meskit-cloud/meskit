import { vi } from "vitest";

// Mock fetch globally so store actions and webhook dispatches don't hit the network.
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: async () => ({}),
  text: async () => "",
});
