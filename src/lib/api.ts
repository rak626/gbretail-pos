const BASE = "";

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

// Products
export async function fetchProducts(
  params?: { search?: string; category?: string; limit?: number },
  opts?: { signal?: AbortSignal }
) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.category) qs.set("category", params.category);
  if (params?.limit) qs.set("limit", String(params.limit));
  const res = await fetch(`${BASE}/api/products?${qs.toString()}`, { signal: opts?.signal });
  const data = await handle<{ products: unknown[]; source?: string }>(res);
  return data.products as import("@/db/database").Product[];
}

export async function createProduct(payload: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/products`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await handle<{ product: unknown }>(res);
  return data.product;
}

// Customers
export async function fetchCustomers(q?: string, limit = 50, opts?: { signal?: AbortSignal }) {
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  qs.set("limit", String(limit));
  const res = await fetch(`${BASE}/api/customers?${qs.toString()}`, { signal: opts?.signal });
  const data = await handle<{ customers: unknown[] }>(res);
  return data.customers as import("@/db/database").Customer[];
}

export async function createCustomer(payload: { name: string; phone?: string; balance?: number }) {
  const res = await fetch(`${BASE}/api/customers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await handle<{ customer: unknown }>(res);
  return data.customer as import("@/db/database").Customer;
}

// Orders
export async function createOrder(payload: {
  items: unknown[];
  total: number;
  discount?: number;
  paymentMethod: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
}) {
  const res = await fetch(`${BASE}/api/orders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await handle<{ order: unknown }>(res);
  return data.order as import("@/db/database").Order;
}

export async function fetchOrders(params?: { page?: number; limit?: number; customerId?: string; search?: string; date?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.customerId) qs.set("customerId", params.customerId);
  if (params?.search) qs.set("search", params.search);
  if (params?.date) qs.set("date", params.date);
  const res = await fetch(`${BASE}/api/orders?${qs.toString()}`);
  const data = await handle<{ orders: unknown[]; total: number; page: number }>(res);
  return data as { orders: import("@/db/database").Order[]; total: number; page: number };
}

export async function fetchOrder(id: string) {
  const res = await fetch(`${BASE}/api/orders/${id}`);
  const data = await handle<{ order: unknown }>(res);
  return data.order as import("@/db/database").Order;
}

export async function fetchStats() {
  const res = await fetch(`${BASE}/api/stats`);
  return handle<{ today: { orders: number; revenue: number; byPayment: Record<string, number> }; total: { orders: number; revenue: number; customers: number }; lowStock: unknown[] }>(res);
}

export async function fetchHealth() {
  const res = await fetch(`${BASE}/api/health`);
  return handle<{ status: string; db: string }>(res);
}
