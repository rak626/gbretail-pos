import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCatalogStore } from "./catalogStore";

vi.mock("@/lib/api", () => ({
  fetchProductsPaged: vi.fn(),
}));
vi.mock("@/db/database", () => ({
  db: { products: { clear: vi.fn(async () => {}), bulkAdd: vi.fn(async () => {}), toArray: vi.fn(async () => []) } },
}));

import { fetchProductsPaged } from "@/lib/api";

describe("catalogStore", () => {
  beforeEach(() => {
    useCatalogStore.setState({ products: [], loaded: false, loading: false, error: "" });
    vi.mocked(fetchProductsPaged).mockReset();
  });

  it("pages until short page and caches", async () => {
    const p1 = Array.from({ length: 200 }, (_, i) => ({ id: `p${i}` }));
    vi.mocked(fetchProductsPaged)
      .mockResolvedValueOnce({ products: p1, total: 250, page: 1, limit: 200 } as any)
      .mockResolvedValueOnce({ products: Array.from({ length: 50 }, (_, i) => ({ id: `q${i}` })), total: 250, page: 2, limit: 200 } as any);
    await useCatalogStore.getState().loadCatalog();
    expect(useCatalogStore.getState().products).toHaveLength(250);
    expect(useCatalogStore.getState().loaded).toBe(true);
  });

  it("invalidate() forces refetch", async () => {
    vi.mocked(fetchProductsPaged).mockResolvedValue({ products: [], total: 0, page: 1, limit: 200 } as any);
    await useCatalogStore.getState().loadCatalog();
    expect(vi.mocked(fetchProductsPaged)).toHaveBeenCalledTimes(1);
    await useCatalogStore.getState().loadCatalog();
    expect(vi.mocked(fetchProductsPaged)).toHaveBeenCalledTimes(1);
    useCatalogStore.getState().invalidate();
    await useCatalogStore.getState().loadCatalog();
    expect(vi.mocked(fetchProductsPaged)).toHaveBeenCalledTimes(2);
  });
});
