import { apiClient } from "@/lib/apiClient";
export { ApiError, API_BASE } from "@/lib/apiClient";
import type { Product, Customer, Order, LowStockWarning } from "@/types";

// Products
export async function fetchProducts(
  params?: { search?: string; category?: string; limit?: number; page?: number },
  opts?: { signal?: AbortSignal }
) {
  const data = await apiClient.get<{ products: Product[]; total?: number; page?: number; limit?: number; source?: string }>(
    "/api/products",
    { search: params?.search, category: params?.category, limit: params?.limit, page: params?.page },
    opts
  );
  return data.products;
}

export type ProductStockFilter = "all" | "in" | "low" | "out";
export type ProductSortBy = "name" | "price" | "stock" | "category" | "recent";

/** Paged fetch (for inventory pagination + full catalog sync). */
export async function fetchProductsPaged(
  params?: { search?: string; category?: string; limit?: number; page?: number; stock?: ProductStockFilter; sortBy?: ProductSortBy; sortOrder?: "asc" | "desc" },
  opts?: { signal?: AbortSignal }
) {
  return apiClient.get<{ products: Product[]; total: number; page: number; limit: number; source?: string }>(
    "/api/products",
    { search: params?.search, category: params?.category, limit: params?.limit, page: params?.page, stock: params?.stock && params.stock !== "all" ? params.stock : undefined, sortBy: params?.sortBy, sortOrder: params?.sortOrder },
    opts
  );
}

/** Shop-wide product KPIs + distinct categories (never paginated). */
export async function fetchProductsMeta(opts?: { signal?: AbortSignal }) {
  return apiClient.get<{ total: number; low: number; out: number; categories: string[]; stockValueCost?: number; stockValueSell?: number }>("/api/products/meta", undefined, opts);
}

export async function createProduct(payload: Record<string, unknown>) {
  const data = await apiClient.post<{ product: unknown }>("/api/products", payload);
  return data.product;
}

export async function updateProduct(id: string, payload: Record<string, unknown>) {
  const data = await apiClient.patch<{ product: unknown }>(`/api/products/${id}`, payload);
  return data.product;
}

export async function deleteProduct(id: string) {
  return apiClient.delete<{ success: boolean }>(`/api/products/${id}`);
}

// Customers
export async function fetchCustomers(q?: string, limit = 50, opts?: { signal?: AbortSignal }) {
  const data = await apiClient.get<{ customers: Customer[] }>("/api/customers", { q, limit }, opts);
  return data.customers;
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
  return apiClient.get<{ customers: Customer[]; total: number; page: number; limit: number; stats: { totalCustomers: number; active30d: number; withDues: { count: number; amount: number }; withoutDues: number; topSpender: { id: string; name: string; totalSpent: number } | null } }>(
    "/api/customers",
    { q: params.q, page: params.page, limit: params.limit, sortBy: params.sortBy, sortOrder: params.sortOrder, hasBalance: params.hasBalance, activeWithinDays: params.activeWithinDays },
    { signal: params.signal }
  );
}

export async function fetchCustomer(id: string) {
  return apiClient.get<{ customer: Customer & { orders: unknown[]; ledgerEntries: unknown[] }; ordersTotal: number; ledger: { total: { count: number; amount: number }; pending: { count: number; amount: number }; settled: { count: number; amount: number }; overdue: { count: number; amount: number } }; stats: { avgOrderValue: number; daysSinceLastOrder: number | null; daysSinceFirstOrder: number | null; favoriteCategory: string | null; topProducts: Array<{ name: string; qty: number; spent: number }> } }>(`/api/customers/${id}`);
}

export async function createCustomer(payload: { name: string; phone?: string; balance?: number; email?: string; address?: string; notes?: string; creditLimit?: number | null }) {
  const data = await apiClient.post<{ customer: Customer }>("/api/customers", payload);
  return data.customer;
}

export async function updateCustomer(id: string, payload: Record<string, unknown>) {
  const data = await apiClient.patch<{ customer: Customer }>(`/api/customers/${id}`, payload);
  return data.customer;
}

