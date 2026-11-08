import { apiClient, ApiError } from "@/lib/apiClient";
export { ApiError, API_BASE } from "@/lib/apiClient";
import type { Product, Customer, Order, LowStockWarning, ProductBatch, MasterProduct, ShopProduct, ShopProductBatch } from "@/types";
import { db, type OrderQueueItem } from "@/db/database";
import { generateId } from "@/lib/utils";

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
  return apiClient.get<{ total: number; low: number; out: number; categories: string[]; stockValueCost?: number; stockValueSell?: number; expiringSoon?: number; expired?: number }>("/api/products/meta", undefined, opts);
}

export async function createProduct(payload: Record<string, unknown>) {
  const data = await apiClient.post<{ product: unknown }>("/api/products", payload);
  try {
    const { useCatalogStore } = await import("@/store/catalogStore");
    useCatalogStore.getState().invalidate();
  } catch { /* catalog cache best-effort */ }
  return data.product;
}

/** Fast CSV import path — single request for ≤500 rows (replaces sequential POSTs). */
export async function createProductsBatch(items: Record<string, unknown>[], shopId?: string) {
  const data = await apiClient.post<{ products: unknown[]; count: number }>("/api/products/batch", { items, ...(shopId ? { shopId } : {}) });
  try {
    const { useCatalogStore } = await import("@/store/catalogStore");
    useCatalogStore.getState().invalidate();
  } catch { /* best-effort */ }
  return data;
}

export async function updateProduct(id: string, payload: Record<string, unknown>) {
  const data = await apiClient.patch<{ product: unknown }>(`/api/products/${id}`, payload);
  try {
    const { useCatalogStore } = await import("@/store/catalogStore");
    useCatalogStore.getState().invalidate();
  } catch { /* best-effort */ }
  return data.product;
}

export async function deleteProduct(id: string) {
  const res = await apiClient.delete<{ success: boolean }>(`/api/products/${id}`);
  try {
    const { useCatalogStore } = await import("@/store/catalogStore");
    useCatalogStore.getState().invalidate();
  } catch { /* best-effort */ }
  return res;
}

/** Product batches — expiry/MRP/cost tracking per received lot. */
export async function fetchProductBatches(params?: { productId?: string; shopId?: string; activeOnly?: boolean }, opts?: { signal?: AbortSignal }) {
  return apiClient.get<{ batches: ProductBatch[] }>("/api/products/batches", { productId: params?.productId, shopId: params?.shopId, activeOnly: params?.activeOnly !== false ? "1" : undefined }, opts);
}

/** Receive stock into a new batch. Increments product stockQuantity on the server. */
export async function createProductBatch(payload: {
  productId: string;
  batchNo: string;
  expiryDate: string | null;
  mrp: number | null;
  costPrice: number;
  quantity: number;
}, opts?: { signal?: AbortSignal }) {
  const data = await apiClient.post<{ batch: ProductBatch }>("/api/products/batches", payload, opts);
  try {
    const { useCatalogStore } = await import("@/store/catalogStore");
    useCatalogStore.getState().invalidate();
  } catch { /* best-effort */ }
  return data.batch;
}

/** ============================================================================
 * Master Catalog API — global product definitions shared across all shops.
 * ============================================================================ */

/** Fetch master products (SUPER_ADMIN only). */
export async function fetchMasterProducts(params?: {
  search?: string;
  category?: string;
  isActive?: boolean;
  limit?: number;
  page?: number;
}, opts?: { signal?: AbortSignal }) {
  return apiClient.get<{ masterProducts: MasterProduct[]; total: number; page: number; limit: number }>(
    "/api/master-products",
    { search: params?.search, category: params?.category, isActive: params?.isActive !== undefined ? (params.isActive ? "true" : "false") : undefined, limit: params?.limit, page: params?.page },
    opts
  );
}

/** Create a master product (SUPER_ADMIN only). */
export async function createMasterProduct(payload: {
  name: string;
  category: string;
  brand?: string;
  barcode?: string;
  is_loose?: boolean;
  unit?: string;
  basePrice?: number;
  imageUrl?: string;
  preset_weights?: number[];
  preset_prices?: number[];
}, opts?: { signal?: AbortSignal }) {
  return apiClient.post<{ masterProduct: MasterProduct }>("/api/master-products", payload, opts);
}

/** Bulk import master products (≤500 rows, SUPER_ADMIN only). */
export async function createMasterProductsBatch(items: Record<string, unknown>[], opts?: { signal?: AbortSignal }) {
  return apiClient.post<{ masterProducts: MasterProduct[]; count: number }>("/api/master-products/batch", { items }, opts);
}

