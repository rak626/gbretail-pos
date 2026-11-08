// Receipt domain types — kept separate from print.ts so the template,
// barcode and tax helpers can be unit-tested without a DOM.

/** Per-shop billing identity for receipts. Falls back to plain shop name. */
export type ReceiptShop = {
  name: string;
  receiptName?: string | null;
  address?: string | null;
  city?: string | null;
  gstin?: string | null;
  upiId?: string | null;
  phone?: string | null;
  receiptFooter?: string | null;
  /** Registered company line printed above the address (optional). */
  companyName?: string | null;
  /** FSSAI licence number printed under the GST line (optional). */
  fssai?: string | null;
  /** Date printed next to GSTIN, e.g. "01 Jul 2017" (optional). */
  gstDate?: string | null;
  /** Franchise/ownership note printed in small type (optional). */
  franchiseNote?: string | null;
  /** Default GST rate for the shop; bill-level meta overrides it. */
  gstRate?: number | null;
  /** Loyalty programme phone shown on the receipt (optional). */
  loyaltyPhone?: string | null;
  /** "Powered By" brand line; defaults to GB Retail. */
  poweredBy?: string | null;
};

export type ReceiptPaymentType = "CASH" | "UPI" | "CARD" | "KHATA" | "SPLIT" | string;

export type ReceiptPayment = {
  type: ReceiptPaymentType;
  reference?: string | null;
  amount: number;
};

/** Bill-level metadata printed above/below the item table. */
export type ReceiptMeta = {
  /** Server bill number. When absent the receipt is marked as a draft/pre-bill. */
  billNo?: string | null;
  /** Bill timestamp; defaults to now. */
  billDate?: Date | string | number;
  /** Counter session number; defaults to 1. */
  sessionNo?: string | number | null;
  /** Counter label/number, e.g. "04" or "Counter 4". */
  counterNo?: string | null;
  /** Cashier name. */
  cashier?: string | null;
  /** Tender rows. When omitted a single paid row is printed. */
  payments?: ReceiptPayment[];
  /** Bill-level GST rate (percent). Defaults to shop rate or 5%. */
  gstRate?: number;
  customerName?: string | null;
  customerPhone?: string | null;
  /** Document title; defaults to "TAX INVOICE" (drafts print "PRE-BILL"). */
  title?: string | null;
  /** Printable width; defaults to UI.RECEIPT_WIDTH_MM. */
  widthMm?: string | null;
  /** Explicit draft marker; inferred when billNo is empty/looks like a draft. */
  isDraft?: boolean;
};

/** Everything the template needs, assembled by the callers. */
export type ReceiptContext = {
  items: import("@/types").ReceiptItem[];
  total: number;
  discount: number;
  shop?: ReceiptShop | null;
  meta?: ReceiptMeta | null;
};
