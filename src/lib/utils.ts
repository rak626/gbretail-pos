import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
