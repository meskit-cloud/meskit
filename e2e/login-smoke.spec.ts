import { expect, test } from "@playwright/test";

test("redirects the root path to login and renders the auth form", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login(\?.*)?$/);
  await expect(
    page.getByRole("heading", { name: "MESkit", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("preserves the next parameter in the signup link", async ({ page }) => {
  await page.goto("/login?next=%2Frun");

  await expect(page.getByRole("link", { name: "Sign up" })).toHaveAttribute(
    "href",
    "/signup?next=%2Frun",
  );
});
