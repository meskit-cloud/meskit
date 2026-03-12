/**
 * M5 — Monitor Mode Playwright tests
 *
 * Covers: M5_test_guide.md §2 (Monitor Mode UI) and §3 (Production Planner topic selector)
 *
 * Requires: E2E_EMAIL + E2E_PASSWORD env vars (set via auth.setup.ts)
 */
import { test, expect } from "@playwright/test";

// ─── 2.1  Page Load ──────────────────────────────────────────────────────────

test.describe("2.1 Monitor Mode page load", () => {
  test("navigates to /monitor without error", async ({ page }) => {
    await page.goto("/monitor");
    await expect(page).toHaveURL(/\/monitor/);
    // No JS error dialog
    page.on("dialog", (d) => d.dismiss());
  });

  test("sidebar highlights the Monitor button", async ({ page }) => {
    await page.goto("/monitor");
    // The Monitor sidebar button should have active styling
    const monitorBtn = page.getByRole("button", { name: /Monitor/i });
    await expect(monitorBtn).toBeVisible();
    await expect(monitorBtn).toHaveClass(/text-accent/);
  });

  test("three-panel layout is visible", async ({ page }) => {
    await page.goto("/monitor");
    // Left panel: Production Orders
    await expect(
      page.getByText("Production Orders", { exact: false }),
    ).toBeVisible();
    // Center panel: time range selector
    await expect(page.getByText("Range:", { exact: false })).toBeVisible();
    // Right panel: Live WIP
    await expect(
      page.getByText("Live WIP", { exact: false }),
    ).toBeVisible();
  });
});

// ─── 2.2  Production Order Tracker (Left Panel) ───────────────────────────────

test.describe("2.2 Production Order Tracker", () => {
  test("shows empty state or a list of orders", async ({ page }) => {
    await page.goto("/monitor");

    const hasOrders = await page
      .locator("button")
      .filter({ hasText: /PO-/ })
      .count()
      .then((n) => n > 0);

    if (hasOrders) {
      // Orders are listed — each should have a progress percentage
      const firstOrder = page
        .locator("button")
        .filter({ hasText: /PO-/ })
        .first();
      await expect(firstOrder).toBeVisible();
      // Should contain a completion percentage
      await expect(firstOrder).toContainText(/%/);
    } else {
      // Empty state
      await expect(page.getByText("No production orders")).toBeVisible();
    }
  });

  test("clicking an order selects it (visual feedback)", async ({ page }) => {
    await page.goto("/monitor");

    const orderBtns = page.locator("button").filter({ hasText: /PO-/ });
    const count = await orderBtns.count();
    if (count === 0) {
      test.skip();
      return;
    }

    const firstOrder = orderBtns.first();
    await firstOrder.click();
    // After clicking, the button should have selection styling
    await expect(firstOrder).toHaveClass(/bg-accent/);
  });
});

// ─── 2.3  Time Range Selector ─────────────────────────────────────────────────

test.describe("2.3 Time range selector", () => {
  test("renders all five range buttons", async ({ page }) => {
    await page.goto("/monitor");
    for (const label of ["Today", "8h", "24h", "7d", "30d"]) {
      await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
    }
  });

  test("selected range button has active styling", async ({ page }) => {
    await page.goto("/monitor");
    // Default is last_24_hours → '24h' button should be active
    const active = page.getByRole("button", { name: "24h", exact: true });
    await expect(active).toHaveClass(/text-accent/);
  });

  test("clicking a range button activates it", async ({ page }) => {
    await page.goto("/monitor");
    const btn = page.getByRole("button", { name: "7d", exact: true });
    await btn.click();
    await expect(btn).toHaveClass(/text-accent/);
  });
});

// ─── 2.3  Throughput Chart ────────────────────────────────────────────────────

test.describe("2.3 Throughput Chart", () => {
  test("shows Throughput section header", async ({ page }) => {
    await page.goto("/monitor");
    await expect(page.getByText("Throughput", { exact: false })).toBeVisible();
  });

  test("shows chart data or empty state", async ({ page }) => {
    await page.goto("/monitor");
    // Either recharts SVG or the empty-state text
    const hasChart = await page.locator("svg").count().then((n) => n > 0);
    if (!hasChart) {
      await expect(page.getByText("No throughput data")).toBeVisible();
    }
    // If there's a chart, just confirm the section renders without error
  });
});

