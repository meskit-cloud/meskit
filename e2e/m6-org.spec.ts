/**
 * M6 — Multi-Tenancy + Org + Settings Playwright tests
 *
 * Covers: M6_test_guide.md §3 (Org Settings), §4 (Team), §5 (Plants),
 *         §6.5 (API Key org scoping), §7.1 (Owner role UI), §13 (Persistence)
 *
 * Requires: E2E_EMAIL + E2E_PASSWORD (via auth.setup.ts / .env.local)
 *
 * Tests that require multiple users/orgs (invite flow, cross-org isolation)
 * are covered by manual test guide sections and are not automated here.
 */
import { test, expect } from "@playwright/test";

// ─── §7.1 Owner View — Role-Based Sidebar + Settings Nav ─────────────────

test.describe("7.1 Owner view — sidebar and settings navigation", () => {
  test("sidebar shows all four mode buttons", async ({ page }) => {
    await page.goto("/build");
    for (const mode of ["Build", "Configure", "Run", "Monitor"]) {
      await expect(
        page.getByRole("button", { name: mode, exact: true }),
      ).toBeVisible();
    }
  });

  test("settings sidebar nav shows all four tabs", async ({ page }) => {
    await page.goto("/settings");
    for (const label of ["API Keys", "Organization", "Team", "Plants"]) {
      await expect(
        page.getByRole("link", { name: label, exact: true }),
      ).toBeVisible();
    }
  });

  test("API Keys nav link is active on /settings", async ({ page }) => {
    await page.goto("/settings");
    await expect(
      page.getByRole("link", { name: "API Keys", exact: true }),
    ).toHaveClass(/text-accent/);
  });

  test("Organization nav link is active on /settings/org", async ({ page }) => {
    await page.goto("/settings/org");
    await expect(
      page.getByRole("link", { name: "Organization", exact: true }),
    ).toHaveClass(/text-accent/);
  });

  test("Team nav link is active on /settings/team", async ({ page }) => {
    await page.goto("/settings/team");
    await expect(
      page.getByRole("link", { name: "Team", exact: true }),
    ).toHaveClass(/text-accent/);
  });

  test("Plants nav link is active on /settings/plants", async ({ page }) => {
    await page.goto("/settings/plants");
    await expect(
      page.getByRole("link", { name: "Plants", exact: true }),
    ).toHaveClass(/text-accent/);
  });
});

// ─── §6.5 API Keys page ───────────────────────────────────────────────────

test.describe("6.5 API Keys page", () => {
  test("loads /settings with API Keys heading", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/settings/);
    await expect(
      page.getByRole("heading", { name: "API Keys", exact: true }),
    ).toBeVisible();
  });

  test("shows key name input and Create button", async ({ page }) => {
    await page.goto("/settings");
    await expect(
      page.getByPlaceholder("Key name (e.g., CI Pipeline)"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create", exact: true }),
    ).toBeVisible();
  });

  test("shows existing keys or empty state", async ({ page }) => {
    await page.goto("/settings");
    // Either a key row or the empty-state message
    const hasKeys = await page
      .getByText("No API keys yet")
      .isVisible()
      .catch(() => false);
    if (hasKeys) {
      await expect(page.getByText("No API keys yet")).toBeVisible();
    } else {
      // At least one key row is rendered inside the list
      await expect(page.locator(".divide-y > div").first()).toBeVisible();
    }
  });

  test("can create an API key and see the revealed key", async ({ page }) => {
    await page.goto("/settings");
    const uniqueName = `e2e-m6-${Date.now()}`;
    await page
      .getByPlaceholder("Key name (e.g., CI Pipeline)")
      .fill(uniqueName);
    await page.getByRole("button", { name: "Create", exact: true }).click();
    // Revealed key banner appears
    await expect(
      page.getByText("copy it now", { exact: false }),
    ).toBeVisible({ timeout: 10_000 });
    // Key value starts with mk_
    await expect(
      page.locator("code").filter({ hasText: /^mk_/ }),
    ).toBeVisible();
  });
});

// ─── §3 Organization Settings ─────────────────────────────────────────────

test.describe("3.1 Organization settings page", () => {
  test("loads /settings/org with Organization heading", async ({ page }) => {
    await page.goto("/settings/org");
    await expect(page).toHaveURL(/\/settings\/org/);
    await expect(
      page.getByRole("heading", { name: "Organization", exact: true }),
    ).toBeVisible();
  });

  test("shows org name field or migration-pending banner", async ({ page }) => {
    await page.goto("/settings/org");
    const migrationPending = await page
      .getByText("Multi-tenancy migration not yet applied", { exact: false })
      .isVisible()
      .catch(() => false);

    if (migrationPending) {
      await expect(
        page.getByText("Multi-tenancy migration not yet applied", {
          exact: false,
        }),
      ).toBeVisible();
    } else {
      // Form fields present
      await expect(
        page.getByText("Organization name", { exact: true }),
      ).toBeVisible();
      await expect(page.getByText("URL slug", { exact: true })).toBeVisible();
    }
  });

  test("shows Plan tier or migration-pending banner", async ({ page }) => {
    await page.goto("/settings/org");
    const migrationPending = await page
      .getByText("Multi-tenancy migration not yet applied", { exact: false })
      .isVisible()
      .catch(() => false);

    if (!migrationPending) {
      await expect(page.getByText("Plan", { exact: true })).toBeVisible();
      const hasTier =
        (await page.getByText("starter").isVisible().catch(() => false)) ||
        (await page.getByText("pro").isVisible().catch(() => false)) ||
        (await page.getByText("enterprise").isVisible().catch(() => false));
      expect(hasTier).toBe(true);
    }
  });

  test("shows Created date or migration-pending banner", async ({ page }) => {
    await page.goto("/settings/org");
    const migrationPending = await page
      .getByText("Multi-tenancy migration not yet applied", { exact: false })
      .isVisible()
      .catch(() => false);

    if (!migrationPending) {
      await expect(page.getByText("Created", { exact: true })).toBeVisible();
    }
  });
});

