// Tender derivation shared by every print entry point (payment sheet, order
// reprints, customer history). Keeps the receipt's Payment Details section
// consistent with the order's stored payment method.

import type { ReceiptPayment } from "./types";

export type PaymentSource = {
  paymentMethod?: string | null;
  cashAmount?: number | null;
  upiAmount?: number | null;
  total: number;
  upiId?: string | null;
  customerName?: string | null;
};

/** Normalises an order/payment-method pair into printed tender rows. */
export function derivePayments(src: PaymentSource): ReceiptPayment[] {
  const total = Number(src.total) || 0;
  const method = (src.paymentMethod ?? "").toLowerCase();

  if (method === "split") {
    const rows: ReceiptPayment[] = [];
    const cash = Number(src.cashAmount) || 0;
    const upi = Number(src.upiAmount) || 0;
    if (cash > 0) rows.push({ type: "CASH", reference: "-", amount: cash });
    if (upi > 0) rows.push({ type: "UPI", reference: src.upiId || "-", amount: upi });
    if (rows.length === 0) rows.push({ type: "SPLIT", reference: "-", amount: total });
    return rows;
  }
  if (method === "upi") {
    return [{ type: "UPI", reference: src.upiId || "-", amount: total }];
  }
  if (method === "khata" || method === "credit") {
    return [{ type: "KHATA", reference: src.customerName || "-", amount: total }];
  }
  if (method === "card") {
    return [{ type: "CARD", reference: "-", amount: total }];
  }
  if (method) {
    return [{ type: method.toUpperCase(), reference: "-", amount: total }];
  }
  return [{ type: "PAYABLE", reference: "-", amount: total }];
}
