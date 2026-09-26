import { test, expect } from "@playwright/test";

// Khata bill via API → pending ledger entry → settle → settled.
test("khata bill creates pending entry and settles", async ({ request }) => {
  const api = process.env.PLAYWRIGHT_API_URL || "http://localhost:4000";
  const login = await request.post(`${api}/api/auth/login`, {
    data: { email: "owner@shop.local", password: "owner123" },
  });
  expect(login.ok()).toBeTruthy();
  const { accessToken } = await login.json();
  const h = { Authorization: `Bearer ${accessToken}` };
  const phone = `9${Date.now().toString().slice(-9)}`;

  const order = await request.post(`${api}/api/orders`, {
    headers: h,
    data: {
      items: [{ productId: null, name: "E2E custom", price: 75, unit: "pcs", quantity: 1, lineTotal: 75, isCustom: true }],
      total: 75,
      paymentMethod: "khata",
      customerName: "E2E Khata",
      customerPhone: phone,
    },
  });
  expect(order.ok()).toBeTruthy();

  const ledger = await request.get(`${api}/api/ledger?limit=5`, { headers: h });
  expect(ledger.ok()).toBeTruthy();
  const entries = ((await ledger.json()) as any).entries as any[];
  const mine = entries.find((e) => e.customer?.phone === phone);
  expect(mine).toBeTruthy();
  expect(mine.status).toBe("pending");

  const settle = await request.patch(`${api}/api/ledger/${mine.id}`, { headers: h, data: { action: "settle" } });
  expect(settle.ok()).toBeTruthy();
  expect(((await settle.json()) as any).entry.status).toBe("settled");
});