// ─── 2.4  Yield Chart ─────────────────────────────────────────────────────────

test.describe("2.4 Yield Chart", () => {
  test("shows 'Yield by Workstation' header", async ({ page }) => {
    await page.goto("/monitor");
    await expect(
      page.getByText("Yield by Workstation", { exact: false }),
    ).toBeVisible();
  });

  test("shows chart or empty state", async ({ page }) => {
    await page.goto("/monitor");
    const emptyVisible = await page.getByText("No yield data").isVisible().catch(() => false);
    // Either chart exists or empty state is shown — no error state
    const hasSvg = await page.locator("svg").count().then((n) => n > 0);
    expect(emptyVisible || hasSvg).toBe(true);
  });
});

// ─── 2.5  OEE Gauge ──────────────────────────────────────────────────────────

test.describe("2.5 OEE Gauge", () => {
  test("shows OEE section header", async ({ page }) => {
    await page.goto("/monitor");
    await expect(page.getByText("OEE", { exact: true })).toBeVisible();
  });

  test("shows factor labels or no-data message", async ({ page }) => {
    await page.goto("/monitor");
    const hasData = await page.getByText("Availability").isVisible().catch(() => false);
    const noData = await page.getByText("No OEE data").isVisible().catch(() => false);
    expect(hasData || noData).toBe(true);
  });

  test("shows combined OEE % when data is present", async ({ page }) => {
    await page.goto("/monitor");
    const hasData = await page.getByText("Availability").isVisible().catch(() => false);
    if (!hasData) {
      test.skip();
      return;
    }
    // Combined OEE value should render (a number followed by %)
    await expect(page.getByText("Overall Equipment Effectiveness")).toBeVisible();
    await expect(page.getByText("Performance")).toBeVisible();
    await expect(page.getByText("Quality")).toBeVisible();
  });
});

// ─── 2.6  Unit Lookup ────────────────────────────────────────────────────────

test.describe("2.6 Unit Lookup", () => {
  test("shows Unit Lookup header and input", async ({ page }) => {
    await page.goto("/monitor");
    await expect(
      page.getByText("Unit Lookup", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Enter serial number..."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Search" }),
    ).toBeVisible();
  });

  test("shows 'Unit not found' for an invalid serial", async ({ page }) => {
    await page.goto("/monitor");
    const input = page.getByPlaceholder("Enter serial number...");
    await input.fill("INVALID-SERIAL-XYZ-99999");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText("Unit not found")).toBeVisible({ timeout: 10_000 });
  });

  test("Enter key triggers the search", async ({ page }) => {
    await page.goto("/monitor");
    const input = page.getByPlaceholder("Enter serial number...");
    await input.fill("INVALID-XYZ");
    await input.press("Enter");
    await expect(page.getByText("Unit not found")).toBeVisible({ timeout: 10_000 });
  });

  test("shows unit details for a valid serial", async ({ page }) => {
    await page.goto("/monitor");

    // Find a real serial number from the order tracker if orders exist
    const orderText = await page
      .locator("button")
      .filter({ hasText: /PO-/ })
      .first()
      .textContent()
      .catch(() => null);
    if (!orderText) {
      test.skip();
      return;
    }

    // Ask MESkit for a serial (integration check skipped — UI-only test)
    // Just confirm the layout handles a result correctly
    // This test validates the result section renders without crash
    test.skip(); // Requires known serial number — covered by E2E flow tests
  });
});

// ─── 2.7  WIP Tracker (Right Panel) ─────────────────────────────────────────

