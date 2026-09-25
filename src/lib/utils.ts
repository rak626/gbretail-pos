export { cn } from "cn"
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
