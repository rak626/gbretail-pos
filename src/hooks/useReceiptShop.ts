"use client";

import { useAuthStore } from "@/store/authStore";
import type { ReceiptShop } from "@/lib/print";

/** Current shop as receipt identity (null when signed out — builders fall back). */
export function useReceiptShop(): ReceiptShop | null {
  const shop = useAuthStore((s) => s.shop);
  if (!shop) return null;
  return {
    name: shop.name,
    receiptName: shop.receiptName,
    address: shop.address,
    gstin: shop.gstin,
    phone: shop.phone,
    receiptFooter: shop.receiptFooter,
  };
}
