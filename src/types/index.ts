// Central domain types — single source of truth for Product/Customer/Order
// All modules (db, store, api, components) should import from "@/types"

export type Product = {
  id: string;
  name: string;
  is_loose: boolean;
  rate_per_kg?: number | null;
  barcode?: string | null;
  price?: number | null;
  costPrice: number;
  unit?: string;
  category: string;
  preset_weights?: number[];
  preset_prices?: number[];
  stockQuantity?: number;
  // Warn when stockQuantity <= lowStockThreshold (in the product's own stock unit). Defaults to 10.
  lowStockThreshold?: number | null;
};

export type LowStockWarning = {
  productId: string;
  name: string;
  stockQuantity: number;
  lowStockThreshold: number;
  unit: string;
};

export type OrderItem = {
  id?: string;
  orderId?: string;
  productId?: string | null;
  name: string;
  price: number;
  unit: string;
  quantity?: number | null;
  weight?: number | null;
  lineTotal: number;
  isCustom: boolean;
  costPrice?: number | null;
  category?: string | null;
};

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  creditLimit?: number | null;
  balance: number;
  totalSpent?: number;
  totalOrders?: number;
  // Accept raw string dates from API; normalized via parseCustomer/toEpoch gives numbers
  firstOrderAt?: number | string | null;
  lastOrderAt?: number | string | null;
  deletedAt?: number | string | null;
  createdAt: number | string;
  updatedAt: number | string;
};

// Normalized API customer (dates as epoch ms) — use parseCustomer() to normalize string|Date
export type RawCustomer = Omit<Customer, "createdAt" | "updatedAt" | "firstOrderAt" | "lastOrderAt" | "deletedAt"> & {
  createdAt: number | string | Date;
  updatedAt: number | string | Date;
  firstOrderAt?: number | string | Date | null;
  lastOrderAt?: number | string | Date | null;
  deletedAt?: number | string | Date | null;
};

export type Order = {
  id: string;
  orderNumber?: string;
  items: OrderItem[];
  total: number;
  discount: number;
  paymentMethod: "cash" | "upi" | "khata" | "split";
  customerId?: string | null;
  customer?: Customer | null;
  status: string;
  syncedAt?: number | string | null;
  orderDate?: number | string;
  createdAt: number | string;
  updatedAt: number | string;
};

export type CartItem = {
  productId?: string;
  name: string;
  price: number;
  unit: string;
  quantity?: number;
  weight?: number;
  lineTotal: number;
  isCustom: boolean;
  costPrice?: number;
  category?: string;
  preset_weights?: number[];
  preset_prices?: number[];
  is_loose?: boolean;
};

export type ReceiptItem = {
  name: string;
  unit?: string;
  lineTotal: number;
  qty?: string;
  rate?: string;
  price?: number;
  perUnit?: string;
  quantity?: number | null;
  weight?: number | null;
  isCustom?: boolean;
};

// Utility: normalize raw API dates to epoch ms
export function toEpoch(v: number | string | Date | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  const t = new Date(v).getTime();
  return isNaN(t) ? null : t;
}

export function parseCustomer(raw: RawCustomer): Customer {
  return {
    ...raw,
    createdAt: toEpoch(raw.createdAt) ?? Date.now(),
    updatedAt: toEpoch(raw.updatedAt) ?? Date.now(),
    firstOrderAt: toEpoch(raw.firstOrderAt),
    lastOrderAt: toEpoch(raw.lastOrderAt),
    deletedAt: toEpoch(raw.deletedAt),
  };
}
