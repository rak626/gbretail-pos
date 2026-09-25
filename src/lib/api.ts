import { apiClient } from "@/lib/apiClient";
export { ApiError, API_BASE } from "@/lib/apiClient";
import type { Product, Customer, Order } from "@/types";

// Products
export async function fetchProducts(
  params?: { search?: string; category?: string; limit?: number },
  opts?: { signal?: AbortSignal }
) {
  const data = await apiClient.get<{ products: Product[]; source?: string }>(
    "/api/products",
    { search: params?.search, category: params?.category, limit: params?.limit },
    opts
  );
  return data.products;
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
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  creditDays?: number;
  customDays?: number;
}) {
  const data = await apiClient.post<{ order: Order }>("/api/orders", payload);
  return data.order;
}

export async function fetchOrders(params?: { page?: number; limit?: number; customerId?: string; search?: string; date?: string }) {
  return apiClient.get<{ orders: Order[]; total: number; page: number }>("/api/orders", {
    page: params?.page,
    limit: params?.limit,
    customerId: params?.customerId,
    search: params?.search,
    date: params?.date,
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

export async function createLedgerEntry(payload: { customerId?: string; customerName?: string; customerPhone?: string; amount: number; creditDays?: number; customDays?: number; note?: string; orderId?: string }) {
  return apiClient.post<{ entry: unknown }>("/api/ledger", payload);
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

export async function fetchHealth() {
  return apiClient.get<{ status: string; db: string }>("/api/health");
}