test.describe("2.7 WIP Tracker", () => {
  test("shows 'Live WIP' header", async ({ page }) => {
    await page.goto("/monitor");
    await expect(page.getByText("Live WIP", { exact: false })).toBeVisible();
  });

  test("shows WIP entries or empty state", async ({ page }) => {
    await page.goto("/monitor");
    const hasWip = await page
      .locator("text=/\\d+ units/")
      .count()
      .then((n) => n > 0);
    if (!hasWip) {
      await expect(page.getByText("No units in progress")).toBeVisible();
    }
  });
});

// ─── 2.8  Alerts Feed (Right Panel) ─────────────────────────────────────────

test.describe("2.8 Alerts Feed", () => {
  test("shows Alerts section header", async ({ page }) => {
    await page.goto("/monitor");
    await expect(page.getByText("Alerts", { exact: true })).toBeVisible();
  });

  test("shows alerts or empty state", async ({ page }) => {
    await page.goto("/monitor");
    const hasAlerts = await page
      .locator("text=/critical|major|minor/")
      .count()
      .then((n) => n > 0);
    if (!hasAlerts) {
      await expect(page.getByText("No alerts")).toBeVisible();
    }
  });
});

// ─── 3.1 / 3.2  Topic Selector + Planner Styling ─────────────────────────────

test.describe("3.1-3.2 Topic selector & Planner styling", () => {
  test("chat panel shows 'Ask MESkit' and 'Ask about: Production' by default", async ({
    page,
  }) => {
    await page.goto("/monitor");
    await expect(page.getByText("Ask MESkit")).toBeVisible();
    await expect(page.getByText("Ask about: Production")).toBeVisible();
  });

  test("topic dropdown opens with Production and Planning options", async ({
    page,
  }) => {
    await page.goto("/monitor");
    await page.getByText("Ask about: Production").click();
    await expect(page.getByRole("button", { name: "Production" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Planning" })).toBeVisible();
  });

  test("selecting Planning changes header to 'Production Planner'", async ({
    page,
  }) => {
    await page.goto("/monitor");
    await page.getByText("Ask about: Production").click();
    await page.getByRole("button", { name: "Planning" }).click();
    await expect(page.getByText("Production Planner")).toBeVisible();
    await expect(page.getByText("Ask about: Planning")).toBeVisible();
  });

  test("Planner input placeholder changes to capacity/scheduling text", async ({
    page,
  }) => {
    await page.goto("/monitor");
    await page.getByText("Ask about: Production").click();
    await page.getByRole("button", { name: "Planning" }).click();
    await expect(
      page.getByPlaceholder("Ask about capacity, scheduling..."),
    ).toBeVisible();
  });

  test("switching back to Production restores Ask MESkit label", async ({
    page,
  }) => {
    await page.goto("/monitor");
    // Switch to Planning
    await page.getByText("Ask about: Production").click();
    await page.getByRole("button", { name: "Planning" }).click();
    await expect(page.getByText("Production Planner")).toBeVisible();

    // Switch back to Production
    await page.getByText("Ask about: Planning").click();
    await page.getByRole("button", { name: "Production" }).click();
    await expect(page.getByText("Ask MESkit")).toBeVisible();
    await expect(
      page.getByPlaceholder("Ask anything about your shop floor..."),
    ).toBeVisible();
  });
});

// ─── 7.  Cross-mode navigation ───────────────────────────────────────────────

test.describe("7. Cross-mode navigation", () => {
  test("navigating away and back preserves Monitor route", async ({ page }) => {
    await page.goto("/monitor");
    await expect(page.getByText("Production Orders")).toBeVisible();

    // Navigate to Build Mode
    await page.getByRole("button", { name: /Build/i }).click();
    await expect(page).toHaveURL(/\/build/);

    // Navigate back to Monitor
    await page.getByRole("button", { name: /Monitor/i }).click();
    await expect(page).toHaveURL(/\/monitor/);
    await expect(page.getByText("Production Orders")).toBeVisible();
  });

  test("hard refresh reloads Monitor Mode with current data", async ({
    page,
  }) => {
    await page.goto("/monitor");
    await page.reload();
    await expect(page).toHaveURL(/\/monitor/);
    await expect(page.getByText("Production Orders")).toBeVisible();
    await expect(page.getByText("Live WIP")).toBeVisible();
  });
});
