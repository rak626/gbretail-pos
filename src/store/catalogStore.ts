import { create } from "zustand";
import { fetchProductsPaged } from "@/lib/api";
import { db } from "@/db/database";
import type { Product } from "@/types";

const PAGE_SIZE = 200;
const CACHE_STALE_MS = 30 * 60 * 1000; // 30 minutes

type CatalogState = {
  products: Product[];
  loaded: boolean;
  loading: boolean;
  error: string;
  shopId: string | null;
  cachedAt: number | null;
  isStale: boolean;
  /** Backend is the source of truth; Dexie holds the last good copy as a speed cache. */
  loadCatalog: (force?: boolean, shopId?: string) => Promise<void>;
  /** Mark stale after inventory mutations — next loadCatalog(true) refetches. */
  invalidate: () => void;
  /** Set the active shop context for per-shop cache isolation. */
  setShop: (shopId: string | null) => void;
};

export const useCatalogStore = create<CatalogState>()((set, get) => ({
  products: [],
  loaded: false,
  loading: false,
  error: "",
  shopId: null,
  cachedAt: null,
  isStale: false,

  invalidate: () => set({ loaded: false, isStale: true }),

  setShop: (shopId) => set({ shopId, loaded: false }),

  loadCatalog: async (force = false, shopIdParam?: string) => {
    const { loaded, loading, shopId } = get();
    const effectiveShopId = shopIdParam ?? shopId;
    if ((loaded && !force) || loading) return;
    set({ loading: true, error: "", shopId: effectiveShopId });
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
      const items = all.map((p) => ({ ...p, shopId: effectiveShopId, cachedAt: Date.now() }));
      try {
        await db.products.clear();
        if (items.length) await db.products.bulkAdd(items);
      } catch {
        // cache write failure must not break billing
      }
      set({ products: items, loaded: true, loading: false, cachedAt: Date.now(), isStale: false });
    } catch (e) {
      // Offline / backend down: serve the last cached catalog for this shop
      try {
        const cached = effectiveShopId
          ? await db.products.where("shopId").equals(effectiveShopId).toArray()
          : await db.products.toArray();
        const now = Date.now();
        const stale = cached.some((p) => !p.cachedAt || now - p.cachedAt > CACHE_STALE_MS);
        set({
          products: cached,
          loaded: true,
          loading: false,
          error: cached.length ? "" : e instanceof Error ? e.message : "Failed to load catalog",
          cachedAt: cached.length ? Math.max(...cached.map((p) => p.cachedAt ?? 0)) : null,
          isStale: stale,
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
