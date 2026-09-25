// Central app constants — single source for magic numbers / business rules

export const SEARCH = {
  MIN_LENGTH: 3,
  DEFAULT_LIMIT: 10,
  PAGE_LIMIT: 50,
  INVENTORY_LIMIT: 200,
  DEBOUNCE_MS: 280,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  INVENTORY_PAGE_LIMIT: 200,
} as const;

export const UI = {
  HEADER_HEIGHT_PX: 64,
  SIDEBAR_WIDTH_PX: 220,
  SIDEBAR_COLLAPSED_PX: 64,
  RECEIPT_WIDTH_MM: "58mm",
  FOCUS_DELAY_MS: 50,
  UPI_PRINT_DELAY_MS: 1500,
  DRAWER_RESET_MS: 300,
  CART_MAX_HEIGHT_PX: 520,
} as const;

export const PRODUCT = {
  MAX_RECENT: 10,
  MAX_FREQ_KEYS: 500, // evict oldest when exceeded
  LOW_STOCK_THRESHOLD: 10,
  DEFAULT_STOCK: 100,
} as const;

export const CUSTOMER = {
  PHONE_LENGTH: 10,
  CREDIT_DAYS_OPTIONS: [7, 15, 30] as const,
  DEFAULT_CREDIT_DAYS: 30,
  MAX_CREDIT_DAYS: 365,
  MIN_CREDIT_DAYS: 1,
  MAX_CREDIT_LIMIT: 1_000_000,
  DEFAULT_CREDIT_LIMIT: 10000,
} as const;

export const LEDGER = {
  AGING_BUCKETS: [7, 15, 30, 60] as const,
  DEFAULT_CREDIT_DAYS: 30,
} as const;

export const CURRENCY = {
  LOCALE: "en-IN",
  CURRENCY: "INR",
} as const;

export const SHORTCUTS = {
  FOCUS_SEARCH: "F1",
  SCAN_BARCODE: "F2",
  LOOSE_ITEM: "F3",
  CUSTOM_ITEM: "F4",
  HOLD_BILL: "F5",
  CLEAR_CART: "F6",
  PAY_CASH: "F7",
  PAY_UPI: "F8",
  PAY_KHATA: "F9",
} as const;