export async function softDeleteCustomer(id: string) {
  return apiClient.delete<{ customer: unknown; softDeleted: boolean }>(`/api/customers/${id}`);
}

export async function restoreCustomer(id: string) {
  return apiClient.post<{ customer: unknown }>(`/api/customers/${id}/restore`);
}

export async function fetchCustomerStats() {
  return apiClient.get<{ total: number; active30d: number; withDues: { count: number; amount: number }; withoutDues: number; topSpenders: unknown[] }>("/api/customers/stats");
}

// Orders
export async function createOrder(payload: {
  items: unknown[];
  total: number;
  discount?: number;
  paymentMethod: string;
  splitCash?: number;
  splitUpi?: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  creditDays?: number;
  customDays?: number;
  counterId?: string;
  shopId?: string;
}, opts?: { idempotencyKey?: string }) {
  const data = await apiClient.post<{ order: Order; lowStockWarnings?: LowStockWarning[]; idempotentReplay?: boolean }>(
    "/api/orders",
    payload,
    opts?.idempotencyKey ? { headers: { "Idempotency-Key": opts.idempotencyKey } } : undefined
  );
  if (data.lowStockWarnings?.length) {
    console.warn(
      "[orders] low stock after sale:",
      data.lowStockWarnings.map((w) => `${w.name} — ${w.stockQuantity} ${w.unit} left (warn at ≤ ${w.lowStockThreshold})`).join("; ")
    );
  }
  return data.order;
}

export async function fetchOrders(params?: { page?: number; limit?: number; customerId?: string; search?: string; customer?: string; date?: string; from?: string; to?: string; paymentMethod?: string }) {
  return apiClient.get<{ orders: Order[]; total: number; page: number }>("/api/orders", {
    page: params?.page,
    limit: params?.limit,
    customerId: params?.customerId,
    search: params?.search,
    customer: params?.customer,
    date: params?.date,
    from: params?.from,
    to: params?.to,
    paymentMethod: params?.paymentMethod,
  });
}

export async function fetchOrder(id: string) {
  const data = await apiClient.get<{ order: Order }>(`/api/orders/${id}`);
  return data.order;
}

export async function fetchStats() {
  return apiClient.get<{ today: { orders: number; revenue: number; byPayment: Record<string, number> }; total: { orders: number; revenue: number; customers: number }; lowStock: unknown[] }>("/api/stats");
}

export async function fetchLedger(params?: { filter?: string; q?: string; customerId?: string; page?: number; limit?: number; due?: string }) {
  return apiClient.get<{ entries: unknown[]; total: number; page: number; limit: number; stats: { dueToday: { count: number; amount: number }; overdue: { count: number; amount: number }; pending: { count: number; amount: number } } }>("/api/ledger", {
    filter: params?.filter,
    q: params?.q,
    customerId: params?.customerId,
    page: params?.page,
    limit: params?.limit,
    due: params?.due,
  });
}

export async function fetchDueToday(q?: string, includeOverdue?: boolean) {
  return apiClient.get<{ entries: unknown[]; total: number; count: number; amount: number }>("/api/ledger/due-today", {
    q,
    includeOverdue: includeOverdue ? "1" : undefined,
  });
}

export async function createLedgerEntry(payload: { customerId?: string; customerName?: string; customerPhone?: string; amount: number; creditDays?: number; customDays?: number; note?: string; orderId?: string; counterId?: string; shopId?: string }, opts?: { idempotencyKey?: string }) {
  return apiClient.post<{ entry: unknown; idempotentReplay?: boolean }>(
    "/api/ledger",
    payload,
    opts?.idempotencyKey ? { headers: { "Idempotency-Key": opts.idempotencyKey } } : undefined
  );
}

export async function settleLedgerEntry(id: string, action: "settle" | "reopen" = "settle") {
  return apiClient.patch<{ entry: unknown }>(`/api/ledger/${id}`, { action });
}

