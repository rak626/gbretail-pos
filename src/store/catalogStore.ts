import { create } from "zustand";
import { fetchProductsPaged } from "@/lib/api";
import { db } from "@/db/database";
import type { Product } from "@/types";

const PAGE_SIZE = 200;

type CatalogState = {
  products: Product[];
  loaded: boolean;
  loading: boolean;
  error: string;
  /** Backend is the source of truth; Dexie holds the last good copy for offline billing. */
  loadCatalog: (force?: boolean) => Promise<void>;
};

export const useCatalogStore = create<CatalogState>()((set, get) => ({
  products: [],
  loaded: false,
  loading: false,
  error: "",

  loadCatalog: async (force = false) => {
    const { loaded, loading } = get();
    if ((loaded && !force) || loading) return;
    set({ loading: true, error: "" });
    try {
      // Page through the whole catalog — never silently truncate at 200 SKUs.
      const all: Product[] = [];
      let page = 1;
      for (;;) {
        const res = await fetchProductsPaged({ limit: PAGE_SIZE, page });
        all.push(...res.products);
        if (res.products.length < PAGE_SIZE || all.length >= (res.total ?? 0)) break;
        page += 1;
        if (page > 50) break; // 10k SKU sanity cap
      }
      const items = all;
      try {
        await db.products.clear();
        if (items.length) await db.products.bulkAdd(items);
      } catch {
        // cache write failure must not break billing
      }
      set({ products: items, loaded: true, loading: false });
    } catch (e) {
      // Offline / backend down: serve the last cached catalog
      try {
        const cached = await db.products.toArray();
        set({
          products: cached,
          loaded: true,
          loading: false,
          error: cached.length ? "" : e instanceof Error ? e.message : "Failed to load catalog",
        });
      } catch {
        set({ loading: false, error: e instanceof Error ? e.message : "Failed to load catalog" });
      }
    }
  },
}));

/** Distinct product categories from live data (backend-driven, no hardcoded list). */
export function selectCatalogCategories(products: Product[]): string[] {
  const set = new Set<string>();
  for (const p of products) {
    if (p.category && p.category.trim()) set.add(p.category.trim());
  }
  return ["All", "Loose Items", ...Array.from(set).sort()];
}
