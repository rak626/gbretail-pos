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
