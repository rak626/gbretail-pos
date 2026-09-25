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
