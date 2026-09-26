"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";
import { fetchProductsPaged, fetchProductsMeta, createProduct, updateProduct, deleteProduct } from "@/lib/api";
import type { ProductStockFilter, ProductSortBy } from "@/lib/api";
import { fetchMe } from "@/lib/authApi";
import { useConfirm } from "@/components/confirm-dialog";
import { useOfflineBlock } from "@/hooks/useOfflineBlock";
import { useAuthStore } from "@/store/authStore";
import { downloadCsv, productsToCsv } from "@/lib/inventoryCsv";
import InventoryStats from "@/components/inventory/InventoryStats";
import InventoryToolbar from "@/components/inventory/InventoryToolbar";
import ProductTable from "@/components/inventory/ProductTable";
import ProductDialog from "@/components/inventory/ProductDialog";
import RestockDialog from "@/components/inventory/RestockDialog";
import ImportDialog from "@/components/inventory/ImportDialog";
import { emptyProductForm, type Product, type ProductForm } from "@/components/inventory/types";
import { Package, Plus, Shield, ChevronLeft, ChevronRight } from "lucide-react";

const SEARCH_MIN = 2;

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [stockFilter, setStockFilter] = useState<ProductStockFilter>("all");
  const [sortBy, setSortBy] = useState<ProductSortBy>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState<{ total: number; low: number; out: number; categories: string[]; stockValueCost?: number; stockValueSell?: number }>({ total: 0, low: 0, out: 0, categories: [] });
  const PAGE_LIMIT = 50;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const searchRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const actor = useAuthStore((s) => s.user);
  const { confirm, notify } = useConfirm();
  const { offline, block, reason } = useOfflineBlock(notify);
  const isStaff = actor?.role === "STAFF";
  // Owner + super see buying price / margin; staff never do.
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

  // dialog
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyProductForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // restock dialog
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState("");
  const [restockPrice, setRestockPrice] = useState("");
  const [restockRate, setRestockRate] = useState("");
  const [restockCost, setRestockCost] = useState("");
  const [restockSaving, setRestockSaving] = useState(false);
  const [restockError, setRestockError] = useState("");

  // import dialog
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");

  const loadMeta = useCallback(async () => {
    try {
      const m = await fetchProductsMeta();
      setMeta(m);
    } catch {
      // header keeps last good values; table shows its own error
    }
  }, []);

  const load = useCallback(async (opts?: { searchVal?: string; cat?: string; pageNum?: number; stock?: ProductStockFilter; by?: ProductSortBy; order?: "asc" | "desc" }) => {
    const s = opts?.searchVal !== undefined ? opts.searchVal : search;
    const cc = opts?.cat !== undefined ? opts.cat : category;
    const pg = opts?.pageNum !== undefined ? opts.pageNum : page;
    const st = opts?.stock !== undefined ? opts.stock : stockFilter;
    const by = opts?.by !== undefined ? opts.by : sortBy;
    const order = opts?.order !== undefined ? opts.order : sortOrder;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");
    try {
      const q = s && s.trim().length >= SEARCH_MIN && !s.startsWith(" ") ? s.trim() : undefined;
      const data = await fetchProductsPaged(
        { search: q, category: cc !== "All" ? cc : undefined, limit: PAGE_LIMIT, page: pg, stock: st, sortBy: by, sortOrder: order },
        { signal: controller.signal }
      );
      if (controller.signal.aborted) return;
      setProducts(data.products as unknown as Product[]);
      setTotal(data.total);
      setPage(data.page);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Failed to load products");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [search, category, page, stockFilter, sortBy, sortOrder]);

  useEffect(() => {
    if (!grantChecked) return;
    if (!hasInventoryAccess) {
      setLoading(false);
      return;
    }
    void load({ pageNum: 1 });
    void loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grantChecked, hasInventoryAccess]);

  // Same as product search: focus shortcut (F2) + "/" for USB-scanner flow
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
    await load({ searchVal: trimmed, pageNum: 1 });
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [load]);

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

  // Chips come from shop-wide /meta (never the paginated page); table is server-filtered
  const availableCategories = useMemo(() => ["All", "Loose Items", ...meta.categories], [meta.categories]);

  const filtered = useMemo(() => products, [products]);

  const pickCategory = (cat: string) => {
    setCategory(cat);
    setPage(1);
    void load({ cat, pageNum: 1 });
  };

  const pickStockFilter = (f: ProductStockFilter) => {
    setStockFilter(f);
    setPage(1);
    void load({ stock: f, pageNum: 1 });
  };

  const pickSort = (by: ProductSortBy, order: "asc" | "desc") => {
    setSortBy(by);
    setSortOrder(order);
    setPage(1);
    void load({ by, order, pageNum: 1 });
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyProductForm);
    setFormError("");
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category,
      is_loose: !!p.is_loose,
      price: p.price != null ? String(p.price) : "",
      costPrice: (p as unknown as { costPrice?: number }).costPrice != null ? String((p as unknown as { costPrice?: number }).costPrice) : "",
      rate_per_kg: p.rate_per_kg != null ? String(p.rate_per_kg) : "",
      barcode: p.barcode ?? "",
      unit: p.unit ?? "pcs",
      stockQuantity: String(p.stockQuantity ?? 100),
      lowStockThreshold: String(p.lowStockThreshold ?? 10),
      description: "",
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

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        id: editing?.id,
        name: form.name.trim(),
        category: form.category,
        is_loose: form.is_loose,
        barcode: form.barcode.trim() || null,
        costPrice: Number(form.costPrice),
        unit: form.unit.trim() || "pcs",
        stockQuantity: Number(form.stockQuantity) || 0,
        lowStockThreshold: form.lowStockThreshold.trim() === "" ? 10 : Number(form.lowStockThreshold),
      };
      if (form.is_loose) {
        payload.rate_per_kg = Number(form.rate_per_kg);
        payload.price = null;
      } else {
        payload.price = Number(form.price);
        payload.rate_per_kg = null;
      }
      await createProduct(payload);
      await load();
      void loadMeta();
      setOpen(false);
      setEditing(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const openRestock = (p: Product) => {
    setRestockProduct(p);
    setRestockQty("");
    setRestockPrice(p.is_loose ? "" : String(p.price ?? ""));
    setRestockRate(p.is_loose ? String(p.rate_per_kg ?? "") : "");
    setRestockCost(String((p as unknown as { costPrice?: number }).costPrice ?? ""));
    setRestockError("");
    setRestockOpen(true);
  };

  const handleRestock = async () => {
    if (!restockProduct) return;
    if (await block()) return;
    setRestockError("");
    const add = Number(restockQty);
    if (!restockQty || isNaN(add) || add <= 0) return setRestockError("Enter valid quantity to add (e.g., 40)");
    const currentStock = restockProduct.stockQuantity ?? 0;
    const newQty = currentStock + add;

    const payload: Record<string, unknown> = { stockQuantity: newQty };
    if (restockProduct.is_loose) {
      if (restockRate.trim() !== "") {
        const r = Number(restockRate);
        if (isNaN(r) || r <= 0) return setRestockError("Rate per kg must be > 0");
        payload.rate_per_kg = r;
      }
      if (restockCost.trim() !== "") {
        const cp = Number(restockCost);
        if (isNaN(cp) || cp < 0) return setRestockError("Buying price must be 0 or more");
        payload.costPrice = cp;
      }
    } else {
      if (restockPrice.trim() !== "") {
        const pr = Number(restockPrice);
        if (isNaN(pr) || pr < 0) return setRestockError("Selling price must be 0 or more");
        payload.price = pr;
      }
      if (restockCost.trim() !== "") {
        const cp = Number(restockCost);
        if (isNaN(cp) || cp < 0) return setRestockError("Buying price must be 0 or more");
        payload.costPrice = cp;
      }
    }

    setRestockSaving(true);
    try {
      await updateProduct(restockProduct.id, payload);
      setProducts((prev) => prev.map((x) => (x.id === restockProduct.id ? {
        ...x,
        stockQuantity: newQty,
        ...(payload.price != null ? { price: payload.price as number } : {}),
        ...(payload.rate_per_kg != null ? { rate_per_kg: payload.rate_per_kg as number } : {}),
        ...(payload.costPrice != null ? { costPrice: payload.costPrice as number } : {}),
      } : x)));
      void loadMeta();
      setRestockOpen(false);
      setRestockProduct(null);
    } catch (e) {
      setRestockError(e instanceof Error ? e.message : "Restock failed");
    } finally {
      setRestockSaving(false);
    }
  };

  const handleDelete = async (p: Product) => {
    if (await block()) return;
    const ok = await confirm({
      title: `Delete "${p.name}"?`,
      description: "Soft delete — hidden from billing but past orders keep history. You can restore from backend if needed.",
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteProduct(p.id);
      await load();
      void loadMeta();
    } catch (e) {
      await notify({ title: "Delete failed", description: e instanceof Error ? e.message : "Delete failed", danger: true });
    }
  };

  const adjustStock = async (p: Product, delta: number) => {
    if (await block()) return;
    const newQty = Math.max(0, (p.stockQuantity ?? 0) + delta);
    try {
      await updateProduct(p.id, { stockQuantity: newQty });
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, stockQuantity: newQty } : x)));
      void loadMeta();
    } catch (e) {
      await notify({ title: "Stock update failed", description: e instanceof Error ? e.message : "Stock update failed", danger: true });
    }
  };

  const handleExport = async () => {
    try {
      // Export the whole filtered view, not just the visible page.
      const all: Product[] = [];
      let pg = 1;
      for (;;) {
        const q = search && search.trim().length >= SEARCH_MIN && !search.startsWith(" ") ? search.trim() : undefined;
        const data = await fetchProductsPaged({ search: q, category: category !== "All" ? category : undefined, stock: stockFilter, sortBy, sortOrder, limit: 200, page: pg });
        all.push(...(data.products as unknown as Product[]));
        if (all.length >= data.total || (data.products as unknown[]).length === 0 || pg > 25) break;
        pg++;
      }
      const csv = productsToCsv(all.length ? all : (products as Product[]), showCost);
      downloadCsv(`inventory-${category}-${stockFilter}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      await notify({ title: `Exported ${all.length || products.length} products`, description: "CSV downloaded — includes buying price only for owners." });
    } catch (e) {
      await notify({ title: "Export failed", description: e instanceof Error ? e.message : "Export failed", danger: true });
    }
  };

  const handleImport = async (rows: Array<Record<string, string>>) => {
    if (await block()) return;
    setImporting(true);
    setImportProgress("");
    let done = 0;
    let skipped = 0;
    try {
      for (const r of rows) {
        const name = (r.name || "").trim();
        if (!name) { skipped++; continue; }
        const typeRaw = (r.type || r.kind || "packaged").toLowerCase();
        const isLoose = typeRaw.startsWith("loose");
        const sell = Number(r.sellprice ?? r.sellPrice ?? r.price ?? r.rate ?? "");
        const cost = Number(r.costprice ?? r.costPrice ?? r.cost ?? 0);
        const stock = Number(r.stock ?? r.stockquantity ?? r.qty ?? 100);
        if (isLoose && (!sell || sell <= 0)) { skipped++; continue; }
        if (!isLoose && (isNaN(sell) || sell < 0)) { skipped++; continue; }
        if (isNaN(cost) || cost < 0) { skipped++; continue; }
        const payload: Record<string, unknown> = {
          name,
          category: (r.category || "Staples").trim() || "Staples",
          is_loose: isLoose,
          barcode: (r.barcode || "").trim() || null,
          costPrice: cost,
          unit: (r.unit || (isLoose ? "kg" : "pcs")).trim() || "pcs",
          stockQuantity: isNaN(stock) ? 0 : Math.max(0, stock),
          lowStockThreshold: Number(r.warnat ?? r.warn ?? 10) || 10,
        };
        if (isLoose) { payload.rate_per_kg = sell; payload.price = null; }
        else { payload.price = sell; payload.rate_per_kg = null; }
        try {
          await createProduct(payload);
          done++;
        } catch {
          skipped++;
        }
        setImportProgress(`${done} imported • ${skipped} skipped (${done + skipped}/${rows.length})`);
      }
      await load({ pageNum: 1 });
      void loadMeta();
      setImportOpen(false);
      await notify({ title: `Import done: ${done} added`, description: skipped ? `${skipped} rows skipped (bad price/barcode duplicate)` : "All rows imported." });
    } finally {
      setImporting(false);
      setImportProgress("");
    }
  };

  return (
    <>
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
      <div className="flex-1 flex flex-col overflow-auto p-4 pb-6 min-h-0">
        <div className="max-w-7xl mx-auto space-y-4 w-full flex-1 flex flex-col min-h-0">
          <InventoryStats
            total={meta.total}
            low={meta.low}
            out={meta.out}
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
            sortBy={sortBy}
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
                {showCost && meta.stockValueSell != null ? `${formatINR(meta.stockValueSell, { compact: true })} sell • ` : ""}click stock qty to restock
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-hidden">
              {loading ? (
                <div className="py-16 text-center text-sm text-muted-foreground">Loading inventory…</div>
              ) : error ? (
                <div className="py-10 text-center">
                  <div className="text-sm font-medium text-destructive">{error}</div>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>Retry</Button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="text-sm font-medium">{stockFilter !== "all" ? `No ${stockFilter === "low" ? "low-stock" : stockFilter} products` : "No products found"}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {search ? "Try a shorter search (min 2 chars) or clear filters" : stockFilter !== "all" ? "All healthy — clear the filter to see everything" : "Try a different search or add a new product"}
                  </div>
                  <div className="flex gap-2 justify-center mt-4">
                    {(search || stockFilter !== "all" || category !== "All") && (
                      <Button variant="outline" size="sm" onClick={() => { setSearch(""); setCategory("All"); setStockFilter("all"); setPage(1); void load({ searchVal: "", cat: "All", stock: "all", pageNum: 1 }); }}>Clear filters</Button>
                    )}
                    <Button onClick={openAdd} disabled={offline} title={offline ? reason : undefined} size="sm"><Plus className="w-4 h-4" /> New SKU</Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-auto flex-1 min-h-[380px] max-h-[68vh] lg:max-h-[72vh]">
                  <ProductTable
                    products={filtered}
                    showCost={showCost}
                    offline={offline}
                    offlineReason={reason}
                    onAdjust={(p, d) => void adjustStock(p, d)}
                    onRestock={openRestock}
                    onEdit={openEdit}
                    onDelete={(p) => void handleDelete(p)}
                    onOpenProduct={openEdit}
                  />
                </div>
              )}
              {totalPages > 1 && !loading && !error && (
                <div className="flex items-center justify-between px-4 py-2.5 border-t bg-muted/20">
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    Page {page} of {totalPages} • {filtered.length} on page • {total} total
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-8" disabled={page <= 1 || loading} onClick={() => { setPage(page - 1); void load({ pageNum: page - 1 }); }} aria-label="Previous page">
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </Button>
                    <Button variant="outline" size="sm" className="h-8" disabled={page >= totalPages || loading} onClick={() => { setPage(page + 1); void load({ pageNum: page + 1 }); }} aria-label="Next page">
                      Next <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-center text-[11px] text-muted-foreground py-4">
            <span className="font-medium text-foreground">−/+</span> = counting fix • <span className="font-medium text-foreground">Restock</span> = new purchase • <span className="font-medium text-foreground">Click qty</span> opens restock • Press <kbd className="px-1 rounded border bg-muted">/</kbd> to search, scanner ends with Enter
          </div>
        </div>
      </div>

      <ProductDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
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
        product={restockProduct}
        qty={restockQty}
        setQty={setRestockQty}
        price={restockPrice}
        setPrice={setRestockPrice}
        rate={restockRate}
        setRate={setRestockRate}
        cost={restockCost}
        setCost={setRestockCost}
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
    </>
  );
}
