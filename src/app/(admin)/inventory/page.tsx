"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";
import {
  fetchMasterProducts,
  createMasterProduct,
  createMasterProductsBatch,
  enableShopProduct,
  fetchShopProducts,
  updateShopProduct,
  deleteShopProduct,
  createShopProductBatch,
  fetchShopProductBatches,
} from "@/lib/api";
import type { MasterProduct, ShopProduct, ShopProductBatch, ShopProductView } from "@/types";
import { fetchMe } from "@/lib/authApi";
import { useConfirm } from "@/components/confirm-dialog";
import { useOfflineBlock } from "@/hooks/useOfflineBlock";
import { useAuthStore } from "@/store/authStore";
import { downloadCsv } from "@/lib/inventoryCsv";
import InventoryStats from "@/components/inventory/InventoryStats";
import InventoryToolbar from "@/components/inventory/InventoryToolbar";
import ProductTable from "@/components/inventory/ProductTable";
import ProductDialog, { isValidImageUrl } from "@/components/inventory/ProductDialog";
import RestockDialog from "@/components/inventory/RestockDialog";
import ImportDialog from "@/components/inventory/ImportDialog";
import { emptyProductForm, type Product, type ProductForm } from "@/components/inventory/types";
import { toEpoch } from "@/types";
import { nearestBatchExpiry } from "@/lib/stock";
import { Package, Plus, Shield, ChevronLeft, ChevronRight, ToggleRight, ToggleLeft } from "lucide-react";

const SEARCH_MIN = 2;