/** Update a master product (SUPER_ADMIN only). */
export async function updateMasterProduct(id: string, payload: Record<string, unknown>, opts?: { signal?: AbortSignal }) {
  return apiClient.patch<{ masterProduct: MasterProduct }>(`/api/master-products/${id}`, payload, opts);
}

/** Soft delete a master product (SUPER_ADMIN only). */
export async function deleteMasterProduct(id: string, opts?: { signal?: AbortSignal }) {
  return apiClient.delete<{ success: boolean }>(`/api/master-products/${id}`, opts);
}

/** ============================================================================
 * Shop Product API — per-shop listing of master products.
 * ============================================================================ */

/** Fetch shop products (enabled/disabled master products for the user's shop). */
export async function fetchShopProducts(params?: {
  search?: string;
  category?: string;
  isEnabled?: boolean;
  isOnline?: boolean;
  limit?: number;
  page?: number;
}, opts?: { signal?: AbortSignal }) {
  return apiClient.get<{ shopProducts: ShopProduct[]; total: number; page: number; limit: number }>(
    "/api/shop-products",
    {
      search: params?.search,
      category: params?.category,
      isEnabled: params?.isEnabled !== undefined ? (params.isEnabled ? "true" : "false") : undefined,
      isOnline: params?.isOnline !== undefined ? (params.isOnline ? "true" : "false") : undefined,
      limit: params?.limit,
      page: params?.page,
    },
    opts
  );
}

/** Enable a master product at this shop (create ShopProduct row). */
export async function enableShopProduct(payload: {
  masterProductId: string;
  shopPrice?: number;
  costPrice?: number;
  stockQuantity?: number;
  lowStockThreshold?: number;
  shopBarcode?: string;
  isOnline?: boolean;
  onlinePrice?: number;
}, opts?: { signal?: AbortSignal }) {
  return apiClient.post<{ shopProduct: ShopProduct }>("/api/shop-products", payload, opts);
}

/** Update a shop product (enable/disable, price, stock, etc.). */
export async function updateShopProduct(id: string, payload: Record<string, unknown>, opts?: { signal?: AbortSignal }) {
  return apiClient.patch<{ shopProduct: ShopProduct }>(`/api/shop-products/${id}`, payload, opts);
}

/** Soft delete / disable a shop product. */
export async function deleteShopProduct(id: string, opts?: { signal?: AbortSignal }) {
  return apiClient.delete<{ success: boolean }>(`/api/shop-products/${id}`, opts);
}

/** Receive stock into a new ShopProductBatch. Increments shopProduct stockQuantity. */
export async function createShopProductBatch(payload: {
  shopProductId: string;
  batchNo: string;
  expiryDate: string | null;
  mrp: number | null;
  costPrice: number;
  quantity: number;
}, opts?: { signal?: AbortSignal }) {
  const data = await apiClient.post<{ batch: ShopProductBatch }>("/api/products/batches", payload, opts);
  try {
    const { useCatalogStore } = await import("@/store/catalogStore");
    useCatalogStore.getState().invalidate();
  } catch { /* best-effort */ }
  return data.batch;
}

/** Fetch batches for a shop product. */
export async function fetchShopProductBatches(params?: { shopProductId?: string; activeOnly?: boolean }, opts?: { signal?: AbortSignal }) {
  return apiClient.get<{ batches: ShopProductBatch[] }>("/api/products/batches", { productId: params?.shopProductId, activeOnly: params?.activeOnly !== false ? "1" : undefined }, opts);
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
/** Queue key prefix for offline orders stored in Dexie. */
const OFFLINE_ORDER_PREFIX = "offline-";

/** Build a synthetic order number for a queued (offline) bill so staff have a reference. */
function queueOrderNumber(prefix: string): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `Q-${yyyy}${mm}${dd}-${prefix}`;
}

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
  const idempotencyKey = opts?.idempotencyKey ?? generateId();
  try {
    const data = await apiClient.post<{ order: Order; lowStockWarnings?: LowStockWarning[]; idempotentReplay?: boolean }>(
      "/api/orders",
      payload,
      { headers: { "Idempotency-Key": idempotencyKey } }
    );
    if (data.lowStockWarnings?.length) {
      console.warn(
        "[orders] low stock after sale:",
        data.lowStockWarnings.map((w) => `${w.name} — ${w.stockQuantity} ${w.unit} left (warn at ≤ ${w.lowStockThreshold})`).join("; ")
      );
    }
    // If we previously queued this same idempotency key, mark it synced.
    try {
      const queued = await db.ordersQueue.where("idempotencyKey").equals(idempotencyKey).first();
      if (queued) {
        await db.ordersQueue.update(queued.id, { synced: true, lastError: null });
      }
    } catch {
      // best-effort
    }
    return data.order;
  } catch (e) {
    // Network error (fetch threw, no HTTP response) → queue for later replay.
    // HTTP errors (ApiError with status) are NOT queued — they're business-logic rejections.
    const isNetworkError = !(e instanceof ApiError) || (e as ApiError).status === 0 || (e as ApiError).status >= 500;
    if (isNetworkError && typeof window !== "undefined") {
      const queueItem: OrderQueueItem = {
        id: `${OFFLINE_ORDER_PREFIX}${generateId()}`,
        payload,
        idempotencyKey,
        createdAt: Date.now(),
        synced: false,
        attempts: 0,
        lastError: e instanceof Error ? e.message : "Network error",
      };
      try {
        await db.ordersQueue.add(queueItem);
        console.warn("[orders] queued offline for replay:", queueItem.id, queueItem.idempotencyKey);
      } catch (dbErr) {
        console.error("[orders] failed to persist offline queue:", dbErr);
      }
      // Return a synthetic queued result so the UI can print a draft receipt + inform staff.
      return {
        id: queueItem.id,
        orderNumber: queueOrderNumber(queueItem.id.slice(-8)),
        status: "queued",
        total: payload.total,
        items: payload.items,
        customerId: payload.customerId,
        _queued: true,
      } as unknown as Order;
    }
    throw e;
  }
}

