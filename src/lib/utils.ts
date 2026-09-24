export { cn } from "cn"

export function formatUPIPaymentUrl(amount: number, storeId: string = "store@upi"): string {
  const encodedAmount = amount.toFixed(2);
  return `upi://pay?pa=${storeId}&am=${encodedAmount}&tn=Payment+at+GB+Retail`;
}

export function formatINR(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

export function formatQty(quantity?: number, weight?: number, unit: string = "pcs"): string {
  if (weight !== undefined && weight > 0) {
    if (weight >= 1000) {
      return `${(weight / 1000).toFixed(2)} kg`;
    }
    return `${weight}g`;
  }
  if (quantity !== undefined && quantity > 0) {
    return `${quantity} ${unit}`;
  }
  return "-";
}

export function calculateLineTotal(price: number, quantity?: number, weight?: number): number {
  if (weight !== undefined && weight > 0) {
    return parseFloat((price * weight).toFixed(2));
  }
  if (quantity !== undefined && quantity > 0) {
    return parseFloat((price * quantity).toFixed(2));
  }
  return 0;
}

export function calculateWeightFromPrice(price: number, ratePerKg: number): number {
  if (ratePerKg <= 0) return 0;
  return parseFloat((price / ratePerKg).toFixed(4));
}

export function calculatePriceFromWeight(weightGrams: number, ratePerKg: number): number {
  const weightKg = weightGrams / 1000;
  return parseFloat((ratePerKg * weightKg).toFixed(2));
}
