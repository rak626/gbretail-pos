import type { Product } from "@/types";

// Warn-only low-stock helpers — sales are never blocked, only badged.
// Threshold is per product, in the product's own stock unit (10 pcs, 2 bags, 5 kg).
export const DEFAULT_LOW_STOCK_THRESHOLD = 10;

type StockLike = Pick<Product, "stockQuantity" | "lowStockThreshold">;

export function lowStockThresholdOf(p: StockLike): number {
  return p.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
}

export function isOutOfStock(p: StockLike): boolean {
  if (p.stockQuantity == null) return false;
  return p.stockQuantity <= 0;
}

export function isLowStock(p: StockLike): boolean {
  if (p.stockQuantity == null) return false;
  return p.stockQuantity > 0 && p.stockQuantity <= lowStockThresholdOf(p);
}

export type StockStatus = "out" | "low" | "ok";

/** Single helper for UI health dots, filters and sort. */
export function stockStatusOf(p: StockLike): StockStatus {
  if (isOutOfStock(p)) return "out";
  if (isLowStock(p)) return "low";
  return "ok";
}

/** Batch expiry helpers — warn when batches are expired or nearing expiry. */
export type BatchExpiryStatus = "ok" | "expiring" | "expired";

const DAYS_UNTIL_EXPIRY_WARN = 30; // warn when a batch expires within 30 days

export function daysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const t = new Date(expiryDate).getTime();
  if (isNaN(t)) return null;
  const now = Date.now();
  return Math.max(0, Math.ceil((t - now) / (1000 * 60 * 60 * 24)));
}

export function batchExpiryStatus(expiryDate: string | null): BatchExpiryStatus {
  const days = daysUntilExpiry(expiryDate);
  if (days == null) return "ok";
  if (days <= 0) return "expired";
  if (days <= DAYS_UNTIL_EXPIRY_WARN) return "expiring";
  return "ok";
}

export function nearestBatchExpiry(batches: { expiryDate: string | null }[]): { expiryDate: string | null; status: BatchExpiryStatus; days: number | null } | null {
  const withDates = batches.filter((b) => b.expiryDate);
  if (withDates.length === 0) return null;
  const sorted = withDates.sort((a, b) => {
    const da = new Date(a.expiryDate!).getTime();
    const db = new Date(b.expiryDate!).getTime();
    return da - db;
  });
  const nearest = sorted[0];
  if (!nearest) return null;
  const days = daysUntilExpiry(nearest.expiryDate);
  return { expiryDate: nearest.expiryDate, status: batchExpiryStatus(nearest.expiryDate), days };
}

type PriceLike = {
  price?: number | null;
  rate_per_kg?: number | null;
  costPrice?: number | null;
  is_loose?: boolean;
};

/** Selling price regardless of loose/packaged. */
export function sellPriceOf(p: PriceLike): number {
  if (p.is_loose) return Number(p.rate_per_kg ?? 0) || 0;
  return Number(p.price ?? 0) || 0;
}

export function marginOf(p: PriceLike): number {
  return sellPriceOf(p) - (Number(p.costPrice ?? 0) || 0);
}

export function marginPctOf(p: PriceLike): number | null {
  const sell = sellPriceOf(p);
  if (!sell || sell <= 0) return null;
  return (marginOf(p) / sell) * 100;
}
