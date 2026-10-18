import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Simple unique id — crypto.randomUUID with Math.random fallback. */
export function generateId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    // fall through
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
// Re-export from central format module — keeps backward compat while consolidating logic
export {
  formatINR,
  formatINRReceipt,
  formatDateIN,
  formatDateTimeIN,
  formatLooseQty,
  formatQty,
  calculateLineTotal,
  calculateWeightFromPrice,
  calculatePriceFromWeight,
  getPerUnitText,
  generateOrderNumber,
  formatUPIPaymentUrl,
} from "@/lib/format";