// ─── §4 Team Management ───────────────────────────────────────────────────

test.describe("4.1 Team management page", () => {
  test("loads /settings/team with Team heading", async ({ page }) => {
    await page.goto("/settings/team");
    await expect(page).toHaveURL(/\/settings\/team/);
    await expect(
      page.getByRole("heading", { name: "Team", exact: true }),
    ).toBeVisible();
  });

  test("shows current user with '(you)' or migration-pending banner", async ({
    page,
  }) => {
    await page.goto("/settings/team");
    const migrationPending = await page
      .getByText("Multi-tenancy migration not yet applied", { exact: false })
      .isVisible()
      .catch(() => false);

    if (migrationPending) {
      await expect(
        page.getByText("Multi-tenancy migration not yet applied", {
          exact: false,
        }),
      ).toBeVisible();
    } else {
      // At least one member — the current user — with "(you)" label
      await expect(page.getByText("(you)", { exact: true })).toBeVisible();
    }
  });

  test("shows Add member form for owner when migrated", async ({ page }) => {
    await page.goto("/settings/team");
    const migrationPending = await page
      .getByText("Multi-tenancy migration not yet applied", { exact: false })
      .isVisible()
      .catch(() => false);

    if (!migrationPending) {
      await expect(
        page.getByText("Add member", { exact: true }),
      ).toBeVisible();
      await expect(page.getByPlaceholder("User ID")).toBeVisible();
    }
  });

  test("shows Members count header or migration-pending banner", async ({
    page,
  }) => {
    await page.goto("/settings/team");
    const migrationPending = await page
      .getByText("Multi-tenancy migration not yet applied", { exact: false })
      .isVisible()
      .catch(() => false);

    if (!migrationPending) {
      await expect(
        page.getByText(/Members \(\d+\)/, { exact: false }),
      ).toBeVisible();
    }
  });
});

// ─── §5 Plant Management ──────────────────────────────────────────────────

test.describe("5.1 Plant management page", () => {
  test("loads /settings/plants with Plants heading", async ({ page }) => {
    await page.goto("/settings/plants");
    await expect(page).toHaveURL(/\/settings\/plants/);
    await expect(
      page.getByRole("heading", { name: "Plants", exact: true }),
    ).toBeVisible();
  });

  test("shows plants list or migration-pending banner", async ({ page }) => {
    await page.goto("/settings/plants");
    const migrationPending = await page
      .getByText("Multi-tenancy migration not yet applied", { exact: false })
      .isVisible()
      .catch(() => false);

    if (migrationPending) {
      await expect(
        page.getByText("Multi-tenancy migration not yet applied", {
          exact: false,
        }),
      ).toBeVisible();
    } else {
      // Shows "Plants (n)" count header
      await expect(
        page.getByText(/Plants \(\d+\)/, { exact: false }),
      ).toBeVisible();
    }
  });

  test("shows Add plant form for owner when migrated", async ({ page }) => {
    await page.goto("/settings/plants");
    const migrationPending = await page
      .getByText("Multi-tenancy migration not yet applied", { exact: false })
      .isVisible()
      .catch(() => false);

    if (!migrationPending) {
      await expect(
        page.getByText("Add plant", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByPlaceholder("Plant name (required)"),
      ).toBeVisible();
    }
  });

  test("can create a new plant when migrated", async ({ page }) => {
    await page.goto("/settings/plants");
    const migrationPending = await page
      .getByText("Multi-tenancy migration not yet applied", { exact: false })
      .isVisible()
      .catch(() => false);

    if (migrationPending) {
      test.skip();
      return;
    }

    const uniqueName = `E2E Plant ${Date.now()}`;
    await page.getByPlaceholder("Plant name (required)").fill(uniqueName);
    await page
      .getByRole("button", { name: "Create", exact: true })
      .click();
    await expect(page.getByText("Plant created", { exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(uniqueName, { exact: true })).toBeVisible();
  });
});

// ─── §13 Persistence ──────────────────────────────────────────────────────

test.describe("13. Settings persistence after hard refresh", () => {
  test("hard refresh on /settings stays authenticated", async ({ page }) => {
    await page.goto("/settings");
    await page.reload();
    await expect(page).toHaveURL(/\/settings/);
    await expect(
      page.getByRole("heading", { name: "API Keys", exact: true }),
    ).toBeVisible();
  });

  test("hard refresh on /settings/org stays authenticated", async ({
    page,
  }) => {
    await page.goto("/settings/org");
    await page.reload();
    await expect(page).toHaveURL(/\/settings\/org/);
    await expect(
      page.getByRole("heading", { name: "Organization", exact: true }),
    ).toBeVisible();
  });

  test("navigating across all settings tabs preserves auth", async ({
    page,
  }) => {
    await page.goto("/settings");
    await page.getByRole("link", { name: "Organization", exact: true }).click();
    await expect(page).toHaveURL(/\/settings\/org/);
    await page.getByRole("link", { name: "Team", exact: true }).click();
    await expect(page).toHaveURL(/\/settings\/team/);
    await page.getByRole("link", { name: "Plants", exact: true }).click();
    await expect(page).toHaveURL(/\/settings\/plants/);
    await expect(
      page.getByRole("heading", { name: "Plants", exact: true }),
    ).toBeVisible();
    // Return to API keys
    await page.getByRole("link", { name: "API Keys", exact: true }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(
      page.getByRole("heading", { name: "API Keys", exact: true }),
    ).toBeVisible();
  });
});
