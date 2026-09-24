"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatINR } from "@/lib/utils";
import { generateReceiptHTML } from "@/lib/print";
import { fetchOrders } from "@/lib/api";
import type { Order } from "@/db/database";
import SearchBox from "@/components/SearchBox";
import { Search, Receipt, ArrowLeft, Calendar, User, Phone, CreditCard, ShoppingBag, Printer, X } from "lucide-react";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (searchVal?: string, dateVal?: string) => {
    const s = searchVal !== undefined ? searchVal : search;
    const d = dateVal !== undefined ? dateVal : date;
    // ignore blank or <3 for search, but allow date-only
    if (s && (s.startsWith(" ") || s.trim().length < 3)) {
      // don't fetch for <3, just keep current or clear? keep current
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");
    try {
      const data = await fetchOrders({ search: s?.trim() || undefined, date: d || undefined, limit: 10 });
      if (controller.signal.aborted) return;
      setOrders(data.orders as unknown as Order[]);
      setTotal(data.total);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Failed to load orders");
      setOrders([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [search, date]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const doSearchApi = useCallback(async (trimmed: string, trimmedDate: string) => {
    if (trimmed.startsWith(" ") || (trimmed && trimmed.length < 3)) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");
    try {
      const data = await fetchOrders({ search: trimmed || undefined, date: trimmedDate || undefined, limit: 10 });
      if (controller.signal.aborted) return;
      setOrders(data.orders as unknown as Order[]);
      setTotal(data.total);
      requestAnimationFrame(() => searchRef.current?.focus());
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Failed to load orders");
      setOrders([]);
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
    if (!trimmed || trimmed.length < 3 || trimmed.startsWith(" ")) return;
    doSearchApi(trimmed, date);
  };

  const handleClearSearch = () => {
    const trimmed = search.trim();
    if (trimmed && trimmed.length > 0 && trimmed.length < 3) {
      // 1-2 chars: don't fetch, just keep current
      return;
    }
    doSearchApi("", date);
  };

  const handleFocusSearch = (q: string) => {
    if (q.startsWith(" ")) return;
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 3) return;
    if (!trimmed && !date) return;
    doSearchApi(trimmed, date);
  };

  const handleDateChange = (v: string) => {
    setDate(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearchApi(search.trim(), v), 300);
  };

  const handleClear = () => {
    setSearch("");
    setDate("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    load("", "");
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell>
      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-6xl mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Link href="/"><Button variant="outline" size="sm" className="rounded-full gap-1.5"><ArrowLeft className="w-4 h-4" /> Billing</Button></Link>
              <h1 className="text-base font-semibold flex items-center gap-1.5"><Receipt className="w-4 h-4 text-primary" /> Orders</h1>
              <Badge variant="secondary" className="rounded-full hidden sm:inline-flex">{total} total</Badge>
            </div>
            <div className="text-xs text-muted-foreground hidden sm:block">Auto-saved bills from backend</div>
          </div>

          <Card className="py-0 border-primary/20 ring-1 ring-primary/5">
            <CardContent className="p-1.5 flex flex-col sm:flex-row gap-2">
              <SearchBox
                placeholder="Search by order number..."
                leftIcon={<Search className="w-4 h-4" />}
                value={search}
                onValueChange={handleImmediate}
                onSearch={handleDebouncedSearch}
                onClear={handleClearSearch}
                onFocusSearch={handleFocusSearch}
                inputRef={searchRef}
                variant="plain"
              />
              <div className="flex items-center gap-2 shrink-0">
                <Calendar className="w-4 h-4 text-muted-foreground hidden sm:block" />
                <Input type="date" value={date} onChange={(e) => handleDateChange(e.target.value)} className="h-9 w-44" />
                {(search || date) && <Button variant="ghost" size="sm" onClick={handleClear}>Clear</Button>}
              </div>
            </CardContent>
          </Card>

          <Card className="py-0 overflow-hidden">
            <CardHeader className="py-3 border-b">
              <CardTitle className="text-sm">Order History {loading && <span className="text-xs font-normal text-muted-foreground">loading...</span>}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {error ? (
                <div className="p-6 text-center">
                  <div className="text-sm text-destructive font-medium">{error}</div>
                  <div className="text-xs text-muted-foreground mt-1">Is DATABASE_URL set? Orders still print locally even if DB offline.</div>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => load()}>Retry</Button>
                </div>
              ) : orders.length === 0 && !loading ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  No orders found. Complete a bill on the Billing page — it will auto-save here.
                </div>
              ) : (
                <div className="overflow-auto max-h-[60vh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((o) => (
                        <TableRow key={o.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedOrder(o)}>
                          <TableCell className="font-mono text-xs font-semibold">{o.orderNumber || o.id.slice(0, 8)}</TableCell>
                          <TableCell className="text-xs">{new Date(o.createdAt as unknown as string).toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-xs">
                            {o.customerId ? (
                              <span className="inline-flex items-center gap-1"><User className="w-3 h-3" /> {String((o as unknown as { customer?: { name?: string } }).customer?.name ?? o.customerId.slice(0, 6))}</span>
                            ) : <span className="text-muted-foreground">Walk-in</span>}
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{o.items.length} items</Badge></TableCell>
                          <TableCell><Badge variant={o.paymentMethod === "khata" ? "destructive" : o.paymentMethod === "upi" ? "default" : "secondary"} className="capitalize text-xs">{o.paymentMethod}</Badge></TableCell>
                          <TableCell className="text-right font-bold text-sm">{formatINR(o.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-[11px] text-muted-foreground text-center">
            Click any order to see full details — items, customer, payment & receipt. Orders auto-saved via <code className="px-1 py-0.5 bg-muted rounded">POST /api/orders</code>.
          </div>
        </div>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(o) => !o && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden max-h-[88vh] flex flex-col">
          {selectedOrder && (() => {
            const o = selectedOrder as unknown as Order & { customer?: { name: string; phone: string | null; balance?: number } | null; orderNumber?: string };
            const subtotal = o.total + (o.discount || 0);
            const customer = (o as unknown as { customer?: { name: string; phone: string | null } }).customer;
            const handlePrint = () => {
              const items = o.items.map((it) => ({
                name: it.name,
                qty: it.isCustom ? String(it.unit) : `${it.quantity ?? it.weight ?? 1}`,
                quantity: (it as any).quantity ?? null,
                weight: (it as any).weight ?? null,
                price: (it as any).price,
                perUnit: (it as any).isCustom ? (it as any).unit : (it as any).weight ? "kg" : (it as any).unit || "pcs",
                unit: (it as any).unit,
                isCustom: (it as any).isCustom,
                lineTotal: it.lineTotal,
              }));
              const html = generateReceiptHTML(items as any, o.total, o.discount || 0, customer?.name || (o.customerId ? "Customer" : undefined), o.orderNumber || o.id);
              const w = window.open("", "_blank");
              if (w) { w.document.write(html); w.document.close(); w.print(); }
            };
            return (
              <>
                <DialogHeader className="p-5 pb-3 shrink-0">
                  <DialogTitle className="text-[15px] flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-primary" /> {o.orderNumber || o.id.slice(0, 8)}
                  </DialogTitle>
                  <DialogDescription className="text-xs flex flex-wrap gap-2 items-center">
                    <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(o.createdAt as unknown as string).toLocaleString("en-IN")}</span>
                    <Badge variant={o.paymentMethod === "khata" ? "destructive" : o.paymentMethod === "upi" ? "default" : "secondary"} className="capitalize text-[11px]">{o.paymentMethod}</Badge>
                    {o.status && <Badge variant="outline" className="text-[11px]">{o.status}</Badge>}
                  </DialogDescription>
                </DialogHeader>

                <div className="px-5 pb-5 space-y-4 overflow-y-auto flex-1 min-h-0">
                  {/* Customer */}
                  <Card className="py-0">
                    <CardContent className="p-3 flex flex-row items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border flex items-center justify-center text-primary shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{customer?.name || (o.customerId ? `Customer ${o.customerId.slice(0, 6)}` : "Walk-in Customer")}</div>
                        {customer?.phone ? (
                          <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {customer.phone}</div>
                        ) : <div className="text-xs text-muted-foreground">No phone</div>}
                      </div>
                      {customer && (customer as unknown as { balance?: number }).balance !== undefined && (customer as unknown as { balance: number }).balance > 0 && (
                        <Badge variant="destructive" className="text-[11px]">Due ₹{(customer as unknown as { balance: number }).balance.toFixed(0)}</Badge>
                      )}
                    </CardContent>
                  </Card>

                  {/* Items */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingBag className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold">Items</span>
                      <Badge variant="secondary" className="text-xs">{o.items.length} items</Badge>
                    </div>
                    <Card className="py-0 overflow-hidden">
                      <div className="max-h-[28vh] overflow-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-card">
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="text-xs">#</TableHead>
                              <TableHead className="text-xs">Product</TableHead>
                              <TableHead className="text-xs text-center">Qty</TableHead>
                              <TableHead className="text-xs text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {o.items.map((it, idx) => (
                              <TableRow key={idx} className="hover:bg-muted/30">
                                <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                                <TableCell>
                                  <div className="text-[13px] font-medium leading-tight">{it.name}</div>
                                  <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    {it.isCustom && <Badge variant="outline" className="text-[9px] h-4 px-1">Custom</Badge>}
                                    <span>{it.price ? formatINR(it.price) : ""} {it.unit ? `/ ${it.unit}` : ""}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs text-center font-mono">
                                  {it.quantity ?? it.weight ?? 1} {it.unit}
                                </TableCell>
                                <TableCell className="text-right font-bold text-[13px]">{formatINR(it.lineTotal)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  </div>

                  {/* Summary */}
                  <Card className="py-0 bg-muted/20">
                    <CardContent className="p-3 space-y-2 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span><span className="font-medium text-foreground">{formatINR(subtotal)}</span>
                      </div>
                      {(o.discount || 0) > 0 && (
                        <div className="flex justify-between text-primary">
                          <span>Discount</span><span className="font-bold">- {formatINR(o.discount)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="font-bold flex items-center gap-1"><CreditCard className="w-4 h-4" /> Grand Total</span>
                        <span className="font-black text-lg text-primary">{formatINR(o.total)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Payment</span><span className="capitalize font-medium text-foreground">{o.paymentMethod}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="p-4 border-t bg-muted/30 flex gap-2 shrink-0">
                  <Button variant="outline" className="flex-1 h-9" onClick={() => setSelectedOrder(null)}>
                    <X className="w-4 h-4" /> Close
                  </Button>
                  <Button className="flex-1 h-9 bg-primary hover:bg-primary/90" onClick={handlePrint}>
                    <Printer className="w-4 h-4" /> Print Receipt
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
