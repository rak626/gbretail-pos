import Dexie, { type Table } from "dexie";
import type { Product, Order } from "@/types";

// Re-export types for backward compat — single source is @/types
export type { Product, OrderItem, Customer, Order } from "@/types";

// Offline order queue item — staged when the backend is unreachable, synced on reconnect.
export type OrderQueueItem = {
  id: string;
  payload: unknown; // full createOrder payload
  idempotencyKey: string;
  createdAt: number;
  synced: boolean;
  attempts: number;
  lastError?: string | null;
};

// Online-only POS by default; Dexie holds the product catalog as a speed cache
// plus an offline order queue (v4). Orders queued offline are replayed with the
// same Idempotency-Key so retries never double-bill.
export class GbretailDB extends Dexie {
  products!: Table<Product, string>;
  ordersQueue!: Table<OrderQueueItem, string>;

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
    this.version(4).stores({
      products: "id, name, category, barcode, is_loose",
      ordersQueue: "id, createdAt, synced",
    }).upgrade(() => {});
  }
}

export const db = new GbretailDB();
