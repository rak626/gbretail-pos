import { test, expect } from "@playwright/test";

const OWNER = { email: "owner@shop.local", password: "owner123" };

test("owner login lands on POS, bad password shows error", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("owner@shop.local").fill(OWNER.email);
  await page.getByPlaceholder("••••••••").fill(OWNER.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
});

test("bad password keeps error on page", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("owner@shop.local").fill(OWNER.email);
  await page.getByPlaceholder("••••••••").fill("wrongpass1");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 15_000 });
});

test("?next=//evil.com never leaves origin", async ({ page }) => {
  await page.goto("/login?next=//evil.com");
  await page.getByPlaceholder("owner@shop.local").fill(OWNER.email);
  await page.getByPlaceholder("••••••••").fill(OWNER.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => url.origin === new URL(page.url()).origin, { timeout: 15_000 });
  expect(new URL(page.url()).origin).toBe("http://localhost:3001");
});
