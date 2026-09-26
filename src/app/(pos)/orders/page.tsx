"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatINR } from "@/lib/utils";
import { generateReceiptHTML } from "@/lib/print";
import { fetchOrders } from "@/lib/api";
import type { Order } from "@/db/database";
import { Receipt, User, Phone, CreditCard, ShoppingBag, Printer, X, ChevronLeft, ChevronRight, ChevronRight as GoIcon, Copy, Check, Hash, RefreshCw, CircleUserRound, Search, Calendar } from "lucide-react";

const PAGE_SIZE = 20;

type PaymentFilter = "all" | "cash" | "upi" | "khata" | "split";

const PAYMENT_LABELS: Record<PaymentFilter, string> = {
  all: "Payment: All",
  cash: "Cash",
  upi: "UPI",
  khata: "Khata (due)",
  split: "Split",
};

function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Split "ORD-20260926-AULT-004PT" -> { head: "ORD-20260926-AULT", tail: "004PT" } */
function splitOrderNumber(n: string) {
  const parts = n.split("-");
  if (parts.length >= 2) return { head: parts.slice(0, -1).join("-"), tail: parts[parts.length - 1] };
  return { head: "", tail: n };
}

function dayKey(iso: string) {
  return toDateInput(new Date(iso));
}

function dayLabel(key: string) {
  const today = toDateInput(new Date());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const ys = toDateInput(y);
  const d = new Date(key + "T00:00:00");
  const fmt = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  if (key === today) return "Today";
  if (key === ys) return "Yesterday";
  return fmt;
}

