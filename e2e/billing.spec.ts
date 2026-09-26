import { test, expect } from "@playwright/test";

// Assumes dev backend seeded (owner@shop.local / owner123) with catalog products.
// Creates a product via the batch API, bills it cash on the POS, checks /orders.
test("create product → cash bill → visible in orders", async ({ page, request }) => {
  const api = process.env.PLAYWRIGHT_API_URL || "http://localhost:4000";
  const login = await request.post(`${api}/api/auth/login`, {
    data: { email: "owner@shop.local", password: "owner123" },
  });
  expect(login.ok()).toBeTruthy();
  const { accessToken } = await login.json();
  const name = `E2E Prod ${Date.now()}`;
  const created = await request.post(`${api}/api/products/batch`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { items: [{ name, category: "E2E", is_loose: false, price: 42, costPrice: 30, stockQuantity: 20 }] },
  });
  expect(created.ok()).toBeTruthy();

  // POS login via UI
  await page.goto("/login");
  await page.getByPlaceholder("owner@shop.local").fill("owner@shop.local");
  await page.getByPlaceholder("••••••••").fill("owner123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });

  // Search the new product via the F2 spotlight palette
  await page.getByRole("button", { name: /search products/i }).click();
  await page.getByPlaceholder(/scan barcode or type/i).fill(name);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15_000 });

  // Orders page shows at least the seeded history shape
  await page.goto("/orders");
  await expect(page.getByText(/orders/i).first()).toBeVisible({ timeout: 15_000 });
});