export async function deleteLedgerEntry(id: string) {
  return apiClient.delete<{ success: boolean }>(`/api/ledger/${id}`);
}

export async function fetchAnalyticsSummary(params?: { preset?: string; from?: string; to?: string; granularity?: string; topN?: number; category?: string }) {
  return apiClient.get<{
    range: { preset: string; label: string; start: string; end: string; granularity: string };
    prevRange: { start: string; end: string };
    kpis: { orders: number; gross: number; discount: number; netRevenue: number; profitGross: number; profit: number; profitPositive: number; loss: number; avgOrderValue: number; marginPct: number; topCategory: string | null; delta: Record<string, number | null>; prev: Record<string, number> };
    timeseries: { bucket: string; label: string; orders: number; gross: number; netRevenue: number; profit: number; loss: number; netProfit: number }[];
    topProducts: { productId: string | null; name: string; category: string; qty: number; gross: number; profit: number }[];
    topByRevenue: { productId: string | null; name: string; category: string; qty: number; gross: number; profit: number }[];
    categories: { category: string; gross: number; netRevenue: number; profit: number; qty: number; marginPct: number }[];
    paymentSplit: Record<string, number>;
    tender: { splitCash: number; splitUpi: number };
    ledger: { created: { count:number; amount:number }; settled:{count:number;amount:number}; pending:{count:number;amount:number}; overdue:{count:number;amount:number}; collectionRate:number; avgDaysToSettle:number | null; aging:{bucket:string;count:number;amount:number}[]; agingNotDue:{bucket:string;count:number;amount:number}[]; timeseries:{bucket:string;label:string;created:number;settled:number;createdCount:number;settledCount:number}[] };
    meta: { topN:number; categoryFilter:string; bucketCount:number };
  }>("/api/analytics/summary", {
    preset: params?.preset,
    from: params?.from,
    to: params?.to,
    granularity: params?.granularity,
    topN: params?.topN,
    category: params?.category,
  });
}

export function getAnalyticsExportUrl(params?: { preset?: string; from?: string; to?: string; granularity?: string; format?: string }) {
  return apiClient.exportUrl("/api/analytics/export", {
    preset: params?.preset,
    from: params?.from,
    to: params?.to,
    granularity: params?.granularity,
    format: params?.format,
  });
}

/** Authenticated CSV/JSON export download (header auth — works without cookies). */
export async function downloadAnalyticsExport(params?: { preset?: string; from?: string; to?: string; granularity?: string; format?: string }) {
  return apiClient.download("/api/analytics/export", {
    preset: params?.preset,
    from: params?.from,
    to: params?.to,
    granularity: params?.granularity,
    format: params?.format,
  });
}

export type AnalyticsSections = {
  range: { preset: string; label: string; start: string; end: string };
  scope: { shopId: string | null; role: string; staffRole: string };
  staff: { id: string; name: string; role: string; isActive: boolean; shopId: string | null; shopName: string | null; orders: number; revenue: number; avgBill: number; units: number; discount: number }[];
  customers: {
    newCount: number; activeCount: number; repeatCount: number; retentionPct: number; avgCustomerValue: number;
    top: { id: string; name: string; phone: string | null; totalSpent: number; totalOrders: number; balance: number }[];
    defaulters: { id: string; name: string; phone: string | null; balance: number; totalOrders: number }[];
  };
  shops: { id: string; name: string; isActive: boolean; orders: number; revenue: number; avgBill: number }[] | null;
  counters: { id: string; name: string; isActive: boolean; orders: number; revenue: number; avgBill: number }[] | null;
};

export async function fetchAnalyticsSections(params?: { preset?: string; from?: string; to?: string; shopId?: string }) {
  return apiClient.get<AnalyticsSections>("/api/analytics/sections", {
    preset: params?.preset,
    from: params?.from,
    to: params?.to,
    shopId: params?.shopId,
  });
}

export async function fetchHealth() {
  return apiClient.get<{ status: string; db: string }>("/api/health");
}