function timeOf(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

const PAY_DOT: Record<string, string> = {
  cash: "bg-emerald-500",
  upi: "bg-sky-500",
  khata: "bg-rose-500",
  split: "bg-amber-500",
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [orderQ, setOrderQ] = useState("");
  const [customerQ, setCustomerQ] = useState("");
  const [payment, setPayment] = useState<PaymentFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedRow, setCopiedRow] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async (opts: { order?: string; customer?: string; pay?: PaymentFilter; fromD?: string; toD?: string; pageNum?: number }) => {
    const o = opts.order ?? orderQ;
    const cu = opts.customer ?? customerQ;
    const p = opts.pay ?? payment;
    const f = opts.fromD ?? from;
    const t = opts.toD ?? to;
    const pg = opts.pageNum ?? page;
    if (o.startsWith(" ") || cu.startsWith(" ")) return;
    const oT = o.trim();
    const cT = cu.trim();
    if (oT.length === 1 || cT.length === 1) return;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");
    try {
      const data = await fetchOrders({
        search: oT || undefined,
        customer: cT || undefined,
        paymentMethod: p === "all" ? undefined : p,
        from: f || undefined,
        to: t || undefined,
        limit: PAGE_SIZE,
        page: pg,
      });
      if (controller.signal.aborted) return;
      setOrders(data.orders as unknown as Order[]);
      setTotal(data.total);
      setPage(data.page);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Failed to load orders");
      setOrders([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderQ, customerQ, payment, from, to, page]);

  useEffect(() => {
    load({ pageNum: 1 });
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleTextSearch = (nextOrder: string, nextCustomer: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load({ order: nextOrder, customer: nextCustomer, pageNum: 1 });
    }, 350);
  };

  const handleOrderChange = (v: string) => {
    if (v.startsWith(" ")) return;
    setOrderQ(v);
    scheduleTextSearch(v, customerQ);
  };

  const handleCustomerChange = (v: string) => {
    if (v.startsWith(" ")) return;
    setCustomerQ(v);
    scheduleTextSearch(orderQ, v);
  };

  const handlePaymentChange = (v: PaymentFilter) => {
    setPayment(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    load({ pay: v, pageNum: 1 });
  };

  const setRange = (f: string, t: string) => {
    setFrom(f);
    setTo(t);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    load({ fromD: f, toD: t, pageNum: 1 });
  };

  const applyPreset = (preset: "today" | "yesterday" | "week") => {
    const now = new Date();
    if (preset === "today") {
      const s = toDateInput(now);
      setRange(s, s);
    } else if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const s = toDateInput(y);
      setRange(s, s);
    } else {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      setRange(toDateInput(s), toDateInput(now));
    }
  };

  const handleFromChange = (v: string) => {
    setFrom(v);
    const t = v && to && v > to ? v : to;
    if (v && to && v > to) setTo(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load({ fromD: v, toD: t, pageNum: 1 }), 300);
  };

  const handleToChange = (v: string) => {
    setTo(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load({ toD: v, pageNum: 1 }), 300);
  };

  const activeFilters =
    (orderQ.trim() ? 1 : 0) + (customerQ.trim() ? 1 : 0) + (payment !== "all" ? 1 : 0) + (from || to ? 1 : 0);

  const handleClearAll = () => {
    setOrderQ("");
    setCustomerQ("");
    setPayment("all");
    setFrom("");
    setTo("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    load({ order: "", customer: "", pay: "all", fromD: "", toD: "", pageNum: 1 });
  };

  const goPage = (pg: number) => {
    const next = Math.min(Math.max(1, pg), totalPages);
    if (next === page) return;
    setPage(next);
    load({ pageNum: next });
  };

  const copyFull = async (id: string, full: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(full);
      setCopiedRow(id);
      setTimeout(() => setCopiedRow((c) => (c === id ? null : c)), 1200);
    } catch { /* clipboard unavailable */ }
  };

  // Group loaded page by day + page revenue
  const groups = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of orders) {
      const k = dayKey(o.createdAt as unknown as string);
      const arr = map.get(k) ?? [];
      arr.push(o);
      map.set(k, arr);
    }
    return [...map.entries()];
  }, [orders]);

  const pageRevenue = useMemo(() => orders.reduce((s, o) => s + (o.total || 0), 0), [orders]);

  const fromLabel = from ? new Date(from + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : null;
  const toLabel = to ? new Date(to + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : null;
  const rangeLabel = from || to ? `${fromLabel ?? "…"} → ${toLabel ?? "…"}` : null;

  const emptyHint =
    activeFilters > 0
      ? "No bills match these filters. Widen the date range or clear a field."
      : "No bills yet. Complete a sale on the Billing page — it auto-saves here.";

  return (
    <>
      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-semibold flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-primary" /> Orders
              </h1>
              <Badge variant="secondary" className="rounded-full tabular-nums">{total} bills</Badge>
              {!loading && orders.length > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  This view: <span className="font-semibold text-foreground">{formatINR(pageRevenue)}</span>
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => load({ pageNum: page })} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          {/* Filter toolbar — two search fields + payment select + date range */}
          <Card className="py-0 border-primary/20 ring-1 ring-primary/5">
            <CardContent className="p-3 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex items-center gap-2 rounded-lg border bg-muted/20 px-2.5 h-10 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition">
                  <Hash className="w-4 h-4 text-primary shrink-0" />
                  <span className="sr-only">Search by bill number</span>
                  <Input
                    value={orderQ}
                    onChange={(e) => handleOrderChange(e.target.value)}
                    placeholder="Bill no. — e.g. 004PT"
                    className="border-0 shadow-none bg-transparent focus-visible:ring-0 h-9 px-0 text-sm font-mono"
                    aria-label="Search by bill number"
                  />
                  {orderQ && (
                    <button
                      onClick={() => { setOrderQ(""); load({ order: "", pageNum: 1 }); }}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                      aria-label="Clear bill search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </label>
                <label className="flex items-center gap-2 rounded-lg border bg-muted/20 px-2.5 h-10 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition">
                  <User className="w-4 h-4 text-primary shrink-0" />
                  <span className="sr-only">Search by customer name or phone</span>
                  <Input
                    value={customerQ}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    placeholder="Customer — name or phone"
                    className="border-0 shadow-none bg-transparent focus-visible:ring-0 h-9 px-0 text-sm"
                    aria-label="Search by customer name or phone"
                  />
                  {customerQ && (
                    <button
                      onClick={() => { setCustomerQ(""); load({ customer: "", pageNum: 1 }); }}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                      aria-label="Clear customer search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={payment} onValueChange={(v) => handlePaymentChange(v as PaymentFilter)}>
                  <SelectTrigger size="sm" className="h-9 min-w-[130px]" aria-label="Filter by payment method"><SelectValue>{PAYMENT_LABELS[payment]}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Payment: All</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="khata">Khata (due)</SelectItem>
                    <SelectItem value="split">Split</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1.5 text-xs">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <Input type="date" value={from} max={to || undefined} onChange={(e) => handleFromChange(e.target.value)} className="h-9 w-36 text-xs" aria-label="From date" />
                  <span className="text-muted-foreground">→</span>
                  <Input type="date" value={to} min={from || undefined} onChange={(e) => handleToChange(e.target.value)} className="h-9 w-36 text-xs" aria-label="To date" />
                </div>

                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => applyPreset("today")}>Today</Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => applyPreset("yesterday")}>Yesterday</Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => applyPreset("week")}>Last 7 days</Button>
                </div>

                {activeFilters > 0 && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs ml-auto" onClick={handleClearAll}>
                    <X className="w-3.5 h-3.5" /> Clear all
                  </Button>
                )}
              </div>

              {(orderQ.trim() || customerQ.trim() || rangeLabel) && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Search className="w-3 h-3" /> Showing:</span>
                  {orderQ.trim() && <Badge variant="secondary" className="font-mono text-[11px]">#{orderQ.trim()}</Badge>}
                  {customerQ.trim() && <Badge variant="secondary" className="text-[11px]">{customerQ.trim()}</Badge>}
                  {payment !== "all" && <Badge variant="secondary" className="capitalize text-[11px]">{payment}</Badge>}
                  {rangeLabel && <Badge variant="secondary" className="text-[11px]">{rangeLabel}</Badge>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bill list */}
          <Card className="py-0 overflow-hidden">
            <CardHeader className="py-2.5 px-4 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-[13px] font-semibold">
                Bills {loading && <span className="text-xs font-normal text-muted-foreground">loading…</span>}
              </CardTitle>
              {!loading && total > 0 && (
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                </span>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {error ? (
                <div className="p-6 text-center">
                  <div className="text-sm text-destructive font-medium">{error}</div>
                  <div className="text-xs text-muted-foreground mt-1">Orders still print locally even if DB is offline.</div>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => load({ pageNum: page })}>Retry</Button>
                </div>
              ) : orders.length === 0 && !loading ? (
                <div className="p-12 text-center">
                  <Receipt className="w-8 h-8 mx-auto text-muted-foreground/50" />
                  <div className="text-sm text-muted-foreground mt-3">{emptyHint}</div>
                  {activeFilters > 0 && (
                    <Button variant="outline" size="sm" className="mt-3" onClick={handleClearAll}>Clear all filters</Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="overflow-auto max-h-[62vh]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card z-10 shadow-[0_1px_0_var(--border)]">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[11px] uppercase tracking-wider font-semibold w-52">Bill No.</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Items</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider font-semibold w-56">Customer</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider font-semibold w-28">Time</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider font-semibold w-24">Payment</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right w-28">Total</TableHead>
                          <TableHead className="w-8" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          Array.from({ length: 8 }).map((_, i) => (
                            <TableRow key={`sk-${i}`} className="hover:bg-transparent">
                              <TableCell colSpan={7}><div className="h-11 rounded-md bg-muted/60 animate-pulse" /></TableCell>
                            </TableRow>
                          ))
                        ) : (
                          groups.flatMap(([key, list]) => {
                            const dayTotal = list.reduce((s, o) => s + (o.total || 0), 0);
                            const header = (
                              <TableRow key={`day-${key}`} className="bg-muted/50 hover:bg-muted/50">
                                <TableCell colSpan={7} className="py-1.5">
                                  <div className="flex items-center gap-2 text-[11px]">
                                    <span className="font-bold text-foreground">{dayLabel(key)}</span>
                                    <span className="text-muted-foreground">{new Date(key + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                                    <span className="text-muted-foreground">•</span>
                                    <span className="text-muted-foreground tabular-nums">{list.length} bill{list.length === 1 ? "" : "s"}</span>
                                    <span className="ml-auto font-semibold text-foreground tabular-nums">{formatINR(dayTotal)}</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                            const rows = list.map((o) => {
                              const full = o.orderNumber || o.id;
                              const { head, tail } = splitOrderNumber(full);
                              const cust = (o as unknown as { customer?: { name?: string; phone?: string | null } }).customer;
                              const firstItem = o.items[0]?.name ?? "—";
                              const extra = o.items.length > 1 ? ` +${o.items.length - 1} more` : "";
                              const isCopied = copiedRow === o.id;
                              return (
                                <TableRow
                                  key={o.id}
                                  className="hover:bg-primary/[0.04] cursor-pointer group"
                                  onClick={() => { setSelectedOrder(o); setCopied(false); }}
                                  tabIndex={0}
                                  onKeyDown={(e) => { if (e.key === "Enter") { setSelectedOrder(o); setCopied(false); } }}
                                >
                                  {/* Bill No. — short ID big, prefix small */}
                                  <TableCell className="py-2.5" title={full}>
                                    <div className="flex items-center gap-1.5">
                                      <div className="min-w-0">
                                        <div className="font-mono font-bold text-[17px] leading-none tracking-tight tabular-nums">
                                          #{tail}
                                        </div>
                                        {head && (
                                          <div className="font-mono text-[10px] leading-tight text-muted-foreground truncate mt-1">
                                            {head}
                                          </div>
                                        )}
                                      </div>
                                      <button
                                        onClick={(e) => copyFull(o.id, full, e)}
                                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-foreground shrink-0 transition-opacity"
                                        aria-label="Copy full bill number"
                                      >
                                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                  </TableCell>
                                  {/* Items preview */}
                                  <TableCell className="py-2.5">
                                    <div className="text-[13px] font-medium leading-tight truncate max-w-64">{firstItem}<span className="text-muted-foreground font-normal">{extra}</span></div>
                                    <div className="text-[11px] text-muted-foreground tabular-nums mt-0.5">{o.items.length} item{o.items.length === 1 ? "" : "s"}{(o.discount || 0) > 0 && <span className="text-emerald-600 dark:text-emerald-400"> • −{formatINR(o.discount)} off</span>}</div>
                                  </TableCell>
                                  {/* Customer */}
                                  <TableCell className="py-2.5">
                                    {o.customerId || cust?.name ? (
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                          {initials(cust?.name ?? "C")}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="text-[13px] font-medium leading-tight truncate">{cust?.name ?? `Customer ${o.customerId!.slice(0, 6)}`}</div>
                                          {cust?.phone && <div className="text-[11px] text-muted-foreground font-mono tabular-nums">{cust.phone}</div>}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <CircleUserRound className="w-5 h-5" />
                                        <span className="text-[13px]">Walk-in</span>
                                      </div>
                                    )}
                                  </TableCell>
                                  {/* Time */}
                                  <TableCell className="py-2.5">
                                    <div className="text-[13px] font-semibold tabular-nums leading-tight">{timeOf(o.createdAt as unknown as string)}</div>
                                  </TableCell>
                                  {/* Payment */}
                                  <TableCell className="py-2.5">
                                    <span className="inline-flex items-center gap-1.5 text-[13px] capitalize">
                                      <span className={`w-2 h-2 rounded-full shrink-0 ${PAY_DOT[o.paymentMethod] ?? "bg-muted-foreground"}`} />
                                      {o.paymentMethod}
                                    </span>
                                  </TableCell>
                                  {/* Total */}
                                  <TableCell className="py-2.5 text-right">
                                    <span className="font-bold text-[15px] tabular-nums">{formatINR(o.total)}</span>
                                  </TableCell>
                                  <TableCell className="py-2.5 pr-3">
                                    <GoIcon className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                                  </TableCell>
                                </TableRow>
                              );
                            });
                            return [header, ...rows];
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 border-t bg-muted/20">
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      Page {page} of {totalPages} • {total} bill{total === 1 ? "" : "s"} • <span className="font-semibold text-foreground">{formatINR(pageRevenue)}</span> on page
                    </span>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-8" disabled={page <= 1 || loading} onClick={() => goPage(page - 1)} aria-label="Previous page">
                        <ChevronLeft className="w-4 h-4" /> Prev
                      </Button>
                      <Button variant="outline" size="sm" className="h-8" disabled={page >= totalPages || loading} onClick={() => goPage(page + 1)} aria-label="Next page">
                        Next <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Order Detail — right side drawer */}
      <Drawer open={!!selectedOrder} onOpenChange={(o) => !o && setSelectedOrder(null)}>
        <DrawerContent side="right" showCloseButton={false} className="p-0 gap-0 overflow-hidden">
          {selectedOrder && (() => {
            const o = selectedOrder as unknown as Order & { customer?: { name: string; phone: string | null; balance?: number } | null; orderNumber?: string };
            const full = o.orderNumber || o.id;
            const { head, tail } = splitOrderNumber(full);
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
              const html = generateReceiptHTML(items as any, o.total, o.discount || 0, customer?.name || (o.customerId ? "Customer" : undefined), full);
              const w = window.open("", "_blank");
              if (w) { w.document.write(html); w.document.close(); w.print(); }
            };
            const handleCopy = async () => {
              try {
                await navigator.clipboard.writeText(full);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch { /* clipboard unavailable */ }
            };
            return (
              <>
                <DrawerHeader className="p-5 pb-3 shrink-0 gap-2">
                  <DrawerTitle className="flex items-start gap-2 font-medium">
                    <Receipt className="w-4 h-4 text-primary mt-1 shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-mono font-bold text-xl leading-none tracking-tight tabular-nums">#{tail}</span>
                      {head && <span className="block font-mono font-normal text-[11px] text-muted-foreground mt-1">{full}</span>}
                    </span>
                    <span className="flex items-center gap-0.5 ml-auto shrink-0">
                      <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted" aria-label="Copy full bill number">
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button onClick={() => setSelectedOrder(null)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted" aria-label="Close dialog">
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  </DrawerTitle>
                  <DrawerDescription className="text-xs flex flex-wrap gap-2 items-center">
                    <span className="tabular-nums">{new Date(o.createdAt as unknown as string).toLocaleString("en-IN")}</span>
                    <span className="inline-flex items-center gap-1.5 capitalize">
                      <span className={`w-2 h-2 rounded-full ${PAY_DOT[o.paymentMethod] ?? "bg-muted-foreground"}`} />{o.paymentMethod}
                    </span>
                    {o.status && <Badge variant="outline" className="text-[11px]">{o.status}</Badge>}
                  </DrawerDescription>
                </DrawerHeader>

                <div className="px-5 pb-5 space-y-4 overflow-y-auto flex-1 min-h-0">
                  {/* Customer */}
                  <Card className="py-0">
                    <CardContent className="p-3 flex flex-row items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                        {customer?.name ? initials(customer.name) : <User className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{customer?.name || (o.customerId ? `Customer ${o.customerId.slice(0, 6)}` : "Walk-in Customer")}</div>
                        {customer?.phone ? (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 font-mono tabular-nums"><Phone className="w-3 h-3" /> {customer.phone}</div>
                        ) : <div className="text-xs text-muted-foreground">No phone</div>}
                      </div>
                      {customer && (customer as unknown as { balance?: number }).balance !== undefined && (customer as unknown as { balance: number }).balance > 0 && (
                        <Badge variant="destructive" className="text-[11px] tabular-nums">Due ₹{(customer as unknown as { balance: number }).balance.toFixed(0)}</Badge>
                      )}
                    </CardContent>
                  </Card>

                  {/* Items */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingBag className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold">Items</span>
                      <Badge variant="secondary" className="text-xs tabular-nums">{o.items.length}</Badge>
                    </div>
                    <Card className="py-0 overflow-hidden">
                      <div className="max-h-[28vh] overflow-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-card">
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="text-xs w-8">#</TableHead>
                              <TableHead className="text-xs">Product</TableHead>
                              <TableHead className="text-xs text-center">Qty</TableHead>
                              <TableHead className="text-xs text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {o.items.map((it, idx) => (
                              <TableRow key={idx} className="hover:bg-muted/30">
                                <TableCell className="text-xs text-muted-foreground tabular-nums">{idx + 1}</TableCell>
                                <TableCell>
                                  <div className="text-[13px] font-medium leading-tight">{it.name}</div>
                                  <div className="text-[11px] text-muted-foreground tabular-nums">
                                    {it.price ? formatINR(it.price) : ""} {it.unit ? `/ ${it.unit}` : ""}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs text-center font-mono tabular-nums">
                                  {it.quantity ?? it.weight ?? 1} {it.unit}
                                </TableCell>
                                <TableCell className="text-right font-bold text-[13px] tabular-nums">{formatINR(it.lineTotal)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  </div>

                  {/* Summary */}
                  <Card className="py-0 bg-muted/20">
                    <CardContent className="p-3 space-y-2 text-sm tabular-nums">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span><span className="font-medium text-foreground">{formatINR(subtotal)}</span>
                      </div>
                      {(o.discount || 0) > 0 && (
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                          <span>Discount</span><span className="font-bold">− {formatINR(o.discount)}</span>
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
        </DrawerContent>
      </Drawer>
    </>
  );
}
