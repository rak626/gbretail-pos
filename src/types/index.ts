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
  // Public photo URL (http(s)) shown on the online storefront. Null = icon fallback.
  imageUrl?: string | null;
  /** Shop this product row belongs to (for per-shop offline cache isolation). */
  shopId?: string | null;
  /** When this row was cached (epoch ms). Null = not yet cached. */
  cachedAt?: number | null;
};

export type ProductBatch = {
  id: string;
  productId: string;
  shopId: string;
  batchNo: string;
  expiryDate: string | null;
  mrp: number | null;
  costPrice: number;
  quantity: number;
  receivedAt: string;
  deletedAt: string | null;
};

/** Master catalog — global product definition shared across all shops. */
export type MasterProduct = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  barcode: string | null;
  is_loose: boolean;
  unit: string;
  basePrice: number | null;
  imageUrl: string | null;
  preset_weights: number[];
  preset_prices: number[];
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Per-shop product listing — links a shop to a master product. */
export type ShopProduct = {
  id: string;
  shopId: string;
  masterProductId: string;
  masterProduct: MasterProduct;
  isEnabled: boolean;
  shopPrice: number | null;
  costPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  shopBarcode: string | null;
  isOnline: boolean;
  onlinePrice: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Per-shop batch with expiry/MRP tracking. */
export type ShopProductBatch = {
  id: string;
  shopProductId: string;
  shopProduct: ShopProduct;
  batchNo: string;
  expiryDate: string | null;
  mrp: number | null;
  costPrice: number;
  quantity: number;
  receivedAt: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  shopProductId?: string | null;
  shopProductBatchId?: string | null;
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

/** Shop product view for POS inventory - combines MasterProduct + ShopProduct */
export type ShopProductView = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  barcode: string | null;
  is_loose: boolean;
  unit: string;
  basePrice: number | null;
  imageUrl: string | null;
  preset_weights: number[];
  preset_prices: number[];
  isActive: boolean;
  shopProductId: string | null;
  isEnabled: boolean;
  shopPrice: number | null;
  costPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  shopBarcode: string | null;
  isOnline: boolean;
  onlinePrice: number | null;
  status: "out" | "low" | "ok";
  isLow: boolean;
  isOut: boolean;
  /** Nearest batch expiry date (if any batches tracked). */
  nearestExpiry: string | null;
  /** Expiry status of nearest batch. */
  expiryStatus: "ok" | "expiring" | "expired";
  createdAt: string;
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
  cashAmount?: number | null;
  upiAmount?: number | null;
  customerId?: string | null;
  customer?: Customer | null;
  status: string;
  /** pos = counter sale, online = storefront order (pickup settlement keeps this). */
  channel?: string;
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
  /** HSN/SAC code printed against the item line (optional until catalog carries it). */
  hsn?: string | null;
  /** Store/SKU article code printed under the description (falls back to product id tail). */
  articleCode?: string | null;
  /** GST rate for this line; defaults to the bill-level rate. */
  gstRate?: number | null;
  /** MRP when it differs from the selling price (printed as part of the price cell). */
  mrp?: number | null;
  /** Line-level discount amount (informational; bill discount is passed separately). */
  discount?: number | null;
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