export default function InventoryPage() {
  const [masterProducts, setMasterProducts] = useState<MasterProduct[]>([]);
  const [shopProducts, setShopProducts] = useState<ShopProduct[]>([]);
  const [allBatches, setAllBatches] = useState<ShopProductBatch[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "low" | "out">("all");
  const [sortBy, setSortBy] = useState<"name" | "stock" | "category" | "recent">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState<{
    total: number;
    low: number;
    out: number;
    categories: string[];
    stockValueCost?: number;
    stockValueSell?: number;
    expiringSoon?: number;
    expired?: number;
  }>({ total: 0, low: 0, out: 0, categories: [] });
  const PAGE_LIMIT = 50;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const searchRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const actor = useAuthStore((s) => s.user);
  const { confirm, notify } = useConfirm();
  const { offline, block, reason } = useOfflineBlock(notify);
  const isStaff = actor?.role === "STAFF";
  const showCost = !isStaff;
  const [grantChecked, setGrantChecked] = useState(!isStaff);

  useEffect(() => {
    if (!isStaff) return;
    let cancelled = false;
    fetchMe()
      .then((data) => {
        if (cancelled) return;
        const fresh = (data as unknown as { user?: unknown }).user as { canManageInventory?: boolean } | undefined;
        if (fresh) {
          const state = useAuthStore.getState();
          if (state.user) useAuthStore.setState({ user: { ...state.user, canManageInventory: Boolean(fresh.canManageInventory) } });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setGrantChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isStaff]);

  const hasInventoryAccess = !isStaff || Boolean((actor as unknown as { canManageInventory?: boolean })?.canManageInventory);

  // dialog state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MasterProduct | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyProductForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // restock dialog (shop product level)
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockShopProduct, setRestockShopProduct] = useState<ShopProduct | null>(null);
  const [restockQty, setRestockQty] = useState("");
  const [restockPrice, setRestockPrice] = useState("");
  const [restockRate, setRestockRate] = useState("");
  const [restockBatchNo, setRestockBatchNo] = useState("");
  const [restockExpiryDate, setRestockExpiryDate] = useState("");
  const [restockMrp, setRestockMrp] = useState("");
  const [restockCost, setRestockCost] = useState("");
  const [restockSaving, setRestockSaving] = useState(false);
  const [restockError, setRestockError] = useState("");

  // import dialog
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");

  const loadMeta = useCallback(async () => {
    try {
      const m = await import("@/lib/api").then((m) => m.fetchProductsMeta());
      setMeta(m);
    } catch {
      // header keeps last good values
    }
  }, []);

  const loadMasterProducts = useCallback(async (opts?: { searchVal?: string; cat?: string; pageNum?: number; by?: string; order?: "asc" | "desc" }) => {
    const s = opts?.searchVal !== undefined ? opts.searchVal : search;
    const cc = opts?.cat !== undefined ? opts.cat : category;
    const pg = opts?.pageNum !== undefined ? opts.pageNum : page;
    const by = opts?.by !== undefined ? opts.by : sortBy;
    const order = opts?.order !== undefined ? opts.order : sortOrder;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");
    try {
      const q = s && s.trim().length >= SEARCH_MIN && !s.startsWith(" ") ? s.trim() : undefined;
      const data = await fetchMasterProducts(
        { search: q, category: cc !== "All" ? cc : undefined, limit: PAGE_LIMIT, page: pg },
        { signal: controller.signal }
      );
      if (controller.signal.aborted) return;
      setMasterProducts(data.masterProducts as unknown as MasterProduct[]);
      setTotal(data.total);
      setPage(data.page);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Failed to load catalog");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [search, category, page, sortBy, sortOrder]);

  const loadShopProducts = useCallback(async () => {
    try {
      const data = await fetchShopProducts({ limit: 500, page: 1 });
      const products = data.shopProducts as unknown as ShopProduct[];
      setShopProducts(products);
      // Fetch all batches for expiry tracking
      const batchData = await fetchShopProductBatches({ activeOnly: true });
      setAllBatches(batchData.batches as unknown as ShopProductBatch[]);
    } catch {
      // best-effort; shop products loaded on demand
    }
  }, []);

  useEffect(() => {
    if (!grantChecked) return;
    if (!hasInventoryAccess) {
      setLoading(false);
      return;
    }
    void loadMasterProducts({ pageNum: 1 });
    void loadShopProducts();
    void loadMeta();
  }, [grantChecked, hasInventoryAccess]);

  // search shortcuts
  useEffect(() => {
    const h = () => searchRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("focus-search", h);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("focus-search", h);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const doSearchApi = useCallback(async (trimmed: string) => {
    if (trimmed.startsWith(" ") || (trimmed && trimmed.length < SEARCH_MIN)) return;
    setPage(1);
    await loadMasterProducts({ searchVal: trimmed, pageNum: 1 });
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [loadMasterProducts]);

  const handleImmediate = (v: string) => {
    if (v.startsWith(" ")) return;
    setSearch(v);
    if (!v.trim()) void doSearchApi("");
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const handleDebouncedSearch = (trimmed: string) => {
    if (!trimmed || trimmed.length < SEARCH_MIN || trimmed.startsWith(" ")) {
      if (!trimmed) void doSearchApi("");
      return;
    }
    void doSearchApi(trimmed);
  };

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const p of masterProducts) {
      if (p.category) cats.add(p.category);
    }
    return ["All", "Loose Items", ...Array.from(cats).sort()];
  }, [masterProducts]);

  // Merge master products with shop product state
  const shopProductMap = useMemo(() => {
    const m = new Map<string, ShopProduct>();
    for (const sp of shopProducts) {
      m.set(sp.masterProductId, sp);
    }
    return m;
  }, [shopProducts]);

  const displayProducts = useMemo(() => {
    // Batch expiry lookup by shopProductId
    const batchBySp = new Map<string, ShopProductBatch[]>();
    for (const b of allBatches) {
      const arr = batchBySp.get(b.shopProductId) ?? [];
      arr.push(b);
      batchBySp.set(b.shopProductId, arr);
    }
    return masterProducts.map((mp) => {
      const sp = shopProductMap.get(mp.id);
      const isEnabled = !!sp?.isEnabled;
      const stock = sp?.stockQuantity ?? 0;
      const threshold = sp?.lowStockThreshold ?? 10;
      const isLow = stock > 0 && stock <= threshold;
      const isOut = stock <= 0;
      const status: "out" | "low" | "ok" = isOut ? "out" : isLow ? "low" : "ok";
      // Nearest batch expiry
      const batches = batchBySp.get(sp?.id ?? "") ?? [];
      const nearest = nearestBatchExpiry(batches);
      return {
        ...mp,
        id: mp.id,
        shopProductId: sp?.id,
        isEnabled,
        stockQuantity: stock,
        lowStockThreshold: threshold,
        shopPrice: sp?.shopPrice ?? mp.basePrice ?? 0,
        costPrice: sp?.costPrice ?? 0,
        shopBarcode: sp?.shopBarcode ?? mp.barcode,
        isOnline: sp?.isOnline ?? false,
        onlinePrice: sp?.onlinePrice ?? mp.basePrice ?? null,
        status,
        isLow,
        isOut,
        nearestExpiry: nearest?.expiryDate ?? null,
        expiryStatus: nearest?.status ?? "ok",
        createdAt: mp.createdAt,
      } as ShopProductView;
    });
  }, [masterProducts, shopProductMap, allBatches]);

  const filtered = useMemo(() => {
    let items = displayProducts;
    if (search && search.trim().length >= SEARCH_MIN && !search.startsWith(" ")) {
      const q = search.trim().toLowerCase();
      items = items.filter((p) => p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q)) || (p.brand && p.brand.toLowerCase().includes(q)));
    }
    if (category && category !== "All") {
      if (category === "Loose Items") {
        items = items.filter((p) => p.is_loose);
      } else {
        items = items.filter((p) => p.category === category);
      }
    }
    if (stockFilter !== "all") {
      items = items.filter((p) => {
        if (stockFilter === "out") return p.isOut;
        if (stockFilter === "in") return !p.isOut && !p.isLow;
        if (stockFilter === "low") return p.isLow;
        return true;
      });
    }
    if (sortBy === "name") items.sort((a, b) => a.name.localeCompare(b.name) * (sortOrder === "asc" ? 1 : -1));
    if (sortBy === "stock") items.sort((a, b) => ((a.stockQuantity ?? 0) - (b.stockQuantity ?? 0)) * (sortOrder === "asc" ? 1 : -1));
    if (sortBy === "category") items.sort((a, b) => a.category.localeCompare(b.category) * (sortOrder === "asc" ? 1 : -1));
    if (sortBy === "recent") items.sort((a, b) => ((toEpoch(a.createdAt) ?? 0) - (toEpoch(b.createdAt) ?? 0)) * (sortOrder === "asc" ? 1 : -1));
    return items;
  }, [displayProducts, search, category, stockFilter, sortBy, sortOrder]);

  const pickCategory = (cat: string) => {
    setCategory(cat);
    setPage(1);
    void loadMasterProducts({ cat, pageNum: 1 });
  };

  const pickStockFilter = (f: "all" | "in" | "low" | "out") => {
    setStockFilter(f);
    setPage(1);
  };

  const pickSort = (by: string, order: "asc" | "desc") => {
    setSortBy(by as any);
    setSortOrder(order);
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyProductForm);
    setFormError("");
    setOpen(true);
  };

  const openEdit = (mp: MasterProduct) => {
    setEditing(mp);
    setForm({
      name: mp.name,
      category: mp.category,
      is_loose: !!mp.is_loose,
      price: mp.basePrice != null ? String(mp.basePrice) : "",
      costPrice: "",
      rate_per_kg: mp.is_loose && mp.basePrice != null ? String(mp.basePrice) : "",
      barcode: mp.barcode ?? "",
      unit: mp.unit ?? "pcs",
      stockQuantity: "100",
      lowStockThreshold: "10",
      description: "",
      imageUrl: mp.imageUrl ?? "",
    });
    setFormError("");
    setOpen(true);
  };

  const handleSave = async () => {
    if (await block()) return;
    setFormError("");
    if (!form.name.trim()) return setFormError("Product name is required");
    if (!form.category) return setFormError("Category is required");
    if (!form.costPrice || isNaN(Number(form.costPrice)) || Number(form.costPrice) < 0) return setFormError("Buying price is required and must be >= 0");
    if (form.is_loose) {
      if (!form.rate_per_kg || isNaN(Number(form.rate_per_kg)) || Number(form.rate_per_kg) <= 0)
        return setFormError("Rate per kg is required for loose items");
    } else {
      if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0)
        return setFormError("Selling price is required for packaged items");
    }
    if (form.barcode && form.barcode.length < 8) return setFormError("Barcode should be at least 8 characters");
    if (form.lowStockThreshold.trim() !== "" && (isNaN(Number(form.lowStockThreshold)) || Number(form.lowStockThreshold) < 0))
      return setFormError("Low-stock warning level must be 0 or more");
    if (!isValidImageUrl(form.imageUrl)) return setFormError("Photo must be an http(s) link, or leave it empty");

    setSaving(true);
    try {
      const payload: {
        id?: string;
        name: string;
        category: string;
        is_loose: boolean;
        barcode: string | undefined;
        costPrice: number;
        unit: string;
        basePrice: number | undefined;
        imageUrl: string | undefined;
      } = {
        id: editing?.id,
        name: form.name.trim(),
        category: form.category,
        is_loose: form.is_loose,
        barcode: form.barcode.trim() || undefined,
        costPrice: Number(form.costPrice),
        unit: form.unit.trim() || "pcs",
        basePrice: form.is_loose ? Number(form.rate_per_kg) || undefined : Number(form.price) || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
      };
      await createMasterProduct(payload);
      await loadMasterProducts();
      void loadMeta();
      setOpen(false);
      setEditing(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleEnable = async (mp: MasterProduct, enable: boolean) => {
    if (await block()) return;
    const sp = shopProductMap.get(mp.id);
    if (enable && sp) return; // already enabled
    if (!enable && !sp) return; // already disabled

    try {
      if (enable) {
        await enableShopProduct({
          masterProductId: mp.id,
          shopPrice: mp.basePrice ?? undefined,
          costPrice: 0,
          stockQuantity: 0,
          lowStockThreshold: 10,
        });
      } else {
        await deleteShopProduct(sp!.id);
      }
      await loadShopProducts();
      await loadMasterProducts({ pageNum: page });
      await notify({ title: enable ? "Product enabled" : "Product disabled", description: `${mp.name} is now ${enable ? "available" : "hidden"} at this shop.` });
    } catch (e) {
      await notify({ title: "Action failed", description: e instanceof Error ? e.message : "Unknown error", danger: true });
    }
  };

  const openRestock = (sp: ShopProduct) => {
    setRestockShopProduct(sp);
    setRestockQty("");
    setRestockBatchNo("");
    setRestockExpiryDate("");
    setRestockMrp("");
    setRestockCost(String(sp.costPrice ?? 0));
    if (sp.masterProduct.is_loose) {
      setRestockPrice("");
      setRestockRate(String(sp.masterProduct.basePrice ?? 0));
    } else {
      setRestockPrice(String(sp.shopPrice ?? sp.masterProduct.basePrice ?? 0));
      setRestockRate("");
    }
    setRestockError("");
    setRestockOpen(true);
  };

  const handleRestock = async () => {
    if (!restockShopProduct) return;
    if (await block()) return;
    setRestockError("");
    const add = Number(restockQty);
    if (!restockQty || isNaN(add) || add <= 0) return setRestockError("Enter valid quantity to add (e.g., 40)");
    if (!restockShopProduct.masterProduct.is_loose && !restockBatchNo.trim()) return setRestockError("Batch number is required (e.g., BATCH-001)");

    const expiry = restockExpiryDate.trim() !== "" ? restockExpiryDate : null;
    const mrpVal = restockMrp.trim() !== "" ? Number(restockMrp) : null;
    if (mrpVal != null && (isNaN(mrpVal) || mrpVal < 0)) return setRestockError("MRP must be 0 or more");

    setRestockSaving(true);
    try {
      await createShopProductBatch({
        shopProductId: restockShopProduct.id,
        batchNo: restockBatchNo.trim(),
        expiryDate: expiry,
        mrp: mrpVal,
        costPrice: restockCost.trim() !== "" ? Number(restockCost) : restockShopProduct.costPrice,
        quantity: add,
      });

      await loadShopProducts();
      await loadMasterProducts({ pageNum: page });
      void loadMeta();
      setRestockOpen(false);
      setRestockShopProduct(null);
    } catch (e) {
      setRestockError(e instanceof Error ? e.message : "Restock failed");
    } finally {
      setRestockSaving(false);
    }
  };

  const handleDelete = async (mp: MasterProduct) => {
    if (await block()) return;
    const ok = await confirm({
      title: `Delete "${mp.name}"?`,
      description: "Soft delete — hidden from all shops. Past orders keep history.",
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteShopProduct(mp.id); // soft deletes shop product (master stays)
      // Note: master product delete is SUPER_ADMIN only via separate admin flow
      await loadShopProducts();
      await loadMasterProducts({ pageNum: page });
    } catch (e) {
      await notify({ title: "Delete failed", description: e instanceof Error ? e.message : "Delete failed", danger: true });
    }
  };

  const adjustStock = async (sp: ShopProduct, delta: number) => {
    if (await block()) return;
    const newQty = Math.max(0, (sp.stockQuantity ?? 0) + delta);
    try {
      await updateShopProduct(sp.id, { stockQuantity: newQty });
      await loadShopProducts();
      void loadMeta();
    } catch (e) {
      await notify({ title: "Stock update failed", description: e instanceof Error ? e.message : "Stock update failed", danger: true });
    }
  };

  const handleExport = async () => {
    try {
      const all = filtered;
      const csv = all.map((p) => ({
        name: p.name,
        category: p.category,
        brand: p.brand,
        barcode: p.shopBarcode || p.barcode,
        is_loose: p.is_loose,
        unit: p.unit,
        basePrice: p.shopPrice ?? p.basePrice,
        stockQuantity: p.stockQuantity,
        lowStockThreshold: p.lowStockThreshold,
        isEnabled: p.isEnabled,
      }));
      const headers = Object.keys(all[0] ?? {}).join(",");
      const rows = all.map((r) => Object.values(r).join(",")).join("\n");
      const csvContent = `${headers}\n${rows}`;
      downloadCsv(`inventory-${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
      await notify({ title: `Exported ${all.length} products`, description: "CSV downloaded." });
    } catch (e) {
      await notify({ title: "Export failed", description: e instanceof Error ? e.message : "Export failed", danger: true });
    }
  };

  const handleImport = async (rows: Array<Record<string, string>>) => {
    if (await block()) return;
    setImporting(true);
    setImportProgress("");
    try {
      const items: Record<string, unknown>[] = [];
      let skipped = 0;
      for (const r of rows) {
        const name = (r.name || "").trim();
        if (!name) { skipped++; continue; }
        const typeRaw = (r.type || r.kind || "packaged").toLowerCase();
        const isLoose = typeRaw.startsWith("loose");
        const sell = Number(r.sellprice ?? r.sellPrice ?? r.price ?? r.rate ?? "");
        const cost = Number(r.costprice ?? r.costPrice ?? r.cost ?? 0);
        if (isLoose && (!sell || sell <= 0)) { skipped++; continue; }
        if (!isLoose && (isNaN(sell) || sell < 0)) { skipped++; continue; }
        if (isNaN(cost) || cost < 0) { skipped++; continue; }
        items.push({
          name,
          category: (r.category || "Staples").trim() || "Staples",
          brand: (r.brand || "").trim() || null,
          barcode: (r.barcode || "").trim() || null,
          is_loose: isLoose,
          unit: (r.unit || (isLoose ? "kg" : "pcs")).trim() || "pcs",
          basePrice: isLoose ? sell : (sell || 0),
          imageUrl: (r.imageurl || r.photo || "").trim() || null,
        });
      }
      setImportProgress(`Uploading ${items.length} rows…`);
      try {
        const res = await createMasterProductsBatch(items);
        await loadMasterProducts({ pageNum: 1 });
        await loadShopProducts();
        void loadMeta();
        setImportOpen(false);
        await notify({ title: `Import done: ${res.count} added`, description: skipped ? `${skipped} rows skipped` : "All rows imported." });
      } catch (e) {
        await notify({ title: "Import failed", description: e instanceof Error ? e.message : "Import failed", danger: true });
      }
    } finally {
      setImporting(false);
      setImportProgress("");
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto p-4 pb-6 min-h-0">
      {!grantChecked ? (
        <div className="flex-1 flex items-center justify-center p-8 text-sm text-muted-foreground">Checking inventory access…</div>
      ) : !hasInventoryAccess ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-md w-full">
            <CardContent className="p-6 text-center">
              <Shield className="w-10 h-10 mx-auto text-destructive mb-3" />
              <div className="font-semibold">Access Denied</div>
              <div className="text-xs text-muted-foreground mt-1">Inventory access is granted by your shop owner. Ask the owner to enable Stock access for your account.</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div className="max-w-7xl mx-auto space-y-4 w-full flex-1 flex flex-col min-h-0">
            <InventoryStats
              total={meta.total}
              low={meta.low}
              out={meta.out}
              expiringSoon={meta.expiringSoon}
              expired={meta.expired}
              categories={meta.categories.length}
              stockValueSell={meta.stockValueSell}
              stockValueCost={meta.stockValueCost}
              showCost={showCost}
              activeFilter={stockFilter}
              onSelectFilter={pickStockFilter}
            />

            <InventoryToolbar
              search={search}
              onSearchChange={handleImmediate}
              onSearch={handleDebouncedSearch}
              onClearSearch={() => void doSearchApi("")}
              onFocusSearch={(q) => void doSearchApi(q.trim())}
              searchRef={searchRef}
              categories={availableCategories}
              category={category}
              onCategory={pickCategory}
              stockFilter={stockFilter}
              onStockFilter={pickStockFilter}
              sortBy={sortBy as any}
              sortOrder={sortOrder}
              onSort={pickSort}
              onAdd={openAdd}
              onExport={() => void handleExport()}
              onImportClick={() => setImportOpen(true)}
              offline={offline}
              offlineReason={reason}
              resultCount={filtered.length}
            />

            <Card className="py-0 overflow-hidden flex-1 flex flex-col min-h-0">
              <CardHeader className="py-4 border-b bg-muted/10 flex-row items-center justify-between">
                <CardTitle className="text-[15px] flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" /> Product Inventory
                  <Badge variant="outline" className="ml-2 font-normal text-sm px-2.5 py-0.5">{total} items</Badge>
                  {stockFilter !== "all" && <Badge className="font-normal">{stockFilter === "low" ? "Low only" : stockFilter === "out" ? "Out only" : "In stock only"}</Badge>}
                </CardTitle>
                <div className="text-sm text-muted-foreground hidden sm:block tabular-nums">
                  {showCost && meta.stockValueSell != null ? `${formatINR(meta.stockValueSell, { compact: true })} sell • ` : ""}
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-hidden">
                {loading ? (
                  <div className="py-16 text-center text-sm text-muted-foreground">Loading inventory…</div>
                ) : error ? (
                  <div className="py-10 text-center">
                    <div className="text-sm font-medium text-destructive">{error}</div>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => void loadMasterProducts({ pageNum: 1 })}>Retry</Button>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="text-sm font-medium">{search ? "No products found" : "No products in catalog"}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {search ? "Try a shorter search (min 2 chars) or clear filters" : "Add your first product to the master catalog."}
                    </div>
                    <div className="flex gap-2 justify-center mt-4">
                      {(search || category !== "All" || stockFilter !== "all") && (
                        <Button variant="outline" size="sm" onClick={() => { setSearch(""); setCategory("All"); setStockFilter("all"); setPage(1); void loadMasterProducts({ searchVal: "", cat: "All", pageNum: 1 }); }}>Clear filters</Button>
                      )}
                      <Button onClick={openAdd} disabled={offline} title={offline ? reason : undefined} size="sm"><Plus className="w-4 h-4" /> New SKU</Button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-auto flex-1 min-h-95 max-h-[68vh] lg:max-h-[72vh]">
                    <ProductTable
                      products={filtered as ShopProductView[]}
                      showCost={showCost}
                      offline={offline}
                      offlineReason={reason}
                      onAdjust={(p, d) => {
                        const sp = shopProducts.find((s) => s.id === (p as any).shopProductId);
                        if (sp) void adjustStock(sp, d);
                      }}
                      onRestock={(p) => {
                        const sp = shopProducts.find((s) => s.id === (p as any).shopProductId);
                        if (sp) openRestock(sp);
                      }}
                      onEdit={(p) => {
                        const mp = masterProducts.find((m) => m.id === p.id);
                        if (mp) openEdit(mp);
                      }}
                      onDelete={(p) => void handleDelete(p as unknown as MasterProduct)}
                      onOpenProduct={(p) => {
                        const mp = masterProducts.find((m) => m.id === p.id);
                        if (mp) openEdit(mp);
                      }}
                      showEnableToggle={true}
                    />
                  </div>
                )}
                {totalPages > 1 && !loading && !error && (
                  <div className="flex items-center justify-between px-4 py-2.5 border-t bg-muted/20">
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      Page {page} of {totalPages} • {filtered.length} on page • {total} total
                    </span>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-8" disabled={page <= 1 || loading} onClick={() => { setPage(page - 1); void loadMasterProducts({ pageNum: page - 1 }); }} aria-label="Previous page">
                        <ChevronLeft className="w-4 h-4" /> Prev
                      </Button>
                      <Button variant="outline" size="sm" className="h-8" disabled={page >= totalPages || loading} onClick={() => { setPage(page + 1); void loadMasterProducts({ pageNum: page + 1 }); }} aria-label="Next page">
                        Next <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="text-center text-[11px] text-muted-foreground py-4">
              <span className="font-medium text-foreground">−/+</span> = counting fix • <span className="font-medium text-foreground">Restock</span> = new purchase • <span className="font-medium text-foreground">Toggle enable</span> = show/hide at this shop • Press <kbd className="px-1 rounded border bg-muted">/</kbd> to search, scanner ends with Enter
            </div>
          </div>

          <ProductDialog
            open={open}
            onOpenChange={setOpen}
            editing={editing as unknown as Product | null}
            form={form}
            setForm={setForm}
            formError={formError}
            saving={saving}
            offline={offline}
            offlineReason={reason}
            categories={availableCategories}
            onSave={() => void handleSave()}
          />

          <RestockDialog
            open={restockOpen}
            onOpenChange={setRestockOpen}
            product={(restockShopProduct ? {
              id: restockShopProduct.id,
              name: restockShopProduct.masterProduct.name,
              category: restockShopProduct.masterProduct.category,
              is_loose: restockShopProduct.masterProduct.is_loose,
              rate_per_kg: restockShopProduct.masterProduct.basePrice ?? 0,
              price: restockShopProduct.shopPrice ?? restockShopProduct.masterProduct.basePrice ?? 0,
              barcode: restockShopProduct.shopBarcode ?? restockShopProduct.masterProduct.barcode,
              costPrice: restockShopProduct.costPrice,
              unit: restockShopProduct.masterProduct.unit,
              stockQuantity: restockShopProduct.stockQuantity,
              lowStockThreshold: restockShopProduct.lowStockThreshold,
            } as unknown as Product : null)}
            qty={restockQty}
            setQty={setRestockQty}
            price={restockPrice}
            setPrice={setRestockPrice}
            rate={restockRate}
            setRate={setRestockRate}
            cost={restockCost}
            setCost={setRestockCost}
            batchNo={restockBatchNo}
            setBatchNo={setRestockBatchNo}
            expiryDate={restockExpiryDate}
            setExpiryDate={setRestockExpiryDate}
            mrp={restockMrp}
            setMrp={setRestockMrp}
            saving={restockSaving}
            error={restockError}
            offline={offline}
            offlineReason={reason}
            onSave={() => void handleRestock()}
          />

          <ImportDialog
            open={importOpen}
            onOpenChange={setImportOpen}
            importing={importing}
            progress={importProgress}
            onImport={(rows) => void handleImport(rows)}
          />
        </>
      )}
    </div>
  );
}
