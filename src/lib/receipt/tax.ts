// GST / money helpers used by the receipt template. Amounts on Indian retail
// bills are tax-inclusive, so the tax component is extracted from the net total.

export const DEFAULT_GST_RATE = 5;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export function round2(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Plain 2-decimal money text (thermal receipts print bare numbers). */
export function money(value: number | string | null | undefined): string {
  const n = Number(value);
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

export type GstBreakdown = {
  rate: number;
  /** Gross (pre-discount, tax-inclusive) value. */
  gross: number;
  /** Net payable (post-discount, tax-inclusive). */
  total: number;
  taxable: number;
  cgst: number;
  sgst: number;
  cess: number;
  tax: number;
};

/**
 * Splits a tax-inclusive amount into taxable value + CGST/SGST.
 * The two halves are normalised so cgst + sgst always equals tax.
 */
export function computeGst(total: number, rate: number, gross = total): GstBreakdown {
  const safeTotal = round2(total);
  const safeGross = round2(gross);
  const safeRate = Number.isFinite(rate) && rate >= 0 ? rate : 0;
  const rawTax = safeRate === 0 ? 0 : (safeTotal * safeRate) / (100 + safeRate);
  const tax = round2(rawTax);
  const cgst = round2(tax / 2);
  const sgst = round2(tax - cgst);
  return {
    rate: safeRate,
    gross: safeGross,
    total: safeTotal,
    taxable: round2(safeTotal - tax),
    cgst,
    sgst,
    cess: 0,
    tax: round2(cgst + sgst),
  };
}

/** dd-MMM-yyyy HH:mm:ss — the format printed on Indian retail tax invoices. */
export function formatBillTimestamp(value: Date | string | number = new Date()): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = MONTHS[d.getMonth()] ?? "";
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${day}-${month}-${year} ${hh}:${mm}:${ss}`;
}

/** dd-MMM-yyyy for header dates (e.g. the GST registration date). */
export function formatGstDate(value: string | Date | null | undefined): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : dateLabel(value);
  }
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  // Date-only ISO strings parse as UTC; pin local midnight so the day is stable.
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw);
  return Number.isNaN(d.getTime()) ? raw : dateLabel(d);
}

function dateLabel(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()] ?? ""} ${d.getFullYear()}`;
}