/** Replay all unsynced offline orders. Returns { synced, failed, total }. */
export async function syncQueuedOrders(): Promise<{ synced: number; failed: number; total: number }> {
  const unsynced = await db.ordersQueue.filter((item) => !item.synced).sortBy("createdAt");
  let synced = 0;
  let failed = 0;

  for (const item of unsynced) {
    item.attempts += 1;
    try {
      await apiClient.post<{ order: Order }>(
        "/api/orders",
        item.payload as unknown,
        { headers: { "Idempotency-Key": item.idempotencyKey } }
      );
      await db.ordersQueue.update(item.id, { synced: true, lastError: null });
      synced += 1;
    } catch (e) {
      const isNetworkError = !(e instanceof ApiError) || (e as ApiError).status === 0 || (e as ApiError).status >= 500;
      if (isNetworkError) {
        // Still offline — leave for next retry, bump attempts + record error
        await db.ordersQueue.update(item.id, {
          attempts: item.attempts,
          lastError: e instanceof Error ? e.message : "Network error",
        });
        failed += 1;
      } else {
        // Business-logic rejection (400/409/422) — won't succeed on retry. Mark synced to stop retrying.
        await db.ordersQueue.update(item.id, {
          synced: true,
          lastError: e instanceof Error ? e.message : "Rejected by server",
        });
        failed += 1;
        console.warn("[orders] offline queue item rejected by server (not retrying):", item.id, item.lastError);
      }
    }
  }

  return { synced, failed, total: unsynced.length };
}

/** Count of unsynced offline orders (for UI badge). */
export async function getQueuedOrdersCount(): Promise<number> {
  return db.ordersQueue.filter((item) => !item.synced).count();
}

export async function fetchOrders(params?: { page?: number; limit?: number; customerId?: string; search?: string; customer?: string; date?: string; from?: string; to?: string; paymentMethod?: string; channel?: string; status?: string }) {
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
    channel: params?.channel,
    status: params?.status,
  });
}

export async function fetchOrder(id: string) {
  const data = await apiClient.get<{ order: Order }>(`/api/orders/${id}`);
  return data.order;
}

/**
 * Collect counter payment for an online pickup order. Same order row goes
 * pending|confirmed|packed → delivered with payment + counter attribution.
 * Never creates a second sale, never touches stock (already decremented
 * when the customer ordered). Totals stay frozen from the order snapshot.
 */
export async function settleOrder(
  id: string,
  payload: { paymentMethod: "cash" | "upi" | "split"; counterId?: string; splitCash?: number; splitUpi?: number }
) {
  const data = await apiClient.post<{ order: Order }>(`/api/orders/${id}/settle`, payload);
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
    inventory: {
      stockValue: number;
      totalStockedProducts: number;
      outOfStockCount: number;
      lowStockCount: number;
      stockOutRate: number;
      deadStockCount: number;
      deadStockValue: number;
      slowMovers: { name: string; qty: number; stock: number; stockValue: number; sellThroughRate: number }[];
    };
    customers: {
      totalCustomers: number;
      customersWithOrders: number;
      repeatCustomers: number;
      customerLifetimeValue: number;
      repeatPurchaseRate: number;
      cohortRetentionPct: number;
    };
    operations: {
      peakHour: number | null;
      peakDay: string | null;
      basketSize: number;
      discountRate: number;
    };
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

/** Authenticated CSV/JSON export download (cookies + header — never window.open). */
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
