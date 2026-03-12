/**
 * Auth setup — logs in once and saves storage state to playwright/.auth/user.json
 * so all authenticated tests reuse the session without re-logging in.
 *
 * Required env vars:
 *   E2E_EMAIL     — test account email
 *   E2E_PASSWORD  — test account password
 */
import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../playwright/.auth/user.json");

setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "E2E_EMAIL and E2E_PASSWORD must be set to run authenticated tests",
    );
  }

  await page.goto("/login");

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Wait for redirect away from login page
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15_000,
  });

  // Confirm we're on an authenticated page
  await expect(page).not.toHaveURL(/\/login/);

  await page.context().storageState({ path: authFile });
});
