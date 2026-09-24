import Dexie, { type Table } from "dexie";

export interface Product {
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
}

export interface OrderItem {
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
}

export interface Customer {
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
  firstOrderAt?: number | string | Date | null;
  lastOrderAt?: number | string | Date | null;
  deletedAt?: number | string | Date | null;
  createdAt: number | string | Date;
  updatedAt: number | string | Date;
}

export interface Order {
  id: string;
  orderNumber?: string;
  items: OrderItem[];
  total: number;
  discount: number;
  paymentMethod: "cash" | "upi" | "khata" | "split";
  customerId?: string | null;
  customer?: Customer | null;
  status: string;
  syncedAt?: number | string | Date | null;
  orderDate?: number | string | Date;
  createdAt: number | string | Date;
  updatedAt: number | string | Date;
}

export class GbretailDB extends Dexie {
  products!: Table<Product, string>;
  orders!: Table<Order, string>;
  customers!: Table<Customer, string>;

  constructor() {
    super("GbretailPOS");
    this.version(1).stores({
      products: "id, name, category, barcode, is_loose",
      orders: "id, status, createdAt, paymentMethod, syncedAt",
      customers: "id, name, phone, balance",
    });
    this.version(2).stores({
      products: "id, name, category, barcode, is_loose",
      orders: "id, status, createdAt, paymentMethod, syncedAt",
      customers: "id, name, phone, balance, deletedAt, lastOrderAt, totalSpent",
    }).upgrade(() => {});
  }
}

export const db = new GbretailDB();
