// Central formatting utilities — single source for currency / qty / rate labels
// All components should import from "@/lib/format" instead of duplicating logic

import { CURRENCY } from "@/config/constants";

const inrFormatter = new Intl.NumberFormat(CURRENCY.LOCALE, {
  style: "currency",
  currency: CURRENCY.CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format INR with consistent precision. Coerces strings/null defensively. */
export function formatINR(amount: number | string | null | undefined, opts?: { compact?: boolean }): string {
  const n = Number(amount);
  const raw = inrFormatter.format(isFinite(n) ? n : 0);
  if (opts?.compact) return raw.replace(".00", "");
  return raw;
}

/** Alias for receipt printing (always 2 decimals) */
export function formatINRReceipt(amount: number | string | null | undefined): string {
  const n = Number(amount);
  return `₹${(isFinite(n) ? n : 0).toFixed(2)}`;
}

export function formatDateIN(date: string | number | Date, opts?: Intl.DateTimeFormatOptions): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", opts ?? { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTimeIN(date: string | number | Date): string {
  const d = new Date(date);
  return `${d.toLocaleDateString("en-IN")} ${d.toLocaleTimeString("en-IN")}`;
}

/** Loose weight formatting — weight in kg */
export function formatLooseQty(weight?: number | null): string {
  if (!weight || weight <= 0) return "0 g";
  if (weight >= 1) return `${weight.toFixed(3)} kg`;
  const g = Math.round(weight * 1000);
  return `${g} g`;
}

/** Quantity label for cart/receipt */
export function formatQty(quantity?: number | null, weight?: number | null, unit = "pcs"): string {
  if (weight != null && weight > 0) return formatLooseQty(weight);
  if (quantity != null && quantity > 0) return `${quantity} ${unit}`;
  return "-";
}

/** Line total from price*qty or price*weight */
export function calculateLineTotal(price: number, quantity?: number | null, weight?: number | null): number {
  if (weight != null && weight > 0) return parseFloat((price * weight).toFixed(2));
  if (quantity != null && quantity > 0) return parseFloat((price * quantity).toFixed(2));
  return 0;
}

export function calculateWeightFromPrice(price: number, ratePerKg: number): number {
  if (ratePerKg <= 0) return 0;
  return parseFloat((price / ratePerKg).toFixed(4));
}

export function calculatePriceFromWeight(weightGrams: number, ratePerKg: number): number {
  if (weightGrams <= 0 || ratePerKg <= 0) return 0;
  const weightKg = weightGrams / 1000;
  return parseFloat((ratePerKg * weightKg).toFixed(2));
}

/** Unified per-unit label: "per pc" | "per pack" | "per kg" */
export function getPerUnitText(item: { isCustom?: boolean; is_loose?: boolean; unit?: string; weight?: number | null }): string {
  if (item.isCustom) {
    const u = item.unit?.toLowerCase();
    if (u === "pcs" || u === "pc" || u === "pcs.") return "per pc";
    if (u === "pack" || u === "pkt" || u === "packet") return "per pack";
    return `per ${item.unit || "pc"}`;
  }
  const isLoose = !!item.is_loose || (!!item.weight && item.weight > 0);
  if (isLoose) return "per kg";
  const u = item.unit?.toLowerCase();
  if (u === "kg" || u === "g") return "per kg";
  if (u === "pcs" || u === "pc") return "per pc";
  return "per pack";
}

export function generateOrderNumber(date = new Date()): string {
  return `ORD-${Date.now().toString(36).toUpperCase()}`;
}

export function formatUPIPaymentUrl(amount: number, upiId?: string | null, merchantName?: string | null): string {
  const pa = upiId?.trim() || "store@upi";
  const n = Number(amount);
  const am = (isFinite(n) ? n : 0).toFixed(2);
  const tn = `Payment+at+${encodeURIComponent((merchantName?.trim() || "Store").replace(/\s+/g, " "))}`;
  return `upi://pay?pa=${encodeURIComponent(pa)}&am=${am}&tn=${tn}`;
}
