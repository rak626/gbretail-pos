"use client";
import { createOrder } from "@/lib/api";
import { generateReceiptHTML } from "@/lib/print";
import { formatUPIPaymentUrl } from "@/lib/utils";
import type { CartItem } from "@/store/cartStore";

export function buildOrderItems(items: CartItem[]) {
  return items.map((item) => ({
    productId: item.productId || null,
    name: item.name,
    price: item.price,
    unit: item.unit || "pcs",
    quantity: item.quantity ?? null,
    weight: item.weight ?? null,
    lineTotal: item.lineTotal,
    isCustom: item.isCustom,
    costPrice: item.costPrice ?? null,
  }));
}

export function buildReceiptItems(items: CartItem[]) {
  return items.map((item) => ({
    name: item.name,
    unit: item.isCustom
      ? item.unit
      : item.weight
        ? `${item.weight >= 1 ? item.weight.toFixed(3) + " kg" : Math.round(item.weight * 1000) + " g"}`
        : `${item.quantity || 1} ${item.unit}`,
    lineTotal: item.lineTotal,
  }));
}

export function printReceipt(
  orderItems: { name: string; unit: string; lineTotal: number }[],
  total: number,
  disc: number,
  custName?: string,
  orderNumber?: string
) {
  const html = generateReceiptHTML(orderItems, total, disc, custName, orderNumber ?? `ORD-${Date.now().toString(36).toUpperCase()}`);
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    w.print();
  }
}

export async function saveOrder(
  items: CartItem[],
  total: number,
  discount: number,
  paymentMethod: "cash" | "upi" | "khata" | "split",
  currentCustomer: { id?: string; name?: string; phone?: string } | null,
  extra?: { customerName?: string; customerPhone?: string }
) {
  if (items.length === 0) return null;
  try {
    const order = (await createOrder({
      items: buildOrderItems(items),
      total,
      discount,
      paymentMethod,
      customerId: currentCustomer?.id,
      customerName: extra?.customerName ?? currentCustomer?.name,
      customerPhone: extra?.customerPhone ?? currentCustomer?.phone,
    })) as unknown as { orderNumber: string; customer?: unknown };
    return order as unknown as { orderNumber: string; customer?: unknown };
  } catch (e) {
    console.warn("[payment] order save failed, proceeding offline:", e instanceof Error ? e.message : e);
    return null;
  }
}

export function openUpiUrl(total: number) {
  const url = formatUPIPaymentUrl(total);
  window.open(url, "_blank");
}
