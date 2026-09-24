const BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

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

export async function updateProduct(id: string, payload: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/products/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await handle<{ product: unknown }>(res);
  return data.product;
}

export async function deleteProduct(id: string) {
  const res = await fetch(`${BASE}/api/products/${id}`, { method: "DELETE" });
  return handle<{ success: boolean }>(res);
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

export async function fetchCustomersPaged(params: {
  q?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
  hasBalance?: string;
  activeWithinDays?: number;
  signal?: AbortSignal;
}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder);
  if (params.hasBalance) qs.set("hasBalance", params.hasBalance);
  if (params.activeWithinDays) qs.set("activeWithinDays", String(params.activeWithinDays));
  const res = await fetch(`${BASE}/api/customers?${qs.toString()}`, { signal: params.signal });
  return handle<{ customers: unknown[]; total: number; page: number; limit: number; stats: { totalCustomers: number; active30d: number; withDues: { count: number; amount: number }; withoutDues: number; topSpender: unknown } }>(res) as Promise<{ customers: import("@/db/database").Customer[]; total: number; page: number; limit: number; stats: { totalCustomers: number; active30d: number; withDues: { count: number; amount: number }; withoutDues: number; topSpender: { id: string; name: string; totalSpent: number } | null } }>;
}

export async function fetchCustomer(id: string) {
  const res = await fetch(`${BASE}/api/customers/${id}`);
  const data = await handle<{ customer: unknown; ordersTotal: number; ledger: unknown; stats: unknown }>(res);
  return data as { customer: import("@/db/database").Customer & { orders: unknown[]; ledgerEntries: unknown[] }; ordersTotal: number; ledger: { total: { count: number; amount: number }; pending: { count: number; amount: number }; settled: { count: number; amount: number }; overdue: { count: number; amount: number } }; stats: { avgOrderValue: number; daysSinceLastOrder: number | null; daysSinceFirstOrder: number | null; favoriteCategory: string | null; topProducts: Array<{ name: string; qty: number; spent: number }> } };
}

export async function createCustomer(payload: { name: string; phone?: string; balance?: number; email?: string; address?: string; notes?: string; creditLimit?: number | null }) {
  const res = await fetch(`${BASE}/api/customers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await handle<{ customer: unknown }>(res);
  return data.customer as import("@/db/database").Customer;
}

export async function updateCustomer(id: string, payload: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/customers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await handle<{ customer: unknown }>(res);
  return data.customer as import("@/db/database").Customer;
}

export async function softDeleteCustomer(id: string) {
  const res = await fetch(`${BASE}/api/customers/${id}`, { method: "DELETE" });
  return handle<{ customer: unknown; softDeleted: boolean }>(res);
}

export async function restoreCustomer(id: string) {
  const res = await fetch(`${BASE}/api/customers/${id}/restore`, { method: "POST" });
  return handle<{ customer: unknown }>(res);
}

export async function fetchCustomerStats() {
  const res = await fetch(`${BASE}/api/customers/stats`);
  return handle<{ total: number; active30d: number; withDues: { count: number; amount: number }; withoutDues: number; topSpenders: unknown[] }>(res);
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
  creditDays?: number;
  customDays?: number;
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

export async function fetchLedger(params?: { filter?: string; q?: string; customerId?: string; page?: number; limit?: number; due?: string }) {
  const qs = new URLSearchParams();
  if (params?.filter) qs.set("filter", params.filter);
  if (params?.q) qs.set("q", params.q);
  if (params?.customerId) qs.set("customerId", params.customerId);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.due) qs.set("due", params.due);
  const res = await fetch(`${BASE}/api/ledger?${qs.toString()}`);
  return handle<{ entries: unknown[]; total: number; page: number; limit: number; stats: { dueToday: { count: number; amount: number }; overdue: { count: number; amount: number }; pending: { count: number; amount: number } } }>(res);
}

export async function fetchDueToday(q?: string, includeOverdue?: boolean) {
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (includeOverdue) qs.set("includeOverdue", "1");
  const res = await fetch(`${BASE}/api/ledger/due-today?${qs.toString()}`);
  return handle<{ entries: unknown[]; total: number; count: number; amount: number }>(res);
}

export async function createLedgerEntry(payload: { customerId?: string; customerName?: string; customerPhone?: string; amount: number; creditDays?: number; customDays?: number; note?: string; orderId?: string }) {
  const res = await fetch(`${BASE}/api/ledger`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  return handle<{ entry: unknown }>(res);
}

export async function settleLedgerEntry(id: string, action: "settle" | "reopen" = "settle") {
  const res = await fetch(`${BASE}/api/ledger/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
  return handle<{ entry: unknown }>(res);
}

export async function deleteLedgerEntry(id: string) {
  const res = await fetch(`${BASE}/api/ledger/${id}`, { method: "DELETE" });
  return handle<{ success: boolean }>(res);
}

export async function fetchAnalyticsSummary(params?: { preset?: string; from?: string; to?: string; granularity?: string; topN?: number; category?: string }) {
  const qs = new URLSearchParams();
  if (params?.preset) qs.set("preset", params.preset);
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  if (params?.granularity) qs.set("granularity", params.granularity);
  if (params?.topN) qs.set("topN", String(params.topN));
  if (params?.category) qs.set("category", params.category);
  const res = await fetch(`${BASE}/api/analytics/summary?${qs.toString()}`);
  return handle<{
    range: { preset: string; label: string; start: string; end: string; granularity: string };
    prevRange: { start: string; end: string };
    kpis: { orders: number; gross: number; discount: number; netRevenue: number; profitGross: number; profit: number; profitPositive: number; loss: number; avgOrderValue: number; marginPct: number; topCategory: string | null; delta: Record<string, number | null>; prev: Record<string, number> };
    timeseries: { bucket: string; label: string; orders: number; gross: number; netRevenue: number; profit: number; loss: number; netProfit: number }[];
    topProducts: { productId: string | null; name: string; category: string; qty: number; gross: number; profit: number }[];
    topByRevenue: { productId: string | null; name: string; category: string; qty: number; gross: number; profit: number }[];
    categories: { category: string; gross: number; netRevenue: number; profit: number; qty: number; marginPct: number }[];
    paymentSplit: Record<string, number>;
    ledger: { created: { count:number; amount:number }; settled:{count:number;amount:number}; pending:{count:number;amount:number}; overdue:{count:number;amount:number}; collectionRate:number; avgDaysToSettle:number | null; aging:{bucket:string;count:number;amount:number}[]; agingNotDue:{bucket:string;count:number;amount:number}[]; timeseries:{bucket:string;label:string;created:number;settled:number;createdCount:number;settledCount:number}[] };
    meta: { topN:number; categoryFilter:string; bucketCount:number };
  }>(res);
}

export function getAnalyticsExportUrl(params?: { preset?: string; from?: string; to?: string; granularity?: string; format?: string }) {
  const qs = new URLSearchParams();
  if (params?.preset) qs.set("preset", params.preset);
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  if (params?.granularity) qs.set("granularity", params.granularity);
  if (params?.format) qs.set("format", params.format);
  return `${BASE}/api/analytics/export?${qs.toString()}`;
}

export async function fetchHealth() {
  const res = await fetch(`${BASE}/api/health`);
  return handle<{ status: string; db: string }>(res);
}
