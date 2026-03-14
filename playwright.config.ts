import { defineConfig } from "@playwright/test";
import fs from "node:fs";

// Load .env.local so E2E_* vars are available to tests without requiring
// the caller to export them manually on the command line.
if (fs.existsSync(".env.local")) {
  const lines = fs.readFileSync(".env.local", "utf8").split("\n");
  for (const line of lines) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) process.env[match[1]] ??= match[2];
  }
}

const port = Number(process.env.PLAYWRIGHT_PORT ?? "3001");
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  outputDir: "output/playwright/test-results",
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        stdout: "pipe",
        stderr: "pipe",
        timeout: 120_000,
      },
  projects: [
    // Step 1: Log in once and save auth state
    { name: "setup", testMatch: /auth\.setup\.ts/ },

    // Step 2a: Unauthenticated smoke tests
    { name: "smoke", testMatch: /login-smoke\.spec\.ts/ },

    // Step 2b: NL API tests — API-level only, no browser auth required
    { name: "nl-api", testMatch: /m5-nl-api\.spec\.ts/ },

    // Step 2c: Authenticated Monitor Mode UI tests
    {
      name: "m5-ui",
      use: { storageState: "playwright/.auth/user.json" },
      dependencies: ["setup"],
      testMatch: /m5-monitor\.spec\.ts/,
    },

    // Step 2d: Authenticated M6 Settings + Org tests
    {
      name: "m6-org",
      use: { storageState: "playwright/.auth/user.json" },
      dependencies: ["setup"],
      testMatch: /m6-org\.spec\.ts/,
    },

    // Step 2e: M7 MCP Server + Tool Registration API tests (no browser auth required)
    { name: "m7-mcp", testMatch: /m7-mcp\.spec\.ts/ },
  ],
});
