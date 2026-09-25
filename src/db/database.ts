import Dexie, { type Table } from "dexie";
import type { Product, OrderItem, Customer, Order } from "@/types";

// Re-export types for backward compat — single source is @/types
export type { Product, OrderItem, Customer, Order } from "@/types";

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
