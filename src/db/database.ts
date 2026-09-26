import Dexie, { type Table } from "dexie";
import type { Product } from "@/types";

// Re-export types for backward compat — single source is @/types
export type { Product, OrderItem, Customer, Order } from "@/types";

// Online-only POS: Dexie holds the product catalog as a speed cache (not offline
// billing — all writes require the server). Orders/customers tables removed in v3.
export class GbretailDB extends Dexie {
  products!: Table<Product, string>;

  constructor() {
    super("GbretailPOS");
    this.version(1).stores({
      products: "id, name, category, barcode, is_loose",
    });
    this.version(2).stores({
      products: "id, name, category, barcode, is_loose",
    }).upgrade(() => {});
    this.version(3).stores({
      products: "id, name, category, barcode, is_loose",
      orders: null,
      customers: null,
    }).upgrade(() => {});
  }
}

export const db = new GbretailDB();
