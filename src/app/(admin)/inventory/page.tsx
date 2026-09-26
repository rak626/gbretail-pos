"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { formatINR } from "@/lib/utils";
import { isLowStock, isOutOfStock, lowStockThresholdOf } from "@/lib/stock";
import { fetchProducts, createProduct, updateProduct, deleteProduct } from "@/lib/api";
import { fetchMe } from "@/lib/authApi";
import { useConfirm } from "@/components/confirm-dialog";
import { useOfflineBlock } from "@/hooks/useOfflineBlock";
import { selectCatalogCategories } from "@/store/catalogStore";
import { useAuthStore } from "@/store/authStore";
import type { Product } from "@/db/database";
import SearchBox from "@/components/SearchBox";
import { Search, Plus, Package, AlertTriangle, Boxes, Pencil, Trash2, Minus, TrendingUp, PackagePlus, Shield } from "lucide-react";

type ProductForm = {
  name: string;
  category: string;
  is_loose: boolean;
  price: string;
  costPrice: string;
  rate_per_kg: string;
  barcode: string;
  unit: string;
  stockQuantity: string;
  lowStockThreshold: string;
  description: string;
};

const emptyForm: ProductForm = {
  name: "",
  category: "Staples",
  is_loose: false,
  price: "",
  costPrice: "",
  rate_per_kg: "",
  barcode: "",
  unit: "pcs",
  stockQuantity: "100",
  lowStockThreshold: "10",
  description: "",
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const actor = useAuthStore((s) => s.user);
  const { confirm, notify } = useConfirm();
  const { offline, block, reason } = useOfflineBlock(notify);
  const isStaff = actor?.role === "STAFF";
  // STAFF needs an explicit owner grant; refresh from server on mount so an
  // owner grant/revoke applies without forcing staff to re-login.
  const [grantChecked, setGrantChecked] = useState(!isStaff);
  useEffect(() => {
    if (!isStaff) return;
    let cancelled = false;
    fetchMe()
      .then((data) => {
        if (cancelled) return;
        const fresh = (data as any)?.user;
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
  const hasInventoryAccess = !isStaff || Boolean((actor as any)?.canManageInventory);

  // dialog
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // restock dialog: stock is low → buy new batch at possibly new cost/selling price
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState("");
  const [restockPrice, setRestockPrice] = useState("");
  const [restockRate, setRestockRate] = useState("");
  const [restockSaving, setRestockSaving] = useState(false);
  const [restockError, setRestockError] = useState("");

  const load = useCallback(async (searchVal?: string) => {
    const s = searchVal !== undefined ? searchVal : search;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");
    try {
      const data = await fetchProducts(s ? { search: s, limit: 200 } : { limit: 200 }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setProducts(data as unknown as Product[]);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Failed to load products");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (!grantChecked) return;
    if (!hasInventoryAccess) {
      setLoading(false);
      return;
    }
    load();
  }, [grantChecked, hasInventoryAccess, load]);

  // Same as product search: focus shortcut
  useEffect(() => {
    const h = () => searchRef.current?.focus();
    window.addEventListener("focus-search", h);
    return () => window.removeEventListener("focus-search", h);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const doSearchApi = useCallback(async (trimmed: string) => {
    if (trimmed.startsWith(" ") || (trimmed && trimmed.length < 3)) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");
    try {
      const data = await fetchProducts(trimmed ? { search: trimmed, limit: 10 } : { limit: 200 }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setProducts(data as unknown as Product[]);
      requestAnimationFrame(() => searchRef.current?.focus());
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Failed to load products");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const handleImmediate = (v: string) => {
    if (v.startsWith(" ")) return;
    setSearch(v);
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const handleDebouncedSearch = (trimmed: string) => {
    if (!trimmed || trimmed.length < 3 || trimmed.startsWith(" ")) {
      if (!trimmed) doSearchApi("");
      return;
    }
    doSearchApi(trimmed);
  };

  const handleClearSearch = () => {
    doSearchApi("");
  };

  const handleFocusSearch = (q: string) => {
    if (q.startsWith(" ")) return;
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 3) return;
    doSearchApi(trimmed);
  };

  // Filter chips + form suggestions come from live backend data, never hardcoded
  const availableCategories = useMemo(() => selectCatalogCategories(products as any), [products]);

  const filtered = useMemo(() => {    return products.filter((p) => {
      const q = search.trim().toLowerCase();
      // autosuggestion after 3 letters, ignore blank/beginning space
      const matchSearch = !q || q.length < 3 || q.startsWith(" ") ? true : p.name.toLowerCase().includes(q) || (p.barcode ?? "").toLowerCase().includes(q);
      if (!matchSearch) return false;
      if (category === "All") return true;
      if (category === "Loose Items") return !!p.is_loose;
      return p.category === category;
    });
  }, [products, search, category]);

  const stats = useMemo(() => {
    const total = products.length;
    const low = products.filter((p) => isLowStock(p)).length;
    const out = products.filter((p) => isOutOfStock(p)).length;
    const cats = new Set(products.map((p) => p.category)).size;
    return { total, low, out, cats };
  }, [products]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
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
      costPrice: (p as any).costPrice != null ? String((p as any).costPrice) : "",
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
    if (!form.costPrice || isNaN(Number(form.costPrice)) || Number(form.costPrice) < 0) return setFormError("Buying price (costPrice) is required and must be >=0");
    if (form.is_loose) {
      if (!form.rate_per_kg || isNaN(Number(form.rate_per_kg)) || Number(form.rate_per_kg) <= 0)
        return setFormError("Rate per kg is required for loose items");
    } else {
      if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0)
        return setFormError("Price is required for packaged items");
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

      // Upsert via backend (Hono)
      await createProduct(payload as Record<string, unknown>);

      await load();
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
    } else {
      if (restockPrice.trim() !== "") {
        const pr = Number(restockPrice);
        if (isNaN(pr) || pr < 0) return setRestockError("Price must be 0 or more");
        payload.price = pr;
      }
    }

    setRestockSaving(true);
    try {
      await updateProduct(restockProduct.id, payload as Record<string, unknown>);
      setProducts((prev) => prev.map((x) => (x.id === restockProduct.id ? { ...x, stockQuantity: newQty, ...(payload.price != null ? { price: payload.price as number } : {}), ...(payload.rate_per_kg != null ? { rate_per_kg: payload.rate_per_kg as number } : {}) } : x)));
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
      description: "This cannot be undone. Past orders keep their history.",
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteProduct(p.id);
      await load();
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
    } catch (e) {
      await notify({ title: "Stock update failed", description: e instanceof Error ? e.message : "Stock update failed", danger: true });
    }
  };

  return (
    <>
      {!grantChecked ? (
        <div className="flex-1 flex items-center justify-center p-8 text-sm text-muted-foreground">Checking inventory access...</div>
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
          {/* Header stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="py-0 gap-0">
              <CardContent className="p-3 flex flex-row items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border flex items-center justify-center text-primary">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Total Products</div>
                  <div className="text-xl font-black leading-none">{stats.total}</div>
                </div>
                <Badge variant="secondary" className="ml-auto hidden sm:flex">{stats.cats} categories</Badge>
              </CardContent>
            </Card>
            <Card className="py-0 gap-0">
              <CardContent className="p-3 flex flex-row items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Low Stock</div>
                  <div className="text-xl font-black leading-none">{stats.low}</div>
                </div>
              </CardContent>
            </Card>
            <Card className="py-0 gap-0">
              <CardContent className="p-3 flex flex-row items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Out of Stock</div>
                  <div className="text-xl font-black leading-none">{stats.out}</div>
                </div>
              </CardContent>
            </Card>
            <Card className="py-0 gap-0">
              <CardContent className="p-3 flex flex-row items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary dark:bg-primary/10 dark:border-primary/20 dark:text-primary">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Filtered</div>
                  <div className="text-xl font-black leading-none">{filtered.length}</div>
                </div>
                <div className="ml-auto text-[11px] text-muted-foreground hidden sm:block">of {stats.total}</div>
              </CardContent>
            </Card>
          </div>

          {/* Toolbar: search + category + add */}
          <Card className="py-0 border-primary/20 ring-1 ring-primary/5">
            <CardContent className="p-1.5 space-y-3">
              <div className="flex flex-col lg:flex-row gap-3">
                <SearchBox
                  placeholder="Search product by name, barcode or category..."
                  leftIcon={<Search className="w-4 h-4" />}
                  value={search}
                  onValueChange={handleImmediate}
                  onSearch={handleDebouncedSearch}
                  onClear={handleClearSearch}
                  onFocusSearch={handleFocusSearch}
                  inputRef={searchRef}
                  variant="plain"
                />
                <Button onClick={openAdd} disabled={offline} title={offline ? reason : undefined} className="h-10 px-5 bg-primary hover:bg-primary/90 text-white dark:bg-primary shrink-0">
                  <Plus className="w-4 h-4" /> Add Product
                </Button>
              </div>
              <ScrollArea>
                <div className="flex gap-2 pb-1">
                  {availableCategories.map((cat) => (
                    <Button
                      key={cat}
                      variant={category === cat ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCategory(cat)}
                      className="whitespace-nowrap h-8"
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Product table - inventory mode, not cart */}
          <Card className="py-0 overflow-hidden flex-1 flex flex-col min-h-0">
            <CardHeader className="py-4 border-b bg-muted/10 flex-row items-center justify-between">
              <CardTitle className="text-[15px] flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" /> Product Inventory
                <Badge variant="outline" className="ml-2 font-normal text-sm px-2.5 py-0.5">{filtered.length} items</Badge>
              </CardTitle>
              <div className="text-sm text-muted-foreground hidden sm:block">Manage stock • Search & Add on this page</div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-hidden">
              {loading ? (
                <div className="py-16 text-center text-sm text-muted-foreground">Loading inventory…</div>
              ) : error ? (
                <div className="py-10 text-center">
                  <div className="text-sm font-medium text-destructive">{error}</div>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => load()}>Retry</Button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="text-sm font-medium">No products found</div>
                  <div className="text-xs text-muted-foreground mt-1">Try a different search or add a new product</div>
                  <Button onClick={openAdd} disabled={offline} title={offline ? reason : undefined} className="mt-4" size="sm"><Plus className="w-4 h-4" /> Add Product</Button>
                </div>
              ) : (
                <div className="overflow-auto flex-1 min-h-[380px] max-h-[68vh] lg:max-h-[72vh]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                      <TableRow className="hover:bg-transparent border-b h-12">
                        <TableHead className="text-[13px] font-semibold whitespace-nowrap px-4">Product</TableHead>
                        <TableHead className="text-[13px] font-semibold hidden md:table-cell">Category</TableHead>
                        <TableHead className="text-[13px] font-semibold">Price / Rate</TableHead>
                        <TableHead className="text-[13px] font-semibold text-center">Stock</TableHead>
                        <TableHead className="text-[13px] font-semibold hidden lg:table-cell">Barcode</TableHead>
                        <TableHead className="text-[13px] font-semibold text-right px-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((p) => {
                        const stock = p.stockQuantity ?? 0;
                        const unit = p.unit || "pcs";
                        const threshold = lowStockThresholdOf(p);
                        const isLow = isLowStock(p);
                        const isOut = isOutOfStock(p);
                        return (
                          <TableRow key={p.id} className="hover:bg-muted/40 h-[62px]">
                            <TableCell className="py-3.5 px-4">
                              <div className="font-semibold text-sm leading-tight line-clamp-1">{p.name}</div>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <Badge variant={p.is_loose ? "secondary" : "outline"} className="text-[11px] h-6 px-2">
                                  {p.is_loose ? "Loose • per kg" : "Packaged"}
                                </Badge>
                                <span className="text-xs text-muted-foreground md:hidden">{p.category}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant="outline" className="text-sm whitespace-nowrap px-2.5 py-0.5">{p.category}</Badge>
                            </TableCell>
                            <TableCell className="text-sm font-bold whitespace-nowrap">
                              {p.is_loose ? `${formatINR(p.rate_per_kg || 0)}/kg` : formatINR(p.price || 0)}
                              <div className="text-xs font-normal text-muted-foreground">{p.unit || "pcs"}</div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button variant="outline" size="icon-xs" className="h-8 w-8" onClick={() => adjustStock(p, -1)} disabled={stock <= 0 || offline} title={offline ? reason : undefined}>
                                  <Minus className="w-3.5 h-3.5" />
                                </Button>
                                <Badge
                                  variant={isOut ? "destructive" : isLow ? "secondary" : "outline"}
                                  className={`min-w-[56px] justify-center font-mono text-sm h-8 px-2 ${isLow ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200" : ""}`}
                                >
                                  {stock}
                                </Badge>
                                <Button variant="outline" size="icon-xs" className="h-8 w-8" onClick={() => adjustStock(p, 1)} disabled={offline} title={offline ? reason : undefined}>
                                  <Plus className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                              {isLow && <div className="text-xs text-primary font-medium mt-1">Low • {stock} {unit} left</div>}
                              {isOut && <div className="text-xs text-destructive font-medium mt-1">Out</div>}
                              {!isLow && !isOut && <div className="text-[11px] text-muted-foreground mt-1">warn at ≤ {threshold} {unit}</div>}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm font-mono text-muted-foreground max-w-[160px] truncate">
                              {p.barcode || "—"}
                            </TableCell>
                            <TableCell className="text-right px-4">
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="icon-xs"
                                  className="h-8 w-8 bg-primary/5 border-primary/20 text-primary hover:bg-green-100 dark:bg-primary/5 dark:border-primary/20 dark:text-primary"
                                  onClick={() => openRestock(p)}
                                  disabled={offline}
                                  title={offline ? reason : "Restock — add quantity & update cost/price"}
                                >
                                  <PackagePlus className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="icon-xs" className="h-8 w-8" onClick={() => openEdit(p)} disabled={offline} title={offline ? reason : "Edit product"}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon-xs" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p)} disabled={offline} title={offline ? reason : "Delete"}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-center text-[11px] text-muted-foreground py-4">
            Search and Add Product are available on this Stock page — Billing cart is only on <span className="font-medium text-foreground">Billing</span> tab.
          </div>
        </div>
      </div>

      {/* Add / Edit Product modal */}
      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent className="sm:max-w-[540px] p-0 gap-0 overflow-hidden max-h-[calc(100%-3rem)] flex flex-col">
          <DialogHeader className="p-5 pb-3 shrink-0">
            <DialogTitle className="text-[17px]">{editing ? "Edit Product" : "Add Product"}</DialogTitle>
            <DialogDescription className="text-[13px]">
              {editing ? "Update product details and stock" : "Create a new product for inventory"}
            </DialogDescription>
          </DialogHeader>
          <div className="px-5 pb-5 space-y-4 overflow-auto">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Product Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g., Tata Salt 1kg" className="h-10 text-sm" />
              {form.is_loose && (
                <div className="text-xs text-muted-foreground">One item, multiple rates? Create one product per rate — e.g. “Sugar – Economy @ ₹40/kg” and “Sugar – Premium @ ₹50/kg”. Each keeps its own stock.</div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[13px]">Category *</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
                  placeholder="e.g., Staples"
                  className="h-10 text-sm"
                  list="inventory-categories"
                />
                <datalist id="inventory-categories">
                  {availableCategories.filter((c) => c !== "All" && c !== "Loose Items").map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Unit</Label>
                <Input value={form.unit} onChange={(e) => setForm((s) => ({ ...s, unit: e.target.value }))} placeholder="pcs / kg" className="h-10 text-sm" />
              </div>
            </div>

            <div className="flex items-center gap-2.5 py-0.5">
              <div className="flex items-center gap-1.5">
                <Checkbox
                  id="is_loose"
                  checked={form.is_loose}
                  onCheckedChange={(checked) => setForm((s) => ({ ...s, is_loose: checked === true }))}
                />
                <Label htmlFor="is_loose" className="text-[13px] font-medium cursor-pointer">
                  Loose item (sold by weight)
                </Label>
              </div>
              <Badge variant="outline" className="text-[11px] h-5 px-1.5">{form.is_loose ? "Loose" : "Packaged"}</Badge>
            </div>

            {form.is_loose ? (
              <div className="space-y-1.5">
                <Label className="text-[13px]">Rate per kg (₹) *</Label>
                <Input type="number" value={form.rate_per_kg} onChange={(e) => setForm((s) => ({ ...s, rate_per_kg: e.target.value }))} placeholder="e.g., 48" className="h-10 text-sm" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-[13px]">Selling Price (₹) *</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} placeholder="e.g., 28" className="h-10 text-sm" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-[13px]">Buying Price — Cost (₹) *</Label>
              <Input type="number" value={form.costPrice} onChange={(e) => setForm((s) => ({ ...s, costPrice: e.target.value }))} placeholder="e.g., 22 (mandatory for profit)" className="h-10 text-sm" />
              <div className="text-xs text-muted-foreground">Profit = Sell - Buy. Mandatory for analytics.</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[13px]">Barcode (optional)</Label>
                <Input value={form.barcode} onChange={(e) => setForm((s) => ({ ...s, barcode: e.target.value }))} placeholder="8901..." className="h-10 font-mono text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Stock Quantity *</Label>
                <Input type="number" value={form.stockQuantity} onChange={(e) => setForm((s) => ({ ...s, stockQuantity: e.target.value }))} placeholder="100" className="h-10 text-sm" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">Low-stock warning at * <span className="text-muted-foreground font-normal">(in {form.unit.trim() || "pcs"} — warn only, never blocks sales)</span></Label>
              <Input type="number" value={form.lowStockThreshold} onChange={(e) => setForm((s) => ({ ...s, lowStockThreshold: e.target.value }))} placeholder="10" className="h-10 text-sm" />
              <div className="text-xs text-muted-foreground">E.g. 10 pcs, 2 bags, 5 kg — per product.</div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                placeholder="Product notes, supplier info or storage instructions..."
                className="min-h-[64px] text-sm resize-none"
                rows={2}
              />
            </div>

            {formError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-2.5 py-1.5 text-[13px] font-medium text-destructive">
                {formError}
              </div>
            )}
          </div>
          <DialogFooter className="p-4 gap-3 sm:justify-end border-t shrink-0">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving} className="h-11 px-6 min-w-[110px] text-sm">Cancel</Button>
            <Button onClick={handleSave} disabled={saving || offline} title={offline ? reason : undefined} className="h-11 px-6 min-w-[150px] text-sm">
              {saving ? (editing ? "Saving..." : "Adding...") : editing ? "Done Editing" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restock Dialog — solves low-stock buy at new cost: Tata Salt 40 qty example */}
      <Dialog open={restockOpen} onOpenChange={(v) => !v && setRestockOpen(false)}>
        <DialogContent className="sm:max-w-[460px] p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-5 pb-3">
            <DialogTitle className="text-[14px] flex items-center gap-2">
              <PackagePlus className="w-4 h-4 text-primary" /> Restock Product
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              Add new purchase quantity — stock will be added, price/rate updated if you change it
            </DialogDescription>
          </DialogHeader>
          {restockProduct && (
            <div className="px-5 pb-5 space-y-3">
              <Card className="py-0 bg-muted/20">
                <CardContent className="p-3 space-y-1.5">
                  <div className="font-semibold text-sm leading-tight">{restockProduct.name}</div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline" className="text-[11px]">{restockProduct.category}</Badge>
                    <Badge variant={restockProduct.is_loose ? "secondary" : "outline"} className="text-[11px]">{restockProduct.is_loose ? "Loose • per kg" : "Packaged"}</Badge>
                    <span className="text-muted-foreground">Current stock:</span>
                    <Badge variant={isOutOfStock(restockProduct) ? "destructive" : isLowStock(restockProduct) ? "secondary" : "outline"} className="font-mono text-xs">
                      {restockProduct.stockQuantity ?? 0} {restockProduct.unit || "pcs"}
                    </Badge>
                    <span className="text-muted-foreground">warn at ≤ {lowStockThresholdOf(restockProduct)} {restockProduct.unit || "pcs"}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Current {restockProduct.is_loose ? "rate" : "price"}:</span>{" "}
                    <span className="font-bold">{restockProduct.is_loose ? `${formatINR(restockProduct.rate_per_kg || 0)}/kg` : formatINR(restockProduct.price || 0)}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Example: Tata Salt low (3 left) → buy 40 new → enter 40 below. If supplier price changed, update price field too.
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-1">
                <Label className="text-[11px]">Add Quantity *</Label>
                <Input
                  type="number"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  placeholder="e.g., 40"
                  className="h-8 text-xs"
                  autoFocus
                />
                {restockQty && !isNaN(Number(restockQty)) && Number(restockQty) > 0 && restockProduct && (
                  <div className="text-[11px] font-medium text-primary">
                    New stock: {restockProduct.stockQuantity ?? 0} + {Number(restockQty)} = {(restockProduct.stockQuantity ?? 0) + Number(restockQty)} {restockProduct.unit || "pcs"}
                  </div>
                )}
              </div>

              {restockProduct.is_loose ? (
                <div className="space-y-1">
                  <Label className="text-[11px]">New Rate per kg (₹) <span className="text-muted-foreground font-normal">— leave as is if cost same</span></Label>
                  <Input type="number" value={restockRate} onChange={(e) => setRestockRate(e.target.value)} placeholder={String(restockProduct.rate_per_kg ?? "")} className="h-8 text-xs" />
                  {restockRate && restockRate !== String(restockProduct.rate_per_kg ?? "") && (
                    <div className="text-[11px] text-primary">{formatINR(restockProduct.rate_per_kg || 0)}/kg → {formatINR(Number(restockRate) || 0)}/kg</div>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-[11px]">New Selling Price (₹) <span className="text-muted-foreground font-normal">— leave as is if cost same</span></Label>
                  <Input type="number" value={restockPrice} onChange={(e) => setRestockPrice(e.target.value)} placeholder={String(restockProduct.price ?? "")} className="h-8 text-xs" />
                  {restockPrice && restockPrice !== String(restockProduct.price ?? "") && (
                    <div className="text-[11px] text-primary">{formatINR(restockProduct.price || 0)} → {formatINR(Number(restockPrice) || 0)}</div>
                  )}
                </div>
              )}

              <div className="rounded-lg bg-primary/5 border border-primary/20 px-2.5 py-2 text-[11px] text-blue-800 dark:bg-primary/10 dark:border-blue-900 dark:text-blue-200 space-y-1">
                <div className="font-semibold">How it works:</div>
                <div>• <span className="font-medium">Add Product</span> = brand new SKU (first time).</div>
                <div>• <span className="font-medium">Restock (+)</span> = existing item, add qty (e.g., 40) + update price if your purchase cost changed.</div>
                <div>• <span className="font-medium">Done Editing</span> = fix name/category/barcode typo without changing stock logic.</div>
              </div>

              {restockError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-2.5 py-1.5 text-xs font-medium text-destructive">
                  {restockError}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="p-4 gap-3 sm:justify-end">
            <Button variant="outline" onClick={() => setRestockOpen(false)} disabled={restockSaving} className="h-9 px-6 min-w-[96px]">Cancel</Button>
            <Button onClick={handleRestock} disabled={restockSaving || offline} title={offline ? reason : undefined} className="bg-primary hover:bg-primary/90 text-white h-9 px-6 min-w-[130px]">
              {restockSaving ? "Restocking..." : `Add ${restockQty ? Number(restockQty) : ""} to Stock`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
      )}
    </>
  );
}
